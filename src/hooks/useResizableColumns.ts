import { useState, useEffect, useCallback } from 'react';

export interface ColumnWidthState {
  [columnId: string]: number;
}

interface ColumnConfig {
  minWidth: number;
  maxWidth: number;
}

// Storage keys for different tables
const STORAGE_KEYS = {
  labels: 'poTracker_columnWidths_labels',
  overview: 'poTracker_columnWidths_overview',
} as const;

type TableType = keyof typeof STORAGE_KEYS;

// Default widths for the Labels table
export const DEFAULT_LABELS_WIDTHS: ColumnWidthState = {
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

// Default widths for the Overview detailed table
export const DEFAULT_OVERVIEW_WIDTHS: ColumnWidthState = {
  image: 80,
  poNumber: 140,
  shipTo: 120,
  asin: 120,
  modelSku: 140,
  title: 250,
  quantity: 80,
  status: 100,
  matchDetails: 120,
  placementReady: 120,
  instockQty: 100,
  cost: 100,
  actions: 100,
};

// Column constraints for the Labels table
export const LABELS_CONSTRAINTS: Record<string, ColumnConfig> = {
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

// Column constraints for the Overview detailed table
export const OVERVIEW_CONSTRAINTS: Record<string, ColumnConfig> = {
  image: { minWidth: 60, maxWidth: 120 },
  poNumber: { minWidth: 100, maxWidth: 200 },
  shipTo: { minWidth: 80, maxWidth: 200 },
  asin: { minWidth: 80, maxWidth: 180 },
  modelSku: { minWidth: 100, maxWidth: 250 },
  title: { minWidth: 150, maxWidth: 500 },
  quantity: { minWidth: 60, maxWidth: 120 },
  status: { minWidth: 80, maxWidth: 150 },
  matchDetails: { minWidth: 100, maxWidth: 200 },
  placementReady: { minWidth: 100, maxWidth: 180 },
  instockQty: { minWidth: 80, maxWidth: 150 },
  cost: { minWidth: 80, maxWidth: 150 },
  actions: { minWidth: 80, maxWidth: 150 },
};

const DEFAULT_WIDTHS: Record<TableType, ColumnWidthState> = {
  labels: DEFAULT_LABELS_WIDTHS,
  overview: DEFAULT_OVERVIEW_WIDTHS,
};

const COLUMN_CONSTRAINTS: Record<TableType, Record<string, ColumnConfig>> = {
  labels: LABELS_CONSTRAINTS,
  overview: OVERVIEW_CONSTRAINTS,
};

export function useResizableColumns(tableType: TableType = 'labels') {
  const storageKey = STORAGE_KEYS[tableType];
  const defaultWidths = DEFAULT_WIDTHS[tableType];
  const constraints = COLUMN_CONSTRAINTS[tableType];

  const [columnWidths, setColumnWidths] = useState<ColumnWidthState>(() => {
    // Load from localStorage on initial mount
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all columns have a width
        return { ...defaultWidths, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load column widths from localStorage:', e);
    }
    return { ...defaultWidths };
  });

  // Save to localStorage whenever widths change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnWidths));
    } catch (e) {
      console.warn('Failed to save column widths to localStorage:', e);
    }
  }, [columnWidths, storageKey]);

  const setColumnWidth = useCallback((columnId: string, width: number) => {
    const colConstraints = constraints[columnId] || { minWidth: 50, maxWidth: 1000 };
    const clampedWidth = Math.max(colConstraints.minWidth, Math.min(colConstraints.maxWidth, width));
    
    setColumnWidths(prev => ({
      ...prev,
      [columnId]: clampedWidth,
    }));
  }, [constraints]);

  const resetToDefaults = useCallback(() => {
    setColumnWidths({ ...defaultWidths });
  }, [defaultWidths]);

  const getColumnStyle = useCallback((columnId: string) => {
    const width = columnWidths[columnId] || defaultWidths[columnId] || 100;
    const colConstraints = constraints[columnId] || { minWidth: 50, maxWidth: 1000 };
    
    return {
      width,
      minWidth: colConstraints.minWidth,
      maxWidth: colConstraints.maxWidth,
    };
  }, [columnWidths, defaultWidths, constraints]);

  return {
    columnWidths,
    setColumnWidth,
    resetToDefaults,
    getColumnStyle,
  };
}

// Legacy export for backwards compatibility
export const DEFAULT_COLUMN_WIDTHS = DEFAULT_LABELS_WIDTHS;
export const COLUMN_CONSTRAINTS_LEGACY = LABELS_CONSTRAINTS;
