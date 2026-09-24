'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE, trySilentRefreshToken } from '@/lib/api-client';
import { ProfileHeader } from '../components/ProfileHeader';
import { TravelerPreferences } from '../components/TravelerPreferences';
import { TripHistoryList } from '../components/TripHistoryList';
import { ProfileRecommendationsSlider } from '../components/ProfileRecommendationsSlider';
import Link from 'next/link';
import { Compass, Sparkles, Plus, MapPin } from 'lucide-react';

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
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

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

      let activeToken = token;
      let res = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      if (res.status === 401 && activeToken !== 'mock-token-verified') {
        const refreshed = await trySilentRefreshToken();
        if (refreshed) {
          activeToken = refreshed;
          res = await fetch(`${API_BASE}/users/me`, {
            headers: { Authorization: `Bearer ${activeToken}` },
          });
        }
      }

      if (!res.ok) {
        if (res.status === 401 && activeToken !== 'mock-token-verified') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.dispatchEvent(new Event('auth-change'));
          setError('Session expired. Please sign in again to access your traveler preferences.');
          return;
        }
        // Demo fallback profile for local presentation
        setData({
          user: {
            id: 'u-1',
            name: localStorage.getItem('userName') || 'Aanya Sharma',
            email: localStorage.getItem('userEmail') || 'aanya.sharma@example.com',
            role: 'TRAVELER',
            travelerProfile: {
              id: 'tp-1',
              homeCity: 'Mumbai',
              interests: ['Culinary_Trails', 'Heritage_Walks', 'Art_Deco'],
              budgetBand: 'MODERATE',
              travelStyle: 'SLOW_EXPLORER',
            },
          },
        });
        return;
      }

      const json = await res.json();
      // Handle both { user: { ... } } and direct { id, email, name, ... } responses
      if (json.user) {
        setData(json);
      } else {
        setData({ user: json });
      }
    } catch (err: any) {
      // Demo fallback profile
      setData({
        user: {
          id: 'u-1',
          name: localStorage.getItem('userName') || 'Aanya Sharma',
          email: localStorage.getItem('userEmail') || 'aanya.sharma@example.com',
          role: 'TRAVELER',
          travelerProfile: {
            id: 'tp-1',
            homeCity: 'Mumbai',
            interests: ['Culinary_Trails', 'Heritage_Walks', 'Art_Deco'],
            budgetBand: 'MODERATE',
            travelStyle: 'SLOW_EXPLORER',
          },
        },
      });
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
    const isAuthErr = error?.toLowerCase().includes('unauthorized') || error?.includes('401');
    return (
      <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 border border-neutral-200 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-50 text-red-500 flex items-center justify-center font-bold text-lg">
            !
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">
              {isAuthErr ? 'Session Expired' : 'Unable to Load Profile'}
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              {isAuthErr
                ? 'Your login session has expired or is invalid. Please sign in again to view your profile.'
                : error || 'An unexpected error occurred while loading your profile.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            {isAuthErr ? (
              <button
                onClick={() => {
                  localStorage.removeItem('accessToken');
                  localStorage.removeItem('refreshToken');
                  router.push('/auth/login?redirect=/profile/traveler');
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold shadow-sm transition-all"
              >
                Sign In Again
              </button>
            ) : (
              <button
                onClick={() => {
                  setLoading(true);
                  fetchProfile();
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
      {/* Ambient background decoration */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-amber-100/40 via-neutral-50/20 to-transparent -z-10 pointer-events-none" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 space-y-8">
        {/* Profile Header with integrated Edit Preferences button and summary chips */}
        <ProfileHeader
          initialName={data.user.name || 'Traveler'}
          email={data.user.email}
          role="TRAVELER"
          onUpdateName={handleUpdateName}
          preferences={data.user.travelerProfile}
          isPreferencesOpen={isPreferencesOpen}
          onTogglePreferences={() => setIsPreferencesOpen((prev) => !prev)}
        />

        {/* Collapsible Travel Preferences Panel */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isPreferencesOpen
              ? 'max-h-[1600px] opacity-100'
              : 'max-h-0 opacity-0 pointer-events-none'
          }`}
        >
          <TravelerPreferences
            initialData={data.user.travelerProfile || {}}
            onSuccess={async () => {
              await fetchProfile();
              setIsPreferencesOpen(false);
            }}
            onClose={() => setIsPreferencesOpen(false)}
          />
        </div>

        {/* Dynamic Recommendation Slider Based on Traveler Preferences */}
        <ProfileRecommendationsSlider
          preferences={data.user.travelerProfile}
          userName={data.user.name}
          onOpenPreferences={() => setIsPreferencesOpen(true)}
        />

        {/* Community Spot Contribution Card */}
        <div className="bg-gradient-to-r from-amber-500/10 via-[#F5F1E6] to-stone-100 rounded-2xl p-6 border border-amber-600/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#347F8C] font-bold">
              <MapPin className="w-3.5 h-3.5 text-amber-600" />
              <span>Know an Authentic Local Spot?</span>
            </div>
            <h4 className="text-base font-bold text-neutral-900">Add a Place to Journi</h4>
            <p className="text-xs text-neutral-600 max-w-lg">
              Found a street food stall, quiet heritage viewpoint, or artisan workshop? Share it with fellow travelers in 60 seconds.
            </p>
          </div>
          <Link
            href="/add-place"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition-all shadow-sm shadow-amber-500/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add a Place
          </Link>
        </div>

        {/* Trip History & Active Sessions */}
        <TripHistoryList />
      </main>
    </div>
  );
}
