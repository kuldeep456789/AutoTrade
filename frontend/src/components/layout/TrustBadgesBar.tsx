import { Award, TrendingUp, ShieldCheck, Lock } from 'lucide-react';

const badges = [
  {
    icon: Award,
    title: 'PREMIUM QUALITY',
    subtitle: 'Finest parts, OEM grade finishes',
  },
  {
    icon: TrendingUp,
    title: 'TRENDING DROPS',
    subtitle: 'Latest automotive upgrades',
  },
  {
    icon: ShieldCheck,
    title: 'VERIFIED FACTORY RATES',
    subtitle: 'Direct manufacturer savings',
  },
  {
    icon: Lock,
    title: 'SECURE PAYMENTS',
    subtitle: '100% encrypted transactions',
  },
];

interface TrustBadgesBarProps {
  className?: string;
  compact?: boolean;
}

export const TrustBadgesBar = ({ className = '', compact = false }: TrustBadgesBarProps) => {
  if (compact) {
    return (
      <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3.5 sm:p-4 shadow-sm ${className}`}>
        <div className="grid grid-cols-2 gap-3 text-left">
          {badges.map((badge, idx) => {
            const Icon = badge.icon;
            return (
              <div key={idx} className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#FF7A00] shrink-0">
                  <Icon size={16} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-extrabold text-white uppercase tracking-wider leading-tight">
                    {badge.title}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-normal leading-snug mt-0.5">
                    {badge.subtitle}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section className={`border-y border-zinc-800/80 bg-zinc-950 text-white transition-colors duration-200 ${className}`}>
      <div className="max-w-[1920px] mx-auto px-4 xs:px-6 sm:px-10 lg:px-16 py-6 sm:py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {badges.map((badge, idx) => {
            const Icon = badge.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-3 sm:gap-4 text-left w-full p-3.5 sm:p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md hover:border-[#FF7A00]/50 transition-all duration-300 group"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#FF7A00] group-hover:scale-105 transition-transform shrink-0">
                  <Icon className="w-5 h-5 text-[#FF7A00]" strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-[13px] font-extrabold text-white uppercase tracking-wider leading-tight">
                    {badge.title}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-zinc-400 font-normal mt-0.5 leading-snug">
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