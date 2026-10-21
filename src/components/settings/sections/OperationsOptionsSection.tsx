import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../../context/RestaurantContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import {
  ShoppingBag,
  Coins,
  Utensils,
  ChefHat,
  Wine,
  Bike,
  Calendar,
  PartyPopper,
  Brush,
  Layers,
  Save,
  CheckCircle2,
  Lock,
  Zap,
  Store,
  Edit3,
  Trash2,
  XCircle,
  FileQuestion,
  Percent,
  Shield,
  Tag,
  Gift,
  Split,
  CreditCard,
  UserCheck,
  ArrowRightLeft,
  GitMerge,
  Scissors,
  Hash,
  User,
  Clock,
  Map,
  Grid,
  Users,
  RefreshCw,
  Send,
  Flame,
  Bell,
  AlertTriangle,
  Printer,
  Monitor,
  Tags,
  UtensilsCrossed,
  GlassWater,
  BookOpen,
  ShieldCheck,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  AlertCircle,
  FileText,
  ShieldAlert,
  Key,
  Globe,
  MapPin,
  Navigation,
  FileCheck,
  Share2,
  MessageSquare,
  UserX,
  CalendarDays,
  Receipt,
  Truck,
  Building2,
  BarChart3,
  Package,
  Crown,
  Search,
} from 'lucide-react';
import { ModernRuleToggle } from './ModernRuleToggle';
import { SearchInput, StickyActionBar } from '../../ui';

interface Props {
  subTab:
    | 'pos'
    | 'tables'
    | 'cuisine'
    | 'bar'
    | 'caisse'
    | 'livraison'
    | 'reservations'
    | 'evenements';
}

const SENSITIVE_RULE_KEYS = new Set([
  'pos_force_pin_cancel',
  'pos_delete_lines',
  'pos_disallow_discounts',
  'caisse_allow_manual_float',
  'caisse_force_z_report',
  'cuisine_notify_delay',
]);

