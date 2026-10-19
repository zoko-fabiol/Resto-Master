import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

const app: App = getApps().length === 0 ? initializeApp() : getApps()[0];

export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
export { FieldValue };
export default app;
