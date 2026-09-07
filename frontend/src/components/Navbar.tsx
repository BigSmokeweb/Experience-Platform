'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bookmark, User, LogOut, ChevronDown } from 'lucide-react';
import { NearbyCitiesDropdown } from '@/components/NearbyCitiesDropdown';
import { CollectionDrawer } from '@/components/CollectionDrawer';
import { useCollection } from '@/lib/collection-store';

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { count } = useCollection();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('accessToken');
      const name = localStorage.getItem('userName');
      if (token && name) {
        setUserName(name);
      } else {
        setUserName(null);
      }
    };

    checkAuth();
    window.addEventListener('auth-change', checkAuth);
    window.addEventListener('storage', checkAuth);

    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('auth-change', checkAuth);
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('scroll', handleScroll);
    };
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
            href="/#seasonal-goodies"
            onClick={(e) => {
              if (isHome) {
                e.preventDefault();
                document.getElementById('seasonal-goodies')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className={`transition-colors duration-200 ${
              isDarkNav ? 'text-zinc-200 hover:text-white' : 'text-[#2C2C2C]/80 hover:text-[#347F8C]'
            }`}
          >
            Seasonal
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
          {userName ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full font-bold transition-all duration-300 active:scale-95 text-xs shadow-sm cursor-pointer ${
                  isDarkNav
                    ? 'border border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white hover:text-black'
                    : 'border border-[#347F8C] bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6]'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-mono uppercase font-bold">
                  {userName.charAt(0)}
                </span>
                <span className="max-w-[90px] truncate">{userName}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-[#D4CFC0] p-1.5 text-[#2C2C2C] z-50 animate-in fade-in duration-200">
                  <div className="px-3 py-2 border-b border-[#D4CFC0]/50 text-[11px] font-mono text-[#2C2C2C]/60 truncate">
                    Signed in as <b className="text-[#2C2C2C] block truncate">{userName}</b>
                  </div>
                  <Link
                    href="/trip"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-[#F5F1E6] transition font-mono"
                  >
                    <User className="w-3.5 h-3.5 text-[#347F8C]" />
                    <span>My Journey</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('accessToken');
                      localStorage.removeItem('refreshToken');
                      localStorage.removeItem('userRole');
                      localStorage.removeItem('userName');
                      localStorage.removeItem('userEmail');
                      window.dispatchEvent(new Event('auth-change'));
                      setIsUserMenuOpen(false);
                      window.location.href = '/auth/login';
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 rounded-xl hover:bg-red-50 transition font-mono cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className={`px-4 py-1.5 rounded-full font-bold transition-all duration-300 active:scale-95 text-xs shadow-sm ${
                isDarkNav
                  ? 'border border-white/30 bg-white/10 hover:bg-white hover:text-black text-white backdrop-blur-sm'
                  : 'border border-[#347F8C] bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6]'
              }`}
            >
              Login
            </Link>
          )}
        </nav>
      </div>

      {/* Travel Journal Slide-Over Drawer */}
      <CollectionDrawer isOpen={isJournalOpen} onClose={() => setIsJournalOpen(false)} />
    </header>
  );
}
