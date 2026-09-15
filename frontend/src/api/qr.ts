import apiClient, { getBaseUrl } from './client';
import type { AxiosRequestConfig } from 'axios';
import type { QRDashboardMetrics, QRVerificationResponse, QRMetadataResponse } from '../types/fairprocure';

export interface QRVerifyPayload {
  qr_data: string;
  device_id?: string;
  operator_id?: string;
}

/**
 * POST /api/v1/qr/verify
 * Validates HMAC-SHA256 signature, farmer registration, slot validity, and rule engine policies.
 */
export async function verifyQR(
  payload: QRVerifyPayload,
  config?: AxiosRequestConfig
): Promise<QRVerificationResponse> {
  try {
    const res = await apiClient.post<QRVerificationResponse>(
      '/api/v1/qr/verify',
      payload,
      config
    );
    return res.data;
  } catch (err: any) {
    if (err.response?.data) {
      return {
        valid: false,
        status: err.response.data.status || 'INVALID',
        message: err.response.data.message || err.message,
        rule_decision: 'DENY',
        rule_reason: err.response.data.reason || 'VERIFICATION_FAILED',
      };
    }
    throw err;
  }
}

/**
 * GET /api/v1/dashboard/qr-metrics
 * Fetches real-time gate pass verification counts and success rates.
 */
export async function getQRDashboardMetrics(
  config?: AxiosRequestConfig
): Promise<QRDashboardMetrics> {
  const res = await apiClient.get<QRDashboardMetrics>(
    '/api/v1/dashboard/qr-metrics',
    config
  );
  return res.data;
}

/**
 * Generates direct URL to access farmer dynamic PNG or SVG pass
 */
export function getFarmerQRUrl(farmerId: string, format: 'png' | 'svg' | 'json' = 'png'): string {
  return `${getBaseUrl()}/api/v1/qr/${farmerId}?format=${format}`;
}

/**
 * GET /api/v1/qr/{farmer_id}?format=json
 * Retrieves verified cryptographic QR metadata for a given farmer.
 */
export async function getFarmerQRMetadata(
  farmerId: string,
  config?: AxiosRequestConfig
): Promise<QRMetadataResponse> {
  const res = await apiClient.get<QRMetadataResponse>(
    `/api/v1/qr/${farmerId}?format=json`,
    config
  );
  return res.data;
}

/**
 * Triggers a browser download for a farmer's dynamic QR image in PNG or SVG format
 */
export async function downloadFarmerQR(
  farmerId: string,
  format: 'png' | 'svg' = 'png',
  customFilename?: string
): Promise<void> {
  const url = getFarmerQRUrl(farmerId, format);
  const response = await fetch(url);
  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = customFilename || `APMC_GatePass_${farmerId.slice(0, 8)}.${format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);
}
