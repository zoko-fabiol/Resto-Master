import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../../context/RestaurantContext';
import { useToast } from '../../../context/ToastContext';
import {
  Mail,
  Zap,
  Send,
  Copy,
  Check,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Crown,
  TrendingUp,
  FileSpreadsheet,
  AlertTriangle,
  Receipt,
  UtensilsCrossed,
  BellRing,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Monitor,
  Code2,
  X,
} from 'lucide-react';
import {
  restaurantEmailService,
  RestaurantEmailSettings,
} from '../../../services/email/restaurantEmailService';
import {
  buildTableReservationEmail,
  buildCashReceiptEmail,
  buildLowStockAlertEmail,
  buildZReportClosureEmail,
  buildOrderReadyEmail,
  buildExecutiveReportEmail,
} from '../../../services/email/emailTemplates';

export const RestaurantEmailConfigSection: React.FC = () => {
  const { activeRestaurant, updateSettings, settings } = useRestaurant();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Configuration e-mail
  const [webhookUrl, setWebhookUrl] = useState('');
  const [senderName, setSenderName] = useState('');
  const [stockAlertEnabled, setStockAlertEnabled] = useState(true);
  const [stockAlertRecipient, setStockAlertRecipient] = useState('');
  const [reservationConfirmationEnabled, setReservationConfirmationEnabled] = useState(true);
  const [digitalReceiptEnabled, setDigitalReceiptEnabled] = useState(true);
  const [zReportEmailEnabled, setZReportEmailEnabled] = useState(true);
  const [zReportRecipient, setZReportRecipient] = useState('');
  const [orderReadyEnabled, setOrderReadyEnabled] = useState(false);

  // Rapports Directeur (Jour, Semaine, Mois)
  const [directorReportEnabled, setDirectorReportEnabled] = useState(true);
  const [directorReportFrequency, setDirectorReportFrequency] = useState<'jour' | 'semaine' | 'mois' | 'tous'>('tous');
  const [directorEmailRecipient, setDirectorEmailRecipient] = useState('');

  // Banc de Test
  const [testRecipient, setTestRecipient] = useState('');
  const [testTemplate, setTestTemplate] = useState('stock_alert');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modale de prévisualisation
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<string>('stock_alert');
  const [deviceMode, setDeviceMode] = useState<'DESKTOP' | 'MOBILE'>('DESKTOP');
  const [previewView, setPreviewView] = useState<'RENDER' | 'HTML'>('RENDER');
  const [copiedHtml, setCopiedHtml] = useState(false);

  const restaurantId = activeRestaurant?.id || settings.restaurantId || '';
  const restaurantName = activeRestaurant?.name || settings.name || 'Notre Restaurant';

  useEffect(() => {
    loadEmailConfig();
  }, [restaurantId]);

  const loadEmailConfig = async () => {
    setLoading(true);
    try {
      const config = await restaurantEmailService.getEmailSettings(restaurantId);
      if (config.gasWebhookUrl) setWebhookUrl(config.gasWebhookUrl);
      if (config.senderName) setSenderName(config.senderName);
      else setSenderName(restaurantName);

      if (config.stockAlertEnabled !== undefined) setStockAlertEnabled(config.stockAlertEnabled);
      if (config.stockAlertRecipient) setStockAlertRecipient(config.stockAlertRecipient);
      else if (activeRestaurant?.email) setStockAlertRecipient(activeRestaurant.email);

      if (config.reservationConfirmationEnabled !== undefined) {
        setReservationConfirmationEnabled(config.reservationConfirmationEnabled);
      }
      if (config.digitalReceiptEnabled !== undefined) {
        setDigitalReceiptEnabled(config.digitalReceiptEnabled);
      }
      if (config.zReportEmailEnabled !== undefined) {
        setZReportEmailEnabled(config.zReportEmailEnabled);
      }
      if (config.zReportRecipient) setZReportRecipient(config.zReportRecipient);
      else if (activeRestaurant?.email) setZReportRecipient(activeRestaurant.email);

      if (config.orderReadyEnabled !== undefined) {
        setOrderReadyEnabled(config.orderReadyEnabled);
      }

      if (config.directorReportEnabled !== undefined) {
        setDirectorReportEnabled(config.directorReportEnabled);
      }
      if (config.directorReportFrequency) {
        setDirectorReportFrequency(config.directorReportFrequency);
      }
      if (config.directorEmailRecipient) {
        setDirectorEmailRecipient(config.directorEmailRecipient);
      } else if (activeRestaurant?.email) {
        setDirectorEmailRecipient(activeRestaurant.email);
      }
    } catch (err) {
      console.warn('Erreur chargement configuration e-mail restaurant:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (webhookUrl && !webhookUrl.trim().startsWith('https://script.google.com/macros/s/')) {
      showToast({
        type: 'warning',
        title: 'URL de Webhook non conforme',
        message: "L'URL doit obligatoirement commencer par 'https://script.google.com/macros/s/'",
      });
      return;
    }

    setSaving(true);
    try {
      const newConfig: RestaurantEmailSettings = {
        gasWebhookUrl: webhookUrl.trim(),
        senderName: senderName.trim() || restaurantName,
        stockAlertEnabled,
        stockAlertRecipient: stockAlertRecipient.trim(),
        reservationConfirmationEnabled,
        digitalReceiptEnabled,
        zReportEmailEnabled,
        zReportRecipient: zReportRecipient.trim(),
        orderReadyEnabled,
        directorReportEnabled,
        directorReportFrequency,
        directorEmailRecipient: directorEmailRecipient.trim(),
      };

      await restaurantEmailService.saveEmailSettings(restaurantId, newConfig);
      await updateSettings({ emailConfig: newConfig });

      showToast({
        type: 'success',
        title: 'Configuration E-mail Enregistrée',
        message: 'La passerelle Google Apps Script et les alertes du restaurant sont à jour.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: msg,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyScript = async () => {
    try {
      const script = restaurantEmailService.generateGoogleAppsScriptCode(restaurantName);
      await navigator.clipboard.writeText(script);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
      showToast({
        type: 'success',
        title: 'Script Copié dans le Presse-Papier',
        message: 'Collez ce code dans script.google.com et déployez en Application Web.',
      });
    } catch {
      setCopiedScript(false);
    }
  };

  const getTemplateData = (templateId: string) => {
    switch (templateId) {
      case 'stock_alert':
        return {
          title: 'Alerte Rupture & Seuil Critique de Stock',
          email: buildLowStockAlertEmail({
            restaurantName,
            ingredientName: 'Filet de Bœuf Local',
            currentStock: 2.2,
            minThreshold: 10,
            unit: 'kg',
            supplierName: 'Boucherie Centrale',
            supplierPhone: '+237 677 00 11 22',
            urgency: 'critique',
          }),
        };

      case 'reservation':
        return {
          title: 'Confirmation de Réservation de Table',
          email: buildTableReservationEmail({
            customerName: 'Mme. Marie Nguema',
            restaurantName,
            reservationNumber: 'RES-4412',
            date: 'Samedi 24 Octobre 2026',
            time: '20:00',
            guestCount: 4,
            tableName: 'Table VIP Terrasse N°8',
            specialRequests: 'Vue dégagée, anniversaire de mariage.',
            depositAmountFcfa: 15000,
          }),
        };

      case 'receipt':
        return {
          title: 'Ticket de Caisse Dématérialisé (Reçu Client)',
          email: buildCashReceiptEmail({
            customerName: 'Client Comptoir',
            restaurantName,
            receiptNumber: 'TK-2026-0189',
            date: '22/10/2026 14:30',
            paymentMethod: 'Orange Money / Espèces',
            subtotalFcfa: 18500,
            vatFcfa: 3560,
            totalTtcFcfa: 22060,
            cashierName: 'Caissier Principal',
            dgiChainHash: 'SHA256-DGI-890B42A1',
            items: [
              { name: 'Ndolé Royal Crevettes & Poissons', quantity: 1, totalFcfa: 8500 },
              { name: 'Poulet DG aux Plantains', quantity: 1, totalFcfa: 7500 },
              { name: 'Cocktail Maison Frais', quantity: 2, totalFcfa: 3000 },
            ],
          }),
        };

      case 'z_report':
        return {
          title: 'Clôture Journalière de Caisse (Rapport Z)',
          email: buildZReportClosureEmail({
            restaurantName,
            zReportNumber: 'Z-2026-10-22-01',
            date: '22/10/2026 23:30',
            cashierName: 'Équipe Caisse Soir',
            supervisorName: 'Superviseur de Salle',
            expectedAmountFcfa: 385000,
            countedAmountFcfa: 385000,
            varianceFcfa: 0,
            ordersCount: 38,
            varianceJustification: 'Caisse équilibrée à 100%',
          }),
        };

      case 'order_ready':
        return {
          title: 'Alerte Commande Prête au Passe (KDS)',
          email: buildOrderReadyEmail({
            customerName: 'Table 6 (Terrasse)',
            restaurantName,
            orderNumber: 'CMD-0089',
            orderType: 'sur_place',
            tableName: 'Table 6 (Terrasse)',
            itemsSummary: '2x Steak Frites, 1x Salade César, 2x Eau Minérale',
            pickupCounter: 'Passe Chaud Cuisine',
          }),
        };

      case 'report_day':
        return {
          title: 'Bilan Journalier Exécutif (Jour)',
          email: buildExecutiveReportEmail({
            restaurantName,
            directorName: 'Direction Générale',
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
            notes: 'Excellente affluence au service du midi. Zéro incident de caisse.',
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
          }),
        };

      case 'report_week':
        return {
          title: 'Synthèse Hebdomadaire Consolidée (Semaine)',
          email: buildExecutiveReportEmail({
            restaurantName,
            directorName: 'Direction Générale',
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
            notes: 'Croissance de +9,5% portée par les banquets et la terrasse du vendredi soir.',
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
          }),
        };

      case 'report_month':
        return {
          title: 'Bilan Mensuel Stratégique & SYSCOHADA (Mois)',
          email: buildExecutiveReportEmail({
            restaurantName,
            directorName: 'Direction Générale',
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
            notes: 'Mois record. TVA nette à déclarer le 15 novembre. Rapprochement bancaire conforme.',
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
          }),
        };

      default:
        return getTemplateData('stock_alert');
    }
  };

  const handleSendTest = async () => {
    if (!testRecipient || !testRecipient.includes('@')) {
      setTestStatus({
        type: 'error',
        message: 'Veuillez saisir une adresse e-mail valide pour le test.',
      });
      return;
    }

    setIsSendingTest(true);
    setTestStatus(null);

    try {
      const data = getTemplateData(testTemplate);
      const res = await restaurantEmailService.sendEmail({
        restaurantId,
        restaurantName,
        webhookUrl: webhookUrl.trim(),
        to: testRecipient.trim(),
        subject: `[TEST RESTAURANT] ${data.email.subject}`,
        htmlBody: data.email.html,
        textBody: data.email.text,
      });

      if (res.success) {
        setTestStatus({
          type: 'success',
          message: `E-mail de test transmis avec succès à ${testRecipient} !`,
        });
      } else {
        setTestStatus({
          type: 'error',
          message: `Échec de l'envoi : ${res.message}. Vérifiez le paramétrage "Tout le monde" sur Google Apps Script.`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau';
      setTestStatus({ type: 'error', message: msg });
    } finally {
      setIsSendingTest(false);
    }
  };

  const activePreviewData = getTemplateData(previewTemplate);

  if (loading) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
        <span className="text-xs text-slate-500 font-semibold">Chargement des paramètres d'e-mails...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. En-tête Principal & État de la Passerelle */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black shadow-inner shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Passerelle E-mails Google Apps Script (Restaurant)
              </h2>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                100 E-mails/Jour Gratuits
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Expédiez automatiquement les alertes de seuil de stock, les confirmations de table, les reçus numériques de caisse et les rapports Z avec votre propre boîte Gmail ou Google Workspace, sans abonnement payant ni carte bancaire.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          {webhookUrl ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Passerelle Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Passerelle Plateforme par Défaut</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Bloc de Configuration Webhook & Copie du Script */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              1. Déploiement du Script Google Apps Script
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Copiez ce script personnalisé avec l'identité de <strong>{restaurantName}</strong> et publiez-le sur votre compte Google.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyScript}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
          >
            {copiedScript ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Script Copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-amber-400" />
                <span>Copier le Code Google Apps Script</span>
              </>
            )}
          </button>
        </div>

        {/* 4 Étapes Visuelles de Mise en Service */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Étape 1</span>
            <div className="font-bold text-slate-900">Ouvrez Google Script</div>
            <p className="text-[11px] text-slate-500">
              Allez sur <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">script.google.com</a> et créez un « Nouveau projet ».
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Étape 2</span>
            <div className="font-bold text-slate-900">Collez le Code</div>
            <p className="text-[11px] text-slate-500">
              Effacez le contenu de <code>Code.gs</code>, collez le script copié et enregistrez (<kbd>Ctrl+S</kbd>).
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Étape 3</span>
            <div className="font-bold text-slate-900">Déployez en Web App</div>
            <p className="text-[11px] text-slate-500">
              Cliquez sur <strong>Déployer &gt; Nouveau déploiement</strong>, type <strong>Application Web</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-1">
            <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Étape 4 (Cruciale)</span>
            <div className="font-bold text-amber-950">Accès : Tout le monde</div>
            <p className="text-[11px] text-amber-800">
              Réglez <em>"Qui a accès"</em> sur <strong>"Tout le monde" (Anyone)</strong>, puis collez l'URL ci-dessous.
            </p>
          </div>
        </div>

        {/* Champ Saisie Webhook & Nom Expéditeur */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              URL du Webhook Google Apps Script du Restaurant :
            </label>
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Nom d'Expéditeur Affiché :
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder={restaurantName}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveSettings}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enregistrement en cours...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Enregistrer la Passerelle E-mail</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Déclencheurs Automatiques Métier */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            2. Événements Déclencheurs & Notifications Automatiques
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Définissez quels événements déclenchent l'expédition d'un e-mail certifié depuis le restaurant.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Règle Exécutive 0 : Rapport Complet Direction (Jour, Semaine, Mois) */}
          <div className="md:col-span-2 p-5 rounded-2xl border-2 border-amber-500/30 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-slate-50 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-sm text-slate-900">
                      Rapport Complet de Gestion pour la Direction Générale
                    </h4>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300">
                      Exécutif & Comptable
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Synthèse analytique automatisée : Chiffre d'affaires brut/net, panier moyen, couverts, top 5 des plats, TVA 19,25% et ventilation des paiements (Espèces, CB, MoMo).
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={directorReportEnabled}
                onChange={(e) => setDirectorReportEnabled(e.target.checked)}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer shrink-0"
              />
            </div>

            {directorReportEnabled && (
              <div className="pt-3 border-t border-amber-200/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Adresse e-mail du Directeur Général / Propriétaire :
                  </label>
                  <input
                    type="email"
                    value={directorEmailRecipient}
                    onChange={(e) => setDirectorEmailRecipient(e.target.value)}
                    placeholder="directeur@restaurant.com"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Périodicité d'envoi automatique :
                  </label>
                  <select
                    value={directorReportFrequency}
                    onChange={(e) => setDirectorReportFrequency(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="tous">Tous les rapports (Jour, Semaine & Mois)</option>
                    <option value="jour">Quotidien uniquement (Fin de journée)</option>
                    <option value="semaine">Hebdomadaire uniquement (Chaque lundi)</option>
                    <option value="mois">Mensuel uniquement (1er du mois)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          
          {/* Règle 1 : Alerte Seuil Critique Stock */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Alerte Seuil Critique de Stock</h4>
                  <p className="text-[11px] text-slate-500">Expédié dès qu'un ingrédient passe sous le seuil d'alerte</p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={stockAlertEnabled}
                onChange={(e) => setStockAlertEnabled(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer mt-1"
              />
            </div>

            {stockAlertEnabled && (
              <div className="pt-2 border-t border-slate-200/60">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  E-mail destinataire (Économe / Chef) :
                </label>
                <input
                  type="email"
                  value={stockAlertRecipient}
                  onChange={(e) => setStockAlertRecipient(e.target.value)}
                  placeholder="econome@restaurant.com"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 font-medium"
                />
              </div>
            )}
          </div>

          {/* Règle 2 : Clôture Journalière Caisse (Rapport Z) */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Clôture Journalière de Caisse (Rapport Z)</h4>
                  <p className="text-[11px] text-slate-500">Envoyé à la direction lors de la fermeture de caisse</p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={zReportEmailEnabled}
                onChange={(e) => setZReportEmailEnabled(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer mt-1"
              />
            </div>

            {zReportEmailEnabled && (
              <div className="pt-2 border-t border-slate-200/60">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  E-mail destinataire (Direction / Gérant) :
                </label>
                <input
                  type="email"
                  value={zReportRecipient}
                  onChange={(e) => setZReportRecipient(e.target.value)}
                  placeholder="direction@restaurant.com"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 font-medium"
                />
              </div>
            )}
          </div>

          {/* Règle 3 : Confirmation Réservation de Table */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Confirmation de Réservation de Table</h4>
                  <p className="text-[11px] text-slate-500">Envoyé directement au client avec numéro de résa et couverts</p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={reservationConfirmationEnabled}
                onChange={(e) => setReservationConfirmationEnabled(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer mt-1"
              />
            </div>
          </div>

          {/* Règle 4 : Ticket de Caisse Dématérialisé */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Ticket de Caisse & Reçu Électronique</h4>
                  <p className="text-[11px] text-slate-500">Permet au caissier d'envoyer le reçu par e-mail en 1 clic</p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={digitalReceiptEnabled}
                onChange={(e) => setDigitalReceiptEnabled(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer mt-1"
              />
            </div>
          </div>

        </div>
      </div>

      {/* 4. Banc de Test & Aperçu en Direct des Modèles */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-amber-500" />
              3. Banc de Test d'Expédition & Catalogue des Gabarits
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Prévisualisez chaque modèle aux couleurs de <strong>{restaurantName}</strong> et testez l'expédition en boîte réelle.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Modèle à tester :</label>
            <select
              value={testTemplate}
              onChange={(e) => setTestTemplate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 text-slate-800"
            >
              <optgroup label="👑 Rapports pour la Direction Générale">
                <option value="report_day">📊 Bilan Quotidien Exécutif (Jour)</option>
                <option value="report_week">📈 Synthèse Hebdomadaire Consolidée (Semaine)</option>
                <option value="report_month">🏆 Bilan Mensuel Stratégique & SYSCOHADA (Mois)</option>
              </optgroup>
              <optgroup label="⚡ Alertes & Opérations Quotidiennes">
                <option value="stock_alert">⚠️ Alerte Seuil Critique de Stock</option>
                <option value="reservation">🍽️ Confirmation Réservation de Table</option>
                <option value="receipt">🧾 Ticket de Caisse Dématérialisé</option>
                <option value="z_report">📊 Rapport Z Clôture de Caisse</option>
                <option value="order_ready">🔔 Commande Prête (Passe KDS)</option>
              </optgroup>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">E-mail de test :</label>
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="votre.email@domaine.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              disabled={isSendingTest}
              onClick={handleSendTest}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {isSendingTest ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-amber-400" />
                  <span>Tester l'Envoi Réel</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setPreviewTemplate(testTemplate);
                setPreviewOpen(true);
              }}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
              title="Ouvrir l'Aperçu Graphique"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>

        {testStatus && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
              testStatus.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {testStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{testStatus.message}</span>
          </div>
        )}
      </div>

      {/* 5. Modale de Prévisualisation Responsive (Desktop/Mobile) */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden text-slate-100">
            
            {/* Modal Header */}
            <div className="bg-slate-950 border-b border-slate-800 px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider">
                    {restaurantName} · Gabarit Responsive
                  </div>
                  <h3 className="font-bold text-sm text-white">
                    {activePreviewData.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Device Switcher */}
                <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setDeviceMode('DESKTOP')}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      deviceMode === 'DESKTOP'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Vue Ordinateur (600px)"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceMode('MOBILE')}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      deviceMode === 'MOBILE'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Vue Smartphone (375px)"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* View Switcher */}
                <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewView('RENDER')}
                    className={`px-2.5 py-1 rounded-lg transition-all text-xs font-bold ${
                      previewView === 'RENDER' ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Visuel
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewView('HTML')}
                    className={`px-2.5 py-1 rounded-lg transition-all text-xs font-bold ${
                      previewView === 'HTML' ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    HTML
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Email Subject Bar */}
            <div className="bg-slate-950/60 border-b border-slate-800 px-5 py-2 text-xs text-slate-400 flex items-center justify-between">
              <div className="truncate">
                <span className="font-bold text-slate-500 mr-2 uppercase text-[10px]">Objet :</span>
                <span className="text-slate-200 font-semibold">{activePreviewData.email.subject}</span>
              </div>
              <span className="text-[11px] text-emerald-400 shrink-0">HTML5 Responsive</span>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 flex justify-center items-start">
              {previewView === 'RENDER' ? (
                <div
                  className={`bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden transition-all duration-300 ${
                    deviceMode === 'MOBILE' ? 'w-[375px]' : 'w-full max-w-[620px]'
                  }`}
                >
                  {deviceMode === 'MOBILE' && (
                    <div className="bg-slate-950 text-slate-400 px-4 py-1.5 text-[10px] font-mono flex items-center justify-between border-b border-slate-800">
                      <span>14:32</span>
                      <span>RestoMaster Mail · 100%</span>
                    </div>
                  )}

                  <div
                    className="overflow-x-auto bg-slate-950"
                    dangerouslySetInnerHTML={{ __html: activePreviewData.email.html }}
                  />
                </div>
              ) : (
                <div className="w-full max-w-3xl space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Code source HTML généré :</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(activePreviewData.email.html);
                        setCopiedHtml(true);
                        setTimeout(() => setCopiedHtml(false), 2000);
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      {copiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedHtml ? 'Copié !' : 'Copier HTML'}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs whitespace-pre-wrap max-h-[460px] overflow-y-auto border border-slate-800">
                    {activePreviewData.email.html}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-950 border-t border-slate-800 px-5 py-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Gabarit dynamique adapté à <strong>{restaurantName}</strong>
              </span>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Fermer l'aperçu
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
