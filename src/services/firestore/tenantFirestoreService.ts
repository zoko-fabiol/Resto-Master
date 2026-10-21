import { db } from '../../lib/firebase';
import {
  doc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { Tenant, TenantEntitlements } from '../../../shared/types';

export interface FeatureUnlockRequest {
  id?: string;
  orgId: string;
  featureKey: string;
  requestedBy: string;
  reason?: string;
  status: 'en_attente' | 'approuve' | 'rejete';
  createdAt: string;
}

export const tenantFirestoreService = {
  /**
   * Écoute en temps réel les changements du tenant (statut, limites, abonnement, mode de suspension)
   */
  subscribeToTenant(
    orgId: string,
    callback: (tenant: Tenant | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!orgId) {
      callback(null);
      return () => {};
    }

    const docRef = doc(db, 'tenants', orgId);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          callback(null);
          return;
        }
        callback({ id: snapshot.id, ...snapshot.data() } as Tenant);
      },
      (err) => {
        console.error(`[tenantFirestoreService] Erreur écoute tenant ${orgId}:`, err);
        if (onError) onError(err);
      }
    );
  },

  /**
   * Récupère ponctuellement les informations du tenant
   */
  async getTenant(orgId: string): Promise<Tenant | null> {
    if (!orgId) return null;
    const docRef = doc(db, 'tenants', orgId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Tenant;
  },

  /**
   * Écoute en temps réel la matrice des droits et modules effectifs du tenant
   */
  subscribeToEntitlements(
    orgId: string,
    callback: (entitlements: TenantEntitlements | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!orgId) {
      callback(null);
      return () => {};
    }

    const docRef = doc(db, 'tenants', orgId, 'entitlements', 'current');
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          callback(null);
          return;
        }
        callback(snapshot.data() as TenantEntitlements);
      },
      (err) => {
        console.error(`[tenantFirestoreService] Erreur écoute entitlements ${orgId}:`, err);
        if (onError) onError(err);
      }
    );
  },

  /**
   * Récupère ponctuellement les entitlements du tenant
   */
  async getEntitlements(orgId: string): Promise<TenantEntitlements | null> {
    if (!orgId) return null;
    const docRef = doc(db, 'tenants', orgId, 'entitlements', 'current');
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as TenantEntitlements;
  },

  /**
   * Envoie une demande d'activation d'une fonctionnalité au fournisseur RestoMaster OS
   */
  async requestFeature(
    orgId: string,
    featureKey: string,
    requestedBy: string,
    reason?: string
  ): Promise<void> {
    if (!orgId || !featureKey) {
      throw new Error('Identifiant tenant et clé de fonctionnalité requis');
    }

    const collRef = collection(db, 'tenants', orgId, 'feature_requests');
    const requestPayload: Omit<FeatureUnlockRequest, 'id'> = {
      orgId,
      featureKey,
      requestedBy,
      reason: reason?.trim() || 'Demande d’activation depuis l’application',
      status: 'en_attente',
      createdAt: new Date().toISOString(),
    };

    await addDoc(collRef, requestPayload);
  },

  /**
   * Écoute l'historique des demandes de fonctionnalités envoyées par ce restaurant
   */
  subscribeToFeatureRequests(
    orgId: string,
    callback: (requests: FeatureUnlockRequest[]) => void
  ): Unsubscribe {
    if (!orgId) {
      callback([]);
      return () => {};
    }

    const collRef = collection(db, 'tenants', orgId, 'feature_requests');
    const q = query(collRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const requests = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as FeatureUnlockRequest[];
        callback(requests);
      },
      (err) => {
        console.error(`[tenantFirestoreService] Erreur écoute feature_requests:`, err);
      }
    );
  },
};
