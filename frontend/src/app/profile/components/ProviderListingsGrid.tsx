'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Eye, MapPin, DollarSign, Clock, Layers, ArrowUpRight } from 'lucide-react';
import { API_BASE } from '@/lib/api-client';

interface ExperienceListing {
  id: string;
  title: string;
  category: string;
  city: string;
  price: number;
  durationMins: number;
  status: string; // 'PUBLISHED' | 'DRAFT' | etc.
  mediaCount?: number;
  createdAt: string;
}

export function ProviderListingsGrid() {
  const [listings, setListings] = useState<ExperienceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchListings() {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const res = await fetch(`${API_BASE}/experiences/my-listings`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error('Failed to load listings');
        }

        const data = await res.json();
        setListings(Array.isArray(data) ? data : data.data || []);
      } catch (err: any) {
        setError(err.message || 'Error fetching listings');
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
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
          href="/experiences/create"
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
            href="/experiences/create"
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
              <div className="p-5 flex-1 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    {item.category.replace('_', ' ')}
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
                    {item.durationMins}m
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-neutral-900">
                    <DollarSign className="w-3.5 h-3.5 text-neutral-400" />
                    ${item.price}
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
