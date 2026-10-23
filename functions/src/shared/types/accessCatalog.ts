/**
 * RestoMaster OS — Référentiel Unique d'Accès, Modules & Permissions (Phase 1)
 * Source unique de vérité partagée entre le client, l'admin-panel et les Cloud Functions.
 */

import { TenantStatus, TenantSuspensionMode, TenantEntitlements } from './tenant.js';

export type UserRole =
  | 'superadmin'
  | 'direction'
  | 'manager'
  | 'serveur'
  | 'cuisine'
  | 'bar'
  | 'caisse'
  | 'stock'
  | 'rh'
  | 'finance'
  | 'comptable'
  | 'auditeur'
  | 'tablette'
  | 'aucun';

export type AccessAction = 'view' | 'create' | 'edit' | 'delete' | 'validate' | 'export';

export interface TabPermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  validate?: boolean;
  export?: boolean;
}

export type TabId =
  | 'dashboard'
  | 'tables'
  | 'pos'
  | 'bar_pos'
  | 'reservations'
  | 'delivery'
  | 'events'
  | 'kitchen_kds'
  | 'bar_kds'
  | 'menu'
  | 'hygiene'
  | 'stock'
  | 'purchases'
  | 'caisse'
  | 'finance'
  | 'main_courante'
  | 'fiscal'
  | 'staff'
  | 'clients'
  | 'reports'
  | 'documents'
  | 'audit'
  | 'settings'
  | 'kiosk';

export interface ModuleDefinition {
  key: string;
  label: string;
  description: string;
  category: 'vente_service' | 'production' | 'stock_achats' | 'gestion_finance' | 'hygiene_evenements' | 'systeme_securite';
}

export interface TabDefinition {
  id: TabId;
  label: string;
  moduleKey: string;
  section: 'overview' | 'service' | 'production' | 'stocks' | 'section_finances' | 'administration';
}

export interface OperationRuleDefinition {
  key: string;
  label: string;
  moduleKey: string;
  defaultValue: boolean | string | number;
  delegable: boolean; // Si true, le restaurant peut modifier ce paramètre
  risk: 'faible' | 'moyen' | 'eleve' | 'critique';
}

export interface UserAccessDocument {
  uid: string;
  orgId: string;
  tabs?: TabId[] | string[];
  permissions?: Partial<Record<TabId | string, Partial<TabPermissions>>>;
  assignedTableId?: string;
  assignedTableName?: string;
  version: number;
  updatedAt: string;
  updatedBy: string;
}

