'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api-client';
import { createTripSession } from '@/lib/trip-session-store';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Wallet, 
  Users, 
  Compass, 
  ArrowRight, 
  Sparkles, 
  Check, 
  ChevronRight,
  RotateCcw
} from 'lucide-react';

interface CityPreset {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  tag: string;
}

const CITY_PRESETS: CityPreset[] = [
  { id: 'mumbai', name: 'Mumbai', region: 'Colaba & Fort', lat: 18.9220, lng: 72.8347, tag: 'Art Deco & Coastal Guilds' },
  { id: 'thane', name: 'Thane', region: 'Upvan & Lakes', lat: 19.2183, lng: 72.9781, tag: 'City of Lakes & Shrines' },
  { id: 'navi-mumbai', name: 'Navi Mumbai', region: 'Belapur & Creek', lat: 19.0330, lng: 73.0297, tag: 'Flamingo Trails & Forts' },
  { id: 'powai', name: 'Powai', region: 'Hiranandani & Lake', lat: 19.1197, lng: 72.9051, tag: 'Lakeside Promenades' },
];

const CURATORIAL_INTERESTS = [
  { id: 'FOOD', label: 'Culinary & Food', desc: 'Family-run kitchens, spice masters & heritage tastings' },
  { id: 'CULTURE', label: 'Heritage & Culture', desc: 'Protected architectural walks, temples & private shrines' },
  { id: 'WORKSHOPS', label: 'Artisan Workshops', desc: 'Hands-on block printing, brass casting & traditional crafts' },
  { id: 'ADVENTURE', label: 'Outdoor & Adventure', desc: 'Dawn harbor navigations, wetlands, stepwells & ridge treks' },
  { id: 'HIDDEN_GEMS', label: 'Off the Map', desc: 'Private collections, secret viewpoints & off-circuit routes' },
  { id: 'NIGHTLIFE', label: 'Nightlife & Music', desc: 'Classical baithaks, lantern walks & evening cultural venues' },
];

const DURATION_PRESETS = [
  { minutes: 120, label: '2 Hours', note: 'A Quiet Afternoon' },
  { minutes: 180, label: '3 Hours', note: 'A Morning Expedition' },
  { minutes: 240, label: '4 Hours', note: 'The Full Chapter' },
  { minutes: 360, label: '6 Hours', note: 'Dawn to Dusk' },
];

const BUDGET_PRESETS = [
  { amount: '2500', label: '₹2,500' },
  { amount: '5000', label: '₹5,000' },
  { amount: '10000', label: '₹10,000' },
  { amount: '15000', label: '₹15,000' },
];

