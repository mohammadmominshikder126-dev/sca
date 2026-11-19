import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  Check,
  CheckCircle2,
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
import { callApiWithFallback, supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Feedback';

export const PaymentGatewayPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isPreviewMode, refreshProfile } = useAuth();
  const { siteSettings, refreshAll } = usePlatformData();
  const { showToast } = useToast();

  const amountParam = Number(searchParams.get('amount') || 500);
  const amount = Number.isFinite(amountParam) && amountParam >= 500 ? amountParam : 500;
  const methodParam = searchParams.get('method') === 'Nagad' ? 'Nagad' : 'bKash';

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

    const hasSessionToken =
      typeof window !== 'undefined' && Boolean(window.sessionStorage.getItem('scania_server_token'));
    if ((isPreviewMode && !hasSessionToken) || !user) {
      showToast('অনুগ্রহ করে প্রথমে লগইন করুন', 'warning');
      navigate('/login');
      return;
    }

    if (cleanTrx.length < 4) {
      showToast('অনুগ্রহ করে সঠিক লেনদেন আইডি (TrxID) লিখুন', 'error');
      return;
    }

    setSubmitting(true);
    try {
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
          const { error } = await supabase!.from('demo_transactions').insert({
            user_id: user!.id,
            type: 'deposit_demo',
            amount,
            method: methodParam,
            reference_code: cleanTrx,
            status: 'pending',
            admin_note: 'আপনার পেমেন্টটি পর্যালোচনায় রয়েছে',
          });
          if (error) throw new Error(error.message);
          return { ok: true };
        }
      );

      await Promise.all([refreshProfile(), refreshAll()]);
      showToast('আপনার পেমেন্টটি পর্যালোচনায় রয়েছে', 'info');
      setSubmittedPending(true);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedPending) {
    return (
      <div className="min-h-[100dvh] bg-[#F5F7FA] flex flex-col">
        <header className="h-14 bg-[#20242D] text-white px-4 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => navigate('/user')}
            className="p-2 rounded-lg hover:bg-white/10"
            aria-label="হোমে ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold leading-tight">GoPay</p>
            <p className="text-[11px] text-slate-300 leading-tight">পেমেন্ট স্ট্যাটাস</p>
          </div>
          <div className="w-9" />
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-md border border-slate-100 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">
              আপনার পেমেন্টটি পর্যালোচনায় রয়েছে
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed tabular-nums">
              পরিমাণ: <strong>৳{amount.toLocaleString('en-US')}</strong> · মাধ্যম: <strong>{methodParam}</strong> · TrxID:{' '}
              <strong>{trxId.trim()}</strong>
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              অ্যাডমিন প্যানেল থেকে কনফার্ম করার সাথে সাথে টাকা আপনার ব্যালেন্সে যোগ হয়ে যাবে।
            </p>
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={() => navigate('/user/transactions')}
                className="w-full py-3 rounded-xl bg-[#1A63EB] hover:bg-[#1552C5] text-white font-bold text-sm"
              >
                লেনদেনের ইতিহাস দেখুন
              </button>
              <button
                type="button"
                onClick={() => navigate('/user')}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm"
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
    { label: 'সেন্ড মানি', icon: Send, highlight: true, color: 'text-[#E2136E]' },
    { label: 'মোবাইল রিচার্জ', icon: Smartphone, highlight: false, color: 'text-emerald-600' },
    { label: 'ক্যাশ আউট', icon: Banknote, highlight: false, color: 'text-teal-600' },
    { label: 'পেমেন্ট', icon: ShoppingBag, highlight: false, color: 'text-orange-500' },
    { label: 'অ্যাড মানি', icon: WalletCards, highlight: false, color: 'text-purple-600' },
    { label: 'পে বিল', icon: Lightbulb, highlight: false, color: 'text-slate-600' },
    { label: 'সেভিংস', icon: PiggyBank, highlight: false, color: 'text-pink-600' },
    { label: 'ডোনেশন', icon: HeartHandshake, highlight: false, color: 'text-rose-500' },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#F5F7FA] text-slate-900 flex flex-col">
      {/* Dark GoPay Cashier Header */}
      <header className="h-14 bg-[#20242D] text-white px-4 flex items-center justify-between shrink-0 sticky top-0 z-20">
        <button
          type="button"
          onClick={() => navigate('/user/recharge')}
          className="p-2 rounded-lg hover:bg-white/10"
          aria-label="ফিরে যান"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold leading-tight">GoPay</p>
          <p className="text-[11px] text-slate-300 leading-tight">cashier.gopay</p>
        </div>
        <div className="w-9" />
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-4 space-y-4 pb-8">
        {/* Payment Channel Badge */}
        <section className="space-y-2">
          <p className="text-sm font-medium text-slate-800">পেমেন্ট চ্যানেল</p>
          <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-[#2563EB] shadow-2xs">
            <span className="w-4 h-4 rounded-full border-2 border-[#2563EB] flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
            </span>
            {methodParam === 'bKash' ? (
              <img
                src="/assets/aistudio/8ce1d5fe9f0ec0eba7f121e646ca7720_5b38b9ee.png"
                alt="bKash"
                className="w-8 h-8 rounded-md object-cover border border-pink-100 bg-white"
              />
            ) : (
              <img
                src="/assets/aistudio/images__1___11__2dbd9c22.jpeg"
                alt="Nagad"
                className="w-8 h-8 rounded-md object-cover border border-orange-100 bg-white"
              />
            )}
            <span className="text-base font-bold text-slate-900">{methodParam}</span>
          </div>
        </section>

        {/* Step 1 Card */}
        <section className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-4">
          <div>
            <p className="text-base font-bold text-[#1D4ED8]">ধাপ 1.</p>
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
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700"
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
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700"
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
          <div className="bg-[#FDF2F2] rounded-xl py-2.5 px-3 text-center text-xs text-slate-700">
            এই <strong className="text-rose-600">{methodParam.toUpperCase()}</strong> নাম্বারে শুধুমাত্র{' '}
            <strong className="text-rose-600">সেন্ড মানি</strong> গ্রহণ করা হয়
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
                      ? 'border-2 border-red-500 bg-white shadow-2xs'
                      : 'border border-transparent'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center mb-1 ${item.color}`}>
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
          <section className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-3">
            <div>
              <p className="text-base font-bold text-[#1D4ED8]">ধাপ 2.</p>
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
              className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1A63EB] min-h-[48px]"
            />
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-[#1A63EB] hover:bg-[#1552C5] text-white font-bold text-base shadow-md transition-colors min-h-[50px] disabled:opacity-60"
          >
            {submitting ? 'জমা হচ্ছে...' : 'পেমেন্ট নিশ্চিত করুন'}
          </button>
        </form>
      </main>
    </div>
  );
};
