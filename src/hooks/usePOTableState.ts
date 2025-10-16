import { useState, useEffect } from 'react';
import { ViewMode } from '@/components/po/POTableViewMode';
import { ColumnConfig, DEFAULT_COLUMNS } from '@/components/po/POTableColumnManager';

interface POTableState {
  currentPage: number;
  itemsPerPage: number;
  viewMode: ViewMode;
  visibleColumns: ColumnConfig[];
}

const STORAGE_KEY = 'po-table-preferences';

const DEFAULT_STATE: POTableState = {
  currentPage: 1,
  itemsPerPage: 25,
  viewMode: 'comfortable',
  visibleColumns: DEFAULT_COLUMNS,
};

export function usePOTableState() {
  const [state, setState] = useState<POTableState>(() => {
    // Load from localStorage on mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_STATE, ...parsed };
      }
    } catch (error) {
      console.error('Error loading table preferences:', error);
    }
    return DEFAULT_STATE;
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving table preferences:', error);
    }
  }, [state]);

  const setCurrentPage = (page: number) => {
    setState((prev) => ({ ...prev, currentPage: page }));
  };

  const setItemsPerPage = (itemsPerPage: number) => {
    setState((prev) => ({ ...prev, itemsPerPage, currentPage: 1 })); // Reset to page 1
  };

  const setViewMode = (viewMode: ViewMode) => {
    setState((prev) => ({ ...prev, viewMode }));
  };

  const setVisibleColumns = (visibleColumns: ColumnConfig[]) => {
    setState((prev) => ({ ...prev, visibleColumns }));
  };

  const resetToPage1 = () => {
    setState((prev) => ({ ...prev, currentPage: 1 }));
  };

  const reset = () => {
    setState(DEFAULT_STATE);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    currentPage: state.currentPage,
    itemsPerPage: state.itemsPerPage,
    viewMode: state.viewMode,
    visibleColumns: state.visibleColumns,
    setCurrentPage,
    setItemsPerPage,
    setViewMode,
    setVisibleColumns,
    resetToPage1,
    reset,
  };
}
