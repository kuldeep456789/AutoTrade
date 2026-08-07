import { ChevronDown, Loader2 } from 'lucide-react';

const ORDER_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
];

interface StatusDropdownProps {
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  accent?: boolean;
}

export default function StatusDropdown({ value, onChange, loading, accent = false }: StatusDropdownProps) {
  return (
    <div className="relative inline-flex items-center">
      {loading ? (
        <div className="flex items-center justify-center w-[125px] h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
          <Loader2 size={15} className="text-orange-400 animate-spin" />
        </div>
      ) : (
        <div className="relative">
          <select
            value={(value || 'pending').toLowerCase().replace(/ /g, '_')}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Order status"
            className={`w-[125px] h-9 appearance-none pl-3 pr-7 text-xs font-bold rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white cursor-pointer shadow-2xs transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 hover:border-zinc-400 dark:hover:border-zinc-600 ${
              accent 
              ? 'border-orange-500/50 dark:border-orange-500/50 focus:border-orange-500'
              : 'border-zinc-200 dark:border-zinc-700 focus:border-orange-500'
              }`}
          >
            {ORDER_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400"
            strokeWidth={2.5}
          />
        </div>
      )}
    </div>
  );
}
