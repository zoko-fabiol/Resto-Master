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
      case 'bar_lounge':
        // Bar prioritaire, cuisine légère, pas de livraison
        return updated.map((f) => {
          if (['kds_bar', 'tables_management', 'pos_core', 'cash_register_z', 'mobile_money_momo', 'mobile_money_orange', 'cameroon_fiscal_framework'].includes(f.id)) {
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
}
