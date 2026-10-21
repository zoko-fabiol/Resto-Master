import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Garde-fou d'uniformisation du design (plan U4).
 * Les vues migrées doivent utiliser PageHeader (titre h1 en haut) et ne plus
 * contenir de texte < 12 px ni de champs bruts hors composants du design system.
 * Ajouter ici chaque vue au fur et à mesure de sa migration.
 */
const MIGRATED_VIEWS = [
  'src/components/delivery/DeliveryView.tsx',
  'src/components/stock/StockView.tsx',
];

describe('Uniformisation du design — vues migrées', () => {
  for (const file of MIGRATED_VIEWS) {
    const source = readFileSync(file, 'utf8');

    it(`${file} utilise PageHeader`, () => {
      expect(source).toMatch(/<PageHeader\b/);
    });

    it(`${file} n'a pas de h1 manuel (le h1 est dans PageHeader)`, () => {
      expect(source).not.toMatch(/<h1\b/);
    });
  }

  it('DeliveryView : aucun texte < 12 px et aucun champ brut', () => {
    const source = readFileSync('src/components/delivery/DeliveryView.tsx', 'utf8');
    expect(source).not.toMatch(/text-\[(8|9|10|11)px\]/);
    expect(source).not.toMatch(/<(input|select|textarea)\b/);
  });

  it('les composants du design system existent et sont exportés', () => {
    const index = readFileSync('src/components/ui/index.ts', 'utf8');
    for (const name of ['PageHeader', 'PageLayout', 'FormControls', 'Field', 'Button', 'Modal']) {
      expect(index).toContain(`./${name}`);
    }
    expect(statSync(join('src/components/ui', 'PageLayout.tsx')).isFile()).toBe(true);
    expect(readdirSync('src/components/ui')).toContain('FormControls.tsx');
  });
});
