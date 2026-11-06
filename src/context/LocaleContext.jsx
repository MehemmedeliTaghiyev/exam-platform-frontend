import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { LANGS, messages } from '../i18n/messages';

const KEY = 'exampulse_lang';
const LocaleContext = createContext();

function readLang() {
  try {
    const value = localStorage.getItem(KEY);
    if (value === 'en' || value === 'ru' || value === 'az') return value;
  } catch {
    /* ignore */
  }
  return 'az';
}

function lookup(table, path) {
  return path.split('.').reduce((node, key) => (node && node[key] != null ? node[key] : undefined), table);
}

function fill(text, vars) {
  if (!vars) return text;
  return String(text).replace(/\{(\w+)\}/g, (_, key) => (vars[key] == null ? '' : String(vars[key])));
}

export function LocaleProvider({ children }) {
  const [lang, setLangState] = useState(readLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const value = useMemo(() => {
    const t = (path, vars) => {
      const own = lookup(messages[lang], path);
      const fallback = lookup(messages.az, path);
      const raw = own ?? fallback ?? path;
      if (typeof raw === 'string') return fill(raw, vars);
      if (raw != null) return raw;
      return path;
    };
    const setLang = (next) => {
      if (next === 'az' || next === 'en' || next === 'ru') setLangState(next);
    };
    return { lang, setLang, t, langs: LANGS };
  }, [lang]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function LanguageSwitch({ compact = false, className = '' }) {
  const { lang, setLang, langs } = useLocale();
  return (
    <div className={`flex w-full min-w-0 rounded-full bg-[var(--bg)] p-1 ring-1 ring-[var(--line)] ${className}`}>
      {langs.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setLang(item.id)}
          className={`min-h-9 min-w-0 flex-1 truncate rounded-full px-2 text-[12px] font-black ${
            lang === item.id ? 'bg-[var(--accent)] text-[#3a2200]' : 'text-[var(--muted)]'
          }`}
          aria-pressed={lang === item.id}
          title={item.name}
        >
          {compact ? item.short : item.name}
        </button>
      ))}
    </div>
  );
}
