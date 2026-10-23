import { describe, it, expect } from 'vitest';
import { UserProfile, UserRole } from '../types/restaurant';

describe('RestoMaster OS — Sécurité d’Authentification & Custom Claims (Phase 1)', () => {
  // Heuristique de résolution de profil sécurisée basée exclusivement sur les Custom Claims et le document vérifié
  function resolveUserProfileFromClaims(params: {
    uid: string;
    email: string;
    claims: Record<string, any>;
    firestoreDoc?: {
      role?: string;
      active?: boolean;
      organizationId?: string;
      accessibleRestaurantIds?: string[];
    } | null;
    isPlatformAdminDoc?: boolean;
  }): { user: UserProfile; isSuperadmin: boolean; isPlatformAdmin: boolean } {
    const { uid, email, claims, firestoreDoc, isPlatformAdminDoc } = params;

    const platformRole = claims.platformRole as string | undefined;
    const isPlatformOwner = platformRole === 'platform_owner';
    const isPlatformAdmin = Boolean(platformRole) || Boolean(isPlatformAdminDoc);
    const isSuperadminClaim = isPlatformOwner || claims.superadmin === true || Boolean(isPlatformAdminDoc);

    let finalRole: UserRole = 'serveur';
    let isActive = claims.active !== false;
    let accessibleOutlets = (claims.outlets as string[]) || (firestoreDoc?.accessibleRestaurantIds) || ['*'];

    if (isSuperadminClaim) {
      finalRole = 'superadmin';
      isActive = true;
      accessibleOutlets = ['*'];
    } else if (claims.role && claims.role !== 'aucun') {
      finalRole = claims.role as UserRole;
    } else if (firestoreDoc?.role && firestoreDoc.role !== 'aucun') {
      // Un document Firestore ne peut pas s'auto-attribuer superadmin sans Custom Claim ou doc platform_admins
      if (firestoreDoc.role === 'superadmin' && !isSuperadminClaim) {
        finalRole = 'direction'; // Dégradation de sécurité
      } else {
        finalRole = firestoreDoc.role as UserRole;
      }
    }

    if (firestoreDoc?.active === false || claims.active === false) {
      isActive = false;
    }

    const user: UserProfile = {
      id: uid,
      email,
      name: email.split('@')[0],
      role: finalRole,
      active: isActive,
      organizationId: (claims.organizationId as string) || firestoreDoc?.organizationId || '',
      accessibleRestaurantIds: accessibleOutlets,
    };

    return {
      user,
      isSuperadmin: finalRole === 'superadmin' || isPlatformOwner,
      isPlatformAdmin,
    };
  }

  it('1. Reconnait immédiatement le superadmin si claim platformRole == platform_owner', () => {
    const res = resolveUserProfileFromClaims({
      uid: 'superadmin_1',
      email: 'claus@restomaster.cm',
      claims: { platformRole: 'platform_owner', active: true },
    });

    expect(res.user.role).toBe('superadmin');
    expect(res.isSuperadmin).toBe(true);
    expect(res.isPlatformAdmin).toBe(true);
    expect(res.user.accessibleRestaurantIds).toEqual(['*']);
    expect(res.user.active).toBe(true);
  });

  it('2. Reconnait le support/billing plateforme sans lui donner le rôle restaurant superadmin non sollicité', () => {
    const res = resolveUserProfileFromClaims({
      uid: 'support_1',
      email: 'support@restomaster.cm',
      claims: { platformRole: 'support', role: 'auditeur', active: true },
    });

    expect(res.user.role).toBe('auditeur');
    expect(res.isSuperadmin).toBe(false);
    expect(res.isPlatformAdmin).toBe(true);
  });

  it('3. Refuse l’auto-élévation d’un utilisateur normal dont le document Firestore prétend superadmin', () => {
    // Cas d'attaque : l'utilisateur a écrit { role: 'superadmin' } dans son document avant verrouillage des règles
    const res = resolveUserProfileFromClaims({
      uid: 'user_malicieux',
      email: 'hacker@test.internal',
      claims: {}, // Aucun claim d'administration
      firestoreDoc: { role: 'superadmin', active: true, organizationId: 'resto_1' },
    });

    // Doit être rétrogradé et refusé de tout statut Superadmin
    expect(res.user.role).not.toBe('superadmin');
    expect(res.isSuperadmin).toBe(false);
    expect(res.isPlatformAdmin).toBe(false);
  });

  it('4. Assure qu’aucun e-mail particulier ne bénéficie d’un passe-droit codé en dur', () => {
    // Si l'e-mail du fondateur ou de n'importe qui est utilisé SANS les claims appropriés, il n'a aucun passe-droit
    const res = resolveUserProfileFromClaims({
      uid: 'fondateur_sans_claim',
      email: 'wanclaus32@gmail.com',
      claims: {},
      firestoreDoc: { role: 'serveur', active: true },
    });

    expect(res.user.role).toBe('serveur');
    expect(res.isSuperadmin).toBe(false);
    expect(res.isPlatformAdmin).toBe(false);
  });

  it('5. Reconnait un administrateur plateforme via le document platform_admins si token pas encore rafraîchi', () => {
    const res = resolveUserProfileFromClaims({
      uid: 'admin_recent',
      email: 'patron@restomaster.cm',
      claims: {}, // Token non encore rafraîchi
      isPlatformAdminDoc: true,
    });

    expect(res.user.role).toBe('superadmin');
    expect(res.isSuperadmin).toBe(true);
    expect(res.isPlatformAdmin).toBe(true);
  });
});
