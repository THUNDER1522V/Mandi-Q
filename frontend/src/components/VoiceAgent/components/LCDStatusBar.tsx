import React, { memo, useState, useEffect } from 'react';
import styles from '../VoiceAgent.module.css';

interface LCDStatusBarProps {
  connected?: boolean;
}

export const LCDStatusBar: React.FC<LCDStatusBarProps> = memo(({ connected = true }) => {
  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  });

  const [batteryLevel, setBatteryLevel] = useState(3);
  const [signalFrame, setSignalFrame] = useState(4);

  // Live 1-second clock
  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      setTimeStr(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Subtle battery segment heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      setBatteryLevel((l) => (l >= 3 ? 2 : l + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Subtle signal bar animation
  useEffect(() => {
    if (!connected) {
      setSignalFrame(2);
      return;
    }
    const interval = setInterval(() => {
      setSignalFrame((f) => (f === 4 ? 3 : 4));
    }, 3500);
    return () => clearInterval(interval);
  }, [connected]);

  const signalHeights = [3, 5, 7, 10];

  return (
    <div className={styles.lcdStatusBar}>
      {/* Signal Bars */}
      <div className={styles.lcdSignal} title="Network Signal Strength">
        {signalHeights.map((h, i) => (
          <div
            key={i}
            className={`${styles.lcdSignalBar} ${i < signalFrame ? styles.active : ''}`}
            style={{ height: h }}
          />
        ))}
        <span className={styles.lcdNetworkTag}>MANDI-Q</span>
      </div>

      {/* Center Live Clock */}
      <span className={styles.lcdTime}>{timeStr}</span>

      {/* Battery Indicator */}
      <div className={styles.lcdBattery} title="Battery Status">
        <div className={styles.lcdBatteryBody}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`${styles.lcdBatterySegment} ${i < batteryLevel ? styles.filled : ''}`}
            />
          ))}
        </div>
        <div className={styles.lcdBatteryTip} />
      </div>
    </div>
  );
});

LCDStatusBar.displayName = 'LCDStatusBar';
