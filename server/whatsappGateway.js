/**
 * RestoMaster OS — Passerelle WhatsApp Embarquée (Baileys Multi-Device)
 * 100% Autonome, 100% Gratuite, Sans Inscription Tiers
 *
 * Se connecte directement au protocole WhatsApp Web Noise via WebSocket.
 * Émet le vrai QR Code officiel accepté par l'application WhatsApp mobile.
 */

import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import pino from 'pino';

const AUTH_FOLDER = path.resolve(process.cwd(), '.whatsapp_auth');

let sock = null;
let currentQr = '';
let currentQrDataUrl = '';
let connectionStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'connected'
let connectedPhone = '';
let isInitializing = false;
let reconnectTimer = null;

export async function initWhatsAppGateway() {
  if (sock || isInitializing) return;
  isInitializing = true;

  try {
    if (!fs.existsSync(AUTH_FOLDER)) {
      fs.mkdirSync(AUTH_FOLDER, { recursive: true });
    }

    const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = await import('@whiskeysockets/baileys');
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

    connectionStatus = 'connecting';

    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['RestoMaster OS', 'Chrome', '1.0.0'],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQr = qr;
        try {
          currentQrDataUrl = await QRCode.toDataURL(qr, {
            margin: 2,
            scale: 8,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          });
        } catch {
          currentQrDataUrl = '';
        }
        connectionStatus = 'connecting';
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;

        connectionStatus = 'disconnected';
        currentQr = '';
        currentQrDataUrl = '';
        sock = null;

        if (isLoggedOut) {
          // Si déconnecté explicitement, nettoyer le dossier de session
          try {
            fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
          } catch {
            // ignore
          }
        } else {
          // Reconnexion automatique si perte réseau
          if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null;
              isInitializing = false;
              initWhatsAppGateway();
            }, 5000);
          }
        }
      } else if (connection === 'open') {
        connectionStatus = 'connected';
        currentQr = '';
        currentQrDataUrl = '';

        if (sock?.user?.id) {
          connectedPhone = sock.user.id.split(':')[0] || '';
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);
  } catch (err) {
    console.warn('[WhatsApp Gateway] Erreur initialisation Baileys:', err);
    connectionStatus = 'disconnected';
    sock = null;
  } finally {
    isInitializing = false;
  }
}

export function getGatewayStatus() {
  return {
    connected: connectionStatus === 'connected',
    status: connectionStatus,
    phone: connectedPhone,
    hasQr: Boolean(currentQrDataUrl),
  };
}

export function getGatewayQr() {
  // Démarre la connexion si elle n'est pas encore en cours
  if (connectionStatus === 'disconnected' && !isInitializing) {
    initWhatsAppGateway();
  }

  return {
    connected: connectionStatus === 'connected',
    status: connectionStatus,
    qr: currentQr,
    qrDataUrl: currentQrDataUrl,
    phone: connectedPhone,
  };
}

export async function sendGatewayMessage(to, message) {
  if (connectionStatus !== 'connected' || !sock) {
    return {
      success: false,
      message: 'Passerelle WhatsApp locale non connectée. Scannez d’abord le QR code.',
    };
  }

  try {
    let cleanPhone = String(to).replace(/[^\d]/g, '');
    if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
    if (!cleanPhone.startsWith('237') && (cleanPhone.length === 8 || cleanPhone.length === 9)) {
      cleanPhone = `237${cleanPhone}`;
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;
    const result = await sock.sendMessage(jid, { text: message });

    return {
      success: true,
      id: result?.key?.id || String(Date.now()),
      message: `Message WhatsApp transmis à +${cleanPhone}`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erreur d’envoi Baileys';
    return {
      success: false,
      message: errorMsg,
    };
  }
}

export async function disconnectGateway() {
  try {
    if (sock) {
      await sock.logout().catch(() => {});
      sock = null;
    }
  } catch {
    // ignore
  }

  connectionStatus = 'disconnected';
  connectedPhone = '';
  currentQr = '';
  currentQrDataUrl = '';

  try {
    if (fs.existsSync(AUTH_FOLDER)) {
      fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
    }
  } catch {
    // ignore
  }

  return { success: true };
}
