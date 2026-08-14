import React from 'react';
import { Tag } from 'lucide-react';

interface DiscountBadgeProps {
  percent?: number;
  className?: string;
  variant?: 'emerald' | 'orange' | 'red' | 'purple';
  showIcon?: boolean;
  savingsText?: string;
}

const variantStyles = {
  emerald: 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-emerald-950/20 border-emerald-400/30',
  orange: 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-orange-950/20 border-orange-400/30',
  red: 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-red-950/20 border-red-400/30',
  purple: 'bg-gradient-to-r from-purple-600 to-indigo-500 text-white shadow-purple-950/20 border-purple-400/30',
};

const DiscountBadge: React.FC<DiscountBadgeProps> = ({
  percent = 20,
  className = '',
  variant = 'emerald',
  showIcon = false,
  savingsText,
}) => {
  if (!percent || percent <= 0) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-sm border ${variantStyles[variant]} ${className}`}
    >
      {showIcon && <Tag size={10} strokeWidth={2.5} className="shrink-0" />}
      <span>{savingsText ? savingsText : `${Math.round(percent)}% OFF`}</span>
    </span>
  );
};

export default DiscountBadge;
