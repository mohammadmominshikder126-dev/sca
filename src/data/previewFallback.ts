import {
  Announcement,
  AppNotification,
  Banner,
  BonusCode,
  DemoPlan,
  DemoTransaction,
  DemoUserProduct,
  Profile,
  ReferralRecord,
  SiteSettings,
  SupportTicket,
} from '../types/database';

/**
 * Read-only illustrative dataset used ONLY when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * have not yet been configured in the environment.
 * Zero localStorage is ever used. All mutations require a live Supabase connection.
 */
export const PREVIEW_SITE_SETTINGS: SiteSettings = {
  id: 1,
  site_name: 'SCANIA ইনভেস্টমেন্ট প্ল্যাটফর্ম',
  logo_url: '',
  currency_symbol: '৳',
  support_email: 'support@scania-platform.com',
  support_phone: '+880 1700-000000',
  telegram_link: 'https://t.me/scania_community',
  deposit_bkash_number: '01995616092',
  deposit_nagad_number: '01995616092',
  theme_accent: '#1250C4',
  show_team_tab: true,
  show_bonus_button: true,
  footer_text: '© 2026 SCANIA ইনভেস্টমেন্ট প্ল্যাটফর্ম। সর্বস্বত্ব সংরক্ষিত।',
  about_text: `SCANIA বিশেষ কহচ্ছে বিশ্বের অন্যতম বিলাসবহুল বাস ও ট্রাকের জগতে Scania (স্ক্যানিয়া) নিঃসন্দেহে বিশ্বের অন্যতম সেরা এবং বিশ্বস্ত একটি প্লাটফর্ম এই প্রতিষ্ঠানটি গত এক শতাব্দীরও বেশি সময় ধরে তাদের অসাধারণ Service এবং বিশ্বাসের মাধ্যমে ব্যবহারকারীদের কাছে শ্রেষ্ঠত্ব প্রমাণ করে আসছে।
বাংলাদেশের প্রেক্ষাপটেও দেশের শীর্ষস্থানীয় ও প্রিমিয়াম বাস অপারেটরগুলোর কাছে স্ক্যানিয়া আস্থার এক অপর নাম। নিচে স্ক্যানিয়ার বিশ্বস্ততা এবং অনন্য বৈশিষ্ট্যগুলো তুলে ধরা হলো:
১. অতুলনীয় স্থায়িত্ব ও দ্রুত পেমেন্ট সিস্টেম
• দীর্ঘ মেয়াদী SCANIA প্ল্যাটফর্মটি তৈরি করা হয় যা বছরের পর বছর বিরামহীনভাবে চলতে সক্ষম। সঠিক রক্ষণাবেক্ষনে ২৪ ঘন্টা কাস্টমার সার্ভিস রয়েছে স্ক্যানিয়া ব্যবহারকারীদের কোনো বড় সমস্যা হলে খুব দ্রুত সমাধান করার জন্য বিখ্যাত
• অসাধারণ পরিস্থিতিতে যেমনই হোক স্ক্যানিয়ার ব্যবহারকারী যেকোনো সমস্যা খুব দ্রুত সমাধান করে থাকে`,
  updated_at: new Date().toISOString(),
};

export const PREVIEW_USER_PROFILE: Profile = {
  id: 'preview-user-1',
  scania_id: 'SCN123456',
  email: 'member@scania-platform.com',
  full_name: 'সদস্য 1234',
  phone: '01711000123',
  avatar_url: '',
  tier: 'Diamond',
  demo_balance: 150.0,
  demo_bonus: 150.0,
  referral_code: 'SCN123',
  referred_by: null,
  is_active: true,
  created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
};

export const PREVIEW_PLANS: DemoPlan[] = [
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

export const PREVIEW_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'preview-ann-1',
    title: 'SCANIA প্ল্যাটফর্মে স্বাগতম!',
    content: 'নিরাপদভাবে প্ল্যান কিনুন, দৈনিক আয় গ্রহণ করুন এবং আপনার টিম গড়ে তুলুন। সর্বনিম্ন রিচার্জ 500 টাকা, সর্বনিম্ন উত্তোলন 150 টাকা ও রেজিস্ট্রেশন বোনাস 150 টাকা।',
    priority: 'important',
    is_published: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'preview-ann-2',
    title: '3-লেভেল টিম রেফারেল কমিশন চালু আছে',
    content: 'বন্ধুদের আমন্ত্রণ জানান এবং ডিপোজিট কনফার্ম হওয়ার সাথে সাথে লেভেল 1 (25%) কমিশন উপভোগ করুন।',
    priority: 'normal',
    is_published: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const PREVIEW_TRANSACTIONS: DemoTransaction[] = [];

export const PREVIEW_USER_PRODUCTS: DemoUserProduct[] = [];

export const PREVIEW_REFERRALS: ReferralRecord[] = [];

export const PREVIEW_BONUS_CODES: BonusCode[] = [
  {
    id: 'preview-bonus-1',
    code: 'SCANIA50',
    description: 'স্বাগতম বোনাস ক্রেডিট',
    bonus_amount: 50,
    usage_limit: 1000,
    used_count: 142,
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
    used_count: 89,
    is_active: true,
    expires_at: null,
    created_at: new Date().toISOString(),
  },
];

export const PREVIEW_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'preview-notif-1',
    user_id: null,
    title: 'SCANIA প্ল্যাটফর্মে স্বাগতম',
    message: 'সর্বনিম্ন রিচার্জ 500 টাকা, সর্বনিম্ন উত্তোলন 150 টাকা (চার্জ 5%) এবং রেজিস্ট্রেশন বোনাস 150 টাকা।',
    category: 'system',
    is_read: false,
    created_at: new Date().toISOString(),
  },
];

export const PREVIEW_BANNERS: Banner[] = [];
export const PREVIEW_TICKETS: SupportTicket[] = [];
