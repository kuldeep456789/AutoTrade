import { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { X, Phone, ArrowLeft } from 'lucide-react';
import { setCredentials } from '../store/slices/authSlice';
import { toggleWishlist } from '../store/slices/wishlistSlice';
import {
  useSendMobileOtpMutation,
  useVerifyMobileOtpMutation,
} from '../store/slices/userApiSlice';
import toast from 'react-hot-toast';

const FALLBACK_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><rect width="100%" height="100%" fill="%2318181b"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48" font-weight="900" fill="%23c9922f" letter-spacing="6">VASTRA</text></svg>';

interface WishlistProduct {
  _id: string;
  name: string;
  price: number;
  discountPrice?: number;
  image: string;
}

interface WishlistLoginPopupProps {
  product: WishlistProduct;
  onClose: () => void;
}

export default function WishlistLoginPopup({ product, onClose }: WishlistLoginPopupProps) {
  const dispatch = useDispatch();
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [sendOtp] = useSendMobileOtpMutation();
  const [verifyOtp] = useVerifyMobileOtpMutation();

  useEffect(() => {
    if (countdown <= 0) return;
    const int = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(int);
  }, [countdown]);

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

  const handleSendOtp = async () => {
    const phone = `+91${mobileNumber.replace(/\D/g, '')}`;
    if (phone.length < 12) {
      setErrorMessage('Enter a valid 10-digit mobile number');
      return;
    }
    setErrorMessage('');
    setLoading(true);
    try {
      await sendOtp({ phone }).unwrap();
      setOtpSent(true);
      setCountdown(30);
      toast.success('OTP sent successfully');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpValues.join('');
    if (code.length !== 6) {
      setErrorMessage('Enter the 6-digit OTP');
      return;
    }
    setErrorMessage('');
    setLoading(true);
    try {
      const phone = `+91${mobileNumber.replace(/\D/g, '')}`;
      const payload = await verifyOtp({ phone, code }).unwrap();
      dispatch(setCredentials({ ...payload.user, accessToken: payload.accessToken }));
      dispatch(toggleWishlist(product));
      toast.success('Added to Wishlist Successfully');
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Invalid OTP. Please try again.');
      setOtpValues(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[960px] h-[540px] max-h-[90vh] mx-auto bg-[hsl(var(--card))] text-[hsl(var(--foreground))] rounded-2xl shadow-2xl overflow-hidden flex animate-[popupFadeIn_250ms_ease-out]">
        {/* Left — Product Image */}
        <div className="hidden md:block w-[55%] h-full relative flex-shrink-0">
          <img
            src={product.image || FALLBACK_IMAGE}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8 z-10">
            <h3 className="text-2xl font-black tracking-tight text-white drop-shadow-sm">
              VASTRA
            </h3>
            {/* <p className="mt-1 text-lg font-light text-white/90 drop-shadow-sm">
              Premium Fashion
            </p> */}
            <p className="text-sm text-white/70 drop-shadow-sm leading-6 mt-2 max-w-xs normal-case tracking-normal">
              Elevating Everyday Fashion with Premium Quality, Modern Design, and Timeless Style.
            </p>
          </div>
        </div>

        {/* Right — Form */}
        <div className="flex-1 h-full flex flex-col justify-center px-8 lg:px-10 py-8 overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer z-20"
          >
            <X size={18} strokeWidth={2} />
          </button>

          <div className="max-w-sm mx-auto w-full">
            <h2 className="text-2xl font-bold tracking-tight">LOGIN OR SIGNUP</h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-6 normal-case tracking-normal">
              Sign in to save your wishlist, add products to your bag, and enjoy a faster checkout.
            </p>

            {!otpSent ? (
              <div className="mt-8 space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">Mobile Number</label>
                  <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-[hsl(var(--background))] px-4 transition focus-within:border-zinc-500" style={{ height: '56px' }}>
                    <Phone size={17} className="shrink-0 text-zinc-400" />
                    <span className="text-sm font-semibold text-zinc-500">+91</span>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
                      autoFocus
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || mobileNumber.length < 10}
                  className="w-full rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-sm font-semibold tracking-wider transition hover:shadow-md disabled:opacity-50 cursor-pointer"
                  style={{ height: '56px' }}
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            ) : (
              <div className="mt-8 space-y-5">
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtpValues(['', '', '', '', '', '']); setErrorMessage(''); }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} strokeWidth={2} /> Change number
                </button>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">Enter OTP</label>
                  <p className="text-[13px] text-zinc-500 -mt-1.5 mb-4">OTP sent to +91 {mobileNumber}</p>

                  <div className="flex gap-2.5 justify-center">
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
                        className={`w-11 h-12 text-center text-lg font-bold rounded-xl border-2 bg-[hsl(var(--background))] outline-none transition-all duration-150 ${val ? 'border-[hsl(var(--foreground))]' : 'border-zinc-200 dark:border-zinc-700 focus:border-zinc-500'
                          }`}
                      />
                    ))}
                  </div>
                </div>

                {errorMessage && (
                  <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={loading || otpValues.join('').length !== 6}
                  className="w-full rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-sm font-semibold tracking-wider transition hover:shadow-md disabled:opacity-50 cursor-pointer"
                  style={{ height: '56px' }}
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>

                <div className="text-center">
                  {countdown > 0 ? (
                    <span className="text-xs text-zinc-400">Resend in {countdown}s</span>
                  ) : (
                    <button type="button" onClick={handleSendOtp} className="text-xs font-semibold text-[hsl(var(--foreground))] underline underline-offset-2 hover:opacity-80 cursor-pointer">
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
