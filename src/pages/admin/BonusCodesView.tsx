import React, { useState } from 'react';
import { Edit3, Gift, Plus, Power, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { callApiWithFallback, formatCurrency, getStoredAdminToken, supabase } from '../../lib/supabase';
import { BonusCode } from '../../types/database';
import { ConfirmModal, EmptyState, useToast } from '../../components/ui/Feedback';

export const BonusCodesView: React.FC = () => {
  const { user, isPreviewMode } = useAuth();
  const { allBonusCodes, siteSettings, refreshAll } = usePlatformData();
  const { showToast } = useToast();

  const [editing, setEditing] = useState<Partial<BonusCode> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BonusCode | null>(null);
  const [saving, setSaving] = useState(false);

  const hasAdminAccess = () => {
    const hasAdminToken = Boolean(getStoredAdminToken());
    return hasAdminToken || (!isPreviewMode && Boolean(supabase && user));
  };

  const openCreate = () =>
    setEditing({
      code: `SCANIA${Math.floor(100 + Math.random() * 899)}`,
      description: 'Promotional simulated demo credit',
      bonus_amount: 50,
      usage_limit: 100,
      is_active: true,
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
        code: String(editing.code || '').trim().toUpperCase(),
        description: String(editing.description || '').trim(),
        bonus_amount: Number(editing.bonus_amount || 0),
        usage_limit: Number(editing.usage_limit || 1),
        is_active: editing.is_active ?? true,
      };

      if (editing.id) {
        await callApiWithFallback(
          `/api/admin/bonus-codes/${editing.id}`,
          'PUT',
          payload,
          async () => {
            const { error } = await supabase!.from('bonus_codes').update(payload).eq('id', editing.id!);
            if (error) throw new Error(error.message);
            return { ok: true };
          }
        );
      } else {
        await callApiWithFallback(
          '/api/admin/bonus-codes',
          'POST',
          payload,
          async () => {
            const { error } = await supabase!.from('bonus_codes').insert(payload);
            if (error) throw new Error(error.message);
            return { ok: true };
          }
        );
      }
      await refreshAll();
      showToast('বোনাস কোড সংরক্ষিত হয়েছে', 'success');
      setEditing(null);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: BonusCode) => {
    if (!hasAdminAccess()) {
      showToast('অ্যাডমিন হিসেবে লগইন করুন', 'warning');
      return;
    }
    try {
      await callApiWithFallback(
        `/api/admin/bonus-codes/${item.id}`,
        'PUT',
        { is_active: !item.is_active },
        async () => {
          const { error } = await supabase!
            .from('bonus_codes')
            .update({ is_active: !item.is_active })
            .eq('id', item.id);
          if (error) throw new Error(error.message);
          return { ok: true };
        }
      );
      await refreshAll();
      showToast(`Bonus code ${item.is_active ? 'disabled' : 'enabled'}`, 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !hasAdminAccess()) {
      setDeleteTarget(null);
      return;
    }
    setSaving(true);
    try {
      await callApiWithFallback(
        `/api/admin/bonus-codes/${deleteTarget.id}`,
        'DELETE',
        {},
        async () => {
          const { error } = await supabase!.from('bonus_codes').delete().eq('id', deleteTarget.id);
          if (error) throw new Error(error.message);
          return { ok: true };
        }
      );
      await refreshAll();
      showToast('Bonus code deleted', 'success');
      setDeleteTarget(null);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-[#061844]">Bonus Codes (Demo)</h1>
          <p className="text-xs text-slate-500 mt-0.5">Create and manage simulated demo bonus codes.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1250C4] text-white text-xs font-semibold min-h-[42px]"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Bonus Code</span>
        </button>
      </div>

      {allBonusCodes.length === 0 ? (
        <EmptyState
          icon={<Gift className="w-5 h-5" />}
          title="No Bonus Codes Created"
          description="Create a demo bonus code for users to redeem in the User Panel."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-xs overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <th className="py-3 px-4 font-semibold">Code</th>
                <th className="py-3 px-4 font-semibold">Demo Amount</th>
                <th className="py-3 px-4 font-semibold">Usage</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allBonusCodes.map((b) => (
                <tr key={b.id}>
                  <td className="py-3 px-4 font-mono font-bold text-[#061844]">{b.code}</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700 tabular-nums">
                    {formatCurrency(b.bonus_amount, siteSettings.currency_symbol)}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums">
                    {b.used_count} / {b.usage_limit}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{b.description}</td>
                  <td className="py-3 px-4">
                    <span className={`font-bold ${b.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {b.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditing(b)}
                        className="p-1.5 rounded-lg bg-blue-50 text-[#1250C4]"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(b)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-700"
                        title="Toggle active"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(b)}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form onSubmit={handleSave} className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-[#061844]">
                {editing.id ? 'Edit Bonus Code' : 'Create Bonus Code'}
              </h3>
              <button type="button" onClick={() => setEditing(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Code</label>
              <input
                type="text"
                required
                value={editing.code || ''}
                onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono uppercase text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Demo Bonus Amount</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={editing.bonus_amount ?? 50}
                  onChange={(e) => setEditing({ ...editing, bonus_amount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Usage Limit</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editing.usage_limit ?? 100}
                  onChange={(e) => setEditing({ ...editing, usage_limit: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <input
                type="text"
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
              />
              <span>Active</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-[#1250C4] text-white text-xs font-semibold"
              >
                {saving ? 'Saving...' : 'Save Code'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Bonus Code"
        message={`Delete bonus code "${deleteTarget?.code}"?`}
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
