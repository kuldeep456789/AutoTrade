import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import type { RootState } from '../../store/store';
import { Shield, X, Lock, Eye, EyeOff } from 'lucide-react';

const ADMIN_SESSION_KEY = 'at_admin_verified';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);

  const [secretInput, setSecretInput] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(() =>
    sessionStorage.getItem(ADMIN_SESSION_KEY) === '1',
  );

  // Not logged in or not an admin role → redirect to home
  if (!userInfo || userInfo.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Admin already verified secret this session
  if (verified) {
    return <>{children}</>;
  }

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const correct = import.meta.env.VITE_ADMIN_SECRET_CODE || 'secret_admin_123';
    if (secretInput.trim() === correct) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
      setVerified(true);
      setError('');
    } else {
      setError('Invalid Admin Secret Code. Please try again.');
      setSecretInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
            <Shield size={20} className="text-white dark:text-zinc-900" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-[17px] font-black tracking-tight text-zinc-900 dark:text-white">
              Admin Access
            </h2>
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Enter your Admin Secret Code to continue
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleVerify} className="px-8 py-7 space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
              Admin Secret Code
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-3.5 transition focus-within:border-zinc-500 dark:focus-within:border-zinc-400">
              <Lock size={16} className="shrink-0 text-zinc-400" />
              <input
                type={showSecret ? 'text' : 'password'}
                value={secretInput}
                onChange={(e) => { setSecretInput(e.target.value); setError(''); }}
                placeholder="Enter secret code"
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400 text-zinc-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowSecret((p) => !p)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white cursor-pointer transition"
              >
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3">
              <X size={15} className="text-red-500 shrink-0 mt-0.5" strokeWidth={2.5} />
              <p className="text-[13px] font-semibold text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!secretInput.trim()}
            className="w-full h-12 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[13px] font-bold tracking-wider transition hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Verify & Enter Dashboard
          </button>

          <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-600">
            Logged in as {userInfo.email}
          </p>
        </form>
      </div>
    </div>
  );
}
