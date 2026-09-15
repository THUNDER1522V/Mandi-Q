import React, { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 220,
  className = '',
  style,
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const startVal = prevValueRef.current;
    const endVal = value;

    if (startVal === endVal) {
      return;
    }

    prevValueRef.current = endVal;
    const startTime = performance.now();

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Gentle spring-like ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const isFloat = !Number.isInteger(endVal);
      const current = isFloat
        ? Number((startVal + (endVal - startVal) * easeOut).toFixed(1))
        : Math.round(startVal + (endVal - startVal) * easeOut);

      setDisplayValue(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(endVal);
        animRef.current = null;
      }
    };

    animRef.current = requestAnimationFrame(updateCounter);

    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [value, duration]);

  return (
    <span className={className} style={style}>
      {displayValue.toLocaleString()}
    </span>
  );
};
