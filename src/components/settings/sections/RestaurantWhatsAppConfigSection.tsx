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
  Copy,
  BookOpen,
  Terminal,
  Cloud,
  Cpu,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Code,
} from 'lucide-react';
import {
  restaurantWhatsAppService,
  RestaurantWhatsAppSettings,
  formatWhatsAppPhoneNumber,
} from '../../../services/whatsapp/restaurantWhatsAppService';

const WHATSAPP_NODE_GATEWAY_TEMPLATE = `/**
 * RestoMaster OS — Passerelle Webhook WhatsApp Autohébergée
 * Développée avec Node.js, Express & @whiskeysockets/baileys
 * 
 * 1. Initialiser le projet :
 *    mkdir whatsapp-gateway && cd whatsapp-gateway
 *    npm init -y
 *    npm install express @whiskeysockets/baileys qrcode-terminal
 * 
 * 2. Démarrer :
 *    node server.js
 * 
 * 3. Scannez le QR code affiché dans le terminal avec l'application WhatsApp du restaurant.
 */

const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'secret_resto_token_2026';

let sock;

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_session');
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('\\n[RestoMaster] SCANNEZ CE QR CODE DANS WHATSAPP -> APPAREILS CONNECTES :\\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connexion interrompue, tentative de reconnexion...', shouldReconnect);
      if (shouldReconnect) startWhatsApp();
    } else if (connection === 'open') {
      console.log('\\n[✓] Passerelle WhatsApp RestoMaster connectée avec succès !\\n');
    }
  });
}

// Endpoint webhook appelé automatiquement par RestoMaster OS
app.post('/send-message', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (API_KEY && (!authHeader || !authHeader.includes(API_KEY))) {
    return res.status(401).json({ error: 'Token API non valide' });
  }

  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: 'Champs phone et message obligatoires' });
  }

  try {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const jid = \`\${cleanPhone}@s.whatsapp.net\`;
    await sock.sendMessage(jid, { text: message });
    console.log(\`[✓] Message WhatsApp expédié avec succès à \${cleanPhone}\`);
    return res.json({ success: true, to: cleanPhone });
  } catch (error) {
    console.error('[✗] Erreur lors de l envoi WhatsApp:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(\`Serveur WhatsApp RestoMaster démarré sur http://localhost:\${PORT}\`);
  startWhatsApp();
});
`;

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

  // Banc de Test & Tutoriel
  const [testRecipient, setTestRecipient] = useState('');
  const [testTemplate, setTestTemplate] = useState<'reservation' | 'order_ready' | 'receipt'>('reservation');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // États du Tutoriel Pédagogique
  const [showTutorial, setShowTutorial] = useState(true);
  const [tutorialTab, setTutorialTab] = useState<'cloud' | 'nocode' | 'selfhosted'>('cloud');
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(WHATSAPP_NODE_GATEWAY_TEMPLATE);
    setCopiedScript(true);
    showToast({
      type: 'success',
      title: 'Script Node.js Copié',
      message: 'Le code de la passerelle WhatsApp a été copié dans le presse-papier.',
    });
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleCopySchema = () => {
    const jsonSchema = JSON.stringify({
      phone: "2376XXXXXXXX",
      message: "Texte du message avec emojis...",
      trigger: "reservation_confirmed",
      restaurantName: restaurantName,
      senderPhone: restaurantPhoneNumber || "2376XXXXXXXX",
      timestamp: new Date().toISOString()
    }, null, 2);
    navigator.clipboard.writeText(jsonSchema);
    setCopiedSchema(true);
    showToast({
      type: 'success',
      title: 'Schéma JSON Copié',
      message: 'Le payload JSON standardisé a été copié.',
    });
    setTimeout(() => setCopiedSchema(false), 2500);
  };

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
          <div className="space-y-4">
            {/* Formulaire de Connexion Webhook */}
            <div className="p-5 rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Link className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-xs text-slate-900">Paramètres de votre Passerelle Webhook WhatsApp</h3>
                    <p className="text-[11px] text-slate-600">
                      Raccordez votre instance WhatsApp (UltraMsg, Wasapi, Make, Baileys ou Evolution API)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTutorial(!showTutorial)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs transition border border-emerald-300 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{showTutorial ? 'Masquer le Tutoriel' : 'Comment avoir ces informations ? (Tutoriel)'}</span>
                  {showTutorial ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 block">
                      URL du Webhook de la Passerelle WhatsApp :
                    </label>
                    {webhookUrl.trim().startsWith('http') && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        URL Définie
                      </span>
                    )}
                  </div>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://api.votre-passerelle.com/send-message"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <p className="text-[10px] text-slate-500">
                    Endpoint HTTP POST appelé automatiquement par RestoMaster OS avec le payload JSON.
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
                    placeholder="Bearer token ou token instance..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <p className="text-[10px] text-slate-500">
                    Transmis dans l'en-tête HTTP <code className="text-slate-700">Authorization: Bearer ...</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Guide & Tutoriel Pédagogique Intégré */}
            {showTutorial && (
              <div className="p-5 rounded-2xl border-2 border-emerald-200 bg-white space-y-4 shadow-sm animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px] uppercase">
                        Guide RestoMaster OS
                      </span>
                      <h4 className="font-black text-sm text-slate-900">
                        Comment obtenir votre URL et Token en 3 minutes ?
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Trois méthodes éprouvées pour connecter le numéro WhatsApp officiel de votre restaurant :
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopySchema}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200 cursor-pointer"
                      title="Copier le format JSON envoyé par RestoMaster OS"
                    >
                      {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Code className="w-3.5 h-3.5 text-slate-500" />}
                      <span>{copiedSchema ? 'Format JSON Copié !' : 'Format JSON Payload'}</span>
                    </button>
                  </div>
                </div>

                {/* Sélecteur d'Onglets de Solution */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setTutorialTab('cloud')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      tutorialTab === 'cloud'
                        ? 'bg-white text-emerald-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Option 1 : Passerelle Cloud en 60s (UltraMsg / Wasapi)</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 uppercase font-black">
                      Recommandé
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTutorialTab('nocode')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      tutorialTab === 'nocode'
                        ? 'bg-white text-emerald-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Option 2 : No-Code Gratuit (Make.com / n8n)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTutorialTab('selfhosted')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      tutorialTab === 'selfhosted'
                        ? 'bg-white text-emerald-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5 text-slate-700" />
                    <span>Option 3 : Mini-Serveur Node.js (100% Gratuit)</span>
                  </button>
                </div>

                {/* Contenu de l'Option 1 : Passerelle Cloud (UltraMsg / Wasapi) */}
                {tutorialTab === 'cloud' && (
                  <div className="space-y-4 pt-1">
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-950 flex items-start gap-2.5">
                      <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>La méthode la plus rapide au monde :</strong> Vous n'avez rien à installer sur un ordinateur. Vous créez un compte sur une passerelle WhatsApp cloud, scannez un QR Code avec le téléphone du restaurant, et copiez l'URL fournie.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center">1</span>
                          <span className="font-bold text-xs text-slate-900">Créer une instance</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Inscrivez-vous sur une plateforme comme <a href="https://ultramsg.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline font-bold inline-flex items-center gap-0.5">UltraMsg <ExternalLink className="w-2.5 h-2.5" /></a> ou <a href="https://wasapi.io/" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline font-bold inline-flex items-center gap-0.5">Wasapi <ExternalLink className="w-2.5 h-2.5" /></a>.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center">2</span>
                          <span className="font-bold text-xs text-slate-900">Scanner le QR Code</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Dans l'application WhatsApp du restaurant, ouvrez <strong>Appareils connectés</strong> et scannez le QR code affiché à l'écran.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center">3</span>
                          <span className="font-bold text-xs text-slate-900">Copier l'URL & Token</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Récupérez l'URL du webhook fournie (ex: <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">https://api.ultramsg.com/...</code>) et le Token d'instance.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center">4</span>
                          <span className="font-bold text-xs text-slate-900">Coller & Tester</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Collez les deux valeurs dans les champs ci-dessus, enregistrez, et faites un essai avec le <strong>Banc de Test</strong> en bas de page !
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contenu de l'Option 2 : No-Code (Make / n8n) */}
                {tutorialTab === 'nocode' && (
                  <div className="space-y-4 pt-1">
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Automatisation No-Code 100% flexible :</strong> Utilisez Make.com ou n8n pour recevoir le webhook de RestoMaster OS et router le message vers WhatsApp Business, Twilio, MessageBird ou votre propre bot.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] flex items-center justify-center">1</span>
                          <span className="font-bold text-xs text-slate-900">Ouvrir Make / n8n</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Créez un compte gratuit sur <a href="https://www.make.com/" target="_blank" rel="noopener noreferrer" className="text-amber-800 underline font-bold inline-flex items-center gap-0.5">Make.com <ExternalLink className="w-2.5 h-2.5" /></a> et cliquez sur <strong>Create a new scenario</strong>.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] flex items-center justify-center">2</span>
                          <span className="font-bold text-xs text-slate-900">Trigger Custom Webhook</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Ajoutez le module <strong>Webhooks &gt; Custom webhook</strong>. Make vous donne immédiatement une URL webhook unique.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] flex items-center justify-center">3</span>
                          <span className="font-bold text-xs text-slate-900">Module WhatsApp</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Ajoutez ensuite le module WhatsApp (ou Twilio) configuré avec le numéro de destination <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">phone</code> et le texte <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">message</code>.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] flex items-center justify-center">4</span>
                          <span className="font-bold text-xs text-slate-900">Coller l'URL Make</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Collez l'URL de votre Webhook Make ci-dessus dans le champ <strong>URL du Webhook</strong> de RestoMaster OS.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contenu de l'Option 3 : Mini-Serveur Node.js Baileys Autohébergé */}
                {tutorialTab === 'selfhosted' && (
                  <div className="space-y-4 pt-1">
                    <div className="p-3 bg-slate-900 text-white rounded-xl text-xs flex items-start justify-between gap-3 shadow-xs">
                      <div className="flex items-start gap-2.5">
                        <Terminal className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong>Micro-Serveur Node.js 100% Souverain & Gratuit :</strong> Hébergez votre propre passerelle sur votre ordinateur de caisse, un serveur local ou un VPS (Render, Railway). Aucune dépendance tierce payante.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyScript}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer shrink-0 ${
                          copiedScript
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        }`}
                      >
                        {copiedScript ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Code Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copier le Code du Serveur</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[11px] flex items-center justify-center">1</span>
                          <span className="font-bold text-xs text-slate-900">Créer le dossier</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Créez un dossier <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">whatsapp-gateway</code> et initialisez-le avec <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">npm init -y</code>.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[11px] flex items-center justify-center">2</span>
                          <span className="font-bold text-xs text-slate-900">Installer les dépendances</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Exécutez <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">npm i express @whiskeysockets/baileys qrcode-terminal</code>.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[11px] flex items-center justify-center">3</span>
                          <span className="font-bold text-xs text-slate-900">Coller le script</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Cliquez sur <strong>« Copier le Code »</strong>, créez un fichier <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">server.js</code>, collez et lancez avec <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">node server.js</code>.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[11px] flex items-center justify-center">4</span>
                          <span className="font-bold text-xs text-slate-900">Renseigner l'URL</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Indiquez l'URL locale ou publique (ex: <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">http://localhost:3001/send-message</code>) ci-dessus.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
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
