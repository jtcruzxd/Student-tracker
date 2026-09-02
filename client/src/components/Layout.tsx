import { useState, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarCheck, BookOpen,
  ClipboardList, ArrowDownUp, Settings, Menu, X,
  GraduationCap, ChevronRight, LogOut, ShieldCheck,
  Camera, Pencil, BookMarked
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme, COLOR_SCHEMES } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/',              label: 'Dashboard',        icon: LayoutDashboard, exact: true },
  { to: '/students',      label: 'Students',          icon: Users },
  { to: '/attendance',    label: 'Attendance',        icon: CalendarCheck },
  { to: '/grades',        label: 'Grades',            icon: BookOpen },
  { to: '/activities',    label: 'Activities',        icon: ClipboardList },
  { to: '/materials',     label: 'Materials',         icon: BookMarked },
  { to: '/classes',       label: 'Classes',           icon: GraduationCap },
  { to: '/import-export', label: 'Import / Export',   icon: ArrowDownUp },
  { to: '/settings',      label: 'Settings',          icon: Settings },
];

const LOGO_KEY   = 'st_logo_url';
const LABEL_KEY  = 'st_app_label';
const SUBLABEL_KEY = 'st_app_sublabel';

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { accentColor, bgImage, schemeId } = useTheme();
  // Resolve the current background colour from the scheme
  const scheme = COLOR_SCHEMES.find(s => s.id === schemeId) ?? COLOR_SCHEMES[0];
  const fileRef = useRef<HTMLInputElement>(null);

  // Persisted branding
  const [logoUrl,   setLogoUrl]   = useState<string | null>(() => localStorage.getItem(LOGO_KEY));
  const [label,     setLabel]     = useState(() => localStorage.getItem(LABEL_KEY)  ?? 'Student Tracker');
  const [sublabel,  setSublabel]  = useState(() => localStorage.getItem(SUBLABEL_KEY) ?? 'Academic Management');
  const [editingLabel, setEditingLabel] = useState(false);
  const [draftLabel,   setDraftLabel]   = useState(label);
  const [draftSub,     setDraftSub]     = useState(sublabel);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setLogoUrl(url);
      localStorage.setItem(LOGO_KEY, url);
      toast.success('Logo updated');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const saveLabel = () => {
    const l = draftLabel.trim() || 'Student Tracker';
    const s = draftSub.trim() || 'Academic Management';
    setLabel(l); setSublabel(s);
    localStorage.setItem(LABEL_KEY, l);
    localStorage.setItem(SUBLABEL_KEY, s);
    setEditingLabel(false);
    toast.success('Branding updated');
  };

  const getPageTitle = () => {
    const match = navItems.find(n =>
      n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to)
    );
    return match?.label ?? label;
  };

  // Build the background style — image takes priority over scheme colour
  const bgStyle: React.CSSProperties = bgImage
    ? {
        backgroundImage: `url("${bgImage}")`,
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : { backgroundColor: scheme.bg };

  return (
    <div className="flex h-screen overflow-hidden" style={bgStyle}>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside className={`
        fixed top-0 left-0 h-full z-30 w-64 flex flex-col
        transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto
      `} style={{ background: '#2d2d2d' }}>

        {/* ── Logo / Branding ──────────────────────────── */}
        <div className="px-4 py-5 border-b border-white/10 flex-shrink-0">
          {editingLabel ? (
            <div className="space-y-2">
              <input
                className="w-full text-sm rounded-lg px-2.5 py-1.5 bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:ring-1 focus:ring-primary-400"
                value={draftLabel}
                onChange={e => setDraftLabel(e.target.value)}
                placeholder="App name"
                maxLength={32}
              />
              <input
                className="w-full text-xs rounded-lg px-2.5 py-1.5 bg-white/10 text-white/70 placeholder-white/30 border border-white/20 focus:outline-none focus:ring-1 focus:ring-primary-400"
                value={draftSub}
                onChange={e => setDraftSub(e.target.value)}
                placeholder="Subtitle"
                maxLength={40}
              />
              <div className="flex gap-2">
                <button onClick={saveLabel} className="flex-1 text-xs py-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors font-medium">Save</button>
                <button onClick={() => setEditingLabel(false)} className="flex-1 text-xs py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 group">
              {/* Logo circle with upload */}
              <div className="relative flex-shrink-0 group">
                <div
                  className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer"
                  style={{ background: accentColor }}
                  onClick={() => fileRef.current?.click()}
                  title="Click to upload logo"
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
                  ) : (
                    <GraduationCap size={20} className="text-white" />
                  )}
                </div>
                {/* Camera overlay on hover */}
                <div
                  className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera size={14} className="text-white" />
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>

              {/* Label text + edit button */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white leading-none truncate">{label}</div>
                <div className="text-xs mt-0.5 truncate" style={{ color: '#91AE6E' }}>{sublabel}</div>
              </div>

              {/* Edit label button */}
              <button
                onClick={() => { setDraftLabel(label); setDraftSub(sublabel); setEditingLabel(true); }}
                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/10 text-white/50 hover:text-white transition-all flex-shrink-0"
                title="Edit name"
              >
                <Pencil size={13} />
              </button>

              {/* Mobile close */}
              <button className="ml-1 lg:hidden text-white/50 hover:text-white p-1" onClick={() => setOpen(false)}>
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* ── Navigation ───────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-0.5">
            {navItems.map(({ to, label: navLabel, icon: Icon, exact }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={exact}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                      isActive
                        ? 'text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/8'
                    }`
                  }
                  style={({ isActive }) => isActive ? { background: accentColor } : {}}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={17}
                        className={isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'}
                      />
                      <span>{navLabel}</span>
                      {isActive && <ChevronRight size={14} className="ml-auto text-white/70" />}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Footer ───────────────────────────────────── */}
        <div className="px-4 py-3 border-t border-white/10 space-y-2 flex-shrink-0">
          {/* User badge */}
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg" style={{ background: 'rgba(145,174,110,0.15)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#91AE6E' }}>
              <ShieldCheck size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: '#91AE6E' }}>{user?.username}</p>
              <p className="text-xs text-white/40">Administrator</p>
            </div>
          </div>
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/8 transition-colors"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
          <p className="text-xs text-white/20 text-center pb-1">School Year 2025–2026</p>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: 'transparent' }}>
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 flex-shrink-0 shadow-sm">
          <button
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          <h1 className="text-base font-semibold text-gray-900">{getPageTitle()}</h1>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6" style={{ background: 'transparent' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
