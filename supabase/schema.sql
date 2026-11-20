-- ============================================================================
-- SCANIA INVESTMENT PLATFORM (DEMO / SIMULATION ONLY)
-- Complete Supabase PostgreSQL Schema, RLS Policies, Triggers, RPCs & Seeds
-- Run this entire script inside the Supabase SQL Editor.
-- ============================================================================

-- 1. EXTENSIONS
create extension if not exists "pgcrypto";

-- 2. TABLES

-- 2.1 Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  scania_id text unique not null,
  email text not null,
  full_name text not null default 'Scania Demo Member',
  phone text default '',
  avatar_url text default '',
  tier text not null default 'Standard Demo',
  demo_balance numeric(14, 2) not null default 150.00 check (demo_balance >= 0),
  demo_bonus numeric(14, 2) not null default 150.00 check (demo_bonus >= 0),
  referral_code text unique not null,
  referred_by uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists scania_id text;
alter table public.profiles add column if not exists email text default '';
alter table public.profiles add column if not exists full_name text not null default 'Scania Demo Member';
alter table public.profiles add column if not exists phone text default '';
alter table public.profiles add column if not exists avatar_url text default '';
alter table public.profiles add column if not exists tier text not null default 'Standard Demo';
alter table public.profiles add column if not exists demo_balance numeric(14, 2) not null default 150.00;
alter table public.profiles add column if not exists demo_bonus numeric(14, 2) not null default 150.00;
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists is_active boolean not null default true;

-- 2.2 User Roles (Server-checked RBAC; never editable by normal users)
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin', 'super_admin')),
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 2.3 Demo Investment Plans
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text default '',
  description text not null default '',
  image_url text default '',
  demo_price numeric(14, 2) not null check (demo_price > 0),
  daily_income numeric(14, 2) not null check (daily_income >= 0),
  validity_days integer not null check (validity_days > 0),
  total_return numeric(14, 2),
  badge text default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plans add column if not exists total_return numeric(14, 2);

-- 2.4 Demo Transactions (Simulated Deposits, Withdrawals, Plan Purchases, Bonuses, Commissions)
create table if not exists public.demo_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('deposit_demo', 'withdraw_demo', 'plan_purchase', 'daily_yield', 'bonus_code', 'referral_commission')),
  amount numeric(14, 2) not null check (amount >= 0),
  method text not null default 'Demo Simulation',
  reference_code text default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed')),
  admin_note text default '',
  processed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2.5 User Purchased Demo Products
create table if not exists public.demo_user_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  plan_title text not null,
  demo_price numeric(14, 2) not null,
  daily_income numeric(14, 2) not null,
  validity_days integer not null,
  days_elapsed integer not null default 0,
  total_simulated_earned numeric(14, 2) not null default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- 2.6 Referral Records (3-Level Simulated Tree: L1 25%, L2 2%, L3 1%)
create table if not exists public.referral_records (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade,
  level integer not null check (level in (1, 2, 3)),
  commission_rate numeric(5, 2) not null,
  simulated_commission numeric(14, 2) not null default 0.00,
  created_at timestamptz not null default now(),
  unique (referrer_id, referred_user_id)
);