// -----------------------------------------------------------------------------
// 1. MODULE_CATALOG (Catalogue exhaustif des 21 modules)
// -----------------------------------------------------------------------------
export const MODULE_CATALOG: ModuleDefinition[] = [
  { key: 'mod_dashboard', label: 'Tableau de bord', description: 'Indicateurs clés et métriques en temps réel', category: 'gestion_finance' },
  { key: 'mod_pos', label: 'Vente directe POS', description: 'Caisse enregistreuse tactile et commandes comptoir', category: 'vente_service' },
  { key: 'mod_bar_pos', label: 'Espace Bar', description: 'Caisse dédiée boissons et service bar express', category: 'vente_service' },
  { key: 'mod_tables', label: 'Plan de Salle & Tables', description: 'Gestion graphique des tables et des additions', category: 'vente_service' },
  { key: 'mod_cuisine', label: 'Cuisine KDS', description: 'Écran de production et cadence des bons de commande', category: 'production' },
  { key: 'mod_bar', label: 'Bar KDS', description: 'Écran de préparation boissons et cocktails', category: 'production' },
  { key: 'mod_menu', label: 'Carte & Recettes', description: 'Gestion des articles, déclinaisons et fiches techniques', category: 'production' },
  { key: 'mod_recipes_yield', label: 'Fiches Ingrédients', description: 'Calcul des coûts de revient et fiches BOM', category: 'production' },
  { key: 'mod_caisse', label: 'Caisse & Z Journalier', description: 'Sessions de caisse, fonds de caisse et tickets Z', category: 'vente_service' },
  { key: 'mod_stock', label: 'Gestion des Stocks', description: 'Mouvements d’entrées/sorties, alertes et inventaire', category: 'stock_achats' },
  { key: 'mod_purchases', label: 'Achats & Fournisseurs', description: 'Bons de commande fournisseurs et réceptions', category: 'stock_achats' },
  { key: 'mod_delivery', label: 'Livraisons & Coursiers', description: 'Dispatch des livraisons et suivi des courses', category: 'vente_service' },
  { key: 'mod_events', label: 'Banquets & Traiteur', description: 'Devis événementiels et prestations traiteur', category: 'hygiene_evenements' },
  { key: 'mod_clients', label: 'Clients & Fidélité', description: 'Fichier clients, comptes crédits et programmes fidélité', category: 'vente_service' },
  { key: 'mod_staff', label: 'Personnel & Plannings', description: 'Comptes collaborateurs, rôles et plannings', category: 'gestion_finance' },
  { key: 'mod_documents', label: 'GED & Factures', description: 'Archivage des documents comptables et légaux', category: 'gestion_finance' },
  { key: 'mod_reports', label: 'Rapports & Statistiques', description: 'Analyses des ventes, TVA et performances', category: 'gestion_finance' },
  { key: 'mod_hygiene', label: 'Hygiène & HACCP', description: 'Relevés de températures et traçabilité alimentaire', category: 'hygiene_evenements' },
  { key: 'mod_finance', label: 'Finances & Dépenses', description: 'Suivi des dépenses et compte de résultat simplifié', category: 'gestion_finance' },
  { key: 'mod_main_courante', label: 'Main Courante', description: 'Prise en charge chambres et complexes hôteliers', category: 'gestion_finance' },
  { key: 'mod_fiscal', label: 'Fiscalité & Taxes', description: 'Journal fiscal, TVA 19,25% et reporting légal Cameroun', category: 'gestion_finance' },
  { key: 'mod_audit', label: 'Journal d’Audit', description: 'Traçabilité immuable des actions sensibles', category: 'systeme_securite' },
  { key: 'mod_settings', label: 'Configuration & Paramètres', description: 'Réglages opérationnels de l’établissement', category: 'systeme_securite' },
];

// -----------------------------------------------------------------------------
// 2. TAB_CATALOG (Rattachement strict de chaque onglet à son module parent)
// -----------------------------------------------------------------------------
export const TAB_CATALOG: TabDefinition[] = [
  { id: 'dashboard', label: 'Tableau de bord', moduleKey: 'mod_dashboard', section: 'overview' },
  { id: 'tables', label: 'Plan des Tables', moduleKey: 'mod_tables', section: 'service' },
  { id: 'pos', label: 'Prise de Commande / POS', moduleKey: 'mod_pos', section: 'service' },
  { id: 'bar_pos', label: 'Espace Bar', moduleKey: 'mod_bar_pos', section: 'service' },
  { id: 'reservations', label: 'Réservations', moduleKey: 'mod_tables', section: 'service' },
  { id: 'delivery', label: 'Courses & Livraisons', moduleKey: 'mod_delivery', section: 'service' },
  { id: 'events', label: 'Banquets & Traiteur', moduleKey: 'mod_events', section: 'service' },
  { id: 'kitchen_kds', label: 'Cuisine KDS', moduleKey: 'mod_cuisine', section: 'production' },
  { id: 'bar_kds', label: 'Bar & Boissons', moduleKey: 'mod_bar', section: 'production' },
  { id: 'menu', label: 'Carte & Recettes', moduleKey: 'mod_menu', section: 'production' },
  { id: 'hygiene', label: 'Hygiène & HACCP', moduleKey: 'mod_hygiene', section: 'production' },
  { id: 'stock', label: 'Stocks & Lots (FEFO)', moduleKey: 'mod_stock', section: 'stocks' },
  { id: 'purchases', label: 'Achats & Fournisseurs', moduleKey: 'mod_purchases', section: 'stocks' },
  { id: 'caisse', label: 'Caisse & Z Journalier', moduleKey: 'mod_caisse', section: 'section_finances' },
  { id: 'finance', label: 'Finances & Dépenses', moduleKey: 'mod_finance', section: 'section_finances' },
  { id: 'main_courante', label: 'Main Courante (HotelPro)', moduleKey: 'mod_main_courante', section: 'section_finances' },
  { id: 'fiscal', label: 'Fiscalité & Journal Fiscal', moduleKey: 'mod_fiscal', section: 'section_finances' },
  { id: 'staff', label: 'Personnel & Plannings', moduleKey: 'mod_staff', section: 'administration' },
  { id: 'clients', label: 'Clients & Fidélité', moduleKey: 'mod_clients', section: 'administration' },
  { id: 'reports', label: 'Rapports & Stats', moduleKey: 'mod_reports', section: 'administration' },
  { id: 'documents', label: 'Documents & Scanner GED', moduleKey: 'mod_documents', section: 'administration' },
  { id: 'audit', label: 'Journal d’Audit', moduleKey: 'mod_audit', section: 'administration' },
  { id: 'settings', label: 'Paramètres Restaurant', moduleKey: 'mod_settings', section: 'administration' },
  { id: 'kiosk', label: 'Mode Tablette Client', moduleKey: 'mod_tables', section: 'service' },
];

