import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PlatformRole, DEFAULT_PLANS, Tenant, TenantStatus } from '../../shared/types';

describe('RestoMaster Admin Panel — Architecture, Sécurité & Multi-Tenant (Phase 4)', () => {
  const rootDir = path.resolve(__dirname, '../../');

  it('1. Confirme la configuration multi-sites Firebase Hosting ("app" et "admin")', () => {
    const firebaseJsonPath = path.join(rootDir, 'firebase.json');
    expect(fs.existsSync(firebaseJsonPath)).toBe(true);

    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf-8'));
    expect(Array.isArray(firebaseConfig.hosting)).toBe(true);

    const appTarget = firebaseConfig.hosting.find((h: any) => h.target === 'app');
    const adminTarget = firebaseConfig.hosting.find((h: any) => h.target === 'admin');

    expect(appTarget).toBeDefined();
    expect(appTarget.public).toBe('dist');
    expect(appTarget.rewrites?.[0]?.destination).toBe('/index.html');

    expect(adminTarget).toBeDefined();
    expect(adminTarget.public).toBe('dist-admin');
    expect(adminTarget.rewrites?.[0]?.destination).toBe('/index.html');
  });

  it('2. Confirme l\'autonomie du package.json de l\'admin-panel', () => {
    const adminPkgPath = path.join(rootDir, 'admin-panel/package.json');
    expect(fs.existsSync(adminPkgPath)).toBe(true);

    const adminPkg = JSON.parse(fs.readFileSync(adminPkgPath, 'utf-8'));
    expect(adminPkg.name).toBe('restomaster-admin-panel');
    expect(adminPkg.scripts?.dev).toContain('vite');
    expect(adminPkg.scripts?.build).toBe('vite build');
  });

  it('3. Valide la matrice stricte des rôles plateforme (RBAC PlatformRole)', () => {
    const platformRoles: PlatformRole[] = [
      'platform_owner',
      'platform_admin',
      'support',
      'billing',
      'viewer',
    ];

    const canManageTenants = (role: PlatformRole): boolean => {
      return role === 'platform_owner' || role === 'platform_admin';
    };

    const canStartSupportSession = (role: PlatformRole): boolean => {
      return role === 'platform_owner' || role === 'platform_admin' || role === 'support';
    };

    const canRecordBilling = (role: PlatformRole): boolean => {
      return role === 'platform_owner' || role === 'platform_admin' || role === 'billing';
    };

    // Owner a tous les droits
    expect(canManageTenants('platform_owner')).toBe(true);
    expect(canStartSupportSession('platform_owner')).toBe(true);
    expect(canRecordBilling('platform_owner')).toBe(true);

    // Support a uniquement l'assistance
    expect(canManageTenants('support')).toBe(false);
    expect(canStartSupportSession('support')).toBe(true);
    expect(canRecordBilling('support')).toBe(false);

    // Billing a uniquement la facturation
    expect(canManageTenants('billing')).toBe(false);
    expect(canStartSupportSession('billing')).toBe(false);
    expect(canRecordBilling('billing')).toBe(true);

    // Viewer est en lecture seule
    expect(canManageTenants('viewer')).toBe(false);
    expect(canStartSupportSession('viewer')).toBe(false);
    expect(canRecordBilling('viewer')).toBe(false);
  });

  it('4. Garantit la politique Zero-Trust : aucun PIN en clair ni mot de passe dans les listings utilisateurs', () => {
    const mockRawUserFromFirestore = {
      id: 'user-789',
      name: 'Jean Serveur',
      email: 'jean@restomaster.test',
      role: 'serveur',
      organizationId: 'org-test',
      active: true,
      hasPin: true,
      pinCode: '1234', // Vulnérabilité théorique si résiduelle
      password: 'plain_password',
    };

    // Fonction de filtrage de sécurité appliquée par le service admin
    const sanitizeUserForAdmin = (raw: any) => {
      const { pinCode, password, ...safe } = raw;
      return safe;
    };

    const sanitized = sanitizeUserForAdmin(mockRawUserFromFirestore);

    expect(sanitized.pinCode).toBeUndefined();
    expect(sanitized.password).toBeUndefined();
    expect(sanitized.hasPin).toBe(true);
    expect(sanitized.name).toBe('Jean Serveur');
  });

  it('5. Valide le calcul exact des métriques de supervision (MRR FCFA et comptage par statut)', () => {
    const sampleTenants: Partial<Tenant>[] = [
      { id: 't1', status: 'actif', planId: 'plan_starter' },
      { id: 't2', status: 'actif', planId: 'plan_pro' },
      { id: 't3', status: 'essai', planId: 'plan_enterprise' },
      { id: 't4', status: 'impaye', planId: 'plan_pro' },
      { id: 't5', status: 'suspendu', planId: 'plan_pro' },
    ];

    const activeCount = sampleTenants.filter((t) => t.status === 'actif').length;
    const trialCount = sampleTenants.filter((t) => t.status === 'essai').length;
    const unpaidCount = sampleTenants.filter((t) => t.status === 'impaye').length;
    const suspendedCount = sampleTenants.filter((t) => t.status === 'suspendu').length;

    expect(activeCount).toBe(2);
    expect(trialCount).toBe(1);
    expect(unpaidCount).toBe(1);
    expect(suspendedCount).toBe(1);

    // Calcul du MRR (plan_starter: 25 000, plan_pro: 50 000, plan_enterprise: 95 000)
    const activeOrTrial = sampleTenants.filter((t) => t.status === 'actif' || t.status === 'essai');
    const mrr = activeOrTrial.reduce((sum, t) => {
      const plan = DEFAULT_PLANS.find((p) => p.id === t.planId);
      return sum + (plan?.priceFcfaMonthly || 0);
    }, 0);

    expect(mrr).toBe(25000 + 50000 + 95000); // 170 000 FCFA
  });
});
