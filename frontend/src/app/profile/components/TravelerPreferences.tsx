'use client';

import { useState } from 'react';
import { Sparkles, MapPin, Compass, DollarSign, Save, Loader2, Check } from 'lucide-react';
import { API_BASE } from '@/lib/api-client';

const INTEREST_OPTIONS = [
  'FOOD',
  'CULTURE',
  'ADVENTURE',
  'HIDDEN_GEMS',
  'NIGHTLIFE',
  'EVENTS',
  'WORKSHOPS',
  'SHOPPING',
] as const;

const BUDGET_BANDS = [
  { value: 'BUDGET', label: 'Budget ($)', desc: 'Smart & thrifty' },
  { value: 'MODERATE', label: 'Moderate ($$)', desc: 'Comfortable balance' },
  { value: 'PREMIUM', label: 'Premium ($$$)', desc: 'Curated & elevated' },
  { value: 'LUXURY', label: 'Luxury ($$$$)', desc: 'World-class excellence' },
] as const;

const TRAVEL_STYLES = [
  { value: 'RELAXED', label: 'Relaxed & Unhurried' },
  { value: 'FAST_PACED', label: 'Fast-Paced Explorer' },
  { value: 'CULTURAL_DEEP_DIVE', label: 'Cultural Deep Dive' },
  { value: 'OFF_BEAT', label: 'Off the Beaten Path' },
  { value: 'FAMILY_FRIENDLY', label: 'Family & Group Friendly' },
];

interface TravelerPreferencesProps {
  initialData: {
    homeCity?: string | null;
    interests?: string[];
    budgetBand?: string | null;
    travelStyle?: string | null;
  };
  onSuccess?: () => void;
}

export function TravelerPreferences({ initialData, onSuccess }: TravelerPreferencesProps) {
  const [homeCity, setHomeCity] = useState(initialData.homeCity || '');
  const [interests, setInterests] = useState<string[]>(initialData.interests || []);
  const [budgetBand, setBudgetBand] = useState<string>(initialData.budgetBand || 'MODERATE');
  const [travelStyle, setTravelStyle] = useState<string>(initialData.travelStyle || 'RELAXED');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleInterest = (tag: string) => {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Not authenticated');

      // Mandatory fix: Using strictly PATCH /users/me/traveler-profile
      const res = await fetch(`${API_BASE}/users/me/traveler-profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          homeCity: homeCity.trim() || undefined,
          interests,
          budgetBand,
          travelStyle,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        // NestJS ZodValidationPipe returns { message: 'Validation failed', errors: [{field, message}] }
        // Extract the first field-level error for a useful message
        const firstFieldErr = errBody?.errors?.[0];
        const detail = firstFieldErr
          ? `${firstFieldErr.field}: ${firstFieldErr.message}`
          : (typeof errBody?.message === 'string' ? errBody.message : 'Failed to update preferences');
        throw new Error(detail);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Error updating preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-sm space-y-8">
      <div>
        <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Travel Profile & Preferences
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Customize your travel identity. Our discovery algorithms tailor recommendations and AI suggestions to match your pace and taste.
        </p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {/* Home City */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-neutral-500" />
          Home Base / City
        </label>
        <input
          type="text"
          value={homeCity}
          onChange={(e) => setHomeCity(e.target.value)}
          placeholder="e.g. Mumbai, Tokyo, London"
          className="w-full max-w-md px-4 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-neutral-900 placeholder:text-neutral-400"
        />
      </div>

      {/* Interests Chips */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-neutral-700 block">
          Interests & Vibes
        </label>
        <div className="flex flex-wrap gap-2.5">
          {INTEREST_OPTIONS.map((tag) => {
            const isSelected = interests.includes(tag);
            return (
              <button
                type="button"
                key={tag}
                onClick={() => toggleInterest(tag)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all border ${
                  isSelected
                    ? 'bg-amber-500 border-amber-500 text-neutral-950 shadow-sm shadow-amber-500/20 scale-105'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:border-neutral-300'
                }`}
              >
                {tag.replace(/_/g, ' ')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Budget Band */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-neutral-500" />
          Preferred Budget Tier
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {BUDGET_BANDS.map((tier) => {
            const isSelected = budgetBand === tier.value;
            return (
              <button
                type="button"
                key={tier.value}
                onClick={() => setBudgetBand(tier.value)}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-neutral-900 shadow-sm'
                    : 'bg-neutral-50/50 border-neutral-200 text-neutral-600 hover:bg-neutral-100/50'
                }`}
              >
                <div className="font-semibold text-sm">{tier.label}</div>
                <div className="text-xs text-neutral-500 mt-0.5">{tier.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Travel Style */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
          <Compass className="w-4 h-4 text-neutral-500" />
          Pacing & Travel Style
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          {TRAVEL_STYLES.map((style) => {
            const isSelected = travelStyle === style.value;
            return (
              <button
                type="button"
                key={style.value}
                onClick={() => setTravelStyle(style.value)}
                className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-neutral-900'
                    : 'bg-neutral-50/50 border-neutral-200 text-neutral-600 hover:bg-neutral-100/50'
                }`}
              >
                {style.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-sm transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving Preferences...
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4 text-neutral-950" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Preferences
            </>
          )}
        </button>
        {saved && (
          <span className="text-xs font-semibold text-emerald-600 animate-fade-in">
            Preferences updated successfully!
          </span>
        )}
      </div>
    </div>
  );
}
