import React, { useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell,
  Box,
  CheckCheck,
  ExternalLink,
  Headphones,
  Home,
  Send,
  User,
  Users,
  X,
} from 'lucide-react';
import { ScaniaLogoEmblem } from '../../components/ScaniaVisuals';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { ConfirmModal } from '../../components/ui/Feedback';
import { formatDateTime } from '../../lib/supabase';
import { ActiveUserModal, UserActionModals } from './UserModals';

export interface UserOutletContext {
  openModal: (modal: ActiveUserModal) => void;
}

export const UserLayout: React.FC = () => {
  const { user, profile, loading, signOut, justLoggedIn, clearJustLoggedIn } = useAuth();
  const { siteSettings, notifications, readNotificationIds, markNotificationRead } = usePlatformData();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveUserModal>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read && !readNotificationIds.includes(n.id)).length,
    [notifications, readNotificationIds]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E9F1FC] flex items-center justify-center">
        <div className="text-center space-y-2">
          <ScaniaLogoEmblem className="w-12 h-12 mx-auto animate-pulse" />
          <p className="text-sm font-semibold text-[#061844]">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { to: '/user', label: 'হোম', icon: Home, end: true },
    ...(siteSettings.show_team_tab ? [{ to: '/user/team', label: 'টিম', icon: Users, end: false }] : []),
    { to: '/user/products', label: 'আমার প্ল্যান', icon: Box, end: false },
    { to: '/user/mine', label: 'প্রোফাইল', icon: User, end: false },
  ];

  const handleLogout = async () => {
    await signOut();
    setConfirmLogout(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#E9F1FC] text-slate-900 flex flex-col pb-20 md:pb-8">
      {/* Top App Bar (Top-left 3-line Menu icon removed as requested) */}
      <header className="sticky top-0 z-30 h-14 bg-gradient-to-r from-[#04184E] via-[#0A2E7E] to-[#1145B5] text-white shadow-md">
        <div className="max-w-5xl mx-auto h-full px-3 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-[44px]">
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      isActive ? 'bg-white text-[#061844]' : 'text-blue-100 hover:bg-white/10'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <Link to="/user" className="flex items-center gap-2 whitespace-nowrap shrink-0">
            {siteSettings.logo_url ? (
              <img
                src={siteSettings.logo_url}
                alt="SCANIA"
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover border border-white/50"
              />
            ) : (
              <ScaniaLogoEmblem className="w-8 h-8" />
            )}
            <span className="font-display font-extrabold text-lg tracking-wider uppercase">SCANIA</span>
          </Link>

          <div className="flex items-center gap-1 min-w-[44px] justify-end">
            <button
              type="button"
              onClick={() => setNotifOpen(true)}
              className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
              aria-label="নোটিফিকেশন"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center border border-[#0B2A6B] tabular-nums">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 pt-3 pb-6">
        <Outlet context={{ openModal: setActiveModal } satisfies UserOutletContext} />
      </main>

      {/* Mobile Bottom 4-Tab Navigation Bar */}
      <nav
        aria-label="ব্যবহারকারী নেভিগেশন"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-blue-100 shadow-[0_-6px_22px_rgba(8,30,82,0.12)] pb-safe"
      >
        <div className={`grid items-center h-16 ${navItems.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center h-full min-h-[44px] gap-0.5 transition-colors ${
                    isActive ? 'text-[#1250C4]' : 'text-[#0A2558]/70 hover:text-[#0A2558]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`px-3 py-1 rounded-xl transition-all ${
                        isActive
                          ? 'bg-gradient-to-b from-blue-100 to-blue-50 text-[#1250C4] shadow-xs'
                          : ''
                      }`}
                    >
                      <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <span className={`text-[11px] tracking-tight whitespace-nowrap ${isActive ? 'font-bold' : 'font-semibold'}`}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Notifications Slide-Over Drawer */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={() => setNotifOpen(false)} />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col z-10">
            <div className="px-5 py-4 bg-gradient-to-r from-[#04184E] to-[#1145B5] text-white flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-base">নোটিফিকেশন বার</h2>
                <p className="text-[11px] text-blue-200 tabular-nums">{unreadCount} টি অপঠিত আপডেট</p>
              </div>
              <button
                type="button"
                onClick={() => setNotifOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10"
                aria-label="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-10">এখনো কোনো নোটিফিকেশন নেই।</p>
              ) : (
                notifications.map((n) => {
                  const read = n.is_read || readNotificationIds.includes(n.id);
                  return (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`p-3.5 rounded-xl cursor-pointer transition-colors ${
                        read ? 'bg-white opacity-75' : 'bg-blue-50/70 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs font-bold text-slate-900">{n.title}</h3>
                        {read ? (
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <span className="text-[10px] font-semibold text-[#1250C4] shrink-0">নতুন</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                      <span className="block text-[10px] text-slate-400 mt-1.5 tabular-nums">
                        {formatDateTime(n.created_at)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post-Login Welcome Notification Modal */}
      {justLoggedIn && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-blue-100 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#04184E] via-[#0B2E7A] to-[#1354C9] text-white p-5 text-center relative">
              <button
                type="button"
                onClick={clearJustLoggedIn}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20"
                aria-label="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
              <ScaniaLogoEmblem className="w-12 h-12 mx-auto mb-2" />
              <h2 className="font-display text-lg font-extrabold">SCANIA তে স্বাগতম</h2>
              <p className="text-xs text-blue-100 mt-1">
                তাৎক্ষণিক আপডেট ও সাপোর্টের জন্য আমাদের অফিশিয়াল কমিউনিটিতে যোগ দিন।
              </p>
            </div>

            <div className="p-5 space-y-3">
              <a
                href={siteSettings.telegram_link || 'https://t.me/'}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#0B2A6B] to-[#1D63DC] hover:opacity-95 text-white text-sm font-bold flex items-center justify-between gap-2 shadow-md"
              >
                <span className="flex items-center gap-2.5 text-left">
                  <Send className="w-4 h-4 shrink-0" />
                  <span>বিস্তারিত জানতে গ্রুপে জয়েন করুন</span>
                </span>
                <ExternalLink className="w-4 h-4 opacity-80 shrink-0" />
              </a>

              <button
                type="button"
                onClick={() => {
                  clearJustLoggedIn();
                  setActiveModal('support');
                }}
                className="w-full py-3 px-4 rounded-2xl bg-[#EEF4FF] hover:bg-blue-100 text-[#061844] border border-blue-200 text-sm font-bold flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2.5 text-left">
                  <Headphones className="w-4 h-4 text-[#1250C4] shrink-0" />
                  <span>যেকোনো প্রয়োজনে কাস্টমার সাপোর্টে যোগাযোগ করুন</span>
                </span>
                <ExternalLink className="w-4 h-4 text-[#1250C4] shrink-0" />
              </button>

              <button
                type="button"
                onClick={clearJustLoggedIn}
                className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                হোমে প্রবেশ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Modals */}
      <UserActionModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        onOpenModal={(m) => setActiveModal(m)}
      />

      <ConfirmModal
        open={confirmLogout}
        title="লগআউট"
        message="আপনি কি নিশ্চিত যে আপনি লগআউট করতে চান?"
        confirmLabel="লগআউট"
        cancelLabel="বাতিল"
        destructive
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
};
