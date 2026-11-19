import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Phone, Users, ArrowRight } from 'lucide-react';
import { ScaniaLogoEmblem } from '../../components/ScaniaVisuals';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Feedback';

export const UserRegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRef = searchParams.get('ref') || '';

  const { signUp } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState(initialRef);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length < 7) {
      setErrorMsg('অনুগ্রহ করে একটি সঠিক মোবাইল নম্বর দিন।');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('পাসওয়ার্ড কমপক্ষে 6 অক্ষরের হতে হবে।');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না।');
      return;
    }

    setSubmitting(true);
    const res = await signUp({
      phone,
      password,
      referralCode,
    });
    setSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
      return;
    }

    showToast('রেজিস্ট্রেশন সম্পন্ন হয়েছে! SCANIA তে স্বাগতম।', 'success');
    navigate('/user');
  };

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-b from-[#041642] via-[#0B2D78] to-[#1354C9] flex flex-col">
      {/* Full-Screen Top Brand Header */}
      <div className="px-6 pt-10 pb-7 flex flex-col items-center justify-center text-white shrink-0">
        <Link to="/user" className="flex items-center gap-3 mb-1.5">
          <ScaniaLogoEmblem className="w-14 h-14" />
          <span className="font-display font-extrabold text-3xl tracking-wider uppercase">SCANIA</span>
        </Link>
        <p className="text-sm text-blue-100 font-medium">একসাথে আমরা এগিয়ে যাই</p>
      </div>

      {/* Full-Height Edge-to-Edge Form Sheet */}
      <div className="flex-1 w-full bg-white rounded-t-[32px] shadow-2xl px-6 sm:px-10 pt-7 pb-8 flex flex-col justify-between">
        <div className="w-full max-w-md mx-auto">
          <h1 className="font-display text-2xl font-extrabold text-[#061844]">নতুন অ্যাকাউন্ট তৈরি করুন</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">মোবাইল নম্বর এবং পাসওয়ার্ড দিয়ে রেজিস্ট্রেশন করুন।</p>

          {errorMsg && (
            <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* 1. Phone Number */}
            <div>
              <label htmlFor="reg-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                মোবাইল নম্বর
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#1250C4] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01700000000"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-blue-100 bg-[#F6F9FF] text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1250C4] min-h-[48px]"
                />
              </div>
            </div>

            {/* 2. Password */}
            <div>
              <label htmlFor="reg-pass" className="block text-xs font-semibold text-slate-700 mb-1.5">
                পাসওয়ার্ড
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#1250C4] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="কমপক্ষে 6 অক্ষর দিন"
                  className="w-full pl-11 pr-12 py-3.5 rounded-2xl border border-blue-100 bg-[#F6F9FF] text-sm focus:outline-none focus:ring-2 focus:ring-[#1250C4] min-h-[48px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 3. Confirm Password */}
            <div>
              <label htmlFor="reg-confirm" className="block text-xs font-semibold text-slate-700 mb-1.5">
                কনফার্ম পাসওয়ার্ড
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#1250C4] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="পুনরায় পাসওয়ার্ড দিন"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-blue-100 bg-[#F6F9FF] text-sm focus:outline-none focus:ring-2 focus:ring-[#1250C4] min-h-[48px]"
                />
              </div>
            </div>

            {/* Optional Referral Code */}
            <div>
              <label htmlFor="reg-ref" className="block text-xs font-semibold text-slate-700 mb-1.5">
                ইনভাইটেশন কোড (ঐচ্ছিক)
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-[#1250C4] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-ref"
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="রেফারেল কোড"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-blue-100 bg-[#F6F9FF] text-sm uppercase tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1250C4] min-h-[46px]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#071D52] via-[#0F3996] to-[#1A62DC] hover:opacity-95 text-white font-bold text-sm flex items-center justify-center gap-2 transition-opacity min-h-[52px] shadow-md disabled:opacity-60 mt-2"
            >
              <span>{submitting ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'রেজিস্টার করুন'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="w-full max-w-md mx-auto mt-6 pt-4 border-t border-slate-100 text-center text-xs sm:text-sm text-slate-500">
          ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
          <Link to="/login" className="font-bold text-[#1250C4] hover:underline">
            লগইন করুন
          </Link>
        </div>
      </div>
    </div>
  );
};
