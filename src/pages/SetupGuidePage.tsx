import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Database, KeyRound, Server, ShieldAlert } from 'lucide-react';
import { ScaniaLogoEmblem } from '../components/ScaniaVisuals';
import { isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../components/ui/Feedback';

const ADMIN_SQL = `-- 1. Register an account via /register (or Supabase Auth Users)
-- 2. Replace the UUID below with your user's auth.users id and run in SQL Editor:
update public.user_roles
set role = 'admin'
where user_id = 'YOUR-USER-UUID-HERE';`;

const ENV_SAMPLE = `VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"`;

export const SetupGuidePage: React.FC = () => {
  const { showToast } = useToast();
  const [health, setHealth] = useState<{ supabaseConfigured?: boolean; adminApiReady?: boolean } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setHealth(d))
      .catch(() => setHealth(null));
  }, []);

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      showToast('Copied to clipboard', 'success');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      showToast('Unable to copy automatically', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF4FB] text-slate-900">
      <header className="bg-[#061844] text-white border-b border-blue-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 text-sm font-medium text-blue-100 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <ScaniaLogoEmblem className="w-7 h-7" />
            <span className="font-display font-bold text-sm">Supabase Setup & Security Guide</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Live Connection Status */}
        <div className="bg-white rounded-2xl border border-blue-100 p-6">
          <h1 className="font-display text-2xl font-bold text-[#061844]">Cloud Database Connection Status</h1>
          <p className="text-sm text-slate-600 mt-1">
            All persistent user accounts, plans, simulated transactions, tickets, and Realtime updates use Supabase PostgreSQL.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Database className="w-4 h-4 text-[#1250C4]" />
                <span>Frontend Supabase Client</span>
              </div>
              <p className={`text-sm font-bold mt-1.5 ${isSupabaseConfigured ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isSupabaseConfigured ? 'Configured & Active' : 'Not Configured (Preview Mode)'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Server className="w-4 h-4 text-[#1250C4]" />
                <span>Backend Express Server</span>
              </div>
              <p className={`text-sm font-bold mt-1.5 ${health ? 'text-emerald-700' : 'text-slate-600'}`}>
                {health ? 'Online (/api/health OK)' : 'Static Build / Server Offline'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <KeyRound className="w-4 h-4 text-[#1250C4]" />
                <span>Service Role Admin Key</span>
              </div>
              <p className={`text-sm font-bold mt-1.5 ${health?.adminApiReady ? 'text-emerald-700' : 'text-amber-700'}`}>
                {health?.adminApiReady ? 'Loaded Securely on Server' : 'Add SUPABASE_SERVICE_ROLE_KEY'}
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: SQL Schema */}
        <div className="bg-white rounded-2xl border border-blue-100 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-[#061844]">Step 1: Run Supabase SQL Schema</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Execute the full script located at <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">/supabase/schema.sql</code> in your Supabase SQL Editor.
              </p>
            </div>
            <Link
              to="/register"
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#1250C4] text-white hover:bg-[#0D3DA0]"
            >
              Go to Registration
            </Link>
          </div>
          <ul className="mt-4 space-y-1.5 text-sm text-slate-700 list-disc pl-5">
            <li>Creates all 16 relational tables with strict foreign keys and check constraints.</li>
            <li>Enables Row Level Security (RLS) so normal users can only access their own records.</li>
            <li>Configures <code className="font-mono text-xs bg-slate-100 px-1 rounded">supabase_realtime</code> for instant Admin-to-User sync.</li>
            <li>Provisions the <code className="font-mono text-xs bg-slate-100 px-1 rounded">scania-media</code> Storage bucket and seeds initial demo plans.</li>
          </ul>
        </div>

        {/* Step 2: Environment Variables */}
        <div className="bg-white rounded-2xl border border-blue-100 p-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="font-display text-lg font-bold text-[#061844]">Step 2: Configure Environment Variables</h2>
              <p className="text-xs text-slate-500">Add these keys to <code className="font-mono">.env</code> or AI Studio / Netlify / Cloudflare Secrets.</p>
            </div>
            <button
              type="button"
              onClick={() => copyText('env', ENV_SAMPLE)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800"
            >
              {copiedKey === 'env' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy .env</span>
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 text-blue-100 text-xs font-mono overflow-x-auto leading-relaxed">
            {ENV_SAMPLE}
          </pre>
          <div className="mt-3 flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Never prefix <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> with <code className="font-mono">VITE_</code>. It stays strictly on the Express backend.
            </span>
          </div>
        </div>

        {/* Step 3: Promote Admin */}
        <div className="bg-white rounded-2xl border border-blue-100 p-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="font-display text-lg font-bold text-[#061844]">Step 3: Create First Admin Account</h2>
              <p className="text-xs text-slate-500">Promote a registered Supabase user to admin inside SQL Editor.</p>
            </div>
            <button
              type="button"
              onClick={() => copyText('admin', ADMIN_SQL)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800"
            >
              {copiedKey === 'admin' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy SQL</span>
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 text-emerald-200 text-xs font-mono overflow-x-auto leading-relaxed">
            {ADMIN_SQL}
          </pre>
        </div>
      </main>
    </div>
  );
};
