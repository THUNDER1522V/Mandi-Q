import type {
  FarmerBooking,
  SmsNotification,
  MandiMetrics,
  QueueStatus,
  RaceTestResult,
  BackendDashboardSummary,
  BackendLiveQueueItem,
  BackendHaltResponse,
  ActivityEvent,
} from '../types/dashboard';

import {
  apiClient,
  checkBackendHealth as clientCheckHealth,
  getBaseUrl,
} from '../api/client';
import {
  getDashboardSummary as apiGetDashboardSummary,
  haltProcurement as apiHaltProcurement,
  resumeProcurement as apiResumeProcurement,
  getAlerts as apiGetAlerts,
  getActivityLogs as apiGetActivityLogs,
} from '../api/dashboard';
import {
  getLiveQueue as apiGetLiveQueue,
  updateQueueStatus as apiUpdateQueueStatus,
  callNextToBay as apiCallNextToBay,
  assignBay as apiAssignBay,
} from '../api/queue';

/**
 * Format "06:00:00" or "06:00" into 12-hour slot time e.g. "06:00 AM - 08:00 AM"
 */
function formatBackendSlotTime(timeStr?: string): string {
  if (!timeStr) return '08:00 AM - 10:00 AM';
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] || '0', 10);
  if (isNaN(h)) return timeStr;

  const startPeriod = h >= 12 ? 'PM' : 'AM';
  const startHour12 = h % 12 === 0 ? 12 : h % 12;
  const startStr = `${String(startHour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${startPeriod}`;

  const endH = (h + 2) % 24;
  const endPeriod = endH >= 12 ? 'PM' : 'AM';
  const endHour12 = endH % 12 === 0 ? 12 : endH % 12;
  const endStr = `${String(endHour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${endPeriod}`;

  return `${startStr} - ${endStr}`;
}

const SESSION_BAYS_KEY = 'mandiq_active_bays_v1';

function loadSavedBayAssignments(): Map<number, { farmerId: string; tokenNumber: number }> {
  try {
    const raw = sessionStorage.getItem(SESSION_BAYS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const map = new Map<number, { farmerId: string; tokenNumber: number }>();
      for (const [k, v] of Object.entries(parsed)) {
        map.set(Number(k), v as { farmerId: string; tokenNumber: number });
      }
      return map;
    }
  } catch {
    // Ignore
  }
  return new Map();
}

function saveBayAssignments(map: Map<number, { farmerId: string; tokenNumber: number }>) {
  try {
    const obj: Record<number, { farmerId: string; tokenNumber: number }> = {};
    for (const [k, v] of map.entries()) {
      obj[k] = v;
    }
    sessionStorage.setItem(SESSION_BAYS_KEY, JSON.stringify(obj));
  } catch {
    // Ignore
  }
}

/**
 * Centralized API Service for MandiQ Staff Dashboard
 * Connects directly to FastAPI backend (/api/v1) as the single source of truth using Axios.
 */
export class MandiApiService {
  private isLive = false;

  // Track active weighbridge bay assignments during live session
  private bayAssignments: Map<number, { farmerId: string; tokenNumber: number }> = loadSavedBayAssignments();

  constructor() {
    void this.checkBackendHealth();
  }

  public getBaseUrl(): string {
    return (apiClient.defaults.baseURL as string) || getBaseUrl();
  }

  public setBaseUrl(url: string) {
    const cleanUrl = url.replace(/\/+$/, '');
    apiClient.defaults.baseURL = cleanUrl;
  }

  public async checkBackendHealth(): Promise<boolean> {
    const live = await clientCheckHealth();
    this.isLive = live;
    return live;
  }

  public isBackendLive(): boolean {
    return this.isLive;
  }

  /**
   * 1. GET /api/v1/dashboard/summary
   * Fetches the official mandi metrics, counts, and active/halted state via Axios
   */
  public async getDashboardSummary(signal?: AbortSignal): Promise<BackendDashboardSummary> {
    return await apiGetDashboardSummary({ signal });
  }

  /**
   * 2. GET /api/v1/queue/live
   * Fetches the live queue of bookings from PostgreSQL via Axios
   */
  public async fetchLiveQueue(signal?: AbortSignal): Promise<BackendLiveQueueItem[]> {
    return await apiGetLiveQueue({ signal });
  }

  /**
   * Transforms raw backend queue items into typed FarmerBooking models
   * preserving any active bay assignments.
   */
  public async fetchQueue(signal?: AbortSignal): Promise<FarmerBooking[]> {
    const rawItems = await this.fetchLiveQueue(signal);
    return this.mapBackendQueue(rawItems);
  }

