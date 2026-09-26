'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Share2,
  Check,
  Copy,
  MessageCircle,
  AlertTriangle,
  Camera,
  BookOpen,
  Flag,
} from 'lucide-react';

import { resolveExperienceImageUrl } from '@/lib/image-utils';
import { calculateDistanceKm, REGIONAL_PRESETS } from '@/lib/geo-distance';
import { TripAreaMap } from '@/components/TripAreaMap';
import { ItineraryStopCard } from '@/components/ItineraryStopCard';
import {
  SelectedExperience,
  RecommendationItem,
  saveLocalSession,
  SessionData,
} from '@/lib/trip-session-store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SeasonalStop {
  id: string;
  title: string;
  venue?: string;
  eventArea?: string;
  category: string;
  categoryLabel?: string;
  city: string;
  cover: string;
  mediaUrls: string[];
  candidateLat?: number;
  candidateLng?: number;
  priceMin?: number;
  priceMax?: number;
  durationMinutes?: number;
  ratingAverage: number;
  reviewCount?: number;
  authenticityRating?: number;
  description: string;
  humanTip?: string;
  bestTime?: string;
  tags?: string[];
}

interface SeasonalTripBuilderProps {
  stops: SeasonalStop[];
  festivalLabel: string;
  festivalCategory: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toRecommendationItem(stop: SeasonalStop & { distanceKm: number }): RecommendationItem {
  return {
    id: stop.id,
    title: stop.title,
    category: stop.category,
    city: stop.city,
    distanceKm: stop.distanceKm,
    priceMin: stop.priceMin ?? 0,
    priceMax: stop.priceMax ?? 0,
    durationMinutes: stop.durationMinutes,
    ratingAverage: stop.ratingAverage,
    reviewCount: stop.reviewCount,
    authenticityRating: stop.authenticityRating ?? 0.95,
    mediaUrls: stop.mediaUrls,
    candidateLat: stop.candidateLat,
    candidateLng: stop.candidateLng,
  };
}

function toSelectedExperience(stop: SeasonalStop): SelectedExperience {
  return {
    id: stop.id,
    title: stop.title,
    category: stop.category,
    city: stop.city,
    priceMin: stop.priceMin ?? 0,
    priceMax: stop.priceMax ?? 0,
    ratingAverage: stop.ratingAverage,
    authenticityRating: stop.authenticityRating ?? 0.95,
    mediaUrls: stop.mediaUrls,
    durationMinutes: stop.durationMinutes,
    candidateLat: stop.candidateLat,
    candidateLng: stop.candidateLng,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SeasonalTripBuilder({
  stops,
  festivalLabel,
  festivalCategory,
}: SeasonalTripBuilderProps) {
  const router = useRouter();

  // ── Geolocation ────────────────────────────────────────────────────────────
  const [userCoords, setUserCoords] = useState(REGIONAL_PRESETS.thane);
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ label: 'You', lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000 }
    );
  }, []);

  // ── State ──────────────────────────────────────────────────────────────────
  const [addedStops, setAddedStops] = useState<SeasonalStop[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isCompleted, setIsCompleted] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const isSelectingRef = useRef(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [sessionId] = useState(() => 'seasonal_' + Math.random().toString(36).substring(2, 10));

  // ── Derived candidates list ────────────────────────────────────────────────
  const addedIds = useMemo(() => new Set(addedStops.map((s) => s.id)), [addedStops]);

  const candidates = useMemo(() => {
    return stops
      .filter((s) => !addedIds.has(s.id) && !dismissedIds.has(s.id))
      .map((s) => {
        const lat = s.candidateLat ?? userCoords.lat;
        const lng = s.candidateLng ?? userCoords.lng;
        const dist = calculateDistanceKm(userCoords.lat, userCoords.lng, lat, lng);
        return { ...s, distanceKm: dist };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [stops, addedIds, dismissedIds, userCoords]);

  const mapSelectedStops: SelectedExperience[] = useMemo(
    () => addedStops.map(toSelectedExperience),
    [addedStops]
  );

  const mapCandidateStops: RecommendationItem[] = useMemo(
    () => candidates.map(toRecommendationItem),
    [candidates]
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAddStop = useCallback(
    (stop: SeasonalStop & { distanceKm: number }) => {
      if (isSelectingRef.current || selectingId || isActionLoading) return;
      isSelectingRef.current = true;
      setSelectingId(stop.id);
      try {
        setAddedStops((prev) => {
          if (prev.find((s) => s.id === stop.id)) return prev;
          return [...prev, stop];
        });
      } finally {
        isSelectingRef.current = false;
        setSelectingId(null);
      }
    },
    [selectingId, isActionLoading]
  );

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  const handleRemoveStop = useCallback((id: string) => {
    setAddedStops((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleClearAllStops = useCallback(async () => {
    setIsActionLoading(true);
    setShowResetConfirm(false);
    try {
      setAddedStops([]);
      setDismissedIds(new Set());
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  const handleAddFromMap = useCallback(
    (cand: RecommendationItem) => {
      const original = candidates.find((s) => s.id === cand.id);
      if (original) handleAddStop(original);
    },
    [candidates, handleAddStop]
  );

  const handleFinalize = useCallback(() => {
    if (addedStops.length === 0) return;
    setIsActionLoading(true);
    try {
      const selectedExperiences: SelectedExperience[] = addedStops.map(toSelectedExperience);
      const session: SessionData = {
        id: sessionId,
        status: 'COMPLETED',
        remainingTimeMinutes: 0,
        remainingBudget: 0,
        totalBudget: 0,
        selectedExperienceIds: addedStops.map((s) => s.id),
        selectedCategories: Array.from(new Set(addedStops.map((s) => s.category))),
        selectedExperiences,
        city: addedStops[0]?.city ?? 'Mumbai',
        rejectedExperienceIds: Array.from(dismissedIds),
        tripDate: new Date().toISOString().slice(0, 10),
      };
      saveLocalSession(session);
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeTripSessionId', sessionId);
      }
      setIsCompleted(true);
    } catch {
      // noop
    } finally {
      setIsActionLoading(false);
    }
  }, [addedStops, dismissedIds, sessionId]);

  const handleReactivate = useCallback(() => {
    setIsCompleted(false);
  }, []);

  // ── Share helpers ──────────────────────────────────────────────────────────

  const getShareableUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    const stopIds = addedStops.map((s) => s.id).join(',');
    const city = addedStops[0]?.city ?? 'Mumbai';
    return `${window.location.origin}/trip/${sessionId}?stops=${encodeURIComponent(stopIds)}&city=${encodeURIComponent(city)}`;
  }, [addedStops, sessionId]);

  const handleCopyShareLink = useCallback(async () => {
    const url = getShareableUrl();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 3000);
    } catch { /* noop */ }
  }, [getShareableUrl]);

  const handleShareWhatsApp = useCallback(() => {
    const url = getShareableUrl();
    const text = encodeURIComponent(
      `Check out our verified festival itinerary (${addedStops.length} stops in ${addedStops[0]?.city ?? 'Mumbai'}):\n${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }, [getShareableUrl, addedStops]);

  const selectedStops = mapSelectedStops;
  const stopCount = addedStops.length;

  // ── COMPLETED VIEW (scrollable, standard) ─────────────────────────────────
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-[#F5F1E6] text-[#2C2C2C] selection:bg-[#8B7355]/30 pt-16">
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          {/* Nav row */}
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReactivate}
              className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#2C2C2C]/80 hover:text-[#347F8C] border border-[#D4CFC0] hover:border-[#347F8C] px-4 py-2 rounded-xl transition bg-white shadow-sm font-semibold active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Builder</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[#2C2C2C]/80 hover:text-[#347F8C] border border-[#D4CFC0] hover:border-[#347F8C] bg-white px-3.5 py-2 rounded-xl transition shadow-sm font-semibold cursor-pointer active:scale-95"
              >
                {copiedShareLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-[#347F8C]" />}
                <span>{copiedShareLink ? 'Copied' : 'Share'}</span>
              </button>
              <button
                type="button"
                onClick={handleReactivate}
                className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#F5F1E6] bg-[#347F8C] hover:bg-[#2A6772] px-4 py-2 rounded-xl transition shadow-sm font-semibold cursor-pointer active:scale-95"
              >
                + Add More Stops
              </button>
            </div>
          </div>

          {/* Completion card */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 lg:p-12 border border-[#D4CFC0] shadow-lg">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <div className="w-12 h-12 bg-[#A69B80]/20 text-[#347F8C] rounded-2xl flex items-center justify-center text-xl mx-auto mb-4 border border-[#A69B80]/30">
                ✓
              </div>
              <h2 className="font-edu-cursive font-normal text-4xl sm:text-5xl lg:text-6xl tracking-wide text-[#2C2C2C] leading-normal py-1">
                Your Itinerary Is Finalized
              </h2>
              <p className="text-[#2C2C2C]/70 mt-2 text-xs sm:text-sm font-light">
                Your personalised {festivalLabel} festival trail has been locked in. Review your sequential route below.
              </p>

              <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 p-2 bg-[#F5F1E6] rounded-2xl border border-[#D4CFC0] shadow-xs">
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="inline-flex items-center gap-2 bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] font-mono font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition cursor-pointer shadow-sm active:scale-95"
                >
                  {copiedShareLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedShareLink ? 'Link Copied!' : 'Copy Shareable Link'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-mono font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition cursor-pointer shadow-sm active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Share via WhatsApp</span>
                </button>
              </div>
              {copiedShareLink && (
                <p className="text-[11px] font-mono text-emerald-700 mt-2 font-medium">
                  ✓ Anyone who opens this link will see this exact verified itinerary &amp; map!
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-6 space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-[#D4CFC0] pb-2">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-[#347F8C] font-semibold">
                    Itinerary Summary ({selectedStops.length} Stops)
                  </h3>
                  <span className="text-[11px] font-mono text-[#2C2C2C]/60">Sequential Route</span>
                </div>
                <div className="space-y-3">
                  {selectedStops.map((stop, idx) => (
                    <ItineraryStopCard
                      key={stop.id}
                      id={stop.id}
                      stopNumber={idx + 1}
                      title={stop.title}
                      category={stop.category}
                      city={stop.city}
                      distanceKm={0}
                      priceMin={stop.priceMin}
                      priceMax={stop.priceMax}
                      ratingAverage={stop.ratingAverage}
                      authenticityRating={stop.authenticityRating}
                      mediaUrl={stop.mediaUrls?.[0]}
                      showRateAction={true}
                      sessionId={sessionId}
                      onRemove={() => handleRemoveStop(stop.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6 text-left lg:sticky lg:top-24">
                <div className="flex items-center justify-between border-b border-[#D4CFC0] pb-2 mb-4">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-[#347F8C] font-semibold">
                    Live Route &amp; Navigation
                  </h3>
                  <span className="text-[11px] font-mono text-[#2C2C2C]/60">Interactive Map</span>
                </div>
                <TripAreaMap
                  city={addedStops[0]?.city ?? 'Mumbai'}
                  initialUserLat={userCoords.lat}
                  initialUserLng={userCoords.lng}
                  stops={selectedStops}
                  candidateStops={[]}
                  onAddStop={() => {}}
                />
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-[#D4CFC0] flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-2 border border-[#347F8C] bg-white hover:bg-[#347F8C]/10 text-[#347F8C] font-mono font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition shadow-sm cursor-pointer active:scale-95"
              >
                {copiedShareLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedShareLink ? 'Link Copied!' : 'Share With Companions'}</span>
              </button>
              <button
                type="button"
                onClick={handleReactivate}
                className="bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] font-mono font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition shadow-sm cursor-pointer active:scale-95"
              >
                + Add More Stops
              </button>
              <Link
                href={`/seasonal?festival=${encodeURIComponent(festivalCategory)}`}
                className="border border-[#D4CFC0] hover:border-[#347F8C] text-[#2C2C2C] font-mono font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition text-center bg-white shadow-sm"
              >
                Back to {festivalLabel}
              </Link>
              <Link
                href="/"
                className="border border-[#D4CFC0] hover:border-[#347F8C] text-[#2C2C2C] font-mono text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition text-center bg-white"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── BUILDER VIEW — full viewport, no page scroll ───────────────────────────
  return (
    <div
      className="bg-[#F5F1E6] text-[#2C2C2C] selection:bg-[#8B7355]/30 overflow-hidden flex flex-col"
      style={{ height: '100dvh', paddingTop: '4rem' /* matches fixed navbar h-16 */ }}
    >
      {/* Reset confirmation modal */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setShowResetConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
          tabIndex={-1}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowResetConfirm(false); }}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#D4CFC0] shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="reset-modal-title" className="text-lg uppercase tracking-wide text-[#2C2C2C] font-bold font-mono">
                  Reset Entire Itinerary?
                </h3>
                <p className="text-xs text-[#5C6460] mt-1 leading-relaxed">
                  This will remove all <strong className="text-[#2C2C2C]">{stopCount} selected stop{stopCount > 1 ? 's' : ''}</strong> from your route.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D4CFC0]">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                disabled={isActionLoading}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#2C2C2C]/70 hover:bg-neutral-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllStops}
                disabled={isActionLoading}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-sm cursor-pointer inline-flex items-center gap-1.5"
              >
                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Yes, Reset Route</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Inner flex column: fills the remaining viewport height ── */}
      <div className="flex-1 min-h-0 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">

        {/* Nav row — fixed height, never scrolls */}
        <div className="py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
          <Link
            href={`/seasonal?festival=${encodeURIComponent(festivalCategory)}`}
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#2C2C2C]/80 hover:text-[#347F8C] border border-[#D4CFC0] hover:border-[#347F8C] px-4 py-2 rounded-xl transition bg-white shadow-sm font-semibold active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {festivalLabel}</span>
          </Link>

          {stopCount > 0 && (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              disabled={isActionLoading}
              className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-rose-700 bg-white border border-rose-300 hover:bg-rose-50 px-3 py-2 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
            >
              Reset All Stops
            </button>
          )}
        </div>

        {/* Page header — fixed height, never scrolls */}
        <div className="border-b border-[#C4A265] pb-4 mb-4 flex-shrink-0">
          <div className="inline-flex items-center gap-2 text-[#347F8C] font-mono text-xs tracking-[0.28em] uppercase mb-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
            Sequential Route Atelier
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1 className="font-edu-cursive font-normal text-3xl sm:text-4xl lg:text-5xl tracking-wide text-[#2C2C2C] leading-tight">
                Curate Your Journey
              </h1>
              <p className="text-[#5C6460] text-xs sm:text-sm mt-1 font-light">
                Select pandal stops from <strong className="text-[#2C2C2C]">{festivalLabel}</strong> to build your festival trail.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div
                className="flex items-center gap-2 bg-white border border-[#D4CFC0] px-3.5 py-2 rounded-2xl shadow-sm"
                aria-live="polite"
              >
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#347F8C] font-semibold">
                  Step {stopCount + 1}
                </span>
                <span className="w-px h-4 bg-[#D4CFC0]" aria-hidden="true" />
                <span className="text-xs font-mono text-[#2C2C2C] font-semibold">
                  {stopCount} {stopCount === 1 ? 'stop' : 'stops'} added
                </span>
              </div>
              <button
                type="button"
                id="seasonal-trip-finalize"
                onClick={handleFinalize}
                disabled={stopCount === 0 || isActionLoading}
                aria-label={`Finalize itinerary with ${stopCount} stops`}
                className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#F5F1E6] bg-[#347F8C] hover:bg-[#2A6772] px-4 py-2.5 rounded-xl transition shadow-sm disabled:opacity-40 cursor-pointer active:scale-95 disabled:cursor-not-allowed"
              >
                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                <span>Finalize</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Two-column grid: fills ALL remaining viewport height ── */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 overflow-hidden pb-4">

          {/* LEFT: Candidate Stops — independent vertical scroll */}
          <div className="order-2 lg:order-1 lg:col-span-7 flex flex-col min-h-0 overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between border-b border-[#C4A265] pb-2.5 mb-3 flex-shrink-0">
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#347F8C] font-semibold">
                Candidate Stops
              </span>
              <span className="text-[10px] font-mono text-[#7C8581]" aria-live="polite">
                {candidates.length} available
              </span>
            </div>

            {/* Scrollable card list — fills remaining left-column height */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {candidates.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#D4CFC0] p-8 text-center shadow-sm" role="status">
                  <h3 className="font-edu-cursive font-normal text-2xl sm:text-3xl text-[#2C2C2C] leading-normal">
                    All stops added or dismissed
                  </h3>
                  <p className="text-[#2C2C2C]/70 text-xs mt-1.5 font-light">
                    {stopCount > 0
                      ? 'Hit Finalize to lock in your festival route.'
                      : 'No further stops are available for this festival.'}
                  </p>
                  {stopCount > 0 && (
                    <button
                      onClick={handleFinalize}
                      className="mt-5 bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] text-xs font-mono font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition shadow-sm"
                    >
                      Finalize Route ({stopCount} stops)
                    </button>
                  )}
                </div>
              ) : (
                candidates.map((stop) => {
                  const img = resolveExperienceImageUrl(stop.cover || stop.mediaUrls?.[0]);
                  return (
                    <div
                      key={stop.id}
                      onClick={() => router.push(`/experiences/${stop.id}`)}
                      className="group bg-white border border-[#D4CFC0] hover:border-[#347F8C] p-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer"
                      title="Click to view full experience details"
                    >
                      <div className="flex gap-3 items-start min-w-0">
                        {/* Thumbnail with category badge */}
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[#F5F1E6] border border-[#D4CFC0] flex-shrink-0">
                          <Image
                            src={img}
                            alt={`Cover image for ${stop.title}`}
                            fill
                            unoptimized
                            sizes="96px"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <span className="absolute top-1.5 left-1.5 bg-[#2C2C2C]/85 text-[#F5F1E6] text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded backdrop-blur-sm font-bold leading-tight">
                            {stop.categoryLabel ?? stop.category}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-mono text-[#347F8C] uppercase font-semibold truncate block">
                            {stop.city}
                          </span>
                          <h3
                            className="font-cormorant text-lg sm:text-xl font-bold tracking-normal text-[#2C2C2C] group-hover:text-[#347F8C] transition-colors leading-snug truncate"
                            title={stop.title}
                          >
                            {stop.title}
                          </h3>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-mono text-[#2C2C2C]/70">
                            <span className="text-[#347F8C] font-medium">{stop.distanceKm.toFixed(1)} km away</span>
                            <span className="text-[#D4CFC0]">&bull;</span>
                            <span>{stop.durationMinutes ? `${stop.durationMinutes}m` : '—'}</span>
                            <span className="text-[#D4CFC0]">&bull;</span>
                            <span className="text-[#2C2C2C] font-semibold">
                              {(!stop.priceMin && !stop.priceMax) || (stop.priceMin === 0 && (!stop.priceMax || stop.priceMax === 0))
                                ? 'Free'
                                : stop.priceMin && stop.priceMin > 0
                                ? `₹${stop.priceMin.toLocaleString()}`
                                : 'Free'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action row */}
                      <div
                        className="mt-3 pt-2.5 border-t border-[#D4CFC0]/60 flex items-center justify-between"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link
                          href={`/experiences/${stop.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[#347F8C] hover:text-[#2A6772] font-semibold hover:underline"
                        >
                          <span>Explore Details</span>
                          <span>&rarr;</span>
                        </Link>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            id={`dismiss-${stop.id}`}
                            onClick={(e) => { e.stopPropagation(); handleDismiss(stop.id); }}
                            disabled={selectingId === stop.id || isActionLoading}
                            className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-[#2C2C2C]/60 hover:text-red-600 hover:bg-red-50 border border-[#D4CFC0] rounded-xl transition cursor-pointer active:scale-95 disabled:opacity-40"
                          >
                            Dismiss
                          </button>
                          <button
                            type="button"
                            id={`add-stop-${stop.id}`}
                            onClick={(e) => { e.stopPropagation(); handleAddStop(stop); }}
                            disabled={Boolean(selectingId) || isActionLoading}
                            aria-label={`Add ${stop.title} to your itinerary`}
                            className="px-3.5 py-1.5 text-[11px] font-mono uppercase font-bold tracking-wider bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] rounded-xl shadow-sm transition active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {selectingId === stop.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Adding…</span>
                              </>
                            ) : (
                              <span>+ Add Stop</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Curated Route + Map — fills column height, internal scroll */}
          <div className="order-1 lg:order-2 lg:col-span-5 flex flex-col min-h-0 overflow-y-auto pr-1">
            {/* Section header */}
            <div className="flex items-center justify-between border-b border-[#C4A265] pb-2.5 mb-3 flex-shrink-0">
              <h3 className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#347F8C] font-semibold">
                Curated Route
              </h3>
              <div className="flex items-center gap-2">
                {stopCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    disabled={isActionLoading}
                    className="text-[10px] font-mono uppercase tracking-wider text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-0.5 rounded border border-rose-200 transition cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#347F8C] bg-[#8B7355]/15 border border-[#8B7355]/30 px-2.5 py-0.5 rounded-full font-semibold">
                  {stopCount} {stopCount === 1 ? 'stop' : 'stops'}
                </span>
              </div>
            </div>

            {/* Stops list or empty state */}
            {stopCount === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-[#D4CFC0] py-3 px-4 text-center text-[#2C2C2C]/60 shadow-sm flex-shrink-0 mb-3">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#347F8C]">No stops added yet</p>
                <p className="text-[10px] text-[#2C2C2C]/70 mt-0.5 font-light">Select candidate stops to build your itinerary.</p>
              </div>
            ) : (
              <div className="space-y-2 mb-3 flex-shrink-0">
                {selectedStops.map((stop, idx) => (
                  <ItineraryStopCard
                    key={stop.id}
                    id={stop.id}
                    stopNumber={idx + 1}
                    title={stop.title}
                    category={stop.category}
                    city={stop.city}
                    distanceKm={0}
                    priceMin={stop.priceMin}
                    priceMax={stop.priceMax}
                    ratingAverage={stop.ratingAverage}
                    authenticityRating={stop.authenticityRating}
                    mediaUrl={stop.mediaUrls?.[0]}
                    onRemove={() => handleRemoveStop(stop.id)}
                  />
                ))}
              </div>
            )}

            {/* Map — grows to fill all remaining right-column space */}
            <div className="flex-1 min-h-[260px] rounded-2xl overflow-hidden border border-[#D4CFC0]">
              <TripAreaMap
                city={addedStops[0]?.city ?? 'Mumbai'}
                initialUserLat={userCoords.lat}
                initialUserLng={userCoords.lng}
                stops={selectedStops}
                candidateStops={mapCandidateStops}
                onAddStop={handleAddFromMap}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
