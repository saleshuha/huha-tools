import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAccentTheme } from '@/hooks/useAccentTheme';

export interface ThemeConfig {
  // Theme Style
  themeStyle: 'flat' | 'mercury';
  
  // Density
  density: 'comfortable' | 'compact';
  
  // Colors (integrated with existing accent theme)
  colorScheme: string;
  
  // Header
  headerStyle: 'default' | 'compact' | 'spacious';
  headerGradient: boolean;
  
  // Tabs  
  tabStyle: 'default' | 'pills' | 'underline' | 'segmented' | 'bordered';
  tabAnimation: boolean;
  tabPosition: 'top' | 'bottom' | 'left' | 'right';
  
  // Buttons
  buttonStyle: 'default' | 'rounded' | 'sharp' | 'pill' | 'ghost' | 'soft';
  buttonShadow: boolean;
  buttonSize: 'sm' | 'md' | 'lg';
  buttonVariant: 'solid' | 'outline' | 'ghost' | 'gradient';
  
  // Fields
  fieldStyle: 'default' | 'filled' | 'subtle' | 'underline' | 'floating' | 'bordered';
  fieldFocus: 'default' | 'glow' | 'underline' | 'scale' | 'shadow';
  fieldSize: 'sm' | 'md' | 'lg';
  
  // Tables
  tableDensity: 'default' | 'compact' | 'spacious';
  tableStripes: boolean;
  tableHover: boolean;
  tableBorder: 'none' | 'horizontal' | 'vertical' | 'all';
  tableStyle: 'default' | 'minimal' | 'bordered' | 'shadow';
  
  // Cards
  cardStyle: 'default' | 'flat' | 'elevated' | 'outlined' | 'soft';
  cardShadow: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  
  // Navigation
  navStyle: 'default' | 'pill' | 'underline' | 'filled';
  sidebarStyle: 'default' | 'floating' | 'bordered' | 'minimal';
  
  // Global
  borderRadius: 'none' | 'small' | 'medium' | 'large' | 'full';
  animations: boolean;
  spacing: 'tight' | 'default' | 'loose';
}

const defaultConfig: ThemeConfig = {
  themeStyle: 'flat',
  density: 'comfortable',
  colorScheme: 'Indigo',
  headerStyle: 'default',
  headerGradient: false,
  tabStyle: 'default',
  tabAnimation: true,
  tabPosition: 'top',
  buttonStyle: 'default',
  buttonShadow: false,
  buttonSize: 'md',
  buttonVariant: 'solid',
  fieldStyle: 'default',
  fieldFocus: 'default',
  fieldSize: 'md',
  tableDensity: 'default',
  tableStripes: false,
  tableHover: true,
  tableBorder: 'horizontal',
  tableStyle: 'minimal',
  cardStyle: 'flat',
  cardShadow: 'none',
  navStyle: 'default',
  sidebarStyle: 'bordered',
  borderRadius: 'medium',
  animations: true,
  spacing: 'default',
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
      large: '1rem',
      full: '9999px'
    };
    root.style.setProperty('--radius', radiusMap[themeConfig.borderRadius]);
    
    // Header variables
    const headerHeightMap = {
      compact: '60px',
      default: '80px', 
      spacious: '100px'
    };
    root.style.setProperty('--header-min-h', headerHeightMap[themeConfig.headerStyle]);
    
    // Spacing variables
    const spacingMap = {
      tight: '0.5rem',
      default: '1rem',
      loose: '1.5rem'
    };
    root.style.setProperty('--spacing', spacingMap[themeConfig.spacing]);
    
    // Set all data attributes for styling
    root.setAttribute('data-theme-style', themeConfig.themeStyle);
    root.setAttribute('data-density', themeConfig.density);
    root.setAttribute('data-header-style', themeConfig.headerStyle);
    root.setAttribute('data-header-gradient', themeConfig.headerGradient.toString());
    root.setAttribute('data-tab-style', themeConfig.tabStyle);
    root.setAttribute('data-tab-animation', themeConfig.tabAnimation.toString());
    root.setAttribute('data-tab-position', themeConfig.tabPosition);
    root.setAttribute('data-button-style', themeConfig.buttonStyle);
    root.setAttribute('data-button-shadow', themeConfig.buttonShadow.toString());
    root.setAttribute('data-button-size', themeConfig.buttonSize);
    root.setAttribute('data-button-variant', themeConfig.buttonVariant);
    root.setAttribute('data-field-style', themeConfig.fieldStyle);
    root.setAttribute('data-field-focus', themeConfig.fieldFocus);
    root.setAttribute('data-field-size', themeConfig.fieldSize);
    root.setAttribute('data-table-density', themeConfig.tableDensity);
    root.setAttribute('data-table-stripes', themeConfig.tableStripes.toString());
    root.setAttribute('data-table-hover', themeConfig.tableHover.toString());
    root.setAttribute('data-table-border', themeConfig.tableBorder);
    root.setAttribute('data-table-style', themeConfig.tableStyle);
    root.setAttribute('data-card-style', themeConfig.cardStyle);
    root.setAttribute('data-card-shadow', themeConfig.cardShadow);
    root.setAttribute('data-nav-style', themeConfig.navStyle);
    root.setAttribute('data-sidebar-style', themeConfig.sidebarStyle);
    root.setAttribute('data-animations', themeConfig.animations.toString());
    root.setAttribute('data-spacing', themeConfig.spacing);
  };

  return (
    <ThemeConfigContext.Provider value={{ config, setConfig, resetToDefaults }}>
      {children}
    </ThemeConfigContext.Provider>
  );
};