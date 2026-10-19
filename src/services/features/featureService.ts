import { FeatureItem, ConfigurationProfileType } from '../../types/configuration';

export class FeatureService {
  /**
   * Vérifie si une fonctionnalité est active (activée et non suspendue)
   */
  public static isFeatureEnabled(features: FeatureItem[], featureId: string): boolean {
    const feat = features.find((f) => f.id === featureId);
    return Boolean(feat && feat.status === 'ACTIVÉ');
  }

  /**
   * Vérifie si une fonctionnalité est suspendue
   */
  public static isFeatureSuspended(features: FeatureItem[], featureId: string): boolean {
    const feat = features.find((f) => f.id === featureId);
    return Boolean(feat && feat.status === 'SUSPENDU');
  }

  /**
   * Récupère une fonctionnalité par son identifiant
   */
  public static getFeature(features: FeatureItem[], featureId: string): FeatureItem | undefined {
    return features.find((f) => f.id === featureId);
  }

  /**
   * Vérifie si toutes les dépendances d'une fonctionnalité sont satisfaites
   */
  public static checkDependencies(
    features: FeatureItem[],
    featureId: string
  ): { satisfied: boolean; missing: string[] } {
    const feat = this.getFeature(features, featureId);
    if (!feat || !feat.dependencies || feat.dependencies.length === 0) {
      return { satisfied: true, missing: [] };
    }

    const missing = feat.dependencies.filter((depId) => !this.isFeatureEnabled(features, depId));
    return {
      satisfied: missing.length === 0,
      missing,
    };
  }

  /**
   * Applique un profil d'établissement prédéfini en activant/désactivant les fonctionnalités cibles
   */
  public static applyProfile(
    currentFeatures: FeatureItem[],
    profile: ConfigurationProfileType
  ): FeatureItem[] {
    const updated = [...currentFeatures];

    // Règles d'activation par profil
    switch (profile) {
      case 'depart_essentiel':
        // Profil Essentiel (Restaurant #1) : Exactement les 12 modules opérationnels demandés
        return updated.map((f) => {
          const essentialIds = [
            'pos_core',
            'kds_kitchen',
            'recipes_bom_yield',
            'stock_lots_fefo',
            'purchases_suppliers',
            'cash_register_z',
            'documents_scanner_ged',
            'audit_trail_immutable',
            'payment_methods_all',
          ];
          if (essentialIds.includes(f.id)) {
            return { ...f, status: 'ACTIVÉ' };
          }
          const disabledIds = [
            'tables_management',
            'bar_pos_exclusive',
            'kds_bar',
            'table_reservations',
            'delivery_orders',
            'events_banquets',
            'haccp_hygiene',
            'hotelpro_maincourante',
            'cameroon_fiscal_framework',
            'clients_crm',
            'loyalty_program',
          ];
          if (disabledIds.includes(f.id)) {
            return { ...f, status: 'DÉSACTIVÉ' };
          }
          return f;
        });

      case 'bar_lounge':
        // Bar prioritaire, cuisine légère, pas de livraison
        return updated.map((f) => {
          if (['kds_bar', 'bar_pos_exclusive', 'tables_management', 'pos_core', 'cash_register_z', 'mobile_money_momo', 'mobile_money_orange', 'cameroon_fiscal_framework'].includes(f.id)) {
            return { ...f, status: 'ACTIVÉ' };
          }
          if (['delivery_orders', 'events_banquets'].includes(f.id)) {
            return { ...f, status: 'DÉSACTIVÉ' };
          }
          return f;
        });

      case 'fast_food':
        // POS ultra-rapide, emporter & livraison, pas de gestion de tables poussée
        return updated.map((f) => {
          if (['pos_core', 'delivery_orders', 'kds_kitchen', 'cash_register_z', 'mobile_money_momo', 'mobile_money_orange'].includes(f.id)) {
            return { ...f, status: 'ACTIVÉ' };
          }
          if (['events_banquets', 'table_reservations'].includes(f.id)) {
            return { ...f, status: 'DÉSACTIVÉ' };
          }
          return f;
        });

      case 'evenementiel_traiteur':
        // Banquets, devis, livraisons, facturation A5
        return updated.map((f) => {
          if (['events_banquets', 'delivery_orders', 'invoice_laser_a5', 'cameroon_fiscal_framework', 'pos_core', 'cash_register_z'].includes(f.id)) {
            return { ...f, status: 'ACTIVÉ' };
          }
          return f;
        });

      case 'restaurant_classique':
      default:
        // Toutes les fonctionnalités clés activées
        return updated.map((f) => {
          if (f.id === 'loyalty_program') return { ...f, status: 'SUSPENDU' };
          return { ...f, status: 'ACTIVÉ' };
        });
    }
  }

  /**
   * Retourne la matrice des règles de visibilité des modules latéraux pour un profil donné
   */
  public static getOperationRulesForProfile(profile: ConfigurationProfileType): Record<string, boolean> {
    switch (profile) {
      case 'depart_essentiel':
        return {
          mod_dashboard: true,
          mod_pos: true,
          mod_bar_pos: false,
          mod_tables: false,
          mod_cuisine: true,
          mod_bar: false,
          mod_menu: true,
          mod_recipes_yield: true,
          mod_caisse: true,
          mod_stock: true,
          mod_purchases: true,
          mod_hygiene: false,
          mod_main_courante: false,
          mod_fiscal: false,
          mod_finance: false,
          mod_clients: false,
          mod_delivery: false,
          mod_events: false,
          mod_staff: true,
          mod_documents: true,
          mod_reports: true,
          mod_audit: true,
          mod_settings: true,
          res_management: false,
        };

      case 'bar_lounge':
        return {
          mod_dashboard: true,
          mod_pos: true,
          mod_bar_pos: true,
          mod_tables: true,
          mod_cuisine: false,
          mod_bar: true,
          mod_menu: true,
          mod_recipes_yield: true,
          mod_caisse: true,
          mod_stock: true,
          mod_purchases: true,
          mod_hygiene: true,
          mod_main_courante: false,
          mod_fiscal: true,
          mod_finance: true,
          mod_clients: true,
          mod_delivery: false,
          mod_events: false,
          mod_staff: true,
          mod_documents: true,
          mod_reports: true,
          mod_audit: true,
          mod_settings: true,
          res_management: true,
        };

      case 'restaurant_classique':
      default:
        return {
          mod_dashboard: true,
          mod_pos: true,
          mod_bar_pos: true,
          mod_tables: true,
          mod_cuisine: true,
          mod_bar: true,
          mod_menu: true,
          mod_recipes_yield: true,
          mod_caisse: true,
          mod_stock: true,
          mod_purchases: true,
          mod_hygiene: true,
          mod_main_courante: true,
          mod_fiscal: true,
          mod_finance: true,
          mod_clients: true,
          mod_delivery: true,
          mod_events: true,
          mod_staff: true,
          mod_documents: true,
          mod_reports: true,
          mod_audit: true,
          mod_settings: true,
          res_management: true,
        };
    }
  }
}
