import React, { type ButtonHTMLAttributes } from 'react';

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

const AuthButton: React.FC<AuthButtonProps> = ({
  children,
  isLoading,
  loadingText = 'Please wait...',
  variant = 'primary',
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'relative w-full h-16 rounded-2xl text-[15px] font-bold tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] overflow-hidden';
  
  const variants = {
    primary: 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30',
    secondary: 'bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 shadow-md',
    outline: 'bg-transparent border-2 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {/* Subtle shine effect overlay for primary button */}
      {variant === 'primary' && (
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] hover:animate-shimmer pointer-events-none" />
      )}
      
      {isLoading ? (
        <>
          <span className={`w-5 h-5 border-2 rounded-full animate-spin ${
            variant === 'primary' ? 'border-white/40 border-t-white' : 
            variant === 'outline' ? 'border-zinc-300 border-t-zinc-700' : 'border-zinc-400 border-t-zinc-100'
          }`} />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default AuthButton;
