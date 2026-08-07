import React, { type InputHTMLAttributes, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  isPassword?: boolean;
}

const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, icon, error, isPassword, className = '', type: passedType, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : (passedType || 'text');

    return (
      <div className="w-full mb-5">
        <label className="block text-[12px] font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
          {label}
        </label>
        <div
          className={`relative flex items-center rounded-xl border bg-white dark:bg-[#0F0F10] transition-all duration-200 group
            ${error
              ? 'border-red-500/50 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/10'
              : 'border-zinc-200 dark:border-zinc-800 focus-within:border-orange-500/60 focus-within:ring-4 focus-within:ring-orange-500/10'
            }
          `}
        >
          {icon && (
            <div className="pl-4 pr-2 flex items-center justify-center text-zinc-400 group-focus-within:text-zinc-600 dark:group-focus-within:text-zinc-300 transition-colors">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            {...props}
            type={inputType}
            className={`w-full h-[48px] bg-transparent text-[15px] outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400
              ${!icon ? 'pl-4' : 'pl-0'}
              ${isPassword ? 'pr-12' : 'pr-4'}
              ${className}
            `}
          />
          {isPassword && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowPassword((p) => !p);
              }}
              className="absolute right-4 z-10 cursor-pointer text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
            </button>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-[13px] text-red-500 font-medium flex items-center gap-1.5 animate-fadeIn">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';

export default AuthInput;
