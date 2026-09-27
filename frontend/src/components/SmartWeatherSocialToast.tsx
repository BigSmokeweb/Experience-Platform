'use client';

import { useState, useEffect } from 'react';
import { Radio, AlertTriangle, Sparkles, X, ChevronRight } from 'lucide-react';
import { fetchOpenMeteoWeather, LiveWeatherReport } from '@/lib/weather-service';

export function SmartWeatherSocialToast() {
  const [toast, setToast] = useState<{
    city: string;
    condition: string;
    temp: number;
    isAdverse: boolean;
    headline: string;
    subtext: string;
    type: 'ALERT' | 'TREND' | 'UPDATE';
  } | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkCitySignal() {
      try {
        let lat = 18.9445;
        let lng = 72.821;
        let name = 'Your Location';

        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          const pos = await new Promise<GeolocationPosition | null>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (p) => resolve(p),
              () => resolve(null),
              { timeout: 4000 }
            );
          });
          if (pos) {
            lat = Number(pos.coords.latitude.toFixed(4));
            lng = Number(pos.coords.longitude.toFixed(4));
          }
        }

        const weather: LiveWeatherReport = await fetchOpenMeteoWeather(lat, lng, name);
        if (!isMounted) return;

        const latestSignal = weather.socialSignals?.[0];
        if (weather.isAdverse) {
          setToast({
            city: weather.city,
            condition: weather.condition,
            temp: weather.temperature,
            isAdverse: true,
            headline: `Live Alert: Rain Front Near ${weather.city}`,
            subtext: latestSignal ? latestSignal.text : `Indoor ateliers and cafes recommended while showers pass.`,
            type: 'ALERT',
          });
        } else if (weather.temperature >= 33) {
          setToast({
            city: weather.city,
            condition: weather.condition,
            temp: weather.temperature,
            isAdverse: false,
            headline: `Midday Heat Index in ${weather.city} (${weather.temperature}°C)`,
            subtext: `Stepwells, indoor craft centers & chilled lassi stalls trending right now.`,
            type: 'TREND',
          });
        } else {
          setToast({
            city: weather.city,
            condition: weather.condition,
            temp: weather.temperature,
            isAdverse: false,
            headline: `Ideal Weather in ${weather.city} (${weather.temperature}°C, ${weather.condition})`,
            subtext: latestSignal ? latestSignal.text : `Great conditions for open-air heritage walks and photography.`,
            type: 'UPDATE',
          });
        }
      } catch {
        // Non-blocking
      }
    }

    // Delay slightly after page mount to not overwhelm initial render
    const timer = setTimeout(checkCitySignal, 2500);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  if (!toast || isDismissed) return null;

  return (
    <aside
      aria-label="Live Weather & Social Signal Toast"
      className="fixed bottom-6 left-6 z-40 max-w-sm w-[calc(100vw-3rem)] animate-in fade-in slide-in-from-bottom-5 duration-500 font-sans"
    >
      <div
        className={`p-3.5 rounded-2xl shadow-xl border backdrop-blur-md flex items-start gap-3 relative transition-all ${
          toast.isAdverse
            ? 'bg-amber-50/95 border-amber-300 text-amber-950'
            : toast.type === 'TREND'
            ? 'bg-purple-50/95 border-purple-300 text-purple-950'
            : 'bg-[#FAF7F0]/95 border-[#D4CFC0] text-[#2C2C2C]'
        }`}
      >
        <div
          className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${
            toast.isAdverse
              ? 'bg-amber-500/20 text-amber-700'
              : toast.type === 'TREND'
              ? 'bg-purple-500/20 text-purple-700'
              : 'bg-[#347F8C]/15 text-[#347F8C]'
          }`}
        >
          {toast.isAdverse ? (
            <AlertTriangle className="w-4 h-4 animate-bounce" />
          ) : toast.type === 'TREND' ? (
            <Radio className="w-4 h-4 text-purple-600 animate-pulse" />
          ) : (
            <Sparkles className="w-4 h-4 text-[#347F8C]" />
          )}
        </div>

        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                toast.isAdverse
                  ? 'bg-amber-200 text-amber-900'
                  : toast.type === 'TREND'
                  ? 'bg-purple-200 text-purple-900'
                  : 'bg-emerald-200 text-emerald-900'
              }`}
            >
              {toast.type}
            </span>
            <span className="text-[10px] font-mono text-black/50">Open-Meteo • GDELT Live</span>
          </div>
          <h4 className="text-xs font-bold font-manifold tracking-tight leading-snug">
            {toast.headline}
          </h4>
          <p className="text-[11px] text-black/75 mt-0.5 line-clamp-2 leading-relaxed font-light">
            {toast.subtext}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="absolute top-2.5 right-2.5 p-1 rounded-full text-black/40 hover:text-black/80 hover:bg-black/5 transition"
          aria-label="Dismiss toast"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
