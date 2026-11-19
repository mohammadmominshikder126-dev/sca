import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, History, X } from 'lucide-react';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { formatDateTime } from '../../lib/supabase';
import { DemoTransaction } from '../../types/database';

function getStatusBadge(status: DemoTransaction['status']) {
  if (status === 'approved' || status === 'completed') {
    return {
      label: 'সফল',
      dot: 'bg-emerald-500',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      amountColor: 'text-emerald-600',
    };
  }
  if (status === 'rejected') {
    return {
      label: 'ব্যর্থ',
      dot: 'bg-rose-500',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      amountColor: 'text-rose-600',
    };
  }
  return {
    label: 'প্রক্রিয়াধীন',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    amountColor: 'text-amber-600',
  };
}

export const TransactionHistoryContent: React.FC = () => {
  const { userTransactions, siteSettings } = usePlatformData();

  // Only Deposit & Withdraw records as requested (no summary cards)
  const records = userTransactions.filter(
    (tx) => tx.type === 'deposit_demo' || tx.type === 'withdraw_demo'
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3.5 bg-[#F4F8FF] border-b border-blue-100 flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-[#061844]">ডিপোজিট ও উত্তোলনের ইতিহাস</h3>
          <span className="text-xs font-bold text-[#1250C4] tabular-nums">
            মোট {records.length} টি
          </span>
        </div>

        {records.length === 0 ? (
          <div className="py-14 px-4 text-center space-y-2">
            <History className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">এখনো কোনো ডিপোজিট বা উত্তোলন নেই</p>
            <p className="text-xs text-slate-400">আপনার সকল ডিপোজিট ও উত্তোলনের তথ্য এখানে দেখা যাবে।</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {records.map((tx) => {
              const st = getStatusBadge(tx.status);
              const isDeposit = tx.type === 'deposit_demo';
              const formattedAmt = Number(tx.amount || 0).toLocaleString('en-US', {
                minimumFractionDigits: Number(tx.amount || 0) % 1 === 0 ? 0 : 2,
                maximumFractionDigits: 2,
              });

              return (
                <div key={tx.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isDeposit ? 'bg-blue-50 text-[#1250C4]' : 'bg-indigo-50 text-indigo-600'
                      }`}
                    >
                      {isDeposit ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#061844] truncate">
                          {isDeposit ? 'ডিপোজিট' : 'উত্তোলন'} · {tx.method}
                        </p>
                      </div>
                      {tx.reference_code && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5 tabular-nums">
                          {isDeposit ? `TrxID: ${tx.reference_code}` : tx.reference_code}
                        </p>
                      )}
                      {tx.admin_note && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5 tabular-nums">{tx.admin_note}</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                        {formatDateTime(tx.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <p className={`text-sm font-extrabold tabular-nums ${st.amountColor}`}>
                      {isDeposit ? '+' : '-'}
                      {siteSettings.currency_symbol}
                      {formattedAmt}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${st.badge}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                      <span>{st.label}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export const TransactionHistoryPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-[#E9F1FC] flex flex-col">
      <header className="h-14 bg-gradient-to-r from-[#04184E] via-[#0A2E7E] to-[#1145B5] text-white px-4 sm:px-6 flex items-center justify-between shadow-md shrink-0 sticky top-0 z-20">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-white/10 text-sm font-bold min-h-[40px]"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>ফিরে যান</span>
        </button>
        <h1 className="font-display font-bold text-base">লেনদেনের ইতিহাস</h1>
        <button
          type="button"
          onClick={() => navigate('/user')}
          className="p-2 rounded-xl hover:bg-white/10"
          aria-label="বন্ধ করুন"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <TransactionHistoryContent />
      </main>
    </div>
  );
};
