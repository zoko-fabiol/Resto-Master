import React, { useState } from 'react';
import { useRestaurant } from '../../../context/RestaurantContext';
import {
  ShoppingBag,
  Coins,
  Utensils,
  ChefHat,
  Wine,
  Bike,
  Calendar,
  Sparkles,
  Layers,
  Save,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface Props {
  subTab:
    | 'modules'
    | 'pos'
    | 'caisse'
    | 'tables'
    | 'cuisine'
    | 'bar'
    | 'livraison'
    | 'reservations'
    | 'evenements';
}

export const OperationsOptionsSection: React.FC<Props> = ({ subTab }) => {
  const { addAuditLog } = useRestaurant();
  const [savedSuccess, setSavedSuccess] = useState(false);

  // General toggles storage in component state (initialized true)
  const [options, setOptions] = useState<Record<string, boolean>>({
    // POS (Section 7)
    pos_active: true,
    pos_use_tables: true,
    pos_quick_orders: true,
    pos_sale_without_table: true,
    pos_edit_order: true,
    pos_delete_line: true,
    pos_cancel_order: true,
    pos_require_cancel_reason: true,
    pos_allow_discount: true,
    pos_require_discount_approval: true,
    pos_custom_price: false,
    pos_zero_price: false,
    pos_item_comp: true,
    pos_split_bill: true,
    pos_partial_payment: true,
    pos_change_server: true,
    pos_table_transfer: true,
    pos_table_merge: true,
    pos_table_split: true,
    pos_show_ticket_number: true,
    pos_show_server: true,
    pos_show_order_time: true,

    // Tables (Section 8)
    tables_management: true,
    tables_floor_plan: true,
    tables_zones: true,
    tables_capacity: true,
    tables_reservations: true,
    tables_auto_status: true,
    tables_transfer: true,
    tables_merge: true,
    tables_division: true,
    tables_cleaning: true,
    tables_auto_server_assign: true,

    // Cuisine (Section 9)
    cuisine_kds: true,
    cuisine_auto_send: true,
    cuisine_priority: true,
    cuisine_prep_timer: true,
    cuisine_notify_ready: true,
    cuisine_notify_delay: true,
    cuisine_print_ticket: true,
    cuisine_screen: true,
    cuisine_prep_categories: true,
    cuisine_stations: true,

    // Bar (Section 10)
    bar_module: true,
    bar_screen: true,
    bar_print: true,
    bar_bottles: true,
    bar_glasses: true,
    bar_cocktails: true,
    bar_cocktail_recipes: true,
    bar_losses: true,
    bar_breakage: true,
    bar_consumption_control: true,

    // Caisse (Section 22)
    caisse_management: true,
    caisse_mandatory_open: true,
    caisse_float: true,
    caisse_expenses: true,
    caisse_withdrawals: true,
    caisse_transfers: true,
    caisse_mandatory_close: true,
    caisse_mandatory_count: true,
    caisse_variance_control: true,
    caisse_z_report: true,
    caisse_block_after_close: true,
    caisse_reopen_with_auth: true,

    // Livraison (Section 15)
    delivery_active: true,
    delivery_online_order: true,
    delivery_zones: true,
    delivery_fees: true,
    delivery_driver_assignment: true,
    delivery_tracking: true,
    delivery_proof: true,
    delivery_customer_notifications: true,
    delivery_web_orders: true,

    // Réservations (Section 16)
    res_management: true,
    res_online: true,
    res_waitlist: true,
    res_auto_confirm: true,
    res_reminders: true,
    res_deposit: true,
    res_noshow: true,
    res_availability: true,

    // Événements (Section 17)
    event_active: true,
    event_quotes: true,
    event_deposit: true,
    event_custom_menus: true,
    event_banquet: true,
    event_hall: true,
    event_planning: true,
    event_billing: true,

    // Modules
    mod_dashboard: true,
    mod_pos: true,
    mod_tables: true,
    mod_cuisine: true,
    mod_bar: true,
    mod_caisse: true,
    mod_stock: true,
    mod_purchases: true,
    mod_hygiene: true,
    mod_main_courante: true,
    mod_fiscal: true,
    mod_finance: true,
    mod_clients: true,
    mod_staff: true,
    mod_documents: true,
    mod_reports: true,
    mod_events: true,
    mod_delivery: true,
  });

  const toggleOption = (key: string) => {
    setOptions((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      return next;
    });
  };

  const handleSave = () => {
    setSavedSuccess(true);
    addAuditLog('Mise à jour options', 'Paramètres', `Modification des paramètres ${subTab.toUpperCase()}`);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Content configurations according to subTab
  const getSubTabConfig = () => {
    switch (subTab) {
      case 'modules':
        return {
          title: 'Activation & Visibilité des Modules Applicatifs',
          description: 'Activez ou masquez les sections dans le menu latéral selon votre type d’établissement',
          icon: Layers,
          items: [
            { key: 'mod_pos', label: 'Prise de commande / POS (Caisse & Salle)' },
            { key: 'mod_tables', label: 'Plan des tables & Salles (Terrasse, VIP)' },
            { key: 'mod_cuisine', label: 'Cuisine KDS (Écran de préparation chaud & froid)' },
            { key: 'mod_bar', label: 'Bar & Boissons (Cocktails & Vins)' },
            { key: 'mod_caisse', label: 'Gestion de caisse & Rapport Z Journalier' },
            { key: 'mod_stock', label: 'Stocks & Lots (FEFO/FIFO, dates d’expiration)' },
            { key: 'mod_purchases', label: 'Achats & Fournisseurs (Bons de commande & réceptions)' },
            { key: 'mod_hygiene', label: 'Hygiène & Contrôles HACCP (Relevés températures)' },
            { key: 'mod_main_courante', label: 'Main Courante Restauration (Conformité HotelPro Cameroun)' },
            { key: 'mod_fiscal', label: 'Fiscalité & E-Billing (TVA CGI 2026, Retenues AIR, DGI)' },
            { key: 'mod_finance', label: 'Finances & Dépenses (Approbations décaissements)' },
            { key: 'mod_clients', label: 'Clients & Fidélité (CRM, créances, anniversaires)' },
            { key: 'mod_delivery', label: 'Courses & Livraisons Urbaines (Coursiers moto)' },
            { key: 'mod_events', label: 'Événements & Banquets (Devis séminaires & mariages)' },
            { key: 'mod_staff', label: 'Personnel & Présences (Pointage & contrats)' },
            { key: 'mod_documents', label: 'Documents & Scanner (Classeur numérique)' },
            { key: 'mod_reports', label: 'Rapports & Statistiques (Exports OHADA & CA)' },
          ],
        };

      case 'pos':
        return {
          title: 'Configuration POS (Point de Vente)',
          description: 'Règles opérationnelles appliquées lors de la saisie des commandes (Section 7)',
          icon: ShoppingBag,
          items: [
            { key: 'pos_active', label: 'Activer POS' },
            { key: 'pos_use_tables', label: 'Utiliser les tables' },
            { key: 'pos_quick_orders', label: 'Autoriser commandes rapides' },
            { key: 'pos_sale_without_table', label: 'Autoriser vente sans table (Comptoir direct)' },
            { key: 'pos_edit_order', label: 'Autoriser modification commande' },
            { key: 'pos_delete_line', label: 'Autoriser suppression ligne' },
            { key: 'pos_cancel_order', label: 'Autoriser annulation commande' },
            { key: 'pos_require_cancel_reason', label: 'Exiger motif d’annulation' },
            { key: 'pos_allow_discount', label: 'Autoriser remise' },
            { key: 'pos_require_discount_approval', label: 'Exiger approbation remise' },
            { key: 'pos_custom_price', label: 'Autoriser prix personnalisé' },
            { key: 'pos_zero_price', label: 'Autoriser prix zéro' },
            { key: 'pos_item_comp', label: 'Autoriser article offert' },
            { key: 'pos_split_bill', label: 'Autoriser fractionnement addition' },
            { key: 'pos_partial_payment', label: 'Autoriser paiement partiel' },
            { key: 'pos_change_server', label: 'Autoriser changement serveur' },
            { key: 'pos_table_transfer', label: 'Autoriser transfert de table' },
            { key: 'pos_table_merge', label: 'Autoriser fusion de tables' },
            { key: 'pos_table_split', label: 'Autoriser séparation de table' },
            { key: 'pos_show_ticket_number', label: 'Afficher numéro ticket' },
            { key: 'pos_show_server', label: 'Afficher serveur' },
            { key: 'pos_show_order_time', label: 'Afficher temps commande' },
          ],
        };

      case 'tables':
        return {
          title: 'Configuration Tables & Service en Salle',
          description: 'Gestion des tables, du plan de salle et du service (Section 8)',
          icon: Utensils,
          items: [
            { key: 'tables_management', label: 'Gestion des tables' },
            { key: 'tables_floor_plan', label: 'Plan de salle interactif' },
            { key: 'tables_zones', label: 'Gestion des zones (Salle, Terrasse, VIP)' },
            { key: 'tables_capacity', label: 'Gestion de la capacité en couverts' },
            { key: 'tables_reservations', label: 'Réservations directes sur table' },
            { key: 'tables_auto_status', label: 'Statut automatique de table' },
            { key: 'tables_transfer', label: 'Transfert de table' },
            { key: 'tables_merge', label: 'Fusion de tables' },
            { key: 'tables_division', label: 'Division de table' },
            { key: 'tables_cleaning', label: 'Étape de nettoyage table requise' },
            { key: 'tables_auto_server_assign', label: 'Attribution automatique serveur' },
          ],
        };

      case 'cuisine':
        return {
          title: 'Configuration Cuisine (KDS & Préparation)',
          description: 'Production, flux de préparation et écrans cuisine (Section 9)',
          icon: ChefHat,
          items: [
            { key: 'cuisine_kds', label: 'Kitchen Display System (KDS)' },
            { key: 'cuisine_auto_send', label: 'Envoi automatique cuisine dès validation' },
            { key: 'cuisine_priority', label: 'Priorité commande (VIP, Normal, Urgent)' },
            { key: 'cuisine_prep_timer', label: 'Minuteur préparation & compte à rebours' },
            { key: 'cuisine_notify_ready', label: 'Notification commande prête aux serveurs' },
            { key: 'cuisine_notify_delay', label: 'Notification retard (> 20 minutes)' },
            { key: 'cuisine_print_ticket', label: 'Impression ticket cuisine' },
            { key: 'cuisine_screen', label: 'Écran tactile cuisine' },
            { key: 'cuisine_prep_categories', label: 'Catégories de préparation (Chaud, Froid, Grillades)' },
            { key: 'cuisine_stations', label: 'Stations de cuisine dédiées' },
          ],
        };

      case 'bar':
        return {
          title: 'Configuration Bar & Cave',
          description: 'Gestion des boissons, doses, cocktails et pertes (Section 10)',
          icon: Wine,
          items: [
            { key: 'bar_module', label: 'Module bar' },
            { key: 'bar_screen', label: 'Écran bar' },
            { key: 'bar_print', label: 'Impression bar' },
            { key: 'bar_bottles', label: 'Gestion bouteilles' },
            { key: 'bar_glasses', label: 'Gestion verres / doses' },
            { key: 'bar_cocktails', label: 'Gestion cocktails' },
            { key: 'bar_cocktail_recipes', label: 'Recettes cocktails' },
            { key: 'bar_losses', label: 'Gestion pertes & coulage' },
            { key: 'bar_breakage', label: 'Gestion casse' },
            { key: 'bar_consumption_control', label: 'Contrôle consommation' },
          ],
        };

      case 'caisse':
        return {
          title: 'Configuration Caisse & Clôture Journalière',
          description: 'Règles de sécurité financière et procédures Z (Section 22)',
          icon: Coins,
          items: [
            { key: 'caisse_management', label: 'Gestion caisse' },
            { key: 'caisse_mandatory_open', label: 'Ouverture obligatoire avant toute vente' },
            { key: 'caisse_float', label: 'Saisie obligatoire du fond de caisse' },
            { key: 'caisse_expenses', label: 'Saisie des dépenses de caisse' },
            { key: 'caisse_withdrawals', label: 'Retraits de caisse' },
            { key: 'caisse_transfers', label: 'Transferts de coffre' },
            { key: 'caisse_mandatory_close', label: 'Clôture obligatoire en fin de service' },
            { key: 'caisse_mandatory_count', label: 'Comptage obligatoire à l’aveugle' },
            { key: 'caisse_variance_control', label: 'Contrôle des écarts de caisse' },
            { key: 'caisse_z_report', label: 'Génération du Rapport Z' },
            { key: 'caisse_block_after_close', label: 'Blocage après clôture' },
            { key: 'caisse_reopen_with_auth', label: 'Réouverture avec autorisation manager uniquement' },
          ],
        };

      case 'livraison':
        return {
          title: 'Configuration Livraison & Courses',
          description: 'Gestion des livraisons urbaines moto et suivis (Section 15)',
          icon: Bike,
          items: [
            { key: 'delivery_active', label: 'Activer module Livraison' },
            { key: 'delivery_online_order', label: 'Commande en ligne / WhatsApp' },
            { key: 'delivery_zones', label: 'Zones de livraison' },
            { key: 'delivery_fees', label: 'Frais de livraison par zone' },
            { key: 'delivery_driver_assignment', label: 'Affectation livreur / coursier moto' },
            { key: 'delivery_tracking', label: 'Suivi statut de la livraison' },
            { key: 'delivery_proof', label: 'Preuve de livraison (Signature / Réf MoMo)' },
            { key: 'delivery_customer_notifications', label: 'Notifications client' },
            { key: 'delivery_web_orders', label: 'Intégration commandes web' },
          ],
        };

      case 'reservations':
        return {
          title: 'Configuration Réservations & Disponibilités',
          description: 'Gestion des réservations et prévisions de couverts (Section 16)',
          icon: Calendar,
          items: [
            { key: 'res_management', label: 'Activer Réservations' },
            { key: 'res_online', label: 'Réservation en ligne' },
            { key: 'res_waitlist', label: 'Liste d’attente' },
            { key: 'res_auto_confirm', label: 'Confirmation automatique SMS/WhatsApp' },
            { key: 'res_reminders', label: 'Rappels de réservation' },
            { key: 'res_deposit', label: 'Acompte obligatoire pour groupe' },
            { key: 'res_noshow', label: 'Gestion des No-show' },
            { key: 'res_availability', label: 'Gestion automatique des disponibilités' },
          ],
        };

      case 'evenements':
        return {
          title: 'Configuration Événements, Banquets & Catering',
          description: 'Gestion des devis, acomptes et réceptions (Section 17)',
          icon: Sparkles,
          items: [
            { key: 'event_active', label: 'Activer Événements & Banquets' },
            { key: 'event_quotes', label: 'Génération de devis officiels' },
            { key: 'event_deposit', label: 'Acompte obligatoire (%)' },
            { key: 'event_custom_menus', label: 'Menus événementiels personnalisés' },
            { key: 'event_banquet', label: 'Gestion banquet & cocktail dînatoire' },
            { key: 'event_hall', label: 'Blocage de salle événementielle' },
            { key: 'event_planning', label: 'Planning & calendrier' },
            { key: 'event_billing', label: 'Facturation spécifique événement' },
          ],
        };

      default:
        return { title: '', description: '', icon: Layers, items: [] };
    }
  };

  const config = getSubTabConfig();
  const Icon = config.icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{config.title}</h3>
            <p className="text-xs text-slate-500">{config.description}</p>
          </div>
        </div>

        {savedSuccess && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" /> Enregistré
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {config.items.map((item) => {
          const checked = options[item.key] ?? false;

          return (
            <label
              key={item.key}
              onClick={() => toggleOption(item.key)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                checked
                  ? 'border-amber-400/80 bg-amber-50/30'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {}}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 mt-0.5"
              />
              <span className={`font-semibold ${checked ? 'text-slate-950 font-bold' : 'text-slate-700'}`}>
                {item.label}
              </span>
            </label>
          );
        })}
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-mono">
          {config.items.filter((i) => options[i.key]).length} sur {config.items.length} options activées
        </span>

        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-xs transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Enregistrer les règles</span>
        </button>
      </div>
    </div>
  );
};
