import { Settings as SettingsIcon, Database, Info, Server, Moon, Sun, Palette, Type, RotateCcw } from 'lucide-react';
import { useTheme, FONTS } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const PRESET_BACKGROUNDS = [
  { label: 'Pale Gray',  value: '#F2F2F2' },
  { label: 'White',      value: '#FFFFFF' },
  { label: 'Warm Cream', value: '#FDF8F0' },
  { label: 'Light Rose', value: '#FDF3F3' },
  { label: 'Sage Tint',  value: '#F4F8F0' },
  { label: 'Sky Blue',   value: '#F0F4FF' },
  { label: 'Lavender',   value: '#F5F0FF' },
  { label: 'Warm Tan',   value: '#F9F5EE' },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        width: '44px',
        height: '24px',
        borderRadius: '9999px',
        backgroundColor: checked ? '#D96868' : '#d1d5db',
        transition: 'background-color 0.2s',
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        outline: 'none',
      }}
    >
      <span style={{
        position: 'absolute',
        top: '3px',
        left: checked ? '23px' : '3px',
        width: '18px',
        height: '18px',
        borderRadius: '9999px',
        backgroundColor: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
      }} />
    </button>
  );
}

export default function Settings() {
  const { dark, bgColor, fontId, setDark, setBgColor, setFontId } = useTheme();

  const handleBgInput = (v: string) => {
    setBgColor(v); // always update — show whatever is typed
  };

  const reset = () => {
    setDark(false);
    setBgColor('#F2F2F2');
    setFontId('inter');
    toast.success('Appearance reset to defaults');
  };

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Appearance ───────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#fdf3f3' }}>
            <Palette size={18} style={{ color: '#D96868' }} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Appearance</h2>
            <p className="text-xs text-gray-500">Customize how the app looks</p>
          </div>
        </div>

        <div className="space-y-4">

          {/* Dark Mode */}
          <div className="flex items-center justify-between p-4 rounded-xl"
            style={{ background: dark ? '#27272a' : '#f9fafb', border: '1px solid', borderColor: dark ? '#3f3f46' : '#e5e7eb' }}>
            <div className="flex items-center gap-3">
              {dark
                ? <Moon size={18} style={{ color: '#a78bfa' }} />
                : <Sun size={18} style={{ color: '#f59e0b' }} />}
              <div>
                <p className="text-sm font-medium text-gray-800">Dark Mode</p>
                <p className="text-xs text-gray-400">{dark ? 'Dark theme active' : 'Light theme active'}</p>
              </div>
            </div>
            <Toggle checked={dark} onChange={setDark} />
          </div>

          {/* Background Color — light mode only */}
          {!dark && (
            <div className="p-4 rounded-xl space-y-3"
              style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div className="flex items-center gap-2">
                <Palette size={14} className="text-gray-400" />
                <p className="text-sm font-medium text-gray-800">Background Color</p>
              </div>

              {/* Preset swatches */}
              <div className="flex flex-wrap gap-2">
                {PRESET_BACKGROUNDS.map(p => (
                  <button
                    key={p.value}
                    title={p.label}
                    onClick={() => setBgColor(p.value)}
                    style={{
                      width: '32px', height: '32px',
                      borderRadius: '8px',
                      background: p.value,
                      border: bgColor.toLowerCase() === p.value.toLowerCase()
                        ? '2.5px solid #D96868'
                        : '2px solid #d1d5db',
                      transform: bgColor.toLowerCase() === p.value.toLowerCase() ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.15s',
                      cursor: 'pointer',
                      boxShadow: bgColor.toLowerCase() === p.value.toLowerCase() ? '0 0 0 3px rgba(217,104,104,0.25)' : 'none',
                    }}
                  />
                ))}
              </div>

              {/* Color picker + hex input */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-500 whitespace-nowrap">Custom:</label>
                <input
                  type="color"
                  value={bgColor.length === 7 && bgColor.startsWith('#') ? bgColor : '#F2F2F2'}
                  onChange={e => setBgColor(e.target.value)}
                  style={{ width: '36px', height: '36px', padding: '2px', borderRadius: '8px', border: '1px solid #d1d5db', cursor: 'pointer', background: 'white' }}
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={e => handleBgInput(e.target.value)}
                  className="input font-mono"
                  style={{ width: '100px' }}
                  maxLength={7}
                  placeholder="#F2F2F2"
                />
              </div>

              {/* Live preview */}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <div style={{
                  width: '64px', height: '28px', borderRadius: '6px',
                  background: bgColor, border: '1px solid #d1d5db',
                }} />
                <span>Live preview</span>
              </div>
            </div>
          )}

          {/* Font */}
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
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <SettingsIcon size={18} className="text-gray-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Application Settings</h2>
            <p className="text-xs text-gray-500">System information</p>
          </div>
        </div>
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
            { s: 'EXCUSED', cls: 'badge-blue',  desc: 'Student was absent with an approved excuse.' },
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
