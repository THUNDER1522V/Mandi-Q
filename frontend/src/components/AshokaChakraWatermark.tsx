import React from 'react';

/**
 * Subtle Ashoka Chakra watermark for Indian Government Operations Control Centre background.
 * Rendered at 6% opacity, pointer-events none, responsive to viewport.
 */
export const AshokaChakraWatermark: React.FC = () => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '52%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(720px, 85vw)',
        height: 'min(720px, 85vw)',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.035,
        color: 'var(--brand-navy)',
        userSelect: 'none',
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 400 400"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        stroke="currentColor"
      >
        {/* Outer concentric rings */}
        <circle cx="200" cy="200" r="190" strokeWidth="5" />
        <circle cx="200" cy="200" r="172" strokeWidth="2.5" />

        {/* Center hub */}
        <circle cx="200" cy="200" r="32" strokeWidth="4" />
        <circle cx="200" cy="200" r="14" fill="currentColor" strokeWidth="0" />

        {/* 24 spokes radiating from the center */}
        {Array.from({ length: 24 }).map((_, i) => (
          <line
            key={i}
            x1="200"
            y1="200"
            x2="200"
            y2="28"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${i * 15} 200 200)`}
          />
        ))}

        {/* 24 outer points between spokes */}
        {Array.from({ length: 24 }).map((_, i) => (
          <circle
            key={`pt-${i}`}
            cx="200"
            cy="28"
            r="3.5"
            fill="currentColor"
            strokeWidth="0"
            transform={`rotate(${i * 15 + 7.5} 200 200)`}
          />
        ))}
      </svg>
    </div>
  );
};
