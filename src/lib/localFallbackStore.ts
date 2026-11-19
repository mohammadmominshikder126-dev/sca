import { DemoTransaction, Profile } from '../types/database';

const LOCAL_MEMBERS_KEY = 'scania_local_members_v1';
const LOCAL_PREVIEW_TXS_KEY = 'scania_preview_transactions_v1';

interface LocalMemberRecord {
  profile: Profile;
  password: string;
  canonicalDigits: string;
}

function normalizeDigits(raw: string): string {
  return raw.replace(/[^0-9]/g, '');
}

function toCanonicalDigits(raw: string): string {
  const digits = normalizeDigits(raw);
  return digits.startsWith('880') && digits.length === 13 ? `0${digits.slice(3)}` : digits;
}

function readLocalMembers(): LocalMemberRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_MEMBERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalMembers(list: LocalMemberRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage quota errors
  }
}

export function localRegisterMember(params: {
  phone: string;
  password: string;
  fullName?: string;
  referralCode?: string;
}): { error?: string; token?: string; profile?: Profile } {
  const cleanPhone = params.phone.trim();
  const canonicalDigits = toCanonicalDigits(cleanPhone);
  if (canonicalDigits.length < 7) {
    return { error: 'অনুগ্রহ করে একটি সঠিক মোবাইল নম্বর দিন।' };
  }
  if (params.password.length < 6) {
    return { error: 'পাসওয়ার্ড কমপক্ষে 6 অক্ষরের হতে হবে।' };
  }

  const list = readLocalMembers();
  if (list.some((m) => m.canonicalDigits === canonicalDigits || m.profile.phone === cleanPhone)) {
    return { error: 'এই নম্বরটি ইতিমধ্যে নিবন্ধিত। অনুগ্রহ করে লগইন করুন।' };
  }

  const uid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const nowIso = new Date().toISOString();
  const scaniaId = `SCN${Math.floor(100000 + Math.random() * 900000)}`;
  const refCode = `SCN${uid.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
  const displayName = params.fullName?.trim() || `সদস্য ${canonicalDigits.slice(-4)}`;

  const profile: Profile = {
    id: uid,
    scania_id: scaniaId,
    email: `u${canonicalDigits}@scania-member.com`,
    full_name: displayName,
    phone: cleanPhone,
    avatar_url: '',
    tier: 'Standard',
    demo_balance: 150,
    demo_bonus: 150,
    referral_code: refCode,
    referred_by: null,
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
  };

  list.push({ profile, password: params.password, canonicalDigits });
  writeLocalMembers(list);

  return { token: `local:${uid}`, profile };
}

export function localLoginMember(
  phoneOrEmail: string,
  password: string
): { error?: string; token?: string; profile?: Profile } | null {
  const trimmed = phoneOrEmail.trim();
  const canonicalDigits = toCanonicalDigits(trimmed);
  const rawDigits = normalizeDigits(trimmed);
  const list = readLocalMembers();

  const match = list.find(
    (m) =>
      m.canonicalDigits === canonicalDigits ||
      m.canonicalDigits === rawDigits ||
      m.profile.phone === trimmed ||
      m.profile.email === trimmed
  );

  if (!match) return null;
  if (!match.profile.is_active) {
    return { error: 'অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে।' };
  }
  if (match.password !== password) {
    return { error: 'মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়।' };
  }
  return { token: `local:${match.profile.id}`, profile: match.profile };
}

export function localGetMemberByToken(token: string): Profile | null {
  if (!token.startsWith('local:')) return null;
  const uid = token.slice(6);
  const list = readLocalMembers();
  return list.find((m) => m.profile.id === uid)?.profile || null;
}

export function localSaveCachedProfile(profile: Profile, password?: string) {
  if (typeof window === 'undefined' || !profile?.id) return;
  const list = readLocalMembers();
  const canonicalDigits = toCanonicalDigits(profile.phone || profile.email);
  const idx = list.findIndex((m) => m.profile.id === profile.id);
  if (idx !== -1) {
    list[idx] = {
      profile,
      password: password ?? list[idx].password,
      canonicalDigits: canonicalDigits || list[idx].canonicalDigits,
    };
  } else {
    list.push({
      profile,
      password: password || '',
      canonicalDigits,
    });
  }
  writeLocalMembers(list);
}

export function getPreviewDeposits(): DemoTransaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_PREVIEW_TXS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DemoTransaction[]) : [];
  } catch {
    return [];
  }
}

export function savePreviewDepositTransaction(params: {
  userId: string;
  amount: number;
  method: string;
  referenceCode: string;
}): DemoTransaction {
  const nowIso = new Date().toISOString();
  const tx: DemoTransaction = {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `tx-${Date.now()}`,
    user_id: params.userId,
    type: 'deposit_demo',
    amount: params.amount,
    method: params.method,
    reference_code: params.referenceCode,
    status: 'pending',
    admin_note: `TrxID: ${params.referenceCode} · পর্যালোচনায় রয়েছে`,
    processed_by: null,
    created_at: nowIso,
    updated_at: nowIso,
  };
  if (typeof window !== 'undefined') {
    const existing = getPreviewDeposits();
    existing.unshift(tx);
    try {
      window.localStorage.setItem(LOCAL_PREVIEW_TXS_KEY, JSON.stringify(existing.slice(0, 50)));
    } catch {
      // Ignore quota errors
    }
  }
  return tx;
}
