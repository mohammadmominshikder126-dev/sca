import React, { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Bell,
  Box,
  Crown,
  Gift,
  Globe,
  History,
  Image,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Settings,
  ShieldAlert,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import { ScaniaLogoEmblem } from '../../components/ScaniaVisuals';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { ConfirmModal } from '../../components/ui/Feedback';

export const AdminLayout: React.FC = () => {
  const { user, profile, isAdmin, loading, isPreviewMode, signOut } = useAuth();
  const { siteSettings, allTransactions, allTickets, realtimeStatus } = usePlatformData();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const pendingDeposits = useMemo(
    () => allTransactions.filter((t) => t.type === 'deposit_demo' && t.status === 'pending').length,
    [allTransactions]
  );
  const pendingWithdraws = useMemo(
    () => allTransactions.filter((t) => t.type === 'withdraw_demo' && t.status === 'pending').length,
    [allTransactions]
  );
  const openTickets = useMemo(
    () => allTickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length,
    [allTickets]
  );

  // Strict RBAC gate when Supabase is configured
  if (!isPreviewMode) {
    if (loading) {
      return (
        <div className="min-h-screen bg-[#041233] text-white flex items-center justify-center">
          <div className="text-center space-y-2">
            <ScaniaLogoEmblem className="w-12 h-12 mx-auto animate-pulse" />
            <p className="text-sm text-blue-200">Verifying Administrator Session...</p>
          </div>
        </div>
      );
    }

    if (!user || !isAdmin) {
      return (
        <div className="min-h-screen bg-[#041233] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#081D4D] border border-blue-500/25 rounded-3xl p-7 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-300 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="font-display text-xl font-bold">Admin Authorization Required</h1>
            <p className="text-xs text-blue-200 mt-2 leading-relaxed">
              This portal is restricted to verified administrators in <code className="font-mono">user_roles</code>.
              Normal users cannot access admin routes or data.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                to="/admin/login"
                className="w-full py-3 rounded-xl bg-[#1E6FFF] hover:bg-blue-500 text-white text-sm font-semibold"
              >
                Sign In as Admin
              </Link>
              <Link
                to="/user"
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-blue-100 text-sm font-semibold"
              >
                Return to User Portal
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/plans', label: 'Manage Plans', icon: Box },
    { to: '/admin/deposits', label: 'Deposit Requests (Demo)', icon: ArrowDownCircle, badge: pendingDeposits },
    { to: '/admin/withdrawals', label: 'Withdraw Requests (Demo)', icon: ArrowUpCircle, badge: pendingWithdraws },
    { to: '/admin/bonus-codes', label: 'Bonus Code', icon: Gift },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/team', label: 'Team Members', icon: UsersRound },
    { to: '/admin/transactions', label: 'Transaction History', icon: History },
    { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/admin/banners', label: 'Banners & Images', icon: Image },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
    { to: '/admin/support', label: 'Support Tickets', icon: MessageSquare, badge: openTickets },
    { to: '/admin/notifications', label: 'Notifications', icon: Bell },
    { to: '/admin/site-settings', label: 'Site Settings', icon: Globe },
  ];

  const handleLogout = async () => {
    await signOut();
    setConfirmLogout(false);
    navigate('/admin/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#041335] via-[#061B4D] to-[#04112E] text-white">
      <div className="px-5 py-5 border-b border-blue-400/15 flex items-center justify-between">
        <Link to="/admin" className="flex flex-col items-center w-full text-center">
          <ScaniaLogoEmblem className="w-11 h-11 mb-1.5" />
          <span className="font-display font-extrabold text-base tracking-wider">SCANIA</span>
          <span className="mt-1 px-3 py-0.5 rounded-lg bg-[#1250C4] text-[11px] font-semibold text-white">
            Admin Panel
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute right-3 top-4 p-1.5 rounded-lg hover:bg-white/10"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-[#1E6FFF] to-[#1250C4] text-white shadow-md'
                    : 'text-blue-100/85 hover:bg-white/8 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold tabular-nums shrink-0">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            setConfirmLogout(true);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-rose-200 hover:bg-rose-500/15 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </nav>

      <div className="p-4 border-t border-blue-400/15 text-center">
        <Crown className="w-4 h-4 text-amber-400 mx-auto mb-1" />
        <p className="text-xs font-bold text-white">Scania Investment</p>
        <p className="text-[10px] text-blue-300/75 mt-0.5">Demo Control Center</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#EDF3FB] text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen shadow-xl z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 max-w-[85vw] h-full z-10 shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Navy Header Bar matching Reference 2 */}
        <header className="sticky top-0 z-20 h-16 bg-gradient-to-r from-[#061844] via-[#0B2A6B] to-[#1250C4] text-white px-4 sm:px-6 flex items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-white/10 min-h-[42px] min-w-[42px] flex items-center justify-center"
              aria-label="Open admin menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="font-display font-bold text-sm sm:text-base truncate">{siteSettings.site_name}</p>
              <p className="text-[11px] text-blue-200 truncate">Admin Control Panel · Demo Simulation</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-blue-100">
              <span
                className={`w-2 h-2 rounded-full ${
                  realtimeStatus === 'connected'
                    ? 'bg-emerald-400'
                    : realtimeStatus === 'preview'
                    ? 'bg-amber-400'
                    : 'bg-sky-300'
                }`}
              />
              <span>
                {realtimeStatus === 'connected'
                  ? 'Supabase Realtime Live'
                  : realtimeStatus === 'preview'
                  ? 'Preview Mode'
                  : 'Connecting...'}
              </span>
            </span>

            <Link
              to="/admin/notifications"
              className="relative p-2 rounded-xl hover:bg-white/10 transition-colors"
              aria-label="Admin notifications"
            >
              <Bell className="w-5 h-5" />
              {pendingDeposits + pendingWithdraws + openTickets > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-[10px] font-bold flex items-center justify-center">
                  {pendingDeposits + pendingWithdraws + openTickets}
                </span>
              )}
            </Link>

            <Link
              to="/user"
              className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/20 text-xs font-semibold transition-colors whitespace-nowrap"
            >
              User View
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-white/15">
              <div className="w-8 h-8 rounded-full bg-[#1E6FFF] flex items-center justify-center font-bold text-xs">
                {(profile?.full_name || 'A').slice(0, 1).toUpperCase()}
              </div>
              <span className="hidden md:inline text-xs font-semibold">{profile?.full_name || 'Admin'}</span>
            </div>
          </div>
        </header>

        {isPreviewMode && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Preview Mode:</strong> Supabase is not configured yet. Connect your Supabase URL & keys to save changes and test live Realtime sync.
            </span>
            <Link to="/setup" className="font-bold underline">
              Open Setup Guide →
            </Link>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>

        <footer className="bg-[#061844] text-blue-200 px-6 py-3.5 text-xs flex flex-wrap items-center justify-between gap-3">
          <span>{siteSettings.footer_text}</span>
          <span className="font-semibold text-amber-300">Scania Admin Panel · Demo Simulation</span>
        </footer>
      </div>

      <ConfirmModal
        open={confirmLogout}
        title="Exit Admin Control Panel"
        message="Are you sure you want to sign out of the Administrator session?"
        confirmLabel="Logout"
        destructive
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
};
