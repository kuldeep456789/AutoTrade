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
    <div className={`flex items-center ${className}`}>
      <button
        onClick={onDecrement}
        disabled={value <= min}
        className="w-8 h-full flex items-center justify-center transition-colors duration-150 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent cursor-pointer"
      >
        <Minus size={14} strokeWidth={2} />
      </button>

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={editValue}
          onChange={handleChange}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="w-10 h-full text-center text-sm font-semibold bg-transparent outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      ) : (
        <button
          onClick={startEditing}
          className="w-10 h-full text-center text-sm font-semibold select-none cursor-text"
          title="Click to edit quantity"
        >
          {value}
        </button>
      )}

      <button
        onClick={onIncrement}
        disabled={value >= max}
        className="w-8 h-full flex items-center justify-center transition-colors duration-150 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent cursor-pointer"
      >
        <Plus size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
