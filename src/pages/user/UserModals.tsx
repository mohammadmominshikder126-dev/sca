import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  CreditCard,
  ExternalLink,
  Gift,
  Headphones,
  Megaphone,
  MessageSquarePlus,
  Send,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformData } from '../../contexts/PlatformDataContext';
import {
  callApiWithFallback,
  formatCurrency,
  formatDateTime,
  getStoredServerToken,
  supabase,
} from '../../lib/supabase';
import { EmptyState, useToast } from '../../components/ui/Feedback';
import { SupportTicket } from '../../types/database';
import { TransactionHistoryContent } from './TransactionHistoryPage';

export type ActiveUserModal =
  | null
  | 'deposit'
  | 'withdraw'
  | 'bonus'
  | 'support'
  | 'announcements'
  | 'balance_details'
  | 'bank_card';

export const UserActionModals: React.FC<{
  activeModal: ActiveUserModal;
  onClose: () => void;
  onOpenModal?: (modal: ActiveUserModal) => void;
}> = ({ activeModal, onClose, onOpenModal }) => {
  const navigate = useNavigate();
  const { user, profile, isPreviewMode, refreshProfile } = useAuth();
  const {
    siteSettings,
    announcements,
    bankCard,
    userProducts,
    userTickets,
    ticketMessages,
    loadTicketMessages,
    refreshAll,
  } = usePlatformData();
  const { showToast } = useToast();

  const [amount, setAmount] = useState('500');
  const [method, setMethod] = useState('Bkash');
  const [referenceCode, setReferenceCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bank Card Setup fields
  const [walletMethod, setWalletMethod] = useState<'Bkash' | 'Nagad'>('Bkash');
  const [walletNumber, setWalletNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const [bonusCode, setBonusCode] = useState('');

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (activeModal === 'deposit') {
      setAmount('500');
    } else if (activeModal === 'withdraw') {
      setAmount('150');
    } else if (activeModal === 'bank_card' && bankCard) {
      setWalletMethod(bankCard.wallet_method);
      setWalletNumber(bankCard.wallet_number);
      setAccountName(bankCard.account_name);
    }
  }, [activeModal, bankCard]);

  useEffect(() => {
    if (activeModal === 'support' && userTickets.length > 0 && !selectedTicket) {
      setSelectedTicket(userTickets[0]);
      loadTicketMessages(userTickets[0].id);
    }
  }, [activeModal, userTickets, selectedTicket, loadTicketMessages]);

  if (!activeModal) return null;

  const hasSessionToken = Boolean(getStoredServerToken());

  const ensureLive = () => {
    if ((isPreviewMode && !hasSessionToken) || !user) {
      showToast('অনুগ্রহ করে প্রথমে লগইন করুন', 'warning');
      return false;
    }
    return true;
  };

  const handleBankCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureLive()) return;
    const digits = walletNumber.replace(/[^0-9]/g, '');
    if (digits.length < 7) {
      showToast('সঠিক ওয়ালেট নাম্বার দিন', 'error');
      return;
    }
    if (accountName.trim().length < 2) {
      showToast('আপনার নাম সঠিকভাবে লিখুন', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await callApiWithFallback('/api/user/bank-card', 'POST', {
        wallet_method: walletMethod,
        wallet_number: walletNumber.trim(),
        account_name: accountName.trim(),
      });
      await refreshAll();
      showToast('ব্যাংক কার্ড সফলভাবে সেটআপ হয়েছে', 'success');
      onClose();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransactionSubmit = async (type: 'deposit_demo' | 'withdraw_demo', e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureLive()) return;

    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0 || num > 1000000) {
      showToast('সঠিক পরিমাণ লিখুন', 'error');
      return;
    }

    if (type === 'deposit_demo' && num < 500) {
      showToast('সর্বনিম্ন রিচার্জ 500 টাকা', 'error');
      return;
    }

    if (type === 'withdraw_demo') {
      if (!bankCard) {
        showToast('প্রথমে ব্যাংক কার্ড সেটআপ করুন', 'error');
        return;
      }
      if (userProducts.length === 0) {
        showToast('ডিপোজিট করার পরে কমপক্ষে 1 টি প্ল্যান না কিনলে উত্তোলন করা যাবে না', 'error');
        return;
      }
      if (num < 150) {
        showToast('সর্বনিম্ন উত্তোলন 150 টাকা', 'error');
        return;
      }
      if (profile && num > Number(profile.demo_balance)) {
        showToast('আপনার ব্যালেন্স পর্যাপ্ত নয়', 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      await callApiWithFallback(
        '/api/user/request-transaction',
        'POST',
        {
          type,
          amount: num,
          method: type === 'withdraw_demo' && bankCard ? `${bankCard.wallet_method} (${bankCard.wallet_number})` : method,
          reference_code:
            type === 'withdraw_demo' && bankCard
              ? bankCard.account_name
              : referenceCode.trim() || `TRX-${Date.now().toString().slice(-6)}`,
        },
        async () => {
          const { error } = await supabase!.from('demo_transactions').insert({
            user_id: user!.id,
            type,
            amount: num,
            method: type === 'withdraw_demo' && bankCard ? `${bankCard.wallet_method} (${bankCard.wallet_number})` : method,
            reference_code: referenceCode || `TRX-${Date.now().toString().slice(-6)}`,
            status: 'pending',
            admin_note: type === 'withdraw_demo' ? `5% চার্জ: ৳${(num * 0.05).toFixed(2)}` : 'আপনার পেমেন্টটি পর্যালোচনায় রয়েছে',
          });
          if (error) throw new Error(error.message);
          return { ok: true };
        }
      );

      await Promise.all([refreshProfile(), refreshAll()]);
      showToast(
        type === 'deposit_demo' ? 'আপনার পেমেন্টটি পর্যালোচনায় রয়েছে' : 'আপনার উত্তোলন অনুরোধ জমা হয়েছে',
        'info'
      );
      setReferenceCode('');
      onClose();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRedeemBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureLive()) return;
    if (!bonusCode.trim()) {
      showToast('বোনাস কোড লিখুন', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await callApiWithFallback<{ amount: number }>(
        '/api/user/redeem-bonus',
        'POST',
        { code: bonusCode.trim() },
        async () => {
          const { data, error } = await supabase!.rpc('redeem_bonus_code', {
            p_code: bonusCode.trim(),
          });
          if (error) throw new Error(error.message);
          return data as { amount: number };
        }
      );
      await Promise.all([refreshProfile(), refreshAll()]);
      showToast(`বোনাস পাওয়া গেছে: ${formatCurrency(res.amount, siteSettings.currency_symbol)}`, 'success');
      setBonusCode('');
      onClose();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureLive()) return;
    if (!supabase) {
      showToast('সাপোর্ট টিকিটের জন্য Telegram বা কাস্টমার সার্ভিস নম্বরে যোগাযোগ করুন', 'info');
      return;
    }
    if (!newSubject.trim() || !newMessage.trim()) {
      showToast('বিষয় ও বার্তা উভয়ই লিখুন', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const { data: ticket, error: tErr } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user!.id,
          subject: newSubject.trim(),
          status: 'open',
          priority: 'normal',
        })
        .select()
        .single();
      if (tErr || !ticket) throw new Error(tErr?.message || 'টিকিট তৈরি করা যায়নি');

      const { error: mErr } = await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        sender_id: user!.id,
        sender_role: 'user',
        message: newMessage.trim(),
      });
      if (mErr) throw new Error(mErr.message);

      setNewSubject('');
      setNewMessage('');
      await refreshAll();
      setSelectedTicket(ticket as SupportTicket);
      await loadTicketMessages(ticket.id);
      showToast('সাপোর্ট বার্তা পাঠানো হয়েছে', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureLive() || !selectedTicket || !replyText.trim() || !supabase) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('support_messages').insert({
        ticket_id: selectedTicket.id,
        sender_id: user!.id,
        sender_role: 'user',
        message: replyText.trim(),
      });
      if (error) throw new Error(error.message);
      setReplyText('');
      await loadTicketMessages(selectedTicket.id);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // FULL-SCREEN TRANSACTION HISTORY VIEW (balance_details) - No summary cards, only deposit & withdraw
  if (activeModal === 'balance_details') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 bg-[#E9F1FC] flex flex-col"
      >
        {/* Full-Screen Top App Bar */}
        <header className="h-14 bg-gradient-to-r from-[#04184E] via-[#0A2E7E] to-[#1145B5] text-white px-4 sm:px-6 flex items-center justify-between shadow-md shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/10 text-sm font-bold min-h-[40px]"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>ফিরে যান</span>
          </button>
          <h2 className="font-display font-bold text-base">লেনদেনের ইতিহাস</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10"
            aria-label="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Full-Screen Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <TransactionHistoryContent />
        </div>
      </div>
    );
  }

  const parsedWithdraw = Number(amount || 0);
  const withdrawFee = Number.isFinite(parsedWithdraw) && parsedWithdraw > 0 ? parsedWithdraw * 0.05 : 0;
  const withdrawNet = Number.isFinite(parsedWithdraw) && parsedWithdraw > 0 ? parsedWithdraw - withdrawFee : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-blue-100 max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#04184E] to-[#1145B5] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            {activeModal === 'deposit' && <ArrowDownCircle className="w-5 h-5" />}
            {activeModal === 'withdraw' && <ArrowUpCircle className="w-5 h-5" />}
            {activeModal === 'bank_card' && <CreditCard className="w-5 h-5" />}
            {activeModal === 'bonus' && <Gift className="w-5 h-5 text-amber-300" />}
            {activeModal === 'support' && <Headphones className="w-5 h-5" />}
            {activeModal === 'announcements' && <Megaphone className="w-5 h-5" />}
            <h2 className="font-display font-bold text-base">
              {activeModal === 'deposit' && 'রিচার্জ করুন'}
              {activeModal === 'withdraw' && 'টাকা উত্তোলন'}
              {activeModal === 'bank_card' && 'ব্যাংক কার্ড সেটআপ'}
              {activeModal === 'bonus' && 'বোনাস কোড'}
              {activeModal === 'support' && 'কাস্টমার সাপোর্ট'}
              {activeModal === 'announcements' && 'সর্বশেষ নোটিশ'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/15 transition-colors"
            aria-label="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {/* DEPOSIT FORM (Minimum 500) */}
          {activeModal === 'deposit' && (
            <form onSubmit={(e) => handleTransactionSubmit('deposit_demo', e)} className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-[#061844] font-semibold tabular-nums">
                সর্বনিম্ন রিচার্জ: <span className="text-[#1250C4] font-extrabold">500 টাকা</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">পরিমাণ নির্বাচন করুন</label>
                <div className="grid grid-cols-4 gap-2">
                  {['500', '800', '1700', '3300'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors min-h-[40px] tabular-nums ${
                        amount === val
                          ? 'bg-[#1250C4] text-white border-[#1250C4]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {siteSettings.currency_symbol}
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="tx-amount" className="block text-xs font-semibold text-slate-700 mb-1">
                  টাকার পরিমাণ ({siteSettings.currency_symbol})
                </label>
                <input
                  id="tx-amount"
                  type="number"
                  min="500"
                  max="1000000"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1250C4] min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="tx-method" className="block text-xs font-semibold text-slate-700 mb-1">
                  পেমেন্ট মাধ্যম
                </label>
                <select
                  id="tx-method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1250C4] min-h-[44px]"
                >
                  <option value="Bkash">Bkash</option>
                  <option value="Nagad">Nagad</option>
                </select>
              </div>

              <div>
                <label htmlFor="tx-ref" className="block text-xs font-semibold text-slate-700 mb-1">
                  অ্যাকাউন্ট / ট্রানজেকশন আইডি (TrxID)
                </label>
                <input
                  id="tx-ref"
                  type="text"
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value)}
                  placeholder="আপনার নম্বর বা TrxID লিখুন"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1250C4] min-h-[44px]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#071D52] to-[#1250C4] text-white font-bold text-sm min-h-[46px] disabled:opacity-60"
              >
                {submitting ? 'জমা হচ্ছে...' : 'রিচার্জ নিশ্চিত করুন'}
              </button>
            </form>
          )}

          {/* WITHDRAW FORM (Minimum 150, 5% Charge, Requires Bank Card + >=1 Purchased Plan) */}
          {activeModal === 'withdraw' && (
            <form onSubmit={(e) => handleTransactionSubmit('withdraw_demo', e)} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#F4F8FF] border border-blue-200 text-xs text-[#061844] space-y-1 tabular-nums">
                <p>
                  • সর্বনিম্ন উত্তোলন: <strong>150 টাকা</strong>
                </p>
                <p>
                  • উত্তোলন চার্জ: <strong>5%</strong>
                </p>
                <p>
                  • উত্তোলন করার আগে ব্যাংক কার্ড সেটআপ ও কমপক্ষে <strong>1 টি প্ল্যান</strong> ক্রয় থাকতে হবে।
                </p>
              </div>

              {/* Gate 1: Bank Card Check */}
              {!bankCard ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2.5">
                  <div className="flex items-start gap-2 text-xs text-amber-900 font-semibold">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>উত্তোলনের জন্য প্রথমে আপনার ব্যাংক কার্ড (Bkash বা Nagad) সেটআপ করুন।</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenModal?.('bank_card')}
                    className="w-full py-2.5 rounded-xl bg-[#1250C4] text-white text-xs font-bold"
                  >
                    ব্যাংক কার্ড সেটআপ করুন
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <p className="font-bold text-emerald-900">
                      {bankCard.wallet_method} · <span className="tabular-nums">{bankCard.wallet_number}</span>
                    </p>
                    <p className="text-emerald-700 mt-0.5">নাম: {bankCard.account_name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenModal?.('bank_card')}
                    className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 font-bold text-[11px]"
                  >
                    পরিবর্তন
                  </button>
                </div>
              )}

              {/* Gate 2: Plan Purchased Check */}
              {userProducts.length === 0 && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2.5">
                  <div className="flex items-start gap-2 text-xs text-rose-900 font-semibold">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>ডিপোজিট করার পরে প্ল্যান না কিনে উত্তোলন করা যাবে না।</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/user/products');
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#061844] text-white text-xs font-bold"
                  >
                    প্ল্যান কিনুন
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">পরিমাণ নির্বাচন করুন</label>
                <div className="grid grid-cols-4 gap-2">
                  {['150', '500', '1000', '2500'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors min-h-[40px] tabular-nums ${
                        amount === val
                          ? 'bg-[#1250C4] text-white border-[#1250C4]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {siteSettings.currency_symbol}
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="wd-amount" className="block text-xs font-semibold text-slate-700 mb-1">
                  উত্তোলনের পরিমাণ ({siteSettings.currency_symbol})
                </label>
                <input
                  id="wd-amount"
                  type="number"
                  min="150"
                  max="1000000"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1250C4] min-h-[44px]"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs tabular-nums">
                <div className="flex justify-between">
                  <span className="text-slate-600">উত্তোলনের পরিমাণ:</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(parsedWithdraw, siteSettings.currency_symbol)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">উত্তোলন চার্জ (5%):</span>
                  <span className="font-bold text-rose-600">
                    -{formatCurrency(withdrawFee, siteSettings.currency_symbol)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="font-bold text-[#061844]">নিট প্রাপ্তি:</span>
                  <span className="font-extrabold text-emerald-700">
                    {formatCurrency(withdrawNet, siteSettings.currency_symbol)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !bankCard || userProducts.length === 0 || parsedWithdraw < 150}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#071D52] to-[#1250C4] text-white font-bold text-sm min-h-[46px] disabled:opacity-50"
              >
                {submitting ? 'জমা হচ্ছে...' : 'উত্তোলন নিশ্চিত করুন'}
              </button>
            </form>
          )}

          {/* BANK CARD SETUP MODAL */}
          {activeModal === 'bank_card' && (
            <form onSubmit={handleBankCardSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                টাকা উত্তোলনের জন্য আপনার সঠিক Bkash অথবা Nagad ওয়ালেট নম্বর ও নাম সেটআপ করুন।
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">মাধ্যম নির্বাচন করুন</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['Bkash', 'Nagad'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setWalletMethod(m)}
                      className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                        walletMethod === m
                          ? 'bg-[#1250C4] text-white border-[#1250C4] shadow-sm'
                          : 'bg-[#F4F8FF] text-[#061844] border-blue-100 hover:border-blue-300'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="wallet-num" className="block text-xs font-semibold text-slate-700 mb-1">
                  ওয়ালেট নাম্বার ({walletMethod})
                </label>
                <input
                  id="wallet-num"
                  type="tel"
                  required
                  value={walletNumber}
                  onChange={(e) => setWalletNumber(e.target.value)}
                  placeholder="01700000000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1250C4] min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="wallet-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  আপনার নাম
                </label>
                <input
                  id="wallet-name"
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="আপনার পূর্ণ নাম লিখুন"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1250C4] min-h-[44px]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#071D52] to-[#1250C4] text-white font-bold text-sm min-h-[46px] disabled:opacity-60"
              >
                {submitting ? 'সংরক্ষণ হচ্ছে...' : 'সাবমিট করুন'}
              </button>
            </form>
          )}

          {/* BONUS CODE MODAL */}
          {activeModal === 'bonus' && (
            <form onSubmit={handleRedeemBonus} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                তাৎক্ষণিক বোনাস পেতে নিচে আপনার SCANIA বোনাস কোড লিখুন।
              </p>

              <div>
                <label htmlFor="bonus-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  বোনাস কোড
                </label>
                <input
                  id="bonus-input"
                  type="text"
                  required
                  value={bonusCode}
                  onChange={(e) => setBonusCode(e.target.value.toUpperCase())}
                  placeholder="কোড লিখুন"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-base uppercase tracking-wider tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1250C4] min-h-[48px]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white font-bold text-sm min-h-[46px] disabled:opacity-60"
              >
                {submitting ? 'সংগ্রহ হচ্ছে...' : 'বোনাস সংগ্রহ করুন'}
              </button>
            </form>
          )}

          {/* ANNOUNCEMENTS MODAL */}
          {activeModal === 'announcements' && (
            <div className="space-y-3">
              {announcements.filter((a) => a.is_published).length === 0 ? (
                <EmptyState
                  icon={<Megaphone className="w-6 h-6" />}
                  title="কোনো নোটিশ নেই"
                  description="প্ল্যাটফর্মের নতুন ঘোষণা এখানে দেখা যাবে।"
                />
              ) : (
                announcements
                  .filter((a) => a.is_published)
                  .map((a) => (
                    <div key={a.id} className="p-4 rounded-2xl bg-[#F3F8FF] border border-blue-100">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm text-[#061844]">{a.title}</h3>
                        <span className="text-[11px] font-medium text-slate-500 shrink-0 tabular-nums">
                          {formatDateTime(a.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{a.content}</p>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* SUPPORT MODAL */}
          {activeModal === 'support' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-2xl bg-[#EEF4FF] border border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <p className="font-semibold text-[#061844]">অফিশিয়াল কাস্টমার সার্ভিস</p>
                  <p className="text-slate-600 mt-0.5 tabular-nums">
                    {siteSettings.support_email} · {siteSettings.support_phone}
                  </p>
                </div>
                {siteSettings.telegram_link && (
                  <a
                    href={siteSettings.telegram_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1250C4] text-white font-semibold"
                  >
                    <span>টেলিগ্রাম</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {userTickets.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">আপনার সাপোর্ট টিকিট</label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {userTickets.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSelectedTicket(t);
                          loadTicketMessages(t.id);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-medium shrink-0 border transition-colors ${
                          selectedTicket?.id === t.id
                            ? 'bg-[#0B2A6B] text-white border-[#0B2A6B]'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {t.subject}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedTicket && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 truncate">{selectedTicket.subject}</span>
                    <span className="text-[11px] font-semibold text-[#1250C4]">{selectedTicket.status}</span>
                  </div>
                  <div className="p-3 space-y-2.5 max-h-52 overflow-y-auto bg-white">
                    {(ticketMessages[selectedTicket.id] || []).map((m) => (
                      <div
                        key={m.id}
                        className={`p-2.5 rounded-xl text-xs max-w-[85%] ${
                          m.sender_role === 'user'
                            ? 'ml-auto bg-[#1250C4] text-white'
                            : 'mr-auto bg-slate-100 text-slate-800'
                        }`}
                      >
                        <p className="leading-relaxed">{m.message}</p>
                        <span className="block text-[10px] opacity-70 mt-1 tabular-nums">
                          {formatDateTime(m.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSendReply} className="p-2.5 bg-slate-50 border-t border-slate-200 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="বার্তা লিখুন..."
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#1250C4]"
                    />
                    <button
                      type="submit"
                      disabled={submitting || !replyText.trim()}
                      className="px-3.5 py-2 rounded-xl bg-[#1250C4] text-white text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>পাঠান</span>
                    </button>
                  </form>
                </div>
              )}

              <form onSubmit={handleCreateTicket} className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <MessageSquarePlus className="w-4 h-4 text-[#1250C4]" />
                  <span>কাস্টমার সার্ভিসে মেসেজ পাঠান</span>
                </div>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="বিষয়"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1250C4] min-h-[42px]"
                />
                <textarea
                  rows={3}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="আপনার সমস্যা বা প্রশ্ন বিস্তারিত লিখুন"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1250C4]"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-[#061844] hover:bg-[#0B2A6B] text-white text-xs font-semibold min-h-[42px] disabled:opacity-60"
                >
                  {submitting ? 'পাঠানো হচ্ছে...' : 'মেসেজ পাঠান'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
