import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'node:fs';

const envText = fs.readFileSync('.env', 'utf8');
const env: Record<string, string> = {};
for (const line of envText.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    const k = trimmed.slice(0, idx).trim();
    let v = trimmed.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
}

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

const auth = getAuth(app);
const db = getFirestore(app);

const EMAIL = 'direction@bistrot-douala.cm';
const PASSWORD = 'TempPassword2026!';
const RESTAURANT_CODE = 'RMS-DOU-9712';
const ORG_ID = 'org_bistrot_douala';
const RESTAURANT_ID = 'resto_bistrot_douala';

async function main() {
  console.log(`[1/3] Création / Authentification de l'utilisateur ${EMAIL}...`);
  let uid = '';
  try {
    const userCred = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD);
    uid = userCred.user.uid;
    console.log(`✓ Utilisateur créé dans Firebase Auth avec UID : ${uid}`);
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      console.log(`ℹ L'utilisateur existe déjà, connexion de vérification...`);
      const userCred = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
      uid = userCred.user.uid;
      console.log(`✓ Connecté avec succès avec UID : ${uid}`);
    } else {
      console.error(`✗ Échec création utilisateur :`, err);
      process.exit(1);
    }
  }

  console.log(`[2/3] Provisioning du Restaurant & Entitlements...`);
  // Fiche restaurant
  await setDoc(doc(db, 'restaurants', RESTAURANT_ID), {
    id: RESTAURANT_ID,
    orgId: ORG_ID,
    name: 'Bistrot Douala Gourmand',
    commercialName: 'Bistrot Douala Gourmand',
    legalName: 'Bistrot Douala Gourmand SARL',
    legalForm: 'SARL',
    city: 'Douala',
    address: 'Rue des Palmiers, Bonapriso',
    phone: '+237 699 00 11 22',
    email: EMAIL,
    restaurantCode: RESTAURANT_CODE,
    active: true,
    currency: 'FCFA',
    taxRate: 19.25,
    createdAt: new Date().toISOString(),
  }, { merge: true });

  // Fiche Tenant
  await setDoc(doc(db, 'tenants', ORG_ID), {
    id: ORG_ID,
    name: 'Bistrot Douala Gourmand',
    planId: 'plan_pro',
    status: 'actif',
    restaurantCode: RESTAURANT_CODE,
    createdAt: new Date().toISOString(),
  }, { merge: true });

  // Entitlements
  await setDoc(doc(db, 'tenants', ORG_ID, 'entitlements', 'current'), {
    orgId: ORG_ID,
    planId: 'plan_pro',
    features: {
      pos_core: { status: 'ACTIVÉ', source: 'plan' },
      tables_management: { status: 'ACTIVÉ', source: 'override' },
      table_reservations: { status: 'ACTIVÉ', source: 'override' },
      cash_register_z: { status: 'ACTIVÉ', source: 'plan' },
      kds_kitchen: { status: 'ACTIVÉ', source: 'plan' },
      kds_bar: { status: 'ACTIVÉ', source: 'plan' },
      stock_lots_fefo: { status: 'ACTIVÉ', source: 'plan' },
      purchases_suppliers: { status: 'ACTIVÉ', source: 'plan' },
      cameroon_fiscal_framework: { status: 'ACTIVÉ', source: 'plan' },
      audit_trail_immutable: { status: 'ACTIVÉ', source: 'plan' },
    },
    modules: {
      mod_dashboard: true,
      mod_pos: true,
      mod_tables: true,
      res_management: true,
      mod_cuisine: true,
      mod_bar: true,
      mod_caisse: true,
      mod_stocks: true,
      mod_fiscal: true,
      mod_finance: true,
      mod_clients: true,
      mod_audit: true,
      mod_settings: true,
    },
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  console.log(`[3/3] Écriture du profil utilisateur dans Firestore (users/${uid})...`);
  await setDoc(doc(db, 'users', uid), {
    id: uid,
    name: 'Jean-Paul Ewane',
    email: EMAIL,
    role: 'direction',
    restaurantId: RESTAURANT_ID,
    restaurantCode: RESTAURANT_CODE,
    orgId: ORG_ID,
    active: true,
    hasPin: false,
    mustChangePassword: false, // Permettre une connexion directe sans blocage
    createdAt: new Date().toISOString(),
  }, { merge: true });

  console.log(`\n🎉 PROVISIONING RÉUSSI !`);
  console.log(`Vous pouvez maintenant vous connecter sur http://localhost:3000 avec :`);
  console.log(`- E-mail : ${EMAIL}`);
  console.log(`- Code restaurant : ${RESTAURANT_CODE}`);
  console.log(`- Mot de passe : ${PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
