import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager,
  memoryLocalCache,
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';
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

// Détection de l'environnement desktop (Electron ou Tauri)
const isDesktopRuntime =
  typeof window !== 'undefined' &&
  ('electronAPI' in (window as object) || '__TAURI_INTERNALS__' in (window as object));

// Initialisation de l'instance d'application Firebase (Singleton)
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialisation conditionnelle d'App Check (reCAPTCHA Enterprise / Debug en Dev)
// reCAPTCHA n'est pas utilisable depuis un runtime desktop local (file:// ou electron/tauri) : App Check y est ignoré.
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_KEY as string | undefined;
if (appCheckSiteKey && typeof window !== 'undefined' && !isDesktopRuntime) {
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
        tabManager: isDesktopRuntime
          ? persistentSingleTabManager(undefined)
          : persistentMultipleTabManager(),
      }),
      // Robustesse derrière proxy / pare-feu de restaurant et dans WebView/Electron
      experimentalAutoDetectLongPolling: true,
    },
    customDbId
  );
} catch (err) {
  console.warn('[RestoMaster OS] Cache Firestore persistant indisponible :', err);
  try {
    firestoreInstance = initializeFirestore(
      app,
      { localCache: memoryLocalCache(), experimentalAutoDetectLongPolling: true },
      customDbId
    );
  } catch {
    // Déjà initialisé (HMR) : récupérer l'instance existante
    firestoreInstance = customDbId ? getFirestore(app, customDbId) : getFirestore(app);
  }
}

export const db: Firestore = firestoreInstance;
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions = getFunctions(app, 'europe-west1');

// Connexion sécurisée aux émulateurs locaux UNIQUEMENT si explicitement activée et hors production
const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true' && !import.meta.env.PROD;
if (useEmulators) {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    console.info('[RestoMaster OS] Connecté aux émulateurs Firebase locaux (Auth: 9099, Firestore: 8080, Functions: 5001).');
  } catch (err) {
    console.warn('[RestoMaster OS] Connexion aux émulateurs déjà effectuée ou avertissement :', err);
  }
}

export default app;
