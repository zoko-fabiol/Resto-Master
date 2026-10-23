import React, { useState, useEffect, useMemo } from 'react';
import { SetupStepper, SETUP_CHAPTERS } from './SetupStepper';
import { SetupNavigation } from './SetupNavigation';
import { Step1Identity, SetupIdentityData } from './steps/Step1Identity';
import { Step2BusinessProfileAndPack } from './steps/Step2BusinessProfileAndPack';
import { Step3AddonsAndCapacities } from './steps/Step3AddonsAndCapacities';
import { Step4HardwareAndStaff, SetupHardwareData } from './steps/Step4HardwareAndStaff';
import { Step5BillingAndActivation, SetupPaymentSubmission } from './steps/Step5BillingAndActivation';
import { useRestaurant } from '../../context/RestaurantContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { cloudFunctionsService } from '../../services/functions/cloudFunctionsService';
import { computeQuote, QuoteResult } from '../../../shared/catalog/pricing';
import {
  CATALOG_PACKS,
  PackId,
  RestaurantTypeId,
  BillingCycle,
} from '../../../shared/catalog/packs';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';

interface SetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export const SetupWizardModal: React.FC<SetupWizardModalProps> = ({
  isOpen,
  onClose,
  onCompleted,
}) => {
  const { tenant, settings, updateSettings } = useRestaurant();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [currentChapter, setCurrentChapter] = useState<number>(1);
  const [maxAccessibleChapter, setMaxAccessibleChapter] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // État Chapitre 1 : Identité
  const [identity, setIdentity] = useState<SetupIdentityData>({
    name: settings?.name || tenant?.company?.name || '',
    legalName: tenant?.company?.legalName || '',
    legalForm: (tenant?.company?.legalForm as any) || 'SARL',
    city: settings?.city || tenant?.company?.city || 'Douala',
    neighborhood: settings?.quartier || '',
    address: settings?.address || tenant?.company?.headquartersAddress || '',
    phone: settings?.phone || tenant?.company?.phone || '',
    email: settings?.email || tenant?.company?.email || '',
    niu: settings?.niu || tenant?.company?.taxId || '',
    rccm: tenant?.company?.rccm || '',
    currency: 'FCFA',
    slogan: '',
  });

  // État Chapitre 2 : Métier & Pack
  const [selectedType, setSelectedType] = useState<RestaurantTypeId>('restaurant_classique');
  const [selectedPack, setSelectedPack] = useState<PackId>('medium');
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('annuel');

  // État Chapitre 3 : Options & Capacités
  const [selectedAddons, setSelectedAddons] = useState<string[]>(['addon_tables', 'addon_stocks']);
  const [extraTerminals, setExtraTerminals] = useState<number>(0);
  const [extraUsers, setExtraUsers] = useState<number>(0);
  const [extraOrdersBlocks, setExtraOrdersBlocks] = useState<number>(0);

  // État Chapitre 4 : Matériel & Staff
  const [hardware, setHardware] = useState<SetupHardwareData>({
    receiptPrinterWidth: '80mm',
    kitchenDisplayMode: 'ecran_kds',
    barDisplayMode: 'ecran_kds',
    staffMembers: [],
  });

  // État Chapitre 5 : Facturation & Paiement
  const [paymentReference, setPaymentReference] = useState<string>('RM-2026-000101');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [isPaymentDeclared, setIsPaymentDeclared] = useState<boolean>(false);
  const [paymentSubmission, setPaymentSubmission] = useState<SetupPaymentSubmission>({
    paymentMethod: 'orange_money',
    transactionReference: '',
  });

  // Devis certifié temps réel
  const liveQuote: QuoteResult | null = useMemo(() => {
    try {
      return computeQuote({
        restaurantType: selectedType,
        packId: selectedPack,
        billingCycle: selectedCycle,
        selectedAddonIds: selectedAddons,
        capacities: {
          extraTerminals,
          extraUsers,
          extraOrdersBlocks,
        },
      });
    } catch {
      return null;
    }
  }, [selectedType, selectedPack, selectedCycle, selectedAddons, extraTerminals, extraUsers, extraOrdersBlocks]);

  const maxUsersAllowed = useMemo(() => {
    const base = CATALOG_PACKS[selectedPack]?.limits?.maxUsers || 8;
    return base + extraUsers;
  }, [selectedPack, extraUsers]);

  // Synchronisation des données initiales
  useEffect(() => {
    if (tenant?.restaurantType) {
      setSelectedType(tenant.restaurantType as RestaurantTypeId);
    }
    if (tenant?.packId && CATALOG_PACKS[tenant.packId as PackId]) {
      setSelectedPack(tenant.packId as PackId);
    }
  }, [tenant]);

  if (!isOpen) return null;

  // Validation avant de passer à l'étape suivante
  const canProceedCurrentChapter = (): boolean => {
    if (currentChapter === 1) {
      return Boolean(identity.name.trim() && identity.city.trim() && identity.address.trim() && identity.phone.trim() && identity.email.trim());
    }
    if (currentChapter === 2) {
      return Boolean(selectedType && selectedPack && selectedCycle);
    }
    if (currentChapter === 3) {
      return Boolean(liveQuote);
    }
    if (currentChapter === 4) {
      return true;
    }
    if (currentChapter === 5) {
      return isPaymentDeclared || paymentSubmission.transactionReference.trim().length >= 3;
    }
    return true;
  };

  const handleNext = async () => {
    if (!canProceedCurrentChapter()) return;

    // Transition vers Chapitre 5 : soumettre l'ordre d'abonnement côté serveur si pas encore fait
    if (currentChapter === 4 && !currentOrderId) {
      try {
        setIsLoading(true);
        const res = await cloudFunctionsService.submitSubscriptionOrder({
          packId: selectedPack,
          billingCycle: selectedCycle,
          selectedAddons,
          additionalCapacities: {
            extraTerminals,
            extraUsers,
            extraOrdersBlocks,
          },
        });
        if (res?.orderId) {
          setCurrentOrderId(res.orderId);
          setPaymentReference(res.paymentReference || 'RM-2026-000101');
        }
      } catch (err: any) {
        console.warn('Création commande via fallback local:', err);
        setPaymentReference(`RM-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`);
      } finally {
        setIsLoading(false);
      }
    }

    // Chapitre 5 : Terminer et certifier la mise en route
    if (currentChapter === 5) {
      try {
        setIsLoading(true);

        // Déclarer le paiement si renseigné
        if (currentOrderId && paymentSubmission.transactionReference.trim()) {
          await cloudFunctionsService.markPaymentSent({
            orderId: currentOrderId,
            paymentMethod: paymentSubmission.paymentMethod,
            transactionReference: paymentSubmission.transactionReference.trim(),
            payerNotes: paymentSubmission.payerNotes,
          });
        }

        // Mettre à jour les informations du restaurant
        if (updateSettings) {
          await updateSettings({
            name: identity.name,
            raisonSociale: identity.legalName || identity.name,
            nomCommercial: identity.name,
            formeJuridique: identity.legalForm as any,
            address: identity.address,
            phone: identity.phone,
            email: identity.email,
            niu: identity.niu,
            rccm: identity.rccm,
            city: identity.city,
            quartier: identity.neighborhood,
            slogan: identity.slogan || '',
          });
        }

        showToast({
          type: 'success',
          title: 'Installation Terminée !',
          message: 'Votre système RestoMaster OS est initialisé. Bienvenue sur votre console de gestion.',
        });

        onCompleted?.();
        onClose();
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Erreur de finalisation',
          message: err?.message || 'Une erreur est survenue lors de la certification.',
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const nextChap = currentChapter + 1;
    setCurrentChapter(nextChap);
    setMaxAccessibleChapter((prev) => Math.max(prev, nextChap));
  };

  const handlePrevious = () => {
    if (currentChapter > 1) {
      setCurrentChapter((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden text-slate-100 select-none">
      {/* Barre supérieure OOBE */}
      <div className="h-14 px-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-950 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center font-black text-slate-950 text-sm shadow-md shadow-amber-500/20">
            RM
          </div>
          <div>
            <div className="text-sm font-black text-white flex items-center gap-1.5">
              <span>RestoMaster OS</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">v2.0</span>
            </div>
            <div className="text-[11px] text-slate-400">Assistant de Première Mise en Route</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
          title="Fermer l'assistant"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Stepper des 5 Chapitres */}
      <SetupStepper
        currentChapter={currentChapter}
        onSelectChapter={(chapId) => setCurrentChapter(chapId)}
        maxAccessibleChapter={maxAccessibleChapter}
      />

      {/* Corps dynamique de l'étape courante */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {currentChapter === 1 && (
          <Step1Identity
            data={identity}
            onChange={(fields) => setIdentity((prev) => ({ ...prev, ...fields }))}
          />
        )}

        {currentChapter === 2 && (
          <Step2BusinessProfileAndPack
            selectedType={selectedType}
            onSelectType={setSelectedType}
            selectedPack={selectedPack}
            onSelectPack={setSelectedPack}
            selectedCycle={selectedCycle}
            onSelectCycle={setSelectedCycle}
          />
        )}

        {currentChapter === 3 && (
          <Step3AddonsAndCapacities
            selectedType={selectedType}
            selectedPack={selectedPack}
            selectedCycle={selectedCycle}
            selectedAddons={selectedAddons}
            onToggleAddon={(id) =>
              setSelectedAddons((prev) =>
                prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
              )
            }
            extraTerminals={extraTerminals}
            onChangeExtraTerminals={setExtraTerminals}
            extraUsers={extraUsers}
            onChangeExtraUsers={setExtraUsers}
            extraOrdersBlocks={extraOrdersBlocks}
            onChangeExtraOrdersBlocks={setExtraOrdersBlocks}
            onSelectPack={setSelectedPack}
          />
        )}

        {currentChapter === 4 && (
          <Step4HardwareAndStaff
            data={hardware}
            onChange={(fields) => setHardware((prev) => ({ ...prev, ...fields }))}
            maxUsersAllowed={maxUsersAllowed}
          />
        )}

        {currentChapter === 5 && (
          <Step5BillingAndActivation
            quote={liveQuote}
            paymentReference={paymentReference}
            submission={paymentSubmission}
            onChangeSubmission={(fields) => setPaymentSubmission((prev) => ({ ...prev, ...fields }))}
            isDeclared={isPaymentDeclared}
          />
        )}
      </div>

      {/* Navigation inférieure */}
      <SetupNavigation
        currentChapter={currentChapter}
        totalChapters={SETUP_CHAPTERS.length}
        onPrevious={handlePrevious}
        onNext={handleNext}
        isLoading={isLoading}
        canProceed={canProceedCurrentChapter()}
      />
    </div>
  );
};
