import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  Crown,
  Gift,
  Headphones,
  Megaphone,
  Wallet,
} from 'lucide-react';
import { PlanFallbackThumbnail, ScaniaImage, ScaniaTruckIllustration } from '../../components/ScaniaVisuals';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { formatCurrency, formatDateTime } from '../../lib/supabase';
import { UserOutletContext } from './UserLayout';

const HERO_SLIDES = [
  {
    src: '/assets/aistudio/images__1___6__dd06b226.jpeg',
    alt: 'SCANIA অফিসিয়াল শোরুম ও হেডকোয়ার্টার',
  },
  {
    src: '/assets/aistudio/sodertalje-sweden-september-2022-name-260nw-2217356509_50c7ea44.jpg',
    alt: 'SCANIA সুইডেন অফিসিয়াল ফ্ল্যাগ',
  },
  {
    src: '/assets/aistudio/sddefault__3__59847097.jpg',
    alt: 'SCANIA 1901 থেকে 2035 বিবর্তন',
  },
];

function translateTxType(type: string): string {
  switch (type) {
    case 'deposit_demo':
      return 'রিচার্জ';
    case 'withdraw_demo':
      return 'উত্তোলন';
    case 'plan_purchase':
      return 'প্ল্যান ক্রয়';
    case 'daily_yield':
      return 'দৈনিক আয়';
    case 'bonus_code':
      return 'বোনাস কোড';
    case 'referral_commission':
      return 'টিম কমিশন';
    default:
      return type;
  }
}

function translateTxStatus(status: string): string {
  switch (status) {
    case 'approved':
    case 'completed':
      return 'সফল';
    case 'rejected':
      return 'বাতিল';
    default:
      return 'অপেক্ষমাণ';
  }
}

