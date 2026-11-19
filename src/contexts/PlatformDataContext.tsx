import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  AdminAuditLog,
  Announcement,
  AppNotification,
  BankCard,
  Banner,
  BonusCode,
  DemoPlan,
  DemoTransaction,
  DemoUserProduct,
  Profile,
  ReferralRecord,
  SiteSettings,
  SupportMessage,
  SupportTicket,
} from '../types/database';
import {
  PREVIEW_ANNOUNCEMENTS,
  PREVIEW_BANNERS,
  PREVIEW_BONUS_CODES,
  PREVIEW_NOTIFICATIONS,
  PREVIEW_PLANS,
  PREVIEW_REFERRALS,
  PREVIEW_SITE_SETTINGS,
  PREVIEW_TICKETS,
  PREVIEW_TRANSACTIONS,
  PREVIEW_USER_PRODUCTS,
  PREVIEW_USER_PROFILE,
} from '../data/previewFallback';
import { useAuth } from './AuthContext';

interface PlatformDataContextValue {
  siteSettings: SiteSettings;
  plans: DemoPlan[];
  announcements: Announcement[];
  banners: Banner[];
  notifications: AppNotification[];
  readNotificationIds: string[];
  bankCard: BankCard | null;
  userTransactions: DemoTransaction[];
  userProducts: DemoUserProduct[];
  userReferrals: ReferralRecord[];
  userTickets: SupportTicket[];
  // Admin collections
  allProfiles: Profile[];
  allTransactions: DemoTransaction[];
  allUserProducts: DemoUserProduct[];
  allBankCards: Record<string, BankCard>;
  allBonusCodes: BonusCode[];
  allReferrals: ReferralRecord[];
  allTickets: SupportTicket[];
  auditLogs: AdminAuditLog[];
  ticketMessages: Record<string, SupportMessage[]>;
  realtimeStatus: 'connected' | 'connecting' | 'preview';
  loadingData: boolean;
  refreshAll: () => Promise<void>;
  loadTicketMessages: (ticketId: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
}

const PlatformDataContext = createContext<PlatformDataContextValue>({
  siteSettings: PREVIEW_SITE_SETTINGS,
  plans: [],
  announcements: [],
  banners: [],
  notifications: [],
  readNotificationIds: [],
  bankCard: null,
  userTransactions: [],
  userProducts: [],
  userReferrals: [],
  userTickets: [],
  allProfiles: [],
  allTransactions: [],
  allUserProducts: [],
  allBankCards: {},
  allBonusCodes: [],
  allReferrals: [],
  allTickets: [],
  auditLogs: [],
  ticketMessages: {},
  realtimeStatus: 'preview',
  loadingData: false,
  refreshAll: async () => {},
  loadTicketMessages: async () => {},
  markNotificationRead: async () => {},
});

export const usePlatformData = () => useContext(PlatformDataContext);

export const PlatformDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, isPreviewMode, refreshProfile } = useAuth();

  const [siteSettings, setSiteSettings] = useState<SiteSettings>(PREVIEW_SITE_SETTINGS);
  const [plans, setPlans] = useState<DemoPlan[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [bankCard, setBankCard] = useState<BankCard | null>(null);

  const [userTransactions, setUserTransactions] = useState<DemoTransaction[]>([]);
  const [userProducts, setUserProducts] = useState<DemoUserProduct[]>([]);
  const [userReferrals, setUserReferrals] = useState<ReferralRecord[]>([]);
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);

  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [allTransactions, setAllTransactions] = useState<DemoTransaction[]>([]);
  const [allUserProducts, setAllUserProducts] = useState<DemoUserProduct[]>([]);
  const [allBankCards, setAllBankCards] = useState<Record<string, BankCard>>({});
  const [allBonusCodes, setAllBonusCodes] = useState<BonusCode[]>([]);
  const [allReferrals, setAllReferrals] = useState<ReferralRecord[]>([]);
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [ticketMessages, setTicketMessages] = useState<Record<string, SupportMessage[]>>({});

  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'connecting' | 'preview'>(
    isSupabaseConfigured ? 'connecting' : 'preview'
  );
  const [loadingData, setLoadingData] = useState<boolean>(isSupabaseConfigured);

  const fetchServerUserState = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/user/state', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return (await res.json()) as {
        bankCard?: BankCard | null;
        transactions?: DemoTransaction[];
        userProducts?: DemoUserProduct[];
        notifications?: AppNotification[];
        referrals?: ReferralRecord[];
      };
    } catch {
      return null;
    }
  }, []);

  const fetchPublicAndUser = useCallback(async (silent = false) => {
    // 1. Always check Express server-synced site settings / plans / announcements / banners
    let serverPublic: {
      siteSettings?: SiteSettings | null;
      announcements?: Announcement[] | null;
      plans?: DemoPlan[] | null;
      banners?: Banner[] | null;
    } = {};
    try {
      const pubRes = await fetch('/api/public/site-data', { cache: 'no-store' });
      const pubType = pubRes.headers.get('content-type') || '';
      if (pubRes.ok && pubType.includes('application/json')) {
        serverPublic = (await pubRes.json()) as typeof serverPublic;
      }
    } catch {
      // Ignore if static host
    }

    const serverToken =
      typeof window !== 'undefined' ? window.sessionStorage.getItem('scania_server_token') : null;
    const adminToken =
      typeof window !== 'undefined' ? window.sessionStorage.getItem('scania_admin_token') : null;

    if (!isSupabaseConfigured || !supabase) {
      setSiteSettings(serverPublic.siteSettings || PREVIEW_SITE_SETTINGS);
      setPlans(serverPublic.plans && serverPublic.plans.length > 0 ? serverPublic.plans : PREVIEW_PLANS);
      setAnnouncements(
        serverPublic.announcements && serverPublic.announcements.length > 0
          ? serverPublic.announcements
          : PREVIEW_ANNOUNCEMENTS
      );
      setBanners(
        serverPublic.banners && serverPublic.banners.length > 0 ? serverPublic.banners : PREVIEW_BANNERS
      );

      if (serverToken) {
        const srvState = await fetchServerUserState(serverToken);
        if (srvState) {
          setBankCard(srvState.bankCard || null);
          setUserTransactions(srvState.transactions || []);
          setUserProducts(srvState.userProducts || []);
          setUserReferrals(srvState.referrals || []);
          setNotifications(
            srvState.notifications && srvState.notifications.length > 0
              ? srvState.notifications
              : PREVIEW_NOTIFICATIONS
          );
        }
      } else {
        setNotifications(PREVIEW_NOTIFICATIONS);
        setUserTransactions(PREVIEW_TRANSACTIONS);
        setUserProducts(PREVIEW_USER_PRODUCTS);
        setUserReferrals(PREVIEW_REFERRALS);
      }

      if (isAdmin && adminToken) {
        try {
          const adminRes = await fetch('/api/admin/state', {
            headers: { Authorization: `Bearer ${adminToken}` },
            cache: 'no-store',
          });
          if (adminRes.ok) {
            const adminData = (await adminRes.json()) as {
              profiles?: Profile[];
              transactions?: DemoTransaction[];
              referrals?: ReferralRecord[];
              userProducts?: DemoUserProduct[];
              bankCards?: Record<string, BankCard>;
              bonusCodes?: BonusCode[];
              plans?: DemoPlan[];
              announcements?: Announcement[];
              banners?: Banner[];
              siteSettings?: SiteSettings | null;
            };
            if (adminData.profiles) setAllProfiles(adminData.profiles);
            if (adminData.transactions) setAllTransactions(adminData.transactions);
            if (adminData.referrals) setAllReferrals(adminData.referrals);
            if (adminData.userProducts) setAllUserProducts(adminData.userProducts);
            if (adminData.bankCards) setAllBankCards(adminData.bankCards);
            if (adminData.bonusCodes) setAllBonusCodes(adminData.bonusCodes);
            if (adminData.plans && adminData.plans.length > 0) setPlans(adminData.plans);
            if (adminData.announcements) setAnnouncements(adminData.announcements);
            if (adminData.banners) setBanners(adminData.banners);
            if (adminData.siteSettings) setSiteSettings(adminData.siteSettings);
          }
        } catch {
          // Ignore
        }
      } else {
        setUserTickets(PREVIEW_TICKETS);
        setAllProfiles([PREVIEW_USER_PROFILE]);
        setAllTransactions(PREVIEW_TRANSACTIONS);
        setAllBonusCodes(PREVIEW_BONUS_CODES);
        setAllReferrals(PREVIEW_REFERRALS);
        setAllTickets(PREVIEW_TICKETS);
      }
      setLoadingData(false);
      setRealtimeStatus('connected');
      return;
    }

    if (!silent) setLoadingData(true);
    try {
      const [settingsRes, plansRes, annRes, bannersRes] = await Promise.all([
        supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('plans').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }),
        supabase.from('banners').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
      ]);

      const dbSettings = settingsRes.data as SiteSettings | null;
      const srvSettings = serverPublic.siteSettings || null;
      if (dbSettings && srvSettings) {
        setSiteSettings(
          new Date(srvSettings.updated_at).getTime() >= new Date(dbSettings.updated_at).getTime()
            ? srvSettings
            : dbSettings
        );
      } else {
        setSiteSettings(srvSettings || dbSettings || PREVIEW_SITE_SETTINGS);
      }

      setPlans(
        plansRes.data && plansRes.data.length > 0
          ? (plansRes.data as DemoPlan[])
          : serverPublic.plans && serverPublic.plans.length > 0
          ? serverPublic.plans
          : PREVIEW_PLANS
      );
      setAnnouncements(
        annRes.data && annRes.data.length > 0
          ? (annRes.data as Announcement[])
          : serverPublic.announcements && serverPublic.announcements.length > 0
          ? serverPublic.announcements
          : PREVIEW_ANNOUNCEMENTS
      );
      if (bannersRes.data && bannersRes.data.length > 0) {
        setBanners(bannersRes.data as Banner[]);
      } else if (serverPublic.banners) {
        setBanners(serverPublic.banners);
      }

      if (user?.id) {
        if (serverToken) {
          const srvState = await fetchServerUserState(serverToken);
          if (srvState) {
            setBankCard(srvState.bankCard || null);
            setUserTransactions(srvState.transactions || []);
            setUserProducts(srvState.userProducts || []);
            setUserReferrals(srvState.referrals || []);
            setNotifications(
              srvState.notifications && srvState.notifications.length > 0
                ? srvState.notifications
                : PREVIEW_NOTIFICATIONS
            );
          }
        } else {
          const { data: sessionData } = await supabase.auth.getSession();
          const sbToken = sessionData.session?.access_token;
          const [txRes, prodRes, refRes, notifRes, readsRes, ticketsRes, srvState] = await Promise.all([
            supabase.from('demo_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
            supabase.from('demo_user_products').select('*').eq('user_id', user.id).order('started_at', { ascending: false }),
            supabase
              .from('referral_records')
              .select('*, referred:profiles!referral_records_referred_user_id_fkey(id, full_name, scania_id, email, tier, created_at)')
              .eq('referrer_id', user.id)
              .order('created_at', { ascending: false }),
            supabase.from('notifications').select('*').or(`user_id.eq.${user.id},user_id.is.null`).order('created_at', { ascending: false }),
            supabase.from('notification_reads').select('notification_id').eq('user_id', user.id),
            supabase.from('support_tickets').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
            sbToken ? fetchServerUserState(sbToken) : Promise.resolve(null),
          ]);

          setBankCard(srvState?.bankCard || null);
          if (txRes.data) setUserTransactions(txRes.data as DemoTransaction[]);
          else if (srvState?.transactions) setUserTransactions(srvState.transactions);

          if (prodRes.data) setUserProducts(prodRes.data as DemoUserProduct[]);
          else if (srvState?.userProducts) setUserProducts(srvState.userProducts);

          if (refRes.data) setUserReferrals(refRes.data as unknown as ReferralRecord[]);
          if (notifRes.data && notifRes.data.length > 0) {
            setNotifications(notifRes.data as AppNotification[]);
          } else if (srvState?.notifications && srvState.notifications.length > 0) {
            setNotifications(srvState.notifications);
          } else {
            setNotifications(PREVIEW_NOTIFICATIONS);
          }
          if (readsRes.data) setReadNotificationIds(readsRes.data.map((r) => r.notification_id));
          if (ticketsRes.data) setUserTickets(ticketsRes.data as SupportTicket[]);
        }
      } else {
        setBankCard(null);
        setUserTransactions([]);
        setUserProducts([]);
        setNotifications(PREVIEW_NOTIFICATIONS);
      }

      if (isAdmin) {
        const adminToken =
          typeof window !== 'undefined' ? window.sessionStorage.getItem('scania_admin_token') : null;

        if (adminToken) {
          try {
            const adminRes = await fetch('/api/admin/state', {
              headers: { Authorization: `Bearer ${adminToken}` },
              cache: 'no-store',
            });
            if (adminRes.ok) {
              const adminData = (await adminRes.json()) as {
                profiles?: Profile[];
                transactions?: DemoTransaction[];
                referrals?: ReferralRecord[];
                userProducts?: DemoUserProduct[];
                bankCards?: Record<string, BankCard>;
                bonusCodes?: BonusCode[];
                plans?: DemoPlan[];
                announcements?: Announcement[];
                banners?: Banner[];
                siteSettings?: SiteSettings | null;
              };
              if (adminData.profiles) setAllProfiles(adminData.profiles);
              if (adminData.transactions) setAllTransactions(adminData.transactions);
              if (adminData.referrals) setAllReferrals(adminData.referrals);
              if (adminData.userProducts) setAllUserProducts(adminData.userProducts);
              if (adminData.bankCards) setAllBankCards(adminData.bankCards);
              if (adminData.bonusCodes) setAllBonusCodes(adminData.bonusCodes);
              if (adminData.plans && adminData.plans.length > 0) setPlans(adminData.plans);
              if (adminData.announcements) setAnnouncements(adminData.announcements);
              if (adminData.banners) setBanners(adminData.banners);
              if (adminData.siteSettings) setSiteSettings(adminData.siteSettings);
            }
          } catch {
            // Ignore network error
          }
        } else {
          const [profRes, allTxRes, allProdRes, bonusRes, allRefRes, allTicketsRes, logsRes] = await Promise.all([
            supabase.from('profiles').select('*').order('created_at', { ascending: false }),
            supabase
              .from('demo_transactions')
              .select('*, profiles:profiles!demo_transactions_user_id_fkey(full_name, scania_id, email)')
              .order('created_at', { ascending: false }),
            supabase.from('demo_user_products').select('*').order('started_at', { ascending: false }),
            supabase.from('bonus_codes').select('*').order('created_at', { ascending: false }),
            supabase
              .from('referral_records')
              .select(
                '*, referred:profiles!referral_records_referred_user_id_fkey(id, full_name, scania_id, email, tier, created_at), referrer:profiles!referral_records_referrer_id_fkey(id, full_name, scania_id)'
              )
              .order('created_at', { ascending: false }),
            supabase
              .from('support_tickets')
              .select('*, profiles:profiles!support_tickets_user_id_fkey(full_name, scania_id, email)')
              .order('updated_at', { ascending: false }),
            supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
          ]);

          if (profRes.data) setAllProfiles(profRes.data as Profile[]);
          if (allTxRes.data) setAllTransactions(allTxRes.data as unknown as DemoTransaction[]);
          if (allProdRes.data) setAllUserProducts(allProdRes.data as DemoUserProduct[]);
          if (bonusRes.data) setAllBonusCodes(bonusRes.data as BonusCode[]);
          if (allRefRes.data) setAllReferrals(allRefRes.data as unknown as ReferralRecord[]);
          if (allTicketsRes.data) setAllTickets(allTicketsRes.data as unknown as SupportTicket[]);
          if (logsRes.data) setAuditLogs(logsRes.data as AdminAuditLog[]);
        }
      }
    } finally {
      setLoadingData(false);
    }
  }, [user?.id, isAdmin, fetchServerUserState]);

  useEffect(() => {
    fetchPublicAndUser();
  }, [fetchPublicAndUser]);

  // Real-time SSE stream + Cloudflare/workers.dev resilient 4s polling & focus sync
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let es: EventSource | null = null;
    if (typeof EventSource !== 'undefined') {
      es = new EventSource('/api/events');
      es.addEventListener('connected', () => {
        setRealtimeStatus('connected');
      });
      es.addEventListener('refresh', () => {
        void fetchPublicAndUser(true);
        void refreshProfile();
      });
    }

    const syncNow = () => {
      if (document.visibilityState === 'visible') {
        void fetchPublicAndUser(true);
        void refreshProfile();
      }
    };

    const interval = window.setInterval(syncNow, 4000);
    window.addEventListener('focus', syncNow);
    document.addEventListener('visibilitychange', syncNow);

    return () => {
      es?.close();
      window.clearInterval(interval);
      window.removeEventListener('focus', syncNow);
      document.removeEventListener('visibilitychange', syncNow);
    };
  }, [fetchPublicAndUser, refreshProfile]);

  // Real-time synchronization via Supabase Realtime when tables exist
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || isPreviewMode) return;

    const channel = supabase
      .channel('scania-platform-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => fetchPublicAndUser())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => fetchPublicAndUser())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => fetchPublicAndUser())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => fetchPublicAndUser())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchPublicAndUser())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demo_transactions' }, () => fetchPublicAndUser())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demo_user_products' }, () => fetchPublicAndUser())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => fetchPublicAndUser())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bonus_codes' }, () => fetchPublicAndUser())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, (payload) => {
        const msg = payload.new as SupportMessage;
        if (msg?.ticket_id) {
          setTicketMessages((prev) => {
            const list = prev[msg.ticket_id] || [];
            if (list.some((m) => m.id === msg.id)) return prev;
            return { ...prev, [msg.ticket_id]: [...list, msg] };
          });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
      });

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [fetchPublicAndUser, isPreviewMode]);

  const loadTicketMessages = useCallback(async (ticketId: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (data) {
      setTicketMessages((prev) => ({ ...prev, [ticketId]: data as SupportMessage[] }));
    }
  }, []);

  const markNotificationRead = useCallback(
    async (notificationId: string) => {
      const target = notifications.find((n) => n.id === notificationId);
      if (!target) return;

      const serverToken =
        typeof window !== 'undefined' ? window.sessionStorage.getItem('scania_server_token') : null;

      if (serverToken) {
        await fetch('/api/user/notification-read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serverToken}`,
          },
          body: JSON.stringify({ notificationId }),
        }).catch(() => {});
      } else if (supabase && user?.id && !notificationId.startsWith('preview-')) {
        if (target.user_id === user.id) {
          await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
        } else {
          await supabase
            .from('notification_reads')
            .upsert({ notification_id: notificationId, user_id: user.id }, { onConflict: 'notification_id,user_id' });
        }
      }

      setReadNotificationIds((prev) => (prev.includes(notificationId) ? prev : [...prev, notificationId]));
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
    },
    [notifications, user?.id]
  );

  return (
    <PlatformDataContext.Provider
      value={{
        siteSettings,
        plans,
        announcements,
        banners,
        notifications,
        readNotificationIds,
        bankCard,
        userTransactions,
        userProducts,
        userReferrals,
        userTickets,
        allProfiles,
        allTransactions,
        allUserProducts,
        allBankCards,
        allBonusCodes,
        allReferrals,
        allTickets,
        auditLogs,
        ticketMessages,
        realtimeStatus,
        loadingData,
        refreshAll: () => fetchPublicAndUser(false),
        loadTicketMessages,
        markNotificationRead,
      }}
    >
      {children}
    </PlatformDataContext.Provider>
  );
};
