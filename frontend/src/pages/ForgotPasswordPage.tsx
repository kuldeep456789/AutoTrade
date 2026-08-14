import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, Check, Eye, EyeOff, KeyRound, ShieldCheck, Fingerprint } from 'lucide-react';
import {
  useSendEmailOtpMutation,
  useVerifyEmailOtpMutation,
  useResetPasswordMutation,
} from '../store/slices/userApiSlice';
import OtpInput from '../components/OtpInput';
import toast from 'react-hot-toast';
import { validatePassword } from '../utils/password';
import AuthCard from '../components/auth/ui/AuthCard';
import AuthInput from '../components/auth/ui/AuthInput';
import AuthButton from '../components/auth/ui/AuthButton';
import PasswordStrengthMeter from '../components/auth/ui/PasswordStrengthMeter';

type Step = 'email' | 'otp' | 'password' | 'done';

const stepLabels = ['Email', 'Verify', 'Reset', 'Done'];

const ForgotPasswordPage = () => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(0);

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
    
    const emailStr = email.trim();
    if (!emailStr) { setErrorMessage('Enter your email address.'); return; }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailStr)) { setErrorMessage('Please enter a valid email address.'); return; }

    try {
      await sendOtp({ email: emailStr }).unwrap();
      setStep('otp');
      setCountdown(60);
      setOtpValues(['', '', '', '', '', '']);
      toast.success('OTP sent to your email');
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Failed to send OTP');
      toast.error(err?.data?.message || 'Failed to send OTP');
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
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const pwdError = validatePassword(newPassword);
    if (pwdError) { setErrorMessage(pwdError.message); return; }
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

  const stepIndex = (['email', 'otp', 'password', 'done'] as Step[]).indexOf(step);

  const inputBox = "flex items-center gap-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm px-5 py-4.5 transition-all duration-200 focus-within:border-orange-500/60 focus-within:ring-2 focus-within:ring-orange-500/10 focus-within:shadow-[0_0_20px_rgba(255,122,0,0.08)]";
  const inputField = "min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-zinc-400";

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Subtle background orbs */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 left-20 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-lg relative">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-zinc-500 hover:text-orange-500 transition-colors mb-8">
          <ArrowLeft size={14} strokeWidth={2} /> Back to Login
        </Link>

        <AuthCard
          title={step === 'done' ? 'All Set!' : 'Reset Password'}
          subtitle={
            step === 'email' ? 'Enter your email and we\'ll send you a OTP to reset your password.' :
            step === 'otp' ? 'Enter the 6-digit code sent to your email.' :
            step === 'password' ? 'Choose a new password for your account.' :
            'Your password has been reset successfully!'
          }
        >
          {/* Step progress indicator */}
          <div className="flex items-center justify-between mb-8">
            {stepLabels.map((label, idx) => (
              <div key={idx} className="flex items-center gap-0 flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
                    idx <= stepIndex
                      ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                  }`}>
                    {idx < stepIndex ? <Check size={14} strokeWidth={3} /> : idx + 1}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-widest mt-2 ${idx <= stepIndex ? 'text-orange-500' : 'text-zinc-400'}`}>
                    {label}
                  </span>
                </div>
                {idx < 3 && (
                  <div className={`flex-1 h-[2px] mx-2 rounded-full transition-all duration-500 ${idx < stepIndex ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-zinc-200 dark:bg-zinc-700'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <AuthInput
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={18} strokeWidth={1.5} />}
              />
              {errorMessage && <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3.5 text-[14px] font-semibold text-red-700 dark:text-red-300">{errorMessage}</div>}
              <div className="mt-2">
                <AuthButton type="submit" isLoading={sendingOtp} loadingText="Sending...">
                  Send OTP
                </AuthButton>
              </div>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <div className="space-y-4">
              <button type="button" onClick={() => setStep('email')} className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-500 hover:text-orange-500 transition-colors cursor-pointer mb-1">
                <ArrowLeft size={15} strokeWidth={2} /> Change email
              </button>
              <p className="text-[14px] text-zinc-500 text-center">OTP sent to <span className="font-semibold text-zinc-700 dark:text-zinc-300">{email}</span></p>
              <div className="py-2">
                <OtpInput
                  value={otpValues}
                  onChange={setOtpValues}
                  onComplete={handleVerifyOtp}
                  autoFocus
                />
              </div>
              {errorMessage && <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3.5 text-[14px] font-semibold text-red-700 dark:text-red-300">{errorMessage}</div>}
              <div className="mt-2">
                <AuthButton type="button" onClick={handleVerifyOtp} isLoading={verifyingOtp} loadingText="Verifying..." disabled={otpValues.join('').length !== 6}>
                  Verify OTP
                </AuthButton>
              </div>
              <p className="text-[12px] text-zinc-500 text-center dark:text-zinc-400 mt-2">
                Code is valid for <strong className="text-zinc-700 dark:text-zinc-200">10 minutes</strong>. If you don't see it in your inbox, please check your <strong className="text-zinc-700 dark:text-zinc-200">Spam or Junk folder</strong>.
              </p>
              <div className="text-center pt-1">
                {countdown > 0 ? (
                  <span className="text-[12px] text-zinc-400 font-medium">Resend OTP in {countdown}s</span>
                ) : (
                  <button type="button" onClick={handleSendOtp as any} className="text-[12px] font-bold text-orange-500 hover:text-orange-600 transition-colors cursor-pointer">Resend OTP</button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: New Password */}
          {step === 'password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <AuthInput
                label="New password"
                type="password"
                placeholder="8-64 chars, upper/lower/number/special"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                icon={<Lock size={18} strokeWidth={1.5} />}
                isPassword
              />
              <PasswordStrengthMeter password={newPassword} />

              <AuthInput
                label="Confirm new password"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock size={18} strokeWidth={1.5} />}
                isPassword
              />

              {errorMessage && <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3.5 text-[14px] font-semibold text-red-700 dark:text-red-300">{errorMessage}</div>}
              <div className="mt-2">
                <AuthButton type="submit" isLoading={resetting} loadingText="Resetting...">
                  Reset Password
                </AuthButton>
              </div>
            </form>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/25">
                <Check size={36} strokeWidth={2.5} className="text-white" />
              </div>
              <p className="text-[15px] text-zinc-500 mb-8 leading-7">Your password has been reset! You can now sign in with your new credentials.</p>
              <Link to="/login" className="inline-flex w-full h-16 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-[15px] font-bold tracking-wider items-center justify-center shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]">
                Sign In to AutoTrade
              </Link>
            </div>
          )}
        </AuthCard>

        {/* Trust badges */}
        <div className="mt-6 flex items-center justify-center gap-6 text-[10px] text-zinc-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Lock size={11} className="text-zinc-400" />
            <span>Secure</span>
          </span>
          <span className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={11} className="text-zinc-400" />
            <span>Encrypted</span>
          </span>
          <span className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
          <span className="flex items-center gap-1.5">
            <Fingerprint size={11} className="text-zinc-400" />
            <span>Private</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
