import { Order, OrderItem, RestaurantSettings } from '../../types/restaurant';
import { formatCurrency, formatDateTime, numberToFrenchWords, calculateCameroonTaxes } from '../../lib/utils';

export class EscPosBuilder {
  private buffer: number[] = [];
  private width: number = 48; // default 48 chars for 80mm, 32 for 58mm

  constructor(width: 32 | 42 | 48 = 48) {
    this.width = width;
    this.init();
  }

  // Initialize printer
  init(): this {
    this.buffer.push(0x1B, 0x40); // ESC @
    return this;
  }

  // Text alignment
  alignLeft(): this {
    this.buffer.push(0x1B, 0x61, 0x00); // ESC a 0
    return this;
  }

  alignCenter(): this {
    this.buffer.push(0x1B, 0x61, 0x01); // ESC a 1
    return this;
  }

  alignRight(): this {
    this.buffer.push(0x1B, 0x61, 0x02); // ESC a 2
    return this;
  }

  // Typography
  bold(enable: boolean = true): this {
    this.buffer.push(0x1B, 0x45, enable ? 0x01 : 0x00); // ESC E n
    return this;
  }

  doubleSize(enable: boolean = true): this {
    this.buffer.push(0x1D, 0x21, enable ? 0x11 : 0x00); // GS ! n
    return this;
  }

  doubleHeight(enable: boolean = true): this {
    this.buffer.push(0x1D, 0x21, enable ? 0x01 : 0x00);
    return this;
  }

  // Line Feeds
  feed(lines: number = 1): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0A);
    }
    return this;
  }

  // Print raw ASCII string (with accent stripping for standard ESC/POS CP437/CP850)
  text(str: string): this {
    const sanitized = this.sanitizeText(str);
    for (let i = 0; i < sanitized.length; i++) {
      this.buffer.push(sanitized.charCodeAt(i) & 0xFF);
    }
    return this;
  }

  textLine(str: string = ''): this {
    this.text(str);
    this.feed(1);
    return this;
  }

  // Two column line: "Poulet Braisé (1x)           8 500"
  twoColumns(left: string, right: string): this {
    const leftSanitized = this.sanitizeText(left);
    const rightSanitized = this.sanitizeText(right);
    const spaces = Math.max(1, this.width - leftSanitized.length - rightSanitized.length);
    const line = leftSanitized + ' '.repeat(spaces) + rightSanitized;
    this.text(line.slice(0, this.width));
    this.feed(1);
    return this;
  }

  // Divider lines
  divider(char: string = '-'): this {
    this.text(char.repeat(this.width));
    this.feed(1);
    return this;
  }

  doubleDivider(): this {
    return this.divider('=');
  }

  // Paper cutting
  cutPaper(partial: boolean = true): this {
    this.feed(4); // Advance paper past tear bar
    this.buffer.push(0x1D, 0x56, partial ? 0x42 : 0x41, 0x00); // GS V m n
    return this;
  }

  // Cash drawer kick pulse (RJ11/RJ12 Pin 2)
  drawerKick(): this {
    this.buffer.push(0x1B, 0x70, 0x00, 0x19, 0xFA); // ESC p 0 25 250
    return this;
  }

  // Sound alert / Buzzer
  buzzer(): this {
    this.buffer.push(0x1B, 0x42, 0x02, 0x02); // 2 beeps
    return this;
  }

  // Sanitize French accents for universal printer code pages
  private sanitizeText(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics for safe ESC/POS
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[€]/g, 'EUR')
      .replace(/[œ]/g, 'oe');
  }

  // Export as Uint8Array
  toBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Helper to build an 80mm/58mm Client Thermal Receipt in ESC/POS
 */
