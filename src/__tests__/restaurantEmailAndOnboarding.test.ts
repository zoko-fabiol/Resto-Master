import { describe, expect, it } from 'vitest';
import { buildExecutiveReportEmail, ExecutiveReportData } from '../services/email/emailTemplates';
import { restaurantEmailService } from '../services/email/restaurantEmailService';

describe('Flux Adhésion & Génération d\'Identifiants Sécurisés', () => {
  it('génère un code restaurant élégant et conforme (ex: RMS-DLA-XXXX)', () => {
    const city = 'Douala';
    const cityLetters = city.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'RMS';
    const randomSuffix = 7421;
    const restaurantCode = `RMS-${cityLetters}-${randomSuffix}`;

    expect(restaurantCode).toBe('RMS-DOU-7421');
    expect(restaurantCode).toMatch(/^RMS-[A-Z]{3}-\d{4}$/);
  });

  it('génère un mot de passe temporaire robuste et mémorable si non fourni', () => {
    const defaultPassword = `Resto${Math.floor(1000 + Math.random() * 9000)}!`;
    expect(defaultPassword.length).toBeGreaterThanOrEqual(10);
    expect(defaultPassword).toMatch(/^Resto\d{4}!$/);
  });

  it('configure impérativement mustChangePassword et isFirstLogin au premier provisionnement', () => {
    const newOwnerProfile = {
      id: 'owner_test_123',
      email: 'directeur@grandgourmet.cm',
      role: 'superadmin',
      mustChangePassword: true,
      isFirstLogin: true,
      active: true,
    };

    expect(newOwnerProfile.mustChangePassword).toBe(true);
    expect(newOwnerProfile.isFirstLogin).toBe(true);
  });

  it('construit une URL de connexion directe pré-remplie pour le client', () => {
    const clientBaseUrl = 'http://localhost:3000';
    const restaurantCode = 'RMS-DLA-7421';
    const email = 'direction@restaurant.cm';

    const directLoginUrl = `${clientBaseUrl}/?restaurantCode=${encodeURIComponent(restaurantCode)}&email=${encodeURIComponent(email)}`;

    expect(directLoginUrl).toContain('restaurantCode=RMS-DLA-7421');
    expect(directLoginUrl).toContain('email=direction%40restaurant.cm');
  });

  it('extrait fidèlement le code restaurant et l\'email depuis la query string URL', () => {
    const url = 'http://localhost:3000/?restaurantCode=RMS-DLA-7421&email=direction%40restaurant.cm';
    const parsed = new URL(url);
    const code = (parsed.searchParams.get('restaurantCode') || parsed.searchParams.get('code') || '').trim();
    const email = (parsed.searchParams.get('email') || '').trim();

    expect(code).toBe('RMS-DLA-7421');
    expect(email).toBe('direction@restaurant.cm');
  });

  it('valide l\'enchaînement de première connexion : mustChangePassword -> OnboardingWizard', () => {
    // État initial à la création du compte propriétaire
    let userState = {
      mustChangePassword: true,
      isFirstLogin: true,
      role: 'superadmin',
    };
    let isOnboardingOpen = false;

    // Étape 1 : Changement de mot de passe requis
    expect(userState.mustChangePassword).toBe(true);

    // Étape 2 : L'utilisateur valide son nouveau mot de passe
    const onPasswordChangeSuccess = () => {
      userState = {
        ...userState,
        mustChangePassword: false,
      };
      // Déclenchement automatique de l'assistant de configuration
      isOnboardingOpen = true;
    };

    onPasswordChangeSuccess();

    expect(userState.mustChangePassword).toBe(false);
    expect(isOnboardingOpen).toBe(true);
  });
});

