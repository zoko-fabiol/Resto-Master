// ============================================================
// src/components/ExportButton.tsx
// Bouton de menu déroulant d'exportation (PDF, XLSX, DOCX)
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileText, FileSpreadsheet } from 'lucide-react';

export interface ExportButtonProps {
  pdfLabel?: string;
  xlsxLabel?: string;
  docxLabel?: string;
  onPDF?: () => void;
  onXLSX?: () => void;
  onDOCX?: () => void;
  disabled?: boolean;
  className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  pdfLabel = 'Document PDF',
  xlsxLabel = 'Tableur Excel (.xlsx)',
  docxLabel = 'Document Word (.docx)',
  onPDF,
  onXLSX,
  onDOCX,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const actions = [
    onPDF ? { label: pdfLabel, fn: onPDF, icon: FileText, color: 'text-rose-500' } : null,
    onXLSX ? { label: xlsxLabel, fn: onXLSX, icon: FileSpreadsheet, color: 'text-emerald-600' } : null,
    onDOCX ? { label: docxLabel, fn: onDOCX, icon: FileText, color: 'text-blue-600' } : null,
  ].filter(Boolean) as Array<{
    label: string;
    fn: () => void;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }>;

  if (actions.length === 1) {
    const single = actions[0];
    const Icon = single.icon;
    return (
      <button
        type="button"
        onClick={single.fn}
        disabled={disabled}
        className={`btn-secondary py-2 px-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 ${className}`}
      >
        <Icon className={`w-4 h-4 ${single.color}`} />
        <span>{single.label}</span>
      </button>
    );
  }

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="btn-secondary py-2 px-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
      >
        <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>Exporter</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl z-50 py-1.5 overflow-hidden animate-fade-scale">
          {actions.map((act, idx) => {
            const Icon = act.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  act.fn();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <Icon className={`w-4 h-4 ${act.color} shrink-0`} />
                <span className="truncate">{act.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
