import React, { useMemo, useState } from 'react';
import {
  Crown,
  Edit3,
  Eye,
  KeyRound,
  Minus,
  Plus,
  Power,
  Search,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { callApiWithFallback, formatCurrency, formatDateTime, formatShortDate, getStoredAdminToken, supabase } from '../../lib/supabase';
import { Profile } from '../../types/database';
import { EmptyState, useToast } from '../../components/ui/Feedback';

export const UsersView: React.FC = () => {
  const { user, isPreviewMode } = useAuth();
  const {
    allProfiles,
    allTransactions,
    allUserProducts,
    allBankCards,
    allReferrals,
    plans,
    siteSettings,
    refreshAll,
  } = usePlatformData();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [inspectUser, setInspectUser] = useState<Profile | null>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);

  // Add / Deduct Balance modal
  const [balanceTarget, setBalanceTarget] = useState<Profile | null>(null);
  const [balanceMode, setBalanceMode] = useState<'add' | 'deduct'>('add');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceNote, setBalanceNote] = useState('');

  // Reset Password modal
  const [passwordTarget, setPasswordTarget] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Assign VIP Package / Plan modal
  const [vipTarget, setVipTarget] = useState<Profile | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedTier, setSelectedTier] = useState('');

  const [saving, setSaving] = useState(false);

  const hasAdminAccess = () => {
    const hasAdminToken = Boolean(getStoredAdminToken());
    return hasAdminToken || (!isPreviewMode && Boolean(supabase && user));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allProfiles;
    return allProfiles.filter((p) =>
      `${p.phone || ''} ${p.full_name} ${p.email} ${p.scania_id} ${p.tier}`.toLowerCase().includes(q)
    );
  }, [allProfiles, query]);

  const activeCatalog = useMemo(() => plans.filter((p) => p.is_active), [plans]);

  const handleToggleActive = async (target: Profile) => {
    if (!hasAdminAccess()) {
      showToast('অ্যাডমিন হিসেবে লগইন করুন', 'warning');
      return;
    }
    try {
      await callApiWithFallback(
        `/api/admin/users/${target.id}`,
        'PUT',
        { is_active: !target.is_active },
        async () => {
          const { error } = await supabase!
            .from('profiles')
            .update({ is_active: !target.is_active, updated_at: new Date().toISOString() })
            .eq('id', target.id);
          if (error) throw new Error(error.message);
          return { ok: true };
        }
      );
      await refreshAll();
      showToast(`অ্যাকাউন্ট ${target.is_active ? 'নিষ্ক্রিয়' : 'সক্রিয়'} করা হয়েছে`, 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !hasAdminAccess()) return;
    setSaving(true);
    try {
      const payload = {
        full_name: editingUser.full_name.trim(),
        phone: editingUser.phone.trim(),
        tier: editingUser.tier.trim(),
      };
      await callApiWithFallback(
        `/api/admin/users/${editingUser.id}`,
        'PUT',
        payload,
        async () => {
          const { error } = await supabase!
            .from('profiles')
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq('id', editingUser.id);
          if (error) throw new Error(error.message);
          return { ok: true };
        }
      );
      await refreshAll();
      showToast('প্রোফাইল তথ্য আপডেট হয়েছে', 'success');
      setEditingUser(null);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openBalanceModal = (target: Profile, mode: 'add' | 'deduct' = 'add') => {
    setBalanceTarget(target);
    setBalanceMode(mode);
    setBalanceAmount('');
    setBalanceNote('');
  };

  const handleSaveBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceTarget || !hasAdminAccess()) return;
    const amt = Number(balanceAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      showToast('সঠিক টাকার পরিমাণ লিখুন', 'error');
      return;
    }
    setSaving(true);
    try {
      await callApiWithFallback(
        `/api/admin/users/${balanceTarget.id}/balance`,
        'POST',
        { mode: balanceMode, amount: amt, note: balanceNote.trim() },
        async () => {
          const currentBal = Number(balanceTarget.demo_balance || 0);
          const nextBal =
            balanceMode === 'add' ? Number((currentBal + amt).toFixed(2)) : Number((currentBal - amt).toFixed(2));
          if (nextBal < 0) {
            throw new Error('ব্যবহারকারীর ব্যালেন্স পর্যাপ্ত নয়।');
          }
          const { error: profErr } = await supabase!
            .from('profiles')
            .update({ demo_balance: nextBal, updated_at: new Date().toISOString() })
            .eq('id', balanceTarget.id);
          if (profErr) throw new Error(profErr.message);

          await supabase!.from('demo_transactions').insert({
            user_id: balanceTarget.id,
            type: balanceMode === 'add' ? 'bonus_code' : 'withdraw_demo',
            amount: amt,
            method: balanceMode === 'add' ? 'Admin Add Balance' : 'Admin Deduct Balance',
            reference_code: 'ADMIN-ADJ',
            status: 'completed',
            admin_note:
              balanceNote.trim() || (balanceMode === 'add' ? 'অ্যাডমিন কর্তৃক ব্যালেন্স যোগ' : 'অ্যাডমিন কর্তৃক ব্যালেন্স কর্তন'),
          });

          await supabase!.from('notifications').insert({
            user_id: balanceTarget.id,
            title: balanceMode === 'add' ? 'ব্যালেন্স যোগ হয়েছে' : 'ব্যালেন্স সমন্বয় হয়েছে',
            message:
              balanceMode === 'add'
                ? `আপনার অ্যাকাউন্টে ${amt} টাকা যোগ করা হয়েছে।`
                : `আপনার অ্যাকাউন্ট থেকে ${amt} টাকা কেটে নেওয়া হয়েছে।`,
            category: 'transaction',
          });
          return { ok: true };
        }
      );
      await refreshAll();
      showToast(
        balanceMode === 'add'
          ? `${balanceTarget.full_name} এর ব্যালেন্সে ${amt} টাকা যোগ হয়েছে`
          : `${balanceTarget.full_name} এর ব্যালেন্স থেকে ${amt} টাকা কাটা হয়েছে`,
        'success'
      );
      setBalanceTarget(null);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openPasswordModal = (target: Profile) => {
    setPasswordTarget(target);
    setNewPassword('');
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTarget || !hasAdminAccess()) return;
    if (newPassword.length < 6) {
      showToast('নতুন পাসওয়ার্ড কমপক্ষে 6 অক্ষরের হতে হবে', 'error');
      return;
    }
    setSaving(true);
    try {
      await callApiWithFallback(
        `/api/admin/users/${passwordTarget.id}/password`,
        'POST',
        { newPassword },
        async () => {
          throw new Error('Server API required for password update.');
        }
      );
      showToast(`${passwordTarget.full_name} এর পাসওয়ার্ড পরিবর্তন হয়েছে`, 'success');
      setPasswordTarget(null);
      setNewPassword('');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openVipModal = (target: Profile) => {
    setVipTarget(target);
    setSelectedPlanId(activeCatalog[0]?.id || plans[0]?.id || '');
    setSelectedTier(target.tier || 'VIP');
  };

  const handleAssignVip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vipTarget || !hasAdminAccess()) return;
    if (!selectedPlanId) {
      showToast('একটি প্ল্যান নির্বাচন করুন', 'error');
      return;
    }
    setSaving(true);
    try {
      await callApiWithFallback(
        `/api/admin/users/${vipTarget.id}/assign-plan`,
        'POST',
        { planId: selectedPlanId, tier: selectedTier.trim() },
        async () => {
          const plan = plans.find((p) => p.id === selectedPlanId);
          if (!plan) throw new Error('নির্বাচিত প্ল্যানটি পাওয়া যায়নি।');
          const expiresAt = new Date(Date.now() + Number(plan.validity_days) * 86400000).toISOString();
          const { error: prodErr } = await supabase!.from('demo_user_products').insert({
            user_id: vipTarget.id,
            plan_id: plan.id,
            plan_title: plan.title,
            demo_price: plan.demo_price,
            daily_income: plan.daily_income,
            validity_days: plan.validity_days,
            status: 'active',
            expires_at: expiresAt,
          });
          if (prodErr) throw new Error(prodErr.message);

          if (selectedTier.trim()) {
            await supabase!
              .from('profiles')
              .update({ tier: selectedTier.trim(), updated_at: new Date().toISOString() })
              .eq('id', vipTarget.id);
          }

          await supabase!.from('demo_transactions').insert({
            user_id: vipTarget.id,
            type: 'plan_purchase',
            amount: plan.demo_price,
            method: 'Admin VIP Assign',
            reference_code: plan.title,
            status: 'completed',
            admin_note: `অ্যাডমিন থেকে ${plan.title} VIP প্যাকেজ যুক্ত হয়েছে`,
          });

          await supabase!.from('notifications').insert({
            user_id: vipTarget.id,
            title: 'অ্যাডমিন থেকে নতুন VIP প্ল্যান যুক্ত হয়েছে',
            message: `আপনার অ্যাকাউন্টে "${plan.title}" প্ল্যানটি সফলভাবে যুক্ত করা হয়েছে।`,
            category: 'system',
          });
          return { ok: true };
        }
      );
      await refreshAll();
      showToast(`${vipTarget.full_name} এর অ্যাকাউন্টে VIP প্যাকেজ যুক্ত হয়েছে`, 'success');
      setVipTarget(null);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const currentInspectProfile = inspectUser
    ? allProfiles.find((p) => p.id === inspectUser.id) || inspectUser
    : null;
  const inspectTransactions = currentInspectProfile
    ? allTransactions.filter((t) => t.user_id === currentInspectProfile.id)
    : [];
  const inspectProducts = currentInspectProfile
    ? allUserProducts.filter((up) => up.user_id === currentInspectProfile.id)
    : [];
  const inspectBankCard = currentInspectProfile ? allBankCards[currentInspectProfile.id] : undefined;
  const inspectTeam = currentInspectProfile
    ? allReferrals.filter((r) => r.referrer_id === currentInspectProfile.id)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-[#061844]">Users & Account Control</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ফোন নাম্বার দিয়ে খুঁজুন, ব্যালেন্স যোগ/বিয়োগ, পাসওয়ার্ড পরিবর্তন ও VIP প্যাকেজ যুক্ত করুন — পরিবর্তন সাথে সাথে ইউজার প্যানেলে আপডেট হবে।
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-blue-100">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ফোন নাম্বার, নাম, ইমেইল বা Scania ID দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs min-h-[40px]"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-blue-100 shadow-xs overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Users className="w-5 h-5" />}
              title="কোনো ব্যবহারকারী পাওয়া যায়নি"
              description="ফোন নাম্বার বা Scania ID দিয়ে আবার খুঁজুন।"
            />
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <th className="py-3 px-4 font-semibold">Member / Phone</th>
                <th className="py-3 px-4 font-semibold">Scania ID</th>
                <th className="py-3 px-4 font-semibold">Balance</th>
                <th className="py-3 px-4 font-semibold">Tier</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 text-right font-semibold">A-Z Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">{p.full_name}</p>
                    <p className="text-[11px] font-bold text-[#1250C4] tabular-nums">{p.phone || p.email}</p>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">{p.scania_id}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 tabular-nums">
                    {formatCurrency(p.demo_balance, siteSettings.currency_symbol)}
                  </td>
                  <td className="py-3 px-4 text-slate-700">{p.tier}</td>
                  <td className="py-3 px-4">
                    <span className={`font-bold ${p.is_active ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {p.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={() => openBalanceModal(p, 'add')}
                        className="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold inline-flex items-center gap-1"
                        title="Add or Deduct Balance"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>± ব্যালেন্স</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openVipModal(p)}
                        className="px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold inline-flex items-center gap-1"
                        title="Assign VIP Package"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        <span>VIP</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openPasswordModal(p)}
                        className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700"
                        title="Change Password"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectUser(p)}
                        className="px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1250C4] font-semibold inline-flex items-center gap-1"
                        title="Inspect User"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>দেখুন</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingUser({ ...p })}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-700"
                        title="Edit Profile & Tier"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(p)}
                        className={`p-1.5 rounded-lg ${
                          p.is_active ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                        }`}
                        title={p.is_active ? 'Deactivate account' : 'Activate account'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Inspect User Drawer */}
      {currentInspectProfile && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/55 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-[#061844] text-white flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base">{currentInspectProfile.full_name}</h3>
                <p className="text-xs text-blue-200 tabular-nums">
                  {currentInspectProfile.scania_id} · {currentInspectProfile.phone || currentInspectProfile.email}
                </p>
              </div>
              <button type="button" onClick={() => setInspectUser(null)} className="p-1.5 rounded-lg hover:bg-white/15">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Quick Control Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => openBalanceModal(currentInspectProfile, 'add')}
                  className="py-2 px-2.5 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>যোগ করুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => openBalanceModal(currentInspectProfile, 'deduct')}
                  className="py-2 px-2.5 rounded-xl bg-rose-600 text-white font-bold flex items-center justify-center gap-1"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>কেটে নিন</span>
                </button>
                <button
                  type="button"
                  onClick={() => openVipModal(currentInspectProfile)}
                  className="py-2 px-2.5 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center gap-1"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>VIP প্ল্যান</span>
                </button>
                <button
                  type="button"
                  onClick={() => openPasswordModal(currentInspectProfile)}
                  className="py-2 px-2.5 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center gap-1"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>পাসওয়ার্ড</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-blue-50">
                  <span className="text-slate-500 block">Balance</span>
                  <span className="font-bold text-sm text-[#061844] tabular-nums">
                    {formatCurrency(currentInspectProfile.demo_balance, siteSettings.currency_symbol)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50">
                  <span className="text-slate-500 block">Bonus / Tier</span>
                  <span className="font-bold text-sm text-amber-800 tabular-nums">
                    {formatCurrency(currentInspectProfile.demo_bonus, siteSettings.currency_symbol)} · {currentInspectProfile.tier}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-100">
                  <span className="text-slate-500 block">Team Count</span>
                  <span className="font-bold text-sm text-slate-900 tabular-nums">{inspectTeam.length}</span>
                </div>
              </div>

              {inspectBankCard && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-1">Bank Card</h4>
                  <p className="text-slate-700 tabular-nums">
                    {inspectBankCard.wallet_method} · <strong>{inspectBankCard.wallet_number}</strong> ({inspectBankCard.account_name})
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Active / Assigned Plans ({inspectProducts.length})</h4>
                {inspectProducts.length === 0 ? (
                  <p className="text-slate-400">No plans purchased or assigned yet.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {inspectProducts.map((up) => (
                      <div key={up.id} className="p-2.5 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-900">{up.plan_title}</p>
                          <p className="text-[11px] text-slate-400 tabular-nums">
                            দৈনিক {formatCurrency(up.daily_income, siteSettings.currency_symbol)} · {up.validity_days} দিন
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                          {up.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Transactions ({inspectTransactions.length})</h4>
                {inspectTransactions.length === 0 ? (
                  <p className="text-slate-400">No transactions yet.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {inspectTransactions.slice(0, 12).map((t) => (
                      <div key={t.id} className="p-2.5 flex justify-between items-center">
                        <div>
                          <p className="font-semibold capitalize">{t.type.replace('_', ' ')}</p>
                          <p className="text-[11px] text-slate-400 tabular-nums">
                            {t.method} · {formatDateTime(t.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold tabular-nums">
                            {formatCurrency(t.amount, siteSettings.currency_symbol)}
                          </p>
                          <span className="capitalize text-[11px] text-[#1250C4]">{t.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Team Members ({inspectTeam.length})</h4>
                {inspectTeam.length === 0 ? (
                  <p className="text-slate-400">No referred members.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {inspectTeam.map((r) => (
                      <div key={r.id} className="p-2.5 flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{r.referred?.full_name || 'Member'}</p>
                          <p className="text-[11px] text-slate-400">
                            Level {r.level} · Joined {formatShortDate(r.created_at)}
                          </p>
                        </div>
                        <span className="font-bold text-emerald-700 tabular-nums">
                          {formatCurrency(r.simulated_commission, siteSettings.currency_symbol)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Deduct Balance Modal */}
      {balanceTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form onSubmit={handleSaveBalance} className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-[#061844]">
                ব্যালেন্স নিয়ন্ত্রণ — {balanceTarget.full_name}
              </h3>
              <button type="button" onClick={() => setBalanceTarget(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 tabular-nums">
              ফোন: <strong>{balanceTarget.phone}</strong> · বর্তমান ব্যালেন্স:{' '}
              <strong>{formatCurrency(balanceTarget.demo_balance, siteSettings.currency_symbol)}</strong>
            </p>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100">
              <button
                type="button"
                onClick={() => setBalanceMode('add')}
                className={`py-2 rounded-lg text-xs font-bold ${
                  balanceMode === 'add' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                + টাকা যোগ করুন
              </button>
              <button
                type="button"
                onClick={() => setBalanceMode('deduct')}
                className={`py-2 rounded-lg text-xs font-bold ${
                  balanceMode === 'deduct' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                - টাকা কেটে নিন
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">পরিমাণ ({siteSettings.currency_symbol})</label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder="যেমন: 500"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">নোট (ঐচ্ছিক)</label>
              <input
                type="text"
                value={balanceNote}
                onChange={(e) => setBalanceNote(e.target.value)}
                placeholder="যেমন: অ্যাডমিন বোনাস / সমন্বয়"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBalanceTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`px-4 py-2 rounded-xl text-white text-xs font-semibold ${
                  balanceMode === 'add' ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                {saving ? 'আপডেট হচ্ছে...' : balanceMode === 'add' ? 'টাকা যোগ করুন' : 'টাকা কেটে নিন'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Change Password Modal */}
      {passwordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form onSubmit={handleSavePassword} className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-[#061844]">
                পাসওয়ার্ড পরিবর্তন — {passwordTarget.full_name}
              </h3>
              <button type="button" onClick={() => setPasswordTarget(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 tabular-nums">
              ফোন নাম্বার: <strong>{passwordTarget.phone || passwordTarget.email}</strong>
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">নতুন পাসওয়ার্ড</label>
              <input
                type="text"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="কমপক্ষে 6 অক্ষর লিখুন"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasswordTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold"
              >
                {saving ? 'আপডেট হচ্ছে...' : 'পাসওয়ার্ড সেভ করুন'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assign VIP Package Modal */}
      {vipTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form onSubmit={handleAssignVip} className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-[#061844]">
                VIP প্যাকেজ যুক্ত করুন — {vipTarget.full_name}
              </h3>
              <button type="button" onClick={() => setVipTarget(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              ইউজারের ব্যালেন্স না কেটেই সরাসরি তার অ্যাকাউন্টে যেকোনো প্যাকেজ সক্রিয় ও VIP লেভেল আপডেট করুন।
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">প্যাকেজ নির্বাচন করুন</label>
              <select
                required
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                {(activeCatalog.length > 0 ? activeCatalog : plans).map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.title} — ৳{pl.demo_price} (দৈনিক ৳{pl.daily_income} / {pl.validity_days} দিন)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">VIP Tier আপডেট</label>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="Standard">Standard</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="Diamond">Diamond</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setVipTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
              >
                {saving ? 'যুক্ত হচ্ছে...' : 'VIP প্যাকেজ দিন'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Profile & Tier Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form onSubmit={handleSaveEdit} className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-display font-bold text-base text-[#061844]">Edit Profile & Tier</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={editingUser.full_name}
                onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={editingUser.phone}
                onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tier Label</label>
              <select
                value={editingUser.tier}
                onChange={(e) => setEditingUser({ ...editingUser, tier: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="Standard">Standard</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="Diamond">Diamond</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-[#1250C4] text-white text-xs font-semibold"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
