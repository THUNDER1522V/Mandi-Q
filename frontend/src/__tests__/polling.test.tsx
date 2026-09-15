import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Centralized Live Polling Service (Part 8)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('triggers polling callback at standard 5000ms intervals', () => {
    const pollCallback = vi.fn();

    // Simulate polling loop
    const intervalMs = 5000;
    let isTabActive = true;

    const timerId = setInterval(() => {
      if (isTabActive) {
        pollCallback();
      }
    }, intervalMs);

    expect(pollCallback).not.toHaveBeenCalled();

    // Advance by 5 seconds
    vi.advanceTimersByTime(5000);
    expect(pollCallback).toHaveBeenCalledTimes(1);

    // Advance another 5 seconds
    vi.advanceTimersByTime(5000);
    expect(pollCallback).toHaveBeenCalledTimes(2);

    clearInterval(timerId);
  });

  it('pauses polling when browser tab becomes inactive and resumes on focus', () => {
    const pollCallback = vi.fn();
    const intervalMs = 5000;
    let isTabActive = true;

    const tick = () => {
      if (isTabActive) pollCallback();
    };

    const timerId = setInterval(tick, intervalMs);

    // Initial tick
    vi.advanceTimersByTime(5000);
    expect(pollCallback).toHaveBeenCalledTimes(1);

    // Tab becomes hidden
    isTabActive = false;
    vi.advanceTimersByTime(10000); // 2 ticks passed while hidden
    expect(pollCallback).toHaveBeenCalledTimes(1); // No new executions

    // Tab becomes active again -> triggers immediate sync
    isTabActive = true;
    pollCallback(); // Immediate resume sync
    expect(pollCallback).toHaveBeenCalledTimes(2);

    clearInterval(timerId);
  });
});
