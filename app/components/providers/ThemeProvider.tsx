'use client';

import React, { createContext, useContext, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  isLightMode: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'bika_theme';

/**
 * Theme is locked to dark mode until light-mode surfaces are fully polished.
 * Any attempt to set or restore light mode is ignored.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const applyDarkMode = () => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;

    root.classList.remove('light-mode');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    body.classList.remove('light-mode');
    body.setAttribute('data-theme', 'dark');
  };

  useEffect(() => {
    applyDarkMode();

    // Clear any previously saved light preference so it cannot reappear later.
    try {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } catch {
      // ignore
    }

    // Guard against other tabs or code trying to flip the theme.
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue !== 'dark') {
        try {
          localStorage.setItem(THEME_STORAGE_KEY, 'dark');
        } catch {
          // ignore
        }
        applyDarkMode();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // No-ops — theme is locked.
  const setTheme = (_theme: ThemeMode) => {
    // intentionally ignored
  };
  const toggleTheme = () => {
    // intentionally ignored
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: 'dark',
        isLightMode: false,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'dark',
      isLightMode: false,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
};
