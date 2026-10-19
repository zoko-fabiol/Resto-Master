import { db } from '../../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { DocumentItem, MediaAsset } from '../../types/restaurant';
import { offlineSyncService } from './offlineSyncService';

export const documentsFirestoreService = {
  /**
   * Save a Document record in Firestore
   */
  async saveDocument(document: DocumentItem): Promise<void> {
    const payload = {
      ...document,
      updatedAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      offlineSyncService.enqueue('documents', 'CREATE', document.id, payload);
      return;
    }

    try {
      const docRef = doc(db, 'documents', document.id);
      await setDoc(docRef, payload, { merge: true });
    } catch {
      offlineSyncService.enqueue('documents', 'CREATE', document.id, payload);
    }
  },

  /**
   * Save a MediaAsset record in Firestore
   */
  async saveMediaAsset(asset: MediaAsset): Promise<void> {
    const payload = {
      ...asset,
      updatedAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      offlineSyncService.enqueue('media_assets', 'CREATE', asset.id, payload);
      return;
    }

    try {
      const docRef = doc(db, 'media_assets', asset.id);
      await setDoc(docRef, payload, { merge: true });
    } catch {
      offlineSyncService.enqueue('media_assets', 'CREATE', asset.id, payload);
    }
  },

  /**
   * Delete Document
   */
  async deleteDocument(documentId: string): Promise<void> {
    if (!navigator.onLine) {
      offlineSyncService.enqueue('documents', 'DELETE', documentId, {});
      return;
    }

    try {
      const docRef = doc(db, 'documents', documentId);
      await deleteDoc(docRef);
    } catch {
      offlineSyncService.enqueue('documents', 'DELETE', documentId, {});
    }
  },

  /**
   * Delete MediaAsset
   */
  async deleteMediaAsset(assetId: string): Promise<void> {
    if (!navigator.onLine) {
      offlineSyncService.enqueue('media_assets', 'DELETE', assetId, {});
      return;
    }

    try {
      const docRef = doc(db, 'media_assets', assetId);
      await deleteDoc(docRef);
    } catch {
      offlineSyncService.enqueue('media_assets', 'DELETE', assetId, {});
    }
  },

  /**
   * Real-time listeners
   */
  subscribeToDocuments(
    restaurantId: string,
    callback: (docs: DocumentItem[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'documents');
      const q = query(colRef, where('restaurantId', '==', restaurantId));

      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((d) => d.data() as DocumentItem);
            callback(list);
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  subscribeToMediaAssets(
    organizationId: string,
    callback: (assets: MediaAsset[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'media_assets');
      const q = query(colRef, where('organizationId', '==', organizationId));

      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((d) => d.data() as MediaAsset);
            callback(list);
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },
};
