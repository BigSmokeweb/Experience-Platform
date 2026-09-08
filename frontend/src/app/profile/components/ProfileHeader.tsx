'use client';

import { useState, useEffect } from 'react';
import { User, Edit2, Check, X, Loader2 } from 'lucide-react';

interface TravelerPreferencesSummary {
  homeCity?: string | null;
  interests?: string[];
  budgetBand?: string | null;
  travelStyle?: string | null;
}

interface ProfileHeaderProps {
  initialName: string;
  email: string;
  role: string;
  onUpdateName?: (newName: string) => Promise<void>;
  preferences?: TravelerPreferencesSummary | null;
  isPreferencesOpen?: boolean;
  onTogglePreferences?: () => void;
}

export function ProfileHeader({
  initialName,
  email,
  role,
  onUpdateName,
  preferences,
  isPreferencesOpen,
  onTogglePreferences,
}: ProfileHeaderProps) {
  const [name, setName] = useState(initialName);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep name state in sync if initialName changes
  useEffect(() => {
    setName(initialName);
    setDraftName(initialName);
  }, [initialName]);

  const getInitials = (n: string) => {
    if (!n) return 'U';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const handleSave = async () => {
    if (!draftName.trim() || draftName.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      if (onUpdateName) {
        await onUpdateName(draftName.trim());
      }
      setName(draftName.trim());
      setIsEditing(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to update name');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraftName(name);
    setIsEditing(false);
    setError(null);
  };

  const hasPreferences =
    Boolean(preferences?.homeCity) ||
    (preferences?.interests && preferences.interests.length > 0) ||
    Boolean(preferences?.budgetBand) ||
    Boolean(preferences?.travelStyle);

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-sm relative">
      {/* Edit preferences button at the top-right of header card */}
      {onTogglePreferences && (
        <div className="absolute top-6 right-6">
          <button
            type="button"
            onClick={onTogglePreferences}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              isPreferencesOpen
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200 shadow-sm hover:border-neutral-300'
            }`}
            title={isPreferencesOpen ? 'Close Preferences' : 'Edit Preferences'}
          >
            <Edit2 className="w-3.5 h-3.5 text-amber-500" />
            <span>{isPreferencesOpen ? 'Close' : 'Edit Preferences'}</span>
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar */}
        <div className="relative group shrink-0">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-neutral-900 flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-md shadow-amber-500/20 border border-amber-400/40">
            {getInitials(name)}
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center sm:text-left space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pr-24 sm:pr-28">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-neutral-900 font-semibold text-lg"
                  autoFocus
                  disabled={isSaving}
                />
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg bg-amber-500 text-neutral-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
                  title="Save"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg bg-neutral-200 text-neutral-700 hover:bg-neutral-300 transition-colors"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                  {name}
                </h1>
                {onUpdateName && (
                  <button
                    onClick={() => {
                      setDraftName(name);
                      setIsEditing(true);
                    }}
                    className="p-1 text-neutral-400 hover:text-amber-600 transition-colors rounded-md"
                    title="Edit Name"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            <span className="inline-flex self-center sm:self-auto items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200 uppercase tracking-wide">
              {role}
            </span>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <p className="text-sm text-neutral-500 font-medium">{email}</p>

          {/* Preferences Summary Badges shown directly in header card */}
          {hasPreferences && (
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {preferences?.homeCity && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100/80 text-neutral-700 border border-neutral-200/60">
                  📍 {preferences.homeCity}
                </span>
              )}
              {preferences?.budgetBand && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200/60">
                  💰 {preferences.budgetBand}
                </span>
              )}
              {preferences?.travelStyle && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100/80 text-neutral-700 border border-neutral-200/60">
                  🧭 {preferences.travelStyle.replace(/_/g, ' ')}
                </span>
              )}
              {preferences?.interests && preferences.interests.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100/80 text-neutral-700 border border-neutral-200/60">
                  ✨ {preferences.interests.slice(0, 3).map((i) => i.replace(/_/g, ' ')).join(', ')}
                  {preferences.interests.length > 3 && ` +${preferences.interests.length - 3}`}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
