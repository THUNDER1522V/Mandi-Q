import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import type { FarmerBooking, BackendDashboardSummary, HaltEvent, SmsNotification, ActivityEvent } from './types/dashboard';
import type { FairnessAlert, FairnessMetrics, QRDashboardMetrics } from './types/fairprocure';
import { api } from './services/api';
import { getFairnessMetrics, getLiveAlerts } from './api/dashboard';
import { getQRDashboardMetrics } from './api/qr';
import { startProcurement } from './api/fairprocure';
import { useLivePolling } from './hooks/useLivePolling';
import { announceNextFarmer, announceHaltBroadcast, sound, readPALog, clearPALog } from './utils/announcer';
import type { PAAnnouncementEntry } from './utils/announcer';

import { Header } from './components/Header';
import { HaltBanner } from './components/HaltBanner';
import { StatCards } from './components/StatCards';
import { NowServingCard } from './components/NowServingCard';
import { QueuePipeline } from './components/QueuePipeline';
import { QueueTable } from './components/QueueTable';
import { HaltModal } from './components/HaltModal';
import { AlertsPanel } from './components/AlertsPanel';
import { LiveActivityFeed } from './components/LiveActivityFeed';
import { LiveOperationalTicker } from './components/LiveOperationalTicker';
import { RaceTestModal } from './components/RaceTestModal';
import { FarmerDetailModal } from './components/FarmerDetailModal';
import { DemoToolbar } from './components/DemoToolbar';
import { AshokaChakraWatermark } from './components/AshokaChakraWatermark';
import { HeroSkeleton, MetricsSkeleton, QueueSkeleton, TableSkeleton } from './components/SkeletonLoader';
import { WorkspaceToolbar, type Tab } from './components/WorkspaceToolbar';
import { FarmersView } from './components/FarmersView';
import { AlertsDrawer } from './components/AlertsDrawer';
import { ProcurementTimeline } from './components/ProcurementTimeline';
import { OverrideModal } from './components/OverrideModal';
import type { GatePassFarmerData } from './components/DigitalGatePass';
import { VoiceAgentPage } from './components/VoiceAgent';

// Lazy loaded for performance & code-splitting (html5-qrcode and SVG printing assets)
const QRScannerModal = lazy(() => import('./components/QRScannerModal'));
const DigitalGatePass = lazy(() => import('./components/DigitalGatePass'));
import { motion, AnimatePresence } from 'framer-motion';
import { OctagonAlert, CheckCircle2, AlertTriangle, Play, QrCode } from 'lucide-react';
import {
  createDemoFarmers,
  createDemoSummary,
  createDemoAlerts,
  createDemoActivityEvents,
} from './services/demoData';
import type { ThemeMode } from './components/ThemeToggle';

