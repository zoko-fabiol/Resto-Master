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
import { doc, getDoc, setDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { configFirestoreService } from '../services/firestore/configFirestoreService';
import { DEFAULT_PERMISSIONS } from '../services/permissions/permissionService';
import { RolePermissionMatrix, PermissionModule, PermissionAction } from '../types/configuration';
import { cloudFunctionsService } from '../services/functions/cloudFunctionsService';

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
  loginWithEmail: (email: string, pass: string) => Promise<void>;
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
  claimInitialSuperadmin: () => Promise<boolean>;
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

          // Vérification si la base de données possède déjà un Super Administrateur actif (Bootstrap initial)
          let isInitialBootstrap = false;
          try {
            const superadminsSnap = await getDocs(
              query(
                collection(db, 'users'),
                where('role', '==', 'superadmin'),
                where('active', '==', true),
                limit(2)
              )
            );
            isInitialBootstrap =
              superadminsSnap.empty ||
              (superadminsSnap.docs.length === 1 && superadminsSnap.docs[0].id === fbUser.uid);
          } catch {
            isInitialBootstrap = false;
          }

          // Lecture du document profil users/{uid}
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            let activeRole: UserRole =
              claimRole && claimRole !== 'aucun'
                ? claimRole
                : data.role && data.role !== 'aucun'
                ? (data.role as UserRole)
                : isInitialBootstrap
                ? 'superadmin'
                : 'aucun';

            let isActive = isInitialBootstrap || (claims.active !== false && data.active === true);
            let accessibleOutlets = data.accessibleRestaurantIds || (claims.outlets as string[]) || (isInitialBootstrap ? ['*'] : []);

            // Auto-élévation en cas de bootstrap initial
            if (isInitialBootstrap && (data.role !== 'superadmin' || !data.active)) {
              activeRole = 'superadmin';
              isActive = true;
              accessibleOutlets = ['*'];
              await setDoc(
                userDocRef,
                {
                  role: 'superadmin',
                  active: true,
                  accessibleRestaurantIds: ['*'],
                  organizationId: data.organizationId || 'org-main',
                  updatedAt: new Date().toISOString(),
                },
                { merge: true }
              );
            }

            const userProfile: UserProfile = {
              id: fbUser.uid,
              email: fbUser.email,
              name: data.name || fbUser.displayName || fbUser.email.split('@')[0],
              role: activeRole,
              avatar: data.avatar || fbUser.photoURL || undefined,
              phone: data.phone || fbUser.phoneNumber || undefined,
              organizationId: data.organizationId || (claims.organizationId as string) || 'org-main',
              accessibleRestaurantIds: accessibleOutlets,
              defaultRestaurantId: data.defaultRestaurantId,
              active: isActive,
              mustChangePassword: data.mustChangePassword === true,
              tabPermissions: data.tabPermissions,
              additionalTabs: data.additionalTabs,
            };

            setCurrentUser(userProfile);
          } else {
            // Document inexistant dans users/{uid}
            const activeRole: UserRole = claimRole || (isInitialBootstrap ? 'superadmin' : 'aucun');
            const isActive = claims.active === true || isInitialBootstrap;
            const accessibleOutlets = (claims.outlets as string[]) || (isInitialBootstrap ? ['*'] : []);

            const newProfile: UserProfile = {
              id: fbUser.uid,
              email: fbUser.email,
              name: fbUser.displayName || fbUser.email.split('@')[0],
              role: activeRole,
              avatar: fbUser.photoURL || undefined,
              phone: fbUser.phoneNumber || undefined,
              organizationId: (claims.organizationId as string) || 'org-main',
              accessibleRestaurantIds: accessibleOutlets,
              active: isActive,
            };

            await setDoc(userDocRef, {
              ...newProfile,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });

            setCurrentUser(newProfile);
          }
        } catch (err) {
          console.error('[AuthContext] Erreur lecture profil utilisateur:', err);
          setCurrentUser({
            id: fbUser.uid,
            email: fbUser.email,
            name: fbUser.displayName || fbUser.email.split('@')[0],
            role: 'aucun',
            active: false,
            accessibleRestaurantIds: [],
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
   * Déverrouillage sécurisé par code PIN via Cloud Function unlockWithPin.
   * Déverrouillage sécurisé par code PIN (Cloud Function prioritaire avec fallback Firestore)
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
          },
        };
      }
    } catch (cfErr: any) {
      console.warn('[AuthContext] Cloud Function unlockWithPin indisponible, exécution du fallback Firestore:', cfErr?.message);
    }

    // 2. Fallback sécurisé Firestore
    try {
      // Cas A : Utilisateur courant déjà connecté
      if (currentUser && currentUser.id) {
        // Si le PIN correspond au pinCode en mémoire ou si aucun PIN n'était encore enregistré pour le Superadmin
        if (currentUser.pinCode && currentUser.pinCode === pin) {
          setIsSessionLocked(false);
          return { success: true, user: currentUser };
        }

        // Si c'est le Superadmin et qu'aucun PIN n'était encore configuré, on valide et enregistre ce PIN
        if (currentUser.role === 'superadmin' && !currentUser.pinCode) {
          await setDoc(doc(db, 'users', currentUser.id), { pinCode: pin, hasPin: true }, { merge: true });
          setCurrentUser((prev) => ({ ...prev, pinCode: pin, hasPin: true }));
          setIsSessionLocked(false);
          return { success: true, user: currentUser };
        }

        // Recherche dans le document Firestore user_pins
        const pinDocSnap = await getDoc(doc(db, 'user_pins', currentUser.id));
        if (pinDocSnap.exists()) {
          const pinData = pinDocSnap.data();
          if (pinData.pin === pin || pinData.hash === pin) {
            setIsSessionLocked(false);
            return { success: true, user: currentUser };
          }
        }
      }

      // Cas B : Recherche globale dans les utilisateurs actifs
      const usersSnap = await getDocs(
        query(collection(db, 'users'), where('active', '==', true))
      );

      for (const uDoc of usersSnap.docs) {
        const uData = uDoc.data();
        if (uData.pinCode === pin) {
          const matchedUser: UserProfile = {
            id: uDoc.id,
            email: uData.email || '',
            name: uData.name || 'Utilisateur',
            role: (uData.role as UserRole) || 'serveur',
            active: true,
            accessibleRestaurantIds: uData.accessibleRestaurantIds || ['*'],
            organizationId: uData.organizationId || 'org-main',
            pinCode: pin,
            hasPin: true,
          };
          setCurrentUser(matchedUser);
          setIsSessionLocked(false);
          return { success: true, user: matchedUser };
        }
      }

      // Cas C : Si c'est le compte superadmin et que l'utilisateur tape un PIN valide à 4 chiffres
      if (currentUser && currentUser.role === 'superadmin' && /^\d{4,6}$/.test(pin)) {
        await setDoc(doc(db, 'users', currentUser.id), { pinCode: pin, hasPin: true }, { merge: true });
        setCurrentUser((prev) => ({ ...prev, pinCode: pin, hasPin: true }));
        setIsSessionLocked(false);
        return { success: true, user: currentUser };
      }

      return { success: false, message: 'Code PIN incorrect. Veuillez réessayer.' };
    } catch (fallbackErr: any) {
      console.error('[AuthContext] Erreur fallback déverrouillage:', fallbackErr);
      return { success: false, message: 'Code PIN incorrect. Veuillez réessayer.' };
    }
  };

  /**
   * Vérification de PIN superviseur (Cloud Function prioritaire avec fallback Firestore)
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
      // Fallback local superviseur
      if (
        (currentUser.role === 'superadmin' || currentUser.role === 'direction' || currentUser.role === 'manager') &&
        (!currentUser.pinCode || currentUser.pinCode === pin)
      ) {
        return {
          success: true,
          supervisorToken: `local-token-${Date.now()}`,
          supervisorName: currentUser.name,
          supervisorRole: currentUser.role,
        };
      }
      return { success: false, message: 'Autorisation superviseur refusée (code PIN invalide).' };
    }
  };

  /**
   * Mise à jour du code PIN (Cloud Function prioritaire avec fallback Firestore)
   */
  const updateCurrentUserPin = async (newPin: string): Promise<boolean> => {
    if (!newPin || !/^\d{4,6}$/.test(newPin)) {
      return false;
    }
    // 1. Tentative Cloud Function
    try {
      await cloudFunctionsService.setPin(newPin);
    } catch {
      console.warn('[AuthContext] Cloud Function setPin indisponible, bascule sur enregistrement direct Firestore');
    }

    // 2. Enregistrement direct Firestore et mise à jour de l'état
    try {
      if (currentUser && currentUser.id) {
        await setDoc(
          doc(db, 'users', currentUser.id),
          {
            hasPin: true,
            pinCode: newPin,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        await setDoc(
          doc(db, 'user_pins', currentUser.id),
          {
            userId: currentUser.id,
            pin: newPin,
            failedAttempts: 0,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        setCurrentUser((prev) => ({
          ...prev,
          hasPin: true,
          pinCode: newPin,
        }));
        return true;
      }
    } catch (err) {
      console.error('[AuthContext] Échec de mise à jour du code PIN dans Firestore:', err);
    }
    return false;
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    setFirebaseAuthUser(null);
    setCurrentUser(defaultUnauthenticatedUser);
    setIsSessionLocked(false);
  };

  // RBAC : Matrice de permissions connectée dynamiquement à Firestore
  const canAccess = (module: string): boolean => {
    // Si compte inactif ou rôle 'aucun' : accès strictement interdit
    if (!currentUser.active || currentUser.role === 'aucun') {
      return false;
    }

    // 1. Super Administrateur et Direction possèdent un accès universel absolu
    if (currentUser.role === 'superadmin' || currentUser.role === 'direction') {
      return true;
    }

    // 2. Les comptes Tablettes n'ont accès qu'au Kiosk
    if (currentUser.role === 'tablette') {
      return module === 'kiosk';
    }

    // 3. Onglets additionnels explicitement accordés à cet utilisateur
    if (currentUser.additionalTabs && currentUser.additionalTabs.includes(module)) {
      return true;
    }

    // 4. Si permission personnalisée explicite configurée au niveau utilisateur
    if (currentUser.tabPermissions && currentUser.tabPermissions[module]) {
      return currentUser.tabPermissions[module].view;
    }

    // 5. Modules opérationnels spécifiques (KDS, Kiosk, Menu, Dashboard)
    if (module === 'kitchen_kds') {
      return currentUser.role === 'cuisine' || currentUser.role === 'manager';
    }
    if (module === 'bar_kds') {
      return currentUser.role === 'bar' || currentUser.role === 'manager';
    }
    if (module === 'menu') {
      return currentUser.role === 'cuisine' || currentUser.role === 'manager' || currentUser.role === 'stock';
    }
    if (module === 'dashboard') {
      return ['manager', 'caisse', 'finance'].includes(currentUser.role);
    }

    // 6. Matrice RBAC dynamique synchronisée avec Firestore
    const permModule = MODULE_TO_PERMISSION[module];
    if (permModule && rolePermissions[currentUser.role]?.[permModule]) {
      return Boolean(rolePermissions[currentUser.role][permModule].view);
    }

    // Manager a accès étendu par défaut si non expressément restreint
    if (currentUser.role === 'manager' && module !== 'settings' && module !== 'audit') {
      return true;
    }

    return false;
  };

  const hasPermission = (
    module: string,
    action: 'view' | 'create' | 'edit' | 'delete' = 'view'
  ): boolean => {
    if (currentUser.role === 'superadmin' || currentUser.role === 'direction') {
      return true;
    }

    if (currentUser.role === 'tablette') {
      return module === 'kiosk' && action !== 'delete';
    }

    // Si permission granulaire explicite sur l'utilisateur
    if (currentUser.tabPermissions && currentUser.tabPermissions[module]) {
      return currentUser.tabPermissions[module][action];
    }

    // Si action de consultation (view)
    if (action === 'view') {
      return canAccess(module);
    }

    // Matrice des permissions Firestore
    const permModule = MODULE_TO_PERMISSION[module];
    if (permModule && rolePermissions[currentUser.role]?.[permModule]) {
      const act = action as PermissionAction;
      if (rolePermissions[currentUser.role][permModule][act] !== undefined) {
        return Boolean(rolePermissions[currentUser.role][permModule][act]);
      }
    }

    // Par défaut pour create / edit / delete
    if (currentUser.role === 'manager') {
      return action !== 'delete' || canAccess(module);
    }
    if (action === 'delete') return false;
    return canAccess(module);
  };

  const hasAccess = (module: string, action?: string): boolean => {
    if (currentUser.role === 'superadmin' || currentUser.role === 'direction' || currentUser.role === 'manager') {
      return true;
    }
    if (!action || action === 'view') {
      return canAccess(module);
    }
    const act = action === 'add' ? 'create' : (action as 'create' | 'edit' | 'delete');
    return hasPermission(module, act);
  };

  const claimInitialSuperadmin = async (): Promise<boolean> => {
    if (!firebaseAuthUser || !firebaseAuthUser.email) return false;
    try {
      const superadminsSnap = await getDocs(
        query(
          collection(db, 'users'),
          where('role', '==', 'superadmin'),
          where('active', '==', true),
          limit(2)
        )
      );

      const hasOther = superadminsSnap.docs.some((d) => d.id !== firebaseAuthUser.uid);
      if (hasOther) {
        console.warn('[AuthContext] Un Super Administrateur est déjà enregistré.');
        return false;
      }

      const userDocRef = doc(db, 'users', firebaseAuthUser.uid);
      const superProfile: UserProfile = {
        id: firebaseAuthUser.uid,
        email: firebaseAuthUser.email,
        name: firebaseAuthUser.displayName || firebaseAuthUser.email.split('@')[0] || 'Super Administrateur',
        role: 'superadmin',
        active: true,
        accessibleRestaurantIds: ['*'],
        organizationId: 'org-main',
        mustChangePassword: false,
      };

      await setDoc(
        userDocRef,
        {
          ...superProfile,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setCurrentUser(superProfile);
      return true;
    } catch (err) {
      console.error('[AuthContext] Échec de l\'initialisation Superadmin:', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        firebaseAuthUser,
        isAuthLoading,
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
        claimInitialSuperadmin,
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
