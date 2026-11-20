import React, { useMemo, useState } from 'react';
import { Check, History, Search, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { callApiWithFallback, formatCurrency, formatDateTime, getStoredAdminToken, supabase } from '../../lib/supabase';
import { DemoTransaction } from '../../types/database';
import { EmptyState, useToast } from '../../components/ui/Feedback';

export const TransactionsView: React.FC<{ mode: 'deposits' | 'withdrawals' | 'all' }> = ({ mode }) => {
  const { isPreviewMode } = useAuth();
  const { allTransactions, siteSettings, refreshAll } = usePlatformData();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'completed'>('all');
  const [processing, setProcessing] = useState<{
    tx: DemoTransaction;
    decision: 'approved' | 'rejected';
  } | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    return allTransactions.filter((t) => {
      if (mode === 'deposits' && t.type !== 'deposit_demo') return false;
      if (mode === 'withdrawals' && t.type !== 'withdraw_demo') return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const hay = `${t.profiles?.full_name || ''} ${t.profiles?.scania_id || ''} ${t.method} ${t.reference_code} ${t.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allTransactions, mode, statusFilter, query]);

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processing) return;
    const hasAdminToken = Boolean(getStoredAdminToken());
    if (isPreviewMode && !hasAdminToken) {
      showToast('Connect Supabase to process demo requests', 'warning');
      setProcessing(null);
      return;
    }

    setSubmitting(true);
    try {
      await callApiWithFallback(
        '/api/admin/transactions/process',
        'POST',
        {
          transactionId: processing.tx.id,
          decision: processing.decision,
          adminNote,
        },
        async () => {
          const { error } = await supabase!.rpc('admin_process_transaction', {
            p_tx_id: processing.tx.id,
            p_decision: processing.decision,
            p_admin_note: adminNote,
          });
          if (error) throw new Error(error.message);
          return { ok: true };
        }
      );
      await refreshAll();
      showToast(`Request marked as ${processing.decision}`, 'success');
      setProcessing(null);
      setAdminNote('');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === 'deposits'
      ? 'Deposit Requests (Demo)'
      : mode === 'withdrawals'
      ? 'Withdraw Requests (Demo)'
      : 'All Simulated Transactions';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-[#061844]">{title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Simulated ledger only — no real payment gateway or banking integration.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-blue-100 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by user, Scania ID, method, or reference..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs min-h-[40px]"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {(['all', 'pending', 'approved', 'rejected', 'completed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                statusFilter === st ? 'bg-white text-[#061844] shadow-xs' : 'text-slate-600'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-blue-100 shadow-xs overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<History className="w-5 h-5" />}
              title="No Matching Transactions"
              description="Adjust your search filter or wait for new simulated requests."
            />
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 text-left">
                <th className="py-3 px-4 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Amount</th>
                <th className="py-3 px-4 font-semibold">Method / Ref</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Admin Note</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">{tx.profiles?.full_name || 'Demo Member'}</p>
                    <p className="text-[11px] font-mono text-slate-400">{tx.profiles?.scania_id || tx.user_id.slice(0, 8)}</p>
                  </td>
                  <td className="py-3 px-4 capitalize font-medium text-slate-700">{tx.type.replace('_', ' ')}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 tabular-nums">
                    {formatCurrency(tx.amount, siteSettings.currency_symbol)}
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-slate-800">{tx.method}</p>
                    {tx.reference_code && <p className="text-[11px] font-mono text-slate-400">{tx.reference_code}</p>}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-bold capitalize ${
                        tx.status === 'approved' || tx.status === 'completed'
                          ? 'text-emerald-600'
                          : tx.status === 'rejected'
                          ? 'text-rose-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 max-w-[180px] truncate">{tx.admin_note || '—'}</td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDateTime(tx.created_at)}</td>
                  <td className="py-3 px-4 text-right">
                    {tx.status === 'pending' && (tx.type === 'deposit_demo' || tx.type === 'withdraw_demo') ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setProcessing({ tx, decision: 'approved' })}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold inline-flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProcessing({ tx, decision: 'rejected' })}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold inline-flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {processing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form onSubmit={handleDecision} className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-display font-bold text-base text-[#061844] capitalize">
              {processing.decision} {processing.tx.type.replace('_', ' ')}
            </h3>
            <p className="text-xs text-slate-600">
              Amount:{' '}
              <strong className="font-mono">{formatCurrency(processing.tx.amount, siteSettings.currency_symbol)}</strong>
              {processing.tx.reference_code ? (
                <>
                  {' '}
                  · TrxID/Ref: <strong className="font-mono">{processing.tx.reference_code}</strong>
                </>
              ) : null}
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Note</label>
              <input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Optional note shown to user"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProcessing(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`px-4 py-2 rounded-xl text-white text-xs font-semibold ${
                  processing.decision === 'approved' ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                {submitting ? 'Saving...' : `Confirm ${processing.decision}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
