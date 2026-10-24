import React, { useState, useEffect, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Product, OrderItem, Order } from '../../types/restaurant';
import { formatCurrency } from '../../lib/utils';
import { calculateCameroonVatFromHt } from '../../../shared/fiscal/cameroonFiscal';
import { printerService } from '../../services/printing/printerService';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Utensils,
  Send,
  CreditCard,
  User,
  Users,
  Tag,
  AlertCircle,
  Clock,
  Flame,
  ShoppingBag,
  SlidersHorizontal,
  X,
  Check,
  Hash,
  Wine,
  GlassWater,
  Salad,
  ChefHat,
  Cake,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PageHeader } from '../ui';

interface PosViewProps {
  initialTableId?: string;
  onOpenPayment: (orderId: string) => void;
  mode?: 'restaurant' | 'bar';
}

// Preset Quick Tags for rapid modifiers
const QUICK_MODIFIERS = {
  cuissons: ['Bleu', 'Saignant', 'À point', 'Bien cuit', 'Grillé à vif'],
  garnitures: ['Frites', 'Alloco', 'Riz blanc', 'Miondo', 'Légumes sautés', 'Plantain vapeur'],
  sauces: ['Sans piment', 'Piment à part', 'Piment fort', 'Sauce poivre', 'Mayo maison'],
  regimes: ['Sans sel', 'Sans arachide', 'Sans huile', 'Bien chaud', 'À emporter séparé'],
};

