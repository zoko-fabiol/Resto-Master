import React, { useState } from 'react';
import {
  CreditCard,
  Building2,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  Copy,
  Check,
  Headphones,
} from 'lucide-react';
import { QuoteResult } from '../../../../shared/catalog/pricing';

export interface SetupPaymentSubmission {
  paymentMethod: 'virement_bancaire' | 'orange_money' | 'mtn_momo' | 'cheque' | 'especes';
  transactionReference: string;
  payerNotes?: string;
}

interface Step5BillingAndActivationProps {
  quote: QuoteResult | null;
  paymentReference: string;
  submission: SetupPaymentSubmission;
  onChangeSubmission: (fields: Partial<SetupPaymentSubmission>) => void;
  isDeclared: boolean;
}

export const Step5BillingAndActivation: React.FC<Step5BillingAndActivationProps> = ({
  quote,
  paymentReference,
  submission,
  onChangeSubmission,
  isDeclared,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 antialiased py-2">
      {/* En-tête */}
      <div className="space-y-1.5 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Chapitre 5 sur 5 — Finalisation</span>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">
          Règlement & Mise en Service de votre Caisse
        </h2>
        <p className="text-slate-400 text-xs leading-relaxed">
          Effectuez votre règlement par le canal de votre choix et renseignez votre référence pour déverrouiller immédiatement la vente en caisse.
        </p>
      </div>

      {/* Carte du Devis & Référence d'Ordre */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-amber-500/40 p-5 space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Référence Commande RestoMaster</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg font-black font-mono text-amber-400">{paymentReference}</span>
              <button
                type="button"
                onClick={() => handleCopy(paymentReference, 'ref')}
                className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Copier la référence"
              >
                {copiedKey === 'ref' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Montant Exigé</div>
            <div className="text-2xl font-black text-white font-mono tabular-nums">
              {quote?.finalPayableAmount.toLocaleString('fr-FR') || 0} FCFA
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-300 flex items-center justify-between">
          <span>Formule : <strong className="text-white">{quote?.packName}</strong> ({quote?.billingCycle})</span>
          <span className="text-slate-400 font-mono">{quote?.lines.length} ligne(s) contractuelle(s)</span>
        </div>
      </div>

      {/* SECTION : Coordonnées Officielles des Comptes de Règlement */}
      <div className="space-y-3">
        <span className="block text-xs font-bold uppercase tracking-wider text-slate-300">
          Canaux de Paiement Disponibles
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Orange Money */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-orange-400">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                <span>Orange Money Cameroun</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/20">MoMo</span>
            </div>
            <div className="text-xs text-slate-300">
              Code Marchand : <strong className="text-white font-mono font-bold">#150*47*123456#</strong>
            </div>
            <div className="text-[11px] text-slate-400">
              Bénéficiaire officiel : <strong className="text-white">RestoMaster Technologies SARL</strong>
            </div>
          </div>

          {/* MTN Mobile Money */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-yellow-400">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                <span>MTN MoMo Cameroun</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20">MoMo</span>
            </div>
            <div className="text-xs text-slate-300">
              Code Marchand : <strong className="text-white font-mono font-bold">*126*4*987654#</strong>
            </div>
            <div className="text-[11px] text-slate-400">
              Bénéficiaire officiel : <strong className="text-white">RestoMaster Technologies SARL</strong>
            </div>
          </div>

          {/* Virement Bancaire */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 sm:col-span-2">
            <div className="flex items-center justify-between text-xs font-bold text-blue-400">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>Virement Bancaire (Afriland First Bank / BICEC)</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">Virement</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="text-slate-300">
                RIB : <strong className="text-white font-mono text-[11px]">10005 00012 01234567890 42</strong>
              </div>
              <div className="text-slate-300">
                Banque : <strong className="text-white">Afriland First Bank Bonanjo</strong>
              </div>
            </div>
            <div className="text-[11px] text-slate-400">
              Motif du virement obligatoire : <strong className="text-amber-400 font-mono">{paymentReference}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION : Formulaire de Déclaration du Règlement */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <span className="block text-xs font-bold uppercase tracking-wider text-slate-300">
          Déclarer votre Paiement Effectué
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Moyen utilisé pour le paiement *</label>
            <select
              value={submission.paymentMethod}
              onChange={(e) => onChangeSubmission({ paymentMethod: e.target.value as any })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium cursor-pointer"
            >
              <option value="orange_money">Orange Money</option>
              <option value="mtn_momo">MTN Mobile Money</option>
              <option value="virement_bancaire">Virement Bancaire</option>
              <option value="cheque">Chèque certifié</option>
              <option value="especes">Espèces remises à l'agence</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Numéro de Transaction / Référence Chèque *
            </label>
            <input
              type="text"
              required
              value={submission.transactionReference}
              onChange={(e) => onChangeSubmission({ transactionReference: e.target.value })}
              placeholder="Ex: MP261023.1102.A01234"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-300">
              Remarques comptables (optionnel)
            </label>
            <input
              type="text"
              value={submission.payerNotes || ''}
              onChange={(e) => onChangeSubmission({ payerNotes: e.target.value })}
              placeholder="Ex: Virement émis depuis le compte Le Bistrot SARL"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {isDeclared && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Votre règlement a été transmis. Le statut passera à <strong>Validé & Actif</strong> dès constatation par notre service financier.
            </span>
          </div>
        )}
      </div>

      {/* Assistance Locale Immédiate */}
      <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Headphones className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Besoin d'aide immédiate pour finaliser ? Contactez la hotline au <strong>+237 670 12 34 56</strong></span>
        </div>
      </div>
    </div>
  );
};
