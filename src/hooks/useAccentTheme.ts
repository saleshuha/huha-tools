import { useState, useEffect } from 'react';

export interface ThemeColor {
  name: string;
  primary: string;
  primaryGlow: string;
}

export const themeColors: ThemeColor[] = [
  { name: 'Blue', primary: '217 91% 60%', primaryGlow: '217 91% 75%' },
  { name: 'Purple', primary: '262 83% 58%', primaryGlow: '262 83% 73%' },
  { name: 'Green', primary: '142 76% 36%', primaryGlow: '142 76% 51%' },
  { name: 'Orange', primary: '24 95% 53%', primaryGlow: '24 95% 68%' },
  { name: 'Pink', primary: '328 86% 70%', primaryGlow: '328 86% 85%' },
  { name: 'Cyan', primary: '189 94% 43%', primaryGlow: '189 94% 58%' },
  { name: 'Red', primary: '0 84% 60%', primaryGlow: '0 84% 75%' },
  { name: 'Yellow', primary: '48 96% 53%', primaryGlow: '48 96% 68%' },
];

export const useAccentTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<ThemeColor>(themeColors[0]);

  useEffect(() => {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('accent-theme');
    if (savedTheme) {
      const theme = themeColors.find(t => t.name === savedTheme) || themeColors[0];
      setCurrentTheme(theme);
      applyTheme(theme);
    }
  }, []);

  const applyTheme = (theme: ThemeColor) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-glow', theme.primaryGlow);
  };

  const changeTheme = (theme: ThemeColor) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    localStorage.setItem('accent-theme', theme.name);
  };

  return {
    currentTheme,
    themeColors,
    changeTheme,
  };
};