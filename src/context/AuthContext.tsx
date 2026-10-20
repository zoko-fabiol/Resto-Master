import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, AccountType, UserAccount } from '../types/restaurant';
import { auth, db } from '../lib/firebase';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { staffFirestoreService } from '../services/firestore/staffFirestoreService';
import { configFirestoreService } from '../services/firestore/configFirestoreService';
import { DEFAULT_PERMISSIONS } from '../services/permissions/permissionService';
import { RolePermissionMatrix, PermissionModule, PermissionAction } from '../types/configuration';

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
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, role?: UserRole) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  canAccess: (module: string) => boolean;
  hasPermission: (module: string, action?: 'view' | 'create' | 'edit' | 'delete') => boolean;
  hasAccess: (module: string, action?: 'view' | 'create' | 'edit' | 'delete' | 'add' | string) => boolean;

  // Session & PIN Lock Controls
  isSessionLocked: boolean;
  setIsSessionLocked: (locked: boolean) => void;
  lockSession: () => void;
  unlockSessionWithPin: (pin: string) => { success: boolean; user?: UserProfile; message?: string };
  verifySupervisorPin: (pin: string) => { success: boolean; user?: UserProfile };
  updateCurrentUserPin: (newPin: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseAuthUser, setFirebaseAuthUser] = useState<FirebaseUser | null>(null);
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(() => {
    return localStorage.getItem('restomaster_session_locked') === 'true';
  });
  const [configuredUserAccounts, setConfiguredUserAccounts] = useState<UserAccount[]>([]);

  useEffect(() => {
    const unsub = staffFirestoreService.subscribeToUserAccounts((accounts) => {
      setConfiguredUserAccounts(accounts);
    });
    return () => unsub();
  }, []);

  const [rolePermissions, setRolePermissions] = useState<RolePermissionMatrix>(() => {
    try {
      const saved = localStorage.getItem('restomaster_rolePermissions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PERMISSIONS;
  });

  useEffect(() => {
    const unsub = configFirestoreService.subscribeToRolePermissions((matrix) => {
      setRolePermissions(matrix);
      try {
        localStorage.setItem('restomaster_rolePermissions', JSON.stringify(matrix));
      } catch {}
    });
    return () => unsub();
  }, []);

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('restomaster_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Garantit qu'aucun pinCode n'est conservé
        const { pinCode: _pin, ...safeUser } = parsed;
        return safeUser;
      } catch {
        // fallback
      }
    }
    return defaultUnauthenticatedUser;
  });

  useEffect(() => {
    // Règle 0.5 : Ne plus stocker pinCode dans localStorage
    const { pinCode: _pin, ...safeUser } = currentUser;
    localStorage.setItem('restomaster_user', JSON.stringify(safeUser));
  }, [currentUser]);

  // Synchronisation avec Firebase Authentication & Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseAuthUser(fbUser);

      if (fbUser && fbUser.email) {
        try {
          // Read user profile from Firestore collection `users/${uid}`
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            const userRole: UserRole = data.role && data.role !== 'aucun' ? (data.role as UserRole) : 'aucun';
            setCurrentUser({
              id: fbUser.uid,
              email: fbUser.email,
              name: data.name || fbUser.displayName || fbUser.email.split('@')[0],
              role: userRole,
              avatar: data.avatar || fbUser.photoURL,
              phone: data.phone || fbUser.phoneNumber || '+237 699 00 11 22',
              organizationId: data.organizationId || '',
              accessibleRestaurantIds: data.accessibleRestaurantIds || [],
              defaultRestaurantId: data.defaultRestaurantId,
              active: data.active === true,
            });
          } else {
            // Règle 0.4 : Rôle 'aucun' et compte inactif par défaut
            const newProfile: UserProfile = {
              id: fbUser.uid,
              email: fbUser.email,
              name: fbUser.displayName || fbUser.email.split('@')[0],
              role: 'aucun',
              avatar: fbUser.photoURL || undefined,
              phone: fbUser.phoneNumber || undefined,
              organizationId: '',
              accessibleRestaurantIds: [],
              active: false,
            };

            await setDoc(userDocRef, {
              ...newProfile,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });

            setCurrentUser(newProfile);
          }
        } catch {
          // Règle 0.4 : Repli hors-ligne sécurisé sans privilèges
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
    });

    return () => unsubscribe();
  }, []);

  const lockSession = () => {
    setIsSessionLocked(true);
    localStorage.setItem('restomaster_session_locked', 'true');
  };

  // Helper pour lire dynamiquement les comptes utilisateurs configurés
  const getStoredUserAccounts = (): UserAccount[] => {
    try {
      const raw = localStorage.getItem('restomaster_user_accounts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.warn('Failed to parse restomaster_user_accounts', err);
    }
    return [];
  };

  const unlockSessionWithPin = (pin: string): { success: boolean; user?: UserProfile; message?: string } => {
    // 1. Vérifier si correspond au PIN de l'utilisateur actuellement connecté
    if (currentUser.pinCode && currentUser.pinCode === pin) {
      setIsSessionLocked(false);
      localStorage.setItem('restomaster_session_locked', 'false');
      return { success: true, user: currentUser };
    }

    // 2. Vérifier dans les comptes dynamiques configurés dans Firestore
    const dynamicAccounts = configuredUserAccounts.length > 0 ? configuredUserAccounts : getStoredUserAccounts();
    const dynamicMatch = dynamicAccounts.find((a) => a.active && a.pinCode === pin);
    if (dynamicMatch) {
      if (dynamicMatch.assignedTableId) {
        localStorage.setItem('restomaster_tablet_table_id', dynamicMatch.assignedTableId);
      }
      const newUser: UserProfile = {
        id: dynamicMatch.id,
        email: dynamicMatch.email,
        name: dynamicMatch.name,
        role: dynamicMatch.role,
        avatar: dynamicMatch.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        phone: dynamicMatch.phone || '+237 699 00 11 22',
        pinCode: dynamicMatch.pinCode,
        badgeNumber: dynamicMatch.matricule,
        accountType: dynamicMatch.accountType,
        assignedTableId: dynamicMatch.assignedTableId,
        assignedTableName: dynamicMatch.assignedTableName,
        tabPermissions: dynamicMatch.tabPermissions,
        additionalTabs: dynamicMatch.additionalTabs,
        organizationId: 'org-cameroun-hospitality',
        accessibleRestaurantIds: ['out-1', 'out-2', 'out-3'],
        defaultRestaurantId: 'out-1',
        active: dynamicMatch.active,
      };
      setCurrentUser(newUser);
      setIsSessionLocked(false);
      localStorage.setItem('restomaster_session_locked', 'false');
      return { success: true, user: newUser };
    }

    // Aucun passe-droit magique : échec strict si le PIN ne correspond à aucun compte configuré
    return { success: false, message: 'Code PIN incorrect. Veuillez réessayer.' };
  };

  const verifySupervisorPin = (pin: string): { success: boolean; user?: UserProfile } => {
    const supervisorRoles: UserRole[] = ['direction', 'manager'];

    // 1. Utilisateur courant s'il est superviseur et que son PIN correspond
    if (supervisorRoles.includes(currentUser.role) && currentUser.pinCode === pin) {
      return { success: true, user: currentUser };
    }

    // 2. Vérifier dans les comptes configurés dynamiques ayant le rôle Superviseur
    const dynamicAccounts = configuredUserAccounts.length > 0 ? configuredUserAccounts : getStoredUserAccounts();
    const dynamicSupervisor = dynamicAccounts.find(
      (a) => a.active && supervisorRoles.includes(a.role) && a.pinCode === pin
    );
    if (dynamicSupervisor) {
      return {
        success: true,
        user: {
          id: dynamicSupervisor.id,
          email: dynamicSupervisor.email,
          name: dynamicSupervisor.name,
          role: dynamicSupervisor.role,
          avatar: dynamicSupervisor.avatar,
          pinCode: dynamicSupervisor.pinCode,
          badgeNumber: dynamicSupervisor.matricule,
          active: true,
        },
      };
    }

    // Aucun passe-droit magique "en boîte"
    return { success: false };
  };

  const updateCurrentUserPin = async (newPin: string): Promise<boolean> => {
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return false;
    }

    // 1. Mettre à jour l'utilisateur courant en session
    const updatedUser: UserProfile = { ...currentUser, pinCode: newPin };
    setCurrentUser(updatedUser);
    const { pinCode: _pin, ...safeUser } = updatedUser;
    localStorage.setItem('restomaster_user', JSON.stringify(safeUser));

    // 2. Mettre à jour dans Firestore collection user_accounts
    const targetAccount = configuredUserAccounts.find(
      (acc) => acc.id === currentUser.id || acc.email.toLowerCase() === currentUser.email.toLowerCase()
    );
    if (targetAccount) {
      staffFirestoreService.saveUserAccount({
        ...targetAccount,
        pinCode: newPin,
        updatedAt: new Date().toISOString(),
      }).catch((err) => {
        console.error('[AuthContext] Échec de mise à jour du compte personnel dans Firestore:', err);
      });
    }

    // 3. Synchronisation Firestore users/{uid}
    if (firebaseAuthUser) {
      try {
        const userDocRef = doc(db, 'users', firebaseAuthUser.uid);
        await setDoc(userDocRef, { pinCode: newPin, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (err) {
        console.warn('Could not sync PIN to Firestore', err);
      }
    }

    return true;
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Identifiants de connexion incorrects';
      throw new Error(message || 'Identifiants de connexion incorrects');
    }
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    name: string,
    _role: UserRole = 'aucun'
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });

    const newProfile: UserProfile = {
      id: cred.user.uid,
      email: cred.user.email || email,
      name,
      role: 'aucun', // Règle 0.4 : Aucun accès par défaut
      active: false, // Doit être validé et provisionné par la direction
      accessibleRestaurantIds: [],
    };

    // Save in Firestore
    try {
      await setDoc(doc(db, 'users', cred.user.uid), {
        ...newProfile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // Offline fallback
    }

    setCurrentUser(newProfile);
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
    localStorage.removeItem('restomaster_user');
    localStorage.removeItem('restomaster_session_locked');
  };

  // RBAC permissions matrix connectée dynamiquement à Firestore (system_config/role_permissions)
  const canAccess = (module: string): boolean => {
    // Si compte inactif ou rôle 'aucun' : accès strictement interdit
    if (!currentUser.active || currentUser.role === 'aucun') {
      return false;
    }

    // 1. Direction possède un accès universel absolu
    if (currentUser.role === 'direction') return true;

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
    if (currentUser.role === 'direction') return true;

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

    // Vérification dans la matrice des permissions Firestore
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
    if (currentUser.role === 'direction' || currentUser.role === 'manager') return true;
    if (!action || action === 'view') {
      return canAccess(module);
    }
    const act = action === 'add' ? 'create' : (action as 'create' | 'edit' | 'delete');
    return hasPermission(module, act);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        firebaseAuthUser,
        loginWithEmail,
        registerWithEmail,
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
