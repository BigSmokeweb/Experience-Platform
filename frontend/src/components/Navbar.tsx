'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { NearbyCitiesDropdown } from '@/components/NearbyCitiesDropdown';
import { CollectionDrawer } from '@/components/CollectionDrawer';
import { useCollection } from '@/lib/collection-store';

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const { count } = useCollection();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHome = pathname === '/';
  const isDarkNav = isHome && !scrolled;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isDarkNav
          ? 'bg-transparent border-b border-transparent py-4 text-white'
          : 'bg-[#F5F1E6]/95 backdrop-blur-2xl border-b border-[#C4A265] py-2 shadow-md shadow-[#2C2C2C]/5 text-[#2C2C2C]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link
          href="/"
          onClick={(e) => {
            if (isHome) {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="flex items-center space-x-2.5 group"
        >
          <div className={`rounded-lg font-extrabold text-xs flex items-center justify-center transition-all duration-300 group-hover:scale-105 ${
            isDarkNav
              ? 'bg-white text-black shadow-lg shadow-black/20'
              : 'bg-[#2C2C2C] text-[#F5F1E6] shadow-sm shadow-[#2C2C2C]/10'
          } ${scrolled ? 'w-7 h-7 text-[11px]' : 'w-8 h-8 text-xs'}`}>
            C
          </div>
          <span className={`font-manifold uppercase transition-all duration-300 ${
            isDarkNav ? 'text-white' : 'text-[#2C2C2C]'
          } ${scrolled ? 'text-[14px] tracking-[0.11em]' : 'text-base tracking-[0.18em]'}`}>
            Celeste
          </span>
        </Link>

        <nav className="flex items-center space-x-7 text-xs sm:text-sm font-semibold tracking-wider uppercase font-cormorant">
          <Link
            href="/#curated-experiences"
            onClick={(e) => {
              if (isHome) {
                e.preventDefault();
                document.getElementById('curated-experiences')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className={`transition-colors duration-200 ${
              isDarkNav ? 'text-zinc-200 hover:text-white' : 'text-[#2C2C2C]/80 hover:text-[#347F8C]'
            }`}
          >
            The Collection
          </Link>
          <Link
            href="/#itinerary"
            onClick={(e) => {
              if (isHome) {
                e.preventDefault();
                document.getElementById('itinerary')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className={`flex items-center gap-1.5 transition-colors duration-200 ${
              isDarkNav ? 'text-sky-300 hover:text-white' : 'text-[#347F8C] hover:text-[#2A6772]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDarkNav ? 'bg-sky-300' : 'bg-[#347F8C]'}`} />
            Your Journey
          </Link>
          <button
            type="button"
            onClick={() => setIsJournalOpen(true)}
            className={`relative flex items-center gap-1.5 transition-colors duration-200 cursor-pointer ${
              isDarkNav ? 'text-zinc-200 hover:text-white' : 'text-[#2C2C2C]/80 hover:text-[#347F8C]'
            }`}
            title="Open Travel Journal"
          >
            <Bookmark className={`w-3.5 h-3.5 transition-colors ${count > 0 ? 'fill-[#C4A265] text-[#C4A265]' : ''}`} />
            <span>Journal</span>
            {count > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#C4A265] text-[#2C2C2C] text-[9px] font-mono font-bold flex items-center justify-center shadow-xs">
                {count}
              </span>
            )}
          </button>
          <div className="hidden sm:inline-block">
            <NearbyCitiesDropdown isHome={isHome} scrolled={scrolled} />
          </div>
          <Link
            href="/provider/portal"
            className={`transition-colors duration-200 hidden md:inline-block ${
              isDarkNav ? 'text-zinc-200 hover:text-white' : 'text-[#2C2C2C]/80 hover:text-[#347F8C]'
            }`}
          >
            Partner With Us
          </Link>
          <Link
            href="/auth/login"
            className={`px-4 py-1.5 rounded-full font-bold transition-all duration-300 active:scale-95 text-xs shadow-sm ${
              isDarkNav
                ? 'border border-white/30 bg-white/10 hover:bg-white hover:text-black text-white backdrop-blur-sm'
                : 'border border-[#347F8C] bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6]'
            }`}
          >
            Members
          </Link>
        </nav>
      </div>

      {/* Travel Journal Slide-Over Drawer */}
      <CollectionDrawer isOpen={isJournalOpen} onClose={() => setIsJournalOpen(false)} />
    </header>
  );
}
