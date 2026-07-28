import { Link } from 'react-router-dom';
import { Check, ShoppingBag, CreditCard, FileText } from 'lucide-react';

interface CheckoutStepsProps {
  step1?: boolean;
  step2?: boolean;
  step3?: boolean;
}

const steps = [
  { num: 1, label: 'Shipping', path: '/shipping', key: 'step1' as const, icon: ShoppingBag },
  { num: 2, label: 'Payment', path: '/payment', key: 'step2' as const, icon: CreditCard },
  { num: 3, label: 'Review', path: '/placeorder', key: 'step3' as const, icon: FileText },
];

const CheckoutSteps = ({ step1, step2, step3 }: CheckoutStepsProps) => {
  const active = { step1, step2, step3 };

  return (
    <div className="w-full max-w-2xl mx-auto mb-10 lg:mb-12">
      <div className="flex items-center">
        {steps.map((s, idx) => {
          const isActive = active[s.key];
          const isPast =
            (s.key === 'step1' && (step2 || step3)) ||
            (s.key === 'step2' && step3);
          const Icon = s.icon;

          return (
            <div key={s.num} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2.5">
                <div
                  className={`w-11 h-11 flex items-center justify-center rounded-full text-sm font-bold border-2 transition-all duration-300 ${
                    isPast
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                      : isActive
                      ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-900 shadow-[0_0_20px_rgba(0,0,0,0.15)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] scale-105'
                      : 'bg-white dark:bg-[#18181B] border-zinc-300 dark:border-zinc-600 text-zinc-400 dark:text-zinc-500'
                  }`}
                >
                  {isPast && !isActive ? (
                    <Check size={16} strokeWidth={3} />
                  ) : (
                    <Icon size={17} strokeWidth={1.5} />
                  )}
                </div>

                {isActive ? (
                  <Link
                    to={s.path}
                    className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-900 dark:text-white"
                  >
                    {s.label}
                  </Link>
                ) : (
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${
                      isPast ? 'text-emerald-500' : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    {s.label}
                  </span>
                )}
              </div>

              {idx < steps.length - 1 && (
                <div className="flex-1 h-[2px] mx-4 relative overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className={`absolute inset-y-0 left-0 bg-zinc-900 dark:bg-white transition-all duration-500 rounded-full ${
                      isPast ? 'w-full' : 'w-0'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CheckoutSteps;
