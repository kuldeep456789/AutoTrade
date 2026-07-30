import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrency, CURRENCIES, type CurrencyCode } from '../../context/CurrencyContext';

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
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0 z-30">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 h-[42px] rounded-lg border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 hover:border-zinc-700 text-white text-xs font-bold transition-all duration-200 cursor-pointer shadow-sm"
        aria-label="Select Currency"
        type="button"
      >
        <span className="text-sm leading-none">{currencyConfig.flag}</span>
        <span className="font-bold tracking-tight">{currencyConfig.code} ({currencyConfig.symbol})</span>
        <ChevronDown size={13} className={`text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180 text-orange-400' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full mt-2 right-0 w-44 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 py-1"
          >
            <div className="px-3 py-1.5 border-b border-zinc-800/80 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Select Currency
            </div>
            {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
              const item = CURRENCIES[code];
              const isSelected = currency === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setCurrency(code);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    isSelected ? 'bg-orange-500/10 text-orange-400 font-bold' : 'text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{item.flag}</span>
                    <span>{item.code} ({item.symbol})</span>
                  </div>
                  {isSelected && <Check size={14} className="text-orange-500" strokeWidth={2.5} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CurrencySelector;