export const PosView: React.FC<PosViewProps> = ({ initialTableId, onOpenPayment, mode = 'restaurant' }) => {
  const { currentUser } = useAuth();
  const {
    products,
    categories,
    tables,
    orders,
    customers,
    createOrder,
    addItemsToOrder,
    updateTableGuestsCount,
    settings,
    isFeatureEnabled,
    isRuleEnabled,
    peripherals,
    printerSettings,
    addAuditLog,
    cashSession,
    createProduct,
    createCategory,
    roleLimits,
  } = useRestaurant();
  const { showToast, playAudioChime } = useToast();

  const isDeliveryEnabled = isFeatureEnabled('delivery_orders') && isRuleEnabled('delivery_active', true);
  const isTakeawayEnabled = isFeatureEnabled('takeaway_orders') || isFeatureEnabled('click_and_collect');
  const isTablesEnabled = (isFeatureEnabled('tables_management') || isFeatureEnabled('table_service')) && isRuleEnabled('pos_use_tables', true);

  // Règles Opérationnelles (Section 7 POS, Section 8 Tables, Section 22 Caisse)
  const isDiscountsAllowed = isRuleEnabled('pos_allow_discount', true);
  const isDiscountApprovalRequired = isRuleEnabled('pos_require_discount_approval', true);
  const isDeleteLineAllowed = isRuleEnabled('pos_delete_line', true);
  const isQuickOrdersAllowed = isRuleEnabled('pos_quick_orders', true);
  const isSaleWithoutTableAllowed = isRuleEnabled('pos_sale_without_table', true);
  const isUseTablesRequired = isRuleEnabled('pos_use_tables', true);
  const isCancelOrderAllowed = isRuleEnabled('pos_cancel_order', true);
  const isCancelReasonRequired = isRuleEnabled('pos_require_cancel_reason', true);
  const isZeroPriceAllowed = isRuleEnabled('pos_zero_price', false);
  const isCaisseMandatoryOpen = isRuleEnabled('caisse_mandatory_open', true);
  const isEditOrderAllowed = isRuleEnabled('pos_edit_order', true);
  const isCuisineAutoSend = isRuleEnabled('cuisine_auto_send', true);

  // Règles de table et de service raccordées
  const isTableMergeAllowed = isRuleEnabled('pos_table_merge', true);
  const isTableTransferAllowed = isRuleEnabled('pos_table_transfer', true);
  const isTableSplitAllowed = isRuleEnabled('pos_table_split', true);
  const isChangeServerAllowed = isRuleEnabled('pos_change_server', true);
  const isItemCompAllowed = isRuleEnabled('pos_item_comp', true);
  const isCustomPriceAllowed = isRuleEnabled('pos_custom_price', false);

  const [showCancelReasonModal, setShowCancelReasonModal] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState('Erreur de commande');
  const [customCancelReason, setCustomCancelReason] = useState('');

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string>(initialTableId || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [orderType, setOrderType] = useState<'sur_place' | 'a_emporter' | 'livraison'>('sur_place');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProforma, setIsProforma] = useState(false);
  const [companyBillingName, setCompanyBillingName] = useState('');
  const [companyBillingNiu, setCompanyBillingNiu] = useState('');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Résilience Coupures de Courant : Persistance continue de l'ébauche de panier
  const DRAFT_STORAGE_KEY = `restomaster_pos_draft_${selectedTableId || 'comptoir'}`;

  // Sauvegarde automatique en continu du panier actif
  useEffect(() => {
    if (cart.length > 0) {
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            cart,
            orderNotes,
            discountPercent,
            tableId: selectedTableId,
            timestamp: Date.now(),
          })
        );
      } catch {}
    } else {
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}
    }
  }, [cart, orderNotes, discountPercent, selectedTableId, DRAFT_STORAGE_KEY]);

  // Récupération automatique au rechargement ou changement de table
  useEffect(() => {
    if (cart.length === 0) {
      try {
        const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (rawDraft) {
          const draft = JSON.parse(rawDraft);
          // Récupération si l'ébauche date de moins de 12 heures
          if (draft.cart && draft.cart.length > 0 && Date.now() - (draft.timestamp || 0) < 12 * 3600 * 1000) {
            setCart(draft.cart);
            if (draft.orderNotes) setOrderNotes(draft.orderNotes);
            if (draft.discountPercent) setDiscountPercent(draft.discountPercent);
            showToast({
              title: 'Panier Restauré',
              message: 'Vos articles en cours de saisie ont été restaurés.',
              type: 'info',
            });
          }
        }
      } catch {}
    }
  }, [selectedTableId, DRAFT_STORAGE_KEY]);

  // Top articles plus vendus calculés dynamiquement sur les commandes existantes
  const topSoldProductIds = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => {
      o.items?.forEach((item) => {
        counts[item.productId] = (counts[item.productId] || 0) + item.quantity;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([pid]) => pid);
  }, [orders]);

  const popularProducts = useMemo(() => {
    return products.filter((p) => topSoldProductIds.includes(p.id) && p.available);
  }, [products, topSoldProductIds]);

  // Commande active existante sur la table sélectionnée (Synchronisation temps réel Tablette & POS)
  const existingTableOrder = useMemo(() => {
    if (!selectedTableId || orderType !== 'sur_place') return null;
    const currentT = tables.find((t) => t.id === selectedTableId);
    if (currentT?.currentOrderId) {
      const ord = orders.find((o) => o.id === currentT.currentOrderId);
      if (ord && ord.status !== 'payee' && ord.status !== 'annulee') return ord;
    }
    return (
      orders.find(
        (o) =>
          o.tableId === selectedTableId &&
          o.status !== 'payee' &&
          o.status !== 'annulee'
      ) || null
    );
  }, [selectedTableId, orderType, tables, orders]);

  // Gestion des Couverts / Seats
  const [totalSeats, setTotalSeats] = useState<number>(2);
  const [activeSeatNumber, setActiveSeatNumber] = useState<number>(1);

  // Synchronisation automatique des couverts selon la table sélectionnée et sa commande active
  useEffect(() => {
    if (selectedTableId && orderType === 'sur_place') {
      const currentT = tables.find((t) => t.id === selectedTableId);
      const existingOrd = currentT?.currentOrderId
        ? orders.find((o) => o.id === currentT.currentOrderId)
        : orders.find(
            (o) =>
              o.tableId === selectedTableId &&
              o.status !== 'payee' &&
              o.status !== 'annulee'
          );

      const count =
        existingOrd?.guestCount ||
        currentT?.guestsCount ||
        currentT?.capacity ||
        2;
      setTotalSeats(Math.max(1, count));
    }
  }, [selectedTableId, orderType, tables, orders]);

  // Active item for Quick Modifiers Modal
  const [activeModifierItemId, setActiveModifierItemId] = useState<string | null>(null);

  // Active item for Quick Quantity Numpad Modal
  const [activeNumpadItemId, setActiveNumpadItemId] = useState<string | null>(null);

  // State pour création rapide de boisson au Bar (Section Bar Séparé)
  const [showAddDrinkModal, setShowAddDrinkModal] = useState(false);
  const [newDrinkName, setNewDrinkName] = useState('');
  const [newDrinkPrice, setNewDrinkPrice] = useState<number>(2500);
  const [newDrinkCost, setNewDrinkCost] = useState<number>(1000);
  const [newDrinkCategory, setNewDrinkCategory] = useState<string>('');
  const [isNewDrinkCategoryMode, setIsNewDrinkCategoryMode] = useState<boolean>(false);
  const [newDrinkCategoryCustomName, setNewDrinkCategoryCustomName] = useState<string>('');

  // Filter products (mémoïsé et restreint à 100% boissons si mode === 'bar')
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (mode === 'bar' && p.destination !== 'bar') {
        return false;
      }
      const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const matchQuery =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [products, mode, selectedCategory, searchQuery]);

  // Catégories disponibles (restreintes aux catégories bar en mode bar)
  const availableCategories = useMemo(() => {
    if (mode === 'bar') {
      const barCategoryIds = new Set(
        products.filter((p) => p.destination === 'bar').map((p) => p.categoryId)
      );
      return categories.filter((c) => barCategoryIds.has(c.id));
    }
    return categories;
  }, [categories, products, mode]);

  // Cart operations
  const addToCart = (product: Product) => {
    if (orderType === 'sur_place' && !selectedTableId && isUseTablesRequired && !isSaleWithoutTableAllowed && mode !== 'bar') {
      showToast({
        type: 'warning',
        title: 'Table Obligatoire',
        message: 'La vente sans table est désactivée. Veuillez d\'abord sélectionner une table.',
      });
      return;
    }

    const userRole = currentUser?.role || 'serveur';
    const userLimits = roleLimits?.[userRole];
    if (product.price <= 0) {
      if (userLimits?.requiresApprovalForNegativePrice && userRole !== 'direction' && userRole !== 'manager') {
        showToast({
          type: 'error',
          title: 'Approbation Requise',
          message: 'L\'ajout d\'un article à prix nul ou négatif requiert l\'accord d\'un responsable.',
        });
        return;
      }
      if (!isZeroPriceAllowed) {
        showToast({
          type: 'error',
          title: 'Prix zéro interdit',
          message: 'La configuration interdit la vente d\'articles gratuits (0 FCFA).',
        });
        return;
      }
    }

    setCart((prev) => {
      const existing = prev.find(
        (item) => item.productId === product.id && !item.notes && (item.seatNumber ?? 1) === activeSeatNumber
      );
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity: 1,
          destination: product.destination,
          status: 'en_attente',
          folio: 1,
          seatNumber: activeSeatNumber,
          seatLabel: activeSeatNumber === 0 ? 'Partagé / Table' : `Couvert ${activeSeatNumber}`,
        },
      ];
    });

    playAudioChime('success');
  };

  const reassignItemSeat = (itemId: string, newSeat: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              seatNumber: newSeat,
              seatLabel: newSeat === 0 ? 'Partagé / Table' : `Couvert ${newSeat}`,
            }
          : item
      )
    );
  };

  const handleAddSeat = async () => {
    const next = totalSeats + 1;
    setTotalSeats(next);
    setActiveSeatNumber(next);
    if (selectedTableId && orderType === 'sur_place') {
      await updateTableGuestsCount(selectedTableId, next);
    }
    showToast({
      type: 'info',
      title: 'Couvert ajouté',
      message: `Couvert ${next} ajouté pour cette table.`,
    });
  };

  const handleUpdateTotalSeats = async (delta: number) => {
    const next = Math.max(1, totalSeats + delta);
    setTotalSeats(next);
    if (activeSeatNumber > next) {
      setActiveSeatNumber(next);
    }
    if (selectedTableId && orderType === 'sur_place') {
      await updateTableGuestsCount(selectedTableId, next);
    }
  };

  const toggleItemFolio = (itemId: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, folio: (item.folio || 1) === 1 ? 2 : 1 }
          : item
      )
    );
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const setExactQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity: qty } : item))
    );
    setActiveNumpadItemId(null);
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, notes } : item))
    );
  };

  const setItemCourseTiming = (itemId: string, timing: 'entree' | 'plat' | 'dessert' | 'direct') => {
    setCart((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, courseTiming: timing } : item))
    );
  };

  const toggleModifierTag = (itemId: string, tag: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const currentNotes = (item.notes || '').split(',').map((s) => s.trim()).filter(Boolean);
        const exists = currentNotes.includes(tag);
        const newNotes = exists
          ? currentNotes.filter((t) => t !== tag)
          : [...currentNotes, tag];
        return { ...item, notes: newNotes.join(', ') };
      })
    );
  };

  const removeFromCart = (itemId: string) => {
    const isManagerOrAdmin = currentUser?.role === 'manager' || currentUser?.role === 'direction';
    if (!isDeleteLineAllowed && !isManagerOrAdmin) {
      showToast({
        type: 'error',
        title: 'Action Restreinte',
        message: 'La suppression de ligne est désactivée pour votre profil serveur.',
      });
      return;
    }
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleApplyDiscount = (pct: number) => {
    if (pct > 0) {
      if (!isDiscountsAllowed && currentUser?.role !== 'direction') {
        showToast({
          type: 'error',
          title: 'Remises Désactivées',
          message: 'Les remises commerciales sont désactivées sur ce point de vente.',
        });
        return;
      }

      const userRole = currentUser?.role || 'serveur';
      const userLimits = roleLimits?.[userRole];
      const maxDiscount = userLimits?.maxDiscountPercent ?? (userRole === 'direction' ? 100 : 0);
      const requiresApproval = userLimits?.requiresApprovalForDiscount ?? isDiscountApprovalRequired;

      if (pct > maxDiscount && userRole !== 'direction') {
        showToast({
          type: 'error',
          title: 'Plafond Dépassé',
          message: `Une remise de ${pct}% dépasse la limite autorisée pour votre rôle (${maxDiscount}%). Approbation superviseur requise.`,
        });
        return;
      }

      if (requiresApproval && userRole !== 'direction' && userRole !== 'manager') {
        showToast({
          type: 'warning',
          title: 'Approbation Requise',
          message: 'L\'application d\'une remise exige la validation d\'un manager ou directeur.',
        });
        return;
      }
    }
    setDiscountPercent(pct);
  };

  const handleCancelCartClick = () => {
    if (cart.length === 0) return;
    const userRole = currentUser?.role || 'serveur';
    const userLimits = roleLimits?.[userRole];
    const requiresCancelApproval = userLimits?.requiresApprovalForCancel ?? !isCancelOrderAllowed;

    if (requiresCancelApproval && userRole !== 'direction' && userRole !== 'manager') {
      showToast({
        type: 'error',
        title: 'Approbation Requise',
        message: 'L\'annulation de commande nécessite l\'approbation d\'un superviseur.',
      });
      return;
    }

    if (isCancelReasonRequired) {
      setShowCancelReasonModal(true);
    } else {
      executeClearCart('Annulation directe');
    }
  };

  const executeClearCart = (reason: string) => {
    addAuditLog('Annulation commande POS', 'POS', `Panier annulé par ${currentUser?.name}. Motif: ${reason}`);
    setCart([]);
    setOrderNotes('');
    setDiscountPercent(0);
    setShowCancelReasonModal(false);
    showToast({
      type: 'info',
      title: 'Commande Annulée',
      message: `Panier vidé. Motif consigné : ${reason}`,
    });
  };

  // Calculations
  const rawSubtotal = Math.round(cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));
  const discountAmount = Math.round((rawSubtotal * discountPercent) / 100);
  const subtotalAfterDiscount = Math.max(0, rawSubtotal - discountAmount);
  const vatResult = calculateCameroonVatFromHt(
    subtotalAfterDiscount,
    settings.baseVatRate || 17.5,
    10,
    !settings.assujettiTVA
  );
  const taxAmount = vatResult.totalTax;
  const grandTotal = vatResult.totalTTC;

  // Selected table object
  const currentTable = tables.find((t) => t.id === selectedTableId);
  const currentCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Group cart items by seatNumber
  const distinctSeats = useMemo(() => {
    const seatsInCart = new Set(cart.map((i) => i.seatNumber ?? 1));
    seatsInCart.add(activeSeatNumber);
    const arr = Array.from(seatsInCart);
    return arr.sort((a, b) => {
      if (a === 0) return 1;
      if (b === 0) return -1;
      return a - b;
    });
  }, [cart, activeSeatNumber]);

  // Submit order to Kitchen / Bar
  const handleSendOrder = async (payDirectly = false) => {
    if (isCaisseMandatoryOpen && (!cashSession || cashSession.status !== 'ouverte')) {
      showToast({
        type: 'warning',
        title: 'Session Caisse Requise',
        message: 'La caisse du jour doit être ouverte avec fond de caisse avant de saisir des commandes.',
      });
      return;
    }

    if (cart.length === 0) {
      showToast({
        type: 'warning',
        title: 'Panier vide',
        message: 'Veuillez ajouter au moins un produit pour valider la commande.',
      });
      return;
    }

    if (orderType === 'sur_place' && !selectedTableId && isUseTablesRequired && !isSaleWithoutTableAllowed) {
      showToast({
        type: 'error',
        title: 'Table obligatoire',
        message: 'La vente sans table est désactivée. Veuillez choisir une table.',
      });
      return;
    }

    if (orderType === 'sur_place' && isTablesEnabled && !selectedTableId) {
      showToast({
        type: 'error',
        title: 'Table obligatoire',
        message: 'Veuillez sélectionner une table pour une commande sur place.',
      });
      return;
    }

    const hasZeroPriceItem = cart.some((i) => i.unitPrice <= 0);
    if (hasZeroPriceItem && !isZeroPriceAllowed) {
      showToast({
        type: 'error',
        title: 'Article à 0 FCFA Interdit',
        message: 'Votre panier contient un article à 0 FCFA, interdit par les règles opérationnelles.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let finalOrder: Order;

      if (orderType === 'sur_place' && existingTableOrder) {
        if (!isEditOrderAllowed) {
          showToast({
            type: 'error',
            title: 'Modification de commande désactivée',
            message: 'La règle pos_edit_order interdit l\'ajout d\'articles ou la modification d\'une commande déjà transmise.',
          });
          setIsSubmitting(false);
          return;
        }

        // Ajouter les nouveaux articles à la commande déjà active sur la table (synchronisé tablette & caisse)
        finalOrder = await addItemsToOrder(existingTableOrder.id, cart, totalSeats);

        // Auto-print kitchen & bar tickets pour les nouveaux articles
        if (printerSettings?.autoPrintKitchenOnOrder) {
          const kitchenItems = cart.filter((i) => i.destination === 'cuisine');
          const barItems = cart.filter((i) => i.destination === 'bar');

          const kitchenPrinter = peripherals.find(
            (p) => p.active && (p.role === 'cuisine' || p.type === 'imprimante_cuisine')
          );
          const barPrinter = peripherals.find(
            (p) => p.active && (p.role === 'bar' || p.type === 'imprimante_bar')
          );

          if (kitchenItems.length > 0) {
            printerService
              .printKitchenOrder(finalOrder, 'cuisine', kitchenItems, kitchenPrinter)
              .catch((err) => {
                console.error('[POS] Échec impression bon cuisine:', err);
                showToast({
                  type: 'warning',
                  title: 'Impression cuisine',
                  message: 'Le bon de commande n\'a pas pu être imprimé en cuisine.',
                });
              });
          }
          if (barItems.length > 0) {
            printerService
              .printKitchenOrder(finalOrder, 'bar', barItems, barPrinter || kitchenPrinter)
              .catch((err) => {
                console.error('[POS] Échec impression bon bar:', err);
                showToast({
                  type: 'warning',
                  title: 'Impression bar',
                  message: 'Le bon de commande n\'a pas pu être imprimé au bar.',
                });
              });
          }
        }

        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });

        showToast({
          type: 'success',
          title: 'Articles ajoutés à la table',
          message: `${cart.length} plat(s) ajouté(s) au Bon ${finalOrder.orderNumber} et transmis en cuisine/bar.`,
        });
      } else {
        finalOrder = await createOrder({
          type: orderType,
          tableId: orderType === 'sur_place' ? selectedTableId : undefined,
          tableName: orderType === 'sur_place' && currentTable ? currentTable.number : undefined,
          customerId: selectedCustomerId || undefined,
          customerName: currentCustomer ? currentCustomer.name : undefined,
          guestCount: totalSeats,
          items: cart,
          subtotal: subtotalAfterDiscount,
          tax: taxAmount,
          discount: discountAmount,
          total: grandTotal,
          notes: orderNotes,
          isProforma,
          companyBillingName: companyBillingName || undefined,
          companyBillingNiu: companyBillingNiu || undefined,
          status: isCuisineAutoSend ? 'envoye' : 'nouveau',
        });

        // Auto-print kitchen & bar tickets to hardware peripherals if enabled
        if (printerSettings?.autoPrintKitchenOnOrder) {
          const kitchenItems = finalOrder.items.filter((i: OrderItem) => i.destination === 'cuisine');
          const barItems = finalOrder.items.filter((i: OrderItem) => i.destination === 'bar');

          const kitchenPrinter = peripherals.find(
            (p) => p.active && (p.role === 'cuisine' || p.type === 'imprimante_cuisine')
          );
          const barPrinter = peripherals.find(
            (p) => p.active && (p.role === 'bar' || p.type === 'imprimante_bar')
          );

          if (kitchenItems.length > 0) {
            printerService
              .printKitchenOrder(finalOrder, 'cuisine', kitchenItems, kitchenPrinter)
              .catch((err) => {
                console.error('[POS] Échec impression bon cuisine:', err);
                showToast({
                  type: 'warning',
                  title: 'Impression cuisine',
                  message: 'Le bon de commande n\'a pas pu être imprimé en cuisine.',
                });
              });
          }
          if (barItems.length > 0) {
            printerService
              .printKitchenOrder(finalOrder, 'bar', barItems, barPrinter || kitchenPrinter)
              .catch((err) => {
                console.error('[POS] Échec impression bon bar:', err);
                showToast({
                  type: 'warning',
                  title: 'Impression bar',
                  message: 'Le bon de commande n\'a pas pu être imprimé au bar.',
                });
              });
          }
        }

        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });

        showToast({
          type: 'success',
          title: 'Commande envoyée avec succès',
          message: `Bon ${finalOrder.orderNumber} transmis à la cuisine et au bar.`,
        });
      }

      // Play kitchen bell sound
      playAudioChime('kitchen');

      // Clear cart
      setCart([]);
      setOrderNotes('');
      setDiscountPercent(0);

      if (payDirectly) {
        onOpenPayment(finalOrder.id);
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Erreur d’enregistrement',
        message: 'Impossible de transmettre la commande. Veuillez réessayer.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeModifierItem = cart.find((i) => i.id === activeModifierItemId);
  const activeNumpadItem = cart.find((i) => i.id === activeNumpadItemId);

  return (
    <div className="space-y-6 pb-12">
      {/* En-tête standardisé de la vue */}
      <PageHeader
        icon={mode === 'bar' ? <Wine className="w-5 h-5 text-emerald-400" /> : <ShoppingBag className="w-5 h-5 text-amber-400" />}
        title={mode === 'bar' ? 'Poste Bar & Comptoir' : 'Prise de Commande & POS'}
        subtitle={
          mode === 'bar'
            ? 'Cocktails signature, vins & boissons • Vente express au comptoir et débit direct'
            : 'Saisie rapide des commandes, envoi direct en cuisine/bar et encaissement'
        }
        badge={
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              En direct
            </span>
            {currentTable && orderType === 'sur_place' && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-200">
                Table {currentTable.number} {currentTable.name ? `• ${currentTable.name}` : ''}
              </span>
            )}
            {orderType === 'a_emporter' && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 font-bold border border-blue-200">
                À Emporter
              </span>
            )}
            {orderType === 'livraison' && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-900 font-bold border border-purple-200">
                Livraison
              </span>
            )}
            {cashSession && cashSession.status === 'ouverte' ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200 hidden sm:inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Caisse Active
              </span>
            ) : null}
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {mode === 'bar' && (
              <button
                type="button"
                onClick={() => {
                  setNewDrinkName('');
                  setNewDrinkPrice(2500);
                  setNewDrinkCost(1000);
                  setIsNewDrinkCategoryMode(availableCategories.length === 0);
                  setNewDrinkCategoryCustomName('');
                  setNewDrinkCategory(availableCategories[0]?.id || categories[0]?.id || '');
                  setShowAddDrinkModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Ajouter Boisson</span>
              </button>
            )}
            {cart.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-900 border border-amber-300">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                <span>{cart.reduce((sum, item) => sum + item.quantity, 0)} article(s) au panier</span>
              </div>
            )}
          </div>
        }
      />

      {/* Session Caisse Requise Alert Banner */}
      {isCaisseMandatoryOpen && (!cashSession || cashSession.status !== 'ouverte') && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-900 text-xs font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Caisse non ouverte :</strong> Aucune session de caisse n'est active aujourd'hui. Veuillez ouvrir la caisse avec fond de caisse avant d'enregistrer des ventes.
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-200/80 rounded text-amber-950 shrink-0 ml-2">
            Règle Caisse Active
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 7-8 Columns: Menu & Products */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-4">
        {/* Top Control Bar: Search & Order Type */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher un plat, boisson..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white"
            />
          </div>

          {/* Order Type Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold w-full sm:w-auto justify-center">
            <button
              onClick={() => setOrderType('sur_place')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                orderType === 'sur_place'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sur place
            </button>
            {isTakeawayEnabled && (
              <button
                onClick={() => setOrderType('a_emporter')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  orderType === 'a_emporter'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                À emporter
              </button>
            )}
            {isDeliveryEnabled && (
              <button
                onClick={() => setOrderType('livraison')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  orderType === 'livraison'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Livraison
              </button>
            )}
          </div>
        </div>

        {/* Popular / Best Sellers Strip (dérivé des commandes réelles) */}
        {popularProducts.length > 0 && selectedCategory === 'all' && !searchQuery && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Plus Vendus & Favoris</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {popularProducts.map((p) => {
                const inCart = cart.find((i) => i.productId === p.id);
                return (
                  <button
                    key={`pop-${p.id}`}
                    type="button"
                    onClick={() => p.available && addToCart(p)}
                    className="p-2.5 rounded-xl bg-gradient-to-br from-amber-50/80 to-amber-100/40 border border-amber-200/80 hover:border-amber-400 flex items-center gap-2.5 text-left transition-all active:scale-98 shadow-xs cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center relative">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Utensils className="w-5 h-5 text-slate-400" />
                      )}
                      {inCart && (
                        <span className="absolute top-0 right-0 w-4.5 h-4.5 bg-amber-600 text-white rounded-bl-lg font-black text-[10px] flex items-center justify-center">
                          {inCart.quantity}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate">{p.name}</div>
                      <div className="text-xs font-black text-amber-900 tabular-nums mt-0.5">
                        {formatCurrency(p.price, settings.currency)}
                        <span className="text-[9px] font-bold text-slate-400 ml-1">{settings.priceDisplayMode || 'TTC'}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Categories Bar */}
        <div className="w-full min-w-0 overflow-x-auto pb-1 custom-scrollbar">
          <div className="flex items-center gap-2 w-max">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-slate-950 border border-amber-400 shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {mode === 'bar' ? 'Toutes les Boissons' : 'Tous les articles'}
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-slate-950 border border-amber-400 shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredProducts.map((product) => {
            const inCart = cart.find((i) => i.productId === product.id);

            return (
              <div
                key={product.id}
                onClick={() => product.available && addToCart(product)}
                className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between shadow-xs ${
                  product.available
                    ? 'border-slate-200 hover:border-amber-400 hover:shadow-md cursor-pointer active:scale-98'
                    : 'border-slate-200 opacity-60 cursor-not-allowed bg-slate-50'
                } ${inCart ? 'ring-2 ring-amber-500 border-amber-500' : ''}`}
              >
                {/* Product Image */}
                <div className="h-32 sm:h-36 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <Utensils className="w-10 h-10 mb-1" />
                    </div>
                  )}
                  <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900/80 text-white backdrop-blur-xs">
                    {product.destination === 'cuisine' ? 'Cuisine' : 'Bar'}
                  </span>
                  {inCart && (
                    <span className="absolute top-2 right-2 min-w-[26px] h-6.5 px-1.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md animate-scale-in">
                      {inCart.quantity}
                    </span>
                  )}
                  {!product.available && (
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-xs font-bold uppercase tracking-wider">
                      Épuisé
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{product.name}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{product.description}</p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm sm:text-base font-black text-slate-900 tabular-nums">
                      {formatCurrency(product.price, settings.currency)}
                      <span className="text-[10px] font-bold text-slate-400 ml-1">{settings.priceDisplayMode || 'TTC'}</span>
                    </span>
                    <button
                      disabled={!product.available}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 flex items-center justify-center transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Ajouter ${product.name} au panier`}
                    >
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right 4-5 Columns: POS Order Cart & Checkout (Drawer sur mobile, colonne fixe sur desktop) */}
      <div
        className={`
          ${isMobileCartOpen ? 'fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/70 backdrop-blur-xs p-2 sm:p-4' : 'hidden lg:block'}
          lg:static lg:z-auto lg:p-0 lg:bg-transparent lg:backdrop-blur-none lg:col-span-5 xl:col-span-4
        `}
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl lg:shadow-xs flex flex-col h-full max-h-[88vh] lg:max-h-none overflow-hidden sticky top-20">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 rounded-t-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-600" />
                <span>Commande en cours</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium tabular-nums">
                  {cart.reduce((s, i) => s + i.quantity, 0)} articles
                </span>
                {cart.length > 0 && (
                  <button
                    onClick={handleCancelCartClick}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 transition-colors cursor-pointer"
                    title="Vider le panier / Annuler la commande"
                  >
                    Vider
                  </button>
                )}
                {/* Bouton fermeture sur mobile */}
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(false)}
                  className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                  aria-label="Fermer le panier mobile"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Table & Customer Assignment Selectors */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Table Selector */}
              {orderType === 'sur_place' && isTablesEnabled && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">
                    Table {!isSaleWithoutTableAllowed && <span className="text-rose-500 font-bold">* Obligatoire</span>}
                  </label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800"
                  >
                    <option value="">Sélectionner table</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.number} ({t.zone}) - {t.status}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Customer Selector */}
              <div className={`space-y-1 ${orderType !== 'sur_place' || !isTablesEnabled ? 'col-span-2' : ''}`}>
                <label className="text-[10px] font-bold uppercase text-slate-400">Client / Compte</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800"
                >
                  <option value="">Client de passage (Anonyme)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.loyaltyPoints} pts)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Couvert / Seat Selector Strip */}
            <div className="pt-2 border-t border-slate-200/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Users className="w-3 h-3 text-amber-600" />
                  <span>Saisie par Couvert ({totalSeats} pers.)</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center border border-slate-200 rounded-md overflow-hidden bg-white shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleUpdateTotalSeats(-1)}
                      disabled={totalSeats <= 1}
                      className="px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                      title="Diminuer couverts"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="px-1.5 text-[10px] font-black text-slate-700">{totalSeats}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateTotalSeats(1)}
                      className="px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 transition-colors"
                      title="Augmenter couverts"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSeat}
                    className="text-[10px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-0.5 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Ajouter</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveSeatNumber(0)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeSeatNumber === 0
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Partagé / Table
                </button>
                {Array.from({ length: totalSeats }, (_, i) => i + 1).map((seat) => {
                  const itemsForSeat = cart.filter((i) => (i.seatNumber ?? 1) === seat);
                  return (
                    <button
                      key={seat}
                      type="button"
                      onClick={() => setActiveSeatNumber(seat)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                        activeSeatNumber === seat
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>Couvert {seat}</span>
                      {itemsForSeat.length > 0 && (
                        <span
                          className={`text-[10px] px-1 py-0.2 rounded-full font-bold ${
                            activeSeatNumber === seat
                              ? 'bg-amber-800 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {itemsForSeat.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cart Items Scrollable List (Grouped by Couvert) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[220px] max-h-[380px]">
            {/* Déjà commandé sur la table (Synchronisé Tablette & POS en direct) */}
            {existingTableOrder && existingTableOrder.items.length > 0 && (
              <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950 border-b border-emerald-200/80 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Commande active (Bon #{existingTableOrder.orderNumber})</span>
                  </div>
                  <span className="font-black text-emerald-700">
                    {formatCurrency(existingTableOrder.total, settings.currency)}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                  {existingTableOrder.items.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between text-[11px] text-slate-700 bg-white/90 px-2.5 py-1 rounded-lg border border-emerald-100/90"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-slate-900">{it.quantity}x</span>
                        <span className="truncate">{it.productName}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 shrink-0">
                          {it.seatNumber === 0 ? 'Table' : `C${it.seatNumber ?? 1}`}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                            it.status === 'servi'
                              ? 'bg-emerald-100 text-emerald-800'
                              : it.status === 'pret'
                              ? 'bg-blue-100 text-blue-800'
                              : it.status === 'en_preparation'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {it.status === 'servi'
                            ? 'Servi'
                            : it.status === 'pret'
                            ? 'Prêt'
                            : it.status === 'en_preparation'
                            ? 'En Cuisine'
                            : 'En attente'}
                        </span>
                      </div>
                      <span className="font-semibold text-slate-800 shrink-0 ml-1">
                        {formatCurrency(it.unitPrice * it.quantity, settings.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cart.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                {existingTableOrder ? (
                  <span>
                    La table a déjà une commande en cours.<br />
                    Sélectionnez d'autres articles pour ajouter au Couvert {activeSeatNumber === 0 ? 'Partagé' : activeSeatNumber}.
                  </span>
                ) : (
                  <span>
                    Votre panier est vide.<br />
                    Cliquez sur les articles pour les ajouter au Couvert {activeSeatNumber === 0 ? 'Partagé' : activeSeatNumber}.
                  </span>
                )}
              </div>
            ) : (
              distinctSeats.map((seatNum: number) => {
                const seatItems = cart.filter((i) => (i.seatNumber ?? 1) === seatNum);
                if (seatItems.length === 0 && seatNum !== activeSeatNumber) return null;
                const seatTotal = seatItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

                return (
                  <div key={seatNum} className="space-y-2 pt-2 first:pt-0">
                    <div
                      className={`px-3 py-1.5 rounded-xl flex items-center justify-between text-xs font-bold border transition-all cursor-pointer ${
                        seatNum === activeSeatNumber
                          ? 'bg-amber-100 text-amber-950 border-amber-300 shadow-2xs'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                      onClick={() => setActiveSeatNumber(seatNum)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            seatNum === activeSeatNumber ? 'bg-amber-600 animate-pulse' : 'bg-slate-400'
                          }`}
                        ></span>
                        <span>{seatNum === 0 ? 'Articles Partagés (Table)' : `Couvert ${seatNum}`}</span>
                        <span className="text-[10px] font-normal text-slate-500">
                          ({seatItems.length} {seatItems.length > 1 ? 'articles' : 'article'})
                        </span>
                        {seatNum === activeSeatNumber && (
                          <span className="text-[9px] bg-amber-600 text-white px-1.5 py-0.2 rounded font-black uppercase tracking-wider">
                            Actif
                          </span>
                        )}
                      </div>
                      <span className="font-black text-slate-900">
                        {formatCurrency(seatTotal, settings.currency)}
                      </span>
                    </div>

                    {seatItems.length === 0 ? (
                      <div className="px-3 py-2 text-[11px] text-amber-800 bg-amber-50/60 border border-dashed border-amber-200 rounded-xl italic">
                        Couvert actif : les prochains plats sélectionnés seront assignés à ce couvert.
                      </div>
                    ) : (
                      seatItems.map((item) => (
                        <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                                <span>{item.productName}</span>
                                <span className="text-[9px] uppercase font-bold px-1 py-0.2 rounded bg-slate-200 text-slate-600">
                                  {item.destination}
                                </span>
                                {item.courseTiming && item.courseTiming !== 'direct' && (
                                  <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                    {item.courseTiming === 'entree' ? 'Entrée' : item.courseTiming === 'plat' ? 'Plat' : 'Dessert'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {formatCurrency(item.unitPrice, settings.currency)} / unité
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Qty Stepper & Numpad trigger */}
                              <div className="flex items-center gap-1 bg-white rounded-xl p-0.5 border border-slate-200 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, -1)}
                                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                  aria-label={`Diminuer la quantité de ${item.productName}`}
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveNumpadItemId(item.id)}
                                  className="min-w-[36px] h-9 sm:h-10 text-center font-black text-sm text-slate-900 hover:bg-slate-50 rounded-lg tabular-nums cursor-pointer"
                                  title="Modifier la quantité directement"
                                  aria-label={`Quantité: ${item.quantity}. Cliquer pour ouvrir le pavé numérique`}
                                >
                                  {item.quantity}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                  aria-label={`Augmenter la quantité de ${item.productName}`}
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Total line */}
                              <span className="text-sm font-black text-slate-900 min-w-[75px] text-right tabular-nums">
                                {formatCurrency(item.unitPrice * item.quantity, settings.currency)}
                              </span>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.id)}
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                aria-label={`Supprimer ${item.productName} du panier`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Modifiers, Notes & Seat Switcher */}
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/40">
                            {/* Reassign Couvert Select */}
                            <select
                              value={item.seatNumber ?? 1}
                              onChange={(e) => reassignItemSeat(item.id, Number(e.target.value))}
                              className="text-xs font-bold px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 cursor-pointer"
                              title="Déplacer vers un autre couvert"
                            >
                              <option value={0}>Table</option>
                              {Array.from({ length: totalSeats }, (_, i) => i + 1).map((s) => (
                                <option key={s} value={s}>C{s}</option>
                              ))}
                            </select>

                            <input
                              type="text"
                              placeholder="Instructions (cuisson, sauce...)"
                              value={item.notes || ''}
                              onChange={(e) => updateItemNotes(item.id, e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200 text-slate-700 placeholder-slate-400"
                            />

                            {/* Quick Modifiers Popover Button */}
                            <button
                              type="button"
                              onClick={() => setActiveModifierItemId(item.id)}
                              className={`flex items-center gap-1 min-h-[34px] px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors shrink-0 cursor-pointer ${
                                item.notes
                                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                              title="Options rapides : Cuisson, garniture, sauce"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                              <span>Options</span>
                            </button>

                            {/* Folio Toggle */}
                            <button
                              type="button"
                              onClick={() => toggleItemFolio(item.id)}
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all shrink-0 ${
                                (item.folio || 1) === 1
                                  ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                  : 'bg-amber-100 text-amber-800 border-amber-200'
                              }`}
                              title="Folio 1 (Société) vs Folio 2 (Extra personnel)"
                            >
                              {(item.folio || 1) === 1 ? 'Folio 1' : 'Folio 2'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Footer & Financial Summary */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/80 rounded-b-2xl space-y-3">
            {/* Proforma & Company Billing */}
            <div className="space-y-2 pt-1 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isProforma}
                    onChange={(e) => setIsProforma(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Facture Proforma (Devis)</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Raison Sociale Société"
                  value={companyBillingName}
                  onChange={(e) => setCompanyBillingName(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] rounded-lg bg-white border border-slate-200"
                />
                <input
                  type="text"
                  placeholder="NIU Entreprise (M01...)"
                  value={companyBillingNiu}
                  onChange={(e) => setCompanyBillingNiu(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] rounded-lg bg-white border border-slate-200 font-mono"
                />
              </div>
            </div>

            {/* General Order Notes */}
            <input
              type="text"
              placeholder="Note générale de la commande..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200"
            />

            {/* Price Calculations */}
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Sous-total HT</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(rawSubtotal, settings.currency)}
                </span>
              </div>

              {/* Discount Selector */}
              {isDiscountsAllowed && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3 text-amber-500" />
                    Remise {isDiscountApprovalRequired && <span className="text-[9px] text-amber-600 font-semibold">(Approbation)</span>}
                  </span>
                  <div className="flex items-center gap-1">
                    {[0, 5, 10, 15].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => handleApplyDiscount(pct)}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          discountPercent === pct
                            ? 'bg-amber-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        {pct === 0 ? '0%' : `-${pct}%`}
                      </button>
                    ))}
                    {discountPercent > 0 && (
                      <span className="text-rose-600 font-bold ml-1">
                        -{formatCurrency(discountAmount, settings.currency)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {settings.taxRate > 0 && (
                <>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>TVA Cameroun (17,50%)</span>
                    <span>{formatCurrency(Math.round((subtotalAfterDiscount * 17.5) / 100), settings.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>CAC (10% de TVA = 1,75%)</span>
                    <span>{formatCurrency(taxAmount - Math.round((subtotalAfterDiscount * 17.5) / 100), settings.currency)}</span>
                  </div>
                </>
              )}

              {existingTableOrder && (
                <div className="pt-2 border-t border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Nouveaux ajouts panier :</span>
                    <span className="font-semibold text-slate-700">
                      {formatCurrency(grandTotal, settings.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Déjà commandé sur la table :</span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(existingTableOrder.total, settings.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-black text-slate-900 pt-1">
                    <span>Total cumulé table :</span>
                    <span className="text-emerald-700">
                      {formatCurrency(existingTableOrder.total + grandTotal, settings.currency)}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-base font-black text-slate-900">
                <span>Total à régler ({settings.taxRate}%)</span>
                <span className="text-amber-700">
                  {formatCurrency(
                    existingTableOrder ? existingTableOrder.total + grandTotal : grandTotal,
                    settings.currency
                  )}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {cart.length === 0 && existingTableOrder ? (
              <div className="pt-1">
                <button
                  disabled={isSubmitting}
                  onClick={() => onOpenPayment(existingTableOrder.id)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs active:scale-98"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Encaisser Table {currentTable?.number || ''} ({formatCurrency(existingTableOrder.total, settings.currency)})</span>
                </button>
              </div>
            ) : (
              <div className={`grid ${isQuickOrdersAllowed ? 'grid-cols-2' : 'grid-cols-1'} gap-2 pt-1`}>
                <button
                  disabled={isSubmitting || cart.length === 0}
                  onClick={() => handleSendOrder(false)}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs active:scale-98"
                >
                  <Send className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {existingTableOrder ? 'Envoyer ajouts' : 'Envoyer Cuisine'}
                  </span>
                </button>

                {isQuickOrdersAllowed && (
                  <button
                    disabled={isSubmitting || cart.length === 0}
                    onClick={() => handleSendOrder(true)}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs active:scale-98"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Encaisser Direct</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QUICK MODIFIERS POPUP MODAL */}
      {activeModifierItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Options & Instructions : {activeModifierItem.productName}
                </h3>
                <p className="text-[11px] text-slate-500">Sélectionnez les modificateurs rapides</p>
              </div>
              <button
                onClick={() => setActiveModifierItemId(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Rythme de Service (Tempo KDS) */}
              <div className="space-y-1.5 pb-3 border-b border-slate-100">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Rythme de Service (Cuisine / Bar) :
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: 'entree', label: 'Entrée', icon: Salad },
                      { id: 'plat', label: 'Plat', icon: ChefHat },
                      { id: 'dessert', label: 'Dessert', icon: Cake },
                      { id: 'direct', label: 'Direct', icon: Zap },
                    ] as const
                  ).map((timing) => {
                    const isSelected = (activeModifierItem.courseTiming || 'direct') === timing.id;
                    const TimingIcon = timing.icon;
                    return (
                      <button
                        key={timing.id}
                        type="button"
                        onClick={() => setItemCourseTiming(activeModifierItem.id, timing.id)}
                        className={`text-xs font-bold py-1.5 px-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <TimingIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{timing.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cuisson */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cuisson :</div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_MODIFIERS.cuissons.map((c) => {
                    const active = (activeModifierItem.notes || '').includes(c);
                    return (
                      <button
                        key={c}
                        onClick={() => toggleModifierTag(activeModifierItem.id, c)}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
                          active
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Garnitures */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Accompagnement :</div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_MODIFIERS.garnitures.map((g) => {
                    const active = (activeModifierItem.notes || '').includes(g);
                    return (
                      <button
                        key={g}
                        onClick={() => toggleModifierTag(activeModifierItem.id, g)}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
                          active
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sauces & Piment */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sauce & Assaisonnement :</div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_MODIFIERS.sauces.map((s) => {
                    const active = (activeModifierItem.notes || '').includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleModifierTag(activeModifierItem.id, s)}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
                          active
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Régimes & Spécial */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Allergies & Spécificités :</div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_MODIFIERS.regimes.map((r) => {
                    const active = (activeModifierItem.notes || '').includes(r);
                    return (
                      <button
                        key={r}
                        onClick={() => toggleModifierTag(activeModifierItem.id, r)}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
                          active
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom manual note */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <div className="text-[11px] font-bold text-slate-500">Instruction personnalisée :</div>
                <input
                  type="text"
                  placeholder="Ex: Servir en premier, sauce à part..."
                  value={activeModifierItem.notes || ''}
                  onChange={(e) => updateItemNotes(activeModifierItem.id, e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setActiveModifierItemId(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Valider les options
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK QUANTITY NUMPAD MODAL */}
      {activeNumpadItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="text-xs font-bold text-slate-900 truncate">
                Quantité : {activeNumpadItem.productName}
              </div>
              <button
                onClick={() => setActiveNumpadItemId(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="text-center text-3xl font-black text-amber-600 bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                {activeNumpadItem.quantity}
              </div>

              {/* Direct preset buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24].map((n) => (
                  <button
                    key={n}
                    onClick={() => setExactQuantity(activeNumpadItem.id, n)}
                    className={`py-2 text-xs font-black rounded-xl border transition-all ${
                      activeNumpadItem.quantity === n
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setActiveNumpadItemId(null)}
                className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Terminé
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL REASON POPUP MODAL */}
      {showCancelReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Motif d'Annulation Requis</span>
              </div>
              <button
                onClick={() => setShowCancelReasonModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              La règle opérationnelle de caisse exige de renseigner un motif pour tracer l'annulation dans le journal d'audit.
            </p>

            <div className="space-y-1.5">
              {['Erreur de saisie', 'Client parti sans consommer', 'Plat indisponible / Rupture', 'Changement d\'avis', 'Autre motif'].map(
                (reason) => (
                  <label
                    key={reason}
                    onClick={() => setSelectedCancelReason(reason)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                      selectedCancelReason === reason
                        ? 'border-rose-400 bg-rose-50/50 text-slate-900 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel_reason"
                      checked={selectedCancelReason === reason}
                      onChange={() => setSelectedCancelReason(reason)}
                      className="text-rose-600"
                    />
                    <span>{reason}</span>
                  </label>
                )
              )}
            </div>

            {selectedCancelReason === 'Autre motif' && (
              <input
                type="text"
                placeholder="Précisez le motif..."
                value={customCancelReason}
                onChange={(e) => setCustomCancelReason(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200"
              />
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelReasonModal(false)}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={() =>
                  executeClearCart(
                    selectedCancelReason === 'Autre motif'
                      ? customCancelReason || 'Autre motif'
                      : selectedCancelReason
                  )
                }
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal d'Ajout Rapide de Boisson au Bar en cours de service */}
      {showAddDrinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-950 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                  <Wine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">+ Nouvelle Boisson / Réappro Bar</h3>
                  <p className="text-xs text-emerald-300">Ajout immédiat au catalogue du Bar</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddDrinkModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newDrinkName.trim() || newDrinkPrice <= 0) {
                  showToast('Veuillez saisir un nom et un prix de vente valide', 'warning');
                  return;
                }

                let targetCatId = newDrinkCategory;
                let targetCatName = 'Boissons & Bar';

                if (isNewDrinkCategoryMode || newDrinkCategory === '__new__' || (!newDrinkCategory && availableCategories.length === 0)) {
                  const catNameToCreate = newDrinkCategoryCustomName.trim() || 'Boissons & Bar';
                  try {
                    const created = await createCategory(catNameToCreate);
                    if (created) {
                      targetCatId = created.id;
                      targetCatName = created.name;
                    }
                  } catch (err) {
                    console.error('Erreur création catégorie boisson:', err);
                  }
                } else {
                  const targetCat = categories.find((c) => c.id === newDrinkCategory) || categories[0];
                  if (targetCat) {
                    targetCatId = targetCat.id;
                    targetCatName = targetCat.name;
                  }
                }

                await createProduct({
                  name: newDrinkName.trim(),
                  description: 'Boisson ajoutée en direct depuis l\'Espace Bar',
                  categoryId: targetCatId || 'cat-bar',
                  categoryName: targetCatName,
                  price: newDrinkPrice,
                  costPrice: newDrinkCost,
                  preparationTimeMinutes: 2,
                  available: true,
                  destination: 'bar',
                  ingredients: [],
                  taxApplicable: true,
                  mealCategory: 'bar',
                });
                showToast(`Boisson "${newDrinkName}" ajoutée avec succès au Bar !`, 'success');
                setShowAddDrinkModal(false);
                setIsNewDrinkCategoryMode(false);
                setNewDrinkCategoryCustomName('');
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nom de la boisson / cocktail *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Cocktail Mojito Passion, Bière Kadji 65cl..."
                  value={newDrinkName}
                  onChange={(e) => setNewDrinkName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-emerald-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Prix de vente ({settings.currency}) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newDrinkPrice}
                    onChange={(e) => setNewDrinkPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Coût d'achat estimé</label>
                  <input
                    type="number"
                    min={0}
                    value={newDrinkCost}
                    onChange={(e) => setNewDrinkCost(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Catégorie Bar</label>
                  <button
                    type="button"
                    onClick={() => setIsNewDrinkCategoryMode(!isNewDrinkCategoryMode)}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                  >
                    {isNewDrinkCategoryMode ? '← Choisir existante' : '+ Nouvelle catégorie'}
                  </button>
                </div>
                {isNewDrinkCategoryMode || availableCategories.length === 0 ? (
                  <input
                    type="text"
                    required
                    placeholder="ex: Bières Pression, Cocktails, Vins..."
                    value={newDrinkCategoryCustomName}
                    onChange={(e) => setNewDrinkCategoryCustomName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-emerald-500 font-bold"
                  />
                ) : (
                  <select
                    value={newDrinkCategory}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setIsNewDrinkCategoryMode(true);
                      } else {
                        setNewDrinkCategory(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-emerald-500 font-bold"
                  >
                    {availableCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    <option value="__new__">+ Nouvelle catégorie...</option>
                  </select>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDrinkModal(false)}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-black cursor-pointer"
                >
                  Enregistrer & Servir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Floating Mobile Cart Bar (visible sur mobile quand le tiroir est fermé) */}
      {!isMobileCartOpen && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 p-2.5 sm:p-3 bg-slate-900/98 backdrop-blur-md border-t border-slate-800 text-white shadow-2xl safe-area-pb">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shrink-0 shadow-xs">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-400 font-medium truncate">
                  {selectedTableId ? `Table ${tables.find((t) => t.id === selectedTableId)?.number || ''}` : 'Commande comptoir'}
                </div>
                <div className="text-sm font-black text-white tabular-nums">
                  {formatCurrency(existingTableOrder ? existingTableOrder.total + grandTotal : grandTotal, settings.currency)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Voir le Panier</span>
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
