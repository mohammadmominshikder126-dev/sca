import React, { useState } from 'react';
import { Edit3, Plus, Power, Trash2, X } from 'lucide-react';
import { PlanFallbackThumbnail } from '../../components/ScaniaVisuals';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { callApiWithFallback, formatCurrency, getStoredAdminToken, supabase } from '../../lib/supabase';
import { DemoPlan } from '../../types/database';
import { ConfirmModal, EmptyState, useToast } from '../../components/ui/Feedback';

export const PlansManagerView: React.FC = () => {
  const { user, isPreviewMode } = useAuth();
  const { plans, siteSettings, refreshAll } = usePlatformData();
  const { showToast } = useToast();

  const [editing, setEditing] = useState<Partial<DemoPlan> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DemoPlan | null>(null);
  const [saving, setSaving] = useState(false);

  const hasAdminAccess = () => {
    const hasAdminToken = Boolean(getStoredAdminToken());
    return hasAdminToken || (!isPreviewMode && Boolean(supabase && user));
  };

  const openCreate = () =>
    setEditing({
      title: '',
      subtitle: '',
      description: '',
      image_url: '',
      demo_price: 1000,
      daily_income: 120,
      validity_days: 30,
      badge: 'Popular',
      is_active: true,
      sort_order: plans.length + 1,
    });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!hasAdminAccess()) {
      showToast('অ্যাডমিন হিসেবে লগইন করুন', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: String(editing.title || '').trim(),
        subtitle: String(editing.subtitle || '').trim(),
        description: String(editing.description || '').trim(),
        image_url: String(editing.image_url || '').trim(),
        demo_price: Number(editing.demo_price || 0),
        daily_income: Number(editing.daily_income || 0),
        validity_days: Number(editing.validity_days || 1),
        badge: String(editing.badge || '').trim(),
        is_active: editing.is_active ?? true,
        sort_order: Number(editing.sort_order || 0),
        updated_at: new Date().toISOString(),
      };

      if (editing.id) {
        await callApiWithFallback(
          `/api/admin/plans/${editing.id}`,
          'PUT',
          payload,
          async () => {
            const { error } = await supabase!.from('plans').update(payload).eq('id', editing.id!);
            if (error) throw new Error(error.message);
            await supabase!.from('admin_audit_logs').insert({
              admin_id: user!.id,
              action: 'update_plan',
              target_table: 'plans',
              target_id: editing.id!,
              details: payload,
            });
            return { ok: true };
          }
        );
        showToast('প্ল্যান আপডেট হয়েছে (লাইভ সিঙ্ক সম্পন্ন)', 'success');
      } else {
        await callApiWithFallback(
          '/api/admin/plans',
          'POST',
          payload,
          async () => {
            const { data, error } = await supabase!.from('plans').insert(payload).select().single();
            if (error) throw new Error(error.message);
            await supabase!.from('admin_audit_logs').insert({
              admin_id: user!.id,
              action: 'create_plan',
              target_table: 'plans',
              target_id: data.id,
              details: payload,
            });
            return { ok: true };
          }
        );
        showToast('নতুন প্ল্যান তৈরি হয়েছে', 'success');
      }

      await fetch('/api/admin/broadcast-refresh', { method: 'POST' }).catch(() => {});
      await refreshAll();
      setEditing(null);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (plan: DemoPlan) => {
    if (!hasAdminAccess()) {
      showToast('অ্যাডমিন হিসেবে লগইন করুন', 'warning');
      return;
    }
    try {
      await callApiWithFallback(
        `/api/admin/plans/${plan.id}`,
        'PUT',
        { is_active: !plan.is_active },
        async () => {
          const { error } = await supabase!
            .from('plans')
            .update({ is_active: !plan.is_active, updated_at: new Date().toISOString() })
            .eq('id', plan.id);
          if (error) throw new Error(error.message);
          await supabase!.from('admin_audit_logs').insert({
            admin_id: user!.id,
            action: plan.is_active ? 'disable_plan' : 'enable_plan',
            target_table: 'plans',
            target_id: plan.id,
            details: { title: plan.title },
          });
          return { ok: true };
        }
      );
      await fetch('/api/admin/broadcast-refresh', { method: 'POST' }).catch(() => {});
      await refreshAll();
      showToast(`Plan ${plan.is_active ? 'disabled' : 'enabled'}`, 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!hasAdminAccess()) {
      showToast('অ্যাডমিন হিসেবে লগইন করুন', 'warning');
      setDeleteTarget(null);
      return;
    }
    setSaving(true);
    try {
      await callApiWithFallback(
        `/api/admin/plans/${deleteTarget.id}`,
        'DELETE',
        {},
        async () => {
          const { error } = await supabase!.from('plans').delete().eq('id', deleteTarget.id);
          if (error) throw new Error(error.message);
          await supabase!.from('admin_audit_logs').insert({
            admin_id: user!.id,
            action: 'delete_plan',
            target_table: 'plans',
            target_id: deleteTarget.id,
            details: { title: deleteTarget.title },
          });
          return { ok: true };
        }
      );
      await fetch('/api/admin/broadcast-refresh', { method: 'POST' }).catch(() => {});
      await refreshAll();
      showToast('Plan deleted', 'success');
      setDeleteTarget(null);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-[#061844]">Manage Demo Plans</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Changes sync immediately to all User Panels via Supabase Realtime.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1250C4] hover:bg-[#0D3DA0] text-white text-xs font-semibold min-h-[42px]"
        >
          <Plus className="w-4 h-4" />
          <span>Create Demo Plan</span>
        </button>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon={<Plus className="w-5 h-5" />}
          title="No Demo Plans Configured"
          description="Create your first simulated Scania fleet plan."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-xs flex flex-col">
              <div className="h-36 bg-[#071A47] relative">
                <PlanFallbackThumbnail imageUrl={plan.image_url} title={plan.title} />
                <span
                  className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                    plan.is_active ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {plan.is_active ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display font-bold text-base text-[#061844]">{plan.title}</h2>
                    {plan.subtitle && <p className="text-xs text-slate-500">{plan.subtitle}</p>}
                  </div>
                  {plan.badge && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2 flex-1">{plan.description}</p>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block">Demo Price</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(plan.demo_price, siteSettings.currency_symbol)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Daily Sim.</span>
                    <span className="font-mono font-bold text-emerald-700 tabular-nums">
                      {formatCurrency(plan.daily_income, siteSettings.currency_symbol)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Validity</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">{plan.validity_days}d</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditing(plan)}
                    className="flex-1 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1250C4] text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(plan)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1"
                    title={plan.is_active ? 'Disable plan' : 'Enable plan'}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{plan.is_active ? 'Disable' : 'Enable'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(plan)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600"
                    title="Delete plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form
            onSubmit={handleSave}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-blue-100 overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="px-6 py-4 bg-[#061844] text-white flex items-center justify-between">
              <h3 className="font-display font-bold text-base">
                {editing.id ? 'Edit Demo Plan' : 'Create New Demo Plan'}
              </h3>
              <button type="button" onClick={() => setEditing(null)} className="p-1 rounded-lg hover:bg-white/15">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3.5 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Title</label>
                <input
                  type="text"
                  required
                  value={editing.title || ''}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={editing.subtitle || ''}
                    onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tag / Badge</label>
                  <input
                    type="text"
                    value={editing.badge || ''}
                    onChange={(e) => setEditing({ ...editing, badge: e.target.value })}
                    placeholder="Popular / Best / Elite"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Demo Price</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={editing.demo_price ?? 1000}
                    onChange={(e) => setEditing({ ...editing, demo_price: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Daily Income (Sim)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editing.daily_income ?? 100}
                    onChange={(e) => setEditing({ ...editing, daily_income: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editing.validity_days ?? 30}
                    onChange={(e) => setEditing({ ...editing, validity_days: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Image URL (Optional)</label>
                <input
                  type="url"
                  value={editing.image_url || ''}
                  onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                  placeholder="https://... (leave empty for Scania truck artwork)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={editing.is_active ?? true}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  className="rounded"
                />
                <span>Plan enabled & visible to users</span>
              </label>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[#1250C4] text-white text-xs font-semibold disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Demo Plan"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? Existing user demo products referencing this plan will prevent deletion unless deactivated instead.`}
        confirmLabel="Delete Plan"
        destructive
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
