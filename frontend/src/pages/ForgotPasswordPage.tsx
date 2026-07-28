import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, Check, Eye, EyeOff } from 'lucide-react';
import {
  useSendEmailOtpMutation,
  useVerifyEmailOtpMutation,
  useResetPasswordMutation,
} from '../store/slices/userApiSlice';
import toast from 'react-hot-toast';

type Step = 'email' | 'otp' | 'password' | 'done';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [sendOtp, { isLoading: sendingOtp }] = useSendEmailOtpMutation();
  const [verifyOtp, { isLoading: verifyingOtp }] = useVerifyEmailOtpMutation();
  const [resetPassword, { isLoading: resetting }] = useResetPasswordMutation();

  useEffect(() => {
    if (countdown <= 0) return;
    const int = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(int);
  }, [countdown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email.trim()) { setErrorMessage('Enter your email address.'); return; }
    try {
      await sendOtp({ email: email.trim() }).unwrap();
      setStep('otp');
      setCountdown(30);
      toast.success('OTP sent to your email');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Failed to send OTP');
      toast.error(err?.data?.message || 'Failed to send OTP');
    }
  };

  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otpValues];
    next[idx] = val;
    setOtpValues(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValues[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpValues.join('');
    if (code.length !== 6) { setErrorMessage('Enter the 6-digit OTP'); return; }
    setErrorMessage('');
    try {
      await verifyOtp({ email: email.trim(), code }).unwrap();
      setStep('password');
      toast.success('OTP verified');
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Invalid or expired OTP');
      toast.error(err?.data?.message || 'Invalid OTP');
      setOtpValues(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (newPassword.length < 6) { setErrorMessage('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setErrorMessage('Passwords do not match.'); return; }
    try {
      await resetPassword({ email: email.trim(), password: newPassword }).unwrap();
      setStep('done');
      toast.success('Password reset successfully');
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Failed to reset password');
      toast.error(err?.data?.message || 'Failed to reset password');
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-zinc-500 hover:text-[hsl(var(--foreground))] transition-colors mb-8">
          <ArrowLeft size={14} strokeWidth={2} /> Back to Login
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight">Forgot Password</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {step === 'email' && 'Enter your email and we\'ll send you a OTP to reset your password.'}
            {step === 'otp' && 'Enter the 6-digit code sent to your email.'}
            {step === 'password' && 'Choose a new password for your account.'}
            {step === 'done' && 'Your password has been reset successfully!'}
          </p>
        </div>

        {/* Step 1: Email */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-zinc-500">Email address</label>
              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-[hsl(var(--card))] px-4 py-3.5 transition focus-within:border-zinc-500">
                <Mail size={17} className="shrink-0 text-zinc-400" />
                <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400" />
              </div>
            </div>
            {errorMessage && <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">{errorMessage}</div>}
            <button type="submit" disabled={sendingOtp} className="w-full rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] py-4 text-sm font-bold tracking-wider transition hover:opacity-90 disabled:opacity-60 cursor-pointer">
              {sendingOtp ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        )}

        {/* Step 2: OTP */}
        {step === 'otp' && (
          <div className="space-y-4">
            <button type="button" onClick={() => setStep('email')} className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-500 hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer mb-2">
              <ArrowLeft size={14} strokeWidth={2} /> Change email
            </button>
            <p className="text-[13px] text-zinc-500 mb-4">OTP sent to {email}</p>
            <div className="flex gap-2 justify-center mb-2">
              {otpValues.map((val, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text" inputMode="numeric" maxLength={1} value={val}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className={`w-11 h-12 text-center text-lg font-bold rounded-xl border-2 bg-[hsl(var(--card))] outline-none transition-all duration-150 ${
                    val ? 'border-[hsl(var(--foreground))]' : 'border-zinc-200 dark:border-zinc-700 focus:border-zinc-500'
                  }`}
                />
              ))}
            </div>
            {errorMessage && <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">{errorMessage}</div>}
            <button type="button" onClick={handleVerifyOtp} disabled={verifyingOtp || otpValues.join('').length !== 6} className="w-full rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] py-4 text-sm font-bold tracking-wider transition hover:opacity-90 disabled:opacity-60 cursor-pointer">
              {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
            </button>
            <div className="text-center">
              {countdown > 0 ? (
                <span className="text-[12px] text-zinc-400">Resend in {countdown}s</span>
              ) : (
                <button type="button" onClick={handleSendOtp as any} className="text-[12px] font-semibold text-[hsl(var(--foreground))] underline underline-offset-2 hover:opacity-80 cursor-pointer">Resend OTP</button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: New Password */}
        {step === 'password' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-zinc-500">New password</label>
              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-[hsl(var(--card))] px-4 py-3.5 transition focus-within:border-zinc-500">
                <Lock size={17} className="shrink-0 text-zinc-400" />
                <input type={showPassword ? 'text' : 'password'} placeholder="Minimum 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400" />
                <button type="button" onClick={() => setShowPassword((p) => !p)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer">
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-zinc-500">Confirm new password</label>
              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-[hsl(var(--card))] px-4 py-3.5 transition focus-within:border-zinc-500">
                <Lock size={17} className="shrink-0 text-zinc-400" />
                <input type={showConfirm ? 'text' : 'password'} placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400" />
                <button type="button" onClick={() => setShowConfirm((p) => !p)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer">
                  {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            {errorMessage && <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">{errorMessage}</div>}
            <button type="submit" disabled={resetting} className="w-full rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] py-4 text-sm font-bold tracking-wider transition hover:opacity-90 disabled:opacity-60 cursor-pointer">
              {resetting ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <Check size={28} strokeWidth={2.5} className="text-green-600" />
            </div>
            <p className="text-[14px] text-zinc-500 mb-6">You can now sign in with your new password.</p>
            <Link to="/login" className="inline-flex h-[52px] px-8 rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[14px] font-bold tracking-wide items-center justify-center hover:opacity-90 transition-all">
              Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
