import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseConfigData from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey || 'AIzaSyC2zfdRlJrs0N1vtYvy1qbOK11piNpsQSw',
  authDomain: firebaseConfigData.authDomain || 'resto-master-310f7.firebaseapp.com',
  projectId: firebaseConfigData.projectId || 'resto-master-310f7',
  storageBucket: firebaseConfigData.storageBucket || 'resto-master-310f7.firebasestorage.app',
  messagingSenderId: firebaseConfigData.messagingSenderId || '564883344825',
  appId: firebaseConfigData.appId || '1:564883344825:web:8e7216b273e6b24cf1ba68',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Use the designated Firestore Database ID or default
const customDbId =
  firebaseConfigData.firestoreDatabaseId &&
  firebaseConfigData.firestoreDatabaseId !== '(default)'
    ? firebaseConfigData.firestoreDatabaseId
    : undefined;

export const db: Firestore = customDbId ? getFirestore(app, customDbId) : getFirestore(app);
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);

export default app;
