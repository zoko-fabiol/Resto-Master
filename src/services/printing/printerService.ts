import { Order, OrderItem, RestaurantSettings } from '../../types/restaurant';
import { Peripheral } from '../../types/configuration';
import {
  buildClientReceiptEscPos,
  buildSeatPreBillEscPos,
  buildKitchenTicketEscPos,
  buildTestTicketEscPos,
  EscPosBuilder,
} from './escposGenerator';
import { isDesktop, platform } from '../../platform';

export interface PrinterDiscoveryResult {
  name: string;
  connectionType: 'usb' | 'bluetooth';
  address: string;
  vendorId?: number;
  productId?: number;
}

export class PrinterService {
  private hardwareEnabled: boolean = true;

  /**
   * Configure whether hardware printer transmission is allowed
   */
  setHardwareEnabled(enabled: boolean): void {
    this.hardwareEnabled = enabled;
  }

  isHardwareEnabled(): boolean {
    return this.hardwareEnabled;
  }

  /**
   * Check if WebUSB is supported by the current browser
   */
  isWebUsbSupported(): boolean {
    return typeof navigator !== 'undefined' && 'usb' in navigator;
  }

  /**
   * Check if Web Bluetooth is supported by the current browser
   */
  isWebBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Request a USB Thermal Printer via WebUSB API
   * Compatible with Epson, Star, Xprinter, Bixolon, Munbyn, etc.
   */
  async requestUsbPrinter(): Promise<PrinterDiscoveryResult> {
    if (!this.isWebUsbSupported()) {
      throw new Error(
        "L'API WebUSB n'est pas supportée sur ce navigateur. Veuillez utiliser Google Chrome, Microsoft Edge ou Opera."
      );
    }

    try {
      // Common thermal printer USB Vendor IDs:
      // Epson: 0x04b8, Star: 0x0519, Xprinter: 0x0416, 0x1fc9, Bixolon: 0x1504, Munbyn: 0x0483
      const device = await (navigator as any).usb.requestDevice({
        filters: [], // Allows selecting any connected USB device
      });

      const name = device.productName || `Imprimante USB (VID: 0x${device.vendorId.toString(16)})`;
      const address = `USB:${device.vendorId.toString(16)}:${device.productId.toString(16)}`;

      return {
        name,
        connectionType: 'usb',
        address,
        vendorId: device.vendorId,
        productId: device.productId,
      };
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        throw new Error('Aucune imprimante USB sélectionnée.');
      }
      throw err;
    }
  }

  /**
   * Request a Bluetooth Mobile Printer via Web Bluetooth API
   */
  async requestBluetoothPrinter(): Promise<PrinterDiscoveryResult> {
    if (!this.isWebBluetoothSupported()) {
      throw new Error(
        "L'API Web Bluetooth n'est pas supportée sur ce navigateur. Veuillez utiliser Google Chrome ou Edge avec le Bluetooth activé."
      );
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard Serial / POS Printer Service
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        ],
      });

      return {
        name: device.name || 'Imprimante Bluetooth Portable',
        connectionType: 'bluetooth',
        address: device.id || 'BT-DEVICE',
      };
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        throw new Error('Aucune imprimante Bluetooth sélectionnée.');
      }
      throw err;
    }
  }

  /**
   * Send binary ESC/POS buffer to target peripheral
   */
  async sendRawToPrinter(
    peripheral: Peripheral,
    data: Uint8Array
  ): Promise<{ success: boolean; message: string }> {
    // 0. Feature check: if printers_hardware is disabled
    if (!this.hardwareEnabled) {
      return {
        success: false,
        message: `Module d'impression matérielle désactivé. Veuillez activer l'option dans les paramètres ou utiliser l'impression système du navigateur.`,
      };
    }

    if (data.length === 0) {
      return {
        success: false,
        message: `Le ticket d'impression est vide. Aucun octet n'a été transmis.`,
      };
    }

    // 1. WebUSB Direct Print
    if (peripheral.connectionType === 'usb') {
      if (!this.isWebUsbSupported()) {
        return {
          success: false,
          message: `L'API WebUSB n'est pas supportée par ce navigateur (utilisez Google Chrome ou Microsoft Edge).`,
        };
      }

      try {
        const devices = await (navigator as any).usb.getDevices();
        if (devices && devices.length > 0) {
          const device = devices[0];
          await device.open();
          await device.selectConfiguration(1);
          await device.claimInterface(0);
          await device.transferOut(1, data);
          await device.close();

          return {
            success: true,
            message: `Données envoyées avec succès à l'imprimante USB [${peripheral.name}].`,
          };
        } else {
          return {
            success: false,
            message: `Aucune imprimante USB autorisée pour [${peripheral.name}]. Veuillez cliquer sur 'Associer USB' pour autoriser la connexion.`,
          };
        }
      } catch (usbErr: any) {
        return {
          success: false,
          message: `Erreur d'accès à l'imprimante USB [${peripheral.name}] : ${usbErr.message || 'Périphérique inaccessible'}.`,
        };
      }
    }

    // 2. Network IP (Ethernet / Wi-Fi) TCP Port 9100 / Local Print Bridge
    if (peripheral.connectionType === 'reseau_ip') {
      if (isDesktop()) {
        try {
          await platform.printing.printRaw(data, {
            host: peripheral.address,
            port: peripheral.port || 9100,
            printerId: peripheral.id,
          });
          return {
            success: true,
            message: `Ticket transmis à l'imprimante réseau ${peripheral.address}:${peripheral.port || 9100} (${data.length} octets).`,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            success: false,
            message: `Échec de l'impression réseau vers ${peripheral.address}:${peripheral.port || 9100} : ${message}`,
          };
        }
      }

      const bridgeUrl = `http://${peripheral.address}:${peripheral.port || 9100}/print`;
      try {
        const res = await fetch(bridgeUrl, {
          method: 'POST',
          body: new Blob([data.buffer as ArrayBuffer]),
          headers: { 'Content-Type': 'application/octet-stream' },
        });

        if (res.ok) {
          return {
            success: true,
            message: `Ticket transmis à l'adresse IP ${peripheral.address}:${peripheral.port || 9100} (${data.length} octets).`,
          };
        } else {
          return {
            success: false,
            message: `Le pont d'impression IP (${bridgeUrl}) a retourné une erreur (HTTP ${res.status}).`,
          };
        }
      } catch (err: any) {
        return {
          success: false,
          message: `Impossible de joindre le pont d'impression IP à ${peripheral.address}:${peripheral.port || 9100}. Vérifiez l'adresse IP et le réseau.`,
        };
      }
    }

    // 3. Bluetooth Direct Print
    if (peripheral.connectionType === 'bluetooth') {
      if (!this.isWebBluetoothSupported()) {
        return {
          success: false,
          message: `L'API Web Bluetooth n'est pas supportée par ce navigateur (recommandé : Google Chrome / Edge).`,
        };
      }
      return {
        success: false,
        message: `L'imprimante Bluetooth [${peripheral.name}] n'a pas de liaison active. Cliquez sur 'Associer Bluetooth'.`,
      };
    }

    // 4. Aucune interface valide
    return {
      success: false,
      message: `Aucune liaison physique active vers [${peripheral.name}] (${peripheral.connectionType}). Pour imprimer, raccordez l'imprimante ou utilisez l'impression système (Ctrl+P).`,
    };
  }

  /**
   * Print a Customer Thermal Receipt (80mm/58mm)
   */
  async printCustomerReceipt(
    order: Order,
    settings: RestaurantSettings,
    peripheral?: Peripheral,
    options: { cashGiven?: number; changeDue?: number; folio?: number } = {}
  ): Promise<{ success: boolean; message: string }> {
    const paperWidth = peripheral?.paperWidth || '80mm';
    const openDrawer = Boolean(
      peripheral?.openDrawerOnCash && order.payments?.some((p) => p.method === 'especes')
    );

    const rawData = buildClientReceiptEscPos(order, settings, {
      paperWidth,
      charactersPerLine: peripheral?.charactersPerLine,
      openDrawer,
      cutPaper: peripheral?.cutPaper ?? true,
      cashGiven: options.cashGiven,
      changeDue: options.changeDue,
      folio: options.folio,
    });

    if (peripheral) {
      return this.sendRawToPrinter(peripheral, rawData);
    }

    return {
      success: false,
      message: 'Aucune imprimante thermique matérielle associée. Utilisez l\'impression système (Ctrl+P).',
    };
  }

  /**
   * Print a Seat-Level Thermal Pre-Bill (Addition par couvert)
   */
  async printSeatPreBill(
    order: Order,
    seatNumber: number,
    settings: RestaurantSettings,
    peripheral?: Peripheral,
    options: { includeShared?: boolean } = {}
  ): Promise<{ success: boolean; message: string }> {
    const paperWidth = peripheral?.paperWidth || '80mm';
    const rawData = buildSeatPreBillEscPos(order, seatNumber, settings, {
      paperWidth,
      cutPaper: peripheral?.cutPaper ?? true,
      includeShared: options.includeShared,
    });

    if (peripheral) {
      return this.sendRawToPrinter(peripheral, rawData);
    }

    return {
      success: false,
      message: `Aucune imprimante matérielle associée pour la note du couvert ${seatNumber}.`,
    };
  }

  /**
   * Print a global table Pre-Bill
   */
  async printPreBill(
    order: Order,
    settings: RestaurantSettings,
    peripheral?: Peripheral
  ): Promise<{ success: boolean; message: string }> {
    return this.printSeatPreBill(order, 0, settings, peripheral, { includeShared: true });
  }

  /**
   * Print a Kitchen or Bar Production Ticket
   */
  async printKitchenOrder(
    order: Order,
    destination: 'cuisine' | 'bar',
    items: OrderItem[],
    peripheral?: Peripheral
  ): Promise<{ success: boolean; message: string }> {
    if (items.length === 0) {
      return { success: false, message: 'Aucun article à imprimer.' };
    }

    const paperWidth = peripheral?.paperWidth || '80mm';
    const rawData = buildKitchenTicketEscPos(
      order,
      items,
      destination === 'cuisine' ? 'CUISINE' : 'BAR',
      {
        paperWidth,
        cutPaper: peripheral?.cutPaper ?? true,
        soundBuzzer: peripheral?.soundBuzzer ?? true,
      }
    );

    if (peripheral) {
      return this.sendRawToPrinter(peripheral, rawData);
    }

    return {
      success: false,
      message: `Aucune imprimante matérielle configurée pour le poste ${destination}.`,
    };
  }

  /**
   * Print a Hardware Diagnostics Test Ticket
   */
  async printTestTicket(
    peripheral: Peripheral,
    settings: RestaurantSettings
  ): Promise<{ success: boolean; message: string }> {
    const rawData = buildTestTicketEscPos(
      peripheral.name,
      peripheral.connectionType,
      peripheral.model,
      {
        paperWidth: peripheral.paperWidth || '80mm',
        cutPaper: peripheral.cutPaper ?? true,
        drawerKick: peripheral.openDrawerOnCash ?? false,
      }
    );

    return this.sendRawToPrinter(peripheral, rawData);
  }

  /**
   * Send Cash Drawer Kick Pulse (RJ11/RJ12 24V)
   */
  async openCashDrawer(
    peripheral?: Peripheral
  ): Promise<{ success: boolean; message: string }> {
    const builder = new EscPosBuilder(48);
    builder.drawerKick();
    const rawData = builder.toBytes();

    if (peripheral) {
      return this.sendRawToPrinter(peripheral, rawData);
    }

    return {
      success: false,
      message: 'Aucune imprimante configurée pour commander l\'ouverture du tiroir-caisse (RJ11/RJ12).',
    };
  }
}

export const printerService = new PrinterService();
