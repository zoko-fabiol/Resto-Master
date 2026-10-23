// Test de fumée navigateur — RestoMaster OS (restaurant :3000, admin :3001)
// Usage : node scripts/e2e-smoke.mjs  (serveurs de dev déjà lancés)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('scripts', '.e2e-output');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✓ PASS' : '✗ FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch({ headless: true });

async function openPage(url, label) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  return { page, pageErrors, label, ctx };
}

try {
  // 1) Console admin
  {
    const { page, pageErrors, ctx } = await openPage('http://localhost:3001/', 'admin');
    const bodyText = (await page.locator('body').innerText()).trim();
    await page.screenshot({ path: path.join(OUT, 'admin.png') });
    record('Admin : la page affiche du contenu', bodyText.length > 20, `${bodyText.length} caractères`);
    record('Admin : aucune exception JavaScript', pageErrors.length === 0, pageErrors.join(' | '));
    await ctx.close();
  }

  // 2) Restaurant : écran de connexion
  {
    const { page, pageErrors, ctx } = await openPage('http://localhost:3000/', 'restaurant');
    const bodyText = (await page.locator('body').innerText()).trim();
    await page.screenshot({ path: path.join(OUT, 'restaurant.png') });
    record('Restaurant : la page affiche du contenu', bodyText.length > 20, `${bodyText.length} caractères`);
    record('Restaurant : champ e-mail présent', (await page.locator('#login-email').count()) > 0);
    record('Restaurant : aucune exception JavaScript', pageErrors.length === 0, pageErrors.join(' | '));
    await ctx.close();
  }

  // 3) Restaurant : pré-remplissage par l'URL
  {
    const url = 'http://localhost:3000/?restaurantCode=RMS-DLA-7421&email=test%40exemple.com';
    const { page, ctx } = await openPage(url, 'prefill');
    await page.screenshot({ path: path.join(OUT, 'prefill.png') });
    const emailValue = await page.locator('#login-email').inputValue().catch(() => null);
    const inputValues = await page.locator('input').evaluateAll((els) => els.map((e) => e.value));
    const bodyText = await page.locator('body').innerText();
    record('Pré-remplissage : e-mail = test@exemple.com', emailValue === 'test@exemple.com', `valeur lue: ${emailValue}`);
    record('Pré-remplissage : code restaurant = RMS-DLA-7421', inputValues.includes('RMS-DLA-7421'), `champs: ${JSON.stringify(inputValues)}`);
    record('Pré-remplissage : bannière de bienvenue affichée', /Bienvenue sur votre restaurant/i.test(bodyText));
    await ctx.close();
  }
} catch (err) {
  record('Exécution du test', false, err instanceof Error ? err.message : String(err));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} vérifications réussies. Captures : ${OUT}`);
process.exit(failed ? 1 : 0);
