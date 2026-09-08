'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Compass, ArrowRight, CheckCircle2, Radio } from 'lucide-react';
import { API_BASE } from '@/lib/api-client';

interface TripItem {
  id: string;
  order: number;
  timeSlot?: string | null;
  experience: {
    id: string;
    title: string;
    city: string;
    previewMediaUrl?: string | null;
  };
}

interface TripSessionSummary {
  id: string;
  city: string;
  startDate: string;
  endDate: string;
  budgetTier?: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  createdAt: string;
  items: TripItem[];
}

function normalizeSession(s: any): TripSessionSummary {
  const titles = Array.isArray(s?.experienceTitles) ? s.experienceTitles : [];
  const rawItems = Array.isArray(s?.items) ? s.items : [];

  const items: TripItem[] =
    rawItems.length > 0
      ? rawItems.map((it: any, idx: number) => ({
          id: it?.id || `${s?.id || 'item'}-${idx}`,
          order: it?.order ?? idx + 1,
          timeSlot: it?.timeSlot || null,
          experience: {
            id: it?.experience?.id || `${s?.id || 'exp'}-${idx}`,
            title: it?.experience?.title || 'Curated Experience',
            city: it?.experience?.city || s?.city || 'Local Journey',
            previewMediaUrl: it?.experience?.previewMediaUrl || null,
          },
        }))
      : titles.map((title: string, idx: number) => ({
          id: `${s?.id || 'item'}-${idx}`,
          order: idx + 1,
          timeSlot: null,
          experience: {
            id: `${s?.id || 'exp'}-${idx}`,
            title: typeof title === 'string' ? title : 'Curated Experience',
            city: s?.city || 'Local Journey',
            previewMediaUrl: idx === 0 ? s?.firstExperienceImage || null : null,
          },
        }));

  return {
    id: s?.id || `session-${Math.random()}`,
    city: s?.city || 'Local Journey',
    startDate: s?.startDate || s?.createdAt || new Date().toISOString(),
    endDate: s?.endDate || s?.createdAt || new Date().toISOString(),
    budgetTier: s?.budgetTier || null,
    status: s?.status || 'COMPLETED',
    createdAt: s?.createdAt || new Date().toISOString(),
    items,
  };
}

export function TripHistoryList() {
  const [loading, setLoading] = useState(true);
  const [activeTrips, setActiveTrips] = useState<TripSessionSummary[]>([]);
  const [completedTrips, setCompletedTrips] = useState<TripSessionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/trip-sessions/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error('Failed to load trip history');
        }
        const data = await res.json();
        const rawActive = Array.isArray(data?.active) ? data.active : [];
        const rawCompleted = Array.isArray(data?.completed) ? data.completed : [];

        setActiveTrips(rawActive.map(normalizeSession));
        setCompletedTrips(rawCompleted.map(normalizeSession));
      } catch (err: any) {
        setError(err?.message || 'Error fetching trip history');
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 border border-neutral-200/80 shadow-sm text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent"></div>
        <p className="mt-3 text-sm text-neutral-500 font-medium">Retrieving your journey logs...</p>
      </div>
    );
  }

  const hasNoTrips = activeTrips.length === 0 && completedTrips.length === 0;

  return (
    <div className="space-y-8">
      {/* 1. VISUALLY SEPARATED ACTIVE / IN-PROGRESS SESSIONS */}
      {activeTrips.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h3 className="text-lg font-bold text-neutral-900 tracking-tight">
              Current Live Journey
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
              In Progress
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {activeTrips.map((session) => {
              const itemCount = session.items?.length || 0;
              return (
                <div
                  key={session.id}
                  className="bg-gradient-to-r from-emerald-50/60 via-white to-amber-50/40 rounded-2xl p-6 border-2 border-emerald-500/30 shadow-sm relative overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                        <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                        Active Trip Plan
                      </div>
                      <h4 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-amber-500" />
                        {session.city} Expedition
                      </h4>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                          {new Date(session.startDate).toLocaleDateString()} — {new Date(session.endDate).toLocaleDateString()}
                        </span>
                        {session.budgetTier && (
                          <span className="px-2 py-0.5 rounded bg-neutral-100 font-medium">
                            {session.budgetTier} Tier
                          </span>
                        )}
                        <span>{itemCount} Curated Experience{itemCount === 1 ? '' : 's'}</span>
                      </div>
                    </div>

                    <Link
                      href={`/itinerary?sessionId=${session.id}`}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm transition-all shadow-md shrink-0"
                    >
                      Resume Trip Flow
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Micro-preview of items */}
                  {itemCount > 0 && (
                    <div className="mt-4 pt-4 border-t border-emerald-900/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {session.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="text-xs bg-white/80 p-2 rounded-lg border border-neutral-200/60 truncate flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="truncate font-medium text-neutral-800">{item.experience?.title || 'Experience'}</span>
                        </div>
                      ))}
                      {itemCount > 3 && (
                        <div className="text-xs p-2 text-neutral-500 font-medium flex items-center">
                          +{itemCount - 3} more experiences...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. COMPLETED PAST TRIPS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-neutral-400" />
            Past Journeys & Completed Itineraries
          </h3>
          <span className="text-xs text-neutral-500 font-medium">
            {completedTrips.length} Completed
          </span>
        </div>

        {hasNoTrips ? (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-10 border border-neutral-200/80 shadow-sm text-center max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <Compass className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-semibold text-neutral-900">No journeys recorded yet</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Discover unmissable local experiences and assemble your personalized travel itinerary anytime.
              </p>
            </div>
            <Link
              href="/experiences"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold shadow-sm transition-all"
            >
              Explore Experiences
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : completedTrips.length === 0 ? (
          <div className="bg-neutral-50/70 rounded-xl p-6 border border-neutral-200/60 text-center text-xs text-neutral-500">
            No completed trips yet. You have an active trip above!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedTrips.map((session) => {
              const itemCount = session.items?.length || 0;
              return (
                <div
                  key={session.id}
                  className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-neutral-900 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-neutral-400" />
                        {session.city}
                      </h4>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {new Date(session.startDate).toLocaleDateString()} — {new Date(session.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 border border-neutral-200">
                      Completed
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                    <div className="text-xs font-medium text-neutral-600">
                      {itemCount} Experience{itemCount === 1 ? '' : 's'} visited:
                    </div>
                    <div className="space-y-1">
                      {session.items.slice(0, 2).map((item) => (
                        <div key={item.id} className="text-xs text-neutral-500 truncate flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-neutral-400" />
                          <span className="truncate">{item.experience?.title || 'Experience'}</span>
                        </div>
                      ))}
                      {itemCount > 2 && (
                        <p className="text-[11px] text-neutral-400 italic">
                          +{itemCount - 2} more items
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Link
                      href={`/itinerary?sessionId=${session.id}`}
                      className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                    >
                      View Recap
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
