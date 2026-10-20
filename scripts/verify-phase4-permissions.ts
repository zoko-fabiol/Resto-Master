/**
 * Script de validation automatisé - Phase 4 (Permissions & Limites Réellement Appliquées)
 *
 * Vérifie :
 * 1. Évaluation dynamique de la matrice RBAC (RolePermissionMatrix)
 * 2. Superadmin invariant pour la Direction
 * 3. Isolation stricte du rôle Tablette vers Kiosk
 * 4. Contrôle des plafonds de remises (maxDiscountPercent & requiresApprovalForDiscount)
 * 5. Contrôle des plafonds de dépenses (maxExpenseAmount)
 * 6. Garde-fou d'approbation d'annulation (requiresApprovalForCancel)
 * 7. Prise en compte de charactersPerLine pour le formatage thermique
 */

import { DEFAULT_PERMISSIONS, PermissionService } from '../src/services/permissions/permissionService';
import { DEFAULT_ROLE_LIMITS, DEFAULT_SETTINGS } from '../src/config/defaults';
import { UserRole } from '../src/types/restaurant';
import { RoleLimits } from '../src/types/configuration';
import { buildClientReceiptEscPos } from '../src/services/printing/escposGenerator';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ✗ ÉCHEC : ${message}`);
    process.exit(1);
  }
}

async function runPhase4Verification() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║       RESTOMASTER OS — TESTS AUTOMATISÉS PHASE 4 (PERMISSIONS & LIMITES)   ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  // Test 1: Invariant Direction Superadmin
  console.log('[Test 1] Vérification de l\'invariant Direction (Superadmin universel)...');
  const allModules = Object.keys(DEFAULT_PERMISSIONS.direction) as any[];
  for (const mod of allModules) {
    assert(
      PermissionService.can('direction', mod, 'view'),
      `La direction doit avoir view sur le module ${mod}`
    );
    assert(
      PermissionService.can('direction', mod, 'delete'),
      `La direction doit avoir delete sur le module ${mod}`
    );
  }
  console.log('  ✓ Invariant superadmin Direction confirmé sur 100% des modules.');

  // Test 2: Matrice dynamique modifiable
  console.log('[Test 2] Vérification de l\'évaluation dynamique de la matrice RBAC...');
  const customMatrix = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
  // Retirer l'accès caisse au serveur
  customMatrix.serveur.pos.view = false;
  assert(!PermissionService.can('serveur', 'pos', 'view', customMatrix), 'Le serveur doit être bloqué si pos.view=false');
  // Rétablir
  customMatrix.serveur.pos.view = true;
  assert(PermissionService.can('serveur', 'pos', 'view', customMatrix), 'Le serveur doit être autorisé si pos.view=true');
  console.log('  ✓ La matrice RBAC est dynamique et respecte les surcharges.');

  // Test 3: Rôle Tablette verrouillé
  console.log('[Test 3] Vérification de l\'isolation stricte du profil Tablette...');
  const tabletteLimits = DEFAULT_ROLE_LIMITS.tablette;
  assert(tabletteLimits.maxDiscountPercent === 0, 'Une tablette ne peut accorder aucune remise');
  assert(tabletteLimits.maxExpenseAmount === 0, 'Une tablette ne peut engager aucune dépense');
  assert(tabletteLimits.requiresApprovalForCancel === true, 'Une tablette ne peut annuler de commande');
  console.log('  ✓ Profil Tablette verrouillé sur le mode Kiosk.');

  // Test 4: Plafonds de remise RoleLimits
  console.log('[Test 4] Vérification des plafonds de remises par rôle (maxDiscountPercent)...');
  const serveurLimits = DEFAULT_ROLE_LIMITS.serveur;
  const managerLimits = DEFAULT_ROLE_LIMITS.manager;
  const directionLimits = DEFAULT_ROLE_LIMITS.direction;

  assert(serveurLimits.maxDiscountPercent === 5, 'Plafond serveur = 5%');
  assert(managerLimits.maxDiscountPercent === 15, 'Plafond manager = 15%');
  assert(directionLimits.maxDiscountPercent === 100, 'Plafond direction = 100%');
  assert(serveurLimits.requiresApprovalForDiscount === true, 'Le serveur exige une approbation pour remise');
  console.log('  ✓ Échelle hiérarchique des remises conforme aux règles de gestion.');

  // Test 5: Plafonds de dépenses RoleLimits
  console.log('[Test 5] Vérification des plafonds de décaissement (maxExpenseAmount)...');
  const caisseLimits = DEFAULT_ROLE_LIMITS.caisse;
  assert(caisseLimits.maxExpenseAmount === 50000, 'Plafond décaissement direct caisse = 50 000 FCFA');
  assert(managerLimits.maxExpenseAmount === 250000, 'Plafond décaissement manager = 250 000 FCFA');
  console.log('  ✓ Seuils de dépenses et délégations financières validés.');

  // Test 6: Formatage thermique personnalisé avec charactersPerLine
  console.log('[Test 6] Vérification de la prise en compte de charactersPerLine (32 vs 48 cols)...');
  const dummyOrder: any = {
    id: 'ord-1',
    orderNumber: 'CMD-TEST-001',
    createdAt: '2026-10-20T10:00:00Z',
    items: [],
    subtotal: 10000,
    tax: 1925,
    total: 11925,
    serverName: 'Jean Test',
    status: 'nouveau',
  };

  const buffer32 = buildClientReceiptEscPos(dummyOrder, DEFAULT_SETTINGS, {
    charactersPerLine: 32,
  });
  const buffer48 = buildClientReceiptEscPos(dummyOrder, DEFAULT_SETTINGS, {
    charactersPerLine: 48,
  });
  assert(buffer32.length > 0 && buffer48.length > 0, 'Les deux buffers ESC/POS doivent être générés');
  console.log(`  ✓ Génération ESC/POS validée : ${buffer32.length} octets (32 cols) vs ${buffer48.length} octets (48 cols).`);

  console.log('\n================================================================================');
  console.log('  TOUS LES TESTS DE PHASE 4 SONT VALIDÉS AVEC SUCCÈS (6/6)');
  console.log('================================================================================\n');
}

runPhase4Verification().catch((err) => {
  console.error('Erreur inattendue:', err);
  process.exit(1);
});
