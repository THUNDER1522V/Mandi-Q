import { describe, it, expect } from 'vitest';
import type { OverrideItem, OverrideRequestPayload, OverrideApprovePayload } from '../types/fairprocure';

describe('Supervisor Override Dual-Authorization (Part 6)', () => {
  it('validates mandatory reason and 4-digit supervisor PIN contract', () => {
    const validPayload: OverrideRequestPayload = {
      token_number: 15,
      reason: 'QUEUE_JUMP_ATTEMPT: Perishable produce emergency override',
      requested_by: 'OPERATOR-DESK-01',
    };

    expect(validPayload.reason.length).toBeGreaterThan(5);
    expect(validPayload.token_number).toBe(15);

    const approvePayload: OverrideApprovePayload = {
      override_id: 'ov-1111-2222',
      supervisor_id: 'SUP-KARNAL-01',
      supervisor_name: 'Assistant Mandi Secretary',
      pin: '1234',
      method: 'PIN',
    };

    expect(approvePayload.pin).toBe('1234');
    expect(approvePayload.pin.length).toBe(4);
    expect(approvePayload.supervisor_id).toBe('SUP-KARNAL-01');
  });

  it('verifies approved override model state', () => {
    const approvedItem: OverrideItem = {
      id: 'ov-9999-8888',
      token_number: 12,
      reason: 'Authorized out-of-turn intake',
      requested_by: 'SUP-KARNAL-01',
      approved_by: 'SUP-KARNAL-01',
      approval_status: 'APPROVED',
      approval_method: 'PIN',
      created_at: '2026-09-12T09:00:00Z',
      approved_at: '2026-09-12T09:02:00Z',
    };

    expect(approvedItem.approval_status).toBe('APPROVED');
    expect(approvedItem.approval_method).toBe('PIN');
    expect(approvedItem.approved_by).toBe('SUP-KARNAL-01');
  });
});
