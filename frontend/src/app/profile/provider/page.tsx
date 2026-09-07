'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api-client';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProviderBusinessCard } from '../components/ProviderBusinessCard';
import { ProviderListingsGrid } from '../components/ProviderListingsGrid';
import { ProviderAnalyticsPanel } from '../components/ProviderAnalyticsPanel';

interface ProviderData {
  id: string;
  businessName: string;
  businessType: string;
  phone?: string | null;
  city: string;
  verificationStatus: 'VERIFIED' | 'PENDING_REVIEW' | 'UNVERIFIED' | 'REJECTED';
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export default function ProviderProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<ProviderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviderProfile = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const role = localStorage.getItem('userRole');

      if (!token) {
        router.push('/auth/login?redirect=/profile/provider');
        return;
      }

      // Role check: If traveler, redirect immediately to traveler profile
      if (role === 'TRAVELER') {
        router.replace('/profile/traveler');
        return;
      }

      const res = await fetch(`${API_BASE}/providers/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userRole');
          localStorage.removeItem('userName');
          localStorage.removeItem('userEmail');
          window.dispatchEvent(new Event('auth-change'));
          router.push('/auth/login?redirect=/profile/provider');
          return;
        }
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || `Failed to load host profile (${res.status})`);
      }

      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading host profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviderProfile();
  }, []);

  const handleUpdateName = async (newName: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const res = await fetch(`${API_BASE}/providers/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newName }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to update name');
    }

    if (data) {
      setData({
        ...data,
        user: {
          ...data.user,
          name: newName,
        },
      });
    }
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        parsed.name = newName;
        localStorage.setItem('user', JSON.stringify(parsed));
      } catch (e) {}
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent"></div>
          <p className="text-xs font-medium text-neutral-500">Loading host profile & workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    const isAuthErr = error?.toLowerCase().includes('unauthorized') || error?.includes('401');
    return (
      <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 border border-neutral-200 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-50 text-red-500 flex items-center justify-center font-bold text-lg">
            !
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">
              {isAuthErr ? 'Session Expired' : 'Unable to Load Host Profile'}
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              {isAuthErr
                ? 'Your host session has expired or is invalid. Please sign in again to access your host workspace.'
                : error || 'An unexpected error occurred while loading your host profile.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            {isAuthErr ? (
              <button
                onClick={() => {
                  localStorage.removeItem('accessToken');
                  localStorage.removeItem('refreshToken');
                  router.push('/auth/login?redirect=/profile/provider');
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold shadow-sm transition-all"
              >
                Sign In Again
              </button>
            ) : (
              <button
                onClick={() => {
                  setLoading(true);
                  fetchProviderProfile();
                }}
                className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-sm transition-all"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-24">
      {/* Ambient background accent */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-amber-100/40 via-neutral-50/20 to-transparent -z-10 pointer-events-none" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 space-y-8">
        {/* Header */}
        <ProfileHeader
          initialName={data.user?.name || data.businessName}
          email={data.user?.email || ''}
          role="HOST / PROVIDER"
          onUpdateName={handleUpdateName}
        />

        {/* Business Credentials Card */}
        <ProviderBusinessCard
          provider={data}
          onUpdate={fetchProviderProfile}
        />

        {/* Performance & Analytics */}
        <ProviderAnalyticsPanel />

        {/* Hosted Listings Grid */}
        <ProviderListingsGrid />
      </main>
    </div>
  );
}
