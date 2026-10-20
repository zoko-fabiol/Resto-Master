// ============================================================
// src/components/common/ModuleErrorBoundary.tsx
// Frontière d'erreur résiliente pour les modules RestoMaster OS
// Empêche l'écran blanc et offre une reprise immédiate en français
// ============================================================

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  moduleName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ModuleErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ModuleErrorBoundary] Erreur capturée dans ${this.props.moduleName || 'le module'}:`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-white rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto my-8 animate-in fade-in zoom-in-95 duration-150">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Incident technique dans ce module
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed max-w-md">
            Une anomalie temporaire est survenue lors de l'affichage{' '}
            {this.props.moduleName ? `du module ${this.props.moduleName}` : 'de cette vue'}.
            Vos données de service restent préservées et les autres sections demeurent opérationnelles.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Réessayer</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Actualiser la page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
