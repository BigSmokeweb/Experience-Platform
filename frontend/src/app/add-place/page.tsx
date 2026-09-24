'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChefHat,
  Landmark,
  Compass,
  Gem,
  Moon,
  CalendarDays,
  Scissors,
  ShoppingBag,
  MapPin,
  LocateFixed,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Camera,
  X,
  Store,
  Compass as CompassIcon,
} from 'lucide-react';
import { Category } from '@experience-platform/shared';
import { API_BASE, trySilentRefreshToken } from '@/lib/api-client';

const CATEGORIES: { value: Category; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: Category.FOOD, label: 'Food & Culinary', icon: ChefHat },
  { value: Category.CULTURE, label: 'Culture & Heritage', icon: Landmark },
  { value: Category.ADVENTURE, label: 'Adventure', icon: Compass },
  { value: Category.HIDDEN_GEMS, label: 'Hidden Gems', icon: Gem },
  { value: Category.NIGHTLIFE, label: 'Nightlife', icon: Moon },
  { value: Category.EVENTS, label: 'Events & Fairs', icon: CalendarDays },
  { value: Category.WORKSHOPS, label: 'Workshops & Crafts', icon: Scissors },
  { value: Category.SHOPPING, label: 'Shopping & Bazaars', icon: ShoppingBag },
];

const COST_TIERS = [
  { value: 'FREE', label: 'Free', hint: 'No fee' },
  { value: 'BUDGET', label: '₹', hint: 'Budget (under ₹500)' },
  { value: 'MODERATE', label: '₹₹', hint: 'Moderate (₹500 - 1.5k)' },
  { value: 'PREMIUM', label: '₹₹₹', hint: 'Premium (₹1.5k+)' },
] as const;

