import { useState, useCallback } from 'react';
import { bookingEngine } from '../services/bookingEngine';
import type { CallerProfile, BookingDetails } from '../types/voice';

export function useBooking() {
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmBooking = useCallback(async (caller: CallerProfile, crop: string): Promise<BookingDetails> => {
    setIsBooking(true);
    setError(null);
    try {
      const details = await bookingEngine.confirmBooking(caller, crop);
      return details;
    } catch (err: any) {
      setError(err.message || 'Booking failed');
      throw err;
    } finally {
      setIsBooking(false);
    }
  }, []);

  return {
    isBooking,
    error,
    confirmBooking,
  };
}
