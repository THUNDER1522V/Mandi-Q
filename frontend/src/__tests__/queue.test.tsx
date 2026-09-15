import { describe, it, expect } from 'vitest';
import type { FarmerBooking } from '../types/dashboard';

describe('Live Queue Table Logic (Part 4)', () => {
  const sampleFarmers: FarmerBooking[] = [
    {
      id: 'f-1',
      token: 'T-003',
      rawTokenNumber: 3,
      farmerName: 'Baldev Singh',
      phone: '9812345678',
      village: 'Indri',
      crop: 'Wheat (गेहूँ)',
      quantityQuintals: 80,
      vehicleType: 'Tractor Trolley',
      vehicleNumber: 'HR-05-AA-1111',
      slotTime: '08:00 AM - 10:00 AM',
      status: 'WAITING',
      bookedVia: 'Voice (Sarvam AI)',
      bookingTimestamp: '06:00',
    },
    {
      id: 'f-2',
      token: 'T-001',
      rawTokenNumber: 1,
      farmerName: 'Anoop Chand',
      phone: '9812345679',
      village: 'Gharaunda',
      crop: 'Paddy PR-126 (धान)',
      quantityQuintals: 35,
      vehicleType: 'Pickup 407',
      vehicleNumber: 'HR-05-BB-2222',
      slotTime: '08:00 AM - 10:00 AM',
      status: 'SERVING',
      bayNumber: 1,
      bookedVia: 'Keypad (IVR)',
      bookingTimestamp: '06:10',
    },
    {
      id: 'f-3',
      token: 'T-002',
      rawTokenNumber: 2,
      farmerName: 'Charan Lal',
      phone: '9812345680',
      village: 'Kachhwa',
      crop: 'Mustard (सरसों)',
      quantityQuintals: 25,
      vehicleType: 'Tractor Trolley',
      vehicleNumber: 'HR-05-CC-3333',
      slotTime: '10:00 AM - 12:00 PM',
      status: 'SERVED',
      bookedVia: 'Voice (Sarvam AI)',
      bookingTimestamp: '06:15',
    },
  ];

  it('filters queue by status accurately', () => {
    const waiting = sampleFarmers.filter((f) => f.status === 'WAITING');
    const serving = sampleFarmers.filter((f) => f.status === 'SERVING');
    const completed = sampleFarmers.filter((f) => f.status === 'SERVED');

    expect(waiting.length).toBe(1);
    expect(waiting[0].farmerName).toBe('Baldev Singh');
    expect(serving.length).toBe(1);
    expect(serving[0].farmerName).toBe('Anoop Chand');
    expect(completed.length).toBe(1);
  });

  it('searches queue across multiple fields (token, name, phone, village)', () => {
    const query = 'indri';
    const matches = sampleFarmers.filter((f) =>
      f.token.toLowerCase().includes(query) ||
      f.farmerName.toLowerCase().includes(query) ||
      f.village.toLowerCase().includes(query) ||
      f.phone.toLowerCase().includes(query)
    );
    expect(matches.length).toBe(1);
    expect(matches[0].token).toBe('T-003');
  });

  it('sorts queue numerically by token number', () => {
    const sorted = [...sampleFarmers].sort((a, b) => {
      const numA = parseInt(a.token.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.token.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });

    expect(sorted[0].token).toBe('T-001');
    expect(sorted[1].token).toBe('T-002');
    expect(sorted[2].token).toBe('T-003');
  });

  it('correctly calculates pagination slices', () => {
    const pageSize = 2;
    const page1 = sampleFarmers.slice(0, pageSize);
    const page2 = sampleFarmers.slice(pageSize, pageSize * 2);

    expect(page1.length).toBe(2);
    expect(page2.length).toBe(1);
  });
});
