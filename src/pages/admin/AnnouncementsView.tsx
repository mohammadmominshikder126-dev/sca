import React, { useState } from 'react';
import { Edit3, Globe, Megaphone, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { callApiWithFallback, formatDateTime, supabase } from '../../lib/supabase';
import { Announcement } from '../../types/database';
import { ConfirmModal, EmptyState, useToast } from '../../components/ui/Feedback';

export const AnnouncementsView: React.FC = () => {
  const { user, isPreviewMode } = useAuth();
  const { announcements, refreshAll } = usePlatformData();
  const { showToast } = useToast();

  const [editing, setEditing] = useState<Partial<Announcement> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);

  const hasAdminAccess = () => {
    const hasAdminToken =
      typeof window !== 'undefined' && Boolean(window.sessionStorage.getItem('scania_admin_token'));
    return hasAdminToken || (!isPreviewMode && Boolean(supabase && user));
  };

  const openCreate = () =>
    setEditing({
      title: '',
      content: '',
      priority: 'normal',
      is_published: true,
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
        content: String(editing.content || '').trim(),
        priority: editing.priority || 'normal',
        is_published: editing.is_published ?? true,
        updated_at: new Date().toISOString(),
      };
      if (editing.id) {
        await callApiWithFallback(
          `/api/admin/announcements/${editing.id}`,
          'PUT',
          payload,
          async () => {
            const { error } = await supabase!.from('announcements').update(payload).eq('id', editing.id!);
            if (error) throw new Error(error.message);
            return { ok: true };
          }
        );
      } else {
        await callApiWithFallback(
          '/api/admin/announcements',
          'POST',
          payload,
          async () => {
            const { error } = await supabase!.from('announcements').insert({ ...payload, created_by: user!.id });
            if (error) throw new Error(error.message);
            return { ok: true };
          }
        );
      }
      await fetch('/api/admin/broadcast-refresh', { method: 'POST' }).catch(() => {});
      await refreshAll();
      showToast('নোটিশ সংরক্ষিত ও ইউজার প্যানেলে সিঙ্ক হয়েছে', 'success');
      setEditing(null);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (item: Announcement) => {
    if (!hasAdminAccess()) {
      showToast('অ্যাডমিন হিসেবে লগইন করুন', 'warning');
      return;
    }
    try {
      await callApiWithFallback(
        `/api/admin/announcements/${item.id}`,
        'PUT',
        { is_published: !item.is_published },
        async () => {
          const { error } = await supabase!
            .from('announcements')
            .update({ is_published: !item.is_published, updated_at: new Date().toISOString() })
            .eq('id', item.id);
          if (error) throw new Error(error.message);
          return { ok: true };
        }
      );
      await fetch('/api/admin/broadcast-refresh', { method: 'POST' }).catch(() => {});
      await refreshAll();
      showToast(`Notice ${item.is_published ? 'unpublished' : 'published'}`, 'success');
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
        `/api/admin/announcements/${deleteTarget.id}`,
        'DELETE',
        {},
        async () => {
          const { error } = await supabase!.from('announcements').delete().eq('id', deleteTarget.id);
          if (error) throw new Error(error.message);
          return { ok: true };
        }
      );
      await fetch('/api/admin/broadcast-refresh', { method: 'POST' }).catch(() => {});
      await refreshAll();
      showToast('Notice deleted', 'success');
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
          <h1 className="font-display text-xl font-bold text-[#061844]">Announcements & Notices</h1>
          <p className="text-xs text-slate-500 mt-0.5">Published notices sync immediately to the User Home ticker.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1250C4] text-white text-xs font-semibold min-h-[42px]"
        >
          <Plus className="w-4 h-4" />
          <span>Create Notice</span>
        </button>
      </div>

      {announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="w-5 h-5" />}
          title="No Announcements Yet"
          description="Create a platform notice for demo users."
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl p-4 sm:p-5 border border-blue-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-bold text-sm text-[#061844]">{a.title}</h2>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      a.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {a.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{a.content}</p>
                <p className="text-[11px] text-slate-400 mt-1.5">{formatDateTime(a.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => togglePublish(a)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{a.is_published ? 'Unpublish' : 'Publish'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(a)}
                  className="p-2 rounded-xl bg-blue-50 text-[#1250C4]"
                  title="Edit"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(a)}
                  className="p-2 rounded-xl bg-rose-50 text-rose-600"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form onSubmit={handleSave} className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-[#061844]">
                {editing.id ? 'Edit Notice' : 'Create Notice'}
              </h3>
              <button type="button" onClick={() => setEditing(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Title</label>
              <input
                type="text"
                required
                value={editing.title || ''}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Content</label>
              <textarea
                rows={4}
                required
                value={editing.content || ''}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={editing.is_published ?? true}
                  onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })}
                />
                <span>Publish immediately</span>
              </label>
              <select
                value={editing.priority || 'normal'}
                onChange={(e) => setEditing({ ...editing, priority: e.target.value as 'normal' | 'important' })}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white"
              >
                <option value="normal">Normal</option>
                <option value="important">Important</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
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
                {saving ? 'Saving...' : 'Save Notice'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Notice"
        message={`Delete announcement "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
