import apiClient from './client';
import type { BackendLiveQueueItem } from '../types/dashboard';
import type { AxiosRequestConfig } from 'axios';

export interface QueueUpdatePayload {
  token_number: number;
  status: 'SERVED' | 'NO_SHOW' | 'WAITING' | 'RESCHEDULED' | string;
}

export interface QueueUpdateResponse {
  message: string;
}

/**
 * GET /api/v1/queue/live
 * Fetches the live queue of bookings from PostgreSQL.
 * Normalizes item properties to ensure token, name, village, crop, slot_start are always populated.
 */
export async function getLiveQueue(
  config?: AxiosRequestConfig
): Promise<BackendLiveQueueItem[]> {
  const response = await apiClient.get<any[]>(
    '/api/v1/queue/live',
    config
  );
  console.log('[API queue.ts] getLiveQueue raw response:', response.data);

  const rawItems = Array.isArray(response.data) ? response.data : [];
  const normalized: BackendLiveQueueItem[] = rawItems.map((item, idx) => {
    const token = Number(item.token ?? item.token_number ?? item.tokenNumber ?? (idx + 1));
    const name = item.name ?? item.farmer_name ?? item.farmerName ?? `Farmer ${token}`;
    const village = item.village ?? item.farmer_village ?? 'Karnal Mandi';
    const crop = item.crop ?? item.commodity ?? item.commodity_name ?? 'Wheat';
    const slot_start = item.slot_start ?? item.slotStart ?? item.slot_time ?? item.booking_slot ?? '08:00 AM';
    const status = (item.status ?? 'BOOKED').toString().toUpperCase();

    return {
      ...item,
      token,
      name,
      village,
      crop,
      slot_start,
      status,
    };
  });

  console.log('[API queue.ts] getLiveQueue normalized count:', normalized.length);
  return normalized;
}

/**
 * POST /api/v1/queue/update
 * Updates a farmer's status in the backend DB (SERVED, NO_SHOW, etc.).
 */
export async function updateQueueStatus(
  payload: QueueUpdatePayload,
  config?: AxiosRequestConfig
): Promise<QueueUpdateResponse> {
  console.log('[API queue.ts] updateQueueStatus payload:', payload);
  const response = await apiClient.post<QueueUpdateResponse>(
    '/api/v1/queue/update',
    payload,
    config
  );
  console.log('[API queue.ts] updateQueueStatus response:', response.data);
  return response.data;
}

/**
 * POST /api/v1/queue/call-next
 * Atomically advances the next waiting farmer to the specified weighbridge bay in PostgreSQL.
 */
export async function callNextToBay(
  bayNumber: number,
  config?: AxiosRequestConfig
): Promise<any> {
  console.log('[API queue.ts] callNextToBay bayNumber:', bayNumber);
  const response = await apiClient.post(
    '/api/v1/queue/call-next',
    { bay_number: bayNumber },
    config
  );
  console.log('[API queue.ts] callNextToBay response:', response.data);
  return response.data;
}

/**
 * POST /api/v1/queue/assign-bay
 * Explicitly assigns a waiting farmer to a weighbridge bay in PostgreSQL.
 */
export async function assignBay(
  tokenNumber: number,
  bayNumber: number,
  config?: AxiosRequestConfig
): Promise<any> {
  console.log('[API queue.ts] assignBay tokenNumber:', tokenNumber, 'bayNumber:', bayNumber);
  const response = await apiClient.post(
    '/api/v1/queue/assign-bay',
    { token_number: tokenNumber, bay_number: bayNumber },
    config
  );
  console.log('[API queue.ts] assignBay response:', response.data);
  return response.data;
}
