import { useState, useEffect, useRef } from 'react';
import type { FarmerBooking, MandiMetrics } from '../types/dashboard';

interface UseLiveSimulationOptions {
  initialFarmers: FarmerBooking[];
  initialMetrics: MandiMetrics;
  isHalted?: boolean;
  onEmitActivityEvent?: (message: string, category: string, detail?: string) => void;
}

export function useLiveSimulation({
  initialFarmers,
  initialMetrics: _initialMetrics,
  isHalted = false,
  onEmitActivityEvent,
}: UseLiveSimulationOptions) {
  const [simulatedFarmers, setSimulatedFarmers] = useState<FarmerBooking[]>(initialFarmers);
  const [activeGlowToken, setActiveGlowToken] = useState<string | null>(null);
  const [bayStates, setBayStates] = useState<{
    bay1Status: 'OCCUPIED' | 'READY' | 'CALIBRATING';
    bay2Status: 'OCCUPIED' | 'READY' | 'CALIBRATING';
  }>({
    bay1Status: 'OCCUPIED',
    bay2Status: 'OCCUPIED',
  });

  const getUpdateTag = (token: string) => {
    if (token === activeGlowToken) return 'Just now';
    return '2s ago';
  };

  const onEmitRef = useRef(onEmitActivityEvent);
  onEmitRef.current = onEmitActivityEvent;

  useEffect(() => {
    if (isHalted) return;

    // Timer at 15s
    const t1 = setTimeout(() => {
      setActiveGlowToken('TK-322');
      onEmitRef.current?.(
        'Farmer TK-322 entered Bay 1 for weighbridge procurement',
        'bay',
        'Farmer Rakesh Kumar (TK-322)'
      );
    }, 15000);

    // Timer at 17.7s (2.7s after 15s)
    const t2 = setTimeout(() => {
      setActiveGlowToken(null);
    }, 17700);

    // Timer at 32.0s
    const t3 = setTimeout(() => {
      setBayStates((prev) => ({ ...prev, bay2Status: 'READY' }));
    }, 32000);

    // Timer at 36.5s (4.5s after 32.0s)
    const t4 = setTimeout(() => {
      setBayStates((prev) => ({ ...prev, bay2Status: 'OCCUPIED' }));
    }, 36500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isHalted]);

  return {
    simulatedFarmers,
    setSimulatedFarmers,
    activeGlowToken,
    bayStates,
    getUpdateTag,
  };
}
