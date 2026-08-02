import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useCurrency,
  CURRENCIES,
  type CurrencyCode,
} from '../../context/CurrencyContext';

const CurrencySelector = () => {
  const { currency, setCurrency, currencyConfig } = useCurrency();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);

    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, []);

  return (
    <div ref={ref} className="relative shrink-0 z-30">
      {/* Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Select Currency"
        className="flex items-center gap-2 px-4 h-12 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-orange-500/10"
      >
        <span className="text-lg">{currencyConfig.flag}</span>

        <span>
          {currencyConfig.code} ({currencyConfig.symbol})
        </span>

        <ChevronDown
          size={16}
          className={`transition-transform duration-300 ${open ? 'rotate-180 text-orange-500' : 'text-zinc-400'
            }`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,
              y: -8,
              scale: 0.97,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -8,
              scale: 0.97,
            }}
            transition={{
              duration: 0.18,
            }}
            className="absolute right-0 top-full mt-3 w-64 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950/95 backdrop-blur-xl shadow-2xl"
          >
            {/* Header */}
            <div className="border-b border-zinc-800 px-5 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-zinc-500">
                Select Currency
              </p>
            </div>

            {/* Options */}
            <div className="py-2">
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
                const item = CURRENCIES[code];
                const selected = currency === code;

                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setCurrency(code);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-5 py-3 transition-all duration-200 cursor-pointer group ${selected
                        ? 'bg-orange-500/10 border-l-4 border-orange-500'
                        : 'hover:bg-zinc-900'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{item.flag}</span>

                      <div className="flex flex-col items-start">
                        <span
                          className={`text-sm font-semibold ${selected
                              ? 'text-orange-400'
                              : 'text-white'
                            }`}
                        >
                          {item.code}
                        </span>

                        <span className="text-xs text-zinc-500">
                          Symbol: {item.symbol}
                        </span>
                      </div>
                    </div>

                    {selected && (
                      <Check
                        size={18}
                        strokeWidth={3}
                        className="text-orange-500"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CurrencySelector;