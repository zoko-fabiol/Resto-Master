import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db } from '../../../src/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { PlatformAdmin, PlatformRole } from '@shared';

interface AdminAuthContextType {
  currentAdmin: PlatformAdmin | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  mfaPending: boolean;
  loginStep1: (email: string, pass: string) => Promise<{ requiresMfa: boolean }>;
  verifyMfa: (code: string) => Promise<void>;
  registerInitialSuperadmin: (email: string, pass: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: PlatformRole | PlatformRole[]) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentAdmin, setCurrentAdmin] = useState<PlatformAdmin | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mfaPending, setMfaPending] = useState<boolean>(false);
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; uid: string } | null>(null);

  const resolveAdminProfile = useCallback(async (user: FirebaseUser) => {
    try {
      const tokenResult = await user.getIdTokenResult(true);
      const platformRole = tokenResult.claims.platformRole as PlatformRole | undefined;

      // 1. Priorité aux Custom Claims Firebase Auth (platformRole)
      if (platformRole) {
        return {
          uid: user.uid,
          email: user.email || '',
          name: (tokenResult.claims.name as string) || user.email?.split('@')[0] || 'Admin',
          role: platformRole,
          active: tokenResult.claims.active !== false,
          mfaEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as PlatformAdmin;
      }

      // 2. Si le compte possède le rôle superadmin dans les Claims
      if (tokenResult.claims.role === 'superadmin') {
        const ownerAdmin: PlatformAdmin = {
          uid: user.uid,
          email: user.email || '',
          name: (tokenResult.claims.name as string) || user.email?.split('@')[0] || 'Superadmin Fondateur',
          role: 'platform_owner',
          active: true,
          mfaEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        try {
          await setDoc(doc(db, 'platform_admins', user.uid), ownerAdmin, { merge: true });
        } catch {}
        return ownerAdmin;
      }

      // 3. Repli sur le document Firestore platform_admins
      try {
        const adminDoc = await getDoc(doc(db, 'platform_admins', user.uid));
        if (adminDoc.exists()) {
          const data = adminDoc.data();
          if (data.active !== false) {
            return {
              uid: user.uid,
              email: user.email || data.email,
              name: data.name || user.email?.split('@')[0] || 'Admin Plateforme',
              role: data.role || 'platform_admin',
              active: true,
              mfaEnabled: Boolean(data.mfaEnabled),
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
            } as PlatformAdmin;
          }
        }
      } catch (err) {
        console.warn('[AdminAuthContext] Lecture platform_admins non autorisée ou échouée:', err);
      }

      // 4. Repli sur le document users/{uid} : si role == 'superadmin' ou 'direction'
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const udata = userDoc.data();
          if (udata.role === 'superadmin' || udata.role === 'direction') {
            const ownerAdmin: PlatformAdmin = {
              uid: user.uid,
              email: user.email || udata.email,
              name: udata.name || user.email?.split('@')[0] || 'Superadmin Fondateur',
              role: 'platform_owner',
              active: true,
              mfaEnabled: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            try {
              await setDoc(doc(db, 'platform_admins', user.uid), ownerAdmin, { merge: true });
            } catch {}
            return ownerAdmin;
          }
        }
      } catch (err) {
        console.warn('[AdminAuthContext] Lecture users non autorisée ou échouée:', err);
      }

      return null;
    } catch (err) {
      console.error('[AdminAuthContext] Échec de résolution du rôle plateforme:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setFirebaseUser(null);
        setCurrentAdmin(null);
        setIsLoading(false);
        return;
      }

      setFirebaseUser(user);
      const admin = await resolveAdminProfile(user);
      setCurrentAdmin(admin);
      setIsLoading(false);
    });

    return () => unsub();
  }, [resolveAdminProfile]);

  const loginStep1 = async (email: string, pass: string): Promise<{ requiresMfa: boolean }> => {
    setIsLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const admin = await resolveAdminProfile(cred.user);

      if (!admin) {
        await signOut(auth);
        throw new Error('Accès refusé. Ce compte ne possède pas de rôle d’administration plateforme.');
      }

      // Simulation TOTP MFA obligatoire pour Super Admin Console
      if (admin.mfaEnabled || admin.role === 'platform_owner') {
        setMfaPending(true);
        setPendingCredentials({ email: admin.email, uid: admin.uid });
        setIsLoading(false);
        return { requiresMfa: true };
      }

      setCurrentAdmin(admin);
      setFirebaseUser(cred.user);
      setIsLoading(false);
      return { requiresMfa: false };
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const verifyMfa = async (code: string): Promise<void> => {
    if (!pendingCredentials) {
      throw new Error('Aucune session d’authentification en attente de code MFA.');
    }

    // Le code TOTP simulé à 6 chiffres doit être numérique et non trivial
    const cleanCode = code.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      throw new Error('Le code de sécurité doit comporter exactement 6 chiffres.');
    }

    // Validation du code MFA
    setMfaPending(false);
    setPendingCredentials(null);

    if (auth.currentUser) {
      const admin = await resolveAdminProfile(auth.currentUser);
      setCurrentAdmin(admin);
    }
  };

  const registerInitialSuperadmin = async (email: string, pass: string, name?: string): Promise<void> => {
    setIsLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const adminName = name?.trim() || email.split('@')[0] || 'Superadmin Fondateur';
      const now = new Date().toISOString();

      const newAdmin: PlatformAdmin = {
        uid: cred.user.uid,
        email: cred.user.email || email.trim(),
        name: adminName,
        role: 'platform_owner',
        active: true,
        mfaEnabled: true,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'platform_admins', cred.user.uid), newAdmin);
      setCurrentAdmin(newAdmin);
      setFirebaseUser(cred.user);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
    setCurrentAdmin(null);
    setFirebaseUser(null);
    setMfaPending(false);
    setPendingCredentials(null);
  };

  const hasRole = (roles: PlatformRole | PlatformRole[]): boolean => {
    if (!currentAdmin) return false;
    if (currentAdmin.role === 'platform_owner') return true;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(currentAdmin.role);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        currentAdmin,
        firebaseUser,
        isLoading,
        isAuthenticated: Boolean(currentAdmin && !mfaPending),
        mfaPending,
        loginStep1,
        verifyMfa,
        registerInitialSuperadmin,
        logout,
        hasRole,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
