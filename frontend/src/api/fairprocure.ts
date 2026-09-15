import apiClient from './client';
import type { AxiosRequestConfig } from 'axios';
import type {
  OverrideItem,
  OverrideRequestPayload,
  OverrideApprovePayload,
  OverrideRejectPayload,
  ProcurementStartPayload,
  ProcurementStartResponse,
  ProcurementTransitionPayload,
  ProcurementEventItem,
} from '../types/fairprocure';

/**
 * POST /api/v1/fairprocure/override/request
 * Submits an out-of-turn or early intake override request.
 */
export async function requestOverride(
  payload: OverrideRequestPayload,
  config?: AxiosRequestConfig
): Promise<OverrideItem> {
  const res = await apiClient.post<OverrideItem>(
    '/api/v1/fairprocure/override/request',
    payload,
    config
  );
  return res.data;
}

/**
 * POST /api/v1/fairprocure/override/approve
 * Approves a pending override with supervisor PIN.
 */
export async function approveOverride(
  payload: OverrideApprovePayload,
  config?: AxiosRequestConfig
): Promise<OverrideItem> {
  const res = await apiClient.post<OverrideItem>(
    '/api/v1/fairprocure/override/approve',
    payload,
    config
  );
  return res.data;
}

/**
 * POST /api/v1/fairprocure/override/reject
 * Rejects a pending override with justification.
 */
export async function rejectOverride(
  payload: OverrideRejectPayload,
  config?: AxiosRequestConfig
): Promise<OverrideItem> {
  const res = await apiClient.post<OverrideItem>(
    '/api/v1/fairprocure/override/reject',
    payload,
    config
  );
  return res.data;
}

/**
 * GET /api/v1/fairprocure/override/pending
 * Fetches all pending overrides awaiting supervisor action.
 */
export async function getPendingOverrides(
  config?: AxiosRequestConfig
): Promise<OverrideItem[]> {
  const res = await apiClient.get<OverrideItem[]>(
    '/api/v1/fairprocure/override/pending',
    config
  );
  return res.data;
}

/**
 * GET /api/v1/fairprocure/override/history
 * Fetches full historical override records.
 */
export async function getOverrideHistory(
  limit = 50,
  config?: AxiosRequestConfig
): Promise<OverrideItem[]> {
  const res = await apiClient.get<OverrideItem[]>(
    `/api/v1/fairprocure/override/history?limit=${limit}`,
    config
  );
  return res.data;
}

/**
 * POST /api/v1/procurement/start
 * Server-side validated procurement start. Returns 200 on ALLOW or throws on DENY/OVERRIDE_REQUIRED.
 */
export async function startProcurement(
  payload: ProcurementStartPayload,
  config?: AxiosRequestConfig
): Promise<ProcurementStartResponse> {
  try {
    const res = await apiClient.post<ProcurementStartResponse>(
      '/api/v1/procurement/start',
      payload,
      config
    );
    return res.data;
  } catch (error: any) {
    // If backend returned structured error (400)
    if (error.response?.data) {
      return error.response.data as ProcurementStartResponse;
    }
    throw error;
  }
}

/**
 * POST /api/v1/procurement/transition
 * Advances a procurement event across the 13 milestones.
 */
export async function transitionProcurement(
  payload: ProcurementTransitionPayload,
  config?: AxiosRequestConfig
): Promise<any> {
  const res = await apiClient.post(
    '/api/v1/procurement/transition',
    payload,
    config
  );
  return res.data;
}

/**
 * GET /api/v1/procurement/timeline/{booking_id}
 * Retrieves chronological timeline of milestones for a booking.
 */
export async function getProcurementTimeline(
  bookingId: string,
  config?: AxiosRequestConfig
): Promise<ProcurementEventItem[]> {
  const res = await apiClient.get<ProcurementEventItem[]>(
    `/api/v1/procurement/timeline/${bookingId}`,
    config
  );
  return res.data;
}