export function App() {
  /* ── State ─────────────────────────────────────────────── */
  const [farmers, setFarmers] = useState<FarmerBooking[]>([]);
  const [summary, setSummary] = useState<BackendDashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<SmsNotification[]>([]);
  const [totalFarmersCount, setTotalFarmersCount] = useState<number>(0);
  const [isHalted, setIsHalted] = useState(false);
  const [haltReason, setHaltReason] = useState('');

  // ── Operations Environment Theme Mode (Day / Night) ─────
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('mandiq_theme_mode');
    if (saved === 'night' || saved === 'day') return saved;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'night';
    }
    return 'day';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mandiq_theme_mode', theme);
  }, [theme]);

  // Presentation Demo Mode state & manual override controller
  const [isDemoMode, setIsDemoMode] = useState(false);
  const manualOverrideRef = useRef<'live' | 'demo' | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('ALL');

  const [isHaltModalOpen, setIsHaltModalOpen] = useState(false);
  const [isRaceModalOpen, setIsRaceModalOpen] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerBooking | null>(null);

  // ── Sprint 5 FairProcure State & Modals ───────────────────
  const [fairnessMetrics, setFairnessMetrics] = useState<FairnessMetrics | null>(null);
  const [qrMetrics, setQrMetrics] = useState<QRDashboardMetrics | null>(null);
  const [liveAlerts, setLiveAlerts] = useState<FairnessAlert[]>([]);
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [timelineBookingData, setTimelineBookingData] = useState<{
    bookingId?: string;
    tokenNumber?: number | string;
    farmerName?: string;
    currentStatus?: string;
  } | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideModalData, setOverrideModalData] = useState<{
    farmerId?: string;
    bookingId?: string;
    tokenNumber?: number;
    farmerName?: string;
    initialReason?: string;
    existingOverrideId?: string;
  } | null>(null);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isGatePassOpen, setIsGatePassOpen] = useState(false);
  const [gatePassFarmer, setGatePassFarmer] = useState<GatePassFarmerData | null>(null);

  const handleOpenGatePass = useCallback((data: GatePassFarmerData) => {
    setGatePassFarmer(data);
    setIsGatePassOpen(true);
  }, []);

  const [devPanelOpen, setDevPanelOpen] = useState(false);
  const soundEnabled = true;
  const [lastSyncTime, setLastSyncTime] = useState('');
  const [isLive, setIsLive] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [paLog, setPaLog] = useState<PAAnnouncementEntry[]>(() => readPALog());
  const [haltEvents, setHaltEvents] = useState<HaltEvent[]>([]);

  // ── Live Activity Stream ─────────────────────────────────
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>(() => [
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      title: 'Operations console initialized',
      detail: 'Live telemetry synchronized · APMC Weighbridge 01 & 02',
      type: 'system',
    },
  ]);

  const addActivityEvent = useCallback((title: string, type: ActivityEvent['type'], detail?: string) => {
    const timestamp = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    setActivityEvents((prev) => [
      {
        id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp,
        title,
        detail,
        type,
      },
      ...prev.slice(0, 30),
    ]);
  }, []);

  // Concurrency guard: prevents overlapping / duplicate in-flight API requests
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const prevErrorRef = useRef<string | null>(null);
  const prevAlertIdsRef = useRef<Set<string>>(new Set());

  /* ── Derived from Backend as Source of Truth ────────────── */
  const metrics = api.calculateMetrics(summary, farmers);
  const servingFarmers = farmers.filter((f) => f.status === 'SERVING');
  const waitingFarmers = farmers.filter((f) => f.status === 'WAITING');
  const rescheduledCount = summary
    ? (summary.rescheduled ?? (summary as any).rescheduledCount ?? 0)
    : farmers.filter((f) => f.status === 'RESCHEDULED').length;

  /* ── Toast ──────────────────────────────────────────────── */
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3400);
  }, []);

  /* ── Centralized Backend Sync (FastAPI Integration with Demo Fallback) ─────── */
  const refreshAll = useCallback(async (_options?: { force?: boolean }) => {
    // If user explicitly selected demo mode, keep demo state active without network calls
    if (manualOverrideRef.current === 'demo') {
      setIsDemoMode(true);
      setIsLive(false);
      setError(null);
      setLastSyncTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setIsLoading(false);
      return;
    }

    // Abort previous in-flight request so the newest request takes precedence
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    isFetchingRef.current = true;

    try {
      const live = await api.checkBackendHealth();

      // If backend is unreachable and not in explicit live-only mode, seamlessly engage Demo Mode
      if (!live && manualOverrideRef.current !== 'live') {
        setIsLive(false);
        setIsDemoMode(true);
        setError(null); // Do NOT show Backend Offline error banner

        console.log('[App setState] Backend offline, loading demo state');
        setFarmers((prev) => (prev.length === 0 || !isDemoMode ? createDemoFarmers() : prev));
        setSummary((prev) => (!prev || !isDemoMode ? createDemoSummary() : prev));
        setAlerts((prev) => (prev.length === 0 || !isDemoMode ? createDemoAlerts() : prev));
        setActivityEvents((prev) => (prev.length <= 1 ? createDemoActivityEvents() : prev));
        setLastSyncTime(
          new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          })
        );
        setIsLoading(false);
        isFetchingRef.current = false;
        return;
      }

      setIsLive(live);

      // Concurrent non-overlapping fetch of summary, live queue, alerts, activity logs, fairness, qr metrics, live alerts
      const [summaryData, queueData, alertsData, activityLogsData, fairnessData, qrData, liveAlertsData] = await Promise.all([
        api.getDashboardSummary(controller.signal),
        api.fetchQueue(controller.signal),
        api.fetchAlerts(controller.signal),
        api.fetchActivityLogs(controller.signal),
        getFairnessMetrics({ signal: controller.signal }).catch(() => null),
        getQRDashboardMetrics({ signal: controller.signal }).catch(() => null),
        getLiveAlerts(50, { signal: controller.signal }).catch(() => []),
      ]);

      // 4. Add console.log immediately after every API response
      console.log('[App refreshAll API response] summaryData received:', summaryData);
      console.log('[App refreshAll API response] queueData count:', queueData?.length);
      console.log('[App refreshAll API response] alertsData count:', alertsData?.length);
      console.log('[App refreshAll API response] activityLogsData count:', activityLogsData?.length);
      console.log('[App refreshAll API response] fairnessData received:', fairnessData);
      console.log('[App refreshAll API response] qrData received:', qrData);
      console.log('[App refreshAll API response] liveAlertsData count:', liveAlertsData?.length);

      if (abortControllerRef.current !== controller) {
        console.log('[App refreshAll] Superseded by newer request, skipping setState');
        return;
      }

      if (fairnessData) {
        setFairnessMetrics(fairnessData);
      }
      if (qrData) {
        setQrMetrics(qrData);
      }
      if (liveAlertsData) {
        setLiveAlerts(liveAlertsData);
      }

      // Live data succeeded -> exit demo mode automatically if we were in automatic fallback
      if (isDemoMode && manualOverrideRef.current === null) {
        setIsDemoMode(false);
        showToast('✓ Backend reconnected · Switched to Live Data');
        addActivityEvent('FastAPI backend connection restored', 'system', 'Live telemetry resumed');
      }

      const totalFarmers = summaryData.total_farmers ?? (summaryData as any).totalFarmers ?? 0;

      // 5. Add console.log before every setState()
      console.log('[App setState] Before setSummary ->', summaryData);
      setSummary(summaryData);

      console.log('[App setState] Before setTotalFarmersCount ->', totalFarmers);
      setTotalFarmersCount(totalFarmers);

      console.log('[App setState] Before setFarmers -> count:', queueData.length);
      setFarmers(queueData);

      console.log('[App setState] Before setAlerts -> count:', alertsData.length);
      setAlerts(alertsData);

      if (activityLogsData && activityLogsData.length > 0) {
        setActivityEvents(activityLogsData);
      }

      console.log('[App setState] Before setIsHalted ->', !summaryData.mandi.active);
      setIsHalted(!summaryData.mandi.active);

      console.log('[App setState] Before setHaltReason ->', summaryData.mandi.halted_reason || '');
      setHaltReason(summaryData.mandi.halted_reason || '');

      console.log('[App setState] Before setIsLoading -> false');
      setIsLoading(false);

      // Sync halt audit event if halted in backend
      if (!summaryData.mandi.active && summaryData.mandi.halted_at) {
        setHaltEvents((prev) => {
          if (prev.length > 0) return prev;
          return [
            {
              id: 'halt-backend-persisted',
              timestamp: new Date(summaryData.mandi.halted_at!).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              }),
              reason: summaryData.mandi.halted_reason || 'Procurement stopped by APMC administration',
              haltedBy: 'Mandi Secretary (Staff Desk - Pushkar)',
              affectedCount: summaryData.rescheduled,
              rescheduledSlot: 'Next Available Shift',
            },
          ];
        });
      }

      if (prevErrorRef.current) {
        showToast('✓ Backend reconnected · Real-time sync restored');
        addActivityEvent('FastAPI backend connection restored', 'system', 'Live telemetry resumed');
      }
      prevErrorRef.current = null;

      // Track new alerts from GET /api/v1/alerts
      if (alertsData && alertsData.length > 0) {
        if (prevAlertIdsRef.current.size > 0) {
          const newAlerts = alertsData.filter((a) => !prevAlertIdsRef.current.has(a.id));
          newAlerts.forEach((a) => {
            addActivityEvent(
              `${a.channel === 'VOICE' ? 'Voice AI call' : 'SMS'} sent to ${a.farmerName}`,
              'sms',
              `${a.phone} · ${a.newToken ? `New Token ${a.newToken}` : 'Delivered'}`
            );
          });
        }
        prevAlertIdsRef.current = new Set(alertsData.map((a) => a.id));
      }

      setError(null);
      setLastSyncTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (manualOverrideRef.current === 'live') {
        const msg = err instanceof Error ? err.message : 'Backend connection error';
        setError(msg);
        setIsLive(false);
        prevErrorRef.current = msg;
      } else {
        // Fallback to Demo Mode without error
        setIsLive(false);
        setIsDemoMode(true);
        setError(null);
        setFarmers((prev) => (prev.length === 0 || !isDemoMode ? createDemoFarmers() : prev));
        setSummary((prev) => (!prev || !isDemoMode ? createDemoSummary() : prev));
        setAlerts((prev) => (prev.length === 0 || !isDemoMode ? createDemoAlerts() : prev));
        setActivityEvents((prev) => (prev.length <= 1 ? createDemoActivityEvents() : prev));
      }
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [addActivityEvent, isDemoMode, showToast]);

  // 3. Centralized 5-second Live Polling with automatic tab-visibility pausing/resumption
  useLivePolling({
    intervalMs: 5000,
    enabled: true,
    onPoll: refreshAll,
  });

  /* ── Mode Toggle: Switch between Live Backend & Demo Data ── */
  const handleToggleMode = useCallback(async () => {
    if (isDemoMode) {
      // User clicked "Switch to Live Backend"
      manualOverrideRef.current = 'live';
      setIsLoading(true);
      try {
        const live = await api.checkBackendHealth();
        if (live) {
          manualOverrideRef.current = null; // restore auto-tracking
          setIsDemoMode(false);
          setIsLive(true);
          setError(null);
          showToast('✓ Switched to Live Backend (FastAPI)');
          addActivityEvent('Switched to Live Backend', 'system', 'FastAPI telemetry synchronized');
          await refreshAll({ force: true });
        } else {
          setIsLive(false);
          setError(`FastAPI backend unreachable at ${api.getBaseUrl()}`);
          showToast(`⚠ FastAPI backend unreachable at ${api.getBaseUrl()}`);
        }
      } catch {
        setIsLive(false);
        setError(`FastAPI backend unreachable at ${api.getBaseUrl()}`);
        showToast(`⚠ FastAPI backend unreachable at ${api.getBaseUrl()}`);
      } finally {
        setIsLoading(false);
      }
    } else {
      // User clicked "Switch to Demo Data"
      manualOverrideRef.current = 'demo';
      setIsDemoMode(true);
      setError(null);
      setFarmers(createDemoFarmers());
      setSummary(createDemoSummary());
      setAlerts(createDemoAlerts());
      setActivityEvents(createDemoActivityEvents());
      setIsHalted(false);
      setHaltReason('');
      showToast('✓ Switched to Demo Mode (Sample Procurement Data)');
      addActivityEvent('Switched to Demo Mode', 'system', 'Loaded 52 sample APMC records');
    }
  }, [addActivityEvent, isDemoMode, refreshAll, showToast]);

  /* ── Keyboard shortcut: Ctrl+Shift+D → dev panel ────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setDevPanelOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* ── Handlers connecting to FastAPI or Demo Simulation ──── */
  const handleMarkServed = async (id: string) => {
    const target = farmers.find((f) => f.id === id);
    const token = target?.rawTokenNumber ?? id;

    // Demo Mode in-memory mutation
    if (isDemoMode) {
      const nowTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      setFarmers((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: 'SERVED',
                bayNumber: undefined,
                servedTimestamp: nowTime,
                paymentStatus: 'CREDITED',
                paymentAmount: f.paymentAmount || Math.round(f.quantityQuintals * 2275),
                paymentReference: f.paymentReference || `PFMS20260911${String(f.rawTokenNumber || '99').padStart(6, '0')}`,
                paymentTime: nowTime,
              }
            : f
        )
      );

      setSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          served: prev.served + 1,
          waiting: target?.status === 'WAITING' ? Math.max(0, prev.waiting - 1) : prev.waiting,
        };
      });

      sound.playSuccessBeep();
      showToast(`✓ Weighment completed — Token ${target?.token || token} marked as SERVED.`);
      addActivityEvent(`Farmer ${target?.token || token} marked Served`, 'served', `${target?.farmerName || 'Farmer'} · Weighment finalized`);
      addActivityEvent(`Payment processed · Token ${target?.token || token}`, 'payment', 'Direct Bank Transfer (DBT) credited');
      return;
    }

    // Live Backend flow
    try {
      setFarmers((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: 'SERVED',
                bayNumber: undefined,
                servedTimestamp: new Date().toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                }),
              }
            : f
        )
      );

      await api.updateFarmerStatus(token, 'SERVED');
      sound.playSuccessBeep();
      showToast(`✓ Weighment completed — Token ${target?.token || token} marked as SERVED.`);
      addActivityEvent(`Farmer ${target?.token || token} marked Served`, 'served', `${target?.farmerName || 'Farmer'} · Weighment finalized`);
      addActivityEvent(`Payment processed · Token ${target?.token || token}`, 'payment', 'Direct Bank Transfer (DBT) credited');

      await refreshAll({ force: true });
    } catch (err) {
      showToast(`Error marking served: ${err instanceof Error ? err.message : 'Failed'}`);
      await refreshAll({ force: true });
    }
  };

  const handleMarkNoShow = async (id: string) => {
    const target = farmers.find((f) => f.id === id);
    const token = target?.rawTokenNumber ?? id;

    // Demo Mode in-memory mutation
    if (isDemoMode) {
      setFarmers((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: 'NO_SHOW',
                bayNumber: undefined,
              }
            : f
        )
      );

      setSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          no_show: prev.no_show + 1,
          waiting: target?.status === 'WAITING' ? Math.max(0, prev.waiting - 1) : prev.waiting,
        };
      });

      showToast(`Token ${target?.token || token} marked as NO-SHOW. Slot released.`);
      addActivityEvent(`Farmer ${target?.token || token} marked as No-show`, 'queue', 'Arrival window expired · Slot released');
      return;
    }

    // Live Backend flow
    try {
      setFarmers((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: 'NO_SHOW',
                bayNumber: undefined,
              }
            : f
        )
      );

      await api.updateFarmerStatus(token, 'NO_SHOW');
      showToast(`Token ${target?.token || token} marked as NO-SHOW. Slot released.`);
      addActivityEvent(`Farmer ${target?.token || token} marked as No-show`, 'queue', 'Arrival window expired · Slot released');

      await refreshAll({ force: true });
    } catch (err) {
      showToast(`Error marking no-show: ${err instanceof Error ? err.message : 'Failed'}`);
      await refreshAll({ force: true });
    }
  };

  const handleCallNext = async (bayNumber: number) => {
    // Demo Mode in-memory mutation
    if (isDemoMode) {
      const existingInBay = farmers.find((f) => f.status === 'SERVING' && f.bayNumber === bayNumber);
      const nextWaiting = farmers.find((f) => f.status === 'WAITING');

      if (!nextWaiting) {
        showToast('No waiting farmers in queue.');
        return;
      }

      const nowTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      setFarmers((prev) =>
        prev.map((f) => {
          if (existingInBay && f.id === existingInBay.id) {
            return {
              ...f,
              status: 'SERVED',
              bayNumber: undefined,
              servedTimestamp: nowTime,
              paymentStatus: 'CREDITED',
              paymentAmount: f.paymentAmount || Math.round(f.quantityQuintals * 2275),
              paymentReference: f.paymentReference || `PFMS20260911${String(f.rawTokenNumber || '99').padStart(6, '0')}`,
              paymentTime: nowTime,
            };
          }
          if (f.id === nextWaiting.id) {
            return {
              ...f,
              status: 'SERVING',
              bayNumber,
            };
          }
          return f;
        })
      );

      setSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          served: existingInBay ? prev.served + 1 : prev.served,
          waiting: Math.max(0, prev.waiting - 1),
        };
      });

      announceNextFarmer(nextWaiting.token, nextWaiting.farmerName, bayNumber, soundEnabled);
      setPaLog(readPALog());
      showToast(`✓ Token ${nextWaiting.token} called to Bay 0${bayNumber} — ${nextWaiting.farmerName}`);
      addActivityEvent(`Farmer ${nextWaiting.token} moved to Bay 0${bayNumber}`, 'bay', `${nextWaiting.farmerName} called to weighbridge`);
      return;
    }

    // Live Backend flow
    try {
      const response = await api.callNextToBayLive(bayNumber);
      if (response && response.called_farmer) {
        sound.playSuccessBeep();
        const calledTok = `T-${String(response.called_farmer.token).padStart(3, '0')}`;
        announceNextFarmer(calledTok, response.called_farmer.name, bayNumber, soundEnabled);
        setPaLog(readPALog());
        showToast(`✓ Token ${calledTok} called to Bay 0${bayNumber} — ${response.called_farmer.name}`);
        addActivityEvent(`Farmer ${calledTok} moved to Bay 0${bayNumber}`, 'bay', `${response.called_farmer.name} called to weighbridge`);
      } else {
        showToast('No waiting farmers in queue.');
      }
      await refreshAll({ force: true });
    } catch (err) {
      showToast(`Error calling next: ${err instanceof Error ? err.message : 'Failed'}`);
      await refreshAll({ force: true });
    }
  };

  const handleCallToBay = async (id: string, bayNumber: number) => {
    // Demo Mode in-memory mutation
    if (isDemoMode) {
      const target = farmers.find((f) => f.id === id);
      if (!target) return;

      const existingInBay = farmers.find((f) => f.status === 'SERVING' && f.bayNumber === bayNumber && f.id !== id);
      const nowTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      setFarmers((prev) =>
        prev.map((f) => {
          if (existingInBay && f.id === existingInBay.id) {
            return {
              ...f,
              status: 'SERVED',
              bayNumber: undefined,
              servedTimestamp: nowTime,
              paymentStatus: 'CREDITED',
              paymentAmount: f.paymentAmount || Math.round(f.quantityQuintals * 2275),
              paymentReference: f.paymentReference || `PFMS20260911${String(f.rawTokenNumber || '99').padStart(6, '0')}`,
              paymentTime: nowTime,
            };
          }
          if (f.id === id) {
            return {
              ...f,
              status: 'SERVING',
              bayNumber,
            };
          }
          return f;
        })
      );

      setSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          served: existingInBay ? prev.served + 1 : prev.served,
          waiting: target.status === 'WAITING' ? Math.max(0, prev.waiting - 1) : prev.waiting,
        };
      });

      announceNextFarmer(target.token, target.farmerName, bayNumber, soundEnabled);
      setPaLog(readPALog());
      showToast(`✓ Token ${target.token} assigned to Bay 0${bayNumber} — ${target.farmerName}`);
      addActivityEvent(`Farmer ${target.token} moved to Bay 0${bayNumber}`, 'bay', `${target.farmerName} assigned to weighbridge`);
      return;
    }

    // Live Backend flow
    try {
      const target = farmers.find((f) => f.id === id);
      const token = target?.rawTokenNumber ?? parseInt(id.replace(/\D/g, ''), 10);

      // 1. FairProcure Rule Engine Gatekeeper check
      try {
        const checkResult = await startProcurement({
          token_number: token,
          farmer_id: target?.farmer_id || undefined,
          booking_id: target?.id || undefined,
          bay_number: bayNumber,
          operator_id: 'SUP-KARNAL-01',
        });

        if (checkResult.decision === 'OVERRIDE_REQUIRED') {
          setOverrideModalData({
            farmerId: target?.farmer_id || undefined,
            bookingId: target?.id || undefined,
            tokenNumber: token,
            farmerName: target?.farmerName,
            initialReason: `${checkResult.reason || 'QUEUE_JUMP_ATTEMPT'}: ${checkResult.details || 'Out-of-turn intake detected by Rule Engine'}`,
          });
          setIsOverrideModalOpen(true);
          showToast('⚠ Out-of-turn intake: Supervisor PIN Override required');
          return;
        }
        if (checkResult.decision === 'DENY') {
          showToast(`❌ Intake Denied: ${checkResult.reason || 'Schedule violation'}`);
          return;
        }
      } catch (checkErr: any) {
        if (checkErr.response?.data?.decision === 'OVERRIDE_REQUIRED') {
          const d = checkErr.response.data;
          setOverrideModalData({
            farmerId: target?.farmer_id || undefined,
            bookingId: target?.id || undefined,
            tokenNumber: token,
            farmerName: target?.farmerName,
            initialReason: `${d.reason || 'QUEUE_JUMP_ATTEMPT'}: ${d.details || 'Out-of-turn intake detected by Rule Engine'}`,
          });
          setIsOverrideModalOpen(true);
          showToast('⚠ Out-of-turn intake: Supervisor PIN Override required');
          return;
        }
      }

      // 2. Queue assignment
      const response = await api.assignFarmerToBayLive(token, bayNumber);
      if (response && response.assigned_farmer) {
        sound.playSuccessBeep();
        const calledTok = `T-${String(response.assigned_farmer.token).padStart(3, '0')}`;
        announceNextFarmer(calledTok, response.assigned_farmer.name, bayNumber, soundEnabled);
        setPaLog(readPALog());
        showToast(`✓ Token ${calledTok} assigned to Bay 0${bayNumber} — ${response.assigned_farmer.name}`);
        addActivityEvent(`Farmer ${calledTok} moved to Bay 0${bayNumber}`, 'bay', `${response.assigned_farmer.name} assigned to weighbridge`);
      }
      await refreshAll({ force: true });
    } catch (err) {
      showToast(`Error assigning to bay: ${err instanceof Error ? err.message : 'Failed'}`);
      await refreshAll({ force: true });
    }
  };

  const handleAnnounce = (token: string, name: string, bay = 1) => {
    announceNextFarmer(token, name, bay, soundEnabled);
    setPaLog(readPALog());
    showToast(`PA: Broadcasting call for token ${token}`);
    addActivityEvent(`PA broadcast for ${token}`, 'system', `Audio announcement: ${name} to Bay 0${bay}`);
  };

  const handleConfirmHalt = async (reason: string, _targetSlot?: string) => {
    // Demo Mode in-memory mutation
    if (isDemoMode) {
      setIsHalted(true);
      setHaltReason(reason);

      const affected = farmers.filter((f) => f.status === 'WAITING');
      setFarmers((prev) =>
        prev.map((f) => {
          if (f.status === 'WAITING') {
            return {
              ...f,
              status: 'RESCHEDULED',
              notes: `Auto-rescheduled by MandiQ HALT protocol: ${reason}`,
            };
          }
          if (f.status === 'SERVING') {
            return {
              ...f,
              bayNumber: undefined,
            };
          }
          return f;
        })
      );

      setSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          mandi: {
            ...prev.mandi,
            active: false,
            halted_reason: reason,
            halted_at: new Date().toISOString(),
          },
          rescheduled: prev.rescheduled + affected.length,
          waiting: 0,
        };
      });

      const newHaltEvent: HaltEvent = {
        id: `halt-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
        reason,
        haltedBy: 'Mandi Secretary (Staff Desk - Pushkar)',
        affectedCount: affected.length,
        rescheduledSlot: 'Tomorrow Shift 1 (08:00 AM)',
      };
      setHaltEvents((prev) => [newHaltEvent, ...prev]);

      // Add simulated SMS notifications
      const newAlerts: SmsNotification[] = affected.slice(0, 5).map((f) => ({
        id: `alert-halt-${f.id}-${Date.now()}`,
        phone: f.phone,
        farmerName: f.farmerName,
        channel: 'SMS',
        message: `MandiQ Halt Protocol: Token ${f.token} rescheduled due to ${reason}. New slot: Tomorrow 08:00 AM.`,
        messageHindi: `मंडीक्यू रोक प्रोटोकॉल: ${reason} के कारण टोकन ${f.token} को कल सुबह 08:00 बजे पुनर्निर्धारित किया गया है।`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        status: 'DELIVERED',
        oldToken: f.token,
        newToken: `TK-${String(Number(f.rawTokenNumber || 100) + 50).padStart(3, '0')}`,
        newSlot: 'Tomorrow 08:00 AM',
        dltTemplateId: 'DLT-HAR-110294-HALT',
      }));
      setAlerts((prev) => [...newAlerts, ...prev]);

      announceHaltBroadcast(soundEnabled);
      showToast(`⚠ Procurement halted: ${affected.length} farmers rescheduled automatically.`);
      addActivityEvent(`Procurement Halted: ${reason}`, 'halt', `${affected.length} farmers automatically rescheduled`);
      setActiveTab('queue');
      setIsAlertsDrawerOpen(true);
      return;
    }

    // Live Backend flow
    try {
      const resp = await api.haltProcurement(reason);
      setIsHalted(true);
      setHaltReason(resp.reason || reason);

      const targetDate = resp.rescheduled?.[0]?.new_date;
      const targetTime = resp.rescheduled?.[0]?.new_time;
      const slotText = targetDate && targetTime ? `${targetDate} at ${targetTime}` : 'Next Available Shift (Tomorrow)';

      const newHaltEvent: HaltEvent = {
        id: `halt-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
        reason: resp.reason || reason,
        haltedBy: 'Mandi Secretary (Staff Desk - Pushkar)',
        affectedCount: resp.affected_count,
        rescheduledSlot: slotText,
      };
      setHaltEvents((prev) => [newHaltEvent, ...prev]);

      announceHaltBroadcast(soundEnabled);
      showToast(`⚠ Procurement halted: ${resp.affected_count} farmers rescheduled automatically.`);
      addActivityEvent(`Procurement Halted: ${resp.reason || reason}`, 'halt', `${resp.affected_count} farmers automatically rescheduled`);

      await refreshAll({ force: true });
      setActiveTab('queue');
      setIsAlertsDrawerOpen(true);
    } catch (err) {
      showToast(`Halt error: ${err instanceof Error ? err.message : 'Failed'}`);
      await refreshAll({ force: true });
    }
  };

  const handleResume = async () => {
    // Demo Mode in-memory mutation
    if (isDemoMode) {
      setIsHalted(false);
      setHaltReason('');
      setSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          mandi: {
            ...prev.mandi,
            active: true,
            halted_reason: null,
            resumed_at: new Date().toISOString(),
          },
        };
      });
      showToast('✓ Procurement operations resumed. Mandi is active.');
      addActivityEvent('Procurement Resumed', 'system', 'Yard gates reopened for intake');
      return;
    }

    // Live Backend flow
    try {
      await api.resumeProcurement();
      setIsHalted(false);
      setHaltReason('');
      showToast('✓ Procurement operations resumed in backend. Mandi is active.');
      addActivityEvent('Procurement Resumed', 'system', 'Yard gates reopened for intake');
      await refreshAll({ force: true });
    } catch (err) {
      showToast(`Resume error: ${err instanceof Error ? err.message : 'Failed'}`);
      await refreshAll({ force: true });
    }
  };

  const handleSimulateBooking = async () => {
    if (isDemoMode) {
      sound.playChime();
      showToast('Simulation refreshed in Demo Mode.');
      return;
    }
    await refreshAll({ force: true });
    sound.playChime();
    showToast('Queue refreshed from FastAPI backend.');
  };

  const handleResetSimulation = useCallback(async () => {
    clearPALog();
    setPaLog([]);
    if (isDemoMode) {
      setFarmers(createDemoFarmers());
      setSummary(createDemoSummary());
      setAlerts(createDemoAlerts());
      setActivityEvents(createDemoActivityEvents());
      setIsHalted(false);
      setHaltReason('');
      showToast('✓ Reset demo data to initial presentation dataset.');
      return;
    }
    await refreshAll({ force: true });
    showToast('Synced live state from FastAPI backend.');
  }, [isDemoMode, refreshAll, showToast]);

  useEffect(() => {
    (window as unknown as { resetSimulation: () => void }).resetSimulation = handleResetSimulation;
    return () => {
      delete (window as unknown as { resetSimulation?: () => void }).resetSimulation;
    };
  }, [handleResetSimulation]);

  /* ── Render ─────────────────────────────────────────────── */
  console.log('[App Render] summary:', summary);
  console.log('[App Render] farmers count:', farmers.length, 'serving:', servingFarmers.length, 'waiting:', waitingFarmers.length);
  console.log('[App Render] metrics:', metrics);

  return (
    <div className="app-layout">
      {/* ── Ashoka Chakra Background Watermark (5–10% opacity) ── */}
      <AshokaChakraWatermark />

      {/* ── 1. HEADER ───────────────────────────────────────── */}
      <Header
        isHalted={isHalted}
        lastSyncTime={lastSyncTime}
        isLive={isLive}
        isDemoMode={isDemoMode}
        onToggleMode={handleToggleMode}
        alertsCount={liveAlerts.length || alerts.length}
        onNotificationsClick={() => setIsAlertsDrawerOpen(true)}
        onResetSimulation={handleResetSimulation}
        theme={theme}
        onThemeChange={setTheme}
      />

      {/* ── 2. PAGE BODY ────────────────────────────────────── */}
      <div className="page-body">

        {/* Loading Skeletons */}
        {isLoading && !summary && farmers.length === 0 && !error ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <HeroSkeleton />
            <MetricsSkeleton />
            <QueueSkeleton />
            <TableSkeleton />
          </div>
        ) : (
          <>
            {/* Backend Connection Alert Banner (hidden when in Demo Mode) */}
            <AnimatePresence>
              {error && !isDemoMode && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  style={{ overflow: 'hidden', marginBottom: 'var(--sp-2)' }}
                >
                  <div className="alert-banner danger">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <OctagonAlert size={18} color="var(--color-danger)" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-danger)' }}>
                          Gateway Connection Paused
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          Connecting to Mandi Gateway at <span className="font-mono">{api.getBaseUrl()}</span>. Re-establishing live telemetry link every 5s...
                        </div>
                      </div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => void refreshAll()}>
                      Retry now
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mandi Halt Alert Banner (when active) */}
            <HaltBanner
              isHalted={isHalted}
              haltReason={haltReason}
              rescheduledCount={rescheduledCount}
              onInspect={() => {
                setActiveTab('queue');
                setIsAlertsDrawerOpen(true);
              }}
              onResume={handleResume}
            />

            {/* ── EMERGENCY CONTROLS (Top Operational Area) ──── */}
            <div className="emergency-controls-row">
              {!isHalted ? (
                <button
                  type="button"
                  className="btn-emergency-halt"
                  onClick={() => setIsHaltModalOpen(true)}
                  title="Initiate APMC emergency halt and automated rescheduling"
                >
                  <OctagonAlert size={18} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                  <div>
                    <span className="emergency-title">Halt Procurement</span>
                    <span className="emergency-caption">Emergency administrative control</span>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-emergency-resume"
                  onClick={handleResume}
                  title="Resume APMC procurement operations"
                >
                  <Play size={17} strokeWidth={2.2} fill="currentColor" style={{ flexShrink: 0 }} />
                  <div>
                    <span className="emergency-title">Resume Procurement</span>
                    <span className="emergency-caption">Restore operational intake</span>
                  </div>
                </button>
              )}
            </div>

            {/* ── WORKSPACE TOOLBAR (ELEVATED WORKFLOW NAVIGATION) ── */}
            <WorkspaceToolbar
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
              }}
              queueCount={farmers.filter((f) => f.status === 'WAITING').length || farmers.length}
              farmersCount={totalFarmersCount || (summary?.total_farmers ?? farmers.length)}
            />

            {/* ── TAB 1: OPERATIONAL DASHBOARD (CORE 4 CARDS + WEIGHBRIDGE) ──── */}
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                {/* 1. Live Operational Stat Cards (4 Essential Metrics) */}
                <StatCards
                  metrics={metrics}
                  fairnessMetrics={fairnessMetrics}
                  qrMetrics={qrMetrics}
                  onFilterClick={(s) => {
                    setActiveStatusFilter(s);
                    setActiveTab('queue');
                  }}
                  activeFilter={activeStatusFilter}
                />

                {/* 2. Weighbridge Operational Panels (Now Serving at Weighbridge Bays) */}
                <NowServingCard
                  servingFarmers={servingFarmers}
                  waitingFarmers={waitingFarmers}
                  waitingCount={metrics.waitingCount}
                  isHalted={isHalted}
                  onMarkServed={handleMarkServed}
                  onMarkNoShow={handleMarkNoShow}
                  onCallNext={handleCallNext}
                  onAnnounce={handleAnnounce}
                  onSelectFarmer={setSelectedFarmer}
                />

                {/* 4. Queue Centerpiece (Movement & Next Tokens) */}
                <QueuePipeline
                  servingFarmers={servingFarmers}
                  waitingFarmers={waitingFarmers}
                  onCallToBay={handleCallToBay}
                  onSelectFarmer={setSelectedFarmer}
                  onOpenQueueTable={() => setActiveTab('queue')}
                />


              </div>
            )}

            {/* ── TAB 2: FARMERS DIRECTORY & REGISTRATION ──────── */}
            {activeTab === 'farmers' && (
              <FarmersView
                onFarmerCountChange={(count) => setTotalFarmersCount(count)}
                showToast={showToast}
                onViewGatePass={(f) => {
                  handleOpenGatePass({
                    farmerId: f.farmerId,
                    farmerName: f.farmerName,
                    phone: f.phone,
                    village: f.village,
                    crop: f.crop,
                    gateStatus: f.gateStatus || 'WAITING',
                  });
                }}
              />
            )}

            {/* ── TAB 3: LIVE QUEUE REFERENCE TABLE ───────────── */}
            {activeTab === 'queue' && (
              <QueueTable
                farmers={farmers}
                onMarkServed={handleMarkServed}
                onMarkNoShow={handleMarkNoShow}
                onCallToBay={handleCallToBay}
                onSelectFarmer={setSelectedFarmer}
                onOpenTimeline={(f) => {
                  setTimelineBookingData({
                    bookingId: f.id,
                    tokenNumber: f.token,
                    farmerName: f.farmerName,
                    currentStatus: f.status,
                  });
                  setIsTimelineOpen(true);
                }}
                onOpenOverride={(f) => {
                  setOverrideModalData({
                    bookingId: f.id,
                    tokenNumber: f.rawTokenNumber,
                    farmerName: f.farmerName,
                    initialReason: 'Manual supervisor intake override clearance requested',
                  });
                  setIsOverrideModalOpen(true);
                }}
                onViewGatePass={(f) => {
                  handleOpenGatePass({
                    farmerId: f.farmer_id || f.id,
                    farmerName: f.farmerName,
                    phone: f.phone,
                    village: f.village,
                    bookingId: f.id,
                    tokenNumber: f.token || f.rawTokenNumber,
                    crop: f.crop,
                    slotTime: f.slotTime,
                    gateStatus: f.status,
                    quantityQuintals: f.quantityQuintals,
                  });
                }}
                activeStatusFilter={activeStatusFilter}
                onStatusFilterChange={setActiveStatusFilter}
                onNavigateToFarmers={() => setActiveTab('farmers')}
              />
            )}

            {/* ── TAB 4: APMC GATE DIGITAL QR VERIFICATION TERMINAL ── */}
            {activeTab === 'qr-scanner' && (
              <div
                className="card"
                style={{
                  padding: '40px 24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 20,
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-xl, 16px)',
                  border: '1px solid var(--border-light)',
                  boxShadow: 'var(--shadow)',
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: 'rgba(139, 92, 246, 0.12)',
                    color: '#8b5cf6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <QrCode size={36} />
                </div>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    APMC Gate Digital QR Verification Terminal
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8, maxWidth: 540, lineHeight: 1.6 }}>
                    Authenticate inbound farmer cryptographic HMAC-SHA256 passes in real time. Validates genuine identity, confirms scheduled arrival window, prevents queue jumping, and unlocks gate intake without middleman interference.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setIsScannerModalOpen(true)}
                    style={{
                      padding: '12px 28px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    <QrCode size={18} />
                    <span>Launch Live Camera Scanner</span>
                  </button>

                  {servingFarmers[0] && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        handleOpenGatePass({
                          farmerId: servingFarmers[0].farmer_id || servingFarmers[0].id,
                          farmerName: servingFarmers[0].farmerName,
                          phone: servingFarmers[0].phone,
                          village: servingFarmers[0].village,
                          bookingId: servingFarmers[0].id,
                          tokenNumber: servingFarmers[0].token || servingFarmers[0].rawTokenNumber,
                          crop: servingFarmers[0].crop,
                          slotTime: servingFarmers[0].slotTime,
                          gateStatus: servingFarmers[0].status,
                          quantityQuintals: servingFarmers[0].quantityQuintals,
                        });
                      }}
                      style={{
                        padding: '12px 24px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        fontWeight: 600,
                        fontSize: 14,
                      }}
                    >
                      <span>View Demo Gate Pass ({servingFarmers[0].token})</span>
                    </button>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 16,
                    padding: '14px 20px',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    gap: 24,
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={14} color="#16a34a" />
                    <span>HMAC-SHA256 Signed</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={14} color="#16a34a" />
                    <span>Anti-Queue Jumping Engine</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={14} color="#16a34a" />
                    <span>Single-Use Gate Entry</span>
                  </div>
                </div>
              </div>
            )}


            {/* ── TAB 5: VOICE AGENT — NOKIA IVR SIMULATION ───────────────── */}
            {activeTab === 'voice' && (
              <div style={{ padding: '4px 0' }}>
                <VoiceAgentPage />
              </div>
            )}


        {/* RESCHEDULE & SMS TAB */}

        {activeTab === 'reschedule' && (
          <AlertsPanel alerts={alerts} haltEvents={haltEvents} />
        )}

        {/* AUDIT TIMELINE TAB */}
        {activeTab === 'audit' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--sp-4)', alignItems: 'start' }}>
            {/* Real-time Telemetry Timeline */}
            <LiveActivityFeed events={activityEvents} />

            {/* Right Column: Halt Events & PA Announcement Log */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              {/* Halt events */}
              <div className="card">
                <div className="card-header" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="card-title">Halt events</span>
                  {haltEvents.length > 0 && (
                    <span className="badge badge-neutral">{haltEvents.length} events</span>
                  )}
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {haltEvents.length === 0 ? (
                    <div className="empty-state" style={{ padding: '36px 16px' }}>
                      <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>Operations running normally.</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>No emergency halt events recorded.</p>
                    </div>
                  ) : (
                    <div className="data-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Time</th>
                            <th>Reason</th>
                            <th>Staff</th>
                            <th style={{ textAlign: 'right' }}>Affected</th>
                          </tr>
                        </thead>
                        <tbody>
                          {haltEvents.map((e) => (
                            <tr key={e.id}>
                              <td className="font-mono" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{e.timestamp}</td>
                              <td style={{ maxWidth: 200, fontSize: 12 }}>{e.reason}</td>
                              <td style={{ fontSize: 12 }}>{e.haltedBy.split(' (')[0]}</td>
                              <td style={{ textAlign: 'right' }}>
                                <span className="font-mono" style={{ fontWeight: 600, color: 'var(--color-danger)' }}>
                                  {e.affectedCount}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* PA Announcement log */}
              <div className="card">
                <div className="card-header" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="card-title">PA announcements</span>
                  {paLog.length > 0 && (
                    <span className="badge badge-info">{paLog.length} calls</span>
                  )}
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {paLog.length === 0 ? (
                    <div className="empty-state" style={{ padding: '36px 16px' }}>
                      <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>Operations running normally.</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>No PA calls dispatched yet.</p>
                    </div>
                  ) : (
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Time</th>
                            <th>Token</th>
                            <th>Farmer</th>
                            <th>Bay</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paLog.map((entry) => (
                            <tr key={entry.id}>
                              <td className="font-mono" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{entry.timestamp}</td>
                              <td>
                                <span className="font-mono" style={{ fontWeight: 700, color: 'var(--color-serving)', fontSize: 13 }}>
                                  {entry.token}
                                </span>
                              </td>
                              <td style={{ fontSize: 13 }}>{entry.farmerName}</td>
                              <td>
                                <span className="badge badge-serving" style={{ fontSize: 11 }}>
                                  Bay 0{entry.bayNumber}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
          </>
        )}

      </div>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid var(--border-light)',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: 'var(--text-secondary)',
          background: 'var(--bg-card)',
          marginTop: 'auto',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className="status-dot success" style={{ width: 6.5, height: 6.5 }} />
          MandiQ Operations Console · Karnal APMC · Smart India Hackathon 2026
        </span>
        <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          {isDemoMode
            ? `${farmers.length} sample records · Presentation Demo Mode · Interactive Simulation`
            : `${farmers.length} live records · Engine: FastAPI · 5s sync active`}
        </span>
      </footer>

      {/* ── MODALS ──────────────────────────────────────────── */}
      <HaltModal
        isOpen={isHaltModalOpen}
        onClose={() => setIsHaltModalOpen(false)}
        onConfirmHalt={handleConfirmHalt}
        waitingCount={metrics.waitingCount}
      />

      <RaceTestModal
        isOpen={isRaceModalOpen}
        onClose={() => setIsRaceModalOpen(false)}
      />

      <FarmerDetailModal
        farmer={selectedFarmer}
        onClose={() => setSelectedFarmer(null)}
        onMarkServed={handleMarkServed}
        onMarkNoShow={handleMarkNoShow}
        onAnnounce={(token, name) => handleAnnounce(token, name, 1)}
        onViewGatePass={(f) => {
          handleOpenGatePass({
            farmerId: f.farmer_id || f.id,
            farmerName: f.farmerName,
            phone: f.phone,
            village: f.village,
            bookingId: f.id,
            tokenNumber: f.token || f.rawTokenNumber,
            crop: f.crop,
            slotTime: f.slotTime,
            gateStatus: f.status,
            quantityQuintals: f.quantityQuintals,
          });
        }}
      />

      {/* ── SPRINT 5 FAIRPROCURE & QR MODALS ─────────────────── */}
      <AlertsDrawer
        isOpen={isAlertsDrawerOpen}
        onClose={() => setIsAlertsDrawerOpen(false)}
        alerts={liveAlerts}
        onRefresh={() => void refreshAll({ force: true })}
      />

      <ProcurementTimeline
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        bookingId={timelineBookingData?.bookingId}
        tokenNumber={timelineBookingData?.tokenNumber}
        farmerName={timelineBookingData?.farmerName}
        currentStatus={timelineBookingData?.currentStatus}
      />

      <OverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => {
          setIsOverrideModalOpen(false);
          setOverrideModalData(null);
        }}
        farmerId={overrideModalData?.farmerId}
        bookingId={overrideModalData?.bookingId}
        tokenNumber={overrideModalData?.tokenNumber}
        farmerName={overrideModalData?.farmerName}
        initialReason={overrideModalData?.initialReason}
        existingOverrideId={overrideModalData?.existingOverrideId}
        onOverrideApproved={() => {
          showToast('✓ Override authorized. Re-clearing procurement intake...');
          void refreshAll({ force: true });
        }}
        onOverrideRejected={() => {
          showToast('Intake override rejected.');
          void refreshAll({ force: true });
        }}
      />

      <Suspense fallback={null}>
        {isScannerModalOpen && (
          <QRScannerModal
            isOpen={isScannerModalOpen}
            onClose={() => setIsScannerModalOpen(false)}
            onVerificationSuccess={(res) => {
              showToast(`✓ QR Verified for ${res.farmer_name || 'Farmer'} (Token #${res.token_number || ''})`);
              void refreshAll({ force: true });
            }}
            onRequestOverride={(res) => {
              setOverrideModalData({
                farmerId: res.farmer_id,
                bookingId: res.booking_id,
                tokenNumber: res.token_number,
                farmerName: res.farmer_name,
                initialReason: res.rule_reason || 'QR Gate Rejection Override',
              });
              setIsOverrideModalOpen(true);
            }}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {isGatePassOpen && (
          <DigitalGatePass
            isOpen={isGatePassOpen}
            onClose={() => {
              setIsGatePassOpen(false);
              setGatePassFarmer(null);
            }}
            farmerData={gatePassFarmer}
            onOpenScanner={() => {
              setIsGatePassOpen(false);
              setIsScannerModalOpen(true);
            }}
          />
        )}
      </Suspense>

      {/* ── DEVELOPER PANEL (Ctrl+Shift+D) ──────────────────── */}
      {devPanelOpen && (
        <DemoToolbar
          onSimulateBooking={handleSimulateBooking}
          onOpenRaceTest={() => setIsRaceModalOpen(true)}
          onOpenHalt={() => setIsHaltModalOpen(true)}
          onResetData={handleResetSimulation}
          onClose={() => setDevPanelOpen(false)}
          isDemoMode={isDemoMode}
          onToggleMode={handleToggleMode}
        />
      )}

      {/* ── ENTERPRISE TOAST NOTIFICATION ────────────────── */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: devPanelOpen ? 72 : 46,
            right: 24,
            background: 'var(--bg-card)',
            backdropFilter: 'blur(12px)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-medium)',
            padding: '10px 18px',
            borderRadius: 'var(--radius-pill)',
            fontSize: 13,
            fontWeight: 500,
            boxShadow: 'var(--shadow-lg)',
            zIndex: 10001,
            animation: 'toastSlideUp 200ms cubic-bezier(0.16, 1, 0.3, 1)',
            maxWidth: 420,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {toast.includes('⚠') || toast.toLowerCase().includes('halt') || toast.toLowerCase().includes('error') ? (
            <AlertTriangle size={16} color="var(--color-danger)" style={{ flexShrink: 0 }} />
          ) : toast.includes('✓') || toast.toLowerCase().includes('served') || toast.toLowerCase().includes('resumed') || toast.toLowerCase().includes('reconnected') ? (
            <CheckCircle2 size={16} color="var(--color-success)" style={{ flexShrink: 0 }} />
          ) : (
            <span className="status-dot serving" style={{ width: 7, height: 7, flexShrink: 0 }} />
          )}
          <span style={{ lineHeight: 1.4 }}>{toast}</span>
        </div>
      )}

      {/* ── LIVE OPERATIONAL TELEMETRY TICKER ───────────────── */}
      <LiveOperationalTicker
        events={activityEvents}
        isLive={isLive || isDemoMode}
        waitingCount={metrics.waitingCount}
        isHalted={isHalted}
      />

    </div>
  );
}

export default App;
