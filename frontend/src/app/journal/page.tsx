'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Plus,
  Search,
  MapPin,
  Star,
  Calendar,
  Trash2,
  Edit3,
  ImageIcon,
  Filter,
  SortDesc,
  Camera,
  Clock,
  Route,
} from 'lucide-react';
import { useJournal, JournalEntry, deleteEntry } from '@/lib/journal-store';

// ─── Mood config ─────────────────────────────────────────────────────────────
const MOOD_CONFIG: Record<JournalEntry['mood'], { emoji: string; label: string; color: string }> = {
  wonderful:  { emoji: '✨', label: 'Wonderful',  color: 'text-amber-600 bg-amber-50 border-amber-200' },
  great:      { emoji: '😊', label: 'Great',      color: 'text-teal-700 bg-teal-50 border-teal-200' },
  good:       { emoji: '🙂', label: 'Good',       color: 'text-green-700 bg-green-50 border-green-200' },
  okay:       { emoji: '😐', label: 'Okay',       color: 'text-stone-600 bg-stone-50 border-stone-200' },
  challenging: { emoji: '😤', label: 'Challenging', color: 'text-rose-700 bg-rose-50 border-rose-200' },
};

// ─── Star rating display ─────────────────────────────────────────────────────
function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-3 h-3 ${n <= rating ? 'fill-[#C4A265] text-[#C4A265]' : 'text-stone-300'}`}
        />
      ))}
    </span>
  );
}

// ─── Entry Card ───────────────────────────────────────────────────────────────
function EntryCard({ entry, onDelete }: { entry: JournalEntry; onDelete: (id: string) => void }) {
  const mood = MOOD_CONFIG[entry.mood];
  const cover = entry.photos[0]?.dataUrl;
  const preview = entry.content.slice(0, 140).trimEnd() + (entry.content.length > 140 ? '…' : '');
  const dateLabel = new Date(entry.visitedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

  // Variant: Finalized Itinerary Entry Card
  if (entry.itineraryData) {
    const itin = entry.itineraryData;
    const itinCover = itin.stops.find((s) => s.coverImage)?.coverImage || cover;

    return (
      <article className="group relative bg-[#FAF7EE] border-2 border-[#8B7355]/40 hover:border-[#8B7355] rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
        {/* Cover or Header Strip */}
        {itinCover ? (
          <div className="relative h-44 overflow-hidden bg-[#2C2C2C]">
            <img
              src={itinCover}
              alt={entry.title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#8B7355] text-white text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full font-bold shadow-xs">
              <Route className="w-3 h-3" />
              <span>Finalized Itinerary</span>
            </div>
            <span className="absolute bottom-3 right-3 text-white text-[11px] font-mono bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-xl">
              {itin.stops.length} Stops
            </span>
          </div>
        ) : (
          <div className="h-24 bg-gradient-to-r from-[#8B7355]/15 to-[#347F8C]/15 border-b border-[#D4CFC0] p-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#8B7355] bg-white border border-[#8B7355]/30 px-3 py-1 rounded-xl">
              <Route className="w-3.5 h-3.5" />
              <span>Finalized Itinerary</span>
            </span>
            <span className="text-xs font-mono text-[#2C2C2C]/70 font-semibold">
              {itin.stops.length} Stops
            </span>
          </div>
        )}

        <div className="p-5">
          {/* City + Date + Time Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs font-mono text-[#5C6460]">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#347F8C]" />
              <span className="font-semibold text-[#2C2C2C]">{entry.city || 'Curated Route'}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#8B7355]" />
                {dateLabel}
              </span>
              {itin.timePeriod && (
                <span className="flex items-center gap-1 text-[#347F8C]">
                  <Clock className="w-3 h-3" />
                  {itin.timePeriod}
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="font-cormorant text-[#2C2C2C] text-2xl font-bold leading-snug mb-2 line-clamp-1">
            {entry.title}
          </h3>

          {/* Stops preview */}
          {itin.stops.length > 0 && (
            <div className="space-y-1 mb-4 bg-white/70 rounded-xl p-2.5 border border-[#D4CFC0]/60">
              <span className="block text-[10px] font-mono text-[#8B7355] uppercase tracking-wider font-semibold mb-1">
                Sequential Stops:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {itin.stops.slice(0, 3).map((stop, idx) => (
                  <span
                    key={stop.experienceId || idx}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-[#FAF7EE] border border-[#D4CFC0] text-[#2C2C2C] truncate max-w-[180px]"
                  >
                    {idx + 1}. {stop.title}
                  </span>
                ))}
                {itin.stops.length > 3 && (
                  <span className="text-[11px] font-mono px-1.5 py-0.5 text-[#7C8581]">
                    +{itin.stops.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-3 border-t border-[#D4CFC0]/60">
            <div className="flex items-center gap-2">
              <Link
                href={`/journal/${itin.sessionId || entry.id}/memories`}
                className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-white bg-[#8B7355] hover:bg-[#725E45] font-bold px-3.5 py-1.5 rounded-xl transition shadow-2xs active:scale-95"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Trip Memories</span>
              </Link>
              <Link
                href={`/trip/${itin.sessionId}`}
                className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-[#347F8C] hover:text-[#2A6772] bg-white border border-[#347F8C]/40 px-2.5 py-1.5 rounded-xl transition shadow-2xs"
                title="View full interactive route"
              >
                <Route className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Route</span>
              </Link>
            </div>

            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onDelete(entry.id)}
                  className="text-[10px] font-mono px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition cursor-pointer"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-[10px] font-mono px-2 py-1 rounded-lg bg-stone-200 text-stone-700 hover:bg-stone-300 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-7 h-7 rounded-lg bg-white border border-[#D4CFC0] hover:bg-red-50 hover:text-red-600 text-[#7C8581] flex items-center justify-center transition cursor-pointer"
                title="Delete itinerary entry"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group relative bg-white/80 backdrop-blur-sm border border-[#D4CFC0] rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-[#C4A265]/60 transition-all duration-300">
      {/* Cover photo strip */}
      {cover ? (
        <div className="relative h-44 overflow-hidden">
          <img src={cover} alt={entry.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          {/* Photo count badge */}
          {entry.photos.length > 1 && (
            <span className="absolute bottom-3 right-3 flex items-center gap-1 text-white text-[10px] font-mono bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
              <ImageIcon className="w-3 h-3" />
              {entry.photos.length}
            </span>
          )}
        </div>
      ) : (
        /* No photo: decorative parchment placeholder */
        <div className="h-28 bg-gradient-to-br from-[#F5F1E6] to-[#EBE3D5] flex items-center justify-center border-b border-[#D4CFC0]">
          <BookOpen className="w-10 h-10 text-[#C4A265]/40" />
        </div>
      )}

      <div className="p-5">
        {/* City + date row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[#5C6460] text-xs font-mono">
            <MapPin className="w-3 h-3 text-[#347F8C]" />
            <span>{entry.city || 'Maharashtra'}</span>
          </div>
          <div className="flex items-center gap-1 text-[#5C6460] text-[10px] font-mono">
            <Calendar className="w-3 h-3" />
            <span>{dateLabel}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-cormorant text-[#2C2C2C] text-xl leading-snug mb-1 line-clamp-2">
          {entry.title || <span className="italic text-stone-400">Untitled entry</span>}
        </h3>

        {/* Experience link */}
        {entry.experienceTitle && (
          <p className="text-[10px] font-mono text-[#347F8C] uppercase tracking-wider mb-2">
            @ {entry.experienceTitle}
          </p>
        )}

        {/* Preview text */}
        {preview && (
          <p className="text-sm text-[#5C6460] leading-relaxed line-clamp-3 font-light mb-3">
            {preview}
          </p>
        )}

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {entry.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F5F1E6] border border-[#D4CFC0] text-[#5C6460]">
                #{tag}
              </span>
            ))}
            {entry.tags.length > 3 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F5F1E6] border border-[#D4CFC0] text-[#5C6460]">
                +{entry.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Bottom row: mood + rating + actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#D4CFC0]/60">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${mood.color}`}>
              {mood.emoji} {mood.label}
            </span>
            <StarRow rating={entry.rating} />
          </div>

          <div className="flex items-center gap-1">
            {confirmDelete ? (
              <>
                <button
                  onClick={() => onDelete(entry.id)}
                  className="text-[10px] font-mono px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition cursor-pointer"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-[10px] font-mono px-2 py-1 rounded-lg bg-stone-200 text-stone-700 hover:bg-stone-300 transition cursor-pointer"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <Link
                  href={`/journal/${entry.id}`}
                  className="w-7 h-7 rounded-lg bg-[#F5F1E6] hover:bg-[#347F8C] hover:text-white text-[#5C6460] flex items-center justify-center transition-all duration-200"
                  title="Edit entry"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-7 h-7 rounded-lg bg-[#F5F1E6] hover:bg-red-100 hover:text-red-600 text-[#5C6460] flex items-center justify-center transition-all duration-200 cursor-pointer"
                  title="Delete entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function JournalPage() {
  const router = useRouter();
  const { entries, isLoaded } = useJournal();

  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating'>('newest');

  // Derive unique cities for filter
  const cities = Array.from(new Set(entries.map((e) => e.city).filter(Boolean))).sort();

  // Filter + sort
  const filtered = entries
    .filter((e) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q));
      const matchCity = !cityFilter || e.city === cityFilter;
      return matchSearch && matchCity;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt - a.createdAt;
      if (sortBy === 'oldest') return a.createdAt - b.createdAt;
      return b.rating - a.rating;
    });

  function handleDelete(id: string) {
    deleteEntry(id);
  }

  return (
    <div className="min-h-screen bg-[#F5F1E6] text-[#2C2C2C]">
      {/* ── Page Header ── */}
      <div className="relative overflow-hidden border-b border-[#D4CFC0] bg-gradient-to-b from-[#EBE3D5] to-[#F5F1E6]">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-48 bg-[#C4A265]/10 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
          <div className="inline-flex items-center gap-2 text-[#347F8C] font-mono text-xs tracking-[0.28em] uppercase mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Your Private Chronicles</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="font-cormorant text-4xl sm:text-5xl text-[#2C2C2C] leading-tight">
                Travel Journal
              </h1>
              <p className="text-[#5C6460] text-sm mt-2 font-light max-w-xl leading-relaxed">
                Your personal record of every experience, memory, and moment across Maharashtra and beyond.
              </p>
            </div>

            <Link
              href="/journal/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1C4D56] hover:bg-[#153B42] text-[#F5F1E6] text-sm font-medium transition-all duration-200 shadow-md shadow-[#1C4D56]/20 active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              New Entry
            </Link>
          </div>

          {/* Stats bar */}
          {isLoaded && entries.length > 0 && (
            <div className="flex items-center gap-6 mt-8 pt-6 border-t border-[#D4CFC0]/60">
              <div className="text-center">
                <p className="font-mono text-2xl font-bold text-[#2C2C2C]">{entries.length}</p>
                <p className="text-[10px] font-mono text-[#5C6460] uppercase tracking-wider">Entries</p>
              </div>
              <div className="w-px h-8 bg-[#D4CFC0]" />
              <div className="text-center">
                <p className="font-mono text-2xl font-bold text-[#2C2C2C]">{cities.length}</p>
                <p className="text-[10px] font-mono text-[#5C6460] uppercase tracking-wider">Cities</p>
              </div>
              <div className="w-px h-8 bg-[#D4CFC0]" />
              <div className="text-center">
                <p className="font-mono text-2xl font-bold text-[#2C2C2C]">
                  {entries.reduce((s, e) => s + e.photos.length, 0)}
                </p>
                <p className="text-[10px] font-mono text-[#5C6460] uppercase tracking-wider">Photos</p>
              </div>
              <div className="w-px h-8 bg-[#D4CFC0]" />
              <div className="text-center">
                <p className="font-mono text-2xl font-bold text-[#2C2C2C]">
                  {entries.length > 0
                    ? (entries.reduce((s, e) => s + e.rating, 0) / entries.length).toFixed(1)
                    : '—'}
                </p>
                <p className="text-[10px] font-mono text-[#5C6460] uppercase tracking-wider">Avg Rating</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="sticky top-[72px] z-30 bg-[#F5F1E6]/90 backdrop-blur-md border-b border-[#D4CFC0]/60 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5C6460]" />
            <input
              type="text"
              placeholder="Search entries, cities, tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-xs bg-white border border-[#D4CFC0] rounded-full text-[#2C2C2C] placeholder-[#7C8581] focus:outline-none focus:border-[#347F8C] transition-colors font-light"
            />
          </div>

          {/* City filter */}
          {cities.length > 0 && (
            <div className="relative flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#5C6460]" />
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="text-xs bg-white border border-[#D4CFC0] rounded-full px-3 py-2 text-[#2C2C2C] focus:outline-none focus:border-[#347F8C] transition-colors cursor-pointer appearance-none pr-7 font-mono"
              >
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sort */}
          <div className="relative flex items-center gap-1.5">
            <SortDesc className="w-3.5 h-3.5 text-[#5C6460]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-xs bg-white border border-[#D4CFC0] rounded-full px-3 py-2 text-[#2C2C2C] focus:outline-none focus:border-[#347F8C] transition-colors cursor-pointer appearance-none pr-7 font-mono"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="rating">Highest rated</option>
            </select>
          </div>

          {filtered.length > 0 && (
            <span className="text-[10px] font-mono text-[#5C6460] ml-auto shrink-0">
              {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!isLoaded ? (
          /* Loading skeleton */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white/60 rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-[#EBE3D5] border border-[#D4CFC0] flex items-center justify-center mb-6">
              <BookOpen className="w-9 h-9 text-[#C4A265]/60" />
            </div>
            <h2 className="font-cormorant text-2xl text-[#2C2C2C] mb-2">Your journal awaits</h2>
            <p className="text-sm text-[#5C6460] font-light max-w-sm leading-relaxed mb-8">
              Start documenting your experiences across Maharashtra — the food, the people, the moments that made you feel alive.
            </p>

          </div>
        ) : filtered.length === 0 ? (
          /* No results */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-10 h-10 text-[#C4A265]/40 mb-4" />
            <p className="text-sm text-[#5C6460] font-light">No entries match your search.</p>
            <button
              onClick={() => { setSearch(''); setCityFilter(''); }}
              className="mt-3 text-xs font-mono text-[#347F8C] hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((entry) => (
              <EntryCard key={entry.id} entry={entry} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}