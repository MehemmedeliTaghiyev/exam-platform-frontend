import { createContext, useContext, useEffect, useState } from 'react';
import { isNativeApp } from '../lib/runtime';

const ThemeContext = createContext();
const CHOICE_KEY = 'exampulse_theme_choice';

function readChoice() {
  try {
    const value = localStorage.getItem(CHOICE_KEY);
    return value === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function ThemeProvider({ children }) {
  const [choice, setChoice] = useState(readChoice);
  const dark = choice !== 'light';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try {
      localStorage.setItem(CHOICE_KEY, dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
    if (!isNativeApp()) return undefined;
    import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      StatusBar.setBackgroundColor({ color: dark ? '#0F1419' : '#FDFBF7' }).catch(() => {});
      StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
    }).catch(() => {});
    return undefined;
  }, [dark, choice]);

  const toggle = () => setChoice(dark ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
