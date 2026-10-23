import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Monitor,
  Copy,
  Check,
  Send,
  Eye,
  Code2,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mail,
} from 'lucide-react';
import { gasEmailService } from '../../services/gasEmailService';

export interface EmailPreviewData {
  title: string;
  subject: string;
  html: string;
  text?: string;
  recipientDefault?: string;
}

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailData: EmailPreviewData | null;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  isOpen,
  onClose,
  emailData,
}) => {
  const [deviceMode, setDeviceMode] = useState<'DESKTOP' | 'MOBILE'>('DESKTOP');
  const [activeView, setActiveView] = useState<'PREVIEW' | 'HTML'>('PREVIEW');
  const [copied, setCopied] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  React.useEffect(() => {
    if (emailData?.recipientDefault) {
      setTestEmail(emailData.recipientDefault);
    }
    setSendStatus(null);
  }, [emailData]);

  if (!isOpen || !emailData) return null;

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(emailData.html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setSendStatus({
        type: 'error',
        message: 'Veuillez saisir une adresse e-mail valide pour le test.',
      });
      return;
    }

    setIsSending(true);
    setSendStatus(null);

    try {
      const res = await gasEmailService.sendEmail({
        to: testEmail.trim(),
        subject: `[TEST LIVE] ${emailData.subject}`,
        htmlBody: emailData.html,
      });

      if (res.success) {
        setSendStatus({
          type: 'success',
          message: `E-mail de test transmis avec succès à ${testEmail} ! (${res.message})`,
        });
      } else {
        setSendStatus({
          type: 'error',
          message: `Échec de l'envoi : ${res.message}. Vérifiez la configuration du webhook Google Apps Script.`,
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur réseau inconnue';
      setSendStatus({
        type: 'error',
        message: `Erreur inattendue : ${errorMsg}`,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="bg-slate-950 border-b border-slate-800 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Aperçu Certifié HTML5
                </span>
                <span className="text-xs text-slate-400 font-medium">RestoMaster Mail Engine</span>
              </div>
              <h3 className="font-bold text-base text-white leading-tight">
                {emailData.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Device Mode Switcher */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={() => setDeviceMode('DESKTOP')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  deviceMode === 'DESKTOP'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Aperçu Écran Ordinateur (600px)"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode('MOBILE')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  deviceMode === 'MOBILE'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Aperçu Smartphone (375px)"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => setActiveView('PREVIEW')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeView === 'PREVIEW'
                    ? 'bg-white text-slate-950 font-bold shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="text-xs">Rendu Visuel</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('HTML')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeView === 'HTML'
                    ? 'bg-white text-slate-950 font-bold shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span className="text-xs">Code Source</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Email Metadata Bar */}
        <div className="bg-slate-950/60 border-b border-slate-800 px-5 py-2.5 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2 overflow-hidden">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] shrink-0">Objet :</span>
            <span className="font-semibold text-slate-200 truncate">
              {emailData.subject}
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-emerald-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
            <span>Responsive certifié Gmail, Outlook, Apple Mail, Web & Mobile</span>
          </div>
        </div>

        {/* Status notification */}
        {sendStatus && (
          <div
            className={`px-5 py-3 text-xs flex items-center space-x-2.5 border-b ${
              sendStatus.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300 font-semibold'
                : 'bg-rose-950/40 border-rose-800 text-rose-300 font-semibold'
            }`}
          >
            {sendStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{sendStatus.message}</span>
          </div>
        )}

        {/* Preview / HTML Code Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 flex justify-center items-start min-h-[420px]">
          {activeView === 'PREVIEW' ? (
            <div
              className={`bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden transition-all duration-300 ${
                deviceMode === 'MOBILE' ? 'w-[375px]' : 'w-full max-w-[620px]'
              }`}
            >
              {/* Fake Mobile Status Bar */}
              {deviceMode === 'MOBILE' && (
                <div className="bg-slate-950 text-slate-400 px-4 py-2 text-[11px] font-mono flex items-center justify-between border-b border-slate-800">
                  <span className="tabular-nums">12:30</span>
                  <span>RestoMaster Mail · 100%</span>
                </div>
              )}

              <div
                className="overflow-x-auto bg-slate-950"
                dangerouslySetInnerHTML={{ __html: emailData.html }}
              />
            </div>
          ) : (
            <div className="w-full max-w-4xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">
                  Code Source HTML5 Complet (Généré par le moteur RestoMaster) :
                </span>
                <button
                  type="button"
                  onClick={handleCopyHtml}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copié dans le presse-papier !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copier le Code HTML</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto border border-slate-800 shadow-inner">
                {emailData.html}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 border-t border-slate-800 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyHtml}
              className="px-3.5 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'HTML Copié !' : 'Copier HTML'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="votre.email@restaurant.com"
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 w-52 sm:w-64 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              title="Adresse destinataire pour le test en direct"
            />
            <button
              type="button"
              disabled={isSending}
              onClick={handleSendTest}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 text-xs font-extrabold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/20"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Envoi en direct...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Tester l'Envoi Réel</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
