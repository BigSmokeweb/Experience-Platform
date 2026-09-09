'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, MapPin, Clock, Layers, ArrowUpRight } from 'lucide-react';
import { API_BASE } from '@/lib/api-client';
import { getHostListings, HOST_LISTINGS_UPDATED_EVENT } from '@/lib/host-listings-store';

interface ExperienceListing {
  id: string;
  title: string;
  category: string;
  city: string;
  price?: number;
  priceMin?: number;
  priceMax?: number;
  durationMins?: number;
  durationMinutes?: number;
  status: string; // 'PUBLISHED' | 'DRAFT' | etc.
  mediaUrls?: string[];
  createdAt: string;
}

export function ProviderListingsGrid() {
  const [listings, setListings] = useState<ExperienceListing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = async () => {
    const localStore = getHostListings();
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    if (!token) {
      setListings(localStore as any[]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/experiences/my-listings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const apiListings = Array.isArray(data) ? data : data.data || [];
        if (apiListings.length > 0) {
          const seen = new Set(apiListings.map((l: any) => l.id));
          const extra = localStore.filter((l) => !seen.has(l.id));
          setListings([...apiListings, ...extra] as any[]);
        } else {
          setListings(localStore as any[]);
        }
      } else {
        setListings(localStore as any[]);
      }
    } catch {
      setListings(localStore as any[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();

    const handleUpdate = () => {
      fetchListings();
    };

    window.addEventListener(HOST_LISTINGS_UPDATED_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(HOST_LISTINGS_UPDATED_EVENT, handleUpdate);
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 border border-neutral-200/80 shadow-sm text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent"></div>
        <p className="mt-3 text-sm text-neutral-500">Loading your published experiences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-500" />
            Your Hosted Experiences
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Manage your offerings, update descriptions, and track booking availability.
          </p>
        </div>

        <Link
          href="/provider/portal"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition-all shadow-sm shadow-amber-500/20 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create New Experience
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-10 border border-neutral-200/80 shadow-sm text-center max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <Layers className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-semibold text-neutral-900">No experiences listed yet</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Launch your first guided walk, culinary workshop, or hidden gems discovery to start hosting travelers.
            </p>
          </div>
          <Link
            href="/provider/portal"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Your First Listing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((item) => (
            <div
              key={item.id}
              className="group bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-sm hover:shadow-md hover:border-neutral-300 transition-all flex flex-col"
            >
              {item.mediaUrls?.[0] && (
                <div className="relative w-full h-44 bg-neutral-100 overflow-hidden">
                  <Image
                    src={item.mediaUrls[0]}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-5 flex-1 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    {item.category?.replace('_', ' ') || 'EXPERIENCE'}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      item.status === 'PUBLISHED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <h4 className="font-bold text-neutral-900 group-hover:text-amber-600 transition-colors line-clamp-2">
                  {item.title}
                </h4>

                <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                    {item.city}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    {item.durationMinutes || item.durationMins || 120}m
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-neutral-900">
                    ₹{item.priceMin ?? item.price ?? 0}
                    {item.priceMax && item.priceMax > (item.priceMin ?? 0) ? ` – ₹${item.priceMax}` : ''}
                  </span>
                </div>
              </div>

              <div className="px-5 py-3 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-between text-xs">
                <span className="text-neutral-500">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
                <Link
                  href={`/experiences/${item.id}`}
                  className="font-semibold text-neutral-900 hover:text-amber-600 inline-flex items-center gap-1"
                >
                  Preview Page
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