export const TAB_MAP: Record<TabId, TabDefinition> = TAB_CATALOG.reduce(
  (acc, tab) => {
    acc[tab.id] = tab;
    return acc;
  },
  {} as Record<TabId, TabDefinition>
);

// -----------------------------------------------------------------------------
// 3. OPERATION_RULES (Règles d'exploitation avec effet réel)
// -----------------------------------------------------------------------------
export const OPERATION_RULES: OperationRuleDefinition[] = [
  { key: 'enableStockAutoDeduction', label: 'Déduction automatique de stock à la commande', moduleKey: 'mod_stock', defaultValue: true, delegable: false, risk: 'eleve' },
  { key: 'stockDeductionTiming', label: 'Moment de la déduction de stock (commande ou production)', moduleKey: 'mod_stock', defaultValue: 'order_creation', delegable: false, risk: 'moyen' },
  { key: 'allowNegativeStock', label: 'Autoriser la vente en rupture théorique de stock', moduleKey: 'mod_stock', defaultValue: false, delegable: true, risk: 'eleve' },
  { key: 'requirePinOnCashDiscounts', label: 'Validation PIN superviseur requise pour remises', moduleKey: 'mod_caisse', defaultValue: true, delegable: false, risk: 'critique' },
  { key: 'requirePinOnOrderCancel', label: 'Validation PIN superviseur pour annulation de commande', moduleKey: 'mod_caisse', defaultValue: true, delegable: false, risk: 'critique' },
  { key: 'enforceStrictZClosing', label: 'Clôture de caisse Z obligatoire en fin de service', moduleKey: 'mod_caisse', defaultValue: true, delegable: false, risk: 'critique' },
  { key: 'taxComplianceMode', label: 'Application stricte TVA 19,25% et CAC Cameroun', moduleKey: 'mod_fiscal', defaultValue: true, delegable: false, risk: 'critique' },
  { key: 'offlineSyncPolicy', label: 'Mode de synchronisation résiliente hors-ligne', moduleKey: 'mod_pos', defaultValue: 'auto_replay', delegable: true, risk: 'moyen' },
];

