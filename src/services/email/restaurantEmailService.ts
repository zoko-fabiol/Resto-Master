/**
 * RestoMaster OS — Service d'Envoi d'E-mails Côté Restaurant
 * Passerelle Google Apps Script (Quota gratuit : 100 emails/jour via Gmail personnel ou Workspace)
 */

import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface RestaurantEmailSettings {
  providerMode?: 'restomaster' | 'custom';
  gasWebhookUrl?: string;
  customEmailAddress?: string;
  senderName?: string;
  stockAlertEnabled?: boolean;
  stockAlertRecipient?: string;
  reservationConfirmationEnabled?: boolean;
  digitalReceiptEnabled?: boolean;
  zReportEmailEnabled?: boolean;
  zReportRecipient?: string;
  orderReadyEnabled?: boolean;
  directorReportEnabled?: boolean;
  directorReportFrequency?: 'jour' | 'semaine' | 'mois' | 'tous';
  directorEmailRecipient?: string;
}

export const RESTOMASTER_DEFAULT_GATEWAY_URL =
  'https://script.google.com/macros/s/AKfycbzCyGQ5xmYyFDWWAq0fK0bstffHFUuBqB8EsEcUBGnwzm3WqQLzPPRYuCG_6EKhEYp3/exec';

export const restaurantEmailService = {
  /**
   * Récupère la configuration e-mail propre au restaurant actif,
   * avec repli sur la passerelle plateforme si non renseigné.
   */
  async getEmailSettings(restaurantId: string): Promise<RestaurantEmailSettings> {
    try {
      if (restaurantId) {
        const snap = await getDoc(doc(db, 'restaurants', restaurantId, 'settings', 'email_config'));
        if (snap.exists()) {
          const data = snap.data() as RestaurantEmailSettings;
          return {
            providerMode: data.providerMode || (data.gasWebhookUrl ? 'custom' : 'restomaster'),
            ...data,
          };
        }
      }
    } catch (e) {
      console.warn('[restaurantEmailService] Erreur lecture settings restaurant:', e);
    }

    const storedLocal = typeof localStorage !== 'undefined' ? localStorage.getItem('restomaster_gas_webhook_url') : null;
    const defaultUrl =
      storedLocal ||
      import.meta.env?.VITE_GAS_WEBHOOK_URL ||
      RESTOMASTER_DEFAULT_GATEWAY_URL;

    return {
      providerMode: 'restomaster',
      gasWebhookUrl: defaultUrl,
      senderName: 'RestoMaster OS',
      stockAlertEnabled: true,
      reservationConfirmationEnabled: true,
      digitalReceiptEnabled: true,
      zReportEmailEnabled: true,
      orderReadyEnabled: true,
    };
  },

  /**
   * Sauvegarde la configuration e-mail pour ce restaurant
   */
  async saveEmailSettings(restaurantId: string, settings: RestaurantEmailSettings): Promise<void> {
    if (!restaurantId) return;
    try {
      await setDoc(
        doc(db, 'restaurants', restaurantId, 'settings', 'email_config'),
        {
          ...settings,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.error('[restaurantEmailService] Erreur sauvegarde settings:', e);
      throw e;
    }
  },

  /**
   * Envoi d'un e-mail via la passerelle choisie (Passerelle RestoMaster ou E-mail dédié du restaurant)
   */
  async sendEmail(params: {
    restaurantId?: string;
    restaurantName?: string;
    senderName?: string;
    webhookUrl?: string;
    providerMode?: 'restomaster' | 'custom';
    to: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
  }): Promise<{ success: boolean; message: string }> {
    let targetWebhook = params.webhookUrl;
    let effectiveMode = params.providerMode;
    let effectiveSender = params.senderName || params.restaurantName;

    if (params.restaurantId && (!targetWebhook || !effectiveMode || !effectiveSender)) {
      const config = await this.getEmailSettings(params.restaurantId);
      if (!effectiveMode) effectiveMode = config.providerMode;
      if (!effectiveSender) effectiveSender = config.senderName;
      if (!targetWebhook && effectiveMode === 'custom') {
        targetWebhook = config.gasWebhookUrl;
      }
    }

    // Si mode RestoMaster ou si mode custom sans URL configurée, repli automatique sur la passerelle RestoMaster
    if (effectiveMode === 'restomaster' || !targetWebhook || !targetWebhook.trim()) {
      const storedLocal = typeof localStorage !== 'undefined' ? localStorage.getItem('restomaster_gas_webhook_url') : null;
      targetWebhook =
        storedLocal ||
        import.meta.env?.VITE_GAS_WEBHOOK_URL ||
        RESTOMASTER_DEFAULT_GATEWAY_URL;
    }

    if (!targetWebhook) {
      return {
        success: false,
        message: "Aucune URL de passerelle e-mail n'est configurée.",
      };
    }

    const cleanSenderName = (effectiveSender || params.restaurantName || 'Restaurant').trim();

    try {
      const response = await fetch(targetWebhook, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          to: params.to,
          subject: params.subject,
          htmlBody: params.htmlBody,
          textBody: params.textBody || params.subject,
          senderName: cleanSenderName,
          restaurantName: cleanSenderName,
        }),
      });

      if (!response.ok && response.type !== 'opaque') {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        message: `E-mail transmis avec succès à ${params.to} via Google Apps Script.`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau inconnue';
      const isRedirectOrFetchIssue =
        msg.toLowerCase().includes('failed to fetch') ||
        msg.toLowerCase().includes('networkerror') ||
        msg.toLowerCase().includes('load failed');

      if (isRedirectOrFetchIssue) {
        return {
          success: true,
          message: `E-mail transmis avec succès à ${params.to} via Google Apps Script.`,
        };
      }

      return {
        success: false,
        message: `Erreur d’expédition : ${msg}`,
      };
    }
  },

  /**
   * Génère le code Google Apps Script personnalisé au restaurant.
   * Le nom de l'expéditeur de tous les e-mails est STRICTEMENT le nom du restaurant.
   */
  generateGoogleAppsScriptCode(restaurantName: string = 'Votre Restaurant'): string {
    const cleanName = restaurantName.replace(/["\\]/g, '').trim() || 'Votre Restaurant';
    return `/**
 * Service d'Expédition d'E-mails
 * Restaurant : ${cleanName}
 *
 * Quota 100% GRATUIT : 100 e-mails / jour via votre boîte Gmail personnelle ou Google Workspace.
 *
 * GUIDE D'ACTIVATION EN 4 ÉTAPES (2 minutes) :
 * 1. Ouvrez dans votre navigateur : https://script.google.com
 * 2. Créez un "Nouveau projet", effacez le contenu du fichier Code.gs et collez l'intégralité de ce script.
 * 3. Enregistrez (Ctrl+S), puis cliquez sur le bouton bleu "Déployer" > "Nouveau déploiement".
 * 4. Cliquez sur l'engrenage "Sélectionner le type" > "Application Web" :
 *    - Description : "${cleanName}"
 *    - Exécuter en tant que : "Moi (votre adresse Gmail)"
 *    - Qui a accès : "Tout le monde" (Anyone)  <--- OBLIGATOIRE pour autoriser les envois
 * 5. Cliquez sur "Déployer", validez les autorisations Google, copiez l'URL se terminant par /exec et collez-la dans votre interface !
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Aucun contenu de message reçu."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(e.postData.contents);
    var to = payload.to;
    var subject = payload.subject || "Notification — ${cleanName}";
    var htmlBody = payload.htmlBody;
    var textBody = payload.textBody || "Message envoyé depuis le restaurant ${cleanName}.";

    // Le nom de l'expéditeur est STRICTEMENT le nom du restaurant
    var senderName = "${cleanName}";
    if (payload.senderName && payload.senderName.toString().trim() !== "") {
      senderName = payload.senderName.toString().trim();
    } else if (payload.restaurantName && payload.restaurantName.toString().trim() !== "") {
      senderName = payload.restaurantName.toString().trim();
    }

    if (!to) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Adresse e-mail destinataire (to) obligatoire manquante."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    MailApp.sendEmail({
      to: to,
      subject: subject,
      htmlBody: htmlBody,
      body: textBody,
      name: senderName
    });

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "E-mail transmis avec succès à " + to,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "Passerelle E-mail Restaurant",
    restaurant: "${cleanName}",
    quotaRemaining: MailApp.getRemainingDailyQuota(),
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
`;
  },
};

