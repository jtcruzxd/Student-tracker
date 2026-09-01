import { Settings as SettingsIcon, Database, Info, Server, Moon, Sun, Palette, Type, RotateCcw } from 'lucide-react';
import { useTheme, FONTS } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const PRESET_BACKGROUNDS = [
  { label: 'Pale Gray',     value: '#F2F2F2' },
  { label: 'White',         value: '#FFFFFF' },
  { label: 'Warm Cream',    value: '#FDF8F0' },
  { label: 'Light Rose',    value: '#FDF3F3' },
  { label: 'Sage Tint',     value: '#F4F8F0' },
  { label: 'Sky Blue',      value: '#F0F4FF' },
  { label: 'Lavender',      value: '#F5F0FF' },
  { label: 'Warm Tan',      value: '#F9F5EE' },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 ${
        checked ? 'bg-primary-500' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
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

export default function Settings() {
  const { dark, bgColor, fontId, setDark, setBgColor, setFontId } = useTheme();

  const reset = () => {
    setDark(false);
    setBgColor('#F2F2F2');
    setFontId('inter');
    toast.success('Appearance reset to defaults');
  };

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Appearance ───────────────────────────────── */}
      <div className="card p-6">
        <SectionHeader icon={<Palette size={18} />} title="Appearance" sub="Customize how the app looks" />

        {/* Dark Mode */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              {dark ? <Moon size={18} className="text-gray-400" /> : <Sun size={18} className="text-amber-500" />}
              <div>
                <p className="text-sm font-medium text-gray-800">Dark Mode</p>
                <p className="text-xs text-gray-400">{dark ? 'Dark theme active' : 'Light theme active'}</p>
              </div>
            </div>
            <Toggle checked={dark} onChange={setDark} />
          </div>

          {/* Background color — only when not dark */}
          {!dark && (
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-3">
              <div className="flex items-center gap-2">
                <Palette size={15} className="text-gray-400" />
                <p className="text-sm font-medium text-gray-800">Background Color</p>
              </div>
              {/* Presets */}
              <div className="flex flex-wrap gap-2">
                {PRESET_BACKGROUNDS.map(p => (
                  <button
                    key={p.value}
                    title={p.label}
                    onClick={() => setBgColor(p.value)}
                    className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                      bgColor === p.value ? 'border-primary-500 scale-110 shadow-md' : 'border-gray-200'
                    }`}
                    style={{ background: p.value }}
                  />
                ))}
              </div>
              {/* Custom hex picker */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-500">Custom color:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={e => setBgColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setBgColor(e.target.value); }}
                    className="input w-28 font-mono text-xs"
                    maxLength={7}
                  />
                </div>
              </div>
              {/* Live preview swatch */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-16 h-6 rounded border border-gray-200" style={{ background: bgColor }} />
                <span>Preview</span>
              </div>
            </div>
          )}

          {/* Font */}
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-3">
            <div className="flex items-center gap-2">
              <Type size={15} className="text-gray-400" />
              <p className="text-sm font-medium text-gray-800">Font Family</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {FONTS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFontId(f.id)}
                  className={`px-3 py-2.5 rounded-lg border text-sm text-left transition-all ${
                    fontId === f.id
                      ? 'border-primary-400 bg-primary-50 text-primary-700 font-medium shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{ fontFamily: f.css }}
                >
                  {f.label}
                  <span className="block text-xs opacity-50 mt-0.5" style={{ fontFamily: f.css }}>
                    The quick brown fox
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Reset */}
          <div className="flex justify-end">
            <button onClick={reset} className="btn-ghost btn-sm flex items-center gap-1.5 text-gray-400 hover:text-gray-600">
              <RotateCcw size={13} /> Reset to defaults
            </button>
          </div>
        </div>
      </div>

      {/* ── System Info ──────────────────────────────── */}
      <div className="card p-6">
        <SectionHeader icon={<SettingsIcon size={18} />} title="Application Settings" sub="Configuration and system information" />
        <div className="space-y-3">
          {[
            { icon: <Server size={14} />, label: 'API Server',  value: 'PostgreSQL + Neon' },
            { icon: <Database size={14} />, label: 'Database', value: 'PostgreSQL (Prisma ORM)' },
            { icon: <Info size={14} />,    label: 'Version',   value: '1.0.0' },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 text-gray-500">{icon}<span className="text-sm">{label}</span></div>
              <span className="text-sm font-mono text-gray-500">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Attendance Guide ─────────────────────────── */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Attendance Status Guide</h3>
        <div className="space-y-2 text-sm">
          {[
            { status: 'PRESENT', color: 'badge-green', desc: 'Student attended the class.' },
            { status: 'ABSENT',  color: 'badge-red',   desc: 'Student did not attend and was not excused.' },
            { status: 'LATE',    color: 'badge-yellow', desc: 'Student arrived after the scheduled start time.' },
            { status: 'EXCUSED', color: 'badge-blue',  desc: 'Student was absent with an approved excuse.' },
          ].map(({ status, color, desc }) => (
            <div key={status} className="flex items-center gap-3">
              <span className={`${color} w-20 justify-center flex`}>{status}</span>
              <span className="text-gray-500">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Grade Guide ──────────────────────────────── */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Grade Performance Guide</h3>
        <div className="space-y-2 text-sm">
          {[
            { range: '90–100%', label: 'Excellent', color: 'badge-green' },
            { range: '80–89%',  label: 'Good',       color: 'badge-blue' },
            { range: '70–79%',  label: 'Satisfactory', color: 'badge-yellow' },
            { range: '60–69%',  label: 'Passing',    color: 'badge-purple' },
            { range: 'Below 60%', label: 'Failing',  color: 'badge-red' },
          ].map(({ range, label, color }) => (
            <div key={label} className="flex items-center gap-3">
              <span className={`${color} w-24 justify-center flex`}>{label}</span>
              <span className="text-gray-500">{range}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