// -----------------------------------------------------------------------------
// 4. DEFAULT_ROLE_TAB_PERMISSIONS (Matrice par défaut des droits Rôle × Onglet)
// -----------------------------------------------------------------------------
const FULL_ACCESS: TabPermissions = { view: true, create: true, edit: true, delete: true, validate: true, export: true };
const READ_EDIT: TabPermissions = { view: true, create: true, edit: true, delete: false, validate: true, export: true };
const READ_CREATE: TabPermissions = { view: true, create: true, edit: false, delete: false, validate: false, export: false };
const READ_ONLY: TabPermissions = { view: true, create: false, edit: false, delete: false, validate: false, export: false };
const NO_ACCESS: TabPermissions = { view: false, create: false, edit: false, delete: false, validate: false, export: false };

export const DEFAULT_ROLE_TAB_PERMISSIONS: Record<UserRole, Record<TabId, TabPermissions>> = {
  superadmin: {
    dashboard: FULL_ACCESS, tables: FULL_ACCESS, pos: FULL_ACCESS, bar_pos: FULL_ACCESS,
    reservations: FULL_ACCESS, delivery: FULL_ACCESS, events: FULL_ACCESS, kitchen_kds: FULL_ACCESS,
    bar_kds: FULL_ACCESS, menu: FULL_ACCESS, hygiene: FULL_ACCESS, stock: FULL_ACCESS,
    purchases: FULL_ACCESS, caisse: FULL_ACCESS, finance: FULL_ACCESS, main_courante: FULL_ACCESS,
    fiscal: FULL_ACCESS, staff: FULL_ACCESS, clients: FULL_ACCESS, reports: FULL_ACCESS,
    documents: FULL_ACCESS, audit: FULL_ACCESS, settings: FULL_ACCESS, kiosk: NO_ACCESS,
  },
  direction: {
    dashboard: FULL_ACCESS, tables: FULL_ACCESS, pos: FULL_ACCESS, bar_pos: FULL_ACCESS,
    reservations: FULL_ACCESS, delivery: FULL_ACCESS, events: FULL_ACCESS, kitchen_kds: FULL_ACCESS,
    bar_kds: FULL_ACCESS, menu: FULL_ACCESS, hygiene: FULL_ACCESS, stock: FULL_ACCESS,
    purchases: FULL_ACCESS, caisse: FULL_ACCESS, finance: FULL_ACCESS, main_courante: FULL_ACCESS,
    fiscal: FULL_ACCESS, staff: FULL_ACCESS, clients: FULL_ACCESS, reports: FULL_ACCESS,
    documents: FULL_ACCESS, audit: FULL_ACCESS, settings: FULL_ACCESS, kiosk: NO_ACCESS,
  },
  manager: {
    dashboard: READ_EDIT, tables: READ_EDIT, pos: READ_EDIT, bar_pos: READ_EDIT,
    reservations: READ_EDIT, delivery: READ_EDIT, events: READ_EDIT, kitchen_kds: READ_EDIT,
    bar_kds: READ_EDIT, menu: READ_EDIT, hygiene: READ_EDIT, stock: READ_EDIT,
    purchases: READ_EDIT, caisse: READ_EDIT, finance: READ_EDIT, main_courante: READ_EDIT,
    fiscal: READ_ONLY, staff: READ_EDIT, clients: READ_EDIT, reports: READ_EDIT,
    documents: READ_EDIT, audit: READ_ONLY, settings: READ_ONLY, kiosk: NO_ACCESS,
  },
  serveur: {
    dashboard: NO_ACCESS, tables: READ_EDIT, pos: READ_CREATE, bar_pos: NO_ACCESS,
    reservations: READ_CREATE, delivery: NO_ACCESS, events: NO_ACCESS, kitchen_kds: NO_ACCESS,
    bar_kds: NO_ACCESS, menu: READ_ONLY, hygiene: NO_ACCESS, stock: NO_ACCESS,
    purchases: NO_ACCESS, caisse: NO_ACCESS, finance: NO_ACCESS, main_courante: NO_ACCESS,
    fiscal: NO_ACCESS, staff: NO_ACCESS, clients: READ_CREATE, reports: NO_ACCESS,
    documents: NO_ACCESS, audit: NO_ACCESS, settings: NO_ACCESS, kiosk: NO_ACCESS,
  },
  cuisine: {
    dashboard: NO_ACCESS, tables: NO_ACCESS, pos: NO_ACCESS, bar_pos: NO_ACCESS,
    reservations: NO_ACCESS, delivery: NO_ACCESS, events: NO_ACCESS, kitchen_kds: READ_EDIT,
    bar_kds: NO_ACCESS, menu: READ_ONLY, hygiene: READ_EDIT, stock: READ_ONLY,
    purchases: NO_ACCESS, caisse: NO_ACCESS, finance: NO_ACCESS, main_courante: NO_ACCESS,
    fiscal: NO_ACCESS, staff: NO_ACCESS, clients: NO_ACCESS, reports: NO_ACCESS,
    documents: NO_ACCESS, audit: NO_ACCESS, settings: NO_ACCESS, kiosk: NO_ACCESS,
  },
  bar: {
    dashboard: NO_ACCESS, tables: NO_ACCESS, pos: NO_ACCESS, bar_pos: READ_CREATE,
    reservations: NO_ACCESS, delivery: NO_ACCESS, events: NO_ACCESS, kitchen_kds: NO_ACCESS,
    bar_kds: READ_EDIT, menu: READ_ONLY, hygiene: READ_EDIT, stock: READ_ONLY,
    purchases: NO_ACCESS, caisse: NO_ACCESS, finance: NO_ACCESS, main_courante: NO_ACCESS,
    fiscal: NO_ACCESS, staff: NO_ACCESS, clients: NO_ACCESS, reports: NO_ACCESS,
    documents: NO_ACCESS, audit: NO_ACCESS, settings: NO_ACCESS, kiosk: NO_ACCESS,
  },
  caisse: {
    dashboard: READ_ONLY, tables: READ_ONLY, pos: READ_EDIT, bar_pos: READ_EDIT,
    reservations: READ_ONLY, delivery: READ_EDIT, events: NO_ACCESS, kitchen_kds: NO_ACCESS,
    bar_kds: NO_ACCESS, menu: READ_ONLY, hygiene: NO_ACCESS, stock: NO_ACCESS,
    purchases: NO_ACCESS, caisse: READ_EDIT, finance: NO_ACCESS, main_courante: NO_ACCESS,
    fiscal: READ_ONLY, staff: NO_ACCESS, clients: READ_EDIT, reports: READ_ONLY,
    documents: READ_ONLY, audit: NO_ACCESS, settings: NO_ACCESS, kiosk: NO_ACCESS,
  },
  stock: {
    dashboard: NO_ACCESS, tables: NO_ACCESS, pos: NO_ACCESS, bar_pos: NO_ACCESS,
    reservations: NO_ACCESS, delivery: NO_ACCESS, events: NO_ACCESS, kitchen_kds: NO_ACCESS,
    bar_kds: NO_ACCESS, menu: READ_ONLY, hygiene: NO_ACCESS, stock: FULL_ACCESS,
    purchases: FULL_ACCESS, caisse: NO_ACCESS, finance: NO_ACCESS, main_courante: NO_ACCESS,
    fiscal: NO_ACCESS, staff: NO_ACCESS, clients: NO_ACCESS, reports: READ_ONLY,
    documents: READ_ONLY, audit: NO_ACCESS, settings: NO_ACCESS, kiosk: NO_ACCESS,
  },
  rh: {
    dashboard: READ_ONLY, tables: NO_ACCESS, pos: NO_ACCESS, bar_pos: NO_ACCESS,
    reservations: NO_ACCESS, delivery: NO_ACCESS, events: NO_ACCESS, kitchen_kds: NO_ACCESS,
    bar_kds: NO_ACCESS, menu: NO_ACCESS, hygiene: NO_ACCESS, stock: NO_ACCESS,
    purchases: NO_ACCESS, caisse: NO_ACCESS, finance: NO_ACCESS, main_courante: NO_ACCESS,
    fiscal: NO_ACCESS, staff: FULL_ACCESS, clients: NO_ACCESS, reports: READ_ONLY,
    documents: READ_EDIT, audit: NO_ACCESS, settings: NO_ACCESS, kiosk: NO_ACCESS,
  },
  finance: {
    dashboard: READ_ONLY, tables: NO_ACCESS, pos: NO_ACCESS, bar_pos: NO_ACCESS,
    reservations: NO_ACCESS, delivery: NO_ACCESS, events: NO_ACCESS, kitchen_kds: NO_ACCESS,
    bar_kds: NO_ACCESS, menu: NO_ACCESS, hygiene: NO_ACCESS, stock: READ_ONLY,
    purchases: READ_EDIT, caisse: READ_ONLY, finance: FULL_ACCESS, main_courante: READ_ONLY,
    fiscal: FULL_ACCESS, staff: NO_ACCESS, clients: NO_ACCESS, reports: FULL_ACCESS,
    documents: FULL_ACCESS, audit: READ_ONLY, settings: NO_ACCESS, kiosk: NO_ACCESS,
  },
  comptable: {
    dashboard: READ_ONLY, tables: NO_ACCESS, pos: NO_ACCESS, bar_pos: NO_ACCESS,
    reservations: NO_ACCESS, delivery: NO_ACCESS, events: NO_ACCESS, kitchen_kds: NO_ACCESS,
    bar_kds: NO_ACCESS, menu: NO_ACCESS, hygiene: NO_ACCESS, stock: READ_ONLY,
    purchases: READ_ONLY, caisse: READ_ONLY, finance: READ_ONLY, main_courante: READ_ONLY,
    fiscal: FULL_ACCESS, staff: NO_ACCESS, clients: NO_ACCESS, reports: FULL_ACCESS,
    documents: FULL_ACCESS, audit: READ_ONLY, settings: NO_ACCESS, kiosk: NO_ACCESS,
  },
  auditeur: {
    dashboard: READ_ONLY, tables: READ_ONLY, pos: READ_ONLY, bar_pos: READ_ONLY,
    reservations: READ_ONLY, delivery: READ_ONLY, events: READ_ONLY, kitchen_kds: READ_ONLY,
    bar_kds: READ_ONLY, menu: READ_ONLY, hygiene: READ_ONLY, stock: READ_ONLY,
    purchases: READ_ONLY, caisse: READ_ONLY, finance: READ_ONLY, main_courante: READ_ONLY,
    fiscal: READ_ONLY, staff: READ_ONLY, clients: READ_ONLY, reports: READ_ONLY,
    documents: READ_ONLY, audit: FULL_ACCESS, settings: READ_ONLY, kiosk: NO_ACCESS,
  },
  tablette: {
    dashboard: NO_ACCESS, tables: NO_ACCESS, pos: NO_ACCESS, bar_pos: NO_ACCESS,
    reservations: NO_ACCESS, delivery: NO_ACCESS, events: NO_ACCESS, kitchen_kds: NO_ACCESS,
    bar_kds: NO_ACCESS, menu: NO_ACCESS, hygiene: NO_ACCESS, stock: NO_ACCESS,
    purchases: NO_ACCESS, caisse: NO_ACCESS, finance: NO_ACCESS, main_courante: NO_ACCESS,
    fiscal: NO_ACCESS, staff: NO_ACCESS, clients: NO_ACCESS, reports: NO_ACCESS,
    documents: NO_ACCESS, audit: NO_ACCESS, settings: NO_ACCESS, kiosk: READ_EDIT,
  },
  aucun: {
    dashboard: NO_ACCESS, tables: NO_ACCESS, pos: NO_ACCESS, bar_pos: NO_ACCESS,
    reservations: NO_ACCESS, delivery: NO_ACCESS, events: NO_ACCESS, kitchen_kds: NO_ACCESS,
    bar_kds: NO_ACCESS, menu: NO_ACCESS, hygiene: NO_ACCESS, stock: NO_ACCESS,
    purchases: NO_ACCESS, caisse: NO_ACCESS, finance: NO_ACCESS, main_courante: NO_ACCESS,
    fiscal: NO_ACCESS, staff: NO_ACCESS, clients: NO_ACCESS, reports: NO_ACCESS,
    documents: NO_ACCESS, audit: NO_ACCESS, settings: NO_ACCESS, kiosk: NO_ACCESS,
  },
};

