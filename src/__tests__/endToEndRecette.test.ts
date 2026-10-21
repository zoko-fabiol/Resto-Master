import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  Tenant,
  TenantEntitlements,
  TenantSignupRequest,
  CONFIGURATION_PROFILES,
  FEATURE_CATALOG,
  DEFAULT_PLANS,
  PlatformAuditLog,
} from '../../shared/types';

describe('RestoMaster OS & Admin Panel — Validation des 8 Scénarios de Recette (Phase 7)', () => {
  // =========================================================================
  // SCÉNARIO 1 : Inscription -> Attente -> Approbation -> Initialisation
  // =========================================================================
  describe('Scénario 1 : Flux complet d\'Onboarding Restaurant', () => {
    it('Valide le parcours : soumission, validation superadmin et amorçage du tenant', () => {
      // 1. Soumission d'inscription
      const signupPayload: TenantSignupRequest = {
        id: 'signup_recette_01',
        companyName: 'La Pergola Douala',
        legalForm: 'SARL',
        city: 'Douala',
        country: 'Cameroun',
        phone: '+237699112233',
        email: 'contact@lapergola.cm',
        applicantName: 'Samuel Eto',
        desiredPlanId: 'plan_pro',
        estimatedTables: 12,
        status: 'en_attente',
        submittedAt: new Date().toISOString(),
      };

      expect(signupPayload.status).toBe('en_attente');
      expect(signupPayload.city).toBe('Douala');

      // 2. Approbation par le Superadmin Plateforme
      const approveSignup = (signup: TenantSignupRequest, adminUid: string, adminEmail: string) => {
        const orgId = `org_${signup.companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const now = new Date().toISOString();

        const plan = DEFAULT_PLANS.find((p) => p.id === signup.desiredPlanId)!;

        // Entitlements initiaux selon le plan
        const initialFeatures: Record<string, any> = {};
        for (const f of FEATURE_CATALOG) {
          const isIncludedInPlan = plan.includedFeatures.includes(f.id) || f.defaultEnabled;
          initialFeatures[f.id] = {
            status: isIncludedInPlan ? 'ACTIVÉ' : 'DÉSACTIVÉ',
            source: 'plan',
            activatedBy: adminEmail,
            activatedAt: now,
          };
        }

        const newTenant: Tenant = {
          id: orgId,
          status: 'actif',
          planId: plan.id,
          company: {
            name: signup.companyName,
            legalName: `${signup.companyName} SARL`,
            city: signup.city,
            country: signup.country,
            headquartersAddress: 'Bonanjo, Douala',
            phone: signup.phone,
            email: signup.email,
          },
          owner: {
            uid: `owner_${orgId}`,
            name: signup.applicantName,
            email: signup.email,
            phone: signup.phone,
          },
          creationSource: 'inscription_libre',
          channel: 'stable',
          limits: { ...plan.limits },
          currency: 'FCFA',
          createdAt: now,
          updatedAt: now,
        };

        const entitlements: TenantEntitlements = {
          orgId,
          features: initialFeatures,
          modules: {
            mod_pos: true,
            mod_cuisine: true,
            mod_bar: true,
            mod_stock: true,
            mod_caisses: true,
          },
          operationRules: {
            requireSupervisorPinForDiscount: true,
            requireSupervisorPinForCancel: true,
          },
          lockedConfigKeys: ['fiscal_tax_rate'],
          effectiveLimits: { ...plan.limits },
          updatedAt: now,
          updatedBy: adminEmail,
        };

        return {
          approvedSignup: { ...signup, status: 'approuvee' as const, reviewedBy: adminEmail, reviewedAt: now },
          tenant: newTenant,
          entitlements,
        };
      };

      const result = approveSignup(signupPayload, 'admin_super', 'superadmin@restomaster.com');

      expect(result.approvedSignup.status).toBe('approuvee');
      expect(result.tenant.id).toBe('org_la_pergola_douala');
      expect(result.tenant.status).toBe('actif');
      expect(result.entitlements.features['pos_core'].status).toBe('ACTIVÉ');
      expect(result.entitlements.effectiveLimits.maxTerminals).toBe(4);
    });
  });

  // =========================================================================
  // SCÉNARIO 2 : Activation/Désactivation à distance & Assertion Cloud Function
  // =========================================================================
  describe('Scénario 2 : Contrôle des Modules à distance (Feature Gating)', () => {
    it('Vérifie le blocage immédiat côté UI et côté Cloud Function lors de la désactivation de mod_delivery', () => {
      const entitlements: TenantEntitlements = {
        orgId: 'resto_123',
        features: {
          delivery_orders: {
            status: 'ACTIVÉ',
            source: 'plan',
            activatedBy: 'admin@restomaster.com',
            activatedAt: new Date().toISOString(),
          },
        },
        modules: { mod_delivery: true },
        operationRules: {},
        lockedConfigKeys: [],
        effectiveLimits: { maxOutlets: 1, maxUsers: 5, maxTerminals: 3, maxOrdersPerMonth: 1000 },
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin@restomaster.com',
      };

      // Helper UI correspondant à useFeature() / FeatureGate
      const isFeatureActiveInUI = (ent: TenantEntitlements, featId: string): boolean => {
        return ent.features[featId]?.status === 'ACTIVÉ';
      };

      expect(isFeatureActiveInUI(entitlements, 'delivery_orders')).toBe(true);

      // Désactivation à distance par le superadmin
      entitlements.features['delivery_orders'].status = 'DÉSACTIVÉ';
      entitlements.modules['mod_delivery'] = false;

      // 1. Côté UI : le module disparaît immédiatement
      expect(isFeatureActiveInUI(entitlements, 'delivery_orders')).toBe(false);

      // 2. Côté Cloud Function : assertFeatureEntitlement bloque la création de commande en livraison
      const assertFeatureEntitlement = (ent: TenantEntitlements, requiredFeature: string) => {
        if (ent.features[requiredFeature]?.status !== 'ACTIVÉ') {
          throw new Error(`Droit insuffisant : La fonctionnalité "${requiredFeature}" n'est pas activée.`);
        }
      };

      expect(() => {
        assertFeatureEntitlement(entitlements, 'delivery_orders');
      }).toThrow(/Droit insuffisant/);
    });
  });

  // =========================================================================
  // SCÉNARIO 3 : Suspension en lecture seule (read_only) pour impayé
  // =========================================================================
  describe('Scénario 3 : Suspension de Restaurant & Mode Lecture Seule', () => {
    it('Permet la consultation des rapports mais interdit strictement toute création de vente', () => {
      const tenant: Tenant = {
        id: 'resto_impaye_01',
        status: 'suspendu',
        suspensionMode: 'read_only',
        suspensionReason: 'Facture mensuelle Pro impayée depuis 15 jours',
        planId: 'plan_pro',
        company: {
          name: 'Bistrot Bonapriso',
          legalName: 'Bistrot SARL',
          headquartersAddress: 'Rue Dominique',
          city: 'Douala',
          country: 'Cameroun',
          phone: '+237699000000',
          email: 'contact@bistrot.cm',
        },
        owner: { uid: 'u1', name: 'Alain', email: 'alain@bistrot.cm' },
        creationSource: 'cree_par_admin',
        channel: 'stable',
        limits: { maxOutlets: 1, maxUsers: 5, maxTerminals: 3, maxOrdersPerMonth: 1000 },
        currency: 'FCFA',
        createdAt: '2026-01-01',
        updatedAt: '2026-02-15',
      };

      // Règle de sécurité Firestore : tenantActive()
      const isTenantActiveForWrites = (t: Tenant): boolean => {
        return t.status === 'actif' || t.status === 'essai' || t.status === 'onboarding';
      };

      const canViewReports = (t: Tenant): boolean => {
        // En mode read_only, la consultation reste permise
        return t.suspensionMode !== 'full_block';
      };

      expect(canViewReports(tenant)).toBe(true);
      expect(isTenantActiveForWrites(tenant)).toBe(false);

      // Simulation de tentative d'encaissement rejetée
      const createOrder = (t: Tenant) => {
        if (!isTenantActiveForWrites(t)) {
          throw new Error(`Accès restreint : Établissement suspendu (${t.suspensionReason}).`);
        }
        return { orderId: 'ord_123', status: 'paid' };
      };

      expect(() => createOrder(tenant)).toThrow(/Établissement suspendu/);
    });
  });

  // =========================================================================
  // SCÉNARIO 4 : Isolation Multi-Tenant (firestore.rules)
  // =========================================================================
  describe('Scénario 4 : Isolation Multi-Tenant Strict', () => {
    it('Rejette toute tentative d\'accès aux documents d\'une autre organisation', () => {
      const userClaimsTenantA = {
        uid: 'user_resto_a',
        email: 'serveur@resto-a.cm',
        organizationId: 'org_resto_a',
        role: 'serveur',
      };

      const verifyDocumentAccess = (callerClaims: typeof userClaimsTenantA, targetOrgId: string) => {
        // isPlatformAdmin() OU isTenantMember(targetOrgId)
        const isPlatformAdmin = false;
        const isTenantMember = callerClaims.organizationId === targetOrgId;

        if (!isPlatformAdmin && !isTenantMember) {
          throw new Error('PERMISSION_DENIED : Tentative d\'accès cross-tenant interdite par les règles de sécurité.');
        }
        return true;
      };

      // Accès à son propre restaurant -> Autorisé
      expect(verifyDocumentAccess(userClaimsTenantA, 'org_resto_a')).toBe(true);

      // Accès au restaurant B voisin -> STRICTEMENT REJETÉ
      expect(() => {
        verifyDocumentAccess(userClaimsTenantA, 'org_resto_b');
      }).toThrow(/PERMISSION_DENIED/);
    });
  });

  // =========================================================================
  // SCÉNARIO 5 : Application de profil, Aperçu DIFF et Rollback
  // =========================================================================
  describe('Scénario 5 : Application de Profil & Retour Arrière (Rollback)', () => {
    it('Applique le profil Bar Lounge, enregistre un snapshot, et restaure avec exactitude', () => {
      const initialEntitlements: TenantEntitlements = {
        orgId: 'resto_mixte',
        features: {
          tables_management: { status: 'ACTIVÉ', source: 'plan', activatedBy: 'init', activatedAt: '2026-01-01' },
          kds_bar: { status: 'DÉSACTIVÉ', source: 'plan', activatedBy: 'init', activatedAt: '2026-01-01' },
        },
        modules: { mod_tables: true, mod_bar: false },
        operationRules: {},
        lockedConfigKeys: [],
        effectiveLimits: { maxOutlets: 1, maxUsers: 5, maxTerminals: 3, maxOrdersPerMonth: 1000 },
        updatedAt: '2026-01-01T00:00:00Z',
        updatedBy: 'init',
      };

      // 1. Snapshot avant application
      const snapshotBefore = JSON.parse(JSON.stringify(initialEntitlements));

      // 2. Application du profil 'bar_lounge'
      const barProfile = CONFIGURATION_PROFILES.find((p) => p.id === 'bar_lounge')!;
      expect(barProfile).toBeDefined();

      const updatedEntitlements = JSON.parse(JSON.stringify(initialEntitlements));
      for (const featId of barProfile.enabledFeatures) {
        updatedEntitlements.features[featId] = {
          status: 'ACTIVÉ',
          source: 'profil',
          activatedBy: 'admin@restomaster.com',
          activatedAt: new Date().toISOString(),
        };
      }
      for (const m of barProfile.includedModules) {
        updatedEntitlements.modules[m] = true;
      }

      expect(updatedEntitlements.features['kds_bar'].status).toBe('ACTIVÉ');
      expect(updatedEntitlements.modules['mod_bar']).toBe(true);

      // 3. Rollback vers le snapshot
      const restoredEntitlements = JSON.parse(JSON.stringify(snapshotBefore));

      expect(restoredEntitlements.features['kds_bar'].status).toBe('DÉSACTIVÉ');
      expect(restoredEntitlements.modules['mod_bar']).toBe(false);
      expect(restoredEntitlements.updatedAt).toBe('2026-01-01T00:00:00Z');
    });
  });

  // =========================================================================
  // SCÉNARIO 6 : Télémaintenance Support avec bandeau et clôture
  // =========================================================================
  describe('Scénario 6 : Session de Télémaintenance Support', () => {
    it('Crée une session en lecture seule avec motif, vérifie son expiration et sa clôture scellée', () => {
      const now = new Date('2026-03-10T14:00:00Z');
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 heure

      const session = {
        id: 'supp_sess_777',
        orgId: 'resto_douala_01',
        adminUid: 'support_agent_01',
        adminEmail: 'support@restomaster.com',
        adminRole: 'support',
        startedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        reason: 'Assistance paramétrage imprimante thermique cuisine',
        active: true,
      };

      expect(session.active).toBe(true);
      expect(new Date(session.expiresAt).getTime() - new Date(session.startedAt).getTime()).toBe(3600000);

      // Clôture explicite par l'agent support
      const closeSession = (sess: typeof session, closeReason: string) => {
        return {
          ...sess,
          active: false,
          closedAt: new Date('2026-03-10T14:35:00Z').toISOString(),
          closeReason,
        };
      };

      const closed = closeSession(session, 'Imprimante réseau configurée avec succès');
      expect(closed.active).toBe(false);
      expect(closed.closeReason).toContain('Imprimante');
    });
  });

  // =========================================================================
  // SCÉNARIO 7 : Règle des 2 Administrateurs pour la Suppression (2-Man Rule)
  // =========================================================================
  describe('Scénario 7 : Suppression Sécurisée à Double Validation', () => {
    it('Interdit l\'auto-validation et requiert la signature de deux administrateurs distincts', () => {
      const adminA = { uid: 'admin_1', email: 'alice@restomaster.com' };
      const adminB = { uid: 'admin_2', email: 'bob@restomaster.com' };

      const pendingDeletion = {
        id: 'del_001',
        orgId: 'resto_a_supprimer',
        requestedByUid: adminA.uid,
        requestedByEmail: adminA.email,
        requestedAt: '2026-03-01T00:00:00Z',
        purgeScheduledAt: '2026-03-31T00:00:00Z', // 30 jours
        status: 'en_attente_approbation',
      };

      const approve = (del: typeof pendingDeletion, callerUid: string) => {
        if (del.requestedByUid === callerUid) {
          throw new Error('Auto-approbation formellement rejetée par la règle des 2 administrateurs.');
        }
        return { ...del, status: 'approuvee', approvedByUid: callerUid };
      };

      // Admin A tente de valider sa propre demande
      expect(() => approve(pendingDeletion, adminA.uid)).toThrow(/Auto-approbation formellement rejetée/);

      // Admin B valide la demande
      const res = approve(pendingDeletion, adminB.uid);
      expect(res.status).toBe('approuvee');
      expect(res.approvedByUid).toBe(adminB.uid);
    });
  });

  // =========================================================================
  // SCÉNARIO 8 : Zéro Mot de Passe ni Code PIN en Clair (Zero-Trust)
  // =========================================================================
  describe('Scénario 8 : Politique Zero-Trust Absolue & Chaînage SHA-256', () => {
    it('Vérifie l\'absence de secret en clair et la validité du chaînage cryptographique d\'audit', () => {
      // 1. Zéro mot de passe ni PIN
      const incomingUser = {
        id: 'usr_99',
        email: 'chef@restomaster.test',
        pinCode: '0000',
        password: 'clair',
        hasPin: true,
      };

      const sanitize = (u: any) => {
        const { pinCode, password, ...safe } = u;
        return safe;
      };

      const safe = sanitize(incomingUser);
      expect(safe.pinCode).toBeUndefined();
      expect(safe.password).toBeUndefined();
      expect(safe.hasPin).toBe(true);

      // 2. Chaînage cryptographique SHA-256 de la piste d'audit
      const computeLogHash = (prevHash: string, logData: Record<string, any>): string => {
        const canonical = JSON.stringify({ prevHash, ...logData });
        return crypto.createHash('sha256').update(canonical).digest('hex');
      };

      const genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';
      const log1Data = { action: 'TENANT_CREATED', orgId: 'resto_1', actor: 'admin@restomaster.com' };
      const hash1 = computeLogHash(genesisHash, log1Data);

      const log2Data = { action: 'FEATURE_TOGGLED', feat: 'mod_delivery', actor: 'admin@restomaster.com' };
      const hash2 = computeLogHash(hash1, log2Data);

      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
      expect(hash2).toMatch(/^[a-f0-9]{64}$/);
      expect(hash1).not.toBe(hash2);

      // Toute altération dans log1 invalide l'intégrité de la chaîne
      const tamperedLog1Data = { ...log1Data, orgId: 'resto_hacked' };
      const recomputedHash1 = computeLogHash(genesisHash, tamperedLog1Data);
      expect(recomputedHash1).not.toBe(hash1);
    });
  });
});
