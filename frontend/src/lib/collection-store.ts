'use client';

import { useState, useEffect } from 'react';

export interface SavedCollectionItem {
  id: string;
  title: string;
  city: string;
  category: string;
  image: string;
  priceFormatted: string;
  ratingAverage: number;
  savedAt: number;
}

const STORAGE_KEY = 'journi_private_collection_v1';
const LEGACY_STORAGE_KEY = 'celeste_private_collection_v1';
const UPDATE_EVENT = 'journi:collection_updated';

export function getSavedCollection(): SavedCollectionItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isSavedInCollection(id: string): boolean {
  if (typeof window === 'undefined') return false;
  const items = getSavedCollection();
  return items.some((item) => item.id === id);
}

export function toggleCollectionItem(experience: {
  id: string;
  title: string;
  city?: string;
  category?: string;
  mediaUrls?: string[];
  priceMin?: number;
  priceMax?: number;
  ratingAverage?: number;
}): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const current = getSavedCollection();
    const exists = current.some((item) => item.id === experience.id);

    let next: SavedCollectionItem[];
    let nowSaved: boolean;

    if (exists) {
      next = current.filter((item) => item.id !== experience.id);
      nowSaved = false;
    } else {
      const priceFormatted =
        (!experience.priceMin && !experience.priceMax) ||
        (experience.priceMin === 0 && experience.priceMax === 0)
          ? 'Free'
          : experience.priceMin === 0
          ? `Free – ₹${experience.priceMax?.toLocaleString()}`
          : `₹${experience.priceMin?.toLocaleString()} – ₹${experience.priceMax?.toLocaleString()}`;

      const newItem: SavedCollectionItem = {
        id: experience.id,
        title: experience.title,
        city: experience.city || 'Maharashtra',
        category: experience.category || 'EXPERIENCE',
        image:
          experience.mediaUrls?.[0] ||
          'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=600&q=80',
        priceFormatted,
        ratingAverage: experience.ratingAverage || 4.9,
        savedAt: Date.now(),
      };
      next = [newItem, ...current];
      nowSaved = true;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { count: next.length, id: experience.id, saved: nowSaved } }));
    return nowSaved;
  } catch {
    return false;
  }
}

export function clearSavedCollection(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { count: 0 } }));
}

/**
 * React hook to reactively subscribe to changes in the collection
 */
export function useCollection() {
  const [collection, setCollection] = useState<SavedCollectionItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setCollection(getSavedCollection());
    setIsLoaded(true);

    const handleUpdate = () => {
      setCollection(getSavedCollection());
    };

    window.addEventListener(UPDATE_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(UPDATE_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return {
    collection,
    count: collection.length,
    isLoaded,
    hasItem: (id: string) => collection.some((item) => item.id === id),
    toggle: toggleCollectionItem,
    clear: clearSavedCollection,
  };
}
