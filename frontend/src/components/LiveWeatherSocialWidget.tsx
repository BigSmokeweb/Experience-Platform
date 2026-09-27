'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CloudSun,
  CloudRain,
  Sun,
  Wind,
  Droplets,
  Thermometer,
  Radio,
  MessageSquare,
  AlertTriangle,
  Send,
  X,
  RefreshCw,
  MapPin,
  ChevronDown,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  fetchOpenMeteoWeather,
  LiveWeatherReport,
  WeatherSocialSignal,
  saveUserGroundReport,
  decodeWmoCode,
} from '@/lib/weather-service';

const CITIES = [
  { name: 'Mumbai', lat: 18.9445, lng: 72.821 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { name: 'Delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Thane', lat: 19.2183, lng: 72.9781 },
  { name: 'Navi Mumbai', lat: 19.033, lng: 73.0297 },
];

export function LiveWeatherSocialWidget({ isDarkNav = false }: { isDarkNav?: boolean }) {
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [weatherData, setWeatherData] = useState<LiveWeatherReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newReportText, setNewReportText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const loadWeather = useCallback(async (city: typeof CITIES[0]) => {
    setIsLoading(true);
    try {
      const data = await fetchOpenMeteoWeather(city.lat, city.lng, city.name);
      setWeatherData(data);
    } catch (err) {
      console.warn('Weather fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeather(selectedCity);
    const interval = setInterval(() => loadWeather(selectedCity), 10 * 60 * 1000); // 10m refresh
    return () => clearInterval(interval);
  }, [selectedCity, loadWeather]);

  const handleCitySelect = (city: typeof CITIES[0]) => {
    setSelectedCity(city);
  };

  const handleGpsDetect = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const customCity = {
            name: 'Local GPS',
            lat: Number(pos.coords.latitude.toFixed(4)),
            lng: Number(pos.coords.longitude.toFixed(4)),
          };
          setSelectedCity(customCity);
        },
        () => {
          alert('Could not access GPS location. Using default city.');
        }
      );
    }
  };

  const handleAddReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportText.trim() || !weatherData) return;

    setIsSubmittingReport(true);
    const saved = saveUserGroundReport(
      weatherData.city,
      newReportText.trim(),
      authorName.trim() || 'Fellow Traveler'
    );

    setWeatherData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        socialSignals: [saved, ...prev.socialSignals],
      };
    });

    setNewReportText('');
    setIsSubmittingReport(false);
    setReportSuccess(true);
    setTimeout(() => setReportSuccess(false), 3000);
  };

  const wmo = decodeWmoCode(weatherData?.weatherCode ?? 0);

  return (
    <>
      {/* Navbar Weather Capsule Trigger */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-mono font-medium transition border shadow-xs ${
          isDarkNav
            ? 'bg-black/30 border-white/20 text-white hover:bg-black/50 hover:border-white/40'
            : 'bg-[#FFFDF8] border-[#D4CFC0]/80 text-[#2C2C2C] hover:border-[#8B7355] hover:bg-[#F5F1E6]'
        }`}
        title="Live Weather & Social Signal Updates (Open-Meteo)"
      >
        <span className="text-sm leading-none">{wmo.icon}</span>
        <span className="font-bold text-[11px] sm:text-xs">
          {isLoading ? '...' : `${weatherData?.temperature ?? 28}°C`}
        </span>
        <span className="hidden md:inline text-[10px] text-[#8B7355] font-semibold uppercase tracking-wider">
          {selectedCity.name.split(' ')[0]}
        </span>
        <span className="relative flex h-2 w-2 ml-0.5">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              weatherData?.isAdverse ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              weatherData?.isAdverse ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
        </span>
      </button>

      {/* Interactive Modal: Live Weather & Social Signals */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#FFFDF8] border border-[#D4CFC0] rounded-3xl shadow-2xl overflow-hidden text-[#2C2C2C]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#D4CFC0]/60 bg-[#F5F1E6]/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#347F8C]/15 border border-[#347F8C]/30 flex items-center justify-center text-[#347F8C]">
                  <CloudSun className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold font-manifold text-base text-[#2C2C2C]">
                      Live Weather & Social Signals
                    </h3>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Open-Meteo Live
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-[#2C2C2C]/70">
                    Real-world environmental conditions & traveler ground updates
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-black/5 text-[#2C2C2C]/70 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1 text-xs">
              {/* City Switcher Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono text-[#2C2C2C]/60 uppercase tracking-wider font-semibold">
                  Region:
                </span>
                {CITIES.map((city) => (
                  <button
                    key={city.name}
                    type="button"
                    onClick={() => handleCitySelect(city)}
                    className={`px-3 py-1 rounded-full text-xs font-mono transition border ${
                      selectedCity.name === city.name
                        ? 'bg-[#347F8C] text-white border-[#347F8C] font-bold shadow-xs'
                        : 'bg-white border-[#D4CFC0] text-[#2C2C2C]/80 hover:border-[#8B7355]'
                    }`}
                  >
                    {city.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleGpsDetect}
                  className="px-2.5 py-1 rounded-full text-xs font-mono border border-dashed border-[#8B7355] text-[#8B7355] hover:bg-[#8B7355]/10 flex items-center gap-1 transition"
                  title="Detect GPS"
                >
                  <MapPin className="w-3 h-3" />
                  <span>GPS</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadWeather(selectedCity)}
                  className="p-1 rounded-full hover:bg-black/5 text-[#2C2C2C]/50 transition ml-auto"
                  title="Refresh Telemetry"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Main Weather Card */}
              <div className="bg-gradient-to-br from-[#347F8C]/10 via-[#FAF7F0] to-[#8B7355]/10 border border-[#D4CFC0] rounded-2xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-extrabold font-manifold text-[#2C2C2C]">
                        {weatherData?.temperature ?? 28}°C
                      </span>
                      <span className="text-xl sm:text-2xl">{wmo.icon}</span>
                      <span className="text-sm font-semibold text-[#8B7355]">
                        {weatherData?.condition}
                      </span>
                    </div>
                    <p className="text-xs text-[#2C2C2C]/70 mt-1 font-mono">
                      Feels like <span className="font-bold">{weatherData?.feelsLike ?? 30}°C</span> in{' '}
                      {weatherData?.city} • Telemetry via Open-Meteo API
                    </p>
                  </div>

                  {/* Badges / Advisory */}
                  <div className="flex flex-col sm:items-end gap-1">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold ${
                        weatherData?.isAdverse
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {weatherData?.isAdverse ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Weather Advisory Active</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Optimal for Outdoor Exploration</span>
                        </>
                      )}
                    </span>
                    <span className="text-[10px] text-[#2C2C2C]/60 font-mono">
                      {weatherData?.isAdverse
                        ? 'Prioritizing indoor cafes & heritage museums'
                        : 'Open-air promenades & street bazaars recommended'}
                    </span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#D4CFC0]/60 text-center font-mono">
                  <div className="p-2 bg-white/70 rounded-xl border border-[#D4CFC0]/50">
                    <div className="flex items-center justify-center gap-1 text-[#2C2C2C]/60 text-[10px]">
                      <Droplets className="w-3 h-3 text-[#347F8C]" />
                      <span>Humidity</span>
                    </div>
                    <div className="font-bold text-sm text-[#2C2C2C] mt-0.5">
                      {weatherData?.humidity ?? 65}%
                    </div>
                  </div>
                  <div className="p-2 bg-white/70 rounded-xl border border-[#D4CFC0]/50">
                    <div className="flex items-center justify-center gap-1 text-[#2C2C2C]/60 text-[10px]">
                      <Wind className="w-3 h-3 text-[#347F8C]" />
                      <span>Wind</span>
                    </div>
                    <div className="font-bold text-sm text-[#2C2C2C] mt-0.5">
                      {weatherData?.windSpeed ?? 8} km/h
                    </div>
                  </div>
                  <div className="p-2 bg-white/70 rounded-xl border border-[#D4CFC0]/50">
                    <div className="flex items-center justify-center gap-1 text-[#2C2C2C]/60 text-[10px]">
                      <CloudRain className="w-3 h-3 text-[#347F8C]" />
                      <span>Precipitation</span>
                    </div>
                    <div className="font-bold text-sm text-[#2C2C2C] mt-0.5">
                      {weatherData?.precipitation ?? 0} mm
                    </div>
                  </div>
                </div>
              </div>

              {/* 5-Day Outlook */}
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#8B7355] mb-2.5">
                  5-Day Regional Forecast
                </h4>
                <div className="grid grid-cols-5 gap-2">
                  {weatherData?.dailyForecast.map((d) => (
                    <div
                      key={d.date}
                      className="p-2.5 rounded-xl bg-white border border-[#D4CFC0] text-center font-mono hover:border-[#347F8C] transition"
                    >
                      <div className="text-[10px] text-[#2C2C2C]/70">
                        {new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-base my-1">{decodeWmoCode(d.weatherCode).icon}</div>
                      <div className="text-xs font-bold text-[#2C2C2C]">{d.tempMax}°</div>
                      <div className="text-[10px] text-[#2C2C2C]/50">{d.tempMin}°</div>
                      {d.rainProb > 20 && (
                        <div className="text-[9px] text-blue-600 font-bold mt-1">
                          {d.rainProb}% rain
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Real-World Social Signal Integration */}
              <div className="border-t border-[#D4CFC0]/70 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#2C2C2C]">
                      Real-World Social Signals & Ground Reports
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-[#2C2C2C]/60">
                    Live Crowd & Traveler Sentiment
                  </span>
                </div>

                {/* Social Signals Feed */}
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {weatherData?.socialSignals.map((sig) => (
                    <div
                      key={sig.id}
                      className="p-3 bg-white rounded-xl border border-[#D4CFC0]/80 shadow-2xs hover:border-[#8B7355]/60 transition"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <img
                            src={sig.avatar}
                            alt={sig.author}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <span className="font-bold text-[11px] text-[#2C2C2C]">{sig.author}</span>
                          <span className="text-[10px] text-[#2C2C2C]/50 font-mono">{sig.handle}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                              sig.tag === 'ALERT'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : sig.tag === 'TREND'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-sky-50 text-sky-700 border border-sky-200'
                            }`}
                          >
                            {sig.tag}
                          </span>
                          <span className="text-[10px] font-mono text-[#2C2C2C]/40">{sig.timestamp}</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#2C2C2C]/85 font-sans leading-relaxed">
                        {sig.text}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-[#2C2C2C]/50">
                        <span className="flex items-center gap-1.5">
                          Source: {sig.source}
                          {sig.gdeltTone !== undefined && (
                            <span className="px-1.5 py-0.2 rounded bg-stone-100 border border-stone-300 text-stone-700 font-bold">
                              GDELT Tone: {sig.gdeltTone > 0 ? `+${sig.gdeltTone}` : sig.gdeltTone}
                            </span>
                          )}
                        </span>
                        {sig.url ? (
                          <a
                            href={sig.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[#347F8C] hover:underline"
                          >
                            <span>Read Wire</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                            <ShieldCheck className="w-3 h-3" /> Ground Verified
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Interactive Ground Report Submission Form */}
                <form
                  onSubmit={handleAddReport}
                  className="mt-4 p-3 bg-[#FAF7F0] rounded-xl border border-[#D4CFC0] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-[#8B7355] flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Post a Live Traveler Ground Report
                    </span>
                    {reportSuccess && (
                      <span className="text-[10px] font-mono text-emerald-700 font-bold">
                        ✓ Report posted to live social feed!
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Your Name / Handle"
                      className="sm:col-span-1 px-2.5 py-1.5 text-xs bg-white border border-[#D4CFC0] rounded-lg focus:outline-none focus:border-[#347F8C] font-mono"
                    />
                    <input
                      type="text"
                      value={newReportText}
                      onChange={(e) => setNewReportText(e.target.value)}
                      placeholder="e.g. Rain stopped at Fort; walking tours operational and breezy!"
                      className="sm:col-span-3 px-2.5 py-1.5 text-xs bg-white border border-[#D4CFC0] rounded-lg focus:outline-none focus:border-[#347F8C]"
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingReport || !newReportText.trim()}
                      className="px-3 py-1 rounded-lg bg-[#347F8C] hover:bg-[#2C6B77] text-white text-xs font-mono font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                      <span>Post Report</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#D4CFC0]/60 bg-[#F5F1E6]/40 flex items-center justify-between text-[11px] font-mono text-[#2C2C2C]/60">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Open-Meteo Telemetry & Crowd Sync Active
              </span>
              <a
                href="https://open-meteo.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#347F8C] flex items-center gap-1 transition"
              >
                <span>open-meteo.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
