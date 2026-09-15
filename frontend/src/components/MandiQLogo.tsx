import React from 'react';

interface MandiQLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const MandiQLogo: React.FC<MandiQLogoProps> = ({
  size = 32,
  className = '',
  style,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="MandiQ Emblem"
    >
      {/* Precision Rounded Base Squircle */}
      <rect width="32" height="32" rx="8" fill="#0A2E73" />

      {/* Sequential FIFO Queue & Intake Pillars (Ascending Throughput) */}
      <rect x="7.5" y="15" width="3.5" height="9" rx="1.75" fill="#FFFFFF" fillOpacity="0.9" />
      <rect x="13.75" y="11" width="3.5" height="13" rx="1.75" fill="#FFFFFF" />
      <rect x="20" y="7" width="3.5" height="17" rx="1.75" fill="#FFFFFF" />

      {/* Baseline Transit Guide */}
      <line
        x1="7"
        y1="25.5"
        x2="24"
        y2="25.5"
        stroke="#FFFFFF"
        strokeOpacity="0.32"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Sovereign Saffron Micro-Node (Live Dispatch & Active Telemetry) */}
      <circle cx="21.75" cy="4" r="1.6" fill="#FF9933" />
    </svg>
  );
};
