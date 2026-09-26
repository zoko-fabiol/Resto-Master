import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/restaurant';
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

export interface DemoUserOption {
  email: string;
  name: string;
  role: UserRole;
  avatar: string;
  description: string;
}

export const DEMO_ACCOUNTS: DemoUserOption[] = [
  {
    email: 'direction@demo.restaurant',
    name: 'Pauline Fouda',
    role: 'direction',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    description: 'Directrice Générale — Accès complet (Finances, Audit, Rapports, Paramètres)',
  },
  {
    email: 'manager@demo.restaurant',
    name: 'David Essomba',
    role: 'manager',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    description: 'Responsable Restaurant — Gestion de salle, commandes, réservations, personnel',
  },
  {
    email: 'serveur@demo.restaurant',
    name: 'Serge Mbappe',
    role: 'serveur',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    description: 'Serveur de Salle — Plan des tables, prise de commande POS, statut service',
  },
  {
    email: 'cuisine@demo.restaurant',
    name: 'Chef Gaston Mvogo',
    role: 'cuisine',
    avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150&auto=format&fit=crop&q=80',
    description: 'Chef Exécutif — Écran Cuisine KDS, temps de préparation, alertes commandes',
  },
  {
    email: 'bar@demo.restaurant',
    name: 'Rodrigue Fotso',
    role: 'bar',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    description: 'Barman en Chef — Écran Bar KDS, cocktails, vins, boissons',
  },
  {
    email: 'caisse@demo.restaurant',
    name: 'Béatrice Atangana',
    role: 'caisse',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    description: 'Caissière Principale — Encaissements, règlements multi-moyens, clôture caisse',
  },
  {
    email: 'stock@demo.restaurant',
    name: 'Alain Ndzie',
    role: 'stock',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    description: 'Magasinier / Économe — Gestion des stocks, inventaires réels, réceptions achats',
  },
  {
    email: 'finance@demo.restaurant',
    name: 'Marcelle Nguemo',
    role: 'finance',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    description: 'Responsable Financière — Dépenses, marges, factures fournisseurs, états de résultat',
  },
];

interface AuthContextType {
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseAuthUser, setFirebaseAuthUser] = useState<FirebaseUser | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

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
      organizationId: 'org-cameroun-hospitality',
      accessibleRestaurantIds: ['out-1', 'out-2', 'out-3'],
      defaultRestaurantId: 'out-1',
      active: true,
    });
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

  // RBAC permissions matrix
  const canAccess = (module: string): boolean => {
    const role = currentUser.role;
    if (role === 'direction' || role === 'manager') return true;

    switch (module) {
      case 'dashboard':
        return ['direction', 'manager', 'caisse', 'finance'].includes(role);
      case 'tables':
      case 'pos':
      case 'reservations':
        return ['direction', 'manager', 'serveur', 'caisse'].includes(role);
      case 'kitchen_kds':
        return ['direction', 'manager', 'cuisine'].includes(role);
      case 'bar_kds':
        return ['direction', 'manager', 'bar'].includes(role);
      case 'caisse':
      case 'main_courante':
        return ['direction', 'manager', 'caisse', 'finance'].includes(role);
      case 'menu':
        return ['direction', 'manager', 'cuisine'].includes(role);
      case 'stock':
        return ['direction', 'manager', 'stock', 'cuisine', 'bar'].includes(role);
      case 'purchases':
        return ['direction', 'manager', 'stock', 'finance'].includes(role);
      case 'finance':
        return ['direction', 'finance'].includes(role);
      case 'clients':
        return ['direction', 'manager', 'serveur', 'caisse'].includes(role);
      case 'staff':
        return ['direction', 'manager', 'rh'].includes(role);
      case 'documents':
        return ['direction', 'manager', 'finance', 'stock', 'rh'].includes(role);
      case 'reports':
        return ['direction', 'manager', 'finance', 'caisse'].includes(role);
      case 'audit':
      case 'settings':
        return ['direction'].includes(role);
      default:
        return true;
    }
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
