import React, { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Globe, Loader2, AlertCircle } from 'lucide-react';
import type { Farmer, FarmerCreate, FarmerUpdate } from '../types/dashboard';
import { createFarmer, updateFarmer } from '../api/farmer';

interface FarmerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (farmer: Farmer, isEdit: boolean) => void;
  farmerToEdit?: Farmer | null;
}

export const FarmerModal: React.FC<FarmerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  farmerToEdit = null,
}) => {
  const isEdit = Boolean(farmerToEdit);

  const [formData, setFormData] = useState({
    farmer_name: '',
    phone_number: '',
    village: '',
    district: '',
    state: '',
    preferred_language: 'Hindi',
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (farmerToEdit) {
      setFormData({
        farmer_name: farmerToEdit.farmer_name || '',
        phone_number: farmerToEdit.phone_number || '',
        village: farmerToEdit.village || '',
        district: farmerToEdit.district || '',
        state: farmerToEdit.state || '',
        preferred_language: farmerToEdit.preferred_language || 'Hindi',
      });
    } else {
      setFormData({
        farmer_name: '',
        phone_number: '',
        village: '',
        district: 'Karnal',
        state: 'Haryana',
        preferred_language: 'Hindi',
      });
    }
    setError(null);
  }, [farmerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation matching FastAPI schemas
    const cleanName = formData.farmer_name.trim();
    const cleanPhone = formData.phone_number.trim().replace(/\s+/g, '');
    const cleanVillage = formData.village.trim();
    const cleanDistrict = formData.district.trim();
    const cleanState = formData.state.trim();

    if (!cleanName || cleanName.length < 2) {
      setError('Farmer name must be at least 2 characters long.');
      return;
    }

    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setError('Please enter a valid 10-15 digit phone number (e.g., +919876543210 or 9876543210).');
      return;
    }

    if (!cleanVillage) {
      setError('Village name cannot be blank.');
      return;
    }

    if (!cleanDistrict) {
      setError('District cannot be blank.');
      return;
    }

    if (!cleanState) {
      setError('State cannot be blank.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (isEdit && farmerToEdit) {
        const updatePayload: FarmerUpdate = {
          farmer_name: cleanName,
          phone_number: cleanPhone,
          village: cleanVillage,
          district: cleanDistrict,
          state: cleanState,
          preferred_language: formData.preferred_language,
        };
        const updated = await updateFarmer(farmerToEdit.id, updatePayload);
        onSuccess(updated, true);
      } else {
        const createPayload: FarmerCreate = {
          farmer_name: cleanName,
          phone_number: cleanPhone,
          village: cleanVillage,
          district: cleanDistrict,
          state: cleanState,
          preferred_language: formData.preferred_language,
        };
        const created = await createFarmer(createPayload);
        onSuccess(created, false);
      }

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed. Please check your inputs.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => !isSubmitting && onClose()}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 520,
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'rgba(23, 70, 162, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-navy)',
              }}
            >
              <User size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                {isEdit ? 'Edit Farmer Details' : 'Register New Farmer'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {isEdit ? 'Update PostgreSQL database record' : 'Add farmer to Mandi registry (POST /api/v1/farmers)'}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: 'var(--color-danger-bg)',
                  border: '1px solid var(--color-danger-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-danger)',
                  fontSize: 12.5,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Farmer Name */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Full Name (किसान का नाम) *
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={15}
                  color="var(--text-tertiary)"
                  style={{ position: 'absolute', left: 12, top: 11 }}
                />
                <input
                  type="text"
                  name="farmer_name"
                  value={formData.farmer_name}
                  onChange={handleChange}
                  placeholder="e.g. Baldev Singh"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Phone Number (मोबाइल नंबर) *
              </label>
              <div style={{ position: 'relative' }}>
                <Phone
                  size={15}
                  color="var(--text-tertiary)"
                  style={{ position: 'absolute', left: 12, top: 11 }}
                />
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="e.g. +919812044991"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Village and District Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Village (गाँव) *
                </label>
                <div style={{ position: 'relative' }}>
                  <MapPin
                    size={15}
                    color="var(--text-tertiary)"
                    style={{ position: 'absolute', left: 12, top: 11 }}
                  />
                  <input
                    type="text"
                    name="village"
                    value={formData.village}
                    onChange={handleChange}
                    placeholder="e.g. Taraori"
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 36px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  District (ज़िला) *
                </label>
                <input
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  placeholder="e.g. Karnal"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* State and Preferred Language */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  State (राज्य) *
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g. Haryana"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Language (भाषा)
                </label>
                <div style={{ position: 'relative' }}>
                  <Globe
                    size={15}
                    color="var(--text-tertiary)"
                    style={{ position: 'absolute', left: 12, top: 11 }}
                  />
                  <select
                    name="preferred_language"
                    value={formData.preferred_language}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 36px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  >
                    <option value="Hindi">Hindi (हिंदी)</option>
                    <option value="Punjabi">Punjabi (ਪੰਜਾਬੀ)</option>
                    <option value="Haryanvi">Haryanvi (हरियाणवी)</option>
                    <option value="English">English</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div
            className="modal-footer"
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                minWidth: 120,
                justifyContent: 'center',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{isEdit ? 'Saving...' : 'Registering...'}</span>
                </>
              ) : (
                <span>{isEdit ? 'Update Farmer' : 'Register Farmer'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
