/**
 * RestoMaster OS — Script d'Audit de Livraison "Zéro Donnée Fictive"
 * Exécutable via : npm run check:demo
 *
 * Ce script inspecte l'intégralité du code source et des assets pour s'assurer
 * qu'aucune donnée de test, adresse e-mail factice, faux numéro de téléphone,
 * fausse référence fiscale ou URL externe Unsplash n'est présente dans le projet livré.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

interface ForbiddenPattern {
  id: string;
  name: string;
  regex: RegExp;
  category: 'email' | 'phone' | 'identity' | 'agency' | 'media' | 'fiscal_simulation';
}

const FORBIDDEN_PATTERNS: ForbiddenPattern[] = [
  // 1. E-mails démo et domaines inventés
  {
    id: 'demo_domain_resto_cm',
    name: 'Courriel factice de démo (@resto.cm)',
    regex: /@resto\.cm/i,
    category: 'email',
  },
  {
    id: 'demo_domain_demo_restaurant',
    name: 'Courriel factice de démo (@demo.restaurant)',
    regex: /@demo\.restaurant/i,
    category: 'email',
  },
  {
    id: 'demo_domain_oasis',
    name: 'Courriel factice Oasis (@oasisgourmande.cm)',
    regex: /@oasisgourmande\.cm/i,
    category: 'email',
  },
  {
    id: 'demo_email_dupont',
    name: 'Courriel placeholder jean.dupont@',
    regex: /jean\.dupont@/i,
    category: 'email',
  },
  {
    id: 'demo_email_curie',
    name: 'Courriel placeholder marie.curie@',
    regex: /marie\.curie@/i,
    category: 'email',
  },

  // 2. Numéros de téléphone camerounais codés en dur
  {
    id: 'fake_phone_1',
    name: 'Numéro camerounais démo (+237 699 00 11 22)',
    regex: /\+237 699 00 11 22/,
    category: 'phone',
  },
  {
    id: 'fake_phone_2',
    name: 'Numéro camerounais démo (+237 699 88 77 66)',
    regex: /\+237 699 88 77 66/,
    category: 'phone',
  },
  {
    id: 'fake_phone_3',
    name: 'Numéro camerounais démo (+237 677 11 22 33)',
    regex: /\+237 677 11 22 33/,
    category: 'phone',
  },
  {
    id: 'fake_phone_4',
    name: 'Numéro camerounais démo (+237 694 55 66 77)',
    regex: /\+237 694 55 66 77/,
    category: 'phone',
  },

  // 3. Faux établissements et entités fictives
  {
    id: 'fake_oasis_gourmande',
    name: "Nom d'établissement fictif (L'Oasis Gourmande)",
    regex: /L'Oasis Gourmande/i,
    category: 'identity',
  },
  {
    id: 'fake_oasis_express',
    name: "Nom d'établissement fictif (L'Oasis Express)",
    regex: /L'Oasis Express/i,
    category: 'identity',
  },
  {
    id: 'fake_oasis_beach',
    name: "Nom d'établissement fictif (L'Oasis Beach)",
    regex: /L'Oasis Beach/i,
    category: 'identity',
  },
  {
    id: 'fake_boucherie_littoral',
    name: 'Fournisseur fictif (Boucherie du Littoral)',
    regex: /Boucherie du Littoral/i,
    category: 'identity',
  },
  {
    id: 'fake_marche_kribi',
    name: 'Fournisseur fictif (Marché Central de Kribi)',
    regex: /Marché Central de Kribi/i,
    category: 'identity',
  },
  {
    id: 'fake_org_hardcoded',
    name: "Organisation démo codée en dur ('org-cameroun-hospitality')",
    regex: /['"`]org-cameroun-hospitality['"`]/,
    category: 'identity',
  },

  // 4. Mentions d'agence externe
  {
    id: 'genesis_digital_agency',
    name: "Mention de l'agence Genesis Digital Agency",
    regex: /Genesis Digital Agency/i,
    category: 'agency',
  },
  {
    id: 'guide_genesis',
    name: 'Mention du Guide Genesis',
    regex: /Guide Genesis/i,
    category: 'agency',
  },

  // 5. Médias et images externes en dur (Unsplash)
  {
    id: 'unsplash_images',
    name: 'URL Unsplash distante codée en dur',
    regex: /images\.unsplash\.com/i,
    category: 'media',
  },

  // 6. Fausses simulations fiscales et agréments inventés
  {
    id: 'sim_dgi',
    name: 'Faux préfixe de télétransmission fiscale (SIM-DGI)',
    regex: /SIM-DGI/i,
    category: 'fiscal_simulation',
  },
  {
    id: 'sim_ocr',
    name: 'Faux agrément OCR simulé (SIM-OCR)',
    regex: /SIM-OCR/i,
    category: 'fiscal_simulation',
  },
  {
    id: 'dgi_2026_sim',
    name: 'Fausse certification DGI (DGI-2026-SIM)',
    regex: /DGI-2026-SIM/i,
    category: 'fiscal_simulation',
  },
  {
    id: 'fake_niu_hardcoded',
    name: 'NIU d exemple codé en dur (M012012345678A)',
    regex: /M012012345678A/i,
    category: 'fiscal_simulation',
  },
  {
    id: 'fake_rccm_hardcoded',
    name: 'RCCM d exemple codé en dur (RC/YAO/2024/B/1894)',
    regex: /RC\/YAO\/2024\/B\/1894/i,
    category: 'fiscal_simulation',
  },
  {
    id: 'fake_tax_center_cime',
    name: 'Centre fiscal d exemple codé en dur (CIME Yaoundé 1)',
    regex: /CIME Yaound[ée] 1/i,
    category: 'fiscal_simulation',
  },
  {
    id: 'fake_tax_center_cdi',
    name: 'Centre fiscal d exemple codé en dur (CDI YAOUNDE I)',
    regex: /CDI YAOUNDE I\b/i,
    category: 'fiscal_simulation',
  },

  // 7. Numéros et codes marchands MoMo de test codés en dur
  {
    id: 'fake_momo_phone_699887766',
    name: 'Numéro direct OM de test en dur (699887766)',
    regex: /\b699887766\b/,
    category: 'phone',
  },
  {
    id: 'fake_momo_phone_677112233',
    name: 'Numéro direct MoMo de test en dur (677112233)',
    regex: /\b677112233\b/,
    category: 'phone',
  },
  {
    id: 'fake_om_merchant_code_784123',
    name: 'Code marchand OM de test en dur (784123)',
    regex: /\b784123\b/,
    category: 'phone',
  },
  {
    id: 'fake_momo_merchant_code_456789',
    name: 'Code marchand MoMo de test en dur (456789)',
    regex: /\b456789\b/,
    category: 'phone',
  },
];

interface Violation {
  file: string;
  line: number;
  pattern: ForbiddenPattern;
  snippet: string;
}

function scanDirectory(dirPath: string, ignoredDirs: string[] = []): string[] {
  let fileList: string[] = [];
  if (!fs.existsSync(dirPath)) return fileList;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (
        ignoredDirs.includes(entry.name) ||
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === '.git'
      ) {
        continue;
      }
      fileList = fileList.concat(scanDirectory(fullPath, ignoredDirs));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.md', '.css'].includes(ext)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

function runCheck(): void {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║       RESTOMASTER OS — AUDIT DE LIVRAISON "ZÉRO DONNÉE FICTIVE"            ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  const targetDirs = [
    path.join(ROOT_DIR, 'src'),
    path.join(ROOT_DIR, 'functions', 'src'),
    path.join(ROOT_DIR, 'public'),
  ];

  let filesToScan: string[] = [];
  for (const dir of targetDirs) {
    filesToScan = filesToScan.concat(scanDirectory(dir));
  }

  // Ajouter fichiers racines spécifiques
  const rootFiles = [path.join(ROOT_DIR, 'README.md')];
  for (const rf of rootFiles) {
    if (fs.existsSync(rf)) filesToScan.push(rf);
  }

  // Fichiers autorisés pour contexte historique ou fixtures
  const ALLOWED_FILES = [
    path.normalize('docs/DECISIONS.md'),
    path.normalize('scripts/check-no-demo.ts'),
    path.normalize('scripts/purge-test-data.ts'),
  ];

  const violations: Violation[] = [];

  for (const filePath of filesToScan) {
    const relativePath = path.relative(ROOT_DIR, filePath);
    if (ALLOWED_FILES.some((af) => relativePath.includes(af))) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.regex.test(line)) {
          violations.push({
            file: relativePath,
            line: i + 1,
            pattern,
            snippet: line.trim().slice(0, 120),
          });
        }
      }
    }
  }

  if (violations.length === 0) {
    console.log(`[✓] Succès : ${filesToScan.length} fichiers analysés.`);
    console.log('[✓] Aucune donnée fictive détectée. La plateforme est certifiée propre pour livraison client.\n');
    process.exit(0);
  } else {
    console.error(`[✗] ALERTE : ${violations.length} violation(s) de livraison détectée(s) :\n`);
    for (const v of violations) {
      console.error(
        `  • [${v.pattern.category.toUpperCase()}] ${v.file}:${v.line} -> ${v.pattern.name}`
      );
      console.error(`    "${v.snippet}"\n`);
    }
    console.error('Le build est annulé pour préserver la pureté de la plateforme client.');
    process.exit(1);
  }
}

runCheck();
