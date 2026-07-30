import { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Shield, X, ArrowLeft } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { setCredentials } from '../store/slices/authSlice';
import { apiSlice } from '../store/slices/apiSlice';
import { clearCartItems } from '../store/slices/cartSlice';
import { clearWishlist } from '../store/slices/wishlistSlice';
import {
  useLoginMutation,
  useAdminSecretLoginMutation,
  useRegisterMutation,
  useSendRegisterOtpMutation,
  useVerifyRegisterOtpMutation,
} from '../store/slices/userApiSlice';
import toast from 'react-hot-toast';


const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = new URLSearchParams(location.search).get('redirect') || '/';
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);

  const [isRegister, setIsRegister] = useState(location.pathname === '/register');

  // Admin Modal state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('admin@autotrade.app');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  const handleAdminModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    if (!adminEmail.trim() || !adminPassword.trim()) {
      setAdminError('Please enter both Admin Email ID and Password.');
      return;
    }
    setAdminSubmitting(true);
    try {
      const payload = await login({
        email: adminEmail.trim(),
        password: adminPassword,
      }).unwrap();

      if (payload?.user?.role !== 'admin') {
        setAdminError('Access denied. This account does not have administrator privileges.');
        setAdminSubmitting(false);
        return;
      }

      resetToFreshSession();
      dispatch(setCredentials({ ...payload.user, accessToken: payload.token || payload.accessToken }));
      toast.success('Administrator authenticated successfully!');
      setIsAdminModalOpen(false);
      navigate('/admin');
    } catch (err: any) {
      const msg = err?.data?.message || 'Invalid administrator credentials.';
      setAdminError(msg);
    } finally {
      setAdminSubmitting(false);
    }
  };

  // Email login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register fields
  const [fullName, setFullName] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Register OTP Flow state
  const [registerStep, setRegisterStep] = useState<'form' | 'otp'>('form');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [errorMessage, setErrorMessage] = useState('');
  const [login, { isLoading: loginLoading }] = useLoginMutation();
  const [register, { isLoading: registerLoading }] = useRegisterMutation();
  const [sendRegisterOtp, { isLoading: sendingRegisterOtp }] = useSendRegisterOtpMutation();
  const [verifyRegisterOtp, { isLoading: verifyingRegisterOtp }] = useVerifyRegisterOtpMutation();
  const isLoading = loginLoading || registerLoading || sendingRegisterOtp || verifyingRegisterOtp;

  useEffect(() => {
    if (countdown <= 0) return;
    const int = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(int);
  }, [countdown]);

  useEffect(() => {
    if (userInfo) {
      if (userInfo.role === 'admin' && redirect === '/') {
        navigate('/admin');
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
      const payload = await login({ email: loginEmail.trim(), password: loginPassword }).unwrap();
      resetToFreshSession();
      dispatch(setCredentials({ ...payload.user, accessToken: payload.token || payload.accessToken }));
      toast.success('Login successful');
    } catch (err: any) {
      const msg = err?.data?.message || 'Login failed. Please check your credentials.';
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
        adminSecret: adminSecret.trim() || undefined,
        email: registerEmail.trim(),
        password: registerPassword,
        ...(registerPhone ? { phone: `+91${registerPhone.replace(/\D/g, '')}` } : {}),
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
        adminSecret: adminSecret.trim() || undefined,
        email: registerEmail.trim(),
        password: registerPassword,
        ...(registerPhone ? { phone: `+91${registerPhone.replace(/\D/g, '')}` } : {}),
      };
      const payload = await verifyRegisterOtp({
        registerDto,
        code,
      }).unwrap();

      resetToFreshSession();
      dispatch(setCredentials({ ...payload.user, accessToken: payload.token || payload.accessToken }));
      if (payload?.user?.role === 'admin') {
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

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
        {/* Left — Brand image overlay */}
        <section className="relative hidden overflow-hidden lg:block animate-fade-in">
          <img
            src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&q=80"
            alt="AutoTrade automotive"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 flex h-full flex-col justify-between p-14">
            <Link to="/" className="text-2xl font-black tracking-tight text-white">AutoTrade</Link>
            <div className="max-w-lg">
              <h1 className="text-6xl font-black leading-none tracking-tight text-white">
                AutoTrade
              </h1>
              <p className="mt-4 text-xl font-light text-white/80 tracking-wide">
                Drive Business Forward
              </p>
              <p className="mt-5 text-sm leading-7 text-white/60 max-w-md normal-case tracking-normal">
                Discover premium automotive accessories, electronics, motorcycle parts, and replacement components.
              </p>
              <p className="mt-3 text-sm leading-6 text-white/50 max-w-md normal-case tracking-normal">
                Sign in to explore your personalized dashboard and orders.
              </p>
            </div>
          </div>
        </section>

        {/* Right — Form panel */}
        <section className="flex items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-md">

            {/* Mobile brand */}
            <Link to="/" className="mb-8 block text-2xl font-black tracking-tight lg:hidden">AutoTrade</Link>

            <div className="mb-8">
              <h2 className="text-4xl font-black tracking-tight">
                {isRegister ? 'Join AutoTrade' : 'Sign in'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400 normal-case tracking-normal">
                {isRegister
                  ? 'Create your free account — no card required.'
                  : 'Access your cart, wishlist, and order history.'}
              </p>
            </div>

            {/* LOGIN FORM */}
            {!isRegister && (
              <>
                <form onSubmit={handleLogin} className="space-y-4" noValidate>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Email address</label>
                    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-[hsl(var(--card))] px-4 py-3.5 transition focus-within:border-zinc-500">
                      <Mail size={17} className="shrink-0 text-zinc-400" />
                      <input type="email" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400 text-left normal-case" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Password</label>
                    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-[hsl(var(--card))] px-4 py-3.5 transition focus-within:border-zinc-500">
                      <Lock size={17} className="shrink-0 text-zinc-400" />
                      <input type={showLoginPassword ? 'text' : 'password'} placeholder="Enter your password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400 text-left normal-case" />
                      <button type="button" onClick={() => setShowLoginPassword((p) => !p)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer">
                        {showLoginPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Link to="/forgot-password" className="text-[12px] font-semibold text-zinc-500 hover:text-[hsl(var(--foreground))] underline underline-offset-2 transition-colors">
                      Forgot Password?
                    </Link>
                  </div>

                  {errorMessage && (
                    <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">{errorMessage}</div>
                  )}

                  <button type="submit" disabled={isLoading} className="mt-2 w-full rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] h-14 text-sm font-semibold tracking-wider transition hover:shadow-md disabled:opacity-60 cursor-pointer">
                    {isLoading ? 'Signing in...' : 'Login'}
                  </button>
                </form>

                <div className="mt-8 text-center space-y-4">
                  <p className="text-xs text-zinc-500 normal-case tracking-normal">
                    Don't have an account?{' '}
                    <button type="button" onClick={() => switchMode(true)} className="font-semibold text-[hsl(var(--foreground))] underline underline-offset-2 cursor-pointer">Sign up</button>
                  </p>
                  
                  <button type="button" onClick={() => setIsAdminModalOpen(true)} disabled={isLoading} className="text-[12px] font-semibold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer">
                    Login as Administrator
                  </button>
                </div>
              </>
            )}

            {/* REGISTER FORM */}
            {isRegister && (
              registerStep === 'form' ? (
                <form onSubmit={handleRegister} className="space-y-4" noValidate>
                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Full Name</label>
                    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-[hsl(var(--card))] px-4 py-3.5 transition focus-within:border-zinc-500">
                      <input type="text" placeholder="Aarav Sharma" value={fullName} onChange={(e) => setFullName(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400 text-left normal-case" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Email address</label>
                    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-[hsl(var(--card))] px-4 py-3.5 transition focus-within:border-zinc-500">
                      <Mail size={17} className="shrink-0 text-zinc-400" />
                      <input type="email" placeholder="you@example.com" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400 text-left normal-case" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Password</label>
                    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-[hsl(var(--card))] px-4 py-3.5 transition focus-within:border-zinc-500">
                      <Lock size={17} className="shrink-0 text-zinc-400" />
                      <input type={showRegisterPassword ? 'text' : 'password'} placeholder="Minimum 6 characters" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400 text-left normal-case" />
                      <button type="button" onClick={() => setShowRegisterPassword((p) => !p)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer">
                        {showRegisterPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Confirm password</label>
                    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-[hsl(var(--card))] px-4 py-3.5 transition focus-within:border-zinc-500">
                      <Lock size={17} className="shrink-0 text-zinc-400" />
                      <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400 text-left normal-case" />
                      <button type="button" onClick={() => setShowConfirmPassword((p) => !p)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer">
                        {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">{errorMessage}</div>
                  )}

                  <button type="submit" disabled={isLoading} className="mt-2 w-full rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] h-14 text-sm font-semibold tracking-wider transition hover:shadow-md disabled:opacity-60 cursor-pointer">
                    {isLoading ? 'Creating account...' : 'Create account'}
                  </button>

                  <p className="text-center text-xs text-zinc-500 normal-case tracking-normal">
                    Already have an account?{' '}
                    <button type="button" onClick={() => switchMode(false)} className="font-semibold text-[hsl(var(--foreground))] underline underline-offset-2 cursor-pointer">Login</button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4" noValidate>
                  <button type="button" onClick={() => setRegisterStep('form')} className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-500 hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer mb-2">
                    <ArrowLeft size={14} strokeWidth={2} /> Back to Register Form
                  </button>
                  <p className="text-[13px] text-zinc-500 mb-4">OTP sent to {registerEmail}</p>
                  
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

                  {errorMessage && (
                    <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">{errorMessage}</div>
                  )}

                  <button type="submit" disabled={isLoading || otpValues.join('').length !== 6} className="mt-2 w-full rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] h-14 text-sm font-semibold tracking-wider transition hover:shadow-md disabled:opacity-60 cursor-pointer">
                    {isLoading ? 'Verifying...' : 'Verify & Create Account'}
                  </button>

                  <div className="text-center">
                    {countdown > 0 ? (
                      <span className="text-[12px] text-zinc-400">Resend in {countdown}s</span>
                    ) : (
                      <button type="button" onClick={handleRegister} className="text-[12px] font-semibold text-[hsl(var(--foreground))] underline underline-offset-2 hover:opacity-80 cursor-pointer">Resend OTP</button>
                    )}
                  </div>
                </form>
              )
            )}
          </div>
        </section>
      </div>

      {/* ADMIN LOGIN MODAL */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsAdminModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center mx-auto mb-3 shadow-md">
                <Shield size={28} strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Administrator Portal</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Enter your admin credentials to access the management dashboard.</p>
            </div>

            {adminError && (
              <div className="mb-4 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3.5 rounded-xl">
                {adminError}
              </div>
            )}

            <form onSubmit={handleAdminModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Admin Email ID
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@autotrade.app"
                    required
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-sm font-medium focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors text-left normal-case"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Admin Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full h-12 pl-11 pr-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-sm font-medium focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword((p) => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={adminSubmitting}
                className="w-full h-12 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-200 shadow-md active:scale-[0.98] disabled:opacity-50 mt-2 cursor-pointer"
              >
                {adminSubmitting ? 'Authenticating...' : 'Access Administrator Dashboard'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
