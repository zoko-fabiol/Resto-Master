export interface QueuedAction {
  id: string;
  idempotencyKey: string;
  collectionName: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'BATCH';
  docId: string;
  payload: any;
  timestamp: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  errorMessage?: string;
}

class OfflineSyncService {
  private queue: QueuedAction[] = [];
  private isProcessing = false;
  private listeners: ((queue: QueuedAction[]) => void)[] = [];

  constructor() {
    this.loadQueue();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.processQueue();
      });
    }
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem('restomaster_offline_action_queue');
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch {
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem('restomaster_offline_action_queue', JSON.stringify(this.queue));
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save offline queue:', e);
    }
  }

  public subscribe(callback: (queue: QueuedAction[]) => void): () => void {
    this.listeners.push(callback);
    callback(this.queue);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb([...this.queue]));
  }

  public getPendingCount(): number {
    return this.queue.filter((a) => a.status === 'pending' || a.status === 'syncing').length;
  }

  public getQueue(): QueuedAction[] {
    return [...this.queue];
  }

  /**
   * Enqueue an operation with an idempotency key to prevent duplicates
   */
  public enqueue(
    collectionName: string,
    actionType: 'CREATE' | 'UPDATE' | 'DELETE',
    docId: string,
    payload: any,
    customIdempotencyKey?: string
  ): QueuedAction {
    const key = customIdempotencyKey || `${collectionName}_${docId}_${Date.now()}`;

    // Prevent duplicate enqueues for the same idempotency key
    const existing = this.queue.find((a) => a.idempotencyKey === key);
    if (existing) {
      return existing;
    }

    const action: QueuedAction = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      idempotencyKey: key,
      collectionName,
      actionType,
      docId,
      payload,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };

    this.queue.push(action);
    this.saveQueue();

    // Trigger sync if online
    if (navigator.onLine) {
      this.processQueue();
    }

    return action;
  }

  /**
   * Process and synchronize pending actions against Firestore
   */
  public async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const { db } = await import('../../lib/firebase');
      const { doc, setDoc, deleteDoc, updateDoc } = await import('firebase/firestore');

      const pending = this.queue.filter((a) => a.status === 'pending');

      for (const action of pending) {
        action.status = 'syncing';
        this.saveQueue();

        try {
          const docRef = doc(db, action.collectionName, action.docId);

          if (action.actionType === 'CREATE') {
            await setDoc(docRef, action.payload, { merge: true });
          } else if (action.actionType === 'UPDATE') {
            await updateDoc(docRef, action.payload);
          } else if (action.actionType === 'DELETE') {
            await deleteDoc(docRef);
          }

          action.status = 'synced';
        } catch (err: any) {
          action.retryCount += 1;
          action.errorMessage = err.message;
          if (action.retryCount >= 5) {
            action.status = 'failed';
          } else {
            action.status = 'pending';
          }
        }
      }

      // Remove successfully synced actions from queue
      this.queue = this.queue.filter((a) => a.status !== 'synced');
      this.saveQueue();
    } catch (e) {
      console.warn('Erreur lors du traitement de la file offline:', e);
    } finally {
      this.isProcessing = false;
    }
  }
}

export const offlineSyncService = new OfflineSyncService();
