import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8000';

export function getBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return DEFAULT_BASE_URL;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Response interceptor for consistent error extraction across all API modules
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected network error occurred';
    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data.detail === 'string') {
        message = data.detail;
      } else if (Array.isArray(data.detail) && data.detail[0]?.msg) {
        message = data.detail.map((d: { msg: string; loc?: string[] }) => d.msg).join(', ');
      } else if (typeof data.message === 'string') {
        message = data.message;
      }
    } else if (error.message) {
      message = error.message;
    }
    return Promise.reject(new Error(message));
  }
);

/**
 * Health check utility to verify connectivity with FastAPI backend
 */
export async function checkBackendHealth(config?: AxiosRequestConfig): Promise<boolean> {
  try {
    const res = await apiClient.get<{ status: string; service: string }>('/health', {
      timeout: 3000,
      ...config,
    });
    return res.status >= 200 && res.status < 300 && res.data?.status === 'ok';
  } catch {
    return false;
  }
}

export default apiClient;
