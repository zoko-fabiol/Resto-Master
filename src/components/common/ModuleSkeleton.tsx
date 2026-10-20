// ============================================================
// src/components/common/ModuleSkeleton.tsx
// Squelette de chargement uniforme pour les vues lazy-loaded
// ============================================================

import React from 'react';

export interface ModuleSkeletonProps {
  moduleName?: string;
}

export const ModuleSkeleton: React.FC<ModuleSkeletonProps> = ({ moduleName }) => {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={`Chargement du module ${moduleName || ''}...`}
      className="space-y-6 animate-pulse p-2 sm:p-4"
    >
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-200" />
          <div className="space-y-2">
            <div className="h-6 w-48 sm:w-64 bg-slate-200 rounded-lg" />
            <div className="h-3.5 w-32 sm:w-44 bg-slate-100 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-24 bg-slate-200 rounded-xl" />
          <div className="h-9 w-32 bg-slate-300 rounded-xl" />
        </div>
      </div>

      {/* KPI / Cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-100 rounded-md" />
              <div className="w-8 h-8 rounded-lg bg-slate-100" />
            </div>
            <div className="h-7 w-32 bg-slate-200 rounded-lg" />
            <div className="h-3 w-20 bg-slate-100 rounded-md" />
          </div>
        ))}
      </div>

      {/* Content Area / Table Skeleton */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="h-5 w-40 bg-slate-200 rounded-md" />
          <div className="h-8 w-28 bg-slate-100 rounded-lg" />
        </div>

        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center gap-4 py-2 border-b border-slate-50">
              <div className="w-8 h-8 rounded-lg bg-slate-100 shrink-0" />
              <div className="h-4 w-1/4 bg-slate-100 rounded-md" />
              <div className="h-4 w-1/4 bg-slate-100 rounded-md" />
              <div className="h-4 w-1/6 bg-slate-100 rounded-md ml-auto" />
              <div className="h-8 w-20 bg-slate-200 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
