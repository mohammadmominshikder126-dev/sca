import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getStoredAdminToken, getStoredServerToken, isSupabaseConfigured, supabase } from '../lib/supabase';
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
  PREVIEW_PLANS,
  PREVIEW_SITE_SETTINGS,
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
  const { user, isAdmin, isPreviewMode, loading: authLoading, refreshProfile } = useAuth();

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
        cache: 'no-store',
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

  const fetchAdminDirectlyFromSupabase = useCallback(async () => {
    if (!supabase) return false;
    try {
      const [profRes, allTxRes, allProdRes, bonusRes, allRefRes, allTicketsRes, logsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('demo_transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('demo_user_products').select('*').order('started_at', { ascending: false }),
        supabase.from('bonus_codes').select('*').order('created_at', { ascending: false }),
        supabase.from('referral_records').select('*').order('created_at', { ascending: false }),
        supabase.from('support_tickets').select('*').order('updated_at', { ascending: false }),
        supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
      ]);

      const profList = (!profRes.error && profRes.data ? (profRes.data as Profile[]) : []) || [];
      const profMap = new Map(profList.map((p) => [p.id, p]));

      if (!profRes.error && profRes.data) {
        setAllProfiles(profList);
      }

      if (!allTxRes.error && allTxRes.data) {
        const joinedTx = (allTxRes.data as DemoTransaction[]).map((tx) => {
          const p = profMap.get(tx.user_id);
          return p
            ? { ...tx, profiles: { full_name: p.full_name, scania_id: p.scania_id, email: p.email } }
            : tx;
        });
        setAllTransactions(joinedTx);
      }

      if (!allProdRes.error && allProdRes.data) {
        setAllUserProducts(allProdRes.data as DemoUserProduct[]);
      }

      if (!bonusRes.error && bonusRes.data) {
        setAllBonusCodes(bonusRes.data as BonusCode[]);
      }

      if (!allRefRes.error && allRefRes.data) {
        const joinedRefs = (allRefRes.data as ReferralRecord[]).map((ref) => {
          const referred = profMap.get(ref.referred_user_id);
          const referrer = profMap.get(ref.referrer_id);
          return {
            ...ref,
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
        setAllReferrals(joinedRefs);
      }

      if (!allTicketsRes.error && allTicketsRes.data) {
        const joinedTickets = (allTicketsRes.data as SupportTicket[]).map((tk) => {
          const p = profMap.get(tk.user_id);
          return p
            ? { ...tk, profiles: { full_name: p.full_name, scania_id: p.scania_id, email: p.email } }
            : tk;
        });
        setAllTickets(joinedTickets);
      }

      if (!logsRes.error && logsRes.data) {
        setAuditLogs(logsRes.data as AdminAuditLog[]);
      }

      return !profRes.error || !allTxRes.error;
    } catch {
      return false;
    }
  }, []);

  const fetchPublicAndUser = useCallback(async (silent = false) => {
    // 1. Always check backend-synced site settings / plans / announcements / banners
    let serverPublic: {
      siteSettings?: SiteSettings | null;
      announcements?: Announcement[] | null;
      plans?: DemoPlan[] | null;
      banners?: Banner[] | null;
    } = {};
    let backendOnline = false;
    try {
      const pubRes = await fetch('/api/public/site-data', { cache: 'no-store' });
      const pubType = pubRes.headers.get('content-type') || '';
      if (pubRes.ok && pubType.includes('application/json')) {
        serverPublic = (await pubRes.json()) as typeof serverPublic;
        backendOnline = true;
      }
    } catch {
      // Ignore if static host
    }

    const serverToken = getStoredServerToken();
    const adminToken = getStoredAdminToken();
    const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

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

      if (serverToken && !serverToken.startsWith('local:')) {
        const srvState = await fetchServerUserState(serverToken);
        if (srvState) {
          setBankCard(srvState.bankCard || null);
          setUserTransactions(srvState.transactions || []);
          setUserProducts(srvState.userProducts || []);
          setUserReferrals(srvState.referrals || []);
          setNotifications(srvState.notifications || []);
        }
      } else if (!isAdminRoute) {
        setBankCard(null);
        setUserTransactions([]);
        setUserProducts([]);
        setUserReferrals([]);
        setUserTickets([]);
        setNotifications([]);
      }

      if (authLoading) {
        if (!silent) setLoadingData(false);
        return;
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
              supportTickets?: SupportTicket[];
              auditLogs?: AdminAuditLog[];
            };
            if (Array.isArray(adminData.profiles)) setAllProfiles(adminData.profiles);
            if (Array.isArray(adminData.transactions)) setAllTransactions(adminData.transactions);
            if (Array.isArray(adminData.referrals)) setAllReferrals(adminData.referrals);
            if (Array.isArray(adminData.userProducts)) setAllUserProducts(adminData.userProducts);
            if (adminData.bankCards) setAllBankCards(adminData.bankCards);
            if (Array.isArray(adminData.bonusCodes)) setAllBonusCodes(adminData.bonusCodes);
            if (adminData.plans && adminData.plans.length > 0) setPlans(adminData.plans);
            if (adminData.announcements) setAnnouncements(adminData.announcements);
            if (adminData.banners) setBanners(adminData.banners);
            if (adminData.siteSettings) setSiteSettings(adminData.siteSettings);
            if (Array.isArray(adminData.supportTickets)) setAllTickets(adminData.supportTickets);
            if (Array.isArray(adminData.auditLogs)) setAuditLogs(adminData.auditLogs);
            setRealtimeStatus('connected');
          }
        } catch {
          // Preserve existing state on transient error
        }
      }
      setLoadingData(false);
      if (backendOnline) setRealtimeStatus('connected');
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

      const dbSettings = !settingsRes.error ? (settingsRes.data as SiteSettings | null) : null;
      const srvSettings = serverPublic.siteSettings || null;
      if (dbSettings && srvSettings) {
        setSiteSettings(
          new Date(srvSettings.updated_at).getTime() >= new Date(dbSettings.updated_at).getTime()
            ? srvSettings
            : dbSettings
        );
      } else if (srvSettings || dbSettings) {
        setSiteSettings(srvSettings || dbSettings || PREVIEW_SITE_SETTINGS);
      }

      if (!plansRes.error && plansRes.data && plansRes.data.length > 0) {
        setPlans(plansRes.data as DemoPlan[]);
      } else if (serverPublic.plans && serverPublic.plans.length > 0) {
        setPlans(serverPublic.plans);
      } else if (plans.length === 0) {
        setPlans(PREVIEW_PLANS);
      }

      if (!annRes.error && annRes.data && annRes.data.length > 0) {
        setAnnouncements(annRes.data as Announcement[]);
      } else if (serverPublic.announcements && serverPublic.announcements.length > 0) {
        setAnnouncements(serverPublic.announcements);
      } else if (announcements.length === 0) {
        setAnnouncements(PREVIEW_ANNOUNCEMENTS);
      }

      if (!bannersRes.error && bannersRes.data && bannersRes.data.length > 0) {
        setBanners(bannersRes.data as Banner[]);
      } else if (serverPublic.banners && serverPublic.banners.length > 0) {
        setBanners(serverPublic.banners);
      }

      if (!settingsRes.error || !plansRes.error || backendOnline) {
        setRealtimeStatus('connected');
      }

      if (user?.id && !isAdmin) {
        if (serverToken) {
          const srvState = await fetchServerUserState(serverToken);
          if (srvState) {
            setBankCard(srvState.bankCard || null);
            setUserTransactions(srvState.transactions || []);
            setUserProducts(srvState.userProducts || []);
            setUserReferrals(srvState.referrals || []);
            setNotifications(srvState.notifications || []);
          }
        } else {
          const { data: sessionData } = await supabase.auth.getSession();
          const sbToken = sessionData.session?.access_token;
          const [txRes, prodRes, refRes, notifRes, readsRes, ticketsRes, srvState] = await Promise.all([
            supabase.from('demo_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
            supabase.from('demo_user_products').select('*').eq('user_id', user.id).order('started_at', { ascending: false }),
            supabase.from('referral_records').select('*').eq('referrer_id', user.id).order('created_at', { ascending: false }),
            supabase.from('notifications').select('*').or(`user_id.eq.${user.id},user_id.is.null`).order('created_at', { ascending: false }),
            supabase.from('notification_reads').select('notification_id').eq('user_id', user.id),
            supabase.from('support_tickets').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
            sbToken ? fetchServerUserState(sbToken) : Promise.resolve(null),
          ]);

          setBankCard(srvState?.bankCard || null);
          if (!txRes.error && txRes.data) setUserTransactions(txRes.data as DemoTransaction[]);
          else if (srvState?.transactions) setUserTransactions(srvState.transactions);

          if (!prodRes.error && prodRes.data) setUserProducts(prodRes.data as DemoUserProduct[]);
          else if (srvState?.userProducts) setUserProducts(srvState.userProducts);

          if (srvState?.referrals && srvState.referrals.length > 0) {
            setUserReferrals(srvState.referrals);
          } else if (!refRes.error && refRes.data) {
            setUserReferrals(refRes.data as ReferralRecord[]);
          }

          if (!notifRes.error && notifRes.data) {
            setNotifications(notifRes.data as AppNotification[]);
          } else if (srvState?.notifications) {
            setNotifications(srvState.notifications);
          }
          if (!readsRes.error && readsRes.data) setReadNotificationIds(readsRes.data.map((r) => r.notification_id));
          if (!ticketsRes.error && ticketsRes.data) setUserTickets(ticketsRes.data as SupportTicket[]);
        }
      } else if (!user?.id && !isAdminRoute) {
        setBankCard(null);
        setUserTransactions([]);
        setUserProducts([]);
        setUserReferrals([]);
        setUserTickets([]);
        setNotifications([]);
      }

      if (!authLoading && isAdmin) {
        const { data: sessionData } = await supabase.auth.getSession();
        const effectiveAdminToken = adminToken || sessionData.session?.access_token;
        let fetchedViaAdminApi = false;

        if (effectiveAdminToken) {
          try {
            const adminRes = await fetch('/api/admin/state', {
              headers: { Authorization: `Bearer ${effectiveAdminToken}` },
              cache: 'no-store',
            });
            if (adminRes.ok) {
              const adminData = (await adminRes.json()) as {
                mode?: string;
                schemaReady?: boolean;
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
                supportTickets?: SupportTicket[];
                auditLogs?: AdminAuditLog[];
              };
              const hasLivePayload =
                adminData.mode === 'supabase' ||
                adminData.schemaReady === true ||
                (Array.isArray(adminData.profiles) && adminData.profiles.length > 0) ||
                (Array.isArray(adminData.transactions) && adminData.transactions.length > 0);

              if (hasLivePayload) {
                if (Array.isArray(adminData.profiles)) setAllProfiles(adminData.profiles);
                if (Array.isArray(adminData.transactions)) setAllTransactions(adminData.transactions);
                if (Array.isArray(adminData.referrals)) setAllReferrals(adminData.referrals);
                if (Array.isArray(adminData.userProducts)) setAllUserProducts(adminData.userProducts);
                if (adminData.bankCards) setAllBankCards(adminData.bankCards);
                if (Array.isArray(adminData.bonusCodes)) setAllBonusCodes(adminData.bonusCodes);
                if (adminData.plans && adminData.plans.length > 0) setPlans(adminData.plans);
                if (adminData.announcements) setAnnouncements(adminData.announcements);
                if (adminData.banners) setBanners(adminData.banners);
                if (adminData.siteSettings) setSiteSettings(adminData.siteSettings);
                if (Array.isArray(adminData.supportTickets)) setAllTickets(adminData.supportTickets);
                if (Array.isArray(adminData.auditLogs)) setAuditLogs(adminData.auditLogs);
                fetchedViaAdminApi = true;
                setRealtimeStatus('connected');
              }
            }
          } catch {
            // Fall through to direct Supabase query fallback
          }
        }

        if (!fetchedViaAdminApi) {
          const directOk = await fetchAdminDirectlyFromSupabase();
          if (directOk) {
            setRealtimeStatus('connected');
          }
        }
      }
    } finally {
      setLoadingData(false);
    }
  }, [
    user?.id,
    isAdmin,
    authLoading,
    fetchServerUserState,
    fetchAdminDirectlyFromSupabase,
    plans.length,
    announcements.length,
    notifications.length,
  ]);

  useEffect(() => {
    void fetchPublicAndUser();
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
      es.onerror = () => {
        if (es && es.readyState === EventSource.CLOSED) {
          es.close();
          es = null;
        }
      };
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        void fetchPublicAndUser(true);
        void refreshProfile();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => void fetchPublicAndUser(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => void fetchPublicAndUser(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => void fetchPublicAndUser(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => void fetchPublicAndUser(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => void fetchPublicAndUser(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demo_transactions' }, () => {
        void fetchPublicAndUser(true);
        void refreshProfile();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referral_records' }, () => {
        void fetchPublicAndUser(true);
        void refreshProfile();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demo_user_products' }, () => void fetchPublicAndUser(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => void fetchPublicAndUser(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bonus_codes' }, () => void fetchPublicAndUser(true))
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
  }, [fetchPublicAndUser, refreshProfile, isPreviewMode]);

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

      const serverToken = getStoredServerToken();

      if (serverToken && !serverToken.startsWith('local:')) {
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
