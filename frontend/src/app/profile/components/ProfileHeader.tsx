'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Edit2, Check, X, Loader2, Camera, Trash2 } from 'lucide-react';

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
  avatarUrl?: string | null;
  onUpdateName?: (newName: string) => Promise<void>;
  onUpdateAvatar?: (newAvatarUrl: string | null) => Promise<void>;
  preferences?: TravelerPreferencesSummary | null;
  isPreferencesOpen?: boolean;
  onTogglePreferences?: () => void;
}

export function ProfileHeader({
  initialName,
  email,
  role,
  avatarUrl: initialAvatarUrl,
  onUpdateName,
  onUpdateAvatar,
  preferences,
  isPreferencesOpen,
  onTogglePreferences,
}: ProfileHeaderProps) {
  const [name, setName] = useState(initialName);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl || null);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep name state in sync if initialName changes
  useEffect(() => {
    setName(initialName);
    setDraftName(initialName);
  }, [initialName]);

  // Sync avatar from DB prop or localStorage
  useEffect(() => {
    if (initialAvatarUrl !== undefined && initialAvatarUrl !== null) {
      setAvatarUrl(initialAvatarUrl);
      try {
        localStorage.setItem(`traveler_avatar_${email}`, initialAvatarUrl);
        localStorage.setItem('user_avatar', initialAvatarUrl);
      } catch {
        // ignore
      }
    } else {
      try {
        const saved =
          localStorage.getItem(`traveler_avatar_${email}`) ||
          localStorage.getItem('user_avatar');
        if (saved) {
          setAvatarUrl(saved);
        }
      } catch {
        // ignore
      }
    }
  }, [initialAvatarUrl, email]);

  const resizeImageToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      img.onload = () => {
        const maxDimension = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(img.src);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Image must be under 8MB');
      return;
    }

    setIsUpdatingAvatar(true);
    setError(null);

    try {
      const optimizedDataUrl = await resizeImageToDataUrl(file);
      setAvatarUrl(optimizedDataUrl);

      try {
        localStorage.setItem(`traveler_avatar_${email}`, optimizedDataUrl);
        localStorage.setItem('user_avatar', optimizedDataUrl);
        window.dispatchEvent(new Event('avatar-change'));
        window.dispatchEvent(new Event('storage'));
      } catch {
        // ignore
      }

      if (onUpdateAvatar) {
        await onUpdateAvatar(optimizedDataUrl);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile picture in database');
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const handleRemoveAvatar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUpdatingAvatar(true);
    setError(null);
    try {
      setAvatarUrl(null);
      try {
        localStorage.removeItem(`traveler_avatar_${email}`);
        localStorage.removeItem('user_avatar');
        window.dispatchEvent(new Event('avatar-change'));
        window.dispatchEvent(new Event('storage'));
      } catch {
        // ignore
      }

      if (onUpdateAvatar) {
        await onUpdateAvatar(null);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to remove profile picture');
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

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
    Boolean(preferences?.travelStyle);

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-sm relative">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar with device upload */}
        <div className="relative group shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-neutral-900 flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-md shadow-amber-500/20 border border-amber-400/40 overflow-hidden relative group/avatar focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            title="Click to upload profile picture"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{getInitials(name)}</span>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[2px] opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-semibold gap-1">
              <Camera className="w-5 h-5 text-white" />
              <span>Change</span>
            </div>

            {/* Updating spinner overlay */}
            {isUpdatingAvatar && (
              <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center text-white text-[10px] font-semibold gap-1">
                <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                <span>Saving...</span>
              </div>
            )}
          </button>

          {/* Camera upload badge */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-neutral-900 text-amber-400 hover:bg-neutral-800 transition-colors shadow-md border-2 border-white cursor-pointer"
            title="Upload profile picture from device"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          {/* Remove custom avatar */}
          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="absolute -top-1 -right-1 p-1 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shadow-md border-2 border-white opacity-0 group-hover:opacity-100 cursor-pointer"
              title="Remove profile picture"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center sm:text-left space-y-3 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-neutral-900 font-semibold text-lg max-w-[200px]"
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
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200 uppercase tracking-wide">
                {role}
              </span>
            </div>

            {/* Edit preferences button */}
            {onTogglePreferences && (
              <button
                type="button"
                onClick={onTogglePreferences}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shrink-0 mx-auto sm:mx-0 ${
                  isPreferencesOpen
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                    : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200 shadow-sm hover:border-neutral-300'
                }`}
                title={isPreferencesOpen ? 'Close Preferences' : 'Edit Preferences'}
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                <span>{isPreferencesOpen ? 'Close' : 'Edit Preferences'}</span>
              </button>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <p className="text-sm text-neutral-500 font-medium">{email}</p>

          {/* Preferences Summary Badges shown directly in header card (budgetBand removed) */}
          {hasPreferences && (
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {preferences?.homeCity && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100/80 text-neutral-700 border border-neutral-200/60">
                  📍 {preferences.homeCity}
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
