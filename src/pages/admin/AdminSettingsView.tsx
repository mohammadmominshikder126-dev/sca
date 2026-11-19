import React, { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { formatDateTime } from '../../lib/supabase';
import { useToast } from '../../components/ui/Feedback';

export const AdminSettingsView: React.FC = () => {
  const { user, profile, updatePassword, isPreviewMode } = useAuth();
  const { auditLogs } = usePlatformData();
  const { showToast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreviewMode || !user) {
      showToast('Connect Supabase to change admin password', 'warning');
      return;
    }
    if (newPassword.length < 6 || newPassword !== confirmPassword) {
      showToast('Passwords must match and be at least 6 characters', 'error');
      return;
    }
    setSaving(true);
    const res = await updatePassword(newPassword);
    setSaving(false);
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    showToast('Admin password updated via Supabase Auth', 'success');
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-bold text-[#061844]">Admin Security & Audit Logs</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your administrator credentials and inspect server-recorded administrative actions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <form
          onSubmit={handleUpdatePassword}
          className="lg:col-span-5 bg-white rounded-2xl p-5 border border-blue-100 space-y-4 h-fit"
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#1250C4]" />
            <h2 className="font-display font-bold text-sm text-[#061844]">Update Admin Password</h2>
          </div>
          <p className="text-xs text-slate-500">
            Signed in as <strong>{profile?.email || 'Admin'}</strong>
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-[#1250C4] text-white text-xs font-semibold min-h-[42px]"
          >
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-blue-100 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1250C4]" />
            <h2 className="font-display font-bold text-sm text-[#061844]">Admin Audit Log</h2>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              Administrative mutations are recorded here once Supabase is connected.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900 capitalize">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-[11px] font-mono text-slate-500">
                      {log.target_table} · {log.target_id}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">{formatDateTime(log.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
