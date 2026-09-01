import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export const FONTS = [
  { id: 'inter',   label: 'Inter',     css: "'Inter', sans-serif" },
  { id: 'poppins', label: 'Poppins',   css: "'Poppins', sans-serif" },
  { id: 'roboto',  label: 'Roboto',    css: "'Roboto', sans-serif" },
  { id: 'lato',    label: 'Lato',      css: "'Lato', sans-serif" },
  { id: 'nunito',  label: 'Nunito',    css: "'Nunito', sans-serif" },
  { id: 'mono',    label: 'Monospace', css: "'Courier New', monospace" },
  { id: 'system',  label: 'System UI', css: 'system-ui, sans-serif' },
] as const;

export type FontId = typeof FONTS[number]['id'];

interface ThemeContextValue {
  dark: boolean;
  bgColor: string;
  fontId: FontId;
  setDark: (v: boolean) => void;
  setBgColor: (v: string) => void;
  setFontId: (v: FontId) => void;
}

const KEYS = { dark: 'st_dark', bg: 'st_bg_color', font: 'st_font_id' };
const ThemeContext = createContext<ThemeContextValue | null>(null);

const GFONTS: Partial<Record<FontId, string>> = {
  inter:   'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  poppins: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  roboto:  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  lato:    'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap',
  nunito:  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap',
};

function loadFont(id: FontId) {
  const url = GFONTS[id];
  if (!url || document.querySelector(`link[data-gfont="${id}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = url;
  link.setAttribute('data-gfont', id);
  document.head.appendChild(link);
}

// Single <style> tag we keep updated
const STYLE_ID = 'st-theme-override';

function buildDarkCSS(): string {
  return `
    body, html { background-color: #18181b !important; color: #fafafa !important; }
    .card { background-color: #27272a !important; border-color: #3f3f46 !important; box-shadow: 0 1px 4px rgba(0,0,0,0.5) !important; }
    header.bg-white, header { background-color: #1c1c1f !important; border-color: #3f3f46 !important; }
    .bg-white { background-color: #27272a !important; }
    .bg-gray-50 { background-color: #1e1e22 !important; }
    .bg-gray-100 { background-color: #2a2a2e !important; }
    thead, thead tr { background-color: #1e1e22 !important; }
    .hover\\:bg-gray-50:hover { background-color: #323237 !important; }
    .input, select.input, textarea.input { background-color: #3f3f46 !important; border-color: #52525b !important; color: #fafafa !important; }
    .input::placeholder { color: #71717a !important; }
    select option { background-color: #3f3f46 !important; color: #fafafa !important; }
    .text-gray-900 { color: #fafafa !important; }
    .text-gray-800 { color: #e4e4e7 !important; }
    .text-gray-700 { color: #d4d4d8 !important; }
    .text-gray-600 { color: #a1a1aa !important; }
    .text-gray-500 { color: #71717a !important; }
    .text-gray-400 { color: #52525b !important; }
    .label { color: #d4d4d8 !important; }
    .table-td { color: #d4d4d8 !important; }
    .table-th { color: #71717a !important; }
    .border-gray-100, .border-gray-200, .border-b, .border-t { border-color: #3f3f46 !important; }
    .divide-y > * + * { border-color: #3f3f46 !important; }
    .btn-secondary { background-color: #3f3f46 !important; border-color: #52525b !important; color: #e4e4e7 !important; }
    .btn-secondary:hover { background-color: #52525b !important; }
    .btn-ghost { color: #a1a1aa !important; }
    .btn-ghost:hover { background-color: #3f3f46 !important; }
    .shadow-sm { box-shadow: 0 1px 3px rgba(0,0,0,0.5) !important; }
    .rounded-xl.border { border-color: #3f3f46 !important; }
  `;
}

function buildLightCSS(bg: string): string {
  return `body, html { background-color: ${bg} !important; }`;
}

function applyCSS(dark: boolean, bg: string) {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = dark ? buildDarkCSS() : buildLightCSS(bg);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark,    setDarkState] = useState<boolean>(() => localStorage.getItem(KEYS.dark) === 'true');
  const [bgColor, setBgState]   = useState<string>(() => localStorage.getItem(KEYS.bg) ?? '#F2F2F2');
  const [fontId,  setFontState] = useState<FontId>(() => (localStorage.getItem(KEYS.font) ?? 'inter') as FontId);

  useEffect(() => {
    loadFont(fontId);
    const font = FONTS.find(f => f.id === fontId)?.css ?? FONTS[0].css;
    document.body.style.fontFamily = font;
    applyCSS(dark, bgColor);
  }, [dark, bgColor, fontId]);

  const setDark    = (v: boolean) => { setDarkState(v);    localStorage.setItem(KEYS.dark, String(v)); };
  const setBgColor = (v: string)  => { setBgState(v);      localStorage.setItem(KEYS.bg, v); };
  const setFontId  = (v: FontId)  => { setFontState(v);    localStorage.setItem(KEYS.font, v); };

  return (
    <ThemeContext.Provider value={{ dark, bgColor, fontId, setDark, setBgColor, setFontId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
