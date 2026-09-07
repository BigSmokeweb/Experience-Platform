'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { API_BASE } from '@/lib/api-client';
import { ItineraryStopCard } from '@/components/ItineraryStopCard';
import { TripAreaMap } from '@/components/TripAreaMap';
import { ArrowLeft, Share2, Check, Copy, MessageCircle } from 'lucide-react';

import {
  fetchTripSession,
  fetchRecommendations,
  saveLocalSession,
  encodeShareableTrip,
  decodeShareableTrip,
  SessionData,
  RecommendationItem,
  RecommendApiResponse,
} from '@/lib/trip-session-store';

function TripSessionContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = params?.sessionId as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [stopCondition, setStopCondition] = useState<RecommendApiResponse['sessionState']['stopCondition'] | null>(null);
  const [wrapUpPrompt, setWrapUpPrompt] = useState<RecommendApiResponse['wrapUpPrompt']>(null);
  const [weatherAdaptPrompt, setWeatherAdaptPrompt] = useState<RecommendApiResponse['weatherAdaptPrompt']>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  };

  const loadSessionAndRecommendations = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Check if this page is being loaded from a fellow traveler's shared link
      const stopsParam = searchParams?.get('stops') || searchParams?.get('route');
      const cityParam = searchParams?.get('city');

      if (stopsParam) {
        const decoded = decodeShareableTrip(stopsParam, cityParam);
        if (decoded) {
          saveLocalSession(decoded);
          setSession(decoded);
          setIsCompleted(true);
          setIsLoading(false);
          return;
        }
      }

      const sessionData = await fetchTripSession(sessionId);
      setSession(sessionData);

      if (sessionData.status === 'COMPLETED') {
        setIsCompleted(true);
        setIsLoading(false);
        return;
      }

      const recData = await fetchRecommendations(sessionId, sessionData);
      setRecommendations(recData.recommendations || []);
      setStopCondition(recData.sessionState.stopCondition);
      setWrapUpPrompt(recData.wrapUpPrompt);
      setWeatherAdaptPrompt(recData.weatherAdaptPrompt);
      // Never auto-finalize on stop addition — user decides when to finalize
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading route candidates.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, searchParams]);

  useEffect(() => {
    loadSessionAndRecommendations();
  }, [loadSessionAndRecommendations]);

  // Generate clean, short shareable URL for travelling companions
  const getShareableUrl = useCallback(() => {
    if (typeof window === 'undefined' || !session) return '';
    const shareQuery = encodeShareableTrip(session);
    const origin = window.location.origin;
    return `${origin}/trip/${session.id}?${shareQuery}`;
  }, [session]);

  const handleCopyShareLink = async () => {
    if (!session) return;
    const url = getShareableUrl();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 3000);
    } catch {
      // Fallback
    }
  };

  const handleShareWhatsApp = () => {
    if (!session) return;
    const url = getShareableUrl();
    const stopsCount = session.selectedExperiences?.length || 0;
    const text = encodeURIComponent(
      `Check out our verified itinerary (${stopsCount} stops in ${session.city || 'our trip'}):\n${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Handler: Add selection
  async function handleSelect(cand: RecommendationItem) {
    setIsActionLoading(true);
    setErrorMessage(null);

    try {
      const current = session || (await fetchTripSession(sessionId));
      const cost = cand.priceMin || 0;
      const duration = cand.durationMinutes || 60;

      const updated: SessionData = {
        ...current,
        remainingBudget: Math.max(0, current.remainingBudget - cost),
        remainingTimeMinutes: Math.max(0, current.remainingTimeMinutes - duration),
        selectedExperienceIds: [...(current.selectedExperienceIds || []), cand.id],
        selectedCategories: Array.from(new Set([...(current.selectedCategories || []), cand.category])),
        selectedExperiences: [
          ...(current.selectedExperiences || []),
          {
            id: cand.id,
            title: cand.title,
            category: cand.category,
            city: cand.city,
            priceMin: cand.priceMin,
            priceMax: cand.priceMax,
            ratingAverage: cand.ratingAverage,
            authenticityRating: cand.authenticityRating,
            mediaUrls: cand.mediaUrls,
            durationMinutes: cand.durationMinutes,
            candidateLat: cand.candidateLat,
            candidateLng: cand.candidateLng,
          },
        ],
      };

      saveLocalSession(updated);
      setSession(updated);

      const token = getAuthToken();
      if (token) {
        fetch(`${API_BASE}/trip-sessions/${sessionId}/select`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            experienceId: cand.id,
            nextLatitude: cand.candidateLat ?? 18.922,
            nextLongitude: cand.candidateLng ?? 72.8347,
            experienceCost: cost,
            durationMinutes: duration,
          }),
        }).catch(() => {});
      }

      await loadSessionAndRecommendations();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsActionLoading(false);
    }
  }

  // Handler: Reject candidate
  async function handleReject(cand: RecommendationItem) {
    setIsActionLoading(true);
    setErrorMessage(null);

    try {
      const current = session || (await fetchTripSession(sessionId));
      const updated: SessionData = {
        ...current,
        rejectedExperienceIds: [...(current.rejectedExperienceIds || []), cand.id],
      };

      saveLocalSession(updated);
      setSession(updated);

      const token = getAuthToken();
      if (token) {
        fetch(`${API_BASE}/trip-sessions/${sessionId}/reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            experienceId: cand.id,
            category: cand.category,
          }),
        }).catch(() => {});
      }

      await loadSessionAndRecommendations();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsActionLoading(false);
    }
  }

  // Handler: Remove a stop
  async function handleRemoveStop(experienceId: string) {
    setIsActionLoading(true);
    setErrorMessage(null);

    try {
      const current = session || (await fetchTripSession(sessionId));
      const removedStop = current.selectedExperiences?.find((e) => e.id === experienceId);
      const cost = removedStop?.priceMin || 0;
      const duration = removedStop?.durationMinutes || 60;

      const updated: SessionData = {
        ...current,
        remainingBudget: Math.min(current.totalBudget, current.remainingBudget + cost),
        remainingTimeMinutes: current.remainingTimeMinutes + duration,
        selectedExperienceIds: (current.selectedExperienceIds || []).filter((id) => id !== experienceId),
        selectedExperiences: (current.selectedExperiences || []).filter((e) => e.id !== experienceId),
      };

      saveLocalSession(updated);
      setSession(updated);

      const token = getAuthToken();
      if (token) {
        fetch(`${API_BASE}/trip-sessions/${sessionId}/stops/${experienceId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }

      await loadSessionAndRecommendations();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsActionLoading(false);
    }
  }

  // Handler: Clear all stops to restart route selection with clean slate
  async function handleClearAllStops() {
    if (!session) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const updated: SessionData = {
        ...session,
        remainingBudget: session.totalBudget,
        remainingTimeMinutes: 180,
        selectedExperienceIds: [],
        selectedCategories: [],
        selectedExperiences: [],
      };
      saveLocalSession(updated);
      setSession(updated);
      await loadSessionAndRecommendations();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsActionLoading(false);
    }
  }

  // Handler: Finish / Mark Complete
  async function handleComplete() {
    setIsActionLoading(true);
    try {
      const current = session || (await fetchTripSession(sessionId));
      const updated: SessionData = {
        ...current,
        status: 'COMPLETED',
      };

      saveLocalSession(updated);
      setSession(updated);
      setIsCompleted(true);

      const token = getAuthToken();
      if (token) {
        fetch(`${API_BASE}/trip-sessions/${sessionId}/complete`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsActionLoading(false);
    }
  }

  // Reactivate a completed session so user can add more stops
  async function reactivateSession() {
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const current = session || (await fetchTripSession(sessionId));
      const updated: SessionData = {
        ...current,
        status: 'ACTIVE',
      };
      saveLocalSession(updated);
      setSession(updated);
      setIsCompleted(false);

      const token = getAuthToken();
      if (token) {
        fetch(`${API_BASE}/trip-sessions/${sessionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'ACTIVE' }),
        }).catch(() => {});
      }

      const recData = await fetchRecommendations(sessionId, updated);
      setRecommendations(recData.recommendations || []);
      setStopCondition(recData.sessionState?.stopCondition || null);
      setWrapUpPrompt(recData.wrapUpPrompt || null);
      setWeatherAdaptPrompt(recData.weatherAdaptPrompt || null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resume itinerary');
    } finally {
      setIsActionLoading(false);
    }
  }

  // Back button: if finalized, re-open editing to add stops; otherwise return to hero itinerary section
  function handleBack() {
    if (isCompleted) {
      reactivateSession();
    } else {
      router.push('/#itinerary');
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F1E6] text-[#2C2C2C] flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#347F8C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#2C2C2C]/70 font-mono text-xs uppercase tracking-widest">
            Scoring candidates for route continuity...
          </p>
        </div>
      </div>
    );
  }

  const selectedStops = session?.selectedExperiences || [];

  return (
    <div className="min-h-screen bg-[#F5F1E6] text-[#2C2C2C] flex flex-col pt-16 selection:bg-[#8B7355]/30 selection:text-[#2C2C2C]">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Visually-hidden h1 for heading hierarchy */}
        <h1 className="sr-only">Your Trip Itinerary</h1>
        {/* Navigation Back Button */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#2C2C2C]/80 hover:text-[#347F8C] border border-[#D4CFC0] hover:border-[#347F8C] px-4 py-2 rounded-xl transition bg-white shadow-sm font-semibold cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            {selectedStops.length > 0 && !isCompleted && (
              <button
                type="button"
                onClick={handleClearAllStops}
                disabled={isActionLoading}
                className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-rose-700 bg-white border border-rose-300 hover:bg-rose-50 px-3 py-2 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
              >
                <span>Reset All Stops</span>
              </button>
            )}
            {isCompleted && (
              <>
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
                  onClick={reactivateSession}
                  disabled={isActionLoading}
                  className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#F5F1E6] bg-[#347F8C] hover:bg-[#2A6772] px-4 py-2 rounded-xl transition shadow-sm font-semibold cursor-pointer active:scale-95"
                >
                  + Add More Stops
                </button>
              </>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-mono flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-700 font-bold ml-4">✕</button>
          </div>
        )}

        {/* Weather Alert Banner */}
        {weatherAdaptPrompt && (
          <div className="mb-6 bg-[#8B7355]/10 border border-[#8B7355]/30 rounded-2xl p-4 sm:p-5 text-[#2C2C2C] shadow-sm">
            <div className="flex items-start gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#347F8C] mt-1 flex-shrink-0 animate-pulse" />
              <div className="flex-1">
                <h4 className="font-mono font-bold text-xs uppercase tracking-wider text-[#347F8C]">Weather Advisory</h4>
                <p className="text-xs text-[#2C2C2C]/80 mt-1 font-light">{weatherAdaptPrompt.advisory}</p>
                {weatherAdaptPrompt.alternativeStrategy && (
                  <p className="text-xs text-[#347F8C] mt-2 font-mono bg-white rounded-lg px-3 py-2 border border-[#8B7355]/20">
                    Adaptation: {weatherAdaptPrompt.alternativeStrategy}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Wrap-Up Advisory Banner */}
        {wrapUpPrompt && !isCompleted && (
          <div className="mb-6 bg-[#A69B80]/15 border border-[#A69B80]/40 rounded-2xl p-4 sm:p-5 text-[#2C2C2C] shadow-sm">
            <div className="flex items-start gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#A69B80] mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-mono font-bold text-xs uppercase tracking-wider text-[#347F8C]">Budget / Temporal Threshold Approaching</h4>
                <p className="text-xs text-[#2C2C2C]/80 mt-1 font-light">{wrapUpPrompt.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={handleComplete}
                    className="bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] text-xs font-mono font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition shadow-sm"
                  >
                    Finalize Journey Now
                  </button>
                  {wrapUpPrompt.quickResponses?.map((qr, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center text-[11px] font-mono bg-white border border-[#D4CFC0] text-[#2C2C2C]/80 px-3 py-1.5 rounded-xl"
                    >
                      {qr}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inline Completion Screen */}
        {isCompleted ? (
          <div className="bg-white rounded-3xl p-6 sm:p-10 lg:p-12 border border-[#D4CFC0] shadow-lg max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <div className="w-12 h-12 bg-[#A69B80]/20 text-[#347F8C] rounded-2xl flex items-center justify-center text-xl mx-auto mb-4 border border-[#A69B80]/30">
                ✓
              </div>
              <h2 className="font-edu-cursive font-normal text-4xl sm:text-5xl lg:text-6xl tracking-wide text-[#2C2C2C] leading-normal py-1">
                Your Itinerary Is Finalized
              </h2>
              <p className="text-[#2C2C2C]/70 mt-2 text-xs sm:text-sm font-light">
                {stopCondition?.stopReason || 'Your personalized route has been finalized. Review your continuous schedule below.'}
              </p>

              {/* Share With Travel Companions Action Bar */}
              <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 p-2 bg-[#F5F1E6] rounded-2xl border border-[#D4CFC0] shadow-xs">
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="inline-flex items-center gap-2 bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] font-mono font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition cursor-pointer shadow-sm active:scale-95"
                >
                  {copiedShareLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedShareLink ? 'Link Copied to Clipboard!' : 'Copy Shareable Link'}</span>
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
                <p className="text-[11px] font-mono text-emerald-700 mt-2 animate-fade-in font-medium">
                  ✓ Anyone who opens this link will see this exact continuous verified itinerary & map!
                </p>
              )}
            </div>

            {/* 2-Column Grid: Summary on Left, Map on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Itinerary Summary */}
              <div className="lg:col-span-6 space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-[#D4CFC0] pb-2">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-[#347F8C] font-semibold">
                    Itinerary Summary ({selectedStops.length} Stops)
                  </h3>
                  <span className="text-[11px] font-mono text-[#2C2C2C]/60">
                    Sequential Route
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedStops.map((stop, idx) => (
                    <ItineraryStopCard
                      key={stop.id}
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
                    />
                  ))}
                </div>
              </div>

              {/* Right Column: Map of Finalized Route & User Location */}
              <div className="lg:col-span-6 text-left lg:sticky lg:top-24">
                <div className="flex items-center justify-between border-b border-[#D4CFC0] pb-2 mb-4">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-[#347F8C] font-semibold">
                    Live Route & Navigation
                  </h3>
                  <span className="text-[11px] font-mono text-[#2C2C2C]/60">
                    Interactive Map
                  </span>
                </div>
                <TripAreaMap
                  city={session?.city}
                  initialUserLat={session?.userLat}
                  initialUserLng={session?.userLng}
                  stops={selectedStops}
                  candidateStops={recommendations}
                  onAddStop={handleSelect}
                />
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-[#D4CFC0] flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-2 border border-[#347F8C] bg-white hover:bg-[#347F8C]/10 text-[#347F8C] font-mono font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition text-center shadow-sm cursor-pointer active:scale-95"
              >
                {copiedShareLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-[#347F8C]" />}
                <span>{copiedShareLink ? 'Link Copied!' : 'Share With Companions'}</span>
              </button>
              <button
                type="button"
                onClick={reactivateSession}
                disabled={isActionLoading}
                className="bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] font-mono font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition text-center shadow-sm cursor-pointer active:scale-95"
              >
                + Add More Stops
              </button>
              <Link
                href="/trip"
                className="border border-[#D4CFC0] hover:border-[#347F8C] text-[#2C2C2C] font-mono font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition text-center bg-white shadow-sm"
              >
                Plan Another Route
              </Link>
              <Link
                href="/"
                className="border border-[#D4CFC0] hover:border-[#347F8C] text-[#2C2C2C] font-mono text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition text-center bg-white"
              >
                Return to Home
              </Link>
            </div>
          </div>
        ) : (
          /* Active Step-by-Step Selection Loop */
          <div>
            <div className="mb-8 border-b border-[#C4A265] pb-6">
              <div className="inline-flex items-center gap-2 text-[#347F8C] font-mono text-xs tracking-[0.28em] uppercase mb-2">
                <span className="w-2 h-2 rounded-full bg-[#A69B80]" />
                Sequential Route Atelier
              </div>
              <h1 className="font-edu-cursive font-normal text-4xl sm:text-5xl lg:text-6xl tracking-wide text-[#2C2C2C] leading-normal py-1">
                Curate Your Journey
              </h1>
              <p className="text-[#5C6460] text-sm mt-2 font-light">
                Select consecutive experiences to construct your continuous verified itinerary.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Recommendations */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center justify-between border-b border-[#C4A265] pb-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#347F8C] font-semibold block mb-0.5">
                      Step {selectedStops.length + 1}
                    </span>
                    <h2 className="font-edu-cursive font-normal text-3xl sm:text-4xl text-[#2C2C2C] tracking-wide leading-normal">
                      Candidate Stops
                    </h2>
                  </div>
                  <button
                    onClick={handleComplete}
                    disabled={selectedStops.length === 0 || isActionLoading}
                    className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5F1E6] bg-[#347F8C] hover:bg-[#2A6772] px-4 py-2 rounded-xl transition shadow-sm disabled:opacity-30 cursor-pointer active:scale-95"
                  >
                    Finalize
                  </button>
                </div>

                {recommendations.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-[#D4CFC0] p-8 text-center shadow-sm">
                    <h3 className="font-edu-cursive font-normal text-2xl sm:text-3xl text-[#2C2C2C] leading-normal">
                      No further stops match criteria
                    </h3>
                  <p className="text-[#2C2C2C]/70 text-xs mt-1.5 font-light">
                    Your remaining budget or duration window has reached optimal allocation.
                  </p>
                  <button
                    onClick={handleComplete}
                    className="mt-5 bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] text-xs font-mono font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition shadow-sm"
                  >
                    Finalize Route ({selectedStops.length} stops)
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((cand) => (
                    <div
                      key={cand.id}
                      className="group bg-white border border-[#D4CFC0] hover:border-[#347F8C]/50 p-5 rounded-2xl shadow-sm transition-all duration-300 flex flex-col justify-between"
                    >
                      <div className="flex gap-4 items-start">
                        {cand.mediaUrls?.[0] && (
                          <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-[#F5F1E6] border border-[#D4CFC0] flex-shrink-0">
                            <Image
                              src={cand.mediaUrls[0]}
                              alt={cand.title}
                              fill
                              sizes="96px"
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#347F8C] font-semibold">
                              {cand.category}
                            </span>
                            <span className="text-[#D4CFC0] text-xs">&bull;</span>
                            <span className="text-[10px] font-mono text-[#2C2C2C]/70 uppercase">{cand.city}</span>
                          </div>
                          <h3 className="font-cormorant text-xl sm:text-2xl font-bold tracking-normal text-[#2C2C2C] leading-snug">
                            {cand.title}
                          </h3>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-mono text-[#2C2C2C]/75">
                            <span>{cand.distanceKm.toFixed(1)} km away</span>
                            <span className="text-[#D4CFC0]">&bull;</span>
                            <span>{cand.durationMinutes || 60}m</span>
                            <span className="text-[#D4CFC0]">&bull;</span>
                            <span className="text-[#2C2C2C] font-semibold">
                              {(!cand.priceMin && !cand.priceMax) || (cand.priceMin === 0 && cand.priceMax === 0)
                                ? 'Free'
                                : cand.priceMin === 0
                                ? `Free – ₹${cand.priceMax}`
                                : `₹${cand.priceMin}–${cand.priceMax}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 pt-3 border-t border-[#D4CFC0] flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleReject(cand)}
                          disabled={isActionLoading}
                          className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-[#2C2C2C]/50 hover:text-red-500 hover:bg-red-50 border border-[#D4CFC0] rounded-xl transition disabled:opacity-30"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleSelect(cand)}
                          disabled={isActionLoading}
                          className="px-4 py-1.5 text-xs font-mono uppercase font-bold tracking-wider bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] rounded-xl shadow-sm transition disabled:opacity-30 flex items-center gap-1.5"
                        >
                          {isActionLoading ? 'Updating...' : '+ Add Stop'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Itinerary Built So Far */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#C4A265] pb-4">
                <h3 className="font-edu-cursive font-normal text-2xl sm:text-3xl tracking-wide text-[#2C2C2C] leading-normal">
                  Curated Route
                </h3>
                <div className="flex items-center gap-2">
                  {selectedStops.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllStops}
                      disabled={isActionLoading}
                      className="text-[11px] font-mono text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-0.5 rounded border border-rose-200 transition cursor-pointer"
                      title="Remove all stops and start selection again"
                    >
                      Clear All
                    </button>
                  )}
                  <span className="text-xs font-mono uppercase tracking-wider text-[#347F8C] bg-[#8B7355]/15 border border-[#8B7355]/30 px-2.5 py-0.5 rounded-full font-semibold">
                    {selectedStops.length} {selectedStops.length === 1 ? 'stop' : 'stops'}
                  </span>
                </div>
              </div>

              {selectedStops.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-[#D4CFC0] p-8 text-center text-[#2C2C2C]/50 shadow-sm">
                  <p className="font-mono text-xs uppercase tracking-wider">No stops added yet.</p>
                  <p className="text-xs text-[#2C2C2C]/60 mt-1 font-light">Select a recommended candidate stop on the left to begin your journey.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedStops.map((stop, idx) => (
                    <ItineraryStopCard
                      key={stop.id}
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

              {/* Area Map below Curated Route */}
              <div className="pt-2">
                <TripAreaMap
                  city={session?.city}
                  initialUserLat={session?.userLat}
                  initialUserLng={session?.userLng}
                  stops={selectedStops}
                  candidateStops={recommendations}
                  onAddStop={handleSelect}
                />
              </div>
            </div>
          </div>
        </div>
        )}
      </main>
    </div>
  );
}

export default function TripSessionLoopPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F1E6] text-[#2C2C2C] flex items-center justify-center pt-16">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-[#347F8C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#2C2C2C]/70 font-mono text-xs uppercase tracking-widest">
              Loading itinerary atelier...
            </p>
          </div>
        </div>
      }
    >
      <TripSessionContent />
    </Suspense>
  );
}

