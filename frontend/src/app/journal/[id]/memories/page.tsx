'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  Lock,
  UserCheck,
  BookOpen,
  Route,
  Loader2,
} from 'lucide-react';
import { API_BASE, trySilentRefreshToken } from '@/lib/api-client';
import { getEntry } from '@/lib/journal-store';
import { fetchTripSession, SessionData } from '@/lib/trip-session-store';
import { TripMemoryUploader } from '@/components/TripMemoryUploader';
import { TripMemoryGallery, TripMemoryPhotoItem } from '@/components/TripMemoryGallery';

export default function TripMemoriesPage() {
  const routeParams = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedExpId = searchParams?.get('experienceId') || undefined;

  const rawId = (routeParams?.id as string) || '';
  const sessionId = rawId.startsWith('itinerary_') ? rawId.replace('itinerary_', '') : rawId;

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [memory, setMemory] = useState<any | null>(null);
  const [photos, setPhotos] = useState<TripMemoryPhotoItem[]>([]);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [stopsList, setStopsList] = useState<{ id: string; title: string }[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      setIsAuthenticated(!!token);

      // 1. Resolve session & stops from local stores
      let foundStops: { id: string; title: string }[] = [];
      let foundCity = 'Local';
      let foundDate = new Date().toISOString().slice(0, 10);
      let foundTime = '';

      // Check journal entry first
      const journalEntry = getEntry(`itinerary_${sessionId}`) || getEntry(rawId);
      if (journalEntry?.itineraryData) {
        foundCity = journalEntry.city || 'Local';
        foundDate = journalEntry.itineraryData.tripDate || journalEntry.visitedAt || foundDate;
        foundTime = journalEntry.itineraryData.timePeriod || '';
        foundStops = (journalEntry.itineraryData.stops || []).map((s) => ({
          id: s.experienceId,
          title: s.title,
        }));
      }

      // Check trip session store
      try {
        const session = await fetchTripSession(sessionId);
        if (session) {
          setSessionData(session);
          if (session.city) foundCity = session.city;
          if (session.tripDate) foundDate = session.tripDate;
          if (session.startTimeOfDay && session.endTimeOfDay) {
            foundTime = `${session.startTimeOfDay} – ${session.endTimeOfDay}`;
          }
          if (session.selectedExperiences && session.selectedExperiences.length > 0) {
            foundStops = session.selectedExperiences.map((exp) => ({
              id: exp.id,
              title: exp.title,
            }));
          }
        }
      } catch {
        // offline or local
      }

      setStopsList(foundStops);

      const isUuid = (str: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

      // 2. If authenticated, fetch or initialize backend TripMemory
      if (token) {
        try {
          let mem = null;

          // Try finding existing memory by sessionId if UUID
          if (isUuid(sessionId)) {
            const res = await fetch(`${API_BASE}/trip-memories/session/${sessionId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              mem = await res.json();
            }
          }

          // If no memory by session, check by memory ID directly if UUID
          if (!mem && isUuid(rawId)) {
            const memRes = await fetch(`${API_BASE}/trip-memories/${rawId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (memRes.ok) {
              mem = await memRes.json();
            }
          }

          // If still not created on backend, create it now!
          if (!mem) {
            const createRes = await fetch(`${API_BASE}/trip-memories`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                tripSessionId: isUuid(sessionId) ? sessionId : undefined,
                title: `${foundCity} Journey Memories`,
                visitedAt: foundDate,
              }),
            });

            if (createRes.ok) {
              mem = await createRes.json();
            } else {
              // Fallback retry without tripSessionId if that caused failure
              const fallbackRes = await fetch(`${API_BASE}/trip-memories`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  title: `${foundCity} Journey Memories`,
                  visitedAt: foundDate,
                }),
              });
              if (fallbackRes.ok) {
                mem = await fallbackRes.json();
              }
            }
          }

          if (mem) {
            setMemory(mem);
            setPhotos(mem.photos || []);
          }
        } catch (err: any) {
          console.warn('Trip memories load error:', err);
        }
      }

      setIsLoading(false);
    }

    init();
  }, [sessionId, rawId]);

  const ensureMemory = async (): Promise<string | null> => {
    if (memory?.id) return memory.id;
    let token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      token = await trySilentRefreshToken();
    }
    if (!token) {
      throw new Error('Please sign in or create an account to save memories.');
    }

    const payload = {
      title: `${sessionData?.city || 'Local'} Journey Memories`,
      visitedAt: new Date().toISOString(),
    };

    let res = await fetch(`${API_BASE}/trip-memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      const refreshedToken = await trySilentRefreshToken();
      if (refreshedToken) {
        res = await fetch(`${API_BASE}/trip-memories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${refreshedToken}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        throw new Error('Your session has expired. Please sign in again to save photos.');
      }
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to establish trip memory record on backend.');
    }

    const newMem = await res.json();
    setMemory(newMem);
    return newMem.id;
  };

  const handlePhotoUploaded = (newPhoto: any) => {
    setPhotos((prev) => [newPhoto, ...prev]);
  };

  const handlePhotoDeleted = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F1E6] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 border-2 border-[#8B7355] text-[#8B7355] animate-spin mx-auto mb-4" />
          <p className="text-xs font-mono uppercase tracking-widest text-[#2C2C2C]/70">
            Loading Trip Memories Atelier...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E6] text-[#2C2C2C] pb-24 pt-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-[#D4CFC0]">
          <div className="flex items-center gap-3">
            <Link
              href="/journal"
              className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#2C2C2C]/70 hover:text-[#347F8C] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Journal</span>
            </Link>
            <span className="text-[#D4CFC0]">&bull;</span>
            <Link
              href={`/trip/${sessionId}`}
              className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#347F8C] hover:underline"
            >
              <Route className="w-3.5 h-3.5" />
              <span>View Route Map</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#8B7355] bg-[#8B7355]/10 px-3 py-1 rounded-full font-semibold">
              <Camera className="w-3 h-3" />
              <span>{photos.length} Captured {photos.length === 1 ? 'Memory' : 'Memories'}</span>
            </span>
          </div>
        </div>

        {/* Page Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 text-[#8B7355] font-mono text-xs tracking-[0.25em] uppercase mb-3 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Bespoke Travel Album
          </div>
          <h1 className="font-cormorant text-4xl sm:text-5xl lg:text-6xl font-bold text-[#2C2C2C] leading-tight">
            Trip Memories & Photo Archive
          </h1>
          <p className="text-sm sm:text-base text-[#2C2C2C]/70 mt-3 max-w-2xl font-light leading-relaxed">
            Preserve high-resolution photos, moments, and artisan encounters from your finalized itinerary. Stored securely and tied to your traveler profile.
          </p>

          {/* Quick metadata badges */}
          <div className="flex flex-wrap items-center gap-3 mt-4 text-xs font-mono text-[#2C2C2C]/80">
            {sessionData?.city && (
              <span className="inline-flex items-center gap-1 bg-white border border-[#D4CFC0] px-3 py-1.5 rounded-xl">
                <MapPin className="w-3.5 h-3.5 text-[#347F8C]" />
                {sessionData.city}
              </span>
            )}
            {sessionData?.tripDate && (
              <span className="inline-flex items-center gap-1 bg-white border border-[#D4CFC0] px-3 py-1.5 rounded-xl">
                <Calendar className="w-3.5 h-3.5 text-[#8B7355]" />
                {sessionData.tripDate}
              </span>
            )}
            {sessionData?.startTimeOfDay && sessionData?.endTimeOfDay && (
              <span className="inline-flex items-center gap-1 bg-white border border-[#D4CFC0] px-3 py-1.5 rounded-xl">
                <Clock className="w-3.5 h-3.5 text-[#C4A265]" />
                {sessionData.startTimeOfDay} – {sessionData.endTimeOfDay}
              </span>
            )}
            {stopsList.length > 0 && (
              <span className="inline-flex items-center gap-1 bg-white border border-[#D4CFC0] px-3 py-1.5 rounded-xl">
                <Route className="w-3.5 h-3.5 text-emerald-600" />
                {stopsList.length} Stops
              </span>
            )}
          </div>
        </div>

        {/* Auth Gate Banner (Registered Users Only) */}
        {!isAuthenticated && (
          <div className="bg-[#FAF7EE] border-2 border-[#8B7355]/40 rounded-3xl p-6 sm:p-8 mb-10 text-center max-w-2xl mx-auto shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-[#8B7355]/15 text-[#8B7355] flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-manifold text-lg sm:text-xl font-bold uppercase tracking-wide text-[#2C2C2C]">
              Registered Traveler Access Required
            </h3>
            <p className="text-xs sm:text-sm text-[#2C2C2C]/70 mt-2 max-w-md mx-auto leading-relaxed">
              Trip memories and high-definition photo uploads are securely linked to registered user accounts in our database.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/auth/login?redirect=/journal/${sessionId}/memories`}
                className="cursor-pointer inline-flex items-center gap-2 bg-[#347F8C] hover:bg-[#2A6772] text-white text-xs font-mono font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl transition shadow-sm active:scale-95"
              >
                <UserCheck className="w-4 h-4" />
                <span>Sign In to Save Memories</span>
              </Link>
              <Link
                href={`/auth/register?redirect=/journal/${sessionId}/memories`}
                className="cursor-pointer inline-flex items-center gap-2 bg-white hover:bg-[#F5F1E6] text-[#2C2C2C] border border-[#D4CFC0] text-xs font-mono uppercase tracking-wider px-5 py-2.5 rounded-xl transition"
              >
                <span>Create Free Account</span>
              </Link>
            </div>
          </div>
        )}

        {/* Upload Section (Active when authenticated) */}
        {isAuthenticated && memory && (
          <div className="mb-12">
            <TripMemoryUploader
              memoryId={memory.id}
              stops={stopsList}
              preselectedExperienceId={preselectedExpId}
              onPhotoUploaded={handlePhotoUploaded}
            />
          </div>
        )}

        {/* Photo Gallery Section */}
        <div>
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-[#D4CFC0]">
            <h2 className="font-manifold text-xl font-bold uppercase tracking-wide text-[#2C2C2C]">
              Photo Gallery & Captured Moments
            </h2>
            <span className="text-xs font-mono text-[#2C2C2C]/60">
              {photos.length} {photos.length === 1 ? 'image' : 'images'}
            </span>
          </div>

          <TripMemoryGallery
            memoryId={memory?.id || ''}
            photos={photos}
            stops={stopsList}
            onPhotoUploaded={handlePhotoUploaded}
            onPhotoDeleted={handlePhotoDeleted}
            ensureMemoryId={ensureMemory}
          />
        </div>
      </div>
    </div>
  );
}
