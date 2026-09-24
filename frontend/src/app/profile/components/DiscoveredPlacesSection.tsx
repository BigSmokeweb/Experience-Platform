'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Plus,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  Tag,
} from 'lucide-react';
import { API_BASE, trySilentRefreshToken } from '@/lib/api-client';

export interface DiscoveredSpot {
  id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  state: string;
  address: string;
  latitude: number;
  longitude: number;
  budgetBand: string;
  priceMin: number;
  priceMax: number;
  cover?: string | null;
  mediaUrls: string[];
  published: boolean;
  createdAt: string;
  submittedByRole?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  FOOD: 'Food & Culinary',
  CULTURE: 'Culture & Heritage',
  ADVENTURE: 'Adventure',
  HIDDEN_GEMS: 'Hidden Gems',
  NIGHTLIFE: 'Nightlife',
  EVENTS: 'Events & Fairs',
  WORKSHOPS: 'Workshops & Crafts',
  SHOPPING: 'Shopping & Bazaars',
};

export function DiscoveredPlacesSection() {
  const [spots, setSpots] = useState<DiscoveredSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpots = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      let activeToken = token;
      let res = await fetch(`${API_BASE}/experiences/my-submissions`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      if (res.status === 401) {
        const refreshed = await trySilentRefreshToken();
        if (refreshed) {
          activeToken = refreshed;
          res = await fetch(`${API_BASE}/experiences/my-submissions`, {
            headers: { Authorization: `Bearer ${activeToken}` },
          });
        }
      }

      if (!res.ok) {
        throw new Error(`Failed to load discoveries (${res.status})`);
      }

      const data = await res.json();
      setSpots(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Unable to fetch your discoveries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpots();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Place CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/15 text-amber-700">
              <Compass className="w-3.5 h-3.5" />
            </span>
            <h3 className="text-xl font-bold text-neutral-900 tracking-tight">
              Places You Discovered
            </h3>
            {spots.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200">
                {spots.length}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1 max-w-xl">
            Authentic spots and hidden gems you personally discovered and submitted. Visible here in your private traveler log.
          </p>
        </div>

        <Link
          href="/add-place"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition-all shadow-sm shadow-amber-500/20 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Another Place</span>
        </Link>
      </div>

      {/* Content State */}
      {loading ? (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-10 border border-[#D4CFC0]/60 text-center">
          <div className="inline-block animate-spin rounded-full h-7 w-7 border-3 border-amber-500 border-t-transparent" />
          <p className="text-xs font-mono text-neutral-500 mt-3">Loading your discovered places...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 text-center space-y-3">
          <AlertCircle className="w-6 h-6 text-neutral-400 mx-auto" />
          <p className="text-xs text-neutral-500 font-mono">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchSpots();
            }}
            className="text-xs font-bold text-amber-700 underline"
          >
            Try Again
          </button>
        </div>
      ) : spots.length === 0 ? (
        <div className="bg-gradient-to-br from-white via-[#F5F1E6]/40 to-amber-50/30 rounded-2xl p-8 sm:p-10 border border-[#D4CFC0]/70 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Compass className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h4 className="text-base font-bold text-neutral-900">No Discovered Spots Yet</h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Found a street food gem, heritage tea stall, or artisan workshop? Add it to your profile so you always remember the spot.
            </p>
          </div>
          <Link
            href="/add-place"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Discover & Add Your First Place</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {spots.map((spot) => {
            const categoryLabel = CATEGORY_LABELS[spot.category] || spot.category;
            const dateStr = spot.createdAt
              ? new Date(spot.createdAt).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : null;

            return (
              <div
                key={spot.id}
                className="group bg-white rounded-2xl border border-[#D4CFC0]/80 overflow-hidden shadow-sm hover:shadow-md hover:border-amber-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Image or Pattern Header */}
                  <div className="relative h-40 w-full bg-neutral-100 overflow-hidden">
                    {spot.cover ? (
                      <img
                        src={spot.cover}
                        alt={spot.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          // Hide broken image and fallback to placeholder
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-stone-100 text-neutral-400">
                        <MapPin className="w-8 h-8 text-amber-400/60 mb-1" />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                          {spot.city || 'Discovered Spot'}
                        </span>
                      </div>
                    )}

                    {/* Status Pill */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      {spot.published ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-600/90 text-white backdrop-blur-md shadow-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Listed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-600/90 text-white backdrop-blur-md shadow-xs">
                          <Hourglass className="w-3 h-3 animate-pulse" />
                          <span>Under Review</span>
                        </span>
                      )}
                    </div>

                    {/* Category Tag */}
                    <div className="absolute bottom-3 left-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold bg-black/60 text-white backdrop-blur-md">
                        <Tag className="w-2.5 h-2.5" />
                        <span>{categoryLabel}</span>
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 sm:p-5 space-y-2.5">
                    <div>
                      <h4 className="font-bold text-base text-neutral-900 group-hover:text-[#347F8C] transition-colors line-clamp-1">
                        {spot.title}
                      </h4>
                      <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1 font-mono">
                        <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">{spot.address || `${spot.city}, ${spot.state}`}</span>
                      </p>
                    </div>

                    <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                      {spot.description}
                    </p>
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="px-4 sm:px-5 py-3 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between text-[11px] font-mono text-neutral-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    <span>{dateStr || 'Recently added'}</span>
                  </div>

                  {spot.published ? (
                    <Link
                      href={`/experience/${spot.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-[#347F8C] hover:text-[#2A6772] transition-colors"
                    >
                      <span>View Spot</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  ) : (
                    <span className="text-amber-700 font-semibold text-[10px]">
                      Curators verifying
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
