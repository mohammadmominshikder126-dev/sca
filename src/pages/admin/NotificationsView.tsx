import React, { useState } from 'react';
import { Bell, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { callApiWithFallback, formatDateTime, supabase } from '../../lib/supabase';
import { AppNotification } from '../../types/database';
import { useToast } from '../../components/ui/Feedback';

export const NotificationsView: React.FC = () => {
  const { user, isPreviewMode } = useAuth();
  const { allProfiles, notifications, refreshAll } = usePlatformData();
  const { showToast } = useToast();

  const [audience, setAudience] = useState<'all' | 'selected'>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<AppNotification['category']>('system');
  const [sending, setSending] = useState(false);

  const hasAdminAccess = () => {
    const hasAdminToken =
      typeof window !== 'undefined' && Boolean(window.sessionStorage.getItem('scania_admin_token'));
    return hasAdminToken || (!isPreviewMode && Boolean(supabase && user));
  };

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAdminAccess()) {
      showToast('অ্যাডমিন হিসেবে লগইন করুন', 'warning');
      return;
    }
    if (audience === 'selected' && selectedUserIds.length === 0) {
      showToast('Select at least one recipient user', 'error');
      return;
    }

    setSending(true);
    try {
      await callApiWithFallback(
        '/api/admin/notifications',
        'POST',
        {
          title: title.trim(),
          message: message.trim(),
          category,
          userIds: audience === 'selected' ? selectedUserIds : [],
        },
        async () => {
          if (audience === 'all') {
            const { error } = await supabase!.from('notifications').insert({
              user_id: null,
              title: title.trim(),
              message: message.trim(),
              category,
            });
            if (error) throw new Error(error.message);
          } else {
            const rows = selectedUserIds.map((uid) => ({
              user_id: uid,
              title: title.trim(),
              message: message.trim(),
              category,
            }));
            const { error } = await supabase!.from('notifications').insert(rows);
            if (error) throw new Error(error.message);
          }
          return { ok: true };
        }
      );

      setTitle('');
      setMessage('');
      setSelectedUserIds([]);
      await refreshAll();
      showToast('নোটিফিকেশন সফলভাবে পাঠানো হয়েছে', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-bold text-[#061844]">Notifications Center</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Broadcast alerts to all users or target selected accounts immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <form onSubmit={handleSend} className="lg:col-span-5 bg-white rounded-2xl p-5 border border-blue-100 space-y-4">
          <h2 className="font-display font-bold text-sm text-[#061844]">Compose Notification</h2>

          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setAudience('all')}
              className={`py-2 rounded-lg text-xs font-semibold ${
                audience === 'all' ? 'bg-white text-[#061844] shadow-xs' : 'text-slate-600'
              }`}
            >
              All Users (Broadcast)
            </button>
            <button
              type="button"
              onClick={() => setAudience('selected')}
              className={`py-2 rounded-lg text-xs font-semibold ${
                audience === 'selected' ? 'bg-white text-[#061844] shadow-xs' : 'text-slate-600'
              }`}
            >
              Selected Users ({selectedUserIds.length})
            </button>
          </div>

          {audience === 'selected' && (
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {allProfiles.map((p) => (
                <label key={p.id} className="flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(p.id)}
                    onChange={() => toggleUser(p.id)}
                  />
                  <span className="font-semibold text-slate-800">{p.full_name}</span>
                  <span className="font-mono text-slate-400 ml-auto">{p.scania_id}</span>
                </label>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AppNotification['category'])}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
            >
              <option value="system">System Update</option>
              <option value="announcement">Announcement</option>
              <option value="bonus">Demo Bonus</option>
              <option value="transaction">Transaction</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification headline"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write notification details..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full py-3 rounded-xl bg-[#1250C4] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? 'Dispatching...' : 'Send Notification'}</span>
          </button>
        </form>

        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-blue-100 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#1250C4]" />
            <h2 className="font-display font-bold text-sm text-[#061844]">Recent Notifications Log</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {notifications.slice(0, 12).map((n) => (
              <div key={n.id} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-900">{n.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {n.user_id ? 'Targeted User' : 'All Users Broadcast'} · {formatDateTime(n.created_at)}
                  </p>
                </div>
                <span className="text-[10px] font-semibold uppercase text-[#1250C4] shrink-0">{n.category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
