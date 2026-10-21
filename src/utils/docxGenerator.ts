import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableCell, 
  TableRow, 
  TextRun, 
  WidthType, 
  AlignmentType,
  ShadingType,
  ImageRun,
} from 'docx';
import { RhEmployee } from '../types/restaurant';

import defaultLogo from '../assets/company_logo.png';
import { getExportFileSuffix } from './exportRHHelpers';
import { platform } from '../platform';

/** Charge une image sous forme de Uint8Array (gère les URLs relatives Vite, les blobs, et les data URLs) */
async function loadLogoBytes(src: string | null): Promise<{ bytes: Uint8Array; type: 'png' | 'jpg' } | null> {
  if (!src) return null;
  try {
    if (src.startsWith('data:')) {
      const isJpeg = src.includes('data:image/jpeg') || src.includes('data:image/jpg');
      const b64 = src.includes(',') ? src.split(',')[1] : src;
      const binaryStr = atob(b64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      return { bytes, type: isJpeg ? 'jpg' : 'png' };
    }

    // Si c'est une URL d'asset importé par Vite (ex: /assets/company_logo-XXXX.png ou ./assets/...)
    const response = await fetch(src);
    const arrayBuffer = await response.arrayBuffer();
    const isJpeg = src.endsWith('.jpg') || src.endsWith('.jpeg');
    return { bytes: new Uint8Array(arrayBuffer), type: isJpeg ? 'jpg' : 'png' };
  } catch (err) {
    console.warn('[DOCX] Erreur lors du chargement des octets du logo:', err);
    return null;
  }
}

/** Récupère le logo depuis le localStorage ou fallback sur l'actif par défaut */
const getLogoSrc = (): string | null => localStorage.getItem('stock_expert_logo') || defaultLogo;

/** Récupère le nom de l'entreprise depuis le localStorage */
const getCompanyName = (): string => {
  try {
    const c = JSON.parse(localStorage.getItem('stock_expert_company') || '{}');
    return c.name || 'Echos De Chez Moi';
  } catch { return 'Echos De Chez Moi'; }
};


export interface DocxColumn {
  header: string;
  key: string;
}

export interface DocxExportOptions {
  title: string;
  subtitle?: string;
  columns: DocxColumn[];
  data: Record<string, any>[];
  filename: string;
}

/**
 * Générateur universel de documents Microsoft Word (.docx)
 * Reproduit fidèlement le design du bandeau PDF officiel (vert foncé + liseré jaune + logo + titres)
 */
export async function generateAndDownloadDOCX({
  title,
  subtitle,
  columns,
  data,
  filename
}: DocxExportOptions): Promise<void> {
  const currentDateStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const companyName = getCompanyName();
  const logoSrc = getLogoSrc();

  // 1. Logo image element (chargement asynchrone robuste pour support Vite + DataURL)
  let logoParagraph: Paragraph | null = null;
  if (logoSrc) {
    const logoResult = await loadLogoBytes(logoSrc);
    if (logoResult && logoResult.bytes.length > 0) {
      try {
        logoParagraph = new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: logoResult.bytes,
              transformation: { width: 55, height: 55 },
              type: logoResult.type,
            })
          ]
        });
      } catch (e) {
        console.warn('DOCX logo error:', e);
      }
    }
  }

  // 2. BANDEAU D'EN-TÊTE DESIGN IDENTIQUE AU PDF (#0F5132 avec liseré jaune #FFC107)
  const headerBannerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // Ligne principale verte foncée
      new TableRow({
        children: [
          // Colonne Logo (si disponible)
          new TableCell({
            width: { size: logoParagraph ? 16 : 0, type: WidthType.PERCENTAGE },
            shading: { fill: '0F5132', type: ShadingType.CLEAR },
            margins: { top: 160, bottom: 160, left: 160, right: 160 },
            children: logoParagraph ? [logoParagraph] : [new Paragraph({})]
          }),
          // Colonne Titre Entreprise & Service
          new TableCell({
            width: { size: logoParagraph ? 44 : 55, type: WidthType.PERCENTAGE },
            shading: { fill: '0F5132', type: ShadingType.CLEAR },
            margins: { top: 160, bottom: 160, left: 120, right: 120 },
            children: [
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: companyName,
                    bold: true,
                    size: 30, // 15pt
                    color: 'FFFFFF',
                    font: 'Calibri'
                  })
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Services RH & Paie',
                    size: 19, // 9.5pt
                    color: 'D4EDDA',
                    font: 'Calibri'
                  })
                ]
              })
            ]
          }),
          // Colonne Titre Document & Date (aligné à droite)
          new TableCell({
            width: { size: logoParagraph ? 40 : 45, type: WidthType.PERCENTAGE },
            shading: { fill: '0F5132', type: ShadingType.CLEAR },
            margins: { top: 160, bottom: 160, left: 120, right: 160 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 50 },
                children: [
                  new TextRun({
                    text: title.toUpperCase(),
                    bold: true,
                    size: 22, // 11pt
                    color: 'FFFFFF',
                    font: 'Calibri'
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: currentDateStr,
                    size: 17, // 8.5pt
                    color: 'E2E8F0',
                    font: 'Calibri'
                  })
                ]
              })
            ]
          })
        ]
      }),
      // Liseré jaune fine séparation (comme le PDF)
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 3,
            shading: { fill: 'FFC107', type: ShadingType.CLEAR },
            margins: { top: 30, bottom: 30, left: 0, right: 0 },
            children: [new Paragraph({})]
          })
        ]
      })
    ]
  });

  // 3. Ligne d'en-tête du tableau de données (Vert RH #0F5132)
  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      // Colonne N°
      new TableCell({
        width: { size: 6, type: WidthType.PERCENTAGE },
        shading: { fill: '0F5132', type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 80, right: 80 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'N°',
                bold: true,
                color: 'FFFFFF',
                size: 18,
                font: 'Calibri'
              })
            ]
          })
        ]
      }),
      ...columns.map(col => new TableCell({
        shading: { fill: '0F5132', type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 100, right: 100 },
        children: [
          new Paragraph({
            alignment: col.key === 'statutLabel' || col.key === 'typeLabel' ? AlignmentType.CENTER : AlignmentType.LEFT,
            children: [
              new TextRun({
                text: col.header,
                bold: true,
                color: 'FFFFFF',
                size: 18, // 9pt
                font: 'Calibri'
              })
            ]
          })
        ]
      }))
    ]
  });

  // 4. Lignes de données du tableau
  const dataRows = data.map((row, idx) => {
    // Alternance vert clair / blanc (comme le PDF alternateRowStyles: [240, 253, 244])
    const bgColor = idx % 2 === 0 ? 'FFFFFF' : 'F0FDF4';
    const isRenvoye = String(row.statutLabel || '').toUpperCase().includes('LICENCI') || String(row.statutLabel || '').toUpperCase().includes('RENVOY');

    return new TableRow({
      children: [
        // Cellule N°
        new TableCell({
          width: { size: 6, type: WidthType.PERCENTAGE },
          shading: { fill: bgColor, type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 80, right: 80 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: String(idx + 1),
                  bold: true,
                  size: 18,
                  font: 'Calibri',
                  color: '64748B'
                })
              ]
            })
          ]
        }),
        // Autres colonnes
        ...columns.map(col => {
          const val = row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '';
          const isStatutCol = col.key === 'statutLabel';
          const textColor = (isStatutCol && isRenvoye) ? 'DC3545' : '1E293B';
          const isBold = (isStatutCol && isRenvoye) || col.key === 'nomComplet';

          return new TableCell({
            shading: { fill: bgColor, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: isStatutCol || col.key === 'typeLabel' ? AlignmentType.CENTER : (col.key === 'salaireFormatted' ? AlignmentType.RIGHT : AlignmentType.LEFT),
                children: [
                  new TextRun({
                    text: val,
                    size: 18, // 9pt
                    font: 'Calibri',
                    bold: isBold,
                    color: textColor
                  })
                ]
              })
            ]
          });
        })
      ]
    });
  });

  // 5. Tableau des données
  const dataTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [tableHeaderRow, ...dataRows]
  });

  // 6. Pied de page discret
  const footerParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 300 },
    children: [
      new TextRun({
        text: 'Document officiel généré par Echo Gestion v2.0 — Confidentiel & Usage Interne',
        size: 16, // 8pt
        color: '94A3B8',
        italics: true,
        font: 'Calibri'
      })
    ]
  });

  // 7. Espacement sous le bandeau
  const spacer = new Paragraph({ spacing: { after: 200 } });

  // 8. Assemblage du Document OpenXML
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 inch
              bottom: 720,
              left: 720,
              right: 720
            }
          }
        },
        children: [
          headerBannerTable,
          spacer,
          dataTable,
          footerParagraph
        ]
      }
    ]
  });

  // 9. Génération et Téléchargement du Blob .docx
  const rawBuffer = await Packer.toBuffer(doc);
  await platform.files.save({
    filename: filename.endsWith('.docx') ? filename : `${filename}.docx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    data: new Uint8Array(rawBuffer),
  });
}

/**
 * Exporte le personnel au format Word (.docx)
 */
export async function exportPersonnelDOCX(employees: RhEmployee[], options?: { exportColumns?: string[]; customColumns?: string[]; filters?: { site?: string; type?: string; statut?: string } }): Promise<void> {
  const isDismissedFilter = options?.filters?.statut === 'renvoye';

  const filtered = employees.filter(emp => {
    if (isDismissedFilter) {
      if (emp.statut !== 'renvoye') return false;
    } else {
      if (emp.statut === 'renvoye') return false;
      if (options?.filters?.statut && options.filters.statut !== 'all' && emp.statut !== options.filters.statut) return false;
    }
    if (options?.filters?.site && options.filters.site !== 'all' && emp.site !== options.filters.site) return false;
    if (options?.filters?.type && options.filters.type !== 'all' && emp.type !== options.filters.type) return false;
    return true;
  });

  const selCols = options?.exportColumns || ['nomComplet', 'type', 'statut', 'site', 'contact', 'salaire'];
  const customCols = options?.customColumns || [];

  const columns: DocxColumn[] = [];

  if (selCols.includes('nomComplet')) columns.push({ header: 'Nom & Prénom', key: 'nomComplet' });
  if (selCols.includes('type')) columns.push({ header: 'Contrat / Type', key: 'typeLabel' });
  if (selCols.includes('statut')) columns.push({ header: 'Statut', key: 'statutLabel' });
  if (selCols.includes('site')) columns.push({ header: 'Site', key: 'site' });
  if (selCols.includes('contact')) columns.push({ header: 'Contact', key: 'contact' });
  if (selCols.includes('salaire')) columns.push({ header: 'Salaire Base (FCFA)', key: 'salaireFormatted' });

  customCols.forEach(colName => {
    columns.push({ header: colName, key: `custom_${colName}` });
  });

  const data = filtered.map(emp => {
    const row: Record<string, any> = {
      nomComplet: `${emp.nom} ${emp.prenom}`.trim(),
      typeLabel: emp.type === 'temporaire' ? 'Temporaire' : 'CDI / CDD',
      statutLabel: emp.statut === 'renvoye' ? 'Fin Contrat / Licencié' : 'Actif',
      site: emp.site,
      contact: emp.contact || '—',
      salaireFormatted: `${(emp.salaireBase || 0).toLocaleString()} F`,
    };

    customCols.forEach(colName => {
      row[`custom_${colName}`] = ''; // Colonne vide
    });

    return row;
  });

  const docTitle = isDismissedFilter ? 'REGISTRE DU PERSONNEL - LICENCIES & ANCIENS' : 'REGISTRE DU PERSONNEL';
  const filePrefix = isDismissedFilter ? 'echos_personnel_licencies' : 'echos_personnel';

  await generateAndDownloadDOCX({
    title: docTitle,
    subtitle: `Effectif exporté : ${data.length} employé(s)`,
    columns,
    data,
    filename: `${filePrefix}_${getExportFileSuffix()}.docx`
  });
}
