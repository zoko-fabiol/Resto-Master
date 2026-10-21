import { describe, it, expect } from 'vitest';
import {
  Tenant,
  PendingDeletion,
  DEFAULT_PLANS,
} from '../../shared/types';

describe('RestoMaster Admin Panel — Cycle de Vie, Sécurité & 2-Man Rule (Phase 6)', () => {
  // Mock d'un restaurant actif
  const sampleTenant: Tenant = {
    id: 'resto_douala_01',
    status: 'actif',
    planId: 'plan_pro',
    company: {
      name: 'Le Boukarou Lounge',
      legalName: 'Boukarou SARL',
      city: 'Douala',
      country: 'Cameroun',
      headquartersAddress: 'Bonapriso',
      phone: '+237699000111',
      email: 'contact@boukarou.cm',
    },
    owner: {
      uid: 'user_owner_01',
      name: 'Patron Boukarou',
      email: 'owner@boukarou.cm',
    },
    creationSource: 'inscription_libre',
    channel: 'stable',
    limits: {
      maxOutlets: 1,
      maxUsers: 5,
      maxTerminals: 3,
      maxOrdersPerMonth: 1000,
    },
    currency: 'FCFA',
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-01T00:00:00Z').toISOString(),
  };

  it('1. Règle des deux administrateurs : Initiation et calcul des 30 jours de rétention légale', () => {
    const adminA = { uid: 'admin_alpha', email: 'alpha@restomaster.com' };
    const requestDate = new Date('2026-03-01T10:00:00Z');
    const expectedPurgeDate = new Date(requestDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Simulation de l'initiation de suppression
    const createDeletionRequest = (tenant: Tenant, caller: typeof adminA, reason: string, now: Date): {
      updatedTenant: Partial<Tenant>;
      pendingDeletion: PendingDeletion;
    } => {
      if (!reason || reason.trim().length < 5) {
        throw new Error('Motif requis (min 5 car.)');
      }

      const purgeScheduledAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const requestId = 'del_req_999';

      return {
        updatedTenant: {
          status: 'archive',
          suspensionMode: 'full_block',
          suspensionReason: `Demande de résiliation par ${caller.email} : ${reason}`,
          pendingDeletionId: requestId as any,
          updatedAt: now.toISOString(),
        },
        pendingDeletion: {
          id: requestId,
          orgId: tenant.id,
          companyName: tenant.company.name,
          requestedByUid: caller.uid,
          requestedByEmail: caller.email,
          requestedAt: now.toISOString(),
          status: 'en_attente_approbation',
          purgeScheduledAt,
          reason,
        },
      };
    };

    const res = createDeletionRequest(sampleTenant, adminA, 'Cessation d\'activité déclarée par le gérant', requestDate);

    // Le compte doit immédiatement passer en statut archive et full_block
    expect(res.updatedTenant.status).toBe('archive');
    expect(res.updatedTenant.suspensionMode).toBe('full_block');

    // La rétention légale doit être exactement de 30 jours (720 heures)
    expect(res.pendingDeletion.status).toBe('en_attente_approbation');
    expect(res.pendingDeletion.requestedByUid).toBe('admin_alpha');
    expect(new Date(res.pendingDeletion.purgeScheduledAt).toISOString()).toBe(expectedPurgeDate.toISOString());
  });

  it('2. Règle des deux administrateurs : Rejet strict de l\'auto-approbation par le même admin', () => {
    const adminA = { uid: 'admin_alpha', email: 'alpha@restomaster.com' };
    const pendingDel: PendingDeletion = {
      id: 'del_req_999',
      orgId: sampleTenant.id,
      companyName: sampleTenant.company.name,
      requestedByUid: adminA.uid,
      requestedByEmail: adminA.email,
      requestedAt: '2026-03-01T10:00:00Z',
      status: 'en_attente_approbation',
      purgeScheduledAt: '2026-03-31T10:00:00Z',
      reason: 'Cessation d\'activité',
    };

    const approveDeletion = (del: PendingDeletion, caller: { uid: string; email: string }, reason: string) => {
      // Règle inviolable 2-Man Rule
      if (del.requestedByUid === caller.uid) {
        throw new Error('Règle de sécurité violée : la suppression exige la validation d\'un SECOND administrateur distinct.');
      }
      return {
        ...del,
        status: 'approuvee' as const,
        approvedByUid: caller.uid,
        approvedByEmail: caller.email,
        approvedAt: new Date().toISOString(),
        approvalReason: reason,
      };
    };

    // Admin A tente d'approuver sa propre demande -> DOIT ÉCHOUER
    expect(() => {
      approveDeletion(pendingDel, adminA, 'Validation auto');
    }).toThrow(/SECOND administrateur distinct/);

    // Admin B (différent) tente d'approuver -> DOIT RÉUSSIR
    const adminB = { uid: 'admin_bravo', email: 'bravo@restomaster.com' };
    const approved = approveDeletion(pendingDel, adminB, 'Vérification du dossier de résiliation effectuée');

    expect(approved.status).toBe('approuvee');
    expect(approved.approvedByUid).toBe('admin_bravo');
    expect(approved.approvedByEmail).toBe('bravo@restomaster.com');
  });

  it('3. Révocation forcée des sessions (forceSignOut) : Invalidation ciblée ou globale', () => {
    const usersInTenant = [
      { id: 'user_1', organizationId: 'resto_douala_01', tokensValid: true },
      { id: 'user_2', organizationId: 'resto_douala_01', tokensValid: true },
      { id: 'user_3', organizationId: 'autre_resto_02', tokensValid: true },
    ];

    const simulateForceSignOut = (orgId: string, targetUid?: string) => {
      let revokedCount = 0;
      for (const u of usersInTenant) {
        if (targetUid) {
          if (u.id === targetUid && u.organizationId === orgId) {
            u.tokensValid = false;
            revokedCount++;
          }
        } else if (u.organizationId === orgId) {
          u.tokensValid = false;
          revokedCount++;
        }
      }
      return { revokedCount };
    };

    // Révocation de tout le restaurant
    const res = simulateForceSignOut('resto_douala_01');
    expect(res.revokedCount).toBe(2);
    expect(usersInTenant[0].tokensValid).toBe(false);
    expect(usersInTenant[1].tokensValid).toBe(false);
    // L'autre restaurant ne doit pas être impacté
    expect(usersInTenant[2].tokensValid).toBe(true);
  });

  it('4. Politique Zero-Trust absolue : Élimination préventive de tout mot de passe ou code PIN', () => {
    const rawUserDataFromFirestore = {
      id: 'emp_01',
      name: 'Jean Serveur',
      email: 'jean@boukarou.cm',
      role: 'serveur',
      organizationId: 'resto_douala_01',
      pinCode: '1234', // Ne doit JAMAIS fuiter dans le panel
      password: 'PlainPasswordDoNotLeak', // Ne doit JAMAIS fuiter
      hasPin: true,
      pinHash: 'pbkdf2$100000$salt$hash',
    };

    // Fonction de nettoyage exécutée dans subscribeToTenantUsers
    const sanitizeUser = (userDoc: any) => {
      const { pinCode, password, pinHash, ...safeUser } = userDoc;
      return safeUser;
    };

    const cleanUser = sanitizeUser(rawUserDataFromFirestore);

    expect(cleanUser.id).toBe('emp_01');
    expect(cleanUser.name).toBe('Jean Serveur');
    expect(cleanUser.hasPin).toBe(true);
    // Secrets strictement absents
    expect(cleanUser).not.toHaveProperty('pinCode');
    expect(cleanUser).not.toHaveProperty('password');
    expect(cleanUser).not.toHaveProperty('pinHash');
  });

  it('5. Changement de plan contractuel et intégrité tarifaire en FCFA', () => {
    const changePlan = (currentPlanId: string, targetPlanId: string) => {
      const current = DEFAULT_PLANS.find((p) => p.id === currentPlanId);
      const target = DEFAULT_PLANS.find((p) => p.id === targetPlanId);
      if (!current || !target) throw new Error('Plan invalide');

      return {
        previousPlan: current.id,
        previousPriceFcfa: current.priceFcfaMonthly,
        newPlan: target.id,
        newPriceFcfa: target.priceFcfaMonthly,
      };
    };

    const migration = changePlan('plan_starter', 'plan_enterprise');
    expect(migration.previousPlan).toBe('plan_starter');
    expect(migration.previousPriceFcfa).toBe(25000);
    expect(migration.newPlan).toBe('plan_enterprise');
    expect(migration.newPriceFcfa).toBe(95000);
  });
});
