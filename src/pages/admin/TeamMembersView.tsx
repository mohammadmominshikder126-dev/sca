import React, { useMemo, useState } from 'react';
import { UsersRound } from 'lucide-react';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import { formatCurrency, formatShortDate } from '../../lib/supabase';
import { EmptyState } from '../../components/ui/Feedback';

export const TeamMembersView: React.FC = () => {
  const { allReferrals, siteSettings } = usePlatformData();
  const [levelFilter, setLevelFilter] = useState<0 | 1 | 2 | 3>(0);

  const filtered = useMemo(
    () => (levelFilter === 0 ? allReferrals : allReferrals.filter((r) => r.level === levelFilter)),
    [allReferrals, levelFilter]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-[#061844]">Team Members & Referral Tree</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Simulated 3-level referral relationships (L1 25%, L2 2%, L3 1%).
          </p>
        </div>
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-blue-100">
          {[
            { val: 0, label: 'All Levels' },
            { val: 1, label: 'Level 1' },
            { val: 2, label: 'Level 2' },
            { val: 3, label: 'Level 3' },
          ].map((opt) => (
            <button
              key={opt.val}
              type="button"
              onClick={() => setLevelFilter(opt.val as 0 | 1 | 2 | 3)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                levelFilter === opt.val ? 'bg-[#1250C4] text-white' : 'text-slate-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-blue-100 shadow-xs overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<UsersRound className="w-5 h-5" />}
              title="No Referral Records"
              description="When users register via a referral link, their 3-tier connections appear here."
            />
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <th className="py-3 px-4 font-semibold">Referrer</th>
                <th className="py-3 px-4 font-semibold">Referred Member</th>
                <th className="py-3 px-4 font-semibold">Tier Level</th>
                <th className="py-3 px-4 font-semibold">Rate</th>
                <th className="py-3 px-4 font-semibold">Simulated Commission</th>
                <th className="py-3 px-4 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {r.referrer?.full_name || r.referrer_id.slice(0, 8)}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-800">{r.referred?.full_name || 'Demo Member'}</p>
                    <p className="text-[11px] font-mono text-slate-400">{r.referred?.scania_id || ''}</p>
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#1250C4]">Level {r.level}</td>
                  <td className="py-3 px-4 font-mono">{r.commission_rate}%</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700 tabular-nums">
                    {formatCurrency(r.simulated_commission, siteSettings.currency_symbol)}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{formatShortDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
