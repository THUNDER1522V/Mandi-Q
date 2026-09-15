import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export type ThemeMode = 'day' | 'night';

interface ThemeToggleProps {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

/**
 * Operations Command Environment Flip Toggle
 * Sleek, tactile flip button switching between:
 *  - ☀ Day Operations (Sun, Editorial Workspace)
 *  - 🌙 Night Operations (Moon, Professional Control Room)
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onThemeChange }) => {
  const isNight = theme === 'night';

  const handleToggle = () => {
    onThemeChange(isNight ? 'day' : 'night');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isNight}
      aria-label={`Switch to ${isNight ? 'Day' : 'Night'} Operations`}
      title={`Current: ${isNight ? 'Night Operations' : 'Day Operations'} — Click to flip to ${isNight ? 'Day Mode (☀)' : 'Night Mode (🌙)'}`}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      className={`theme-flip-toggle ${isNight ? 'is-night' : 'is-day'}`}
    >
      {/* Background Track: Stationary Sun Icon (Visible in Night Mode) */}
      <span className="theme-flip-track-slot sun-slot" aria-hidden="true">
        <Sun size={13} strokeWidth={2.2} />
      </span>

      {/* Background Track: Stationary Moon Icon (Visible in Day Mode) */}
      <span className="theme-flip-track-slot moon-slot" aria-hidden="true">
        <Moon size={12} strokeWidth={2.2} />
      </span>

      {/* 3D Animated Flip Knob */}
      <motion.div
        className={`theme-flip-thumb ${isNight ? 'is-night' : 'is-day'}`}
        initial={false}
        animate={{
          x: isNight ? 30 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 520,
          damping: 32,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isNight ? (
            <motion.div
              key="night"
              initial={{ rotateY: -90, opacity: 0, scale: 0.65 }}
              animate={{ rotateY: 0, opacity: 1, scale: 1 }}
              exit={{ rotateY: 90, opacity: 0, scale: 0.65 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Moon size={12} strokeWidth={2.4} color="#93C5FD" fill="#93C5FD" fillOpacity={0.25} />
            </motion.div>
          ) : (
            <motion.div
              key="day"
              initial={{ rotateY: 90, opacity: 0, scale: 0.65 }}
              animate={{ rotateY: 0, opacity: 1, scale: 1 }}
              exit={{ rotateY: -90, opacity: 0, scale: 0.65 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Sun size={13} strokeWidth={2.5} color="#D97706" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  );
};
