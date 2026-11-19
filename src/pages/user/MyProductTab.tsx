import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Box, Calendar, CheckCircle2, Crown, Gift, TrendingUp, X } from 'lucide-react';
import { PlanFallbackThumbnail } from '../../components/ScaniaVisuals';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { callApiWithFallback, formatCurrency, formatDateTime, formatShortDate, supabase } from '../../lib/supabase';
import { DemoPlan } from '../../types/database';
import { ConfirmModal, EmptyState, useToast } from '../../components/ui/Feedback';

type ProductTab = 'available' | 'active' | 'history';

export const MyProductTab: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, isPreviewMode, refreshProfile } = useAuth();
  const { siteSettings, plans, userProducts, userTransactions, refreshAll } = usePlatformData();
  const { showToast } = useToast();

  const [tab, setTab] = useState<ProductTab>('available');
  const [selectedPlan, setSelectedPlan] = useState<DemoPlan | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<DemoPlan | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const activeCatalog = plans.filter((p) => p.is_active);
  const activeUserProducts = userProducts.filter((p) => p.status === 'active');
  const completedUserProducts = userProducts.filter((p) => p.status === 'completed' || p.status === 'cancelled');
  const purchaseHistory = userTransactions.filter((t) => t.type === 'plan_purchase');

  useEffect(() => {
    const planId = searchParams.get('plan');
    if (planId && activeCatalog.length > 0) {
      const match = activeCatalog.find((p) => p.id === planId);
      if (match) setSelectedPlan(match);
    }
  }, [searchParams, activeCatalog]);

  const closePlanDetail = () => {
    setSelectedPlan(null);
    if (searchParams.has('plan')) {
      searchParams.delete('plan');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleConfirmPurchase = async () => {
    if (!confirmPlan) return;
    const hasSessionToken =
      typeof window !== 'undefined' && Boolean(window.sessionStorage.getItem('scania_server_token'));

    if ((isPreviewMode && !hasSessionToken) || !user) {
      showToast('প্ল্যান কেনার জন্য প্রথমে লগইন করুন', 'warning');
      setConfirmPlan(null);
      return;
    }
    if (profile && Number(profile.demo_balance) < Number(confirmPlan.demo_price)) {
      showToast('পর্যাপ্ত ব্যালেন্স নেই। অনুগ্রহ করে প্রথমে রিচার্জ করুন।', 'error');
      setConfirmPlan(null);
      return;
    }

    setPurchasing(true);
    try {
      await callApiWithFallback(
        '/api/user/purchase-plan',
        'POST',
        { planId: confirmPlan.id },
        async () => {
          const { error } = await supabase!.rpc('purchase_demo_plan', {
            p_plan_id: confirmPlan.id,
          });
          if (error) throw new Error(error.message);
          return { ok: true };
        }
      );
      await Promise.all([refreshProfile(), refreshAll()]);
      showToast(`${confirmPlan.title} সফলভাবে কেনা হয়েছে!`, 'success');
      setConfirmPlan(null);
      closePlanDetail();
      setTab('active');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* 1. Header Banner */}
      <section className="relative rounded-3xl overflow-hidden shadow-md border border-blue-200 bg-[#061844] h-36 sm:h-44">
        <img
          src="/assets/aistudio/images__1___10__cf77dbb9.jpeg"
          alt="SCANIA আমার প্ল্যান"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#041235]/90 via-[#071D52]/55 to-transparent p-5 sm:p-7 flex flex-col justify-center">
          <h1 className="font-display text-xl sm:text-2xl font-extrabold text-white drop-shadow">আমার প্ল্যান</h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1">আপনার বিনিয়োগ, আমাদের উন্নতি</p>
        </div>
      </section>

      {/* 2. Pill Segmented Control Tabs */}
      <div className="-mt-6 relative z-10 bg-white p-1.5 rounded-full border border-blue-100 grid grid-cols-3 gap-1 shadow-md mx-0.5">
        <button
          type="button"
          onClick={() => setTab('available')}
          className={`py-2 px-3 rounded-full text-xs font-bold transition-colors min-h-[40px] whitespace-nowrap ${
            tab === 'available'
              ? 'bg-gradient-to-r from-[#0B2A6B] to-[#1D4ED8] text-white shadow-sm'
              : 'text-[#061844] hover:bg-blue-50'
          }`}
        >
          সকল প্ল্যান
        </button>
        <button
          type="button"
          onClick={() => setTab('active')}
          className={`py-2 px-3 rounded-full text-xs font-bold transition-colors min-h-[40px] whitespace-nowrap tabular-nums ${
            tab === 'active'
              ? 'bg-gradient-to-r from-[#0B2A6B] to-[#1D4ED8] text-white shadow-sm'
              : 'text-[#061844] hover:bg-blue-50'
          }`}
        >
          চলমান ({activeUserProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('history')}
          className={`py-2 px-3 rounded-full text-xs font-bold transition-colors min-h-[40px] whitespace-nowrap ${
            tab === 'history'
              ? 'bg-gradient-to-r from-[#0B2A6B] to-[#1D4ED8] text-white shadow-sm'
              : 'text-[#061844] hover:bg-blue-50'
          }`}
        >
          ইতিহাস
        </button>
      </div>

      {/* Tab 1: Available Plans */}
      {tab === 'available' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeCatalog.length === 0 ? (
              <div className="md:col-span-2">
                <EmptyState
                  icon={<Box className="w-5 h-5" />}
                  title="কোনো প্ল্যান পাওয়া যায়নি"
                  description="প্ল্যাটফর্মের প্রকাশিত প্ল্যানগুলো এখানে দেখা যাবে।"
                />
              </div>
            ) : (
              activeCatalog.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white rounded-2xl p-3.5 border border-blue-100 shadow-sm flex gap-3.5 items-center hover:border-blue-300 transition-colors"
                >
                  <div className="w-28 h-24 rounded-xl overflow-hidden shrink-0 border border-blue-100">
                    <PlanFallbackThumbnail imageUrl={plan.image_url} title={plan.title} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-display font-bold text-sm text-[#061844] truncate">{plan.title}</h2>
                      {plan.badge && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-300 text-[#061844] text-[10px] font-extrabold shrink-0">
                          <Crown className="w-2.5 h-2.5" />
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 space-y-0.5 text-xs text-slate-700">
                      <p className="tabular-nums flex items-center gap-1.5">
                        <span className="text-[#1250C4] text-[10px]">◆</span>
                        <span>
                          মূল্য : <strong className="text-[#061844]">{Number(plan.demo_price).toLocaleString('en-US')} টাকা</strong>
                        </span>
                      </p>
                      <p className="tabular-nums flex items-center gap-1.5">
                        <span className="text-[#1250C4] text-[10px]">◆</span>
                        <span>
                          দৈনিক আয় : <strong className="text-[#1250C4]">{Number(plan.daily_income).toLocaleString('en-US')} টাকা</strong>
                        </span>
                      </p>
                      <p className="tabular-nums flex items-center gap-1.5">
                        <span className="text-[#1250C4] text-[10px]">◆</span>
                        <span>
                          মেয়াদ : <strong className="text-[#061844]">{plan.validity_days} দিন</strong>
                        </span>
                      </p>
                      {(plan.total_return ?? (plan.title.toUpperCase().includes('V7') ? 66000 : null)) ? (
                        <p className="tabular-nums flex items-center gap-1.5">
                          <span className="text-emerald-600 text-[10px]">◆</span>
                          <span>
                            মোট রিটার্ন :{' '}
                            <strong className="text-emerald-700">
                              {Number(plan.total_return ?? 66000).toLocaleString('en-US')} টাকা
                            </strong>
                          </span>
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-2.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedPlan(plan)}
                        className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#0B2A6B] to-[#1D4ED8] hover:opacity-95 text-white text-xs font-bold min-h-[34px] shadow-xs"
                      >
                        <span>কিনুন</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Promo Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-[#041747] via-[#0E388F] to-[#1D63DC] text-white p-4 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <Gift className="w-6 h-6 text-amber-300" />
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-sm leading-tight">আপনার আয় বৃদ্ধি করুন</p>
                <p className="text-xs text-blue-100">SCANIA এর সাথে</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (activeCatalog[0]) setSelectedPlan(activeCatalog[0]);
              }}
              className="px-4 py-2 rounded-full bg-[#FACC15] hover:bg-amber-300 text-[#061844] text-xs font-extrabold shrink-0"
            >
              শুরু করুন →
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Active Plans */}
      {tab === 'active' && (
        <div className="space-y-3">
          {activeUserProducts.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="w-5 h-5" />}
              title="কোনো চলমান প্ল্যান নেই"
              description="দৈনিক আয় পেতে একটি SCANIA প্ল্যান কিনুন।"
              action={
                <button
                  type="button"
                  onClick={() => setTab('available')}
                  className="px-4 py-2 rounded-xl bg-[#1250C4] text-white text-xs font-semibold"
                >
                  প্ল্যান দেখুন
                </button>
              }
            />
          ) : (
            activeUserProducts.map((prod) => {
              const pct = Math.min(100, Math.round((prod.days_elapsed / Math.max(1, prod.validity_days)) * 100));
              return (
                <div key={prod.id} className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display font-bold text-base text-[#061844]">{prod.plan_title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                        শুরু: {formatShortDate(prod.started_at)} · মেয়াদ শেষ: {formatShortDate(prod.expires_at)}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                      চলমান
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-[#F4F8FF] border border-blue-100 text-xs">
                    <div>
                      <span className="text-slate-500 block">মূল্য</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {formatCurrency(prod.demo_price, siteSettings.currency_symbol)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">দৈনিক আয়</span>
                      <span className="font-bold text-[#1250C4] tabular-nums">
                        {formatCurrency(prod.daily_income, siteSettings.currency_symbol)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">মোট আয়</span>
                      <span className="font-bold text-emerald-600 tabular-nums">
                        {formatCurrency(prod.total_simulated_earned, siteSettings.currency_symbol)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                      <span>মেয়াদের অগ্রগতি</span>
                      <span className="tabular-nums">
                        {prod.days_elapsed} / {prod.validity_days} দিন ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#0B2A6B] to-[#1E6FFF]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 3: History */}
      {tab === 'history' && (
        <div className="space-y-4">
          {completedUserProducts.length > 0 && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-blue-100 space-y-2.5">
              <h2 className="font-display font-bold text-sm text-[#061844]">সম্পন্ন প্ল্যান সমূহ</h2>
              {completedUserProducts.map((p) => (
                <div key={p.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{p.plan_title}</p>
                    <p className="text-slate-500 tabular-nums">
                      {formatShortDate(p.started_at)} – {formatShortDate(p.expires_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-700 tabular-nums">
                      {formatCurrency(p.total_simulated_earned, siteSettings.currency_symbol)}
                    </p>
                    <span className="text-[11px] text-slate-500">সম্পন্ন</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-blue-100">
            <h2 className="font-display font-bold text-sm text-[#061844] mb-3">প্ল্যান ক্রয়ের ইতিহাস</h2>
            {purchaseHistory.length === 0 ? (
              <EmptyState
                icon={<Calendar className="w-5 h-5" />}
                title="কোনো ক্রয়ের ইতিহাস নেই"
                description="আপনার কেনা প্ল্যানগুলোর তালিকা এখানে দেখা যাবে।"
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {purchaseHistory.map((tx) => (
                  <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{tx.reference_code || 'SCANIA প্ল্যান'}</p>
                      <p className="text-[11px] text-slate-400 tabular-nums">{formatDateTime(tx.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 tabular-nums">
                        {formatCurrency(tx.amount, siteSettings.currency_symbol)}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" />
                        সফল
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plan Detail Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-blue-100 overflow-hidden">
            <div className="relative h-44 bg-[#061844]">
              <PlanFallbackThumbnail imageUrl={selectedPlan.image_url} title={selectedPlan.title} />
              <button
                type="button"
                onClick={closePlanDetail}
                className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/60 text-white hover:bg-slate-950"
                aria-label="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold text-[#061844]">{selectedPlan.title}</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{selectedPlan.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-[#F4F8FF] p-4 rounded-2xl border border-blue-100 text-xs">
                <div>
                  <span className="text-slate-500 block">প্ল্যান মূল্য</span>
                  <span className="font-bold text-base text-slate-900 tabular-nums">
                    {formatCurrency(selectedPlan.demo_price, siteSettings.currency_symbol)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">দৈনিক আয়</span>
                  <span className="font-bold text-base text-emerald-600 tabular-nums">
                    {formatCurrency(selectedPlan.daily_income, siteSettings.currency_symbol)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">মেয়াদ</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {selectedPlan.validity_days} দিন
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">মোট রিটার্ন</span>
                  <span className="font-bold text-[#1250C4] tabular-nums">
                    {formatCurrency(
                      selectedPlan.total_return ?? selectedPlan.daily_income * selectedPlan.validity_days,
                      siteSettings.currency_symbol
                    )}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConfirmPlan(selectedPlan)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0B2A6B] to-[#1250C4] hover:opacity-95 text-white font-bold text-sm min-h-[46px] tabular-nums"
              >
                এখনই কিনুন ({formatCurrency(selectedPlan.demo_price, siteSettings.currency_symbol)})
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmPlan)}
        title="প্ল্যান ক্রয় নিশ্চিত করুন"
        message={
          confirmPlan
            ? `আপনি কি "${confirmPlan.title}" প্ল্যানটি ${formatCurrency(confirmPlan.demo_price, siteSettings.currency_symbol)} দিয়ে কিনতে চান?`
            : ''
        }
        confirmLabel="নিশ্চিত করুন"
        cancelLabel="বাতিল"
        loading={purchasing}
        onConfirm={handleConfirmPurchase}
        onCancel={() => setConfirmPlan(null)}
      />
    </div>
  );
};
