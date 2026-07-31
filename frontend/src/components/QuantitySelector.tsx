import { useState, useRef, useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  value: number;
  min?: number;
  max?: number;
  onDecrement: () => void;
  onIncrement: () => void;
  onChange: (qty: number) => void;
  className?: string;
}

export default function QuantitySelector({
  value,
  min = 1,
  max = 9999,
  onDecrement,
  onIncrement,
  onChange,
  className = '',
}: QuantitySelectorProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = useCallback(() => {
    setEditValue(String(value));
    setEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.select();
    });
  }, [value]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    const parsed = parseInt(editValue, 10);
    if (isNaN(parsed) || parsed < min) {
      onChange(min);
    } else if (parsed > max) {
      onChange(max);
    } else {
      onChange(parsed);
    }
  }, [editValue, min, max, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      setEditing(false);
      setEditValue(String(value));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const parsed = parseInt(editValue, 10);
      if (!isNaN(parsed) && parsed < max) {
        const next = parsed + 1;
        setEditValue(String(next));
        onChange(next);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const parsed = parseInt(editValue, 10);
      if (!isNaN(parsed) && parsed > min) {
        const next = parsed - 1;
        setEditValue(String(next));
        onChange(next);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (/^\d*$/.test(raw)) {
      setEditValue(raw);
    }
  };

  return (
    <div className={`flex items-center border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc-50 dark:bg-black h-8 w-[100px] shrink-0 ${className}`}>
      <button
        onClick={onDecrement}
        disabled={value <= min}
        className="w-8 h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-900/60 hover:bg-zinc-200 dark:hover:bg-zinc-900/90 text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer select-none"
      >
        <Minus size={11} strokeWidth={2.5} />
      </button>

      <div className="flex-1 h-full bg-white dark:bg-black flex items-center justify-center">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={editValue}
            onChange={handleChange}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="w-full h-full p-0 text-center text-xs font-semibold bg-transparent outline-none border-none text-zinc-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        ) : (
          <button
            onClick={startEditing}
            className="w-full h-full p-0 text-center text-xs font-semibold select-none cursor-text text-zinc-900 dark:text-white"
            title="Click to edit quantity"
          >
            {value}
          </button>
        )}
      </div>

      <button
        onClick={onIncrement}
        disabled={value >= max}
        className="w-8 h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-900/60 hover:bg-zinc-200 dark:hover:bg-zinc-900/90 text-zinc-700 dark:text-zinc-300 border-l border-zinc-200 dark:border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer select-none"
      >
        <Plus size={11} strokeWidth={2.5} />
      </button>
    </div>
  );
}
