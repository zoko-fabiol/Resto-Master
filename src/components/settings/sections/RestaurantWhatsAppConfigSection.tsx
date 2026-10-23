import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ShieldCheck,
  RefreshCw,
  Smartphone,
  Trash2,
  Key,
  ExternalLink,
  HelpCircle,
  Radio,
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

  // Configuration Principale
  const [enabled, setEnabled] = useState(true);
  const [gatewayMode, setGatewayMode] = useState<'qr_connected' | 'click_to_chat'>('qr_connected');
  const [restaurantPhoneNumber, setRestaurantPhoneNumber] = useState('');
  const [senderTitle, setSenderTitle] = useState('');
  const [sessionStatus, setSessionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [connectedPhoneNumber, setConnectedPhoneNumber] = useState('');
  const [connectedAt, setConnectedAt] = useState<string | null>(null);

  // Identifiants Instance WhatsApp (UltraMsg)
  const [instanceId, setInstanceId] = useState('');
  const [instanceToken, setInstanceToken] = useState('');

  // Gestion du Vrai QR Code WhatsApp
  const [qrTimestamp, setQrTimestamp] = useState<number>(Date.now());
  const [qrCountdown, setQrCountdown] = useState<number>(60);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [instanceStatusText, setInstanceStatusText] = useState<string>('En attente de scan');
  const [showHelpGuide, setShowHelpGuide] = useState<boolean>(false);

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

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const refreshQrCode = useCallback(() => {
    setQrTimestamp(Date.now());
    setQrCountdown(60);
  }, []);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const config = await restaurantWhatsAppService.getWhatsAppSettings(restaurantId);
      if (config.enabled !== undefined) setEnabled(config.enabled);

      const phone = config.restaurantPhoneNumber || activeRestaurant?.phone || '';
      setRestaurantPhoneNumber(phone);

      if (config.senderTitle) setSenderTitle(config.senderTitle);
      else setSenderTitle(restaurantName);

      if (config.instanceId) setInstanceId(config.instanceId);
      if (config.instanceToken) setInstanceToken(config.instanceToken);
      if (config.gatewayMode) {
        setGatewayMode(config.gatewayMode === 'click_to_chat' ? 'click_to_chat' : 'qr_connected');
      }

      if (config.sessionStatus) {
        setSessionStatus(config.sessionStatus);
        setConnectedPhoneNumber(config.connectedPhoneNumber || phone);
        setConnectedAt(config.connectedAt || null);
      } else {
        setSessionStatus('disconnected');
      }

      if (config.reservationAlertEnabled !== undefined) setReservationAlertEnabled(config.reservationAlertEnabled);
      if (config.orderReadyAlertEnabled !== undefined) setOrderReadyAlertEnabled(config.orderReadyAlertEnabled);
      if (config.digitalReceiptAlertEnabled !== undefined) setDigitalReceiptAlertEnabled(config.digitalReceiptAlertEnabled);
    } catch (err) {
      console.warn('[RestaurantWhatsAppConfig] Erreur lecture config:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, activeRestaurant?.phone, restaurantName]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Fonction de vérification du statut auprès de l'instance
  const verifyInstanceStatus = useCallback(async (idToCheck = instanceId, tokenToCheck = instanceToken, silent = true) => {
    const cleanId = idToCheck.trim();
    const cleanToken = tokenToCheck.trim();

    if (!cleanId || !cleanToken) {
      if (!silent) {
        showToast({
          type: 'warning',
          title: 'Identifiants Manquants',
          message: 'Veuillez renseigner votre Instance ID et votre Token UltraMsg pour vérifier la connexion.',
        });
      }
      return false;
    }

    if (!silent) setIsCheckingStatus(true);

    try {
      const result = await restaurantWhatsAppService.checkUltraMsgStatus(cleanId, cleanToken);
      if (result.connected || result.status === 'authenticated') {
        const cleanPhone = formatWhatsAppPhoneNumber(restaurantPhoneNumber);
        const now = new Date().toISOString();

        setSessionStatus('connected');
        setConnectedPhoneNumber(cleanPhone);
        setConnectedAt(now);
        setInstanceStatusText('Appareil authentifié et connecté');

        await restaurantWhatsAppService.saveWhatsAppSettings(restaurantId, {
          enabled: true,
          gatewayMode: 'qr_connected',
          sessionStatus: 'connected',
          connectedPhoneNumber: cleanPhone,
          restaurantPhoneNumber: cleanPhone,
          connectedAt: now,
          instanceId: cleanId,
          instanceToken: cleanToken,
          senderTitle: senderTitle.trim() || restaurantName,
          reservationAlertEnabled,
          orderReadyAlertEnabled,
          digitalReceiptAlertEnabled,
        });

        await updateSettings({
          whatsappGatewayEnabled: true,
          whatsappGatewayMode: 'qr_connected',
          whatsappSessionStatus: 'connected',
          whatsappConnectedPhoneNumber: cleanPhone,
          whatsappPhoneNumber: cleanPhone,
          whatsappInstanceId: cleanId,
          whatsappInstanceToken: cleanToken,
          whatsappSenderTitle: senderTitle.trim() || restaurantName,
        });

        showToast({
          type: 'success',
          title: 'WhatsApp Connecté avec Succès !',
          message: 'Votre smartphone est jumelé. Les messages partiront désormais automatiquement depuis votre numéro.',
        });
        return true;
      } else {
        setInstanceStatusText(result.status ? `Statut : ${result.status}` : 'Non connecté');
        if (!silent) {
          showToast({
            type: 'info',
            title: 'Scan en attente',
            message: `L'instance est active mais le QR Code n'a pas encore été validé sur WhatsApp (Statut: ${result.status || 'attente'}).`,
          });
        }
      }
    } catch {
      setInstanceStatusText('Erreur de vérification');
    } finally {
      if (!silent) setIsCheckingStatus(false);
    }

    return false;
  }, [instanceId, instanceToken, restaurantPhoneNumber, restaurantId, senderTitle, restaurantName, reservationAlertEnabled, orderReadyAlertEnabled, digitalReceiptAlertEnabled, showToast, updateSettings]);

  // Polling automatique toutes les 4s quand les identifiants sont saisis et que la session n'est pas encore connectée
  useEffect(() => {
    if (sessionStatus === 'connected' || loading || gatewayMode !== 'qr_connected') {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const cleanId = instanceId.trim();
    const cleanToken = instanceToken.trim();

    if (cleanId && cleanToken) {
      pollingRef.current = setInterval(() => {
        verifyInstanceStatus(cleanId, cleanToken, true);
      }, 4000);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [sessionStatus, loading, gatewayMode, instanceId, instanceToken, verifyInstanceStatus]);

  // Compte à rebours du rafraîchissement du QR code
  useEffect(() => {
    if (sessionStatus === 'connected' || loading || gatewayMode !== 'qr_connected') return;
    const interval = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          refreshQrCode();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStatus, loading, gatewayMode, refreshQrCode]);

  // Sauvegarde des identifiants et rechargement immédiat du QR
  const handleSaveCredentials = async () => {
    setSaving(true);
    try {
      const cleanId = instanceId.trim();
      const cleanToken = instanceToken.trim();
      const cleanPhone = formatWhatsAppPhoneNumber(restaurantPhoneNumber);

      await restaurantWhatsAppService.saveWhatsAppSettings(restaurantId, {
        enabled,
        gatewayMode,
        instanceId: cleanId,
        instanceToken: cleanToken,
        restaurantPhoneNumber: cleanPhone,
        senderTitle: senderTitle.trim(),
        reservationAlertEnabled,
        orderReadyAlertEnabled,
        digitalReceiptAlertEnabled,
      });

      await updateSettings({
        whatsappGatewayEnabled: enabled,
        whatsappGatewayMode: gatewayMode,
        whatsappInstanceId: cleanId,
        whatsappInstanceToken: cleanToken,
        whatsappPhoneNumber: cleanPhone,
        whatsappSenderTitle: senderTitle.trim(),
      });

      refreshQrCode();

      showToast({
        type: 'success',
        title: 'Paramètres Enregistrés',
        message: 'Vos identifiants d’instance ont été mis à jour.',
      });

      if (cleanId && cleanToken) {
        verifyInstanceStatus(cleanId, cleanToken, false);
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de sauvegarder les réglages.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Déconnexion de l'appareil
  const handleDisconnect = async () => {
    setSaving(true);
    try {
      await restaurantWhatsAppService.disconnectDevice(restaurantId, instanceId, instanceToken);
      setSessionStatus('disconnected');
      setConnectedAt(null);

      await updateSettings({
        whatsappSessionStatus: 'disconnected',
        whatsappConnectedPhoneNumber: undefined,
      });

      showToast({
        type: 'info',
        title: 'Appareil Déconnecté',
        message: 'La session WhatsApp du restaurant a été dissociée.',
      });

      refreshQrCode();
    } catch {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de déconnecter l’appareil.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Sauvegarde des déclencheurs
  const handleSaveTriggers = async () => {
    setSaving(true);
    try {
      await restaurantWhatsAppService.saveWhatsAppSettings(restaurantId, {
        enabled,
        gatewayMode,
        instanceId: instanceId.trim(),
        instanceToken: instanceToken.trim(),
        sessionStatus,
        reservationAlertEnabled,
        orderReadyAlertEnabled,
        digitalReceiptAlertEnabled,
      });

      await updateSettings({
        whatsappReservationAlertEnabled: reservationAlertEnabled,
        whatsappOrderReadyAlertEnabled: orderReadyAlertEnabled,
        whatsappReceiptAlertEnabled: digitalReceiptAlertEnabled,
      });

      showToast({
        type: 'success',
        title: 'Déclencheurs Enregistrés',
        message: 'Vos choix d’alertes WhatsApp automatiques ont été mis à jour.',
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible d’enregistrer les préférences.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Banc de Test
  const handleSendTest = async () => {
    const cleanPhone = formatWhatsAppPhoneNumber(testRecipient);
    if (!cleanPhone || cleanPhone.length < 8) {
      setTestStatus({
        type: 'error',
        message: 'Veuillez saisir un numéro de téléphone valide pour le test.',
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
          tableName: 'Table VIP N°8',
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
        settings: {
          whatsappGatewayMode: gatewayMode,
          whatsappSessionStatus: sessionStatus,
          whatsappInstanceId: instanceId.trim(),
          whatsappInstanceToken: instanceToken.trim(),
          whatsappConnectedPhoneNumber: connectedPhoneNumber,
          whatsappPhoneNumber: restaurantPhoneNumber,
          whatsappSenderTitle: senderTitle,
        },
        openInBrowser: gatewayMode === 'click_to_chat' || sessionStatus !== 'connected',
      });

      if (res.success) {
        setTestStatus({
          type: 'success',
          message: res.mode === 'qr_connected'
            ? `Message WhatsApp transmis automatiquement depuis votre numéro lié (+${connectedPhoneNumber || restaurantPhoneNumber}) vers ${cleanPhone} !`
            : `Lien WhatsApp ouvert avec succès pour ${cleanPhone}. Cliquez sur "Envoyer" dans WhatsApp.`,
        });
      } else {
        setTestStatus({
          type: 'error',
          message: `Échec : ${res.message}`,
        });
      }
    } catch {
      setTestStatus({
        type: 'error',
        message: 'Erreur technique lors de la transmission.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        <span className="text-xs font-semibold">Chargement de la passerelle WhatsApp...</span>
      </div>
    );
  }

  const isReservationsEntitled = isModuleEntitled('mod_tables');
  const isKdsEntitled = isModuleEntitled('mod_cuisine');
  const isPosEntitled = isModuleEntitled('mod_pos');

  const hasCredentials = Boolean(instanceId.trim() && instanceToken.trim());
  const ultraQrUrl = hasCredentials ? restaurantWhatsAppService.getUltraMsgQrUrl(instanceId, instanceToken) + `&t=${qrTimestamp}` : '';

  return (
    <div className="space-y-6">
      {/* 1. En-tête Général & Mode d'Envoi */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Passerelle WhatsApp Officielle du Restaurant
                </h2>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase ${
                  sessionStatus === 'connected'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : gatewayMode === 'click_to_chat'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}>
                  {sessionStatus === 'connected'
                    ? 'Jumelé & Automatique'
                    : gatewayMode === 'click_to_chat'
                    ? 'Repli 1-Clic Gratuit'
                    : 'Scan en attente'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Expédition des réservations, avis de plats prêts et tickets de caisse directement depuis votre propre numéro.
              </p>
            </div>
          </div>

          {/* Numéro Officiel du Restaurant */}
          <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Numéro Émetteur :</span>
              <input
                type="tel"
                value={restaurantPhoneNumber}
                onChange={(e) => setRestaurantPhoneNumber(e.target.value)}
                placeholder="Ex: 6XXXXXXXX"
                className="text-xs font-black text-slate-900 bg-transparent focus:outline-none w-36"
              />
            </div>
          </div>
        </div>

        {/* Sélecteur de Mode : Vrai QR Code Multi-Device vs Repli 1-Clic Gratuit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setGatewayMode('qr_connected')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              gatewayMode === 'qr_connected'
                ? 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Radio className={`w-3.5 h-3.5 ${gatewayMode === 'qr_connected' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Mode 1 : Vrai QR Code WhatsApp (UltraMsg)</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                100% Automatique
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Affiche le <strong>vrai QR Code officiel émis par WhatsApp</strong>. Scannez-le avec l'application mobile WhatsApp pour un jumelage direct sans erreur.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setGatewayMode('click_to_chat')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              gatewayMode === 'click_to_chat'
                ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Radio className={`w-3.5 h-3.5 ${gatewayMode === 'click_to_chat' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>Mode 2 : Repli Direct 1-Clic (Gratuit à Vie)</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                0 Configuration
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Vos caissiers et chefs cliquent sur "WhatsApp" pour ouvrir l'application WhatsApp Web ou mobile avec le message déjà rédigé. Aucun abonnement tiers requis.
            </p>
          </button>
        </div>

        {/* SECTION MODE 1 : VRAI QR CODE MULTI-DEVICE */}
        {gatewayMode === 'qr_connected' && (
          <div className="space-y-5 pt-2">
            {/* Formulaire des identifiants d'instance */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-black text-slate-900">
                    Identifiants de l'Instance WhatsApp (UltraMsg)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelpGuide(!showHelpGuide)}
                  className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showHelpGuide ? 'Masquer le guide' : 'Où trouver ces identifiants ? (2 min)'}</span>
                </button>
              </div>

              {/* Guide déroulant pour obtenir les identifiants */}
              {showHelpGuide && (
                <div className="p-3.5 rounded-xl bg-white border border-emerald-200 text-xs text-slate-700 space-y-2">
                  <p className="font-bold text-emerald-900">
                    Pourquoi une instance est nécessaire ?
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Pour que votre application mobile WhatsApp accepte de se connecter sans l'erreur <em>« QR code non valide »</em>, WhatsApp exige un jeton cryptographique généré en direct par ses serveurs WebSocket. L'API UltraMsg fournit cette connexion officielle :
                  </p>
                  <ol className="list-decimal list-inside text-[11px] text-slate-700 space-y-1 font-medium">
                    <li>Rendez-vous sur <a href="https://ultramsg.com/" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-bold inline-flex items-center gap-0.5">UltraMsg.com <ExternalLink className="w-3 h-3" /></a> et créez un compte (essai gratuit sans carte bancaire).</li>
                    <li>Cliquez sur <strong>« Create Instance »</strong> dans votre tableau de bord UltraMsg.</li>
                    <li>Copiez l'<strong>Instance ID</strong> (ex: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-900">instance103450</code>) et le <strong>Token</strong>.</li>
                    <li>Collez-les dans les deux champs ci-dessous puis cliquez sur <strong>« Charger le QR Code »</strong>.</li>
                  </ol>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-5 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Instance ID :</label>
                  <input
                    type="text"
                    value={instanceId}
                    onChange={(e) => setInstanceId(e.target.value)}
                    placeholder="ex: instance103450"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="sm:col-span-5 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Token d'Instance :</label>
                  <input
                    type="password"
                    value={instanceToken}
                    onChange={(e) => setInstanceToken(e.target.value)}
                    placeholder="ex: m4k5d9f0s..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleSaveCredentials}
                    disabled={saving || !instanceId.trim() || !instanceToken.trim()}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Valider</span>
                  </button>
                </div>
              </div>
            </div>

            {/* État de Connexion : Connecté vs Jumelage en Cours */}
            {sessionStatus === 'connected' ? (
              /* Écran lorsque le restaurant est connecté avec succès */
              <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-50/60 to-white border-2 border-emerald-400 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                      <Smartphone className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[11px] uppercase shadow-xs">
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          Appareil Jumelé & 100% Automatique
                        </span>
                        <span className="text-xs text-slate-500 font-medium">Instance : {instanceId}</span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 mt-1">
                        Numéro Émetteur : +{connectedPhoneNumber || restaurantPhoneNumber}
                      </h3>
                      <p className="text-xs text-emerald-800">
                        Vos clients reçoivent directement les reçus et avis de commande depuis ce compte WhatsApp sans intervention manuelle.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => verifyInstanceStatus(instanceId, instanceToken, false)}
                      disabled={isCheckingStatus}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                      title="Vérifier la connexion"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                      <span>Vérifier</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 transition-colors shadow-2xs cursor-pointer"
                      title="Dissocier ce téléphone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Déconnecter</span>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-emerald-200/80 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Statut : Chiffrement WhatsApp actif · Synchronisé avec l'instance {instanceId}</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Connecté le {connectedAt ? new Date(connectedAt).toLocaleDateString('fr-FR') : 'Aujourd’hui'}
                  </span>
                </div>
              </div>
            ) : (
              /* Écran de Jumelage par VRAI QR Code Officiel */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-6 rounded-3xl bg-slate-50 border border-slate-200">
                {/* Colonne QR Code */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-xs relative">
                  {hasCredentials ? (
                    <div className="flex flex-col items-center space-y-3">
                      <div className="relative p-2 bg-white rounded-xl border border-slate-200 shadow-inner">
                        <img
                          src={ultraQrUrl}
                          alt="Vrai QR Code Officiel WhatsApp"
                          className="w-[240px] h-[240px] object-contain rounded-lg"
                          onError={(e) => {
                            // En cas d'erreur de chargement de l'instance
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between w-full px-2 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />
                          <span>Expire dans {qrCountdown}s</span>
                        </span>
                        <button
                          type="button"
                          onClick={refreshQrCode}
                          className="text-emerald-700 font-bold hover:underline cursor-pointer"
                        >
                          Rafraîchir le code
                        </button>
                      </div>

                      {/* Indicateur de détection automatique */}
                      <div className="w-full p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                        <span className="text-[11px] font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          <span>Détection automatique active : {instanceStatusText}</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-[240px] h-[240px] flex flex-col items-center justify-center text-center p-4 text-slate-400 gap-2">
                      <Key className="w-10 h-10 text-slate-300" />
                      <span className="text-xs font-bold text-slate-600">Instance non configurée</span>
                      <p className="text-[11px] text-slate-400">
                        Saisissez votre Instance ID et Token ci-dessus pour afficher le QR Code officiel.
                      </p>
                    </div>
                  )}
                </div>

                {/* Colonne Instructions officielles */}
                <div className="md:col-span-7 space-y-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-700 px-2 py-0.5 rounded-md bg-emerald-100">
                      Jumelage Officiel WhatsApp
                    </span>
                    <h3 className="text-base font-black text-slate-900 mt-1">
                      Scannez avec votre application WhatsApp mobile :
                    </h3>
                    <p className="text-xs text-slate-500">
                      Ce code est généré en direct par les serveurs WhatsApp. Il sera reconnu instantanément par votre téléphone sans message d'erreur.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <div className="text-xs text-slate-700">
                        Ouvrez l'application <strong>WhatsApp</strong> sur le smartphone de votre restaurant.
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <div className="text-xs text-slate-700">
                        Touchez <strong>Menu ⋮</strong> (Android) ou <strong>Réglages ⚙️</strong> (iPhone) puis sélectionnez <strong>« Appareils connectés »</strong>.
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <div className="text-xs text-slate-700">
                        Touchez <strong>« Connecter un appareil »</strong> et visez le QR Code ci-contre. Dès le scan, la connexion est validée automatiquement !
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => verifyInstanceStatus(instanceId, instanceToken, false)}
                      disabled={isCheckingStatus || !hasCredentials}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                      {isCheckingStatus ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Vérification de la connexion...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>J'ai scanné le QR Code — Vérifier la connexion</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION MODE 2 : REPLI DIRECT 1-CLIC */}
        {gatewayMode === 'click_to_chat' && (
          <div className="p-6 rounded-3xl bg-blue-50/60 border border-blue-200 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <ExternalLink className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900">
                  Mode Repli 1-Clic WhatsApp Actif
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ce mode ne nécessite aucune inscription ni serveur tiers. Sur chaque écran opérationnel (Plan de table, Cuisine KDS, Clôture de caisse POS), un bouton <strong>« WhatsApp »</strong> permet à votre équipe d'ouvrir WhatsApp avec le message de réservation, de commande prête ou le ticket de caisse déjà composé pour le client.
                </p>
              </div>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-blue-100 flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium">
                Toutes les fonctionnalités WhatsApp restent 100% opérationnelles sans frais.
              </span>
              <button
                type="button"
                onClick={handleSaveCredentials}
                disabled={saving}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs"
              >
                Confirmer ce mode par défaut
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Événements Déclencheurs (Conditionnés par les modules de l'abonnement) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Événements Déclencheurs WhatsApp</span>
            </h3>
            <p className="text-xs text-slate-500">
              Activez ou désactivez les envois automatiques selon vos opérations. Seuls les modules de votre abonnement sont affichés.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveTriggers}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Enregistrer mes préférences</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Déclencheur 1 : Réservations */}
          {isReservationsEntitled && (
            <div className={`p-4 rounded-2xl border transition-all ${
              reservationAlertEnabled ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <input
                  type="checkbox"
                  checked={reservationAlertEnabled}
                  onChange={(e) => setReservationAlertEnabled(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
              <h4 className="font-bold text-xs text-slate-900">Confirmation de Réservation</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Envoyé immédiatement au client avec la date, l'heure, le nombre de personnes et la table réservée.
              </p>
            </div>
          )}

          {/* Déclencheur 2 : Plats Prêts en Cuisine KDS */}
          {isKdsEntitled && (
            <div className={`p-4 rounded-2xl border transition-all ${
              orderReadyAlertEnabled ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <BellRing className="w-4 h-4" />
                </div>
                <input
                  type="checkbox"
                  checked={orderReadyAlertEnabled}
                  onChange={(e) => setOrderReadyAlertEnabled(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
              <h4 className="font-bold text-xs text-slate-900">Plats Prêts en Cuisine (KDS)</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Déclenché quand le chef valide la commande prête. Notifie le client que ses plats sont prêts à table ou au comptoir.
              </p>
            </div>
          )}

          {/* Déclencheur 3 : Reçu de Vente POS */}
          {isPosEntitled && (
            <div className={`p-4 rounded-2xl border transition-all ${
              digitalReceiptAlertEnabled ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <input
                  type="checkbox"
                  checked={digitalReceiptAlertEnabled}
                  onChange={(e) => setDigitalReceiptAlertEnabled(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
              <h4 className="font-bold text-xs text-slate-900">Reçu Dématérialisé (POS)</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Permet d'expédier le ticket de caisse TTC officiel directement sur le smartphone du client après règlement.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Banc de Test d'Envoi Direct */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-900">
              Banc de Test d'Envoi en Direct
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Testez l'envoi d'un message WhatsApp sur votre propre téléphone portable pour vérifier le rendu et l'expéditeur.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 block">Modèle à tester :</label>
            <select
              value={testTemplate}
              onChange={(e) => setTestTemplate(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="reservation">Réservation Confirmée</option>
              <option value="order_ready">Commande Prête KDS</option>
              <option value="receipt">Reçu Dématérialisé</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 block">Numéro mobile destinataire :</label>
            <input
              type="tel"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="Ex: 6XXXXXXXX"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSendTest}
              disabled={isSendingTest || !testRecipient.trim()}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              {isSendingTest ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tester l'Envoi WhatsApp</span>
                </>
              )}
            </button>
          </div>
        </div>

        {testStatus && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              testStatus.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium'
                : 'bg-rose-50 border border-rose-200 text-rose-900 font-medium'
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
    </div>
  );
};
