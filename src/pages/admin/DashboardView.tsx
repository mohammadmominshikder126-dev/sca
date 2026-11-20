import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Box,
  Check,
  Crown,
  Database,
  DollarSign,
  Gift,
  Server,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { ScaniaImage, ScaniaLogoEmblem } from '../../components/ScaniaVisuals';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { callApiWithFallback, formatCurrency, formatRelativeTime, getStoredAdminToken, supabase } from '../../lib/supabase';
import { DemoTransaction } from '../../types/database';
import { useToast } from '../../components/ui/Feedback';

export const DashboardView: React.FC = () => {
  const { isPreviewMode } = useAuth();
  const {
    siteSettings,
    banners,
    allProfiles,
    allTransactions,
    allReferrals,
    auditLogs,
    realtimeStatus,
    refreshAll,
  } = usePlatformData();
  const { showToast } = useToast();

  const [chartRange, setChartRange] = useState<'7d' | '30d'>('7d');
  const [processingTx, setProcessingTx] = useState<{
    tx: DemoTransaction;
    decision: 'approved' | 'rejected';
  } | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const heroBanner = banners.find((b) => b.placement === 'home_hero' && b.is_active);

  const kpis = useMemo(() => {
    const totalDeposits = allTransactions
      .filter((t) => t.type === 'deposit_demo' && (t.status === 'approved' || t.status === 'completed'))
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalWithdraws = allTransactions
      .filter((t) => t.type === 'withdraw_demo' && (t.status === 'approved' || t.status === 'completed'))
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalCommission = allReferrals.reduce((s, r) => s + Number(r.simulated_commission || 0), 0);

    return {
      totalUsers: allProfiles.length,
      totalDeposits,
      totalWithdraws,
      totalCommission,
    };
  }, [allProfiles, allTransactions, allReferrals]);

  // Compute chart buckets from live transactions (with clean zero-safe layout)
  const chartData = useMemo(() => {
    const days = chartRange === '7d' ? 7 : 14;
    const buckets: { label: string; deposit: number; withdraw: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayKey = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      const deposit = allTransactions
        .filter((t) => t.type === 'deposit_demo' && t.created_at.slice(0, 10) === dayKey)
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const withdraw = allTransactions
        .filter((t) => t.type === 'withdraw_demo' && t.created_at.slice(0, 10) === dayKey)
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      buckets.push({ label, deposit, withdraw });
    }
    return buckets;
  }, [allTransactions, chartRange]);

  const maxChartValue = Math.max(1000, ...chartData.flatMap((b) => [b.deposit, b.withdraw]));

  const latestDeposits = useMemo(
    () => allTransactions.filter((t) => t.type === 'deposit_demo').slice(0, 5),
    [allTransactions]
  );
  const latestWithdraws = useMemo(
    () => allTransactions.filter((t) => t.type === 'withdraw_demo').slice(0, 5),
    [allTransactions]
  );

  const handleProcessTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processingTx) return;
    const hasAdminToken = Boolean(getStoredAdminToken());
    if (isPreviewMode && !hasAdminToken) {
      showToast('Connect Supabase to process requests', 'warning');
      setProcessingTx(null);
      return;
    }

    setSubmitting(true);
    try {
      await callApiWithFallback(
        '/api/admin/transactions/process',
        'POST',
        {
          transactionId: processingTx.tx.id,
          decision: processingTx.decision,
          adminNote,
        },
        async () => {
          const { error } = await supabase!.rpc('admin_process_transaction', {
            p_tx_id: processingTx.tx.id,
            p_decision: processingTx.decision,
            p_admin_note: adminNote,
          });
          if (error) throw new Error(error.message);
          return { ok: true };
        }
      );
      await refreshAll();
      showToast(`Demo request ${processingTx.decision}`, 'success');
      setProcessingTx(null);
      setAdminNote('');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Hero Truck Banner */}
      <section className="relative rounded-3xl overflow-hidden shadow-md border border-blue-200/70 bg-[#061844] h-40 sm:h-52">
        <ScaniaImage
          src={heroBanner?.image_url}
          alt="Scania Control Banner"
          fallbackVariant="hero"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#041235]/92 via-[#071D52]/65 to-transparent p-6 sm:p-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ScaniaLogoEmblem className="w-10 h-10" />
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  SCANIA Together We Grow
                </h1>
                <p className="text-xs sm:text-sm text-blue-200">
                  Simulated Demo Management · Invest · Earn · Grow (Demo Modeling)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 4 Colored KPI Metric Cards matching Reference 2 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 bg-gradient-to-br from-[#1250C4] to-[#1E6FFF] text-white shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-blue-100 font-medium">Total Registered Users</p>
            <p className="font-mono text-2xl font-extrabold tabular-nums mt-0.5">{kpis.totalUsers}</p>
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-gradient-to-br from-emerald-600 to-emerald-500 text-white shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-emerald-100 font-medium">Total Simulated Deposits</p>
            <p className="font-mono text-2xl font-extrabold tabular-nums mt-0.5">
              {formatCurrency(kpis.totalDeposits, siteSettings.currency_symbol)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-indigo-100 font-medium">Total Simulated Withdrawals</p>
            <p className="font-mono text-2xl font-extrabold tabular-nums mt-0.5">
              {formatCurrency(kpis.totalWithdraws, siteSettings.currency_symbol)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-amber-100 font-medium">Simulated Commission</p>
            <p className="font-mono text-2xl font-extrabold tabular-nums mt-0.5">
              {formatCurrency(kpis.totalCommission, siteSettings.currency_symbol)}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Main Bento Grid: Income Overview Chart + Recent Activities + Quick Actions */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Income Overview Chart */}
        <div className="xl:col-span-5 bg-white rounded-2xl p-5 border border-blue-100 shadow-xs flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#1250C4]" />
              <h2 className="font-display font-bold text-base text-[#061844]">Simulated Flow Overview</h2>
            </div>
            <select
              value={chartRange}
              onChange={(e) => setChartRange(e.target.value as '7d' | '30d')}
              aria-label="Chart range"
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 14 Days</option>
            </select>
          </div>

          <div className="flex items-center gap-4 text-xs mb-3">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1250C4]" />
              Deposit (Demo)
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Withdraw (Demo)
            </span>
          </div>

          <div className="flex-1 flex items-end gap-2 pt-4 pb-1 min-h-[190px] border-b border-slate-100">
            {chartData.map((b, idx) => {
              const depH = Math.max(4, Math.round((b.deposit / maxChartValue) * 145));
              const wdH = Math.max(4, Math.round((b.withdraw / maxChartValue) * 145));
              return (
                <div key={`${b.label}-${idx}`} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div className="w-full flex items-end justify-center gap-1 h-[150px]">
                    <div
                      title={`Demo Deposit: ${formatCurrency(b.deposit, siteSettings.currency_symbol)}`}
                      className="w-2.5 sm:w-3.5 rounded-t-md bg-gradient-to-t from-[#1250C4] to-[#3B82F6] transition-all"
                      style={{ height: `${depH}px` }}
                    />
                    <div
                      title={`Demo Withdraw: ${formatCurrency(b.withdraw, siteSettings.currency_symbol)}`}
                      className="w-2.5 sm:w-3.5 rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all"
                      style={{ height: `${wdH}px` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-500">{b.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="xl:col-span-4 bg-white rounded-2xl p-5 border border-blue-100 shadow-xs flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-display font-bold text-base text-[#061844]">Recent Activities</h2>
            <Link
              to="/admin/transactions"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1250C4] hover:underline"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5 flex-1">
            {(auditLogs.length > 0 ? auditLogs.slice(0, 5) : allTransactions.slice(0, 5)).map((item) => {
              const isAudit = 'action' in item;
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate capitalize">
                      {isAudit ? item.action.replace(/_/g, ' ') : `${item.type.replace('_', ' ')} (${formatCurrency(item.amount, siteSettings.currency_symbol)})`}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {isAudit ? item.target_table : item.profiles?.full_name || 'Demo Member'}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500 shrink-0 tabular-nums">
                    {formatRelativeTime(item.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions + Database Status */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-[#1250C4]" />
              <h2 className="font-display font-bold text-base text-[#061844]">Quick Actions</h2>
            </div>
            <div className="space-y-2">
              <Link
                to="/admin/plans"
                className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#1250C4] to-[#1E6FFF] text-white text-xs font-semibold flex items-center gap-2 hover:opacity-95"
              >
                <Box className="w-4 h-4" />
                <span>Add / Manage Plan</span>
              </Link>
              <Link
                to="/admin/bonus-codes"
                className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2"
              >
                <Gift className="w-4 h-4" />
                <span>Generate Bonus Code</span>
              </Link>
              <Link
                to="/admin/notifications"
                className="w-full py-2.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2"
              >
                <Bell className="w-4 h-4" />
                <span>Send Notification</span>
              </Link>
              <Link
                to="/admin/users"
                className="w-full py-2.5 px-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                <span>View All Users</span>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl p-4 bg-[#061844] text-white shadow-sm space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-sm">Demo Database Status</span>
              <span
                className={
                  realtimeStatus === 'connected'
                    ? 'text-emerald-400 font-semibold'
                    : realtimeStatus === 'connecting'
                    ? 'text-sky-300 font-semibold'
                    : 'text-amber-300 font-semibold'
                }
              >
                {realtimeStatus === 'connected' ? 'Connected' : realtimeStatus === 'connecting' ? 'Connecting...' : 'Preview'}
              </span>
            </div>
            <div className="flex items-center justify-between text-blue-100">
              <span className="inline-flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-300" /> Supabase Postgres
              </span>
              <span
                className={
                  realtimeStatus === 'connected'
                    ? 'font-semibold text-emerald-300'
                    : realtimeStatus === 'connecting'
                    ? 'font-semibold text-sky-300'
                    : 'font-semibold text-amber-300'
                }
              >
                {realtimeStatus === 'connected' ? 'Active' : realtimeStatus === 'connecting' ? 'Syncing...' : 'Setup Needed'}
              </span>
            </div>
            <div className="flex items-center justify-between text-blue-100">
              <span className="inline-flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-blue-300" /> Mode
              </span>
              <span className="font-semibold text-amber-300">Demo Simulation Only</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Latest Deposit Requests & Latest Withdraw Requests */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Deposit Requests */}
        <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-display font-bold text-base text-[#061844]">Latest Demo Deposit Requests</h2>
            <Link to="/admin/deposits" className="text-xs font-semibold text-[#1250C4] hover:underline">
              View All →
            </Link>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-left">
                <th className="py-2 pr-2 font-semibold">User</th>
                <th className="py-2 pr-2 font-semibold">Amount</th>
                <th className="py-2 pr-2 font-semibold">Channel</th>
                <th className="py-2 pr-2 font-semibold">Status</th>
                <th className="py-2 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {latestDeposits.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 pr-2 font-semibold text-slate-900">
                    {tx.profiles?.full_name || 'Demo User'}
                  </td>
                  <td className="py-2.5 pr-2 font-mono font-bold tabular-nums">
                    {formatCurrency(tx.amount, siteSettings.currency_symbol)}
                  </td>
                  <td className="py-2.5 pr-2 text-slate-600">
                    <div>{tx.method}</div>
                    {tx.reference_code && (
                      <div className="text-[11px] font-mono text-slate-400">{tx.reference_code}</div>
                    )}
                  </td>
                  <td className="py-2.5 pr-2">
                    <span
                      className={`font-semibold capitalize ${
                        tx.status === 'approved'
                          ? 'text-emerald-600'
                          : tx.status === 'rejected'
                          ? 'text-rose-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    {tx.status === 'pending' ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setProcessingTx({ tx, decision: 'approved' })}
                          className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center justify-center"
                          title="Approve demo deposit"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProcessingTx({ tx, decision: 'rejected' })}
                          className="w-7 h-7 rounded-lg bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center justify-center"
                          title="Reject demo deposit"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Withdraw Requests */}
        <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-display font-bold text-base text-[#061844]">Latest Demo Withdraw Requests</h2>
            <Link to="/admin/withdrawals" className="text-xs font-semibold text-[#1250C4] hover:underline">
              View All →
            </Link>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-left">
                <th className="py-2 pr-2 font-semibold">User</th>
                <th className="py-2 pr-2 font-semibold">Amount</th>
                <th className="py-2 pr-2 font-semibold">Channel</th>
                <th className="py-2 pr-2 font-semibold">Status</th>
                <th className="py-2 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {latestWithdraws.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 pr-2 font-semibold text-slate-900">
                    {tx.profiles?.full_name || 'Demo User'}
                  </td>
                  <td className="py-2.5 pr-2 font-mono font-bold tabular-nums">
                    {formatCurrency(tx.amount, siteSettings.currency_symbol)}
                  </td>
                  <td className="py-2.5 pr-2 text-slate-600">{tx.method}</td>
                  <td className="py-2.5 pr-2">
                    <span
                      className={`font-semibold capitalize ${
                        tx.status === 'approved'
                          ? 'text-emerald-600'
                          : tx.status === 'rejected'
                          ? 'text-rose-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    {tx.status === 'pending' ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setProcessingTx({ tx, decision: 'approved' })}
                          className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center justify-center"
                          title="Approve demo withdraw"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProcessingTx({ tx, decision: 'rejected' })}
                          className="w-7 h-7 rounded-lg bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center justify-center"
                          title="Reject demo withdraw"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Approve / Reject Modal */}
      {processingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form
            onSubmit={handleProcessTransaction}
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <h3 className="font-display font-bold text-base text-[#061844] capitalize">
              {processingTx.decision} Demo {processingTx.tx.type.replace('_demo', '')}
            </h3>
            <p className="text-xs text-slate-600">
              Amount: <strong className="font-mono">{formatCurrency(processingTx.tx.amount, siteSettings.currency_symbol)}</strong> · User:{' '}
              <strong>{processingTx.tx.profiles?.full_name || processingTx.tx.user_id}</strong>
              {processingTx.tx.reference_code ? (
                <>
                  {' '}
                  · TrxID: <strong className="font-mono">{processingTx.tx.reference_code}</strong>
                </>
              ) : null}
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Note (Optional)</label>
              <input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Reason or verification note"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm min-h-[42px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProcessingTx(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`px-4 py-2 rounded-xl text-white text-xs font-semibold ${
                  processingTx.decision === 'approved' ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                {submitting ? 'Processing...' : `Confirm ${processingTx.decision}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
