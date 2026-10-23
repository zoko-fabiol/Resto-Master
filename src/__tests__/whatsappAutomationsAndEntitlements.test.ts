import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatWhatsAppPhoneNumber,
  buildWhatsAppClickToChatUrl,
  restaurantWhatsAppService,
  generateWhatsAppQrPayload,
} from '../services/whatsapp/restaurantWhatsAppService';

describe('Service WhatsApp & Conditionnement des Alertes par Abonnement', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Formatage et Normalisation des Numéros Internationaux', () => {
    it('normalise les numéros locaux camerounais en ajoutant l’indicatif 237', () => {
      expect(formatWhatsAppPhoneNumber('699001122')).toBe('237699001122');
      expect(formatWhatsAppPhoneNumber('670 12 34 56')).toBe('237670123456');
    });

    it('nettoie les numéros internationaux commençant par + ou 00', () => {
      expect(formatWhatsAppPhoneNumber('+237 655 88 99 00')).toBe('237655889900');
      expect(formatWhatsAppPhoneNumber('0033612345678')).toBe('33612345678');
    });

    it('retourne une chaîne vide pour les entrées invalides ou vides', () => {
      expect(formatWhatsAppPhoneNumber('')).toBe('');
      expect(formatWhatsAppPhoneNumber('abc')).toBe('');
    });
  });

  describe('Construction des Liens Click-to-Chat', () => {
    it('génère une URL wa.me avec le numéro et le message encodé', () => {
      const url = buildWhatsAppClickToChatUrl('699001122', 'Bonjour RestoMaster');
      expect(url).toContain('https://wa.me/237699001122?text=Bonjour%20RestoMaster');
    });
  });

  describe('Modèles de Messages Métier', () => {
    it('génère un modèle de confirmation de réservation complet', () => {
      const msg = restaurantWhatsAppService.buildReservationMessage({
        restaurantName: 'Le Gourmet Douala',
        customerName: 'M. Dupont',
        date: '2026-10-25',
        time: '20:00',
        guestCount: 4,
        tableName: 'Table 5',
      });

      expect(msg).toContain('Le Gourmet Douala');
      expect(msg).toContain('M. Dupont');
      expect(msg).toContain('2026-10-25');
      expect(msg).toContain('20:00');
      expect(msg).toContain('4 personne(s)');
      expect(msg).toContain('Table : Table 5');
    });

    it('génère un modèle de commande prête en cuisine', () => {
      const msg = restaurantWhatsAppService.buildOrderReadyMessage({
        restaurantName: 'Le Gourmet Douala',
        customerName: 'Mme Kamga',
        orderNumber: 'CMD-104',
        tableName: 'Terrasse 2',
      });

      expect(msg).toContain('Le Gourmet Douala');
      expect(msg).toContain('Mme Kamga');
      expect(msg).toContain('#CMD-104');
      expect(msg).toContain('Terrasse 2');
    });

    it('génère un modèle de ticket de caisse certifié', () => {
      const msg = restaurantWhatsAppService.buildReceiptMessage({
        restaurantName: 'Le Gourmet Douala',
        customerName: 'Client Comptoir',
        receiptNumber: 'REC-889',
        date: '23/10/2026',
        totalFcfa: 45000,
        paymentMethod: 'ORANGE MONEY',
      });

      expect(msg).toContain('Le Gourmet Douala');
      expect(msg).toContain('REC-889');
      expect(msg).toContain('45');
      expect(msg).toContain('ORANGE MONEY');
    });
  });

  describe('Envoi Automatique vs Mode 1-Clic', () => {
    it('tente l’envoi silencieux via Webhook si configuré en mode automatique', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'sent' }),
      });
      global.fetch = fetchMock;

      const result = await restaurantWhatsAppService.sendMessage({
        to: '+237 655 88 99 00',
        message: 'Notification automatique test',
        settings: {
          whatsappGatewayEnabled: true,
          whatsappGatewayMode: 'automatic_webhook',
          whatsappWebhookUrl: 'https://api.my-whatsapp-gateway.com/send',
          whatsappApiKey: 'secret_token_123',
          whatsappSenderTitle: 'Le Gourmet Douala',
        },
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('automatic_webhook');
      expect(fetchMock).toHaveBeenCalledWith('https://api.my-whatsapp-gateway.com/send', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer secret_token_123',
        }),
      }));
    });

    it('bascule en repli Click-to-Chat si le webhook échoue', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = fetchMock;

      const result = await restaurantWhatsAppService.sendMessage({
        to: '699001122',
        message: 'Repli test',
        settings: {
          whatsappGatewayEnabled: true,
          whatsappGatewayMode: 'automatic_webhook',
          whatsappWebhookUrl: 'https://bad-url.test',
        },
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('click_to_chat');
      expect(result.actionUrl).toContain('https://wa.me/237699001122');
    });
  });

  describe('Conditionnement par les Droits et Déclencheurs (isTriggerEnabled)', () => {
    it('respecte l’activation globale de la passerelle WhatsApp', () => {
      expect(
        restaurantWhatsAppService.isTriggerEnabled(
          { whatsappGatewayEnabled: false, whatsappReservationAlertEnabled: true },
          'reservation_confirmed'
        )
      ).toBe(false);
    });

    it('respecte le paramètre unitaire de chaque déclencheur', () => {
      const settings = {
        whatsappGatewayEnabled: true,
        whatsappReservationAlertEnabled: true,
        whatsappOrderReadyAlertEnabled: false,
        whatsappReceiptAlertEnabled: true,
      };

      expect(restaurantWhatsAppService.isTriggerEnabled(settings, 'reservation_confirmed')).toBe(true);
      expect(restaurantWhatsAppService.isTriggerEnabled(settings, 'order_ready')).toBe(false);
      expect(restaurantWhatsAppService.isTriggerEnabled(settings, 'receipt_sent')).toBe(true);
    });
  });

  describe('Jumelage Direct par QR Code (WhatsApp Connect)', () => {
    it('génère un payload de jumelage QR Code unique pour le restaurant', () => {
      const payload = generateWhatsAppQrPayload({
        restaurantId: 'resto_123',
        restaurantName: 'Le Gourmet',
        phoneNumber: '655889900',
      });

      expect(payload).toContain('RESTOMASTER-WHATSAPP-PAIRING:v2:resto_123:237655889900');
    });

    it('associe le numéro du restaurant et active le statut connecté', async () => {
      vi.spyOn(restaurantWhatsAppService, 'saveWhatsAppSettings').mockResolvedValue();

      const session = await restaurantWhatsAppService.pairDeviceWithQr({
        restaurantId: 'resto_123',
        phoneNumber: '+237 655 88 99 00',
        restaurantName: 'Le Gourmet Douala',
      });

      expect(session.sessionStatus).toBe('connected');
      expect(session.connectedPhoneNumber).toBe('237655889900');
      expect(session.gatewayMode).toBe('qr_connected');
    });

    it('envoie en mode qr_connected depuis le numéro officiel du restaurant', async () => {
      const result = await restaurantWhatsAppService.sendMessage({
        to: '+237 655 88 99 00',
        message: 'Notification avec le propre numéro du restaurant',
        settings: {
          whatsappGatewayEnabled: true,
          whatsappGatewayMode: 'qr_connected',
          whatsappSessionStatus: 'connected',
          whatsappConnectedPhoneNumber: '237655889900',
          whatsappSenderTitle: 'Le Gourmet Douala',
        },
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('qr_connected');
      expect(result.message).toContain('237655889900');
    });
  });
});
