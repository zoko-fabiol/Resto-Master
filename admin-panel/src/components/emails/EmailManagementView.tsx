import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
  RefreshCw,
  UtensilsCrossed,
  Receipt,
  BellRing,
  AlertTriangle,
  FileSpreadsheet,
  KeyRound,
  Settings,
  Crown,
} from 'lucide-react';
import { gasEmailService, GasEmailConfig } from '../../services/gasEmailService';
import { EmailPreviewModal, EmailPreviewData } from './EmailPreviewModal';
import {
  buildActivationEmail,
  buildTableReservationEmail,
  buildCashReceiptEmail,
  buildOrderReadyEmail,
  buildLowStockAlertEmail,
  buildZReportClosureEmail,
  buildExecutiveReportEmail,
} from '../../../../src/services/email/emailTemplates';

export const EmailManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CATALOG' | 'TEST_BENCH' | 'SETUP_GUIDE'>('CATALOG');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<EmailPreviewData | null>(null);

  // Configuration GAS
  const [webhookUrl, setWebhookUrl] = useState('');
  const [savedConfig, setSavedConfig] = useState<GasEmailConfig | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Banc de test
  const [benchTemplate, setBenchTemplate] = useState('activation');
  const [benchEmail, setBenchEmail] = useState('');
  const [benchSending, setBenchSending] = useState(false);
  const [benchStatus, setBenchStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Copie script
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await gasEmailService.getConfig();
      setSavedConfig(config);
      if (config.webhookUrl) {
        setWebhookUrl(config.webhookUrl);
      }
    } catch (err) {
      console.warn('Erreur chargement config GAS:', err);
    }
  };

  const handleSaveConfig = async () => {
    if (!webhookUrl.trim().startsWith('https://script.google.com/macros/s/')) {
      setConfigMessage({
        type: 'error',
        text: "L'URL doit commencer par 'https://script.google.com/macros/s/'",
      });
      return;
    }

    setIsSavingConfig(true);
    setConfigMessage(null);

    try {
      await gasEmailService.saveConfig({ webhookUrl: webhookUrl.trim() });
      setSavedConfig({ webhookUrl: webhookUrl.trim(), isActive: true });
      setConfigMessage({
        type: 'success',
        text: 'Passerelle Google Apps Script enregistrée avec succès !',
      });
      setTimeout(() => setConfigMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de sauvegarde';
      setConfigMessage({ type: 'error', text: msg });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(gasEmailService.getGoogleAppsScriptCode());
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    } catch {
      setCopiedScript(false);
    }
  };

  // Génération des données pour chaque gabarit de démonstration
  const getEmailDataForTemplate = (templateId: string): EmailPreviewData => {
    switch (templateId) {
      case 'activation': {
        const email = buildActivationEmail({
          applicantName: 'M. Fabrice Kemayo',
          companyName: 'Le Grand Gourmet Yaoundé',
          restaurantCode: 'RESTO-GDGOURMET',
          email: 'direction@grandgourmet.cm',
          password: 'TempPassword#2026',
          planName: 'Formule Professionnelle (Pro)',
          city: 'Yaoundé, Cameroun',
          loginUrl: window.location.origin,
        });
        return {
          title: "Activation & Identifiants d'Accès Superviseur",
          subject: email.subject,
          html: email.html,
          text: email.text,
          recipientDefault: 'direction@grandgourmet.cm',
        };
      }

      case 'reservation': {
        const email = buildTableReservationEmail({
          customerName: 'Mme. Claire Mbida',
          restaurantName: 'Le Grand Gourmet Yaoundé',
          reservationNumber: 'RES-8924',
          date: 'Samedi 24 Octobre 2026',
          time: '20:30',
          guestCount: 4,
          tableName: 'Table VIP Terrasse - T12',
          specialRequests: 'Table en bordure avec vue, chaise haute pour enfant demandée.',
          depositAmountFcfa: 10000,
        });
        return {
          title: 'Confirmation de Réservation de Table',
          subject: email.subject,
          html: email.html,
          text: email.text,
          recipientDefault: 'claire.mbida@email.cm',
        };
      }

      case 'receipt': {
        const email = buildCashReceiptEmail({
          customerName: 'Client Comptoir / Table 7',
          restaurantName: 'Le Grand Gourmet Yaoundé',
          receiptNumber: 'TK-2026-0048',
          date: '22/10/2026 13:45',
          paymentMethod: 'Orange Money / Espèces',
          subtotalFcfa: 24500,
          vatFcfa: 4700,
          totalTtcFcfa: 28200,
          cashierName: 'Sandrine E. (Caisse 1)',
          dgiChainHash: 'SHA256-DGI-89FA42E109B5',
          items: [
            { name: 'Ndolé Royal Crevettes & Poissons', quantity: 2, totalFcfa: 17000 },
            { name: 'Poulet DG Traditionnel', quantity: 1, totalFcfa: 7500 },
            { name: 'Bière Locale 65cl', quantity: 2, totalFcfa: 3000 },
            { name: 'Eau Minérale 1.5L', quantity: 1, totalFcfa: 700 },
          ],
        });
        return {
          title: 'Ticket de Caisse Certifié & Reçu Fiscal',
          subject: email.subject,
          html: email.html,
          text: email.text,
          recipientDefault: 'client@restaurant.com',
        };
      }

      case 'order_ready': {
        const email = buildOrderReadyEmail({
          customerName: 'Table 4 (Jardin)',
          restaurantName: 'Le Grand Gourmet Yaoundé',
          orderNumber: 'CMD-0052',
          orderType: 'sur_place',
          tableName: 'Table 4 (Jardin)',
          itemsSummary: '1x Côte de Bœuf Grillée Sauce Poivre, 2x Frites Plantain, 2x Cocktail Signature',
          pickupCounter: 'Passe Principal Cuisine',
        });
        return {
          title: 'Alerte Commande Prête (Passe Cuisine & Bar)',
          subject: email.subject,
          html: email.html,
          text: email.text,
          recipientDefault: 'serveurs@grandgourmet.cm',
        };
      }

      case 'low_stock': {
        const email = buildLowStockAlertEmail({
          restaurantName: 'Le Grand Gourmet Yaoundé',
          ingredientName: 'Filet de Bœuf Local',
          currentStock: 1.8,
          minThreshold: 10,
          unit: 'kg',
          supplierName: 'Boucherie Centrale du Centre',
          supplierPhone: '+237 677 88 99 00',
          urgency: 'critique',
        });
        return {
          title: 'Alerte Rupture & Seuil Critique de Stock',
          subject: email.subject,
          html: email.html,
          text: email.text,
          recipientDefault: 'econome@grandgourmet.cm',
        };
      }

      case 'z_report': {
        const email = buildZReportClosureEmail({
          restaurantName: 'Le Grand Gourmet Yaoundé',
          zReportNumber: 'Z-2026-10-22-01',
          date: '22/10/2026 23:30',
          cashierName: 'Sandrine E.',
          supervisorName: 'Arnaud N. (Superviseur)',
          expectedAmountFcfa: 312000,
          countedAmountFcfa: 312000,
          varianceFcfa: 0,
          ordersCount: 42,
          varianceJustification: 'Conforme sans écart de caisse',
        });
        return {
          title: 'Clôture Journalière de Caisse (Rapport Z)',
          subject: email.subject,
          html: email.html,
          text: email.text,
          recipientDefault: 'direction@grandgourmet.cm',
        };
      }

      case 'report_day': {
        const email = buildExecutiveReportEmail({
          restaurantName: 'Le Grand Gourmet Yaoundé',
          directorName: 'M. Fabrice Kemayo (Directeur Général)',
          periodType: 'jour',
          periodLabel: 'Jeudi 22 Octobre 2026',
          totalSalesFcfa: 485000,
          previousPeriodSalesFcfa: 430000,
          ordersCount: 42,
          guestCount: 68,
          averageTicketFcfa: 11547,
          vatFcfa: 77600,
          kitchenSalesFcfa: 345000,
          barSalesFcfa: 140000,
          occupancyRatePercent: 78,
          cashDiscrepancyFcfa: 0,
          notes: 'Service midi très dynamique. Recettes et encaissements équilibrés à 100%.',
          topSellingItems: [
            { name: 'Ndolé Royal Crevettes & Poissons', quantity: 18, revenueFcfa: 153000 },
            { name: 'Poulet DG Traditionnel', quantity: 14, revenueFcfa: 105000 },
            { name: 'Côte de Bœuf Grillée', quantity: 10, revenueFcfa: 95000 },
            { name: 'Cocktail Signature RestoMaster', quantity: 22, revenueFcfa: 44000 },
            { name: 'Bière Locale 65cl', quantity: 30, revenueFcfa: 45000 },
          ],
          paymentBreakdown: [
            { method: 'Espèces', amountFcfa: 262000, percentage: 54 },
            { method: 'Carte Bancaire (TPE)', amountFcfa: 115000, percentage: 24 },
            { method: 'Orange Money', amountFcfa: 68000, percentage: 14 },
            { method: 'MTN MoMo', amountFcfa: 40000, percentage: 8 },
          ],
          dashboardUrl: window.location.origin,
        });
        return {
          title: 'Bilan Quotidien Exécutif (Jour)',
          subject: email.subject,
          html: email.html,
          text: email.text,
          recipientDefault: 'direction@grandgourmet.cm',
        };
      }

      case 'report_week': {
        const email = buildExecutiveReportEmail({
          restaurantName: 'Le Grand Gourmet Yaoundé',
          directorName: 'M. Fabrice Kemayo (Directeur Général)',
          periodType: 'semaine',
          periodLabel: 'Semaine 43 (19 - 25 Octobre 2026)',
          totalSalesFcfa: 3120000,
          previousPeriodSalesFcfa: 2850000,
          ordersCount: 264,
          guestCount: 445,
          averageTicketFcfa: 11818,
          vatFcfa: 499200,
          kitchenSalesFcfa: 2210000,
          barSalesFcfa: 910000,
          occupancyRatePercent: 82,
          cashDiscrepancyFcfa: 0,
          notes: 'Hausse de +9,5% du chiffre d’affaires hebdomadaire. Excellent rendement terrasse.',
          topSellingItems: [
            { name: 'Ndolé Royal Crevettes & Poissons', quantity: 112, revenueFcfa: 952000 },
            { name: 'Poulet DG Traditionnel', quantity: 89, revenueFcfa: 667500 },
            { name: 'Côte de Bœuf Grillée', quantity: 62, revenueFcfa: 589000 },
            { name: 'Cocktails Maison & Vins', quantity: 140, revenueFcfa: 420000 },
            { name: 'Bières & Boissons Fraîches', quantity: 215, revenueFcfa: 322500 },
          ],
          paymentBreakdown: [
            { method: 'Espèces', amountFcfa: 1650000, percentage: 53 },
            { method: 'Carte Bancaire (TPE)', amountFcfa: 780000, percentage: 25 },
            { method: 'Orange Money', amountFcfa: 430000, percentage: 14 },
            { method: 'MTN MoMo', amountFcfa: 260000, percentage: 8 },
          ],
          dashboardUrl: window.location.origin,
        });
        return {
          title: 'Synthèse Hebdomadaire Consolidée (Semaine)',
          subject: email.subject,
          html: email.html,
          text: email.text,
          recipientDefault: 'direction@grandgourmet.cm',
        };
      }

      case 'report_month': {
        const email = buildExecutiveReportEmail({
          restaurantName: 'Le Grand Gourmet Yaoundé',
          directorName: 'M. Fabrice Kemayo (Directeur Général)',
          periodType: 'mois',
          periodLabel: "Mois d'Octobre 2026",
          totalSalesFcfa: 13450000,
          previousPeriodSalesFcfa: 12200000,
          ordersCount: 1120,
          guestCount: 1890,
          averageTicketFcfa: 12008,
          vatFcfa: 2152000,
          kitchenSalesFcfa: 9550000,
          barSalesFcfa: 3900000,
          occupancyRatePercent: 85,
          cashDiscrepancyFcfa: 0,
          notes: 'Mois record. Bilan comptable SYSCOHADA prêt pour télétransmission fiscale.',
          topSellingItems: [
            { name: 'Ndolé Royal Crevettes & Poissons', quantity: 460, revenueFcfa: 3910000 },
            { name: 'Poulet DG Traditionnel', quantity: 380, revenueFcfa: 2850000 },
            { name: 'Côte de Bœuf Grillée', quantity: 270, revenueFcfa: 2565000 },
            { name: 'Cocktails & Vins Fins', quantity: 580, revenueFcfa: 1740000 },
            { name: 'Boissons & Cafés', quantity: 890, revenueFcfa: 1335000 },
          ],
          paymentBreakdown: [
            { method: 'Espèces', amountFcfa: 6994000, percentage: 52 },
            { method: 'Carte Bancaire (TPE)', amountFcfa: 3497000, percentage: 26 },
            { method: 'Orange Money', amountFcfa: 1883000, percentage: 14 },
            { method: 'MTN MoMo', amountFcfa: 1076000, percentage: 8 },
          ],
          dashboardUrl: window.location.origin,
        });
        return {
          title: 'Bilan Mensuel Stratégique & SYSCOHADA (Mois)',
          subject: email.subject,
          html: email.html,
          text: email.text,
          recipientDefault: 'direction@grandgourmet.cm',
        };
      }

      default:
        return getEmailDataForTemplate('activation');
    }
  };

  const catalogTemplates = [
    {
      id: 'report_day',
      icon: Crown,
      badge: 'Direction · Jour',
      title: 'Bilan Quotidien Exécutif (Jour)',
      desc: "Synthèse analytique envoyée chaque soir au directeur : CA réalisé, panier moyen, couverts, top 5 plats et ventilation des règlements.",
      color: 'amber',
    },
    {
      id: 'report_week',
      icon: Crown,
      badge: 'Direction · Semaine',
      title: 'Synthèse Hebdomadaire Consolidée (Semaine)',
      desc: "Bilan des 7 derniers jours avec calcul automatique de l'évolution % vs semaine précédente, affluence moyenne et performances bar/cuisine.",
      color: 'blue',
    },
    {
      id: 'report_month',
      icon: Crown,
      badge: 'Direction · Mois',
      title: 'Bilan Mensuel Stratégique & SYSCOHADA (Mois)',
      desc: "Rapport mensuel consolidé : CA HT/TTC, TVA 19,25% (TVA+CAC), marge brute théorique et indicateurs clés de rentabilité.",
      color: 'emerald',
    },
    {
      id: 'activation',
      icon: KeyRound,
      badge: 'Activation & Onboarding',
      title: 'Activation Restaurant & Identifiants Propriétaire',
      desc: "Transmis automatiquement dès la validation d'une nouvelle souscription. Contient le code unique de l'établissement, l'adresse e-mail et le mot de passe initial.",
      color: 'amber',
    },
    {
      id: 'reservation',
      icon: UtensilsCrossed,
      badge: 'Réservations & Accueil',
      title: 'Confirmation de Réservation de Table',
      desc: "Envoyé au client dès la confirmation d'une table avec numéro de réservation, date, heure, nombre de couverts et demandes particulières.",
      color: 'blue',
    },
    {
      id: 'receipt',
      icon: Receipt,
      badge: 'Caisse & Facturation',
      title: 'Ticket de Caisse & Reçu Électronique Certifié',
      desc: "Reçu dématérialisé avec détail complet des plats et boissons, montants TTC/HT, TVA ventilée et références fiscales conformes.",
      color: 'emerald',
    },
    {
      id: 'order_ready',
      icon: BellRing,
      badge: 'KDS & Service en Salle',
      title: 'Notification Commande Prête au Passe',
      desc: "Alerte instantanée pour les serveurs et le chef de salle lorsque la cuisine ou le bar signale que les plats de la table sont prêts.",
      color: 'purple',
    },
    {
      id: 'low_stock',
      icon: AlertTriangle,
      badge: 'Gestion des Stocks',
      title: 'Alerte Rupture & Seuil Critique Ingrédients',
      desc: "Déclenché dès qu'un ingrédient de recette descend sous son stock de sécurité, alertant l'économe et le chef exécutif.",
      color: 'rose',
    },
    {
      id: 'z_report',
      icon: FileSpreadsheet,
      badge: 'Finances & Superviseur',
      title: 'Rapport Z de Clôture Journalière de Caisse',
      desc: "Rapport consolidé envoyé à la direction à la clôture de chaque caisse avec CA, ventilation par mode de paiement et écarts de caisse.",
      color: 'cyan',
    },
  ];

  const handleOpenPreview = (templateId: string) => {
    setSelectedPreview(getEmailDataForTemplate(templateId));
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* En-tête Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              RestoMaster Mail Engine
            </span>
            <span className="text-xs text-slate-400">· Passerelle Gratuite Google Apps Script (100 emails/j)</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Mail className="w-6 h-6 text-amber-500" />
            E-mails & Gabarits Certifiés
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Système universel de notification par courrier électronique pour les restaurants : onboarding des propriétaires, tickets de caisse dématérialisés, confirmations de table et clôtures journalières.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedConfig?.webhookUrl ? (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Passerelle GAS Connectée</span>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('TEST_BENCH')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold transition cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span>Configurer Webhook GAS</span>
            </button>
          )}
        </div>
      </div>

      {/* Barre d'Onglets */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('CATALOG')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'CATALOG'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Catalogue des Modèles ({catalogTemplates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TEST_BENCH')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'TEST_BENCH'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Passerelle & Banc de Test Réel</span>
        </button>

        <button
          onClick={() => setActiveTab('SETUP_GUIDE')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'SETUP_GUIDE'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Script Google Apps Script (Gratuit)</span>
        </button>
      </div>

      {/* ONGLET 1 : CATALOGUE DES MODÈLES */}
      {activeTab === 'CATALOG' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {catalogTemplates.map((tpl) => {
              const IconComp = tpl.icon;
              return (
                <div
                  key={tpl.id}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all duration-200 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {tpl.badge}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-white leading-snug group-hover:text-amber-400 transition-colors">
                      {tpl.title}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {tpl.desc}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenPreview(tpl.id)}
                    className="w-full py-2.5 bg-slate-800/80 hover:bg-amber-500 text-slate-200 hover:text-slate-950 font-extrabold text-xs rounded-2xl transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-sm group/btn"
                  >
                    <Eye className="w-4 h-4 text-amber-400 group-hover/btn:text-slate-950 transition-colors" />
                    <span>Prévisualiser ce Modèle</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ONGLET 2 : BANC DE TEST RÉEL & CONFIGURATION */}
      {activeTab === 'TEST_BENCH' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Colonne Gauche : Configuration du Webhook */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center space-x-2.5 text-white">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="font-black text-sm">Passerelle Google Apps Script</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Permet l'envoi direct d'e-mails sans abonnement Firebase Blaze ni carte bancaire, grâce au quota gratuit de 100 e-mails/jour de Google Workspace.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                URL du Webhook de Déploiement :
              </label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <button
              type="button"
              disabled={isSavingConfig}
              onClick={handleSaveConfig}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 text-xs font-black rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              {isSavingConfig ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Enregistrer la Passerelle</span>
                </>
              )}
            </button>

            {configMessage && (
              <div
                className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                  configMessage.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/40 border border-rose-800 text-rose-300'
                }`}
              >
                {configMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{configMessage.text}</span>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Statut :</span>
                <span className={savedConfig?.webhookUrl ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                  {savedConfig?.webhookUrl ? 'Prêt à émettre' : 'Non configuré'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Quota Gratuit :</span>
                <span className="text-white font-mono">100 envois / jour</span>
              </div>
              <div className="flex justify-between">
                <span>Protocole :</span>
                <span className="text-white font-mono">HTTPS POST / JSON</span>
              </div>
            </div>
          </div>

          {/* Colonne Droite : Banc d'Expédition de Test en Direct */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center space-x-2.5 text-white">
              <Send className="w-5 h-5 text-amber-500" />
              <h3 className="font-black text-sm">Expédition Immédiate de Test en Boîte Réelle</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Sélectionnez un modèle et saisissez votre adresse pour recevoir le rendu HTML5 exact dans votre boîte de réception (Gmail, Outlook, smartphone Android ou iOS).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Modèle à tester :</label>
                <select
                  value={benchTemplate}
                  onChange={(e) => setBenchTemplate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  {catalogTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Adresse e-mail destinataire :</label>
                <input
                  type="email"
                  value={benchEmail}
                  onChange={(e) => setBenchEmail(e.target.value)}
                  placeholder="votre.email@domaine.com"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={benchSending}
                onClick={async () => {
                  if (!benchEmail || !benchEmail.includes('@')) {
                    setBenchStatus({
                      type: 'error',
                      message: 'Veuillez saisir une adresse e-mail valide.',
                    });
                    return;
                  }

                  setBenchSending(true);
                  setBenchStatus(null);
                  try {
                    const data = getEmailDataForTemplate(benchTemplate);
                    const res = await gasEmailService.sendEmail({
                      to: benchEmail.trim(),
                      subject: `[TEST LIVE] ${data.subject}`,
                      htmlBody: data.html,
                    });

                    if (res.success) {
                      setBenchStatus({
                        type: 'success',
                        message: `E-mail transmis avec succès à ${benchEmail} ! (${res.message})`,
                      });
                    } else {
                      setBenchStatus({
                        type: 'error',
                        message: `Échec d'envoi GAS : ${res.message}`,
                      });
                    }
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Erreur réseau';
                    setBenchStatus({
                      type: 'error',
                      message: `Erreur: ${msg}`,
                    });
                  } finally {
                    setBenchSending(false);
                  }
                }}
                className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/20"
              >
                {benchSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Expédier le Test Réel</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleOpenPreview(benchTemplate)}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              >
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Ouvrir l'Aperçu Complet (Desktop & Mobile)</span>
              </button>
            </div>

            {benchStatus && (
              <div
                className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 ${
                  benchStatus.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300 font-semibold'
                    : 'bg-rose-950/40 border border-rose-800 text-rose-300'
                }`}
              >
                {benchStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{benchStatus.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ONGLET 3 : SCRIPT GOOGLE APPS SCRIPT À COPIER */}
      {activeTab === 'SETUP_GUIDE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Code Source Google Apps Script (Code.gs)
              </h3>
              <p className="text-xs text-slate-400">
                Collez ce code dans un projet Google Apps Script lié à votre compte Gmail pour activer le relai d'e-mails gratuit.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyScript}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/20 shrink-0"
            >
              {copiedScript ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Code Copié dans le Presse-Papier !</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-950" />
                  <span>Copier le Script Google Apps</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl">
                <span className="font-extrabold text-amber-400 block mb-1">Étape 1 :</span>
                <span className="text-slate-400">Rendez-vous sur <strong className="text-white">script.google.com</strong> et créez un nouveau projet.</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl">
                <span className="font-extrabold text-amber-400 block mb-1">Étape 2 :</span>
                <span className="text-slate-400">Supprimez le code par défaut et collez le script ci-dessous. Enregistrez (Ctrl+S).</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl">
                <span className="font-extrabold text-amber-400 block mb-1">Étape 3 :</span>
                <span className="text-slate-400">Cliquez sur <strong className="text-white">Déployer &gt; Nouveau déploiement &gt; Application Web</strong>.</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl">
                <span className="font-extrabold text-amber-400 block mb-1">Étape 4 :</span>
                <span className="text-slate-400">Réglez l'accès sur <strong className="text-white">"Tout le monde" (Anyone)</strong> et copiez l'URL de l'application web.</span>
              </div>
            </div>

            <pre className="p-5 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[460px] overflow-y-auto border border-slate-800 shadow-inner">
              {gasEmailService.getGoogleAppsScriptCode()}
            </pre>
          </div>
        </div>
      )}

      {/* MODALE D'APERÇU STYLE PRESTIGE */}
      <EmailPreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        emailData={selectedPreview}
      />
    </div>
  );
};