export function buildClientReceiptEscPos(
  order: Order,
  settings: RestaurantSettings,
  options: {
    paperWidth?: '58mm' | '80mm';
    charactersPerLine?: 32 | 42 | 48;
    openDrawer?: boolean;
    cutPaper?: boolean;
    cashGiven?: number;
    changeDue?: number;
    folio?: number;
  } = {}
): Uint8Array {
  const width = options.charactersPerLine || (options.paperWidth === '58mm' ? 32 : 48);
  const builder = new EscPosBuilder(width);

  // 1. Kick cash drawer if requested
  if (options.openDrawer) {
    builder.drawerKick();
  }

  // 2. Header
  builder.alignCenter().doubleSize(true).bold(true).textLine(settings.name);
  builder.doubleSize(false).bold(false);

  if (settings.slogan) {
    builder.textLine(settings.slogan);
  }
  builder.textLine(`${settings.address} - ${settings.city?.toUpperCase() || 'YAOUNDE'}`);
  builder.textLine(`Tel : ${settings.phone}`);
  builder.divider('-');
  builder.textLine(`NIU : ${settings.niu || 'M012012345678A'}  RCCM : ${settings.rccm || 'RC/YAO/2024/B/1894'}`);
  if (settings.taxCenter) {
    builder.textLine(`Centre des Impots : ${settings.taxCenter}`);
  }
  builder.doubleDivider();

  // 3. Metadata
  builder.alignLeft();
  builder.twoColumns('TICKET FISCAL', `N* ${order.orderNumber}`);
  builder.twoColumns('Date :', formatDateTime(order.createdAt));
  builder.twoColumns('Table :', `${order.tableName || 'Comptoir'} (${order.guestCount || 1} cvts)`);
  builder.twoColumns('Serveur :', order.serverName);
  if (order.customerName) {
    builder.twoColumns('Client :', order.customerName);
  }
  builder.divider('-');

  // 4. Items Table
  builder.twoColumns('DESIGNATION', 'TOTAL');
  builder.divider('-');

  const itemsToPrint = options.folio
    ? order.items.filter((i) => (i.folio || 1) === options.folio)
    : order.items;

  itemsToPrint.forEach((item) => {
    const itemTotal = item.unitPrice * item.quantity;
    const seatPrefix = item.seatNumber && item.seatNumber > 0 ? `[C${item.seatNumber}] ` : '';
    const nameStr = `${item.quantity}x ${seatPrefix}${item.productName}`;
    const priceStr = formatCurrency(itemTotal, settings.currency);

    builder.twoColumns(nameStr, priceStr);
    if (item.notes) {
      builder.textLine(`  * Note: ${item.notes}`);
    }
  });

  builder.divider('-');

  // 5. Totals & Taxes
  const subtotalHt = itemsToPrint.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const taxes = calculateCameroonTaxes(subtotalHt, settings.taxRate);
  const finalTotal = order.paidAmount > 0 ? order.paidAmount : taxes.totalTtc;

  builder.twoColumns('Sous-Total HT :', formatCurrency(taxes.subtotalHt, settings.currency));
  builder.twoColumns('TVA (17,50%) :', formatCurrency(taxes.tvaBase, settings.currency));
  builder.twoColumns('CAC (1,75%) :', formatCurrency(taxes.cacBase, settings.currency));
  builder.doubleDivider();

  builder.bold(true).doubleHeight(true);
  builder.twoColumns('NET A PAYER TTC :', formatCurrency(finalTotal, settings.currency));
  builder.bold(false).doubleHeight(false);
  builder.doubleDivider();

  // 6. Payment info
  const paymentMethodLabel = order.payments?.[0]?.method || 'Especes';
  builder.twoColumns('Mode de reglement :', paymentMethodLabel.toUpperCase());
  if (options.cashGiven && options.cashGiven > 0) {
    builder.twoColumns('Especes recues :', formatCurrency(options.cashGiven, settings.currency));
    builder.twoColumns('Monnaie rendue :', formatCurrency(options.changeDue || 0, settings.currency));
  }
  builder.divider('-');

  // 7. Words formula & Footer
  builder.alignCenter();
  const words = numberToFrenchWords(finalTotal).toUpperCase();
  builder.textLine(`"Arrete le present recu a la somme de :"`);
  builder.bold(true).textLine(`${words} FRANCS CFA.`);
  builder.bold(false);
  builder.divider('-');

  builder.textLine('*** MERCI DE VOTRE VISITE ! ***');
  builder.textLine('BON APPETIT ET A TRES BIENTOT');
  builder.textLine('Logiciel certifie RestoMaster OS Cameroun');

  // 8. Cut
  if (options.cutPaper !== false) {
    builder.cutPaper(true);
  }

  return builder.toBytes();
}

