import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { X, ArrowRight } from 'lucide-react';

const LS_KEY = 'vastra_welcome_seen';

const WelcomePopup = () => {
  const navigate = useNavigate();
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (userInfo) return;
    const seen = localStorage.getItem(LS_KEY);
    if (seen) return;
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, [userInfo]);

  const dismiss = () => {
    localStorage.setItem(LS_KEY, '1');
    setVisible(false);
  };

  const handleCreateAccount = () => {
    localStorage.setItem(LS_KEY, '1');
    setVisible(false);
    navigate('/register');
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden animate-[fadeIn_0.4s_ease-out,scaleIn_0.4s_ease-out]">
        {/* Gradient top bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-zinc-900 via-zinc-500 to-zinc-900 dark:from-white dark:via-zinc-400 dark:to-white" />

        <button
          onClick={dismiss}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
        >
          <X size={15} strokeWidth={2.5} />
        </button>

        <div className="px-8 pt-10 pb-8 text-center">
          {/* Icon */}
          <div className="w-14 h-14 bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-white/30 dark:border-white/10"></div>

          {/* Headline */}
          <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white leading-tight">
            Welcome to
          </h2>
          <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white leading-tight mb-3">
            VASTRA
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
            Premium minimal fashion crafted for those who value timeless design and effortless style.
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Join the movement</span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
          </div>

          {/* CTA */}
          <button
            onClick={handleCreateAccount}
            className="w-full group flex items-center justify-center gap-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            Create Account
            <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
          </button>

          <p className="mt-4 text-[10px] text-zinc-400 dark:text-zinc-500">
            Already have an account?{' '}
            <button
              onClick={() => {
                localStorage.setItem(LS_KEY, '1');
                setVisible(false);
                navigate('/login');
              }}
              className="font-bold text-zinc-900 dark:text-white underline underline-offset-2 hover:no-underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); }
          to { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default WelcomePopup;
