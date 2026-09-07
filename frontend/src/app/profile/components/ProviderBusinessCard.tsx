'use client';

import { useState } from 'react';
import { Building, Phone, MapPin, ShieldCheck, Clock, AlertTriangle, XCircle, Edit2, Check, X, Loader2 } from 'lucide-react';
import { API_BASE } from '@/lib/api-client';

// Strict Prisma VerificationStatus Enum matching
type VerificationStatus = 'VERIFIED' | 'PENDING_REVIEW' | 'UNVERIFIED' | 'REJECTED';

interface ProviderBusinessCardProps {
  provider: {
    id: string;
    businessName: string;
    businessType: string;
    phone?: string | null;
    city: string;
    verificationStatus: VerificationStatus;
  };
  onUpdate?: () => void;
}

export function ProviderBusinessCard({ provider, onUpdate }: ProviderBusinessCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [businessName, setBusinessName] = useState(provider.businessName);
  const [businessType, setBusinessType] = useState(provider.businessType);
  const [phone, setPhone] = useState(provider.phone || '');
  const [city, setCity] = useState(provider.city);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renderBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Verified Host
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending Review
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Action Required (Rejected)
          </span>
        );
      case 'UNVERIFIED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-300">
            <AlertTriangle className="w-3.5 h-3.5 text-neutral-500" />
            Unverified Host
          </span>
        );
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${API_BASE}/providers/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessName,
          businessType,
          phone: phone.trim() || undefined,
          city,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update business profile');
      }

      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.message || 'Error updating host details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-neutral-900">Host & Business Profile</h2>
            {renderBadge(provider.verificationStatus)}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Information displayed on your public experience listings and partner credentials.
          </p>
        </div>

        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 self-start sm:self-auto transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit Info
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 text-xs text-red-700 bg-red-50 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {isEditing ? (
        <div className="space-y-4 max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600">Business / Guide Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600">Business Type</label>
              <input
                type="text"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                placeholder="e.g. Tour Guide, Studio, Culinary Host"
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600">Operating City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600">Phone / Contact</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1..."
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save Changes
            </button>
            <button
              onClick={() => {
                setBusinessName(provider.businessName);
                setBusinessType(provider.businessType);
                setPhone(provider.phone || '');
                setCity(provider.city);
                setIsEditing(false);
              }}
              disabled={saving}
              className="px-3 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          <div className="space-y-1">
            <span className="text-xs text-neutral-500 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-neutral-400" />
              Entity & Type
            </span>
            <p className="text-sm font-semibold text-neutral-900">{businessName}</p>
            <p className="text-xs text-neutral-500">{businessType}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-neutral-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-neutral-400" />
              Headquarters / City
            </span>
            <p className="text-sm font-semibold text-neutral-900">{city}</p>
            <p className="text-xs text-neutral-500">Active regional operations</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-neutral-500 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-neutral-400" />
              Contact Channel
            </span>
            <p className="text-sm font-semibold text-neutral-900">{phone || 'None provided'}</p>
            <p className="text-xs text-neutral-500">Direct booking inquiries</p>
          </div>
        </div>
      )}
    </div>
  );
}
