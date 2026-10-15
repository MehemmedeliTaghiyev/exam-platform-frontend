import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();
const CHOICE_KEY = 'exampulse_theme_choice';

function readChoice() {
  try {
    const value = localStorage.getItem(CHOICE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

function systemIsDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }) {
  const [choice, setChoice] = useState(readChoice);
  const [systemDark, setSystemDark] = useState(systemIsDark);
  const dark = choice ? choice === 'dark' : systemDark;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    if (choice) localStorage.setItem(CHOICE_KEY, choice);
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
