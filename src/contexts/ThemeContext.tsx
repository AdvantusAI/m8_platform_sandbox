import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'blue' | 'green' | 'purple' | 'red' | 'orange' | 'teal' | 'indigo' | 'pink';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  availableThemes: { name: Theme; label: string; color: string }[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themeConfig = {
  blue: {
    label: 'Blue',
    color: 'hsl(221, 83%, 53%)',
    primary: '221 83% 53%',
    accent: '221 83% 53%',
    ring: '221 83% 53%',
    sidebarPrimary: '221 83% 53%',
    sidebarRing: '221 83% 53%'
  },
  green: {
    label: 'Green',
    color: 'hsl(142, 76%, 36%)',
    primary: '142 76% 36%',
    accent: '142 76% 36%',
    ring: '142 76% 36%',
    sidebarPrimary: '142 76% 36%',
    sidebarRing: '142 76% 36%'
  },
  purple: {
    label: 'Purple',
    color: 'hsl(262, 83%, 58%)',
    primary: '262 83% 58%',
    accent: '262 83% 58%',
    ring: '262 83% 58%',
    sidebarPrimary: '262 83% 58%',
    sidebarRing: '262 83% 58%'
  },
  red: {
    label: 'Red',
    color: 'hsl(0, 84%, 60%)',
    primary: '0 84% 60%',
    accent: '0 84% 60%',
    ring: '0 84% 60%',
    sidebarPrimary: '0 84% 60%',
    sidebarRing: '0 84% 60%'
  },
  orange: {
    label: 'Orange',
    color: 'hsl(24, 95%, 53%)',
    primary: '24 95% 53%',
    accent: '24 95% 53%',
    ring: '24 95% 53%',
    sidebarPrimary: '24 95% 53%',
    sidebarRing: '24 95% 53%'
  },
  teal: {
    label: 'Teal',
    color: 'hsl(173, 80%, 40%)',
    primary: '173 80% 40%',
    accent: '173 80% 40%',
    ring: '173 80% 40%',
    sidebarPrimary: '173 80% 40%',
    sidebarRing: '173 80% 40%'
  },
  indigo: {
    label: 'Indigo',
    color: 'hsl(238, 100%, 67%)',
    primary: '238 100% 67%',
    accent: '238 100% 67%',
    ring: '238 100% 67%',
    sidebarPrimary: '238 100% 67%',
    sidebarRing: '238 100% 67%'
  },
  pink: {
    label: 'Pink',
    color: 'hsl(330, 81%, 60%)',
    primary: '330 81% 60%',
    accent: '330 81% 60%',
    ring: '330 81% 60%',
    sidebarPrimary: '330 81% 60%',
    sidebarRing: '330 81% 60%'
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('blue');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as Theme;
    if (savedTheme && themeConfig[savedTheme]) {
      setThemeState(savedTheme);
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);
    
    // Apply theme to CSS variables
    const config = themeConfig[newTheme];
    const root = document.documentElement;
    
    root.style.setProperty('--primary', config.primary);
    root.style.setProperty('--accent', config.accent);
    root.style.setProperty('--ring', config.ring);
    root.style.setProperty('--sidebar-primary', config.sidebarPrimary);
    root.style.setProperty('--sidebar-ring', config.sidebarRing);
  };

  // Apply theme on mount and when theme changes
  useEffect(() => {
    const config = themeConfig[theme];
    const root = document.documentElement;
    
    root.style.setProperty('--primary', config.primary);
    root.style.setProperty('--accent', config.accent);
    root.style.setProperty('--ring', config.ring);
    root.style.setProperty('--sidebar-primary', config.sidebarPrimary);
    root.style.setProperty('--sidebar-ring', config.sidebarRing);
  }, [theme]);

  const availableThemes = Object.entries(themeConfig).map(([name, config]) => ({
    name: name as Theme,
    label: config.label,
    color: config.color
  }));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
