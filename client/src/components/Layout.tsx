import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarCheck, BookOpen,
  ClipboardList, ArrowDownUp, Settings, Menu, X,
  GraduationCap, ChevronRight, LogOut, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/grades', label: 'Grades', icon: BookOpen },
  { to: '/activities', label: 'Activities', icon: ClipboardList },
  { to: '/classes', label: 'Classes', icon: GraduationCap },
  { to: '/import-export', label: 'Import / Export', icon: ArrowDownUp },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
  };

  const getPageTitle = () => {
    const match = navItems.find(n =>
      n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to)
    );
    return match?.label ?? 'Student Tracker';
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-30 w-64 bg-white border-r border-gray-100 shadow-sm
        flex flex-col transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 leading-none">Student Tracker</div>
            <div className="text-xs text-gray-400 mt-0.5">Academic Management</div>
          </div>
          <button className="ml-auto lg:hidden text-gray-400 hover:text-gray-600 p-1" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-0.5">
            {navItems.map(({ to, label, icon: Icon, exact }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={exact}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={17} className={isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'} />
                      <span>{label}</span>
                      {isActive && <ChevronRight size={14} className="ml-auto text-blue-400" />}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 space-y-2">
          {/* Logged-in user */}
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-blue-50">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-blue-800 truncate">{user?.username}</p>
              <p className="text-xs text-blue-500">Administrator</p>
            </div>
          </div>
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
          <p className="text-xs text-gray-300 text-center pb-1">School Year 2025–2026</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-4 flex-shrink-0 shadow-sm">
          <button
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          <h1 className="text-base font-semibold text-gray-900">{getPageTitle()}</h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
