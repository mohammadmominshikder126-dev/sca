import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseAnonKey.includes('your-supabase-anon-key')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
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
    })
  : null;

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

export async function callApiWithFallback<T>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body: Record<string, unknown>,
  fallbackFn?: () => Promise<T>
): Promise<T> {
  const adminToken =
    typeof window !== 'undefined' ? window.sessionStorage.getItem('scania_admin_token') : null;
  const serverToken =
    typeof window !== 'undefined' ? window.sessionStorage.getItem('scania_server_token') : null;
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
