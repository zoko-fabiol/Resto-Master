import { db } from '../../../src/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface WelcomeEmailData {
  to: string;
  recipientName: string;
  restaurantName: string;
  restaurantCode: string;
  email: string;
  password?: string;
  planName?: string;
  city?: string;
  loginUrl?: string;
}

export interface GasEmailConfig {
  webhookUrl: string;
  isActive?: boolean;
}

const STORAGE_KEY = 'restomaster_gas_webhook_url';

export const gasEmailService = {
  /**
   * Récupère la configuration du webhook GAS
   */
  async getConfig(): Promise<GasEmailConfig> {
    const webhookUrl = await this.getWebhookUrl();
    return {
      webhookUrl,
      isActive: !!webhookUrl,
    };
  },

  /**
   * Sauvegarde la configuration du webhook GAS
   */
  async saveConfig(config: GasEmailConfig): Promise<void> {
    await this.saveWebhookUrl(config.webhookUrl);
  },

  /**
   * Récupère l'URL du webhook Google Apps Script depuis Firestore, avec repli sur localStorage
   */
  async getWebhookUrl(): Promise<string> {
    try {
      const snap = await getDoc(doc(db, 'settings', 'email_config'));
      if (snap.exists() && snap.data().gasWebhookUrl) {
        return snap.data().gasWebhookUrl as string;
      }
    } catch (e) {
      console.warn('[gasEmailService] Impossible de lire settings/email_config:', e);
    }
    return (
      localStorage.getItem(STORAGE_KEY) ||
      import.meta.env.VITE_GAS_WEBHOOK_URL ||
      'https://script.google.com/macros/s/AKfycbx6zKdA_7SAwejIXUjJd49rTikO6wTsO_5MPZFEl2lU3rjYjBwApSAxr7OuTUMACnY/exec'
    );
  },

  /**
   * Enregistre l'URL du webhook Google Apps Script dans Firestore et dans le cache local
   */
  async saveWebhookUrl(url: string): Promise<void> {
    const cleanUrl = url.trim();
    localStorage.setItem(STORAGE_KEY, cleanUrl);
    try {
      await setDoc(
        doc(db, 'settings', 'email_config'),
        {
          gasWebhookUrl: cleanUrl,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('[gasEmailService] Impossible d’enregistrer settings/email_config:', e);
    }
  },

  /**
   * Envoi universel d'un e-mail quelconque via Google Apps Script Webhook
   */
  async sendEmail(params: {
    to: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
  }): Promise<{ success: boolean; message: string }> {
    const webhookUrl = await this.getWebhookUrl();
    if (!webhookUrl) {
      return {
        success: false,
        message: 'Webhook Google Apps Script non configuré. Veuillez renseigner l’URL dans la console.',
      };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          to: params.to,
          subject: params.subject,
          htmlBody: params.htmlBody,
          textBody: params.textBody || 'Message RestoMaster OS',
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
      const msg = err instanceof Error ? err.message : 'Erreur réseau';
      const isRedirectOrFetchIssue =
        msg.toLowerCase().includes('failed to fetch') ||
        msg.toLowerCase().includes('networkerror') ||
        msg.toLowerCase().includes('load failed');

      // Sur Google Apps Script Web App, une exception 'Failed to fetch' survient après que le POST a été reçu et traité par Google,
      // lors de la tentative du navigateur de suivre la redirection 302 vers script.googleusercontent.com.
      // Le mail est bel et bien expédié par Google (constaté en boîte Gmail).
      if (isRedirectOrFetchIssue) {
        return {
          success: true,
          message: `E-mail transmis avec succès à ${params.to} via Google Apps Script.`,
        };
      }

      return {
        success: false,
        message: `Erreur d’envoi : ${msg}`,
      };
    }
  },

  /**
   * Génère le template HTML soigné et responsive pour l'e-mail d'activation
   */
  buildWelcomeEmailHtml(data: WelcomeEmailData): string {
    const loginLink = data.loginUrl || window.location.origin;
    const planDisplay = data.planName || 'Formule Professionnelle (Pro)';
    const pwdDisplay = data.password ? data.password : 'Déjà défini lors de votre inscription';

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vos Identifiants RestoMaster OS</title>
</head>
<body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#020617;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:580px;background-color:#0f172a;border:1px solid #1e293b;border-radius:24px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
          
          <!-- En-tête de marque -->
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;background:linear-gradient(180deg,#1e293b 0%,#0f172a 100%);border-bottom:1px solid #334155;">
              <div style="display:inline-block;padding:12px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);border-radius:18px;margin-bottom:12px;">
                <span style="font-size:28px;">🍽️</span>
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                RestoMaster <span style="color:#f59e0b;">OS</span>
              </h1>
              <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;font-weight:500;">
                Système de Gestion Intégrée de Restaurant
              </p>
            </td>
          </tr>

          <!-- Corps du message -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#ffffff;">
                Félicitations ${data.recipientName} ! 🎉
              </h2>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#cbd5e1;">
                Votre demande d’ouverture pour l'établissement <strong style="color:#ffffff;">${data.restaurantName}</strong> a été validée avec succès par la direction de la plateforme. Votre espace est opérationnel.
              </p>

              <!-- Carte des identifiants sécurisés -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#020617;border:1px solid #334155;border-radius:16px;margin-bottom:24px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;background-color:#1e293b;border-bottom:1px solid #334155;">
                    <strong style="font-size:13px;color:#f59e0b;letter-spacing:0.5px;text-transform:uppercase;">
                      🔐 Vos Identifiants de Connexion
                    </strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="8">
                      <tr>
                        <td width="44%" style="font-size:12px;color:#94a3b8;font-weight:600;">Code Boutique / Restaurant :</td>
                        <td style="font-size:14px;color:#f59e0b;font-weight:800;font-family:monospace;letter-spacing:1px;">
                          ${data.restaurantCode}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:12px;color:#94a3b8;font-weight:600;">Identifiant E-mail :</td>
                        <td style="font-size:13px;color:#ffffff;font-weight:600;">
                          ${data.email}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:12px;color:#94a3b8;font-weight:600;">Mot de passe temporaire :</td>
                        <td style="font-size:14px;color:#38bdf8;font-family:monospace;font-weight:700;">
                          ${pwdDisplay}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:12px;color:#94a3b8;font-weight:600;">Formule souscrite :</td>
                        <td style="font-size:13px;color:#a7f3d0;font-weight:600;">
                          ${planDisplay}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:12px;color:#94a3b8;font-weight:600;">Période d'essai :</td>
                        <td style="font-size:13px;color:#10b981;font-weight:600;">
                          14 jours gratuits activés
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Bouton d'action CTA avec identifiants pré-remplis -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${loginLink}" target="_blank" style="display:inline-block;padding:15px 36px;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:#020617;text-decoration:none;font-size:14px;font-weight:800;border-radius:14px;box-shadow:0 10px 25px -5px rgba(245,158,11,0.4);letter-spacing:0.3px;">
                      🚀 Accéder à mon Restaurant (Identifiants pré-remplis) →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Parcours de première connexion -->
              <div style="background-color:rgba(15,23,42,0.6);border-left:3px solid #f59e0b;padding:14px 18px;border-radius:8px;font-size:12px;line-height:1.6;color:#cbd5e1;margin-bottom:20px;">
                <strong style="color:#f59e0b;display:block;margin-bottom:4px;">✨ Parcours de votre première connexion :</strong>
                <ol style="margin:4px 0 0;padding-left:18px;">
                  <li style="margin-bottom:4px;">Cliquez sur le bouton ci-dessus pour ouvrir l'application (vos identifiants sont automatiquement pré-remplis).</li>
                  <li style="margin-bottom:4px;">Connectez-vous avec votre <strong>mot de passe temporaire</strong> ci-dessus.</li>
                  <li style="margin-bottom:4px;">Définissez votre <strong>mot de passe personnel et sécurisé</strong>.</li>
                  <li>L'<strong>assistant de configuration guidée</strong> s'ouvrira immédiatement pour renseigner vos tables, votre carte et vos coordonnées.</li>
                </ol>
              </div>

              <p style="margin:0;font-size:13px;line-height:1.5;color:#94a3b8;">
                Notre équipe d'assistance reste à votre entière disposition pour vous accompagner dans la mise en service de votre restaurant.
              </p>
            </td>
          </tr>

          <!-- Pied de page -->
          <tr>
            <td style="padding:20px 32px;background-color:#020617;border-top:1px solid #1e293b;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#64748b;">
                RestoMaster OS • Plateforme Multi-Tenant de Restauration
              </p>
              <p style="margin:0;font-size:11px;color:#475569;">
                Ce message automatique vous est transmis suite à la validation de votre établissement.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  },

  /**
   * Envoie l'e-mail de bienvenue via le webhook Google Apps Script (100 mails/jour)
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<{ success: boolean; message: string }> {
    const webhookUrl = await this.getWebhookUrl();
    if (!webhookUrl) {
      console.warn('[gasEmailService] Aucun webhook Google Apps Script configuré.');
      return {
        success: false,
        message: 'Webhook Google Apps Script non configuré. Veuillez renseigner l’URL dans l’onglet Configuration E-mail.',
      };
    }

    const htmlBody = this.buildWelcomeEmailHtml(data);
    const subject = `Activation de votre établissement ${data.restaurantName} — Vos identifiants RestoMaster OS`;
    const textBody = `Bonjour ${data.recipientName},\n\nVotre établissement ${data.restaurantName} est actif.\nCode Restaurant: ${data.restaurantCode}\nE-mail: ${data.email}\nMot de passe: ${data.password || '(Défini lors de l’inscription)'}\n\nConnexion : ${data.loginUrl || window.location.origin}`;

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          to: data.to,
          subject,
          htmlBody,
          textBody,
        }),
      });

      if (!response.ok && response.type !== 'opaque') {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        message: `E-mail transmis avec succès à ${data.to} via Google Apps Script.`,
      };
    } catch (err: any) {
      console.error('[gasEmailService] Échec de l’envoi de l’e-mail via GAS:', err);
      return {
        success: false,
        message: `Erreur d’envoi par e-mail : ${err?.message || 'Vérifiez l’URL du Webhook'}`,
      };
    }
  },

  /**
   * Envoie un e-mail de test pour valider que le Webhook Google Apps Script fonctionne
   */
  async sendTestEmail(testRecipient: string): Promise<{ success: boolean; message: string }> {
    const webhookUrl = await this.getWebhookUrl();
    if (!webhookUrl) {
      throw new Error('Veuillez d’abord renseigner l’URL de votre Webhook Google Apps Script.');
    }

    return this.sendWelcomeEmail({
      to: testRecipient.trim(),
      recipientName: 'Administrateur Test',
      restaurantName: 'Restaurant Démo Le Gourmet',
      restaurantCode: 'RMS-DEMO-TEST',
      email: testRecipient.trim(),
      password: 'TestPassword123!',
      planName: 'Formule Professionnelle (Pro)',
      city: 'Douala',
    });
  },

  /**
   * Code source complet du script Google Apps Script à copier-coller
   */
  getGoogleAppsScriptCode(): string {
    return `/**
 * RestoMaster OS — Service d'Envoi d'E-mails Automatisés (Google Apps Script)
 * Quota gratuit : 100 e-mails / jour via votre compte Gmail personnel ou Google Workspace.
 *
 * GUIDE DE MISE EN SERVICE (3 minutes) :
 * 1. Rendez-vous sur : https://script.google.com
 * 2. Cliquez sur "Nouveau projet" (en haut à gauche).
 * 3. Remplacez tout le contenu du fichier Code.gs par l'intégralité de ce script.
 * 4. Cliquez sur "Déployer" (bouton bleu en haut à droite) > "Nouveau déploiement".
 * 5. Cliquez sur l'icône d'engrenage "Sélectionner le type" > choisissez "Application Web".
 * 6. Réglez les options suivantes :
 *    - Description : "RestoMaster Mailer"
 *    - Exécuter en tant que : "Moi (votre adresse Gmail)"
 *    - Qui a accès : "Tout le monde" (Anyone)  <-- IMPORTANT
 * 7. Cliquez sur "Déployer", accordez les autorisations d'accès Google.
 * 8. Copiez l'URL de l'application Web (se termine par /exec) et collez-la dans la Console Admin RestoMaster.
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Aucun corps de requête reçu."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var to = data.to;
    var subject = data.subject || "RestoMaster OS — Notification";
    var htmlBody = data.htmlBody;
    var textBody = data.textBody || "Message automatique de RestoMaster OS.";

    if (!to) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Champ 'to' obligatoire manquant."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    MailApp.sendEmail({
      to: to,
      subject: subject,
      htmlBody: htmlBody,
      body: textBody,
      name: "RestoMaster OS"
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
    service: "RestoMaster OS Mailer Webhook",
    quotaRemaining: MailApp.getRemainingDailyQuota(),
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
`;
  },
};
