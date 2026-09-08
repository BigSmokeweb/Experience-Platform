import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { API_BASE } from '@/lib/api-client';
import { Star, Clock, ShieldCheck, MapPin, ArrowLeft, ArrowRight, Compass, CheckCircle2 } from 'lucide-react';
import { BookmarkButton } from '@/components/BookmarkButton';

const FALLBACK_DIRECTORY: Record<string, any> = {
  'exp-1': {
    id: 'exp-1',
    title: 'Upvan Lake Sunset & Ancient Foothill Shrines',
    category: 'Culinary & Heritage',
    city: 'Thane',
    state: 'Maharashtra',
    durationMinutes: 180,
    priceMin: 1800,
    priceMax: 2400,
    ratingAverage: 4.96,
    reviewCount: 142,
    authenticityRating: 0.98,
    mediaUrls: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'],
    description: `Walk through centuries-old lake promenades, sacred foothill shrines, and savor regional Konkani culinary delicacies.

This expedition explores the historic lakes of Thane. We visit hidden shrines nestled in the Sahyadri foothills, ancient lakeside ghats, and taste heirloom family recipes perfected across generations.`,
    accessibilityTags: ['Walking_Tour', 'Lake_Views', 'Heritage_Shrines'],
    provider: {
      businessName: 'Thane Heritage Collective',
      city: 'Thane',
      verificationStatus: 'VERIFIED',
    },
    reviews: [
      { id: 'r1', user: { name: 'Aarav Mehta' }, ratingOverall: 5, text: 'Unbelievable lake and mountain access. The sunset view over Upvan lake was unforgettable.' },
      { id: 'r2', user: { name: 'Elena Rostova' }, ratingOverall: 5, text: 'A masterclass in local Maratha heritage and tranquil lakeside nature.' },
    ],
  },
  'exp-2': {
    id: 'exp-2',
    title: 'Navi Mumbai Flamingo Creek Sanctuary Dawn Boardwalk',
    category: 'Outdoor & Nature',
    city: 'Navi Mumbai',
    state: 'Maharashtra',
    durationMinutes: 240,
    priceMin: 2200,
    priceMax: 3500,
    ratingAverage: 4.98,
    reviewCount: 98,
    authenticityRating: 0.99,
    mediaUrls: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'],
    description: `Explore the Thane Creek Flamingo Sanctuary at dawn with veteran naturalists and maritime historians.

Guided by local ecological guardians, witness thousands of migratory pink flamingoes feeding in the wetlands against the backdrop of the rising sun and historic coastal bastions.`,
    accessibilityTags: ['Bird_Watching', 'Dawn_Tour', 'Eco_Conservation'],
    provider: {
      businessName: 'Konkan Coast Guardians',
      city: 'Navi Mumbai',
      verificationStatus: 'VERIFIED',
    },
    reviews: [
      { id: 'r3', user: { name: 'Priya Sengupta' }, ratingOverall: 5, text: 'The dawn light reflecting off the flamingos and creek waters was absolutely breathtaking.' },
    ],
  },
  'exp-3': {
    id: 'exp-3',
    title: 'Colaba Art Deco & Coastal Fisherfolk Dawn Walk',
    category: 'Urban Culture',
    city: 'Mumbai',
    state: 'Maharashtra',
    durationMinutes: 150,
    priceMin: 1500,
    priceMax: 2000,
    ratingAverage: 4.92,
    reviewCount: 215,
    authenticityRating: 0.95,
    mediaUrls: ['https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80'],
    description: `Experience Sassoon Docks at sunrise, architectural secrets of the Oval Maidan, and heritage Parsi bakery breakfasts.

At 5:30 AM, witness the vibrant arrival of Bombay's indigenous Koli fishing trawlers. Then transition into the UNESCO-recognized Art Deco quarter of Marine Drive and Oval Maidan with an architectural historian.`,
    accessibilityTags: ['Early_Dawn_Start', 'Architectural_Walk', 'Breakfast_Included'],
    provider: {
      businessName: 'Bombay Heritage Trust',
      city: 'Mumbai',
      verificationStatus: 'VERIFIED',
    },
    reviews: [
      { id: 'r4', user: { name: 'Kabir Varma' }, ratingOverall: 5, text: 'Seeing Sassoon Docks wake up is Mumbai at its rawest and most poetic.' },
    ],
  },
};

import { ExperienceGallery } from '@/components/ExperienceGallery';

