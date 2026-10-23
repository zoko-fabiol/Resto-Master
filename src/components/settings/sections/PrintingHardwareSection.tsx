import React, { useState } from 'react';
import { useRestaurant } from '../../../context/RestaurantContext';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../ui/ConfirmDialog';
import { Peripheral } from '../../../types/configuration';
import { printerService } from '../../../services/printing/printerService';
import {
  Printer,
  Plus,
  Usb,
  Wifi,
  Bluetooth,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Play,
  Trash2,
  Edit2,
  Sliders,
  DollarSign,
  Volume2,
  Scissors,
  RefreshCw,
  X,
  Receipt,
  ChefHat,
  Coins,
  Bell,
} from 'lucide-react';
import { ModernRuleToggle } from './ModernRuleToggle';

export const PrintingHardwareSection: React.FC = () => {
  const {
    peripherals,
    addPeripheral,
    updatePeripheral,
    deletePeripheral,
    printerSettings,
    updatePrinterSettings,
    settings,
    selectedOutletId,
    isFeatureEnabled,
  } = useRestaurant();
  const { showToast, playAudioChime } = useToast();
  const confirm = useConfirm();

  const isPrintersModuleActive = isFeatureEnabled('printers_hardware');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPeripheral, setEditingPeripheral] = useState<Peripheral | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formModel, setFormModel] = useState('Epson TM-T20III');
  const [formType, setFormType] = useState<Peripheral['type']>('imprimante_ticket');
  const [formRole, setFormRole] = useState<'caisse' | 'cuisine' | 'bar' | 'polyvalente'>('caisse');
  const [formConnectionType, setFormConnectionType] = useState<'usb' | 'reseau_ip' | 'bluetooth' | 'systeme'>('reseau_ip');
  const [formAddress, setFormAddress] = useState('192.168.1.200');
  const [formPort, setFormPort] = useState<number>(9100);
  const [formPaperWidth, setFormPaperWidth] = useState<'58mm' | '80mm'>('80mm');
  const [formCutPaper, setFormCutPaper] = useState(true);
  const [formOpenDrawer, setFormOpenDrawer] = useState(true);
  const [formSoundBuzzer, setFormSoundBuzzer] = useState(false);
  const [formIsDefault, setFormIsDefault] = useState(false);

  // Browser API availability
  const isWebUsb = printerService.isWebUsbSupported();
  const isWebBluetooth = printerService.isWebBluetoothSupported();

  const handleOpenAddModal = (connectionType: 'usb' | 'reseau_ip' | 'bluetooth' | 'systeme' = 'reseau_ip') => {
    setEditingPeripheral(null);
    setFormName(
      connectionType === 'usb'
        ? 'Imprimante USB Caisse'
        : connectionType === 'reseau_ip'
        ? 'Imprimante Réseau Cuisine'
        : connectionType === 'bluetooth'
        ? 'Imprimante Bluetooth Mobile'
        : 'Imprimante Système Windows'
    );
    setFormModel('Epson TM-T20III (80mm)');
    setFormType(connectionType === 'usb' ? 'imprimante_ticket' : 'imprimante_cuisine');
    setFormRole(connectionType === 'usb' ? 'caisse' : 'cuisine');
    setFormConnectionType(connectionType);
    setFormAddress(connectionType === 'reseau_ip' ? '192.168.1.205' : connectionType === 'usb' ? 'USB001' : 'BT-PRINT');
    setFormPort(9100);
    setFormPaperWidth('80mm');
    setFormCutPaper(true);
    setFormOpenDrawer(connectionType === 'usb');
    setFormSoundBuzzer(connectionType === 'reseau_ip');
    setFormIsDefault(false);
    setModalOpen(true);
  };

  const handleEditPeripheral = (p: Peripheral) => {
    setEditingPeripheral(p);
    setFormName(p.name);
    setFormModel(p.model || 'Epson TM-T20III (80mm)');
    setFormType(p.type);
    setFormRole(p.role || (p.type === 'imprimante_cuisine' ? 'cuisine' : p.type === 'imprimante_bar' ? 'bar' : 'caisse'));
    setFormConnectionType(p.connectionType);
    setFormAddress(p.address);
    setFormPort(p.port || 9100);
    setFormPaperWidth(p.paperWidth || '80mm');
    setFormCutPaper(p.cutPaper ?? true);
    setFormOpenDrawer(p.openDrawerOnCash ?? false);
    setFormSoundBuzzer(p.soundBuzzer ?? false);
    setFormIsDefault(p.isDefault ?? false);
    setModalOpen(true);
  };

  const handleSavePeripheral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast({ type: 'warning', title: 'Nom manquant', message: 'Veuillez saisir un nom pour l\'imprimante.' });
      return;
    }

    if (editingPeripheral) {
      await updatePeripheral(editingPeripheral.id, {
        name: formName,
        model: formModel,
        type: formType,
        role: formRole,
        connectionType: formConnectionType,
        address: formAddress,
        port: formPort,
        paperWidth: formPaperWidth,
        charactersPerLine: formPaperWidth === '58mm' ? 32 : 48,
        cutPaper: formCutPaper,
        openDrawerOnCash: formOpenDrawer,
        soundBuzzer: formSoundBuzzer,
        isDefault: formIsDefault,
      });

      showToast({
        type: 'success',
        title: 'Imprimante modifiée',
        message: `Les paramètres de [${formName}] ont été enregistrés.`,
      });
    } else {
      await addPeripheral({
        name: formName,
        model: formModel,
        type: formType,
        role: formRole,
        connectionType: formConnectionType,
        address: formAddress,
        port: formPort,
        paperWidth: formPaperWidth,
        charactersPerLine: formPaperWidth === '58mm' ? 32 : 48,
        cutPaper: formCutPaper,
        openDrawerOnCash: formOpenDrawer,
        soundBuzzer: formSoundBuzzer,
        isDefault: formIsDefault,
        outletId: selectedOutletId,
        active: true,
      });

      showToast({
        type: 'success',
        title: 'Imprimante connectée',
        message: `L'imprimante [${formName}] a été ajoutée avec succès.`,
      });
    }

    setModalOpen(false);
  };

  const handleDeletePeripheral = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Suppression d\'imprimante',
      message: `Confirmez-vous la suppression de l'imprimante [${name}] ? Elle ne recevra plus d'ordres d'impression.`,
      confirmText: 'Supprimer',
      variant: 'danger',
    });
    if (ok) {
      await deletePeripheral(id);
      showToast({
        type: 'info',
        title: 'Imprimante supprimée',
        message: `[${name}] a été retirée de la configuration.`,
      });
    }
  };

  // Direct WebUSB Hardware Detection
  const handleDetectWebUsb = async () => {
    try {
      const res = await printerService.requestUsbPrinter();
      await addPeripheral({
        name: res.name,
        model: `Périphérique USB (VID: 0x${res.vendorId?.toString(16)})`,
        type: 'imprimante_ticket',
        role: 'caisse',
        connectionType: 'usb',
        address: res.address,
        outletId: selectedOutletId,
        active: true,
        paperWidth: '80mm',
        charactersPerLine: 48,
        cutPaper: true,
        openDrawerOnCash: true,
        isDefault: true,
      });

      playAudioChime('success');
      showToast({
        type: 'success',
        title: 'Imprimante USB détectée !',
        message: `${res.name} a été appairée via WebUSB sans pilote.`,
      });
    } catch (err: any) {
      showToast({
        type: 'warning',
        title: 'Détection USB',
        message: err.message || 'Impossible de détecter l\'imprimante USB.',
      });
    }
  };

  // Direct Web Bluetooth Detection
  const handleDetectBluetooth = async () => {
    try {
      const res = await printerService.requestBluetoothPrinter();
      await addPeripheral({
        name: res.name,
        model: 'Imprimante Mobile Bluetooth ESC/POS',
        type: 'imprimante_ticket',
        role: 'polyvalente',
        connectionType: 'bluetooth',
        address: res.address,
        outletId: selectedOutletId,
        active: true,
        paperWidth: '58mm',
        charactersPerLine: 32,
        cutPaper: false,
        openDrawerOnCash: false,
      });

      playAudioChime('success');
      showToast({
        type: 'success',
        title: 'Imprimante Bluetooth détectée !',
        message: `${res.name} a été associée avec succès.`,
      });
    } catch (err: any) {
      showToast({
        type: 'warning',
        title: 'Détection Bluetooth',
        message: err.message || 'Impossible d\'associer l\'imprimante Bluetooth.',
      });
    }
  };

  // Run Test Print
  const handleTestPrint = async (p: Peripheral) => {
    setTestingId(p.id);
    playAudioChime();

    try {
      const res = await printerService.printTestTicket(p, settings);
      if (res.success) {
        playAudioChime('kitchen');
        showToast({
          type: 'success',
          title: 'Ticket Test Imprimé !',
          message: res.message,
        });
      } else {
        showToast({
          type: 'warning',
          title: 'Périphérique non joignable',
          message: res.message,
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Échec d\'impression test',
        message: err.message || 'Erreur lors de l\'envoi du flux ESC/POS.',
      });
    } finally {
      setTestingId(null);
    }
  };

  // Run Drawer Kick Test
  const handleTestDrawer = async (p: Peripheral) => {
    playAudioChime();
    try {
      const res = await printerService.openCashDrawer(p);
      if (res.success) {
        showToast({
          type: 'info',
          title: 'Impulsion Tiroir-Caisse',
          message: res.message,
        });
      } else {
        showToast({
          type: 'warning',
          title: 'Échec impulsion tiroir',
          message: res.message,
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erreur tiroir-caisse',
        message: err.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Browser Capabilities */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-amber-500" />
              <span>Gestionnaire d'Impression & Périphériques POS</span>
            </h3>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              ESC/POS Certifié
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gérez la connectivité multi-protocoles (USB Direct, Réseau IP, Bluetooth et Système) pour tickets de caisse, bons cuisine et tiroir-caisse.
          </p>
        </div>

        {/* Browser Capabilities Badges & Master Module Switch */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* État du module impression */}
          <div
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
              isPrintersModuleActive
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="Statut d'activation de la gestion d'impression"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isPrintersModuleActive ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            ></span>
            <span>{isPrintersModuleActive ? 'Service d\'impression actif' : 'Impression désactivée'}</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              isWebUsb
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
            title={isWebUsb ? 'WebUSB activé' : 'WebUSB nécessite Chrome, Edge ou Opera'}
          >
            <Usb className="w-3.5 h-3.5" />
            <span>WebUSB : {isWebUsb ? 'Disponible' : 'Non supporté'}</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              isWebBluetooth
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 text-slate-600 border-slate-300'
            }`}
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>Bluetooth : {isWebBluetooth ? 'Disponible' : 'Inactif'}</span>
          </div>
        </div>
      </div>

      {/* Module Suspended Banner */}
      {!isPrintersModuleActive && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="font-bold">Module d'Impression Matérielle actuellement Suspendu</div>
              <div className="text-amber-800 text-[11px] mt-0.5">
                Les envois automatiques aux imprimantes de caisse et cuisine sont bloqués. Vous pouvez réactiver le module ci-contre ou dans Configuration &gt; Fonctionnalités.
              </div>
            </div>
          </div>
          <span className="px-3 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs shrink-0">
            Géré par RestoMaster
          </span>
        </div>
      )}

      {/* 2. Quick Pairing Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={handleDetectWebUsb}
          className="p-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl flex flex-col justify-between gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <Usb className="w-5 h-5 text-amber-400" />
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">Plug & Play</span>
          </div>
          <div className="text-left">
            <div className="font-bold text-xs">Détecter Imprimante USB</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Epson, Star, Xprinter via WebUSB</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleOpenAddModal('reseau_ip')}
          className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <Wifi className="w-5 h-5 text-indigo-600" />
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">Port 9100</span>
          </div>
          <div className="text-left">
            <div className="font-bold text-xs text-slate-900">Ajouter Imprimante Réseau IP</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Ethernet / Wi-Fi Cuisine & Bar</div>
          </div>
        </button>

        <button
          type="button"
          onClick={handleDetectBluetooth}
          className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <Bluetooth className="w-5 h-5 text-sky-600" />
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">BLE Portable</span>
          </div>
          <div className="text-left">
            <div className="font-bold text-xs text-slate-900">Détecter Imprimante Bluetooth</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Imprimantes de ceinture serveurs</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleOpenAddModal('systeme')}
          className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <Monitor className="w-5 h-5 text-emerald-600" />
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">Spooler</span>
          </div>
          <div className="text-left">
            <div className="font-bold text-xs text-slate-900">Imprimante Système Windows</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Dialogue d'impression navigateur</div>
          </div>
        </button>
      </div>

      {/* 3. Configured Printers List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Imprimantes & Tiroirs Configurés ({peripherals.length})</h4>
            <p className="text-xs text-slate-500">Périphériques matériels affectés à cet établissement</p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddModal('reseau_ip')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Nouvelle Imprimante</span>
          </button>
        </div>

        {peripherals.length === 0 ? (
          <div className="text-center py-10 text-slate-400 space-y-2">
            <Printer className="w-10 h-10 mx-auto text-slate-300" />
            <div className="text-xs font-bold text-slate-700">Aucune imprimante configurée</div>
            <p className="text-[11px] text-slate-500">
              Cliquez sur l'un des boutons ci-dessus pour détecter ou ajouter votre imprimante thermique.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {peripherals.map((p) => {
              const isTesting = testingId === p.id;
              const roleLabels: Record<string, { label: string; color: string }> = {
                caisse: { label: 'Caisse Principale (80mm)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
                cuisine: { label: 'Cuisine & Grillades', color: 'bg-amber-100 text-amber-800 border-amber-300' },
                bar: { label: 'Bar & Lounge', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
                polyvalente: { label: 'Polyvalente', color: 'bg-slate-100 text-slate-800 border-slate-300' },
              };

              const roleInfo = roleLabels[p.role || 'caisse'] || roleLabels.caisse;

              return (
                <div
                  key={p.id}
                  className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 space-y-3 hover:border-slate-300 transition-all shadow-2xs"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{p.name}</span>
                        {p.isDefault && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-950">
                            PAR DÉFAUT
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {p.model || 'Imprimante ESC/POS'}
                      </div>
                    </div>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                  </div>

                  {/* Connection & Attributes Details */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      {p.connectionType === 'usb' && <Usb className="w-3.5 h-3.5 text-amber-600" />}
                      {p.connectionType === 'reseau_ip' && <Wifi className="w-3.5 h-3.5 text-indigo-600" />}
                      {p.connectionType === 'bluetooth' && <Bluetooth className="w-3.5 h-3.5 text-sky-600" />}
                      {p.connectionType === 'systeme' && <Monitor className="w-3.5 h-3.5 text-emerald-600" />}
                      <span className="font-bold capitalize">{p.connectionType.replace('_', ' ')}</span>
                    </div>

                    <div className="font-mono text-slate-800 truncate" title={p.address}>
                      {p.address}:{p.port || 9100}
                    </div>

                    <div>
                      Format : <strong>{p.paperWidth || '80mm'}</strong>
                    </div>

                    <div className="flex items-center gap-2.5 text-[10px]">
                      {p.cutPaper && (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <Scissors className="w-3 h-3" />
                          <span>Coupe</span>
                        </span>
                      )}
                      {p.openDrawerOnCash && (
                        <span className="text-indigo-700 font-bold flex items-center gap-1">
                          <Coins className="w-3 h-3" />
                          <span>Tiroir</span>
                        </span>
                      )}
                      {p.soundBuzzer && (
                        <span className="text-amber-700 font-bold flex items-center gap-1">
                          <Bell className="w-3 h-3" />
                          <span>Buzzer</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTestPrint(p)}
                        disabled={isTesting}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-3 h-3 text-amber-400" />
                        <span>{isTesting ? 'Impression...' : 'Tester'}</span>
                      </button>

                      {p.openDrawerOnCash && (
                        <button
                          type="button"
                          onClick={() => handleTestDrawer(p)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Tester l'impulsion électrique du tiroir-caisse"
                        >
                          <DollarSign className="w-3 h-3 text-emerald-600" />
                          <span>Tiroir</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditPeripheral(p)}
                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"
                        title="Modifier les paramètres"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePeripheral(p.id, p.name)}
                        className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-600 transition-colors cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Printing Automation Options (Configuration) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-500" />
            <span>Automatismes & Déclencheurs d'Impression (POS & Encaissement)</span>
          </h4>
          <p className="text-xs text-slate-500">
            Activez ou désactivez les comportements d'impression automatique lors des ventes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <ModernRuleToggle
            id="print_ticket_auto"
            label="Impression automatique ticket"
            description="Le ticket thermique 80mm sort dès validation de l'addition"
            icon={Receipt}
            checked={printerSettings.autoPrintReceiptOnPayment}
            onChange={() =>
              updatePrinterSettings({
                autoPrintReceiptOnPayment: !printerSettings.autoPrintReceiptOnPayment,
              })
            }
          />

          <ModernRuleToggle
            id="print_kitchen_auto"
            label="Envoi automatique cuisine / bar"
            description="Impression directe aux passes et au bar lors de la commande"
            icon={ChefHat}
            checked={printerSettings.autoPrintKitchenOnOrder}
            onChange={() =>
              updatePrinterSettings({
                autoPrintKitchenOnOrder: !printerSettings.autoPrintKitchenOnOrder,
              })
            }
          />

          <ModernRuleToggle
            id="print_drawer_auto"
            label="Ouverture tiroir-caisse espèces"
            description="Impulsion RJ11/RJ12 24V lors d'un règlement au comptant"
            icon={Coins}
            checked={printerSettings.autoOpenCashDrawerOnCash}
            onChange={() =>
              updatePrinterSettings({
                autoOpenCashDrawerOnCash: !printerSettings.autoOpenCashDrawerOnCash,
              })
            }
          />
        </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="font-bold text-slate-900">Nombre d'exemplaires du ticket client</div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="copies"
                  checked={printerSettings.receiptCopiesCount === 1}
                  onChange={() => updatePrinterSettings({ receiptCopiesCount: 1 })}
                  className="text-amber-600"
                />
                <span className="font-semibold text-slate-800">1 Ticket Original</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="copies"
                  checked={printerSettings.receiptCopiesCount === 2}
                  onChange={() => updatePrinterSettings({ receiptCopiesCount: 2 })}
                  className="text-amber-600"
                />
                <span className="font-semibold text-slate-800">2 Tickets (Client + Duplicata Caisse)</span>
              </label>
            </div>
          </div>
        </div>

      {/* 5. Add / Edit Printer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {editingPeripheral ? 'Modifier l\'Imprimante' : 'Connecter une Nouvelle Imprimante'}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePeripheral} className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nom du Périphérique *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Imprimante Caisse Principale"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Modèle / Marque</label>
                  <input
                    type="text"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    placeholder="Ex: Epson TM-T20III (80mm)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Type de Connexion</label>
                  <select
                    value={formConnectionType}
                    onChange={(e) => setFormConnectionType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="usb">USB Direct (WebUSB)</option>
                    <option value="reseau_ip">Réseau IP (Ethernet / Wi-Fi)</option>
                    <option value="bluetooth">Bluetooth (BLE / Portable)</option>
                    <option value="systeme">Système Windows (Spooler)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rôle Métier Affecté</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="caisse">Caisse Principale (Tickets clients & Factures)</option>
                    <option value="cuisine">Cuisine (Bons de production chauds/grillades)</option>
                    <option value="bar">Bar & Lounge (Bons boissons)</option>
                    <option value="polyvalente">Polyvalente (Tous types de bons)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Adresse / Port USB / IP</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="192.168.1.200 ou USB001"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                {formConnectionType === 'reseau_ip' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Port TCP RAW (Défaut: 9100)</label>
                    <input
                      type="number"
                      value={formPort}
                      onChange={(e) => setFormPort(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Largeur du Rouleau Papier</label>
                  <select
                    value={formPaperWidth}
                    onChange={(e) => setFormPaperWidth(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="80mm">80mm (Standard Caisse / Cuisine - 48 colonnes)</option>
                    <option value="58mm">58mm (Format Compact / Portable - 32 colonnes)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Imprimante par défaut</label>
                  <div
                    onClick={() => setFormIsDefault(!formIsDefault)}
                    className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-amber-300 transition-colors"
                  >
                    <span className="font-semibold text-slate-800 text-xs">Définir par défaut</span>
                    <button
                      type="button"
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        formIsDefault ? 'bg-amber-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          formIsDefault ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Hardware Toggles */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">
                  Options Matérielles ESC/POS
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div
                    onClick={() => setFormCutPaper(!formCutPaper)}
                    className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-amber-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Scissors className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-medium text-slate-800">Coupe auto</span>
                    </div>
                    <button
                      type="button"
                      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out ${
                        formCutPaper ? 'bg-amber-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                          formCutPaper ? 'translate-x-3' : 'translate-x-0.5'
                        } mt-0.5`}
                      />
                    </button>
                  </div>

                  <div
                    onClick={() => setFormOpenDrawer(!formOpenDrawer)}
                    className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-amber-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Coins className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-medium text-slate-800">Tiroir RJ11</span>
                    </div>
                    <button
                      type="button"
                      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out ${
                        formOpenDrawer ? 'bg-amber-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                          formOpenDrawer ? 'translate-x-3' : 'translate-x-0.5'
                        } mt-0.5`}
                      />
                    </button>
                  </div>

                  <div
                    onClick={() => setFormSoundBuzzer(!formSoundBuzzer)}
                    className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-amber-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-medium text-slate-800">Buzzer bip</span>
                    </div>
                    <button
                      type="button"
                      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out ${
                        formSoundBuzzer ? 'bg-amber-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                          formSoundBuzzer ? 'translate-x-3' : 'translate-x-0.5'
                        } mt-0.5`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-slate-100 flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-xs cursor-pointer"
                >
                  {editingPeripheral ? 'Enregistrer les Modifications' : 'Ajouter l\'Imprimante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
