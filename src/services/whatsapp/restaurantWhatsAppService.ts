/**
 * RestoMaster OS — Service WhatsApp Dédié au Restaurant
 * Supporte :
 * 1. Envoi 100% Automatique via Passerelle Webhook (avec le propre numéro du restaurant)
 * 2. Repli Direct 1-Clic via Lien Universel WhatsApp Web / Mobile
 */

import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface RestaurantWhatsAppSettings {
  enabled?: boolean;
  restaurantPhoneNumber?: string; // Numéro WhatsApp officiel du restaurant (ex: "+237 6XX XX XX XX")
  senderTitle?: string; // Nom d'expéditeur affiché
  gatewayMode?: 'automatic_webhook' | 'click_to_chat'; // 'automatic_webhook' (auto) ou 'click_to_chat' (1-clic)
  webhookUrl?: string; // URL webhook de la passerelle WhatsApp
  apiKey?: string; // Jeton API optionnel
  reservationAlertEnabled?: boolean; // Confirmation de résa
  orderReadyAlertEnabled?: boolean; // Commande prête (KDS)
  digitalReceiptAlertEnabled?: boolean; // Ticket de caisse dématérialisé
}

/**
 * Normalise un numéro de téléphone au format international sans espaces ni caractères spéciaux.
 * Si le numéro commence sans code pays (ex: 699001122 pour le Cameroun), ajoute le préfixe par défaut.
 */
export function formatWhatsAppPhoneNumber(phone: string, defaultCountryCode: string = '237'): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  } else if (!cleaned.startsWith(defaultCountryCode) && (cleaned.length === 8 || cleaned.length === 9)) {
    cleaned = `${defaultCountryCode}${cleaned}`;
  }

  return cleaned;
}

/**
 * Construit un lien universel Click-to-Chat WhatsApp avec message pré-rempli
 */
