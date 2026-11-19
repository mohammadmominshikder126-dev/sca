import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Crown,
  FileText,
  Gift,
  Headphones,
  Info,
  Lock,
  Power,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { formatCurrency } from '../../lib/supabase';
import { ConfirmModal, useToast } from '../../components/ui/Feedback';
import { UserOutletContext } from './UserLayout';

type MineModal = null | 'password' | 'about';

export const MineTab: React.FC = () => {
  const { openModal } = useOutletContext<UserOutletContext>();
  const { user, profile, isPreviewMode, signOut, updatePassword } = useAuth();
  const { siteSettings, bankCard, userReferrals } = usePlatformData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [mineModal, setMineModal] = useState<MineModal>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreviewMode || !user) {
      showToast('পাসওয়ার্ড পরিবর্তন করতে অনুগ্রহ করে লগইন করুন', 'warning');
      return;
    }
    if (newPassword.length < 6) {
      showToast('পাসওয়ার্ড কমপক্ষে 6 অক্ষরের হতে হবে', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('পাসওয়ার্ড দুটি মিলছে না', 'error');
      return;
    }
    setSaving(true);
    const res = await updatePassword(newPassword);
    setSaving(false);
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }
    showToast('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে', 'success');
    setNewPassword('');
    setConfirmPassword('');
    setMineModal(null);
  };

  const handleLogout = async () => {
    await signOut();
    setConfirmLogout(false);
    navigate('/login');
  };

  // Settings option removed & UID/Phone immutable as requested
  const menuRows = [
    {
      label: 'ব্যাংক কার্ড সেটআপ',
      subLabel: bankCard ? `${bankCard.wallet_method} · ${bankCard.wallet_number}` : 'Bkash / Nagad যুক্ত করুন',
      icon: CreditCard,
      color: 'text-[#1250C4] bg-blue-50',
      onClick: () => openModal('bank_card'),
    },
    {
      label: 'লেনদেনের ইতিহাস',
      subLabel: 'মোট ডিপোজিট ও উত্তোলনের বিবরণ',
      icon: FileText,
      color: 'text-[#1250C4] bg-blue-50',
      onClick: () => openModal('balance_details'),
    },
    {
      label: 'পাসওয়ার্ড পরিবর্তন',
      icon: Lock,
      color: 'text-[#1250C4] bg-blue-50',
      onClick: () => setMineModal('password'),
    },
    {
      label: 'কাস্টমার সাপোর্ট',
      icon: Headphones,
      color: 'text-[#1250C4] bg-blue-50',
      onClick: () => openModal('support'),
    },
    {
      label: 'আমাদের সম্পর্কে জানুন',
      icon: Info,
      color: 'text-[#1250C4] bg-blue-50',
      onClick: () => setMineModal('about'),
    },
  ];

  return (
    <div className="space-y-3.5">
      {/* 1. User Profile Header Card (UID & Phone are strictly read-only) */}
      <section className="rounded-3xl bg-[#0B2A6B] text-white p-5 pb-8 shadow-md relative overflow-hidden">
        <img
          src="/assets/aistudio/images__1___10__cf77dbb9.jpeg"
          alt="SCANIA Fleet"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1D4ED8]/85 via-[#2563EB]/75 to-[#061844]/90" />
        <img
          src="/assets/aistudio/images__6__8e56690a.png"
          alt="SCANIA"
          className="absolute right-3 top-3 h-8 object-contain rounded-lg shadow-xs border border-white/20"
        />
        <div className="flex items-center gap-4 relative z-10">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-[#061844] border-[3px] border-white flex items-center justify-center font-display font-extrabold text-2xl shadow-lg">
              {(profile?.full_name || 'S').slice(0, 2).toUpperCase()}
            </div>
            <CheckCircle2 className="w-6 h-6 text-[#1D4ED8] fill-white absolute -bottom-0.5 -right-0.5 rounded-full" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-extrabold truncate drop-shadow-xs">
              {profile?.full_name || 'সদস্য'}
            </h1>
            <p className="text-xs text-white/95 font-semibold mt-0.5 tabular-nums">
              UID : {profile?.scania_id || 'SCN123456'}
            </p>
            {profile?.phone && (
              <p className="text-xs text-blue-50/90 mt-0.5 tabular-nums">
                ফোন : {profile.phone}
              </p>
            )}
            <div className="inline-flex items-center gap-1.5 mt-2 px-4 py-1 rounded-full bg-gradient-to-r from-[#041747] to-[#1250C4] border border-blue-300/40 text-white text-xs font-extrabold shadow-sm">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>{profile?.tier?.replace(' Demo', '') || 'Diamond'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 3-Column Balance / Bonus / Team Summary */}
      <section className="-mt-7 relative z-10 grid grid-cols-3 gap-2.5 px-0.5">
        <div className="bg-white rounded-2xl p-3 border border-blue-100 text-center shadow-md">
          <Wallet className="w-6 h-6 text-[#1250C4] mx-auto mb-1" />
          <p className="text-sm sm:text-base font-extrabold text-emerald-600 tabular-nums truncate">
            {formatCurrency(profile?.demo_balance ?? 0, siteSettings.currency_symbol)}
          </p>
          <p className="text-[11px] font-bold text-[#061844] mt-0.5">ব্যালেন্স</p>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-blue-100 text-center shadow-md">
          <Gift className="w-6 h-6 text-rose-500 mx-auto mb-1" />
          <p className="text-sm sm:text-base font-extrabold text-emerald-600 tabular-nums truncate">
            {formatCurrency(profile?.demo_bonus ?? 0, siteSettings.currency_symbol)}
          </p>
          <p className="text-[11px] font-bold text-[#061844] mt-0.5">বোনাস</p>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-blue-100 text-center shadow-md">
          <Users className="w-6 h-6 text-[#1250C4] mx-auto mb-1" />
          <p className="text-sm sm:text-base font-extrabold text-[#1250C4] tabular-nums">
            {userReferrals.length}
          </p>
          <p className="text-[11px] font-bold text-[#061844] mt-0.5">টিম</p>
        </div>
      </section>

      {/* 3. Account Menu List */}
      <section className="bg-white rounded-2xl border border-blue-100 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {menuRows.map((row) => {
          const Icon = row.icon;
          return (
            <button
              key={row.label}
              type="button"
              onClick={row.onClick}
              className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-blue-50/50 transition-colors min-h-[54px] text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${row.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-[#061844] block truncate">{row.label}</span>
                  {row.subLabel && (
                    <span className="text-[11px] text-slate-500 block truncate tabular-nums">{row.subLabel}</span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-rose-50/60 transition-colors min-h-[54px] text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 text-rose-600">
              <Power className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-rose-600">লগআউট</span>
          </div>
          <ChevronRight className="w-4 h-4 text-rose-300" />
        </button>
      </section>

      {/* 4. Need Help Support Banner */}
      <section className="rounded-2xl bg-gradient-to-r from-[#041747] via-[#0E388F] to-[#1D63DC] text-white p-4 flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-white/15 border border-white/30 flex items-center justify-center shrink-0">
            <Headphones className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-bold text-base leading-tight">সাহায্য প্রয়োজন?</h2>
            <p className="text-xs text-blue-100 mt-0.5">আমাদের সাপোর্টে যোগাযোগ করুন</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openModal('support')}
          className="px-4 py-2 rounded-full bg-[#FACC15] hover:bg-amber-300 text-[#061844] text-xs font-extrabold shrink-0 transition-colors min-h-[38px]"
        >
          চ্যাট করুন →
        </button>
      </section>

      {/* Sub-Modals (Password Change & About Us) */}
      {mineModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-blue-100 max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-[#04184E] to-[#1145B5] text-white flex items-center justify-between">
              <h3 className="font-display font-bold text-base">
                {mineModal === 'password' && 'পাসওয়ার্ড পরিবর্তন'}
                {mineModal === 'about' && 'আমাদের সম্পর্কে জানুন'}
              </h3>
              <button
                type="button"
                onClick={() => setMineModal(null)}
                className="p-1.5 rounded-lg hover:bg-white/15"
                aria-label="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {mineModal === 'password' && (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">নতুন পাসওয়ার্ড</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="কমপক্ষে 6 অক্ষর"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">নতুন পাসওয়ার্ড নিশ্চিত করুন</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="পুনরায় পাসওয়ার্ড দিন"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm min-h-[44px]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 rounded-xl bg-[#1250C4] text-white text-sm font-semibold min-h-[44px]"
                  >
                    {saving ? 'আপডেট হচ্ছে...' : 'পাসওয়ার্ড আপডেট করুন'}
                  </button>
                </form>
              )}

              {mineModal === 'about' && (
                <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#163366] text-white border border-blue-200">
                    <img
                      src="/assets/aistudio/images__6__8e56690a.png"
                      alt="SCANIA"
                      className="h-10 object-contain shrink-0 rounded-lg"
                    />
                    <div className="min-w-0">
                      <h4 className="font-display font-bold text-sm text-white truncate">
                        {siteSettings.site_name}
                      </h4>
                      <p className="text-[11px] text-blue-100 font-semibold">
                        বিশ্বস্ত বাণিজ্যিক যানবাহন ও ইনভেস্টমেন্ট প্ল্যাটফর্ম
                      </p>
                    </div>
                  </div>

                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {siteSettings.about_text}
                  </p>

                  <div className="space-y-2">
                    <p className="font-bold text-[#061844] text-xs">অফিশিয়াল সার্টিফিকেট ও অনুমোদন</p>
                    <div className="rounded-2xl overflow-hidden border border-blue-100 bg-slate-50 shadow-xs">
                      <img
                        src="/assets/aistudio/images__1___12__95b623b4.jpeg"
                        alt="SCANIA Official Certificate"
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-1 tabular-nums">
                    <p>সাপোর্ট ইমেইল: <strong>{siteSettings.support_email}</strong></p>
                    <p>সাপোর্ট ফোন: <strong>{siteSettings.support_phone}</strong></p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
