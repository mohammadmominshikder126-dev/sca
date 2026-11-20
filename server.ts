import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT =
  process.env.NODE_ENV === 'production' && !process.env.NGINX_PORT
    ? Number(process.env.PORT || 3000)
    : Number(process.env.DEFAULT_APP_PORT || 3000);
function cleanEnvSecret(raw: string | undefined, names: string[]): string {
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

const SUPABASE_URL = cleanEnvSecret(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, [
  'VITE_SUPABASE_URL',
  'SUPABASE_URL',
]);
const SUPABASE_ANON_KEY = cleanEnvSecret(
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  ['VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY']
);
const SUPABASE_SERVICE_ROLE_KEY = cleanEnvSecret(process.env.SUPABASE_SERVICE_ROLE_KEY, [
  'SUPABASE_SERVICE_ROLE_KEY',
]);

function isMissingTableError(err: { message?: string; code?: string } | null | undefined): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    err.code === 'PGRST205' ||
    err.code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidHttpUrl(value: string): boolean {
  if (!value || value.includes('your-project-id')) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidServiceRoleKey(key: string): boolean {
  if (!key) return false;
  if (key.startsWith('sb_secret_')) return true;
  if (key.startsWith('sb_publishable_')) return false;
  if (key.split('.').length === 3) {
    try {
      const payload = JSON.parse(
        Buffer.from(key.split('.')[1], 'base64url').toString('utf8')
      ) as { role?: string };
      return payload.role === 'service_role';
    } catch {
      return false;
    }
  }
  return false;
}

function createSafeSupabaseClient(url: string, key: string): SupabaseClient | null {
  if (!isValidHttpUrl(url) || !key) return null;
  try {
    return createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch {
    return null;
  }
}

const supabaseAdmin: SupabaseClient | null = isValidServiceRoleKey(SUPABASE_SERVICE_ROLE_KEY)
  ? createSafeSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

const supabasePublic: SupabaseClient | null =
  SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('your-supabase-anon-key')
    ? createSafeSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const isSupabaseConfigured = Boolean(supabasePublic);
const isAdminClientReady = Boolean(supabaseAdmin);

interface AuthedRequest extends Request {
  authUser?: User;
  userId?: string;
  authMode?: 'supabase' | 'server';
  userRole?: string;
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

// =========================================================================
// SSE LIVE BROADCAST REGISTRY (Admin -> User instant updates)
// =========================================================================
const sseClients = new Set<Response>();

function broadcastRefresh(reason: string) {
  const payload = `event: refresh\ndata: ${JSON.stringify({ reason, ts: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

function normalizePhoneDigits(raw: string): string {
  return raw.replace(/[^0-9]/g, '');
}

function toCanonicalDigits(raw: string): string {
  const digits = normalizePhoneDigits(raw);
  return digits.startsWith('880') && digits.length === 13 ? `0${digits.slice(3)}` : digits;
}

// =========================================================================
// PERSISTENT SERVER STORES (.data/members.json & .data/app_data.json)
// =========================================================================
interface ServerMemberRecord {
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

interface ServerBankCard {
  wallet_method: 'Bkash' | 'Nagad';
  wallet_number: string;
  account_name: string;
  updated_at: string;
}

interface ServerTransaction {
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

interface ServerUserProduct {
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

interface ServerNotification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  category: 'system' | 'transaction' | 'bonus' | 'support' | 'announcement';
  is_read: boolean;
  created_at: string;
}

interface ServerReferralRecord {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  level: 1 | 2 | 3;
  commission_rate: number;
  simulated_commission: number;
  created_at: string;
}

interface ServerBonusCode {
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

interface ServerSiteSettings {
  id: number;
  site_name: string;
  logo_url: string;
  currency_symbol: string;
  support_email: string;
  support_phone: string;
  telegram_link: string;
  deposit_bkash_number?: string;
  deposit_nagad_number?: string;
  theme_accent: string;
  show_team_tab: boolean;
  show_bonus_button: boolean;
  footer_text: string;
  about_text: string;
  updated_at: string;
}

interface ServerAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'important';
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface ServerPlan {
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

interface ServerBanner {
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

interface AppDataStore {
  bankCards: Record<string, ServerBankCard>;
  transactions: ServerTransaction[];
  userProducts: ServerUserProduct[];
  notifications: ServerNotification[];
  referrals: ServerReferralRecord[];
  bonusCodes: ServerBonusCode[];
  bonusRedemptions: { code: string; user_id: string; amount: number; created_at: string }[];
  siteSettings: ServerSiteSettings | null;
  announcements: ServerAnnouncement[] | null;
  plans: ServerPlan[] | null;
  banners: ServerBanner[];
}

const DATA_DIR = path.resolve(__dirname, '.data');
const MEMBERS_FILE = path.join(DATA_DIR, 'members.json');
const APP_DATA_FILE = path.join(DATA_DIR, 'app_data.json');

const TOKEN_SECRET =
  process.env.SESSION_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'scania-platform-session-key';

const DEFAULT_SERVER_PLANS: ServerPlan[] = [
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

const DEFAULT_SERVER_BONUS_CODES: ServerBonusCode[] = [
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

function readServerMembers(): ServerMemberRecord[] {
  try {
    if (!fs.existsSync(MEMBERS_FILE)) return [];
    const raw = fs.readFileSync(MEMBERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeServerMembers(list: ServerMemberRecord[]) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(MEMBERS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

const DEFAULT_ABOUT_TEXT = `SCANIA বিশেষ কহচ্ছে বিশ্বের অন্যতম বিলাসবহুল বাস ও ট্রাকের জগতে Scania (স্ক্যানিয়া) নিঃসন্দেহে বিশ্বের অন্যতম সেরা এবং বিশ্বস্ত একটি প্লাটফর্ম এই প্রতিষ্ঠানটি গত এক শতাব্দীরও বেশি সময় ধরে তাদের অসাধারণ Service এবং বিশ্বাসের মাধ্যমে ব্যবহারকারীদের কাছে শ্রেষ্ঠত্ব প্রমাণ করে আসছে।
বাংলাদেশের প্রেক্ষাপটেও দেশের শীর্ষস্থানীয় ও প্রিমিয়াম বাস অপারেটরগুলোর কাছে স্ক্যানিয়া আস্থার এক অপর নাম। নিচে স্ক্যানিয়ার বিশ্বস্ততা এবং অনন্য বৈশিষ্ট্যগুলো তুলে ধরা হলো:
১. অতুলনীয় স্থায়িত্ব ও দ্রুত পেমেন্ট সিস্টেম
• দীর্ঘ মেয়াদী SCANIA প্ল্যাটফর্মটি তৈরি করা হয় যা বছরের পর বছর বিরামহীনভাবে চলতে সক্ষম। সঠিক রক্ষণাবেক্ষনে ২৪ ঘন্টা কাস্টমার সার্ভিস রয়েছে স্ক্যানিয়া ব্যবহারকারীদের কোনো বড় সমস্যা হলে খুব দ্রুত সমাধান করার জন্য বিখ্যাত
• অসাধারণ পরিস্থিতিতে যেমনই হোক স্ক্যানিয়ার ব্যবহারকারী যেকোনো সমস্যা খুব দ্রুত সমাধান করে থাকে`;

function readAppData(): AppDataStore {
  const empty: AppDataStore = {
    bankCards: {},
    transactions: [],
    userProducts: [],
    notifications: [],
    referrals: [],
    bonusCodes: [...DEFAULT_SERVER_BONUS_CODES],
    bonusRedemptions: [],
    siteSettings: null,
    announcements: null,
    plans: null,
    banners: [],
  };
  try {
    if (!fs.existsSync(APP_DATA_FILE)) return empty;
    const raw = fs.readFileSync(APP_DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AppDataStore>;
    return {
      bankCards: parsed.bankCards || {},
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      userProducts: Array.isArray(parsed.userProducts) ? parsed.userProducts : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      referrals: Array.isArray(parsed.referrals) ? parsed.referrals : [],
      bonusCodes:
        Array.isArray(parsed.bonusCodes) && parsed.bonusCodes.length > 0
          ? parsed.bonusCodes
          : [...DEFAULT_SERVER_BONUS_CODES],
      bonusRedemptions: Array.isArray(parsed.bonusRedemptions) ? parsed.bonusRedemptions : [],
      siteSettings: parsed.siteSettings || null,
      announcements: Array.isArray(parsed.announcements) ? parsed.announcements : null,
      plans: Array.isArray(parsed.plans) ? parsed.plans : null,
      banners: Array.isArray(parsed.banners) ? parsed.banners : [],
    };
  } catch {
    return empty;
  }
}

function writeAppData(data: AppDataStore) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(APP_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, s, 64).toString('hex');
  return { salt: s, hash };
}

function verifyPasswordHash(password: string, salt: string, expectedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function signServerToken(userId: string, role: string = 'user'): string {
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ uid: userId, role, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyServerTokenPayload(token: string): { uid: string; role: string } | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
    if (sig.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      uid?: string;
      role?: string;
      exp?: number;
    };
    if (!decoded.uid || !decoded.exp || decoded.exp < Date.now()) return null;
    return { uid: decoded.uid, role: decoded.role || 'user' };
  } catch {
    return null;
  }
}

function verifyServerToken(token: string): string | null {
  const p = verifyServerTokenPayload(token);
  return p ? p.uid : null;
}

function verifyAdminToken(token: string): string | null {
  const p = verifyServerTokenPayload(token);
  if (!p) return null;
  return ['admin', 'super_admin'].includes(p.role) ? p.uid : null;
}

function sanitizeMemberProfile(m: ServerMemberRecord) {
  const { password_salt: _s, password_hash: _h, canonical_digits: _c, ...profile } = m;
  return profile;
}

function buildPhoneCandidates(raw: string): string[] {
  const trimmed = raw.trim();
  const digits = normalizePhoneDigits(trimmed);
  const candidates = new Set<string>();
  if (trimmed) candidates.add(trimmed);
  if (digits) {
    candidates.add(digits);
    candidates.add(`+${digits}`);
    if (digits.startsWith('880') && digits.length === 13) {
      candidates.add(`0${digits.slice(3)}`);
    } else if (digits.startsWith('0') && digits.length === 11) {
      candidates.add(`88${digits}`);
      candidates.add(`+88${digits}`);
    }
  }
  return Array.from(candidates);
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const client = supabaseAdmin || supabasePublic;
  if (!client) {
    res.status(503).json({ error: 'Supabase is not configured on the server.' });
    return;
  }

  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Missing Authorization Bearer token.' });
    return;
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: 'Invalid or expired session token.' });
    return;
  }

  req.authUser = data.user;
  req.userId = data.user.id;
  req.authMode = 'supabase';
  next();
}

async function requireUserSession(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'অনুগ্রহ করে প্রথমে লগইন করুন।' });
    return;
  }

  const serverUid = verifyServerToken(token);
  if (serverUid) {
    const members = readServerMembers();
    const member = members.find((m) => m.id === serverUid);
    if (!member) {
      res.status(401).json({ error: 'অবৈধ সেশন। অনুগ্রহ করে আবার লগইন করুন।' });
      return;
    }
    req.userId = serverUid;
    req.authMode = 'server';
    next();
    return;
  }

  const client = supabaseAdmin || supabasePublic;
  if (client) {
    const { data, error } = await client.auth.getUser(token);
    if (!error && data?.user) {
      req.authUser = data.user;
      req.userId = data.user.id;
      req.authMode = 'supabase';
      next();
      return;
    }
  }

  res.status(401).json({ error: 'সেশন মেয়াদ উত্তীর্ণ হয়েছে। আবার লগইন করুন।' });
}

async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Missing Authorization Bearer token.' });
    return;
  }

  const serverAdminId = verifyAdminToken(token);
  if (serverAdminId) {
    req.userId = serverAdminId;
    req.authMode = 'server';
    req.userRole = 'super_admin';
    next();
    return;
  }

  await requireAuth(req, res, async () => {
    if (!supabaseAdmin) {
      res.status(503).json({ error: 'Admin role verification unavailable.' });
      return;
    }
    const uid = req.authUser!.id;
    const { data: roleRow, error } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', uid)
      .maybeSingle();

    if (error || !roleRow || !['admin', 'super_admin'].includes(roleRow.role)) {
      res.status(403).json({ error: 'Forbidden: Admin role required.' });
      return;
    }

    req.userRole = roleRow.role;
    next();
  });
}

async function writeAuditLog(
  adminId: string,
  action: string,
  targetTable: string,
  targetId: string,
  details: Record<string, unknown> = {}
) {
  if (!supabaseAdmin || !isUuid(adminId)) return;
  await supabaseAdmin.from('admin_audit_logs').insert({
    admin_id: adminId,
    action,
    target_table: targetTable,
    target_id: targetId,
    details,
  });
}

async function ensureCanonicalPlansSeeded() {
  if (!supabaseAdmin) return;
  try {
    const { data: existing, error } = await supabaseAdmin.from('plans').select('id, title');
    if (error) return;

    const legacyTitles = new Set(['Scania Premium Plan', 'Scania Business Plan', 'Scania Elite Plan']);
    const hasCustomPlans =
      existing &&
      existing.length > 0 &&
      existing.some((p) => !legacyTitles.has(p.title));

    if (hasCustomPlans) return;

    const canonicalPlans = DEFAULT_SERVER_PLANS.map(({ id: _id, created_at: _c, updated_at: _u, ...rest }) => rest);

    if (existing && existing.length > 0) {
      const { count } = await supabaseAdmin
        .from('demo_user_products')
        .select('id', { count: 'exact', head: true });
      if (!count || count === 0) {
        await supabaseAdmin.from('plans').delete().in('id', existing.map((p) => p.id));
      } else {
        await supabaseAdmin.from('plans').update({ is_active: false }).in('id', existing.map((p) => p.id));
      }
    }

    const { error: insertErr } = await supabaseAdmin.from('plans').insert(canonicalPlans);
    if (insertErr) {
      const withoutTotalReturn = canonicalPlans.map(({ total_return: _tr, ...rest }) => rest);
      await supabaseAdmin.from('plans').insert(withoutTotalReturn);
    }
  } catch (err) {
    console.warn('Plan seed check skipped:', (err as Error).message);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '8mb' }));

  void ensureCanonicalPlansSeeded();

  // Live SSE stream for Admin -> User & transaction updates (Cloudflare Workers compatible headers)
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders?.();

    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    sseClients.add(res);

    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  // Health & Config Inspection Endpoint
  app.get('/api/health', async (_req, res) => {
    let serviceKeyType = 'none';
    if (SUPABASE_SERVICE_ROLE_KEY) {
      if (SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_secret_')) {
        serviceKeyType = 'sb_secret';
      } else if (SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_publishable_')) {
        serviceKeyType = 'sb_publishable';
      } else if (SUPABASE_SERVICE_ROLE_KEY.split('.').length === 3) {
        try {
          const payload = JSON.parse(
            Buffer.from(SUPABASE_SERVICE_ROLE_KEY.split('.')[1], 'base64url').toString('utf8')
          ) as { role?: string };
          serviceKeyType = `jwt-${payload.role || 'unknown'}`;
        } catch {
          serviceKeyType = 'jwt-malformed';
        }
      } else {
        serviceKeyType = 'other';
      }
    }

    let plansStatus: { count: number; titles: string[]; error?: string } = { count: 0, titles: [] };
    let schemaReady = false;
    const missingTables: string[] = [];
    const dbClient = supabaseAdmin || supabasePublic;
    if (dbClient) {
      const [plansRes, settingsRes, profilesRes, txRes] = await Promise.all([
        dbClient.from('plans').select('title').order('sort_order', { ascending: true }),
        dbClient.from('site_settings').select('id').limit(1),
        dbClient.from('profiles').select('id,phone,referral_code,referred_by,demo_balance').limit(1),
        dbClient.from('demo_transactions').select('id').limit(1),
      ]);

      if (plansRes.error) {
        plansStatus = { count: 0, titles: [], error: plansRes.error.message };
        if (isMissingTableError(plansRes.error)) missingTables.push('plans');
      } else {
        plansStatus = {
          count: plansRes.data?.length || 0,
          titles: (plansRes.data || []).map((p) => p.title),
        };
      }
      if (isMissingTableError(settingsRes.error)) missingTables.push('site_settings');
      if (profilesRes.error) {
        missingTables.push(
          isMissingTableError(profilesRes.error)
            ? 'profiles'
            : `profiles (${profilesRes.error.message})`
        );
      }
      if (isMissingTableError(txRes.error)) missingTables.push('demo_transactions');

      schemaReady = !plansRes.error && !isMissingTableError(settingsRes.error) && !profilesRes.error;
    }

    res.json({
      ok: true,
      supabaseConfigured: isSupabaseConfigured,
      adminApiReady: isAdminClientReady,
      schemaReady,
      missingTables,
      serviceKeyType,
      plansStatus,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  });

  // Public Supabase client config (URL + Anon Key only; never exposes Service Role Key)
  app.get('/api/public/config', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({
      supabaseConfigured: isSupabaseConfigured,
      supabaseUrl: isSupabaseConfigured ? SUPABASE_URL : '',
      supabaseAnonKey: isSupabaseConfigured ? SUPABASE_ANON_KEY : '',
    });
  });

  // Public site-data (reads live Supabase tables first when ready, falls back cleanly to local store)
  app.get('/api/public/site-data', async (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const store = readAppData();
    const dbClient = supabaseAdmin || supabasePublic;

    if (dbClient) {
      try {
        const [settingsRes, plansRes, annRes, bannersRes] = await Promise.all([
          dbClient.from('site_settings').select('*').eq('id', 1).maybeSingle(),
          dbClient
            .from('plans')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false }),
          dbClient.from('announcements').select('*').order('created_at', { ascending: false }),
          dbClient
            .from('banners')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false }),
        ]);

        const sbSettings = !settingsRes.error ? (settingsRes.data as ServerSiteSettings | null) : null;
        const sbPlans = !plansRes.error && plansRes.data && plansRes.data.length > 0 ? (plansRes.data as ServerPlan[]) : null;
        const sbAnn = !annRes.error && annRes.data ? (annRes.data as ServerAnnouncement[]) : null;
        const sbBanners = !bannersRes.error && bannersRes.data ? (bannersRes.data as ServerBanner[]) : null;

        const fallbackPlans = store.plans && store.plans.length > 0 ? store.plans : DEFAULT_SERVER_PLANS;
        res.json({
          siteSettings: sbSettings || store.siteSettings,
          announcements: sbAnn && sbAnn.length > 0 ? sbAnn : store.announcements,
          plans: sbPlans || fallbackPlans,
          banners: sbBanners && sbBanners.length > 0 ? sbBanners : store.banners,
        });
        return;
      } catch {
        // Fallback to local store
      }
    }

    res.json({
      siteSettings: store.siteSettings,
      announcements: store.announcements,
      plans: store.plans && store.plans.length > 0 ? store.plans : DEFAULT_SERVER_PLANS,
      banners: store.banners,
    });
  });

  // =========================================================================
  // PHONE AUTH ENDPOINTS (Works via Supabase Admin/RPC OR server-side auth store)
  // =========================================================================

  app.post('/api/auth/register', async (req: Request, res: Response) => {
    const rawPhone = String(req.body?.phone || '').trim();
    const password = String(req.body?.password || '');
    const fullName = String(req.body?.fullName || '').trim();
    const referralCode = String(req.body?.referralCode || '').trim().toUpperCase();

    const digits = normalizePhoneDigits(rawPhone);
    if (digits.length < 7 || digits.length > 16) {
      res.status(400).json({ error: 'অনুগ্রহ করে একটি সঠিক মোবাইল নম্বর দিন।' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'পাসওয়ার্ড কমপক্ষে 6 অক্ষরের হতে হবে।' });
      return;
    }

    const canonicalDigits = toCanonicalDigits(rawPhone);
    const email = `u${canonicalDigits}@scania-member.com`;
    const displayName = fullName || `সদস্য ${canonicalDigits.slice(-4)}`;

    if (supabaseAdmin) {
      const candidates = buildPhoneCandidates(rawPhone);
      const { data: existingProf } = await supabaseAdmin
        .from('profiles')
        .select('id, email, phone')
        .or(`email.eq.${email},phone.in.(${candidates.map((c) => `"${c}"`).join(',')})`)
        .limit(1)
        .maybeSingle();

      if (existingProf) {
        res.status(409).json({ error: 'এই নম্বরটি ইতিমধ্যে নিবন্ধিত। অনুগ্রহ করে লগইন করুন।' });
        return;
      }

      let uid: string | undefined;
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: displayName,
          phone: rawPhone,
          referral_code: referralCode,
        },
      });

      if (createErr) {
        const msg = createErr.message.toLowerCase();
        if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
          res.status(409).json({ error: 'এই নম্বরটি ইতিমধ্যে নিবন্ধিত। অনুগ্রহ করে লগইন করুন।' });
          return;
        }
        const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('register_phone_user', {
          p_phone: rawPhone,
          p_password: password,
          p_referral_code: referralCode,
        });
        if (rpcErr) {
          const rMsg = rpcErr.message.toLowerCase();
          if (rMsg.includes('already registered') || rMsg.includes('duplicate')) {
            res.status(409).json({ error: 'এই নম্বরটি ইতিমধ্যে নিবন্ধিত। অনুগ্রহ করে লগইন করুন।' });
            return;
          }
          res.status(400).json({ error: `${createErr.message} (${rpcErr.message})` });
          return;
        }
        uid =
          rpcData && typeof rpcData === 'object' && 'user_id' in rpcData
            ? String((rpcData as { user_id: string }).user_id)
            : undefined;
      } else {
        uid = created.user?.id;
      }

      if (uid) {
        const { data: profCheck } = await supabaseAdmin
          .from('profiles')
          .select('id, referred_by')
          .eq('id', uid)
          .maybeSingle();

        let referrerId: string | null = profCheck?.referred_by ?? null;
        if (!referrerId && referralCode) {
          const { data: refProf } = await supabaseAdmin
            .from('profiles')
            .select('id, referred_by')
            .ilike('referral_code', referralCode)
            .maybeSingle();
          referrerId = refProf?.id ?? null;
        }

        if (!profCheck) {
          const scaniaId = `SCN${Math.floor(100000 + Math.random() * 900000)}`;
          const refCode = `SCN${uid.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
          await supabaseAdmin.from('profiles').insert({
            id: uid,
            scania_id: scaniaId,
            email,
            full_name: displayName,
            phone: rawPhone,
            referral_code: refCode,
            referred_by: referrerId,
            demo_balance: 150,
            demo_bonus: 150,
          });
          await supabaseAdmin.from('user_roles').upsert({ user_id: uid, role: 'user' }, { onConflict: 'user_id' });
        } else if (referrerId && !profCheck.referred_by) {
          await supabaseAdmin.from('profiles').update({ referred_by: referrerId }).eq('id', uid);
        }

        if (referrerId && referrerId !== uid) {
          await supabaseAdmin.from('referral_records').upsert(
            {
              referrer_id: referrerId,
              referred_user_id: uid,
              level: 1,
              commission_rate: 25,
              simulated_commission: 0,
            },
            { onConflict: 'referrer_id,referred_user_id', ignoreDuplicates: true }
          );

          const { data: l1Prof } = await supabaseAdmin
            .from('profiles')
            .select('referred_by')
            .eq('id', referrerId)
            .maybeSingle();
          if (l1Prof?.referred_by && l1Prof.referred_by !== uid) {
            await supabaseAdmin.from('referral_records').upsert(
              {
                referrer_id: l1Prof.referred_by,
                referred_user_id: uid,
                level: 2,
                commission_rate: 2,
                simulated_commission: 0,
              },
              { onConflict: 'referrer_id,referred_user_id', ignoreDuplicates: true }
            );
            const { data: l2Prof } = await supabaseAdmin
              .from('profiles')
              .select('referred_by')
              .eq('id', l1Prof.referred_by)
              .maybeSingle();
            if (l2Prof?.referred_by && l2Prof.referred_by !== uid) {
              await supabaseAdmin.from('referral_records').upsert(
                {
                  referrer_id: l2Prof.referred_by,
                  referred_user_id: uid,
                  level: 3,
                  commission_rate: 1,
                  simulated_commission: 0,
                },
                { onConflict: 'referrer_id,referred_user_id', ignoreDuplicates: true }
              );
            }
          }
        }
      }

      broadcastRefresh('user_registered');
      res.json({ ok: true, mode: 'supabase', email });
      return;
    }

    if (supabasePublic) {
      const { data: rpcData, error: rpcErr } = await supabasePublic.rpc('register_phone_user', {
        p_phone: rawPhone,
        p_password: password,
        p_referral_code: referralCode,
      });

      if (!rpcErr && rpcData && typeof rpcData === 'object') {
        const rpcEmail = 'email' in rpcData && rpcData.email ? String(rpcData.email) : email;
        res.json({ ok: true, mode: 'supabase', email: rpcEmail });
        return;
      }

      if (rpcErr) {
        const msg = rpcErr.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('duplicate')) {
          res.status(409).json({ error: 'এই নম্বরটি ইতিমধ্যে নিবন্ধিত। অনুগ্রহ করে লগইন করুন।' });
          return;
        }
      }
    }

    const members = readServerMembers();
    const duplicate = members.find(
      (m) => m.canonical_digits === canonicalDigits || m.phone === rawPhone
    );
    if (duplicate) {
      res.status(409).json({ error: 'এই নম্বরটি ইতিমধ্যে নিবন্ধিত। অনুগ্রহ করে লগইন করুন।' });
      return;
    }

    const uid = crypto.randomUUID();
    const scaniaId = `SCN${Math.floor(100000 + Math.random() * 900000)}`;
    const ownRefCode = `SCN${uid.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
    const referrer = referralCode
      ? members.find((m) => m.referral_code.toUpperCase() === referralCode)
      : undefined;
    const { salt, hash } = hashPassword(password);
    const nowIso = new Date().toISOString();

    const newMember: ServerMemberRecord = {
      id: uid,
      scania_id: scaniaId,
      email,
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

    members.push(newMember);
    writeServerMembers(members);

    const store = readAppData();
    if (referrer) {
      store.referrals.push({
        id: crypto.randomUUID(),
        referrer_id: referrer.id,
        referred_user_id: newMember.id,
        level: 1,
        commission_rate: 25,
        simulated_commission: 0,
        created_at: nowIso,
      });

      const l2 = referrer.referred_by ? members.find((m) => m.id === referrer.referred_by) : undefined;
      if (l2) {
        store.referrals.push({
          id: crypto.randomUUID(),
          referrer_id: l2.id,
          referred_user_id: newMember.id,
          level: 2,
          commission_rate: 2,
          simulated_commission: 0,
          created_at: nowIso,
        });
        const l3 = l2.referred_by ? members.find((m) => m.id === l2.referred_by) : undefined;
        if (l3) {
          store.referrals.push({
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

    store.notifications.unshift({
      id: crypto.randomUUID(),
      user_id: newMember.id,
      title: 'SCANIA তে স্বাগতম! 150 টাকা বোনাস যুক্ত হয়েছে',
      message: 'নতুন অ্যাকাউন্ট খোলার জন্য 150 টাকা রেজিস্ট্রেশন বোনাস আপনার ব্যালেন্সে যোগ করা হয়েছে।',
      category: 'bonus',
      is_read: false,
      created_at: nowIso,
    });
    writeAppData(store);
    broadcastRefresh('user_registered');

    const token = signServerToken(newMember.id, 'user');
    res.json({
      ok: true,
      mode: 'server',
      token,
      profile: sanitizeMemberProfile(newMember),
    });
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const rawPhone = String(req.body?.phoneOrEmail || '').trim();
    const password = String(req.body?.password || '');
    if (!rawPhone || !password) {
      res.status(400).json({ error: 'মোবাইল নম্বর এবং পাসওয়ার্ড দিন।' });
      return;
    }

    if (!rawPhone.includes('@')) {
      const canonicalDigits = toCanonicalDigits(rawPhone);
      const rawDigits = normalizePhoneDigits(rawPhone);
      const members = readServerMembers();
      const member = members.find(
        (m) =>
          m.canonical_digits === canonicalDigits ||
          m.canonical_digits === rawDigits ||
          m.phone === rawPhone
      );

      if (member) {
        if (!member.is_active) {
          res.status(403).json({ error: 'অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে।' });
          return;
        }
        const valid = verifyPasswordHash(password, member.password_salt, member.password_hash);
        if (!valid) {
          res.status(401).json({ error: 'মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়।' });
          return;
        }
        const token = signServerToken(member.id);
        res.json({
          ok: true,
          mode: 'server',
          token,
          profile: sanitizeMemberProfile(member),
        });
        return;
      }
    }

    res.status(404).json({ ok: false, trySupabase: true });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Missing session token.' });
      return;
    }
    const uid = verifyServerToken(token);
    if (!uid) {
      res.status(401).json({ error: 'Invalid or expired session token.' });
      return;
    }
    const members = readServerMembers();
    const member = members.find((m) => m.id === uid);
    if (!member) {
      res.status(404).json({ error: 'Member not found.' });
      return;
    }
    res.json({ ok: true, profile: sanitizeMemberProfile(member) });
  });

  app.post('/api/auth/prepare-login', async (req: Request, res: Response) => {
    if (!supabaseAdmin) {
      res.status(503).json({ error: 'Server authentication service is unavailable.' });
      return;
    }

    const rawInput = String(req.body?.phoneOrEmail || '').trim();
    if (!rawInput) {
      res.status(400).json({ error: 'Phone number is required.' });
      return;
    }

    if (rawInput.includes('@')) {
      res.json({ email: rawInput });
      return;
    }

    const digits = normalizePhoneDigits(rawInput);
    const canonicalDigits = toCanonicalDigits(rawInput);
    const defaultEmail = `u${canonicalDigits}@scania-member.com`;
    const altEmail = `u${digits}@scania-member.com`;

    const candidates = buildPhoneCandidates(rawInput);
    const { data: matchedProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .or(
        `email.in.("${defaultEmail}","${altEmail}"),phone.in.(${candidates.map((c) => `"${c}"`).join(',')})`
      )
      .limit(1)
      .maybeSingle();

    let resolvedId = matchedProfile?.id || '';
    let resolvedEmail = matchedProfile?.email || defaultEmail;

    if (!resolvedId) {
      const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = usersList?.users?.find(
        (u) => u.email === defaultEmail || u.email === altEmail
      );
      if (found) {
        resolvedId = found.id;
        resolvedEmail = found.email || defaultEmail;
      }
    }

    if (resolvedId && resolvedEmail.endsWith('@scania-member.com')) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(resolvedId);
      if (authUser?.user && !authUser.user.email_confirmed_at) {
        await supabaseAdmin.auth.admin.updateUserById(resolvedId, { email_confirm: true });
      }
    }

    res.json({ email: resolvedEmail });
  });

  // =========================================================================
  // USER SERVER-VALIDATED ENDPOINTS (Supports both Server Auth & Supabase Auth)
  // =========================================================================

  app.get('/api/user/state', requireUserSession, async (req: AuthedRequest, res: Response) => {
    const uid = req.userId!;
    const store = readAppData();

    if (req.authMode === 'supabase' && supabaseAdmin && isUuid(uid)) {
      const [profRes, txRes, prodRes, notifRes, refRes] = await Promise.all([
        supabaseAdmin.from('profiles').select('*').eq('id', uid).maybeSingle(),
        supabaseAdmin
          .from('demo_transactions')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('demo_user_products')
          .select('*')
          .eq('user_id', uid)
          .order('started_at', { ascending: false }),
        supabaseAdmin
          .from('notifications')
          .select('*')
          .or(`user_id.eq.${uid},user_id.is.null`)
          .order('created_at', { ascending: false })
          .limit(50),
        supabaseAdmin
          .from('referral_records')
          .select('*')
          .eq('referrer_id', uid)
          .order('created_at', { ascending: false }),
      ]);

      if (!profRes.error && !isMissingTableError(txRes.error)) {
        const refIds = Array.from(
          new Set((refRes.data || []).map((r: any) => r.referred_user_id).filter(Boolean))
        );
        let refMap = new Map<string, any>();
        if (refIds.length > 0) {
          const { data: refProfs } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, scania_id, email, tier, created_at')
            .in('id', refIds);
          refMap = new Map((refProfs || []).map((p: any) => [p.id, p]));
        }

        res.json({
          ok: true,
          profile: profRes.data || null,
          bankCard: store.bankCards[uid] || null,
          transactions: txRes.data || [],
          userProducts: prodRes.data || [],
          notifications: notifRes.data || [],
          referrals: (refRes.data || []).map((r: any) => ({
            ...r,
            referred: refMap.get(r.referred_user_id) || undefined,
          })),
        });
        return;
      }
    }

    const members = readServerMembers();
    const member = members.find((m) => m.id === uid);
    const memberMap = new Map(members.map((m) => [m.id, m]));

    const transactions = store.transactions
      .filter((t) => t.user_id === uid)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const userProducts = store.userProducts
      .filter((p) => p.user_id === uid)
      .sort((a, b) => b.started_at.localeCompare(a.started_at));
    const notifications = store.notifications
      .filter((n) => n.user_id === uid || n.user_id === null)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const referrals = store.referrals
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
      });

    res.json({
      ok: true,
      profile: member ? sanitizeMemberProfile(member) : null,
      bankCard: store.bankCards[uid] || null,
      transactions,
      userProducts,
      notifications,
      referrals,
    });
  });

  app.post('/api/user/bank-card', requireUserSession, (req: AuthedRequest, res: Response) => {
    const uid = req.userId!;
    const walletMethod = req.body?.wallet_method === 'Nagad' ? 'Nagad' : req.body?.wallet_method === 'Bkash' ? 'Bkash' : null;
    const walletNumber = String(req.body?.wallet_number || '').trim();
    const accountName = String(req.body?.account_name || '').trim();

    if (!walletMethod) {
      res.status(400).json({ error: 'অনুগ্রহ করে Bkash অথবা Nagad নির্বাচন করুন।' });
      return;
    }
    if (normalizePhoneDigits(walletNumber).length < 7) {
      res.status(400).json({ error: 'সঠিক ওয়ালেট নাম্বার দিন।' });
      return;
    }
    if (accountName.length < 2) {
      res.status(400).json({ error: 'আপনার নাম সঠিকভাবে লিখুন।' });
      return;
    }

    const store = readAppData();
    const card: ServerBankCard = {
      wallet_method: walletMethod,
      wallet_number: walletNumber.slice(0, 30),
      account_name: accountName.slice(0, 80),
      updated_at: new Date().toISOString(),
    };
    store.bankCards[uid] = card;
    writeAppData(store);
    broadcastRefresh('bank_card_updated');

    res.json({ ok: true, bankCard: card });
  });

  app.post('/api/user/notification-read', requireUserSession, async (req: AuthedRequest, res: Response) => {
    const uid = req.userId!;
    const notificationId = String(req.body?.notificationId || '');
    if (!notificationId) {
      res.status(400).json({ error: 'notificationId required' });
      return;
    }

    if (req.authMode === 'supabase' && supabaseAdmin && isUuid(notificationId) && isUuid(uid)) {
      await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', uid);
      await supabaseAdmin
        .from('notification_reads')
        .upsert({ notification_id: notificationId, user_id: uid }, { onConflict: 'notification_id,user_id' });
    }

    const store = readAppData();
    let changed = false;
    store.notifications = store.notifications.map((n) => {
      if (n.id === notificationId && (n.user_id === uid || n.user_id === null)) {
        changed = true;
        return { ...n, is_read: true };
      }
      return n;
    });
    if (changed) writeAppData(store);
    res.json({ ok: true });
  });

  app.post('/api/user/change-password', requireUserSession, async (req: AuthedRequest, res: Response) => {
    const uid = req.userId!;
    const newPassword = String(req.body?.newPassword || '');
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'পাসওয়ার্ড কমপক্ষে 6 অক্ষরের হতে হবে।' });
      return;
    }

    if (req.authMode === 'server') {
      const members = readServerMembers();
      const idx = members.findIndex((m) => m.id === uid);
      if (idx === -1) {
        res.status(404).json({ error: 'সদস্য পাওয়া যায়নি।' });
        return;
      }
      const { salt, hash } = hashPassword(newPassword);
      members[idx].password_salt = salt;
      members[idx].password_hash = hash;
      members[idx].updated_at = new Date().toISOString();
      writeServerMembers(members);
      res.json({ ok: true });
      return;
    }

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(uid, { password: newPassword });
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.json({ ok: true });
      return;
    }

    res.status(503).json({ error: 'Password service unavailable.' });
  });

  app.post('/api/user/request-transaction', requireUserSession, async (req: AuthedRequest, res: Response) => {
    const uid = req.userId!;
    const { type, amount, method, reference_code } = req.body || {};

    if (!['deposit_demo', 'withdraw_demo'].includes(type)) {
      res.status(400).json({ error: 'অবৈধ লেনদেনের ধরন।' });
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 1000000) {
      res.status(400).json({ error: 'সঠিক পরিমাণ লিখুন (1 থেকে 1,000,000 টাকা)।' });
      return;
    }

    if (type === 'deposit_demo' && parsedAmount < 500) {
      res.status(400).json({ error: 'সর্বনিম্ন রিচার্জ 500 টাকা।' });
      return;
    }

    if (type === 'deposit_demo') {
      const cleanTrx = String(reference_code || '').trim();
      if (cleanTrx.length < 4) {
        res.status(400).json({ error: 'অনুগ্রহ করে সঠিক লেনদেন আইডি (TrxID) লিখুন।' });
        return;
      }
    }

    if (type === 'withdraw_demo' && parsedAmount < 150) {
      res.status(400).json({ error: 'সর্বনিম্ন উত্তোলন 150 টাকা।' });
      return;
    }

    const store = readAppData();

    // Withdrawal strict checks: Bank Card + at least 1 purchased plan
    if (type === 'withdraw_demo') {
      const card = store.bankCards[uid];
      if (!card) {
        res.status(400).json({ error: 'ব্যাংক কার্ড সেটআপ না থাকলে উত্তোলন করা যাবে না।' });
        return;
      }

      let hasPurchasedPlan = store.userProducts.some((p) => p.user_id === uid);
      if (!hasPurchasedPlan && req.authMode === 'supabase' && supabaseAdmin) {
        const { count } = await supabaseAdmin
          .from('demo_user_products')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', uid);
        hasPurchasedPlan = Boolean(count && count > 0);
      }

      if (!hasPurchasedPlan) {
        res.status(400).json({ error: 'ডিপোজিট করার পরে কমপক্ষে 1 টি প্ল্যান না কিনলে উত্তোলন করা যাবে না।' });
        return;
      }
    }

    const nowIso = new Date().toISOString();

    // Server-mode authenticated member handling
    if (req.authMode === 'server') {
      const members = readServerMembers();
      const idx = members.findIndex((m) => m.id === uid);
      if (idx === -1 || !members[idx].is_active) {
        res.status(403).json({ error: 'অ্যাকাউন্ট সক্রিয় নয় বা পাওয়া যায়নি।' });
        return;
      }

      const member = members[idx];
      if (type === 'withdraw_demo') {
        if (Number(member.demo_balance) < parsedAmount) {
          res.status(400).json({ error: 'আপনার ব্যালেন্স পর্যাপ্ত নয়।' });
          return;
        }
        member.demo_balance = Number((Number(member.demo_balance) - parsedAmount).toFixed(2));
        member.updated_at = nowIso;
        members[idx] = member;
        writeServerMembers(members);
      }

      const bankCard = store.bankCards[uid];
      let txMethod = String(method || 'bKash').slice(0, 60);
      let txNote = 'পর্যালোচনায় রয়েছে';
      let txRef = String(reference_code || '').trim().slice(0, 80);

      if (type === 'deposit_demo') {
        txNote = `TrxID: ${txRef} · পর্যালোচনায় রয়েছে`;
      } else {
        const fee = Number((parsedAmount * 0.05).toFixed(2));
        const net = Number((parsedAmount - fee).toFixed(2));
        txMethod = bankCard ? `${bankCard.wallet_method} (${bankCard.wallet_number})` : txMethod;
        txRef = bankCard ? bankCard.account_name : txRef;
        txNote = `5% চার্জ: ৳${fee} · প্রাপ্তি: ৳${net}`;
      }

      const newTx: ServerTransaction = {
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
      store.transactions.unshift(newTx);

      const notifTitle =
        type === 'deposit_demo' ? 'আপনার পেমেন্টটি পর্যালোচনায় রয়েছে' : 'আপনার উত্তোলন আবেদন পর্যালোচনায় রয়েছে';
      const notifMessage =
        type === 'deposit_demo'
          ? `আপনার পেমেন্টটি পর্যালোচনায় রয়েছে (${parsedAmount} টাকা · ${txMethod} · TrxID: ${txRef})।`
          : `আপনার উত্তোলন আবেদন পর্যালোচনায় রয়েছে (${parsedAmount} টাকা ব্যালেন্স থেকে কাটা হয়েছে · 5% চার্জ বাদে প্রাপ্তি ${(parsedAmount * 0.95).toFixed(2)} টাকা)।`;

      store.notifications.unshift({
        id: crypto.randomUUID(),
        user_id: uid,
        title: notifTitle,
        message: notifMessage,
        category: 'transaction',
        is_read: false,
        created_at: nowIso,
      });

      writeAppData(store);
      broadcastRefresh(type);

      res.json({
        ok: true,
        transaction: newTx,
        profile: sanitizeMemberProfile(member),
        notificationTitle: notifTitle,
      });
      return;
    }

    // Supabase authenticated user handling
    if (!supabaseAdmin) {
      res.status(503).json({ error: 'Server database client unavailable.' });
      return;
    }

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('id, demo_balance, is_active')
      .eq('id', uid)
      .single();

    if (profErr || !profile || !profile.is_active) {
      res.status(403).json({ error: 'অ্যাকাউন্ট সক্রিয় নয় বা পাওয়া যায়নি।' });
      return;
    }

    const currentBal = Number(profile.demo_balance || 0);
    if (type === 'withdraw_demo') {
      if (currentBal < parsedAmount) {
        res.status(400).json({ error: 'আপনার ব্যালেন্স পর্যাপ্ত নয়।' });
        return;
      }
      const nextBal = Number((currentBal - parsedAmount).toFixed(2));
      const { error: deductErr } = await supabaseAdmin
        .from('profiles')
        .update({ demo_balance: nextBal, updated_at: nowIso })
        .eq('id', uid);
      if (deductErr) {
        res.status(400).json({ error: deductErr.message });
        return;
      }
    }

    const bankCard = store.bankCards[uid];
    const fee = type === 'withdraw_demo' ? Number((parsedAmount * 0.05).toFixed(2)) : 0;
    const net = Number((parsedAmount - fee).toFixed(2));
    const txMethod =
      type === 'withdraw_demo' && bankCard
        ? `${bankCard.wallet_method} (${bankCard.wallet_number})`
        : String(method || 'bKash').slice(0, 60);
    const txNote =
      type === 'deposit_demo'
        ? 'আপনার পেমেন্টটি পর্যালোচনায় রয়েছে'
        : `5% চার্জ: ৳${fee} · প্রাপ্তি: ৳${net}`;

    const { data, error } = await supabaseAdmin
      .from('demo_transactions')
      .insert({
        user_id: uid,
        type,
        amount: Number(parsedAmount.toFixed(2)),
        method: txMethod,
        reference_code: String(reference_code || (bankCard?.account_name || '')).slice(0, 80),
        status: 'pending',
        admin_note: txNote,
      })
      .select()
      .single();

    if (error) {
      if (type === 'withdraw_demo') {
        await supabaseAdmin
          .from('profiles')
          .update({ demo_balance: currentBal, updated_at: new Date().toISOString() })
          .eq('id', uid);
      }
      res.status(400).json({ error: error.message });
      return;
    }

    const notifTitle =
      type === 'deposit_demo' ? 'আপনার পেমেন্টটি পর্যালোচনায় রয়েছে' : 'আপনার উত্তোলন আবেদন পর্যালোচনায় রয়েছে';
    await supabaseAdmin.from('notifications').insert({
      user_id: uid,
      title: notifTitle,
      message:
        type === 'deposit_demo'
          ? `আপনার পেমেন্টটি পর্যালোচনায় রয়েছে (${parsedAmount} টাকা)।`
          : `আপনার উত্তোলন আবেদন পর্যালোচনায় রয়েছে (${parsedAmount} টাকা ব্যালেন্স থেকে কাটা হয়েছে · 5% চার্জ: ${fee} টাকা)।`,
      category: 'transaction',
    });

    broadcastRefresh(type);
    res.json({ transaction: data, notificationTitle: notifTitle });
  });

  app.post('/api/user/redeem-bonus', requireUserSession, async (req: AuthedRequest, res: Response) => {
    const uid = req.userId!;
    const code = String(req.body?.code || '').trim().toUpperCase();
    if (!code) {
      res.status(400).json({ error: 'বোনাস কোড লিখুন।' });
      return;
    }

    if (req.authMode === 'server') {
      const store = readAppData();
      const bonusEntry = store.bonusCodes.find((b) => b.code.toUpperCase() === code && b.is_active);
      if (!bonusEntry) {
        res.status(404).json({ error: 'বোনাস কোড পাওয়া যায়নি বা নিষ্ক্রিয়।' });
        return;
      }
      if (bonusEntry.used_count >= bonusEntry.usage_limit) {
        res.status(400).json({ error: 'বোনাস কোডের ব্যবহার সীমা শেষ।' });
        return;
      }
      if (store.bonusRedemptions.some((r) => r.code === code && r.user_id === uid)) {
        res.status(409).json({ error: 'আপনি ইতিমধ্যে এই বোনাস কোড ব্যবহার করেছেন।' });
        return;
      }
      const members = readServerMembers();
      const idx = members.findIndex((m) => m.id === uid);
      if (idx === -1) {
        res.status(404).json({ error: 'সদস্য পাওয়া যায়নি।' });
        return;
      }
      const amount = Number(bonusEntry.bonus_amount);
      const nowIso = new Date().toISOString();
      members[idx].demo_balance = Number((Number(members[idx].demo_balance) + amount).toFixed(2));
      members[idx].demo_bonus = Number((Number(members[idx].demo_bonus) + amount).toFixed(2));
      members[idx].updated_at = nowIso;
      writeServerMembers(members);

      bonusEntry.used_count += 1;
      store.bonusRedemptions.push({ code, user_id: uid, amount, created_at: nowIso });
      store.transactions.unshift({
        id: crypto.randomUUID(),
        user_id: uid,
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
      writeAppData(store);
      broadcastRefresh('bonus_redeem');
      res.json({ success: true, amount });
      return;
    }

    if (!supabaseAdmin) {
      res.status(503).json({ error: 'Server database client unavailable.' });
      return;
    }

    const { data: bonus, error: bonusErr } = await supabaseAdmin
      .from('bonus_codes')
      .select('*')
      .ilike('code', code)
      .eq('is_active', true)
      .maybeSingle();

    if (bonusErr || !bonus) {
      res.status(404).json({ error: 'বোনাস কোড পাওয়া যায়নি বা নিষ্ক্রিয়।' });
      return;
    }
    if (bonus.expires_at && new Date(bonus.expires_at) < new Date()) {
      res.status(400).json({ error: 'বোনাস কোডের মেয়াদ শেষ হয়েছে।' });
      return;
    }
    if (bonus.used_count >= bonus.usage_limit) {
      res.status(400).json({ error: 'বোনাস কোডের ব্যবহার সীমা শেষ।' });
      return;
    }

    const { data: existingClaim } = await supabaseAdmin
      .from('bonus_redemptions')
      .select('id')
      .eq('bonus_code_id', bonus.id)
      .eq('user_id', uid)
      .maybeSingle();

    if (existingClaim) {
      res.status(409).json({ error: 'আপনি ইতিমধ্যে এই বোনাস কোড ব্যবহার করেছেন।' });
      return;
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('demo_balance, demo_bonus')
      .eq('id', uid)
      .single();

    if (!profile) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    const amount = Number(bonus.bonus_amount);
    const { error: claimErr } = await supabaseAdmin.from('bonus_redemptions').insert({
      bonus_code_id: bonus.id,
      user_id: uid,
      amount,
    });
    if (claimErr) {
      res.status(400).json({ error: 'বোনাস কোড সংগ্রহ করা যায়নি।' });
      return;
    }

    await supabaseAdmin
      .from('bonus_codes')
      .update({ used_count: bonus.used_count + 1 })
      .eq('id', bonus.id);

    await supabaseAdmin
      .from('profiles')
      .update({
        demo_balance: Number(profile.demo_balance) + amount,
        demo_bonus: Number(profile.demo_bonus) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', uid);

    await supabaseAdmin.from('demo_transactions').insert({
      user_id: uid,
      type: 'bonus_code',
      amount,
      method: 'Bonus Code',
      reference_code: bonus.code,
      status: 'completed',
      admin_note: 'বোনাস ক্রেডিট হয়েছে',
    });

    broadcastRefresh('bonus_redeem');
    res.json({ success: true, amount });
  });

  app.post('/api/user/purchase-plan', requireUserSession, async (req: AuthedRequest, res: Response) => {
    const uid = req.userId!;
    const planId = String(req.body?.planId || '');
    if (!planId) {
      res.status(400).json({ error: 'প্ল্যান নির্বাচন করুন।' });
      return;
    }

    if (req.authMode === 'server') {
      const store = readAppData();
      const catalog = store.plans && store.plans.length > 0 ? store.plans : DEFAULT_SERVER_PLANS;
      const plan = catalog.find((p) => p.id === planId && p.is_active);
      if (!plan) {
        res.status(404).json({ error: 'প্ল্যানটি পাওয়া যায়নি।' });
        return;
      }

      const members = readServerMembers();
      const idx = members.findIndex((m) => m.id === uid);
      if (idx === -1 || !members[idx].is_active) {
        res.status(403).json({ error: 'অ্যাকাউন্ট সক্রিয় নয়।' });
        return;
      }

      const price = Number(plan.demo_price);
      if (Number(members[idx].demo_balance) < price) {
        res.status(400).json({ error: 'পর্যাপ্ত ব্যালেন্স নেই। অনুগ্রহ করে রিচার্জ করুন।' });
        return;
      }

      const nowIso = new Date().toISOString();
      const expiresAt = new Date(Date.now() + Number(plan.validity_days) * 86400000).toISOString();

      members[idx].demo_balance = Number((Number(members[idx].demo_balance) - price).toFixed(2));
      members[idx].updated_at = nowIso;
      writeServerMembers(members);

      const newProd: ServerUserProduct = {
        id: crypto.randomUUID(),
        user_id: uid,
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
      store.userProducts.unshift(newProd);

      store.transactions.unshift({
        id: crypto.randomUUID(),
        user_id: uid,
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

      writeAppData(store);
      broadcastRefresh('plan_purchased');
      res.json({ success: true, product: newProd, profile: sanitizeMemberProfile(members[idx]) });
      return;
    }

    if (!supabaseAdmin) {
      res.status(503).json({ error: 'Server database client unavailable.' });
      return;
    }

    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .maybeSingle();

    if (!plan) {
      res.status(404).json({ error: 'প্ল্যানটি পাওয়া যায়নি।' });
      return;
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();

    if (!profile || !profile.is_active) {
      res.status(403).json({ error: 'অ্যাকাউন্ট সক্রিয় নয়।' });
      return;
    }

    const price = Number(plan.demo_price);
    if (Number(profile.demo_balance) < price) {
      res.status(400).json({ error: 'পর্যাপ্ত ব্যালেন্স নেই। অনুগ্রহ করে রিচার্জ করুন।' });
      return;
    }

    await supabaseAdmin
      .from('profiles')
      .update({
        demo_balance: Number(profile.demo_balance) - price,
        updated_at: new Date().toISOString(),
      })
      .eq('id', uid);

    const expiresAt = new Date(Date.now() + Number(plan.validity_days) * 86400000).toISOString();
    const { data: product, error: prodErr } = await supabaseAdmin
      .from('demo_user_products')
      .insert({
        user_id: uid,
        plan_id: plan.id,
        plan_title: plan.title,
        demo_price: price,
        daily_income: Number(plan.daily_income),
        validity_days: Number(plan.validity_days),
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (prodErr) {
      res.status(400).json({ error: prodErr.message });
      return;
    }

    await supabaseAdmin.from('demo_transactions').insert({
      user_id: uid,
      type: 'plan_purchase',
      amount: price,
      method: 'ওয়ালেট',
      reference_code: plan.title,
      status: 'completed',
      admin_note: `${plan.title} সক্রিয় হয়েছে`,
    });

    const { data: refs } = await supabaseAdmin
      .from('referral_records')
      .select('*')
      .eq('referred_user_id', uid);

    if (refs && refs.length > 0) {
      for (const ref of refs) {
        if (ref.level === 1) continue; // Level 1 (25%) is credited upon deposit confirmation
        const comm = Number(((price * Number(ref.commission_rate)) / 100).toFixed(2));
        if (comm <= 0) continue;
        await supabaseAdmin
          .from('referral_records')
          .update({ simulated_commission: Number(ref.simulated_commission) + comm })
          .eq('id', ref.id);

        const { data: refProf } = await supabaseAdmin
          .from('profiles')
          .select('demo_balance')
          .eq('id', ref.referrer_id)
          .single();

        if (refProf) {
          await supabaseAdmin
            .from('profiles')
            .update({ demo_balance: Number(refProf.demo_balance) + comm })
            .eq('id', ref.referrer_id);
        }

        await supabaseAdmin.from('demo_transactions').insert({
          user_id: ref.referrer_id,
          type: 'referral_commission',
          amount: comm,
          method: `লেভেল ${ref.level} রেফারেল`,
          reference_code: profile.scania_id,
          status: 'completed',
          admin_note: 'টিম কমিশন যুক্ত হয়েছে',
        });
      }
    }

    broadcastRefresh('plan_purchased');
    res.json({ success: true, product });
  });

  // =========================================================================
  // ADMIN SERVER-VALIDATED ENDPOINTS + LIVE SYNC
  // =========================================================================

  app.post('/api/admin/login', async (req: Request, res: Response) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const expectedEmail = (process.env.ADMIN_EMAIL || 'admin@scania.com').trim().toLowerCase();
    const expectedPass = process.env.ADMIN_PASSWORD || 'admin123456';

    if (email === expectedEmail && password === expectedPass) {
      const adminToken = signServerToken('server-admin-1', 'super_admin');
      res.json({
        ok: true,
        mode: supabaseAdmin ? 'hybrid' : 'server',
        token: adminToken,
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
      return;
    }

    if (supabasePublic && supabaseAdmin) {
      const { data: authData, error: authErr } = await supabasePublic.auth.signInWithPassword({
        email,
        password,
      });
      if (!authErr && authData.user && authData.session) {
        const { data: roleRow } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', authData.user.id)
          .maybeSingle();

        if (roleRow && ['admin', 'super_admin'].includes(roleRow.role)) {
          const { data: prof } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();

          res.json({
            ok: true,
            mode: 'supabase',
            token: authData.session.access_token,
            profile: prof || {
              id: authData.user.id,
              scania_id: 'ADMIN01',
              email,
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
            role: roleRow.role,
          });
          return;
        }
      }
    }

    res.status(401).json({ error: 'Invalid admin credentials.' });
  });

  app.get('/api/admin/state', requireAdmin, async (req: AuthedRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const store = readAppData();
    const members = readServerMembers();

    if (supabaseAdmin) {
      try {
        const [
          profRes,
          txRes,
          prodRes,
          refRes,
          bonusRes,
          annRes,
          plansRes,
          bannersRes,
          settingsRes,
          notifRes,
          ticketsRes,
          logsRes,
        ] = await Promise.all([
          supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }),
          supabaseAdmin.from('demo_transactions').select('*').order('created_at', { ascending: false }),
          supabaseAdmin.from('demo_user_products').select('*').order('started_at', { ascending: false }),
          supabaseAdmin.from('referral_records').select('*').order('created_at', { ascending: false }),
          supabaseAdmin.from('bonus_codes').select('*').order('created_at', { ascending: false }),
          supabaseAdmin.from('announcements').select('*').order('created_at', { ascending: false }),
          supabaseAdmin
            .from('plans')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false }),
          supabaseAdmin
            .from('banners')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false }),
          supabaseAdmin.from('site_settings').select('*').eq('id', 1).maybeSingle(),
          supabaseAdmin.from('notifications').select('*').order('created_at', { ascending: false }),
          supabaseAdmin.from('support_tickets').select('*').order('updated_at', { ascending: false }),
          supabaseAdmin.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
        ]);

        const missingSchema =
          isMissingTableError(profRes.error) ||
          isMissingTableError(txRes.error) ||
          isMissingTableError(plansRes.error);

        if (!missingSchema && !profRes.error) {
          const sbProfiles = (profRes.data || []) as Record<string, unknown>[];
          const profileMap = new Map(sbProfiles.map((p) => [String(p.id), p]));

          const sbTransactions = (txRes.data || []).map((t: Record<string, unknown>) => {
            const p = profileMap.get(String(t.user_id));
            return {
              ...t,
              profiles: p
                ? { full_name: p.full_name, scania_id: p.scania_id, email: p.email }
                : undefined,
            };
          });

          const sbReferrals = (refRes.data || []).map((r: Record<string, unknown>) => {
            const referred = profileMap.get(String(r.referred_user_id));
            const referrer = profileMap.get(String(r.referrer_id));
            return {
              ...r,
              referred: referred
                ? {
                    id: referred.id,
                    full_name: referred.full_name,
                    scania_id: referred.scania_id,
                    email: referred.email,
                    tier: referred.tier,
                    created_at: referred.created_at,
                  }
                : undefined,
              referrer: referrer
                ? {
                    id: referrer.id,
                    full_name: referrer.full_name,
                    scania_id: referrer.scania_id,
                  }
                : undefined,
            };
          });

          const sbTickets = (ticketsRes.data || []).map((tk: Record<string, unknown>) => {
            const p = profileMap.get(String(tk.user_id));
            return {
              ...tk,
              profiles: p
                ? { full_name: p.full_name, scania_id: p.scania_id, email: p.email }
                : undefined,
            };
          });

          res.json({
            ok: true,
            mode: 'supabase',
            schemaReady: true,
            profiles: sbProfiles,
            transactions: sbTransactions,
            referrals: sbReferrals,
            userProducts: prodRes.data || [],
            bankCards: store.bankCards,
            bonusCodes: bonusRes.data || [],
            announcements: annRes.data || store.announcements,
            plans: plansRes.data && plansRes.data.length > 0 ? plansRes.data : store.plans || DEFAULT_SERVER_PLANS,
            banners: bannersRes.data || store.banners,
            siteSettings: settingsRes.data || store.siteSettings,
            notifications: notifRes.data || [],
            supportTickets: sbTickets,
            auditLogs: logsRes.data || [],
          });
          return;
        }
      } catch {
        // Fall through to local store fallback
      }
    }

    const memberMap = new Map(members.map((m) => [m.id, m]));

    const profiles = members
      .map(sanitizeMemberProfile)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const transactions = store.transactions
      .map((t) => {
        const m = memberMap.get(t.user_id);
        return {
          ...t,
          profiles: m
            ? { full_name: m.full_name, scania_id: m.scania_id, email: m.email }
            : undefined,
        };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const referrals = store.referrals
      .map((r) => {
        const referred = memberMap.get(r.referred_user_id);
        const referrer = memberMap.get(r.referrer_id);
        return {
          ...r,
          referred: referred
            ? {
                id: referred.id,
                full_name: referred.full_name,
                scania_id: referred.scania_id,
                email: referred.email,
                tier: referred.tier,
                created_at: referred.created_at,
              }
            : undefined,
          referrer: referrer
            ? {
                id: referrer.id,
                full_name: referrer.full_name,
                scania_id: referrer.scania_id,
              }
            : undefined,
        };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    res.json({
      ok: true,
      mode: req.authMode || 'server',
      schemaReady: false,
      profiles,
      transactions,
      referrals,
      userProducts: store.userProducts,
      bankCards: store.bankCards,
      bonusCodes: store.bonusCodes,
      announcements: store.announcements,
      plans: store.plans || DEFAULT_SERVER_PLANS,
      banners: store.banners,
      siteSettings: store.siteSettings,
      notifications: store.notifications,
    });
  });

  // Sync admin site settings update immediately to Supabase + server store + broadcast SSE to all User clients
  app.post('/api/admin/site-settings', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const body = req.body || {};
    const store = readAppData();
    const prev = store.siteSettings;
    const updated: ServerSiteSettings = {
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
      show_team_tab:
        typeof body.show_team_tab === 'boolean' ? body.show_team_tab : (prev?.show_team_tab ?? true),
      show_bonus_button:
        typeof body.show_bonus_button === 'boolean' ? body.show_bonus_button : (prev?.show_bonus_button ?? true),
      footer_text: String(body.footer_text ?? prev?.footer_text ?? '© 2026 SCANIA ইনভেস্টমেন্ট প্ল্যাটফর্ম। সর্বস্বত্ব সংরক্ষিত।').slice(0, 240),
      about_text: String(body.about_text ?? prev?.about_text ?? DEFAULT_ABOUT_TEXT).slice(0, 2000),
      updated_at: new Date().toISOString(),
    };
    store.siteSettings = updated;
    writeAppData(store);

    if (supabaseAdmin) {
      await supabaseAdmin.from('site_settings').upsert(updated, { onConflict: 'id' });
    }

    broadcastRefresh('site_settings_updated');
    res.json({ ok: true, siteSettings: updated });
  });

  app.post('/api/admin/broadcast-refresh', (_req: Request, res: Response) => {
    broadcastRefresh('admin_update');
    res.json({ ok: true });
  });

  // =========================================================================
  // ADMIN A-TO-Z SERVER CRUD ENDPOINTS (Plans, Bonus Codes, Announcements, Notifications, Banners)
  // =========================================================================

  app.post('/api/admin/plans', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const body = req.body || {};
    const store = readAppData();
    const list = store.plans && store.plans.length > 0 ? [...store.plans] : [...DEFAULT_SERVER_PLANS];
    const nowIso = new Date().toISOString();
    const newPlan: ServerPlan = {
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

    if (supabaseAdmin) {
      const { id: _id, ...insertPayload } = newPlan;
      const { data: sbPlan, error: sbErr } = await supabaseAdmin
        .from('plans')
        .insert(insertPayload)
        .select()
        .single();
      if (!sbErr && sbPlan) {
        broadcastRefresh('plan_created');
        res.json({ ok: true, plan: sbPlan });
        return;
      }
    }

    list.push(newPlan);
    store.plans = list;
    writeAppData(store);
    broadcastRefresh('plan_created');
    res.json({ ok: true, plan: newPlan });
  });

  app.put('/api/admin/plans/:id', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const planId = req.params.id;
    const body = req.body || {};

    if (supabaseAdmin && isUuid(planId)) {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.title !== undefined) patch.title = String(body.title).trim().slice(0, 100);
      if (body.subtitle !== undefined) patch.subtitle = String(body.subtitle).trim().slice(0, 100);
      if (body.description !== undefined) patch.description = String(body.description).trim().slice(0, 500);
      if (body.image_url !== undefined) patch.image_url = String(body.image_url).trim().slice(0, 500);
      if (body.demo_price !== undefined) patch.demo_price = Number(body.demo_price);
      if (body.daily_income !== undefined) patch.daily_income = Number(body.daily_income);
      if (body.validity_days !== undefined) patch.validity_days = Number(body.validity_days);
      if (body.total_return !== undefined) patch.total_return = body.total_return ? Number(body.total_return) : null;
      if (body.badge !== undefined) patch.badge = String(body.badge).trim().slice(0, 30);
      if (typeof body.is_active === 'boolean') patch.is_active = body.is_active;
      if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order);

      const { data: sbPlan, error: sbErr } = await supabaseAdmin
        .from('plans')
        .update(patch)
        .eq('id', planId)
        .select()
        .maybeSingle();
      if (!sbErr && sbPlan) {
        broadcastRefresh('plan_updated');
        res.json({ ok: true, plan: sbPlan });
        return;
      }
    }

    const store = readAppData();
    const list = store.plans && store.plans.length > 0 ? [...store.plans] : [...DEFAULT_SERVER_PLANS];
    const idx = list.findIndex((p) => p.id === planId);
    if (idx === -1) {
      res.status(404).json({ error: 'Plan not found.' });
      return;
    }
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
    store.plans = list;
    writeAppData(store);
    broadcastRefresh('plan_updated');
    res.json({ ok: true, plan: list[idx] });
  });

  app.delete('/api/admin/plans/:id', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const planId = req.params.id;
    if (supabaseAdmin && isUuid(planId)) {
      await supabaseAdmin.from('plans').delete().eq('id', planId);
    }
    const store = readAppData();
    const list = store.plans && store.plans.length > 0 ? [...store.plans] : [...DEFAULT_SERVER_PLANS];
    store.plans = list.filter((p) => p.id !== planId);
    writeAppData(store);
    broadcastRefresh('plan_deleted');
    res.json({ ok: true });
  });

  app.post('/api/admin/bonus-codes', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const body = req.body || {};
    const store = readAppData();
    const code = String(body.code || '').trim().toUpperCase();
    if (!code) {
      res.status(400).json({ error: 'Bonus code is required.' });
      return;
    }
    const created: ServerBonusCode = {
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

    if (supabaseAdmin) {
      const { id: _id, ...insertPayload } = created;
      const { data: sbBonus, error: sbErr } = await supabaseAdmin
        .from('bonus_codes')
        .insert(insertPayload)
        .select()
        .single();
      if (!sbErr && sbBonus) {
        broadcastRefresh('bonus_code_created');
        res.json({ ok: true, bonusCode: sbBonus });
        return;
      }
    }

    store.bonusCodes.unshift(created);
    writeAppData(store);
    broadcastRefresh('bonus_code_created');
    res.json({ ok: true, bonusCode: created });
  });

  app.put('/api/admin/bonus-codes/:id', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const id = req.params.id;
    const body = req.body || {};

    if (supabaseAdmin && isUuid(id)) {
      const patch: Record<string, unknown> = {};
      if (body.code !== undefined) patch.code = String(body.code).trim().toUpperCase();
      if (body.description !== undefined) patch.description = String(body.description).trim();
      if (body.bonus_amount !== undefined) patch.bonus_amount = Number(body.bonus_amount);
      if (body.usage_limit !== undefined) patch.usage_limit = Number(body.usage_limit);
      if (typeof body.is_active === 'boolean') patch.is_active = body.is_active;

      const { data: sbBonus, error: sbErr } = await supabaseAdmin
        .from('bonus_codes')
        .update(patch)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (!sbErr && sbBonus) {
        broadcastRefresh('bonus_code_updated');
        res.json({ ok: true, bonusCode: sbBonus });
        return;
      }
    }

    const store = readAppData();
    const idx = store.bonusCodes.findIndex((b) => b.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Bonus code not found.' });
      return;
    }
    const cur = store.bonusCodes[idx];
    store.bonusCodes[idx] = {
      ...cur,
      code: body.code !== undefined ? String(body.code).trim().toUpperCase() : cur.code,
      description: body.description !== undefined ? String(body.description).trim() : cur.description,
      bonus_amount: body.bonus_amount !== undefined ? Number(body.bonus_amount) : cur.bonus_amount,
      usage_limit: body.usage_limit !== undefined ? Number(body.usage_limit) : cur.usage_limit,
      is_active: typeof body.is_active === 'boolean' ? body.is_active : cur.is_active,
    };
    writeAppData(store);
    broadcastRefresh('bonus_code_updated');
    res.json({ ok: true, bonusCode: store.bonusCodes[idx] });
  });

  app.delete('/api/admin/bonus-codes/:id', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const id = req.params.id;
    if (supabaseAdmin && isUuid(id)) {
      await supabaseAdmin.from('bonus_codes').delete().eq('id', id);
    }
    const store = readAppData();
    store.bonusCodes = store.bonusCodes.filter((b) => b.id !== id);
    writeAppData(store);
    broadcastRefresh('bonus_code_deleted');
    res.json({ ok: true });
  });

  app.post('/api/admin/announcements', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const body = req.body || {};
    const store = readAppData();
    const list = store.announcements ? [...store.announcements] : [];
    const nowIso = new Date().toISOString();
    const created: ServerAnnouncement = {
      id: `ann-${crypto.randomUUID().slice(0, 8)}`,
      title: String(body.title || '').trim().slice(0, 140),
      content: String(body.content || '').trim().slice(0, 1000),
      priority: body.priority === 'important' ? 'important' : 'normal',
      is_published: typeof body.is_published === 'boolean' ? body.is_published : true,
      created_at: nowIso,
      updated_at: nowIso,
    };

    if (supabaseAdmin) {
      const { id: _id, ...insertPayload } = created;
      const { data: sbAnn, error: sbErr } = await supabaseAdmin
        .from('announcements')
        .insert(insertPayload)
        .select()
        .single();
      if (!sbErr && sbAnn) {
        broadcastRefresh('announcement_created');
        res.json({ ok: true, announcement: sbAnn });
        return;
      }
    }

    list.unshift(created);
    store.announcements = list;
    writeAppData(store);
    broadcastRefresh('announcement_created');
    res.json({ ok: true, announcement: created });
  });

  app.put('/api/admin/announcements/:id', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const id = req.params.id;
    const body = req.body || {};

    if (supabaseAdmin && isUuid(id)) {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.title !== undefined) patch.title = String(body.title).trim().slice(0, 140);
      if (body.content !== undefined) patch.content = String(body.content).trim().slice(0, 1000);
      if (body.priority !== undefined) patch.priority = body.priority === 'important' ? 'important' : 'normal';
      if (typeof body.is_published === 'boolean') patch.is_published = body.is_published;

      const { data: sbAnn, error: sbErr } = await supabaseAdmin
        .from('announcements')
        .update(patch)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (!sbErr && sbAnn) {
        broadcastRefresh('announcement_updated');
        res.json({ ok: true, announcement: sbAnn });
        return;
      }
    }

    const store = readAppData();
    const list = store.announcements ? [...store.announcements] : [];
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Announcement not found.' });
      return;
    }
    const cur = list[idx];
    list[idx] = {
      ...cur,
      title: body.title !== undefined ? String(body.title).trim().slice(0, 140) : cur.title,
      content: body.content !== undefined ? String(body.content).trim().slice(0, 1000) : cur.content,
      priority: body.priority !== undefined ? (body.priority === 'important' ? 'important' : 'normal') : cur.priority,
      is_published: typeof body.is_published === 'boolean' ? body.is_published : cur.is_published,
      updated_at: new Date().toISOString(),
    };
    store.announcements = list;
    writeAppData(store);
    broadcastRefresh('announcement_updated');
    res.json({ ok: true, announcement: list[idx] });
  });

  app.delete('/api/admin/announcements/:id', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const id = req.params.id;
    if (supabaseAdmin && isUuid(id)) {
      await supabaseAdmin.from('announcements').delete().eq('id', id);
    }
    const store = readAppData();
    store.announcements = (store.announcements || []).filter((a) => a.id !== id);
    writeAppData(store);
    broadcastRefresh('announcement_deleted');
    res.json({ ok: true });
  });

  app.post('/api/admin/notifications', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const body = req.body || {};
    const store = readAppData();
    const title = String(body.title || '').trim().slice(0, 140);
    const message = String(body.message || '').trim().slice(0, 600);
    const category = ['system', 'transaction', 'bonus', 'support', 'announcement'].includes(body.category)
      ? body.category
      : 'system';
    const userIds: string[] = Array.isArray(body.userIds) ? body.userIds : [];
    const nowIso = new Date().toISOString();

    if (!title || !message) {
      res.status(400).json({ error: 'Title and message are required.' });
      return;
    }

    if (supabaseAdmin) {
      const rows: { user_id: string | null; title: string; message: string; category: string }[] =
        userIds.length === 0
          ? [{ user_id: null, title, message, category }]
          : userIds.map((uid) => ({ user_id: String(uid), title, message, category }));
      const { error: sbErr } = await supabaseAdmin.from('notifications').insert(rows);
      if (!sbErr) {
        broadcastRefresh('notification_sent');
        res.json({ ok: true });
        return;
      }
    }

    if (userIds.length === 0) {
      store.notifications.unshift({
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
        store.notifications.unshift({
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

    writeAppData(store);
    broadcastRefresh('notification_sent');
    res.json({ ok: true });
  });

  app.post('/api/admin/banners', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const body = req.body || {};
    const store = readAppData();
    const imageUrl = String(body.image_url || '').trim();
    if (!imageUrl) {
      res.status(400).json({ error: 'image_url is required.' });
      return;
    }
    const created: ServerBanner = {
      id: `banner-${crypto.randomUUID().slice(0, 8)}`,
      title: String(body.title || 'SCANIA Banner').trim().slice(0, 120),
      subtitle: String(body.subtitle || '').trim().slice(0, 200),
      placement: ['home_hero', 'plans_promo', 'team_hero', 'mine_support', 'plan_card'].includes(body.placement)
        ? body.placement
        : 'home_hero',
      image_url: imageUrl.slice(0, 500),
      storage_path: String(body.storage_path || '').slice(0, 200),
      cta_label: '',
      cta_link: '',
      is_active: true,
      sort_order: store.banners.length + 1,
      created_at: new Date().toISOString(),
    };

    if (supabaseAdmin) {
      const { id: _id, ...insertPayload } = created;
      const { data: sbBanner, error: sbErr } = await supabaseAdmin
        .from('banners')
        .insert(insertPayload)
        .select()
        .single();
      if (!sbErr && sbBanner) {
        broadcastRefresh('banner_created');
        res.json({ ok: true, banner: sbBanner });
        return;
      }
    }

    store.banners.push(created);
    writeAppData(store);
    broadcastRefresh('banner_created');
    res.json({ ok: true, banner: created });
  });

  app.delete('/api/admin/banners/:id', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const id = req.params.id;
    if (supabaseAdmin && isUuid(id)) {
      await supabaseAdmin.from('banners').delete().eq('id', id);
    }
    const store = readAppData();
    store.banners = store.banners.filter((b) => b.id !== id);
    writeAppData(store);
    broadcastRefresh('banner_deleted');
    res.json({ ok: true });
  });

  app.post('/api/admin/transactions/process', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const adminId = req.userId || req.authUser?.id || 'admin';
    const { transactionId, decision, adminNote } = req.body || {};

    if (!transactionId || !['approved', 'rejected'].includes(decision)) {
      res.status(400).json({ error: 'Valid transactionId and decision (approved|rejected) required.' });
      return;
    }

    // 1. Check server store first (handles server-mode users & gateway deposits)
    const store = readAppData();
    const txIdx = store.transactions.findIndex((t) => t.id === transactionId);
    if (txIdx !== -1) {
      const tx = store.transactions[txIdx];
      if (tx.status !== 'pending') {
        res.status(400).json({ error: 'Transaction has already been processed.' });
        return;
      }

      const members = readServerMembers();
      const memberIdx = members.findIndex((m) => m.id === tx.user_id);
      if (memberIdx === -1) {
        res.status(404).json({ error: 'User profile not found.' });
        return;
      }

      const nowIso = new Date().toISOString();
      const member = members[memberIdx];
      const txAmount = Number(tx.amount);

      if (decision === 'approved') {
        if (tx.type === 'deposit_demo') {
          member.demo_balance = Number((Number(member.demo_balance) + txAmount).toFixed(2));
          member.updated_at = nowIso;

          // Distribute 25% Level 1 Referral Commission when deposit is confirmed
          if (member.referred_by) {
            const refIdx = members.findIndex((m) => m.id === member.referred_by);
            if (refIdx !== -1) {
              const comm = Number((txAmount * 0.25).toFixed(2));
              if (comm > 0) {
                members[refIdx].demo_balance = Number((Number(members[refIdx].demo_balance) + comm).toFixed(2));
                members[refIdx].updated_at = nowIso;

                const recIdx = store.referrals.findIndex(
                  (r) => r.referrer_id === members[refIdx].id && r.referred_user_id === member.id && r.level === 1
                );
                if (recIdx !== -1) {
                  store.referrals[recIdx].simulated_commission = Number(
                    (Number(store.referrals[recIdx].simulated_commission) + comm).toFixed(2)
                  );
                } else {
                  store.referrals.push({
                    id: crypto.randomUUID(),
                    referrer_id: members[refIdx].id,
                    referred_user_id: member.id,
                    level: 1,
                    commission_rate: 25,
                    simulated_commission: comm,
                    created_at: nowIso,
                  });
                }

                store.transactions.unshift({
                  id: crypto.randomUUID(),
                  user_id: members[refIdx].id,
                  type: 'referral_commission',
                  amount: comm,
                  method: 'লেভেল 1 রেফারেল (25%)',
                  reference_code: member.scania_id,
                  status: 'completed',
                  admin_note: `${member.full_name} এর রিচার্জ থেকে 25% কমিশন`,
                  processed_by: adminId,
                  created_at: nowIso,
                  updated_at: nowIso,
                });

                store.notifications.unshift({
                  id: crypto.randomUUID(),
                  user_id: members[refIdx].id,
                  title: 'টিম কমিশন যুক্ত হয়েছে (25%)',
                  message: `${member.full_name} এর ${txAmount} টাকা ডিপোজিট কনফার্ম হওয়ায় ${comm} টাকা কমিশন আপনার ব্যালেন্সে যোগ হয়েছে।`,
                  category: 'bonus',
                  is_read: false,
                  created_at: nowIso,
                });
              }
            }
          }
          members[memberIdx] = member;
          writeServerMembers(members);
        }
        // Note: For withdraw_demo, balance was already deducted on submission.
      } else if (decision === 'rejected' && tx.type === 'withdraw_demo') {
        // Refund deducted balance back to user if withdrawal is rejected
        member.demo_balance = Number((Number(member.demo_balance) + txAmount).toFixed(2));
        member.updated_at = nowIso;
        members[memberIdx] = member;
        writeServerMembers(members);
      }

      store.transactions[txIdx] = {
        ...tx,
        status: decision,
        admin_note: adminNote ? String(adminNote).slice(0, 300) : decision === 'approved' ? 'কনফার্ম করা হয়েছে' : 'ব্যর্থ হয়েছে',
        processed_by: adminId,
        updated_at: nowIso,
      };

      const title =
        decision === 'approved'
          ? tx.type === 'deposit_demo'
            ? 'আপনার রিচার্জ সফল হয়েছে'
            : 'আপনার উত্তোলন সফল হয়েছে'
          : tx.type === 'deposit_demo'
          ? 'আপনার রিচার্জ ব্যর্থ হয়েছে'
          : 'আপনার উত্তোলন বাতিল ও ব্যালেন্স ফেরত দেওয়া হয়েছে';

      store.notifications.unshift({
        id: crypto.randomUUID(),
        user_id: tx.user_id,
        title,
        message: `${title} (${txAmount} টাকা)।${adminNote ? ` নোট: ${adminNote}` : ''}`,
        category: 'transaction',
        is_read: false,
        created_at: nowIso,
      });

      writeAppData(store);
      broadcastRefresh('transaction_processed');
      res.json({ ok: true, transaction: store.transactions[txIdx] });
      return;
    }

    if (!supabaseAdmin) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }

    const { data: tx } = await supabaseAdmin
      .from('demo_transactions')
      .select('*')
      .eq('id', transactionId)
      .maybeSingle();

    if (!tx) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }
    if (tx.status !== 'pending') {
      res.status(400).json({ error: 'Transaction has already been processed.' });
      return;
    }

    const txAmount = Number(tx.amount);
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('demo_balance, referred_by, full_name, scania_id')
      .eq('id', tx.user_id)
      .single();

    if (!profile) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    const currentBal = Number(profile.demo_balance || 0);

    if (decision === 'approved' && tx.type === 'deposit_demo') {
      await supabaseAdmin
        .from('profiles')
        .update({ demo_balance: Number((currentBal + txAmount).toFixed(2)), updated_at: new Date().toISOString() })
        .eq('id', tx.user_id);

      if (profile.referred_by) {
        const comm = Number((txAmount * 0.25).toFixed(2));
        const { data: refProf } = await supabaseAdmin
          .from('profiles')
          .select('id, demo_balance')
          .eq('id', profile.referred_by)
          .maybeSingle();
        if (refProf && comm > 0) {
          await supabaseAdmin
            .from('profiles')
            .update({ demo_balance: Number((Number(refProf.demo_balance) + comm).toFixed(2)), updated_at: new Date().toISOString() })
            .eq('id', refProf.id);
          const { data: refRec } = await supabaseAdmin
            .from('referral_records')
            .select('id, simulated_commission')
            .eq('referrer_id', refProf.id)
            .eq('referred_user_id', tx.user_id)
            .eq('level', 1)
            .maybeSingle();
          if (refRec) {
            await supabaseAdmin
              .from('referral_records')
              .update({ simulated_commission: Number((Number(refRec.simulated_commission) + comm).toFixed(2)) })
              .eq('id', refRec.id);
          } else {
            await supabaseAdmin.from('referral_records').insert({
              referrer_id: refProf.id,
              referred_user_id: tx.user_id,
              level: 1,
              commission_rate: 25,
              simulated_commission: comm,
            });
          }
          await supabaseAdmin.from('demo_transactions').insert({
            user_id: refProf.id,
            type: 'referral_commission',
            amount: comm,
            method: 'লেভেল 1 রেফারেল (25%)',
            reference_code: profile.scania_id,
            status: 'completed',
            admin_note: `${profile.full_name} এর রিচার্জ থেকে 25% কমিশন`,
          });
          await supabaseAdmin.from('notifications').insert({
            user_id: refProf.id,
            title: 'টিম কমিশন যুক্ত হয়েছে (25%)',
            message: `${profile.full_name} এর ${txAmount} টাকা রিচার্জ কনফার্ম হওয়ায় ${comm} টাকা কমিশন আপনার ব্যালেন্সে যোগ হয়েছে।`,
            category: 'bonus',
          });
        }
      }
    } else if (decision === 'rejected' && tx.type === 'withdraw_demo') {
      // Refund deducted withdrawal balance back to user
      await supabaseAdmin
        .from('profiles')
        .update({ demo_balance: Number((currentBal + txAmount).toFixed(2)), updated_at: new Date().toISOString() })
        .eq('id', tx.user_id);
    }

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('demo_transactions')
      .update({
        status: decision,
        admin_note: String(adminNote || '').slice(0, 300),
        processed_by: isUuid(adminId) ? adminId : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (updErr) {
      res.status(400).json({ error: updErr.message });
      return;
    }

    const title =
      decision === 'approved'
        ? tx.type === 'deposit_demo'
          ? 'আপনার রিচার্জ সফল হয়েছে'
          : 'আপনার উত্তোলন সফল হয়েছে'
        : tx.type === 'deposit_demo'
        ? 'আপনার রিচার্জ ব্যর্থ হয়েছে'
        : 'আপনার উত্তোলন বাতিল ও ব্যালেন্স ফেরত দেওয়া হয়েছে';

    await supabaseAdmin.from('notifications').insert({
      user_id: tx.user_id,
      title,
      message: `${title} (${tx.amount} টাকা)।${adminNote ? ` নোট: ${adminNote}` : ''}`,
      category: 'transaction',
    });

    await writeAuditLog(adminId, `process_${tx.type}_${decision}`, 'demo_transactions', transactionId, {
      amount: tx.amount,
      adminNote,
    });

    broadcastRefresh('transaction_processed');
    res.json({ transaction: updated });
  });

  app.put('/api/admin/users/:id', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const adminId = req.userId || req.authUser?.id || 'admin';
    const targetId = req.params.id;
    const { full_name, phone, tier, is_active } = req.body || {};

    const members = readServerMembers();
    const mIdx = members.findIndex((m) => m.id === targetId);
    if (mIdx !== -1) {
      if (typeof full_name === 'string' && full_name.trim()) members[mIdx].full_name = full_name.trim().slice(0, 80);
      if (typeof phone === 'string') members[mIdx].phone = phone.trim().slice(0, 30);
      if (typeof tier === 'string' && tier.trim()) members[mIdx].tier = tier.trim().slice(0, 40);
      if (typeof is_active === 'boolean') members[mIdx].is_active = is_active;
      members[mIdx].updated_at = new Date().toISOString();
      writeServerMembers(members);
      broadcastRefresh('user_updated');
      res.json({ ok: true, profile: sanitizeMemberProfile(members[mIdx]) });
      return;
    }

    if (!supabaseAdmin) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof full_name === 'string' && full_name.trim()) patch.full_name = full_name.trim().slice(0, 80);
    if (typeof phone === 'string') patch.phone = phone.trim().slice(0, 30);
    if (typeof tier === 'string' && tier.trim()) patch.tier = tier.trim().slice(0, 40);
    if (typeof is_active === 'boolean') patch.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(patch)
      .eq('id', targetId)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    await writeAuditLog(adminId, 'update_user_profile', 'profiles', targetId, patch);
    broadcastRefresh('user_updated');
    res.json({ profile: data });
  });

  // Admin: Add or Deduct User Balance (supports both server-mode members & Supabase profiles)
  app.post('/api/admin/users/:id/balance', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const adminId = req.userId || req.authUser?.id || 'admin';
    const targetId = req.params.id;
    const mode = req.body?.mode === 'deduct' ? 'deduct' : 'add';
    const amount = Number(req.body?.amount || 0);
    const note = String(req.body?.note || '').trim().slice(0, 200);

    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
      res.status(400).json({ error: 'সঠিক টাকার পরিমাণ লিখুন।' });
      return;
    }

    const nowIso = new Date().toISOString();
    const members = readServerMembers();
    const mIdx = members.findIndex((m) => m.id === targetId);

    if (mIdx !== -1) {
      const currentBal = Number(members[mIdx].demo_balance || 0);
      if (mode === 'deduct' && currentBal < amount) {
        res.status(400).json({ error: 'ব্যবহারকারীর ব্যালেন্সের চেয়ে বেশি টাকা কাটা যাবে না।' });
        return;
      }

      const nextBal =
        mode === 'add'
          ? Number((currentBal + amount).toFixed(2))
          : Number((currentBal - amount).toFixed(2));

      members[mIdx].demo_balance = nextBal;
      members[mIdx].updated_at = nowIso;
      writeServerMembers(members);

      const store = readAppData();
      store.transactions.unshift({
        id: crypto.randomUUID(),
        user_id: targetId,
        type: mode === 'add' ? 'bonus_code' : 'withdraw_demo',
        amount: Number(amount.toFixed(2)),
        method: mode === 'add' ? 'Admin Add Balance' : 'Admin Deduct Balance',
        reference_code: 'ADMIN-ADJ',
        status: 'completed',
        admin_note: note || (mode === 'add' ? 'অ্যাডমিন থেকে ব্যালেন্স যোগ করা হয়েছে' : 'অ্যাডমিন থেকে ব্যালেন্স কাটা হয়েছে'),
        processed_by: adminId,
        created_at: nowIso,
        updated_at: nowIso,
      });

      store.notifications.unshift({
        id: crypto.randomUUID(),
        user_id: targetId,
        title: mode === 'add' ? 'ব্যালেন্স যোগ হয়েছে' : 'ব্যালেন্স সমন্বয় হয়েছে',
        message:
          mode === 'add'
            ? `আপনার অ্যাকাউন্টে ${amount} টাকা যোগ করা হয়েছে।${note ? ` (${note})` : ''}`
            : `আপনার অ্যাকাউন্ট থেকে ${amount} টাকা কেটে নেওয়া হয়েছে।${note ? ` (${note})` : ''}`,
        category: 'transaction',
        is_read: false,
        created_at: nowIso,
      });

      writeAppData(store);
      broadcastRefresh('admin_balance_update');
      res.json({ ok: true, profile: sanitizeMemberProfile(members[mIdx]) });
      return;
    }

    if (!supabaseAdmin) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const { data: prof } = await supabaseAdmin
      .from('profiles')
      .select('demo_balance')
      .eq('id', targetId)
      .single();

    if (!prof) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    const currentBal = Number(prof.demo_balance || 0);
    if (mode === 'deduct' && currentBal < amount) {
      res.status(400).json({ error: 'Cannot deduct more than current balance.' });
      return;
    }

    const nextBal =
      mode === 'add'
        ? Number((currentBal + amount).toFixed(2))
        : Number((currentBal - amount).toFixed(2));

    const { data: updatedProf, error: updErr } = await supabaseAdmin
      .from('profiles')
      .update({ demo_balance: nextBal, updated_at: nowIso })
      .eq('id', targetId)
      .select()
      .single();

    if (updErr) {
      res.status(400).json({ error: updErr.message });
      return;
    }

    await supabaseAdmin.from('demo_transactions').insert({
      user_id: targetId,
      type: mode === 'add' ? 'bonus_code' : 'withdraw_demo',
      amount: Number(amount.toFixed(2)),
      method: mode === 'add' ? 'Admin Add Balance' : 'Admin Deduct Balance',
      reference_code: 'ADMIN-ADJ',
      status: 'completed',
      admin_note: note || (mode === 'add' ? 'অ্যাডমিন থেকে ব্যালেন্স যোগ করা হয়েছে' : 'অ্যাডমিন থেকে ব্যালেন্স কাটা হয়েছে'),
      processed_by: isUuid(adminId) ? adminId : null,
    });

    await supabaseAdmin.from('notifications').insert({
      user_id: targetId,
      title: mode === 'add' ? 'ব্যালেন্স যোগ হয়েছে' : 'ব্যালেন্স সমন্বয় হয়েছে',
      message:
        mode === 'add'
          ? `আপনার অ্যাকাউন্টে ${amount} টাকা যোগ করা হয়েছে।${note ? ` (${note})` : ''}`
          : `আপনার অ্যাকাউন্ট থেকে ${amount} টাকা কেটে নেওয়া হয়েছে।${note ? ` (${note})` : ''}`,
      category: 'transaction',
    });

    await writeAuditLog(adminId, `admin_${mode}_balance`, 'profiles', targetId, { amount, note });
    broadcastRefresh('admin_balance_update');
    res.json({ ok: true, profile: updatedProf });
  });

  // Admin: Reset/Change User Password
  app.post('/api/admin/users/:id/password', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const adminId = req.userId || req.authUser?.id || 'admin';
    const targetId = req.params.id;
    const newPassword = String(req.body?.newPassword || '');

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'নতুন পাসওয়ার্ড কমপক্ষে 6 অক্ষরের হতে হবে।' });
      return;
    }

    const members = readServerMembers();
    const mIdx = members.findIndex((m) => m.id === targetId);
    if (mIdx !== -1) {
      const { salt, hash } = hashPassword(newPassword);
      members[mIdx].password_salt = salt;
      members[mIdx].password_hash = hash;
      members[mIdx].updated_at = new Date().toISOString();
      writeServerMembers(members);
      broadcastRefresh('admin_password_update');
      res.json({ ok: true });
      return;
    }

    if (!supabaseAdmin) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(targetId, { password: newPassword });
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    await writeAuditLog(adminId, 'admin_reset_password', 'auth.users', targetId, {});
    broadcastRefresh('admin_password_update');
    res.json({ ok: true });
  });

  // Admin: Assign VIP / Investment Package directly to User (without deducting user balance)
  app.post('/api/admin/users/:id/assign-plan', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const adminId = req.userId || req.authUser?.id || 'admin';
    const targetId = req.params.id;
    const planId = String(req.body?.planId || '');
    const tier = typeof req.body?.tier === 'string' && req.body.tier.trim() ? req.body.tier.trim().slice(0, 40) : '';

    if (!planId) {
      res.status(400).json({ error: 'অনুগ্রহ করে একটি প্ল্যান নির্বাচন করুন।' });
      return;
    }

    const store = readAppData();
    const catalog = store.plans && store.plans.length > 0 ? store.plans : DEFAULT_SERVER_PLANS;
    let plan = catalog.find((p) => p.id === planId);

    if (!plan && supabaseAdmin) {
      const { data: sbPlan } = await supabaseAdmin.from('plans').select('*').eq('id', planId).maybeSingle();
      if (sbPlan) plan = sbPlan as ServerPlan;
    }

    if (!plan) {
      res.status(404).json({ error: 'নির্বাচিত প্ল্যানটি পাওয়া যায়নি।' });
      return;
    }

    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + Number(plan.validity_days) * 86400000).toISOString();
    const members = readServerMembers();
    const mIdx = members.findIndex((m) => m.id === targetId);

    if (mIdx !== -1) {
      if (tier) {
        members[mIdx].tier = tier;
        members[mIdx].updated_at = nowIso;
        writeServerMembers(members);
      }

      const newProd: ServerUserProduct = {
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
        expires_at: expiresAt,
      };
      store.userProducts.unshift(newProd);

      store.transactions.unshift({
        id: crypto.randomUUID(),
        user_id: targetId,
        type: 'plan_purchase',
        amount: Number(plan.demo_price),
        method: 'Admin VIP Assign',
        reference_code: plan.title,
        status: 'completed',
        admin_note: `অ্যাডমিন থেকে ${plan.title} VIP প্যাকেজ যুক্ত হয়েছে`,
        processed_by: adminId,
        created_at: nowIso,
        updated_at: nowIso,
      });

      store.notifications.unshift({
        id: crypto.randomUUID(),
        user_id: targetId,
        title: 'অ্যাডমিন থেকে নতুন VIP প্ল্যান যুক্ত হয়েছে',
        message: `আপনার অ্যাকাউন্টে "${plan.title}" প্ল্যানটি সফলভাবে যুক্ত করা হয়েছে।`,
        category: 'system',
        is_read: false,
        created_at: nowIso,
      });

      writeAppData(store);
      broadcastRefresh('admin_plan_assigned');
      res.json({ ok: true, product: newProd, profile: sanitizeMemberProfile(members[mIdx]) });
      return;
    }

    if (!supabaseAdmin) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (tier) {
      await supabaseAdmin
        .from('profiles')
        .update({ tier, updated_at: nowIso })
        .eq('id', targetId);
    }

    const { data: product, error: prodErr } = await supabaseAdmin
      .from('demo_user_products')
      .insert({
        user_id: targetId,
        plan_id: plan.id,
        plan_title: plan.title,
        demo_price: Number(plan.demo_price),
        daily_income: Number(plan.daily_income),
        validity_days: Number(plan.validity_days),
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (prodErr) {
      res.status(400).json({ error: prodErr.message });
      return;
    }

    await supabaseAdmin.from('demo_transactions').insert({
      user_id: targetId,
      type: 'plan_purchase',
      amount: Number(plan.demo_price),
      method: 'Admin VIP Assign',
      reference_code: plan.title,
      status: 'completed',
      admin_note: `অ্যাডমিন থেকে ${plan.title} VIP প্যাকেজ যুক্ত হয়েছে`,
      processed_by: isUuid(adminId) ? adminId : null,
    });

    await supabaseAdmin.from('notifications').insert({
      user_id: targetId,
      title: 'অ্যাডমিন থেকে নতুন VIP প্ল্যান যুক্ত হয়েছে',
      message: `আপনার অ্যাকাউন্টে "${plan.title}" প্ল্যানটি সফলভাবে যুক্ত করা হয়েছে।`,
      category: 'system',
    });

    await writeAuditLog(adminId, 'admin_assign_vip_plan', 'demo_user_products', targetId, {
      planId: plan.id,
      planTitle: plan.title,
      tier,
    });
    broadcastRefresh('admin_plan_assigned');
    res.json({ ok: true, product });
  });

  app.post('/api/admin/upload', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const adminId = req.userId || req.authUser?.id || 'admin';
    if (!supabaseAdmin) {
      res.status(503).json({ error: 'Supabase Storage unavailable on backend.' });
      return;
    }
    const { fileName, mimeType, base64Data } = req.body || {};
    if (!fileName || !mimeType || !base64Data) {
      res.status(400).json({ error: 'fileName, mimeType, and base64Data are required.' });
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(mimeType)) {
      res.status(400).json({ error: 'Only PNG, JPG, WEBP, and SVG images are supported.' });
      return;
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'File exceeds 5MB upload limit.' });
      return;
    }

    const safeName = `${Date.now()}-${String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storagePath = `uploads/${safeName}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('scania-media')
      .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

    if (uploadErr) {
      res.status(400).json({ error: uploadErr.message });
      return;
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from('scania-media').getPublicUrl(storagePath);
    await writeAuditLog(adminId, 'upload_media', 'storage.objects', storagePath, { mimeType });

    res.json({ publicUrl: publicUrlData.publicUrl, storagePath });
  });

  app.post('/api/admin/audit', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const adminId = req.userId || req.authUser?.id || 'admin';
    const { action, targetTable, targetId, details } = req.body || {};
    await writeAuditLog(adminId, String(action || 'admin_action'), String(targetTable || 'unknown'), String(targetId || ''), details || {});
    res.json({ ok: true });
  });

  // =========================================================================
  // VITE DEV MIDDLEWARE / PRODUCTION STATIC HANDLER
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Scania Investment Platform listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