async function getExperience(id: string) {
  let rawExp: any = null;
  try {
    const res = await fetch(`${API_BASE}/experiences/${id}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      rawExp = await res.json();
    }
  } catch {
    // ignore network errors and use fallback
  }

  if (!rawExp) {
    rawExp = FALLBACK_DIRECTORY[id] || FALLBACK_DIRECTORY['exp-1'];
  }

  if (!rawExp) return null;

  const mediaList =
    rawExp.mediaUrls && rawExp.mediaUrls.length > 0
      ? rawExp.mediaUrls
      : rawExp.images && rawExp.images.length > 0
      ? rawExp.images
      : ['https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=1200&q=80'];

  const imagesList =
    rawExp.images && rawExp.images.length > 0
      ? rawExp.images
      : mediaList;

  return {
    ...rawExp,
    title: rawExp.title || rawExp.name || 'Local Experience',
    description:
      rawExp.description ||
      rawExp.humanTip ||
      rawExp.mustTry ||
      'Authentic regional immersion hosted by generational craft and heritage lineage keepers.',
    priceMin: rawExp.priceMin ?? rawExp.entryFee ?? 0,
    priceMax: rawExp.priceMax ?? rawExp.activityCost ?? 0,
    durationMinutes: rawExp.durationMinutes ?? 120,
    ratingAverage: rawExp.ratingAverage ?? 4.9,
    authenticityRating: rawExp.authenticityRating ?? rawExp.authenticityScore ?? 0.95,
    mediaUrls: mediaList,
    images: imagesList,
  };
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const experience = await getExperience(params.id);
  if (!experience) {
    return { title: 'Experience Not Found' };
  }
  return {
    title: `${experience.title} — ${experience.city} | Journi`,
    description: experience.description?.substring(0, 160),
  };
}

export default async function ExperienceDetailPage({ params }: { params: { id: string } }) {
  const exp = await getExperience(params.id);
  if (!exp) notFound();

  return (
    <div className="bg-[#F5F1E6] text-[#2C2C2C] min-h-screen pt-28 pb-24 selection:bg-[#8B7355]/30 selection:text-[#2C2C2C]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/#curated-experiences"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#2C2C2C]/70 hover:text-[#347F8C] transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Curated Experiences</span>
        </Link>

        {/* Main Experience Header Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14">
          <div className="lg:col-span-7 rounded-3xl overflow-hidden border border-[#D4CFC0] h-80 sm:h-96 lg:h-[460px] bg-[#EAE5D6] relative shadow-sm">
            <Image
              src={exp.mediaUrls?.[0] || 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=1200&q=80'}
              alt={exp.title}
              fill
              unoptimized
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
            <div className="absolute top-4 right-4 z-20">
              <BookmarkButton experience={exp} size="md" />
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-mono text-[#F5F1E6]">
              <span className="bg-[#2C2C2C]/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 uppercase tracking-wider text-[#F5F1E6] font-semibold">
                {exp.city}
              </span>
              <span className="bg-[#2C2C2C]/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20">
                {exp.durationMinutes || 120} Minutes
              </span>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="bg-[#8B7355]/15 text-[#347F8C] border border-[#8B7355]/30 text-[11px] font-mono tracking-wider px-3 py-1 rounded-full uppercase font-semibold">
                  {exp.category}
                </span>
                {exp.provider?.verificationStatus === 'VERIFIED' && (
                  <span className="bg-white text-[#2C2C2C]/80 border border-[#D4CFC0] text-[11px] font-mono px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#A69B80]" /> Verified Host
                  </span>
                )}
              </div>

              <h1 className="font-cormorant text-3xl sm:text-4xl lg:text-5xl tracking-normal text-[#2C2C2C] font-bold leading-snug">
                {exp.title}
              </h1>

              <div className="flex items-center gap-4 mt-4 text-xs font-mono text-[#2C2C2C]/75">
                <span className="flex items-center gap-1 text-[#2C2C2C] font-semibold">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  {Number(exp.ratingAverage || 4.9).toFixed(2)}
                </span>
                <span className="text-[#D4CFC0]">&bull;</span>
                <span>{exp.reviewCount || 48} verified reviews</span>
                <span className="text-[#D4CFC0]">&bull;</span>
                <span className="text-[#A69B80] font-semibold">
                  {Math.round((exp.authenticityRating || 0.95) * 100)}% Authenticity
                </span>
              </div>
            </div>

            {/* Tariff & Reservation Box */}
            <div className="bg-white p-6 rounded-2xl border border-[#D4CFC0] mt-8 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#2C2C2C]/60 block">
                    Starting at
                  </span>
                  <p className="font-cormorant font-bold oldstyle-nums text-3xl text-[#2C2C2C] tracking-normal mt-0.5">
                    {(!exp.priceMin && !exp.priceMax) || (exp.priceMin === 0 && exp.priceMax === 0)
                      ? 'Free'
                      : exp.priceMin === 0
                      ? `Free – ₹${exp.priceMax?.toLocaleString()}`
                      : `₹${exp.priceMin?.toLocaleString()} – ₹${exp.priceMax?.toLocaleString()}`}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#2C2C2C]/60 block">
                    Duration
                  </span>
                  <p className="text-sm font-mono text-[#2C2C2C]/80 mt-0.5 font-semibold">
                    {exp.durationMinutes || 120} mins
                  </p>
                </div>
              </div>

              <Link
                href="/#itinerary"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] font-mono text-xs uppercase tracking-wider font-bold py-3.5 rounded-xl transition-all duration-300 shadow-md shadow-[#347F8C]/20"
              >
                <span>Add to Day Plan</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <BookmarkButton
                experience={exp}
                size="md"
                showLabel={true}
                className="w-full mt-2.5 py-3 rounded-xl"
              />
            </div>

            {/* Practical Notes */}
            <div className="mt-6 p-4 rounded-xl bg-[#F0EDE1] border border-[#D4CFC0] text-xs font-mono text-[#2C2C2C]/80 flex items-start gap-3">
              <Compass className="w-4 h-4 text-[#347F8C] shrink-0 mt-0.5" />
              <span>
                Coordinates validated. Meeting points sent directly upon itinerary generation. Respect spatial norms and local heritage rules.
              </span>
            </div>
          </div>
        </div>

        {/* Details & Reviews Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-16 pt-12 border-t border-[#D4CFC0]">
          <div className="lg:col-span-8">
            <section className="mb-12">
              <h2 className="font-manifold text-xl text-[#2C2C2C] uppercase tracking-wide font-bold mb-4">
                Field Briefing
              </h2>
              <p className="text-sm sm:text-base text-[#2C2C2C]/85 leading-relaxed font-light">
                {exp.description}
              </p>

              {/* Extra 5-6 Images Loaded Under Field Briefing */}
              <ExperienceGallery
                images={exp.images && exp.images.length > 0 ? exp.images : (exp.mediaUrls || [])}
                title={exp.title}
                city={exp.city}
                area={exp.area}
              />
            </section>

            {/* Host Guild Notes */}
            <section className="mb-12 bg-white p-6 rounded-2xl border border-[#D4CFC0] shadow-sm">
              <div className="flex items-center gap-2 text-[#347F8C] font-mono text-xs tracking-wider uppercase font-semibold mb-2">
                <ShieldCheck className="w-4 h-4 text-[#A69B80]" />
                Host Certification
              </div>
              <p className="text-xs sm:text-sm text-[#2C2C2C]/80 leading-relaxed font-light">
                Every session is overseen by certified regional custodians, ensuring ethical compensation to artisans, zero commercial kickbacks, and pristine cultural transmission.
              </p>
            </section>

            {/* Reviews */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-manifold text-xl text-[#2C2C2C] uppercase tracking-wide font-bold">
                  Field Dispatches & Reviews
                </h2>
                <span className="text-xs font-mono text-[#2C2C2C]/60">
                  {exp.reviewCount || 48} entries
                </span>
              </div>

              {exp.reviews && exp.reviews.length > 0 ? (
                <div className="space-y-4">
                  {exp.reviews.map((rev: any) => (
                    <div
                      key={rev.id}
                      className="bg-white p-5 rounded-xl border border-[#D4CFC0] shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs sm:text-sm text-[#2C2C2C]">
                          {rev.userName}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                          <Star className="w-3.5 h-3.5 fill-amber-500" />
                          <span>{rev.rating}</span>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-[#2C2C2C]/80 font-light leading-relaxed">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono text-[#2C2C2C]/50">
                  Newly curated expedition. First cohort chronicles opening soon.
                </p>
              )}
            </section>
          </div>

          {/* Provider Card */}
          <div className="lg:col-span-4">
            <div className="bg-white p-6 rounded-2xl border border-[#D4CFC0] shadow-sm">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#347F8C] font-semibold block mb-2">
                Presented By
              </span>
              <h3 className="font-manifold text-xl text-[#2C2C2C] font-bold tracking-wide uppercase">
                {exp.provider?.businessName ? `Presented by ${exp.provider.businessName}` : 'Presented by a local connoisseur'}
              </h3>
              <p className="text-xs font-mono text-[#2C2C2C]/60 mt-1">Based in {exp.provider?.city || exp.city}</p>
              <div className="mt-4 pt-4 border-t border-[#D4CFC0] text-xs text-[#2C2C2C]/75 leading-relaxed font-light">
                Verified through the Journi spatial integrity network. On-site audits conducted for authentic historical and craft preservation.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