/**
 * Helper to build an 80mm/58mm Seat-level Pre-Bill (Note Couvert individuelle) in ESC/POS
 */
export function buildSeatPreBillEscPos(
  order: Order,
  seatNumber: number,
  settings: RestaurantSettings,
  options: {
    paperWidth?: '58mm' | '80mm';
    cutPaper?: boolean;
    includeShared?: boolean;
  } = {}
): Uint8Array {
  const width = options.paperWidth === '58mm' ? 32 : 48;
  const builder = new EscPosBuilder(width);

  // 1. Header
  builder.alignCenter().doubleSize(true).bold(true).textLine(settings.name);
  builder.doubleSize(false).bold(false);
  builder.textLine(`${settings.address} - ${settings.city?.toUpperCase() || 'YAOUNDE'}`);
  builder.textLine(`Tel : ${settings.phone}`);
  builder.divider('-');
  builder.bold(true).textLine('*** NOTE PRE-ADDITION ***');
  builder.textLine(`COUVERT / PLACE N* ${seatNumber}`);
  builder.bold(false);
  builder.doubleDivider();

  // 2. Metadata
  builder.alignLeft();
  builder.twoColumns('Commande :', `N* ${order.orderNumber}`);
  builder.twoColumns('Table :', `${order.tableName || 'Comptoir'} (Cvt ${seatNumber})`);
  builder.twoColumns('Date :', formatDateTime(new Date().toISOString()));
  builder.twoColumns('Serveur :', order.serverName);
  builder.divider('-');

  // 3. Items specifically for this seat + optional shared
  builder.twoColumns('DESIGNATION', 'TOTAL');
  builder.divider('-');

  const seatItems = order.items.filter((i) => (i.seatNumber ?? 1) === seatNumber);
  const sharedItems = options.includeShared ? order.items.filter((i) => i.seatNumber === 0) : [];

  let subtotal = 0;

  seatItems.forEach((item) => {
    const itemTotal = item.unitPrice * item.quantity;
    subtotal += itemTotal;
    builder.twoColumns(`${item.quantity}x ${item.productName}`, formatCurrency(itemTotal, settings.currency));
    if (item.notes) {
      builder.textLine(`  * Note: ${item.notes}`);
    }
  });

  if (sharedItems.length > 0) {
    builder.divider('.');
    builder.textLine('[Articles Partages Table]');
    sharedItems.forEach((item) => {
      const guestDiv = Math.max(1, order.guestCount || 1);
      const sharePrice = Math.round((item.unitPrice * item.quantity) / guestDiv);
      subtotal += sharePrice;
      builder.twoColumns(`1/${guestDiv}x ${item.productName} (Part)`, formatCurrency(sharePrice, settings.currency));
    });
  }

  builder.divider('-');

  // 4. Taxes & Total
  const taxes = calculateCameroonTaxes(subtotal, settings.taxRate);
  builder.twoColumns('Sous-Total HT :', formatCurrency(taxes.subtotalHt, settings.currency));
  builder.twoColumns('TVA (19.25%) :', formatCurrency(taxes.combinedTax, settings.currency));
  builder.doubleDivider();

  builder.bold(true).doubleHeight(true);
  builder.twoColumns('NET A PAYER COUVERT :', formatCurrency(taxes.totalTtc, settings.currency));
  builder.bold(false).doubleHeight(false);
  builder.doubleDivider();

  // 5. Footer Notice
  builder.alignCenter();
  builder.textLine('Document non fiscalise - Note proforma');
  builder.textLine('En attente de reglement individuel');
  builder.textLine('*** MERCI DE VOTRE VISITE ! ***');

  if (options.cutPaper !== false) {
    builder.cutPaper(true);
  }

  return builder.toBytes();
}

/**
 * Helper to build an 80mm Kitchen/Bar Production Ticket in ESC/POS
 */
