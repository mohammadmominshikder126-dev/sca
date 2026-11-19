# Scania Investment Platform (Demo Simulation) — Setup & Deployment Guide

> **Disclaimer:** This is a **DEMO / SIMULATION** platform. No real-money deposits, withdrawals, or payment gateways are connected. All balances, yields, commissions, and transactions are simulated educational/demonstration records.

---

## 1. Supabase Project Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase Dashboard.
3. Copy the entire contents of `/supabase/schema.sql` and run it. This creates:
   - All 16 relational tables (`profiles`, `user_roles`, `plans`, `demo_transactions`, `demo_user_products`, `referral_records`, `bonus_codes`, `bonus_redemptions`, `announcements`, `banners`, `site_settings`, `support_tickets`, `support_messages`, `notifications`, `notification_reads`, `admin_audit_logs`)
   - Row Level Security (RLS) policies on every table
   - `handle_new_user()` trigger for automatic profile + 3-level referral linking on signup
   - Atomic RPC functions (`purchase_demo_plan`, `redeem_bonus_code`, `admin_process_transaction`)
   - Realtime publications for instant Admin-to-User synchronization
   - Public `scania-media` Storage bucket for uploaded banners & plan images
   - Initial demo plans, announcements, site settings, and sample bonus codes (`SCANIA50`, `FLEET2026`)
4. In **Authentication → Providers → Email**, ensure Email/Password sign-up is enabled. For fast testing, you may disable "Confirm email" in Supabase Auth settings (optional).

---

## 2. Environment Variables

Create a `.env` file (or configure Secrets in AI Studio / Netlify / Cloudflare Pages):

```env
VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"
```

> **Security Note:** Never prefix `SUPABASE_SERVICE_ROLE_KEY` with `VITE_`. It must only run on the backend (`server.ts`).

---

## 3. Creating Your First Admin Account

1. Register a normal account through `/register` (or create a user in **Supabase Dashboard → Authentication → Users**).
2. Find the user's UUID in **Authentication → Users** (or `public.profiles`).
3. Run the following SQL in the **Supabase SQL Editor** to promote that user to `admin`:

```sql
update public.user_roles
set role = 'admin'
where user_id = 'YOUR_USER_UUID_HERE';
```

4. Sign in via `/admin/login`. Normal users without `admin` or `super_admin` in `user_roles` are blocked from entering `/admin` and cannot invoke admin RPCs or `/api/admin/*` endpoints.

---

## 4. Running Locally (Full-Stack Node + Express + Vite)

```bash
npm install
npm run dev
```

The server runs on port `3000` with both the React frontend and `/api/*` server endpoints active.

---

## 5. Deploying to Netlify or Cloudflare Pages

Because `/supabase/schema.sql` includes RLS policies and `SECURITY DEFINER` RPC functions (`purchase_demo_plan`, `redeem_bonus_code`, `admin_process_transaction`), the application works both with `server.ts` AND as a static SPA deployment:

### Netlify
1. Connect your repository to Netlify.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in **Site configuration → Environment variables**.
5. `/public/_redirects` (`/* /index.html 200`) is automatically included so `/user`, `/admin`, and `/register` routes work on refresh.

### Cloudflare Pages
1. Connect your repository to Cloudflare Pages.
2. Build command: `npm run build`
3. Build output directory: `dist`
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in **Settings → Environment variables**.
5. `/public/_redirects` is supported natively by Cloudflare Pages for SPA routing.
