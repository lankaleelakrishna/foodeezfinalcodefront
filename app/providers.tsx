'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getToken, setAuthToken } from '../lib/auth';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeContext');
  }
  return context;
}

function getPreferredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const savedTheme = window.localStorage.getItem('theme') as ThemeMode | null;
  if (savedTheme === 'dark' || savedTheme === 'light') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    const token = getToken();
    if (token) {
      setAuthToken(token);
    }
    setTheme(getPreferredTheme());
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
    window.localStorage.setItem('theme', theme);

    // Clear any inline color/background styles on form controls so
    // they correctly follow the new theme (users may have typed and
    // inline styles could have been applied by components).
    if (typeof document !== 'undefined') {
      const els = document.querySelectorAll('input,textarea,select,button');
      els.forEach((el) => {
        try {
          (el as HTMLElement).style.color = '';
          (el as HTMLElement).style.backgroundColor = '';
        } catch (e) {
          // ignore
        }
      });
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}