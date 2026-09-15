import { describe, it, expect } from 'vitest';
import { PROCUREMENT_MILESTONES } from '../components/ProcurementTimeline';

describe('Procurement Lifecycle Timeline (Part 3)', () => {
  it('defines the 11 sequential milestones in exact order', () => {
    const expectedStatuses = [
      'ARRIVED',
      'QR_VERIFIED',
      'QUEUE_ENTERED',
      'WAITING',
      'WEIGHMENT_STARTED',
      'WEIGHMENT_COMPLETED',
      'PROCUREMENT_STARTED',
      'PROCUREMENT_COMPLETED',
      'PAYMENT_INITIATED',
      'PAYMENT_COMPLETED',
      'EXITED',
    ];

    expect(PROCUREMENT_MILESTONES.length).toBe(11);
    expectedStatuses.forEach((status, idx) => {
      expect(PROCUREMENT_MILESTONES[idx].status).toBe(status);
    });
  });

  it('determines completed, active, and pending milestone indexes correctly', () => {
    const currentStatus = 'WEIGHMENT_STARTED';
    const activeIndex = PROCUREMENT_MILESTONES.findIndex((m) => m.status === currentStatus);

    expect(activeIndex).toBe(4); // 5th step (0-indexed)

    // Completed steps before WEIGHMENT_STARTED
    const completed = PROCUREMENT_MILESTONES.slice(0, activeIndex).map((m) => m.status);
    expect(completed).toEqual(['ARRIVED', 'QR_VERIFIED', 'QUEUE_ENTERED', 'WAITING']);

    // Future steps after WEIGHMENT_STARTED
    const future = PROCUREMENT_MILESTONES.slice(activeIndex + 1).map((m) => m.status);
    expect(future).toContain('WEIGHMENT_COMPLETED');
    expect(future).toContain('PROCUREMENT_STARTED');
    expect(future).toContain('PAYMENT_COMPLETED');
    expect(future).toContain('EXITED');
  });
});
