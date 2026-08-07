import { useState, useEffect } from 'react';
import { X, ShieldCheck, ShieldAlert, Copy, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../../store/slices/authSlice';
import type { RootState } from '../../store/store';
import {
  useGenerate2FAMutation,
  useEnable2FAMutation,
  useDisable2FAMutation,
} from '../../store/slices/userApiSlice';
import OtpInput from '../OtpInput';
import toast from 'react-hot-toast';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TwoFactorModal = ({ isOpen, onClose }: TwoFactorModalProps) => {
  const dispatch = useDispatch();
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const [step, setStep] = useState<'info' | 'setup'>('info');
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  const codeDigits = code.split('').concat(Array(6).fill('')).slice(0, 6);
  const setCodeDigits = (digits: string[]) => setCode(digits.join(''));

  const [generate2FA, { isLoading: generating }] = useGenerate2FAMutation();
  const [enable2FA, { isLoading: enabling }] = useEnable2FAMutation();
  const [disable2FA, { isLoading: disabling }] = useDisable2FAMutation();

  useEffect(() => {
    if (isOpen) {
      setStep('info');
      setCode('');
      setCopied(false);
    }
  }, [isOpen]);

  const handleCopySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success('Secret key copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleStartSetup = async () => {
    try {
      const res = await generate2FA({}).unwrap();
      setSecret(res.secret);
      setQrCodeUrl(res.qrCode);
      setStep('setup');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to generate 2FA secret');
    }
  };

  const handleEnable = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (code.length !== 6) return;
    try {
      await enable2FA({ secret, code }).unwrap();
      dispatch(setCredentials({ ...userInfo!, isTwoFactorEnabled: true }));
      toast.success('Two-Factor Authentication enabled successfully!');
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Invalid authentication code');
    }
  };

  const handleDisable = async () => {
    if (!window.confirm('Are you sure you want to disable Two-Factor Authentication? This will make your account less secure.')) return;
    try {
      await disable2FA({}).unwrap();
      dispatch(setCredentials({ ...userInfo!, isTwoFactorEnabled: false }));
      toast.success('Two-Factor Authentication disabled successfully!');
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to disable 2FA');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-[#2A2A2A] shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Two-Factor Authentication</h3>
            <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            {userInfo?.isTwoFactorEnabled ? (
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                  <ShieldCheck size={32} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h4 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">2FA is Enabled</h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                  Your account is protected with an additional layer of security.
                </p>
                <button onClick={handleDisable} disabled={disabling} className="w-full py-3 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/50 transition">
                  {disabling ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            ) : step === 'info' ? (
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                  <ShieldAlert size={32} className="text-amber-600 dark:text-amber-400" />
                </div>
                <h4 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Protect Your Account</h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                  Two-factor authentication adds an extra layer of security to your account by requiring more than just a password to log in.
                </p>
                <button onClick={handleStartSetup} disabled={generating} className="w-full py-3 rounded-xl font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition">
                  {generating ? 'Please wait...' : 'Set up 2FA'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnable}>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-2 text-center">
                  Scan this QR code with a 2FA Authenticator app
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 text-center">
                  Use Google Authenticator, Authy, or Microsoft Authenticator.
                </p>

                <div className="flex justify-center mb-4 bg-white p-3 rounded-xl mx-auto border border-zinc-200 w-max shadow-sm">
                  {qrCodeUrl ? <img src={qrCodeUrl} alt="2FA QR Code" className="w-44 h-44" /> : <div className="w-44 h-44 bg-zinc-100 animate-pulse rounded"></div>}
                </div>

                {secret && (
                  <div className="mb-5 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex flex-col items-center gap-1.5 text-center">
                    <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Manual Setup Key</span>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-extrabold text-orange-600 dark:text-orange-400 tracking-wider">
                        {secret}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-300 transition-colors"
                        title="Copy Secret Key"
                      >
                        {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
                  Enter the 6-digit code from your app:
                </p>
                <div className="mb-6">
                  <OtpInput
                    value={codeDigits}
                    onChange={setCodeDigits}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={enabling || code.length !== 6}
                  className="w-full py-3.5 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-md shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {enabling ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Verifying & Enabling...
                    </>
                  ) : (
                    'Verify & Enable'
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TwoFactorModal;
