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

export interface DemoUserOption {
  email: string;
  name: string;
  role: UserRole;
  avatar: string;
  description: string;
  pinCode: string;
  matricule: string;
  accountType?: AccountType;
  assignedTableId?: string;
  assignedTableName?: string;
}

export const DEMO_ACCOUNTS: DemoUserOption[] = [
  {
    email: 'direction@demo.restaurant',
    name: 'Pauline Fouda',
    role: 'direction',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    description: 'Directrice Générale — Accès complet (Finances, Audit, Rapports, Paramètres)',
    pinCode: '1111',
    matricule: 'DIR-01',
  },
  {
    email: 'manager@demo.restaurant',
    name: 'David Essomba',
    role: 'manager',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    description: 'Responsable Restaurant — Gestion de salle, commandes, réservations, personnel',
    pinCode: '2222',
    matricule: 'MGR-01',
  },
  {
    email: 'serveur@demo.restaurant',
    name: 'Serge Mbappe',
    role: 'serveur',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    description: 'Serveur de Salle — Plan des tables, prise de commande POS, statut service',
    pinCode: '3333',
    matricule: 'SRV-01',
  },
  {
    email: 'cuisine@demo.restaurant',
    name: 'Chef Gaston Mvogo',
    role: 'cuisine',
    avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150&auto=format&fit=crop&q=80',
    description: 'Chef Exécutif — Écran Cuisine KDS, temps de préparation, alertes commandes',
    pinCode: '4444',
    matricule: 'CUI-01',
  },
  {
    email: 'bar@demo.restaurant',
    name: 'Rodrigue Fotso',
    role: 'bar',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    description: 'Barman en Chef — Écran Bar KDS, cocktails, vins, boissons',
    pinCode: '5555',
    matricule: 'BAR-01',
  },
  {
    email: 'caisse@demo.restaurant',
    name: 'Béatrice Atangana',
    role: 'caisse',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    description: 'Caissière Principale — Encaissements, règlements multi-moyens, clôture caisse',
    pinCode: '6666',
    matricule: 'CSS-01',
  },
  {
    email: 'stock@demo.restaurant',
    name: 'Alain Ndzie',
    role: 'stock',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    description: 'Magasinier / Économe — Gestion des stocks, inventaires réels, réceptions achats',
    pinCode: '7777',
    matricule: 'STK-01',
  },
  {
    email: 'finance@demo.restaurant',
    name: 'Marcelle Nguemo',
    role: 'finance',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    description: 'Responsable Financière — Dépenses, marges, factures fournisseurs, états de résultat',
    pinCode: '8888',
    matricule: 'FIN-01',
  },
  // 9 à 12. Comptes Spécifiques « Mode Tablette » (Tablette 1, 2, 3, VIP)
  {
    email: 'tablette1@resto.cm',
    name: 'Tablette Table 1',
    role: 'tablette',
    avatar: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=150',
    description: 'Borne Table 1 — Kiosk Client exclusif sans sidebar',
    pinCode: '0001',
    matricule: 'TAB-01',
    accountType: 'tablette',
    assignedTableId: 't1',
    assignedTableName: 'Table 1',
  },
  {
    email: 'tablette2@resto.cm',
    name: 'Tablette Table 2',
    role: 'tablette',
    avatar: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=150',
    description: 'Borne Table 2 — Kiosk Client exclusif sans sidebar',
    pinCode: '0002',
    matricule: 'TAB-02',
    accountType: 'tablette',
    assignedTableId: 't2',
    assignedTableName: 'Table 2',
  },
  {
    email: 'tablette3@resto.cm',
    name: 'Tablette Table 3',
    role: 'tablette',
    avatar: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=150',
    description: 'Borne Table 3 — Kiosk Client exclusif sans sidebar',
    pinCode: '0003',
    matricule: 'TAB-03',
    accountType: 'tablette',
    assignedTableId: 't3',
    assignedTableName: 'Table 3',
  },
  {
    email: 'tablette4@resto.cm',
    name: 'Tablette Table 4 (VIP)',
    role: 'tablette',
    avatar: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=150',
    description: 'Borne Table 4 VIP — Kiosk Client exclusif sans sidebar',
    pinCode: '0004',
    matricule: 'TAB-04',
    accountType: 'tablette',
    assignedTableId: 't4',
    assignedTableName: 'Table 4 - Salon VIP',
  },
];

