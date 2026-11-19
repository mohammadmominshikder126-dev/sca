interface AssetsBinding {
  fetch(request: Request | URL | string): Promise<Response>;
}

interface Env {
  ASSETS: AssetsBinding;
  SESSION_SECRET?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
}

interface WorkerMemberRecord {
  id: string;
  scania_id: string;
  email: string;
  full_name: string;
  phone: string;
  canonical_digits: string;
  password_salt: string;
  password_hash: string;
  avatar_url: string;
  tier: string;
  demo_balance: number;
  demo_bonus: number;
  referral_code: string;
  referred_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WorkerBankCard {
  wallet_method: 'Bkash' | 'Nagad';
  wallet_number: string;
  account_name: string;
  updated_at: string;
}

interface WorkerTransaction {
  id: string;
  user_id: string;
  type: 'deposit_demo' | 'withdraw_demo' | 'plan_purchase' | 'daily_yield' | 'bonus_code' | 'referral_commission';
  amount: number;
  method: string;
  reference_code: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  admin_note: string;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkerUserProduct {
  id: string;
  user_id: string;
  plan_id: string;
  plan_title: string;
  demo_price: number;
  daily_income: number;
  validity_days: number;
  days_elapsed: number;
  total_simulated_earned: number;
  status: 'active' | 'completed' | 'cancelled';
  started_at: string;
  expires_at: string;
}

interface WorkerNotification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  category: 'system' | 'transaction' | 'bonus' | 'support' | 'announcement';
  is_read: boolean;
  created_at: string;
}

interface WorkerReferralRecord {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  level: 1 | 2 | 3;
  commission_rate: number;
  simulated_commission: number;
  created_at: string;
}

interface WorkerBonusCode {
  id: string;
  code: string;
  description: string;
  bonus_amount: number;
  usage_limit: number;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface WorkerSiteSettings {
  id: number;
  site_name: string;
  logo_url: string;
  currency_symbol: string;
  support_email: string;
  support_phone: string;
  telegram_link: string;
  deposit_bkash_number: string;
  deposit_nagad_number: string;
  theme_accent: string;
  show_team_tab: boolean;
  show_bonus_button: boolean;
  footer_text: string;
  about_text: string;
  updated_at: string;
}

interface WorkerAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'important';
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface WorkerPlan {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  demo_price: number;
  daily_income: number;
  validity_days: number;
  total_return?: number | null;
  badge: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface WorkerBanner {
  id: string;
  title: string;
  subtitle: string;
  placement: 'home_hero' | 'plans_promo' | 'team_hero' | 'mine_support' | 'plan_card';
  image_url: string;
  storage_path: string;
  cta_label: string;
  cta_link: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface WorkerState {
  members: WorkerMemberRecord[];
  bankCards: Record<string, WorkerBankCard>;
  transactions: WorkerTransaction[];
  userProducts: WorkerUserProduct[];
  notifications: WorkerNotification[];
  referrals: WorkerReferralRecord[];
  bonusCodes: WorkerBonusCode[];
  bonusRedemptions: { code: string; user_id: string; amount: number; created_at: string }[];
  siteSettings: WorkerSiteSettings | null;
  announcements: WorkerAnnouncement[] | null;
  plans: WorkerPlan[] | null;
  banners: WorkerBanner[];
}

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

const CACHE_KEY_URL = 'https://scania-worker-state.internal/v1/store.json';

const DEFAULT_ABOUT_TEXT = `SCANIA বিশেষ কহচ্ছে বিশ্বের অন্যতম বিলাসবহুল বাস ও ট্রাকের জগতে Scania (স্ক্যানিয়া) নিঃসন্দেহে বিশ্বের অন্যতম সেরা এবং বিশ্বস্ত একটি প্লাটফর্ম এই প্রতিষ্ঠানটি গত এক শতাব্দীরও বেশি সময় ধরে তাদের অসাধারণ Service এবং বিশ্বাসের মাধ্যমে ব্যবহারকারীদের কাছে শ্রেষ্ঠত্ব প্রমাণ করে আসছে।
বাংলাদেশের প্রেক্ষাপটেও দেশের শীর্ষস্থানীয় ও প্রিমিয়াম বাস অপারেটরগুলোর কাছে স্ক্যানিয়া আস্থার এক অপর নাম। নিচে স্ক্যানিয়ার বিশ্বস্ততা এবং অনন্য বৈশিষ্ট্যগুলো তুলে ধরা হলো:
১. অতুলনীয় স্থায়িত্ব ও দ্রুত পেমেন্ট সিস্টেম
• দীর্ঘ মেয়াদী SCANIA প্ল্যাটফর্মটি তৈরি করা হয় যা বছরের পর বছর বিরামহীনভাবে চলতে সক্ষম। সঠিক রক্ষণাবেক্ষনে ২৪ ঘন্টা কাস্টমার সার্ভিস রয়েছে স্ক্যানিয়া ব্যবহারকারীদের কোনো বড় সমস্যা হলে খুব দ্রুত সমাধান করার জন্য বিখ্যাত
• অসাধারণ পরিস্থিতিতে যেমনই হোক স্ক্যানিয়ার ব্যবহারকারী যেকোনো সমস্যা খুব দ্রুত সমাধান করে থাকে`;

const DEFAULT_PLANS: WorkerPlan[] = [
  {
    id: 'preview-plan-v1',
    title: 'SCANIA V-1',
    subtitle: 'SC-V1 Edition',
    description: 'মূল্য 500 টাকা · দৈনিক আয় 75 টাকা · মেয়াদ 105 দিন',
    image_url: '/assets/aistudio/sddefault_8b5dd3b7.jpg',
    demo_price: 500,
    daily_income: 75,
    validity_days: 105,
    badge: 'Popular',
    is_active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'preview-plan-v2',
    title: 'SCANIA V2',
    subtitle: 'SC-V2 Edition',
    description: 'মূল্য 800 টাকা · দৈনিক আয় 132 টাকা · মেয়াদ 60 দিন',
    image_url: '/assets/aistudio/Scania-Pick-up-2025-04-01-at-2.14.20_PM_d711a23d.jpg',
    demo_price: 800,
    daily_income: 132,
    validity_days: 60,
    badge: 'Hot',
    is_active: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'preview-plan-v3',
    title: 'SCANIA V3',
    subtitle: 'SC-V3 Edition',
    description: 'মূল্য 1,700 টাকা · দৈনিক আয় 261 টাকা · মেয়াদ 90 দিন',
    image_url: '/assets/aistudio/images__1___8__699f6d70.jpeg',
    demo_price: 1700,
    daily_income: 261,
    validity_days: 90,
    badge: 'Best',
    is_active: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'preview-plan-v4',
    title: 'SCANIA V4',
    subtitle: 'SC-V4 Edition',
    description: 'মূল্য 3,300 টাকা · দৈনিক আয় 503 টাকা · মেয়াদ 80 দিন',
    image_url: '/assets/aistudio/sddefault__1__7c876ca8.jpg',
    demo_price: 3300,
    daily_income: 503,
    validity_days: 80,
    badge: 'Pro',
    is_active: true,
    sort_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'preview-plan-v5',
    title: 'SCANIA V5',
    subtitle: 'SC-V5 Edition',
    description: 'মূল্য 4,100 টাকা · দৈনিক আয় 684 টাকা · মেয়াদ 200 দিন',
    image_url: '/assets/aistudio/sddefault__2__cc9acb8a.jpg',
    demo_price: 4100,
    daily_income: 684,
    validity_days: 200,
    badge: 'VIP',
    is_active: true,
    sort_order: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'preview-plan-v7',
    title: 'SCANIA V7',
    subtitle: 'SC-V7 Flagship',
    description: 'মূল্য 10,000 টাকা · দৈনিক আয় 2,200 টাকা · মেয়াদ 145 দিন · মোট রিটার্ন 66,000 টাকা',
    image_url: '/assets/aistudio/sddefault_8b5dd3b7.jpg',
    demo_price: 10000,
    daily_income: 2200,
    validity_days: 145,
    total_return: 66000,
    badge: 'Elite',
    is_active: true,
    sort_order: 6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEFAULT_BONUS_CODES: WorkerBonusCode[] = [
  {
    id: 'preview-bonus-1',
    code: 'SCANIA50',
    description: 'স্বাগতম বোনাস ক্রেডিট',
    bonus_amount: 50,
    usage_limit: 1000,
    used_count: 0,
    is_active: true,
    expires_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'preview-bonus-2',
    code: 'FLEET2026',
    description: 'স্পেশাল লঞ্চ বোনাস',
    bonus_amount: 100,
    usage_limit: 500,
    used_count: 0,
    is_active: true,
    expires_at: null,
    created_at: new Date().toISOString(),
  },
];

function createEmptyState(): WorkerState {
  return {
    members: [],
    bankCards: {},
    transactions: [],
    userProducts: [],
    notifications: [],
    referrals: [],
    bonusCodes: [...DEFAULT_BONUS_CODES],
    bonusRedemptions: [],
    siteSettings: null,
    announcements: null,
    plans: null,
    banners: [],
  };
}

function getGlobalStoreRef(): { state: WorkerState | null } {
  const g = globalThis as unknown as { __scaniaWorkerRef?: { state: WorkerState | null } };
  if (!g.__scaniaWorkerRef) {
    g.__scaniaWorkerRef = { state: null };
  }
  return g.__scaniaWorkerRef;
}

function getEdgeCache(): Cache | null {
  try {
    const c = (caches as unknown as { default?: Cache }).default;
    return c || null;
  } catch {
    return null;
  }
}

async function loadState(): Promise<WorkerState> {
  const ref = getGlobalStoreRef();
  if (ref.state) return ref.state;

  const cache = getEdgeCache();
  if (cache) {
    try {
      const hit = await cache.match(CACHE_KEY_URL);
      if (hit) {
        const parsed = (await hit.json()) as Partial<WorkerState>;
        ref.state = {
          members: Array.isArray(parsed.members) ? parsed.members : [],
          bankCards: parsed.bankCards || {},
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
          userProducts: Array.isArray(parsed.userProducts) ? parsed.userProducts : [],
          notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
          referrals: Array.isArray(parsed.referrals) ? parsed.referrals : [],
          bonusCodes:
            Array.isArray(parsed.bonusCodes) && parsed.bonusCodes.length > 0
              ? parsed.bonusCodes
              : [...DEFAULT_BONUS_CODES],
          bonusRedemptions: Array.isArray(parsed.bonusRedemptions) ? parsed.bonusRedemptions : [],
          siteSettings: parsed.siteSettings || null,
          announcements: Array.isArray(parsed.announcements) ? parsed.announcements : null,
          plans: Array.isArray(parsed.plans) ? parsed.plans : null,
          banners: Array.isArray(parsed.banners) ? parsed.banners : [],
        };
        return ref.state;
      }
    } catch {
      // Ignore cache miss
    }
  }

  ref.state = createEmptyState();
  return ref.state;
}

async function saveState(state: WorkerState): Promise<void> {
  const ref = getGlobalStoreRef();
  ref.state = state;
  const cache = getEdgeCache();
  if (cache) {
    try {
      await cache.put(
        CACHE_KEY_URL,
        new Response(JSON.stringify(state), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=2592000',
          },
        })
      );
    } catch {
      // Ignore cache write errors in local test runtime
    }
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizePhoneDigits(raw: string): string {
  return raw.replace(/[^0-9]/g, '');
}

function toCanonicalDigits(raw: string): string {
  const digits = normalizePhoneDigits(raw);
  return digits.startsWith('880') && digits.length === 13 ? `0${digits.slice(3)}` : digits;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function randomHex(byteLen = 16): string {
  const buf = new Uint8Array(byteLen);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return toBase64Url(new Uint8Array(sig));
}

interface TokenClaims {
  uid: string;
  role: string;
  exp: number;
  phone?: string;
  name?: string;
  scania_id?: string;
  ref_code?: string;
}

async function signWorkerToken(claims: Omit<TokenClaims, 'exp'>, secret: string): Promise<string> {
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({ ...claims, exp })));
  const sig = await hmacSign(payload, secret);
  return `${payload}.${sig}`;
}

async function verifyWorkerToken(token: string, secret: string): Promise<TokenClaims | null> {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expectedSig = await hmacSign(payload, secret);
    if (sig !== expectedSig) return null;
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as Partial<TokenClaims>;
    if (!decoded.uid || !decoded.exp || decoded.exp < Date.now()) return null;
    return {
      uid: decoded.uid,
      role: decoded.role || 'user',
      exp: decoded.exp,
      phone: decoded.phone,
      name: decoded.name,
      scania_id: decoded.scania_id,
      ref_code: decoded.ref_code,
    };
  } catch {
    return null;
  }
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

function sanitizeMemberProfile(m: WorkerMemberRecord) {
  const { password_salt: _s, password_hash: _h, canonical_digits: _c, ...profile } = m;
  return profile;
}

function ensureMemberFromClaims(state: WorkerState, claims: TokenClaims): WorkerMemberRecord {
  const existing = state.members.find((m) => m.id === claims.uid);
  if (existing) return existing;
  const nowIso = new Date().toISOString();
  const phone = claims.phone || '';
  const canonical = toCanonicalDigits(phone);
  const rehydrated: WorkerMemberRecord = {
    id: claims.uid,
    scania_id: claims.scania_id || `SCN${Math.floor(100000 + Math.random() * 900000)}`,
    email: canonical ? `u${canonical}@scania-member.com` : `${claims.uid}@scania-member.com`,
    full_name: claims.name || (canonical ? `সদস্য ${canonical.slice(-4)}` : 'SCANIA Member'),
    phone,
    canonical_digits: canonical,
    password_salt: '',
    password_hash: '',
    avatar_url: '',
    tier: 'Standard',
    demo_balance: 150,
    demo_bonus: 150,
    referral_code: claims.ref_code || `SCN${claims.uid.replace(/-/g, '').slice(0, 6).toUpperCase()}`,
    referred_by: null,
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
  };
  state.members.push(rehydrated);
  return rehydrated;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();
    const secret = env.SESSION_SECRET || 'scania-platform-session-key';

    if (pathname === '/api/health') {
      return jsonResponse({
        ok: true,
        mode: 'cloudflare-worker',
        runtime: 'cloudflare-worker',
        timestamp: new Date().toISOString(),
      });
    }

    if (pathname === '/api/events') {
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    }

    if (!pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    const state = await loadState();

    // =========================================================================
    // PUBLIC SITE DATA
    // =========================================================================
    if (pathname === '/api/public/site-data' && method === 'GET') {
      return jsonResponse({
        siteSettings: state.siteSettings,
        announcements: state.announcements,
        plans: state.plans,
        banners: state.banners,
        runtime: 'cloudflare-worker',
      });
    }

    // =========================================================================
    // AUTH ENDPOINTS
    // =========================================================================
    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = await readJsonBody(request);
      const rawPhone = String(body.phone || '').trim();
      const password = String(body.password || '');
      const fullName = String(body.fullName || '').trim();
      const referralCode = String(body.referralCode || '').trim().toUpperCase();

      const digits = normalizePhoneDigits(rawPhone);
      if (digits.length < 7 || digits.length > 16) {
        return jsonResponse({ error: 'অনুগ্রহ করে একটি সঠিক মোবাইল নম্বর দিন।' }, 400);
      }
      if (password.length < 6) {
        return jsonResponse({ error: 'পাসওয়ার্ড কমপক্ষে 6 অক্ষরের হতে হবে।' }, 400);
      }

      const canonicalDigits = toCanonicalDigits(rawPhone);
      const duplicate = state.members.find(
        (m) => m.canonical_digits === canonicalDigits || m.phone === rawPhone
      );
      if (duplicate) {
        return jsonResponse({ error: 'এই নম্বরটি ইতিমধ্যে নিবন্ধিত। অনুগ্রহ করে লগইন করুন।' }, 409);
      }

      const uid = crypto.randomUUID();
      const scaniaId = `SCN${Math.floor(100000 + Math.random() * 900000)}`;
      const ownRefCode = `SCN${uid.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
      const referrer = referralCode
        ? state.members.find((m) => m.referral_code.toUpperCase() === referralCode)
        : undefined;
      const salt = randomHex(16);
      const hash = await sha256Hex(`${salt}:${password}`);
      const nowIso = new Date().toISOString();
      const displayName = fullName || `সদস্য ${canonicalDigits.slice(-4)}`;

      const newMember: WorkerMemberRecord = {
        id: uid,
        scania_id: scaniaId,
        email: `u${canonicalDigits}@scania-member.com`,
        full_name: displayName,
        phone: rawPhone,
        canonical_digits: canonicalDigits,
        password_salt: salt,
        password_hash: hash,
        avatar_url: '',
        tier: 'Standard',
        demo_balance: 150,
        demo_bonus: 150,
        referral_code: ownRefCode,
        referred_by: referrer?.id ?? null,
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso,
      };

      state.members.push(newMember);

      if (referrer) {
        state.referrals.push({
          id: crypto.randomUUID(),
          referrer_id: referrer.id,
          referred_user_id: newMember.id,
          level: 1,
          commission_rate: 25,
          simulated_commission: 0,
          created_at: nowIso,
        });
        const l2 = referrer.referred_by
          ? state.members.find((m) => m.id === referrer.referred_by)
          : undefined;
        if (l2) {
          state.referrals.push({
            id: crypto.randomUUID(),
            referrer_id: l2.id,
            referred_user_id: newMember.id,
            level: 2,
            commission_rate: 2,
            simulated_commission: 0,
            created_at: nowIso,
          });
          const l3 = l2.referred_by
            ? state.members.find((m) => m.id === l2.referred_by)
            : undefined;
          if (l3) {
            state.referrals.push({
              id: crypto.randomUUID(),
              referrer_id: l3.id,
              referred_user_id: newMember.id,
              level: 3,
              commission_rate: 1,
              simulated_commission: 0,
              created_at: nowIso,
            });
          }
        }
      }

      state.notifications.unshift({
        id: crypto.randomUUID(),
        user_id: newMember.id,
        title: 'SCANIA তে স্বাগতম! 150 টাকা বোনাস যুক্ত হয়েছে',
        message: 'নতুন অ্যাকাউন্ট খোলার জন্য 150 টাকা রেজিস্ট্রেশন বোনাস আপনার ব্যালেন্সে যোগ করা হয়েছে।',
        category: 'bonus',
        is_read: false,
        created_at: nowIso,
      });

      await saveState(state);

      const token = await signWorkerToken(
        {
          uid: newMember.id,
          role: 'user',
          phone: newMember.phone,
          name: newMember.full_name,
          scania_id: newMember.scania_id,
          ref_code: newMember.referral_code,
        },
        secret
      );

      return jsonResponse({
        ok: true,
        mode: 'server',
        runtime: 'cloudflare-worker',
        token,
        profile: sanitizeMemberProfile(newMember),
      });
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await readJsonBody(request);
      const rawPhone = String(body.phoneOrEmail || '').trim();
      const password = String(body.password || '');
      if (!rawPhone || !password) {
        return jsonResponse({ error: 'মোবাইল নম্বর এবং পাসওয়ার্ড দিন।' }, 400);
      }

      const canonicalDigits = toCanonicalDigits(rawPhone);
      const rawDigits = normalizePhoneDigits(rawPhone);
      const member = state.members.find(
        (m) =>
          m.canonical_digits === canonicalDigits ||
          m.canonical_digits === rawDigits ||
          m.phone === rawPhone
      );

      if (!member) {
        return jsonResponse({ error: 'মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়।' }, 401);
      }
      if (!member.is_active) {
        return jsonResponse({ error: 'অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে।' }, 403);
      }

      const expected = await sha256Hex(`${member.password_salt}:${password}`);
      if (expected !== member.password_hash) {
        return jsonResponse({ error: 'মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়।' }, 401);
      }

      const token = await signWorkerToken(
        {
          uid: member.id,
          role: 'user',
          phone: member.phone,
          name: member.full_name,
          scania_id: member.scania_id,
          ref_code: member.referral_code,
        },
        secret
      );

      return jsonResponse({
        ok: true,
        mode: 'server',
        runtime: 'cloudflare-worker',
        token,
        profile: sanitizeMemberProfile(member),
      });
    }

    if (pathname === '/api/auth/prepare-login' && method === 'POST') {
      const body = await readJsonBody(request);
      const rawInput = String(body.phoneOrEmail || '').trim();
      if (!rawInput) return jsonResponse({ error: 'Phone number is required.' }, 400);
      if (rawInput.includes('@')) return jsonResponse({ email: rawInput });
      const canonical = toCanonicalDigits(rawInput);
      return jsonResponse({ email: `u${canonical}@scania-member.com` });
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      const token = getBearerToken(request);
      if (!token) return jsonResponse({ error: 'Missing session token.' }, 401);
      const claims = await verifyWorkerToken(token, secret);
      if (!claims) return jsonResponse({ error: 'Invalid or expired session token.' }, 401);
      const member = ensureMemberFromClaims(state, claims);
      return jsonResponse({
        ok: true,
        runtime: 'cloudflare-worker',
        profile: sanitizeMemberProfile(member),
      });
    }

    // =========================================================================
    // USER AUTHENTICATED ENDPOINTS
    // =========================================================================
    const requireUserClaims = async () => {
      const token = getBearerToken(request);
      if (!token) return null;
      return await verifyWorkerToken(token, secret);
    };

    if (pathname === '/api/user/state' && method === 'GET') {
      const claims = await requireUserClaims();
      if (!claims) return jsonResponse({ error: 'অনুগ্রহ করে প্রথমে লগইন করুন।' }, 401);
      const uid = claims.uid;
      const member = ensureMemberFromClaims(state, claims);
      const memberMap = new Map(state.members.map((m) => [m.id, m]));

      return jsonResponse({
        ok: true,
        profile: sanitizeMemberProfile(member),
        bankCard: state.bankCards[uid] || null,
        transactions: state.transactions
          .filter((t) => t.user_id === uid)
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),
        userProducts: state.userProducts
          .filter((p) => p.user_id === uid)
          .sort((a, b) => b.started_at.localeCompare(a.started_at)),
        notifications: state.notifications
          .filter((n) => n.user_id === uid || n.user_id === null)
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),
        referrals: state.referrals
          .filter((r) => r.referrer_id === uid)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((r) => {
            const refUser = memberMap.get(r.referred_user_id);
            return {
              ...r,
              referred: refUser
                ? {
                    id: refUser.id,
                    full_name: refUser.full_name,
                    scania_id: refUser.scania_id,
                    email: refUser.email,
                    tier: refUser.tier,
                    created_at: refUser.created_at,
                  }
                : undefined,
            };
          }),
      });
    }

    if (pathname === '/api/user/bank-card' && method === 'POST') {
      const claims = await requireUserClaims();
      if (!claims) return jsonResponse({ error: 'অনুগ্রহ করে প্রথমে লগইন করুন।' }, 401);
      const body = await readJsonBody(request);
      const walletMethod = body.wallet_method === 'Nagad' ? 'Nagad' : body.wallet_method === 'Bkash' ? 'Bkash' : null;
      const walletNumber = String(body.wallet_number || '').trim();
      const accountName = String(body.account_name || '').trim();
      if (!walletMethod) return jsonResponse({ error: 'অনুগ্রহ করে Bkash অথবা Nagad নির্বাচন করুন।' }, 400);
      if (normalizePhoneDigits(walletNumber).length < 7) return jsonResponse({ error: 'সঠিক ওয়ালেট নাম্বার দিন।' }, 400);
      if (accountName.length < 2) return jsonResponse({ error: 'আপনার নাম সঠিকভাবে লিখুন।' }, 400);

      const card: WorkerBankCard = {
        wallet_method: walletMethod,
        wallet_number: walletNumber.slice(0, 30),
        account_name: accountName.slice(0, 80),
        updated_at: new Date().toISOString(),
      };
      state.bankCards[claims.uid] = card;
      await saveState(state);
      return jsonResponse({ ok: true, bankCard: card });
    }

    if (pathname === '/api/user/notification-read' && method === 'POST') {
      const claims = await requireUserClaims();
      if (!claims) return jsonResponse({ error: 'অনুগ্রহ করে প্রথমে লগইন করুন।' }, 401);
      const body = await readJsonBody(request);
      const notificationId = String(body.notificationId || '');
      if (!notificationId) return jsonResponse({ error: 'notificationId required' }, 400);
      state.notifications = state.notifications.map((n) =>
        n.id === notificationId && (n.user_id === claims.uid || n.user_id === null) ? { ...n, is_read: true } : n
      );
      await saveState(state);
      return jsonResponse({ ok: true });
    }

    if (pathname === '/api/user/change-password' && method === 'POST') {
      const claims = await requireUserClaims();
      if (!claims) return jsonResponse({ error: 'অনুগ্রহ করে প্রথমে লগইন করুন।' }, 401);
      const body = await readJsonBody(request);
      const newPassword = String(body.newPassword || '');
      if (newPassword.length < 6) return jsonResponse({ error: 'পাসওয়ার্ড কমপক্ষে 6 অক্ষরের হতে হবে।' }, 400);
      const member = ensureMemberFromClaims(state, claims);
      const salt = randomHex(16);
      member.password_salt = salt;
      member.password_hash = await sha256Hex(`${salt}:${newPassword}`);
      member.updated_at = new Date().toISOString();
      await saveState(state);
      return jsonResponse({ ok: true });
    }

    if (pathname === '/api/user/request-transaction' && method === 'POST') {
      const claims = await requireUserClaims();
      if (!claims) return jsonResponse({ error: 'অনুগ্রহ করে প্রথমে লগইন করুন।' }, 401);
      const uid = claims.uid;
      const member = ensureMemberFromClaims(state, claims);
      if (!member.is_active) return jsonResponse({ error: 'অ্যাকাউন্ট সক্রিয় নয়।' }, 403);

      const body = await readJsonBody(request);
      const type = String(body.type || '') as 'deposit_demo' | 'withdraw_demo';
      if (type !== 'deposit_demo' && type !== 'withdraw_demo') {
        return jsonResponse({ error: 'অবৈধ লেনদেনের ধরন।' }, 400);
      }

      const parsedAmount = Number(body.amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 1000000) {
        return jsonResponse({ error: 'সঠিক পরিমাণ লিখুন (1 থেকে 1,000,000 টাকা)।' }, 400);
      }
      if (type === 'deposit_demo' && parsedAmount < 500) {
        return jsonResponse({ error: 'সর্বনিম্ন রিচার্জ 500 টাকা।' }, 400);
      }
      if (type === 'deposit_demo' && String(body.reference_code || '').trim().length < 4) {
        return jsonResponse({ error: 'অনুগ্রহ করে সঠিক লেনদেন আইডি (TrxID) লিখুন।' }, 400);
      }
      if (type === 'withdraw_demo') {
        if (parsedAmount < 150) return jsonResponse({ error: 'সর্বনিম্ন উত্তোলন 150 টাকা।' }, 400);
        if (!state.bankCards[uid]) {
          return jsonResponse({ error: 'ব্যাংক কার্ড সেটআপ না থাকলে উত্তোলন করা যাবে না।' }, 400);
        }
        if (!state.userProducts.some((p) => p.user_id === uid)) {
          return jsonResponse({ error: 'ডিপোজিট করার পরে কমপক্ষে 1 টি প্ল্যান না কিনলে উত্তোলন করা যাবে না।' }, 400);
        }
        if (Number(member.demo_balance) < parsedAmount) {
          return jsonResponse({ error: 'আপনার ব্যালেন্স পর্যাপ্ত নয়।' }, 400);
        }
      }

      const nowIso = new Date().toISOString();
      const bankCard = state.bankCards[uid];
      let txMethod = String(body.method || 'bKash').slice(0, 60);
      let txRef = String(body.reference_code || '').trim().slice(0, 80);
      let txNote = `TrxID: ${txRef} · পর্যালোচনায় রয়েছে`;

      if (type === 'withdraw_demo') {
        const fee = Number((parsedAmount * 0.05).toFixed(2));
        const net = Number((parsedAmount - fee).toFixed(2));
        txMethod = bankCard ? `${bankCard.wallet_method} (${bankCard.wallet_number})` : txMethod;
        txRef = bankCard ? bankCard.account_name : txRef;
        txNote = `5% চার্জ: ৳${fee} · প্রাপ্তি: ৳${net}`;
      }

      const newTx: WorkerTransaction = {
        id: crypto.randomUUID(),
        user_id: uid,
        type,
        amount: Number(parsedAmount.toFixed(2)),
        method: txMethod,
        reference_code: txRef,
        status: 'pending',
        admin_note: txNote,
        processed_by: null,
        created_at: nowIso,
        updated_at: nowIso,
      };
      state.transactions.unshift(newTx);

      const notifTitle =
        type === 'deposit_demo' ? 'আপনার পেমেন্টটি পর্যালোচনায় রয়েছে' : 'আপনার উত্তোলন আবেদন পর্যালোচনায় রয়েছে';
      state.notifications.unshift({
        id: crypto.randomUUID(),
        user_id: uid,
        title: notifTitle,
        message:
          type === 'deposit_demo'
            ? `আপনার পেমেন্টটি পর্যালোচনায় রয়েছে (${parsedAmount} টাকা · ${txMethod} · TrxID: ${txRef})।`
            : `আপনার উত্তোলন আবেদন পর্যালোচনায় রয়েছে (${parsedAmount} টাকা)।`,
        category: 'transaction',
        is_read: false,
        created_at: nowIso,
      });

      await saveState(state);
      return jsonResponse({
        ok: true,
        transaction: newTx,
        profile: sanitizeMemberProfile(member),
        notificationTitle: notifTitle,
      });
    }

    if (pathname === '/api/user/redeem-bonus' && method === 'POST') {
      const claims = await requireUserClaims();
      if (!claims) return jsonResponse({ error: 'অনুগ্রহ করে প্রথমে লগইন করুন।' }, 401);
      const body = await readJsonBody(request);
      const code = String(body.code || '').trim().toUpperCase();
      if (!code) return jsonResponse({ error: 'বোনাস কোড লিখুন।' }, 400);

      const bonusEntry = state.bonusCodes.find((b) => b.code.toUpperCase() === code && b.is_active);
      if (!bonusEntry) return jsonResponse({ error: 'বোনাস কোড পাওয়া যায়নি বা নিষ্ক্রিয়।' }, 404);
      if (bonusEntry.used_count >= bonusEntry.usage_limit) {
        return jsonResponse({ error: 'বোনাস কোডের ব্যবহার সীমা শেষ।' }, 400);
      }
      if (state.bonusRedemptions.some((r) => r.code === code && r.user_id === claims.uid)) {
        return jsonResponse({ error: 'আপনি ইতিমধ্যে এই বোনাস কোড ব্যবহার করেছেন।' }, 409);
      }

      const member = ensureMemberFromClaims(state, claims);
      const amount = Number(bonusEntry.bonus_amount);
      const nowIso = new Date().toISOString();
      member.demo_balance = Number((Number(member.demo_balance) + amount).toFixed(2));
      member.demo_bonus = Number((Number(member.demo_bonus) + amount).toFixed(2));
      member.updated_at = nowIso;
      bonusEntry.used_count += 1;
      state.bonusRedemptions.push({ code, user_id: claims.uid, amount, created_at: nowIso });
      state.transactions.unshift({
        id: crypto.randomUUID(),
        user_id: claims.uid,
        type: 'bonus_code',
        amount,
        method: 'বোনাস কোড',
        reference_code: code,
        status: 'completed',
        admin_note: 'বোনাস ক্রেডিট হয়েছে',
        processed_by: null,
        created_at: nowIso,
        updated_at: nowIso,
      });
      await saveState(state);
      return jsonResponse({ success: true, amount });
    }

    if (pathname === '/api/user/purchase-plan' && method === 'POST') {
      const claims = await requireUserClaims();
      if (!claims) return jsonResponse({ error: 'অনুগ্রহ করে প্রথমে লগইন করুন।' }, 401);
      const body = await readJsonBody(request);
      const planId = String(body.planId || '');
      const catalog = state.plans && state.plans.length > 0 ? state.plans : DEFAULT_PLANS;
      const plan = catalog.find((p) => p.id === planId && p.is_active);
      if (!plan) return jsonResponse({ error: 'প্ল্যানটি পাওয়া যায়নি।' }, 404);

      const member = ensureMemberFromClaims(state, claims);
      const price = Number(plan.demo_price);
      if (Number(member.demo_balance) < price) {
        return jsonResponse({ error: 'পর্যাপ্ত ব্যালেন্স নেই। অনুগ্রহ করে রিচার্জ করুন।' }, 400);
      }

      const nowIso = new Date().toISOString();
      const expiresAt = new Date(Date.now() + Number(plan.validity_days) * 86400000).toISOString();
      member.demo_balance = Number((Number(member.demo_balance) - price).toFixed(2));
      member.updated_at = nowIso;

      const product: WorkerUserProduct = {
        id: crypto.randomUUID(),
        user_id: claims.uid,
        plan_id: plan.id,
        plan_title: plan.title,
        demo_price: price,
        daily_income: Number(plan.daily_income),
        validity_days: Number(plan.validity_days),
        days_elapsed: 0,
        total_simulated_earned: 0,
        status: 'active',
        started_at: nowIso,
        expires_at: expiresAt,
      };
      state.userProducts.unshift(product);
      state.transactions.unshift({
        id: crypto.randomUUID(),
        user_id: claims.uid,
        type: 'plan_purchase',
        amount: price,
        method: 'ওয়ালেট',
        reference_code: plan.title,
        status: 'completed',
        admin_note: `${plan.title} সক্রিয় হয়েছে`,
        processed_by: null,
        created_at: nowIso,
        updated_at: nowIso,
      });
      await saveState(state);
      return jsonResponse({ success: true, product, profile: sanitizeMemberProfile(member) });
    }

    // =========================================================================
    // ADMIN ENDPOINTS
    // =========================================================================
    if (pathname === '/api/admin/login' && method === 'POST') {
      const body = await readJsonBody(request);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const expectedEmail = (env.ADMIN_EMAIL || 'admin@scania.com').trim().toLowerCase();
      const expectedPass = env.ADMIN_PASSWORD || 'admin123456';

      if (email === expectedEmail && password === expectedPass) {
        const token = await signWorkerToken({ uid: 'server-admin-1', role: 'super_admin' }, secret);
        return jsonResponse({
          ok: true,
          mode: 'server',
          token,
          profile: {
            id: 'server-admin-1',
            scania_id: 'ADMIN01',
            email: expectedEmail,
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
          role: 'super_admin',
        });
      }
      return jsonResponse({ error: 'Invalid admin credentials.' }, 401);
    }

    const requireAdminClaims = async () => {
      const token = getBearerToken(request);
      if (!token) return null;
      const claims = await verifyWorkerToken(token, secret);
      if (!claims || !['admin', 'super_admin'].includes(claims.role)) return null;
      return claims;
    };

    if (pathname === '/api/admin/state' && method === 'GET') {
      const admin = await requireAdminClaims();
      if (!admin) return jsonResponse({ error: 'Unauthorized' }, 401);

      const memberMap = new Map(state.members.map((m) => [m.id, m]));
      return jsonResponse({
        ok: true,
        mode: 'server',
        profiles: state.members
          .map(sanitizeMemberProfile)
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),
        transactions: state.transactions
          .map((t) => {
            const m = memberMap.get(t.user_id);
            return {
              ...t,
              profiles: m ? { full_name: m.full_name, scania_id: m.scania_id, email: m.email } : undefined,
            };
          })
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),
        referrals: state.referrals,
        userProducts: state.userProducts,
        bankCards: state.bankCards,
        bonusCodes: state.bonusCodes,
        announcements: state.announcements,
        plans: state.plans || DEFAULT_PLANS,
        banners: state.banners,
        siteSettings: state.siteSettings,
        notifications: state.notifications,
      });
    }

    if (pathname === '/api/admin/site-settings' && method === 'POST') {
      const body = await readJsonBody(request);
      const prev = state.siteSettings;
      const updated: WorkerSiteSettings = {
        id: 1,
        site_name: String(body.site_name ?? prev?.site_name ?? 'SCANIA ইনভেস্টমেন্ট প্ল্যাটফর্ম').slice(0, 120),
        logo_url: String(body.logo_url ?? prev?.logo_url ?? '').slice(0, 500),
        currency_symbol: String(body.currency_symbol ?? prev?.currency_symbol ?? '৳').slice(0, 4),
        support_email: String(body.support_email ?? prev?.support_email ?? 'support@scania-platform.com').slice(0, 120),
        support_phone: String(body.support_phone ?? prev?.support_phone ?? '+880 1700-000000').slice(0, 60),
        telegram_link: String(body.telegram_link ?? prev?.telegram_link ?? 'https://t.me/scania_community').slice(0, 300),
        deposit_bkash_number: String(body.deposit_bkash_number ?? prev?.deposit_bkash_number ?? '01995616092').slice(0, 30),
        deposit_nagad_number: String(body.deposit_nagad_number ?? prev?.deposit_nagad_number ?? '01995616092').slice(0, 30),
        theme_accent: String(body.theme_accent ?? prev?.theme_accent ?? '#1250C4').slice(0, 20),
        show_team_tab: typeof body.show_team_tab === 'boolean' ? body.show_team_tab : (prev?.show_team_tab ?? true),
        show_bonus_button:
          typeof body.show_bonus_button === 'boolean' ? body.show_bonus_button : (prev?.show_bonus_button ?? true),
        footer_text: String(body.footer_text ?? prev?.footer_text ?? '© 2026 SCANIA ইনভেস্টমেন্ট প্ল্যাটফর্ম। সর্বস্বত্ব সংরক্ষিত।').slice(0, 240),
        about_text: String(body.about_text ?? prev?.about_text ?? DEFAULT_ABOUT_TEXT).slice(0, 2000),
        updated_at: new Date().toISOString(),
      };
      state.siteSettings = updated;
      await saveState(state);
      return jsonResponse({ ok: true, siteSettings: updated });
    }

    if (pathname === '/api/admin/broadcast-refresh' && method === 'POST') {
      return jsonResponse({ ok: true });
    }

    if (pathname === '/api/admin/audit' && method === 'POST') {
      return jsonResponse({ ok: true });
    }

    if (pathname === '/api/admin/plans' && method === 'POST') {
      if (!(await requireAdminClaims())) return jsonResponse({ error: 'Unauthorized' }, 401);
      const body = await readJsonBody(request);
      const list = state.plans && state.plans.length > 0 ? [...state.plans] : [...DEFAULT_PLANS];
      const nowIso = new Date().toISOString();
      const newPlan: WorkerPlan = {
        id: body.id ? String(body.id) : `plan-${crypto.randomUUID().slice(0, 8)}`,
        title: String(body.title || 'SCANIA Plan').trim().slice(0, 100),
        subtitle: String(body.subtitle || '').trim().slice(0, 100),
        description: String(body.description || '').trim().slice(0, 500),
        image_url: String(body.image_url || '').trim().slice(0, 500),
        demo_price: Number(body.demo_price || 500),
        daily_income: Number(body.daily_income || 50),
        validity_days: Number(body.validity_days || 30),
        total_return: body.total_return ? Number(body.total_return) : null,
        badge: String(body.badge || '').trim().slice(0, 30),
        is_active: typeof body.is_active === 'boolean' ? body.is_active : true,
        sort_order: Number(body.sort_order ?? list.length + 1),
        created_at: nowIso,
        updated_at: nowIso,
      };
      list.push(newPlan);
      state.plans = list;
      await saveState(state);
      return jsonResponse({ ok: true, plan: newPlan });
    }

    if (pathname.startsWith('/api/admin/plans/') && (method === 'PUT' || method === 'DELETE')) {
      if (!(await requireAdminClaims())) return jsonResponse({ error: 'Unauthorized' }, 401);
      const planId = pathname.split('/').pop() || '';
      const list = state.plans && state.plans.length > 0 ? [...state.plans] : [...DEFAULT_PLANS];
      if (method === 'DELETE') {
        state.plans = list.filter((p) => p.id !== planId);
        await saveState(state);
        return jsonResponse({ ok: true });
      }
      const idx = list.findIndex((p) => p.id === planId);
      if (idx === -1) return jsonResponse({ error: 'Plan not found.' }, 404);
      const body = await readJsonBody(request);
      const cur = list[idx];
      list[idx] = {
        ...cur,
        title: body.title !== undefined ? String(body.title).trim().slice(0, 100) : cur.title,
        subtitle: body.subtitle !== undefined ? String(body.subtitle).trim().slice(0, 100) : cur.subtitle,
        description: body.description !== undefined ? String(body.description).trim().slice(0, 500) : cur.description,
        image_url: body.image_url !== undefined ? String(body.image_url).trim().slice(0, 500) : cur.image_url,
        demo_price: body.demo_price !== undefined ? Number(body.demo_price) : cur.demo_price,
        daily_income: body.daily_income !== undefined ? Number(body.daily_income) : cur.daily_income,
        validity_days: body.validity_days !== undefined ? Number(body.validity_days) : cur.validity_days,
        total_return: body.total_return !== undefined ? (body.total_return ? Number(body.total_return) : null) : cur.total_return,
        badge: body.badge !== undefined ? String(body.badge).trim().slice(0, 30) : cur.badge,
        is_active: typeof body.is_active === 'boolean' ? body.is_active : cur.is_active,
        sort_order: body.sort_order !== undefined ? Number(body.sort_order) : cur.sort_order,
        updated_at: new Date().toISOString(),
      };
      state.plans = list;
      await saveState(state);
      return jsonResponse({ ok: true, plan: list[idx] });
    }

    if (pathname === '/api/admin/bonus-codes' && method === 'POST') {
      if (!(await requireAdminClaims())) return jsonResponse({ error: 'Unauthorized' }, 401);
      const body = await readJsonBody(request);
      const code = String(body.code || '').trim().toUpperCase();
      if (!code) return jsonResponse({ error: 'Bonus code is required.' }, 400);
      const created: WorkerBonusCode = {
        id: `bonus-${crypto.randomUUID().slice(0, 8)}`,
        code,
        description: String(body.description || '').trim().slice(0, 200),
        bonus_amount: Number(body.bonus_amount || 0),
        usage_limit: Number(body.usage_limit || 100),
        used_count: 0,
        is_active: typeof body.is_active === 'boolean' ? body.is_active : true,
        expires_at: null,
        created_at: new Date().toISOString(),
      };
      state.bonusCodes.unshift(created);
      await saveState(state);
      return jsonResponse({ ok: true, bonusCode: created });
    }

    if (pathname.startsWith('/api/admin/bonus-codes/') && (method === 'PUT' || method === 'DELETE')) {
      if (!(await requireAdminClaims())) return jsonResponse({ error: 'Unauthorized' }, 401);
      const id = pathname.split('/').pop() || '';
      if (method === 'DELETE') {
        state.bonusCodes = state.bonusCodes.filter((b) => b.id !== id);
        await saveState(state);
        return jsonResponse({ ok: true });
      }
      const idx = state.bonusCodes.findIndex((b) => b.id === id);
      if (idx === -1) return jsonResponse({ error: 'Bonus code not found.' }, 404);
      const body = await readJsonBody(request);
      const cur = state.bonusCodes[idx];
      state.bonusCodes[idx] = {
        ...cur,
        code: body.code !== undefined ? String(body.code).trim().toUpperCase() : cur.code,
        description: body.description !== undefined ? String(body.description).trim() : cur.description,
        bonus_amount: body.bonus_amount !== undefined ? Number(body.bonus_amount) : cur.bonus_amount,
        usage_limit: body.usage_limit !== undefined ? Number(body.usage_limit) : cur.usage_limit,
        is_active: typeof body.is_active === 'boolean' ? body.is_active : cur.is_active,
      };
      await saveState(state);
      return jsonResponse({ ok: true, bonusCode: state.bonusCodes[idx] });
    }

    if (pathname === '/api/admin/announcements' && method === 'POST') {
      if (!(await requireAdminClaims())) return jsonResponse({ error: 'Unauthorized' }, 401);
      const body = await readJsonBody(request);
      const list = state.announcements ? [...state.announcements] : [];
      const nowIso = new Date().toISOString();
      const created: WorkerAnnouncement = {
        id: `ann-${crypto.randomUUID().slice(0, 8)}`,
        title: String(body.title || '').trim().slice(0, 140),
        content: String(body.content || '').trim().slice(0, 1000),
        priority: body.priority === 'important' ? 'important' : 'normal',
        is_published: typeof body.is_published === 'boolean' ? body.is_published : true,
        created_at: nowIso,
        updated_at: nowIso,
      };
      list.unshift(created);
      state.announcements = list;
      await saveState(state);
      return jsonResponse({ ok: true, announcement: created });
    }

    if (pathname.startsWith('/api/admin/announcements/') && (method === 'PUT' || method === 'DELETE')) {
      if (!(await requireAdminClaims())) return jsonResponse({ error: 'Unauthorized' }, 401);
      const id = pathname.split('/').pop() || '';
      if (method === 'DELETE') {
        state.announcements = (state.announcements || []).filter((a) => a.id !== id);
        await saveState(state);
        return jsonResponse({ ok: true });
      }
      const list = state.announcements ? [...state.announcements] : [];
      const idx = list.findIndex((a) => a.id === id);
      if (idx === -1) return jsonResponse({ error: 'Announcement not found.' }, 404);
      const body = await readJsonBody(request);
      const cur = list[idx];
      list[idx] = {
        ...cur,
        title: body.title !== undefined ? String(body.title).trim().slice(0, 140) : cur.title,
        content: body.content !== undefined ? String(body.content).trim().slice(0, 1000) : cur.content,
        priority: body.priority !== undefined ? (body.priority === 'important' ? 'important' : 'normal') : cur.priority,
        is_published: typeof body.is_published === 'boolean' ? body.is_published : cur.is_published,
        updated_at: new Date().toISOString(),
      };
      state.announcements = list;
      await saveState(state);
      return jsonResponse({ ok: true, announcement: list[idx] });
    }

    if (pathname === '/api/admin/notifications' && method === 'POST') {
      if (!(await requireAdminClaims())) return jsonResponse({ error: 'Unauthorized' }, 401);
      const body = await readJsonBody(request);
      const title = String(body.title || '').trim().slice(0, 140);
      const message = String(body.message || '').trim().slice(0, 600);
      const category = ['system', 'transaction', 'bonus', 'support', 'announcement'].includes(String(body.category))
        ? (String(body.category) as WorkerNotification['category'])
        : 'system';
      const userIds = Array.isArray(body.userIds) ? body.userIds : [];
      const nowIso = new Date().toISOString();
      if (!title || !message) return jsonResponse({ error: 'Title and message are required.' }, 400);

      if (userIds.length === 0) {
        state.notifications.unshift({
          id: crypto.randomUUID(),
          user_id: null,
          title,
          message,
          category,
          is_read: false,
          created_at: nowIso,
        });
      } else {
        for (const uid of userIds) {
          state.notifications.unshift({
            id: crypto.randomUUID(),
            user_id: String(uid),
            title,
            message,
            category,
            is_read: false,
            created_at: nowIso,
          });
        }
      }
      await saveState(state);
      return jsonResponse({ ok: true });
    }

    if (pathname === '/api/admin/banners' && method === 'POST') {
      if (!(await requireAdminClaims())) return jsonResponse({ error: 'Unauthorized' }, 401);
      const body = await readJsonBody(request);
      const imageUrl = String(body.image_url || '').trim();
      if (!imageUrl) return jsonResponse({ error: 'image_url is required.' }, 400);
      const created: WorkerBanner = {
        id: `banner-${crypto.randomUUID().slice(0, 8)}`,
        title: String(body.title || 'SCANIA Banner').trim().slice(0, 120),
        subtitle: String(body.subtitle || '').trim().slice(0, 200),
        placement: ['home_hero', 'plans_promo', 'team_hero', 'mine_support', 'plan_card'].includes(String(body.placement))
          ? (String(body.placement) as WorkerBanner['placement'])
          : 'home_hero',
        image_url: imageUrl.slice(0, 500),
        storage_path: String(body.storage_path || '').slice(0, 200),
        cta_label: '',
        cta_link: '',
        is_active: true,
        sort_order: state.banners.length + 1,
        created_at: new Date().toISOString(),
      };
      state.banners.push(created);
      await saveState(state);
      return jsonResponse({ ok: true, banner: created });
    }

    if (pathname.startsWith('/api/admin/banners/') && method === 'DELETE') {
      if (!(await requireAdminClaims())) return jsonResponse({ error: 'Unauthorized' }, 401);
      const id = pathname.split('/').pop() || '';
      state.banners = state.banners.filter((b) => b.id !== id);
      await saveState(state);
      return jsonResponse({ ok: true });
    }

    if (pathname === '/api/admin/transactions/process' && method === 'POST') {
      const admin = await requireAdminClaims();
      if (!admin) return jsonResponse({ error: 'Unauthorized' }, 401);
      const body = await readJsonBody(request);
      const transactionId = String(body.transactionId || '');
      const decision = body.decision === 'approved' || body.decision === 'rejected' ? body.decision : '';
      const adminNote = body.adminNote ? String(body.adminNote) : '';
      if (!transactionId || !decision) {
        return jsonResponse({ error: 'Valid transactionId and decision required.' }, 400);
      }

      const txIdx = state.transactions.findIndex((t) => t.id === transactionId);
      if (txIdx === -1) return jsonResponse({ error: 'Transaction not found.' }, 404);
      const tx = state.transactions[txIdx];
      if (tx.status !== 'pending') return jsonResponse({ error: 'Transaction has already been processed.' }, 400);

      const mIdx = state.members.findIndex((m) => m.id === tx.user_id);
      if (mIdx === -1) return jsonResponse({ error: 'User profile not found.' }, 404);
      const member = state.members[mIdx];
      const txAmount = Number(tx.amount);
      const nowIso = new Date().toISOString();

      if (decision === 'approved') {
        if (tx.type === 'deposit_demo') {
          member.demo_balance = Number((Number(member.demo_balance) + txAmount).toFixed(2));
          member.updated_at = nowIso;
          if (member.referred_by) {
            const refIdx = state.members.findIndex((m) => m.id === member.referred_by);
            if (refIdx !== -1) {
              const comm = Number((txAmount * 0.25).toFixed(2));
              if (comm > 0) {
                state.members[refIdx].demo_balance = Number((Number(state.members[refIdx].demo_balance) + comm).toFixed(2));
                state.members[refIdx].updated_at = nowIso;
                state.transactions.unshift({
                  id: crypto.randomUUID(),
                  user_id: state.members[refIdx].id,
                  type: 'referral_commission',
                  amount: comm,
                  method: 'লেভেল 1 রেফারেল (25%)',
                  reference_code: member.scania_id,
                  status: 'completed',
                  admin_note: `${member.full_name} এর রিচার্জ থেকে 25% কমিশন`,
                  processed_by: admin.uid,
                  created_at: nowIso,
                  updated_at: nowIso,
                });
              }
            }
          }
        } else if (tx.type === 'withdraw_demo') {
          if (Number(member.demo_balance) < txAmount) {
            return jsonResponse({ error: 'User balance is lower than withdrawal request amount.' }, 400);
          }
          member.demo_balance = Number((Number(member.demo_balance) - txAmount).toFixed(2));
          member.updated_at = nowIso;
        }
      }

      state.transactions[txIdx] = {
        ...tx,
        status: decision,
        admin_note: adminNote ? adminNote.slice(0, 300) : decision === 'approved' ? 'কনফার্ম করা হয়েছে' : 'ব্যর্থ হয়েছে',
        processed_by: admin.uid,
        updated_at: nowIso,
      };
      await saveState(state);
      return jsonResponse({ ok: true, transaction: state.transactions[txIdx] });
    }

    const userActionMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)(?:\/(balance|password|assign-plan))?$/);
    if (userActionMatch) {
      const admin = await requireAdminClaims();
      if (!admin) return jsonResponse({ error: 'Unauthorized' }, 401);
      const targetId = userActionMatch[1];
      const action = userActionMatch[2] || '';
      const mIdx = state.members.findIndex((m) => m.id === targetId);
      if (mIdx === -1) return jsonResponse({ error: 'User not found.' }, 404);
      const body = await readJsonBody(request);
      const nowIso = new Date().toISOString();

      if (!action && method === 'PUT') {
        if (typeof body.full_name === 'string' && body.full_name.trim()) {
          state.members[mIdx].full_name = body.full_name.trim().slice(0, 80);
        }
        if (typeof body.phone === 'string') state.members[mIdx].phone = body.phone.trim().slice(0, 30);
        if (typeof body.tier === 'string' && body.tier.trim()) state.members[mIdx].tier = body.tier.trim().slice(0, 40);
        if (typeof body.is_active === 'boolean') state.members[mIdx].is_active = body.is_active;
        state.members[mIdx].updated_at = nowIso;
        await saveState(state);
        return jsonResponse({ ok: true, profile: sanitizeMemberProfile(state.members[mIdx]) });
      }

      if (action === 'balance' && method === 'POST') {
        const mode = body.mode === 'deduct' ? 'deduct' : 'add';
        const amount = Number(body.amount || 0);
        const note = String(body.note || '').trim().slice(0, 200);
        if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
          return jsonResponse({ error: 'সঠিক টাকার পরিমাণ লিখুন।' }, 400);
        }
        const cur = Number(state.members[mIdx].demo_balance || 0);
        if (mode === 'deduct' && cur < amount) {
          return jsonResponse({ error: 'ব্যবহারকারীর ব্যালেন্সের চেয়ে বেশি টাকা কাটা যাবে না।' }, 400);
        }
        state.members[mIdx].demo_balance =
          mode === 'add' ? Number((cur + amount).toFixed(2)) : Number((cur - amount).toFixed(2));
        state.members[mIdx].updated_at = nowIso;
        state.transactions.unshift({
          id: crypto.randomUUID(),
          user_id: targetId,
          type: mode === 'add' ? 'bonus_code' : 'withdraw_demo',
          amount: Number(amount.toFixed(2)),
          method: mode === 'add' ? 'Admin Add Balance' : 'Admin Deduct Balance',
          reference_code: 'ADMIN-ADJ',
          status: 'completed',
          admin_note: note || (mode === 'add' ? 'অ্যাডমিন থেকে ব্যালেন্স যোগ করা হয়েছে' : 'অ্যাডমিন থেকে ব্যালেন্স কাটা হয়েছে'),
          processed_by: admin.uid,
          created_at: nowIso,
          updated_at: nowIso,
        });
        await saveState(state);
        return jsonResponse({ ok: true, profile: sanitizeMemberProfile(state.members[mIdx]) });
      }

      if (action === 'password' && method === 'POST') {
        const newPassword = String(body.newPassword || '');
        if (newPassword.length < 6) {
          return jsonResponse({ error: 'নতুন পাসওয়ার্ড কমপক্ষে 6 অক্ষরের হতে হবে।' }, 400);
        }
        const salt = randomHex(16);
        state.members[mIdx].password_salt = salt;
        state.members[mIdx].password_hash = await sha256Hex(`${salt}:${newPassword}`);
        state.members[mIdx].updated_at = nowIso;
        await saveState(state);
        return jsonResponse({ ok: true });
      }

      if (action === 'assign-plan' && method === 'POST') {
        const planId = String(body.planId || '');
        const tier = typeof body.tier === 'string' && body.tier.trim() ? body.tier.trim().slice(0, 40) : '';
        const catalog = state.plans && state.plans.length > 0 ? state.plans : DEFAULT_PLANS;
        const plan = catalog.find((p) => p.id === planId);
        if (!plan) return jsonResponse({ error: 'নির্বাচিত প্ল্যানটি পাওয়া যায়নি।' }, 404);
        if (tier) {
          state.members[mIdx].tier = tier;
          state.members[mIdx].updated_at = nowIso;
        }
        const product: WorkerUserProduct = {
          id: crypto.randomUUID(),
          user_id: targetId,
          plan_id: plan.id,
          plan_title: plan.title,
          demo_price: Number(plan.demo_price),
          daily_income: Number(plan.daily_income),
          validity_days: Number(plan.validity_days),
          days_elapsed: 0,
          total_simulated_earned: 0,
          status: 'active',
          started_at: nowIso,
          expires_at: new Date(Date.now() + Number(plan.validity_days) * 86400000).toISOString(),
        };
        state.userProducts.unshift(product);
        await saveState(state);
        return jsonResponse({ ok: true, product, profile: sanitizeMemberProfile(state.members[mIdx]) });
      }
    }

    return jsonResponse(
      {
        error: 'API route not found in worker runtime.',
        fallback: true,
      },
      404
    );
  },
};
