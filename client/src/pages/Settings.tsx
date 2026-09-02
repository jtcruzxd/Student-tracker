import { useRef } from 'react';
import {
  Settings as SettingsIcon, Database, Info, Server,
  Moon, Sun, Palette, Type, RotateCcw, Image, X,
} from 'lucide-react';
import { useTheme, FONTS, COLOR_SCHEMES } from '../context/ThemeContext';
import toast from 'react-hot-toast';

// ─── Toggle ────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative', display: 'inline-flex',
        width: '44px', height: '24px', borderRadius: '9999px',
        backgroundColor: checked ? '#D96868' : '#d1d5db',
        transition: 'background-color 0.2s',
        border: 'none', cursor: 'pointer', flexShrink: 0, outline: 'none',
      }}
    >
      <span style={{
        position: 'absolute', top: '3px',
        left: checked ? '23px' : '3px',
        width: '18px', height: '18px', borderRadius: '9999px',
        backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
      }} />
    </button>
  );
}

// ─── Section header ────────────────────────────────────────────────────────
function SectionHead({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: '#fdf3f3' }}>
        <span style={{ color: '#D96868' }}>{icon}</span>
      </div>
      <div>
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500">{sub}</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────
export default function Settings() {
  const { dark, schemeId, bgImage, fontId, setDark, setSchemeId, setBgImage, setFontId } = useTheme();
  const imgRef = useRef<HTMLInputElement>(null);

  const handleBgImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image must be under 3 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setBgImage(ev.target?.result as string);
      toast.success('Background image applied');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeBgImage = () => {
    setBgImage(null);
    toast.success('Background image removed');
  };

  const reset = () => {
    setDark(false);
    setSchemeId('default');
    setBgImage(null);
    setFontId('inter');
    toast.success('Appearance reset to defaults');
  };

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Appearance ─────────────────────────────── */}
      <div className="card p-6">
        <SectionHead icon={<Palette size={18} />} title="Appearance" sub="Color scheme, background and fonts" />

        <div className="space-y-5">

          {/* ── Dark Mode toggle ── */}
          <div className="flex items-center justify-between p-4 rounded-xl"
            style={{
              background: dark ? '#27272a' : '#f9fafb',
              border: '1px solid', borderColor: dark ? '#3f3f46' : '#e5e7eb',
            }}>
            <div className="flex items-center gap-3">
              {dark
                ? <Moon size={18} style={{ color: '#a78bfa' }} />
                : <Sun size={18} style={{ color: '#f59e0b' }} />}
              <div>
                <p className="text-sm font-medium text-gray-800">Dark Mode</p>
                <p className="text-xs text-gray-400">{dark ? 'Dark theme is active' : 'Light theme is active'}</p>
              </div>
            </div>
            <Toggle checked={dark} onChange={setDark} />
          </div>

          {/* ── Color Scheme picker ── */}
          <div className="p-4 rounded-xl space-y-3"
            style={{ background: dark ? '#1e1e22' : '#f9fafb', border: '1px solid', borderColor: dark ? '#3f3f46' : '#e5e7eb' }}>
            <div className="flex items-center gap-2">
              <Palette size={14} className="text-gray-400" />
              <p className="text-sm font-medium text-gray-800">Color Scheme</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {COLOR_SCHEMES.map(s => {
                const isActive = schemeId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => { setSchemeId(s.id); if (s.id === 'dark') setDark(true); else setDark(false); }}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '12px',
                      border: isActive ? `2px solid ${s.swatches[0]}` : '2px solid #e5e7eb',
                      background: isActive ? s.bg : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      boxShadow: isActive ? `0 0 0 3px ${s.swatches[0]}33` : 'none',
                      textAlign: 'left',
                    }}
                  >
                    {/* Mini palette swatches */}
                    <div style={{ display: 'flex', gap: '3px', marginBottom: '6px' }}>
                      {s.swatches.map((c, i) => (
                        <div key={i} style={{
                          width: '14px', height: '14px', borderRadius: '50%',
                          background: c, border: '1px solid rgba(0,0,0,0.08)',
                          flexShrink: 0,
                        }} />
                      ))}
                    </div>
                    <p style={{ fontSize: '11px', fontWeight: isActive ? 700 : 500, color: isActive ? s.swatches[0] : '#374151', lineHeight: 1.2 }}>
                      {s.label}
                    </p>
                    <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{s.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Background Image (light mode only) ── */}
          {!dark && (
            <div className="p-4 rounded-xl space-y-3"
              style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div className="flex items-center gap-2">
                <Image size={14} className="text-gray-400" />
                <p className="text-sm font-medium text-gray-800">Background Image</p>
                <span className="text-xs text-gray-400 ml-auto">max 3 MB · JPG, PNG, WebP</span>
              </div>

              {bgImage ? (
                /* Preview of current image */
                <div className="relative rounded-xl overflow-hidden" style={{ height: '120px' }}>
                  <img src={bgImage} alt="background" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => imgRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      <Image size={12} /> Change
                    </button>
                    <button
                      onClick={removeBgImage}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-500/70 hover:bg-red-500/90 transition-colors"
                    >
                      <X size={12} /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                /* Upload zone */
                <div
                  className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-primary-300 hover:bg-gray-50"
                  style={{ borderColor: '#d1d5db' }}
                  onClick={() => imgRef.current?.click()}
                >
                  <Image size={22} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Click to upload a background image</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — max 3 MB</p>
                </div>
              )}

              <input
                ref={imgRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleBgImage}
              />
              <p className="text-xs text-gray-400">
                The image fills the entire page background. Cards remain solid for readability.
              </p>
            </div>
          )}

          {/* ── Font Family ── */}
          <div className="p-4 rounded-xl space-y-3"
            style={{ background: dark ? '#1e1e22' : '#f9fafb', border: '1px solid', borderColor: dark ? '#3f3f46' : '#e5e7eb' }}>
            <div className="flex items-center gap-2">
              <Type size={14} className="text-gray-400" />
              <p className="text-sm font-medium text-gray-800">Font Family</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {FONTS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFontId(f.id)}
                  style={{
                    fontFamily: f.css,
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: fontId === f.id ? '2px solid #D96868' : '1px solid #e5e7eb',
                    background: fontId === f.id ? '#fdf3f3' : 'transparent',
                    color: fontId === f.id ? '#c44d4d' : '#374151',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: fontId === f.id ? 600 : 400 }}>{f.label}</div>
                  <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px', fontFamily: f.css }}>
                    The quick brown fox
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Reset */}
          <div className="flex justify-end">
            <button onClick={reset}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 py-1.5 px-3 rounded-lg hover:bg-gray-100 transition-colors">
              <RotateCcw size={12} /> Reset to defaults
            </button>
          </div>
        </div>
      </div>

      {/* ── System Info ─────────────────────────── */}
      <div className="card p-6">
        <SectionHead icon={<SettingsIcon size={18} />} title="Application Settings" sub="System information" />
        <div className="space-y-3">
          {[
            { icon: <Server size={14} />,   label: 'Database', value: 'PostgreSQL (Neon)' },
            { icon: <Database size={14} />, label: 'ORM',      value: 'Prisma' },
            { icon: <Info size={14} />,     label: 'Version',  value: '1.0.0' },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 text-gray-500">{icon}<span className="text-sm">{label}</span></div>
              <span className="text-sm font-mono text-gray-500">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Attendance Guide ─────────────────────── */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Attendance Status Guide</h3>
        <div className="space-y-2 text-sm">
          {[
            { s: 'PRESENT', cls: 'badge-green', desc: 'Student attended the class.' },
            { s: 'ABSENT',  cls: 'badge-red',   desc: 'Student did not attend and was not excused.' },
            { s: 'LATE',    cls: 'badge-yellow', desc: 'Student arrived after the scheduled start time.' },
            { s: 'EXCUSED', cls: 'badge-blue',   desc: 'Student was absent with an approved excuse.' },
          ].map(({ s, cls, desc }) => (
            <div key={s} className="flex items-center gap-3">
              <span className={`${cls} w-20 justify-center flex`}>{s}</span>
              <span className="text-gray-500">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Grade Guide ─────────────────────────── */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Grade Performance Guide</h3>
        <div className="space-y-2 text-sm">
          {[
            { r: '90–100%',   l: 'Excellent',    cls: 'badge-green' },
            { r: '80–89%',    l: 'Good',          cls: 'badge-blue' },
            { r: '70–79%',    l: 'Satisfactory', cls: 'badge-yellow' },
            { r: '60–69%',    l: 'Passing',       cls: 'badge-purple' },
            { r: 'Below 60%', l: 'Failing',       cls: 'badge-red' },
          ].map(({ r, l, cls }) => (
            <div key={l} className="flex items-center gap-3">
              <span className={`${cls} w-24 justify-center flex`}>{l}</span>
              <span className="text-gray-500">{r}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
