import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function cleanEnvValue(raw: string | undefined, names: string[]): string {
  let val = (raw || '').trim();
  if (!val) return '';
  for (const name of names) {
    if (val.startsWith(`${name}=`)) {
      val = val.slice(name.length + 1).trim();
      break;
    }
  }
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    val = val.slice(1, -1).trim();
  }
  if (val.startsWith("'") || val.startsWith('"')) val = val.slice(1).trim();
  if (val.endsWith("'") || val.endsWith('"')) val = val.slice(0, -1).trim();
  return val;
}

let supabaseUrl = cleanEnvValue(import.meta.env.VITE_SUPABASE_URL, ['VITE_SUPABASE_URL', 'SUPABASE_URL']);
let supabaseAnonKey = cleanEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY, [
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
]);

export function isValidSupabaseUrl(value: string): boolean {
  if (!value || value.includes('your-project-id')) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function checkConfigured(url: string, key: string): boolean {
  return Boolean(
    isValidSupabaseUrl(url) &&
      key &&
      !key.includes('your-supabase-anon-key')
  );
}

function makeSupabaseClient(url: string, key: string): SupabaseClient | null {
  if (!checkConfigured(url, key)) return null;
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

export let isSupabaseConfigured = checkConfigured(supabaseUrl, supabaseAnonKey);
export let supabase: SupabaseClient | null = makeSupabaseClient(supabaseUrl, supabaseAnonKey);

let hydrationPromise: Promise<boolean> | null = null;

export async function hydrateRuntimeSupabaseConfig(): Promise<boolean> {
  if (isSupabaseConfigured && supabase) return true;
  if (typeof window === 'undefined') return false;
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    try {
      const res = await fetch('/api/public/config', { cache: 'no-store' });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) return false;
      const cfg = (await res.json()) as { supabaseUrl?: string; supabaseAnonKey?: string };
      const cleanUrl = cleanEnvValue(cfg.supabaseUrl, ['VITE_SUPABASE_URL', 'SUPABASE_URL']);
      const cleanKey = cleanEnvValue(cfg.supabaseAnonKey, ['VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY']);
      if (checkConfigured(cleanUrl, cleanKey)) {
        supabaseUrl = cleanUrl;
        supabaseAnonKey = cleanKey;
        supabase = makeSupabaseClient(cleanUrl, cleanKey);
        isSupabaseConfigured = Boolean(supabase);
        return isSupabaseConfigured;
      }
    } catch {
      // Ignore if backend config endpoint unreachable
    }
    return false;
  })();

  return hydrationPromise;
}

export function formatCurrency(amount: number, symbol = '৳'): string {
  const num = Number(amount || 0);
  return `${symbol}${num.toLocaleString('en-US', {
    minimumFractionDigits: num % 1 === 0 ? 2 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatShortDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const SERVER_TOKEN_STORAGE_KEY = 'scania_server_token';
export const ADMIN_TOKEN_STORAGE_KEY = 'scania_admin_token';
export const SIGNED_OUT_FLAG_KEY = 'scania_signed_out';

export function getStoredServerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    window.sessionStorage.getItem(SERVER_TOKEN_STORAGE_KEY) ||
    window.localStorage.getItem(SERVER_TOKEN_STORAGE_KEY)
  );
}

export function setStoredServerToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.sessionStorage.setItem(SERVER_TOKEN_STORAGE_KEY, token);
    window.localStorage.setItem(SERVER_TOKEN_STORAGE_KEY, token);
    window.localStorage.removeItem(SIGNED_OUT_FLAG_KEY);
  } else {
    window.sessionStorage.removeItem(SERVER_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(SERVER_TOKEN_STORAGE_KEY);
  }
}

export function getStoredAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    window.sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ||
    window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)
  );
}

export function setStoredAdminToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
    window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  } else {
    window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  }
}

export function clearStoredTokens() {
  setStoredServerToken(null);
  setStoredAdminToken(null);
}

export async function callApiWithFallback<T>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body: Record<string, unknown>,
  fallbackFn?: () => Promise<T>
): Promise<T> {
  const adminToken = getStoredAdminToken();
  const serverToken = getStoredServerToken();
  let token =
    endpoint.startsWith('/api/admin') && adminToken
      ? adminToken
      : serverToken || adminToken || undefined;

  if (!token && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    token = sessionData.session?.access_token;
  }

  try {
    const res = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if ((res.status === 404 || res.status === 503) && fallbackFn && supabase) {
      return await fallbackFn();
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json') && fallbackFn && supabase) {
      return await fallbackFn();
    }

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || `Request failed (${res.status})`);
    }
    return json as T;
  } catch (err) {
    if (fallbackFn && supabase && err instanceof TypeError) {
      return await fallbackFn();
    }
    throw err;
  }
}