export function ItineraryBuilder() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<{ id: string } | null>(null);
  const [showManualCoords, setShowManualCoords] = useState(false);

  // Form State
  const [selectedCityId, setSelectedCityId] = useState<string>('mumbai');
  const [latitude, setLatitude] = useState('18.9220');
  const [longitude, setLongitude] = useState('72.8347');
  const [locationLabel, setLocationLabel] = useState('Mumbai (Colaba & Fort)');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [totalBudget, setTotalBudget] = useState('5000');
  const [durationMinutes, setDurationMinutes] = useState('180');
  const [groupSize, setGroupSize] = useState('2');

  // Check active session on mount
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    fetch(`${API_BASE}/trip-sessions/active`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.id) setActiveSession(data);
      })
      .catch(() => {});
  }, []);

  // Handle Preset City selection
  const handleSelectCity = (preset: CityPreset) => {
    setSelectedCityId(preset.id);
    setLatitude(String(preset.lat));
    setLongitude(String(preset.lng));
    setLocationLabel(`${preset.name} (${preset.region})`);
    setError(null);
  };

  // Browser Geolocation
  const handleUseCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const fallbackLabel = `Current Location (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`;

        // Update coordinates and instantly advance to the next step (Phase 02: Curatorial Focus)
        setSelectedCityId('custom');
        setLatitude(lat.toFixed(4));
        setLongitude(lng.toFixed(4));
        setLocationLabel(fallbackLabel);
        setGeoLocating(false);
        setActiveStep(2);

        // Fetch reverse geocoded locality asynchronously in background without blocking step transition
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2000);
          fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' }, signal: controller.signal }
          )
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              clearTimeout(timer);
              if (data?.address) {
                const addr = data.address;
                const locality = addr.suburb || addr.neighbourhood || addr.city_district || addr.locality;
                const city = addr.city || addr.town || addr.state_district;
                if (locality && city) setLocationLabel(`${locality}, ${city}`);
                else if (city) setLocationLabel(city);
              }
            })
            .catch(() => {});
        } catch {
          // ignore background reverse geocode error
        }
      },
      (err) => {
        setGeoLocating(false);
        setError(err.message || 'Unable to retrieve location. Select a city from the list.');
      },
      { timeout: 9000, enableHighAccuracy: true }
    );
  };

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBuildRoute = async () => {
    const finalInterests = selectedInterests;

    const budgetNum = parseFloat(totalBudget) || 5000;
    if (!totalBudget) {
      setTotalBudget('5000');
    }

    setIsLoading(true);
    setError(null);

    try {
      const session = await createTripSession({
        latitude: parseFloat(latitude) || 18.922,
        longitude: parseFloat(longitude) || 72.8347,
        totalBudget: budgetNum,
        totalTimeMinutes: parseInt(durationMinutes, 10) || 180,
        groupSize: parseInt(groupSize, 10) || 2,
        interests: finalInterests,
      });

      // Navigate to the trip session loop
      router.push(`/trip/${session.id}`);

      // Fallback navigation in case client router doesn't trigger immediately
      setTimeout(() => {
        if (typeof window !== 'undefined' && !window.location.pathname.includes(session.id)) {
          window.location.href = `/trip/${session.id}`;
        }
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Unable to build itinerary. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <section id="itinerary" className="relative scroll-mt-20 pt-24 pb-36 border-t border-[#D4CFC0] bg-[#F5F1E6] text-[#2C2C2C] z-10">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#A69B80]/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#8B7355]/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-12 pb-8 border-b border-[#C4A265]">
          <div className="inline-flex items-center gap-2 text-[#347F8C] font-mono text-xs tracking-[0.28em] uppercase mb-4 sm:mb-5">
            <span className="w-2 h-2 rounded-full bg-[#A69B80]" />
            Bespoke Route Atelier
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="font-edu-cursive font-normal text-4xl sm:text-5xl lg:text-[60px] tracking-wide text-[#2C2C2C] leading-normal py-1">
                Create Your Itinerary
              </h2>
              <p className="text-[#2C2C2C]/75 text-sm sm:text-base mt-5 sm:mt-6 max-w-2xl font-light leading-relaxed">
                Define your departure origin, curatorial inclinations, and pacing. We link verified guilds and master workshops into a continuous schedule.
              </p>
            </div>

            {/* Active Session Notification */}
            {activeSession && (
              <div className="flex items-center gap-3 bg-white border border-[#347F8C]/40 px-4 py-2.5 rounded-2xl shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#347F8C] animate-ping" />
                <span className="text-xs font-mono text-[#2C2C2C]">Existing Journey Detected</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/trip/${activeSession.id}`)}
                    className="text-xs font-mono font-bold text-[#F5F1E6] bg-[#347F8C] hover:bg-[#2A6772] px-3 py-1 rounded-xl transition shadow-sm cursor-pointer"
                  >
                    Resume &rarr;
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('activeTripSessionId');
                        localStorage.removeItem(`trip_session_${activeSession.id}`);
                      }
                      setActiveSession(null);
                    }}
                    className="text-xs font-mono text-zinc-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                    title="Clear previous journey and start fresh"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Builder Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Step Navigation Sidebar */}
          <div className="lg:col-span-4 space-y-3">
            {[
              { num: 1, title: 'Where shall we begin?', subtitle: locationLabel || 'Select base city', icon: MapPin },
              { num: 2, title: 'Your Interests', subtitle: selectedInterests.length === 0 ? 'All categories (optional)' : `${selectedInterests.length} selected tags`, icon: Compass },
              { num: 3, title: 'Duration & Budget', subtitle: `${parseInt(durationMinutes || '180') / 60}h · ₹${Number(totalBudget || 5000).toLocaleString()}`, icon: Wallet },
            ].map((s) => {
              const Icon = s.icon;
              const isActive = activeStep === s.num;
              const isCompleted = activeStep > s.num;

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    setError(null);
                    setActiveStep(s.num as 1 | 2 | 3);
                  }}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-start gap-4 cursor-pointer active:scale-[0.99] ${
                    isActive
                      ? 'bg-white border-[#347F8C] shadow-md shadow-[#347F8C]/10 text-[#2C2C2C]'
                      : 'bg-white/80 border-[#D4CFC0] hover:border-[#347F8C]/40 hover:bg-white text-[#2C2C2C]/75'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-[#347F8C] text-[#F5F1E6] shadow-sm shadow-[#347F8C]/20'
                        : isCompleted
                        ? 'bg-[#A69B80] text-white'
                        : 'bg-[#F5F1E6] text-[#2C2C2C]/70 border border-[#D4CFC0]'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : `0${s.num}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-manifold text-base tracking-wide uppercase ${isActive ? 'text-[#2C2C2C] font-bold' : 'text-[#2C2C2C]/70'}`}>
                        {s.title}
                      </h4>
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#347F8C]' : 'text-[#2C2C2C]/50'}`} />
                    </div>
                    <p className="text-xs font-mono text-[#2C2C2C]/60 mt-1 truncate">
                      {s.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Quick Summary Pill Box */}
            <div className="p-5 rounded-2xl bg-white border border-[#D4CFC0] space-y-3 font-mono text-xs shadow-sm">
              <div className="text-[11px] uppercase tracking-widest text-[#347F8C] font-semibold">
                Expedition Calibrations
              </div>
              <div className="flex justify-between text-[#2C2C2C]/70">
                <span>Hub:</span>
                <span className="text-[#2C2C2C] font-semibold">{locationLabel.split('(')[0].trim()}</span>
              </div>
              <div className="flex justify-between text-[#2C2C2C]/70">
                <span>Duration:</span>
                <span className="text-[#2C2C2C] font-semibold">{parseInt(durationMinutes) / 60} Hours</span>
              </div>
              <div className="flex justify-between text-[#2C2C2C]/70">
                <span>Party:</span>
                <span className="text-[#2C2C2C] font-semibold">{groupSize} {groupSize === '1' ? 'Traveler' : 'Travelers'}</span>
              </div>
              <div className="flex justify-between text-[#2C2C2C]/70">
                <span>Cap:</span>
                <span className="text-[#2C2C2C] font-semibold">₹{Number(totalBudget).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Interactive Workspace Panel */}
          <div className="lg:col-span-8 bg-white border border-[#D4CFC0] rounded-3xl p-6 sm:p-10 shadow-sm relative z-20">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-mono flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="text-red-500 ml-3">✕</button>
              </div>
            )}

            {/* Step 1: Location & Coordinates */}
            {activeStep === 1 && (
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#347F8C] block mb-1 font-bold">
                    Phase 01
                  </span>
                  <h3 className="font-manifold text-2xl tracking-wide uppercase text-[#2C2C2C] font-bold">
                    Where shall we begin?
                  </h3>
                  <p className="text-xs text-[#2C2C2C]/70 mt-1 font-light">
                    Choose an authentic heritage sector or use your device GPS coordinates.
                  </p>
                </div>

                {/* City Preset Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CITY_PRESETS.map((preset) => {
                    const isSelected = selectedCityId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectCity(preset)}
                        className={`text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer active:scale-[0.99] ${
                          isSelected
                            ? 'bg-[#8B7355]/15 border-[#8B7355] shadow-sm'
                            : 'bg-white border-[#D4CFC0] hover:border-[#8B7355]/50 hover:bg-[#F5F1E6]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-edu-cursive font-normal text-xl sm:text-2xl tracking-wide text-[#2C2C2C]">
                            {preset.name}
                          </span>
                          <span className="text-[11px] font-mono text-[#347F8C] font-semibold">
                            {preset.region}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#2C2C2C]/70 mt-1.5 font-light">
                          {preset.tag}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Live GPS Button */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={geoLocating}
                    className="cursor-pointer w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-[#F5F1E6] hover:bg-white text-[#2C2C2C] border border-[#D4CFC0] px-5 py-3 rounded-xl text-xs font-mono uppercase tracking-wider transition active:scale-95 disabled:opacity-50 shadow-sm"
                  >
                    <Navigation className={`w-3.5 h-3.5 text-[#347F8C] ${geoLocating ? 'animate-spin' : ''}`} />
                    <span>{geoLocating ? 'Detecting GPS Satellite...' : 'Use Current Device Location'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowManualCoords(!showManualCoords)}
                    className="cursor-pointer text-xs font-mono text-[#2C2C2C]/70 hover:text-[#347F8C] transition underline underline-offset-4 px-2"
                  >
                    {showManualCoords ? 'Hide Manual Coordinates' : 'Manual Coordinates'}
                  </button>
                </div>

                {/* Collapsible Manual Coordinates */}
                {showManualCoords && (
                  <div className="p-4 rounded-2xl bg-[#F5F1E6] border border-[#D4CFC0] grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-[#2C2C2C]/70 uppercase tracking-wider mb-1">
                        Latitude (Decimal)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={latitude}
                        onChange={(e) => {
                          setLatitude(e.target.value);
                          setSelectedCityId('custom');
                        }}
                        className="w-full text-xs font-mono bg-white border border-[#D4CFC0] rounded-xl px-3 py-2 text-[#2C2C2C] focus:outline-none focus:border-[#347F8C]"
                        placeholder="e.g. 18.9220"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-[#2C2C2C]/70 uppercase tracking-wider mb-1">
                        Longitude (Decimal)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={longitude}
                        onChange={(e) => {
                          setLongitude(e.target.value);
                          setSelectedCityId('custom');
                        }}
                        className="w-full text-xs font-mono bg-white border border-[#D4CFC0] rounded-xl px-3 py-2 text-[#2C2C2C] focus:outline-none focus:border-[#347F8C]"
                        placeholder="e.g. 72.8347"
                      />
                    </div>
                  </div>
                )}

                {/* Confirmation Footer */}
                <div className="pt-4 border-t border-[#D4CFC0] flex items-center justify-between">
                  <div className="text-xs font-mono text-[#2C2C2C]/70">
                    Active Point: <span className="text-[#2C2C2C] font-bold">{locationLabel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setActiveStep(2);
                    }}
                    className="cursor-pointer inline-flex items-center gap-2 bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] text-xs font-mono font-bold uppercase tracking-wider px-6 py-3 rounded-xl transition shadow-sm active:scale-95"
                  >
                    <span>Your Interests</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Curatorial Interests */}
            {activeStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#347F8C] block mb-1 font-bold">
                      Phase 02
                    </span>
                    <h3 className="font-manifold text-2xl tracking-wide uppercase text-[#2C2C2C] font-bold">
                      Your Interests
                    </h3>
                    <p className="text-xs text-[#2C2C2C]/70 mt-1 font-light">
                      Select tags to tailor your route, or leave unselected to explore all categories.
                    </p>
                  </div>
                  {selectedInterests.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedInterests([])}
                      className="text-[11px] font-mono text-[#347F8C] hover:underline uppercase tracking-wider font-semibold cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CURATORIAL_INTERESTS.map((interest) => {
                    const isSelected = selectedInterests.includes(interest.id);
                    return (
                      <button
                        key={interest.id}
                        type="button"
                        onClick={() => toggleInterest(interest.id)}
                        className={`cursor-pointer text-left p-4 rounded-2xl border transition-all duration-200 active:scale-[0.98] ${
                          isSelected
                            ? 'bg-[#347F8C] text-[#F5F1E6] border-[#347F8C] shadow-sm'
                            : 'bg-white text-[#2C2C2C] border border-[#D4CFC0] hover:border-[#347F8C]/50 hover:bg-[#F5F1E6]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-manifold text-sm tracking-wide uppercase font-bold ${isSelected ? 'text-white' : 'text-[#2C2C2C]'}`}>
                            {interest.label}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <p className={`text-[11px] mt-1.5 font-light ${isSelected ? 'text-[#F5F1E6]/90' : 'text-[#2C2C2C]/70'}`}>
                          {interest.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-[#D4CFC0] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setActiveStep(1);
                    }}
                    className="cursor-pointer text-xs font-mono text-[#2C2C2C]/70 hover:text-[#347F8C] uppercase tracking-wider transition"
                  >
                    &larr; Back to Location
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setActiveStep(3);
                    }}
                    className="cursor-pointer inline-flex items-center gap-2 bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] text-xs font-mono font-bold uppercase tracking-wider px-6 py-3 rounded-xl transition shadow-sm active:scale-95"
                  >
                    <span>Duration & Budget</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Budget, Time & Party */}
            {activeStep === 3 && (
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#347F8C] block mb-1 font-bold">
                    Phase 03
                  </span>
                  <h3 className="font-manifold text-2xl tracking-wide uppercase text-[#2C2C2C] font-bold">
                    Duration & Budget
                  </h3>
                  <p className="text-xs text-[#2C2C2C]/70 mt-1 font-light">
                    Establish temporal thresholds and budget allocation for guild tariffs and workshops.
                  </p>
                </div>

                {/* Duration Picker */}
                <div>
                  <label className="block text-[11px] font-mono text-[#2C2C2C]/70 uppercase tracking-wider mb-2 font-semibold">
                    Temporal Duration
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DURATION_PRESETS.map((d) => (
                      <button
                        key={d.minutes}
                        type="button"
                        onClick={() => setDurationMinutes(String(d.minutes))}
                        className={`cursor-pointer p-3 rounded-xl text-center border transition-all active:scale-95 ${
                          durationMinutes === String(d.minutes)
                            ? 'bg-[#347F8C] text-[#F5F1E6] font-bold border-[#347F8C] shadow-sm'
                            : 'bg-white text-[#2C2C2C] border border-[#D4CFC0] hover:border-[#347F8C]/40 hover:bg-[#F5F1E6]/40'
                        }`}
                      >
                        <span className="block text-xs font-mono">{d.label}</span>
                        <span className="block text-[10px] opacity-80 mt-0.5">{d.note}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget Selection */}
                <div>
                  <label className="block text-[11px] font-mono text-[#2C2C2C]/70 uppercase tracking-wider mb-2 font-semibold">
                    Total Budget Allocation (INR)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    {BUDGET_PRESETS.map((b) => (
                      <button
                        key={b.amount}
                        type="button"
                        onClick={() => setTotalBudget(b.amount)}
                        className={`cursor-pointer p-2.5 rounded-xl text-xs font-mono text-center border transition-all active:scale-95 ${
                          totalBudget === b.amount
                            ? 'bg-[#347F8C] text-[#F5F1E6] font-bold border-[#347F8C] shadow-sm'
                            : 'bg-white text-[#2C2C2C] border border-[#D4CFC0] hover:border-[#347F8C]/40 hover:bg-[#F5F1E6]/40'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(e.target.value)}
                    placeholder="Or enter custom budget"
                    className="w-full text-xs font-mono bg-white border border-[#D4CFC0] rounded-xl px-3 py-2.5 text-[#2C2C2C] placeholder-[#2C2C2C]/40 focus:outline-none focus:border-[#347F8C] transition"
                  />
                </div>

                {/* Cohort Size */}
                <div>
                  <label className="block text-[11px] font-mono text-[#2C2C2C]/70 uppercase tracking-wider mb-2 font-semibold">
                    Cohort Size
                  </label>
                  <div className="flex gap-2">
                    {['1', '2', '3', '4', '5'].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setGroupSize(num)}
                        className={`cursor-pointer flex-1 py-2 rounded-xl text-xs font-mono text-center border transition active:scale-95 ${
                          groupSize === num
                            ? 'bg-[#347F8C] text-[#F5F1E6] font-bold border-[#347F8C] shadow-sm'
                            : 'bg-white text-[#2C2C2C] border border-[#D4CFC0] hover:border-[#347F8C]/40 hover:bg-[#F5F1E6]/40'
                        }`}
                      >
                        {num} {num === '1' ? 'Person' : 'People'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#D4CFC0] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setActiveStep(2);
                    }}
                    className="cursor-pointer text-xs font-mono text-[#2C2C2C]/70 hover:text-[#347F8C] uppercase tracking-wider transition"
                  >
                    &larr; Back to Interests
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleBuildRoute}
                    className="cursor-pointer inline-flex items-center gap-2.5 bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] text-xs font-mono font-bold uppercase tracking-wider px-7 py-3.5 rounded-xl transition shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating Route...</span>
                      </>
                    ) : (
                      <>
                        <span>Generate Itinerary</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
