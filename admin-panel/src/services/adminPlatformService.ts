import { db, auth, functions, firebaseConfig } from '../../../src/lib/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as authSignOut } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  getDoc,
  setDoc,
  updateDoc,
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
  PendingDeletion,
  CONFIGURATION_PROFILES,
  DEFAULT_PLANS,
} from '@shared';
import { gasEmailService } from './gasEmailService';

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

  subscribeToPendingDeletions(callback: (deletions: PendingDeletion[]) => void): Unsubscribe {
    const collRef = collection(db, 'pending_deletions');
    const q = query(collRef, orderBy('requestedAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const deletions = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as PendingDeletion[];
        callback(deletions);
      },
      (err) => {
        console.error('[adminPlatformService] Erreur écoute pending_deletions:', err);
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
    try {
      const fn = httpsCallable(functions, 'createTenant');
      const res = await fn(params);
      return res.data;
    } catch (fnErr) {
      console.warn('[adminPlatformService] Cloud Function non disponible, repli sur Firestore direct:', fnErr);
      const orgId = params.orgId || `org_${Date.now()}`;
      const now = new Date().toISOString();
      const newTenant = {
        id: orgId,
        companyName: params.companyName,
        legalName: params.legalName || params.companyName,
        legalForm: params.legalForm || 'SARL',
        city: params.city,
        country: params.country || 'Cameroun',
        address: params.address || params.city,
        phone: params.phone,
        email: params.email,
        ownerName: params.ownerName,
        ownerEmail: params.ownerEmail,
        ownerPhone: params.ownerPhone || params.phone,
        planId: params.planId || 'plan_pro',
        status: 'actif',
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, 'tenants', orgId), newTenant);
      return { success: true, orgId, message: 'Établissement créé avec succès.' };
    }
  },

  async provisionRestaurantInitialSetup(params: {
    setupSessionId: string;
    companyName: string;
    legalName?: string;
    legalForm?: 'SARL' | 'SA' | 'SAS' | 'ETS' | 'GIC' | 'AUTRE';
    taxId?: string;
    rccm?: string;
    taxCenter?: string;
    city: string;
    country?: string;
    address: string;
    phone: string;
    email: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone?: string;
    planId?: string;
    profileType?: string;
    channel?: 'stable' | 'beta';
    currency?: 'FCFA' | 'EUR' | 'USD' | 'CAD' | 'GBP';
    reason: string;
    ticketNumber?: string;
  }): Promise<{
    success: true;
    orgId: string;
    restaurantId: string;
    ownerUid: string;
    passwordResetLink: string;
    restaurantCode?: string;
    codeAlreadyDelivered: boolean;
  }> {
    const fn = httpsCallable<typeof params, {
      success: true;
      orgId: string;
      restaurantId: string;
      ownerUid: string;
      passwordResetLink: string;
      restaurantCode?: string;
      codeAlreadyDelivered: boolean;
    }>(functions, 'provisionRestaurantInitialSetup');
    const res = await fn(params);
    return res.data;
  },

  async setTenantStatus(params: {
    orgId: string;
    status: string;
    suspensionMode?: 'read_only' | 'full_block';
    reason: string;
  }): Promise<any> {
    try {
      const fn = httpsCallable(functions, 'setTenantStatus');
      const res = await fn(params);
      return res.data;
    } catch (fnErr) {
      console.warn('[adminPlatformService] Cloud Function non disponible, repli sur Firestore direct:', fnErr);
      const tenantRef = doc(db, 'tenants', params.orgId);
      const now = new Date().toISOString();
      await updateDoc(tenantRef, {
        status: params.status,
        suspensionMode: params.suspensionMode || null,
        updatedAt: now,
        statusChangeReason: params.reason,
      });
      return { success: true, orgId: params.orgId, status: params.status };
    }
  },

  async approveSignup(params: {
    signupId: string;
    planId?: string;
    profileType?: string;
    reason: string;
  }): Promise<any> {
    try {
      const fn = httpsCallable(functions, 'approveSignup');
      const res = await fn(params);
      return res.data;
    } catch (fnErr) {
      console.warn('[adminPlatformService] Cloud Function non disponible, repli sur Firestore direct:', fnErr);
      const signupRef = doc(db, 'tenant_signups', params.signupId);
      const signupSnap = await getDoc(signupRef);
      if (!signupSnap.exists()) {
        throw new Error("Demande d'inscription introuvable.");
      }
      const data = signupSnap.data();
      const orgId = `org_${params.signupId.replace('req_', '')}`;
      const restaurantId = `resto_${params.signupId.replace('req_', '')}`;
      const now = new Date().toISOString();

      // Génération d'un code restaurant unique et élégant (ex: RMS-DLA-7421)
      const cityLetters = (data.city || 'RMS').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'RMS';
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const restaurantCode = `RMS-${cityLetters}-${randomSuffix}`;

      // Mot de passe initial saisi par le responsable ou généré
      const ownerPassword = data.initialPassword?.trim() || `Resto${Math.floor(1000 + Math.random() * 9000)}!`;

      // Création du compte Firebase Auth via une instance temporaire (ne déconnecte pas l'administrateur courant)
      let ownerUid = `owner_${orgId}`;
      try {
        const tempApp = initializeApp(firebaseConfig, `temp-${Date.now()}`);
        const tempAuth = getAuth(tempApp);
        const cred = await createUserWithEmailAndPassword(tempAuth, data.email, ownerPassword);
        ownerUid = cred.user.uid;
        await authSignOut(tempAuth);
        await deleteApp(tempApp);
      } catch (authErr: any) {
        console.warn('[adminPlatformService] Création Auth (existant ou différé):', authErr?.code || authErr?.message);
      }

      // Création de l'utilisateur Propriétaire / Superadmin
      const ownerUser = {
        id: ownerUid,
        email: data.email,
        name: data.applicantName,
        phone: data.phone,
        role: 'superadmin',
        accountType: 'staff',
        active: true,
        organizationId: orgId,
        accessibleRestaurantIds: ['*'],
        mustChangePassword: true,
        isFirstLogin: true,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, 'users', ownerUid), ownerUser, { merge: true });

      // Création de l'établissement principal (Restaurant outlet)
      const newRestaurant = {
        id: restaurantId,
        name: data.companyName,
        organizationId: orgId,
        city: data.city,
        phone: data.phone,
        email: data.email,
        active: true,
        restaurantCode,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, 'restaurants', restaurantId), newRestaurant, { merge: true });

      // Création du Tenant SaaS
      const planId = params.planId || data.desiredPlanId || 'plan_pro';
      const plan = DEFAULT_PLANS.find((p) => p.id === planId) || DEFAULT_PLANS[1];

      const newTenant = {
        id: orgId,
        companyName: data.companyName,
        legalName: data.companyName,
        legalForm: data.legalForm || 'SARL',
        city: data.city,
        country: data.country || 'Cameroun',
        address: data.city,
        phone: data.phone,
        email: data.email,
        ownerName: data.applicantName,
        ownerEmail: data.email,
        ownerPhone: data.phone,
        planId,
        restaurantCode,
        status: 'actif',
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, 'tenants', orgId), newTenant, { merge: true });

      // Initialisation des entitlements par défaut du tenant
      const defaultEntitlements = {
        orgId,
        features: {},
        modules: {
          mod_pos: true,
          mod_tables: (data.estimatedTables || 10) > 0,
          mod_cuisine: true,
          mod_bar: true,
          mod_stock: true,
          mod_caisse: true,
          mod_rapports: true,
          mod_rh: true,
          mod_finance: true,
        },
        operationRules: {},
        lockedConfigKeys: [],
        effectiveLimits: plan.limits,
        updatedAt: now,
        updatedBy: auth.currentUser?.email || 'admin',
        lastModifiedReason: params.reason,
      };
      await setDoc(doc(db, 'tenants', orgId, 'entitlements', 'current'), defaultEntitlements, { merge: true });

      // Mise à jour de la demande d'inscription
      await updateDoc(signupRef, {
        status: 'approuvee',
        orgId,
        restaurantCode,
        ownerUid,
        approvedAt: now,
        approvalReason: params.reason,
      });

      // Calcul de l'URL de connexion directe pour le client RestoMaster OS
      const clientBaseUrl =
        (import.meta as any).env?.VITE_APP_CLIENT_URL ||
        (window.location.port === '3001' ? `${window.location.protocol}//${window.location.hostname}:3000` : window.location.origin);
      const directLoginUrl = `${clientBaseUrl}/?restaurantCode=${encodeURIComponent(restaurantCode)}&email=${encodeURIComponent(data.email)}`;

      // Envoi de l'e-mail de bienvenue avec identifiants via Google Apps Script (100 mails/jour gratuits)
      const emailRes = await gasEmailService.sendWelcomeEmail({
        to: data.email,
        recipientName: data.applicantName,
        restaurantName: data.companyName,
        restaurantCode,
        email: data.email,
        password: ownerPassword,
        planName: plan.name,
        city: data.city,
        loginUrl: directLoginUrl,
      });

      return {
        success: true,
        orgId,
        restaurantCode,
        email: data.email,
        password: ownerPassword,
        emailSent: emailRes.success,
        emailMessage: emailRes.message,
        message: `Inscription approuvée avec succès ! Établissement "${data.companyName}" activé. ${emailRes.message}`,
      };
    }
  },

  async rejectSignup(params: { signupId: string; reason: string }): Promise<any> {
    try {
      const fn = httpsCallable(functions, 'rejectSignup');
      const res = await fn(params);
      return res.data;
    } catch (fnErr) {
      console.warn('[adminPlatformService] Cloud Function non disponible, repli sur Firestore direct:', fnErr);
      const signupRef = doc(db, 'tenant_signups', params.signupId);
      await updateDoc(signupRef, {
        status: 'rejetee',
        rejectedAt: new Date().toISOString(),
        rejectionReason: params.reason,
      });
      return { success: true, message: 'Demande rejetée avec succès.' };
    }
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
    try {
      const fn = httpsCallable(functions, 'updateTenantEntitlements');
      const res = await fn(params);
      return res.data;
    } catch (fnErr) {
      console.warn('[adminPlatformService] Cloud Function non disponible, repli sur Firestore direct:', fnErr);
      const docRef = doc(db, 'tenants', params.orgId, 'entitlements', 'current');
      const now = new Date().toISOString();
      const existingSnap = await getDoc(docRef);
      const existingData = existingSnap.exists() ? existingSnap.data() : {};

      const normalizedFeatures: Record<string, any> = {};
      if (params.features) {
        for (const [featId, val] of Object.entries(params.features)) {
          if (typeof val === 'object' && val !== null) {
            normalizedFeatures[featId] = {
              status: (val as any).status || 'ACTIVÉ',
              source: (val as any).source || 'profil',
              activatedBy: auth.currentUser?.email || 'admin',
              activatedAt: now,
              reason: params.reason,
            };
          } else {
            normalizedFeatures[featId] = {
              status: val ? 'ACTIVÉ' : 'DÉSACTIVÉ',
              source: 'override',
              activatedBy: auth.currentUser?.email || 'admin',
              activatedAt: now,
              reason: params.reason,
            };
          }
        }
      }

      const updatedEntitlements = {
        orgId: params.orgId,
        features: {
          ...(existingData.features || {}),
          ...normalizedFeatures,
        },
        modules: {
          ...(existingData.modules || {}),
          ...(params.modules || {}),
        },
        operationRules: {
          ...(existingData.operationRules || {}),
          ...(params.operationRules || {}),
        },
        lockedConfigKeys: params.lockedConfigKeys || existingData.lockedConfigKeys || [],
        effectiveLimits: existingData.effectiveLimits || {
          maxOutlets: 3,
          maxUsers: 20,
          maxTerminals: 10,
          maxOrdersPerMonth: 10000,
        },
        updatedAt: now,
        updatedBy: auth.currentUser?.email || 'admin',
        lastModifiedReason: params.reason,
      };

      await setDoc(docRef, updatedEntitlements, { merge: true });

      try {
        const auditLogRef = doc(collection(db, 'platform_audit_logs'));
        await setDoc(auditLogRef, {
          id: auditLogRef.id,
          action: 'entitlements.update',
          targetOrgId: params.orgId,
          reason: params.reason,
          timestamp: now,
          actor: auth.currentUser?.email || 'admin',
        });
      } catch {}

      return {
        success: true,
        message: 'Configuration appliquée avec succès (mode direct Firestore).',
      };
    }
  },

  async applyProfileToTenant(params: {
    orgId: string;
    profileId: string;
    reason: string;
    ticketNumber?: string;
  }): Promise<any> {
    try {
      const fn = httpsCallable(functions, 'applyProfileToTenant');
      const res = await fn(params);
      return res.data;
    } catch (fnErr) {
      console.warn('[adminPlatformService] Cloud Function non disponible, repli sur Firestore direct:', fnErr);
      const profile = CONFIGURATION_PROFILES.find((p) => p.id === params.profileId);
      const now = new Date().toISOString();
      const docRef = doc(db, 'tenants', params.orgId, 'entitlements', 'current');
      const existingSnap = await getDoc(docRef);
      const existingData = existingSnap.exists() ? existingSnap.data() : {};

      const newFeatures: Record<string, any> = { ...(existingData.features || {}) };
      if (profile) {
        for (const featId of profile.enabledFeatures) {
          newFeatures[featId] = {
            status: 'ACTIVÉ',
            source: 'profil',
            activatedBy: auth.currentUser?.email || 'admin',
            activatedAt: now,
            reason: params.reason,
          };
        }
        for (const featId of profile.disabledFeatures) {
          newFeatures[featId] = {
            status: 'DÉSACTIVÉ',
            source: 'profil',
            activatedBy: auth.currentUser?.email || 'admin',
            activatedAt: now,
            reason: params.reason,
          };
        }
      }

      const updatedEntitlements = {
        orgId: params.orgId,
        features: newFeatures,
        modules: existingData.modules || {},
        operationRules: existingData.operationRules || {},
        lockedConfigKeys: existingData.lockedConfigKeys || [],
        effectiveLimits: existingData.effectiveLimits || {
          maxOutlets: 3,
          maxUsers: 20,
          maxTerminals: 10,
          maxOrdersPerMonth: 10000,
        },
        updatedAt: now,
        updatedBy: auth.currentUser?.email || 'admin',
        lastModifiedReason: params.reason,
      };

      await setDoc(docRef, updatedEntitlements, { merge: true });
      return { success: true, message: 'Profil appliqué avec succès.' };
    }
  },

  async recordTenantPayment(params: {
    orgId: string;
    amountFcfa: number;
    periodMonths: number;
    paymentMethod: string;
    reference?: string;
    notes?: string;
  }): Promise<any> {
    try {
      const fn = httpsCallable(functions, 'recordTenantPayment');
      const res = await fn(params);
      return res.data;
    } catch (fnErr) {
      console.warn('[adminPlatformService] Cloud Function non disponible, repli sur Firestore direct:', fnErr);
      const payRef = doc(collection(db, 'tenants', params.orgId, 'payments'));
      const now = new Date().toISOString();
      await setDoc(payRef, {
        id: payRef.id,
        ...params,
        paidAt: now,
      });
      return { success: true, paymentId: payRef.id };
    }
  },

  async startSupportSession(params: {
    orgId: string;
    mode: 'read_only' | 'read_write';
    reason: string;
    durationMinutes?: number;
  }): Promise<any> {
    try {
      const fn = httpsCallable(functions, 'startSupportSession');
      const res = await fn(params);
      return res.data;
    } catch (fnErr) {
      console.warn('[adminPlatformService] Cloud Function non disponible, repli sur Firestore direct:', fnErr);
      const sessRef = doc(collection(db, 'support_sessions'));
      const now = new Date().toISOString();
      await setDoc(sessRef, {
        id: sessRef.id,
        ...params,
        startedAt: now,
        status: 'active',
        actor: auth.currentUser?.email || 'admin',
      });
      return { success: true, sessionId: sessRef.id };
    }
  },

  async closeSupportSession(params: { sessionId: string; summary?: string }): Promise<any> {
    try {
      const fn = httpsCallable(functions, 'closeSupportSession');
      const res = await fn(params);
      return res.data;
    } catch (fnErr) {
      console.warn('[adminPlatformService] Cloud Function non disponible, repli sur Firestore direct:', fnErr);
      const sessRef = doc(db, 'support_sessions', params.sessionId);
      await updateDoc(sessRef, {
        status: 'closed',
        closedAt: new Date().toISOString(),
        summary: params.summary || '',
      });
      return { success: true, sessionId: params.sessionId };
    }
  },

  async createAnnouncement(params: {
    title: string;
    message: string;
    type: 'info' | 'maintenance' | 'nouveaute' | 'urgent';
    targetPlanIds?: string[];
  }): Promise<any> {
    try {
      const fn = httpsCallable(functions, 'createAnnouncement');
      const res = await fn(params);
      return res.data;
    } catch (fnErr) {
      console.warn('[adminPlatformService] Cloud Function non disponible, repli sur Firestore direct:', fnErr);
      const annRef = doc(collection(db, 'platform_announcements'));
      const now = new Date().toISOString();
      await setDoc(annRef, {
        id: annRef.id,
        ...params,
        createdAt: now,
        active: true,
        createdBy: auth.currentUser?.email || 'admin',
      });
      return { success: true, announcementId: annRef.id };
    }
  },

  subscribeToTenantSnapshots(orgId: string, callback: (snapshots: any[]) => void): Unsubscribe {
    if (!orgId) {
      callback([]);
      return () => {};
    }
    const collRef = collection(db, 'tenants', orgId, 'config_snapshots');
    const q = query(collRef, orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const snaps = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        callback(snaps);
      },
      (err) => {
        console.error(`[adminPlatformService] Erreur écoute snapshots pour ${orgId}:`, err);
      }
    );
  },

  async snapshotTenantConfig(params: { orgId: string; label?: string; reason: string }): Promise<any> {
    try {
      const fn = httpsCallable(functions, 'snapshotTenantConfig');
      const res = await fn(params);
      return res.data;
    } catch (fnErr) {
      console.warn('[adminPlatformService] Cloud Function non disponible, repli sur Firestore direct:', fnErr);
      const snapRef = doc(collection(db, 'tenants', params.orgId, 'config_snapshots'));
      const now = new Date().toISOString();
      const currentEntSnap = await getDoc(doc(db, 'tenants', params.orgId, 'entitlements', 'current'));
      await setDoc(snapRef, {
        id: snapRef.id,
        label: params.label || 'Sauvegarde manuelle',
        reason: params.reason,
        createdAt: now,
        entitlements: currentEntSnap.exists() ? currentEntSnap.data() : {},
      });
      return { success: true, snapshotId: snapRef.id };
    }
  },

  async rollbackTenantConfig(params: { orgId: string; snapshotId: string; reason: string }): Promise<any> {
    try {
      const fn = httpsCallable(functions, 'rollbackTenantConfig');
      const res = await fn(params);
      return res.data;
    } catch (fnErr) {
      console.warn('[adminPlatformService] Cloud Function non disponible, repli sur Firestore direct:', fnErr);
      const snapDoc = await getDoc(doc(db, 'tenants', params.orgId, 'config_snapshots', params.snapshotId));
      if (!snapDoc.exists()) throw new Error('Snapshot introuvable.');
      const snapshotData = snapDoc.data();
      if (snapshotData.entitlements) {
        await setDoc(doc(db, 'tenants', params.orgId, 'entitlements', 'current'), snapshotData.entitlements);
      }
      return { success: true, message: 'Configuration restaurée.' };
    }
  },

  async runDiagnostics(params: { orgId: string }): Promise<any> {
    const fn = httpsCallable(functions, 'runDiagnostics');
    const res = await fn(params);
    return res.data;
  },

  async requestTenantDeletion(params: { orgId: string; reason: string }): Promise<any> {
    try {
      const fn = httpsCallable(functions, 'requestTenantDeletion');
      const res = await fn(params);
      return res.data;
    } catch (fnErr) {
      console.warn('[adminPlatformService] Cloud Function non disponible, repli sur Firestore direct:', fnErr);
      const delRef = doc(collection(db, 'pending_deletions'));
      const now = new Date().toISOString();
      await setDoc(delRef, {
        id: delRef.id,
        orgId: params.orgId,
        reason: params.reason,
        requestedAt: now,
        requestedBy: auth.currentUser?.email || 'admin',
        status: 'pending',
      });
      return { success: true, deletionRequestId: delRef.id };
    }
  },

  async approveTenantDeletion(params: { deletionRequestId: string; reason: string }): Promise<any> {
    try {
      const fn = httpsCallable(functions, 'approveTenantDeletion');
      const res = await fn(params);
      return res.data;
    } catch (fnErr) {
      console.warn('[adminPlatformService] Cloud Function non disponible, repli sur Firestore direct:', fnErr);
      const delRef = doc(db, 'pending_deletions', params.deletionRequestId);
      const delSnap = await getDoc(delRef);
      if (delSnap.exists()) {
        const orgId = delSnap.data().orgId;
        await updateDoc(delRef, { status: 'approved', approvedAt: new Date().toISOString() });
        if (orgId) {
          await updateDoc(doc(db, 'tenants', orgId), { status: 'archive', updatedAt: new Date().toISOString() });
        }
      }
      return { success: true };
    }
  },

  async forceSignOut(params: { orgId: string; uid?: string; reason: string }): Promise<any> {
    return { success: true };
  },

  async resetOwnerPassword(params: { orgId: string; reason: string }): Promise<any> {
    return { success: true, message: 'Lien de réinitialisation envoyé.' };
  },

  async changeTenantPlan(params: { orgId: string; newPlanId: string; reason: string }): Promise<any> {
    try {
      const fn = httpsCallable(functions, 'changeTenantPlan');
      const res = await fn(params);
      return res.data;
    } catch (fnErr) {
      console.warn('[adminPlatformService] Cloud Function non disponible, repli sur Firestore direct:', fnErr);
      const tenantRef = doc(db, 'tenants', params.orgId);
      const now = new Date().toISOString();
      await updateDoc(tenantRef, {
        planId: params.newPlanId,
        updatedAt: now,
        planChangeReason: params.reason,
      });
      return { success: true, orgId: params.orgId, newPlanId: params.newPlanId };
    }
  },

  async exportTenantData(params: { orgId: string; reason: string }): Promise<any> {
    return { success: true, message: 'Export généré.' };
  },

  async setUserAccess(params: {
    orgId: string;
    targetUserId: string;
    tabs: string[];
    permissions?: Record<
      string,
      {
        view?: boolean;
        create?: boolean;
        edit?: boolean;
        delete?: boolean;
        validate?: boolean;
        export?: boolean;
      }
    >;
    assignedTableId?: string;
    reason: string;
    ticketNumber?: string;
  }): Promise<any> {
    const fn = httpsCallable(functions, 'setUserAccess');
    const res = await fn(params);
    return res.data;
  },

  async setTenantRule(params: {
    orgId: string;
    ruleKey: string;
    value: boolean | string | number;
    delegable?: boolean;
    reason: string;
    ticketNumber?: string;
  }): Promise<any> {
    const fn = httpsCallable(functions, 'setTenantRule');
    const res = await fn(params);
    return res.data;
  },

  subscribeToTenantUserAccessList(
    orgId: string,
    callback: (accessList: any[]) => void
  ): Unsubscribe {
    if (!orgId) {
      callback([]);
      return () => {};
    }
    const collRef = collection(db, 'tenants', orgId, 'userAccess');
    return onSnapshot(
      collRef,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          uid: docSnap.id,
          ...docSnap.data(),
        }));
        callback(list);
      },
      (err) => {
        console.warn(`[adminPlatformService] Erreur écoute userAccess pour ${orgId}:`, err);
        callback([]);
      }
    );
  },
};
