import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, History, Wallet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { useToast } from '../../components/ui/Feedback';

export const RechargePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { plans, siteSettings, userTransactions } = usePlatformData();
  const { showToast } = useToast();

  // Dynamic sorted quick amounts from lowest to highest active plan price
  const quickAmounts = useMemo(() => {
    const activeSorted = [...plans]
      .filter((p) => p.is_active && Number(p.demo_price) >= 500)
      .sort((a, b) => Number(a.demo_price) - Number(b.demo_price));
    const uniquePrices = Array.from(new Set(activeSorted.map((p) => Number(p.demo_price))));
    return uniquePrices.length > 0 ? uniquePrices : [500, 800, 1700, 3300, 4100, 10000];
  }, [plans]);

  const [amountInput, setAmountInput] = useState<string>('');
  const [channel, setChannel] = useState<'bKash' | 'Nagad'>('bKash');

  const parsedAmount = Number(amountInput || 0);
  const isAmountValid = Number.isFinite(parsedAmount) && parsedAmount >= 500 && parsedAmount <= 1000000;

  const latestPendingDeposit = useMemo(
    () => userTransactions.find((tx) => tx.type === 'deposit_demo' && tx.status === 'pending'),
    [userTransactions]
  );

  const formattedBalance = Number(profile?.demo_balance ?? 0).toLocaleString('en-US', {
    maximumFractionDigits: 2,
  });

  const handleProceed = () => {
    if (!Number.isFinite(parsedAmount) || parsedAmount < 500) {
      showToast('সর্বনিম্ন রিচার্জ 500 টাকা', 'error');
      return;
    }
    if (parsedAmount > 1000000) {
      showToast('সর্বোচ্চ রিচার্জ 1,000,000 টাকা', 'error');
      return;
    }
    navigate(`/user/gateway?amount=${parsedAmount}&method=${encodeURIComponent(channel)}`);
  };

  return (
    <div className="min-h-[100dvh] bg-[#F3F5FA] text-slate-900 flex flex-col">
      {/* Top Bar */}
      <header className="px-4 pt-4 pb-2 flex items-center justify-between max-w-lg w-full mx-auto">
        <button
          type="button"
          onClick={() => navigate('/user')}
          className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-100 flex items-center justify-center text-slate-800 hover:bg-slate-50"
          aria-label="ফিরে যান"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h1 className="text-lg font-extrabold text-slate-900">রিচার্জ</h1>

        <button
          type="button"
          onClick={() => navigate('/user/transactions')}
          className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-50"
          aria-label="লেনদেনের ইতিহাস"
        >
          <History className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 pt-2 pb-28 space-y-4">
        {/* Available Balance Row Card */}
        <div className="bg-white rounded-2xl px-4 py-3.5 shadow-xs border border-slate-100 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">ব্যবহারযোগ্য ব্যালেন্স</span>
          <span className="text-base font-extrabold text-slate-900 tabular-nums">
            {siteSettings.currency_symbol}
            {formattedBalance}
          </span>
        </div>

        {/* Amount Input Card */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 space-y-4">
          <p className="text-sm font-medium text-slate-600">পরিমাণ</p>

          <div className="flex items-baseline gap-2 pb-3 border-b border-slate-200">
            <span className="text-2xl font-medium text-slate-400">{siteSettings.currency_symbol}</span>
            <input
              type="number"
              inputMode="numeric"
              min={500}
              max={1000000}
              placeholder="0"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full text-4xl font-semibold text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none tabular-nums"
              aria-label="রিচার্জের পরিমাণ"
            />
          </div>

          <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-[#F1F3F7] text-xs font-medium text-slate-600 tabular-nums">
            {siteSettings.currency_symbol}500 – {siteSettings.currency_symbol}1,000,000
          </div>
        </div>

        {/* Quick Amounts (All Plan Prices Sorted Lowest to Highest) */}
        <section className="space-y-2.5">
          <p className="text-sm font-medium text-slate-600">দ্রুত পরিমাণ</p>
          <div className="grid grid-cols-3 gap-2.5">
            {quickAmounts.map((val) => {
              const selected = parsedAmount === val;
              const selectedStyle =
                channel === 'bKash'
                  ? 'bg-[#FDF0F5] border-[#E2136E] text-[#C80F5E]'
                  : 'bg-[#FFF2EA] border-[#EC461A] text-[#D93814]';
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmountInput(String(val))}
                  className={`py-3 px-2 rounded-xl text-sm font-bold tabular-nums transition-all border shadow-2xs ${
                    selected
                      ? selectedStyle
                      : 'bg-white border-slate-100 text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {siteSettings.currency_symbol}
                  {val.toLocaleString('en-US')}
                </button>
              );
            })}
          </div>
        </section>

        {/* Payment Method Selection */}
        <section className="space-y-3 pt-1">
          <h2 className="text-lg font-extrabold text-slate-900">পেমেন্ট মাধ্যম</h2>

          <div className="grid grid-cols-2 gap-3">
            {/* bKash Option (Logo Pink Theme #E2136E) */}
            <button
              type="button"
              onClick={() => setChannel('bKash')}
              className={`rounded-2xl px-3.5 py-3.5 flex items-center justify-between gap-2 transition-all border-2 ${
                channel === 'bKash'
                  ? 'bg-[#FDF0F5] border-[#E2136E] shadow-sm'
                  : 'bg-white border-slate-100 hover:border-pink-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src="/assets/aistudio/8ce1d5fe9f0ec0eba7f121e646ca7720_5b38b9ee.png"
                  alt="bKash"
                  className="w-10 h-10 rounded-full object-cover shrink-0 border border-pink-200 bg-white"
                />
                <span className={`text-sm font-bold truncate ${channel === 'bKash' ? 'text-[#C80F5E]' : 'text-slate-900'}`}>
                  bKash
                </span>
              </div>
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  channel === 'bKash' ? 'border-[#E2136E] bg-[#E2136E]' : 'border-slate-300 bg-white'
                }`}
              >
                {channel === 'bKash' && <span className="w-2 h-2 rounded-full bg-white" />}
              </span>
            </button>

            {/* Nagad Option (Logo Orange-Red Theme #EC461A) */}
            <button
              type="button"
              onClick={() => setChannel('Nagad')}
              className={`rounded-2xl px-3.5 py-3.5 flex items-center justify-between gap-2 transition-all border-2 ${
                channel === 'Nagad'
                  ? 'bg-[#FFF2EA] border-[#EC461A] shadow-sm'
                  : 'bg-white border-slate-100 hover:border-orange-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src="/assets/aistudio/images__1___11__2dbd9c22.jpeg"
                  alt="Nagad"
                  className="w-10 h-10 rounded-full object-cover shrink-0 border border-orange-200 bg-white"
                />
                <span className={`text-sm font-bold truncate ${channel === 'Nagad' ? 'text-[#D93814]' : 'text-slate-900'}`}>
                  Nagad
                </span>
              </div>
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  channel === 'Nagad' ? 'border-[#EC461A] bg-[#EC461A]' : 'border-slate-300 bg-white'
                }`}
              >
                {channel === 'Nagad' && <span className="w-2 h-2 rounded-full bg-white" />}
              </span>
            </button>
          </div>

          <p className={`text-xs font-semibold ${channel === 'bKash' ? 'text-[#C80F5E]' : 'text-[#D93814]'}`}>
            {channel} পেজে পেমেন্ট নিশ্চিত করবেন।
          </p>
        </section>

        {/* Pending Deposit Strip (পেমেন্টের অপেক্ষা) */}
        {latestPendingDeposit && (
          <button
            type="button"
            onClick={() => navigate('/user/transactions')}
            className="w-full bg-white rounded-2xl px-4 py-3.5 border border-slate-100 shadow-xs flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">পেমেন্টের অপেক্ষা</p>
                <p className="text-xs font-semibold text-slate-500 tabular-nums mt-0.5">
                  {siteSettings.currency_symbol}
                  {Number(latestPendingDeposit.amount).toLocaleString('en-US')}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        )}
      </main>

      {/* Bottom Sticky Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 z-20">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={handleProceed}
            className={`w-full py-3.5 rounded-2xl text-white font-bold text-base transition-all shadow-sm ${
              channel === 'bKash'
                ? isAmountValid
                  ? 'bg-[#E2136E] hover:bg-[#C80F5E]'
                  : 'bg-[#E2136E]/60 hover:bg-[#E2136E]/75'
                : isAmountValid
                ? 'bg-[#EC461A] hover:bg-[#D93814]'
                : 'bg-[#EC461A]/60 hover:bg-[#EC461A]/75'
            }`}
          >
            এখনই রিচার্জ
          </button>
        </div>
      </footer>
    </div>
  );
};
