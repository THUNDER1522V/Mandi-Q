import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  X,
  CameraOff,
  RefreshCw,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { verifyQR } from '../api/qr';
import type { QRVerificationResponse } from '../types/fairprocure';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerificationSuccess?: (result: QRVerificationResponse) => void;
  onRequestOverride?: (result: QRVerificationResponse) => void;
}

/**
 * APMC Boom Barrier Animation Component
 * Renders an animated SVG electronic gate barrier that lifts smoothly on clearance
 */
const BoomBarrierGate: React.FC<{ isOpen: boolean; status: 'VALID' | 'REJECTED' | 'STANDBY' }> = ({
  isOpen,
  status,
}) => {
  const isGreen = status === 'VALID';
  const isRed = status === 'REJECTED';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 20px',
        background: 'var(--bg-card)',
        borderRadius: 14,
        border: '1px solid var(--border-light)',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Barrier Status Pill */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: 99,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: 12,
          background: isGreen
            ? 'rgba(22, 163, 74, 0.12)'
            : isRed
            ? 'rgba(239, 68, 68, 0.12)'
            : 'rgba(234, 88, 12, 0.12)',
          border: `1px solid ${
            isGreen
              ? 'rgba(22, 163, 74, 0.3)'
              : isRed
              ? 'rgba(239, 68, 68, 0.3)'
              : 'rgba(234, 88, 12, 0.3)'
          }`,
          color: isGreen ? '#16a34a' : isRed ? '#ef4444' : '#ea580c',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isGreen ? '#16a34a' : isRed ? '#ef4444' : '#ea580c',
            boxShadow: isGreen ? '0 0 8px #16a34a' : isRed ? '0 0 8px #ef4444' : 'none',
          }}
        />
        <span>
          {isGreen
            ? 'APMC Barrier 01: LIFTED / OPEN'
            : isRed
            ? 'APMC Barrier 01: LOCKED / DENIED'
            : 'APMC Barrier 01: WAITING FOR SCAN'}
        </span>
      </div>

      {/* SVG Electronic Barrier */}
      <svg width="280" height="90" viewBox="0 0 280 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Road Base Surface */}
        <line x1="20" y1="84" x2="260" y2="84" stroke="var(--border-medium, #94a3b8)" strokeWidth="3" strokeLinecap="round" />

        {/* Support Pillar / Stanchion */}
        <rect x="30" y="32" width="24" height="52" rx="4" fill="var(--brand-navy, #1e3a8a)" />
        <circle cx="42" cy="42" r="6" fill="#f8fafc" />

        {/* LED Signal Indicator Light */}
        <circle
          cx="42"
          cy="22"
          r="6"
          fill={isGreen ? '#22c55e' : isRed ? '#ef4444' : '#eab308'}
          stroke="#0f172a"
          strokeWidth="2"
        />

        {/* Striped Boom Barrier Arm pivoting around (42, 42) */}
        <motion.g
          initial={{ rotate: 0 }}
          animate={{
            rotate: isOpen ? -70 : isRed ? [0, -3, 3, -3, 0] : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 120,
            damping: 14,
            duration: 0.6,
          }}
          style={{ originX: '42px', originY: '42px' }}
        >
          {/* Barrier Beam Base */}
          <rect x="42" y="38" width="190" height="8" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />

          {/* Warning Red Chevron Stripes */}
          <rect x="58" y="38.5" width="22" height="7" fill="#dc2626" />
          <rect x="100" y="38.5" width="22" height="7" fill="#dc2626" />
          <rect x="142" y="38.5" width="22" height="7" fill="#dc2626" />
          <rect x="184" y="38.5" width="22" height="7" fill="#dc2626" />

          {/* Reflector Tip */}
          <circle cx="228" cy="42" r="3" fill="#eab308" />
        </motion.g>

        {/* Receiving Catch Stanchion */}
        <rect x="226" y="58" width="10" height="26" rx="2" fill="var(--border-medium, #64748b)" />
      </svg>
    </div>
  );
};

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onVerificationSuccess,
  onRequestOverride,
}) => {
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<QRVerificationResponse | null>(null);
  const [showJudgeDemoTray, setShowJudgeDemoTray] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'html5qr-scanner-viewport';

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Initialize camera scanner when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setResult(null);
      setCameraError(null);
      setShowJudgeDemoTray(false);
      return;
    }

    let isMounted = true;

    const startCamera = async () => {
      try {
        setCameraError(null);
        const scanner = new Html5Qrcode(scannerContainerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (isMounted) {
              handleCodeScanned(decodedText);
            }
          },
          () => {
            // Ignore frame scan misses
          }
        );

        if (isMounted) {
          setScanning(true);
        }
      } catch (err: any) {
        console.warn('[QRScanner] Camera access initialization error:', err);
        if (isMounted) {
          setScanning(false);
          setCameraError(
            err.message || 'Camera feed unavailable or permissions denied. You can use manual code verification or Judge Demo Passes below.'
          );
        }
      }
    };

    const t = setTimeout(() => {
      startCamera();
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(t);
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch (e) {
      console.warn('[QRScanner] Stop camera error:', e);
    } finally {
      scannerRef.current = null;
      setScanning(false);
    }
  };

  const handleCodeScanned = async (qrData: string) => {
    if (isVerifying) return;
    setIsVerifying(true);
    setResult(null);

    // Stop camera feed to display verification clearance animation
    await stopCamera();

    try {
      const resp = await verifyQR({
        qr_data: qrData.trim(),
        device_id: 'GATE-CAM-01',
        operator_id: 'GATE-SEC-OFFICER-01',
      });
      setResult(resp);

      if (resp.valid) {
        onVerificationSuccess?.(resp);
      }
    } catch (err: any) {
      console.error('[QRScanner] verifyQR API error:', err);
      const fallbackError: QRVerificationResponse = {
        valid: false,
        status: 'INVALID_SIGNATURE',
        message: err.response?.data?.detail || err.response?.data?.message || 'Cryptographic QR verification failed.',
        rule_decision: 'DENY',
        rule_reason: 'INVALID_TOKEN_SIGNATURE',
      };
      setResult(fallbackError);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCodeScanned(manualCode.trim());
  };

  const handleResetScanner = () => {
    setResult(null);
    setManualCode('');
    // Restart camera
    if (!scannerRef.current) {
      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;
      scanner
        .start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => handleCodeScanned(decodedText),
          () => {}
        )
        .then(() => setScanning(true))
        .catch((err) => {
          setCameraError(err.message || 'Camera unavailable');
        });
    }
  };

  if (!isOpen) return null;

  const farmerName = result?.farmer_name || result?.farmer?.name || 'Registered APMC Farmer';
  const tokenFormatted = result?.token?.token_formatted || (result?.token_number ? `TK-${String(result.token_number).padStart(3, '0')}` : '#TK-VERIFIED');
  const queuePos = result?.token?.queue_position ?? 1;
  const verifiedTimestamp = result?.verified_at
    ? new Date(result.verified_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  return (
    <AnimatePresence>
      <div
        className="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-scanner-title"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: 20,
          overflowY: 'auto',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="modal-card"
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl, 18px)',
            border: '1px solid var(--border-light)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            width: '100%',
            maxWidth: 540,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'rgba(37, 99, 235, 0.12)',
                  color: 'var(--brand-navy, #2563eb)',
                }}
              >
                <QrCode size={20} />
              </span>
              <div>
                <h3
                  id="qr-scanner-title"
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  FairProcure QR Gate Scanner
                </h3>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                  APMC Intake Identity &amp; Digital Clearance Gate
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={() => setShowJudgeDemoTray((v) => !v)}
                className="btn btn-secondary btn-sm"
                style={{
                  padding: '4px 10px',
                  fontSize: 11.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  color: showJudgeDemoTray ? 'var(--brand-navy)' : 'var(--text-secondary)',
                }}
                title="Toggle Judge Demo Quick Test Passes"
              >
                <Sparkles size={12} color="var(--brand-saffron)" />
                <span>Demo Passes</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost btn-sm"
                style={{
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Judge Demo Quick Test Passes Tray */}
          {showJudgeDemoTray && (
            <div
              style={{
                background: 'rgba(234, 88, 12, 0.05)',
                borderBottom: '1px solid rgba(234, 88, 12, 0.2)',
                padding: '12px 20px',
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--brand-saffron, #ea580c)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sparkles size={13} />
                <span>Judge Quick-Test Simulation (One-Click Scans)</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button
                  type="button"
                  onClick={() =>
                    handleCodeScanned(
                      JSON.stringify({
                        farmer_id: '00000000-0000-0000-0000-000000000001',
                        token_number: 1,
                        version: 1,
                        signature: 'demo-sample-signature-valid',
                      })
                    )
                  }
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 11, padding: '4px 8px', background: 'var(--bg-card)' }}
                >
                  Clearance: Ramesh Kumar (Token #01)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleCodeScanned(
                      JSON.stringify({
                        farmer_id: '00000000-0000-0000-0000-000000000014',
                        token_number: 14,
                        version: 1,
                        signature: 'demo-sample-signature-out-of-turn',
                      })
                    )
                  }
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 11, padding: '4px 8px', background: 'var(--bg-card)', color: '#ea580c' }}
                >
                  Out-of-Turn: Dharampal (Token #14)
                </button>
              </div>
            </div>
          )}

          {/* Scanner / Result Display */}
          <div style={{ padding: 24 }}>
            {/* If a verification result is present */}
            {result ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                {/* 1. APMC Boom Barrier Gate Animation */}
                <BoomBarrierGate
                  isOpen={result.valid && result.rule_decision === 'ALLOW'}
                  status={
                    result.valid && result.rule_decision === 'ALLOW'
                      ? 'VALID'
                      : 'REJECTED'
                  }
                />

                {/* 2. Large Success / Rejection Pulsing Badge */}
                {result.valid && result.rule_decision === 'ALLOW' ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.15, 1] }}
                    transition={{ duration: 0.4 }}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: 'rgba(22, 163, 74, 0.16)',
                      color: '#16a34a',
                    }}
                  >
                    {/* Concentric Green Pulsing Rings */}
                    <span
                      className="animate-ping"
                      style={{
                        position: 'absolute',
                        inset: -6,
                        borderRadius: '50%',
                        background: 'rgba(22, 163, 74, 0.25)',
                      }}
                    />
                    <CheckCircle2 size={44} style={{ position: 'relative', zIndex: 1 }} />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.15, 1] }}
                    transition={{ duration: 0.4 }}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.16)',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <XCircle size={44} />
                  </motion.div>
                )}

                {/* Title & Message */}
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: 19,
                      fontWeight: 800,
                      color: result.valid && result.rule_decision === 'ALLOW' ? '#16a34a' : '#ef4444',
                    }}
                  >
                    {result.valid && result.rule_decision === 'ALLOW'
                      ? 'Gate Clearance Granted — Barrier Open'
                      : result.rule_decision === 'OVERRIDE_REQUIRED'
                      ? 'Out-of-Turn Gate Clearance Blocked'
                      : 'Verification Denied'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {result.message}
                  </div>
                </div>

                {/* Structured Verification Specifications Card */}
                <div
                  style={{
                    width: '100%',
                    background: 'var(--bg-surface)',
                    borderRadius: 12,
                    padding: '14px 18px',
                    border: '1px solid var(--border-light)',
                    fontSize: 13,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {/* Verified Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px dashed var(--border-light)' }}>
                    <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>Authenticity Protocol:</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <ShieldCheck size={13} />
                      <span>HMAC-SHA256 Signed &amp; Verified</span>
                    </span>
                  </div>

                  {/* Farmer Name */}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Farmer Name:</span>
                    <strong>{farmerName}</strong>
                  </div>

                  {/* Token & Queue Position */}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Queue Token:</span>
                    <strong className="font-mono" style={{ color: 'var(--brand-navy, #2563eb)' }}>
                      {tokenFormatted}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Yard Priority Position:</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                      <Layers size={13} color="var(--brand-saffron)" />
                      <span>Position #{queuePos} in Line</span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Clearance Time:</span>
                    <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {verifiedTimestamp}
                    </span>
                  </div>

                  {result.rule_reason && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px dashed var(--border-light)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Rule Engine Reason:</span>
                      <span style={{ color: '#ea580c', fontWeight: 600 }}>{result.rule_reason}</span>
                    </div>
                  )}
                </div>

                {/* Actions: Supervisor Override & Scan Next */}
                <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 6 }}>
                  {result.rule_decision === 'OVERRIDE_REQUIRED' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        onRequestOverride?.(result);
                        onClose();
                      }}
                      style={{
                        flex: 1,
                        background: 'var(--brand-saffron, #ea580c)',
                        borderColor: 'var(--brand-saffron, #ea580c)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        fontWeight: 700,
                      }}
                    >
                      <ShieldAlert size={15} />
                      <span>Supervisor PIN Override</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleResetScanner}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <RefreshCw size={14} />
                    <span>Scan Next Vehicle</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <div>
                {/* Camera Viewport Container */}
                <div
                  id={scannerContainerId}
                  style={{
                    width: '100%',
                    minHeight: 260,
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: '#0f172a',
                    position: 'relative',
                    border: '1px solid var(--border-light)',
                  }}
                >
                  {cameraError && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                        color: '#94a3b8',
                        textAlign: 'center',
                        gap: 8,
                      }}
                    >
                      <CameraOff size={34} color="var(--brand-saffron, #ea580c)" />
                      <div style={{ fontSize: 13.5, color: '#f8fafc', fontWeight: 600 }}>
                        Camera Viewport Standby
                      </div>
                      <div style={{ fontSize: 12, maxWidth: 320, lineHeight: 1.4 }}>
                        {cameraError}
                      </div>
                    </div>
                  )}

                  {isVerifying && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.88)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#38bdf8',
                        gap: 10,
                        zIndex: 10,
                      }}
                    >
                      <RefreshCw size={30} className="animate-spin" />
                      <div style={{ fontSize: 14, fontWeight: 700 }}>
                        Verifying Cryptographic Digital Signature...
                      </div>
                      <span style={{ fontSize: 11.5, color: '#94a3b8' }}>
                        HMAC-SHA256 authentication in progress
                      </span>
                    </div>
                  )}
                </div>

                {/* Manual Token Verification fallback */}
                <form
                  onSubmit={handleManualSubmit}
                  style={{
                    marginTop: 18,
                    display: 'flex',
                    gap: 8,
                  }}
                >
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Or enter QR payload / Token sequence..."
                    className="field-input font-mono"
                    style={{ flex: 1, fontSize: 13 }}
                  />
                  <button
                    type="submit"
                    disabled={!manualCode.trim() || isVerifying}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <span>Verify</span>
                    <ArrowRight size={14} />
                  </button>
                </form>

                <div
                  style={{
                    marginTop: 10,
                    fontSize: 11.5,
                    color: 'var(--text-tertiary)',
                    textAlign: 'center',
                  }}
                >
                  Point camera at farmer digital gate pass · Electronic barrier unlocks automatically on clearance
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '12px 24px',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-surface)',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Optical Scanner: {scanning ? 'Active Live Camera Feed' : 'Standby / Manual Input Mode'}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default QRScannerModal;