-- 2.7 Bonus Codes
create table if not exists public.bonus_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text default '',
  bonus_amount numeric(14, 2) not null check (bonus_amount > 0),
  usage_limit integer not null default 100 check (usage_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- 2.8 Bonus Redemptions (prevents duplicate claims per user)
create table if not exists public.bonus_redemptions (
  id uuid primary key default gen_random_uuid(),
  bonus_code_id uuid not null references public.bonus_codes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  unique (bonus_code_id, user_id)
);

-- 2.9 Announcements / Notices
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  priority text not null default 'normal' check (priority in ('normal', 'important')),
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2.10 Banners & Media Assets
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text default '',
  placement text not null check (placement in ('home_hero', 'plans_promo', 'team_hero', 'mine_support', 'plan_card')),
  image_url text not null,
  storage_path text default '',
  cta_label text default '',
  cta_link text default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 2.11 Site Settings (Singleton row id = 1)
create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  site_name text not null default 'Scania Investment Platform',
  logo_url text default '',
  currency_symbol text not null default '৳',
  support_email text not null default 'support@scania-demo.example',
  support_phone text not null default '+880 1700-000000',
  telegram_link text not null default 'https://t.me/scania_demo_community',
  deposit_bkash_number text not null default '01995616092',
  deposit_nagad_number text not null default '01995616092',
  theme_accent text not null default '#1250C4',
  show_team_tab boolean not null default true,
  show_bonus_button boolean not null default true,
  footer_text text not null default '© 2026 Scania Investment Platform (Demo Simulation Only). All balances and returns are simulated.',
  about_text text not null default 'Scania Investment Platform is a simulated fleet investment demonstration environment showcasing mobile-first portfolio tracking, multi-level referral modeling, and real-time administration.',
  updated_at timestamptz not null default now()
);

alter table public.site_settings add column if not exists deposit_bkash_number text not null default '01995616092';
alter table public.site_settings add column if not exists deposit_nagad_number text not null default '01995616092';

-- 2.12 Support Tickets
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority text not null default 'normal' check (priority in ('normal', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2.13 Support Messages
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('user', 'admin')),
  message text not null,
  created_at timestamptz not null default now()
);

-- 2.14 Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade, -- NULL = broadcast to all users
  title text not null,
  message text not null,
  category text not null default 'system' check (category in ('system', 'transaction', 'bonus', 'support', 'announcement')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2.15 Notification Read Receipts for Broadcast Notifications
create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

-- 2.16 Admin Audit Logs
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target_table text not null,
  target_id text default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 3. HELPER FUNCTIONS

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = uid
      and role in ('admin', 'super_admin')
  );
$$;

-- Trigger: Automatically create profile, user role, and 3-level referral tree on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_ref_code text;
  v_scania_id text;
  v_referrer_id uuid;
  v_l2_referrer uuid;
  v_l3_referrer uuid;
  v_input_ref text;
begin
  v_scania_id := 'SCN' || lpad((floor(random() * 900000 + 100000))::text, 6, '0');
  v_ref_code := 'SCN' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_input_ref := nullif(trim(coalesce(new.raw_user_meta_data->>'referral_code', '')), '');

  if v_input_ref is not null then
    select id into v_referrer_id from public.profiles where upper(referral_code) = upper(v_input_ref) limit 1;
  end if;

  insert into public.profiles (
    id, scania_id, email, full_name, phone, referral_code, referred_by, demo_balance, demo_bonus
  ) values (
    new.id,
    v_scania_id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), 'Member ' || right(coalesce(new.raw_user_meta_data->>'phone', v_scania_id), 4)),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    v_ref_code,
    v_referrer_id,
    150.00,
    150.00
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;

  -- Build up to 3 referral levels
  if v_referrer_id is not null then
    insert into public.referral_records (referrer_id, referred_user_id, level, commission_rate, simulated_commission)
    values (v_referrer_id, new.id, 1, 25.00, 0.00)
    on conflict do nothing;

    select referred_by into v_l2_referrer from public.profiles where id = v_referrer_id;
    if v_l2_referrer is not null then
      insert into public.referral_records (referrer_id, referred_user_id, level, commission_rate, simulated_commission)
      values (v_l2_referrer, new.id, 2, 2.00, 0.00)
      on conflict do nothing;

      select referred_by into v_l3_referrer from public.profiles where id = v_l2_referrer;
      if v_l3_referrer is not null then
        insert into public.referral_records (referrer_id, referred_user_id, level, commission_rate, simulated_commission)
        values (v_l3_referrer, new.id, 3, 1.00, 0.00)
        on conflict do nothing;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3.1 Instant Phone Registration RPC (No SMTP email rate limits, auto-confirmed)