export const OperationsOptionsSection: React.FC<Props> = ({ subTab }) => {
  const { operationRules, updateOperationRules, settings, updateSettings } = useRestaurant();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const isSuperAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'direction';

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState<Record<string, boolean>>(operationRules);
  const [kitchenMode, setKitchenMode] = useState<'ecran_cuisine' | 'sans_compte'>(
    settings.kitchenOperationMode || 'ecran_cuisine'
  );

  useEffect(() => {
    setOptions(operationRules);
  }, [operationRules]);

  useEffect(() => {
    if (settings.kitchenOperationMode) {
      setKitchenMode(settings.kitchenOperationMode);
    }
  }, [settings.kitchenOperationMode]);

  const toggleOption = (key: string) => {
    if (!isSuperAdmin) {
      showToast({
        title: 'Action Restreinte',
        message: 'Seul le Super Administrateur (Direction) peut modifier les modules et règles système.',
        type: 'warning',
      });
      return;
    }
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!isSuperAdmin) {
      showToast({
        title: 'Accès Refusé',
        message: 'Droits insuffisants pour sauvegarder la configuration opérationnelle.',
        type: 'error',
      });
      return;
    }
    setIsSaving(true);
    try {
      await updateOperationRules(options);
      if (subTab === 'cuisine') {
        await updateSettings({ kitchenOperationMode: kitchenMode });
      }
      showToast({
        title: 'Configuration Enregistrée',
        message: 'Les règles opérationnelles et modules ont été mis à jour avec succès.',
        type: 'success',
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  // Calcul du nombre de modifications non enregistrées
  const dirtyCount =
    Object.keys(options).filter(
      (k) => (options[k] ?? false) !== (operationRules[k] ?? false)
    ).length +
    (subTab === 'cuisine' && kitchenMode !== (settings.kitchenOperationMode || 'ecran_cuisine')
      ? 1
      : 0);

  // Content configurations according to subTab
  const getSubTabConfig = () => {
    switch (subTab) {
      case 'pos':
        return {
          title: 'Configuration POS (Point de Vente)',
          sectionNumber: 'Section 7',
          description: 'Règles opérationnelles appliquées lors de la saisie des commandes en salle et comptoir',
          icon: ShoppingBag,
          gradient: 'from-amber-500 to-amber-600',
          items: [
            { key: 'pos_active', label: 'Activer module POS', description: 'Disponibilité générale de l’interface de prise de commande', icon: ShoppingBag },
            { key: 'pos_use_tables', label: 'Utiliser les tables', description: 'Oblige la sélection d’une table pour les commandes en salle', icon: Utensils },
            { key: 'pos_quick_orders', label: 'Commandes rapides comptoir', description: 'Encaissement direct sans attribution préalable de table', icon: Zap },
            { key: 'pos_sale_without_table', label: 'Vente sans table directe', description: 'Mode à emporter et vente minute au comptoir', icon: Store },
            { key: 'pos_edit_order', label: 'Autoriser modification commande', description: 'Possibilité d’ajuster les lignes avant envoi en cuisine', icon: Edit3 },
            { key: 'pos_delete_line', label: 'Autoriser suppression de ligne', description: 'Retrait d’un article avant validation finale', icon: Trash2 },
            { key: 'pos_cancel_order', label: 'Autoriser annulation commande', description: 'Annulation intégrale d’un bon de commande en cours', icon: XCircle },
            { key: 'pos_require_cancel_reason', label: 'Exiger motif d’annulation', description: 'Saisie obligatoire d’une justification pour la traçabilité', icon: FileQuestion },
            { key: 'pos_allow_discount', label: 'Autoriser remise commerciale', description: 'Application d’un pourcentage ou montant de remise', icon: Percent },
            { key: 'pos_require_discount_approval', label: 'Exiger approbation remise (Manager)', description: 'Validation superviseur requise pour valider la réduction', icon: Shield },
            { key: 'pos_custom_price', label: 'Autoriser prix personnalisé', description: 'Saisie manuelle libre du prix unitaire au moment de la vente', icon: Tag },
            { key: 'pos_zero_price', label: 'Autoriser prix zéro (0 FCFA)', description: 'Permet la validation d’articles sans tarification', icon: Coins },
            { key: 'pos_item_comp', label: 'Autoriser article offert (Gratuité)', description: 'Passage d’un article en geste commercial offert', icon: Gift },
            { key: 'pos_split_bill', label: 'Autoriser fractionnement addition', description: 'Séparation de la facture par convive ou par article', icon: Split },
            { key: 'pos_partial_payment', label: 'Autoriser paiement partiel', description: 'Règlement fractionné sur plusieurs moyens de paiement', icon: CreditCard },
            { key: 'pos_change_server', label: 'Autoriser changement de serveur', description: 'Réassignation du bon à un autre serveur en salle', icon: UserCheck },
            { key: 'pos_table_transfer', label: 'Autoriser transfert de table', description: 'Déplacement d’une commande vers une autre table libre', icon: ArrowRightLeft },
            { key: 'pos_table_merge', label: 'Autoriser fusion de tables', description: 'Regroupement de deux commandes sur une même table', icon: GitMerge },
            { key: 'pos_table_split', label: 'Autoriser séparation de table', description: 'Division d’une commande vers deux tables distinctes', icon: Scissors },
            { key: 'pos_show_ticket_number', label: 'Afficher numéro de ticket', description: 'Numérotation séquentielle visible sur le reçu', icon: Hash },
            { key: 'pos_show_server', label: 'Afficher nom du serveur', description: 'Mention du serveur sur le ticket et les fiches KDS', icon: User },
            { key: 'pos_show_order_time', label: 'Afficher heure de commande', description: 'Horodatage précis à la minute sur l’addition', icon: Clock },
          ],
        };

      case 'tables':
        return {
          title: 'Configuration Tables & Service en Salle',
          sectionNumber: 'Section 8',
          description: 'Gestion des tables, du plan de salle interactif et du flux de service',
          icon: Utensils,
          gradient: 'from-blue-500 to-indigo-600',
          items: [
            { key: 'tables_management', label: 'Gestion globale des tables', description: 'Suivi de l’état des tables en temps réel', icon: Utensils },
            { key: 'tables_floor_plan', label: 'Plan de salle interactif 2D', description: 'Représentation visuelle de la disposition des salles', icon: Map },
            { key: 'tables_zones', label: 'Gestion des zones (Salle, Terrasse, VIP)', description: 'Organisation des espaces par ambiance et tarification', icon: Grid },
            { key: 'tables_capacity', label: 'Capacité en couverts par table', description: 'Contrôle du nombre de convives assis par emplacement', icon: Users },
            { key: 'tables_reservations', label: 'Réservations directes sur table', description: 'Affectation préalable des réservations au plan de salle', icon: Calendar },
            { key: 'tables_auto_status', label: 'Statut automatique de table', description: 'Changement automatique : Libre, Occupée, Facturée', icon: RefreshCw },
            { key: 'tables_transfer', label: 'Transfert de table autorisé', description: 'Permet le changement de place des convives en cours de repas', icon: ArrowRightLeft },
            { key: 'tables_merge', label: 'Fusion de tables autorisée', description: 'Regroupement physique pour grandes tablées', icon: GitMerge },
            { key: 'tables_division', label: 'Division de table autorisée', description: 'Scission d’un groupe vers des additions séparées', icon: Scissors },
            { key: 'tables_cleaning', label: 'Étape de nettoyage requise', description: 'Statut À Nettoyer obligatoire avant réaffectation', icon: Brush },
            { key: 'tables_auto_server_assign', label: 'Attribution automatique serveur', description: 'Affectation des tables selon le rang de service du serveur', icon: UserCheck },
          ],
        };

      case 'cuisine':
        return {
          title: 'Configuration Cuisine (KDS & Préparation)',
          sectionNumber: 'Section 9',
          description: 'Production, flux de préparation, minuteurs et écrans cuisine',
          icon: ChefHat,
          gradient: 'from-rose-500 to-red-600',
          items: [
            { key: 'cuisine_kds', label: 'Kitchen Display System (KDS)', description: 'Affichage numérique des commandes au poste de cuisine', icon: ChefHat },
            { key: 'cuisine_auto_send', label: 'Envoi automatique cuisine', description: 'Transmission immédiate dès validation de commande au POS', icon: Send },
            { key: 'cuisine_priority', label: 'Priorité des bons (VIP, Urgent)', description: 'Mise en avant visuelle des commandes prioritaires', icon: Flame },
            { key: 'cuisine_prep_timer', label: 'Minuteur & compte à rebours', description: 'Suivi du temps de préparation par plat en direct', icon: Clock },
            { key: 'cuisine_notify_ready', label: 'Notification commande prête', description: 'Alerte sonore et visuelle aux serveurs en salle', icon: Bell },
            { key: 'cuisine_notify_delay', label: 'Notification retard (> 20 min)', description: 'Alerte d’urgence en cas d’attente anormale des convives', icon: AlertTriangle },
            { key: 'cuisine_print_ticket', label: 'Impression ticket cuisine 80mm', description: 'Sortie papier thermique automatique aux postes chauds/froids', icon: Printer },
            { key: 'cuisine_screen', label: 'Écran tactile interactif', description: 'Permet aux cuisiniers de valider les plats d’un clic', icon: Monitor },
            { key: 'cuisine_prep_categories', label: 'Catégories (Chaud, Froid, Grillades)', description: 'Routage automatique par poste de travail en cuisine', icon: Tags },
            { key: 'cuisine_stations', label: 'Stations de cuisine dédiées', description: 'Séparation physique entre poste pizza, four et pâtisserie', icon: UtensilsCrossed },
          ],
        };

      case 'bar':
        return {
          title: 'Configuration Bar, Cave & Boissons',
          sectionNumber: 'Section 10',
          description: 'Gestion des boissons, fiches cocktails, doses d’alcool, pertes et casse',
          icon: Wine,
          gradient: 'from-purple-500 to-pink-600',
          items: [
            { key: 'bar_module', label: 'Activer module Bar & Cave', description: 'Accès au poste barman et gestion des boissons', icon: Wine },
            { key: 'bar_screen', label: 'Écran dédié KDS Bar', description: 'File d’attente des boissons et cocktails à préparer', icon: Monitor },
            { key: 'bar_print', label: 'Impression tickets bar', description: 'Sortie thermique directe au comptoir bar', icon: Printer },
            { key: 'bar_bottles', label: 'Gestion bouteilles entières', description: 'Suivi unitaire des grands crus, champagnes et spiritueux', icon: Package },
            { key: 'bar_glasses', label: 'Gestion verres / doses (cl)', description: 'Décompte précis au centilitre des doses de spiritueux servies', icon: GlassWater },
            { key: 'bar_cocktails', label: 'Gestion des cocktails maison', description: 'Catalogue des créations du barman et mixologie', icon: GlassWater },
            { key: 'bar_cocktail_recipes', label: 'Fiches recettes techniques', description: 'Déduction automatique des ingrédients de la recette en stock', icon: BookOpen },
            { key: 'bar_losses', label: 'Gestion pertes & coulage', description: 'Enregistrement des fonds de bouteilles et mousse tirage', icon: Trash2 },
            { key: 'bar_breakage', label: 'Gestion de la casse verres', description: 'Comptabilisation des verres et bouteilles cassés', icon: Flame },
            { key: 'bar_consumption_control', label: 'Contrôle consommation bar', description: 'Vérification croisée entre ventes saisies et bouteilles ouvertes', icon: ShieldCheck },
          ],
        };

      case 'livraison':
        return {
          title: 'Configuration Livraison & Courses',
          sectionNumber: 'Section 15',
          description: 'Gestion des livraisons urbaines moto, frais par quartier et preuves de remise',
          icon: Bike,
          gradient: 'from-cyan-500 to-blue-600',
          items: [
            { key: 'delivery_active', label: 'Activer module Livraison', description: 'Gestion des commandes hors restaurant et vente à emporter', icon: Bike },
            { key: 'delivery_online_order', label: 'Commandes WhatsApp & En ligne', description: 'Prise de commande directe par message et web', icon: Globe },
            { key: 'delivery_zones', label: 'Gestion des zones urbaines', description: 'Cartographie des quartiers desservis (Bonapriso, Bastos...)', icon: MapPin },
            { key: 'delivery_fees', label: 'Frais de livraison par zone', description: 'Application automatique du tarif selon l’éloignement', icon: Coins },
            { key: 'delivery_driver_assignment', label: 'Affectation coursier moto', description: 'Assignation nominative du livreur responsable du colis', icon: UserCheck },
            { key: 'delivery_tracking', label: 'Suivi de statut (En route, Livré)', description: 'Changement de statut en temps réel de la commande', icon: Navigation },
            { key: 'delivery_proof', label: 'Preuve de livraison (Signature / Réf)', description: 'Validation avec signature client ou ID Mobile Money', icon: FileCheck },
            { key: 'delivery_customer_notifications', label: 'Notifications SMS au client', description: 'Alerte client au départ du coursier moto', icon: Bell },
            { key: 'delivery_web_orders', label: 'Intégration commandes web', description: 'Réception automatique des paniers depuis le site web', icon: Share2 },
          ],
        };

      case 'reservations':
        return {
          title: 'Configuration Réservations & Disponibilités',
          sectionNumber: 'Section 16',
          description: 'Gestion des réservations de tables, prévisions de couverts et gestion des No-Show',
          icon: Calendar,
          gradient: 'from-violet-500 to-indigo-600',
          items: [
            { key: 'res_management', label: 'Activer module Réservations', description: 'Gestion centralisée du cahier de réservations', icon: Calendar },
            { key: 'res_online', label: 'Réservations en ligne 24/7', description: 'Permet aux convives de réserver depuis le portail web', icon: Globe },
            { key: 'res_waitlist', label: 'Gestion de la liste d’attente', description: 'Enregistrement des convives en attente de table libérée', icon: Clock },
            { key: 'res_auto_confirm', label: 'Confirmation automatique SMS/WhatsApp', description: 'Envoi d’un message de validation instantané au client', icon: MessageSquare },
            { key: 'res_reminders', label: 'Rappels de réservation (H-2)', description: 'Relance préventive automatique pour réduire les absences', icon: Bell },
            { key: 'res_deposit', label: 'Acompte obligatoire pour groupe (>= 6)', description: 'Exige un paiement de garantie pour les grandes tablées', icon: Coins, badge: '>= 6 couverts' },
            { key: 'res_noshow', label: 'Gestion stricte des No-show', description: 'Marquage des défections et libération immédiate de la table', icon: UserX },
            { key: 'res_availability', label: 'Gestion auto des disponibilités', description: 'Blocage des créneaux complets selon la capacité en salle', icon: CheckCircle2 },
          ],
        };

      case 'evenements':
        return {
          title: 'Configuration Événements, Banquets & Catering',
          sectionNumber: 'Section 17',
          description: 'Gestion des devis, acomptes 30%, blocage de salle et factures traiteur',
          icon: PartyPopper,
          gradient: 'from-fuchsia-500 to-rose-600',
          items: [
            { key: 'event_active', label: 'Activer Événements & Banquets', description: 'Gestion des mariages, séminaires et réceptions privées', icon: PartyPopper },
            { key: 'event_quotes', label: 'Génération de devis officiels', description: 'Édition de proformas détaillées avec TVA et décharges', icon: FileText },
            { key: 'event_deposit', label: 'Acompte préalable obligatoire (30%)', description: 'Bloque la réservation définitive sous encaissement d’arrhes', icon: Coins, badge: '30% requis' },
            { key: 'event_custom_menus', label: 'Menus événementiels sur-mesure', description: 'Création de formules gastronomiques personnalisées', icon: Utensils },
            { key: 'event_banquet', label: 'Gestion cocktail dînatoire & buffet', description: 'Formules pièces cocktail et service traiteur', icon: GlassWater },
            { key: 'event_hall', label: 'Blocage de salle événementielle', description: 'Privatisation automatique de l’espace sur le calendrier', icon: Lock },
            { key: 'event_planning', label: 'Planning & calendrier dédié', description: 'Vue globale des réceptions et déroulement du service', icon: CalendarDays },
            { key: 'event_billing', label: 'Facturation spécifique événement', description: 'Facturation globale avec déduction d’acomptes perçus', icon: Receipt },
          ],
        };

      case 'caisse':
        return {
          title: 'Configuration Caisse & Clôture Journalière',
          sectionNumber: 'Section 22',
          description: 'Règles de sécurité financière, comptage aveugle et procédures de clôture Z',
          icon: Coins,
          gradient: 'from-emerald-500 to-teal-600',
          items: [
            { key: 'caisse_management', label: 'Gestion caisse active', description: 'Contrôle des flux d’encaissement et de décaissement', icon: Coins },
            { key: 'caisse_mandatory_open', label: 'Ouverture obligatoire préalable', description: 'Bloque les ventes tant que la session n’est pas initialisée', icon: Lock },
            { key: 'caisse_float', label: 'Saisie obligatoire fond de caisse', description: 'Déclaration du montant initial en espèces au matin', icon: Wallet },
            { key: 'caisse_expenses', label: 'Saisie des menues dépenses', description: 'Enregistrement des sorties pour achats d’urgence', icon: ArrowDownRight },
            { key: 'caisse_withdrawals', label: 'Retraits d’espèces (Délestage)', description: 'Transferts d’argent vers le coffre-fort en cours de journée', icon: ArrowUpRight },
            { key: 'caisse_transfers', label: 'Transferts inter-caisses', description: 'Mouvements d’espèces entre caisse principale et bar', icon: ArrowRightLeft },
            { key: 'caisse_mandatory_close', label: 'Clôture obligatoire fin de service', description: 'Exige la clôture formelle avant de quitter l’application', icon: CheckCircle2 },
            { key: 'caisse_mandatory_count', label: 'Comptage aveugle obligatoire', description: 'Le caissier compte sans voir le théorique informatique', icon: Calculator, badge: 'Anti-Fraude' },
            { key: 'caisse_variance_control', label: 'Contrôle strict des écarts (0 FCFA)', description: 'Tolérance zéro sur les surplus ou déficits de caisse', icon: AlertCircle },
            { key: 'caisse_z_report', label: 'Génération du Rapport Z officiel', description: 'Édition du ticket Z chronologique et archivage fiscal', icon: FileText },
            { key: 'caisse_block_after_close', label: 'Blocage total après clôture Z', description: 'Interdit toute saisie supplémentaire sur une session close', icon: ShieldAlert },
            { key: 'caisse_reopen_with_auth', label: 'Réouverture avec PIN Manager', description: 'Déverrouillage exceptionnel sous mandat superviseur', icon: Key },
          ],
        };

      default:
        return {
          title: '',
          sectionNumber: '',
          description: '',
          icon: Layers,
          gradient: 'from-slate-700 to-slate-900',
          items: [],
        };
    }
  };

  const config = getSubTabConfig();
  const Icon = config.icon;

  const filteredItems = config.items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${config.gradient} text-white flex items-center justify-center shadow-md shadow-slate-200`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900">{config.title}</h3>
                {config.sectionNumber && (
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                    {config.sectionNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{config.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-full sm:w-64">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Rechercher une option..."
              />
            </div>
            {savedSuccess && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 shadow-xs animate-in fade-in shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Règles enregistrées
              </span>
            )}
          </div>
        </div>

        {/* Super Admin Status Banner */}
        {isSuperAdmin ? (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs font-medium">
            <Crown className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Contrôle Super-Administrateur actif :</strong> Vous disposez des autorisations complètes pour activer/désactiver les modules et règles métier.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              <strong>Mode Consultation :</strong> La modification des règles et modules applicatifs est strictement réservée au Super Administrateur (Direction).
            </span>
          </div>
        )}

        {/* Mode de fonctionnement de la cuisine */}
        {subTab === 'cuisine' && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 rounded-2xl border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-amber-600" />
                  <span>Mode de fonctionnement de la cuisine</span>
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Conforme au Guide d'Utilisation Officiel (Section 3, 6 et 12)
                </p>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                {kitchenMode === 'ecran_cuisine' ? 'Mode Écran KDS' : 'Sans Compte Cuisinier'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                disabled={!isSuperAdmin}
                onClick={() => isSuperAdmin && setKitchenMode('ecran_cuisine')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  kitchenMode === 'ecran_cuisine'
                    ? 'bg-white border-amber-500 shadow-sm ring-2 ring-amber-400/20'
                    : 'bg-white/60 border-amber-200 hover:bg-white text-slate-600'
                } ${!isSuperAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">1. Mode Écran Cuisine</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Les cuisiniers disposent de comptes individuels et d'un écran tactile KDS pour valider la préparation des plats ("En préparation" &rarr; "Prêt").
                </p>
              </button>

              <button
                type="button"
                disabled={!isSuperAdmin}
                onClick={() => isSuperAdmin && setKitchenMode('sans_compte')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  kitchenMode === 'sans_compte'
                    ? 'bg-white border-amber-500 shadow-sm ring-2 ring-amber-400/20'
                    : 'bg-white/60 border-amber-200 hover:bg-white text-slate-600'
                } ${!isSuperAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">2. Mode Sans Compte Cuisinier</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  La caisse ou le serveur transmet les commandes en cuisine (bon imprimé ou écran partagé) et gère directement les statuts à la place d'un compte dédié.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Modern Rule Toggles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredItems.map((item) => (
            <ModernRuleToggle
              key={item.key}
              id={item.key}
              label={item.label}
              description={item.description}
              badge={(item as any).badge}
              icon={(item as any).icon || Icon}
              checked={options[item.key] ?? false}
              onChange={() => toggleOption(item.key)}
              isSensitive={SENSITIVE_RULE_KEYS.has(item.key)}
              sensitiveWarning="Cette règle modifie les contraintes de sécurité ou de validation du restaurant."
            />
          ))}
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            {config.items.filter((i) => options[i.key]).length} sur {config.items.length} règles activées
          </span>

          <button
            type="button"
            onClick={handleSave}
            disabled={!isSuperAdmin || isSaving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer ${
              isSuperAdmin
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isSuperAdmin ? <Save className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span>
              {isSaving
                ? 'Enregistrement...'
                : isSuperAdmin
                ? 'Enregistrer les règles'
                : 'Modification verrouillée'}
            </span>
          </button>
        </div>
      </div>

      {/* Barre d'action collante lors de modifications non enregistrées */}
      {isSuperAdmin && (
        <StickyActionBar
          dirtyCount={dirtyCount}
          onSave={handleSave}
          onCancel={() => {
            setOptions(operationRules);
            setKitchenMode(settings.kitchenOperationMode || 'ecran_cuisine');
          }}
          isSaving={isSaving}
          saveLabel="Enregistrer les règles"
        />
      )}
    </>
  );
};
