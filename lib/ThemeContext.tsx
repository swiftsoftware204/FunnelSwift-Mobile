import React, { createContext, useContext } from 'react';

export const theme = {
  colors: {
    background: '#0f1117',
    surface: '#1e2130',
    surfaceLight: '#2e3245',
    primary: '#5B4FFF',
    primaryLight: '#8B5CF6',
    text: '#F1F5F9',
    textMuted: '#94A3B8',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    border: '#2e3245',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
};

const ThemeContext = createContext(theme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
