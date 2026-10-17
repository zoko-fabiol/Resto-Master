import { db } from '../../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { Product, Category } from '../../types/restaurant';

export const productsFirestoreService = {
  /**
   * Enregistrer ou mettre à jour un produit
   */
  async saveProduct(product: Product): Promise<void> {
    const payload = {
      ...product,
      updatedAt: new Date().toISOString(),
    };
    try {
      const docRef = doc(db, 'products', product.id);
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      console.warn('Erreur lors de l\'enregistrement du produit dans Firestore:', err);
    }
  },

  /**
   * Supprimer un produit
   */
  async deleteProduct(productId: string): Promise<void> {
    try {
      const docRef = doc(db, 'products', productId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Erreur lors de la suppression du produit dans Firestore:', err);
    }
  },

  /**
   * Écoute en temps réel des produits (filtré par restaurant si défini)
   */
  subscribeToProducts(
    restaurantId: string | undefined,
    callback: (products: Product[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'products');
      const q = restaurantId
        ? query(colRef, where('restaurantId', '==', restaurantId))
        : query(colRef);

      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((d) => d.data() as Product);
            callback(list);
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  /**
   * Enregistrer ou mettre à jour une catégorie
   */
  async saveCategory(category: Category): Promise<void> {
    try {
      const docRef = doc(db, 'categories', category.id);
      await setDoc(docRef, category, { merge: true });
    } catch (err) {
      console.warn('Erreur lors de l\'enregistrement de la catégorie dans Firestore:', err);
    }
  },

  /**
   * Supprimer une catégorie
   */
  async deleteCategory(categoryId: string): Promise<void> {
    try {
      const docRef = doc(db, 'categories', categoryId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Erreur lors de la suppression de la catégorie dans Firestore:', err);
    }
  },

  /**
   * Écoute en temps réel de toutes les catégories
   */
  subscribeToCategories(callback: (categories: Category[]) => void): () => void {
    try {
      const colRef = collection(db, 'categories');
      return onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((d) => d.data() as Category);
            list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
            callback(list);
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },
};
