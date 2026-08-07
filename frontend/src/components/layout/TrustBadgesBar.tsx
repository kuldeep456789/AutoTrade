import { Award, TrendingUp, RotateCcw, Lock } from 'lucide-react';

const badges = [
  {
    icon: Award,
    title: 'PREMIUM QUALITY',
    subtitle: 'Finest parts, perfect finishes',
  },
  {
    icon: TrendingUp,
    title: 'TREND-FOCUSED',
    subtitle: 'Stay ahead with our latest drops',
  },
  {
    icon: RotateCcw,
    title: 'MANUFACTURER DIRECT RATES',
    subtitle: 'Save up to 30% on Volume',
  },
  {
    icon: Lock,
    title: 'SECURE PAYMENTS',
    subtitle: '100% safe & secure transactions',
  },
];

interface TrustBadgesBarProps {
  className?: string;
  compact?: boolean;
}

export const TrustBadgesBar = ({ className = '', compact = false }: TrustBadgesBarProps) => {
  if (compact) {
    return (
      <div className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-[#0d0d0d] p-4 shadow-sm transition-colors duration-200 ${className}`}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-left">
          {badges.map((badge, idx) => {
            const Icon = badge.icon;
            return (
              <div key={idx} className="flex items-start gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 shadow-2xs">
                  <Icon size={16} strokeWidth={1.75} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider leading-tight">{badge.title}</span>
                  <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-normal leading-snug mt-0.5">{badge.subtitle}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section className={`border-y border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-[#0d0d0d] text-zinc-900 dark:text-white transition-colors duration-200 ${className}`}>
      <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 lg:px-16 py-8 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 xs:gap-4 md:gap-5">
          {badges.map((badge, idx) => {
            const Icon = badge.icon;
            return (
              <div key={idx} className="flex items-center gap-4 text-left w-full p-4 xs:p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/90 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-zinc-950/80 border border-orange-100 dark:border-zinc-800 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 shadow-2xs">
                  <Icon className="w-7 h-7 text-orange-600 dark:text-orange-400" strokeWidth={1.75} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs xs:text-sm font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider truncate">
                    {badge.title}
                  </span>
                  <span className="text-[11px] xs:text-xs text-zinc-500 dark:text-zinc-400 font-normal mt-1 truncate">
                    {badge.subtitle}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustBadgesBar;