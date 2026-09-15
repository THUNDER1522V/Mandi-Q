import { useEffect, useRef, useState, useCallback } from 'react';

interface UseLivePollingOptions {
  intervalMs?: number;
  enabled?: boolean;
  onPoll: () => Promise<void> | void;
}

interface UseLivePollingReturn {
  isPolling: boolean;
  isTabActive: boolean;
  lastSyncTime: string;
  refreshNow: () => Promise<void>;
}

/**
 * Tab-aware live polling engine for MandiQ operations.
 * Executes onPoll() every intervalMs (default 5000ms).
 * Automatically pauses execution when browser tab is inactive (document.hidden)
 * and triggers an immediate refresh when tab becomes active again.
 */
export function useLivePolling({
  intervalMs = 5000,
  enabled = true,
  onPoll,
}: UseLivePollingOptions): UseLivePollingReturn {
  const [isTabActive, setIsTabActive] = useState<boolean>(() =>
    typeof document !== 'undefined' ? !document.hidden : true
  );
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() =>
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  );

  const pollFnRef = useRef(onPoll);
  pollFnRef.current = onPoll;

  const isRunningRef = useRef(false);

  const executePoll = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setIsPolling(true);
    try {
      await pollFnRef.current();
      setLastSyncTime(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    } catch (err) {
      console.warn('[useLivePolling] Background poll warning:', err);
    } finally {
      isRunningRef.current = false;
      setIsPolling(false);
    }
  }, []);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      const active = !document.hidden;
      setIsTabActive(active);
      if (active && enabled) {
        console.log('[useLivePolling] Tab became active — triggering immediate sync');
        void executePoll();
      } else {
        console.log('[useLivePolling] Tab hidden — pausing background polling');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, executePoll]);

  // Main polling timer
  useEffect(() => {
    if (!enabled || !isTabActive) return;

    // Initial immediate execution
    void executePoll();

    const timerId = setInterval(() => {
      void executePoll();
    }, intervalMs);

    return () => {
      clearInterval(timerId);
    };
  }, [enabled, isTabActive, intervalMs, executePoll]);

  return {
    isPolling,
    isTabActive,
    lastSyncTime,
    refreshNow: executePoll,
  };
}
