import React from 'react';

interface AuthCardProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const AuthCard: React.FC<AuthCardProps> = ({ children, title, subtitle }) => {
  return (
    <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border border-zinc-200/60 dark:border-zinc-800/60 rounded-[32px] p-8 sm:p-12 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]">
      <div className="mb-10 text-center sm:text-left">
        <h2 className="text-[32px] sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-3 text-[15px] leading-7 text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
};

export default AuthCard;
