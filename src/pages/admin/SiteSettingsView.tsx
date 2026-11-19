import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { supabase } from '../../lib/supabase';
import { SiteSettings } from '../../types/database';
import { useToast } from '../../components/ui/Feedback';

export const SiteSettingsView: React.FC = () => {
  const { user, isPreviewMode } = useAuth();
  const { siteSettings, refreshAll } = usePlatformData();
  const { showToast } = useToast();

  const [form, setForm] = useState<SiteSettings>(siteSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(siteSettings);
  }, [siteSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    try {
      const payload = {
        site_name: form.site_name.trim(),
        logo_url: form.logo_url.trim(),
        currency_symbol: form.currency_symbol.trim() || '৳',
        support_email: form.support_email.trim(),
        support_phone: form.support_phone.trim(),
        telegram_link: form.telegram_link.trim(),
        deposit_bkash_number: (form.deposit_bkash_number || '01995616092').trim(),
        deposit_nagad_number: (form.deposit_nagad_number || '01995616092').trim(),
        theme_accent: form.theme_accent.trim() || '#1250C4',
        show_team_tab: form.show_team_tab,
        show_bonus_button: form.show_bonus_button,
        footer_text: form.footer_text.trim(),
        about_text: form.about_text.trim(),
        updated_at: new Date().toISOString(),
      };

      const adminToken =
        typeof window !== 'undefined' ? window.sessionStorage.getItem('scania_admin_token') : null;

      if (!isPreviewMode && supabase && user && !adminToken) {
        const { error } = await supabase.from('site_settings').update(payload).eq('id', 1);
        if (!error) {
          await supabase.from('admin_audit_logs').insert({
            admin_id: user.id,
            action: 'update_site_settings',
            target_table: 'site_settings',
            target_id: '1',
            details: payload,
          });
        }
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        await fetch('/api/admin/site-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/admin/site-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
          },
          body: JSON.stringify(payload),
        });
      }

      await refreshAll();
      showToast('Site settings saved & synced live', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="font-display text-xl font-bold text-[#061844]">Site Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Global platform branding, support links, navigation visibility, and footer text synced across all clients.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 border border-blue-100 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Website Name</label>
            <input
              type="text"
              required
              value={form.site_name}
              onChange={(e) => setForm({ ...form, site_name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Demo Currency Symbol</label>
            <input
              type="text"
              required
              maxLength={4}
              value={form.currency_symbol}
              onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Support Email</label>
            <input
              type="email"
              value={form.support_email}
              onChange={(e) => setForm({ ...form, support_email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Support Phone</label>
            <input
              type="text"
              value={form.support_phone}
              onChange={(e) => setForm({ ...form, support_phone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">GoPay bKash Number</label>
            <input
              type="text"
              value={form.deposit_bkash_number ?? '01995616092'}
              onChange={(e) => setForm({ ...form, deposit_bkash_number: e.target.value })}
              placeholder="01995616092"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">GoPay Nagad Number</label>
            <input
              type="text"
              value={form.deposit_nagad_number ?? '01995616092'}
              onChange={(e) => setForm({ ...form, deposit_nagad_number: e.target.value })}
              placeholder="01995616092"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Telegram Group Link</label>
            <input
              type="url"
              value={form.telegram_link}
              onChange={(e) => setForm({ ...form, telegram_link: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Theme Primary Accent</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.theme_accent}
                onChange={(e) => setForm({ ...form, theme_accent: e.target.value })}
                className="w-11 h-10 rounded-lg border border-slate-200"
              />
              <input
                type="text"
                value={form.theme_accent}
                onChange={(e) => setForm({ ...form, theme_accent: e.target.value })}
                className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-xs"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.show_team_tab}
              onChange={(e) => setForm({ ...form, show_team_tab: e.target.checked })}
            />
            <span>Show Team Tab in User Navigation</span>
          </label>
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.show_bonus_button}
              onChange={(e) => setForm({ ...form, show_bonus_button: e.target.checked })}
            />
            <span>Show Bonus Code Button on User Home</span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">About Us Content</label>
          <textarea
            rows={3}
            value={form.about_text}
            onChange={(e) => setForm({ ...form, about_text: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Footer Text</label>
          <input
            type="text"
            value={form.footer_text}
            onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1250C4] hover:bg-[#0D3DA0] text-white text-xs font-semibold min-h-[44px]"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Settings...' : 'Save Site Settings'}</span>
        </button>
      </form>
    </div>
  );
};
