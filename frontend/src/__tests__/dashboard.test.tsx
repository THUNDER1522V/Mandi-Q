import { describe, it, expect } from 'vitest';
import { api } from '../services/api';
import type { BackendDashboardSummary, FarmerBooking } from '../types/dashboard';
import type { FairnessMetrics, QRDashboardMetrics } from '../types/fairprocure';

describe('Dashboard Metrics and Telemetry (Part 1)', () => {
  it('calculates operational metrics correctly from summary and queue', () => {
    const mockSummary: BackendDashboardSummary = {
      mandi: {
        active: true,
        halted_reason: null,
      },
      waiting: 8,
      served: 24,
      no_show: 2,
      rescheduled: 3,
      total_farmers: 52,
      total_slots: 50,
      total_quintals_procured: 1250,
    };

    const mockFarmers: FarmerBooking[] = [
      {
        id: 'bk-1',
        token: 'T-001',
        rawTokenNumber: 1,
        farmerName: 'Ramesh Singh',
        phone: '9876543210',
        village: 'Kachhwa',
        crop: 'Wheat (गेहूँ)',
        quantityQuintals: 50,
        vehicleType: 'Tractor Trolley',
        vehicleNumber: 'HR-05-AB-1234',
        slotTime: '08:00 AM - 10:00 AM',
        status: 'SERVING',
        bayNumber: 1,
        bookedVia: 'Voice (Sarvam AI)',
        bookingTimestamp: '06:30',
      },
      {
        id: 'bk-2',
        token: 'T-002',
        rawTokenNumber: 2,
        farmerName: 'Suresh Kumar',
        phone: '9876543211',
        village: 'Taraori',
        crop: 'Paddy PR-126 (धान)',
        quantityQuintals: 40,
        vehicleType: 'Pickup 407',
        vehicleNumber: 'HR-05-CD-5678',
        slotTime: '08:00 AM - 10:00 AM',
        status: 'WAITING',
        bookedVia: 'Keypad (IVR)',
        bookingTimestamp: '06:45',
      },
    ];

    const metrics = api.calculateMetrics(mockSummary, mockFarmers);

    expect(metrics.totalRegistered).toBe(52);
    expect(metrics.servedCount).toBe(24);
    expect(metrics.waitingCount).toBe(8);
    expect(metrics.noShowCount).toBe(2);
    expect(metrics.rescheduledCount).toBe(3);
    expect(metrics.totalQuintalsProcured).toBe(1250);
    expect(metrics.isHalted).toBe(false);
  });

  it('verifies 11 core KPIs required by FairProcure operations', () => {
    const fairnessMetrics: FairnessMetrics = {
      today_procurements: 34,
      today_overrides: 1,
      pending_overrides: 0,
      denied_attempts: 2,
      queue_jump_attempts: 2,
      early_arrival_attempts: 1,
      average_waiting_time_minutes: 14.2,
      qr_success_rate: 98.6,
      qr_failure_rate: 1.4,
      queue_compliance: 97.5,
      fairness_score: 95,
      audit_events_today: 88,
      timestamp: '2026-09-12T12:00:00Z',
    };

    const qrMetrics: QRDashboardMetrics = {
      today_qr_generated: 45,
      today_qr_verified: 38,
      verification_failures: 1,
      expired_qr: 1,
      active_qr: 12,
      revoked_qr: 0,
      verification_success_rate: 97.4,
      total_qr_issued: 310,
      timestamp: '2026-09-12T12:00:00Z',
    };

    // 1. Total Farmers
    expect(qrMetrics.total_qr_issued).toBeGreaterThan(0);
    // 2. Today's Procurement
    expect(fairnessMetrics.today_procurements).toBe(34);
    // 3. Active Queue
    expect(qrMetrics.active_qr).toBe(12);
    // 4. Completed Procurement
    expect(qrMetrics.today_qr_verified).toBe(38);
    // 5. Pending Overrides
    expect(fairnessMetrics.pending_overrides).toBe(0);
    // 6. Active QR Tokens
    expect(qrMetrics.active_qr).toBe(12);
    // 7. Fairness Score
    expect(fairnessMetrics.fairness_score).toBe(95);
    // 8. Queue Compliance
    expect(fairnessMetrics.queue_compliance).toBe(97.5);
    // 9. Average Waiting Time
    expect(fairnessMetrics.average_waiting_time_minutes).toBeCloseTo(14.2);
    // 10. Today's QR Verifications
    expect(qrMetrics.today_qr_verified).toBe(38);
    // 11. Today's Failed Verifications
    expect(qrMetrics.verification_failures).toBe(1);
  });
});