create or replace function public.register_phone_user(
  p_phone text,
  p_password text,
  p_referral_code text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_clean_phone text := trim(coalesce(p_phone, ''));
  v_digits text := regexp_replace(v_clean_phone, '[^0-9]', '', 'g');
  v_canonical text;
  v_email text;
  v_uid uuid := gen_random_uuid();
  v_encrypted_pw text;
begin
  if length(v_digits) < 7 or length(v_digits) > 16 then
    raise exception 'Please enter a valid phone number';
  end if;

  if length(coalesce(p_password, '')) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;

  if v_digits like '880%' and length(v_digits) = 13 then
    v_canonical := '0' || substr(v_digits, 4);
  else
    v_canonical := v_digits;
  end if;

  v_email := 'u' || v_canonical || '@scania-member.com';

  if exists (select 1 from auth.users where email = v_email)
     or exists (select 1 from public.profiles where phone = v_clean_phone or phone = v_canonical or email = v_email) then
    raise exception 'This phone number is already registered';
  end if;

  v_encrypted_pw := crypt(p_password, gen_salt('bf'));

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    is_super_admin
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_uid,
    'authenticated',
    'authenticated',
    v_email,
    v_encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'full_name', 'Member ' || right(v_canonical, 4),
      'phone', v_clean_phone,
      'referral_code', upper(trim(coalesce(p_referral_code, '')))
    ),
    now(),
    now(),
    '',
    '',
    '',
    '',
    false
  );

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    v_uid,
    v_uid::text,
    jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
    'email',
    now(),
    now(),
    now()
  );

  return jsonb_build_object('ok', true, 'email', v_email, 'user_id', v_uid);
end;
$$;

grant execute on function public.register_phone_user(text, text, text) to anon, authenticated;

