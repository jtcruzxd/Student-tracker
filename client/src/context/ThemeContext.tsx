import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

const FONTS = [
  { id: 'inter',    label: 'Inter',      css: "'Inter', sans-serif" },
  { id: 'poppins',  label: 'Poppins',    css: "'Poppins', sans-serif" },
  { id: 'roboto',   label: 'Roboto',     css: "'Roboto', sans-serif" },
  { id: 'lato',     label: 'Lato',       css: "'Lato', sans-serif" },
  { id: 'nunito',   label: 'Nunito',     css: "'Nunito', sans-serif" },
  { id: 'mono',     label: 'Monospace',  css: "'Courier New', monospace" },
  { id: 'system',   label: 'System UI',  css: "system-ui, sans-serif" },
] as const;

export type FontId = typeof FONTS[number]['id'];

interface ThemeSettings {
  dark: boolean;
  bgColor: string;       // custom background hex (light mode only)
  fontId: FontId;
}

interface ThemeContextValue extends ThemeSettings {
  fonts: typeof FONTS;
  setDark: (v: boolean) => void;
  setBgColor: (v: string) => void;
  setFontId: (v: FontId) => void;
}

const DEFAULTS: ThemeSettings = {
  dark: false,
  bgColor: '#F2F2F2',
  fontId: 'inter',
};

const KEYS = { dark: 'st_dark', bg: 'st_bg_color', font: 'st_font_id' };

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Load Google Fonts link tags dynamically
const GFONTS: Partial<Record<FontId, string>> = {
  poppins: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  roboto:  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  lato:    'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap',
  nunito:  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap',
  inter:   'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
};

function loadFont(fontId: FontId) {
  const url = GFONTS[fontId];
  if (!url) return;
  if (document.querySelector(`link[data-gfont="${fontId}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = url;
  link.setAttribute('data-gfont', fontId);
  document.head.appendChild(link);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark,    setDarkState]  = useState<boolean>(() => localStorage.getItem(KEYS.dark) === 'true');
  const [bgColor, setBgState]    = useState<string>( () => localStorage.getItem(KEYS.bg)   ?? DEFAULTS.bgColor);
  const [fontId,  setFontState]  = useState<FontId>( () => (localStorage.getItem(KEYS.font) ?? DEFAULTS.fontId) as FontId);

  const applyTheme = (d: boolean, bg: string, fid: FontId) => {
    const root = document.documentElement;
    const body = document.body;
    const font = FONTS.find(f => f.id === fid)?.css ?? FONTS[0].css;
    loadFont(fid);
    body.style.fontFamily = font;

    if (d) {
      root.classList.add('dark-mode');
      body.style.backgroundColor = '#1a1a1a';
      body.style.color = '#f0f0f0';
    } else {
      root.classList.remove('dark-mode');
      body.style.backgroundColor = bg;
      body.style.color = '';
    }
  };

  // Apply on mount and whenever settings change
  useEffect(() => { applyTheme(dark, bgColor, fontId); }, [dark, bgColor, fontId]);

  const setDark = (v: boolean) => {
    setDarkState(v);
    localStorage.setItem(KEYS.dark, String(v));
  };
  const setBgColor = (v: string) => {
    setBgState(v);
    localStorage.setItem(KEYS.bg, v);
  };
  const setFontId = (v: FontId) => {
    setFontState(v);
    localStorage.setItem(KEYS.font, v);
  };

  return (
    <ThemeContext.Provider value={{ dark, bgColor, fontId, fonts: FONTS, setDark, setBgColor, setFontId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}

export { FONTS };
