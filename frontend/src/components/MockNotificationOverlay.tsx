import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquareText, X, Check } from 'lucide-react';
import type { MockNotification } from '../services/notificationService';

interface MockNotificationOverlayProps {
  latestNotification: MockNotification | null;
  onClear: () => void;
}

export const MockNotificationOverlay: React.FC<MockNotificationOverlayProps> = ({ latestNotification, onClear }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (latestNotification) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClear, 300); // allow exit animation to complete
      }, 5000); // show for 5 seconds
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [latestNotification, onClear]);

  return (
    <AnimatePresence>
      {isVisible && latestNotification && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            width: 380,
            zIndex: 9999,
            backgroundColor: 'var(--bg-card)',
            borderRadius: 16,
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid var(--border-light)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            borderBottom: '1px solid rgba(22, 163, 74, 0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquareText size={16} color="var(--color-success)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success)', letterSpacing: '0.05em' }}>SMS SENT</span>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: 4,
                display: 'flex'
              }}
            >
              <X size={16} />
            </button>
          </div>
          
          {/* Body */}
          <div style={{ padding: '16px', color: 'var(--text-primary)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              To: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>+91 {latestNotification.phone.slice(-10)}</span>
            </div>
            
            <div style={{
              padding: '12px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}>
MANDIQ

Namaste {latestNotification.farmerName} ji,

Your {latestNotification.crop} procurement slot has been confirmed.

Date:
{latestNotification.date}

Time:
{latestNotification.time}

Token:
{latestNotification.token}

Gate:
{latestNotification.gate}

Please arrive 15 minutes before your slot.
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              marginTop: 12,
              gap: 4,
              color: 'var(--color-success)',
              fontSize: 12,
              fontWeight: 600,
            }}>
              <span>Status: Delivered</span>
              <Check size={14} strokeWidth={3} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
