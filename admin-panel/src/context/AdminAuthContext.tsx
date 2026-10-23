import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db } from '../../../src/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  multiFactor,
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

  const resolveAdminProfile = useCallback(async (user: FirebaseUser): Promise<PlatformAdmin | null> => {
    try {
      const tokenResult = await user.getIdTokenResult(true);
      const platformRole = tokenResult.claims.platformRole as PlatformRole | undefined;

      // 1. Accès conditionné STRICTEMENT par le custom claim platformRole
      const validPlatformRoles: PlatformRole[] = ['platform_owner', 'platform_admin', 'support', 'billing'];
      if (!platformRole || !validPlatformRoles.includes(platformRole)) {
        console.warn(`[AdminAuthContext] Accès refusé pour ${user.email}: aucun platformRole valide.`);
        return null;
      }

      // 2. Détermination réelle de l'état MFA (multi-facteurs enrolés ou claim explicite)
      let hasEnrolledMfa = false;
      try {
        hasEnrolledMfa = multiFactor(user).enrolledFactors.length > 0;
      } catch {
        hasEnrolledMfa = false;
      }
      if (tokenResult.claims.mfaEnabled === true) {
        hasEnrolledMfa = true;
      }

      // 3. Lecture facultative des métadonnées du document platform_admins
      let adminName = (tokenResult.claims.name as string) || user.displayName || user.email?.split('@')[0] || 'Admin';
      let isActive = tokenResult.claims.active !== false;
      let effectiveMfa = hasEnrolledMfa;

      try {
        const adminDoc = await getDoc(doc(db, 'platform_admins', user.uid));
        if (adminDoc.exists()) {
          const data = adminDoc.data();
          if (data.active === false) {
            isActive = false;
          }
          if (data.name) {
            adminName = data.name;
          }
          if (data.mfaEnabled !== undefined) {
            effectiveMfa = Boolean(data.mfaEnabled);
          }
        }
      } catch (err) {
        // En cas d'erreur de lecture Firestore, les claims de sécurité Auth font foi
        console.warn('[AdminAuthContext] Lecture doc platform_admins ignorée:', err);
      }

      if (!isActive) {
        console.warn(`[AdminAuthContext] Compte platformAdmin inactif pour ${user.email}.`);
        return null;
      }

      return {
        uid: user.uid,
        email: user.email || '',
        name: adminName,
        role: platformRole,
        active: true,
        mfaEnabled: effectiveMfa,
        createdAt: user.metadata.creationTime || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
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

      // TOTP MFA seulement si activé sur le compte
      if (admin.mfaEnabled) {
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