-- 3.2 Phone Login Prep RPC (Resolves phone variants & confirms legacy synthetic accounts)
create or replace function public.prepare_phone_login(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_clean text := trim(coalesce(p_phone, ''));
  v_digits text := regexp_replace(v_clean, '[^0-9]', '', 'g');
  v_canonical text;
  v_default_email text;
  v_alt_email text;
  v_found_id uuid;
  v_found_email text;
begin
  if v_digits like '880%' and length(v_digits) = 13 then
    v_canonical := '0' || substr(v_digits, 4);
  else
    v_canonical := v_digits;
  end if;

  v_default_email := 'u' || v_canonical || '@scania-member.com';
  v_alt_email := 'u' || v_digits || '@scania-member.com';

  select id, email into v_found_id, v_found_email
  from auth.users
  where email in (v_default_email, v_alt_email)
  limit 1;

  if v_found_id is null then
    select u.id, u.email into v_found_id, v_found_email
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.phone in (v_clean, v_digits, v_canonical, '+' || v_digits)
    limit 1;
  end if;

  if v_found_id is not null and coalesce(v_found_email, '') like '%@scania-member.com' then
    update auth.users
    set email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    where id = v_found_id
      and email_confirmed_at is null;
  end if;

  return jsonb_build_object('email', coalesce(v_found_email, v_default_email));
end;
$$;

grant execute on function public.prepare_phone_login(text) to anon, authenticated;

-- 4. SECURE RPC PROCEDURES (Atomic Business Logic)

-- 4.1 User purchases a Demo Plan
create or replace function public.purchase_demo_plan(p_plan_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_plan public.plans%rowtype;
  v_product_id uuid;
  v_ref record;
  v_comm numeric(14, 2);
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if not found or not v_profile.is_active then
    raise exception 'Account is inactive or missing';
  end if;

  select * into v_plan from public.plans where id = p_plan_id and is_active = true;
  if not found then
    raise exception 'Selected demo plan is unavailable';
  end if;

  if v_profile.demo_balance < v_plan.demo_price then
    raise exception 'Insufficient demo balance';
  end if;

  update public.profiles
  set demo_balance = demo_balance - v_plan.demo_price,
      updated_at = now()
  where id = v_uid;

  insert into public.demo_user_products (
    user_id, plan_id, plan_title, demo_price, daily_income, validity_days, expires_at
  ) values (
    v_uid, v_plan.id, v_plan.title, v_plan.demo_price, v_plan.daily_income, v_plan.validity_days,
    now() + (v_plan.validity_days || ' days')::interval
  ) returning id into v_product_id;

  insert into public.demo_transactions (
    user_id, type, amount, method, reference_code, status, admin_note
  ) values (
    v_uid, 'plan_purchase', v_plan.demo_price, 'Demo Wallet', v_plan.title, 'completed', 'Simulated demo plan activated'
  );

  -- Distribute simulated commissions across L2/L3 (L1 25% is distributed on deposit approval)
  for v_ref in
    select * from public.referral_records where referred_user_id = v_uid and level > 1
  loop
    v_comm := round((v_plan.demo_price * v_ref.commission_rate) / 100.0, 2);
    if v_comm > 0 then
      update public.referral_records
      set simulated_commission = simulated_commission + v_comm
      where id = v_ref.id;

      update public.profiles
      set demo_balance = demo_balance + v_comm,
          updated_at = now()
      where id = v_ref.referrer_id;

      insert into public.demo_transactions (
        user_id, type, amount, method, reference_code, status, admin_note
      ) values (
        v_ref.referrer_id, 'referral_commission', v_comm, 'Level ' || v_ref.level || ' Referral', v_profile.scania_id, 'completed', 'Simulated referral commission'
      );
    end if;
  end loop;

  return jsonb_build_object('success', true, 'product_id', v_product_id);
end;
$$;

-- 4.2 User redeems a Bonus Code
create or replace function public.redeem_bonus_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_bonus public.bonus_codes%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_bonus
  from public.bonus_codes
  where upper(code) = upper(trim(p_code))
    and is_active = true
    and (expires_at is null or expires_at > now())
  for update;

  if not found then
    raise exception 'Invalid or expired bonus code';
  end if;

  if v_bonus.used_count >= v_bonus.usage_limit then
    raise exception 'Bonus code usage limit reached';
  end if;

  if exists (select 1 from public.bonus_redemptions where bonus_code_id = v_bonus.id and user_id = v_uid) then
    raise exception 'You have already redeemed this bonus code';
  end if;

  insert into public.bonus_redemptions (bonus_code_id, user_id, amount)
  values (v_bonus.id, v_uid, v_bonus.bonus_amount);

  update public.bonus_codes
  set used_count = used_count + 1
  where id = v_bonus.id;

  update public.profiles
  set demo_balance = demo_balance + v_bonus.bonus_amount,
      demo_bonus = demo_bonus + v_bonus.bonus_amount,
      updated_at = now()
  where id = v_uid;

  insert into public.demo_transactions (
    user_id, type, amount, method, reference_code, status, admin_note
  ) values (
    v_uid, 'bonus_code', v_bonus.bonus_amount, 'Bonus Code', v_bonus.code, 'completed', 'Simulated demo bonus credited'
  );

  return jsonb_build_object('success', true, 'amount', v_bonus.bonus_amount);
end;
$$;

-- 4.3 User submits Deposit or Withdraw Request (deducts balance immediately on withdraw)
create or replace function public.request_demo_transaction(
  p_type text,
  p_amount numeric,
  p_method text,
  p_reference_code text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_tx_id uuid;
  v_amount numeric(14, 2) := round(p_amount, 2);
  v_note text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_type not in ('deposit_demo', 'withdraw_demo') then
    raise exception 'Invalid transaction type';
  end if;

  if v_amount <= 0 or v_amount > 1000000 then
    raise exception 'Invalid amount';
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if not found or not v_profile.is_active then
    raise exception 'Account is inactive or missing';
  end if;

  if p_type = 'withdraw_demo' then
    if v_amount < 150 then
      raise exception 'Minimum withdrawal is 150';
    end if;
    if v_profile.demo_balance < v_amount then
      raise exception 'Insufficient balance';
    end if;

    update public.profiles
    set demo_balance = demo_balance - v_amount,
        updated_at = now()
    where id = v_uid;

    v_note := '5% চার্জ: ৳' || round(v_amount * 0.05, 2) || ' · প্রাপ্তি: ৳' || round(v_amount * 0.95, 2);
  else
    if v_amount < 500 then
      raise exception 'Minimum deposit is 500';
    end if;
    v_note := 'আপনার পেমেন্টটি পর্যালোচনায় রয়েছে';
  end if;

  insert into public.demo_transactions (
    user_id, type, amount, method, reference_code, status, admin_note
  ) values (
    v_uid, p_type, v_amount, coalesce(nullif(trim(p_method), ''), 'bKash'), coalesce(trim(p_reference_code), ''), 'pending', v_note
  ) returning id into v_tx_id;

  return jsonb_build_object('success', true, 'id', v_tx_id);
end;
$$;

grant execute on function public.request_demo_transaction(text, numeric, text, text) to authenticated;

-- 4.4 Admin processes a Deposit or Withdraw Request
create or replace function public.admin_process_transaction(
  p_tx_id uuid,
  p_decision text,
  p_admin_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tx public.demo_transactions%rowtype;
begin
  if not public.is_admin(v_uid) then
    raise exception 'Admin privileges required';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  select * into v_tx from public.demo_transactions where id = p_tx_id for update;
  if not found then
    raise exception 'Transaction not found';
  end if;

  if v_tx.status <> 'pending' then
    raise exception 'Transaction already processed';
  end if;

  if p_decision = 'approved' and v_tx.type = 'deposit_demo' then
    update public.profiles
    set demo_balance = demo_balance + v_tx.amount,
        updated_at = now()
    where id = v_tx.user_id;

    -- Distribute 25% Level 1 Referral Commission upon deposit confirmation
    declare
      v_depositor public.profiles%rowtype;
      v_comm numeric(14, 2);
    begin
      select * into v_depositor from public.profiles where id = v_tx.user_id;
      if v_depositor.referred_by is not null then
        v_comm := round(v_tx.amount * 0.25, 2);
        if v_comm > 0 then
          update public.profiles
          set demo_balance = demo_balance + v_comm,
              updated_at = now()
          where id = v_depositor.referred_by;

          insert into public.referral_records (referrer_id, referred_user_id, level, commission_rate, simulated_commission)
          values (v_depositor.referred_by, v_tx.user_id, 1, 25.00, v_comm)
          on conflict (referrer_id, referred_user_id) do update
          set simulated_commission = referral_records.simulated_commission + v_comm;

          insert into public.demo_transactions (
            user_id, type, amount, method, reference_code, status, admin_note
          ) values (
            v_depositor.referred_by, 'referral_commission', v_comm, 'লেভেল 1 রেফারেল (25%)', v_depositor.scania_id, 'completed', v_depositor.full_name || ' এর রিচার্জ থেকে 25% কমিশন'
          );

          insert into public.notifications (user_id, title, message, category)
          values (
            v_depositor.referred_by,
            'টিম কমিশন যুক্ত হয়েছে (25%)',
            v_depositor.full_name || ' এর ' || v_tx.amount || ' টাকা রিচার্জ কনফার্ম হওয়ায় ' || v_comm || ' টাকা কমিশন আপনার ব্যালেন্সে যোগ হয়েছে।',
            'bonus'
          );
        end if;
      end if;
    end;
  elsif p_decision = 'rejected' and v_tx.type = 'withdraw_demo' then
    -- Refund deducted withdrawal amount when rejected
    update public.profiles
    set demo_balance = demo_balance + v_tx.amount,
        updated_at = now()
    where id = v_tx.user_id;
  end if;

  update public.demo_transactions
  set status = p_decision,
      admin_note = coalesce(p_admin_note, ''),
      processed_by = v_uid,
      updated_at = now()
  where id = p_tx_id;

  insert into public.notifications (user_id, title, message, category)
  values (
    v_tx.user_id,
    case
      when p_decision = 'approved' and v_tx.type = 'deposit_demo' then 'আপনার রিচার্জ সফল হয়েছে'
      when p_decision = 'approved' and v_tx.type = 'withdraw_demo' then 'আপনার উত্তোলন সফল হয়েছে'
      when p_decision = 'rejected' and v_tx.type = 'deposit_demo' then 'আপনার রিচার্জ ব্যর্থ হয়েছে'
      else 'আপনার উত্তোলন বাতিল ও ব্যালেন্স ফেরত দেওয়া হয়েছে'
    end,
    v_tx.amount || ' টাকা (' || replace(v_tx.type, '_demo', '') || ') ' || p_decision || '.' ||
      case when coalesce(p_admin_note, '') <> '' then ' নোট: ' || p_admin_note else '' end,
    'transaction'
  );

  insert into public.admin_audit_logs (admin_id, action, target_table, target_id, details)
  values (
    v_uid,
    'process_' || v_tx.type || '_' || p_decision,
    'demo_transactions',
    p_tx_id::text,
    jsonb_build_object('amount', v_tx.amount, 'note', p_admin_note)
  );

  return jsonb_build_object('success', true, 'status', p_decision);
end;
$$;

-- 5. ENABLE ROW LEVEL SECURITY (RLS)

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.plans enable row level security;
alter table public.demo_transactions enable row level security;
alter table public.demo_user_products enable row level security;
alter table public.referral_records enable row level security;
alter table public.bonus_codes enable row level security;
alter table public.bonus_redemptions enable row level security;
alter table public.announcements enable row level security;
alter table public.banners enable row level security;
alter table public.site_settings enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Profiles Policies
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
drop policy if exists "Users can update own safe profile fields" on public.profiles;
create policy "Users can update own safe profile fields" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);
drop policy if exists "Admins can manage all profiles" on public.profiles;
create policy "Admins can manage all profiles" on public.profiles
  for all using (public.is_admin());

-- User Roles Policies
drop policy if exists "Users can read own role" on public.user_roles;
create policy "Users can read own role" on public.user_roles
  for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "Only admins can modify roles" on public.user_roles;
create policy "Only admins can modify roles" on public.user_roles
  for all using (public.is_admin());

-- Plans Policies (Public read active; Admin full control)
drop policy if exists "Anyone can view active plans" on public.plans;
create policy "Anyone can view active plans" on public.plans
  for select using (is_active = true or public.is_admin());
drop policy if exists "Admins manage plans" on public.plans;
create policy "Admins manage plans" on public.plans
  for all using (public.is_admin());

-- Demo Transactions Policies
drop policy if exists "Users view own transactions" on public.demo_transactions;
create policy "Users view own transactions" on public.demo_transactions
  for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "Users create pending demo requests" on public.demo_transactions;
create policy "Users create pending demo requests" on public.demo_transactions
  for insert with check (
    auth.uid() = user_id
    and type in ('deposit_demo', 'withdraw_demo')
    and status = 'pending'
  );
drop policy if exists "Admins manage transactions" on public.demo_transactions;
create policy "Admins manage transactions" on public.demo_transactions
  for all using (public.is_admin());

-- Demo User Products Policies
drop policy if exists "Users view own demo products" on public.demo_user_products;
create policy "Users view own demo products" on public.demo_user_products
  for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "Admins manage user products" on public.demo_user_products;
create policy "Admins manage user products" on public.demo_user_products
  for all using (public.is_admin());

-- Referral Records Policies
drop policy if exists "Users view own referral network" on public.referral_records;
create policy "Users view own referral network" on public.referral_records
  for select using (auth.uid() = referrer_id or auth.uid() = referred_user_id or public.is_admin());
drop policy if exists "Admins manage referral records" on public.referral_records;
create policy "Admins manage referral records" on public.referral_records
  for all using (public.is_admin());

-- Bonus Codes Policies
drop policy if exists "Authenticated users read active bonus codes" on public.bonus_codes;
create policy "Authenticated users read active bonus codes" on public.bonus_codes
  for select using ((is_active = true and auth.uid() is not null) or public.is_admin());
drop policy if exists "Admins manage bonus codes" on public.bonus_codes;
create policy "Admins manage bonus codes" on public.bonus_codes
  for all using (public.is_admin());

-- Bonus Redemptions
drop policy if exists "Users view own bonus redemptions" on public.bonus_redemptions;
create policy "Users view own bonus redemptions" on public.bonus_redemptions
  for select using (auth.uid() = user_id or public.is_admin());

-- Announcements Policies
drop policy if exists "Anyone reads published announcements" on public.announcements;
create policy "Anyone reads published announcements" on public.announcements
  for select using (is_published = true or public.is_admin());
drop policy if exists "Admins manage announcements" on public.announcements;
create policy "Admins manage announcements" on public.announcements
  for all using (public.is_admin());

-- Banners Policies
drop policy if exists "Anyone reads active banners" on public.banners;
create policy "Anyone reads active banners" on public.banners
  for select using (is_active = true or public.is_admin());
drop policy if exists "Admins manage banners" on public.banners;
create policy "Admins manage banners" on public.banners
  for all using (public.is_admin());

-- Site Settings Policies
drop policy if exists "Anyone reads site settings" on public.site_settings;
create policy "Anyone reads site settings" on public.site_settings
  for select using (true);
drop policy if exists "Admins update site settings" on public.site_settings;
create policy "Admins update site settings" on public.site_settings
  for all using (public.is_admin());

-- Support Tickets & Messages Policies
drop policy if exists "Users view own tickets" on public.support_tickets;
create policy "Users view own tickets" on public.support_tickets
  for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "Users create own tickets" on public.support_tickets;
create policy "Users create own tickets" on public.support_tickets
  for insert with check (auth.uid() = user_id);
drop policy if exists "Admins manage all tickets" on public.support_tickets;
create policy "Admins manage all tickets" on public.support_tickets
  for all using (public.is_admin());

drop policy if exists "Users view messages on own tickets" on public.support_messages;
create policy "Users view messages on own tickets" on public.support_messages
  for select using (
    public.is_admin()
    or exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );
drop policy if exists "Users send messages on own tickets" on public.support_messages;
create policy "Users send messages on own tickets" on public.support_messages
  for insert with check (
    sender_id = auth.uid()
    and (
      public.is_admin()
      or (sender_role = 'user' and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid()))
    )
  );

-- Notifications Policies
drop policy if exists "Users read own or broadcast notifications" on public.notifications;
create policy "Users read own or broadcast notifications" on public.notifications
  for select using (user_id is null or auth.uid() = user_id or public.is_admin());
drop policy if exists "Users mark own notifications read" on public.notifications;
create policy "Users mark own notifications read" on public.notifications
  for update using (auth.uid() = user_id);
drop policy if exists "Admins manage notifications" on public.notifications;
create policy "Admins manage notifications" on public.notifications
  for all using (public.is_admin());

drop policy if exists "Users manage own read receipts" on public.notification_reads;
create policy "Users manage own read receipts" on public.notification_reads
  for all using (auth.uid() = user_id or public.is_admin());

-- Audit Logs Policies (Admin read/insert only)
drop policy if exists "Admins view audit logs" on public.admin_audit_logs;
create policy "Admins view audit logs" on public.admin_audit_logs
  for select using (public.is_admin());
drop policy if exists "Admins insert audit logs" on public.admin_audit_logs;
create policy "Admins insert audit logs" on public.admin_audit_logs
  for insert with check (public.is_admin());

-- 6. REALTIME PUBLICATION
-- Ensures live synchronization between Admin changes and User Panel clients
do $$
begin
  alter publication supabase_realtime add table
    public.plans,
    public.announcements,
    public.banners,
    public.site_settings,
    public.notifications,
    public.demo_transactions,
    public.demo_user_products,
    public.referral_records,
    public.support_tickets,
    public.support_messages,
    public.profiles,
    public.bonus_codes;
exception when others then
  null;
end $$;

-- 7. STORAGE BUCKET FOR BANNERS & PLAN IMAGES
insert into storage.buckets (id, name, public)
values ('scania-media', 'scania-media', true)
on conflict (id) do nothing;

drop policy if exists "Public read scania-media" on storage.objects;
create policy "Public read scania-media" on storage.objects
  for select using (bucket_id = 'scania-media');
drop policy if exists "Admins upload scania-media" on storage.objects;
create policy "Admins upload scania-media" on storage.objects
  for insert with check (bucket_id = 'scania-media' and public.is_admin());
drop policy if exists "Admins delete scania-media" on storage.objects;
create policy "Admins delete scania-media" on storage.objects
  for delete using (bucket_id = 'scania-media' and public.is_admin());

-- 8. INITIAL SEED DATA

insert into public.site_settings (id) values (1)
on conflict (id) do nothing;

update public.plans
set is_active = false
where title in ('Scania Premium Plan', 'Scania Business Plan', 'Scania Elite Plan');

insert into public.plans (title, subtitle, description, image_url, demo_price, daily_income, validity_days, total_return, badge, is_active, sort_order)
select * from (values
  ('SCANIA V-1', 'SC-V1 Edition', 'মূল্য 500 টাকা · দৈনিক আয় 75 টাকা · মেয়াদ 105 দিন', '/assets/aistudio/sddefault_8b5dd3b7.jpg', 500.00, 75.00, 105, null::numeric, 'Popular', true, 1),
  ('SCANIA V2', 'SC-V2 Edition', 'মূল্য 800 টাকা · দৈনিক আয় 132 টাকা · মেয়াদ 60 দিন', '/assets/aistudio/Scania-Pick-up-2025-04-01-at-2.14.20_PM_d711a23d.jpg', 800.00, 132.00, 60, null::numeric, 'Hot', true, 2),
  ('SCANIA V3', 'SC-V3 Edition', 'মূল্য 1,700 টাকা · দৈনিক আয় 261 টাকা · মেয়াদ 90 দিন', '/assets/aistudio/images__1___8__699f6d70.jpeg', 1700.00, 261.00, 90, null::numeric, 'Best', true, 3),
  ('SCANIA V4', 'SC-V4 Edition', 'মূল্য 3,300 টাকা · দৈনিক আয় 503 টাকা · মেয়াদ 80 দিন', '/assets/aistudio/sddefault__1__7c876ca8.jpg', 3300.00, 503.00, 80, null::numeric, 'Pro', true, 4),
  ('SCANIA V5', 'SC-V5 Edition', 'মূল্য 4,100 টাকা · দৈনিক আয় 684 টাকা · মেয়াদ 200 দিন', '/assets/aistudio/sddefault__2__cc9acb8a.jpg', 4100.00, 684.00, 200, null::numeric, 'VIP', true, 5),
  ('SCANIA V7', 'SC-V7 Flagship', 'মূল্য 10,000 টাকা · দৈনিক আয় 2,200 টাকা · মেয়াদ 145 দিন · মোট রিটার্ন 66,000 টাকা', '/assets/aistudio/sddefault_8b5dd3b7.jpg', 10000.00, 2200.00, 145, 66000.00, 'Elite', true, 6)
) as seed(title, subtitle, description, image_url, demo_price, daily_income, validity_days, total_return, badge, is_active, sort_order)
where not exists (select 1 from public.plans where title = 'SCANIA V-1');

insert into public.announcements (title, content, priority, is_published)
select * from (values
  ('Welcome to Scania Demo Platform!', 'Explore simulated fleet plans, test bonus codes, and track real-time updates across your demo portfolio. Note: All figures are simulated demo data.', 'important', true),
  ('Simulated Commission Tiers Active', 'Demo referral modeling is active for Level 1 (25%), Level 2 (2%), and Level 3 (1%) simulated rewards.', 'normal', true)
) as seed(title, content, priority, is_published)
where not exists (select 1 from public.announcements);

insert into public.bonus_codes (code, description, bonus_amount, usage_limit, is_active)
values
  ('SCANIA50', 'Welcome simulated demo bonus credit', 50.00, 1000, true),
  ('FLEET2026', 'Fleet simulation promotional demo credit', 100.00, 500, true)
on conflict (code) do nothing;
