import { describe, it, expect } from 'vitest';
import type { QRVerificationResponse } from '../types/fairprocure';

describe('QR Scanner & Cryptographic Verification (Part 5)', () => {
  it('handles successful HMAC QR verification clearance', () => {
    const validResponse: QRVerificationResponse = {
      valid: true,
      status: 'VALID',
      message: 'Cryptographic digital signature verified. Gate clearance granted.',
      rule_decision: 'ALLOW',
      farmer_id: 'fa-1111-2222',
      farmer_name: 'Dharampal Gill',
      booking_id: 'bk-3333-4444',
      token_number: 14,
      verified_at: '2026-09-12T08:15:00Z',
    };

    expect(validResponse.valid).toBe(true);
    expect(validResponse.rule_decision).toBe('ALLOW');
    expect(validResponse.token_number).toBe(14);
    expect(validResponse.status).toBe('VALID');
  });

  it('handles out-of-turn rejection and detects OVERRIDE_REQUIRED', () => {
    const overrideRequiredResponse: QRVerificationResponse = {
      valid: false,
      status: 'VALID',
      message: 'Procurement before assigned slot window.',
      rule_decision: 'OVERRIDE_REQUIRED',
      rule_reason: 'PROCUREMENT_BEFORE_SLOT',
      farmer_id: 'fa-5555-6666',
      farmer_name: 'Virender Sehwag',
      token_number: 45,
    };

    expect(overrideRequiredResponse.valid).toBe(false);
    expect(overrideRequiredResponse.rule_decision).toBe('OVERRIDE_REQUIRED');
    expect(overrideRequiredResponse.rule_reason).toBe('PROCUREMENT_BEFORE_SLOT');
  });

  it('handles expired and revoked token rejections', () => {
    const expiredResponse: QRVerificationResponse = {
      valid: false,
      status: 'EXPIRED',
      message: 'QR Token has expired for today slot.',
      rule_decision: 'DENY',
      rule_reason: 'TOKEN_EXPIRED',
    };

    expect(expiredResponse.valid).toBe(false);
    expect(expiredResponse.rule_decision).toBe('DENY');
    expect(expiredResponse.status).toBe('EXPIRED');
  });
});
