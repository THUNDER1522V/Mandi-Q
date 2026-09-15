import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useLiveSimulation } from '../hooks/useLiveSimulation';
import type { FarmerBooking, MandiMetrics } from '../types/dashboard';

//@ts-ignore env flag for act
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('useLiveSimulation Hook', () => {
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    vi.useRealTimers();
    if (container) {
      document.body.removeChild(container);


      container = null;
    }
  });

  const mockFarmers: FarmerBooking[] = [
    {
      id: 'f-1',
      token: 'TK-320',
      rawTokenNumber: 320,
      farmerName: 'Kuldeep Singh',
      phone: '9812034501',
      village: 'Nilokheri',
      crop: 'Wheat (गेहूँ)',
      quantityQuintals: 45,
      vehicleType: 'Tractor Trolley',
      vehicleNumber: 'HR-05-AT-1024',
      slotTime: '08:00 AM - 10:00 AM',
      status: 'SERVING',
      bayNumber: 1,
      bookedVia: 'Voice (Sarvam AI)',
      bookingTimestamp: '06:30',
    },
    {
      id: 'f-2',
      token: 'TK-321',
      rawTokenNumber: 321,
      farmerName: 'Mahavir Sharma',
      phone: '9812034502',
      village: 'Taraori',
      crop: 'Paddy PR-126 (धान)',
      quantityQuintals: 38,
      vehicleType: 'Pickup 407',
      vehicleNumber: 'HR-05-BR-2048',
      slotTime: '08:00 AM - 10:00 AM',
      status: 'SERVING',
      bayNumber: 2,
      bookedVia: 'Keypad (IVR)',
      bookingTimestamp: '06:45',
    },
    {
      id: 'f-3',
      token: 'TK-322',
      rawTokenNumber: 322,
      farmerName: 'Rakesh Kumar',
      phone: '9812034503',
      village: 'Indri',
      crop: 'Mustard (सरसों)',
      quantityQuintals: 25,
      vehicleType: 'Tractor Trolley',
      vehicleNumber: 'HR-05-CK-3072',
      slotTime: '08:00 AM - 10:00 AM',
      status: 'WAITING',
      bookedVia: 'Web Assisted',
      bookingTimestamp: '07:00',
    },
    {
      id: 'f-4',
      token: 'TK-323',
      rawTokenNumber: 323,
      farmerName: 'Sunita Devi',
      phone: '9812034504',
      village: 'Gharaunda',
      crop: 'Wheat (गेहूँ)',
      quantityQuintals: 52,
      vehicleType: 'Tractor Trolley',
      vehicleNumber: 'HR-05-DL-4096',
      slotTime: '08:00 AM - 10:00 AM',
      status: 'WAITING',
      bookedVia: 'Voice (Sarvam AI)',
      bookingTimestamp: '07:15',
    },
  ];

  const mockMetrics: MandiMetrics = {
    nowServingCount: 2,
    waitingCount: 2,
    servedCount: 20,
    noShowCount: 1,
    rescheduledCount: 0,
    totalRegistered: 24,
    totalQuintalsProcured: 92,
    avgWaitMinutes: 25,
    capacityUtilizationPct: 80,
    activeBays: 2,
    totalBays: 2,
    isHalted: false,
    totalSlots: 50,
  };

  it('initializes and advances queue with live pulse and glow bloom', async () => {
    let hookState: ReturnType<typeof useLiveSimulation> | null = null;
    const mockEmit = vi.fn();

    const TestComponent = ({ isHalted = false }: { isHalted?: boolean }) => {
      hookState = useLiveSimulation({
        initialFarmers: mockFarmers,
        initialMetrics: mockMetrics,
        isHalted,
        onEmitActivityEvent: mockEmit,
      });
      return <div data-testid="test-harness">Active: {hookState.activeGlowToken || 'none'}</div>;
    };

    const root = createRoot(container!);
    await act(async () => {
      root.render(<TestComponent />);
    });

    expect(hookState!.simulatedFarmers.length).toBe(4);
    expect(hookState!.bayStates.bay1Status).toBe('OCCUPIED');
    expect(hookState!.bayStates.bay2Status).toBe('OCCUPIED');
    expect(hookState!.getUpdateTag('TK-320')).toBe('2s ago');

    // Advance by 15s to trigger token advancement
    await act(async () => {
      vi.advanceTimersByTime(15000);
    });

    expect(hookState!.activeGlowToken).toBe('TK-322');
    expect(hookState!.getUpdateTag('TK-322')).toBe('Just now');
    expect(mockEmit).toHaveBeenCalledWith(
      expect.stringContaining('Farmer TK-322 entered Bay'),
      'bay',
      expect.stringContaining('Rakesh Kumar')
    );

    // Fast-forward 2.7s to let glow return to normal (total elapsed: 17.7s)
    await act(async () => {
      vi.advanceTimersByTime(2700);
    });
    expect(hookState!.activeGlowToken).toBeNull();

    // Advance to exactly 32.0s (14.3s more) to trigger weighbridge calibration cycle
    await act(async () => {
      vi.advanceTimersByTime(14300);
    });
    expect(hookState!.bayStates.bay2Status).toBe('READY');

    // After 4.5s it returns to OCCUPIED
    await act(async () => {
      vi.advanceTimersByTime(4500);
    });
    expect(hookState!.bayStates.bay2Status).toBe('OCCUPIED');

    await act(async () => {
      root.unmount();
    });
  });
});
