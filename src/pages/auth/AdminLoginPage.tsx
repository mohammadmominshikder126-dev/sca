import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { ScaniaLogoEmblem } from '../../components/ScaniaVisuals';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Feedback';

export const AdminLoginPage: React.FC = () => {
  const { adminSignIn, isPreviewMode } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.trim() || !password) {
      setErrorMsg('Please enter admin email and password.');
      return;
    }

    setSubmitting(true);
    const res = await adminSignIn(email, password);
    setSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
      return;
    }

    showToast('Authenticated to Scania Admin Control Panel', 'success');
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-[#041233] flex flex-col justify-center px-4 py-10 text-white">
      <div className="w-full max-w-md mx-auto">
        <div className="flex flex-col items-center mb-6">
          <Link to="/" className="flex items-center gap-3 mb-2">
            <ScaniaLogoEmblem className="w-12 h-12" />
            <div>
              <span className="font-display font-extrabold text-2xl tracking-tight block leading-none">SCANIA</span>
              <span className="text-[11px] font-semibold text-blue-300 uppercase tracking-wider">
                Admin Control Panel
              </span>
            </div>
          </Link>
        </div>

        <div className="bg-[#081D4D] border border-blue-500/25 rounded-3xl shadow-2xl p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#1250C4] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-white">Secure Admin Authentication</h1>
              <p className="text-xs text-blue-200/80">Role-verified gateway · Normal users are blocked</p>
            </div>
          </div>

          {isPreviewMode && (
            <div className="mt-4 p-3.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-xs text-amber-100 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <div>
                Supabase is unconfigured. You can{' '}
                <Link to="/admin" className="font-bold underline text-white">
                  preview the Admin Dashboard UI
                </Link>{' '}
                or sign in with your configured server Admin credentials.
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-400/40 text-xs text-rose-200 font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-xs font-semibold text-blue-100 mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-blue-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@scania.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#041233] border border-blue-400/25 text-white placeholder:text-blue-300/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-pass" className="block text-xs font-semibold text-blue-100 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-blue-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#041233] border border-blue-400/25 text-white placeholder:text-blue-300/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-blue-300 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#1E6FFF] hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors min-h-[46px] disabled:opacity-60"
            >
              <span>{submitting ? 'Verifying Admin Role...' : 'Sign In to Admin Panel'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-blue-500/20 flex items-center justify-between text-xs text-blue-200/80">
            <Link to="/login" className="hover:text-white">
              User Portal Login
            </Link>
            <Link to="/setup" className="hover:text-white">
              Admin Setup Guide
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