export function buildWhatsAppClickToChatUrl(phone: string, message: string): string {
  const cleanPhone = formatWhatsAppPhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

export const restaurantWhatsAppService = {
  /**
   * Récupère la configuration WhatsApp du restaurant
   */
  async getWhatsAppSettings(restaurantId: string): Promise<RestaurantWhatsAppSettings> {
    try {
      if (restaurantId) {
        const snap = await getDoc(doc(db, 'restaurants', restaurantId, 'settings', 'whatsapp_config'));
        if (snap.exists()) {
          return snap.data() as RestaurantWhatsAppSettings;
        }
      }
    } catch (e) {
      console.warn('[restaurantWhatsAppService] Erreur lecture settings WhatsApp:', e);
    }

    return {
      enabled: true,
      gatewayMode: 'click_to_chat',
      reservationAlertEnabled: true,
      orderReadyAlertEnabled: true,
      digitalReceiptAlertEnabled: true,
    };
  },

  /**
   * Sauvegarde la configuration WhatsApp du restaurant
   */
  async saveWhatsAppSettings(restaurantId: string, settings: RestaurantWhatsAppSettings): Promise<void> {
    if (!restaurantId) return;
    try {
      await setDoc(
        doc(db, 'restaurants', restaurantId, 'settings', 'whatsapp_config'),
        {
          ...settings,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.error('[restaurantWhatsAppService] Erreur sauvegarde settings WhatsApp:', e);
      throw e;
    }
  },

  /**
   * Vérifie si un déclencheur particulier est activé dans les réglages du restaurant.
   */
  isTriggerEnabled(settings: any, trigger: 'reservation_confirmed' | 'order_ready' | 'receipt_sent'): boolean {
    if (!settings) return false;
    // Si la passerelle WhatsApp est désactivée globalement
    if (settings.whatsappGatewayEnabled === false) return false;

    if (trigger === 'reservation_confirmed') {
      return Boolean(settings.whatsappReservationAlertEnabled ?? true);
    }
    if (trigger === 'order_ready') {
      return Boolean(settings.whatsappOrderReadyAlertEnabled ?? true);
    }
    if (trigger === 'receipt_sent') {
      return Boolean(settings.whatsappReceiptAlertEnabled ?? true);
    }
    return true;
  },

  /**
   * Envoi d'un message WhatsApp vers le numéro client
   * En mode automatic_webhook : envoi HTTP silencieux en tâche de fond.
   * En mode click_to_chat ou en repli : retourne l'URL Click-to-Chat.
   */
  async sendMessage(params: {
    restaurantId?: string;
    restaurantName?: string;
    to: string;
    message?: string;
    text?: string;
    trigger?: 'reservation_confirmed' | 'order_ready' | 'receipt_sent';
    settings?: any;
    openInBrowser?: boolean;
  }): Promise<{ success: boolean; mode: 'automatic_webhook' | 'click_to_chat'; actionUrl?: string; waUrl?: string; message: string }> {
    const rawMessage = params.message || params.text || '';
    const cleanPhone = formatWhatsAppPhoneNumber(params.to);

    if (!cleanPhone || cleanPhone.length < 8) {
      return {
        success: false,
        mode: 'click_to_chat',
        message: 'Numéro de téléphone destinataire invalide.',
      };
    }

    let config: RestaurantWhatsAppSettings = {
      gatewayMode: params.settings?.whatsappGatewayMode || 'click_to_chat',
      webhookUrl: params.settings?.whatsappWebhookUrl,
      apiKey: params.settings?.whatsappApiKey,
      restaurantPhoneNumber: params.settings?.whatsappPhoneNumber,
      senderTitle: params.settings?.whatsappSenderTitle,
    };

    if (params.restaurantId && !params.settings) {
      config = await this.getWhatsAppSettings(params.restaurantId);
    }

    const clickToChatUrl = buildWhatsAppClickToChatUrl(cleanPhone, rawMessage);

    // 1. Mode Automatique via Webhook
    if (config.gatewayMode === 'automatic_webhook' && config.webhookUrl && config.webhookUrl.trim().startsWith('http')) {
      try {
        const response = await fetch(config.webhookUrl.trim(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey.trim()}` } : {}),
          },
          body: JSON.stringify({
            phone: cleanPhone,
            message: rawMessage,
            trigger: params.trigger,
            restaurantName: params.restaurantName || config.senderTitle || 'Restaurant',
            senderPhone: config.restaurantPhoneNumber || undefined,
            timestamp: new Date().toISOString(),
          }),
        });

        if (response.ok) {
          return {
            success: true,
            mode: 'automatic_webhook',
            actionUrl: clickToChatUrl,
            waUrl: clickToChatUrl,
            message: `Message WhatsApp transmis automatiquement à ${cleanPhone}.`,
          };
        }
      } catch (err) {
        console.warn('[restaurantWhatsAppService] Échec envoi webhook auto, bascule vers lien direct:', err);
      }
    }

    // 2. Mode Click-to-Chat (Direct ou Repli)
    if (params.openInBrowser && typeof window !== 'undefined') {
      window.open(clickToChatUrl, '_blank', 'noopener,noreferrer');
    }

    return {
      success: true,
      mode: 'click_to_chat',
      actionUrl: clickToChatUrl,
      waUrl: clickToChatUrl,
      message: `Lien WhatsApp généré pour ${cleanPhone}.`,
    };
  },

  /**
   * Modèle de message : Confirmation de Réservation de Table
   */
  buildReservationMessage(data: {
    restaurantName: string;
    customerName: string;
    date: string;
    time: string;
    guestCount: number;
    tableName?: string;
  }): string {
    const tableInfo = data.tableName ? `\n📍 Table : ${data.tableName}` : '';
    return `🍽️ *${data.restaurantName}*
━━━━━━━━━━━━━━━━━━━━
Bonjour *${data.customerName}*,

Votre réservation est bien confirmée !
📅 Date : ${data.date}
⏰ Heure : ${data.time}
👥 Couverts : ${data.guestCount} personne(s)${tableInfo}

Nous nous réjouissons de vous accueillir.
À très bientôt chez *${data.restaurantName}* !`;
  },

  /**
   * Modèle de message : Commande Prête en Cuisine / Bar
   */
  buildOrderReadyMessage(data: {
    restaurantName: string;
    customerName: string;
    orderNumber: string;
    tableName?: string;
  }): string {
    const place = data.tableName ? `à votre table (${data.tableName})` : 'au comptoir de retrait';
    return `🔔 *${data.restaurantName}*
━━━━━━━━━━━━━━━━━━━━
Bonjour *${data.customerName}*,

Votre commande *#${data.orderNumber}* est prête !
👉 Vos plats sont prêts à être servis ${place}.

Bon appétit chez *${data.restaurantName}* ! 🍴`;
  },

  /**
   * Modèle de message : Reçu / Ticket de Caisse Dématérialisé
   */
  buildReceiptMessage(data: {
    restaurantName: string;
    customerName: string;
    receiptNumber: string;
    date: string;
    totalFcfa: number;
    paymentMethod: string;
  }): string {
    return `🧾 *${data.restaurantName}* — Ticket de Caisse
━━━━━━━━━━━━━━━━━━━━
Bonjour *${data.customerName}*,

Merci pour votre visite ! Voici votre reçu :
📄 N° Reçu : ${data.receiptNumber}
📅 Date : ${data.date}
💳 Règlement : ${data.paymentMethod}
💰 *Total TTC : ${data.totalFcfa.toLocaleString('fr-FR')} FCFA*

Au plaisir de vous revoir chez *${data.restaurantName}* !`;
  },
};
