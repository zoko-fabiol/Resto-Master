import { describe, it, expect } from 'vitest';
import {
  cloudinaryService,
  sanitizeCloudinaryFolderName,
} from '../services/media/cloudinaryService';

describe('Cloudinary Multi-Tenant — Dossiers Dédiés par Nom de Restaurant', () => {
  it('assainit fidèlement les noms de restaurants en dossiers Cloudinary lisibles', () => {
    expect(sanitizeCloudinaryFolderName('Le Grand Gourmet')).toBe('Le Grand Gourmet');
    expect(sanitizeCloudinaryFolderName('Chez Wou / Yaoundé #1 ?')).toBe('Chez Wou - Yaoundé 1');
    expect(sanitizeCloudinaryFolderName('Café & Délices (Terrasse)')).toBe('Café & Délices (Terrasse)');
    expect(sanitizeCloudinaryFolderName('   Restaurant   Étoile   ')).toBe('Restaurant Étoile');
    expect(sanitizeCloudinaryFolderName('')).toBe('Restaurant_Principal');
  });

  it('génère le chemin de dossier Cloudinary directement au nom du restaurant pour les plats et documents', () => {
    // Restaurant 1
    const folderResto1 = cloudinaryService.buildFolderPath({
      restaurantName: 'Le Grand Gourmet',
      category: 'food',
    });
    expect(folderResto1).toBe('Le Grand Gourmet/food');

    // Restaurant 2
    const folderResto2 = cloudinaryService.buildFolderPath({
      restaurantName: 'Bistrot Douala',
      category: 'documents',
    });
    expect(folderResto2).toBe('Bistrot Douala/documents');

    // Restaurant 3
    const folderResto3 = cloudinaryService.buildFolderPath({
      restaurantName: 'La Pergola Kribi',
      category: 'branding',
    });
    expect(folderResto3).toBe('La Pergola Kribi/branding');
  });

  it('isole strictement les dossiers de 10 restaurants différents dans Cloudinary', () => {
    const restaurants = [
      'Le Grand Gourmet',
      'Chez Wou',
      'Bistrot Akwa',
      'La Chaumière',
      'Terrasse Kribi',
      'L’Oasis Bonanjo',
      'Saveurs du Nord',
      'Grillades du Centre',
      'Le Balafon Bafoussam',
      'Café des Palmiers Limbe',
    ];

    const generatedFolders = restaurants.map((name) =>
      cloudinaryService.buildFolderPath({
        restaurantName: name,
        category: 'food',
      })
    );

    // 10 dossiers distincts générés
    expect(new Set(generatedFolders).size).toBe(10);

    // Chaque dossier commence exactement par le nom assaini du restaurant
    restaurants.forEach((name, idx) => {
      const sanitized = sanitizeCloudinaryFolderName(name);
      expect(generatedFolders[idx]).toBe(`${sanitized}/food`);
    });
  });

  it('préserve la compatibilité avec l’ancienne signature à arguments positionnels', () => {
    const legacyFolder = cloudinaryService.buildFolderPath(
      'org_123',
      'resto_456',
      'menus',
      'Le Grand Gourmet'
    );
    expect(legacyFolder).toBe('Le Grand Gourmet/menus');
  });
});