export interface AuthContextType {
  currentUser: UserProfile;
  firebaseAuthUser: FirebaseUser | null;
  isDemoMode: boolean;
  switchRole: (role: UserRole) => void;
  selectDemoUser: (user: DemoUserOption) => void;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, role?: UserRole) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  canAccess: (module: string) => boolean;
  hasPermission: (module: string, action?: 'view' | 'create' | 'edit' | 'delete') => boolean;

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
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
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

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('restomaster_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      id: 'demo-dir-1',
      email: DEMO_ACCOUNTS[0].email,
      name: DEMO_ACCOUNTS[0].name,
      role: 'direction',
      avatar: DEMO_ACCOUNTS[0].avatar,
      phone: '+237 699 00 11 22',
      pinCode: DEMO_ACCOUNTS[0].pinCode,
      badgeNumber: DEMO_ACCOUNTS[0].matricule,
      active: true,
      organizationId: 'org-cameroun-hospitality',
      accessibleRestaurantIds: ['out-1', 'out-2', 'out-3'],
      defaultRestaurantId: 'out-1',
    };
  });

  useEffect(() => {
    localStorage.setItem('restomaster_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Synchronisation avec Firebase Authentication & Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseAuthUser(fbUser);

      if (fbUser && fbUser.email) {
        setIsDemoMode(false);
        try {
          // Read user profile from Firestore collection `users/${uid}`
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            setCurrentUser({
              id: fbUser.uid,
              email: fbUser.email,
              name: data.name || fbUser.displayName || fbUser.email.split('@')[0],
              role: (data.role as UserRole) || 'direction',
              avatar: data.avatar || fbUser.photoURL || DEMO_ACCOUNTS[0].avatar,
              phone: data.phone || fbUser.phoneNumber || '+237 699 00 11 22',
              organizationId: data.organizationId || 'org-cameroun-hospitality',
              accessibleRestaurantIds: data.accessibleRestaurantIds || ['out-1', 'out-2', 'out-3'],
              defaultRestaurantId: data.defaultRestaurantId || 'out-1',
              active: data.active !== false,
            });
          } else {
            // Check if matches a demo account email for seed
            const matchedDemo = DEMO_ACCOUNTS.find(
              (a) => a.email.toLowerCase() === fbUser.email?.toLowerCase()
            );

            const newProfile: UserProfile = {
              id: fbUser.uid,
              email: fbUser.email,
              name: fbUser.displayName || (matchedDemo ? matchedDemo.name : fbUser.email.split('@')[0]),
              role: matchedDemo ? matchedDemo.role : 'direction',
              avatar: matchedDemo ? matchedDemo.avatar : DEMO_ACCOUNTS[0].avatar,
              phone: '+237 699 00 11 22',
              organizationId: 'org-cameroun-hospitality',
              accessibleRestaurantIds: ['out-1', 'out-2', 'out-3'],
              defaultRestaurantId: 'out-1',
              active: true,
            };

            // Save to Firestore
            await setDoc(userDocRef, {
              ...newProfile,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });

            setCurrentUser(newProfile);
          }
        } catch {
          // Offline fallback
          setCurrentUser({
            id: fbUser.uid,
            email: fbUser.email,
            name: fbUser.displayName || fbUser.email.split('@')[0],
            role: 'direction',
            avatar: DEMO_ACCOUNTS[0].avatar,
            active: true,
          });
        }
      } else {
        // No Firebase user authenticated -> Stay in demo mode with active persona
        setIsDemoMode(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const switchRole = (newRole: UserRole) => {
    setIsDemoMode(true);
    const matched = DEMO_ACCOUNTS.find((a) => a.role === newRole) || DEMO_ACCOUNTS[0];
    setCurrentUser({
      id: `usr-${newRole}`,
      email: matched.email,
      name: matched.name,
      role: newRole,
      avatar: matched.avatar,
      phone: '+237 699 00 11 22',
      organizationId: 'org-cameroun-hospitality',
      accessibleRestaurantIds: ['out-1', 'out-2', 'out-3'],
      defaultRestaurantId: 'out-1',
      active: true,
    });
  };

  const selectDemoUser = (demoUser: DemoUserOption) => {
    setIsDemoMode(true);
    setCurrentUser({
      id: `usr-${demoUser.role}`,
      email: demoUser.email,
      name: demoUser.name,
      role: demoUser.role,
      avatar: demoUser.avatar,
      phone: '+237 699 00 11 22',
      pinCode: demoUser.pinCode,
      badgeNumber: demoUser.matricule,
      organizationId: 'org-cameroun-hospitality',
      accessibleRestaurantIds: ['out-1', 'out-2', 'out-3'],
      defaultRestaurantId: 'out-1',
      active: true,
    });
  };

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

    // 3. Amorce initiale / fallback comptes de démonstration (ex: 1111 pour Direction, 2222 pour Manager)
    const matched = DEMO_ACCOUNTS.find((a) => a.pinCode === pin);
    if (matched) {
      if (matched.assignedTableId) {
        localStorage.setItem('restomaster_tablet_table_id', matched.assignedTableId);
      }
      const newUser: UserProfile = {
        id: `usr-${matched.role}-${matched.pinCode}`,
        email: matched.email,
        name: matched.name,
        role: matched.role,
        avatar: matched.avatar,
        phone: '+237 699 00 11 22',
        pinCode: matched.pinCode,
        badgeNumber: matched.matricule,
        accountType: matched.accountType,
        assignedTableId: matched.assignedTableId,
        assignedTableName: matched.assignedTableName,
        organizationId: 'org-cameroun-hospitality',
        accessibleRestaurantIds: ['out-1', 'out-2', 'out-3'],
        defaultRestaurantId: 'out-1',
        active: true,
      };
      setCurrentUser(newUser);
      setIsSessionLocked(false);
      localStorage.setItem('restomaster_session_locked', 'false');
      return { success: true, user: newUser };
    }

    // Aucun passe-droit magique "en boîte" : échec strict si le PIN ne correspond à aucun compte configuré
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

    // 3. Fallback comptes démo superviseurs
    const matched = DEMO_ACCOUNTS.find((a) => supervisorRoles.includes(a.role) && a.pinCode === pin);
    if (matched) {
      return {
        success: true,
        user: {
          id: `usr-${matched.role}`,
          email: matched.email,
          name: matched.name,
          role: matched.role,
          avatar: matched.avatar,
          pinCode: matched.pinCode,
          badgeNumber: matched.matricule,
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
    localStorage.setItem('restomaster_user', JSON.stringify(updatedUser));

    // 2. Mettre à jour dans Firestore collection user_accounts
    const targetAccount = configuredUserAccounts.find(
      (acc) => acc.id === currentUser.id || acc.email.toLowerCase() === currentUser.email.toLowerCase()
    );
    if (targetAccount) {
      staffFirestoreService.saveUserAccount({
        ...targetAccount,
        pinCode: newPin,
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }

    // 3. Synchronisation Firestore users/{uid}
    if (firebaseAuthUser && !isDemoMode) {
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
    } catch (err: any) {
      // Check if email matches demo account
      const matched = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase());
      if (matched) {
        selectDemoUser(matched);
      } else {
        throw new Error(err.message || 'Identifiants de connexion incorrects');
      }
    }
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    name: string,
    role: UserRole = 'direction'
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });

    const newProfile: UserProfile = {
      id: cred.user.uid,
      email: cred.user.email || email,
      name,
      role,
      avatar: DEMO_ACCOUNTS[0].avatar,
      phone: '+237 699 00 11 22',
      organizationId: 'org-cameroun-hospitality',
      accessibleRestaurantIds: ['out-1', 'out-2', 'out-3'],
      defaultRestaurantId: 'out-1',
      active: true,
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
    setIsDemoMode(false);
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
    setIsDemoMode(true);
    selectDemoUser(DEMO_ACCOUNTS[0]);
  };

  // RBAC permissions matrix avec prise en compte des droits fins et onglets additionnels
  const canAccess = (module: string): boolean => {
    // 1. Les comptes Tablettes n'ont accès qu'au Kiosk
    if (currentUser.role === 'tablette') {
      return module === 'kiosk';
    }

    // 2. Direction et Manager ont accès universel par défaut
    if (currentUser.role === 'direction' || currentUser.role === 'manager') return true;

    // 3. Onglets additionnels explicitement accordés à cet utilisateur
    if (currentUser.additionalTabs && currentUser.additionalTabs.includes(module)) {
      return true;
    }

    // 4. Si permission personnalisée explicite configurée
    if (currentUser.tabPermissions && currentUser.tabPermissions[module]) {
      return currentUser.tabPermissions[module].view;
    }

    switch (module) {
      case 'dashboard':
        return ['direction', 'manager', 'caisse', 'finance'].includes(currentUser.role);
      case 'tables':
      case 'pos':
      case 'reservations':
        return ['direction', 'manager', 'serveur', 'caisse'].includes(currentUser.role);
      case 'kitchen_kds':
        return ['direction', 'manager', 'cuisine'].includes(currentUser.role);
      case 'bar_kds':
        return ['direction', 'manager', 'bar'].includes(currentUser.role);
      case 'caisse':
      case 'main_courante':
        return ['direction', 'manager', 'caisse', 'finance'].includes(currentUser.role);
      case 'menu':
        return ['direction', 'manager', 'cuisine'].includes(currentUser.role);
      case 'stock':
        return ['direction', 'manager', 'stock', 'cuisine', 'bar'].includes(currentUser.role);
      case 'purchases':
        return ['direction', 'manager', 'stock', 'finance'].includes(currentUser.role);
      case 'finance':
        return ['direction', 'finance'].includes(currentUser.role);
      case 'clients':
        return ['direction', 'manager', 'serveur', 'caisse'].includes(currentUser.role);
      case 'staff':
      case 'users':
        return ['direction', 'manager', 'rh'].includes(currentUser.role);
      case 'documents':
        return ['direction', 'manager', 'finance', 'stock', 'rh'].includes(currentUser.role);
      case 'reports':
        return ['direction', 'manager', 'finance', 'caisse'].includes(currentUser.role);
      case 'audit':
      case 'settings':
        return ['direction'].includes(currentUser.role);
      default:
        return true;
    }
  };

  const hasPermission = (
    module: string,
    action: 'view' | 'create' | 'edit' | 'delete' = 'view'
  ): boolean => {
    if (currentUser.role === 'direction') return true;

    if (currentUser.role === 'tablette') {
      return module === 'kiosk' && action !== 'delete';
    }

    // Si permission granulaire explicite
    if (currentUser.tabPermissions && currentUser.tabPermissions[module]) {
      return currentUser.tabPermissions[module][action];
    }

    // Si action de consultation (view)
    if (action === 'view') {
      return canAccess(module);
    }

    // Par défaut pour create / edit / delete
    if (currentUser.role === 'manager') return true;
    if (action === 'delete') return false;
    return canAccess(module);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseAuthUser,
        isDemoMode,
        switchRole,
        selectDemoUser,
        loginWithEmail,
        registerWithEmail,
        sendPasswordReset,
        logout,
        canAccess,
        hasPermission,
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
