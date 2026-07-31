import { useState, useEffect } from 'react';
import { X, ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../../store/slices/authSlice';
import type { RootState } from '../../store/store';
import {
  useGenerate2FAMutation,
  useEnable2FAMutation,
  useDisable2FAMutation,
} from '../../store/slices/userApiSlice';
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

  const [generate2FA, { isLoading: generating }] = useGenerate2FAMutation();
  const [enable2FA, { isLoading: enabling }] = useEnable2FAMutation();
  const [disable2FA, { isLoading: disabling }] = useDisable2FAMutation();

  useEffect(() => {
    if (isOpen) {
      setStep('info');
      setCode('');
    }
  }, [isOpen]);

  const handleStartSetup = async () => {
    try {
      const res = await generate2FA({}).unwrap();
      setSecret(res.secret);
      setQrCodeUrl(res.qrCodeUrl);
      setStep('setup');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to generate 2FA secret');
    }
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
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
                <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">
                  1. Scan this QR code with your authenticator app (like Google Authenticator or Authy).
                </p>
                <div className="flex justify-center mb-4 bg-white p-4 rounded-xl mx-auto border border-zinc-200 w-max">
                  {qrCodeUrl ? <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" /> : <div className="w-48 h-48 bg-zinc-100 animate-pulse rounded"></div>}
                </div>
                <div className="text-center mb-6">
                  <p className="text-xs text-zinc-500 mb-1">Or enter this code manually:</p>
                  <code className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded text-sm font-bold tracking-widest">{secret}</code>
                </div>

                <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
                  2. Enter the 6-digit code from your app.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full text-center text-2xl tracking-[0.5em] font-bold py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent outline-none focus:border-zinc-500 mb-6"
                />

                <button type="submit" disabled={enabling || code.length !== 6} className="w-full py-3 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 transition disabled:opacity-50">
                  {enabling ? 'Verifying...' : 'Verify & Enable'}
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
