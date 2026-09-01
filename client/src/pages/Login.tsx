import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, ShieldCheck, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const LOGO_KEY    = 'st_logo_url';
const LABEL_KEY   = 'st_app_label';
const SUBLABEL_KEY = 'st_app_sublabel';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  const logoUrl  = localStorage.getItem(LOGO_KEY);
  const label    = localStorage.getItem(LABEL_KEY)    ?? 'Student Tracker';
  const sublabel = localStorage.getItem(SUBLABEL_KEY) ?? 'Academic Management';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      toast.success(`Welcome back, ${username}!`);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#F2F2F2' }}
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200/60">

          {/* ── Header band ─────────────────────────── */}
          <div className="px-8 py-10 text-center" style={{ background: '#2d2d2d' }}>
            {/* Logo */}
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center overflow-hidden shadow-lg"
              style={{ background: '#D96868' }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <GraduationCap size={30} className="text-white" />
              )}
            </div>
            <h1 className="text-xl font-bold text-white">{label}</h1>
            <p className="text-sm mt-1" style={{ color: '#91AE6E' }}>{sublabel}</p>
          </div>

          {/* ── Form ────────────────────────────────── */}
          <div className="px-8 py-8">
            <div className="flex items-center gap-2 mb-6">
              <ShieldCheck size={17} style={{ color: '#D96868' }} />
              <p className="text-sm font-medium text-gray-700">Sign in to your admin account</p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm"
                style={{ background: '#fdf3f3', border: '1px solid #f5cece', color: '#a53c3c' }}>
                <Lock size={14} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Username</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    className={`input pl-9 ${error ? 'input-error' : ''}`}
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(''); }}
                    autoFocus
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    className={`input pl-9 pr-10 ${error ? 'input-error' : ''}`}
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPass(v => !v)}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors mt-2 disabled:opacity-60"
                style={{ background: loading ? '#e07e7e' : '#D96868' }}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              Access restricted to authorized administrators only.
            </p>
          </div>
        </div>

        {/* Palette accent bar at bottom */}
        <div className="flex mt-3 rounded-lg overflow-hidden h-1.5">
          <div className="flex-1" style={{ background: '#D96868' }} />
          <div className="flex-1" style={{ background: '#F2F2F2', border: '1px solid #e5e5e5' }} />
          <div className="flex-1" style={{ background: '#91AE6E' }} />
          <div className="flex-1" style={{ background: '#689D4B' }} />
        </div>
      </div>
    </div>
  );
}
