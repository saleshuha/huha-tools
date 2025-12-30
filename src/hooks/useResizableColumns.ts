import { useState, useEffect, useCallback } from 'react';

export interface ColumnWidthState {
  [columnId: string]: number;
}

interface ColumnConfig {
  minWidth: number;
  maxWidth: number;
}

const STORAGE_KEY = 'poTracker_columnWidths';

export const DEFAULT_COLUMN_WIDTHS: ColumnWidthState = {
  checkbox: 48,
  image: 80,
  productInfo: 600,
  stockQty: 120,
  shippedQty: 100,
  fbaInvQty: 100,
  poQty: 80,
  printQty: 100,
  printStatus: 160,
  scannedBarcode: 140,
  actions: 100,
};

export const COLUMN_CONSTRAINTS: Record<string, ColumnConfig> = {
  checkbox: { minWidth: 40, maxWidth: 60 },
  image: { minWidth: 60, maxWidth: 120 },
  productInfo: { minWidth: 300, maxWidth: 1200 },
  stockQty: { minWidth: 80, maxWidth: 200 },
  shippedQty: { minWidth: 80, maxWidth: 180 },
  fbaInvQty: { minWidth: 80, maxWidth: 180 },
  poQty: { minWidth: 60, maxWidth: 150 },
  printQty: { minWidth: 80, maxWidth: 150 },
  printStatus: { minWidth: 120, maxWidth: 250 },
  scannedBarcode: { minWidth: 100, maxWidth: 220 },
  actions: { minWidth: 80, maxWidth: 150 },
};

export function useResizableColumns() {
  const [columnWidths, setColumnWidths] = useState<ColumnWidthState>(() => {
    // Load from localStorage on initial mount
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all columns have a width
        return { ...DEFAULT_COLUMN_WIDTHS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load column widths from localStorage:', e);
    }
    return { ...DEFAULT_COLUMN_WIDTHS };
  });

  // Save to localStorage whenever widths change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columnWidths));
    } catch (e) {
      console.warn('Failed to save column widths to localStorage:', e);
    }
  }, [columnWidths]);

  const setColumnWidth = useCallback((columnId: string, width: number) => {
    const constraints = COLUMN_CONSTRAINTS[columnId] || { minWidth: 50, maxWidth: 1000 };
    const clampedWidth = Math.max(constraints.minWidth, Math.min(constraints.maxWidth, width));
    
    setColumnWidths(prev => ({
      ...prev,
      [columnId]: clampedWidth,
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setColumnWidths({ ...DEFAULT_COLUMN_WIDTHS });
  }, []);

  const getColumnStyle = useCallback((columnId: string) => {
    const width = columnWidths[columnId] || DEFAULT_COLUMN_WIDTHS[columnId] || 100;
    const constraints = COLUMN_CONSTRAINTS[columnId] || { minWidth: 50, maxWidth: 1000 };
    
    return {
      width,
      minWidth: constraints.minWidth,
      maxWidth: constraints.maxWidth,
    };
  }, [columnWidths]);

  return {
    columnWidths,
    setColumnWidth,
    resetToDefaults,
    getColumnStyle,
  };
}
