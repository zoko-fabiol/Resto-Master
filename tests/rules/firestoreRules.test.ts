import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import fs from 'node:fs';
import path from 'node:path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: 'resto-master-test',
    firestore: {
      rules: rulesContent,
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

describe('Phase 0 — Tests de Sécurité des Règles Firestore (Audit & Failles)', () => {
  // --------------------------------------------------------------------------
  // TEST 1 (S-01) : Un utilisateur lambda connecté NE DOIT PAS pouvoir
  // créer / modifier platform_admins/{son uid}.
  // --------------------------------------------------------------------------
  it('1. Un utilisateur connecté lambda ne peut pas créer/modifier platform_admins/{son uid}', async () => {
    const hackerContext = testEnv.authenticatedContext('user_hacker', {
      role: 'serveur',
      organizationId: 'org_test',
    });
    const db = hackerContext.firestore();

    // Doit échouer strictement
    await assertFails(
      db.collection('platform_admins').doc('user_hacker').set({
        id: 'user_hacker',
        email: 'hacker@resto.test',
        role: 'platform_owner',
      })
    );
  });

  // --------------------------------------------------------------------------
  // TEST 2 (S-04-a) : Un serveur NE DOIT PAS pouvoir modifier son rôle, son état
  // actif, ses tabPermissions ou additionalTabs.
  // --------------------------------------------------------------------------
  it('2. Un serveur ne peut pas modifier son rôle, son état actif, ses onglets, ses droits', async () => {
    // Initialisation préalable du compte via contexte admin (sécurisé)
    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      await adminContext.firestore().collection('users').doc('user_serveur').set({
        id: 'user_serveur',
        role: 'serveur',
        active: true,
        organizationId: 'org_test',
        tabPermissions: ['pos'],
        additionalTabs: [],
      });
    });

    const serveurContext = testEnv.authenticatedContext('user_serveur', {
      role: 'serveur',
      organizationId: 'org_test',
    });
    const db = serveurContext.firestore();

    // Tentative 1 : modifier son rôle -> REJET
    await assertFails(
      db.collection('users').doc('user_serveur').update({
        role: 'direction',
      })
    );

    // Tentative 2 : s'attribuer des onglets non autorisés (tabPermissions) -> REJET
    await assertFails(
      db.collection('users').doc('user_serveur').update({
        tabPermissions: ['pos', 'admin', 'finance', 'stock'],
      })
    );

    // Tentative 3 : modifier additionalTabs -> REJET
    await assertFails(
      db.collection('users').doc('user_serveur').update({
        additionalTabs: ['admin', 'fiscal'],
      })
    );
  });

  // --------------------------------------------------------------------------
  // TEST 3 (S-04-c) : Une direction du restaurant A ne peut ni lire, ni modifier,
  // ni supprimer un utilisateur du restaurant B (isolation multi-tenant).
  // --------------------------------------------------------------------------
  it('3. Une direction du restaurant A ne peut ni lire, ni modifier, ni supprimer un utilisateur du restaurant B', async () => {
    // Création d'un utilisateur pour le restaurant B
    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      await adminContext.firestore().collection('users').doc('user_resto_b').set({
        id: 'user_resto_b',
        role: 'serveur',
        organizationId: 'org_b',
        email: 'serveur.b@resto.test',
      });
    });

    // Appelant : direction du restaurant A
    const directionA = testEnv.authenticatedContext('dir_a', {
      role: 'direction',
      organizationId: 'org_a',
    });
    const db = directionA.firestore();

    // Lecture interdite
    await assertFails(db.collection('users').doc('user_resto_b').get());

    // Modification interdite
    await assertFails(
      db.collection('users').doc('user_resto_b').update({
        active: false,
      })
    );

    // Suppression interdite
    await assertFails(db.collection('users').doc('user_resto_b').delete());
  });

  // --------------------------------------------------------------------------
  // TEST 4 (S-03 / platform_audit_logs) : Aucune mise à jour ni suppression,
  // même par un platform_owner.
  // --------------------------------------------------------------------------
  it('4. platform_audit_logs : aucune mise à jour ni suppression, même par un platform_owner', async () => {
    // Log d'audit préexistant
    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      await adminContext.firestore().collection('platform_audit_logs').doc('log_001').set({
        id: 'log_001',
        action: 'CREATION_COMPTE',
        detail: 'Compte créé',
      });
    });

    const ownerContext = testEnv.authenticatedContext('superadmin_owner', {
      platformRole: 'platform_owner',
    });
    const db = ownerContext.firestore();

    // Modification formellement interdite
    await assertFails(
      db.collection('platform_audit_logs').doc('log_001').update({
        detail: 'Détail falsifié',
      })
    );

    // Suppression formellement interdite
    await assertFails(db.collection('platform_audit_logs').doc('log_001').delete());
  });

  // --------------------------------------------------------------------------
  // TEST 5 (S-05) : Un document settings verrouillé refuse l'écriture par la direction.
  // --------------------------------------------------------------------------
  it('5. Un document settings verrouillé refuse l\'écriture par la direction', async () => {
    // Document settings verrouillé par l'administration plateforme
    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      await adminContext.firestore().collection('settings').doc('config_resto_a').set({
        id: 'config_resto_a',
        restaurantId: 'resto_a',
        organizationId: 'org_a',
        configurationVerrouillee: true,
        tauxTva: 19.25,
      });
    });

    const directionA = testEnv.authenticatedContext('dir_a', {
      role: 'direction',
      organizationId: 'org_a',
      outlets: ['resto_a'],
    });
    const db = directionA.firestore();

    // Tentative d'écriture alors que configurationVerrouillee == true -> REJET
    await assertFails(
      db.collection('settings').doc('config_resto_a').update({
        tauxTva: 0,
      })
    );
  });

  // --------------------------------------------------------------------------
  // TEST 6 (S-06) : Un manager du restaurant A ne peut pas écrire une table,
  // une zone ou une caisse du restaurant B.
  // --------------------------------------------------------------------------
  it('6. Un manager du restaurant A ne peut pas écrire une table, une zone ou une caisse du restaurant B', async () => {
    // Données du restaurant B
    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      await adminContext.firestore().collection('zones').doc('zone_b').set({
        id: 'zone_b',
        restaurantId: 'resto_b',
        name: 'Terrasse B',
      });
      await adminContext.firestore().collection('tables').doc('table_b').set({
        id: 'table_b',
        restaurantId: 'resto_b',
        number: 'B1',
      });
      await adminContext.firestore().collection('cash_registers').doc('caisse_b').set({
        id: 'caisse_b',
        restaurantId: 'resto_b',
        name: 'Caisse Principale B',
      });
    });

    const managerA = testEnv.authenticatedContext('mgr_a', {
      role: 'manager',
      organizationId: 'org_a',
      outlets: ['resto_a'],
    });
    const db = managerA.firestore();

    // Tentatives d'écriture sur les ressources du restaurant B -> REJET
    await assertFails(
      db.collection('zones').doc('zone_b').update({ name: 'Terrasse Piratée' })
    );
    await assertFails(
      db.collection('tables').doc('table_b').update({ number: 'B99' })
    );
    await assertFails(
      db.collection('cash_registers').doc('caisse_b').update({ name: 'Caisse Piratée' })
    );

    // Tentative de création d'une ressource assignée au restaurant B -> REJET
    await assertFails(
      db.collection('tables').doc('table_b_hack').set({
        id: 'table_b_hack',
        restaurantId: 'resto_b',
        number: 'HACK',
      })
    );
  });

  // --------------------------------------------------------------------------
  // TEST 7 : Les parcours légitimes continuent de fonctionner pour la direction.
  // --------------------------------------------------------------------------
  it('7. Les parcours légitimes continuent de fonctionner pour la direction', async () => {
    const directionA = testEnv.authenticatedContext('dir_a', {
      role: 'direction',
      organizationId: 'org_a',
      outlets: ['resto_a'],
    });
    const db = directionA.firestore();

    // Création d'un serveur dans son propre restaurant avec rôle non supérieur
    await assertSucceeds(
      db.collection('users').doc('user_nouveau_serveur_a').set({
        id: 'user_nouveau_serveur_a',
        email: 'serveur.nouveau@resto.test',
        name: 'Nouveau Serveur',
        role: 'serveur',
        active: true,
        organizationId: 'org_a',
        accessibleRestaurantIds: ['resto_a'],
      })
    );
  });
});
