import { useState, useEffect } from 'react';

interface LabelPrintSettings {
  format: 'pdf' | 'zpl';
  copies: number;
  labelsPerPage: number;
  paperSize: 'address' | 'shipping' | 'product' | 'barcode' | 'small' | 'medium' | 'large' | 'custom';
  customWidth?: number;
  customHeight?: number;
  dpi: 203 | 300;
  darkness: number;
}

const DEFAULT_SETTINGS: LabelPrintSettings = {
  format: 'zpl',
  copies: 1,
  labelsPerPage: 1,
  paperSize: 'address',
  customWidth: 89,
  customHeight: 36,
  dpi: 203,
  darkness: 10
};

export function useLabelPrintSettings() {
  const [printSettings, setPrintSettingsState] = useState<LabelPrintSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('labelPrintSettings');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setPrintSettingsState({ ...DEFAULT_SETTINGS, ...parsedSettings });
      } catch (error) {
        console.warn('Failed to load print settings from localStorage:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  const setPrintSettings = (newSettings: Partial<LabelPrintSettings> | ((prev: LabelPrintSettings) => LabelPrintSettings)) => {
    setPrintSettingsState((prev) => {
      const updated = typeof newSettings === 'function' ? newSettings(prev) : { ...prev, ...newSettings };
      
      // Save to localStorage
      try {
        localStorage.setItem('labelPrintSettings', JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to save print settings to localStorage:', error);
      }
      
      return updated;
    });
  };

  const resetToDefaults = () => {
    setPrintSettings(DEFAULT_SETTINGS);
  };

  return {
    printSettings,
    setPrintSettings,
    resetToDefaults
  };
}