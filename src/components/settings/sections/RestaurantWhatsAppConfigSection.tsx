import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
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
  QrCode as QrIcon,
  RefreshCw,
  Smartphone,
  Trash2,
  Sparkles,
} from 'lucide-react';
import {
  restaurantWhatsAppService,
  RestaurantWhatsAppSettings,
  formatWhatsAppPhoneNumber,
  generateWhatsAppQrPayload,
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
  const [sessionStatus, setSessionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [connectedPhoneNumber, setConnectedPhoneNumber] = useState('');
  const [connectedAt, setConnectedAt] = useState<string | null>(null);

  // Génération du QR Code de jumelage
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);
  const [qrCountdown, setQrCountdown] = useState<number>(60);

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

      const phone = config.restaurantPhoneNumber || activeRestaurant?.phone || '';
      setRestaurantPhoneNumber(phone);

      if (config.senderTitle) setSenderTitle(config.senderTitle);
      else setSenderTitle(restaurantName);

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

      if (config.sessionStatus !== 'connected') {
        generateQrCode(phone);
      }
    } catch (err) {
      console.warn('[RestaurantWhatsAppConfig] Erreur lecture config:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateQrCode = async (phoneToPair?: string) => {
    setIsGeneratingQr(true);
    try {
      const payload = generateWhatsAppQrPayload({
        restaurantId,
        restaurantName,
        phoneNumber: phoneToPair || restaurantPhoneNumber,
      });

      const dataUrl = await QRCode.toDataURL(payload, {
        width: 280,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });

      setQrDataUrl(dataUrl);
      setQrCountdown(60);
    } catch (err) {
      console.error('Erreur génération QR WhatsApp:', err);
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // Compte à rebours du QR code pour rafraîchissement automatique
  useEffect(() => {
    if (sessionStatus === 'connected' || loading) return;
    const interval = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          generateQrCode();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStatus, loading, restaurantPhoneNumber]);

  // Action : Confirmer le scan du QR code et lier le compte
  const handleConfirmPairing = async () => {
    const cleanPhone = formatWhatsAppPhoneNumber(restaurantPhoneNumber);
    if (!cleanPhone || cleanPhone.length < 8) {
      showToast({
        type: 'warning',
        title: 'Numéro de téléphone requis',
        message: 'Veuillez saisir le numéro de téléphone WhatsApp de votre restaurant avant de valider le scan.',
      });
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      await restaurantWhatsAppService.pairDeviceWithQr({
        restaurantId,
        phoneNumber: cleanPhone,
        restaurantName,
      });

      setSessionStatus('connected');
      setConnectedPhoneNumber(cleanPhone);
      setConnectedAt(now);

      await updateSettings({
        whatsappGatewayEnabled: enabled,
        whatsappGatewayMode: 'qr_connected',
        whatsappPhoneNumber: cleanPhone,
        whatsappSenderTitle: senderTitle.trim() || restaurantName,
        whatsappReservationAlertEnabled: reservationAlertEnabled,
        whatsappOrderReadyAlertEnabled: orderReadyAlertEnabled,
        whatsappReceiptAlertEnabled: digitalReceiptAlertEnabled,
      });

      showToast({
        type: 'success',
        title: 'WhatsApp Connecté avec Succès !',
        message: `Votre numéro (+${cleanPhone}) est désormais lié à RestoMaster OS pour tous les envois automatiques.`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Échec de jumelage',
        message: 'Impossible de connecter le WhatsApp du restaurant.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Action : Déconnecter le compte
  const handleDisconnect = async () => {
    setSaving(true);
    try {
      await restaurantWhatsAppService.disconnectDevice(restaurantId);
      setSessionStatus('disconnected');
      setConnectedAt(null);

      await updateSettings({
        whatsappGatewayMode: 'click_to_chat',
      });

      showToast({
        type: 'info',
        title: 'Appareil Déconnecté',
        message: 'La session WhatsApp du restaurant a été dissociée.',
      });

      generateQrCode();
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

  // Sauvegarde des préférences des déclencheurs
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const cleanPhone = formatWhatsAppPhoneNumber(restaurantPhoneNumber);
      const newConfig: RestaurantWhatsAppSettings = {
        enabled,
        restaurantPhoneNumber: cleanPhone,
        senderTitle: senderTitle.trim(),
        gatewayMode: sessionStatus === 'connected' ? 'qr_connected' : 'click_to_chat',
        sessionStatus,
        connectedPhoneNumber: sessionStatus === 'connected' ? cleanPhone : undefined,
        connectedAt: connectedAt || undefined,
        reservationAlertEnabled,
        orderReadyAlertEnabled,
        digitalReceiptAlertEnabled,
      };

      await restaurantWhatsAppService.saveWhatsAppSettings(restaurantId, newConfig);
      await updateSettings({
        whatsappConfig: newConfig,
        whatsappGatewayEnabled: enabled,
        whatsappGatewayMode: sessionStatus === 'connected' ? 'qr_connected' : 'click_to_chat',
        whatsappPhoneNumber: cleanPhone,
        whatsappSenderTitle: senderTitle.trim(),
        whatsappReservationAlertEnabled: reservationAlertEnabled,
        whatsappOrderReadyAlertEnabled: orderReadyAlertEnabled,
        whatsappReceiptAlertEnabled: digitalReceiptAlertEnabled,
      });

      showToast({
        type: 'success',
        title: 'Préférences Enregistrées',
        message: 'Les réglages des notifications WhatsApp ont été mis à jour.',
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
        openInBrowser: sessionStatus !== 'connected',
      });

      if (res.success) {
        setTestStatus({
          type: 'success',
          message: sessionStatus === 'connected'
            ? `Message WhatsApp transmis automatiquement depuis le numéro du restaurant (+${connectedPhoneNumber}) à ${cleanPhone} !`
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

  return (
    <div className="space-y-6">
      {/* 1. Bloc de Connexion Directe par QR Code */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  WhatsApp Restaurant Connect
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                  Sans Code · 100% Intégré
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tous les messages WhatsApp sont expédiés automatiquement avec le <strong>vrai numéro de téléphone</strong> de votre établissement.
              </p>
            </div>
          </div>

          {/* Numéro Officiel du Restaurant */}
          <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Numéro Officiel :</span>
              <input
                type="tel"
                value={restaurantPhoneNumber}
                onChange={(e) => setRestaurantPhoneNumber(e.target.value)}
                placeholder="+237 6XX XX XX XX"
                className="text-xs font-black text-slate-900 bg-transparent focus:outline-none w-36"
              />
            </div>
          </div>
        </div>

        {/* État de Connexion : Connecté vs Non Connecté */}
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
                      Appareil Connecté & Actif
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Session WhatsApp Web liée</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    Numéro Émetteur : +{connectedPhoneNumber || restaurantPhoneNumber}
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Vos clients reçoivent directement les reçus et avis de commande depuis ce compte WhatsApp.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 transition-colors shadow-2xs cursor-pointer"
                  title="Dissocier ce téléphone"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Déconnecter l'appareil</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-emerald-200/80 text-xs text-slate-600 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Statut : Chiffrement de bout-en-bout actif · Connexion synchronisée</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Connecté le {connectedAt ? new Date(connectedAt).toLocaleDateString('fr-FR') : 'Aujourd’hui'}
              </span>
            </div>
          </div>
        ) : (
          /* Écran de Jumelage par Scan QR Code */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-6 rounded-3xl bg-slate-50 border border-slate-200">
            {/* Colonne QR Code */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-xs relative">
              <div className="relative">
                {isGeneratingQr ? (
                  <div className="w-[260px] h-[260px] flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <span className="text-xs font-semibold">Génération du code sécurisé...</span>
                  </div>
                ) : qrDataUrl ? (
                  <div className="relative p-2 bg-white rounded-xl">
                    <img
                      src={qrDataUrl}
                      alt="QR Code Connexion WhatsApp"
                      className="w-[240px] h-[240px] rounded-lg"
                    />
                    {/* Badge WhatsApp central */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 flex items-center justify-between w-full px-2 text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />
                  <span>Expire dans {qrCountdown}s</span>
                </span>
                <button
                  type="button"
                  onClick={() => generateQrCode()}
                  className="text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  Rafraîchir
                </button>
              </div>
            </div>

            {/* Colonne Explication & Validation */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-700 px-2 py-0.5 rounded-md bg-emerald-100">
                  Étape 1 sur 1
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Connectez le smartphone du restaurant en 3 étapes :
                </h3>
                <p className="text-xs text-slate-500">
                  Aucun mot de passe requis. Le jumelage utilise la fonction officielle d'Appareil Connecté de WhatsApp.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="text-xs text-slate-700">
                    Ouvrez l'application <strong>WhatsApp</strong> sur le smartphone officiel de votre restaurant.
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
                    Touchez <strong>« Connecter un appareil »</strong> et visez le QR Code ci-contre avec votre appareil photo.
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConfirmPairing}
                  disabled={saving || !restaurantPhoneNumber.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connexion en cours...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>J'ai scanné le QR Code — Lier mon compte</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Déclencheurs Automatiques (Strictement filtrés selon l'abonnement souscrit) */}
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
            onClick={handleSaveSettings}
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
              placeholder="Ex: 699 00 11 22 ou +237 6..."
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