export default function AddPlacePage() {
  const router = useRouter();

  // Authentication state
  const [token, setToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>(Category.FOOD);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [costTier, setCostTier] = useState<'FREE' | 'BUDGET' | 'MODERATE' | 'PREMIUM'>('MODERATE');
  const [isOwner, setIsOwner] = useState(false);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ message: string; published: boolean; id: string } | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      let t = localStorage.getItem('accessToken');
      if (!t) {
        t = await trySilentRefreshToken();
      }
      setToken(t);
      setAuthChecked(true);
    };
    checkToken();
  }, []);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 1e6) / 1e6;
        const lng = Math.round(pos.coords.longitude * 1e6) / 1e6;
        setLatitude(lat);
        setLongitude(lng);

        // Reverse geocode via OpenStreetMap Nominatim
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
            headers: { 'User-Agent': 'JourniApp/1.0' },
          });
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const detectedCity = addr.city || addr.town || addr.village || addr.suburb || addr.state_district || 'Mumbai';
            const detectedState = addr.state || 'Maharashtra';
            const formattedRoad = [addr.road, addr.neighbourhood, addr.suburb].filter(Boolean).join(', ') || data.display_name?.split(',')[0] || '';
            
            if (formattedRoad) setAddress(formattedRoad);
            if (detectedCity) setCity(detectedCity);
            if (detectedState) setState(detectedState);
          }
        } catch {
          // Fallback defaults
          if (!city) setCity('Mumbai');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setError(`Location access denied: ${err.message}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      router.push(`/auth/login?redirect=/add-place`);
      return;
    }

    if (!title.trim() || title.trim().length < 3) {
      setError('Please provide a name of at least 3 characters.');
      return;
    }

    if (!address.trim() || !city.trim()) {
      setError('Please provide the street address and city.');
      return;
    }

    if (latitude === null || longitude === null) {
      setError('Please pinpoint the location using "Use my current location" or specify coordinates.');
      return;
    }

    if (description.trim().length < 20) {
      setError(`Please tell us a bit more about why this place is worth visiting (minimum 20 characters, currently ${description.trim().length}).`);
      return;
    }

    setSubmitting(true);

    try {
      let activeToken = token;
      let res = await fetch(`${API_BASE}/experiences/add-place`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          category,
          address: address.trim(),
          city: city.trim(),
          state: state.trim() || 'Maharashtra',
          latitude,
          longitude,
          description: description.trim(),
          photoUrl: photoUrl.trim() || null,
          costTier,
          isOwner,
        }),
      });

      if (res.status === 401) {
        const refreshed = await trySilentRefreshToken();
        if (refreshed) {
          activeToken = refreshed;
          res = await fetch(`${API_BASE}/experiences/add-place`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${activeToken}`,
            },
            body: JSON.stringify({
              title: title.trim(),
              category,
              address: address.trim(),
              city: city.trim(),
              state: state.trim() || 'Maharashtra',
              latitude,
              longitude,
              description: description.trim(),
              photoUrl: photoUrl.trim() || null,
              costTier,
              isOwner,
            }),
          });
        }
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Submission failed (${res.status})`);
      }

      const data = await res.json();
      setSuccessData({
        id: data.id,
        published: Boolean(data.published),
        message: data.message || (isOwner ? 'Your business is now listed!' : 'Place submitted for curation!'),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to submit place. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1E6] text-[#2C2C2C] pt-24 sm:pt-28 pb-20 selection:bg-[#347F8C]/20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        
        {/* Top Back Nav */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#5C6460] hover:text-[#2C2C2C] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Explore</span>
          </Link>
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#347F8C] font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Community Spot Submission</span>
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-3xl border border-[#D4CFC0] p-6 sm:p-10 shadow-lg shadow-[#1A2536]/5">
          {successData ? (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="font-manifold text-2xl sm:text-3xl font-extrabold uppercase tracking-wide text-[#2C2C2C]">
                  {successData.published ? 'Place Published!' : 'Place Submitted!'}
                </h2>
                <p className="text-xs sm:text-sm font-mono text-[#5C6460] mt-2 max-w-md mx-auto leading-relaxed">
                  {successData.message}
                </p>
              </div>

              {successData.published ? (
                <div className="p-4 bg-[#F5F1E6]/60 rounded-2xl border border-[#D4CFC0] text-xs font-mono text-[#2C2C2C]/80 max-w-md mx-auto">
                  <p className="font-bold text-[#347F8C] mb-1">Want to customize hours or take bookings?</p>
                  <p>You can manage availability, accessibility features, and photo galleries anytime in your Host Dashboard.</p>
                </div>
              ) : (
                <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 text-xs font-mono text-amber-900 max-w-md mx-auto">
                  <p className="font-bold mb-1">Curation In Progress</p>
                  <p>Our local editors will verify the spot coordinates and description before featuring it in city discovery guides.</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Link
                  href="/explore"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] font-mono text-xs uppercase tracking-wider font-bold shadow-md shadow-[#347F8C]/20 transition-all"
                >
                  Explore Places
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessData(null);
                    setTitle('');
                    setDescription('');
                    setPhotoUrl('');
                    setAddress('');
                    setLatitude(null);
                    setLongitude(null);
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl border border-[#D4CFC0] bg-white hover:bg-[#F5F1E6] text-[#2C2C2C] font-mono text-xs uppercase tracking-wider font-bold transition-all"
                >
                  Add Another Place
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Header */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#347F8C] font-bold block mb-1">
                  1-Screen Easy Submission
                </span>
                <h1 className="font-manifold text-3xl sm:text-4xl text-[#2C2C2C] font-extrabold uppercase tracking-wide">
                  Add a Place
                </h1>
                <p className="text-xs sm:text-sm font-mono text-[#5C6460] mt-1.5 leading-relaxed">
                  Discovered an authentic hidden gem? Or run your own local business? Add it here in 60 seconds.
                </p>
              </div>

              {/* Login Warning if not logged in */}
              {authChecked && !token && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-mono text-amber-900 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Account required to submit</p>
                    <p>
                      Please{' '}
                      <Link href="/auth/login?redirect=/add-place" className="underline font-bold text-amber-800">
                        sign in
                      </Link>{' '}
                      or{' '}
                      <Link href="/auth/register?redirect=/add-place" className="underline font-bold text-amber-800">
                        create an account
                      </Link>{' '}
                      to record your place contribution.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Notice */}
              {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-mono text-red-700 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. What did you find? */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#347F8C] font-bold mb-2">
                  What did you find? <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Best Vada Pav Stall near Thane Station, Ancient Stepwell Walk"
                  className="w-full text-sm font-mono bg-[#F5F1E6]/50 border border-[#D4CFC0] rounded-2xl p-4 text-[#2C2C2C] placeholder-[#2C2C2C]/35 focus:outline-none focus:border-[#347F8C] focus:bg-white transition-all"
                />
              </div>

              {/* 2. What kind of place is it? */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#347F8C] font-bold mb-2.5">
                  What kind of place is it? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {CATEGORIES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCategory(value)}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-center transition-all ${
                        category === value
                          ? 'border-[#347F8C] bg-[#347F8C]/15 text-[#347F8C] shadow-sm font-bold scale-[1.02]'
                          : 'border-[#D4CFC0] bg-white hover:border-[#347F8C]/40 hover:bg-[#F5F1E6]/40 text-[#2C2C2C]/75'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${category === value ? 'text-[#347F8C]' : 'text-[#5C6460]'}`} />
                      <span className="text-[11px] font-mono leading-tight">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Where is it? */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                  <label className="text-xs font-mono uppercase tracking-widest text-[#347F8C] font-bold">
                    Where is it? <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={locating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-white bg-[#347F8C] hover:bg-[#2A6772] disabled:opacity-50 rounded-xl transition shadow-sm w-fit"
                  >
                    <LocateFixed className="w-3.5 h-3.5" />
                    <span>{locating ? 'Locating...' : 'Use my current location'}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address, landmark, or neighborhood"
                    className="w-full text-sm font-mono bg-[#F5F1E6]/50 border border-[#D4CFC0] rounded-2xl p-4 text-[#2C2C2C] placeholder-[#2C2C2C]/35 focus:outline-none focus:border-[#347F8C] focus:bg-white transition-all"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City (e.g. Mumbai, Thane, Pune)"
                      className="w-full text-sm font-mono bg-[#F5F1E6]/50 border border-[#D4CFC0] rounded-2xl p-3.5 text-[#2C2C2C] placeholder-[#2C2C2C]/35 focus:outline-none focus:border-[#347F8C] focus:bg-white transition-all"
                    />
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="State (e.g. Maharashtra)"
                      className="w-full text-sm font-mono bg-[#F5F1E6]/50 border border-[#D4CFC0] rounded-2xl p-3.5 text-[#2C2C2C] placeholder-[#2C2C2C]/35 focus:outline-none focus:border-[#347F8C] focus:bg-white transition-all"
                    />
                  </div>

                  {/* Lat / Lng inputs or status badge */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-[#5C6460]">
                    {latitude !== null && longitude !== null ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Coordinates: {latitude}, {longitude}
                      </span>
                    ) : (
                      <span className="text-[#2C2C2C]/60 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" />
                        Tap &quot;Use my current location&quot; or enter coordinates below
                      </span>
                    )}
                  </div>

                  <details className="text-xs font-mono text-[#5C6460] pt-1">
                    <summary className="cursor-pointer hover:text-[#347F8C] transition">
                      Manual Latitude & Longitude (Optional override)
                    </summary>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <input
                        type="number"
                        step="any"
                        value={latitude ?? ''}
                        onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Latitude (e.g. 19.0760)"
                        className="w-full text-xs font-mono bg-[#F5F1E6]/60 border border-[#D4CFC0] rounded-xl p-3 text-[#2C2C2C]"
                      />
                      <input
                        type="number"
                        step="any"
                        value={longitude ?? ''}
                        onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Longitude (e.g. 72.8777)"
                        className="w-full text-xs font-mono bg-[#F5F1E6]/60 border border-[#D4CFC0] rounded-xl p-3 text-[#2C2C2C]"
                      />
                    </div>
                  </details>
                </div>
              </div>

              {/* 4. Tell us about it */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono uppercase tracking-widest text-[#347F8C] font-bold">
                    Tell us about it <span className="text-red-500">*</span>
                  </label>
                  <span
                    className={`text-[10px] font-mono ${
                      description.trim().length < 20 ? 'text-amber-600' : 'text-emerald-700 font-semibold'
                    }`}
                  >
                    {description.trim().length} / 20 min chars
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Why is this worth visiting? What makes it unique, delicious, or memorable? (1 to 3 sentences)"
                  className="w-full text-sm font-mono bg-[#F5F1E6]/50 border border-[#D4CFC0] rounded-2xl p-4 text-[#2C2C2C] placeholder-[#2C2C2C]/35 focus:outline-none focus:border-[#347F8C] focus:bg-white transition-all resize-none"
                />
              </div>

              {/* 5. Add a photo (optional) */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#347F8C] font-bold mb-2">
                  Add a photo <span className="text-[#5C6460] font-normal lowercase">(optional)</span>
                </label>

                {photoUrl ? (
                  <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-[#D4CFC0] bg-neutral-100 group">
                    <img src={photoUrl} alt="Spot preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black text-white rounded-full transition shadow-md"
                      title="Remove photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <label className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-mono uppercase tracking-wider text-[#347F8C] border border-[#347F8C]/40 bg-[#347F8C]/10 hover:bg-[#347F8C]/20 rounded-xl cursor-pointer transition shadow-xs">
                      <Camera className="w-4 h-4" />
                      <span>Upload Photo</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>

                    <div className="w-full sm:flex-1">
                      <input
                        type="url"
                        value={photoUrl}
                        onChange={(e) => setPhotoUrl(e.target.value)}
                        placeholder="Or paste an image URL (https://...)"
                        className="w-full text-xs font-mono bg-[#F5F1E6]/50 border border-[#D4CFC0] rounded-xl p-3 text-[#2C2C2C] placeholder-[#2C2C2C]/35 focus:outline-none focus:border-[#347F8C]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 6. Roughly how much does it cost? */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#347F8C] font-bold mb-2">
                  Roughly how much does it cost? <span className="text-[#5C6460] font-normal lowercase">(optional)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {COST_TIERS.map(({ value, label, hint }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCostTier(value)}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        costTier === value
                          ? 'border-[#347F8C] bg-[#347F8C]/15 text-[#347F8C] font-bold shadow-xs'
                          : 'border-[#D4CFC0] bg-white hover:bg-[#F5F1E6]/40 text-[#5C6460]'
                      }`}
                    >
                      <div className="text-sm font-mono font-bold">{label}</div>
                      <div className="text-[10px] font-mono mt-0.5 opacity-80">{hint}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 7. Are you the owner? Toggle */}
              <div className="p-5 rounded-2xl bg-[#F5F1E6]/60 border border-[#D4CFC0] space-y-3">
                <span className="block text-xs font-mono uppercase tracking-widest text-[#347F8C] font-bold">
                  Are you the owner of this place?
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOwner(false)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      !isOwner
                        ? 'border-[#347F8C] bg-white text-[#2C2C2C] shadow-sm font-semibold'
                        : 'border-transparent hover:bg-white/50 text-[#5C6460]'
                    }`}
                  >
                    <CompassIcon className={`w-5 h-5 shrink-0 mt-0.5 ${!isOwner ? 'text-[#347F8C]' : 'text-[#A69B80]'}`} />
                    <div>
                      <div className="text-xs font-mono font-bold">No, I just discovered it</div>
                      <div className="text-[11px] font-mono opacity-80 mt-0.5">Submitted for community review</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOwner(true)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      isOwner
                        ? 'border-[#347F8C] bg-white text-[#2C2C2C] shadow-sm font-semibold'
                        : 'border-transparent hover:bg-white/50 text-[#5C6460]'
                    }`}
                  >
                    <Store className={`w-5 h-5 shrink-0 mt-0.5 ${isOwner ? 'text-[#347F8C]' : 'text-[#A69B80]'}`} />
                    <div>
                      <div className="text-xs font-mono font-bold">Yes, this is my business</div>
                      <div className="text-[11px] font-mono opacity-80 mt-0.5">Auto-listed & registered to your host profile</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-2xl bg-[#347F8C] hover:bg-[#2A6772] disabled:opacity-60 text-[#F5F1E6] font-mono text-sm uppercase tracking-wider font-bold shadow-lg shadow-[#347F8C]/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Place...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{isOwner ? 'Submit & Publish Listing' : 'Submit Place for Review'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
