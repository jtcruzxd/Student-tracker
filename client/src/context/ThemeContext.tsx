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

// ─── Color Schemes ─────────────────────────────────────────────────────────
export const COLOR_SCHEMES = [
  {
    id: 'default',
    label: 'Rose & Sage',
    description: 'Original palette',
    bg: '#F2F2F2',
    swatches: ['#D96868', '#F2F2F2', '#91AE6E', '#689D4B'],
  },
  {
    id: 'ocean',
    label: 'Ocean Blue',
    description: 'Calm & professional',
    bg: '#EFF6FF',
    swatches: ['#1D4ED8', '#EFF6FF', '#38BDF8', '#0EA5E9'],
  },
  {
    id: 'forest',
    label: 'Forest',
    description: 'Natural & fresh',
    bg: '#F0FDF4',
    swatches: ['#16A34A', '#F0FDF4', '#4ADE80', '#15803D'],
  },
  {
    id: 'sunset',
    label: 'Sunset',
    description: 'Warm & energetic',
    bg: '#FFF7ED',
    swatches: ['#EA580C', '#FFF7ED', '#FB923C', '#C2410C'],
  },
  {
    id: 'lavender',
    label: 'Lavender',
    description: 'Soft & elegant',
    bg: '#F5F3FF',
    swatches: ['#7C3AED', '#F5F3FF', '#A78BFA', '#6D28D9'],
  },
  {
    id: 'slate',
    label: 'Slate',
    description: 'Clean & minimal',
    bg: '#F8FAFC',
    swatches: ['#475569', '#F8FAFC', '#94A3B8', '#334155'],
  },
  {
    id: 'cherry',
    label: 'Cherry Blossom',
    description: 'Soft pink tones',
    bg: '#FFF0F3',
    swatches: ['#E11D48', '#FFF0F3', '#FB7185', '#BE123C'],
  },
  {
    id: 'dark',
    label: 'Midnight',
    description: 'Dark mode palette',
    bg: '#18181b',
    swatches: ['#6366F1', '#18181b', '#818CF8', '#4F46E5'],
  },
] as const;

export type SchemeId = typeof COLOR_SCHEMES[number]['id'];

// ─── Sidebar accent colors per scheme ──────────────────────────────────────
const SCHEME_ACCENT: Record<SchemeId, string> = {
  default:  '#D96868',
  ocean:    '#1D4ED8',
  forest:   '#16A34A',
  sunset:   '#EA580C',
  lavender: '#7C3AED',
  slate:    '#475569',
  cherry:   '#E11D48',
  dark:     '#6366F1',
};

interface ThemeContextValue {
  dark: boolean;
  schemeId: SchemeId;
  bgImage: string | null;   // base64 data URL or null
  fontId: FontId;
  accentColor: string;
  setDark: (v: boolean) => void;
  setSchemeId: (v: SchemeId) => void;
  setBgImage: (v: string | null) => void;
  setFontId: (v: FontId) => void;
}

const KEYS = {
  dark:     'st_dark',
  scheme:   'st_scheme',
  bgImage:  'st_bg_image',
  font:     'st_font_id',
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ─── Google Fonts loader ────────────────────────────────────────────────────
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

// ─── CSS injector ───────────────────────────────────────────────────────────
const STYLE_ID = 'st-theme-override';

function buildDarkCSS(accent: string): string {
  return `
    body, html {
      background-color: #18181b !important;
      color: #fafafa !important;
    }
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
    /* active nav item uses scheme accent */
    [style*="background: ${accent}"] { background: ${accent} !important; }
  `;
}

function buildLightCSS(): string {
  // Background is handled via inline styles in Layout.tsx — nothing to inject
  return '';
}

function applyCSS(dark: boolean, scheme: typeof COLOR_SCHEMES[number]) {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = dark
    ? buildDarkCSS(scheme.swatches[0])
    : buildLightCSS();
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark,     setDarkState]    = useState<boolean>(   () => localStorage.getItem(KEYS.dark)   === 'true');
  const [schemeId, setSchemeState]  = useState<SchemeId>(  () => (localStorage.getItem(KEYS.scheme) ?? 'default') as SchemeId);
  const [bgImage,  setBgImageState] = useState<string | null>(() => {
    try { return localStorage.getItem(KEYS.bgImage) ?? null; } catch { return null; }
  });
  const [fontId,   setFontState]    = useState<FontId>(    () => (localStorage.getItem(KEYS.font)  ?? 'inter') as FontId);

  const scheme = COLOR_SCHEMES.find(s => s.id === schemeId) ?? COLOR_SCHEMES[0];
  const accentColor = SCHEME_ACCENT[schemeId];

  useEffect(() => {
    loadFont(fontId);
    document.body.style.fontFamily = FONTS.find(f => f.id === fontId)?.css ?? FONTS[0].css;
    applyCSS(dark, scheme);
  }, [dark, schemeId, bgImage, fontId]);

  const setDark     = (v: boolean)        => { setDarkState(v);       localStorage.setItem(KEYS.dark,   String(v)); };
  const setSchemeId = (v: SchemeId)       => { setSchemeState(v);     localStorage.setItem(KEYS.scheme, v); };
  const setBgImage  = (v: string | null)  => {
    setBgImageState(v);
    if (v) { try { localStorage.setItem(KEYS.bgImage, v); } catch { toast_warn(); } }
    else localStorage.removeItem(KEYS.bgImage);
  };
  const setFontId   = (v: FontId)         => { setFontState(v);       localStorage.setItem(KEYS.font,   v); };

  return (
    <ThemeContext.Provider value={{ dark, schemeId, bgImage, fontId, accentColor, setDark, setSchemeId, setBgImage, setFontId }}>
      {children}
    </ThemeContext.Provider>
  );
}

function toast_warn() {
  // background image too large for localStorage — silent fail
  console.warn('Background image too large to persist. It will reset on reload.');
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
