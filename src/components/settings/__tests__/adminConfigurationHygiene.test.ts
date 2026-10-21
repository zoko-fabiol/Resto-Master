import { describe, it, expect } from 'vitest';
import { DEFAULT_OPERATION_RULES } from '../../../types/configuration';

describe('Phase B — Hygiène & Cohérence de la Configuration Système', () => {
  // Liste des clés de réglages sans effet qui doivent être bannies de operationRules (B.4)
  const DEPRECATED_DEAD_RULE_KEYS = [
    'pos_active',
    'pos_custom_price',
    'pos_item_comp',
    'pos_change_server',
    'pos_table_transfer',
    'pos_table_merge',
    'pos_table_split',
    'tables_auto_status',
    'tables_transfer',
    'tables_auto_server_assign',
    'cuisine_kds',
    'cuisine_screen',
    'cuisine_stations',
    'bar_module',
    'bar_screen',
    'bar_bottles',
    'bar_glasses',
    'bar_consumption_control',
    'delivery_active',
    'delivery_online_order',
    'delivery_zones',
    'delivery_tracking',
    'delivery_customer_notifications',
    'delivery_web_orders',
    'res_online',
    'res_auto_confirm',
    'res_reminders',
    'res_availability',
    'event_active',
    'event_custom_menus',
    'event_banquet',
    'event_hall',
    'event_planning',
    'event_billing',
    'caisse_management',
    'caisse_transfers',
    'caisse_mandatory_close',
    'caisse_block_after_close',
    'caisse_reopen_with_auth',
  ];

  it('B.4 : DEFAULT_OPERATION_RULES ne contient plus aucune des clés obsolètes sans effet', () => {
    const presentDeadKeys = DEPRECATED_DEAD_RULE_KEYS.filter(
      (key) => key in DEFAULT_OPERATION_RULES
    );

    expect(presentDeadKeys).toEqual([]);
  });

  it('B.4 : conserve les règles opérationnelles réellement actives et utiles', () => {
    // POS
    expect(DEFAULT_OPERATION_RULES.pos_use_tables).toBe(true);
    expect(DEFAULT_OPERATION_RULES.pos_quick_orders).toBe(true);
    expect(DEFAULT_OPERATION_RULES.pos_allow_discount).toBe(true);

    // Tables
    expect(DEFAULT_OPERATION_RULES.tables_management).toBe(true);
    expect(DEFAULT_OPERATION_RULES.tables_floor_plan).toBe(true);
    expect(DEFAULT_OPERATION_RULES.tables_merge).toBe(true);

    // Cuisine
    expect(DEFAULT_OPERATION_RULES.cuisine_auto_send).toBe(true);
    expect(DEFAULT_OPERATION_RULES.cuisine_priority).toBe(true);

    // Bar
    expect(DEFAULT_OPERATION_RULES.bar_cocktails).toBe(true);
    expect(DEFAULT_OPERATION_RULES.bar_cocktail_recipes).toBe(true);

    // Caisse
    expect(DEFAULT_OPERATION_RULES.caisse_mandatory_open).toBe(true);
    expect(DEFAULT_OPERATION_RULES.caisse_variance_control).toBe(true);
    expect(DEFAULT_OPERATION_RULES.caisse_z_report).toBe(true);
  });

  it('B.6 : tous les modules majeurs de base sont bien présents dans les règles', () => {
    expect(DEFAULT_OPERATION_RULES.mod_dashboard).toBe(true);
    expect(DEFAULT_OPERATION_RULES.mod_pos).toBe(true);
    expect(DEFAULT_OPERATION_RULES.mod_tables).toBe(true);
    expect(DEFAULT_OPERATION_RULES.mod_cuisine).toBe(true);
    expect(DEFAULT_OPERATION_RULES.mod_bar).toBe(true);
    expect(DEFAULT_OPERATION_RULES.mod_caisse).toBe(true);
    expect(DEFAULT_OPERATION_RULES.mod_stock).toBe(true);
    expect(DEFAULT_OPERATION_RULES.mod_recipes_yield).toBe(true);
  });
});
