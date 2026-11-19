import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Database,
  Layers,
  ShieldCheck,
  Smartphone,
  Users,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ScaniaLogoEmblem, ScaniaTruckIllustration } from '../components/ScaniaVisuals';
import { DemoDisclaimerStrip } from '../components/ui/Feedback';
import { useAuth } from '../contexts/AuthContext';
import { usePlatformData } from '../contexts/PlatformDataContext';
import { formatCurrency } from '../lib/supabase';

export const LandingPage: React.FC = () => {
  const { isPreviewMode, user, isAdmin } = useAuth();
  const { siteSettings, plans } = usePlatformData();

  return (
    <div className="min-h-screen bg-[#EEF4FB] text-slate-900 flex flex-col">
      <DemoDisclaimerStrip />

      {/* Top Bar Contract: 3 clean zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-[#061844]/95 backdrop-blur-md border-b border-blue-900/60 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <Link to="/" className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <ScaniaLogoEmblem className="w-8 h-8" />
            <span className="font-display font-bold text-lg tracking-tight">{siteSettings.site_name}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-blue-100">
            <Link to="/user" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              User Portal
            </Link>
            <Link to="/admin" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Admin Panel
            </Link>
            <Link to="/setup" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Supabase Setup
            </Link>
            <Link to="/login" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              Sign In
            </Link>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={user ? (isAdmin ? '/admin' : '/user') : '/user'}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1E6FFF] hover:bg-blue-500 text-white rounded-xl transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <span>{user ? 'Open Portal' : 'Launch Demo'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Split */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center bg-white rounded-3xl p-7 sm:p-10 border border-blue-100 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-[#1250C4] mb-3">
                <span>Demo Simulation Environment</span>
                <span aria-hidden="true">·</span>
                <span>{isPreviewMode ? 'Preview Mode (Supabase Unconfigured)' : 'Supabase Live Cloud'}</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#061844] leading-[1.12] tracking-tight text-balance">
                Scania Fleet Investment Demo & Control Center
              </h1>

              <p className="text-slate-600 text-base mt-4 leading-relaxed max-w-xl">
                A complete two-portal simulation platform featuring a mobile-first investor dashboard and a real-time
                executive admin console powered by Supabase Auth, PostgreSQL RLS, and Realtime sync.
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-7">
                <Link
                  to="/user"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1250C4] hover:bg-[#0D3DA0] text-white font-semibold text-sm transition-colors min-h-[44px]"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Open User Panel (/user)</span>
                </Link>
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#061844] hover:bg-[#0C2668] text-white font-semibold text-sm transition-colors min-h-[44px]"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Open Admin Panel (/admin)</span>
                </Link>
                <Link
                  to="/setup"
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0B2A6B] font-semibold text-sm transition-colors min-h-[44px]"
                >
                  <Database className="w-4 h-4" />
                  <span>SQL & Setup</span>
                </Link>
              </div>

              {isPreviewMode && (
                <div className="mt-6 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 leading-relaxed">
                    <span className="font-semibold">Supabase Preview Mode:</span> Environment variables{' '}
                    <code className="font-mono bg-amber-100 px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
                    <code className="font-mono bg-amber-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> are not set yet.
                    You can inspect the complete User & Admin UI now, then visit{' '}
                    <Link to="/setup" className="underline font-semibold">
                      /setup
                    </Link>{' '}
                    to connect your live Supabase PostgreSQL database.
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-6 rounded-3xl overflow-hidden relative min-h-[300px] lg:min-h-[400px] shadow-md border border-blue-900/20 bg-[#061844]">
              <ScaniaTruckIllustration variant="hero" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#041236]/90 via-[#041236]/25 to-transparent p-7 flex flex-col justify-end text-white">
                <div className="flex items-center gap-2.5 mb-2">
                  <ScaniaLogoEmblem className="w-9 h-9" />
                  <div>
                    <p className="font-display font-bold text-xl tracking-tight">SCANIA Together We Grow</p>
                    <p className="text-xs text-blue-200">Simulated Heavy Logistics & Fleet Portfolio Demo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4-column summary strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <div className="bg-white rounded-2xl p-5 border border-blue-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1250C4] flex items-center justify-center mb-3">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Mobile-First User Portal</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                4-tab thumb navigation (Home, Team, My Product, Mine) with live demo balance and plans.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-blue-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Role-Protected Admin</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Separate /admin authentication gated by server-verified user_roles and audit logging.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-blue-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Realtime Cloud Sync</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Plan prices, banners, notices, and ticket replies broadcast immediately via Supabase Realtime.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-blue-100">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">3-Level Demo Network</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Simulated referral tracking across Level 1 (25%), Level 2 (2%), and Level 3 (1%) tiers.
              </p>
            </div>
          </div>

          {/* Preview of Active Demo Plans */}
          <div className="mt-10 bg-white rounded-3xl p-6 sm:p-8 border border-blue-100">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display text-xl font-bold text-[#061844]">Available Demo Fleet Plans</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Simulated fleet tiers synchronized from Supabase plans table
                </p>
              </div>
              <Link
                to="/user/products"
                className="text-sm font-semibold text-[#1250C4] hover:underline inline-flex items-center gap-1"
              >
                <span>Explore All Demo Plans</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans.slice(0, 3).map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/50 flex flex-col"
                >
                  <div className="h-36 bg-[#071A47] relative overflow-hidden">
                    <ScaniaTruckIllustration variant="compact" className="w-full h-full" />
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">{plan.title}</h3>
                      {plan.badge && (
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{plan.description}</p>
                    <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block">Demo Price</span>
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {formatCurrency(plan.demo_price, siteSettings.currency_symbol)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Daily Sim.</span>
                        <span className="font-mono font-bold text-emerald-700 tabular-nums">
                          {formatCurrency(plan.daily_income, siteSettings.currency_symbol)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Validity</span>
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {plan.validity_days} Days
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#061844] text-blue-100 border-t border-blue-900/60 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{siteSettings.footer_text}</span>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <Link to="/login" className="hover:text-white">
              User Login
            </Link>
            <Link to="/register" className="hover:text-white">
              Register
            </Link>
            <Link to="/admin/login" className="hover:text-white">
              Admin Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
