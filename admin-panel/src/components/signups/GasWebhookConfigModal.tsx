import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Sparkles,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { gasEmailService } from '../../services/gasEmailService';

interface GasWebhookConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GasWebhookConfigModal: React.FC<GasWebhookConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      gasEmailService.getWebhookUrl().then((url) => {
        setWebhookUrl(url);
      });
      setSaveSuccess(false);
      setTestMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await gasEmailService.saveWebhookUrl(webhookUrl);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Erreur d’enregistrement : ${err?.message || 'Échec'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      alert('Veuillez renseigner une adresse e-mail destinataire pour le test.');
      return;
    }
    setIsTesting(true);
    setTestMessage(null);
    try {
      const res = await gasEmailService.sendTestEmail(testEmail.trim());
      if (res.success) {
        setTestMessage({ type: 'success', text: res.message });
      } else {
        setTestMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setTestMessage({
        type: 'error',
        text: err?.message || 'Erreur lors du test du Webhook Google Apps Script.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gasEmailService.getGoogleAppsScriptCode());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Passerelle E-mail Google Apps Script</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  100 mails/j gratuits
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Envoi automatique des identifiants et codes restaurant lors de la validation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Formulaire URL */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>URL Webhook de l'Application Web Google Apps Script</span>
                {webhookUrl ? (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Configuré</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>En attente de configuration</span>
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveSuccess ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{saveSuccess ? 'Enregistré !' : 'Enregistrer'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                L'URL doit se terminer par <code className="text-amber-400 font-mono">/exec</code>.
              </p>
            </div>
          </form>

          {/* Test d'envoi d'e-mail */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
              <Send className="w-4 h-4 text-amber-400" />
              <span>Tester l'envoi d'un e-mail d'activation</span>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Votre adresse e-mail personnelle pour tester"
                className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={handleSendTest}
                disabled={isTesting || !webhookUrl}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Send className="w-3.5 h-3.5 text-amber-400" />}
                <span>Envoyer le test</span>
              </button>
            </div>

            {testMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  testMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {testMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{testMessage.text}</span>
              </div>
            )}
          </div>

          {/* Guide Google Apps Script */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Guide de mise en service Google Apps Script (3 minutes)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="text-[11px] text-amber-400 hover:underline"
              >
                {showCode ? 'Masquer le code' : 'Voir le code .gs'}
              </button>
            </div>

            <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-4 leading-relaxed">
              <li>
                Ouvrez{' '}
                <a
                  href="https://script.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>script.google.com</span>
                  <ExternalLink className="w-3 h-3" />
                </a>{' '}
                avec votre compte Gmail.
              </li>
              <li>Créez un <strong>« Nouveau projet »</strong>.</li>
              <li>
                Copiez le code fourni ci-dessous et remplacez tout le contenu de <code className="text-slate-200 font-mono">Code.gs</code>.
              </li>
              <li>
                Cliquez sur <strong>Déployer</strong> (en haut à droite) &gt; <strong>Nouveau déploiement</strong>.
              </li>
              <li>
                Sélectionnez le type <strong>« Application Web »</strong>.
              </li>
              <li>
                Réglez <em>Exécuter en tant que :</em> <strong>Moi</strong> et <em>Qui a accès :</em>{' '}
                <strong className="text-amber-400">Tout le monde (Anyone)</strong>.
              </li>
              <li>
                Cliquez sur Déployer, autorisez l'accès Google, puis copiez l'URL se terminant par <code className="text-amber-400 font-mono">/exec</code>.
              </li>
            </ol>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 border border-slate-700"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                <span>{copiedCode ? 'Code copié dans le presse-papier !' : 'Copier le code Google Apps Script complet'}</span>
              </button>
            </div>

            {showCode && (
              <pre className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto max-h-48">
                {gasEmailService.getGoogleAppsScriptCode()}
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
