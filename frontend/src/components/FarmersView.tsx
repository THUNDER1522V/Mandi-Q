import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
  Phone,
  MapPin,
  Globe,
  Calendar,
  QrCode,
} from 'lucide-react';
import type { Farmer } from '../types/dashboard';
import { getFarmers, deleteFarmer } from '../api/farmer';
import { FarmerModal } from './FarmerModal';

interface FarmersViewProps {
  onFarmerCountChange?: (count: number) => void;
  showToast?: (message: string) => void;
  onViewGatePass?: (data: {
    farmerId: string;
    farmerName: string;
    phone?: string;
    village?: string;
    crop?: string;
    gateStatus?: string;
  }) => void;
}

export const FarmersView: React.FC<FarmersViewProps> = ({
  onFarmerCountChange,
  showToast,
  onViewGatePass,
}) => {

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [farmerToEdit, setFarmerToEdit] = useState<Farmer | null>(null);

  // Delete confirmation state
  const [farmerToDelete, setFarmerToDelete] = useState<Farmer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFarmersList = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getFarmers({ skip: 0, limit: 200 });
      setFarmers(data);
      if (onFarmerCountChange) {
        onFarmerCountChange(data.length);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load farmers registry';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [onFarmerCountChange]);

  useEffect(() => {
    void fetchFarmersList();
  }, [fetchFarmersList]);

  // Filtered farmers
  const filteredFarmers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return farmers;
    return farmers.filter((f) =>
      f.farmer_name.toLowerCase().includes(q) ||
      f.phone_number.toLowerCase().includes(q) ||
      f.village.toLowerCase().includes(q) ||
      f.district.toLowerCase().includes(q) ||
      f.state.toLowerCase().includes(q)
    );
  }, [farmers, searchQuery]);

  const handleOpenCreate = () => {
    setFarmerToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (farmer: Farmer) => {
    setFarmerToEdit(farmer);
    setIsModalOpen(true);
  };

  const handleModalSuccess = (farmer: Farmer, isEdit: boolean) => {
    if (isEdit) {
      setFarmers((prev) => prev.map((f) => (f.id === farmer.id ? farmer : f)));
      if (showToast) showToast(`✓ Updated farmer: ${farmer.farmer_name}`);
    } else {
      setFarmers((prev) => [farmer, ...prev]);
      if (onFarmerCountChange) onFarmerCountChange(farmers.length + 1);
      if (showToast) showToast(`✓ Registered farmer: ${farmer.farmer_name}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!farmerToDelete) return;
    try {
      setIsDeleting(true);
      await deleteFarmer(farmerToDelete.id);
      const updated = farmers.filter((f) => f.id !== farmerToDelete.id);
      setFarmers(updated);
      if (onFarmerCountChange) onFarmerCountChange(updated.length);
      if (showToast) showToast(`✓ Deleted farmer: ${farmerToDelete.farmer_name}`);
      setFarmerToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete farmer';
      if (showToast) showToast(`✕ ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  console.log('[FarmersView Render] farmers count:', farmers.length, 'filtered count:', filteredFarmers.length, 'isLoading:', isLoading, 'error:', error);

  return (
    <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
      {/* Action Toolbar Header */}
      <div
        className="card-header"
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(23, 70, 162, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-navy)',
            }}
          >
            <Users size={17} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="card-title" style={{ fontSize: 15, fontWeight: 700 }}>
                Farmers Registry (पंजीकृत किसान)
              </span>
              <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                {farmers.length} registered
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: 220 }}>
            <Search
              size={14}
              color="var(--text-tertiary)"
              style={{ position: 'absolute', left: 10, top: 9 }}
            />
            <input
              type="text"
              placeholder="Search by name, phone, village..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                fontSize: 12,
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void fetchFarmersList()}
            disabled={isLoading}
            title="Refresh farmers from backend"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {/* Create Farmer Button */}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleOpenCreate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              background: 'var(--brand-navy)',
              color: '#FFFFFF',
            }}
          >
            <UserPlus size={14} />
            <span>+ Register Farmer</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            margin: '16px 20px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={16} color="var(--color-danger)" />
            <span style={{ fontSize: 13, color: 'var(--color-danger)' }}>{error}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void fetchFarmersList()}
            style={{ fontSize: 11 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Table Body */}
      <div className="card-body" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--brand-navy)' }} />
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading farmers from PostgreSQL...</div>
          </div>
        ) : filteredFarmers.length === 0 ? (
          <div className="empty-state" style={{ padding: '48px 20px', textAlign: 'center' }}>
            <Users size={32} color="var(--text-tertiary)" style={{ margin: '0 auto 10px auto' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {searchQuery ? 'No farmers match your search query.' : 'No farmers found in registry.'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {searchQuery ? 'Try searching with a different name or phone number.' : 'Get started by registering a new farmer.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleOpenCreate}
                style={{ marginTop: 14 }}
              >
                + Register First Farmer
              </button>
            )}
          </div>
        ) : (
          <div className="data-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Farmer Name</th>
                  <th>Phone Number</th>
                  <th>Location (Village / District)</th>
                  <th>State</th>
                  <th>Language</th>
                  <th>Registered</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFarmers.map((farmer) => {
                  let formattedDate = 'Recent';
                  if (farmer.created_at) {
                    try {
                      formattedDate = new Date(farmer.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      });
                    } catch {
                      formattedDate = farmer.created_at.slice(0, 10);
                    }
                  }

                  return (
                    <tr key={farmer.id}>
                      {/* Name */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-light)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 700,
                              color: 'var(--brand-navy)',
                            }}
                          >
                            {farmer.farmer_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                              {farmer.farmer_name}
                            </span>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }} className="font-mono">
                              ID: {farmer.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Phone size={12} color="var(--text-tertiary)" />
                          <span className="font-mono" style={{ fontSize: 12.5, fontWeight: 500 }}>
                            {farmer.phone_number}
                          </span>
                        </div>
                      </td>

                      {/* Village & District */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin size={12} color="var(--brand-saffron)" />
                          <span style={{ fontSize: 12.5 }}>
                            {farmer.village}, <span style={{ color: 'var(--text-secondary)' }}>{farmer.district}</span>
                          </span>
                        </div>
                      </td>

                      {/* State */}
                      <td>
                        <span style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>
                          {farmer.state}
                        </span>
                      </td>

                      {/* Language */}
                      <td>
                        <span
                          className="badge badge-neutral"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                          }}
                        >
                          <Globe size={10} />
                          {farmer.preferred_language || 'Hindi'}
                        </span>
                      </td>

                      {/* Registered Date */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)' }}>
                          <Calendar size={12} color="var(--text-tertiary)" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* Actions (Gate Pass / Edit / Delete) */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() =>
                              onViewGatePass?.({
                                farmerId: farmer.id,
                                farmerName: farmer.farmer_name,
                                phone: farmer.phone_number,
                                village: farmer.village,
                                crop: 'Wheat (गेहूँ)',
                                gateStatus: 'REGISTERED',
                              })
                            }
                            title="View APMC Digital Gate Pass & QR Code"
                            style={{
                              padding: '4px 8px',
                              fontSize: 11.5,
                              color: 'var(--brand-navy, #2563eb)',
                              borderColor: 'rgba(37, 99, 235, 0.3)',
                              background: 'rgba(37, 99, 235, 0.06)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <QrCode size={12} />
                            <span>Gate Pass</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEdit(farmer)}
                            title="Edit Farmer (PUT /api/v1/farmers/{id})"
                            style={{ padding: '4px 8px', fontSize: 11.5 }}
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setFarmerToDelete(farmer)}
                            title="Delete Farmer (DELETE /api/v1/farmers/{id})"
                            style={{
                              padding: '4px 8px',
                              fontSize: 11.5,
                              color: 'var(--color-danger)',
                              borderColor: 'var(--color-danger-border)',
                            }}
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Farmer Modal */}
      <FarmerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        farmerToEdit={farmerToEdit}
      />

      {/* Delete Confirmation Modal */}
      {farmerToDelete && (
        <div className="modal-backdrop" onClick={() => !isDeleting && setFarmerToDelete(null)}>
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 440, borderRadius: 'var(--radius-lg)' }}
          >
            <div className="modal-header" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trash2 size={18} color="var(--color-danger)" />
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-danger)' }}>
                  Confirm Deletion
                </span>
              </div>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                Are you sure you want to delete farmer <strong>{farmerToDelete.farmer_name}</strong>?
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                This will execute <code>DELETE /api/v1/farmers/{farmerToDelete.id}</code> in PostgreSQL. This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer" style={{ padding: '12px 20px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setFarmerToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => void handleConfirmDelete()}
                disabled={isDeleting}
                style={{
                  background: 'var(--color-danger)',
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Farmer</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
