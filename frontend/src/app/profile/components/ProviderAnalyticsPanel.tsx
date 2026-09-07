'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Eye, Heart, CalendarCheck, TrendingUp } from 'lucide-react';
import { API_BASE } from '@/lib/api-client';

interface AnalyticsData {
  totalListings: number;
  totalViews: number;
  totalSaves: number;
  totalBookings: number;
}

export function ProviderAnalyticsPanel() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const res = await fetch(`${API_BASE}/providers/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const stats = [
    {
      title: 'Active Offerings',
      value: data?.totalListings ?? 0,
      icon: TrendingUp,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    {
      title: 'Listing Impressions',
      value: data?.totalViews ?? 0,
      icon: Eye,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
      title: 'Traveler Saves',
      value: data?.totalSaves ?? 0,
      icon: Heart,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
    },
    {
      title: 'Itinerary Additions',
      value: data?.totalBookings ?? 0,
      icon: CalendarCheck,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-500" />
            Performance & Engagement
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time engagement telemetry across your host listings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-xl bg-neutral-50/60 border border-neutral-200/70 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500">{stat.title}</span>
                <div className={`p-1.5 rounded-lg border ${stat.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-neutral-900 tracking-tight">
                {loading ? '—' : stat.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] text-neutral-400 border-t border-neutral-100 pt-3">
        Interaction telemetry updates automatically whenever travelers view or incorporate your offerings into active trip sessions.
      </div>
    </div>
  );
}
