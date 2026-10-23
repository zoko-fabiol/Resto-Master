/**
 * RestoMaster OS — Service d'Accès Utilisateur (userAccess)
 * Gestion du document /tenants/{orgId}/userAccess/{userId}
 */

import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserAccessDocument } from '../../../shared/types/accessCatalog';

export const userAccessService = {
  /**
   * Écoute en temps réel les droits et accès effectifs de l'utilisateur.
   */
  subscribeToUserAccess(
    orgId: string,
    userId: string,
    callback: (access: UserAccessDocument | null) => void
  ): () => void {
    if (!orgId || !userId) {
      callback(null);
      return () => {};
    }

    const docRef = doc(db, 'tenants', orgId, 'userAccess', userId);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          callback(null);
          return;
        }
        callback(snapshot.data() as UserAccessDocument);
      },
      (error) => {
        console.warn(`[userAccessService] Erreur abonnement userAccess (${userId}) :`, error);
        callback(null);
      }
    );
  },

  /**
   * Lecture ponctuelle du document d'accès utilisateur.
   */
  async getUserAccess(orgId: string, userId: string): Promise<UserAccessDocument | null> {
    if (!orgId || !userId) return null;
    try {
      const docRef = doc(db, 'tenants', orgId, 'userAccess', userId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return snapshot.data() as UserAccessDocument;
    } catch (err) {
      console.warn(`[userAccessService] Erreur lecture userAccess (${userId}) :`, err);
      return null;
    }
  },

  /**
   * Enregistre ou met à jour les droits d'accès utilisateur (Admin / Cloud Function).
   */
  async setUserAccess(
    orgId: string,
    userId: string,
    access: Partial<UserAccessDocument>
  ): Promise<void> {
    if (!orgId || !userId) throw new Error('orgId et userId obligatoires');
    const docRef = doc(db, 'tenants', orgId, 'userAccess', userId);
    const data: UserAccessDocument = {
      uid: userId,
      orgId,
      tabs: access.tabs || [],
      permissions: access.permissions || {},
      assignedTableId: access.assignedTableId,
      assignedTableName: access.assignedTableName,
      version: (access.version || 0) + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: access.updatedBy || 'admin',
    };
    await setDoc(docRef, data, { merge: true });
  },
};
