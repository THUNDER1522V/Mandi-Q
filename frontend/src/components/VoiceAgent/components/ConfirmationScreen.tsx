import React, { memo, useState, useEffect } from 'react';
import type { BookingResult } from '../types';
import styles from '../VoiceAgent.module.css';

interface ConfirmationScreenProps {
  stage: 'processing' | 'confirmation' | 'sms_sent' | 'completed';
  booking?: BookingResult | null;
  cropName?: string;
}

export const ConfirmationScreen: React.FC<ConfirmationScreenProps> = memo(({
  stage,
  booking,
  cropName,
}) => {
  const [processingText, setProcessingText] = useState('Checking availability...');

  useEffect(() => {
    if (stage === 'processing') {
      const steps = [
        'Checking availability...',
        'Finding procurement slot...',
        'Allocating token...',
        'Updating queue...',
        'Generating confirmation...',
        'Booking Successful'
      ];
      let stepIndex = 0;
      setProcessingText(steps[0]);
      
      const interval = setInterval(() => {
        stepIndex = Math.min(stepIndex + 1, steps.length - 1);
        setProcessingText(steps[stepIndex]);
      }, 700);
      
      return () => clearInterval(interval);
    }
  }, [stage]);

  return (
    <div className={styles.confirmationScreen}>
      {/* ── STAGE 1: PROCESSING SPINNER ── */}
      {stage === 'processing' && (
        <div className={styles.processingBlock}>
          <div className={styles.pixelSpinner} />
          <div className={styles.confirmTitle}>BOOKING...</div>
          <div className={styles.confirmSub}>
            {cropName ? `${cropName} slot` : 'Allotting slot'}
          </div>
          <div className={styles.confirmTicker}>{processingText}</div>
        </div>
      )}

      {/* ── STAGE 2: CONFIRMATION ── */}
      {stage === 'confirmation' && (
        <div className={styles.confirmBlock}>
          <div className={styles.successIcon} style={{ fontSize: 24, marginBottom: 8, color: '#16a34a' }}>✅</div>
          <div className={styles.confirmBadge}>STATUS: CONFIRMED</div>
          <div className={styles.confirmToken}>{booking?.token || 'TK-248'}</div>
          <div className={styles.confirmDetails} style={{ textAlign: 'left', width: '100%', marginTop: 8, fontSize: 11 }}>
            <div style={{ padding: '2px 0' }}><strong>ID:</strong> BKG-{booking?.rawTokenNumber || '1042'}</div>
            <div style={{ padding: '2px 0' }}><strong>Name:</strong> {booking?.name || booking?.farmerName || 'Farmer'}</div>
            <div style={{ padding: '2px 0' }}><strong>Crop:</strong> {booking?.crop || cropName || 'Wheat'}</div>
            <div style={{ padding: '2px 0' }}><strong>Time:</strong> {booking?.slotTime || '10:00 AM'}</div>
            <div style={{ padding: '2px 0' }}><strong>Gate:</strong> {booking?.apmcGate || booking?.gate || 'Gate 1'}</div>
            <div style={{ padding: '2px 0' }}><strong>Queue Pos:</strong> {booking?.queuePos || '12'}</div>
          </div>
        </div>
      )}

      {/* ── STAGE 3: SMS SENT ── */}
      {stage === 'sms_sent' && (
        <div className={styles.smsSentBlock}>
          <div className={styles.smsSentIcon}>✉ ✓</div>
          <div className={styles.confirmTitle}>SMS SENT</div>
          <div className={styles.smsSuccessSub}>SMS Successfully Sent</div>
          <div className={styles.confirmToken} style={{ fontSize: 10 }}>
            {booking?.token}
          </div>
          <div className={styles.confirmDetails}>
            <div>Gate Pass Generated</div>
          </div>
        </div>
      )}

      {/* ── STAGE 4: COMPLETED SUMMARY ── */}
      {stage === 'completed' && booking && (
        <div className={styles.completedBlock}>
          <div className={styles.confirmTitle}>BOOKING READY</div>
          <div className={styles.confirmToken}>{booking.token}</div>
          <div className={styles.confirmCrop}>{booking.crop}</div>
          <div className={styles.confirmDetails}>
            <div>{booking.date}</div>
            <div>{booking.slotTime}</div>
          </div>
          <div className={styles.completedDoneTag}>READY FOR GATE ENTRY</div>
        </div>
      )}
    </div>
  );
});

ConfirmationScreen.displayName = 'ConfirmationScreen';
