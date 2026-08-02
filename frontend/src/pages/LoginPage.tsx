import { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowLeft, ShieldCheck, Award, Fingerprint, KeyRound } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { setCredentials } from '../store/slices/authSlice';
import { apiSlice } from '../store/slices/apiSlice';
import { clearCartItems } from '../store/slices/cartSlice';
import { clearWishlist } from '../store/slices/wishlistSlice';
import {
  useLoginMutation,
  useSendRegisterOtpMutation,
  useVerifyRegisterOtpMutation,
  useVerify2FALoginMutation,
} from '../store/slices/userApiSlice';
import toast from 'react-hot-toast';


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
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [errorMessage, setErrorMessage] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

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
    dispatch(clearCartItems());
    dispatch(clearWishlist());
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!loginEmail.trim() || !loginPassword.trim()) { setErrorMessage('Email and password are required.'); return; }
    try {
      const payload = await login({
        email: loginEmail.trim(),
        password: loginPassword,
      }).unwrap();
      if (payload.requires2FA) {
        setTempToken(payload.tempToken);
        setRequires2FA(true);
      } else {
        resetToFreshSession();
        dispatch(setCredentials({ ...payload.user, accessToken: payload.token || payload.accessToken }));
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
      dispatch(setCredentials({ ...payload.user, accessToken: payload.token || payload.accessToken }));
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
    if (!fullName.trim()) { setErrorMessage('Full name is required.'); return; }
    if (/\d/.test(fullName.trim())) { setErrorMessage('Full name should contain letters only, not numbers.'); return; }
    if (!registerEmail.trim()) { setErrorMessage('Email is required.'); return; }
    if (registerPassword.length < 6) { setErrorMessage('Password must be at least 6 characters.'); return; }
    if (registerPassword !== confirmPassword) { setErrorMessage('Passwords do not match.'); return; }
    
    try {
      await sendRegisterOtp({
        firstName: fullName.trim(),
        lastName: '',
        email: registerEmail.trim(),
        password: registerPassword,
        adminSecret: adminSecret.trim() ? adminSecret.trim() : undefined,
      }).unwrap();
      setRegisterStep('otp');
      setCountdown(30);
      toast.success('Registration OTP sent to your email');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      const msg = err?.data?.message || 'Failed to send registration OTP.';
      setErrorMessage(msg);
      toast.error(msg);
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpValues.join('');
    if (code.length !== 6) { setErrorMessage('Enter the 6-digit OTP'); return; }
    setErrorMessage('');
    try {
      const registerDto = {
        firstName: fullName.trim(),
        lastName: '',
        email: registerEmail.trim(),
        password: registerPassword,
        adminSecret: adminSecret.trim() ? adminSecret.trim() : undefined,
      };
      const payload = await verifyRegisterOtp({
        registerDto,
        code,
      }).unwrap();

      resetToFreshSession();
      dispatch(setCredentials({ ...payload.user, accessToken: payload.token || payload.accessToken }));
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
      otpRefs.current[0]?.focus();
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

            {/* Glassmorphism card */}
            <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-700/50 rounded-3xl p-10 sm:p-14 shadow-[0_8px_60px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_60px_rgba(0,0,0,0.3)]">
              <div className="mb-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20">
                  <KeyRound size={26} className="text-white" />
                </div>
                <h2 className="text-4xl font-black tracking-tight">
                  {isRegister ? 'Join AutoTrade' : 'Welcome back'}
                </h2>
                <p className="mt-3 text-[15px] leading-7 text-zinc-500 dark:text-zinc-400 normal-case tracking-normal">
                  {isRegister
                    ? 'Create your free account — no card required.'
                    : 'Sign in to access your dashboard, orders, and more.'}
                </p>
              </div>

              {/* LOGIN FORM */}
              {!isRegister && !requires2FA && (
                <>
                  <form onSubmit={handleLogin} className="space-y-5" noValidate>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-2.5">Email address</label>
                      <div className={inputBox}>
                        <Mail size={17} className="shrink-0 text-zinc-400" />
                        <input type="email" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className={inputField} />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Password</label>
                      <div className={inputBox}>
                        <Lock size={17} className="shrink-0 text-zinc-400" />
                        <input type={showLoginPassword ? 'text' : 'password'} placeholder="Enter your password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className={inputField} />
                        <button type="button" onClick={() => setShowLoginPassword((p) => !p)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer transition-colors">
                          {showLoginPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Link to="/forgot-password" className="text-[12px] font-semibold text-orange-500 hover:text-orange-600 transition-colors">
                        Forgot Password?
                      </Link>
                    </div>

                    {errorMessage && (
                      <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">{errorMessage}</div>
                    )}

                    <button type="submit" disabled={isLoading} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white h-16 text-[15px] font-bold tracking-wider transition-all duration-300 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 disabled:opacity-60 cursor-pointer active:scale-[0.98]">
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Signing in...
                        </span>
                      ) : 'Sign In'}
                    </button>
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
                    <h3 className="text-3xl font-black tracking-tight">Authentication Code</h3>
                    <p className="mt-3 text-[15px] leading-7 text-zinc-500 dark:text-zinc-400 normal-case tracking-normal">
                      Open your authenticator app and enter the 6-digit code.
                    </p>
                  </div>
                  <div>
                    <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">6-Digit Code</label>
                    <div className={inputBox}>
                      <input type="text" inputMode="numeric" placeholder="1 2 3 4 5 6" value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="min-w-0 flex-1 bg-transparent text-center text-xl tracking-[0.5em] font-semibold outline-none placeholder:text-zinc-400 normal-case" />
                    </div>
                  </div>
                  
                  {errorMessage && (
                    <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">{errorMessage}</div>
                  )}

                  <button type="submit" disabled={verifying2FA || twoFactorCode.length !== 6} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white h-16 text-[15px] font-bold tracking-wider transition-all duration-300 shadow-lg shadow-orange-500/20 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2">
                    {verifying2FA ? 'Verifying...' : 'Verify & Sign In →'}
                  </button>

                  <p className="text-center text-xs text-zinc-500 normal-case tracking-normal mt-4">
                    <button type="button" onClick={() => { setRequires2FA(false); setTempToken(''); setTwoFactorCode(''); setErrorMessage(''); }} className="font-semibold text-zinc-500 hover:text-orange-500 transition cursor-pointer">← Back to login</button>
                  </p>
                </form>
              )}

              {/* REGISTER FORM */}
              {isRegister && (
                registerStep === 'form' ? (
                  <form onSubmit={handleRegister} className="space-y-5" noValidate>
                    <div>
                      <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Full Name</label>
                      <div className={inputBox}>
                        <input type="text" placeholder="Aarav Sharma" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputField} />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Email address</label>
                      <div className={inputBox}>
                        <Mail size={17} className="shrink-0 text-zinc-400" />
                        <input type="email" placeholder="you@example.com" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} className={inputField} />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Password</label>
                      <div className={inputBox}>
                        <Lock size={17} className="shrink-0 text-zinc-400" />
                        <input type={showRegisterPassword ? 'text' : 'password'} placeholder="Minimum 6 characters" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} className={inputField} />
                        <button type="button" onClick={() => setShowRegisterPassword((p) => !p)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer">
                          {showRegisterPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Confirm password</label>
                      <div className={inputBox}>
                        <Lock size={17} className="shrink-0 text-zinc-400" />
                        <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputField} />
                        <button type="button" onClick={() => setShowConfirmPassword((p) => !p)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer">
                          {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                        Admin Secret Code <span className="normal-case text-zinc-400 font-normal">(Optional)</span>
                      </label>
                      <div className={inputBox}>
                        <ShieldCheck size={17} className="shrink-0 text-zinc-400" />
                        <input type="password" placeholder="Leave blank for regular user" value={adminSecret} onChange={(e) => setAdminSecret(e.target.value)} className={inputField} />
                      </div>
                    </div>

                    {errorMessage && (
                      <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">{errorMessage}</div>
                    )}

                    <button type="submit" disabled={isLoading} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white h-16 text-[15px] font-bold tracking-wider transition-all duration-300 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 disabled:opacity-60 cursor-pointer active:scale-[0.98]">
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Creating account...
                        </span>
                      ) : 'Create Account'}
                    </button>

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
                    <p className="text-[13px] text-zinc-500 mb-4">OTP sent to {registerEmail}</p>
                    
                    <div className="flex gap-3 justify-center mb-3">
                      {otpValues.map((val, i) => (
                        <input
                          key={i}
                          ref={(el) => { otpRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={val}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className={`w-13 h-15 p-0 px-0 min-w-0 text-center text-xl font-bold leading-none rounded-xl border-2 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm outline-none transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            val ? 'border-orange-500 text-orange-500 shadow-sm shadow-orange-500/10' : 'border-zinc-200 dark:border-zinc-700 focus:border-orange-500'
                          }`}
                        />
                      ))}
                    </div>

                    {errorMessage && (
                      <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">{errorMessage}</div>
                    )}

                    <button type="submit" disabled={isLoading || otpValues.join('').length !== 6} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white h-16 text-[15px] font-bold tracking-wider transition-all duration-300 shadow-lg shadow-orange-500/20 disabled:opacity-60 cursor-pointer">
                      {isLoading ? 'Verifying...' : 'Verify & Create Account'}
                    </button>

                    <div className="text-center">
                      {countdown > 0 ? (
                        <span className="text-[12px] text-zinc-400">Resend in {countdown}s</span>
                      ) : (
                        <button type="button" onClick={handleRegister} className="text-[12px] font-semibold text-orange-500 hover:text-orange-600 transition-colors cursor-pointer">Resend OTP</button>
                      )}
                    </div>
                  </form>
                )
              )}
            </div>

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
