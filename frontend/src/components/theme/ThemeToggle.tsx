import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-6 h-6 flex items-center justify-center">
        <Sun
          size={22}
          strokeWidth={1.5}
          className={`absolute transition-all duration-300 ${theme === 'dark'
            ? 'opacity-0 rotate-90 scale-0'
            : 'opacity-100 rotate-0 scale-100 text-zinc-600'
            }`}
        />
        <Moon
          size={20}
          strokeWidth={1.5}
          className={`absolute transition-all duration-300 ${theme === 'dark'
            ? 'opacity-100 rotate-0 scale-100 text-zinc-400'
            : 'opacity-0 -rotate-90 scale-0'
            }`}
        />
      </div>
    </button>
  );
};
export default ThemeToggle;
