/**
 * RestoMaster OS — Modèles d'Emails HTML5 Professionnels & Responsives
 * Système de Gestion Intégrée de Restaurant & Bar
 *
 * Charte Graphique :
 * - Fond sombre / épuré : #020617 / #0f172a
 * - Identité Marque : Ambre RestoMaster (#f59e0b / #d97706)
 * - Statuts Opérationnels : Vert Émeraude (#10b981), Bleu Info (#3b82f6)
 * - Chiffres tabulaires et alignements conformes aux standards fiscaux et de caisse
 */

export interface EmailLayoutOptions {
  title: string;
  preheader?: string;
  headerBadge?: string;
  contentHtml: string;
  callToAction?: {
    text: string;
    url: string;
  } | null;
}

/**
 * Wrapper HTML5 universel responsive compatible tous clients de messagerie
 * (Gmail Android/iOS/Web, Outlook, Apple Mail, Yahoo)
 */
export function wrapRestoMasterEmailLayout({
  title,
  preheader,
  headerBadge = 'RestoMaster OS · Restauration & Hôtellerie',
  contentHtml,
  callToAction = null,
}: EmailLayoutOptions): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #020617;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f1f5f9;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    .email-container {
      max-width: 600px;
      margin: 28px auto;
      background-color: #0f172a;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);
      border: 1px solid #1e293b;
    }
    .header {
      background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
      padding: 34px 28px 24px;
      text-align: center;
      border-bottom: 1px solid #334155;
    }
    .logo-badge {
      display: inline-block;
      background-color: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.35);
      padding: 5px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 12px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .header h1 span {
      color: #f59e0b;
    }
    .header p {
      margin: 6px 0 0 0;
      font-size: 12px;
      color: #94a3b8;
      font-weight: 500;
    }
    .body {
      padding: 30px 28px;
      line-height: 1.65;
      font-size: 14px;
      color: #cbd5e1;
    }
    .card-box {
      background-color: #020617;
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 20px;
      margin: 22px 0;
    }
    .highlight-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 800;
      font-family: monospace;
      background-color: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .table-data {
      width: 100%;
      margin-top: 10px;
    }
    .table-data td {
      padding: 9px 0;
      font-size: 13px;
      border-bottom: 1px solid #1e293b;
      vertical-align: middle;
    }
    .table-data td.label {
      color: #94a3b8;
      font-weight: 500;
    }
    .table-data td.value {
      text-align: right;
      font-weight: 700;
      color: #ffffff;
    }
    .table-data td.amount {
      text-align: right;
      font-weight: 900;
      color: #10b981;
      font-size: 14px;
      font-family: monospace;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #020617 !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 13px;
      text-align: center;
      letter-spacing: 0.3px;
      box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.4);
    }
    .alert-notice {
      background-color: rgba(30, 41, 59, 0.6);
      border-left: 4px solid #f59e0b;
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
      margin: 20px 0;
      font-size: 12px;
      color: #cbd5e1;
    }
    .footer {
      background-color: #020617;
      color: #64748b;
      padding: 24px;
      text-align: center;
      font-size: 11px;
      border-top: 1px solid #1e293b;
    }
    .footer strong {
      color: #94a3b8;
    }
    .footer a {
      color: #fbbf24;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#020617;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || title}
  </div>

  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <div class="logo-badge">${headerBadge}</div>
      <h1>RestoMaster <span>OS</span></h1>
      <p>Système de Gestion Intégrée de Restaurant, Bar & KDS</p>
    </div>

    <!-- Body -->
    <div class="body">
      ${contentHtml}

      ${
        callToAction
          ? `
        <div style="text-align: center; margin: 30px 0 15px;">
          <a href="${callToAction.url}" target="_blank" class="btn">
            ${callToAction.text}
          </a>
        </div>
      `
          : ''
      }
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="margin: 0 0 6px;">
        <strong>RestoMaster OS</strong> · Plateforme Cloud Multi-Établissements
      </p>
      <p style="margin: 0 0 8px;">
        Douala & Yaoundé, Cameroun · Support 24/7 : +237 699 00 00 00
      </p>
      <p style="margin: 0; font-size: 10px; color: #475569;">
        Ce message certifié a été émis de manière sécurisée par le moteur transactionnel RestoMaster OS.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// =============================================================================
// 1. MODÈLE ACTIVATION ÉTABLISSEMENT & IDENTIFIANTS SUPERADMIN
// =============================================================================
export function buildActivationEmail(data: {
  applicantName: string;
  companyName: string;
  restaurantCode: string;
  email: string;
  password?: string;
  planName?: string;
  city?: string;
  loginUrl?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Activation de votre établissement ${data.companyName} — Vos identifiants RestoMaster OS`;
  const pwdDisplay = data.password || 'Défini lors de votre demande';
  const planDisplay = data.planName || 'Formule Professionnelle (Pro)';

  const contentHtml = `
    <h2 style="margin: 0 0 12px; font-size: 18px; color: #ffffff; font-weight: 800;">
      Bienvenue sur RestoMaster OS, ${data.applicantName} ! 🎉
    </h2>
    <p>
      Votre demande d'ouverture pour l'établissement <strong style="color: #ffffff;">${data.companyName}</strong> (${data.city || 'Cameroun'}) a été examinée et validée avec succès par la direction de la plateforme. Votre espace de gestion est immédiatement actif.
    </p>

    <div class="card-box">
      <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #f59e0b; margin-bottom: 12px; letter-spacing: 0.5px;">
        🔐 Vos Accès de Connexion Sécurisés
      </div>
      <table class="table-data" role="presentation">
        <tr>
          <td class="label">Code Restaurant :</td>
          <td class="value"><span class="highlight-badge">${data.restaurantCode}</span></td>
        </tr>
        <tr>
          <td class="label">Identifiant E-mail :</td>
          <td class="value">${data.email}</td>
        </tr>
        <tr>
          <td class="label">Mot de passe :</td>
          <td class="value" style="color: #38bdf8; font-family: monospace;">${pwdDisplay}</td>
        </tr>
        <tr>
          <td class="label">Formule souscrite :</td>
          <td class="value" style="color: #a7f3d0;">${planDisplay}</td>
        </tr>
        <tr>
          <td class="label">Période d'essai :</td>
          <td class="value" style="color: #10b981;">14 jours gratuits inclus</td>
        </tr>
      </table>
    </div>

    <div class="alert-notice">
      💡 <strong>Conseil de connexion :</strong> Sur l'écran de connexion de l'application (Desktop ou Web), saisissez votre <strong>Code Restaurant (${data.restaurantCode})</strong>, votre e-mail et votre mot de passe pour accéder à vos terminaux de vente, plan de salle et écrans KDS.
    </div>

    <p style="font-size: 13px; color: #94a3b8;">
      Notre équipe technique reste joignable pour vous accompagner dans la création de vos fiches recettes, le plan de table et l'appairage de vos imprimantes thermiques de caisse.
    </p>
  `;

  const text = `Bienvenue ${data.applicantName} ! Votre établissement ${data.companyName} est actif sur RestoMaster OS.\nCode Restaurant: ${data.restaurantCode}\nIdentifiant: ${data.email}\nMot de passe: ${pwdDisplay}\nAccès: ${data.loginUrl || 'https://restomaster.cm'}`;

  return {
    subject,
    html: wrapRestoMasterEmailLayout({
      title: subject,
      headerBadge: 'Plateforme SaaS · Activation Restaurant',
      contentHtml,
      callToAction: {
        text: 'Ouvrir mon Espace RestoMaster OS →',
        url: data.loginUrl || 'http://localhost:3000',
      },
    }),
    text,
  };
}

// =============================================================================
// 2. MODÈLE CONFIRMATION DE RÉSERVATION DE TABLE
// =============================================================================
export function buildTableReservationEmail(data: {
  customerName: string;
  restaurantName: string;
  reservationNumber: string;
  date: string;
  time: string;
  guestCount: number;
  tableName?: string;
  specialRequests?: string;
  depositAmountFcfa?: number;
}): { subject: string; html: string; text: string } {
  const subject = `Confirmation de votre Réservation #${data.reservationNumber} — ${data.restaurantName}`;

  const contentHtml = `
    <h2 style="margin: 0 0 12px; font-size: 18px; color: #ffffff; font-weight: 800;">
      Votre table est réservée, ${data.customerName} ! 🥂
    </h2>
    <p>
      Nous avons le plaisir de vous confirmer votre réservation auprès de <strong style="color: #ffffff;">${data.restaurantName}</strong>. Notre brigade se prépare à vous recevoir dans les meilleures conditions.
    </p>

    <div class="card-box">
      <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #f59e0b; margin-bottom: 12px; letter-spacing: 0.5px;">
        📅 Détails de la Réservation
      </div>
      <table class="table-data" role="presentation">
        <tr>
          <td class="label">Réf. Réservation :</td>
          <td class="value"><span class="highlight-badge">${data.reservationNumber}</span></td>
        </tr>
        <tr>
          <td class="label">Date :</td>
          <td class="value">${data.date}</td>
        </tr>
        <tr>
          <td class="label">Heure d'arrivée :</td>
          <td class="value" style="color: #fbbf24;">${data.time}</td>
        </tr>
        <tr>
          <td class="label">Nombre de convives :</td>
          <td class="value">${data.guestCount} personnes</td>
        </tr>
        ${
          data.tableName
            ? `
        <tr>
          <td class="label">Table assignée :</td>
          <td class="value">${data.tableName}</td>
        </tr>
        `
            : ''
        }
        ${
          data.depositAmountFcfa
            ? `
        <tr>
          <td class="label">Acompte versé :</td>
          <td class="amount">${data.depositAmountFcfa.toLocaleString('fr-FR')} FCFA</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    ${
      data.specialRequests
        ? `
      <div class="alert-notice">
        <strong>Notes & Souhaits particuliers :</strong> ${data.specialRequests}
      </div>
    `
        : ''
    }

    <p style="font-size: 13px; color: #94a3b8;">
      En cas d'imprévu ou de modification d'horaire, merci de contacter directement notre accueil pour ajuster votre créneau.
    </p>
  `;

  const text = `Confirmation de réservation #${data.reservationNumber} pour ${data.customerName} à ${data.restaurantName}.\nDate: ${data.date} à ${data.time}\nCouverts: ${data.guestCount}`;

  return {
    subject,
    html: wrapRestoMasterEmailLayout({
      title: subject,
      headerBadge: 'Salle & Accueil · Réservation Confirmée',
      contentHtml,
    }),
    text,
  };
}

// =============================================================================
// 3. MODÈLE TICKET DE CAISSE NUMÉRIQUE & FACTURE DGI
// =============================================================================
export function buildCashReceiptEmail(data: {
  customerName: string;
  restaurantName: string;
  receiptNumber: string;
  date: string;
  items: Array<{ name: string; quantity: number; totalFcfa: number }>;
  subtotalFcfa: number;
  vatFcfa: number;
  totalTtcFcfa: number;
  paymentMethod: string;
  cashierName?: string;
  dgiChainHash?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Reçu Numérique de Caisse #${data.receiptNumber} — ${data.restaurantName}`;

  const itemsRows = data.items
    .map(
      (it) => `
      <tr>
        <td style="padding: 6px 0; color: #cbd5e1; font-size: 13px;">
          ${it.quantity}x ${it.name}
        </td>
        <td style="padding: 6px 0; text-align: right; color: #ffffff; font-weight: 700; font-family: monospace; font-size: 13px;">
          ${it.totalFcfa.toLocaleString('fr-FR')} FCFA
        </td>
      </tr>
    `
    )
    .join('');

  const contentHtml = `
    <h2 style="margin: 0 0 12px; font-size: 18px; color: #ffffff; font-weight: 800;">
      Merci pour votre visite chez ${data.restaurantName} ! 🧾
    </h2>
    <p>
      Veuillez trouver ci-dessous le reçu numérique certifié relatif à votre consommation du <strong>${data.date}</strong>.
    </p>

    <div class="card-box">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid #334155; padding-bottom: 10px;">
        <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #f59e0b;">
          Ticket certifié #${data.receiptNumber}
        </span>
        <span style="font-size: 11px; color: #94a3b8; font-family: monospace;">
          ${data.date}
        </span>
      </div>

      <table width="100%" role="presentation" style="margin-bottom: 14px;">
        ${itemsRows}
      </table>

      <table class="table-data" role="presentation" style="border-top: 1px solid #334155; padding-top: 8px;">
        <tr>
          <td class="label">Sous-total HT :</td>
          <td class="value">${data.subtotalFcfa.toLocaleString('fr-FR')} FCFA</td>
        </tr>
        <tr>
          <td class="label">TVA (19.25%) :</td>
          <td class="value">${data.vatFcfa.toLocaleString('fr-FR')} FCFA</td>
        </tr>
        <tr>
          <td class="label" style="font-size: 15px; font-weight: 800; color: #ffffff;">TOTAL TTC :</td>
          <td class="amount" style="font-size: 18px; color: #10b981;">${data.totalTtcFcfa.toLocaleString('fr-FR')} FCFA</td>
        </tr>
        <tr>
          <td class="label">Mode de règlement :</td>
          <td class="value" style="text-transform: uppercase;">${data.paymentMethod}</td>
        </tr>
        ${
          data.cashierName
            ? `
        <tr>
          <td class="label">Opérateur / Caisse :</td>
          <td class="value">${data.cashierName}</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    ${
      data.dgiChainHash
        ? `
      <div style="font-family: monospace; font-size: 10px; color: #64748b; background-color: #020617; padding: 8px 12px; border-radius: 6px; word-break: break-all; border: 1px solid #1e293b; margin-bottom: 16px;">
        Empreinte fiscale SHA-256 : ${data.dgiChainHash}
      </div>
    `
        : ''
    }

    <p style="font-size: 12px; color: #94a3b8;">
      Ce justificatif électronique tient lieu de reçu de caisse libératoire conformément à la réglementation en vigueur.
    </p>
  `;

  const text = `Reçu #${data.receiptNumber} - ${data.restaurantName}\nTotal: ${data.totalTtcFcfa} FCFA\nDate: ${data.date}`;

  return {
    subject,
    html: wrapRestoMasterEmailLayout({
      title: subject,
      headerBadge: 'Caisse & Facturation · Reçu Certifié',
      contentHtml,
    }),
    text,
  };
}

// =============================================================================
// 4. MODÈLE COMMANDE PRÊTE (CUISINE / BAR / COMPTOIR)
// =============================================================================
export function buildOrderReadyEmail(data: {
  customerName: string;
  restaurantName: string;
  orderNumber: string;
  orderType: 'sur_place' | 'a_emporter' | 'livraison';
  tableName?: string;
  itemsSummary: string;
  pickupCounter?: string;
}): { subject: string; html: string; text: string } {
  const typeLabel =
    data.orderType === 'a_emporter'
      ? 'À emporter'
      : data.orderType === 'livraison'
      ? 'En cours de livraison'
      : 'Service en salle';

  const subject = `Votre commande #${data.orderNumber} est prête ! — ${data.restaurantName}`;

  const contentHtml = `
    <h2 style="margin: 0 0 12px; font-size: 18px; color: #ffffff; font-weight: 800;">
      Votre commande est prête, ${data.customerName} ! 🍲
    </h2>
    <p>
      Votre commande <strong style="color: #ffffff;">#${data.orderNumber}</strong> vient d'être validée par notre chef de cuisine et est désormais prête pour vous.
    </p>

    <div class="card-box">
      <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #f59e0b; margin-bottom: 12px; letter-spacing: 0.5px;">
        📋 Détails de la Commande
      </div>
      <table class="table-data" role="presentation">
        <tr>
          <td class="label">N° de Commande :</td>
          <td class="value"><span class="highlight-badge">#${data.orderNumber}</span></td>
        </tr>
        <tr>
          <td class="label">Mode de retrait :</td>
          <td class="value" style="color: #38bdf8;">${typeLabel}</td>
        </tr>
        ${
          data.tableName
            ? `
        <tr>
          <td class="label">Table :</td>
          <td class="value">${data.tableName}</td>
        </tr>
        `
            : ''
        }
        <tr>
          <td class="label">Retrait / Comptoir :</td>
          <td class="value" style="color: #10b981;">${data.pickupCounter || 'Comptoir Principal'}</td>
        </tr>
        <tr>
          <td class="label">Articles préparés :</td>
          <td class="value">${data.itemsSummary}</td>
        </tr>
      </table>
    </div>

    <div class="alert-notice">
      🔔 <strong>Conseil :</strong> Présentez simplement ce numéro de commande <strong>#${data.orderNumber}</strong> au serveur ou au comptoir pour récupérer votre repas chaud.
    </div>
  `;

  const text = `Votre commande #${data.orderNumber} est prête chez ${data.restaurantName} !`;

  return {
    subject,
    html: wrapRestoMasterEmailLayout({
      title: subject,
      headerBadge: 'Production KDS · Commande Prête',
      contentHtml,
    }),
    text,
  };
}

// =============================================================================
// 5. MODÈLE ALERTE STOCK CRITIQUE & RÉAPPROVISIONNEMENT
// =============================================================================
export function buildLowStockAlertEmail(data: {
  restaurantName: string;
  ingredientName: string;
  currentStock: number;
  minThreshold: number;
  unit: string;
  supplierName?: string;
  supplierPhone?: string;
  urgency: 'haute' | 'critique';
}): { subject: string; html: string; text: string } {
  const isCritical = data.urgency === 'critique';
  const subject = `⚠️ ALERTE STOCK : Rupture imminente sur ${data.ingredientName} — ${data.restaurantName}`;

  const contentHtml = `
    <h2 style="margin: 0 0 12px; font-size: 18px; color: ${isCritical ? '#f43f5e' : '#fbbf24'}; font-weight: 800;">
      Alerte de Stock ${isCritical ? 'CRITIQUE' : 'FAIBLE'} ⚠️
    </h2>
    <p>
      Le stock théorique de l'ingrédient <strong style="color: #ffffff;">${data.ingredientName}</strong> dans l'établissement <strong>${data.restaurantName}</strong> a franchi le seuil de sécurité minimum. Un réapprovisionnement urgent est requis pour éviter des ruptures de menu.
    </p>

    <div class="card-box" style="border-left: 4px solid ${isCritical ? '#f43f5e' : '#f59e0b'};">
      <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #ffffff; margin-bottom: 12px;">
        📦 État de l'Ingrédient en Réserve
      </div>
      <table class="table-data" role="presentation">
        <tr>
          <td class="label">Ingrédient :</td>
          <td class="value" style="font-size: 14px;">${data.ingredientName}</td>
        </tr>
        <tr>
          <td class="label">Stock actuel :</td>
          <td class="amount" style="color: #f43f5e; font-size: 16px;">
            ${data.currentStock} ${data.unit}
          </td>
        </tr>
        <tr>
          <td class="label">Seuil de sécurité :</td>
          <td class="value">${data.minThreshold} ${data.unit}</td>
        </tr>
        ${
          data.supplierName
            ? `
        <tr>
          <td class="label">Fournisseur référencé :</td>
          <td class="value">${data.supplierName}</td>
        </tr>
        `
            : ''
        }
        ${
          data.supplierPhone
            ? `
        <tr>
          <td class="label">Contact Fournisseur :</td>
          <td class="value" style="color: #38bdf8; font-family: monospace;">${data.supplierPhone}</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    <p style="font-size: 13px; color: #94a3b8;">
      Rendez-vous dans le module <strong>Achats & Stocks</strong> de RestoMaster OS pour émettre un bon de commande fournisseur ou régulariser l'inventaire physique.
    </p>
  `;

  const text = `ALERTE STOCK ${data.ingredientName} chez ${data.restaurantName}. Actuel: ${data.currentStock} ${data.unit} (Seuil: ${data.minThreshold})`;

  return {
    subject,
    html: wrapRestoMasterEmailLayout({
      title: subject,
      headerBadge: 'Économat & Stocks · Alerte d’Approvisionnement',
      contentHtml,
    }),
    text,
  };
}

// =============================================================================
// 6. MODÈLE RAPPORT Z & CLÔTURE JOURNALIÈRE DE CAISSE
// =============================================================================
export function buildZReportClosureEmail(data: {
  restaurantName: string;
  zReportNumber: string;
  date: string;
  cashierName: string;
  supervisorName: string;
  expectedAmountFcfa: number;
  countedAmountFcfa: number;
  varianceFcfa: number;
  ordersCount: number;
  varianceJustification?: string;
}): { subject: string; html: string; text: string } {
  const hasVariance = Math.abs(data.varianceFcfa) > 0;
  const subject = `Rapport Z #${data.zReportNumber} · Clôture Journalière de Caisse — ${data.restaurantName}`;

  const contentHtml = `
    <h2 style="margin: 0 0 12px; font-size: 18px; color: #ffffff; font-weight: 800;">
      Clôture de Caisse Journalière (Rapport Z) 📊
    </h2>
    <p>
      La session de caisse du <strong>${data.date}</strong> de l'établissement <strong style="color: #ffffff;">${data.restaurantName}</strong> a été arrêtée et certifiée par la supervision.
    </p>

    <div class="card-box">
      <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #f59e0b; margin-bottom: 12px; letter-spacing: 0.5px;">
        💰 Bilan Financier Journalier
      </div>
      <table class="table-data" role="presentation">
        <tr>
          <td class="label">Réf. Rapport Z :</td>
          <td class="value"><span class="highlight-badge">${data.zReportNumber}</span></td>
        </tr>
        <tr>
          <td class="label">Total Théorique Attendu :</td>
          <td class="value">${data.expectedAmountFcfa.toLocaleString('fr-FR')} FCFA</td>
        </tr>
        <tr>
          <td class="label">Total Physique Compté :</td>
          <td class="amount">${data.countedAmountFcfa.toLocaleString('fr-FR')} FCFA</td>
        </tr>
        <tr>
          <td class="label">Écart constaté :</td>
          <td class="value" style="color: ${hasVariance ? '#f43f5e' : '#10b981'}; font-size: 15px; font-family: monospace;">
            ${data.varianceFcfa > 0 ? '+' : ''}${data.varianceFcfa.toLocaleString('fr-FR')} FCFA
          </td>
        </tr>
        <tr>
          <td class="label">Nombre de tickets :</td>
          <td class="value">${data.ordersCount} transactions</td>
        </tr>
        <tr>
          <td class="label">Caissier titulaire :</td>
          <td class="value">${data.cashierName}</td>
        </tr>
        <tr>
          <td class="label">Superviseur validant :</td>
          <td class="value">${data.supervisorName}</td>
        </tr>
      </table>
    </div>

    ${
      data.varianceJustification
        ? `
      <div class="alert-notice">
        <strong>Justification de l'écart :</strong> ${data.varianceJustification}
      </div>
    `
        : ''
    }

    <p style="font-size: 12px; color: #94a3b8;">
      Ce rapport est archivé de manière immuable dans le grand livre de caisse et dans la piste d'audit RestoMaster OS.
    </p>
  `;

  const text = `Rapport Z #${data.zReportNumber} - ${data.restaurantName}\nTotal Compté: ${data.countedAmountFcfa} FCFA\nÉcart: ${data.varianceFcfa} FCFA`;

  return {
    subject,
    html: wrapRestoMasterEmailLayout({
      title: subject,
      headerBadge: 'Caisse & Audit · Clôture Journalière',
      contentHtml,
    }),
    text,
  };
}

// =============================================================================
// 7. MODÈLE RAPPORT COMPLET DIRECTION (JOUR, SEMAINE, MOIS)
// =============================================================================
export interface ExecutiveReportData {
  restaurantName: string;
  directorName?: string;
  periodType: 'jour' | 'semaine' | 'mois';
  periodLabel: string;
  totalSalesFcfa: number;
  previousPeriodSalesFcfa?: number;
  ordersCount: number;
  guestCount: number;
  averageTicketFcfa: number;
  vatFcfa: number;
  kitchenSalesFcfa?: number;
  barSalesFcfa?: number;
  topSellingItems?: Array<{ name: string; quantity: number; revenueFcfa: number }>;
  paymentBreakdown?: Array<{ method: string; amountFcfa: number; percentage: number }>;
  occupancyRatePercent?: number;
  cashDiscrepancyFcfa?: number;
  alertsCount?: number;
  notes?: string;
  dashboardUrl?: string;
}

export function buildExecutiveReportEmail(data: ExecutiveReportData): {
  subject: string;
  html: string;
  text: string;
} {
  const periodTitles: Record<'jour' | 'semaine' | 'mois', { badge: string; prefix: string; icon: string }> = {
    jour: { badge: 'Rapport Quotidien', prefix: 'Bilan Journalier', icon: '📊' },
    semaine: { badge: 'Rapport Hebdomadaire', prefix: 'Synthèse Hebdomadaire', icon: '📈' },
    mois: { badge: 'Rapport Mensuel Stratégique', prefix: 'Bilan Mensuel Consolidé', icon: '🏆' },
  };

  const currentMeta = periodTitles[data.periodType] || periodTitles.jour;
  const subject = `${currentMeta.icon} ${currentMeta.prefix} · ${data.periodLabel} — ${data.restaurantName}`;

  // Calcul d'évolution % si période précédente fournie
  let growthBadgeHtml = '';
  if (data.previousPeriodSalesFcfa && data.previousPeriodSalesFcfa > 0) {
    const diff = data.totalSalesFcfa - data.previousPeriodSalesFcfa;
    const pct = ((diff / data.previousPeriodSalesFcfa) * 100).toFixed(1);
    const isPositive = diff >= 0;
    growthBadgeHtml = `
      <span style="display: inline-block; margin-left: 8px; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; background-color: ${isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}; color: ${isPositive ? '#34d399' : '#fb7185'}; border: 1px solid ${isPositive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'};">
        ${isPositive ? '▲ +' : '▼ '}${pct}% vs N-1
      </span>
    `;
  }

  // Top ventes
  const topItemsHtml = (data.topSellingItems || [])
    .slice(0, 5)
    .map(
      (item, idx) => `
      <tr style="border-bottom: 1px solid #1e293b;">
        <td style="padding: 10px 8px; font-size: 12px; color: #94a3b8; font-family: monospace; width: 28px;">
          #${idx + 1}
        </td>
        <td style="padding: 10px 8px; font-size: 13px; font-weight: 700; color: #f8fafc;">
          ${item.name}
        </td>
        <td style="padding: 10px 8px; font-size: 12px; font-weight: 700; color: #cbd5e1; text-align: center; font-family: monospace;">
          ${item.quantity}
        </td>
        <td style="padding: 10px 8px; font-size: 13px; font-weight: 800; color: #f59e0b; text-align: right; font-family: monospace;">
          ${item.revenueFcfa.toLocaleString('fr-FR')} FCFA
        </td>
      </tr>
    `
    )
    .join('');

  // Ventilation des règlements (supporte Array ou dictionnaire clé-valeur)
  const normalizedPayments: Array<{ method: string; amountFcfa: number; percentage: number }> = [];
  if (Array.isArray(data.paymentBreakdown)) {
    normalizedPayments.push(...data.paymentBreakdown);
  } else if (data.paymentBreakdown && typeof data.paymentBreakdown === 'object') {
    const rawObj = data.paymentBreakdown as Record<string, number>;
    const totalP = Object.values(rawObj).reduce((sum, v) => sum + (Number(v) || 0), 0) || 1;
    for (const [methodKey, amountVal] of Object.entries(rawObj)) {
      const num = Number(amountVal) || 0;
      const label =
        methodKey === 'cash'
          ? 'Espèces'
          : methodKey === 'orangeMoney'
          ? 'Orange Money'
          : methodKey === 'mtnMomo'
          ? 'MTN MoMo'
          : methodKey;
      normalizedPayments.push({
        method: label,
        amountFcfa: num,
        percentage: Math.round((num / totalP) * 100),
      });
    }
  }

  const paymentBreakdownHtml = normalizedPayments
    .map(
      (p) => `
      <tr style="border-bottom: 1px solid #1e293b;">
        <td style="padding: 8px 6px; font-size: 12px; font-weight: 700; color: #f1f5f9;">
          ${p.method}
        </td>
        <td style="padding: 8px 6px; font-size: 12px; font-weight: 800; color: #38bdf8; text-align: right; font-family: monospace;">
          ${p.amountFcfa.toLocaleString('fr-FR')} FCFA
        </td>
        <td style="padding: 8px 6px; font-size: 11px; font-weight: 700; color: #94a3b8; text-align: right; font-family: monospace;">
          ${p.percentage}%
        </td>
      </tr>
    `
    )
    .join('');

  const contentHtml = `
    <div style="margin-bottom: 16px;">
      <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3);">
        ${currentMeta.badge} · Direction
      </span>
      <h2 style="margin: 8px 0 4px; font-size: 20px; color: #ffffff; font-weight: 900; letter-spacing: -0.3px;">
        ${currentMeta.prefix}
      </h2>
      <p style="margin: 0; font-size: 13px; color: #94a3b8; font-weight: 600;">
        Période : <span style="color: #f1f5f9;">${data.periodLabel}</span> · Établissement : <strong style="color: #ffffff;">${data.restaurantName}</strong>
      </p>
    </div>

    <!-- CARTE PRINCIPALE : CHIFFRE D'AFFAIRES -->
    <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%); border: 1px solid #334155; border-radius: 16px; padding: 20px; margin-bottom: 18px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);">
      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.8px; margin-bottom: 6px;">
        Chiffre d'Affaires Réalisé (TTC)
      </div>
      <div style="display: flex; align-items: baseline; flex-wrap: wrap;">
        <span style="font-size: 28px; font-weight: 900; color: #fbbf24; font-family: monospace; letter-spacing: -0.5px;">
          ${data.totalSalesFcfa.toLocaleString('fr-FR')} FCFA
        </span>
        ${growthBadgeHtml}
      </div>
      ${
        data.kitchenSalesFcfa || data.barSalesFcfa
          ? `
        <div style="margin-top: 14px; pt-3; border-top: 1px solid #334155; font-size: 12px; color: #cbd5e1; display: flex; justify-content: space-between;">
          <span>🍽️ Cuisine : <strong style="color: #ffffff; font-family: monospace;">${(data.kitchenSalesFcfa || 0).toLocaleString('fr-FR')} FCFA</strong></span>
          <span>🍸 Bar : <strong style="color: #ffffff; font-family: monospace;">${(data.barSalesFcfa || 0).toLocaleString('fr-FR')} FCFA</strong></span>
        </div>
      `
          : ''
      }
    </div>

    <!-- GRILLE DE 4 KPI EXÉCUTIFS -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 18px;">
      <tr>
        <td width="48%" style="vertical-align: top;">
          <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 14px;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8;">Couverts Servis</div>
            <div style="font-size: 18px; font-weight: 900; color: #ffffff; font-family: monospace; margin-top: 4px;">
              ${data.guestCount.toLocaleString('fr-FR')} <span style="font-size: 11px; font-weight: 600; color: #94a3b8;">clients</span>
            </div>
            ${data.occupancyRatePercent ? `<div style="font-size: 10px; color: #10b981; font-weight: 700; margin-top: 2px;">Taux d'occupation : ${data.occupancyRatePercent}%</div>` : ''}
          </div>
        </td>
        <td width="4%"></td>
        <td width="48%" style="vertical-align: top;">
          <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 14px;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8;">Commandes & Panier Moyen</div>
            <div style="font-size: 18px; font-weight: 900; color: #38bdf8; font-family: monospace; margin-top: 4px;">
              ${data.averageTicketFcfa.toLocaleString('fr-FR')} <span style="font-size: 10px; color: #94a3b8;">FCFA / ticket</span>
            </div>
            <div style="font-size: 10px; color: #cbd5e1; margin-top: 2px;">
              Volume : <strong style="color: #ffffff; font-family: monospace;">${data.ordersCount}</strong> tickets
            </div>
          </div>
        </td>
      </tr>
      <tr><td height="10" colspan="3"></td></tr>
      <tr>
        <td width="48%" style="vertical-align: top;">
          <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 14px;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8;">TVA & Taxes Collectées</div>
            <div style="font-size: 18px; font-weight: 900; color: #a7f3d0; font-family: monospace; margin-top: 4px;">
              ${data.vatFcfa.toLocaleString('fr-FR')} <span style="font-size: 10px; color: #94a3b8;">FCFA</span>
            </div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Conforme DGI 19,25% (TVA+CAC)</div>
          </div>
        </td>
        <td width="4%"></td>
        <td width="48%" style="vertical-align: top;">
          <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 14px;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8;">Écart Global de Caisse</div>
            <div style="font-size: 18px; font-weight: 900; color: ${Math.abs(data.cashDiscrepancyFcfa || 0) > 0 ? '#f43f5e' : '#10b981'}; font-family: monospace; margin-top: 4px;">
              ${(data.cashDiscrepancyFcfa || 0) === 0 ? '0 FCFA (Équilibrée)' : `${(data.cashDiscrepancyFcfa || 0).toLocaleString('fr-FR')} FCFA`}
            </div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">
              ${(data.cashDiscrepancyFcfa || 0) === 0 ? 'Aucune anomalie de caisse' : 'Vérification requise'}
            </div>
          </div>
        </td>
      </tr>
    </table>

    ${
      topItemsHtml
        ? `
      <!-- TABLEAU DES 5 MEILLEURES VENTES -->
      <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 18px; margin-bottom: 18px;">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #f59e0b; margin-bottom: 12px; letter-spacing: 0.5px;">
          ⭐ Top 5 des Plats & Boissons Stars
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid #334155; text-align: left;">
              <th style="padding: 6px 8px; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Rang</th>
              <th style="padding: 6px 8px; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Désignation</th>
              <th style="padding: 6px 8px; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; text-align: center;">Qté</th>
              <th style="padding: 6px 8px; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; text-align: right;">CA Généré</th>
            </tr>
          </thead>
          <tbody>
            ${topItemsHtml}
          </tbody>
        </table>
      </div>
    `
        : ''
    }

    ${
      paymentBreakdownHtml
        ? `
      <!-- VENTILATION DES ENCAISSEMENTS -->
      <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 18px; margin-bottom: 18px;">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #38bdf8; margin-bottom: 12px; letter-spacing: 0.5px;">
          💳 Ventilation des Modes de Règlement
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid #334155; text-align: left;">
              <th style="padding: 6px; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Moyen</th>
              <th style="padding: 6px; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; text-align: right;">Montant</th>
              <th style="padding: 6px; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; text-align: right;">Part</th>
            </tr>
          </thead>
          <tbody>
            ${paymentBreakdownHtml}
          </tbody>
        </table>
      </div>
    `
        : ''
    }

    ${
      data.notes
        ? `
      <div style="background-color: rgba(30, 41, 59, 0.6); border-left: 3px solid #f59e0b; padding: 12px 14px; border-radius: 8px; margin-bottom: 18px; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
        <strong style="color: #ffffff;">Note de Synthèse :</strong> ${data.notes}
      </div>
    `
        : ''
    }

    <p style="font-size: 11px; color: #64748b; line-height: 1.5; margin: 12px 0 0;">
      Ce rapport analytique est certifié conforme par le moteur fiscal et comptable RestoMaster OS.
    </p>
  `;

  const text = `${currentMeta.prefix} - ${data.restaurantName}\nPériode: ${data.periodLabel}\nCA Total: ${data.totalSalesFcfa} FCFA\nCouverts: ${data.guestCount}\nCommandes: ${data.ordersCount}`;

  return {
    subject,
    html: wrapRestoMasterEmailLayout({
      title: subject,
      headerBadge: `${currentMeta.badge} · RestoMaster OS`,
      contentHtml,
      callToAction: data.dashboardUrl
        ? {
            text: 'Ouvrir le Tableau de Bord Direction',
            url: data.dashboardUrl,
          }
        : null,
    }),
    text,
  };
}

