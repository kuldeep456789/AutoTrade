import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SplashScreen = ({ onDone }: { onDone: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Simulate quick load progress
    const steps = [20, 50, 75, 90, 100];
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setProgress(steps[i]);
        i++;
      } else {
        clearInterval(interval);
        setLeaving(true);
        setTimeout(() => onDone(), 0);
      }
    }, 220);
    return () => clearInterval(interval);
  }, [onDone]);

  return (
    <AnimatePresence>
      {!leaving ? (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.55, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="flex flex-col items-center gap-8"
          >
            <img
              src="/img/logo.jpg"
              alt="AutoTrade Logo"
              className="h-36 sm:h-44 w-auto object-contain drop-shadow-[0_0_40px_rgba(220,38,38,0.35)]"
            />

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-zinc-400 text-sm tracking-[0.3em] uppercase font-medium"
            >
              Drive Business Forward
            </motion.p>

            {/* Progress bar */}
            <div className="w-48 sm:w-64 h-[2px] bg-zinc-800 rounded-full overflow-hidden mt-2">
              <motion.div
                className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          </motion.div>

          {/* Bottom brand line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute bottom-8 text-[10px] text-zinc-600 tracking-widest uppercase"
          >
            AutoTrade India &copy; {new Date().getFullYear()}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default SplashScreen;
