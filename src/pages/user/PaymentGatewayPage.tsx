import React, { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  Check,
  Copy,
  HeartHandshake,
  Lightbulb,
  PiggyBank,
  Send,
  ShoppingBag,
  Smartphone,
  WalletCards,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { callApiWithFallback, getStoredServerToken, supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Feedback';

interface BrandTheme {
  name: 'bKash' | 'Nagad';
  bnName: string;
  logo: string;
  pageBg: string;
  headerBg: string;
  cardBorder: string;
  softBg: string;
  softBorder: string;
  accentText: string;
  accentBg: string;
  buttonBg: string;
  focusRing: string;
  highlightBorder: string;
}

const BRAND_THEMES: Record<'bKash' | 'Nagad', BrandTheme> = {
  bKash: {
    name: 'bKash',
    bnName: 'বিকাশ',
    logo: '/assets/aistudio/8ce1d5fe9f0ec0eba7f121e646ca7720_5b38b9ee.png',
    pageBg: 'bg-[#FFF3F8]',
    headerBg: 'bg-gradient-to-r from-[#B80D57] via-[#E2136E] to-[#F02A80]',
    cardBorder: 'border-[#FBCFE8]',
    softBg: 'bg-[#FDF0F5]',
    softBorder: 'border-[#F8BBD0]',
    accentText: 'text-[#C80F5E]',
    accentBg: 'bg-[#E2136E]',
    buttonBg: 'bg-gradient-to-r from-[#C80F5E] to-[#E2136E] hover:from-[#B20B52] hover:to-[#CE1062]',
    focusRing: 'focus:ring-[#E2136E]',
    highlightBorder: 'border-[#E2136E]',
  },
  Nagad: {
    name: 'Nagad',
    bnName: 'নগদ',
    logo: '/assets/aistudio/images__1___11__2dbd9c22.jpeg',
    pageBg: 'bg-[#FFF6F0]',
    headerBg: 'bg-gradient-to-r from-[#D93814] via-[#EC461A] to-[#F47920]',
    cardBorder: 'border-[#FED7AA]',
    softBg: 'bg-[#FFF2EA]',
    softBorder: 'border-[#FDBA8C]',
    accentText: 'text-[#D93814]',
    accentBg: 'bg-[#EC461A]',
    buttonBg: 'bg-gradient-to-r from-[#D93814] to-[#F47920] hover:from-[#C13010] hover:to-[#E06815]',
    focusRing: 'focus:ring-[#EC461A]',
    highlightBorder: 'border-[#EC461A]',
  },
};

export const PaymentGatewayPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, loading, refreshProfile } = useAuth();
  const { siteSettings, refreshAll } = usePlatformData();
  const { showToast } = useToast();

  const amountParam = Number(searchParams.get('amount') || 500);
  const amount = Number.isFinite(amountParam) && amountParam >= 500 ? amountParam : 500;
  const methodParam: 'bKash' | 'Nagad' = searchParams.get('method') === 'Nagad' ? 'Nagad' : 'bKash';
  const theme = BRAND_THEMES[methodParam];

  const merchantNumber =
    methodParam === 'Nagad'
      ? siteSettings.deposit_nagad_number || '01995616092'
      : siteSettings.deposit_bkash_number || '01995616092';

  const [trxId, setTrxId] = useState('');
  const [copiedField, setCopiedField] = useState<'number' | 'amount' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedPending, setSubmittedPending] = useState(false);

  const handleCopy = async (value: string, field: 'number' | 'amount') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      showToast(field === 'number' ? 'নাম্বার কপি হয়েছে' : 'পরিমাণ কপি হয়েছে', 'success');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      showToast('কপি করা যায়নি', 'error');
    }
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTrx = trxId.trim();

    if (cleanTrx.length < 4) {
      showToast('অনুগ্রহ করে সঠিক লেনদেন আইডি (TrxID) লিখুন', 'error');
      return;
    }

    const sessionToken = getStoredServerToken();

    if (!user || !profile) {
      showToast('অনুগ্রহ করে প্রথমে লগইন করুন', 'warning');
      navigate('/login');
      return;
    }

    setSubmitting(true);
    try {
      const canCallBackend = Boolean(sessionToken && !sessionToken.startsWith('local:')) || Boolean(supabase && user);
      if (!canCallBackend) {
        throw new Error('পেমেন্ট জমা দিতে অনুগ্রহ করে আবার লগইন করুন।');
      }

      await callApiWithFallback(
        '/api/user/request-transaction',
        'POST',
        {
          type: 'deposit_demo',
          amount,
          method: methodParam,
          reference_code: cleanTrx,
        },
        async () => {
          const { data, error } = await supabase!.rpc('request_demo_transaction', {
            p_type: 'deposit_demo',
            p_amount: amount,
            p_method: methodParam,
            p_reference_code: cleanTrx,
          });
          if (error) throw new Error(error.message);
          return (data as Record<string, unknown>) || { ok: true };
        }
      );

      await Promise.all([refreshProfile(), refreshAll()]);
      showToast(
        'আপনার পেমেন্ট জমা দেয়া সফল হয়েছে সব তথ্য সঠিক থাকলে সাথে সাথেই একাউন্টে জমা হয়ে যাবে',
        'success'
      );
      setSubmittedPending(true);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-[100dvh] ${theme.pageBg} flex items-center justify-center text-sm font-semibold text-slate-600`}>
        লোড হচ্ছে...
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  // Dedicated Post-Submit Notification Page with bKash / Nagad Logo
  if (submittedPending) {
    return (
      <div className={`min-h-[100dvh] ${theme.pageBg} flex flex-col`}>
        <header className={`h-14 ${theme.headerBg} text-white px-4 flex items-center justify-between shrink-0 shadow-md`}>
          <button
            type="button"
            onClick={() => navigate('/user')}
            className="p-2 rounded-lg hover:bg-white/15"
            aria-label="হোমে ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src={theme.logo}
              alt={theme.name}
              className="w-7 h-7 rounded-lg object-cover border border-white/60 bg-white"
            />
            <div className="text-left">
              <p className="text-sm font-bold leading-tight">{theme.name} ({theme.bnName})</p>
              <p className="text-[10px] text-white/85 leading-tight">পেমেন্ট নোটিফিকেশন</p>
            </div>
          </div>
          <div className="w-9" />
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className={`w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-xl border-2 ${theme.cardBorder} text-center space-y-5`}>
            {/* Selected bKash / Nagad Brand Logo */}
            <div className="flex flex-col items-center gap-2">
              <div className={`p-1.5 rounded-2xl ${theme.softBg} border ${theme.softBorder} shadow-xs`}>
                <img
                  src={theme.logo}
                  alt={theme.name}
                  className="w-20 h-20 rounded-xl object-cover bg-white"
                />
              </div>
              <span className={`text-xs font-extrabold uppercase tracking-wider ${theme.accentText}`}>
                {theme.name} সেন্ড মানি
              </span>
            </div>

            {/* Green Confirmation Check Circle (matching reference screenshot) */}
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/25">
              <Check className="w-9 h-9" strokeWidth={3} />
            </div>

            {/* Exact Required Confirmation Message */}
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-relaxed px-1">
              আপনার পেমেন্ট জমা দেয়া সফল হয়েছে সব তথ্য সঠিক থাকলে সাথে সাথেই একাউন্টে জমা হয়ে যাবে
            </h1>

            <div className={`rounded-2xl p-3.5 ${theme.softBg} border ${theme.softBorder} text-xs text-slate-700 space-y-1.5 tabular-nums`}>
              <div className="flex justify-between">
                <span className="text-slate-500">পেমেন্ট মাধ্যম</span>
                <strong className={theme.accentText}>{theme.name} ({theme.bnName})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">রিচার্জ পরিমাণ</span>
                <strong className="text-slate-900">৳{amount.toLocaleString('en-US')}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">লেনদেন আইডি (TrxID)</span>
                <strong className="text-slate-900">{trxId.trim()}</strong>
              </div>
            </div>

            <div className="pt-1 space-y-2.5">
              <button
                type="button"
                onClick={() => navigate('/user/transactions')}
                className={`w-full py-3.5 rounded-xl ${theme.buttonBg} text-white font-bold text-sm shadow-md transition-all`}
              >
                লেনদেনের ইতিহাস দেখুন
              </button>
              <button
                type="button"
                onClick={() => navigate('/user')}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-colors"
              >
                হোমে ফিরে যান
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const walletActions = [
    { label: 'সেন্ড মানি', icon: Send, highlight: true, color: theme.accentText },
    { label: 'মোবাইল রিচার্জ', icon: Smartphone, highlight: false, color: 'text-emerald-600' },
    { label: 'ক্যাশ আউট', icon: Banknote, highlight: false, color: 'text-teal-600' },
    { label: 'পেমেন্ট', icon: ShoppingBag, highlight: false, color: 'text-orange-500' },
    { label: 'অ্যাড মানি', icon: WalletCards, highlight: false, color: 'text-purple-600' },
    { label: 'পে বিল', icon: Lightbulb, highlight: false, color: 'text-slate-600' },
    { label: 'সেভিংস', icon: PiggyBank, highlight: false, color: 'text-pink-600' },
    { label: 'ডোনেশন', icon: HeartHandshake, highlight: false, color: 'text-rose-500' },
  ];

  return (
    <div className={`min-h-[100dvh] ${theme.pageBg} text-slate-900 flex flex-col`}>
      {/* Brand-Colored Gateway Header */}
      <header className={`h-14 ${theme.headerBg} text-white px-4 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-md`}>
        <button
          type="button"
          onClick={() => navigate('/user/recharge')}
          className="p-2 rounded-lg hover:bg-white/15"
          aria-label="ফিরে যান"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <img
            src={theme.logo}
            alt={theme.name}
            className="w-7 h-7 rounded-lg object-cover border border-white/60 bg-white"
          />
          <div className="text-left">
            <p className="text-sm font-bold leading-tight">{theme.name} পেমেন্ট</p>
            <p className="text-[10px] text-white/85 leading-tight">সেন্ড মানি · {theme.bnName}</p>
          </div>
        </div>
        <div className="w-9" />
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-4 space-y-4 pb-8">
        {/* Top Centered Brand Logo & Send Money Header (Matching Reference Screenshot) */}
        <section className={`bg-white rounded-2xl p-5 shadow-xs border ${theme.cardBorder} text-center space-y-3`}>
          <div className="flex flex-col items-center gap-1.5">
            <img
              src={theme.logo}
              alt={theme.name}
              className={`w-16 h-16 rounded-2xl object-cover border-2 ${theme.highlightBorder} shadow-sm bg-white`}
            />
            <span className={`text-sm font-extrabold ${theme.accentText}`}>{theme.name}</span>
          </div>

          <div>
            <h1 className={`text-2xl font-extrabold ${theme.accentText}`}>সেন্ড মানি</h1>
            <p className={`text-xs font-bold ${theme.accentText} mt-0.5`}>
              "সেন্ড মানি" পদ্ধতিটি ব্যবহার করুন
            </p>
          </div>

          <div className="text-left space-y-2 pt-1 text-xs text-slate-700">
            <div className="flex items-start gap-2.5">
              <span className={`w-5 h-5 rounded-full ${theme.accentBg} text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5`}>
                1
              </span>
              <span>ট্রান্সফার ব্যর্থতা এড়াতে অনুগ্রহ করে সঠিক প্রাপকের অ্যাকাউন্ট নম্বরটি কপি করুন।</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className={`w-5 h-5 rounded-full ${theme.accentBg} text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5`}>
                2
              </span>
              <span>ট্রান্সফার ব্যর্থতা এড়াতে অনুগ্রহ করে সঠিক পেমেন্টের পরিমাণটি কপি করুন।</span>
            </div>
          </div>
        </section>

        {/* Payment Channel Selected Badge */}
        <section className="space-y-2">
          <p className="text-sm font-semibold text-slate-800">পেমেন্ট চ্যানেল</p>
          <div className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border-2 ${theme.highlightBorder} shadow-2xs`}>
            <span className={`w-4 h-4 rounded-full border-2 ${theme.highlightBorder} flex items-center justify-center`}>
              <span className={`w-2 h-2 rounded-full ${theme.accentBg}`} />
            </span>
            <img
              src={theme.logo}
              alt={theme.name}
              className="w-8 h-8 rounded-md object-cover border border-slate-100 bg-white"
            />
            <span className={`text-base font-bold ${theme.accentText}`}>{theme.name}</span>
          </div>
        </section>

        {/* Step 1 Card */}
        <section className={`bg-white rounded-2xl p-5 shadow-xs border ${theme.cardBorder} space-y-4`}>
          <div>
            <p className={`text-base font-bold ${theme.accentText}`}>ধাপ 1.</p>
            <h2 className="text-base font-extrabold text-slate-900 mt-1">
              সুবিধাভোগী অ্যাকাউন্ট নম্বরটি কপি করুন
            </h2>
          </div>

          <div className="space-y-3 pt-1">
            {/* Number Row */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">সংখ্যা</span>
              <div className="flex items-center gap-2.5">
                <span className="text-base font-bold text-slate-900 tabular-nums">{merchantNumber}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(merchantNumber, 'number')}
                  className={`p-1.5 rounded-lg ${theme.softBg} ${theme.accentText} hover:opacity-80`}
                  aria-label="নাম্বার কপি করুন"
                >
                  {copiedField === 'number' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Amount Row */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">পরিমাণ</span>
              <div className="flex items-center gap-2.5">
                <span className="text-base font-bold text-slate-900 tabular-nums">
                  {amount.toLocaleString('en-US')}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(String(amount), 'amount')}
                  className={`p-1.5 rounded-lg ${theme.softBg} ${theme.accentText} hover:opacity-80`}
                  aria-label="পরিমাণ কপি করুন"
                >
                  {copiedField === 'amount' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Send Money Notice Strip */}
          <div className={`${theme.softBg} border ${theme.softBorder} rounded-xl py-2.5 px-3 text-center text-xs text-slate-700`}>
            এই <strong className={theme.accentText}>{theme.name.toUpperCase()}</strong> নাম্বারে শুধুমাত্র{' '}
            <strong className={theme.accentText}>সেন্ড মানি</strong> গ্রহণ করা হয়
          </div>

          {/* 8-Icon Visual App Guide */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {walletActions.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg text-center ${
                    item.highlight
                      ? `border-2 ${theme.highlightBorder} ${theme.softBg} shadow-2xs`
                      : 'border border-transparent'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full bg-white flex items-center justify-center mb-1 ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-700 leading-tight">{item.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Step 2 Card + Confirm Form */}
        <form onSubmit={handleConfirmPayment} className="space-y-4">
          <section className={`bg-white rounded-2xl p-5 shadow-xs border ${theme.cardBorder} space-y-3`}>
            <div>
              <p className={`text-base font-bold ${theme.accentText}`}>ধাপ 2.</p>
              <h2 className="text-base font-extrabold text-slate-900 mt-1 leading-snug">
                রিচার্জ সম্পূর্ণ করতে অনুগ্রহ করে লেনদেন আইডি লিখুন
              </h2>
            </div>

            <input
              type="text"
              required
              value={trxId}
              onChange={(e) => setTrxId(e.target.value)}
              placeholder="10-সংখ্যার লেনদেন আইডি"
              className={`w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${theme.focusRing} min-h-[48px]`}
            />
          </section>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-3.5 rounded-xl ${theme.buttonBg} text-white font-bold text-base shadow-md transition-all min-h-[50px] disabled:opacity-60`}
          >
            {submitting ? 'জমা হচ্ছে...' : 'জমা দিন'}
          </button>
        </form>
      </main>
    </div>
  );
};
