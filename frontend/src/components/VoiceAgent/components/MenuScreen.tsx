import React, { memo } from 'react';
import { CallTimer } from './CallTimer';
import styles from '../VoiceAgent.module.css';

interface MenuOptionItem {
  key: string;
  label: string;
}

interface MenuScreenProps {
  mode: 'main' | 'crop' | 'status' | 'ai';
  durationSeconds: number;
  lastKey?: string;
  subtitles?: string;
  selectedIndex?: number;
  customOptions?: MenuOptionItem[];
  statusMessage?: string;
}

const DEFAULT_MAIN_OPTIONS: MenuOptionItem[] = [
  { key: '1', label: 'SLOT BOOKING' },
  { key: '2', label: 'STATUS CHECK' },
  { key: '3', label: 'SPEAK TO AI' },
  { key: '0', label: 'REPEAT MENU' },
  { key: '#', label: 'END CALL' },
];

const DEFAULT_CROP_OPTIONS: MenuOptionItem[] = [
  { key: '1', label: 'Wheat (Gehu)' },
  { key: '2', label: 'Paddy (Dhaan)' },
  { key: '3', label: 'Jowar' },
  { key: '4', label: 'Maize (Makka)' },
  { key: '0', label: 'Back to Menu' },
];

export const MenuScreen: React.FC<MenuScreenProps> = memo(({
  mode,
  durationSeconds,
  lastKey,
  subtitles,
  selectedIndex = 0,
  customOptions,
  statusMessage,
}) => {
  const getTitle = () => {
    switch (mode) {
      case 'crop':
        return 'FASAL CHUNIYE';
      case 'status':
        return 'STATUS CHECK';
      case 'ai':
        return 'AI ASSISTANT';
      default:
        return 'MANDI-Q IVR';
    }
  };

  const options =
    customOptions ||
    (mode === 'crop'
      ? DEFAULT_CROP_OPTIONS
      : mode === 'status'
      ? [
          { key: '1', label: 'NEW BOOKING' },
          { key: '0', label: 'MAIN MENU' },
          { key: '#', label: 'END CALL' },
        ]
      : DEFAULT_MAIN_OPTIONS);

  return (
    <div className={styles.menuScreen}>
      <div className={styles.menuHeader}>
        <span className={styles.menuTitle}>{getTitle()}</span>
        <CallTimer seconds={durationSeconds} />
      </div>

      {statusMessage && (
        <div style={{ fontSize: 9, lineHeight: '12px', padding: '4px 0', color: '#1a3311' }}>
          {statusMessage}
        </div>
      )}

      {mode === 'crop' ? (
        <div className={styles.cropGridList}>
          {options.map((opt, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <div
                key={opt.key}
                className={`${styles.cropOptionItem} ${isSelected ? styles.cropOptionSelected : ''}`}
                style={isSelected ? { outline: '1px solid #204010', background: 'rgba(0,0,0,0.08)' } : undefined}
              >
                <span className={styles.menuKeyPill}>{opt.key}</span>
                <span className={styles.cropName}>{opt.label}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.menuOptionsList}>
          {options.slice(0, 4).map((opt, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <div
                key={opt.key}
                className={`${styles.menuOptionItem} ${isSelected ? styles.menuOptionSelected : ''}`}
                style={isSelected ? { outline: '1px solid #204010', background: 'rgba(0,0,0,0.08)' } : undefined}
              >
                <span className={styles.menuKeyPill}>{opt.key}</span>
                <span className={styles.menuOptionText}>{opt.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Subtitles / Audio Transcript Banner */}
      {subtitles && <div className={styles.menuSubtitleTicker}>{subtitles}</div>}

      {/* Footer Keypad Instruction */}
      <div className={styles.menuKeypadHint}>
        {lastKey ? (
          <span className={styles.keyEcho}>KEY: {lastKey} ✓</span>
        ) : (
          <span>
            {mode === 'crop'
              ? 'PRESS 1-4 OR ARROWS'
              : 'PRESS 1, 2, 3 OR ARROWS'}
          </span>
        )}
      </div>
    </div>
  );
});

MenuScreen.displayName = 'MenuScreen';