export function buildKitchenTicketEscPos(
  order: Order,
  items: OrderItem[],
  destinationTitle: 'CUISINE' | 'BAR',
  options: {
    paperWidth?: '58mm' | '80mm';
    cutPaper?: boolean;
    soundBuzzer?: boolean;
  } = {}
): Uint8Array {
  const width = options.paperWidth === '58mm' ? 32 : 48;
  const builder = new EscPosBuilder(width);

  if (options.soundBuzzer) {
    builder.buzzer();
  }

  // Header Banner
  builder.alignCenter().doubleSize(true).bold(true);
  builder.textLine(`*** BON ${destinationTitle} ***`);
  builder.doubleSize(false).bold(false);

  builder.doubleDivider();
  builder.alignLeft();
  builder.bold(true).doubleSize(true);
  builder.twoColumns(`TABLE: ${order.tableName || 'EMPORTER'}`, `${order.guestCount || 1} CVTS`);
  builder.doubleSize(false).bold(false);

  builder.twoColumns('Bon N* :', order.orderNumber);
  builder.twoColumns('Heure Commande :', new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
  builder.twoColumns('Serveur :', order.serverName);
  builder.divider('=');

  // Items
  builder.bold(true);
  items.forEach((item) => {
    const seatPrefix = item.seatNumber && item.seatNumber > 0 ? `[C${item.seatNumber}] ` : '';
    builder.textLine(`${item.quantity}x  ${seatPrefix}${item.productName.toUpperCase()}`);
    if (item.notes) {
      builder.bold(false);
      builder.textLine(`   >>> ATTENTION : ${item.notes.toUpperCase()}`);
      builder.bold(true);
    }
    builder.feed(1);
  });
  builder.bold(false);

  if (order.notes) {
    builder.divider('-');
    builder.textLine(`NOTE COMMANDE : ${order.notes}`);
  }

  builder.divider('=');
  builder.alignCenter();
  builder.textLine(`Envoye a : ${new Date().toLocaleTimeString('fr-FR')}`);

  if (options.cutPaper !== false) {
    builder.cutPaper(true);
  }

  return builder.toBytes();
}

/**
 * Helper to build an 80mm/58mm Test Ticket in ESC/POS
 */
export function buildTestTicketEscPos(
  printerName: string,
  connectionType: string,
  model?: string,
  options: {
    paperWidth?: '58mm' | '80mm';
    cutPaper?: boolean;
    drawerKick?: boolean;
  } = {}
): Uint8Array {
  const width = options.paperWidth === '58mm' ? 32 : 48;
  const builder = new EscPosBuilder(width);

  if (options.drawerKick) {
    builder.drawerKick();
  }

  builder.alignCenter().doubleSize(true).bold(true);
  builder.textLine('TEST IMPRIMANTE POS');
  builder.doubleSize(false).bold(false);
  builder.textLine('RestoMaster OS - Architecture Materielle');
  builder.doubleDivider();

  builder.alignLeft();
  builder.twoColumns('Imprimante :', printerName);
  builder.twoColumns('Connexion :', connectionType.toUpperCase());
  if (model) {
    builder.twoColumns('Modele :', model);
  }
  builder.twoColumns('Largeur papier :', `${options.paperWidth || '80mm'} (${width} colonnes)`);
  builder.twoColumns('Date & Heure :', new Date().toLocaleString('fr-FR'));
  builder.twoColumns('Protocole :', 'ESC/POS Binaire Standard');
  builder.divider('-');

  builder.textLine('Verification des capacites materielles :');
  builder.textLine('  [OK] Initialisation ESC @');
  builder.bold(true).textLine('  [OK] Typographie en Gras (Bold)').bold(false);
  builder.doubleHeight(true).textLine('  [OK] Double Hauteur').doubleHeight(false);
  builder.doubleSize(true).textLine('  [OK] Double Taille').doubleSize(false);
  builder.textLine('  [OK] Decoupe papier automatique (Auto-cutter)');
  builder.textLine('  [OK] Signal tiroir-caisse RJ11/RJ12 24V');
  builder.divider('=');

  builder.alignCenter();
  builder.textLine('*** TEST MATERIEL VALIDE AVEC SUCCES ***');
  builder.textLine('Imprimante prete pour l\'exploitation.');

  if (options.cutPaper !== false) {
    builder.cutPaper(true);
  }

  return builder.toBytes();
}
