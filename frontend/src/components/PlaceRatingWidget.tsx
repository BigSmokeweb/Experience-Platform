'use client';

import React, { useState, useEffect } from 'react';
import { Star, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api-client';
import { updateLocalExperienceRating } from '@/lib/trip-session-store';

interface PlaceRatingWidgetProps {
  experienceId: string;
  experienceTitle?: string;
  compact?: boolean;
  verified?: boolean;
  onRatingSubmitted?: (rating: number) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor / Misleading',
  2: 'Fair / Below Expectation',
  3: 'Good / Decent Visit',
  4: 'Great / Highly Recommended',
  5: 'Exceptional / Must Visit',
};

export function PlaceRatingWidget({
  experienceId,
  experienceTitle,
  compact = false,
  verified = false,
  onRatingSubmitted,
}: PlaceRatingWidgetProps) {
  const [selectedStars, setSelectedStars] = useState<number>(0);
  const [hoveredStars, setHoveredStars] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCheckingUser, setIsCheckingUser] = useState<boolean>(true);
  const [hasExistingReview, setHasExistingReview] = useState<boolean>(false);
  const [isVerifiedVisit, setIsVerifiedVisit] = useState<boolean>(verified);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check login and existing rating on mount
  useEffect(() => {
    let isMounted = true;

    async function checkUserRating() {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('accessToken');
      if (!token) {
        if (isMounted) {
          setIsAuthenticated(false);
          setIsCheckingUser(false);
        }
        return;
      }

      setIsAuthenticated(true);

      try {
        const res = await fetch(`${API_BASE}/reviews/experience/${experienceId}/mine`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data && isMounted) {
            setSelectedStars(data.ratingOverall || 0);
            setHasExistingReview(true);
            if (data.interactionId) {
              setIsVerifiedVisit(true);
            }
          }
        }
      } catch {
        // Silent fail; user can still rate
      } finally {
        if (isMounted) {
          setIsCheckingUser(false);
        }
      }
    }

    checkUserRating();

    const handleAuthChange = () => checkUserRating();
    window.addEventListener('auth-change', handleAuthChange);
    return () => {
      isMounted = false;
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, [experienceId]);

  const activeDisplayStars = hoveredStars || selectedStars;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedStars < 1 || selectedStars > 5) {
      setStatusMessage({ type: 'error', text: 'Please select a star rating between 1 and 5.' });
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      setStatusMessage({ type: 'error', text: 'Please log in to submit a rating.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`${API_BASE}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          experienceId,
          ratingOverall: selectedStars,
          text: '',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to submit rating. Please try again.');
      }

      setHasExistingReview(true);
      updateLocalExperienceRating(experienceId, selectedStars);
      setStatusMessage({
        type: 'success',
        text: hasExistingReview
          ? 'Your rating has been updated successfully!'
          : 'Thank you! Your verified rating has been published.',
      });

      if (onRatingSubmitted) {
        onRatingSubmitted(selectedStars);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to submit rating. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border border-[#D4CFC0] bg-white transition-all shadow-sm ${
        compact ? 'p-4' : 'p-6 sm:p-7'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#347F8C]" />
          <h3 className="font-manifold text-sm sm:text-base font-bold uppercase tracking-wider text-[#2C2C2C]">
            {hasExistingReview ? 'Your Verified Rating' : 'Rate Your Visit'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {isVerifiedVisit && (
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1 font-semibold shadow-2xs">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Verified Route Visit
            </span>
          )}
          <span className="text-[10px] font-mono text-[#7C8581] bg-[#F5F1E6] px-2.5 py-1 rounded-full border border-[#D4CFC0]">
            1 Review / Traveler Guardrail
          </span>
        </div>
      </div>

      {experienceTitle && (
        <p className="text-xs text-[#5C6460] font-light mb-4 truncate">
          Experience: <span className="font-medium text-[#2C2C2C]">{experienceTitle}</span>
        </p>
      )}

      {!isAuthenticated && !isCheckingUser ? (
        <div className="bg-[#FAF8F5] p-5 rounded-xl border border-[#D4CFC0] text-center my-2">
          <p className="text-xs text-[#5C6460] mb-3">
            To prevent bot spam and protect community integrity, only verified traveler accounts can leave ratings.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] font-mono text-xs uppercase tracking-wider font-bold px-4 py-2 rounded-lg transition-all shadow-xs"
          >
            <span>Log In to Rate</span>
            <span>&rarr;</span>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star Selector */}
          <div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5" onMouseLeave={() => setHoveredStars(0)}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedStars(star)}
                    onMouseEnter={() => setHoveredStars(star)}
                    className="p-1 rounded-md transition-transform hover:scale-110 active:scale-95 focus:outline-hidden"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors ${
                        star <= activeDisplayStars
                          ? 'fill-amber-400 text-amber-500'
                          : 'fill-transparent text-[#D4CFC0]'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {activeDisplayStars > 0 && (
                <span className="text-xs font-mono font-semibold text-[#347F8C] ml-2">
                  {activeDisplayStars}/5 &mdash; {RATING_LABELS[activeDisplayStars]}
                </span>
              )}
            </div>

            {hasExistingReview && (
              <p className="text-[11px] font-mono text-[#7C8581] mt-1.5">
                ✓ You previously rated this {selectedStars}/5. Selecting new stars will update your rating.
              </p>
            )}
          </div>



          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-mono text-[#7C8581]">
              Strictly rate-limited to avoid review manipulation.
            </span>
            <button
              type="submit"
              disabled={isSubmitting || selectedStars === 0}
              className="inline-flex items-center gap-2 bg-[#347F8C] hover:bg-[#2A6772] disabled:opacity-50 text-[#F5F1E6] font-mono text-xs uppercase tracking-wider font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-[#347F8C]/15 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>{hasExistingReview ? 'Update Rating' : 'Submit Rating'}</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
