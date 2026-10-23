import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/restaurant';
import { auth, db } from '../lib/firebase';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteField, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { configFirestoreService } from '../services/firestore/configFirestoreService';
import { DEFAULT_PERMISSIONS } from '../services/permissions/permissionService';
import { RolePermissionMatrix, PermissionModule, PermissionAction } from '../types/configuration';
import { cloudFunctionsService } from '../services/functions/cloudFunctionsService';
import { hashPin, verifyPin } from '../services/security/cryptoService';
import { offlineSyncService } from '../services/firestore/offlineSyncService';
import { resolveAccess, UserAccessDocument, TabPermissions } from '../../shared/types/accessCatalog';
import { userAccessService } from '../services/firestore/userAccessService';
import { tenantFirestoreService } from '../services/firestore/tenantFirestoreService';
import { TenantEntitlements } from '../../shared/types/tenant';

const MODULE_TO_PERMISSION: Record<string, PermissionModule> = {
  pos: 'pos',
  tables: 'tables',
  reservations: 'tables',
  caisse: 'caisse',
  main_courante: 'caisse',
  invoices: 'invoices',
  stock: 'stock',
  purchases: 'purchases',
  clients: 'clients',
  finance: 'finance',
  fiscal: 'fiscal',
  staff: 'staff',
  users: 'staff',
  audit: 'audit',
  events: 'events',
  delivery: 'delivery',
  settings: 'settings',
  reports: 'finance',
  documents: 'staff',
};

export const defaultUnauthenticatedUser: UserProfile = {
  id: '',
  email: '',
  name: 'Non connecté',
  role: 'aucun',
  active: false,
  accessibleRestaurantIds: [],
};

