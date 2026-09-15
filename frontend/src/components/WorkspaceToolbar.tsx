import React from 'react';
import { LayoutDashboard, Users, Layers, QrCode, Mic } from 'lucide-react';

export type Tab = 'dashboard' | 'farmers' | 'queue' | 'qr-scanner' | 'voice' | 'fairness' | 'reschedule' | 'audit';

interface WorkspaceToolbarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  queueCount: number;
  farmersCount?: number;
  rescheduleCount?: number;
  auditCount?: number;
  fairnessScore?: number;
  activeQrCount?: number;
}

/**
 * Workspace Navigation Toolbar — Sprint 7 Simplified Workflow
 * Core Demo Story:
 * Farmer Registration → Booking → Secure QR → Gate Verification → Queue → Procurement
 */
export const WorkspaceToolbar: React.FC<WorkspaceToolbarProps> = ({
  activeTab,
  onTabChange,
  queueCount,
  farmersCount = 0,
}) => {
  return (
    <nav
      role="toolbar"
      aria-label="Operations Workspace Console"
      className="workspace-toolbar-container"
    >
      {/* 3px Tricolor Gradient Accent Line (saffron → white → green) */}
      <div className="workspace-toolbar-accent" aria-hidden="true" />

      {/* Tabs Group */}
      <div className="workspace-tabs-group" role="tablist">
        {/* 1. Dashboard Overview */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'dashboard'}
          className={`workspace-tab-btn${activeTab === 'dashboard' ? ' active' : ''}`}
          onClick={() => onTabChange('dashboard')}
        >
          <LayoutDashboard size={15} />
          <span>Dashboard</span>
          <span className="workspace-badge badge-blue">
            Live
          </span>
        </button>

        {/* 2. Farmers Registration & Directory */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'farmers'}
          className={`workspace-tab-btn${activeTab === 'farmers' ? ' active' : ''}`}
          onClick={() => onTabChange('farmers')}
        >
          <Users size={15} />
          <span>Farmers</span>
          <span className="workspace-badge badge-green">
            {farmersCount}
          </span>
        </button>

        {/* 3. Live Queue */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'queue'}
          className={`workspace-tab-btn${activeTab === 'queue' ? ' active' : ''}`}
          onClick={() => onTabChange('queue')}
        >
          <Layers size={15} />
          <span>Queue</span>
          <span className="workspace-badge badge-orange">
            {queueCount}
          </span>
        </button>

        {/* 4. QR Gate Verification */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'qr-scanner'}
          className={`workspace-tab-btn${activeTab === 'qr-scanner' ? ' active' : ''}`}
          onClick={() => onTabChange('qr-scanner')}
        >
          <QrCode size={15} />
          <span>QR Verify</span>
        </button>

        {/* 5. Voice Agent IVR */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'voice'}
          className={`workspace-tab-btn${activeTab === 'voice' ? ' active' : ''}`}
          onClick={() => onTabChange('voice')}
        >
          <Mic size={15} />
          <span>Voice Agent</span>
          <span className="workspace-badge" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
            AI
          </span>
        </button>
      </div>

      {/* Right Side: Operational Control Surface Context Tag */}
      <div className="workspace-meta-tag">
        <span className="status-dot success animate-pulse" style={{ width: 6, height: 6 }} />
        <span>Karnal APMC · Procurement Operations</span>
      </div>
    </nav>
  );
};
