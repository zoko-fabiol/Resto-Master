import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../../context/RestaurantContext';
import { useToast } from '../../../context/ToastContext';
import {
  MessageSquare,
  Zap,
  Send,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Receipt,
  UtensilsCrossed,
  BellRing,
  Phone,
  Link,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import {
  restaurantWhatsAppService,
  RestaurantWhatsAppSettings,
  formatWhatsAppPhoneNumber,
} from '../../../services/whatsapp/restaurantWhatsAppService';

export const RestaurantWhatsAppConfigSection: React.FC = () => {
  const { activeRestaurant, updateSettings, settings, isModuleEntitled } = useRestaurant();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Configuration WhatsApp
  const [enabled, setEnabled] = useState(true);
  const [restaurantPhoneNumber, setRestaurantPhoneNumber] = useState('');
  const [senderTitle, setSenderTitle] = useState('');
  const [gatewayMode, setGatewayMode] = useState<'automatic_webhook' | 'click_to_chat'>('click_to_chat');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  // Déclencheurs (Alertes Métier)
  const [reservationAlertEnabled, setReservationAlertEnabled] = useState(true);
  const [orderReadyAlertEnabled, setOrderReadyAlertEnabled] = useState(true);
  const [digitalReceiptAlertEnabled, setDigitalReceiptAlertEnabled] = useState(true);

  // Banc de Test
  const [testRecipient, setTestRecipient] = useState('');
  const [testTemplate, setTestTemplate] = useState<'reservation' | 'order_ready' | 'receipt'>('reservation');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const restaurantId = activeRestaurant?.id || settings.restaurantId || '';
  const restaurantName = activeRestaurant?.name || settings.name || 'Notre Restaurant';

  useEffect(() => {
    loadConfig();
  }, [restaurantId]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const config = await restaurantWhatsAppService.getWhatsAppSettings(restaurantId);
      if (config.enabled !== undefined) setEnabled(config.enabled);
      if (config.gatewayMode) setGatewayMode(config.gatewayMode);
      if (config.restaurantPhoneNumber) setRestaurantPhoneNumber(config.restaurantPhoneNumber);
      else if (activeRestaurant?.phone) setRestaurantPhoneNumber(activeRestaurant.phone);

      if (config.senderTitle) setSenderTitle(config.senderTitle);
      else setSenderTitle(restaurantName);

      if (config.webhookUrl) setWebhookUrl(config.webhookUrl);
      if (config.apiKey) setApiKey(config.apiKey);

      if (config.reservationAlertEnabled !== undefined) setReservationAlertEnabled(config.reservationAlertEnabled);
      if (config.orderReadyAlertEnabled !== undefined) setOrderReadyAlertEnabled(config.orderReadyAlertEnabled);
      if (config.digitalReceiptAlertEnabled !== undefined) setDigitalReceiptAlertEnabled(config.digitalReceiptAlertEnabled);
    } catch (err) {
      console.warn('[RestaurantWhatsAppConfig] Erreur lecture config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (gatewayMode === 'automatic_webhook' && webhookUrl && !webhookUrl.trim().startsWith('http')) {
      showToast({
        type: 'warning',
        title: 'URL de Webhook non conforme',
        message: "L'URL de la passerelle WhatsApp doit commencer par http:// ou https://",
      });
      return;
    }

    setSaving(true);
    try {
      const newConfig: RestaurantWhatsAppSettings = {
        enabled,
        restaurantPhoneNumber: restaurantPhoneNumber.trim(),
        senderTitle: senderTitle.trim() || restaurantName,
        gatewayMode,
        webhookUrl: webhookUrl.trim(),
        apiKey: apiKey.trim(),
        reservationAlertEnabled,
        orderReadyAlertEnabled,
        digitalReceiptAlertEnabled,
      };

      await restaurantWhatsAppService.saveWhatsAppSettings(restaurantId, newConfig);
      await updateSettings({
        whatsappConfig: newConfig,
        whatsappGatewayEnabled: enabled,
        whatsappGatewayMode: gatewayMode,
        whatsappPhoneNumber: restaurantPhoneNumber.trim(),
        whatsappSenderTitle: senderTitle.trim(),
        whatsappWebhookUrl: webhookUrl.trim(),
        whatsappApiKey: apiKey.trim(),
        whatsappReservationAlertEnabled: reservationAlertEnabled,
        whatsappOrderReadyAlertEnabled: orderReadyAlertEnabled,
        whatsappReceiptAlertEnabled: digitalReceiptAlertEnabled,
      });

      showToast({
        type: 'success',
        title: 'Configuration WhatsApp Enregistrée',
        message: gatewayMode === 'automatic_webhook'
          ? 'Passerelle WhatsApp automatique activée avec votre propre numéro.'
          : 'Mode 1-Clic WhatsApp actif (zéro configuration requise).',
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

  const handleSendTest = async () => {
    const cleanPhone = formatWhatsAppPhoneNumber(testRecipient);
    if (!cleanPhone || cleanPhone.length < 8) {
      setTestStatus({
        type: 'error',
        message: 'Veuillez saisir un numéro de téléphone valide (ex: 699001122 ou +237699001122).',
      });
      return;
    }

    setIsSendingTest(true);
    setTestStatus(null);

    try {
      let testMessage = '';
      if (testTemplate === 'reservation') {
        testMessage = restaurantWhatsAppService.buildReservationMessage({
          restaurantName,
          customerName: 'Client Test',
          date: new Date().toLocaleDateString('fr-FR'),
          time: '20:00',
          guestCount: 4,
          tableName: 'Table VIP Terrasse N°8',
        });
      } else if (testTemplate === 'order_ready') {
        testMessage = restaurantWhatsAppService.buildOrderReadyMessage({
          restaurantName,
          customerName: 'Client Test',
          orderNumber: 'CMD-104',
          tableName: 'Table 4',
        });
      } else {
        testMessage = restaurantWhatsAppService.buildReceiptMessage({
          restaurantName,
          customerName: 'Client Test',
          receiptNumber: 'TK-2026-0042',
          date: new Date().toLocaleDateString('fr-FR') + ' 13:45',
          totalFcfa: 18500,
          paymentMethod: 'Orange Money / Espèces',
        });
      }

      const res = await restaurantWhatsAppService.sendMessage({
        restaurantId,
        restaurantName,
        to: testRecipient.trim(),
        message: testMessage,
        openInBrowser: gatewayMode === 'click_to_chat',
      });

      if (res.success) {
        setTestStatus({
          type: 'success',
          message: res.mode === 'automatic_webhook'
            ? `Message WhatsApp transmis automatiquement en tâche de fond à ${cleanPhone} !`
            : `Lien WhatsApp ouvert avec succès pour ${cleanPhone}. Cliquez sur "Envoyer" dans WhatsApp.`,
        });
      } else {
        setTestStatus({
          type: 'error',
          message: `Échec : ${res.message}`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau';
      setTestStatus({ type: 'error', message: msg });
    } finally {
      setIsSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
        <span className="text-xs text-slate-500 font-semibold">Chargement des paramètres WhatsApp...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Sélecteur de Mode WhatsApp */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              1. Passerelle WhatsApp & Notifications Clients
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Expédiez automatiquement les confirmations de réservation, reçus et alertes de commande prête sur le WhatsApp de vos clients.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            <span>Mode :</span>
            <strong className={gatewayMode === 'automatic_webhook' ? 'text-emerald-700' : 'text-slate-900'}>
              {gatewayMode === 'automatic_webhook' ? 'Automatique (Passerelle Webhook)' : '1-Clic Direct (Web/App)'}
            </strong>
          </div>
        </div>

        {/* Coordonnées Officielles du Restaurant */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-200">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Numéro WhatsApp Officiel du Restaurant :
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="tel"
                value={restaurantPhoneNumber}
                onChange={(e) => setRestaurantPhoneNumber(e.target.value)}
                placeholder="+237 6XX XX XX XX"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Les messages reçus par les clients proviendront de ce numéro WhatsApp.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Nom du Restaurant Affiché dans les Messages :
            </label>
            <input
              type="text"
              value={senderTitle}
              onChange={(e) => setSenderTitle(e.target.value)}
              placeholder={restaurantName}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Apparaît en en-tête de chaque message WhatsApp envoyé.
            </p>
          </div>
        </div>

        {/* Choix des Deux Modes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option A : 1-Clic Direct (Sans passerelle / Gratuit) */}
          <button
            type="button"
            onClick={() => setGatewayMode('click_to_chat')}
            className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              gatewayMode === 'click_to_chat'
                ? 'border-emerald-500 bg-emerald-50/40 shadow-sm'
                : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    gatewayMode === 'click_to_chat'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-xs text-slate-900">Mode 1-Clic Direct (Web & Mobile)</h3>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">100% Gratuit · Zéro Configuration</span>
                  </div>
                </div>
                {gatewayMode === 'click_to_chat' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mt-2">
                Dès qu'une réservation ou commande est validée, un clic ouvre directement WhatsApp sur le téléphone/tablette du restaurant avec le message déjà rédigé.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Quota : Illimité</span>
              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                gatewayMode === 'click_to_chat'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {gatewayMode === 'click_to_chat' ? 'Sélectionné' : 'Choisir ce mode'}
              </span>
            </div>
          </button>

          {/* Option B : Automatique en Tâche de Fond (Passerelle Webhook) */}
          <button
            type="button"
            onClick={() => setGatewayMode('automatic_webhook')}
            className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              gatewayMode === 'automatic_webhook'
                ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    gatewayMode === 'automatic_webhook'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    <Link className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-xs text-slate-900">Envoi 100% Automatique en Tâche de Fond</h3>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Passerelle Webhook Silencieuse</span>
                  </div>
                </div>
                {gatewayMode === 'automatic_webhook' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mt-2">
                Le message part automatiquement en tâche de fond dès la confirmation, sans aucune action du serveur. Utilise votre passerelle WhatsApp connectée à votre numéro.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Automatisation totale</span>
              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                gatewayMode === 'automatic_webhook'
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {gatewayMode === 'automatic_webhook' ? 'Sélectionné' : 'Choisir ce mode'}
              </span>
            </div>
          </button>
        </div>

        {/* Détails si Mode Automatique Webhook est sélectionné */}
        {gatewayMode === 'automatic_webhook' && (
          <div className="p-5 rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 space-y-4">
            <h3 className="font-black text-xs text-slate-900 flex items-center gap-2">
              <Link className="w-4 h-4 text-emerald-600" />
              Paramètres de votre Passerelle Webhook WhatsApp
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-800 block">
                  URL du Webhook de la Passerelle WhatsApp :
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://api.votre-passerelle.com/send-message"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <p className="text-[10px] text-slate-500">
                  Compatible avec Evolution API, Baileys, WPPConnect ou webhook standard JSON.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 block">
                  Clé API / Token de Sécurité (Optionnel) :
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Bearer token..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Déclencheurs Automatiques Métier (Filtrés STRICTEMENT selon l'abonnement du restaurant) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            2. Événements Déclencheurs WhatsApp (Selon votre Abonnement)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Seules les fonctionnalités incluses dans l'offre souscrite par votre établissement s'affichent ci-dessous.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Déclencheur 1 : Confirmation Réservation de Table (Conditionné à mod_tables) */}
          {isModuleEntitled('mod_tables') && (
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0">
                    <UtensilsCrossed className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Confirmation de Réservation</h4>
                    <p className="text-[11px] text-slate-500">Envoyé dès que la réservation de table est validée</p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={reservationAlertEnabled}
                  onChange={(e) => setReservationAlertEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer mt-1"
                />
              </div>
            </div>
          )}

          {/* Déclencheur 2 : Commande Prête KDS (Conditionné à mod_cuisine) */}
          {isModuleEntitled('mod_cuisine') && (
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Commande Prête (Passe KDS)</h4>
                    <p className="text-[11px] text-slate-500">Envoyé dès que la cuisine marque les plats prêts</p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={orderReadyAlertEnabled}
                  onChange={(e) => setOrderReadyAlertEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer mt-1"
                />
              </div>
            </div>
          )}

          {/* Déclencheur 3 : Ticket de Caisse Dématérialisé (Conditionné à mod_pos) */}
          {isModuleEntitled('mod_pos') && (
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Ticket de Caisse Dématérialisé</h4>
                    <p className="text-[11px] text-slate-500">Permet d'envoyer le reçu officiel en 1 clic au client</p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={digitalReceiptAlertEnabled}
                  onChange={(e) => setDigitalReceiptAlertEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer mt-1"
                />
              </div>
            </div>
          )}

        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enregistrement en cours...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Enregistrer les Paramètres WhatsApp</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Banc de Test d'Envoi WhatsApp Réel */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-600" />
              3. Banc de Test WhatsApp Réel
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Testez l'envoi d'un message WhatsApp vers votre numéro personnel pour vérifier la configuration.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            <span>Canal test :</span>
            <span className={gatewayMode === 'automatic_webhook' ? 'text-emerald-700' : 'text-slate-900'}>
              {gatewayMode === 'automatic_webhook' ? 'Passerelle Webhook' : 'Lien 1-Clic'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Modèle de message :</label>
            <select
              value={testTemplate}
              onChange={(e) => setTestTemplate(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 text-slate-800"
            >
              <option value="reservation">🍽️ Confirmation Réservation de Table</option>
              <option value="order_ready">🔔 Commande Prête (Passe KDS)</option>
              <option value="receipt">🧾 Ticket de Caisse Dématérialisé</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Numéro WhatsApp destinataire :</label>
            <input
              type="tel"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="ex: 699001122 ou +237699001122"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              disabled={isSendingTest}
              onClick={handleSendTest}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              {isSendingTest ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Tester l'Envoi WhatsApp</span>
                </>
              )}
            </button>
          </div>
        </div>

        {testStatus && (
          <div
            className={`p-4 rounded-2xl flex items-start gap-3 text-xs font-medium ${
              testStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {testStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{testStatus.type === 'success' ? 'Succès du test' : 'Erreur de test'}</p>
              <p className="mt-0.5">{testStatus.message}</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