// -----------------------------------------------------------------------------
// 5. FONCTION PURE resolveAccess
// Accès = Tenant actif ET Module activé ET Onglet accordé ET Action autorisée
// -----------------------------------------------------------------------------
export interface ResolveAccessInput {
  tenant?: { status?: TenantStatus; suspensionMode?: TenantSuspensionMode } | null;
  entitlements?: TenantEntitlements | null;
  userAccess?: UserAccessDocument | null;
  fallbackPermissions?: {
    additionalTabs?: string[];
    tabPermissions?: Record<string, Partial<TabPermissions>>;
  };
  role: UserRole;
  tab: TabId | string;
  action?: AccessAction;
}

export function resolveAccess(input: ResolveAccessInput): boolean {
  const { tenant, entitlements, userAccess, fallbackPermissions, role, tab, action = 'view' } = input;

  // A. Établissement : statut et suspension
  if (tenant?.status) {
    if (tenant.status === 'resilie' || tenant.status === 'archive') {
      return false;
    }
    if (tenant.status === 'suspendu' && tenant.suspensionMode === 'full_block') {
      return false;
    }
    // En impayé ou suspension lecture seule : seule la consultation est autorisée
    if ((tenant.status === 'impaye' || tenant.status === 'suspendu') && action !== 'view') {
      return false;
    }
  }

  // B. Rôle inactif
  if (!role || role === 'aucun') {
    return false;
  }

  // C. Module parent activé dans les entitlements
  // Trouver la définition de l'onglet
  const tabDef = TAB_MAP[tab as TabId] || TAB_CATALOG.find((t) => t.id === tab);
  if (tabDef) {
    const parentModule = tabDef.moduleKey;
    // Si entitlements est défini, le module parent DOIT être explicitement activé
    if (entitlements && entitlements.modules) {
      if (!entitlements.modules[parentModule]) {
        // Module DÉSACTIVÉ par l'admin -> refus catégorique pour tout le monde
        return false;
      }
    }
  }

  // D. Comptes Tablettes : strictement limités à kiosk et sans delete
  if (role === 'tablette') {
    if (tab !== 'kiosk') return false;
    return action !== 'delete';
  }

  // E. Surcharges personnalisées de l'utilisateur (userAccess ou fallbackPermissions)
  const effectiveCustomAccess = userAccess || (fallbackPermissions ? {
    uid: '',
    orgId: '',
    tabs: fallbackPermissions.additionalTabs,
    permissions: fallbackPermissions.tabPermissions,
    version: 0,
    updatedAt: '',
    updatedBy: '',
  } : null);

  if (effectiveCustomAccess) {
    // Si une liste explicite d'onglets accordés est définie
    if (effectiveCustomAccess.tabs && effectiveCustomAccess.tabs.length > 0) {
      if (!(effectiveCustomAccess.tabs as string[]).includes(String(tab))) {
        return false;
      }
    }

    // Si une permission granulaire est définie pour cet onglet
    if (effectiveCustomAccess.permissions && effectiveCustomAccess.permissions[tab]) {
      const customPerm = effectiveCustomAccess.permissions[tab];
      if (customPerm && customPerm[action] !== undefined) {
        return Boolean(customPerm[action]);
      }
    }
  }

  // F. Permissions par défaut du rôle pour cet onglet
  const rolePerms = DEFAULT_ROLE_TAB_PERMISSIONS[role]?.[tab as TabId];
  if (!rolePerms) {
    return false;
  }

  return Boolean(rolePerms[action]);
}
