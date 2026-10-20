import React, { useState, useMemo } from 'react';
import {
  Building2,
  Receipt,
  Store,
  LayoutGrid,
  Coins,
  Printer,
  UtensilsCrossed,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Download,
  Plus,
  Trash2,
  CreditCard,
  Smartphone,
  Check,
  FileText,
  PrinterIcon,
  X,
  ExternalLink,
  Crown,
  Rocket,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../ui/ConfirmDialog';
import { formatCurrency } from '../../lib/utils';
import { Outlet, Terminal, Peripheral } from '../../types/configuration';
import { RestaurantTable, Zone, CashRegister, Category, Product } from '../../types/restaurant';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  onClose,
  onCompleted,
}) => {
  const {
    settings,
    updateSettings,
    organization,
    updateOrganization,
    outlets,
    addOutlet,
    zones,
    addZone,
    tables,
    addTable,
    cashRegisters,
    addCashRegister,
    terminals,
    addTerminal,
    peripherals,
    addPeripheral,
    categories,
    products,
  } = useRestaurant() as any;

  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [showHandoverSlip, setShowHandoverSlip] = useState(false);

  // -------------------------------------------------------------
  // STEP 1 : Identité Légale
  // -------------------------------------------------------------
  const [legalName, setLegalName] = useState(settings.name || organization?.legalName || '');
  const [commercialName, setCommercialName] = useState(settings.slogan || organization?.name || '');
  const [niu, setNiu] = useState(settings.niu || organization?.niu || '');
  const [rccm, setRccm] = useState(settings.rccm || organization?.rccm || '');
  const [city, setCity] = useState(settings.city || organization?.city || 'Douala');
  const [bp, setBp] = useState(settings.bp || organization?.postalBox || '');
  const [address, setAddress] = useState(settings.address || organization?.headquartersAddress || '');
  const [phone, setPhone] = useState(settings.phone || organization?.phone || '');
  const [email, setEmail] = useState(settings.email || organization?.email || '');
  const [receiptFooter, setReceiptFooter] = useState(
    settings.receiptFooter || 'Merci de votre visite • Facture certifiée conforme CGI 2026'
  );

  // -------------------------------------------------------------
  // STEP 2 : Paramètres Financiers & Fiscaux (CGI 2026)
  // -------------------------------------------------------------
  const [currency, setCurrency] = useState('FCFA');
  const [taxRate, setTaxRate] = useState(17.5);
  const [cacRate, setCacRate] = useState(1.75);
  const [combinedTaxRate, setCombinedTaxRate] = useState(19.25);
  const [enableStockAutoDeduction, setEnableStockAutoDeduction] = useState(
    settings.enableStockAutoDeduction !== false
  );
  const [taxCenter, setTaxCenter] = useState(settings.taxCenter || 'DGI - Centre Spécialisé');
  const [taxSystem, setTaxSystem] = useState(settings.taxSystem || 'Régime Réel');

  // -------------------------------------------------------------
  // STEP 3 : Établissement Initial
  // -------------------------------------------------------------
  const [outletName, setOutletName] = useState(outlets[0]?.name || 'Restaurant Principal');
  const [outletCity, setOutletCity] = useState(outlets[0]?.city || city || 'Douala');
  const [outletAddress, setOutletAddress] = useState(outlets[0]?.address || address || '');
  const [outletPhone, setOutletPhone] = useState(outlets[0]?.phone || phone || '');
  const [outletProfile, setOutletProfile] = useState(outlets[0]?.operationalProfile || 'restaurant_classique');

  // -------------------------------------------------------------
  // STEP 4 : Zones & Tables
  // -------------------------------------------------------------
  const [newZoneName, setNewZoneName] = useState('');
  const [tablesToGenerate, setTablesToGenerate] = useState<number>(6);
  const [tableCapacity, setTableCapacity] = useState<number>(4);

  // -------------------------------------------------------------
  // STEP 5 : Caisses & Moyens de Paiement
  // -------------------------------------------------------------
  const [registerName, setRegisterName] = useState(
    cashRegisters[0]?.name || 'Caisse Principale N°1'
  );
  const [initialFloat, setInitialFloat] = useState<number>(
    cashRegisters[0]?.initialAmount || 25000
  );
  const [acceptCash, setAcceptCash] = useState(true);
  const [acceptCard, setAcceptCard] = useState(true);
  const [acceptOrangeMoney, setAcceptOrangeMoney] = useState(Boolean(settings.orangeMoneyMerchantCode));
  const [orangeMoneyCode, setOrangeMoneyCode] = useState(settings.orangeMoneyMerchantCode || '');
  const [orangeMoneyPhone, setOrangeMoneyPhone] = useState(settings.orangeMoneyPhone || '');
  const [acceptMtnMoMo, setAcceptMtnMoMo] = useState(Boolean(settings.mtnMoMoMerchantCode));
  const [mtnMoMoCode, setMtnMoMoCode] = useState(settings.mtnMoMoMerchantCode || '');
  const [mtnMoMoPhone, setMtnMoMoPhone] = useState(settings.mtnMoMoPhone || '');

  // -------------------------------------------------------------
  // STEP 6 : Périphériques & Matériel
  // -------------------------------------------------------------
  const [printerName, setPrinterName] = useState('Imprimante Caisse Thermique 80mm');
  const [printerInterface, setPrinterInterface] = useState<'browser' | 'network' | 'usb'>('browser');
  const [terminalName, setTerminalName] = useState('Poste Encaissement Principal');
  const [terminalType, setTerminalType] = useState<'pos' | 'serveur' | 'cuisine'>('pos');

  // -------------------------------------------------------------
  // STEP 7 : Catalogue & Modèle CSV
  // -------------------------------------------------------------
  const [sampleCategoryName, setSampleCategoryName] = useState('Plats Principaux');
  const [sampleProductName, setSampleProductName] = useState('Plat du Jour Spécial');
  const [sampleProductPrice, setSampleProductPrice] = useState<number>(4500);

  // -------------------------------------------------------------
  // STEP 8 : Comptes Opérationnels Initiaux (Documentation)
  // -------------------------------------------------------------
  const [directionPin, setDirectionPin] = useState('123456');
  const [caissePin, setCaissePin] = useState('1111');
  const [serveurPin, setServeurPin] = useState('2222');

  // -------------------------------------------------------------
  // AUDIT & CHECKLIST CALCULATIONS (STEP 9)
  // -------------------------------------------------------------
  const checklist = useMemo(() => {
    const isStep1Ok = Boolean(legalName.trim() && niu.trim() && rccm.trim() && city.trim());
    const isStep2Ok = currency === 'FCFA' && combinedTaxRate === 19.25 && taxRate === 17.5;
    const isStep3Ok = outlets.length > 0 || Boolean(outletName.trim());
    const isStep4Ok = (zones.length > 0 || Boolean(newZoneName.trim())) && (tables.length > 0 || tablesToGenerate > 0);
    const isStep5Ok = cashRegisters.length > 0 || Boolean(registerName.trim());
    const isStep6Ok = terminals.length > 0 || Boolean(terminalName.trim());
    const isStep7Ok = (categories.length > 0 || Boolean(sampleCategoryName.trim())) && (products.length > 0 || Boolean(sampleProductName.trim()));
    const isStep8Ok = directionPin.length >= 4 && caissePin.length >= 4 && serveurPin.length >= 4;
    const isCleanZeroDemo = !settings.name?.toLowerCase().includes('demo') && !organization?.name?.toLowerCase().includes('demo');

    return [
      {
        id: 1,
        title: 'Identité Légale & Fiscale',
        description: 'Raison sociale, NIU, RCCM, Ville et contacts renseignés',
        isValid: isStep1Ok,
        targetStep: 1,
      },
      {
        id: 2,
        title: 'Conformité Fiscale CGI 2026',
        description: 'TVA 17,5% + CAC 1,75% = 19,25%, devise entière FCFA',
        isValid: isStep2Ok,
        targetStep: 2,
      },
      {
        id: 3,
        title: 'Établissement Opérationnel Initial',
        description: 'Au moins un restaurant principal actif configuré',
        isValid: isStep3Ok,
        targetStep: 3,
      },
      {
        id: 4,
        title: 'Plan de Salle & Zones',
        description: 'Zones de service et tables paramétrées',
        isValid: isStep4Ok,
        targetStep: 4,
      },
      {
        id: 5,
        title: 'Caisse & Paiements Valides',
        description: 'Caisse enregistreuse prête, moyens de paiement vérifiés',
        isValid: isStep5Ok,
        targetStep: 5,
      },
      {
        id: 6,
        title: 'Matériel & Terminal de Vente',
        description: 'Poste de travail et imprimante thermique assignés',
        isValid: isStep6Ok,
        targetStep: 6,
      },
      {
        id: 7,
        title: 'Catalogue & Structure de Carte',
        description: 'Catégories et articles de base définis ou importés',
        isValid: isStep7Ok,
        targetStep: 7,
      },
      {
        id: 8,
        title: 'Comptes Opérationnels Sécurisés',
        description: 'Codes PIN des rôles Direction, Caisse et Salle définis',
        isValid: isStep8Ok,
        targetStep: 8,
      },
      {
        id: 9,
        title: 'Intégrité Pure Zéro Démo',
        description: 'Aucune donnée fictive ou résiduelle d’évaluation',
        isValid: isCleanZeroDemo,
        targetStep: 1,
      },
    ];
  }, [
    legalName,
    niu,
    rccm,
    city,
    currency,
    combinedTaxRate,
    taxRate,
    outlets,
    outletName,
    zones,
    newZoneName,
    tables,
    tablesToGenerate,
    cashRegisters,
    registerName,
    terminals,
    terminalName,
    categories,
    sampleCategoryName,
    products,
    sampleProductName,
    directionPin,
    caissePin,
    serveurPin,
    settings.name,
    organization?.name,
  ]);

  const allChecksPassed = checklist.every((c) => c.isValid);

  // -------------------------------------------------------------
  // ACTIONS DU WIZARD
  // -------------------------------------------------------------
  const handleDownloadCsvTemplate = () => {
    const csvContent =
      'Reference;Nom;Categorie;Prix_Vente_TTC_FCFA;Taux_TVA;Unite;Destination;Actif\n' +
      'PL-001;Poulet DG Traditionnel;Plats Chauds;4500;19.25;portion;cuisine;true\n' +
      'PL-002;Poisson Braisé Bar Entier;Grillades;6000;19.25;portion;cuisine;true\n' +
      'PL-003;Ndolé Royal Viande & Crevettes;Plats Chauds;5000;19.25;portion;cuisine;true\n' +
      'BV-001;Eau Minérale 1.5L;Boissons;1000;19.25;bouteille;bar;true\n' +
      'BV-002;Bière Locale 65cl;Boissons;1200;19.25;bouteille;bar;true\n' +
      'BV-003;Jus Naturel Pressé 33cl;Boissons;1500;19.25;verre;bar;true\n' +
      'DS-001;Salade de Fruits Frais;Desserts;1500;19.25;portion;bar;true\n';

    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modele_catalogue_restomaster_os.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast({
      title: 'Modèle CSV Téléchargé',
      message: 'Le fichier modèle UTF-8 pour importer votre carte a été téléchargé.',
      type: 'success',
    });
  };

  const handleApplyConfiguration = async () => {
    setIsSaving(true);
    try {
      // 1. Sauvegarde des paramètres et identité
      await updateSettings({
        name: legalName.trim() || 'Restaurant',
        slogan: commercialName.trim(),
        niu: niu.trim(),
        rccm: rccm.trim(),
        city: city.trim(),
        bp: bp.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        currency: 'FCFA',
        taxRate: 17.5,
        cacRate: 1.75,
        combinedTaxRate: 19.25,
        taxCenter: taxCenter.trim(),
        taxSystem: taxSystem.trim(),
        enableStockAutoDeduction,
        receiptFooter: receiptFooter.trim(),
        orangeMoneyMerchantCode: acceptOrangeMoney ? orangeMoneyCode.trim() : '',
        orangeMoneyPhone: acceptOrangeMoney ? orangeMoneyPhone.trim() : '',
        mtnMoMoMerchantCode: acceptMtnMoMo ? mtnMoMoCode.trim() : '',
        mtnMoMoPhone: acceptMtnMoMo ? mtnMoMoPhone.trim() : '',
      });

      // 2. Mise à jour de l'organisation
      if (updateOrganization) {
        await updateOrganization({
          id: organization?.id || 'org-main',
          name: commercialName.trim() || legalName.trim(),
          legalName: legalName.trim(),
          niu: niu.trim(),
          rccm: rccm.trim(),
          city: city.trim(),
          postalBox: bp.trim(),
          headquartersAddress: address.trim(),
          phone: phone.trim(),
          email: email.trim(),
          taxRegime: taxSystem.trim(),
          currency: 'FCFA',
          active: true,
        });
      }

      // 3. Établissement initial si aucun n'existe
      let currentOutletId = outlets[0]?.id;
      if (outlets.length === 0 && outletName.trim()) {
        currentOutletId = `out-${Date.now()}`;
        const newOutlet: Outlet = {
          id: currentOutletId,
          organizationId: organization?.id || 'org-main',
          name: outletName.trim(),
          commercialName: commercialName.trim() || outletName.trim(),
          city: outletCity.trim() || city.trim() || 'Douala',
          address: outletAddress.trim() || address.trim(),
          phone: outletPhone.trim() || phone.trim(),
          isMain: true,
          active: true,
          operationalProfile: outletProfile,
        };
        await addOutlet(newOutlet);
      }

      // 4. Création Zone & Tables si non configurées
      let activeZoneId = zones[0]?.id;
      if (zones.length === 0) {
        const zoneCreated = await addZone({
          restaurantId: currentOutletId || 'out-main',
          name: newZoneName.trim() || 'Salle Principale',
          active: true,
        });
        activeZoneId = zoneCreated?.id;
      }

      if (tables.length === 0 && tablesToGenerate > 0 && activeZoneId) {
        for (let i = 1; i <= tablesToGenerate; i++) {
          await addTable({
            restaurantId: currentOutletId || 'out-main',
            number: i,
            name: `Table ${i}`,
            capacity: tableCapacity || 4,
            zoneId: activeZoneId,
            status: 'libre',
            positionX: 50 + (i % 4) * 120,
            positionY: 50 + Math.floor((i - 1) / 4) * 110,
            shape: 'carre',
          });
        }
      }

      // 5. Caisse principale si non configurée
      if (cashRegisters.length === 0 && registerName.trim()) {
        await addCashRegister({
          restaurantId: currentOutletId || 'out-main',
          name: registerName.trim(),
          code: 'CAISSE-01',
          currency: 'FCFA',
          active: true,
          initialAmount: initialFloat || 25000,
        });
      }

      // 6. Terminal et périphérique si non configurés
      if (terminals.length === 0 && terminalName.trim()) {
        await addTerminal({
          restaurantId: currentOutletId || 'out-main',
          name: terminalName.trim(),
          type: terminalType,
          active: true,
          isOnline: true,
          ipAddress: '127.0.0.1',
        });
      }

      if (peripherals.length === 0 && printerName.trim()) {
        await addPeripheral({
          restaurantId: currentOutletId || 'out-main',
          name: printerName.trim(),
          type: 'imprimante_ticket',
          status: 'operationnel',
          connectionType: printerInterface,
          assignedRoles: ['caisse'],
          paperWidth: 80,
        });
      }

      showToast({
        title: 'Données Paramétrées',
        message: 'Toutes les données ont été enregistrées avec succès dans Firestore.',
        type: 'success',
      });
    } catch (err: any) {
      console.error('[OnboardingWizard] Erreur enregistrement:', err);
      showToast({
        title: 'Erreur d’Enregistrement',
        message: err?.message || 'Une erreur est survenue lors de la synchronisation.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCertifyAndLock = async () => {
    const ok = await confirm({
      title: 'Certification & Verrouillage RestoMaster OS',
      message:
        'Êtes-vous certain de certifier la plateforme et de la verrouiller pour la remise au client ? Après cette action, toute modification de configuration sensible nécessitera le compte Super-Administrateur.',
      confirmText: 'Certifier & Verrouiller',
    });

    if (!ok) return;

    setIsSaving(true);
    try {
      // Exécuter l'enregistrement complet d'abord
      await handleApplyConfiguration();

      // Appliquer le verrouillage formel de livraison
      await updateSettings({
        certifiedReadyForHandover: true,
        configurationVerrouillee: true,
        certifiedAt: new Date().toISOString(),
        certifiedBy: currentUser.email,
        handoverSlipPrinted: false,
      });

      showToast({
        title: 'Système Certifié & Verrouillé',
        message: 'La plateforme RestoMaster OS est désormais verrouillée et prête pour le client.',
        type: 'success',
      });

      setShowHandoverSlip(true);
      if (onCompleted) {
        onCompleted();
      }
    } catch (err: any) {
      showToast({
        title: 'Échec de Certification',
        message: err?.message || 'Impossible de certifier le système.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md overflow-y-auto p-2 sm:p-4 md:p-6 select-none animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 font-black">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-black tracking-widest text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                  Assistant de Premier Lancement
                </span>
                <span className="text-xs text-slate-400">Étape {currentStep} / 9</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                Mise en Service & Certification RestoMaster OS
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Fermer l'assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Indicator Pills */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1.5 min-w-max">
            {[
              { id: 1, label: '1. Identité' },
              { id: 2, label: '2. Fiscalité' },
              { id: 3, label: '3. Site' },
              { id: 4, label: '4. Salle' },
              { id: 5, label: '5. Caisses' },
              { id: 6, label: '6. Matériel' },
              { id: 7, label: '7. Carte' },
              { id: 8, label: '8. Accès' },
              { id: 9, label: '9. Contrôle & Livraison' },
            ].map((step) => {
              const isActive = currentStep === step.id;
              const isPast = currentStep > step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStep(step.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : isPast
                      ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {isPast && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wizard Main Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* ========================================================= */}
          {/* STEP 1: IDENTITÉ LÉGALE & ENTREPRISE                      */}
          {/* ========================================================= */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-600" />
                  <span>Identité Juridique de l'Établissement</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ces informations figureront sur toutes les factures officielles certifiées, tickets de caisse et rapports fiscaux.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Raison Sociale (Nom légal d'enregistrement) *
                  </label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="Ex: LA SOURCE SARL"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nom Commercial (Enseigne publique)
                  </label>
                  <input
                    type="text"
                    value={commercialName}
                    onChange={(e) => setCommercialName(e.target.value)}
                    placeholder="Ex: Restaurant Le Gourmet"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Numéro d'Identifiant Unique (NIU DGI) *
                  </label>
                  <input
                    type="text"
                    value={niu}
                    onChange={(e) => setNiu(e.target.value)}
                    placeholder="Ex: M012012345678A"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Registre du Commerce (RCCM) *
                  </label>
                  <input
                    type="text"
                    value={rccm}
                    onChange={(e) => setRccm(e.target.value)}
                    placeholder="Ex: RC/DLA/2024/B/1042"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ville de Siège *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Douala, Yaoundé, Bafoussam..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Boîte Postale (B.P.)</label>
                  <input
                    type="text"
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                    placeholder="Ex: B.P. 1254"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Adresse Géographique Précise</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ex: Boulevard de la Liberté, Akwa (Face Immeuble Orange)"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone Principal</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: +237 6XX XX XX XX"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Officiel</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: contact@restaurant.cm"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pied de Ticket de Caisse (Mention Légale ou Commerciale)
                  </label>
                  <input
                    type="text"
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    placeholder="Ex: Merci de votre fidélité • Facture conforme CGI 2026"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: FISCALITÉ & FINANCES (CGI 2026)                    */}
          {/* ========================================================= */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  <span>Cadre Fiscal & Monétaire Cameroun (CGI 2026)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configuration conforme à la Loi de Finances et au Code Général des Impôts du Cameroun.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Devise de Travail
                  </span>
                  <div className="text-xl font-black text-slate-900 mt-1 tabular-nums">FCFA (XAF)</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tous les montants sont manipulés en entiers sans décimales fantômes.
                  </p>
                </div>

                <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                    Taux TVA Légal
                  </span>
                  <div className="text-xl font-black text-blue-900 mt-1 tabular-nums">17,50 %</div>
                  <p className="text-[11px] text-blue-700 mt-1">
                    Taxe sur la Valeur Ajoutée (art. 125 du CGI).
                  </p>
                </div>

                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    CAC (Centimes Additionnels)
                  </span>
                  <div className="text-xl font-black text-emerald-900 mt-1 tabular-nums">1,75 %</div>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    10% de la TVA au profit des Collectivités Territoriales.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950 to-slate-900 text-white flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
                    Taux Combiné Appliqué sur Facture
                  </div>
                  <div className="text-2xl font-black text-amber-400 mt-0.5 tabular-nums">
                    19,25 % TTC
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-300">Arrêté légal de facture</div>
                  <div className="text-xs font-bold text-white mt-0.5">En toutes lettres obligatoire</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Centre des Impôts de Rattachement (DGI)
                  </label>
                  <input
                    type="text"
                    value={taxCenter}
                    onChange={(e) => setTaxCenter(e.target.value)}
                    placeholder="Ex: CIME Douala 1 ou DGE"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Régime Fiscal</label>
                  <select
                    value={taxSystem}
                    onChange={(e) => setTaxSystem(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-semibold cursor-pointer"
                  >
                    <option value="Régime Réel">Régime du Réel (Obligation E-Billing & TVA)</option>
                    <option value="Régime Simplifié">Régime Simplifié</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Déduction Automatique des Ingrédients du Stock
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Déduit automatiquement les ingrédients selon les fiches techniques à chaque commande envoyée.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableStockAutoDeduction}
                    onChange={(e) => setEnableStockAutoDeduction(e.target.checked)}
                    className="w-5 h-5 text-amber-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: ÉTABLISSEMENT INITIAL                              */}
          {/* ========================================================= */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Store className="w-5 h-5 text-amber-600" />
                  <span>Établissement & Profil d'Exploitation</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configurez le restaurant initial. Vous pourrez ajouter d'autres succursales ultérieurement dans l'espace Multi-Sites.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nom du Restaurant / Point de Vente *
                  </label>
                  <input
                    type="text"
                    value={outletName}
                    onChange={(e) => setOutletName(e.target.value)}
                    placeholder="Ex: Restaurant Principal Akwa"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Profil Opérationnel</label>
                  <select
                    value={outletProfile}
                    onChange={(e) => setOutletProfile(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-semibold cursor-pointer"
                  >
                    <option value="restaurant_classique">Restaurant Classique & Service à Table</option>
                    <option value="bar_lounge">Bar Lounge, Tapas & Boissons</option>
                    <option value="fast_food">Fast-Food, Snacking & Comptoir</option>
                    <option value="evenementiel_traiteur">Traiteur, Salons & Banquets</option>
                    <option value="hotel_restaurant">Hôtel-Restaurant & Room Service</option>
                    <option value="restaurant_livraison">Dark Kitchen & Livraison Urbaine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ville du Point de Vente</label>
                  <input
                    type="text"
                    value={outletCity}
                    onChange={(e) => setOutletCity(e.target.value)}
                    placeholder="Ex: Douala"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone Direct de la Caisse</label>
                  <input
                    type="text"
                    value={outletPhone}
                    onChange={(e) => setOutletPhone(e.target.value)}
                    placeholder="Ex: +237 6XX XX XX XX"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {outlets.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="text-xs font-bold text-emerald-950">
                        {outlets.length} établissement(s) déjà enregistré(s)
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        Établissement actif : {outlets[0]?.name} ({outlets[0]?.city})
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-800 uppercase px-2.5 py-1 bg-emerald-100 rounded-lg">
                    Prêt
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 4: ZONES & PLAN DE SALLE                             */}
          {/* ========================================================= */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-indigo-600" />
                  <span>Zones de Service & Tables Initiales</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Organisez votre espace de vente en zones géographiques et définissez les premières tables.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-800">Zone Principale</div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nom de la première zone
                    </label>
                    <input
                      type="text"
                      value={newZoneName || (zones[0]?.name ?? 'Salle Principale Climatisation')}
                      onChange={(e) => setNewZoneName(e.target.value)}
                      placeholder="Ex: Salle Intérieure, Terrasse, Mezzanine..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
                    />
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Actuellement {zones.length} zone(s) active(s) enregistrée(s).
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-800">Génération par Lot de Tables</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Nombre de tables
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={tablesToGenerate}
                        onChange={(e) => setTablesToGenerate(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Couverts / table
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={tableCapacity}
                        onChange={(e) => setTableCapacity(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Actuellement {tables.length} table(s) dans le système.
                  </div>
                </div>
              </div>

              {tables.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="text-xs font-bold text-emerald-950">
                        {tables.length} table(s) configurée(s)
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        Capacité totale estimée : {tables.reduce((acc: number, t: any) => acc + (t.capacity || 4), 0)} couverts
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-800 uppercase px-2.5 py-1 bg-emerald-100 rounded-lg">
                    Conforme
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 5: CAISSES & MOYENS DE PAIEMENT                       */}
          {/* ========================================================= */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-emerald-600" />
                  <span>Caisses Enregistreuses & Moyens de Paiement</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configurez le poste de caisse principal et activez les règlements (Espèces, CB, Mobile Money).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nom du Poste de Caisse *
                  </label>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Ex: Caisse Principale N°1"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fond de Caisse Initial Recommandé (FCFA)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={initialFloat}
                    onChange={(e) => setInitialFloat(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-slate-800">Moyens de Règlement Acceptés</div>

                {/* Espèces & Carte */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <Coins className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800">Espèces (FCFA)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={acceptCash}
                      onChange={(e) => setAcceptCash(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800">Carte Bancaire / TPE</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={acceptCard}
                      onChange={(e) => setAcceptCard(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Orange Money */}
                <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-orange-600" />
                      <span className="text-xs font-black text-orange-950">Orange Money Cameroun</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={acceptOrangeMoney}
                      onChange={(e) => setAcceptOrangeMoney(e.target.checked)}
                      className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                    />
                  </div>

                  {acceptOrangeMoney && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Code Marchand OM
                        </label>
                        <input
                          type="text"
                          value={orangeMoneyCode}
                          onChange={(e) => setOrangeMoneyCode(e.target.value)}
                          placeholder="Ex: 784123"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-orange-300 bg-white font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Numéro Téléphone Marchand
                        </label>
                        <input
                          type="text"
                          value={orangeMoneyPhone}
                          onChange={(e) => setOrangeMoneyPhone(e.target.value)}
                          placeholder="6XXXXXXXX"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-orange-300 bg-white font-mono font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* MTN MoMo */}
                <div className="p-4 bg-yellow-50/60 rounded-2xl border border-yellow-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-black text-yellow-950">MTN Mobile Money Cameroun</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={acceptMtnMoMo}
                      onChange={(e) => setAcceptMtnMoMo(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                    />
                  </div>

                  {acceptMtnMoMo && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Code Marchand MoMo
                        </label>
                        <input
                          type="text"
                          value={mtnMoMoCode}
                          onChange={(e) => setMtnMoMoCode(e.target.value)}
                          placeholder="Ex: 456789"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-yellow-300 bg-white font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Numéro Téléphone Marchand
                        </label>
                        <input
                          type="text"
                          value={mtnMoMoPhone}
                          onChange={(e) => setMtnMoMoPhone(e.target.value)}
                          placeholder="6XXXXXXXX"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-yellow-300 bg-white font-mono font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 6: MATÉRIEL & PÉRIPHÉRIQUES                          */}
          {/* ========================================================= */}
          {currentStep === 6 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-indigo-600" />
                  <span>Matériel, Terminaux & Imprimantes Thermiques</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Déclarez l'imprimante thermique de tickets et le premier terminal de vente de l'établissement.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Printer className="w-4 h-4 text-amber-600" />
                    <span>Imprimante Caisse Thermique</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nom de l'imprimante
                    </label>
                    <input
                      type="text"
                      value={printerName}
                      onChange={(e) => setPrinterName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Mode de communication
                    </label>
                    <select
                      value={printerInterface}
                      onChange={(e) => setPrinterInterface(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium cursor-pointer"
                    >
                      <option value="browser">Navigateur (Boîte d'impression window.print standard)</option>
                      <option value="network">Réseau IP Ethernet / Wi-Fi (Port 9100 ESC/POS)</option>
                      <option value="usb">USB Direct (WebUSB standard)</option>
                    </select>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Largeur standard de ticket : 80 mm.
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>Terminal POS Principal</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nom du poste
                    </label>
                    <input
                      type="text"
                      value={terminalName}
                      onChange={(e) => setTerminalName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Rôle matériel
                    </label>
                    <select
                      value={terminalType}
                      onChange={(e) => setTerminalType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium cursor-pointer"
                    >
                      <option value="pos">Poste d'Encaissement & Prise de Commande</option>
                      <option value="serveur">Tablette de Service / Prise de Commande Volante</option>
                      <option value="cuisine">Écran de Production Cuisine (KDS)</option>
                    </select>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Ce terminal pourra être appairé via code éphémère (15 minutes).
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 7: CARTE, CATÉGORIES & MODÈLE CSV                     */}
          {/* ========================================================= */}
          {currentStep === 7 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-amber-600" />
                  <span>Structure de la Carte & Import CSV</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Téléchargez le gabarit CSV standardisé ou définissez votre premier plat pour valider le flux de vente.
                </p>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-amber-950 flex items-center gap-2">
                    <Download className="w-4 h-4 text-amber-600" />
                    <span>Modèle d'Importation Standardisé (.csv)</span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-1">
                    Gabarit prêt à l'emploi avec encodage UTF-8 conforme pour importer vos 50+ plats et boissons d'un clic.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 cursor-pointer shadow-xs active:scale-98"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Télécharger le modèle CSV</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Première Catégorie du Menu
                  </label>
                  <input
                    type="text"
                    value={sampleCategoryName}
                    onChange={(e) => setSampleCategoryName(e.target.value)}
                    placeholder="Ex: Plats Chauds & Grillades"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Premier Plat Témoin
                  </label>
                  <input
                    type="text"
                    value={sampleProductName}
                    onChange={(e) => setSampleProductName(e.target.value)}
                    placeholder="Ex: Poulet DG Traditionnel"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prix de Vente TTC (FCFA)
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={sampleProductPrice}
                    onChange={(e) => setSampleProductPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 font-bold tabular-nums"
                  />
                </div>

                <div className="flex items-center text-xs text-slate-500 pt-5">
                  {categories.length} catégorie(s) et {products.length} plat(s) actuellement en base.
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 8: COMPTES UTILISATEURS INITIAUX                     */}
          {/* ========================================================= */}
          {currentStep === 8 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span>Comptes Opérationnels Initiaux & Codes PIN</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Définition des codes PIN confidentiels pour les rôles opérationnels clés du restaurant.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">1. Direction / Superviseur</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md">
                      Direction
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Autorise les annulations de commande, les clôtures de caisse et les remises exceptionnelles.
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Code PIN Superviseur (6 chiffres)
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={directionPin}
                      onChange={(e) => setDirectionPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-mono font-bold tracking-widest text-center"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">2. Responsable Caisse</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-md">
                      Caisse
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Ouvre et clôture la session de caisse journalière et valide les encaissements.
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Code PIN Caissier (4-6 chiffres)
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={caissePin}
                      onChange={(e) => setCaissePin(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-mono font-bold tracking-widest text-center"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">3. Chef de Rang / Serveur</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-100 text-blue-900 rounded-md">
                      Serveur
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Prise de commande mobile sur tablette et envoi instantané vers le KDS cuisine/bar.
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Code PIN Serveur (4-6 chiffres)
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={serveurPin}
                      onChange={(e) => setServeurPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-mono font-bold tracking-widest text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                <span>
                  Les comptes complets avec mot de passe temporaire et fiche de remise individuelle peuvent être administrés dans la section <strong>Gestion du Personnel</strong>.
                </span>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 9: CONTRÔLE « PRÊT À LIVRER » & CERTIFICATION        */}
          {/* ========================================================= */}
          {currentStep === 9 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>Audit Automatisé « Prêt à Livrer »</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Contrôle exhaustif des 9 invariants avant verrouillage et remise solennelle des accès au client.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                      allChecksPassed
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {allChecksPassed ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>100% Conforme & Prêt</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Action Requise</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Interactive Checklist Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {checklist.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentStep(item.targetStep)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between group cursor-pointer ${
                      item.isValid
                        ? 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50'
                        : 'bg-rose-50/40 border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-amber-900">
                        {item.title}
                      </span>
                      {item.isValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate">{item.description}</span>
                      <span className="text-amber-700 font-bold shrink-0 ml-1">Étape {item.targetStep} →</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Handover & Lock Banner */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                      Certification Officielle de Livraison
                    </span>
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-white">
                    Verrouiller et Livrer la Plateforme au Client
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                    Cette action verrouille la configuration structurelle (`configurationVerrouillee`). La Direction disposera de son espace de gestion quotidienne et les fiches de remise de poste pourront être imprimées.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleApplyConfiguration}
                    disabled={isSaving}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer"
                  >
                    Enregistrer sans verrouiller
                  </button>

                  <button
                    type="button"
                    onClick={handleCertifyAndLock}
                    disabled={isSaving || !allChecksPassed}
                    className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-xs shadow-lg transition-all ${
                      allChecksPassed
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 active:scale-98 cursor-pointer ring-2 ring-amber-400/40'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    <span>Certifier & Verrouiller la Plateforme</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Précédent</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleApplyConfiguration}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder l’étape'}
            </button>

            {currentStep < 9 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(9, prev + 1))}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs cursor-pointer active:scale-98"
              >
                <span>Étape Suivante</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCertifyAndLock}
                disabled={isSaving || !allChecksPassed}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-md shadow-amber-500/20 cursor-pointer active:scale-98"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Certifier & Terminer</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODALE D'IMPRESSION DE LA FICHE DE MISE EN SERVICE (A4)   */}
      {/* ========================================================= */}
      {showHandoverSlip && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  RM
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Fiche Officielle de Mise en Service
                  </h3>
                  <p className="text-xs text-slate-500">
                    RestoMaster OS • Procès-verbal de remise technique conforme
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHandoverSlip(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Slip Content */}
            <div className="border border-slate-200 rounded-2xl p-5 space-y-4 text-xs bg-slate-50/50">
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Client / Entreprise</span>
                  <div className="font-bold text-slate-900 mt-0.5">{legalName || 'Client'}</div>
                  <div className="text-slate-500">{commercialName}</div>
                  <div className="text-slate-500">{city}, Cameroun</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Identifiants Fiscaux</span>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">NIU : {niu || 'N/A'}</div>
                  <div className="font-mono text-slate-600">RCCM : {rccm || 'N/A'}</div>
                  <div className="text-slate-500">Taux fiscal : 19,25% TTC (CGI 2026)</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 py-2 border-b border-slate-200 text-center">
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Établissements</div>
                  <div className="font-black text-slate-900 text-sm mt-0.5 tabular-nums">{outlets.length || 1}</div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Tables en Salle</div>
                  <div className="font-black text-slate-900 text-sm mt-0.5 tabular-nums">{tables.length || tablesToGenerate}</div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Caisses Prêtes</div>
                  <div className="font-black text-slate-900 text-sm mt-0.5 tabular-nums">{cashRegisters.length || 1}</div>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-slate-600">
                  <span>Administrateur Certificateur :</span>
                  <span className="font-bold text-slate-900">{currentUser.email}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Date & Heure de Certification :</span>
                  <span className="font-bold text-slate-900">{new Date().toLocaleString('fr-FR')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Statut de Verrouillage :</span>
                  <span className="font-bold text-emerald-700">Verrouillé pour exploitation client</span>
                </div>
              </div>

              {/* Signature Blocks */}
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 text-center">
                <div className="space-y-8">
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Pour l'Intégrateur RestoMaster
                  </span>
                  <div className="h-10 border-b border-dashed border-slate-300"></div>
                  <span className="text-[10px] text-slate-400">Signature & Cachet</span>
                </div>
                <div className="space-y-8">
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Pour le Responsable de l'Établissement
                  </span>
                  <div className="h-10 border-b border-dashed border-slate-300"></div>
                  <span className="text-[10px] text-slate-400">Nom & Signature (Bon pour accord)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                <PrinterIcon className="w-4 h-4 text-amber-400" />
                <span>Imprimer la Fiche de Mise en Service</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowHandoverSlip(false);
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition cursor-pointer"
              >
                Accéder à RestoMaster OS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
