'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  MapPin, 
  Navigation, 
  ChevronDown, 
  Sparkles, 
  ArrowRight, 
  Compass, 
  X, 
  LocateFixed, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { CitiesLeafletMap } from '@/components/CitiesLeafletMap';

export interface CityData {
  slug: string;
  name: string;
  state: string;
  tagline: string;
  lat: number;
  lng: number;
  image: string;
  experienceCount: number;
  vibe: string;
}

export const CITIES_REGISTRY: CityData[] = [
  {
    slug: 'mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    tagline: 'Art Deco Coastal Enclaves, Sassoon Docks & Irani Cafes',
    lat: 18.9445,
    lng: 72.8210,
    image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=600&q=80',
    experienceCount: 215,
    vibe: 'Coastal & Urban Culture',
  },
  {
    slug: 'navi-mumbai',
    name: 'Navi Mumbai',
    state: 'Maharashtra',
    tagline: 'Flamingo Sanctuaries, Belapur Fort & Waterfront Parks',
    lat: 19.0330,
    lng: 73.0297,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    experienceCount: 30,
    vibe: 'Creek Views & Nature Trails',
  },
  {
    slug: 'thane',
    name: 'Thane',
    state: 'Maharashtra',
    tagline: 'City of Lakes, Upvan Promenades & Ancient Shrines',
    lat: 19.2183,
    lng: 72.9781,
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    experienceCount: 32,
    vibe: 'Lakes & Hill Foothills',
  },
  {
    slug: 'panvel',
    name: 'Panvel',
    state: 'Maharashtra',
    tagline: 'Monsoon Waterfalls, Historic Forts & Highway Dhabas',
    lat: 18.9894,
    lng: 73.1175,
    image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80',
    experienceCount: 39,
    vibe: 'Waterfalls & Heritage Trails',
  },
  {
    slug: 'kalyan-dombivli',
    name: 'Kalyan-Dombivli',
    state: 'Maharashtra',
    tagline: 'Ganesh Ghat Riverfronts, Malvani Seafood & Hidden Lakes',
    lat: 19.2211,
    lng: 73.0919,
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
    experienceCount: 30,
    vibe: 'Riverside & Culinary Katta',
  },
  {
    slug: 'powai',
    name: 'Powai',
    state: 'Maharashtra',
    tagline: 'Lake Promenades, Lakeside Bistros & High-Tech Cafes',
    lat: 19.1197,
    lng: 72.9051,
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80',
    experienceCount: 28,
    vibe: 'Lakeside & Contemporary',
  },
  {
    slug: 'kanjur-marg',
    name: 'Kanjur Marg',
    state: 'Maharashtra',
    tagline: 'Local Food Trails, Ancient Shrines & Green Parks',
    lat: 19.1300,
    lng: 72.9300,
    image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&q=80',
    experienceCount: 15,
    vibe: 'Local Enclaves & Shrines',
  },
];

// Haversine formula to compute great-circle distance in kilometers
function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

interface NearbyCitiesDropdownProps {
  isHome: boolean;
  scrolled: boolean;
}

