import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, Copy, Database, KeyRound, Server, ShieldAlert } from 'lucide-react';
import { ScaniaLogoEmblem } from '../components/ScaniaVisuals';
import { useAuth } from '../contexts/AuthContext';
import { hydrateRuntimeSupabaseConfig, isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../components/ui/Feedback';
import schemaSql from '../../supabase/schema.sql?raw';

const ADMIN_SQL = `-- 1. Register an account via /register (or Supabase Auth Users)
-- 2. Replace the UUID below with your user's auth.users id and run in SQL Editor:
update public.user_roles
set role = 'admin'
where user_id = 'YOUR-USER-UUID-HERE';`;

const ENV_SAMPLE = `VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"`;

const WORKER_SECRETS_SAMPLE = `npx wrangler secret put VITE_SUPABASE_URL
npx wrangler secret put VITE_SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY`;

interface HealthResponse {
  ok?: boolean;
  runtime?: string;
  supabaseConfigured?: boolean;
  adminApiReady?: boolean;
  schemaReady?: boolean;
  missingTables?: string[];
  serviceKeyType?: string;
  plansStatus?: {
    count?: number;
    error?: string | null;
  };
}

export const SetupGuidePage: React.FC = () => {
  const { showToast } = useToast();
  const { isPreviewMode } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [runtimeConfigured, setRuntimeConfigured] = useState(isSupabaseConfigured);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    hydrateRuntimeSupabaseConfig()
      .then((ok) => setRuntimeConfigured(ok || isSupabaseConfigured))
      .catch(() => {});

    fetch('/api/health', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: HealthResponse) => {
        setHealth(d);
        if (d.supabaseConfigured) {
          setRuntimeConfigured(true);
        }
      })
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

  const frontendReady = runtimeConfigured || !isPreviewMode || Boolean(health?.supabaseConfigured);
  const keyType = health?.serviceKeyType;
  const badKey = keyType === 'jwt-malformed' || keyType === 'sb_publishable';

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
              <p className={`text-sm font-bold mt-1.5 ${frontendReady ? 'text-emerald-700' : 'text-amber-700'}`}>
                {frontendReady ? 'Configured & Active' : 'Not Configured (Preview Mode)'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Server className="w-4 h-4 text-[#1250C4]" />
                <span>Backend Server / Worker</span>
              </div>
              <p className={`text-sm font-bold mt-1.5 ${health ? 'text-emerald-700' : 'text-slate-600'}`}>
                {health
                  ? `Online (${health.runtime === 'cloudflare-worker' ? 'Cloudflare Worker' : 'Express'})`
                  : 'Static Build / Server Offline'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <KeyRound className="w-4 h-4 text-[#1250C4]" />
                <span>Service Role Admin Key</span>
              </div>
              <p
                className={`text-sm font-bold mt-1.5 ${
                  health?.adminApiReady ? 'text-emerald-700' : badKey ? 'text-rose-700' : 'text-amber-700'
                }`}
              >
                {health?.adminApiReady
                  ? 'Loaded Securely on Server'
                  : badKey
                  ? `Invalid Key Format (${keyType})`
                  : 'Add SUPABASE_SERVICE_ROLE_KEY'}
              </p>
            </div>
          </div>

          {badKey && (
            <div className="mt-4 flex items-start gap-2.5 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="space-y-1">
                <p className="font-bold">Service Role Key Error ({keyType})</p>
                <p>
                  Secrets should contain ONLY the raw key value (do not include <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY=</code> or quotes inside the Secret value field), and make sure you copied the <code className="font-mono">service_role</code> secret key (not the publishable/anon key).
                </p>
              </div>
            </div>
          )}

          {health?.adminApiReady && health?.schemaReady === false && (
            <div className="mt-4 flex items-start gap-2.5 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div className="space-y-1">
                <p className="font-bold">Supabase SQL Schema Missing Tables</p>
                <p>
                  Missing tables detected: <code className="font-mono">{(health.missingTables || ['plans']).join(', ')}</code>.
                  Open your Supabase Dashboard → SQL Editor and run the entire <code className="font-mono">/supabase/schema.sql</code> file.
                </p>
              </div>
            </div>
          )}
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => copyText('schema', schemaSql)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {copiedKey === 'schema' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'schema' ? 'Copied schema.sql' : 'Copy Full schema.sql'}</span>
              </button>
              <Link
                to="/register"
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#1250C4] text-white hover:bg-[#0D3DA0]"
              >
                Go to Registration
              </Link>
            </div>
          </div>
          <ul className="mt-4 space-y-1.5 text-sm text-slate-700 list-disc pl-5">
            <li>Creates all 16 relational tables with strict foreign keys and check constraints.</li>
            <li>Enables Row Level Security (RLS) so normal users can only access their own records.</li>
            <li>Configures <code className="font-mono text-xs bg-slate-100 px-1 rounded">supabase_realtime</code> for instant Admin-to-User sync.</li>
            <li>Provisions the <code className="font-mono text-xs bg-slate-100 px-1 rounded">scania-media</code> Storage bucket and seeds initial demo plans.</li>
          </ul>
        </div>

        {/* Step 2: Environment Variables */}
        <div className="bg-white rounded-2xl border border-blue-100 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-[#061844]">Step 2: Configure Environment Variables</h2>
              <p className="text-xs text-slate-500">Add pure secret values (without quotes or KEY= prefixes) in AI Studio Secrets and Cloudflare Workers Secrets.</p>
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

          <div className="flex items-center justify-between gap-3 pt-1">
            <div>
              <h3 className="font-display text-sm font-bold text-[#061844]">Cloudflare Workers (workers.dev) Secrets</h3>
              <p className="text-xs text-slate-500">Run these 3 commands or add the same 3 secrets in Cloudflare Dashboard → Workers → Settings → Variables and Secrets:</p>
            </div>
            <button
              type="button"
              onClick={() => copyText('worker', WORKER_SECRETS_SAMPLE)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800"
            >
              {copiedKey === 'worker' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy Wrangler</span>
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 text-sky-200 text-xs font-mono overflow-x-auto leading-relaxed">
            {WORKER_SECRETS_SAMPLE}
          </pre>

          <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Never prefix <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> with <code className="font-mono">VITE_</code>. It stays strictly on the Express / Cloudflare Worker backend.
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
