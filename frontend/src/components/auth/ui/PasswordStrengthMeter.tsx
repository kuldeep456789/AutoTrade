import React from 'react';

interface PasswordStrengthMeterProps {
  password: string;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  // Score 0 to 4
  let score = 0;
  if (password.length >= 8) score++;
  if (/(?=.*[a-z])/.test(password) && /(?=.*[A-Z])/.test(password)) score++;
  if (/(?=.*\d)/.test(password)) score++;
  if (/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) score++;
  
  if (!password) score = 0;

  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = [
    'bg-zinc-200 dark:bg-zinc-800', // 0
    'bg-red-500',                   // 1
    'bg-orange-500',                // 2
    'bg-amber-500',                 // 3
    'bg-emerald-500',               // 4
  ];

  return (
    <div className="mt-2 mb-6">
      <div className="flex gap-1.5 mb-2">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              score >= level ? strengthColors[score] : 'bg-zinc-200 dark:bg-zinc-800'
            }`}
          />
        ))}
      </div>
      {password && (
        <p className={`text-[12px] font-medium transition-colors ${
          score <= 1 ? 'text-red-500' : 
          score === 2 ? 'text-orange-500' : 
          score === 3 ? 'text-amber-500' : 'text-emerald-500'
        }`}>
          {strengthLabels[score]}
        </p>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
