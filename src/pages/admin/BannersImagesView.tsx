import React, { useState } from 'react';
import { Image, Plus, Trash2, Upload, X } from 'lucide-react';
import { ScaniaImage } from '../../components/ScaniaVisuals';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { callApiWithFallback, supabase } from '../../lib/supabase';
import { Banner, BannerPlacement } from '../../types/database';
import { ConfirmModal, EmptyState, useToast } from '../../components/ui/Feedback';

export const BannersImagesView: React.FC = () => {
  const { user, isPreviewMode } = useAuth();
  const { banners, plans, siteSettings, refreshAll } = usePlatformData();
  const { showToast } = useToast();

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('SCANIA Together We Grow');
  const [subtitle, setSubtitle] = useState('Simulated Fleet Investment Demo');
  const [placement, setPlacement] = useState<BannerPlacement>('home_hero');
  const [imageUrl, setImageUrl] = useState('');
  const [storagePath, setStoragePath] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);

  // Quick site logo update
  const [logoUrl, setLogoUrl] = useState(siteSettings.logo_url || '');

  const hasAdminAccess = () => {
    const hasAdminToken =
      typeof window !== 'undefined' && Boolean(window.sessionStorage.getItem('scania_admin_token'));
    return hasAdminToken || (!isPreviewMode && Boolean(supabase && user));
  };

  const handleFileUpload = async (file: File, onComplete: (publicUrl: string, path: string) => void) => {
    if (isPreviewMode || !supabase || !user) {
      showToast('ছবি আপলোডের জন্য ইমেজ URL দিন অথবা Supabase স্টোরেজ সংযুক্ত করুন', 'warning');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Max file size is 5MB', 'error');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      const base64: string = await new Promise((resolve, reject) => {
        reader.onload = () => {
          const res = String(reader.result || '');
          resolve(res.split(',')[1] || '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const uploaded = await callApiWithFallback<{ publicUrl: string; storagePath: string }>(
        '/api/admin/upload',
        'POST',
        { fileName: file.name, mimeType: file.type, base64Data: base64 },
        async () => {
          const safePath = `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const { error } = await supabase!.storage
            .from('scania-media')
            .upload(safePath, file, { upsert: true });
          if (error) throw new Error(error.message);
          const { data } = supabase!.storage.from('scania-media').getPublicUrl(safePath);
          return { publicUrl: data.publicUrl, storagePath: safePath };
        }
      );

      onComplete(uploaded.publicUrl, uploaded.storagePath);
      showToast('Image uploaded to Supabase Storage', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAdminAccess()) {
      showToast('অ্যাডমিন হিসেবে লগইন করুন', 'warning');
      return;
    }
    if (!imageUrl.trim()) {
      showToast('Upload an image or provide an image URL', 'error');
      return;
    }
    setSaving(true);
    try {
      await callApiWithFallback(
        '/api/admin/banners',
        'POST',
        {
          title: title.trim(),
          subtitle: subtitle.trim(),
          placement,
          image_url: imageUrl.trim(),
          storage_path: storagePath,
        },
        async () => {
          const { error } = await supabase!.from('banners').insert({
            title: title.trim(),
            subtitle: subtitle.trim(),
            placement,
            image_url: imageUrl.trim(),
            storage_path: storagePath,
            is_active: true,
          });
          if (error) throw new Error(error.message);
          return { ok: true };
        }
      );
      await refreshAll();
      showToast('Banner published and synced in real time', 'success');
      setCreating(false);
      setImageUrl('');
      setStoragePath('');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAdminAccess()) {
      showToast('অ্যাডমিন হিসেবে লগইন করুন', 'warning');
      return;
    }
    setSaving(true);
    try {
      await callApiWithFallback(
        '/api/admin/site-settings',
        'POST',
        { logo_url: logoUrl.trim() },
        async () => {
          const { error } = await supabase!
            .from('site_settings')
            .update({ logo_url: logoUrl.trim(), updated_at: new Date().toISOString() })
            .eq('id', 1);
          if (error) throw new Error(error.message);
          return { ok: true };
        }
      );
      await refreshAll();
      showToast('Website logo updated across all portals', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignPlanImage = async (planId: string, url: string) => {
    if (!hasAdminAccess()) {
      showToast('অ্যাডমিন হিসেবে লগইন করুন', 'warning');
      return;
    }
    try {
      await callApiWithFallback(
        `/api/admin/plans/${planId}`,
        'PUT',
        { image_url: url },
        async () => {
          const { error } = await supabase!
            .from('plans')
            .update({ image_url: url, updated_at: new Date().toISOString() })
            .eq('id', planId);
          if (error) throw new Error(error.message);
          return { ok: true };
        }
      );
      await refreshAll();
      showToast('Plan image updated', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleDeleteBanner = async () => {
    if (!deleteTarget || !hasAdminAccess()) {
      setDeleteTarget(null);
      return;
    }
    setSaving(true);
    try {
      await callApiWithFallback(
        `/api/admin/banners/${deleteTarget.id}`,
        'DELETE',
        {},
        async () => {
          if (deleteTarget.storage_path) {
            await supabase!.storage.from('scania-media').remove([deleteTarget.storage_path]);
          }
          const { error } = await supabase!.from('banners').delete().eq('id', deleteTarget.id);
          if (error) throw new Error(error.message);
          return { ok: true };
        }
      );
      await refreshAll();
      showToast('Banner removed', 'success');
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
          <h1 className="font-display text-xl font-bold text-[#061844]">Banners & Media Storage</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload images to Supabase Storage (`scania-media`) to update homepage banners, plan cards, and platform logo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1250C4] text-white text-xs font-semibold min-h-[42px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Banner</span>
        </button>
      </div>

      {/* Logo Manager */}
      <form onSubmit={handleUpdateLogo} className="bg-white rounded-2xl p-5 border border-blue-100 space-y-3">
        <h2 className="font-display font-bold text-sm text-[#061844]">Brand Logo Image</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="Logo image URL (leave empty for Scania Griffin Emblem)"
            className="flex-1 min-w-[240px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
          />
          <label className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            <span>{uploading ? 'Uploading...' : 'Upload Logo'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f, (url) => setLogoUrl(url));
              }}
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-[#1250C4] text-white text-xs font-semibold"
          >
            Save Logo
          </button>
        </div>
      </form>

      {/* Banners Grid */}
      <div className="bg-white rounded-2xl p-5 border border-blue-100 space-y-4">
        <h2 className="font-display font-bold text-sm text-[#061844]">Active Homepage & Portal Banners</h2>
        {banners.length === 0 ? (
          <EmptyState
            icon={<Image className="w-5 h-5" />}
            title="Using Default Scania Truck Vector Banners"
            description="Upload a custom banner image to override the default Scania highway truck illustrations."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map((b) => (
              <div key={b.id} className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
                <div className="h-36 bg-[#071A47]">
                  <ScaniaImage src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">{b.title}</p>
                    <p className="text-[11px] font-mono text-[#1250C4]">{b.placement}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(b)}
                    className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100"
                    title="Remove banner"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Plan Image Assigner */}
      <div className="bg-white rounded-2xl p-5 border border-blue-100 space-y-3">
        <h2 className="font-display font-bold text-sm text-[#061844]">Plan Card Images</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {plans.map((p) => (
            <div key={p.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <p className="text-xs font-bold text-slate-900 truncate">{p.title}</p>
              <label className="w-full py-2 px-3 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-[#1250C4] hover:bg-blue-50 cursor-pointer flex items-center justify-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Plan Image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, (url) => handleAssignPlanImage(p.id, url));
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form onSubmit={handleCreateBanner} className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-[#061844]">Publish New Banner</h3>
              <button type="button" onClick={() => setCreating(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Placement</label>
              <select
                value={placement}
                onChange={(e) => setPlacement(e.target.value as BannerPlacement)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="home_hero">Home Hero Truck Banner</option>
                <option value="plans_promo">Scania Plans Promo Banner</option>
                <option value="team_hero">Team Page Hero Banner</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subtitle</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Upload to Supabase Storage</label>
              <label className="w-full py-3 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 text-xs font-semibold text-[#1250C4] flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'Uploading...' : 'Select Image File (Max 5MB)'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      handleFileUpload(f, (url, path) => {
                        setImageUrl(url);
                        setStoragePath(path);
                      });
                    }
                  }}
                />
              </label>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Or Image URL</label>
              <input
                type="url"
                required
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="px-4 py-2 rounded-xl bg-[#1250C4] text-white text-xs font-semibold"
              >
                {saving ? 'Publishing...' : 'Publish Banner'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Remove Banner"
        message={`Remove banner "${deleteTarget?.title}"?`}
        confirmLabel="Remove"
        destructive
        loading={saving}
        onConfirm={handleDeleteBanner}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
