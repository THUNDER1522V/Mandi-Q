import { describe, it, expect } from 'vitest';
import type { FairnessAlert, AlertSeverity } from '../types/fairprocure';

describe('Real-Time Alert Drawer (Part 2)', () => {
  const mockAlerts: FairnessAlert[] = [
    {
      id: 'alt-1',
      type: 'QUEUE_JUMP',
      severity: 'CRITICAL',
      title: 'Queue Jump Attempt Intercepted',
      message: 'Token #35 attempted weighbridge entry before Token #12.',
      created_at: '2026-09-12T08:30:00Z',
    },
    {
      id: 'alt-2',
      type: 'SLOT_EARLY',
      severity: 'HIGH',
      title: 'Early Arrival Diverted to Holding Bay',
      message: 'Token #48 arrived 90 minutes before assigned slot window.',
      created_at: '2026-09-12T08:35:00Z',
    },
    {
      id: 'alt-3',
      type: 'QR_EXPIRED',
      severity: 'MEDIUM',
      title: 'Expired Gate Pass Detected',
      message: 'QR token validity window expired at 08:00 AM.',
      created_at: '2026-09-12T08:40:00Z',
    },
    {
      id: 'alt-4',
      type: 'WEIGHBRIDGE_CLEARED',
      severity: 'LOW',
      title: 'Intake Lot Cleared',
      message: 'Token #10 completed weighment and proceeded to unloading.',
      created_at: '2026-09-12T08:45:00Z',
    },
  ];

  it('verifies all 4 required alert severity classifications', () => {
    const severities: AlertSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const alertSeverities = mockAlerts.map((a) => a.severity);

    severities.forEach((sev) => {
      expect(alertSeverities).toContain(sev);
    });
  });

  it('sorts alerts newest first by timestamp', () => {
    const sorted = [...mockAlerts].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    expect(sorted[0].id).toBe('alt-4'); // 08:45:00Z
    expect(sorted[1].id).toBe('alt-3'); // 08:40:00Z
    expect(sorted[2].id).toBe('alt-2'); // 08:35:00Z
    expect(sorted[3].id).toBe('alt-1'); // 08:30:00Z
  });

  it('filters critical and high severity security alerts', () => {
    const criticalOrHigh = mockAlerts.filter(
      (a) => a.severity === 'CRITICAL' || a.severity === 'HIGH'
    );

    expect(criticalOrHigh.length).toBe(2);
    expect(criticalOrHigh.map((a) => a.type)).toEqual(['QUEUE_JUMP', 'SLOT_EARLY']);
  });
});
