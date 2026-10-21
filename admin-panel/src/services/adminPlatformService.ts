import { db, auth, functions } from '../../../src/lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  Tenant,
  TenantEntitlements,
  TenantSignupRequest,
  PlatformAuditLog,
  SupportSession,
  PlatformAdmin,
  Plan,
} from '@shared';

export interface PlatformAnnouncement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'maintenance' | 'nouveaute' | 'urgent';
  targetPlanIds: string[];
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  active: boolean;
}

export const adminPlatformService = {
  // ---------------------------------------------------------------------------
  // Écouteurs Firestore Temps Réel
  // ---------------------------------------------------------------------------

  subscribeToTenants(callback: (tenants: Tenant[]) => void): Unsubscribe {
    const collRef = collection(db, 'tenants');
    const q = query(collRef, orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const tenants = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Tenant[];
        callback(tenants);
      },
      (err) => {
        console.error('[adminPlatformService] Erreur écoute tenants:', err);
      }
    );
  },

  subscribeToTenant(orgId: string, callback: (tenant: Tenant | null) => void): Unsubscribe {
    if (!orgId) {
      callback(null);
      return () => {};
    }
    const docRef = doc(db, 'tenants', orgId);
    return onSnapshot(
      docRef,
      (snap) => {
        if (!snap.exists()) {
          callback(null);
          return;
        }
        callback({ id: snap.id, ...snap.data() } as Tenant);
      },
      (err) => {
        console.error(`[adminPlatformService] Erreur écoute tenant ${orgId}:`, err);
      }
    );
  },

  subscribeToTenantEntitlements(
    orgId: string,
    callback: (entitlements: TenantEntitlements | null) => void
  ): Unsubscribe {
    if (!orgId) {
      callback(null);
      return () => {};
    }
    const docRef = doc(db, 'tenants', orgId, 'entitlements', 'current');
    return onSnapshot(
      docRef,
      (snap) => {
        if (!snap.exists()) {
          callback(null);
          return;
        }
        callback(snap.data() as TenantEntitlements);
      },
      (err) => {
        console.error(`[adminPlatformService] Erreur écoute entitlements ${orgId}:`, err);
      }
    );
  },

  subscribeToSignups(callback: (signups: TenantSignupRequest[]) => void): Unsubscribe {
    const collRef = collection(db, 'tenant_signups');
    const q = query(collRef, orderBy('submittedAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const signups = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as TenantSignupRequest[];
        callback(signups);
      },
      (err) => {
        console.error('[adminPlatformService] Erreur écoute tenant_signups:', err);
      }
    );
  },

  subscribeToPlatformAuditLogs(
    callback: (logs: PlatformAuditLog[]) => void,
    limitCount: number = 100
  ): Unsubscribe {
    const collRef = collection(db, 'platform_audit_logs');
    const q = query(collRef, orderBy('timestamp', 'desc'), limit(limitCount));
    return onSnapshot(
      q,
      (snapshot) => {
        const logs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as PlatformAuditLog[];
        callback(logs);
      },
      (err) => {
        console.error('[adminPlatformService] Erreur écoute platform_audit_logs:', err);
      }
    );
  },

  subscribeToSupportSessions(callback: (sessions: SupportSession[]) => void): Unsubscribe {
    const collRef = collection(db, 'support_sessions');
    const q = query(collRef, orderBy('startedAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const sessions = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as SupportSession[];
        callback(sessions);
      },
      (err) => {
        console.error('[adminPlatformService] Erreur écoute support_sessions:', err);
      }
    );
  },

  subscribeToAnnouncements(callback: (announcements: PlatformAnnouncement[]) => void): Unsubscribe {
    const collRef = collection(db, 'platform_announcements');
    const q = query(collRef, orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const announcements = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as PlatformAnnouncement[];
        callback(announcements);
      },
      (err) => {
        console.error('[adminPlatformService] Erreur écoute platform_announcements:', err);
      }
    );
  },

  subscribeToTenantUsers(orgId: string, callback: (users: any[]) => void): Unsubscribe {
    if (!orgId) {
      callback([]);
      return () => {};
    }
    const collRef = collection(db, 'users');
    const q = query(collRef, where('organizationId', '==', orgId));
    return onSnapshot(
      q,
      (snapshot) => {
        const users = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          // Suppression absolue de tout champ sensible résiduel côté transport
          const { pinCode, password, ...safeUser } = data as any;
          return {
            id: docSnap.id,
            ...safeUser,
          };
        });
        callback(users);
      },
      (err) => {
        console.error(`[adminPlatformService] Erreur écoute users pour tenant ${orgId}:`, err);
      }
    );
  },

  subscribeToTenantOutlets(orgId: string, callback: (outlets: any[]) => void): Unsubscribe {
    if (!orgId) {
      callback([]);
      return () => {};
    }
    const collRef = collection(db, 'restaurants');
    const q = query(collRef, where('organizationId', '==', orgId));
    return onSnapshot(
      q,
      (snapshot) => {
        const outlets = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        callback(outlets);
      },
      (err) => {
        console.error(`[adminPlatformService] Erreur écoute restaurants pour tenant ${orgId}:`, err);
      }
    );
  },

  subscribeToPlatformAdmins(callback: (admins: PlatformAdmin[]) => void): Unsubscribe {
    const collRef = collection(db, 'platform_admins');
    return onSnapshot(
      collRef,
      (snapshot) => {
        const admins = snapshot.docs.map((docSnap) => ({
          uid: docSnap.id,
          ...docSnap.data(),
        })) as PlatformAdmin[];
        callback(admins);
      },
      (err) => {
        console.error('[adminPlatformService] Erreur écoute platform_admins:', err);
      }
    );
  },

  // ---------------------------------------------------------------------------
  // Appels Cloud Functions v2
  // ---------------------------------------------------------------------------

  async createTenant(params: any): Promise<any> {
    const fn = httpsCallable(functions, 'createTenant');
    const res = await fn(params);
    return res.data;
  },

  async setTenantStatus(params: {
    orgId: string;
    status: string;
    suspensionMode?: 'read_only' | 'full_block';
    reason: string;
  }): Promise<any> {
    const fn = httpsCallable(functions, 'setTenantStatus');
    const res = await fn(params);
    return res.data;
  },

  async approveSignup(params: {
    signupId: string;
    planId?: string;
    profileType?: string;
    reason: string;
  }): Promise<any> {
    const fn = httpsCallable(functions, 'approveSignup');
    const res = await fn(params);
    return res.data;
  },

  async rejectSignup(params: { signupId: string; reason: string }): Promise<any> {
    const fn = httpsCallable(functions, 'rejectSignup');
    const res = await fn(params);
    return res.data;
  },

  async updateTenantEntitlements(params: {
    orgId: string;
    features?: Record<string, any>;
    modules?: Record<string, boolean>;
    operationRules?: Record<string, boolean>;
    lockedConfigKeys?: string[];
    reason: string;
    ticketNumber?: string;
  }): Promise<any> {
    const fn = httpsCallable(functions, 'updateTenantEntitlements');
    const res = await fn(params);
    return res.data;
  },

  async applyProfileToTenant(params: {
    orgId: string;
    profileId: string;
    reason: string;
    ticketNumber?: string;
  }): Promise<any> {
    const fn = httpsCallable(functions, 'applyProfileToTenant');
    const res = await fn(params);
    return res.data;
  },

  async recordTenantPayment(params: {
    orgId: string;
    amountFcfa: number;
    periodMonths: number;
    paymentMethod: string;
    reference?: string;
    notes?: string;
  }): Promise<any> {
    const fn = httpsCallable(functions, 'recordTenantPayment');
    const res = await fn(params);
    return res.data;
  },

  async startSupportSession(params: {
    orgId: string;
    mode: 'read_only' | 'read_write';
    reason: string;
    durationMinutes?: number;
  }): Promise<any> {
    const fn = httpsCallable(functions, 'startSupportSession');
    const res = await fn(params);
    return res.data;
  },

  async closeSupportSession(params: { sessionId: string; summary?: string }): Promise<any> {
    const fn = httpsCallable(functions, 'closeSupportSession');
    const res = await fn(params);
    return res.data;
  },

  async createAnnouncement(params: {
    title: string;
    message: string;
    type: 'info' | 'maintenance' | 'nouveaute' | 'urgent';
    targetPlanIds?: string[];
  }): Promise<any> {
    const fn = httpsCallable(functions, 'createAnnouncement');
    const res = await fn(params);
    return res.data;
  },
};
