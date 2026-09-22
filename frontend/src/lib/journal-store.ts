'use client';

import { useState, useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JournalPhoto {
  id: string;
  dataUrl: string;        // base64 data URL stored locally
  caption: string;
  takenAt: number;        // timestamp
}

export interface JournalEntry {
  id: string;
  title: string;
  city: string;
  experienceTitle?: string;
  experienceId?: string;
  content: string;        // rich plain-text journal body
  mood: 'wonderful' | 'great' | 'good' | 'okay' | 'challenging';
  rating: number;         // 1–5 stars
  photos: JournalPhoto[];
  tags: string[];
  visitedAt: string;      // ISO date string (date picker)
  createdAt: number;      // timestamp
  updatedAt: number;      // timestamp
}

// ─── Storage key & event ─────────────────────────────────────────────────────

const STORAGE_KEY = 'journi_travel_journal_v1';
const UPDATE_EVENT = 'journi:journal_updated';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function getAllEntries(): JournalEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getEntry(id: string): JournalEntry | null {
  return getAllEntries().find((e) => e.id === id) ?? null;
}

export function saveEntry(entry: JournalEntry): void {
  if (typeof window === 'undefined') return;
  try {
    const all = getAllEntries();
    const idx = all.findIndex((e) => e.id === entry.id);
    const updated = idx >= 0
      ? all.map((e) => (e.id === entry.id ? { ...entry, updatedAt: Date.now() } : e))
      : [entry, ...all];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { count: updated.length } }));
  } catch {
    // storage full – silently fail
  }
}

export function deleteEntry(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const next = getAllEntries().filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { count: next.length } }));
  } catch {}
}

export function createBlankEntry(overrides?: Partial<JournalEntry>): JournalEntry {
  const now = Date.now();
  return {
    id: `journal_${now}_${Math.random().toString(36).slice(2, 8)}`,
    title: '',
    city: '',
    experienceTitle: '',
    experienceId: '',
    content: '',
    mood: 'great',
    rating: 5,
    photos: [],
    tags: [],
    visitedAt: new Date().toISOString().slice(0, 10),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ─── React hook ───────────────────────────────────────────────────────────────

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setEntries(getAllEntries());
    setIsLoaded(true);

    const handleUpdate = () => setEntries(getAllEntries());
    window.addEventListener(UPDATE_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(UPDATE_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return {
    entries,
    count: entries.length,
    isLoaded,
    getEntry,
    saveEntry,
    deleteEntry,
    createBlankEntry,
  };
}
