import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { AppRole, Profile } from '../types/database';
import { PREVIEW_USER_PROFILE } from '../data/previewFallback';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  isAdmin: boolean;
  loading: boolean;
  isPreviewMode: boolean;
  justLoggedIn: boolean;
  clearJustLoggedIn: () => void;
  triggerPostLoginWelcome: () => void;
  signIn: (phoneOrEmail: string, password: string) => Promise<{ error?: string }>;
  adminSignIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (params: {
    phone: string;
    password: string;
    fullName?: string;
    referralCode?: string;
  }) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
}

function toAuthEmail(phoneOrEmail: string): { email: string; phone: string } {
  const trimmed = phoneOrEmail.trim();
  if (trimmed.includes('@')) {
    return { email: trimmed, phone: '' };
  }
  const rawDigits = trimmed.replace(/[^0-9]/g, '');
  const canonicalDigits =
    rawDigits.startsWith('880') && rawDigits.length === 13 ? `0${rawDigits.slice(3)}` : rawDigits;
  return {
    email: `u${canonicalDigits}@scania-member.com`,
    phone: trimmed,
  };
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  role: null,
  isAdmin: false,
  loading: true,
  isPreviewMode: false,
  justLoggedIn: false,
  clearJustLoggedIn: () => {},
  triggerPostLoginWelcome: () => {},
  signIn: async () => ({ error: 'Not initialized' }),
  adminSignIn: async () => ({ error: 'Not initialized' }),
  signUp: async () => ({ error: 'Not initialized' }),
  signOut: async () => {},
  updatePassword: async () => ({ error: 'Not initialized' }),
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  const clearJustLoggedIn = useCallback(() => setJustLoggedIn(false), []);
  const triggerPostLoginWelcome = useCallback(() => setJustLoggedIn(true), []);

  const loadUserDetails = useCallback(async (uid: string) => {
    if (!supabase) return;
    const [{ data: prof }, { data: roleRow }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', uid).maybeSingle(),
    ]);

    if (prof) setProfile(prof as Profile);
    setRole((roleRow?.role as AppRole) || 'user');
  }, []);

  const SERVER_TOKEN_KEY = 'scania_server_token';
  const ADMIN_TOKEN_KEY = 'scania_admin_token';

  const applyServerAuthSession = useCallback((srvProfile: Profile, token?: string, nextRole: AppRole = 'user') => {
    if (token && typeof window !== 'undefined') {
      if (nextRole === 'admin' || nextRole === 'super_admin') {
        window.sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
      } else {
        window.sessionStorage.setItem(SERVER_TOKEN_KEY, token);
      }
    }
    setProfile(srvProfile);
    setUser({
      id: srvProfile.id,
      email: srvProfile.email,
      app_metadata: {},
      user_metadata: { full_name: srvProfile.full_name, phone: srvProfile.phone },
      aud: 'authenticated',
      created_at: srvProfile.created_at,
    } as User);
    setRole(nextRole);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id && supabase) {
      await loadUserDetails(session.user.id);
      return;
    }
    if (typeof window !== 'undefined') {
      const token = window.sessionStorage.getItem(SERVER_TOKEN_KEY);
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = (await res.json()) as { profile?: Profile };
            if (data.profile) applyServerAuthSession(data.profile);
          }
        } catch {
          // Ignore refresh network error
        }
      }
    }
  }, [session?.user?.id, loadUserDetails, applyServerAuthSession]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      if (typeof window !== 'undefined') {
        const adminToken = window.sessionStorage.getItem(ADMIN_TOKEN_KEY);
        if (adminToken && window.location.pathname.startsWith('/admin')) {
          applyServerAuthSession(
            {
              id: 'server-admin-1',
              scania_id: 'ADMIN01',
              email: 'admin@scania.com',
              full_name: 'Scania Administrator',
              phone: '',
              avatar_url: '',
              tier: 'Admin',
              demo_balance: 0,
              demo_bonus: 0,
              referral_code: 'ADMIN01',
              referred_by: null,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            undefined,
            'super_admin'
          );
          setLoading(false);
          return;
        }
        const serverToken = window.sessionStorage.getItem(SERVER_TOKEN_KEY);
        if (serverToken) {
          fetch('/api/auth/me', { headers: { Authorization: `Bearer ${serverToken}` } })
            .then((r) => (r.ok ? r.json() : null))
            .then((srvData: { profile?: Profile } | null) => {
              if (srvData?.profile) {
                applyServerAuthSession(srvData.profile);
              } else {
                setProfile({ ...PREVIEW_USER_PROFILE, full_name: 'Naymhasam', tier: 'Diamond' });
                setRole('user');
              }
              setLoading(false);
            })
            .catch(() => {
              setProfile({ ...PREVIEW_USER_PROFILE, full_name: 'Naymhasam', tier: 'Diamond' });
              setRole('user');
              setLoading(false);
            });
          return;
        }
      }
      setProfile({
        ...PREVIEW_USER_PROFILE,
        full_name: 'Naymhasam',
        tier: 'Diamond',
      });
      setRole('user');
      setLoading(false);
      return;
    }

    let mounted = true;
    const initAuth = async () => {
      const { data } = await supabase!.auth.getSession();
      if (!mounted) return;

      if (data.session?.user) {
        setSession(data.session);
        setUser(data.session.user);
        await loadUserDetails(data.session.user.id);
        if (mounted) setLoading(false);
        return;
      }

      // Restore server-issued admin or member session if present
      if (typeof window !== 'undefined') {
        const adminToken = window.sessionStorage.getItem(ADMIN_TOKEN_KEY);
        if (adminToken && window.location.pathname.startsWith('/admin')) {
          try {
            const adminRes = await fetch('/api/admin/state', {
              headers: { Authorization: `Bearer ${adminToken}` },
            });
            if (adminRes.ok && mounted) {
              applyServerAuthSession(
                {
                  id: 'server-admin-1',
                  scania_id: 'ADMIN01',
                  email: 'admin@scania.com',
                  full_name: 'Scania Administrator',
                  phone: '',
                  avatar_url: '',
                  tier: 'Admin',
                  demo_balance: 0,
                  demo_bonus: 0,
                  referral_code: 'ADMIN01',
                  referred_by: null,
                  is_active: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                undefined,
                'super_admin'
              );
              setLoading(false);
              return;
            } else {
              window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
            }
          } catch {
            // Ignore network error
          }
        }

        const token = window.sessionStorage.getItem(SERVER_TOKEN_KEY);
        if (token) {
          try {
            const res = await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const srvData = (await res.json()) as { profile?: Profile };
              if (mounted && srvData.profile) {
                applyServerAuthSession(srvData.profile);
                setLoading(false);
                return;
              }
            } else {
              window.sessionStorage.removeItem(SERVER_TOKEN_KEY);
            }
          } catch {
            // Ignore network error
          }
        }
      }

      if (mounted) setLoading(false);
    };

    void initAuth();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      if (newSession?.user) {
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(SERVER_TOKEN_KEY);
        }
        setSession(newSession);
        setUser(newSession.user);
        await loadUserDetails(newSession.user.id);
      } else {
        setSession(null);
        const hasServerToken =
          typeof window !== 'undefined' &&
          (Boolean(window.sessionStorage.getItem(SERVER_TOKEN_KEY)) ||
            Boolean(window.sessionStorage.getItem(ADMIN_TOKEN_KEY)));
        if (!hasServerToken) {
          setUser(null);
          setProfile(null);
          setRole(null);
        }
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadUserDetails, applyServerAuthSession]);

  useEffect(() => {
    if (!supabase || !session?.user?.id) return;
    const channel = supabase
      .channel(`profile-${session.user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` },
        (payload) => {
          if (payload.new) {
            setProfile(payload.new as Profile);
          }
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const signIn = async (phoneOrEmail: string, password: string) => {
    const trimmed = phoneOrEmail.trim();

    // 1. Check server-side phone auth store first for phone logins
    if (!trimmed.includes('@')) {
      try {
        const srvRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneOrEmail: trimmed, password }),
        });

        const srvType = srvRes.headers.get('content-type') || '';
        if (srvRes.ok && srvType.includes('application/json')) {
          const srvData = (await srvRes.json()) as {
            mode?: string;
            token?: string;
            profile?: Profile;
          };
          if (srvData.mode === 'server' && srvData.profile) {
            applyServerAuthSession(srvData.profile, srvData.token);
            setJustLoggedIn(true);
            return {};
          }
        } else if (
          (srvRes.status === 401 || srvRes.status === 403 || srvRes.status === 400) &&
          srvType.includes('application/json')
        ) {
          const errBody = (await srvRes.json().catch(() => ({}))) as { error?: string };
          return { error: errBody.error || 'Invalid phone number or password.' };
        }
      } catch {
        // Continue to Supabase login if server unreachable
      }
    }

    if (!supabase) {
      setJustLoggedIn(true);
      return {};
    }

    let { email } = toAuthEmail(trimmed);

    // Resolve registered phone number & ensure synthetic account confirmation via server or RPC
    if (!trimmed.includes('@')) {
      let resolvedViaServer = false;
      try {
        const prepRes = await fetch('/api/auth/prepare-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneOrEmail: trimmed }),
        });
        const prepType = prepRes.headers.get('content-type') || '';
        if (prepRes.ok && prepType.includes('application/json')) {
          const prepData = (await prepRes.json()) as { email?: string };
          if (prepData.email) {
            email = prepData.email;
            resolvedViaServer = true;
          }
        }
      } catch {
        // Ignore network errors
      }

      if (!resolvedViaServer) {
        try {
          const { data: rpcData } = await supabase.rpc('prepare_phone_login', {
            p_phone: trimmed,
          });
          if (rpcData && typeof rpcData === 'object' && 'email' in rpcData && rpcData.email) {
            email = String(rpcData.email);
          }
        } catch {
          // Ignore if RPC not installed yet
        }
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        return { error: 'Invalid phone number or password.' };
      }
      return { error: error.message };
    }
    if (data.user) {
      await loadUserDetails(data.user.id);
    }
    setJustLoggedIn(true);
    return {};
  };

  const signUp = async ({
    phone,
    password,
    fullName,
    referralCode,
  }: {
    phone: string;
    password: string;
    fullName?: string;
    referralCode?: string;
  }) => {
    const cleanPhone = phone.trim();
    const digits = cleanPhone.replace(/[^0-9]/g, '');
    if (digits.length < 7) {
      return { error: 'Please enter a valid phone number.' };
    }

    // Primary registration endpoint (automatically routes to Supabase Admin / Supabase RPC / Server Auth Store)
    try {
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          password,
          fullName: fullName?.trim(),
          referralCode: referralCode?.trim(),
        }),
      });

      const contentType = regRes.headers.get('content-type') || '';
      const isStaticOrMissingApi = regRes.status === 404 || regRes.status === 405 || !contentType.includes('application/json');

      if (!isStaticOrMissingApi) {
        const regBody = (await regRes.json().catch(() => ({}))) as {
          ok?: boolean;
          mode?: 'supabase' | 'server';
          email?: string;
          token?: string;
          profile?: Profile;
          error?: string;
        };

        if (!regRes.ok) {
          return { error: regBody.error || 'Registration failed. Please try again.' };
        }

        if (regBody.mode === 'server' && regBody.profile) {
          applyServerAuthSession(regBody.profile, regBody.token);
          setJustLoggedIn(true);
          return {};
        }

        if (supabase) {
          const loginEmail = regBody.email || toAuthEmail(cleanPhone).email;
          const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password,
          });
          if (loginErr) return { error: loginErr.message };
          if (loginData.user) {
            await loadUserDetails(loginData.user.id);
          }
        }

        setJustLoggedIn(true);
        return {};
      }
    } catch {
      // Fall through to direct Supabase registration when server API is unavailable
    }

    if (supabase) {
      let loginEmail = toAuthEmail(cleanPhone).email;
      const { data: rpcData, error: rpcErr } = await supabase.rpc('register_phone_user', {
        p_phone: cleanPhone,
        p_password: password,
        p_referral_code: referralCode?.trim() || '',
      });

      if (!rpcErr && rpcData && typeof rpcData === 'object' && 'email' in rpcData && rpcData.email) {
        loginEmail = String(rpcData.email);
      } else if (rpcErr) {
        const msg = rpcErr.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('valid phone') || msg.includes('password')) {
          return { error: rpcErr.message };
        }
        const { error: signUpErr } = await supabase.auth.signUp({
          email: loginEmail,
          password,
          options: {
            data: {
              phone: cleanPhone,
              full_name: fullName?.trim() || `Member ${digits.slice(-4)}`,
              referral_code: referralCode?.trim().toUpperCase() || '',
            },
          },
        });
        if (signUpErr) {
          return { error: signUpErr.message };
        }
      }

      const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });
      if (loginErr) {
        return { error: loginErr.message };
      }
      if (loginData.user) {
        await loadUserDetails(loginData.user.id);
      }
      setJustLoggedIn(true);
      return {};
    }

    return { error: 'Unable to reach registration service. Please try again.' };
  };

  const adminSignIn = async (email: string, password: string) => {
    const cleanEmail = email.trim();
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      if (res.ok) {
        const data = (await res.json()) as { token?: string; profile?: Profile; role?: AppRole };
        if (data.profile && data.token) {
          applyServerAuthSession(data.profile, data.token, data.role || 'super_admin');
          return {};
        }
      }
    } catch {
      // Fallback to Supabase admin login
    }

    if (!supabase) {
      return { error: 'Invalid admin credentials.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error || !data.user) {
      return { error: error?.message || 'Invalid credentials.' };
    }

    const { data: roleRow, error: roleErr } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (roleErr || !roleRow || !['admin', 'super_admin'].includes(roleRow.role)) {
      await supabase.auth.signOut();
      return { error: 'Access denied. This account does not have Administrator privileges in user_roles.' };
    }

    await loadUserDetails(data.user.id);
    return {};
  };

  const signOut = async () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(SERVER_TOKEN_KEY);
      window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    }
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
    setJustLoggedIn(false);
  };

  const updatePassword = async (newPassword: string) => {
    const serverToken =
      typeof window !== 'undefined' ? window.sessionStorage.getItem(SERVER_TOKEN_KEY) : null;
    if (serverToken) {
      try {
        const res = await fetch('/api/user/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serverToken}`,
          },
          body: JSON.stringify({ newPassword }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          return { error: body.error || 'পাসওয়ার্ড পরিবর্তন করা যায়নি।' };
        }
        return {};
      } catch {
        return { error: 'সার্ভারের সাথে সংযোগ ব্যর্থ হয়েছে।' };
      }
    }
    if (!supabase || !session) {
      return { error: 'Password update requires active session.' };
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return {};
  };

  const isAdmin = role === 'admin' || role === 'super_admin';

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        role,
        isAdmin,
        loading,
        isPreviewMode: !isSupabaseConfigured,
        justLoggedIn,
        clearJustLoggedIn,
        triggerPostLoginWelcome,
        signIn,
        adminSignIn,
        signUp,
        signOut,
        updatePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