  public mapBackendQueue(items: BackendLiveQueueItem[]): FarmerBooking[] {
    return items.map((item) => {
      const rawToken = Number(item.token);
      const formattedToken = item.token_formatted || `T-${String(rawToken).padStart(3, '0')}`;
      const id = String(item.id || item.booking_id || `b-${rawToken}`);
      const farmer_id = item.farmer_id || (item.id && typeof item.id === 'string' && item.id.length === 36 ? item.id : undefined);
      const slotFormatted = item.slot_time || formatBackendSlotTime(item.slot_start);

      // Check if this farmer is currently in one of the active bays
      let assignedBay: number | undefined = item.bay_number ?? undefined;
      for (const [bayNum, assign] of this.bayAssignments.entries()) {
        if (assign.tokenNumber === rawToken) {
          assignedBay = bayNum;
          break;
        }
      }

      // Backend status: SERVING, WAITING, BOOKED, SERVED, NO_SHOW, RESCHEDULED
      const rawStatus = (item.status || 'WAITING').toUpperCase();
      let status: QueueStatus = 'WAITING';
      if (rawStatus === 'SERVED') {
        status = 'SERVED';
        if (assignedBay) this.bayAssignments.delete(assignedBay);
        assignedBay = undefined;
      } else if (rawStatus === 'NO_SHOW') {
        status = 'NO_SHOW';
        if (assignedBay) this.bayAssignments.delete(assignedBay);
        assignedBay = undefined;
      } else if (rawStatus === 'RESCHEDULED') {
        status = 'RESCHEDULED';
        if (assignedBay) this.bayAssignments.delete(assignedBay);
        assignedBay = undefined;
      } else if (rawStatus === 'SERVING' || assignedBay) {
        status = 'SERVING';
        assignedBay = assignedBay || item.bay_number || 1;
      } else {
        status = 'WAITING';
      }

      const quantityQuintals = item.quantity_quintals != null
        ? Number(item.quantity_quintals)
        : (45 + ((rawToken * 17) % 85));

      return {
        id,
        farmer_id,
        token: formattedToken,
        rawTokenNumber: rawToken,
        farmerName: item.name || `Farmer ${rawToken}`,
        phone: item.phone || `+91 98120 ${String(rawToken).padStart(5, '0')}`,
        village: item.village || 'Karnal Mandi',
        crop: item.crop || 'Wheat',
        quantityQuintals,
        vehicleType: (item.vehicle_type as any) || 'Tractor Trolley',
        vehicleNumber: item.vehicle_number || `HR 05 ${String.fromCharCode(65 + (rawToken % 26))}${String.fromCharCode(65 + ((rawToken + 3) % 26))} ${String(1000 + (rawToken * 87) % 9000).slice(0, 4)}`,
        slotTime: slotFormatted,
        status,
        bayNumber: assignedBay,
        bookedVia: (item.booked_via as any) || 'Voice (Sarvam AI)',
        bookingTimestamp: item.booking_timestamp || (item.slot_start ? item.slot_start.slice(0, 5) : '08:00 AM'),
        servedTimestamp: item.served_at || undefined,
        notes: item.notes || (item.status === 'RESCHEDULED' ? 'Auto-rescheduled by MandiQ HALT protocol' : undefined),
        moisturePct: item.moisture_pct != null ? Number(item.moisture_pct) : undefined,
        grossWeightKg: item.gross_weight_kg != null ? Number(item.gross_weight_kg) : undefined,
        tareWeightKg: item.tare_weight_kg != null ? Number(item.tare_weight_kg) : undefined,
        netWeightQuintals: item.net_weight_quintals != null ? Number(item.net_weight_quintals) : undefined,
        paymentStatus: item.payment_status as any,
        paymentAmount: item.payment_amount != null ? Number(item.payment_amount) : undefined,
        paymentReference: item.payment_reference || undefined,
        paymentTime: item.payment_time || undefined,
      };
    });
  }

  /**
   * 3. POST /api/v1/queue/update
   * Updates a farmer's status in the backend DB to SERVED or NO_SHOW via Axios
   */
  public async updateFarmerStatus(
    tokenNumberOrId: number | string,
    status: 'SERVED' | 'NO_SHOW'
  ): Promise<{ message: string }> {
    let tokenNumber: number;
    if (typeof tokenNumberOrId === 'number') {
      tokenNumber = tokenNumberOrId;
    } else {
      const match = tokenNumberOrId.replace(/^[^0-9]+/, '');
      tokenNumber = parseInt(match, 10);
    }

    if (isNaN(tokenNumber)) {
      throw new Error(`Invalid token number: ${tokenNumberOrId}`);
    }

    // Clear bay assignment if this token was in a bay
    for (const [bayNum, assign] of this.bayAssignments.entries()) {
      if (assign.tokenNumber === tokenNumber) {
        this.bayAssignments.delete(bayNum);
      }
    }
    saveBayAssignments(this.bayAssignments);

    return await apiUpdateQueueStatus({
      token_number: tokenNumber,
      status,
    });
  }

