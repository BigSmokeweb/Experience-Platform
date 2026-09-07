'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api-client';
import { ProfileHeader } from '../components/ProfileHeader';
import { TravelerPreferences } from '../components/TravelerPreferences';
import { TripHistoryList } from '../components/TripHistoryList';
import { Compass, Sparkles } from 'lucide-react';

interface TravelerData {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    travelerProfile?: {
      id: string;
      homeCity?: string | null;
      interests?: string[];
      budgetBand?: string | null;
      travelStyle?: string | null;
    } | null;
  };
}

export default function TravelerProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<TravelerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const role = localStorage.getItem('userRole');

      if (!token) {
        router.push('/auth/login?redirect=/profile/traveler');
        return;
      }

      // Role check: If provider, redirect immediately to provider dashboard
      if (role === 'HOST' || role === 'PROVIDER') {
        router.replace('/profile/provider');
        return;
      }

      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to load traveler profile');
      }

      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateName = async (newName: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Single canonical endpoint: PATCH /users/me/traveler-profile
    const res = await fetch(`${API_BASE}/users/me/traveler-profile`, {
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

    // Update local state and stored user info
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
          <p className="text-xs font-medium text-neutral-500">Loading your traveler profile...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 border border-neutral-200 max-w-md text-center space-y-4 shadow-sm">
          <p className="text-sm text-red-600">{error || 'Unable to load profile'}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchProfile();
            }}
            className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-24">
      {/* Ambient background decoration */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-amber-100/40 via-neutral-50/20 to-transparent -z-10 pointer-events-none" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 space-y-8">
        {/* Profile Header */}
        <ProfileHeader
          initialName={data.user.name || 'Traveler'}
          email={data.user.email}
          role="TRAVELER"
          onUpdateName={handleUpdateName}
        />

        {/* Travel Preferences */}
        <TravelerPreferences
          initialData={data.user.travelerProfile || {}}
          onSuccess={fetchProfile}
        />

        {/* Trip History & Active Sessions */}
        <TripHistoryList />
      </main>
    </div>
  );
}