export function NearbyCitiesDropdown({ isHome, scrolled }: NearbyCitiesDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');
  const [selectedCitySlug, setSelectedCitySlug] = useState<string>('mumbai');
  const [lockedCitySlug, setLockedCitySlug] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Request browser geolocation
  const detectLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationStatus('Geolocation not supported by your browser');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Pinpointing your coordinates...');
    setLocationDenied(false);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsLocating(false);
        setLocationStatus('Location locked & distances calibrated');
      },
      (err) => {
        setIsLocating(false);
        setLocationDenied(true);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus('Location access was denied. Showing all regional hubs.');
        } else {
          setLocationStatus('Could not determine exact location. Showing regional hubs.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  };

  // When opening dropdown for the first time, auto-detect location if not already detected
  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState && !userCoords && !isLocating && !locationDenied) {
      detectLocation();
    }
  };

  // Close on escape key and outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Compute distances & sort cities by proximity (memoized so map instance is not torn down on selection)
  const sortedCities = useMemo(() => {
    return [...CITIES_REGISTRY].map((city) => {
      const distanceKm = userCoords
        ? calculateHaversineDistanceKm(userCoords.lat, userCoords.lng, city.lat, city.lng)
        : null;
      return {
        ...city,
        distanceKm,
      };
    }).sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) {
        return a.distanceKm - b.distanceKm;
      }
      return 0;
    });
  }, [userCoords]);

  const nearestCity = sortedCities.length > 0 && sortedCities[0].distanceKm !== null ? sortedCities[0] : null;

  // Auto-select closest city if calibrated and no city has been explicitly chosen
  useEffect(() => {
    if (nearestCity && !lockedCitySlug) {
      setSelectedCitySlug(nearestCity.slug);
    }
  }, [nearestCity?.slug, lockedCitySlug]);

  const activeCity = sortedCities.find((c) => c.slug === selectedCitySlug) || sortedCities[0];

  const MMR_SLUGS = ['mumbai', 'thane', 'navi-mumbai', 'powai', 'panvel', 'kalyan-dombivli', 'kanjur-marg'];
  const isMmrActive = MMR_SLUGS.includes(selectedCitySlug);

  const mmrCities = sortedCities.filter((c) => MMR_SLUGS.includes(c.slug));

  const isDark = isHome && !scrolled;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Navbar Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`flex items-center gap-1.5 transition-all duration-200 py-1 px-2 rounded-lg cursor-pointer ${
          isOpen
            ? isDark
              ? 'bg-white/20 text-white shadow-sm'
              : 'bg-[#347F8C]/15 text-[#347F8C]'
            : isDark
            ? 'text-zinc-200 hover:text-white hover:bg-white/10'
            : 'text-[#2C2C2C]/80 hover:text-[#347F8C] hover:bg-[#347F8C]/10'
        }`}
      >
        <MapPin className={`w-3.5 h-3.5 ${userCoords ? 'text-[#C4A265]' : isDark ? 'text-sky-300' : 'text-[#347F8C]'}`} />
        <span>Cities</span>
        {userCoords && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#C4A265] animate-pulse" />
        )}
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-zinc-300' : 'text-[#2C2C2C]/60'}`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-[360px] sm:w-[480px] bg-[#F5F1E6] border border-[#C4A265] rounded-2xl shadow-2xl shadow-[#2C2C2C]/20 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 text-[#2C2C2C]">
          {/* Header */}
          <div className="p-3.5 bg-white/75 border-b border-[#C4A265] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#347F8C]/10 flex items-center justify-center text-[#347F8C] shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-manifold text-xs uppercase tracking-wider font-bold text-[#2C2C2C] flex items-center gap-1.5">
                  Regional Hubs
                  {userCoords && (
                    <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                      GPS Locked
                    </span>
                  )}
                </h3>
                <p className="text-[10px] font-mono text-[#5C6460]">
                  {isLocating
                    ? 'Determining your coordinates...'
                    : userCoords
                    ? `Calibrated from your location`
                    : 'Antique cartography of India'}
                </p>
              </div>
            </div>

            {/* Header Right: Tab Switcher & Locate Button */}
            <div className="flex items-center gap-2">
              {/* Tab Switcher */}
              <div className="flex items-center bg-[#EAE5D6] p-0.5 rounded-lg border border-[#D4CFC0]">
                <button
                  type="button"
                  onClick={() => setActiveTab('map')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'map'
                      ? 'bg-[#347F8C] text-[#F5F1E6] shadow-xs'
                      : 'text-[#5C6460] hover:text-[#2C2C2C]'
                  }`}
                >
                  Map
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'list'
                      ? 'bg-[#347F8C] text-[#F5F1E6] shadow-xs'
                      : 'text-[#5C6460] hover:text-[#2C2C2C]'
                  }`}
                >
                  List
                </button>
              </div>

              {/* Refresh / Re-locate Button */}
              <button
                type="button"
                onClick={detectLocation}
                disabled={isLocating}
                title="Recalculate GPS location"
                className="p-1.5 rounded-lg border border-[#D4CFC0] hover:border-[#347F8C] hover:bg-white transition-all text-[#347F8C] active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Location Status Notice */}
          {locationStatus && (
            <div className={`px-4 py-1.5 text-[10px] font-mono flex items-center gap-1.5 border-b border-[#C4A265] ${
              locationDenied 
                ? 'bg-amber-50/80 text-amber-800' 
                : userCoords 
                ? 'bg-emerald-50/80 text-emerald-800' 
                : 'bg-sky-50/80 text-sky-800'
            }`}>
              {locationDenied ? (
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              ) : userCoords ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              ) : (
                <Navigation className="w-3.5 h-3.5 shrink-0 animate-pulse text-sky-600" />
              )}
              <span className="truncate">{locationStatus}</span>
            </div>
          )}

          {/* ──────────────── TAB 1: MODERN VECTOR MAP WITH CITY OUTLINES ──────────────── */}
          {activeTab === 'map' && (
            <div>
              {/* Real OpenStreetMap Leaflet Map with Highlighted Maharashtra City Areas */}
              <CitiesLeafletMap
                cities={sortedCities}
                selectedCitySlug={selectedCitySlug}
                lockedCitySlug={lockedCitySlug}
                onSelectCity={(slug) => {
                  setLockedCitySlug(slug);
                  setSelectedCitySlug(slug);
                }}
                onCityClick={(slug) => {
                  setLockedCitySlug(slug);
                  setSelectedCitySlug(slug);
                }}
                onCityHover={(slug) => {
                  if (!lockedCitySlug) {
                    setSelectedCitySlug(slug);
                  }
                }}
              />

              {/* ─── Maharashtra City Fast Chips Bar ─── */}
              <div className="px-3 pt-2.5 pb-1 bg-white/80 border-b border-[#D4CFC0] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#5C6460] font-bold shrink-0 mr-1">
                  Cities:
                </span>
                {sortedCities.map((city) => (
                  <button
                    key={city.slug}
                    type="button"
                    onClick={() => {
                      setLockedCitySlug(city.slug);
                      setSelectedCitySlug(city.slug);
                    }}
                    onMouseEnter={() => {
                      if (!lockedCitySlug) {
                        setSelectedCitySlug(city.slug);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium transition-all shrink-0 cursor-pointer ${
                      selectedCitySlug === city.slug
                        ? 'bg-[#347F8C] text-[#F5F1E6] font-bold shadow-xs'
                        : 'bg-[#EAE5D6]/80 text-[#2C2C2C] hover:bg-[#D4CFC0]'
                    }`}
                  >
                    {city.name}
                  </button>
                ))}
              </div>

              {/* ─── Selected City Passport Card Preview ─── */}
              <div className="p-3 bg-white/90">
                <div className="flex items-center gap-3">
                  {/* City Thumbnail */}
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-stone-200 border border-[#D4CFC0]">
                    <Image
                      src={activeCity.image}
                      alt={activeCity.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <span className="absolute bottom-1 left-1.5 text-[9px] font-mono text-white font-bold uppercase">
                      {activeCity.state}
                    </span>
                  </div>

                  {/* City Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-edu-cursive font-normal text-xl text-[#2C2C2C] tracking-wide leading-tight truncate">
                        {activeCity.name}
                      </h4>
                      {activeCity.distanceKm !== null ? (
                        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded shrink-0 ${
                          activeCity.distanceKm < 25
                            ? 'bg-[#A69B80]/20 text-[#2D5A27]'
                            : 'bg-[#D4CFC0]/50 text-[#5C6460]'
                        }`}>
                          {activeCity.distanceKm < 25 ? '📍 In Area' : `~${activeCity.distanceKm} km`}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-[#5C6460]/70 shrink-0">
                          Regional Hub
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[#5C6460] line-clamp-1 font-light mt-0.5">
                      {activeCity.tagline}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#EAE5D6]">
                      <span className="text-[10px] font-mono text-[#347F8C] font-semibold">
                        {activeCity.experienceCount}+ curated experiences
                      </span>

                      <Link
                        href={`/cities/${activeCity.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider font-bold text-[#F5F1E6] bg-[#347F8C] hover:bg-[#2A6772] px-2.5 py-1 rounded-lg transition-all shadow-xs active:scale-95"
                      >
                        <span>Explore {activeCity.name}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── TAB 2: DIRECTORY LIST VIEW ──────────────── */}
          {activeTab === 'list' && (
            <div>
              {/* Nearest Highlight Banner */}
              {nearestCity && nearestCity.distanceKm !== null && (
                <div className="mx-3 mt-3 p-2.5 rounded-xl bg-gradient-to-r from-[#347F8C]/15 to-[#A69B80]/15 border border-[#347F8C]/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider font-bold text-[#347F8C] bg-white px-2 py-0.5 rounded-full shadow-2xs">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Closest to you
                    </span>
                    <span className="font-edu-cursive font-normal text-lg text-[#2C2C2C] leading-none">
                      {nearestCity.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-[#347F8C] bg-white/80 px-2 py-0.5 rounded-md border border-[#347F8C]/20">
                    {nearestCity.distanceKm < 25 ? 'In your area' : `~${nearestCity.distanceKm} km`}
                  </span>
                </div>
              )}

              {/* Cities List */}
              <div className="p-3 space-y-2 max-h-[360px] overflow-y-auto">
                {sortedCities.map((city, idx) => {
                  const isClosest = idx === 0 && city.distanceKm !== null;
                  return (
                    <Link
                      key={city.slug}
                      href={`/cities/${city.slug}`}
                      onClick={() => setIsOpen(false)}
                      className={`group relative flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 bg-white hover:shadow-md ${
                        isClosest
                          ? 'border-[#347F8C]/40 hover:border-[#347F8C]'
                          : 'border-[#D4CFC0] hover:border-[#2C2C2C]/30'
                      }`}
                    >
                      {/* City Thumbnail */}
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-stone-200">
                        <Image
                          src={city.image}
                          alt={city.name}
                          fill
                          sizes="56px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                      </div>

                      {/* City Details */}
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-edu-cursive font-normal text-lg tracking-wide text-[#2C2C2C] group-hover:text-[#347F8C] transition-colors leading-tight">
                              {city.name}
                            </span>
                            <span className="text-[10px] font-mono text-[#5C6460]/80">
                              {city.state}
                            </span>
                          </div>

                          {/* Distance Pill */}
                          {city.distanceKm !== null ? (
                            <span
                              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                                isClosest
                                  ? 'bg-[#A69B80]/20 text-[#2D5A27]'
                                  : 'bg-[#D4CFC0]/40 text-[#5C6460]'
                              }`}
                            >
                              {city.distanceKm < 25 ? '📍 In City' : `~${city.distanceKm} km`}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-[#5C6460]/70">
                              Regional Hub
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-[#5C6460] line-clamp-1 font-light leading-snug">
                          {city.tagline}
                        </p>

                        <div className="flex items-center gap-2.5 mt-1 text-[10px] font-mono text-[#2C2C2C]/70">
                          <span className="text-[#347F8C] font-semibold">
                            {city.experienceCount}+ experiences
                          </span>
                          <span>&bull;</span>
                          <span>{city.vibe}</span>
                        </div>
                      </div>

                      {/* Arrow Icon */}
                      <ArrowRight className="w-4 h-4 text-[#5C6460]/40 group-hover:text-[#347F8C] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Note & Quick Action */}
          <div className="p-3 bg-white/70 border-t border-[#D4CFC0] flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#5C6460] text-[10px]">
              {userCoords ? 'GPS distances calibrated' : 'Click ⌖ to calibrate distances'}
            </span>
            <Link
              href="/explore"
              onClick={() => setIsOpen(false)}
              className="font-bold text-[#347F8C] hover:text-[#2A6772] hover:underline flex items-center gap-1 text-[11px]"
            >
              <span>Browse All India</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
