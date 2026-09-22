'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Star,
  MapPin,
  Calendar,
  Camera,
  X,
  Plus,
  Tag,
  BookOpen,
  CheckCircle2,
  Loader2,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import {
  JournalEntry,
  JournalPhoto,
  createBlankEntry,
  getEntry,
  saveEntry,
  deleteEntry,
} from '@/lib/journal-store';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAHARASHTRA_CITIES = [
  'Mumbai', 'Thane', 'Navi Mumbai', 'Panvel', 'Powai',
  'Kalyan-Dombivli', 'Pune', 'Nashik', 'Aurangabad', 'Kolhapur',
  'Nagpur', 'Solapur', 'Vasai-Virar', 'Mira-Bhayandar',
  'Kanjur Marg', 'Other',
];

const MOOD_OPTIONS: { value: JournalEntry['mood']; emoji: string; label: string }[] = [
  { value: 'wonderful',   emoji: '✨', label: 'Wonderful' },
  { value: 'great',       emoji: '😊', label: 'Great' },
  { value: 'good',        emoji: '🙂', label: 'Good' },
  { value: 'okay',        emoji: '😐', label: 'Okay' },
  { value: 'challenging', emoji: '😤', label: 'Challenging' },
];

const MAX_PHOTOS = 10;
const MAX_PHOTO_SIZE_MB = 4;

// ─── Star Picker ─────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              n <= (hovered || value)
                ? 'fill-[#C4A265] text-[#C4A265]'
                : 'text-stone-300 hover:text-[#C4A265]/50'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Photo Thumbnail ─────────────────────────────────────────────────────────
