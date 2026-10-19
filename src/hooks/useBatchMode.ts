// ============================================================
// src/hooks/useBatchMode.ts
// Hook de basculement du mode de saisie à la chaîne (Batch)
// ============================================================

import { useState, useCallback } from 'react';

export const useBatchMode = (initialState: boolean = false): [boolean, () => void] => {
  const [isBatchMode, setIsBatchMode] = useState<boolean>(initialState);

  const toggleBatchMode = useCallback(() => {
    setIsBatchMode((prev) => !prev);
  }, []);

  return [isBatchMode, toggleBatchMode];
};
