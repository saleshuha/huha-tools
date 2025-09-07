import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAccentTheme } from '@/hooks/useAccentTheme';

export interface ThemeConfig {
  // Colors (integrated with existing accent theme)
  colorScheme: string;
  
  // Header
  headerStyle: 'default' | 'compact' | 'spacious';
  headerGradient: boolean;
  
  // Tabs  
  tabStyle: 'default' | 'pills' | 'underline';
  tabAnimation: boolean;
  
  // Buttons
  buttonStyle: 'default' | 'rounded' | 'sharp';
  buttonShadow: boolean;
  
  // Fields
  fieldStyle: 'default' | 'filled' | 'subtle';
  fieldFocus: 'default' | 'glow' | 'underline';
  
  // Tables
  tableDensity: 'default' | 'compact' | 'spacious';
  tableStripes: boolean;
  tableHover: boolean;
  
  // Global
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  animations: boolean;
}

const defaultConfig: ThemeConfig = {
  colorScheme: 'Blue',
  headerStyle: 'default',
  headerGradient: true,
  tabStyle: 'default',
  tabAnimation: true,
  buttonStyle: 'default',
  buttonShadow: true,
  fieldStyle: 'default',
  fieldFocus: 'default',
  tableDensity: 'default',
  tableStripes: false,
  tableHover: true,
  borderRadius: 'medium',
  animations: true,
};

interface ThemeConfigContextType {
  config: ThemeConfig;
  setConfig: (config: Partial<ThemeConfig>) => void;
  resetToDefaults: () => void;
}

const ThemeConfigContext = createContext<ThemeConfigContextType | undefined>(undefined);

export const useThemeConfig = () => {
  const context = useContext(ThemeConfigContext);
  if (!context) {
    throw new Error('useThemeConfig must be used within a ThemeConfigProvider');
  }
  return context;
};

export const ThemeConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfigState] = useState<ThemeConfig>(defaultConfig);
  const { changeTheme, themeColors } = useAccentTheme();

  // Load config from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('ui-theme-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfigState({ ...defaultConfig, ...parsed });
      } catch (error) {
        console.error('Failed to parse saved theme config:', error);
      }
    }
  }, []);

  // Apply theme to document when config changes
  useEffect(() => {
    applyThemeToDocument(config);
  }, [config]);

  const setConfig = (newConfig: Partial<ThemeConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfigState(updatedConfig);
    localStorage.setItem('ui-theme-config', JSON.stringify(updatedConfig));
    
    // Sync color scheme with accent theme
    if (newConfig.colorScheme) {
      const themeColor = themeColors.find(t => t.name === newConfig.colorScheme);
      if (themeColor) {
        changeTheme(themeColor);
      }
    }
  };

  const resetToDefaults = () => {
    setConfigState(defaultConfig);
    localStorage.removeItem('ui-theme-config');
    // Reset accent theme to default
    changeTheme(themeColors[0]);
  };

  const applyThemeToDocument = (themeConfig: ThemeConfig) => {
    const root = document.documentElement;
    
    // Border radius
    const radiusMap = {
      none: '0',
      small: '0.25rem',
      medium: '0.5rem',
      large: '1rem'
    };
    root.style.setProperty('--radius', radiusMap[themeConfig.borderRadius]);
    
    // Header variables
    const headerHeightMap = {
      compact: '80px',
      default: '120px', 
      spacious: '160px'
    };
    root.style.setProperty('--header-min-h', headerHeightMap[themeConfig.headerStyle]);
    
    // Set data attributes for styling
    root.setAttribute('data-header-style', themeConfig.headerStyle);
    root.setAttribute('data-header-gradient', themeConfig.headerGradient.toString());
    root.setAttribute('data-tab-style', themeConfig.tabStyle);
    root.setAttribute('data-tab-animation', themeConfig.tabAnimation.toString());
    root.setAttribute('data-button-style', themeConfig.buttonStyle);
    root.setAttribute('data-button-shadow', themeConfig.buttonShadow.toString());
    root.setAttribute('data-field-style', themeConfig.fieldStyle);
    root.setAttribute('data-field-focus', themeConfig.fieldFocus);
    root.setAttribute('data-table-density', themeConfig.tableDensity);
    root.setAttribute('data-table-stripes', themeConfig.tableStripes.toString());
    root.setAttribute('data-table-hover', themeConfig.tableHover.toString());
    root.setAttribute('data-animations', themeConfig.animations.toString());
  };

  return (
    <ThemeConfigContext.Provider value={{ config, setConfig, resetToDefaults }}>
      {children}
    </ThemeConfigContext.Provider>
  );
};