export const HomeTab: React.FC = () => {
  const navigate = useNavigate();
  const { openModal } = useOutletContext<UserOutletContext>();
  const { profile } = useAuth();
  const { siteSettings, banners, announcements, plans, userTransactions } = usePlatformData();

  const promoBanner = banners.find((b) => b.placement === 'plans_promo' && b.is_active);
  const publishedNotices = announcements.filter((a) => a.is_published);
  const latestNotice = publishedNotices[0];
  const activePlans = plans.filter((p) => p.is_active);

  // Seamless continuous left-scrolling carousel
  const extendedSlides = [...HERO_SLIDES, HERO_SLIDES[0]];
  const [slideIndex, setSlideIndex] = useState(0);
  const [animateTransition, setAnimateTransition] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAnimateTransition(true);
      setSlideIndex((prev) => prev + 1);
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);

  const handleTransitionEnd = () => {
    if (slideIndex >= HERO_SLIDES.length) {
      setAnimateTransition(false);
      setSlideIndex(0);
    }
  };

  const activeDot = slideIndex % HERO_SLIDES.length;

  return (
    <div className="space-y-3.5">
      {/* 1. Top Auto-Scrolling Left-Moving 3-Image Banner Carousel */}
      <section className="relative rounded-3xl overflow-hidden shadow-md border border-blue-200 bg-[#061844] h-44 sm:h-56">
        <div
          onTransitionEnd={handleTransitionEnd}
          className={`flex h-full ${animateTransition ? 'transition-transform duration-700 ease-in-out' : ''}`}
          style={{ transform: `translateX(-${slideIndex * 100}%)` }}
        >
          {extendedSlides.map((slide, idx) => (
            <div key={`${slide.src}-${idx}`} className="w-full h-full shrink-0 relative">
              <img
                src={slide.src}
                alt={slide.alt}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#041236]/55 via-transparent to-transparent" />
            </div>
          ))}
        </div>

        {/* Indicator Dots */}
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
          {HERO_SLIDES.map((s, idx) => (
            <button
              key={s.src}
              type="button"
              onClick={() => {
                setAnimateTransition(true);
                setSlideIndex(idx);
              }}
              aria-label={`স্লাইড ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                activeDot === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/55'
              }`}
            />
          ))}
        </div>
      </section>

      {/* 2. Dark Navy Balance Card (Label changed to "উত্তোলন") */}
      <section className="-mt-6 relative z-10 mx-0.5 rounded-2xl bg-gradient-to-r from-[#041747] via-[#0A2E7A] to-[#08225D] text-white p-4 shadow-xl border border-blue-400/35">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400/30 to-blue-900/50 border border-blue-300/30 flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-blue-100 font-semibold">উত্তোলন</p>
              <p className="text-2xl sm:text-[26px] font-extrabold text-[#FACC15] tracking-tight tabular-nums leading-tight truncate">
                {formatCurrency(profile?.demo_balance ?? 0, siteSettings.currency_symbol)}
              </p>
            </div>
          </div>

          <div className="pl-3 border-l border-blue-300/20 flex flex-col items-end shrink-0">
            <Crown className="w-4 h-4 text-blue-300/60 mb-1" />
            <button
              type="button"
              onClick={() => openModal('balance_details')}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] hover:brightness-110 text-white text-xs font-bold shadow-sm transition-all min-h-[38px]"
            >
              <span>বিস্তারিত</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. 4 Quick Action Cards (রিচার্জ, উত্তোলন, বোনাস কোড, সাপোর্ট) */}
      <section className={`grid gap-2.5 ${siteSettings.show_bonus_button ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <button
          type="button"
          onClick={() => navigate('/user/recharge')}
          className="bg-white rounded-2xl p-2.5 border border-blue-100 shadow-sm hover:border-blue-300 transition-all flex flex-col items-center justify-center gap-1.5 min-h-[82px]"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#2563EB] to-[#1240A8] text-white flex items-center justify-center shadow-sm">
            <ArrowDown className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-[#061844] whitespace-nowrap">রিচার্জ</span>
        </button>

        <button
          type="button"
          onClick={() => openModal('withdraw')}
          className="bg-white rounded-2xl p-2.5 border border-blue-100 shadow-sm hover:border-blue-300 transition-all flex flex-col items-center justify-center gap-1.5 min-h-[82px]"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#2563EB] to-[#1240A8] text-white flex items-center justify-center shadow-sm">
            <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-[#061844] whitespace-nowrap">উত্তোলন</span>
        </button>

        {siteSettings.show_bonus_button && (
          <button
            type="button"
            onClick={() => openModal('bonus')}
            className="relative bg-white rounded-2xl p-2.5 border border-blue-100 shadow-sm hover:border-blue-300 transition-all flex flex-col items-center justify-center gap-1.5 min-h-[82px]"
          >
            <span className="absolute -top-1.5 right-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-extrabold shadow-xs">
              নতুন
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 border border-amber-200 flex items-center justify-center">
              <Gift className="w-5 h-5" strokeWidth={2.3} />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-[#061844] whitespace-nowrap">বোনাস কোড</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => openModal('support')}
          className="bg-white rounded-2xl p-2.5 border border-blue-100 shadow-sm hover:border-blue-300 transition-all flex flex-col items-center justify-center gap-1.5 min-h-[82px]"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B2A6B] border border-blue-100 flex items-center justify-center">
            <Headphones className="w-5 h-5" strokeWidth={2.3} />
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-[#061844] whitespace-nowrap">সাপোর্ট</span>
        </button>
      </section>

      {/* 4. Latest Notice Section */}
      <section className="bg-white rounded-2xl p-4 border border-blue-100 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#1250C4]" />
            <h2 className="font-display font-bold text-sm sm:text-base text-[#061844]">সর্বশেষ নোটিশ</h2>
          </div>
          <button
            type="button"
            onClick={() => openModal('announcements')}
            className="inline-flex items-center gap-0.5 text-xs font-bold text-[#1250C4] hover:underline min-h-[34px] px-1"
          >
            <span>সব দেখুন</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div
          onClick={() => openModal('announcements')}
          className="p-3.5 rounded-xl bg-[#EEF4FF] border border-blue-100 cursor-pointer hover:bg-blue-100/70 transition-colors flex items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1250C4] shrink-0 mt-1" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#061844] truncate">
                {latestNotice?.title || 'SCANIA প্ল্যাটফর্মে স্বাগতম!'}
              </p>
              <p className="text-xs text-slate-600 line-clamp-1 mt-0.5 tabular-nums">
                {latestNotice?.content || 'সর্বনিম্ন রিচার্জ 500 টাকা · সর্বনিম্ন উত্তোলন 150 টাকা'}
              </p>
            </div>
          </div>
          <Megaphone className="w-6 h-6 text-[#1E6FFF]/50 shrink-0 -rotate-12" />
        </div>
      </section>

      {/* 5. Scania Investment Plan Banner */}
      <section className="relative rounded-2xl overflow-hidden shadow-md border border-blue-300/40 bg-[#061B4D] h-36 sm:h-44">
        {promoBanner?.image_url ? (
          <ScaniaImage
            src={promoBanner.image_url}
            alt="SCANIA ইনভেস্টমেন্ট প্ল্যান"
            fallbackVariant="promo"
            className="w-full h-full object-cover"
          />
        ) : (
          <ScaniaTruckIllustration variant="promo" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#041236]/95 via-[#071E54]/75 to-transparent p-5 flex flex-col justify-center">
          <h2 className="font-display text-base sm:text-lg font-extrabold text-white leading-tight">
            SCANIA
          </h2>
          <p className="font-display text-lg sm:text-xl font-extrabold text-[#FACC15] leading-tight">
            {promoBanner?.title || 'ইনভেস্টমেন্ট প্ল্যান'}
          </p>
          <p className="text-xs text-blue-100 mt-1 max-w-[220px]">
            {promoBanner?.subtitle || 'আপনার পছন্দের প্ল্যান কিনে প্রতিদিন আয় শুরু করুন'}
          </p>
          <div className="mt-3">
            <Link
              to="/user/products"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FACC15] hover:bg-amber-300 text-[#061844] text-xs font-extrabold transition-colors shadow-sm"
            >
              <span>এখনই কিনুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Recent Transactions */}
      {userTransactions.length > 0 && (
        <section className="bg-white rounded-2xl p-4 border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <h2 className="font-display font-bold text-sm text-[#061844]">সাম্প্রতিক লেনদেন</h2>
            <button
              type="button"
              onClick={() => openModal('balance_details')}
              className="text-xs font-bold text-[#1250C4] hover:underline"
            >
              সব দেখুন
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {userTransactions.slice(0, 4).map((tx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {translateTxType(tx.type)}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate tabular-nums">
                    {tx.method} · {formatDateTime(tx.created_at)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-slate-900 tabular-nums">
                    {formatCurrency(tx.amount, siteSettings.currency_symbol)}
                  </p>
                  <span
                    className={`text-[10px] font-semibold ${
                      tx.status === 'approved' || tx.status === 'completed'
                        ? 'text-emerald-600'
                        : tx.status === 'rejected'
                        ? 'text-rose-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {translateTxStatus(tx.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Available Plans (Placed at bottom of Home Page) */}
      {activePlans.length > 0 && (
        <section className="bg-white rounded-2xl p-4 border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-display font-bold text-sm sm:text-base text-[#061844]">SCANIA ইনভেস্টমেন্ট প্ল্যান</h2>
            <Link to="/user/products" className="text-xs font-bold text-[#1250C4] hover:underline tabular-nums">
              সব দেখুন ({activePlans.length})
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activePlans.map((plan) => {
              const totalReturn =
                plan.total_return ?? (plan.title.toUpperCase().includes('V7') ? 66000 : null);
              return (
                <div
                  key={plan.id}
                  className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#F4F8FF] border border-blue-100 hover:border-blue-300 transition-colors"
                >
                  <div className="w-28 h-24 rounded-xl overflow-hidden shrink-0 border border-blue-200 bg-[#061844]">
                    <PlanFallbackThumbnail imageUrl={plan.image_url} title={plan.title} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display font-extrabold text-sm text-[#061844] truncate">{plan.title}</h3>
                      {plan.badge && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-300 text-[#061844] text-[10px] font-extrabold shrink-0">
                          <Crown className="w-2.5 h-2.5" />
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 space-y-0.5 text-xs text-slate-700">
                      <p className="tabular-nums">
                        মূল্য : <strong className="text-[#061844]">{Number(plan.demo_price).toLocaleString('en-US')} টাকা</strong>
                      </p>
                      <p className="tabular-nums">
                        দৈনিক আয় : <strong className="text-[#1250C4]">{Number(plan.daily_income).toLocaleString('en-US')} টাকা</strong>
                      </p>
                      <p className="tabular-nums">
                        মেয়াদ : <strong className="text-[#061844]">{plan.validity_days} দিন</strong>
                      </p>
                      {totalReturn ? (
                        <p className="tabular-nums">
                          মোট রিটার্ন : <strong className="text-emerald-700">{Number(totalReturn).toLocaleString('en-US')} টাকা</strong>
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-2.5 flex justify-end">
                      <Link
                        to={`/user/products?plan=${plan.id}`}
                        className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#0B2A6B] to-[#1D4ED8] hover:opacity-95 text-white text-[11px] font-bold shadow-xs"
                      >
                        <span>কিনুন</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
