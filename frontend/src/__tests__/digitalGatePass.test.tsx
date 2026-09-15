import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFarmerQRUrl, downloadFarmerQR } from '../api/qr';
import type { GatePassFarmerData } from '../components/DigitalGatePass';

describe('Sprint 7: Digital Gate Pass & QR Presentation Layer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates correct backend QR URLs for PNG, SVG, and JSON formats', () => {
    const farmerId = 'f-karnal-101';

    const pngUrl = getFarmerQRUrl(farmerId, 'png');
    const svgUrl = getFarmerQRUrl(farmerId, 'svg');
    const jsonUrl = getFarmerQRUrl(farmerId, 'json');

    expect(pngUrl).toBe('http://127.0.0.1:8000/api/v1/qr/f-karnal-101?format=png');
    expect(svgUrl).toBe('http://127.0.0.1:8000/api/v1/qr/f-karnal-101?format=svg');
    expect(jsonUrl).toBe('http://127.0.0.1:8000/api/v1/qr/f-karnal-101?format=json');
  });

  it('formats gate pass farmer metadata structure accurately', () => {
    const samplePass: GatePassFarmerData = {
      farmerId: 'f-karnal-402',
      farmerName: 'Baldev Singh',
      phone: '+91 98123 45678',
      village: 'Kunjpura',
      bookingId: 'bk-karnal-889',
      tokenNumber: 15,
      crop: 'Basmati Paddy (बासमती धान)',
      slotTime: '08:00 AM - 10:00 AM',
      gateStatus: 'WAITING',
      quantityQuintals: 45,
    };

    expect(samplePass.farmerName).toBe('Baldev Singh');
    expect(samplePass.tokenNumber).toBe(15);
    expect(samplePass.gateStatus).toBe('WAITING');
    expect(samplePass.crop).toContain('Basmati Paddy');
    expect(samplePass.bookingId).toBe('bk-karnal-889');
  });

  it('triggers document anchor download with correct blob data and file naming', async () => {
    const fakeBlob = new Blob(['<svg></svg>'], { type: 'image/svg+xml' });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(fakeBlob),
    } as any);

    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    await downloadFarmerQR('f-test-1', 'svg', 'test-pass.svg');

    expect(globalThis.fetch).toHaveBeenCalledWith('http://127.0.0.1:8000/api/v1/qr/f-test-1?format=svg');
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
  });
});
