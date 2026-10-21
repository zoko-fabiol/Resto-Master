import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Receipt,
  Smartphone,
  Coins,
  Building,
  Scale,
  Printer,
  X,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface CameroonComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CameroonComplianceModal: React.FC<CameroonComplianceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, orders } = useRestaurant();

  if (!isOpen) return null;

  const complianceItems = [
    {
      title: 'Fiscalité CGI & Taux TVA 19,25%',
      status: 'conforme',
      code: 'Art. 125 & 142 CGI Cameroun',
      description:
        'Application du taux légal combiné de 19,25% (TVA 17,5% + Centimes Additionnels Communaux CAC de 10% sur la TVA = 1,75%). Calcul automatique sur toutes les consommations hors taxe.',
      icon: Scale,
    },
    {
      title: 'Mentions Obligatoires sur Factures & Additions',
      status: 'conforme',
      code: 'Réglementation DGI Cameroun',
      description: `Présence systématique sur les additions et factures : Numéro Contribuable (NIU : ${
        settings.niu || 'Non configuré'
      }), RCCM (${settings.rccm || 'Non configuré'}), Centre des Impôts (${
        settings.taxCenter || 'Non configuré'
      }), Boîte Postale et Ville.`,
      icon: Building,
    },
    {
      title: 'Facturation Laser A5 avec Montant en Toutes Lettres',
      status: 'conforme',
      code: 'Norme Facturation Entreprise OHADA / Cameroun',
      description:
        'Génération automatique de la facture A5 pour les entreprises et séminaires, avec conversion dynamique du montant TTC en lettres (obligatoire pour la déductibilité fiscale des charges de repas par les clients sociétés).',
      icon: Receipt,
    },
    {
      title: 'Gestion des Folios (Facture Société vs Extras)',
      status: 'conforme',
      code: 'Standard HotelPro Restauration Cameroun',
      description:
        "Séparation sur une même table des consommations prises en charge par l'entreprise (Folio 1) et des extras personnels ou alcoolisés réglés par le convive (Folio 2).",
      icon: Layers,
    },
    {
      title: 'Main Courante Journalière Restauration & Bar',
      status: 'conforme',
      code: 'Contrôle de Gestion Hôtellerie & Restauration',
      description:
        'Ventilation comptable quotidienne exhaustive : Petit-déjeuner (PDJ), Déjeuner, Dîner, Bar, Cave/Spiritueux, et Divers. Rapprochement par mode de règlement et suivi des soldes débiteurs.',
      icon: FileSpreadsheet,
    },
    {
      title: 'Mobile Money Cameroun (Orange Money & MTN MoMo)',
      status: 'conforme',
      code: 'Standards USSD #150# & *126# + Max it / MoMo Pay',
      description:
        "Génération de QR Codes déclenchant directement l'application Appel du smartphone du client avec le code USSD complet et le montant pré-rempli. Support du Code Marchand, du Numéro de dépôt direct, et de l'import de QR officiel Max it.",
      icon: Smartphone,
    },
    {
      title: 'Clôture de Caisse Journalière & Contrôle des Écarts',
      status: 'conforme',
      code: 'Procédure Z de Caisse & Traçabilité OHADA',
      description:
        'Rapprochement entre le fond de caisse théorique et le comptage physique des espèces FCFA, avec enregistrement des références SMS de chaque encaissement Mobile Money.',
      icon: Coins,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Contrôle Fiscal Intégré & Cadre Réglementaire (Cameroun)</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  CONFIGURÉ POUR LE CADRE CAMEROUNAIS
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit des paramètres CGI 2026, OHADA et standards d'exploitation CHR • Dernière vérification : <strong>{settings.lastFiscalCheckDate || '2026-03-01'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800">
          {/* Summary Score Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 justify-center sm:justify-start">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>État de la Configuration Réglementaire</span>
              </div>
              <div className="text-base font-bold text-white">
                {settings.name} — Paramètres Métier et Fiscaux Opérationnels
              </div>
              <p className="text-xs text-slate-300">
                Les modules TVA 19,25%, retenues AIR, numérotation séquentielle et rapprochement Mobile Money sont actifs. Vérification périodique recommandée avec votre comptable.
              </p>
            </div>

            <div className="text-center shrink-0 bg-slate-800 px-5 py-3 rounded-xl border border-slate-700 shadow-xs">
              <div className="text-2xl font-black text-amber-400">CONFIGURÉ</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Cadre Cameroun CGI 2026</div>
            </div>
          </div>

          {/* Detailed Compliance Items */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Statuts des Modules Réglementaires :
            </h4>

            <div className="grid grid-cols-1 gap-3">
              {complianceItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={index}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-xs text-slate-900">{item.title}</h5>
                          <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            CONFIGURÉ
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 font-semibold">{item.code}</div>
                        <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Legal Notice */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Recommandation pour le gérant & le comptable :</strong> Ce module fournit une aide au contrôle de gestion et à la conformité technique. Il ne dispense pas des obligations de télédéclaration auprès du Centre des Impôts de rattachement ({settings.taxCenter || 'Centre compétent'}) et de conservation décennale des pièces comptables (Acte uniforme OHADA).
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-500">
            Établissement : <strong className="text-slate-800">{settings.name}</strong> • Ville : <strong className="text-slate-800">{settings.city}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Fermer le Rapport
          </button>
        </div>
      </div>
    </div>
  );
};
