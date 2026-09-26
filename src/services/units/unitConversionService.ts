import { UnitType } from '../../types/restaurant';

export interface UnitConversionRule {
  fromUnit: UnitType;
  toUnit: UnitType;
  factor: number; // e.g., 1 kg = 1000 g -> factor = 1000
}

/**
 * Moteur de conversion d'unités de mesure RestoMaster OS
 * Conforme aux pratiques de gestion hôtelière et de restauration (SYSCOHADA & Fiches techniques)
 */
export class UnitConversionService {
  private static DEFAULT_CONVERSIONS: UnitConversionRule[] = [
    // Poids
    { fromUnit: 'kg', toUnit: 'g', factor: 1000 },
    { fromUnit: 'g', toUnit: 'kg', factor: 0.001 },
    { fromUnit: 'sac', toUnit: 'kg', factor: 50 }, // ex: sac de riz/farine = 50 kg
    { fromUnit: 'kg', toUnit: 'sac', factor: 0.02 },

    // Volume Liquides
    { fromUnit: 'L', toUnit: 'cl', factor: 100 },
    { fromUnit: 'cl', toUnit: 'L', factor: 0.01 },
    { fromUnit: 'L', toUnit: 'ml', factor: 1000 },
    { fromUnit: 'ml', toUnit: 'L', factor: 0.001 },
    { fromUnit: 'cl', toUnit: 'ml', factor: 10 },
    { fromUnit: 'ml', toUnit: 'cl', factor: 0.1 },

    // Conditionnements Boissons
    { fromUnit: 'bouteille', toUnit: 'cl', factor: 65 }, // Format standard brasserie Cameroun (65cl) ou vin (75cl)
    { fromUnit: 'cl', toUnit: 'bouteille', factor: 1 / 65 },
    { fromUnit: 'carton', toUnit: 'bouteille', factor: 24 }, // Casier standard 24 bouteilles
    { fromUnit: 'bouteille', toUnit: 'carton', factor: 1 / 24 },
    { fromUnit: 'carton', toUnit: 'cl', factor: 24 * 65 },

    // Portions & Boîtes
    { fromUnit: 'boite', toUnit: 'g', factor: 400 },
    { fromUnit: 'g', toUnit: 'portion', factor: 1 / 250 }, // 1 portion moyenne = 250g
    { fromUnit: 'portion', toUnit: 'g', factor: 250 },
    { fromUnit: 'piece', toUnit: 'portion', factor: 1 },
  ];

  /**
   * Convertit une quantité d'une unité vers une autre
   */
  public static convert(
    quantity: number,
    from: string,
    to: string,
    customFactor?: number
  ): number {
    if (from.toLowerCase() === to.toLowerCase()) return quantity;
    if (customFactor && customFactor > 0) {
      return quantity * customFactor;
    }

    const fromNormalized = from.toLowerCase() as UnitType;
    const toNormalized = to.toLowerCase() as UnitType;

    const rule = this.DEFAULT_CONVERSIONS.find(
      (r) => r.fromUnit === fromNormalized && r.toUnit === toNormalized
    );

    if (rule) {
      return Number((quantity * rule.factor).toFixed(4));
    }

    // Direct fallback if no conversion exists (e.g. piece to piece)
    return quantity;
  }

  /**
   * Calcule la déduction de stock pour un ingrédient de recette
   */
  public static calculateStockDeduction(
    recipeQuantity: number,
    recipeUnit: string,
    stockUnit: string,
    customFactor?: number
  ): number {
    return this.convert(recipeQuantity, recipeUnit, stockUnit, customFactor);
  }

  /**
   * Formate une quantité avec son unité de manière conviviale
   */
  public static formatQuantity(quantity: number, unit: string): string {
    const formattedNum = Number.isInteger(quantity)
      ? quantity.toString()
      : quantity.toFixed(2).replace(/\.?0+$/, '');
    return `${formattedNum} ${unit}`;
  }
}
