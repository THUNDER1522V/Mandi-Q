import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FarmerBooking, QueueStatus } from '../types/dashboard';
import {
  Search,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ArrowUpDown,
  Clock,
  ChevronLeft,
  QrCode,
} from 'lucide-react';

interface QueueTableProps {
  farmers: FarmerBooking[];
  onMarkServed: (id: string) => void;
  onMarkNoShow: (id: string) => void;
  onCallToBay: (id: string, bayNumber: number) => void;
  onSelectFarmer: (farmer: FarmerBooking) => void;
  onOpenTimeline?: (farmer: FarmerBooking) => void;
  onOpenOverride?: (farmer: FarmerBooking) => void;
  onViewGatePass?: (farmer: FarmerBooking) => void;
  activeStatusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onNavigateToFarmers?: () => void;
}


type SortField = 'token' | 'farmerName' | 'slotTime' | 'waitingTime' | 'status';
type SortOrder = 'asc' | 'desc';

const StatusBadge: React.FC<{ status: QueueStatus }> = ({ status }) => {
  const renderBadge = () => {
    switch (status) {
      case 'SERVING':
        return (
          <span className="badge badge-serving">
            <span className="status-dot serving animate-pulse" />
            Serving
          </span>
        );
      case 'WAITING':
        return (
          <span className="badge badge-warning">
            <span className="status-dot waiting" />
            Waiting
          </span>
        );
      case 'SERVED':
        return (
          <span className="badge badge-success">
            <span className="status-dot success" />
            Completed
          </span>
        );
      case 'NO_SHOW':
        return (
          <span className="badge badge-danger">
            <span className="status-dot danger" />
            No-show
          </span>
        );
      case 'RESCHEDULED':
        return (
          <span className="badge badge-neutral">
            <span className="status-dot neutral" />
            Rescheduled
          </span>
        );
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <motion.span
      key={status}
      initial={{ scale: 0.94, opacity: 0.82 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'inline-flex' }}
    >
      {renderBadge()}
    </motion.span>
  );
};

export const QueueTable: React.FC<QueueTableProps> = ({
  farmers,
  onMarkServed,
  onMarkNoShow,
  onCallToBay,
  onSelectFarmer,
  onOpenTimeline: _onOpenTimeline,
  onOpenOverride: _onOpenOverride,
  onViewGatePass,
  activeStatusFilter,

  onStatusFilterChange,
  onNavigateToFarmers,
}) => {
  const [search, setSearch] = useState('');
  const [cropFilter, setCropFilter] = useState('ALL');
  const [sortField, setSortField] = useState<SortField>('token');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Track which farmer IDs were just moved to SERVING for the pulse animation
  const [recentlyCalled, setRecentlyCalled] = useState<Set<string>>(new Set());
  const prevServingIds = useRef<Set<string>>(new Set());

  // Track status updates for subtle row highlight
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());
  const prevStatusesRef = useRef<Map<string, QueueStatus>>(new Map());

  useEffect(() => {
    const currentStatuses = new Map<string, QueueStatus>();
    const updatedIds: string[] = [];

    farmers.forEach((f) => {
      currentStatuses.set(f.id, f.status);
      const prev = prevStatusesRef.current.get(f.id);
      if (prev && prev !== f.status) {
        updatedIds.push(f.id);
      }
    });

    if (updatedIds.length > 0) {
      const animTimer = setTimeout(() => {
        setRecentlyUpdated((prev) => new Set([...prev, ...updatedIds]));
      }, 0);
      const timer = setTimeout(() => {
        setRecentlyUpdated((prev) => {
          const next = new Set(prev);
          updatedIds.forEach((id) => next.delete(id));
          return next;
        });
      }, 1800);
      prevStatusesRef.current = currentStatuses;
      return () => {
        clearTimeout(animTimer);
        clearTimeout(timer);
      };
    }
    prevStatusesRef.current = currentStatuses;
  }, [farmers]);

  useEffect(() => {
    const currentServingIds = new Set(
      farmers.filter((f) => f.status === 'SERVING').map((f) => f.id)
    );
    const newlyCalledIds = [...currentServingIds].filter(
      (id) => !prevServingIds.current.has(id)
    );
    if (newlyCalledIds.length > 0) {
      const animTimer = setTimeout(() => {
        setRecentlyCalled((prev) => new Set([...prev, ...newlyCalledIds]));
      }, 0);
      const timer = setTimeout(() => {
        setRecentlyCalled((prev) => {
          const next = new Set(prev);
          newlyCalledIds.forEach((id) => next.delete(id));
          return next;
        });
      }, 2500);
      prevServingIds.current = currentServingIds;
      return () => {
        clearTimeout(animTimer);
        clearTimeout(timer);
      };
    }
    prevServingIds.current = currentServingIds;
  }, [farmers]);

  // Filtering + Searching
  const filtered = useMemo(() => {
    return farmers.filter((f) => {
      if (activeStatusFilter !== 'ALL' && f.status !== activeStatusFilter) return false;
      if (cropFilter !== 'ALL' && !f.crop.includes(cropFilter)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          f.token.toLowerCase().includes(q) ||
          f.farmerName.toLowerCase().includes(q) ||
          f.village.toLowerCase().includes(q) ||
          f.phone.toLowerCase().includes(q) ||
          f.crop.toLowerCase().includes(q) ||
          f.vehicleNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [farmers, activeStatusFilter, cropFilter, search]);

  // Sorting
  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let valA: any = a[sortField as keyof FarmerBooking];
      let valB: any = b[sortField as keyof FarmerBooking];

      if (sortField === 'token') {
        const numA = parseInt(a.token.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.token.replace(/\D/g, '') || '0', 10);
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      }
      if (sortField === 'waitingTime') {
        // Derive estimated turnaround
        const numA = (a.rawTokenNumber || 1) * 3;
        const numB = (b.rawTokenNumber || 1) * 3;
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      }

      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filtered, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  // Reset page if filtered results shrink
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const count = (s: string) =>
    s === 'ALL' ? farmers.length : farmers.filter((f) => f.status === s).length;

  const tabs = [
    { key: 'ALL', label: 'All Records' },
    { key: 'WAITING', label: 'Waiting' },
    { key: 'SERVING', label: 'Serving' },
    { key: 'SERVED', label: 'Completed' },
    { key: 'NO_SHOW', label: 'No-show' },
    { key: 'RESCHEDULED', label: 'Rescheduled' },
  ];

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow)',
        overflow: 'hidden',
        background: 'var(--bg-card)',
      }}
    >
      {/* Table Toolbar Header */}
      <div
        className="card-header"
        style={{
          flexWrap: 'wrap',
          gap: 16,
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Status Filter Tabs */}
        <div className="tabs-bar">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`tab-btn${activeStatusFilter === t.key ? ' active' : ''}`}
              onClick={() => onStatusFilterChange(t.key)}
            >
              {t.label}
              <span className="tab-count">{count(t.key)}</span>
            </button>
          ))}
        </div>

        {/* Search & Commodity Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: 240 }}>
            <Search
              size={14}
              color="var(--text-tertiary)"
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search token, farmer, vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field-input"
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>

          <select
            value={cropFilter}
            onChange={(e) => setCropFilter(e.target.value)}
            className="field-select"
            aria-label="Filter by commodity"
          >
            <option value="ALL">All Commodities</option>
            <option value="Wheat">Wheat (गेहूँ)</option>
            <option value="Paddy">Paddy / Rice (धान)</option>
            <option value="Mustard">Mustard (सरसों)</option>
          </select>
        </div>
      </div>

      {/* Production Live Queue Table (9 Columns) */}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {/* 1. Token */}
              <th
                onClick={() => toggleSort('token')}
                style={{ cursor: 'pointer', width: 110 }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>Token</span>
                  <ArrowUpDown size={12} color="var(--text-tertiary)" />
                </div>
              </th>

              {/* 2. Farmer */}
              <th
                onClick={() => toggleSort('farmerName')}
                style={{ cursor: 'pointer', minWidth: 160 }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>Farmer &amp; Village</span>
                  <ArrowUpDown size={12} color="var(--text-tertiary)" />
                </div>
              </th>

              {/* 3. Commodity */}
              <th>Commodity</th>

              {/* 4. Arrival Time / Slot */}
              <th
                onClick={() => toggleSort('slotTime')}
                style={{ cursor: 'pointer', minWidth: 130 }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>Arrival Slot</span>
                  <ArrowUpDown size={12} color="var(--text-tertiary)" />
                </div>
              </th>

              {/* 5. Current Status */}
              <th
                onClick={() => toggleSort('status')}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>Current Status</span>
                  <ArrowUpDown size={12} color="var(--text-tertiary)" />
                </div>
              </th>

              {/* 6. Waiting Time */}
              <th
                onClick={() => toggleSort('waitingTime')}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>Wait Time</span>
                  <ArrowUpDown size={12} color="var(--text-tertiary)" />
                </div>
              </th>

              {/* 7. Actions */}
              <th style={{ textAlign: 'right', width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div
                    className="empty-state"
                    style={{
                      padding: '50px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                      No Vehicles in Selected Filter
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 440 }}>
                      0 vehicles match the search or status query. Intake entries update live via 5-second polling.
                    </div>
                    {onNavigateToFarmers && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={onNavigateToFarmers}
                        style={{ marginTop: 6 }}
                      >
                        Open Farmers Directory →
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              <AnimatePresence initial={false}>
                {paginated.map((f, idx) => {
                  const isNewlyCalled = recentlyCalled.has(f.id);
                  const isCurrentServing = f.status === 'SERVING';
                  const isUpdated = recentlyUpdated.has(f.id);

                  // Waiting time calculation
                  const waitMinutes = Math.max(5, (f.rawTokenNumber || (idx + 1)) * 3);

                  return (
                    <motion.tr
                      key={f.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className={[
                        isCurrentServing ? 'row-serving' : '',
                        isNewlyCalled ? 'row-just-called' : '',
                        isUpdated ? 'row-updated' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {/* 1. Token */}
                      <td style={{ padding: '16px 20px' }}>
                        <div
                          className="font-mono"
                          style={{
                            fontWeight: 700,
                            fontSize: 14,
                            color: isCurrentServing ? 'var(--brand-navy)' : 'var(--text-primary)',
                            cursor: 'pointer',
                          }}
                          onClick={() => onSelectFarmer(f)}
                        >
                          {f.token}
                        </div>
                        {f.originalToken && (
                          <div
                            className="font-mono text-xs text-tertiary"
                            style={{ textDecoration: 'line-through', marginTop: 2 }}
                          >
                            {f.originalToken}
                          </div>
                        )}
                      </td>

                      {/* 2. Farmer */}
                      <td style={{ padding: '16px 20px' }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 13,
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                          }}
                          onClick={() => onSelectFarmer(f)}
                        >
                          {f.farmerName}
                        </div>
                        <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                          {f.village} · <span className="font-mono">{f.phone}</span>
                        </div>
                      </td>

                      {/* 3. Commodity */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                          {f.crop}
                        </div>
                        <div className="text-xs text-muted font-mono" style={{ marginTop: 2 }}>
                          {f.quantityQuintals} Quintals
                        </div>
                      </td>

                      {/* 4. Arrival Time / Slot */}
                      <td style={{ padding: '16px 20px' }}>
                        <div
                          className="font-mono"
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color:
                              f.status === 'RESCHEDULED'
                                ? 'var(--color-warning-text)'
                                : 'var(--text-primary)',
                          }}
                        >
                          {f.slotTime}
                        </div>
                      </td>

                      {/* 5. Current Status */}
                      <td style={{ padding: '16px 20px' }}>
                        <StatusBadge status={f.status} />
                      </td>

                      {/* 6. Waiting Time */}
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          className="font-mono"
                          style={{
                            fontSize: 12,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: waitMinutes > 20 ? 'var(--brand-saffron, #ea580c)' : 'var(--text-secondary)',
                          }}
                        >
                          <Clock size={12} />
                          <span>~{waitMinutes}m</span>
                        </span>
                      </td>

                      {/* 9. Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                          }}
                        >
                          {/* Digital Gate Pass Trigger */}
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => onViewGatePass?.(f)}
                            title="View APMC Digital Gate Pass & QR Code"
                            style={{ padding: '4px 8px' }}
                          >
                            <QrCode size={14} color="var(--brand-purple, #8b5cf6)" />
                          </button>


                          {f.status === 'WAITING' && (
                            <>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => onCallToBay(f.id, 1)}
                                title="Assign to Weighbridge Bay 1"
                                style={{ padding: '4px 8px', fontSize: 11 }}
                              >
                                Bay 1
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => onCallToBay(f.id, 2)}
                                title="Assign to Weighbridge Bay 2"
                                style={{ padding: '4px 8px', fontSize: 11 }}
                              >
                                Bay 2
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => onMarkNoShow(f.id)}
                                title="Mark as No-show (Release Slot)"
                                style={{ padding: '4px 6px' }}
                              >
                                <XCircle size={14} color="var(--color-danger, #ef4444)" />
                              </button>
                            </>
                          )}

                          {f.status === 'SERVING' && (
                            <button
                              className="btn btn-success-outline btn-sm"
                              onClick={() => onMarkServed(f.id)}
                              style={{ padding: '4px 8px', fontSize: 11 }}
                            >
                              <CheckCircle2 size={13} />
                              Served
                            </button>
                          )}

                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => onSelectFarmer(f)}
                            title="View Gate Pass &amp; Details"
                            style={{ padding: '4px 6px' }}
                          >
                            <ChevronRight size={15} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Pagination Controls */}
      <div
        style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: 12,
          color: 'var(--text-secondary)',
        }}
      >
        <span className="font-mono">
          Showing <strong style={{ color: 'var(--text-primary)' }}>{paginated.length}</strong> of {filtered.length} entries (Page {currentPage} of {totalPages})
        </span>

        {/* Pagination Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <ChevronLeft size={13} />
            <span>Prev</span>
          </button>

          <span className="font-mono" style={{ padding: '0 6px', fontWeight: 600 }}>
            {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <span>Next</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
