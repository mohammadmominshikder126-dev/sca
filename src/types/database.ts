export type AppRole = 'user' | 'admin' | 'super_admin';

export interface Profile {
  id: string;
  scania_id: string;
  email: string;
  full_name: string;
  phone: string;
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

export interface BankCard {
  wallet_method: 'Bkash' | 'Nagad';
  wallet_number: string;
  account_name: string;
  updated_at: string;
}

export interface UserRoleRow {
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface DemoPlan {
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

export type TransactionType =
  | 'deposit_demo'
  | 'withdraw_demo'
  | 'plan_purchase'
  | 'daily_yield'
  | 'bonus_code'
  | 'referral_commission';

export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface DemoTransaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  method: string;
  reference_code: string;
  status: TransactionStatus;
  admin_note: string;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, 'full_name' | 'scania_id' | 'email'>;
}

export interface DemoUserProduct {
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

export interface ReferralRecord {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  level: 1 | 2 | 3;
  commission_rate: number;
  simulated_commission: number;
  created_at: string;
  referred?: Pick<Profile, 'id' | 'full_name' | 'scania_id' | 'email' | 'tier' | 'created_at'>;
  referrer?: Pick<Profile, 'id' | 'full_name' | 'scania_id'>;
}

export interface BonusCode {
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

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'important';
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export type BannerPlacement = 'home_hero' | 'plans_promo' | 'team_hero' | 'mine_support' | 'plan_card';

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  placement: BannerPlacement;
  image_url: string;
  storage_path: string;
  cta_label: string;
  cta_link: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface SiteSettings {
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

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'normal' | 'high';
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, 'full_name' | 'scania_id' | 'email'>;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: 'user' | 'admin';
  message: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  category: 'system' | 'transaction' | 'bonus' | 'support' | 'announcement';
  is_read: boolean;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_table: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
}
