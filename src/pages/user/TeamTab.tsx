import React, { useMemo, useState } from 'react';
import { Check, ChevronRight, Copy, Crown, Link2, Share2, UserPlus, Users, DollarSign } from 'lucide-react';
import { ScaniaImage } from '../../components/ScaniaVisuals';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { formatCurrency, formatShortDate } from '../../lib/supabase';
import { EmptyState, useToast } from '../../components/ui/Feedback';

export const TeamTab: React.FC = () => {
  const { profile } = useAuth();
  const { siteSettings, banners, userReferrals } = usePlatformData();
  const { showToast } = useToast();

  const [copied, setCopied] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [showList, setShowList] = useState(false);

  const teamBanner = banners.find((b) => b.placement === 'team_hero' && b.is_active);
  const refCode = profile?.referral_code || 'SCN123';
  const referralUrl = `${window.location.origin}/register?ref=${refCode}`;

  const stats = useMemo(() => {
    const l1 = userReferrals.filter((r) => r.level === 1);
    const l2 = userReferrals.filter((r) => r.level === 2);
    const l3 = userReferrals.filter((r) => r.level === 3);
    const totalCommission = userReferrals.reduce((acc, r) => acc + Number(r.simulated_commission || 0), 0);
    return {
      totalMembers: userReferrals.length,
      totalCommission,
      levels: [
        { level: 1, rate: '25%', count: l1.length, color: 'text-amber-500' },
        { level: 2, rate: '2%', count: l2.length, color: 'text-sky-500' },
        { level: 3, rate: '1%', count: l3.length, color: 'text-orange-500' },
      ],
    };
  }, [userReferrals]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      showToast('রেফারেল লিংক কপি হয়েছে', 'success');
      setTimeout(() => setCopied(false), 2200);
    } catch {
      showToast('লিংক কপি করা যায়নি', 'error');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: siteSettings.site_name,
          text: `SCANIA তে যোগ দিন আমার রেফারেল কোড ${refCode} ব্যবহার করে`,
          url: referralUrl,
        });
        return;
      } catch {
        // Fallback modal
      }
    }
    setInviteModalOpen(true);
  };

  return (
    <div className="space-y-3.5">
      {/* 1. Team Hero Banner */}
      <section className="relative rounded-3xl overflow-hidden shadow-md border border-blue-200 bg-[#0A2D78] h-36 sm:h-44">
        {teamBanner?.image_url ? (
          <ScaniaImage src={teamBanner.image_url} alt="আমাদের শক্তিশালী টিম" className="w-full h-full object-cover" />
        ) : (
          <img
            src="/assets/aistudio/strasbourg-france-mar-side-view-scania-logotype-insignia-logo-front-part-radiator-powerful-g-truck-new-112358872_422f3a5f.jpg"
            alt="আমাদের শক্তিশালী টিম"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-l from-[#04143B]/90 via-[#071D52]/45 to-transparent p-5 sm:p-7 flex flex-col justify-center items-end text-right">
          <h1 className="font-display text-xl sm:text-2xl font-extrabold text-white drop-shadow">
            আমাদের শক্তিশালী টিম
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-blue-100 mt-0.5">
            একসাথে আমরা এগিয়ে যাই
          </p>
        </div>
      </section>

      {/* 2. Total Member & Total Commission Cards */}
      <section className="-mt-6 relative z-10 grid grid-cols-2 gap-3 px-0.5">
        <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-md text-center">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-[#1250C4] flex items-center justify-center mx-auto mb-1.5">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-[#061844]">মোট সদস্য</p>
          <p className="text-2xl font-extrabold text-[#061844] tabular-nums mt-0.5">
            {stats.totalMembers}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-md text-center">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-[#1250C4] flex items-center justify-center mx-auto mb-1.5">
            <DollarSign className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-[#061844]">মোট কমিশন</p>
          <p className="text-2xl font-extrabold text-emerald-600 tabular-nums mt-0.5">
            {formatCurrency(stats.totalCommission, siteSettings.currency_symbol)}
          </p>
        </div>
      </section>

      {/* 3. Team Levels Card */}
      <section className="bg-white rounded-2xl p-4 border border-blue-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-[#1250C4]" />
          <h2 className="font-display font-bold text-sm sm:text-base text-[#061844]">টিম লেভেল</h2>
        </div>

        <div className="space-y-2.5">
          {stats.levels.map((lvl) => (
            <div
              key={lvl.level}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#F2F7FF] border border-blue-100"
            >
              <div className="flex items-center gap-3">
                <Crown className={`w-6 h-6 ${lvl.color}`} />
                <span className="text-sm font-bold text-[#061844] tabular-nums">লেভেল {lvl.level}</span>
              </div>
              <span className="px-4 py-1 rounded-full bg-gradient-to-r from-[#0B2A6B] to-[#1D4ED8] text-white text-xs font-bold tabular-nums shadow-xs">
                {lvl.rate}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Referral Link Card */}
      <section className="bg-white rounded-2xl p-4 border border-blue-100 shadow-sm space-y-2.5">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-[#1250C4]" />
          <h2 className="font-display font-bold text-sm sm:text-base text-[#061844]">রেফারেল লিংক</h2>
        </div>

        <div className="flex items-center gap-2 bg-[#F2F7FF] border border-blue-100 rounded-full p-1 pl-3.5">
          <input
            type="text"
            readOnly
            value={referralUrl}
            aria-label="রেফারেল লিংক"
            className="flex-1 bg-transparent text-xs text-slate-700 focus:outline-none truncate tabular-nums"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-[#1250C4] hover:bg-[#0D3DA0] text-white text-xs font-bold shrink-0 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
          </button>
        </div>
      </section>

      {/* 5. Team Members Card + Invite Now */}
      <section className="bg-white rounded-2xl p-4 border border-blue-100 shadow-sm space-y-3.5">
        <button
          type="button"
          onClick={() => setShowList((v) => !v)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1250C4]" />
            <h2 className="font-display font-bold text-sm sm:text-base text-[#061844]">টিম মেম্বার</h2>
          </div>
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showList ? 'rotate-90' : ''}`} />
        </button>

        {/* Avatar Row */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2.5">
            {userReferrals.slice(0, 3).map((r) => (
              <div
                key={r.id}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0B2A6B] to-[#1E6FFF] text-white font-bold text-xs flex items-center justify-center border-2 border-blue-200 shadow-xs"
                title={r.referred?.full_name || 'সদস্য'}
              >
                {(r.referred?.full_name || 'M').slice(0, 2).toUpperCase()}
              </div>
            ))}
            {userReferrals.length === 0 && (
              <span className="text-xs text-slate-500">টিম গড়তে বন্ধুদের আমন্ত্রণ জানান</span>
            )}
          </div>
          <div className="w-12 h-12 rounded-full bg-[#061844] text-white font-bold text-xs flex items-center justify-center border-2 border-blue-300 shrink-0 tabular-nums">
            +{userReferrals.length}
          </div>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="w-full py-3 rounded-full bg-gradient-to-r from-[#041747] via-[#0B2E7A] to-[#1250C4] hover:opacity-95 text-white font-bold text-sm flex items-center justify-center gap-2 min-h-[46px] shadow-md"
        >
          <UserPlus className="w-4 h-4" />
          <span>এখনই আমন্ত্রণ জানান</span>
        </button>

        {showList && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            {userReferrals.length === 0 ? (
              <EmptyState
                icon={<Users className="w-5 h-5" />}
                title="এখনো কোনো টিম মেম্বার নেই"
                description="সদস্য বাড়াতে উপরের রেফারেল লিংকটি শেয়ার করুন।"
              />
            ) : (
              userReferrals.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F4F8FF] border border-blue-100"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {rec.referred?.full_name || 'সদস্য'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate tabular-nums">
                      {rec.referred?.scania_id || 'SCN'} · লেভেল {rec.level} · {formatShortDate(rec.created_at)}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 tabular-nums shrink-0">
                    +{formatCurrency(rec.simulated_commission, siteSettings.currency_symbol)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-blue-100">
            <div className="flex items-center gap-2.5 mb-2">
              <Share2 className="w-5 h-5 text-[#1250C4]" />
              <h3 className="font-display font-bold text-base text-[#061844]">টিম মেম্বার আমন্ত্রণ</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              নিচের রেফারেল লিংকটি শেয়ার করুন যাতে নতুন সদস্যরা আপনার টিমে যোগ দিতে পারে।
            </p>
            <div className="mt-4 p-3 rounded-xl bg-slate-100 text-xs break-all text-slate-800 tabular-nums">
              {referralUrl}
            </div>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-2.5 rounded-xl bg-[#1250C4] text-white text-xs font-semibold min-h-[42px]"
              >
                লিংক কপি করুন
              </button>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold min-h-[42px]"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