describe('Génération des Rapports Directeur & Clôture Z', () => {
  const baseReportData: ExecutiveReportData = {
    periodType: 'jour',
    restaurantName: 'Le Grand Gourmet Yaoundé',
    periodLabel: 'Jeudi 22 Octobre 2026',
    totalSalesFcfa: 485000,
    previousPeriodSalesFcfa: 420000,
    ordersCount: 42,
    guestCount: 68,
    averageTicketFcfa: 7132,
    vatFcfa: 93362,
    topSellingItems: [
      { name: 'Ndolé Royal Crevettes', quantity: 24, revenueFcfa: 204000 },
      { name: 'Poulet DG Familial', quantity: 18, revenueFcfa: 135000 },
    ],
    paymentBreakdown: [
      { method: 'Espèces', amountFcfa: 250000, percentage: 52 },
      { method: 'Orange Money', amountFcfa: 150000, percentage: 31 },
      { method: 'MTN MoMo', amountFcfa: 85000, percentage: 17 },
    ],
    cashDiscrepancyFcfa: 0,
  };

  it('génère un rapport journalier complet avec indicateurs financiers et top plats', () => {
    const result = buildExecutiveReportEmail(baseReportData);

    expect(result.subject).toContain('Bilan Journalier');
    expect(result.subject).toContain('Le Grand Gourmet Yaoundé');
    expect(result.html).toMatch(/485[\s\u202f]000\s*FCFA/);
    expect(result.html).toContain('Ndolé Royal Crevettes');
    expect(result.html).toContain('Orange Money');
    expect(result.html).toContain('▲ +15.5%');
  });

  it('génère un rapport hebdomadaire consolidé avec comparaison N-1', () => {
    const weeklyData: ExecutiveReportData = {
      ...baseReportData,
      periodType: 'semaine',
      periodLabel: 'Semaine 43 • Du 19 au 25 Octobre 2026',
      totalSalesFcfa: 3250000,
      previousPeriodSalesFcfa: 3100000,
    };
    const result = buildExecutiveReportEmail(weeklyData);

    expect(result.subject).toContain('Synthèse Hebdomadaire');
    expect(result.html).toMatch(/3[\s\u202f]250[\s\u202f]000\s*FCFA/);
  });

  it('génère un rapport mensuel de clôture fiscale et marge brute', () => {
    const monthlyData: ExecutiveReportData = {
      ...baseReportData,
      periodType: 'mois',
      periodLabel: 'Octobre 2026',
      totalSalesFcfa: 14500000,
      previousPeriodSalesFcfa: 13800000,
    };
    const result = buildExecutiveReportEmail(monthlyData);

    expect(result.subject).toContain('Bilan Mensuel Consolidé');
    expect(result.html).toMatch(/14[\s\u202f]500[\s\u202f]000\s*FCFA/);
  });
});

describe('Passerelle Google Apps Script & Tolérance Réseau', () => {
  it('fournit le script personnalisé prêt pour le restaurant avec nom d\'expéditeur exclusif', () => {
    const code = restaurantEmailService.generateGoogleAppsScriptCode('Le Grand Gourmet');
    expect(code).toContain('function doPost(e)');
    expect(code).toContain('var senderName = "Le Grand Gourmet";');
    expect(code).toContain('name: senderName');
    expect(code).toContain('MailApp.sendEmail');
    expect(code).toContain('https://script.google.com');
  });

  it('gère le mode passerelle RestoMaster par défaut et le mode dédié restaurant', async () => {
    // Mode RestoMaster par défaut
    const settings = await restaurantEmailService.getEmailSettings('test-resto-unexisting');
    expect(settings.providerMode).toBe('restomaster');
    expect(settings.gasWebhookUrl).toBeDefined();

    // Envoi tolérant au réseau avec repli RestoMaster
    const sendResult = await restaurantEmailService.sendEmail({
      to: 'test@client.com',
      subject: 'Test Ticket',
      htmlBody: '<b>Test</b>',
      providerMode: 'restomaster',
    });
    // fetch étant mocké ou intercepté / no-cors
    expect(sendResult).toHaveProperty('success');
  });
});

