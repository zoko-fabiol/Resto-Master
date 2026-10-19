import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  Firestore,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

// -----------------------------------------------------------------------------
// Validation des variables d'environnement Firebase obligatoires
// -----------------------------------------------------------------------------
const requiredEnvKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

const missingEnv = requiredEnvKeys.filter((k) => !import.meta.env[k]);
if (missingEnv.length > 0) {
  const errMsg =
    `[RestoMaster OS] Configuration Firebase incomplète dans .env.\n` +
    `Variables manquantes : ${missingEnv.join(', ')}.\n` +
    `Veuillez copier .env.example vers .env et renseigner les clés requises.`;
  console.error(errMsg);
  if (import.meta.env.PROD) {
    throw new Error(errMsg);
  }
}

export const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || '',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || '',
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || '',
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || '',
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || '',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || '',
};

// Initialisation de l'instance d'application Firebase (Singleton)
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialisation conditionnelle d'App Check (reCAPTCHA Enterprise / Debug en Dev)
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_KEY as string | undefined;
if (appCheckSiteKey && typeof window !== 'undefined') {
  try {
    if (import.meta.env.DEV || import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG === 'true') {
      // @ts-expect-error Firebase App Check Debug token window flag
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn('[RestoMaster OS] Échec d\'initialisation d\'App Check :', err);
  }
}

// Configuration de la base Firestore avec cache persistant multi-onglets
const customDbId =
  import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID &&
  import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID !== '(default)'
    ? (import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string)
    : undefined;

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    customDbId
  );
} catch {
  firestoreInstance = customDbId ? getFirestore(app, customDbId) : getFirestore(app);
}

export const db: Firestore = firestoreInstance;
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions = getFunctions(app, 'europe-west1');

export default app;