export interface AuthContextType {
  currentUser: UserProfile;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  firebaseAuthUser: FirebaseUser | null;
  isAuthLoading: boolean;
  isSuperadmin: boolean;
  isPlatformAdmin: boolean;
  loginWithEmail: (email: string, pass: string, restaurantCode: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  canAccess: (module: string) => boolean;
  hasPermission: (module: string, action?: 'view' | 'create' | 'edit' | 'delete') => boolean;
  hasAccess: (module: string, action?: 'view' | 'create' | 'edit' | 'delete' | 'add' | string) => boolean;

  // Session & PIN Lock Controls
  isSessionLocked: boolean;
  setIsSessionLocked: (locked: boolean) => void;
  lockSession: () => void;
  unlockSessionWithPin: (pin: string, terminalId?: string) => Promise<{ success: boolean; user?: UserProfile; message?: string }>;
  verifySupervisorPin: (pin: string, action?: string, entityId?: string) => Promise<{ success: boolean; supervisorToken?: string; supervisorName?: string; supervisorRole?: UserRole; message?: string }>;
  updateCurrentUserPin: (newPin: string) => Promise<boolean>;
  verifyCurrentUserPin: (pin: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseAuthUser, setFirebaseAuthUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);

  // Matrice des permissions synchronisée avec Firestore
  const [rolePermissions, setRolePermissions] = useState<RolePermissionMatrix>(DEFAULT_PERMISSIONS);

  useEffect(() => {
    const unsub = configFirestoreService.subscribeToRolePermissions((matrix) => {
      setRolePermissions(matrix);
    });
    return () => unsub();
  }, []);

  // Le profil utilisateur n'est JAMAIS restauré depuis localStorage : Firestore et Claims sont la seule source de vérité
  const [currentUser, setCurrentUser] = useState<UserProfile>(defaultUnauthenticatedUser);
  const [userAccess, setUserAccess] = useState<UserAccessDocument | null>(null);
  const [activeEntitlements, setActiveEntitlements] = useState<TenantEntitlements | null>(null);

  // Synchronisation des droits d'accès temps réel (userAccess)
  useEffect(() => {
    if (!currentUser.organizationId || !currentUser.id || currentUser.role === 'aucun') {
      setUserAccess(null);
      return;
    }
    const unsub = userAccessService.subscribeToUserAccess(
      currentUser.organizationId,
      currentUser.id,
      (access) => {
        setUserAccess(access);
      }
    );
    return () => unsub();
  }, [currentUser.organizationId, currentUser.id, currentUser.role]);

  // Synchronisation des modules et fonctionnalités activés (entitlements)
  useEffect(() => {
    if (!currentUser.organizationId) {
      setActiveEntitlements(null);
      return;
    }
    const unsub = tenantFirestoreService.subscribeToEntitlements(
      currentUser.organizationId,
      (ent) => {
        setActiveEntitlements(ent);
      }
    );
    return () => unsub();
  }, [currentUser.organizationId]);

  // Synchronisation stricte avec Firebase Authentication & Firestore (Claims + users/{uid})
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseAuthUser(fbUser);

      if (fbUser && fbUser.email) {
        try {
          // Lecture des Custom Claims du jeton d'authentification
          const tokenResult = await fbUser.getIdTokenResult();
          const claims = tokenResult.claims || {};
          const claimRole = claims.role as UserRole | undefined;
          const platformRole = claims.platformRole as string | undefined;
          const isPlatformOwner = platformRole === 'platform_owner';
          const isPlatformAdmin = Boolean(platformRole);
          const isClaimSuperadmin = isPlatformOwner || claims.superadmin === true;

          // Vérification de sécurité complémentaire : document platform_admins/{uid}
          let isDocPlatformAdmin = false;
          try {
            const pAdminSnap = await getDoc(doc(db, 'platform_admins', fbUser.uid));
            if (pAdminSnap.exists() && pAdminSnap.data()?.active !== false) {
              isDocPlatformAdmin = true;
            }
          } catch {
            isDocPlatformAdmin = false;
          }

          const isEffectiveSuperadmin = isClaimSuperadmin || isDocPlatformAdmin;
          const isEffectivePlatformAdmin = isPlatformAdmin || isDocPlatformAdmin;

          // Lecture du document profil users/{uid}
          const userDocRef = doc(db, 'users', fbUser.uid);
          let userSnapData: any = null;
          try {
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              userSnapData = userSnap.data();
            }
          } catch (readErr) {
            console.warn('[AuthContext] Lecture du profil users/{uid} restreinte, utilisation des claims/rôle par défaut:', readErr);
          }

          if (userSnapData) {
            const data = userSnapData;
            let activeRole: UserRole = 'serveur';

            if (isEffectiveSuperadmin) {
              activeRole = 'superadmin';
            } else if (claimRole && claimRole !== 'aucun') {
              activeRole = claimRole;
            } else if (data.role && data.role !== 'aucun') {
              // Sécurité : interdiction d'usurper le rôle superadmin sans claim plateforme
              if (data.role === 'superadmin') {
                activeRole = 'direction';
              } else {
                activeRole = data.role as UserRole;
              }
            } else {
              activeRole = 'direction';
            }

            let isActive = isEffectiveSuperadmin || (claims.active !== false && data.active !== false);
            let accessibleOutlets = isEffectiveSuperadmin
              ? ['*']
              : data.accessibleRestaurantIds || (claims.outlets as string[]) || ['*'];

            // Auto-purge de sécurité immédiat : si un ancien champ pinCode en clair existe, on le migre vers user_pins en PBKDF2 et on le supprime de Firestore
            if (data.pinCode) {
              const clearPin = String(data.pinCode);
              hashPin(clearPin).then(async ({ hash, salt }) => {
                await setDoc(
                  doc(db, 'user_pins', fbUser.uid),
                  {
                    userId: fbUser.uid,
                    hash,
                    salt,
                    failedAttempts: 0,
                    lockoutUntil: null,
                    updatedAt: new Date().toISOString(),
                    updatedBy: 'AutoSecurityMigration',
                  },
                  { merge: true }
                ).catch(() => {});

                await updateDoc(userDocRef, {
                  hasPin: true,
                  pinCode: deleteField(),
                  updatedAt: new Date().toISOString(),
                }).catch(() => {});
              }).catch(() => {});
            }

            const userProfile: UserProfile = {
              id: fbUser.uid,
              email: fbUser.email,
              name: data.name || fbUser.displayName || fbUser.email.split('@')[0],
              role: activeRole,
              avatar: data.avatar || fbUser.photoURL || undefined,
              phone: data.phone || fbUser.phoneNumber || undefined,
              organizationId: data.organizationId || (claims.organizationId as string) || '',
              accessibleRestaurantIds: accessibleOutlets,
              defaultRestaurantId: data.defaultRestaurantId,
              active: isActive,
              mustChangePassword: data.mustChangePassword === true,
              tabPermissions: data.tabPermissions,
              additionalTabs: data.additionalTabs,
              hasPin: Boolean(data.hasPin || data.pinCode),
            };

            setCurrentUser(userProfile);
          } else {
            // Document inexistant dans users/{uid} ou lecture restreinte : auto-provisionnement sécurisé
            const activeRole: UserRole = isEffectiveSuperadmin
              ? 'superadmin'
              : claimRole || 'direction';
            const isActive = isEffectiveSuperadmin || claims.active !== false;
            const accessibleOutlets = isEffectiveSuperadmin ? ['*'] : (claims.outlets as string[]) || ['*'];

            const newProfile: UserProfile = {
              id: fbUser.uid,
              email: fbUser.email,
              name: fbUser.displayName || fbUser.email.split('@')[0],
              role: activeRole,
              avatar: fbUser.photoURL || undefined,
              phone: fbUser.phoneNumber || undefined,
              organizationId: (claims.organizationId as string) || '',
              accessibleRestaurantIds: accessibleOutlets,
              active: isActive,
            };

            try {
              await setDoc(userDocRef, {
                ...newProfile,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }, { merge: true });
            } catch (writeErr) {
              console.warn('[AuthContext] Écriture profil Firestore différée:', writeErr);
            }

            setCurrentUser(newProfile);
          }
        } catch (err) {
          console.error('[AuthContext] Erreur lecture profil utilisateur:', err);
          // Résilience : Ne pas verrouiller un compte légitimement authentifié par mot de passe
          setCurrentUser({
            id: fbUser.uid,
            email: fbUser.email,
            name: fbUser.displayName || fbUser.email.split('@')[0],
            role: 'direction',
            active: true,
            accessibleRestaurantIds: ['*'],
          });
        }
      } else {
        setCurrentUser(defaultUnauthenticatedUser);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Détection de l'inactivité pour verrouillage automatique de session (15 minutes)
  useEffect(() => {
    if (!firebaseAuthUser || isSessionLocked) return;

    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
    let timer: NodeJS.Timeout;

    const resetInactivity = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsSessionLocked(true);
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, resetInactivity, { passive: true }));
    resetInactivity();

    return () => {
      clearTimeout(timer);
      events.forEach((evt) => window.removeEventListener(evt, resetInactivity));
    };
  }, [firebaseAuthUser, isSessionLocked]);

  const lockSession = () => {
    setIsSessionLocked(true);
  };

  /**
   * Déverrouillage sécurisé par code PIN (Cloud Function prioritaire avec fallback Firestore PBKDF2)
   */
  const unlockSessionWithPin = async (
    pin: string,
    terminalId?: string
  ): Promise<{ success: boolean; user?: UserProfile; message?: string }> => {
    // 1. Tentative par Cloud Function (si déployée en production)
    try {
      const res = await cloudFunctionsService.unlockWithPin(pin, terminalId);
      if (res.success && res.customToken) {
        await signInWithCustomToken(auth, res.customToken);
        setIsSessionLocked(false);
        return {
          success: true,
          user: {
            id: res.user.id,
            email: res.user.email,
            name: res.user.name,
            role: res.user.role,
            active: true,
            accessibleRestaurantIds: res.user.accessibleRestaurantIds,
            organizationId: res.user.organizationId,
            hasPin: true,
          },
        };
      }
    } catch {
      // Ignorer silencieusement si les Cloud Functions ne sont pas activées ou indisponibles
    }

    // 2. Fallback sécurisé Firestore (Chiffrement PBKDF2 / user_pins)
    try {
      if (!pin || !/^\d{4,6}$/.test(pin)) {
        return { success: false, message: 'Le code PIN doit comporter entre 4 et 6 chiffres.' };
      }

      // Cas A : Utilisateur courant déjà connecté
      if (currentUser && currentUser.id) {
        // 1. Vérification dans user_pins (hash PBKDF2)
        const pinDocSnap = await getDoc(doc(db, 'user_pins', currentUser.id));
        if (pinDocSnap.exists()) {
          const pinData = pinDocSnap.data();
          if (pinData.hash && pinData.salt) {
            const isValid = await verifyPin(pin, pinData.hash, pinData.salt);
            if (isValid) {
              setIsSessionLocked(false);
              return { success: true, user: currentUser };
            }
          }
        }

        // 2. Rétrocompatibilité / Migration : si un vestige de pinCode existait encore
        const userDocSnap = await getDoc(doc(db, 'users', currentUser.id));
        const userData = userDocSnap.exists() ? userDocSnap.data() : null;
        if (userData?.pinCode && userData.pinCode === pin) {
          // Migration atomique immédiate vers PBKDF2 et purge du clair
          const { hash, salt } = await hashPin(pin);
          await setDoc(doc(db, 'user_pins', currentUser.id), {
            userId: currentUser.id,
            hash,
            salt,
            failedAttempts: 0,
            lockoutUntil: null,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
          await updateDoc(doc(db, 'users', currentUser.id), {
            hasPin: true,
            pinCode: deleteField(),
            updatedAt: new Date().toISOString(),
          });
          setIsSessionLocked(false);
          return { success: true, user: { ...currentUser, hasPin: true } };
        } else if (currentUser.role === 'superadmin' && !userData?.hasPin && !pinDocSnap.exists()) {
          // Premier bootstrap initial UNIQUEMENT si le superadmin n'avait jamais configuré de PIN
          const { hash, salt } = await hashPin(pin);
          await setDoc(doc(db, 'user_pins', currentUser.id), {
            userId: currentUser.id,
            hash,
            salt,
            failedAttempts: 0,
            lockoutUntil: null,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
          await updateDoc(doc(db, 'users', currentUser.id), {
            hasPin: true,
            pinCode: deleteField(),
            updatedAt: new Date().toISOString(),
          });
          setCurrentUser((prev) => ({ ...prev, hasPin: true }));
          setIsSessionLocked(false);
          return { success: true, user: { ...currentUser, hasPin: true } };
        }
      }

      // Cas B : Recherche globale dans les utilisateurs actifs (commutation de serveur POS par PIN)
      const usersSnap = await getDocs(
        query(collection(db, 'users'), where('active', '==', true))
      );

      for (const uDoc of usersSnap.docs) {
        const uData = uDoc.data();
        
        // Vérification hashée dans user_pins
        const pinSnap = await getDoc(doc(db, 'user_pins', uDoc.id));
        if (pinSnap.exists()) {
          const pinData = pinSnap.data();
          if (pinData.hash && pinData.salt) {
            const isValid = await verifyPin(pin, pinData.hash, pinData.salt);
            if (isValid) {
              const matchedUser: UserProfile = {
                id: uDoc.id,
                email: uData.email || '',
                name: uData.name || 'Utilisateur',
                role: (uData.role as UserRole) || 'serveur',
                active: true,
                accessibleRestaurantIds: uData.accessibleRestaurantIds || [],
                organizationId: uData.organizationId || '',
                hasPin: true,
              };
              setCurrentUser(matchedUser);
              setIsSessionLocked(false);
              return { success: true, user: matchedUser };
            }
          }
        }

        // Migration à la volée si ancien champ pinCode résiduel
        if (uData.pinCode && uData.pinCode === pin) {
          const { hash, salt } = await hashPin(pin);
          await setDoc(doc(db, 'user_pins', uDoc.id), {
            userId: uDoc.id,
            hash,
            salt,
            failedAttempts: 0,
            lockoutUntil: null,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
          await updateDoc(doc(db, 'users', uDoc.id), {
            hasPin: true,
            pinCode: deleteField(),
            updatedAt: new Date().toISOString(),
          });
          const matchedUser: UserProfile = {
            id: uDoc.id,
            email: uData.email || '',
            name: uData.name || 'Utilisateur',
            role: (uData.role as UserRole) || 'serveur',
            active: true,
            accessibleRestaurantIds: uData.accessibleRestaurantIds || [],
            organizationId: uData.organizationId || '',
            hasPin: true,
          };
          setCurrentUser(matchedUser);
          setIsSessionLocked(false);
          return { success: true, user: matchedUser };
        }
      }

      // Rejet strict de tout code PIN non reconnu (aucun passe-droit permissif)
      return { success: false, message: 'Code PIN incorrect. Veuillez réessayer.' };
    } catch (fallbackErr: any) {
      console.error('[AuthContext] Erreur déverrouillage PIN Firestore:', fallbackErr);
      return { success: false, message: 'Code PIN incorrect. Veuillez réessayer.' };
    }
  };

  /**
   * Vérification de PIN superviseur (Cloud Function prioritaire avec fallback Firestore PBKDF2)
   */
  const verifySupervisorPin = async (
    pin: string,
    action: string = 'SUPERVISOR_ACTION',
    entityId?: string
  ): Promise<{ success: boolean; supervisorToken?: string; supervisorName?: string; supervisorRole?: UserRole; message?: string }> => {
    try {
      const res = await cloudFunctionsService.verifySupervisor(pin, action, entityId);
      return {
        success: true,
        supervisorToken: res.supervisorToken,
        supervisorName: res.supervisorName,
        supervisorRole: res.supervisorRole,
      };
    } catch {
      // Fallback local superviseur (Firestore PBKDF2)
      try {
        if (!pin || !/^\d{4,6}$/.test(pin)) {
          return { success: false, message: 'Le code PIN doit comporter entre 4 et 6 chiffres.' };
        }

        const isSupervisor =
          currentUser.role === 'superadmin' || currentUser.role === 'direction' || currentUser.role === 'manager';

        // 1. Si l'utilisateur connecté est superviseur, vérifier son hash dans user_pins
        if (isSupervisor) {
          const pinDocSnap = await getDoc(doc(db, 'user_pins', currentUser.id));
          if (pinDocSnap.exists()) {
            const pinData = pinDocSnap.data();
            if (pinData.hash && pinData.salt) {
              const isValid = await verifyPin(pin, pinData.hash, pinData.salt);
              if (isValid) {
                return {
                  success: true,
                  supervisorToken: `local-token-${Date.now()}`,
                  supervisorName: currentUser.name,
                  supervisorRole: currentUser.role,
                };
              }
            }
          }
        }

        // 2. Recherche parmi les autres profils superviseurs actifs
        const supSnap = await getDocs(
          query(
            collection(db, 'users'),
            where('active', '==', true),
            where('role', 'in', ['superadmin', 'direction', 'manager'])
          )
        );

        for (const docSnap of supSnap.docs) {
          const supData = docSnap.data();
          const pinSnap = await getDoc(doc(db, 'user_pins', docSnap.id));
          if (pinSnap.exists()) {
            const pData = pinSnap.data();
            if (pData.hash && pData.salt) {
              const isValid = await verifyPin(pin, pData.hash, pData.salt);
              if (isValid) {
                return {
                  success: true,
                  supervisorToken: `local-token-${Date.now()}`,
                  supervisorName: supData.name || 'Superviseur',
                  supervisorRole: supData.role as UserRole,
                };
              }
            }
          }

          // Rétrocompatibilité / migration à la volée si ancien champ résiduel
          if (supData.pinCode && supData.pinCode === pin) {
            const { hash, salt } = await hashPin(pin);
            await setDoc(doc(db, 'user_pins', docSnap.id), {
              userId: docSnap.id,
              hash,
              salt,
              failedAttempts: 0,
              lockoutUntil: null,
              updatedAt: new Date().toISOString(),
            }, { merge: true });
            await updateDoc(doc(db, 'users', docSnap.id), {
              hasPin: true,
              pinCode: deleteField(),
              updatedAt: new Date().toISOString(),
            });
            return {
              success: true,
              supervisorToken: `local-token-${Date.now()}`,
              supervisorName: supData.name || 'Superviseur',
              supervisorRole: supData.role as UserRole,
            };
          }
        }
      } catch (err) {
        console.error('[AuthContext] Erreur vérification superviseur Firestore:', err);
      }

      return { success: false, message: 'Autorisation superviseur refusée (code PIN invalide).' };
    }
  };

  /**
   * Mise à jour du code PIN (Cloud Function prioritaire avec fallback Firestore PBKDF2)
   */
  const updateCurrentUserPin = async (newPin: string): Promise<boolean> => {
    if (!newPin || !/^\d{4,6}$/.test(newPin)) {
      return false;
    }
    // 1. Tentative Cloud Function
    try {
      await cloudFunctionsService.setPin(newPin);
    } catch {
      console.warn('[AuthContext] Cloud Function setPin indisponible, bascule sur hachage PBKDF2 direct');
    }

    // 2. Enregistrement direct sécurisé (hachage PBKDF2) et purge du clair
    try {
      if (currentUser && currentUser.id) {
        const { hash, salt } = await hashPin(newPin);

        await setDoc(
          doc(db, 'user_pins', currentUser.id),
          {
            userId: currentUser.id,
            hash,
            salt,
            failedAttempts: 0,
            lockoutUntil: null,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name,
          },
          { merge: true }
        );

        await updateDoc(
          doc(db, 'users', currentUser.id),
          {
            hasPin: true,
            pinCode: deleteField(),
            updatedAt: new Date().toISOString(),
          }
        );

        setCurrentUser((prev) => ({
          ...prev,
          hasPin: true,
        }));
        return true;
      }
    } catch (err) {
      console.error('[AuthContext] Échec de mise à jour sécurisée du code PIN:', err);
    }
    return false;
  };

  /**
   * Vérification sécurisée du code PIN actuel de l'utilisateur connecté (sans clair)
   */
  const verifyCurrentUserPin = async (pin: string): Promise<boolean> => {
    if (!currentUser || !currentUser.id || !pin) return false;
    try {
      const cfRes = await cloudFunctionsService.verifyPin(pin, currentUser.id);
      if (cfRes && cfRes.success) return true;
    } catch {
      // Ignorer fallback
    }

    try {
      const pinDocSnap = await getDoc(doc(db, 'user_pins', currentUser.id));
      if (pinDocSnap.exists()) {
        const pinData = pinDocSnap.data();
        if (pinData.hash && pinData.salt) {
          return await verifyPin(pin, pinData.hash, pinData.salt);
        }
      }
    } catch (err) {
      console.error('[AuthContext] Erreur verifyCurrentUserPin:', err);
    }
    return false;
  };

  const loginWithEmail = async (email: string, pass: string, restaurantCode: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
    try {
      await cloudFunctionsService.validateRestaurantAccessCode(restaurantCode);
    } catch (error) {
      await firebaseSignOut(auth);
      throw error;
    }
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    const pendingOfflineOperations = offlineSyncService.getPendingCount();
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    setFirebaseAuthUser(null);
    setCurrentUser(defaultUnauthenticatedUser);
    setIsSessionLocked(false);
    if (pendingOfflineOperations > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('restomaster:offline-pending', {
          detail: { count: pendingOfflineOperations },
        })
      );
    }
  };

  // Résolution unifiée des accès (Phase 1) : Tenant actif ET Module activé ET Onglet accordé ET Action autorisée
  const canAccess = (moduleOrTab: string): boolean => {
    if (!currentUser.active || currentUser.role === 'aucun') {
      return false;
    }
    return resolveAccess({
      entitlements: activeEntitlements,
      userAccess,
      fallbackPermissions: {
        additionalTabs: currentUser.additionalTabs,
        tabPermissions: currentUser.tabPermissions as any,
      },
      role: currentUser.role,
      tab: moduleOrTab,
      action: 'view',
    });
  };

  const hasPermission = (
    moduleOrTab: string,
    action: 'view' | 'create' | 'edit' | 'delete' = 'view'
  ): boolean => {
    if (!currentUser.active || currentUser.role === 'aucun') {
      return false;
    }
    return resolveAccess({
      entitlements: activeEntitlements,
      userAccess,
      fallbackPermissions: {
        additionalTabs: currentUser.additionalTabs,
        tabPermissions: currentUser.tabPermissions as any,
      },
      role: currentUser.role,
      tab: moduleOrTab,
      action,
    });
  };

  const hasAccess = (moduleOrTab: string, action?: string): boolean => {
    const act = (action === 'add' ? 'create' : action || 'view') as 'view' | 'create' | 'edit' | 'delete';
    return hasPermission(moduleOrTab, act);
  };

  const isSuperadmin = currentUser.role === 'superadmin';
  const isPlatformAdmin = isSuperadmin;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        firebaseAuthUser,
        isAuthLoading,
        isSuperadmin,
        isPlatformAdmin,
        loginWithEmail,
        sendPasswordReset,
        logout,
        canAccess,
        hasPermission,
        hasAccess,
        isSessionLocked,
        setIsSessionLocked,
        lockSession,
        unlockSessionWithPin,
        verifySupervisorPin,
        updateCurrentUserPin,
        verifyCurrentUserPin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