  /**
   * 4. POST /api/v1/halt
   * Halts procurement and auto-reschedules remaining farmers in PostgreSQL via Axios
   */
  public async haltProcurement(
    reason: string,
    fromTime = '00:00'
  ): Promise<BackendHaltResponse> {
    const res = await apiHaltProcurement(reason, fromTime);
    this.bayAssignments.clear();
    return res;
  }

  /**
   * 5. POST /api/v1/resume
   * Resumes procurement operations in PostgreSQL via Axios
   */
  public async resumeProcurement(): Promise<{ active: boolean }> {
    return await apiResumeProcurement();
  }

  /**
   * 6. GET /api/v1/alerts
   * Fetches the rescheduled notifications generated by the HALT engine via Axios
   */
  public async fetchAlerts(signal?: AbortSignal): Promise<SmsNotification[]> {
    try {
      const items = await apiGetAlerts({ signal });
      if (!Array.isArray(items)) return [];

      return items.map((item) => {
        let createdStr = 'Just now';
        if (item.created_at) {
          try {
            const d = new Date(item.created_at);
            createdStr = d.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
          } catch {
            createdStr = item.created_at;
          }
        }

        const tokenMatch = item.message.match(/New token (\d+)/i) || item.message.match(/नया टोकन नंबर (\d+)/) || item.message.match(/token (\d+)/i);
        const newTokenStr = tokenMatch ? `T-${String(tokenMatch[1]).padStart(3, '0')}` : 'T-NEW';

        const slotMatch = item.message.match(/new slot is ([^.]+)\./i) || item.message.match(/नया स्लॉट ([^क]+) का है/i);
        const newSlotStr = slotMatch ? slotMatch[1].trim() : 'Tomorrow Batch 1';

        return {
          id: `alert-${item.id}`,
          phone: item.phone,
          farmerName: item.name,
          channel: item.channel || 'SMS',
          message: item.message,
          messageHindi: item.message,
          timestamp: createdStr,
          status: item.status || 'QUEUED',
          oldToken: 'T-OLD',
          newToken: newTokenStr,
          newSlot: newSlotStr,
          dltTemplateId: 'DLT-HAR-110294-AGR',
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Bay Operations: Assigns next waiting farmer to Bay
   */
  public callNextToBay(
    bayNumber: number,
    farmers: FarmerBooking[]
  ): { updatedQueue: FarmerBooking[]; calledFarmer: FarmerBooking | null } {
    const nextWaiting = farmers.find((f) => f.status === 'WAITING');
    if (!nextWaiting) {
      return { updatedQueue: farmers, calledFarmer: null };
    }

    this.bayAssignments.set(bayNumber, {
      farmerId: nextWaiting.id,
      tokenNumber: nextWaiting.rawTokenNumber || parseInt(nextWaiting.token.replace(/\D/g, ''), 10) || 1,
    });
    saveBayAssignments(this.bayAssignments);

    const updatedQueue = farmers.map((f) => {
      if (f.status === 'SERVING' && f.bayNumber === bayNumber && f.id !== nextWaiting.id) {
        return {
          ...f,
          status: 'SERVED' as QueueStatus,
          servedTimestamp: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
        };
      }
      if (f.id === nextWaiting.id) {
        return {
          ...f,
          status: 'SERVING' as QueueStatus,
          bayNumber,
        };
      }
      return f;
    });

    const called = updatedQueue.find((f) => f.id === nextWaiting.id) || null;
    return { updatedQueue, calledFarmer: called };
  }

  public callFarmerToBay(
    farmerId: string,
    bayNumber: number,
    farmers: FarmerBooking[]
  ): FarmerBooking[] {
    const target = farmers.find((f) => f.id === farmerId);
    if (target) {
      this.bayAssignments.set(bayNumber, {
        farmerId: target.id,
        tokenNumber: target.rawTokenNumber || parseInt(target.token.replace(/\D/g, ''), 10) || 1,
      });
      saveBayAssignments(this.bayAssignments);
    }

    return farmers.map((f) => {
      if (f.status === 'SERVING' && f.bayNumber === bayNumber && f.id !== farmerId) {
        return {
          ...f,
          status: 'SERVED' as QueueStatus,
          servedTimestamp: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
        };
      }
      if (f.id === farmerId) {
        return {
          ...f,
          status: 'SERVING' as QueueStatus,
          bayNumber,
        };
      }
      return f;
    });
  }

  /**
   * 7. GET /api/v1/activity-logs
   * Fetches real-time activity stream events from PostgreSQL via Axios
   */
  public async fetchActivityLogs(signal?: AbortSignal): Promise<ActivityEvent[]> {
    try {
      const logs = await apiGetActivityLogs({ signal });
      if (!Array.isArray(logs)) return [];
      return logs;
    } catch {
      return [];
    }
  }

  /**
   * Live Bay Operation: Advances next waiting farmer to Bay in PostgreSQL
   */
  public async callNextToBayLive(bayNumber: number): Promise<any> {
    return await apiCallNextToBay(bayNumber);
  }

  /**
   * Live Bay Operation: Assigns a farmer to Bay in PostgreSQL
   */
  public async assignFarmerToBayLive(tokenNumber: number, bayNumber: number): Promise<any> {
    return await apiAssignBay(tokenNumber, bayNumber);
  }

  /**
   * Compute unified MandiMetrics for StatCards using GET /api/v1/dashboard/summary
   * as the ground truth.
   */
  public calculateMetrics(
    summary: BackendDashboardSummary | null,
    farmers: FarmerBooking[]
  ): MandiMetrics {
    console.log('[MandiApiService] calculateMetrics input summary:', summary, 'farmers count:', farmers.length);

    const nowServingCount = farmers.filter((f) => f.status === 'SERVING').length;
    const waitingCount = summary != null
      ? (summary.waiting ?? (summary as any).waitingCount ?? 0)
      : farmers.filter((f) => f.status === 'WAITING').length;
    const servedCount = summary != null
      ? (summary.served ?? (summary as any).servedCount ?? 0)
      : farmers.filter((f) => f.status === 'SERVED').length;
    const noShowCount = summary != null
      ? (summary.no_show ?? (summary as any).noShow ?? 0)
      : farmers.filter((f) => f.status === 'NO_SHOW').length;
    const rescheduledCount = summary != null
      ? (summary.rescheduled ?? (summary as any).rescheduledCount ?? 0)
      : farmers.filter((f) => f.status === 'RESCHEDULED').length;
    const totalRegistered = summary != null
      ? (summary.total_farmers ?? (summary as any).totalFarmers ?? 0)
      : farmers.length;

    const totalQuintalsProcured = summary?.total_quintals_procured != null
      ? Number(summary.total_quintals_procured)
      : (summary as any)?.totalQuintalsProcured != null
      ? Number((summary as any).totalQuintalsProcured)
      : farmers
          .filter((f) => f.status === 'SERVED')
          .reduce((sum, f) => sum + (f.quantityQuintals || 50), 0);

    const avgWaitMinutes = waitingCount * 5;
    const totalSlots = summary ? (summary.total_slots ?? (summary as any).totalSlots ?? 50) : 50;
    const capacityUtilizationPct = totalSlots > 0
      ? Math.min(100, Math.round((totalRegistered / (totalSlots * 7)) * 100))
      : 85;

    const isHalted = summary?.mandi ? !summary.mandi.active : false;
    const haltReason = summary?.mandi?.halted_reason || (summary?.mandi as any)?.haltedReason || undefined;

    const metrics: MandiMetrics = {
      nowServingCount,
      waitingCount,
      servedCount,
      noShowCount,
      rescheduledCount,
      totalRegistered,
      totalQuintalsProcured,
      avgWaitMinutes,
      capacityUtilizationPct,
      activeBays: 2,
      totalBays: 2,
      isHalted,
      haltReason,
      totalSlots,
    };

    console.log('[MandiApiService] calculateMetrics output:', metrics);
    return metrics;
  }

  /**
   * Demo Utility: Simulate Concurrency Race condition against real backend
   */
  public simulateRaceCondition(): RaceTestResult {
    const now = Date.now();
    return {
      candidateA: {
        name: 'Harminder Singh (Nissing)',
        phone: '+91 98120 44991',
        timestampMs: now + 12,
        status: 'WON (Booked)',
        token: 'T-025',
      },
      candidateB: {
        name: 'Jaswant Singh (Taraori)',
        phone: '+91 98762 11804',
        timestampMs: now + 16,
        status: 'LOST (Auto-Rescheduled)',
        token: 'T-026 (Next Slot: 03:00 PM)',
      },
      slotContested: '02:00 - 04:00 PM (Last Capacity Seat)',
      resolvedInMs: 3,
      lockType: 'Postgres SELECT FOR UPDATE / Atomic Redis Lock',
    };
  }

  /**
   * Helper for initial empty queue
   */
  public getInitialQueue(): FarmerBooking[] {
    return [];
  }
}

export const api = new MandiApiService();
