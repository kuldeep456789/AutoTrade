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
      <div className={`rounded-xl border border-zinc-800 bg-[#0d0d0d] p-3.5 shadow-md transition-colors duration-200 ${className}`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
          {badges.map((badge, idx) => {
            const Icon = badge.icon;
            return (
              <div key={idx} className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-400 shrink-0">
                  <Icon size={16} strokeWidth={1.75} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{badge.title}</span>
                  <span className="text-[9px] text-zinc-400 font-normal truncate">{badge.subtitle}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section className={`border-y border-zinc-800/80 bg-[#0d0d0d] text-white transition-colors duration-200 ${className}`}>
      <div className="max-w-[1920px] mx-auto px-6 sm:px-10 lg:px-16 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 justify-items-center">
          {badges.map((badge, idx) => {
            const Icon = badge.icon;
            return (
              <div key={idx} className="flex items-center gap-4 text-left w-full max-w-[320px] p-1">
                <div className="w-12 h-12 rounded-xl bg-zinc-900/90 border border-zinc-800/90 flex items-center justify-center text-orange-400 shrink-0 shadow-sm">
                  <Icon className="w-5.5 h-5.5 text-orange-400" strokeWidth={1.75} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider truncate">
                    {badge.title}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-normal mt-0.5 truncate">
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
