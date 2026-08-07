import { CheckCircle2, Clock, XCircle, RotateCcw, Wallet, HelpCircle } from 'lucide-react';

type PaymentStatus = string;

const PAYMENT_STYLES: Record<string, { classes: string; icon: typeof CheckCircle2 }> = {
  paid: {
    classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    icon: CheckCircle2,
  },
  completed: {
    classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    icon: CheckCircle2,
  },
  pending: {
    classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
    icon: Clock,
  },
  failed: {
    classes: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25',
    icon: XCircle,
  },
  refunded: {
    classes: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25',
    icon: RotateCcw,
  },
};

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PaymentBadge({ status }: { status?: string }) {
  const key = (status || '').toLowerCase();
  const style = PAYMENT_STYLES[key] ?? {
    classes: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/25',
    icon: HelpCircle,
  };
  const Icon = style.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm ${style.classes}`}
    >
      <Icon size={13} strokeWidth={2.5} />
      {titleCase(status || 'Unknown')}
    </span>
  );
}
