import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowLeft, ShieldCheck, Award, Fingerprint, KeyRound } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { setCredentials } from '../store/slices/authSlice';
import { apiSlice } from '../store/slices/apiSlice';
import { clearCartItems } from '../store/slices/cartSlice';
import {
  useLoginMutation,
  useSendRegisterOtpMutation,
  useVerifyRegisterOtpMutation,
  useVerify2FALoginMutation,
} from '../store/slices/userApiSlice';
import OtpInput from '../components/OtpInput';
import toast from 'react-hot-toast';
import { validatePassword } from '../utils/password';
import AuthCard from '../components/auth/ui/AuthCard';
import AuthInput from '../components/auth/ui/AuthInput';
import AuthButton from '../components/auth/ui/AuthButton';
import PasswordStrengthMeter from '../components/auth/ui/PasswordStrengthMeter';


const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = new URLSearchParams(location.search).get('redirect') || '/';
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);

  const [isRegister, setIsRegister] = useState(location.pathname === '/register');

  // Email login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register fields
  const [fullName, setFullName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Register OTP Flow state
  const [registerStep, setRegisterStep] = useState<'form' | 'otp'>('form');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);

  const [errorMessage, setErrorMessage] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const twoFactorDigits = twoFactorCode.split('').concat(Array(6).fill('')).slice(0, 6);
  const setTwoFactorDigits = (digits: string[]) => setTwoFactorCode(digits.join(''));

  const [login, { isLoading: loginLoading }] = useLoginMutation();
  const [verify2FALogin, { isLoading: verifying2FA }] = useVerify2FALoginMutation();
  const [sendRegisterOtp, { isLoading: sendingRegisterOtp }] = useSendRegisterOtpMutation();
  const [verifyRegisterOtp, { isLoading: verifyingRegisterOtp }] = useVerifyRegisterOtpMutation();
  const isLoading = loginLoading || sendingRegisterOtp || verifyingRegisterOtp || verifying2FA;

  useEffect(() => {
    if (countdown <= 0) return;
    const int = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(int);
  }, [countdown]);

  useEffect(() => {
    if (userInfo) {
      if (userInfo.role === 'admin') {
        sessionStorage.setItem('at_admin_verified', '1');
        if (redirect === '/') {
          navigate('/admin');
        } else {
          navigate(redirect);
        }
      } else {
        navigate(redirect);
      }
    }
  }, [navigate, redirect, userInfo]);

  const switchMode = (toRegister: boolean) => {
    setIsRegister(toRegister);
    setRegisterStep('form');
    setErrorMessage('');
  };

    const resetToFreshSession = () => {
    dispatch(apiSlice.util.resetApiState());
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    const emailStr = loginEmail.trim();
    if (!emailStr || !loginPassword.trim()) { setErrorMessage('Email and password are required.'); return; }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailStr)) { setErrorMessage('Please enter a valid email address.'); return; }

    try {
      const payload = await login({
        email: emailStr,
        password: loginPassword,
      }).unwrap();
      if (payload.requires2FA) {
        setTempToken(payload.tempToken);
        setRequires2FA(true);
      } else {
        resetToFreshSession();
        dispatch(
          setCredentials({
            ...payload.user,
            accessToken: payload.accessToken || payload.token,
            refreshToken: payload.refreshToken,
          })
        );
        if (payload?.user?.role === 'admin') {
          sessionStorage.setItem('at_admin_verified', '1');
        }
        toast.success('Login successful');
      }
    } catch (err: any) {
      const msg = err?.data?.message || 'Login failed. Please check your credentials.';
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (twoFactorCode.length !== 6) { setErrorMessage('Enter the 6-digit code'); return; }
    try {
      const payload = await verify2FALogin({ tempToken, code: twoFactorCode }).unwrap();
      resetToFreshSession();
      dispatch(
        setCredentials({
          ...payload.user,
          accessToken: payload.accessToken || payload.token,
          refreshToken: payload.refreshToken,
        })
      );
      if (payload?.user?.role === 'admin') {
        sessionStorage.setItem('at_admin_verified', '1');
      }
      toast.success('Login successful');
    } catch (err: any) {
      const msg = err?.data?.message || 'Invalid authentication code';
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const nameStr = fullName.trim();
    if (!nameStr) { setErrorMessage('Full name is required.'); return; }
    if (/\d/.test(nameStr)) { setErrorMessage('Full name should contain letters only, not numbers.'); return; }
    
    const emailStr = registerEmail.trim();
    if (!emailStr) { setErrorMessage('Email is required.'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailStr)) { setErrorMessage('Please enter a valid email address.'); return; }

    const pwdError = validatePassword(registerPassword);
    if (pwdError) { setErrorMessage(pwdError.message); return; }
    if (registerPassword !== confirmPassword) { setErrorMessage('Passwords do not match.'); return; }

    const nameParts = nameStr.split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    try {
      await sendRegisterOtp({
        firstName,
        lastName,
        email: emailStr,
        password: registerPassword,
        adminSecret: adminSecret.trim() ? adminSecret.trim() : undefined,
      }).unwrap();
      setRegisterStep('otp');
      setCountdown(60);
      setOtpValues(['', '', '', '', '', '']);
      toast.success('Registration OTP sent to your email');
    } catch (err: any) {
      const msg = err?.data?.message || 'Failed to send registration OTP.';
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpValues.join('');
    if (code.length !== 6) { setErrorMessage('Enter the 6-digit OTP'); return; }
    setErrorMessage('');
    try {
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      
      const registerDto = {
        firstName,
        lastName,
        email: registerEmail.trim(),
        password: registerPassword,
        adminSecret: adminSecret.trim() ? adminSecret.trim() : undefined,
      };
      const payload = await verifyRegisterOtp({
        registerDto,
        code,
      }).unwrap();

      resetToFreshSession();
      dispatch(
        setCredentials({
          ...payload.user,
          accessToken: payload.accessToken || payload.token,
          refreshToken: payload.refreshToken,
        })
      );
      if (payload?.user?.role === 'admin') {
        sessionStorage.setItem('at_admin_verified', '1');
        toast.success('Administrator account created! Directing to dashboard...');
        navigate('/admin');
      } else {
        toast.success('Registration successful! Welcome to AutoTrade');
        navigate(redirect);
      }
    } catch (err: any) {
      const msg = err?.data?.message || 'Invalid or expired OTP';
      setErrorMessage(msg);
      toast.error(msg);
      setOtpValues(['', '', '', '', '', '']);
    }
  };

  /* ─── Shared input styling ─── */
  const inputBox = "flex items-center gap-3.5 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm px-5 py-4 transition-all duration-200 focus-within:border-orange-500/60 focus-within:ring-2 focus-within:ring-orange-500/10 focus-within:shadow-[0_0_20px_rgba(255,122,0,0.08)]";
  const inputField = "min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-zinc-400 text-left normal-case";

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
        {/* Left — Brand panel with gradient overlay */}
        <section className="relative hidden overflow-hidden lg:block">
          <img
            src="/img/car2.png"
            alt="AutoTrade automotive"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-orange-950/30" />
          {/* Subtle animated gradient orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-amber-500/8 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

          <div className="relative z-10 flex h-full flex-col justify-between p-14">
            <Link to="/" className="text-2xl font-black tracking-tight text-white">AutoTrade</Link>
            <div className="max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[10px] font-bold uppercase tracking-widest mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                Trusted by 10,000+ businesses
              </div>
              <h1 className="text-6xl font-black leading-none tracking-tight text-white">
                AutoTrade
              </h1>
              <p className="mt-4 text-xl font-light text-white/80 tracking-wide">
                Drive Business Forward
              </p>
              <p className="mt-5 text-sm leading-7 text-white/60 max-w-md normal-case tracking-normal">
                Discover premium automotive accessories, electronics, motorcycle parts, and replacement components.
              </p>

              {/* Trust indicators on left panel */}
              <div className="mt-10 flex flex-col gap-3">
                {[
                  { icon: ShieldCheck, text: '256-bit SSL Encryption' },
                  { icon: Award, text: 'OEM Certified Parts' },
                  { icon: Fingerprint, text: 'Secure Account Protection' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-white/50 text-xs">
                    <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <item.icon size={14} className="text-orange-400" />
                    </div>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Right — Form panel with glassmorphism */}
        <section className="relative flex items-center justify-center px-6 py-16 sm:px-12 lg:px-16 overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-10 right-10 w-72 h-72 bg-orange-500/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-20 left-10 w-56 h-56 bg-amber-500/5 rounded-full blur-[80px]" />
          </div>

          <div className="relative w-full max-w-lg">
            {/* Mobile brand */}
            <Link to="/" className="mb-8 block text-2xl font-black tracking-tight lg:hidden">AutoTrade</Link>

            <AuthCard
              title={isRegister ? 'Join AutoTrade' : 'Welcome back'}
              subtitle={isRegister ? 'Create your account' : 'Sign in to access your dashboard'}
            >
              {/* LOGIN FORM */}
              {!isRegister && !requires2FA && (
                <>
                  <form onSubmit={handleLogin} className="space-y-4" noValidate>
                    <AuthInput
                      label="Email address"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      icon={<Mail size={18} strokeWidth={1.5} />}
                    />
                    
                    <AuthInput
                      label="Password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      icon={<Lock size={18} strokeWidth={1.5} />}
                      isPassword
                    />

                    <div className="flex justify-end">
                      <Link to="/forgot-password" className="text-[12px] font-semibold text-orange-500 hover:text-orange-600 transition-colors">
                        Forgot Password?
                      </Link>
                    </div>

                    {errorMessage && (
                      <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300 animate-fadeIn">{errorMessage}</div>
                    )}

                    <div className="mt-2">
                      <AuthButton type="submit" isLoading={isLoading} loadingText="Signing in...">
                        Sign In
                      </AuthButton>
                    </div>
                  </form>

                  <div className="mt-8 text-center">
                    <p className="text-sm text-zinc-500 normal-case tracking-normal">
                      Don't have an account?{' '}
                      <button type="button" onClick={() => switchMode(true)} className="font-bold text-orange-500 hover:text-orange-600 transition-colors cursor-pointer">Sign up</button>
                    </p>
                  </div>
                </>
              )}

              {/* 2FA FORM */}
              {!isRegister && requires2FA && (
                <form onSubmit={handleVerify2FA} className="space-y-5" noValidate>
                  <div className="mb-5">
                    {/* <h3 className="text-3xl font-black tracking-tight">Authentication Code</h3> */}
                    {/* <p className="mt-3 text-[15px] leading-7 text-zinc-500 dark:text-zinc-400 normal-case tracking-normal">
                      Open your authenticator app and enter the 6-digit code.
                    </p> */}
                  </div>
                  <div>
                    <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">6-Digit Code</label>
                    <OtpInput
                      value={twoFactorDigits}
                      onChange={setTwoFactorDigits}
                      autoFocus
                    />
                  </div>

                  {errorMessage && (
                    <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">{errorMessage}</div>
                  )}

                  <div className="mt-4">
                    <AuthButton type="submit" isLoading={verifying2FA} loadingText="Verifying..." disabled={twoFactorCode.length !== 6}>
                      Verify & Sign In
                    </AuthButton>
                  </div>

                  <p className="text-center text-xs text-zinc-500 normal-case tracking-normal mt-4">
                    <button type="button" onClick={() => { setRequires2FA(false); setTempToken(''); setTwoFactorCode(''); setErrorMessage(''); }} className="font-semibold text-zinc-500 hover:text-orange-500 transition cursor-pointer">← Back to login</button>
                  </p>
                </form>
              )}


              {isRegister && (
                registerStep === 'form' ? (
                  <form onSubmit={handleRegister} className="space-y-4" noValidate>
                    <AuthInput
                      label="Full Name"
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                    
                    <AuthInput
                      label="Email address"
                      type="email"
                      placeholder="you@example.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      icon={<Mail size={18} strokeWidth={1.5} />}
                    />
                    
                    <AuthInput
                      label="Password"
                      type="password"
                      placeholder="Enter your password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      icon={<Lock size={18} strokeWidth={1.5} />}
                      isPassword
                    />
                    <PasswordStrengthMeter password={registerPassword} />

                    <AuthInput
                      label="Confirm password"
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      icon={<Lock size={18} strokeWidth={1.5} />}
                      isPassword
                    />

                    <AuthInput
                      label="Admin Secret Code (Optional)"
                      type="password"
                      placeholder="Enter admin secret code"
                      value={adminSecret}
                      onChange={(e) => setAdminSecret(e.target.value)}
                      icon={<ShieldCheck size={18} strokeWidth={1.5} />}
                      isPassword
                    />

                    {errorMessage && (
                      <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">{errorMessage}</div>
                    )}

                    <div className="mt-2">
                      <AuthButton type="submit" isLoading={isLoading} loadingText="Creating account...">
                        Create Account
                      </AuthButton>
                    </div>

                    <p className="text-center text-sm text-zinc-500 normal-case tracking-normal">
                      Already have an account?{' '}
                      <button type="button" onClick={() => switchMode(false)} className="font-bold text-orange-500 hover:text-orange-600 transition-colors cursor-pointer">Login</button>
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-5" noValidate>
                    <button type="button" onClick={() => setRegisterStep('form')} className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-500 hover:text-orange-500 transition-colors cursor-pointer mb-2">
                      <ArrowLeft size={14} strokeWidth={2} /> Back to Register Form
                    </button>
                    <p className="text-[13px] text-zinc-500 mb-4 text-center">OTP sent to {registerEmail}</p>

                    <div className="mb-3">
                      <OtpInput
                        value={otpValues}
                        onChange={setOtpValues}
                        autoFocus
                      />
                    </div>

                    {errorMessage && (
                      <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">{errorMessage}</div>
                    )}

                    <div className="mt-4">
                      <AuthButton type="submit" isLoading={isLoading} loadingText="Verifying..." disabled={otpValues.join('').length !== 6}>
                        Verify & Create Account
                      </AuthButton>
                    </div>

                    <p className="text-[12px] text-zinc-500 text-center dark:text-zinc-400 mt-2">
                      Code is valid for <strong className="text-zinc-700 dark:text-zinc-200">10 minutes</strong>. If you don't see it in your inbox, please check your <strong className="text-zinc-700 dark:text-zinc-200">Spam or Junk folder</strong>.
                    </p>

                    <div className="text-center pt-1">
                      {countdown > 0 ? (
                        <span className="text-[12px] text-zinc-400 font-medium">Resend OTP in {countdown}s</span>
                      ) : (
                        <button type="button" onClick={handleRegister} className="text-[12px] font-bold text-orange-500 hover:text-orange-600 transition-colors cursor-pointer">Resend OTP</button>
                      )}
                    </div>
                  </form>
                )
              )}
            </AuthCard>

            {/* Trust badges below the card */}
            <div className="mt-8 flex items-center justify-center gap-8 text-[11px] text-zinc-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Lock size={11} className="text-zinc-400" />
                <span>Secure Login</span>
              </span>
              <span className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={11} className="text-zinc-400" />
                <span>256-bit Encryption</span>
              </span>
              <span className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
              <span className="flex items-center gap-1.5">
                <Fingerprint size={11} className="text-zinc-400" />
                <span>Privacy Protected</span>
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