function PhotoThumb({
  photo,
  onRemove,
  onCaptionChange,
}: {
  photo: JournalPhoto;
  onRemove: () => void;
  onCaptionChange: (caption: string) => void;
}) {
  const [editingCaption, setEditingCaption] = useState(false);
  const [caption, setCaption] = useState(photo.caption);

  return (
    <div className="relative group rounded-xl overflow-hidden border border-[#D4CFC0] bg-white">
      <img src={photo.dataUrl} alt={photo.caption || 'Journal photo'} className="w-full h-32 object-cover" />

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-600"
        title="Remove photo"
      >
        <X className="w-3 h-3" />
      </button>

      {/* Caption row */}
      <div className="p-2">
        {editingCaption ? (
          <input
            autoFocus
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={() => {
              setEditingCaption(false);
              onCaptionChange(caption);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                setEditingCaption(false);
                onCaptionChange(caption);
              }
            }}
            placeholder="Add caption…"
            className="w-full text-[10px] font-mono bg-transparent border-b border-[#C4A265] outline-none text-[#2C2C2C] placeholder-stone-400 pb-0.5"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingCaption(true)}
            className="w-full text-left text-[10px] font-mono text-[#5C6460] hover:text-[#347F8C] transition-colors cursor-pointer truncate"
            title="Click to add caption"
          >
            {caption || <span className="italic text-stone-400">Add caption…</span>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Editor ─────────────────────────────────────────────────────────────
interface JournalEditorProps {
  entryId: string; // "new" or an existing UUID
}

export function JournalEditor({ entryId }: JournalEditorProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isNew = entryId === 'new';

  const [entry, setEntry] = useState<JournalEntry>(() => createBlankEntry());
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Load existing entry
  useEffect(() => {
    if (!isNew) {
      const existing = getEntry(entryId);
      if (existing) {
        setEntry(existing);
      } else {
        router.replace('/journal');
      }
    }
  }, [entryId, isNew, router]);

  // Track dirty state
  const update = useCallback(<K extends keyof JournalEntry>(key: K, value: JournalEntry[K]) => {
    setEntry((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSaved(false);
  }, []);

  // Save
  const handleSave = useCallback(() => {
    setSaving(true);
    saveEntry(entry);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setIsDirty(false);
      if (isNew) {
        // Navigate to the entry's edit page so URL is stable
        router.replace(`/journal/${entry.id}`);
      }
    }, 400);
  }, [entry, isNew, router]);

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  // ── Photo handling ────────────────────────────────────────────────────────

  function handlePhotoUpload(files: FileList | null) {
    if (!files) return;
    setPhotoError('');

    const remaining = MAX_PHOTOS - entry.photos.length;
    if (remaining <= 0) {
      setPhotoError(`Maximum ${MAX_PHOTOS} photos per entry.`);
      return;
    }

    const toProcess = Array.from(files).slice(0, remaining);

    toProcess.forEach((file) => {
      if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
        setPhotoError(`"${file.name}" exceeds ${MAX_PHOTO_SIZE_MB} MB. Please compress it first.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const newPhoto: JournalPhoto = {
          id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          dataUrl,
          caption: '',
          takenAt: Date.now(),
        };
        setEntry((prev) => ({
          ...prev,
          photos: [...prev.photos, newPhoto],
        }));
        setIsDirty(true);
        setSaved(false);
      };
      reader.readAsDataURL(file);
    });
  }

  function removePhoto(photoId: string) {
    setEntry((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.id !== photoId) }));
    setIsDirty(true);
    setSaved(false);
  }

  function updatePhotoCaption(photoId: string, caption: string) {
    setEntry((prev) => ({
      ...prev,
      photos: prev.photos.map((p) => (p.id === photoId ? { ...p, caption } : p)),
    }));
    setIsDirty(true);
    setSaved(false);
  }

  // ── Tag handling ──────────────────────────────────────────────────────────

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/[^a-z0-9\-]/g, '');
    if (!tag || entry.tags.includes(tag) || entry.tags.length >= 10) return;
    update('tags', [...entry.tags, tag]);
    setTagInput('');
  }

  function removeTag(tag: string) {
    update('tags', entry.tags.filter((t) => t !== tag));
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function handleDelete() {
    deleteEntry(entry.id);
    router.push('/journal');
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F5F1E6] text-[#2C2C2C]">
      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-40 bg-[#F5F1E6]/95 backdrop-blur-md border-b border-[#D4CFC0] px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Link
            href="/journal"
            className="flex items-center gap-2 text-[#5C6460] hover:text-[#2C2C2C] text-sm transition-colors font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Journal</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Status */}
            {saved && !isDirty && (
              <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                Saved
              </span>
            )}
            {isDirty && (
              <span className="hidden sm:inline text-[10px] font-mono text-[#5C6460] italic">
                Unsaved changes
              </span>
            )}

            {/* Delete (existing only) */}
            {!isNew && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="text-xs font-mono px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition cursor-pointer"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs font-mono px-3 py-1.5 rounded-full border border-[#D4CFC0] text-[#5C6460] hover:bg-stone-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-xs font-mono text-[#5C6460] hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-full border border-[#D4CFC0] transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )
            )}

            {/* Save */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || (!isDirty && !isNew)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1C4D56] hover:bg-[#153B42] disabled:opacity-40 text-[#F5F1E6] text-xs font-medium transition-all duration-200 active:scale-95 cursor-pointer disabled:cursor-not-allowed shadow-sm"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Editor body ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-20">

        {/* ── Section: Title ── */}
        <div className="mb-6">
          <label className="block text-[10px] font-mono text-[#5C6460] uppercase tracking-wider mb-2">
            Entry Title
          </label>
          <input
            type="text"
            value={entry.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="A memorable headline for this experience…"
            className="w-full text-2xl sm:text-3xl font-cormorant bg-transparent border-b-2 border-[#D4CFC0] focus:border-[#C4A265] outline-none text-[#2C2C2C] placeholder-stone-300 pb-2 transition-colors"
          />
        </div>

        {/* ── Section: Meta row (city, date) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* City */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-mono text-[#5C6460] uppercase tracking-wider mb-2">
              <MapPin className="w-3 h-3 text-[#347F8C]" />
              City
            </label>
            <select
              value={entry.city}
              onChange={(e) => update('city', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D4CFC0] rounded-xl text-[#2C2C2C] focus:outline-none focus:border-[#347F8C] transition-colors cursor-pointer font-light"
            >
              <option value="">Select city…</option>
              {MAHARASHTRA_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Date visited */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-mono text-[#5C6460] uppercase tracking-wider mb-2">
              <Calendar className="w-3 h-3 text-[#347F8C]" />
              Date Visited
            </label>
            <input
              type="date"
              value={entry.visitedAt}
              onChange={(e) => update('visitedAt', e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D4CFC0] rounded-xl text-[#2C2C2C] focus:outline-none focus:border-[#347F8C] transition-colors font-mono"
            />
          </div>
        </div>

        {/* ── Section: Experience link ── */}
        <div className="mb-6">
          <label className="flex items-center gap-1.5 text-[10px] font-mono text-[#5C6460] uppercase tracking-wider mb-2">
            <BookOpen className="w-3 h-3 text-[#347F8C]" />
            Experience Name <span className="normal-case text-[#7C8581]">(optional)</span>
          </label>
          <input
            type="text"
            value={entry.experienceTitle || ''}
            onChange={(e) => update('experienceTitle', e.target.value)}
            placeholder="e.g. Sassoon Dock Dawn Walk, Dharavi Craft Tour…"
            className="w-full px-3 py-2 text-sm bg-white border border-[#D4CFC0] rounded-xl text-[#2C2C2C] placeholder-stone-300 focus:outline-none focus:border-[#347F8C] transition-colors font-light"
          />
        </div>

        {/* ── Section: Rating + Mood ── */}
        <div className="bg-white/70 border border-[#D4CFC0] rounded-2xl p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Rating */}
            <div>
              <label className="block text-[10px] font-mono text-[#5C6460] uppercase tracking-wider mb-3">
                Your Rating
              </label>
              <StarPicker value={entry.rating} onChange={(n) => update('rating', n)} />
              <p className="text-[10px] font-mono text-[#5C6460] mt-1.5">
                {['', 'Disappointing', 'Below expectations', 'Worth it', 'Really enjoyed it', 'Absolutely unforgettable'][entry.rating]}
              </p>
            </div>

            {/* Mood */}
            <div>
              <label className="block text-[10px] font-mono text-[#5C6460] uppercase tracking-wider mb-3">
                How it felt
              </label>
              <div className="flex flex-wrap gap-2">
                {MOOD_OPTIONS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => update('mood', m.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono border transition-all duration-150 cursor-pointer ${
                      entry.mood === m.value
                        ? 'bg-[#1C4D56] text-[#F5F1E6] border-[#1C4D56]'
                        : 'bg-white text-[#5C6460] border-[#D4CFC0] hover:border-[#347F8C] hover:text-[#2C2C2C]'
                    }`}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section: Journal entry text ── */}
        <div className="mb-6">
          <label className="block text-[10px] font-mono text-[#5C6460] uppercase tracking-wider mb-2">
            Your Journal
          </label>
          <textarea
            value={entry.content}
            onChange={(e) => update('content', e.target.value)}
            placeholder="Write about what you saw, heard, tasted, felt…&#10;&#10;Describe the moment you arrived. What surprised you? Who did you meet? What would you tell a friend?"
            rows={14}
            className="w-full px-4 py-4 text-sm bg-white border border-[#D4CFC0] rounded-2xl text-[#2C2C2C] placeholder-stone-300 focus:outline-none focus:border-[#347F8C] transition-colors font-light leading-relaxed resize-none"
          />
          <p className="text-right text-[10px] font-mono text-[#7C8581] mt-1">
            {entry.content.length} characters
          </p>
        </div>

        {/* ── Section: Photos ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-1.5 text-[10px] font-mono text-[#5C6460] uppercase tracking-wider">
              <Camera className="w-3 h-3 text-[#347F8C]" />
              Photos
              <span className="text-[#7C8581] normal-case">({entry.photos.length}/{MAX_PHOTOS})</span>
            </label>
            {entry.photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-mono text-[#347F8C] hover:text-[#245b64] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add photos
              </button>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handlePhotoUpload(e.target.files)}
          />

          {/* Error */}
          {photoError && (
            <p className="text-xs text-red-600 font-mono mb-3 flex items-center gap-1.5">
              <X className="w-3.5 h-3.5" />
              {photoError}
            </p>
          )}

          {/* Photo grid */}
          {entry.photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              {entry.photos.map((photo) => (
                <PhotoThumb
                  key={photo.id}
                  photo={photo}
                  onRemove={() => removePhoto(photo.id)}
                  onCaptionChange={(caption) => updatePhotoCaption(photo.id, caption)}
                />
              ))}
              {/* Add more tile */}
              {entry.photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-[8.75rem] rounded-xl border-2 border-dashed border-[#D4CFC0] hover:border-[#C4A265] text-[#5C6460] hover:text-[#C4A265] flex flex-col items-center justify-center gap-2 transition-all duration-200 cursor-pointer group"
                >
                  <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-mono">Add more</span>
                </button>
              )}
            </div>
          ) : (
            /* Drop zone */
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handlePhotoUpload(e.dataTransfer.files);
              }}
              className="border-2 border-dashed border-[#D4CFC0] hover:border-[#C4A265] rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 group"
            >
              <ImageIcon className="w-8 h-8 text-[#C4A265]/40 group-hover:text-[#C4A265]/70 mx-auto mb-3 transition-colors" />
              <p className="text-sm text-[#5C6460] font-light">
                Click or drag & drop your photos here
              </p>
              <p className="text-[10px] font-mono text-[#7C8581] mt-1">
                Up to {MAX_PHOTOS} photos · Max {MAX_PHOTO_SIZE_MB} MB each · JPG, PNG, WebP
              </p>
            </div>
          )}
        </div>

        {/* ── Section: Tags ── */}
        <div className="mb-8">
          <label className="flex items-center gap-1.5 text-[10px] font-mono text-[#5C6460] uppercase tracking-wider mb-3">
            <Tag className="w-3 h-3 text-[#347F8C]" />
            Tags <span className="normal-case text-[#7C8581]">(up to 10)</span>
          </label>

          <div className="flex flex-wrap gap-2 mb-3">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs font-mono px-3 py-1 rounded-full bg-[#EBE3D5] border border-[#D4CFC0] text-[#2C2C2C]"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-red-500 transition-colors cursor-pointer ml-0.5"
                  title="Remove tag"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {entry.tags.length < 10 && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                placeholder="Type a tag and press Enter…"
                maxLength={30}
                className="flex-1 px-3 py-2 text-xs bg-white border border-[#D4CFC0] rounded-full text-[#2C2C2C] placeholder-stone-300 focus:outline-none focus:border-[#347F8C] transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => addTag(tagInput)}
                disabled={!tagInput.trim()}
                className="px-3 py-2 rounded-full bg-[#F5F1E6] border border-[#D4CFC0] text-[#5C6460] hover:bg-[#EBE3D5] disabled:opacity-40 text-xs font-mono transition cursor-pointer disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          )}

          {/* Suggested tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {['food', 'heritage', 'culture', 'adventure', 'local', 'photography', 'night', 'craft', 'market', 'nature']
              .filter((t) => !entry.tags.includes(t))
              .slice(0, 6)
              .map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => addTag(t)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[#D4CFC0] text-[#7C8581] hover:border-[#347F8C] hover:text-[#347F8C] transition-colors cursor-pointer"
                >
                  + {t}
                </button>
              ))}
          </div>
        </div>

        {/* ── Bottom save bar ── */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#F5F1E6]/95 backdrop-blur-md border-t border-[#D4CFC0] px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <p className="text-[10px] font-mono text-[#5C6460]">
              {isDirty ? 'You have unsaved changes · Ctrl+S to save' : saved ? '✓ All changes saved' : 'No unsaved changes'}
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || (!isDirty && !isNew)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1C4D56] hover:bg-[#153B42] disabled:opacity-40 text-[#F5F1E6] text-sm font-medium transition-all duration-200 active:scale-95 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-[#1C4D56]/20"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved && !isDirty ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving…' : saved && !isDirty ? 'Saved' : 'Save Entry'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
