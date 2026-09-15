import apiClient from './client';
import type {
  Farmer,
  FarmerCreate,
  FarmerUpdate,
} from '../types/dashboard';
import type { AxiosRequestConfig } from 'axios';

export interface DeleteFarmerResponse {
  message: string;
}

function normalizeFarmer(f: any): Farmer {
  return {
    id: f.id,
    farmer_name: f.farmer_name ?? f.farmerName ?? f.name ?? '',
    phone_number: f.phone_number ?? f.phoneNumber ?? f.phone ?? '',
    village: f.village ?? '',
    district: f.district ?? '',
    state: f.state ?? '',
    preferred_language: f.preferred_language ?? f.preferredLanguage ?? f.language ?? 'Hindi',
    created_at: f.created_at ?? f.createdAt ?? '',
    updated_at: f.updated_at ?? f.updatedAt ?? '',
  };
}

/**
 * GET /api/v1/farmers
 * Retrieve a paginated list of all registered farmers from PostgreSQL.
 */
export async function getFarmers(
  params?: { skip?: number; limit?: number },
  config?: AxiosRequestConfig
): Promise<Farmer[]> {
  const response = await apiClient.get<any[]>('/api/v1/farmers', {
    params,
    ...config,
  });
  console.log('[API farmer.ts] getFarmers raw count:', response.data?.length);

  const rawItems = Array.isArray(response.data) ? response.data : [];
  const normalized = rawItems.map(normalizeFarmer);
  console.log('[API farmer.ts] getFarmers normalized count:', normalized.length);
  return normalized;
}

/**
 * GET /api/v1/farmers/{id}
 * Retrieve details of a specific farmer by UUID.
 */
export async function getFarmerById(
  id: string,
  config?: AxiosRequestConfig
): Promise<Farmer> {
  console.log('[API farmer.ts] getFarmerById:', id);
  const response = await apiClient.get<Farmer>(`/api/v1/farmers/${id}`, config);
  console.log('[API farmer.ts] getFarmerById response:', response.data);
  return normalizeFarmer(response.data);
}

/**
 * POST /api/v1/farmers
 * Registers a new farmer in PostgreSQL. Returns the newly generated farmer record.
 */
export async function createFarmer(
  farmer: FarmerCreate,
  config?: AxiosRequestConfig
): Promise<Farmer> {
  console.log('[API farmer.ts] createFarmer payload:', farmer);
  const response = await apiClient.post<Farmer>(
    '/api/v1/farmers',
    farmer,
    config
  );
  console.log('[API farmer.ts] createFarmer response:', response.data);
  return normalizeFarmer(response.data);
}

/**
 * PUT /api/v1/farmers/{id}
 * Update an existing farmer's details by UUID.
 */
export async function updateFarmer(
  id: string,
  farmer: FarmerUpdate,
  config?: AxiosRequestConfig
): Promise<Farmer> {
  console.log('[API farmer.ts] updateFarmer id:', id, 'payload:', farmer);
  const response = await apiClient.put<Farmer>(
    `/api/v1/farmers/${id}`,
    farmer,
    config
  );
  console.log('[API farmer.ts] updateFarmer response:', response.data);
  return normalizeFarmer(response.data);
}

/**
 * DELETE /api/v1/farmers/{id}
 * Delete a farmer record from PostgreSQL by UUID.
 */
export async function deleteFarmer(
  id: string,
  config?: AxiosRequestConfig
): Promise<DeleteFarmerResponse> {
  console.log('[API farmer.ts] deleteFarmer id:', id);
  const response = await apiClient.delete<DeleteFarmerResponse>(
    `/api/v1/farmers/${id}`,
    config
  );
  console.log('[API farmer.ts] deleteFarmer response:', response.data);
  return response.data;
}
