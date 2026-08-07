import { useEffect, useRef } from 'react';

interface OtpInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  onComplete?: (code: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
}

const BOX_BASE =
  'w-14 h-16 sm:w-14 sm:h-16 p-0 m-0 min-w-0 text-center text-[28px] font-black leading-none rounded-2xl border-2 outline-none transition-all duration-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

const BOX_EMPTY =
  'bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border-zinc-200/80 dark:border-zinc-800/80 text-zinc-900 dark:text-white caret-orange-500 focus:bg-white dark:focus:bg-zinc-900 focus:border-orange-500/80 focus:ring-4 focus:ring-orange-500/10 focus:-translate-y-0.5 shadow-sm';

const BOX_FILLED =
  'bg-white dark:bg-zinc-900 border-orange-500 text-zinc-900 dark:text-white shadow-[0_8px_20px_-8px_rgba(255,122,0,0.3)] scale-[1.02]';

export default function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  autoFocus = false,
  disabled = false,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Auto-focus the first box when the component mounts (or length changes).
  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => inputsRef.current[0]?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, length]);

  const focusIndex = (idx: number) => {
    const clamped = Math.max(0, Math.min(length - 1, idx));
    inputsRef.current[clamped]?.focus();
  };

  const commit = (next: string[]) => {
    onChange(next);
    const code = next.join('');
    if (code.length === length) {
      onComplete?.(code);
    }
  };

  const handleChange = (idx: number, raw: string) => {
    if (disabled) return;

    // Pasting / autofill can deliver multiple digits at once.
    if (raw.length > 1) {
      const digits = raw.replace(/\D/g, '').slice(0, length);
      const next = [...valueRef.current];
      for (let i = 0; i < digits.length; i++) {
        const target = idx + i;
        if (target < length) next[target] = digits[i];
      }
      commit(next);
      focusIndex(Math.min(idx + digits.length, length - 1));
      return;
    }

    const digit = raw.replace(/\D/g, '');
    if (digit.length === 0 && valueRef.current[idx] === '') return;

    const next = [...valueRef.current];
    next[idx] = digit;
    commit(next);

    if (digit) focusIndex(idx + 1);
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (e.key) {
      case 'Backspace':
        e.preventDefault();
        if (valueRef.current[idx]) {
          const cleared = [...valueRef.current];
          cleared[idx] = '';
          commit(cleared);
        } else if (idx > 0) {
          const cleared = [...valueRef.current];
          cleared[idx - 1] = '';
          commit(cleared);
          focusIndex(idx - 1);
        }
        break;
      case 'Delete':
        e.preventDefault();
        if (valueRef.current[idx]) {
          const cleared = [...valueRef.current];
          cleared[idx] = '';
          commit(cleared);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        focusIndex(idx - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        focusIndex(idx + 1);
        break;
      case 'Enter': {
        const code = valueRef.current.join('');
        if (code.length === length) {
          onComplete?.(code);
        }
        break;
      }
      default:
        break;
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const digits = text.replace(/\D/g, '').slice(0, length);
    if (!digits) return;

    const next = [...valueRef.current];
    for (let i = 0; i < digits.length; i++) {
      next[i] = digits[i];
    }
    commit(next);
    focusIndex(Math.min(digits.length, length - 1));
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div
      className="flex items-center justify-center gap-2.5 sm:gap-3"
      role="group"
      aria-label="One time password"
    >
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={6}
          aria-label={`Digit ${i + 1} of ${length}`}
          value={value[i] ?? ''}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={handleFocus}
          className={`${BOX_BASE} ${value[i] ? BOX_FILLED : BOX_EMPTY} ${
            disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-text'
          }`}
        />
      ))}
    </div>
  );
}
