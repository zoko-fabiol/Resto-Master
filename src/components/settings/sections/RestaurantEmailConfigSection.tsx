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
  const { activeRestaurant, updateSettings, settings, isModuleEntitled } = useRestaurant();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Configuration e-mail
  const [providerMode, setProviderMode] = useState<'restomaster' | 'custom'>('restomaster');
  const [customEmailAddress, setCustomEmailAddress] = useState('');
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
      if (config.providerMode) {
        setProviderMode(config.providerMode);
      } else if (config.gasWebhookUrl && !config.gasWebhookUrl.includes('AKfycbzCyGQ5xmYyFDWWAq0fK0bstffHFUuBqB8EsEcUBGnwzm3WqQLzPPRYuCG_6EKhEYp3')) {
        setProviderMode('custom');
      } else {
        setProviderMode('restomaster');
      }

      if (config.customEmailAddress) {
        setCustomEmailAddress(config.customEmailAddress);
      } else if (activeRestaurant?.email) {
        setCustomEmailAddress(activeRestaurant.email);
      }

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
    if (providerMode === 'custom' && webhookUrl && !webhookUrl.trim().startsWith('https://script.google.com/macros/s/')) {
      showToast({
        type: 'warning',
        title: 'URL de Webhook non conforme',
        message: "L'URL Google Apps Script doit obligatoirement commencer par 'https://script.google.com/macros/s/'",
      });
      return;
    }

    setSaving(true);
    try {
      const newConfig: RestaurantEmailSettings = {
        providerMode,
        customEmailAddress: customEmailAddress.trim(),
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
        message: providerMode === 'custom'
          ? 'Votre propre passerelle e-mail Google Apps Script est activée pour le restaurant.'
          : 'La passerelle mutualisée RestoMaster est sélectionnée par défaut.',
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
      const activeName = senderName.trim() || restaurantName;
      const script = restaurantEmailService.generateGoogleAppsScriptCode(activeName);
      await navigator.clipboard.writeText(script);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
      showToast({
        type: 'success',
        title: 'Script Copié dans le Presse-Papier',
        message: `Code prêt avec l'expéditeur "${activeName}". Collez-le dans Google Apps Script et déployez en Application Web.`,
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
        senderName: senderName.trim() || restaurantName,
        providerMode,
        webhookUrl: webhookUrl.trim(),
        to: testRecipient.trim(),
        subject: `[TEST RESTAURANT] ${data.email.subject}`,
        htmlBody: data.email.html,
        textBody: data.email.text,
      });

      if (res.success) {
        setTestStatus({
          type: 'success',
          message: `E-mail de test transmis avec succès à ${testRecipient} (${providerMode === 'custom' ? 'via votre passerelle Google Apps Script' : 'via la passerelle RestoMaster'}) !`,
        });
      } else {
        setTestStatus({
          type: 'error',
          message: `Échec de l'envoi : ${res.message}. Vérifiez le paramétrage "Tout le monde" sur Google Apps Script si vous utilisez votre propre script.`,
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
      
      {/* 1. Sélecteur du Mode d'Expédition E-mail */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-500" />
              1. Passerelle d'Expédition des E-mails & Notifications
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choisissez comment votre restaurant expédie ses tickets de caisse, alertes de stock et bilans de direction.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            <span>Mode actif :</span>
            <strong className="text-slate-900">
              {providerMode === 'custom' ? 'Mon Propre E-mail (Google Script)' : 'Passerelle RestoMaster'}
            </strong>
          </div>
        </div>

        {/* Choix des Deux Modes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option A : Passerelle RestoMaster */}
          <button
            type="button"
            onClick={() => setProviderMode('restomaster')}
            className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              providerMode === 'restomaster'
                ? 'border-emerald-500 bg-emerald-50/40 shadow-sm'
                : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    providerMode === 'restomaster'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-xs text-slate-900">Passerelle RestoMaster Cloud</h3>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Zéro configuration · Immédiat</span>
                  </div>
                </div>
                {providerMode === 'restomaster' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mt-2">
                Expédition automatique gérée directement par notre infrastructure cloud sécurisée. Prêt à l'emploi en 1 clic sans démarche technique ni script à créer.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Quota : Illimité plateforme</span>
              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                providerMode === 'restomaster'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {providerMode === 'restomaster' ? 'Sélectionné' : 'Choisir ce mode'}
              </span>
            </div>
          </button>

          {/* Option B : E-mail Personnel Restaurant */}
          <button
            type="button"
            onClick={() => setProviderMode('custom')}
            className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              providerMode === 'custom'
                ? 'border-amber-500 bg-amber-50/40 shadow-sm'
                : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    providerMode === 'custom'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-xs text-slate-900">Mon Propre E-mail Restaurant</h3>
                    <span className="text-[10px] font-bold text-amber-700 uppercase">Google Apps Script · Votre Nom</span>
                  </div>
                </div>
                {providerMode === 'custom' && (
                  <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mt-2">
                Les e-mails partent directement depuis la boîte Gmail ou Google Workspace de votre restaurant. Vos clients voient votre véritable adresse et identité.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Quota Google : 100 mails/jour gratuits</span>
              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                providerMode === 'custom'
                  ? 'bg-amber-200 text-amber-900'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {providerMode === 'custom' ? 'Sélectionné' : 'Choisir ce mode'}
              </span>
            </div>
          </button>
        </div>

        {/* Détails et Tutoriel si Option B "Mon Propre E-mail" est sélectionnée */}
        {providerMode === 'custom' && (
          <div className="p-5 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-xs">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-xs text-slate-900">
                    Configuration de votre Script Google Apps Script
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    Suivez ce tutoriel en 4 étapes chrono (environ 2 minutes) pour lier votre boîte Gmail.
                  </p>
                </div>
              </div>

              {/* Boutons d'Action Rapides (1-Clic) */}
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href="https://script.google.com/home/start"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>1. Ouvrir Google Apps Script</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyScript}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer ${
                    copiedScript
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {copiedScript ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Code du Script Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>2. Copier le Code du Script</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tutoriel Pédagogique en 4 Étapes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] flex items-center justify-center">1</span>
                  <span className="font-bold text-xs text-slate-900">Créer le projet</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Cliquez sur <strong>« Ouvrir Google Apps Script »</strong>, puis sur le bouton bleu <strong>« + Nouveau projet »</strong> en haut à gauche.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] flex items-center justify-center">2</span>
                  <span className="font-bold text-xs text-slate-900">Coller le script</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Cliquez sur <strong>« Copier le Code »</strong>, effacez tout le texte dans le fichier <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">Code.gs</code> et collez.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] flex items-center justify-center">3</span>
                  <span className="font-bold text-xs text-slate-900">Déployer en Web App</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Cliquez sur <strong>« Déployer »</strong> &gt; <strong>« Nouveau déploiement »</strong> &gt; Type <strong>« Application Web »</strong>. Qui a accès : <strong>« Tout le monde » (Anyone)</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] flex items-center justify-center">4</span>
                  <span className="font-bold text-xs text-slate-900">Coller l'URL Webhook</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Autorisez l'accès Google, copiez l'URL de l'application Web se terminant par <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">/exec</code> et collez-la ci-dessous.
                </p>
              </div>
            </div>

            {/* Champs de Saisie du Webhook Personnel */}
            <div className="pt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 block">
                    URL du Webhook Google Apps Script du restaurant :
                  </label>
                  {webhookUrl.trim().startsWith('https://script.google.com/macros/s/') && webhookUrl.trim().endsWith('/exec') && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      URL Conforme
                    </span>
                  )}
                </div>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
                <p className="text-[10px] text-slate-500">
                  L'URL doit commencer par <code className="text-slate-700">https://script.google.com/macros/s/</code> et se terminer par <code className="text-slate-700">/exec</code>.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 block">
                  Nom d'expéditeur affiché :
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder={restaurantName}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
                <p className="text-[10px] text-slate-500">
                  Ex: {restaurantName}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveSettings}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Valider & Enregistrer ma Passerelle Google Script</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Confirmation visuelle si Mode RestoMaster Cloud */}
        {providerMode === 'restomaster' && (
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3 text-xs text-emerald-950">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                <strong>Passerelle RestoMaster Cloud activée :</strong> Tous vos e-mails de caisse, alertes et rapports sont acheminés instantanément sans configuration.
              </span>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveSettings}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 transition cursor-pointer"
            >
              {saving ? 'Enregistrement...' : 'Confirmer ce choix'}
            </button>
          </div>
        )}
      </div>

      {/* 2. Déclencheurs Automatiques Métier */}
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
          
          {/* Règle 1 : Alerte Seuil Critique Stock (Conditionnée au module stock) */}
          {isModuleEntitled('mod_stock') && (
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
          )}

          {/* Règle 2 : Clôture Journalière Caisse / Rapport Z (Conditionnée au module caisse) */}
          {isModuleEntitled('mod_caisse') && (
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
          )}

          {/* Règle 3 : Confirmation Réservation de Table (Conditionnée au module tables/réservations) */}
          {isModuleEntitled('mod_tables') && (
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
          )}

          {/* Règle 4 : Ticket de Caisse Dématérialisé (Conditionné au module pos) */}
          {isModuleEntitled('mod_pos') && (
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
          )}

          {/* Règle 5 : Commande Prête Passe KDS (Conditionnée au module cuisine) */}
          {isModuleEntitled('mod_cuisine') && (
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Notification Commande Prête (Passe KDS)</h4>
                    <p className="text-[11px] text-slate-500">Expédié dès que la cuisine ou le bar marque le bon prêt</p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={orderReadyEnabled}
                  onChange={(e) => setOrderReadyEnabled(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer mt-1"
                />
              </div>
            </div>
          )}

        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
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
                <span>Enregistrer les Préférences E-mail</span>
              </>
            )}
          </button>
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
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            <span>Passerelle test :</span>
            <span className={providerMode === 'custom' ? 'text-amber-700' : 'text-emerald-700'}>
              {providerMode === 'custom' ? 'Google Apps Script (Propre)' : 'RestoMaster Cloud'}
            </span>
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
