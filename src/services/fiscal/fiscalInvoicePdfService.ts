/**
 * RestoMaster OS — Service d'Édition et d'Export PDF de Facture Fiscale Officielle DGI
 * Conforme aux normes de facturation du Code Général des Impôts (CGI Cameroun)
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, RestaurantSettings, Order } from '../../types/restaurant';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { DgiFiscalHelper } from './dgiQrCodeHelper';
import { platform } from '../../platform';

export class FiscalInvoicePdfService {
  /**
   * Génère et télécharge le document PDF A4 certifié DGI
   */
  public static async downloadFiscalInvoicePdf(
    invoice: Invoice,
    settings: RestaurantSettings,
    order?: Order
  ): Promise<void> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = [15, 23, 42]; // Slate-900
    const accentAmber = [217, 119, 6]; // Amber-600
    const textMuted = [100, 116, 139]; // Slate-500

    // 1. BANDEAU SUPÉRIEUR ET EN-TÊTE ÉMETTEUR
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 8, 'F');

    // Logo ou Nom de l'établissement
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(settings.raisonSociale || settings.name || 'RESTOMASTER OS', 14, 22);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    if (settings.slogan) {
      doc.text(settings.slogan, 14, 27);
    }

    // Informations juridiques & fiscales de l'émetteur
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    const emitterLines: string[] = [];
    if (settings.formeJuridique || settings.regimeFiscal) {
      emitterLines.push(`Forme : ${settings.formeJuridique || '-'} • Régime : ${(settings.regimeFiscal || 'Réel').toUpperCase()}`);
    }
    if (settings.niu || settings.rccm) {
      emitterLines.push(`NIU : ${settings.niu || 'Non renseigné'} • RCCM : ${settings.rccm || 'Non renseigné'}`);
    }
    if (settings.taxCenter) {
      emitterLines.push(`Centre des Impôts : ${settings.taxCenter}`);
    }
    const addressLine = [settings.address, settings.quartier, settings.city].filter(Boolean).join(', ');
    if (addressLine) {
      emitterLines.push(`Adresse : ${addressLine}`);
    }
    const contactLine = [
      settings.phone ? `Tél : ${settings.phone}` : '',
      settings.email ? `Email : ${settings.email}` : '',
    ].filter(Boolean).join(' • ');
    if (contactLine) {
      emitterLines.push(contactLine);
    }

    let currentY = 32;
    for (const line of emitterLines) {
      doc.text(line, 14, currentY);
      currentY += 4.2;
    }

    // 2. EN-TÊTE FACTURE OFFICIELLE (À DROITE)
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(120, 14, 76, 32, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(120, 14, 76, 32, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(217, 119, 6);
    doc.text('FACTURE FISCALE OFFICIELLE', 124, 22);

    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`N° ${invoice.invoiceNumber}`, 124, 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Date : ${invoice.date || new Date().toISOString().slice(0, 10)}`, 124, 34);
    doc.text(`Heure : ${invoice.time || '12:00'}`, 124, 39);
    doc.text(`Exercice Fiscal : ${settings.exerciceFiscal || '2026'}`, 124, 44);

    // 3. BLOC DESTINATAIRE / CLIENT
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, 56, 182, 24, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, 56, 182, 24, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('FACTURÉ À (DOIT) :', 18, 62);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(invoice.customerName || 'CLIENT AU COMPTANT', 18, 68);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`NIU Client : ${invoice.customerNiu || 'Particulier non immatriculé'}`, 18, 74);

    if (invoice.customerRccm) {
      doc.text(`RCCM Client : ${invoice.customerRccm}`, 95, 74);
    }
    if (invoice.customerAddress) {
      doc.text(`Adresse : ${invoice.customerAddress}`, 95, 68);
    }
    if (invoice.orderNumber) {
      doc.text(`Réf Commande : ${invoice.orderNumber}`, 140, 62);
    }

    // 4. TABLEAU DES PRESTATIONS ET ARTICLES
    const tableHeaders = [
      ['N°', 'Désignation des Prestations', 'Qté', 'P.U. HT (FCFA)', 'Total HT (FCFA)', 'TVA (17,5%)', 'Total TTC (FCFA)'],
    ];

    const tableRows = invoice.items.map((item, idx) => {
      const qte = item.quantity;
      const puHT = item.unitPriceHT;
      const totHT = item.totalHT || puHT * qte;
      const tva = item.vatAmount || Math.round((totHT * 17.5) / 100);
      const ttc = item.totalTTC || totHT + Math.round((totHT * 19.25) / 100);

      return [
        (idx + 1).toString(),
        item.productName,
        qte.toString(),
        formatCurrency(puHT, '').trim(),
        formatCurrency(totHT, '').trim(),
        formatCurrency(tva, '').trim(),
        formatCurrency(ttc, '').trim(),
      ];
    });

    autoTable(doc, {
      startY: 85,
      head: tableHeaders,
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        valign: 'middle',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left', cellWidth: 70 },
        2: { halign: 'center', cellWidth: 12 },
        3: { halign: 'right', cellWidth: 26 },
        4: { halign: 'right', cellWidth: 26 },
        5: { halign: 'right', cellWidth: 20 },
        6: { halign: 'right', cellWidth: 26 },
      },
      margin: { left: 14, right: 14 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 6;

    // 5. BLOC TOTAUX FISCAUX DGI (À DROITE)
    const totalsWidth = 76;
    const totalsX = 210 - 14 - totalsWidth;
    let totalsY = finalY;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(totalsX, totalsY, totalsWidth, 54, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(totalsX, totalsY, totalsWidth, 54, 2, 2, 'D');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    const printTotalLine = (label: string, value: string, isBold = false) => {
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.text(label, totalsX + 4, totalsY + 6);
      doc.text(value, totalsX + totalsWidth - 4, totalsY + 6, { align: 'right' });
      totalsY += 5.5;
    };

    printTotalLine('Total Brut HT :', formatCurrency(invoice.subtotalHT, settings.currency));
    if (invoice.discountTotal > 0) {
      printTotalLine('Remise commerciale :', `-${formatCurrency(invoice.discountTotal, settings.currency)}`);
    }
    printTotalLine('Base Imposable HT :', formatCurrency(invoice.taxableBase || invoice.subtotalHT, settings.currency));
    printTotalLine('TVA Légale (17,50%) :', formatCurrency(invoice.vatAmount, settings.currency));
    printTotalLine('CAC Communaux (1,75%) :', formatCurrency(invoice.cacAmount, settings.currency));

    if ((invoice.withholdingAmount || 0) > 0) {
      printTotalLine('Retenue AIR appliquée :', `-${formatCurrency(invoice.withholdingAmount || 0, settings.currency)}`);
    }

    doc.setDrawColor(15, 23, 42);
    doc.line(totalsX + 4, totalsY + 3, totalsX + totalsWidth - 4, totalsY + 3);
    totalsY += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL TTC :', totalsX + 4, totalsY + 4);
    doc.text(formatCurrency(invoice.totalTTC, settings.currency), totalsX + totalsWidth - 4, totalsY + 4, {
      align: 'right',
    });

    // 6. BLOC QR CODE FISCAL DGI & SCEAU DE SÉCURITÉ (À GAUCHE)
    const qrResult = await DgiFiscalHelper.generateQrDataUrl(
      {
        emitterNiu: settings.niu || invoice.emitterNiu || '',
        emitterRccm: settings.rccm || invoice.emitterRccm,
        invoiceNumber: invoice.invoiceNumber,
        dateTimeIso: invoice.validatedAt || new Date().toISOString(),
        subtotalHT: invoice.taxableBase || invoice.subtotalHT,
        vatAmount: invoice.vatAmount,
        cacAmount: invoice.cacAmount,
        totalTTC: invoice.totalTTC,
        clientNiu: invoice.customerNiu,
      },
      invoice.securitySignature
    );

    if (qrResult.dataUrl) {
      doc.addImage(qrResult.dataUrl, 'PNG', 14, finalY, 34, 34);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('CERTIFICATION FISCALE DGI CAMEROUN', 52, finalY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Facture électronique scellée conformément au CGI.', 52, finalY + 10);
    doc.text('Vérifiable par le scanner des agents des impôts.', 52, finalY + 14);

    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);
    const shortSeal = (invoice.securitySignature || qrResult.seal).slice(0, 32);
    doc.text(`SCEAU : ${shortSeal}...`, 52, finalY + 20);

    // 7. ARRÊTÉ DE LA FACTURE EN TOUTES LETTRES (OBLIGATOIRE AU CAMEROUN)
    const wordsY = Math.max(totalsY + 10, finalY + 42);
    doc.setFillColor(254, 252, 232); // Amber light
    doc.roundedRect(14, wordsY, 182, 12, 1.5, 1.5, 'F');
    doc.setDrawColor(251, 191, 36);
    doc.roundedRect(14, wordsY, 182, 12, 1.5, 1.5, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14);
    doc.text(invoice.amountInWords || `Arrêté la présente facture à la somme de : ${formatCurrency(invoice.totalTTC, settings.currency)}.`, 18, wordsY + 7);

    // 8. TAMPONS ET SIGNATURES
    const stampY = wordsY + 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);

    doc.text('Pour le Client / Réceptionnaire :', 24, stampY);
    doc.text("La Caisse / Direction de l'Établissement :", 124, stampY);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('(Signature précédée de "Bon pour accord")', 24, stampY + 4);
    doc.text('(Cachet officiel & Signature autorisée)', 124, stampY + 4);

    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(24, stampY + 7, 60, 20, 1, 1, 'D');
    doc.roundedRect(124, stampY + 7, 60, 20, 1, 1, 'D');

    // 9. PIED DE PAGE LÉGAL
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Document généré par RestoMaster OS Cameroun — Système de caisse et facturation certifié conforme au CGI 2026',
      105,
      288,
      { align: 'center' }
    );

    // Sauvegarde via l'adaptateur de plateforme
    const filename = `facture_dgi_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    const pdfBuffer = doc.output('arraybuffer');
    await platform.files.save({
      filename,
      mimeType: 'application/pdf',
      data: new Uint8Array(pdfBuffer),
    });
  }
}
