'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bookmark, User, LogOut, ChevronDown, Compass, Handshake, LogIn, Menu, X } from 'lucide-react';
import { NearbyCitiesDropdown } from '@/components/NearbyCitiesDropdown';
import { CollectionDrawer } from '@/components/CollectionDrawer';
import { useCollection } from '@/lib/collection-store';

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isHome = pathname === '/';
  const isDarkNav = isHome && !scrolled;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none px-3 sm:px-6 pt-3 sm:pt-4">
      {/* Floating Capsule Bar */}
      <div
        className={`pointer-events-auto max-w-6xl mx-auto rounded-full px-4 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-3 sm:gap-4 transition-all duration-300 ${
          isDarkNav
            ? 'bg-transparent text-white'
            : 'bg-[#F5F1E6]/95 backdrop-blur-xl border border-[#C4A265]/40 text-[#2C2C2C] shadow-lg shadow-stone-900/10'
        }`}
      >
        {/* Left: Brand Logo */}
        <Link
          href="/"
          onClick={(e) => {
            if (isHome) {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="flex items-center group shrink-0"
          aria-label="Journi Home"
        >
          <div className="relative h-8 sm:h-9 flex items-center transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/images/Journi-bg-rm.png"
              alt="Journi"
              width={125}
              height={38}
              priority
              className="h-7 sm:h-8 w-auto object-contain drop-shadow-xs"
            />
          </div>
        </Link>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm font-medium">
          <Link
            href="/#curated-experiences"
            onClick={(e) => {
              if (isHome) {
                e.preventDefault();
                document.getElementById('curated-experiences')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className={`px-3.5 py-1.5 rounded-full transition-all duration-200 ${
              isDarkNav
                ? 'text-white/90 hover:text-white hover:bg-white/10'
                : 'text-[#2C2C2C]/80 hover:text-[#1F2937] hover:bg-black/5'
            }`}
          >
            The Collection
          </Link>

          {/* Cities Dropdown */}
          <div className="inline-flex items-center">
            <NearbyCitiesDropdown isHome={isHome} scrolled={scrolled} />
          </div>

          {/* Travel Journal Slide-over trigger */}
          <button
            type="button"
            onClick={() => setIsJournalOpen(true)}
            className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
              isDarkNav
                ? 'text-white/90 hover:text-white hover:bg-white/10'
                : 'text-[#2C2C2C]/80 hover:text-[#1F2937] hover:bg-black/5'
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
        </nav>

        {/* Right: Pill Actions & Mobile Hamburger */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Action 1: Transparent Pill (Plan Journey) */}
          <Link
            href="/#itinerary"
            onClick={(e) => {
              if (isHome) {
                e.preventDefault();
                document.getElementById('itinerary')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 border ${
              isDarkNav
                ? 'bg-transparent border-white/40 text-white hover:bg-white/15'
                : 'bg-transparent border-[#1A2536]/40 text-[#1A2536] hover:bg-[#1A2536]/10'
            }`}
          >
            <Compass className={`w-3.5 h-3.5 ${isDarkNav ? 'text-sky-300' : 'text-[#347F8C]'}`} />
            <span className="hidden sm:inline">Plan</span>
            <span>Journey</span>
          </Link>

          {/* Action 2: Outlined Pill (Partner With Us) - Desktop */}
          <Link
            href="/provider/portal"
            className={`hidden md:flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-medium transition-all duration-200 active:scale-95 border ${
              isDarkNav
                ? 'border-white/30 text-white hover:bg-white/15'
                : 'border-stone-400/60 text-[#2C2C2C] hover:bg-stone-200/50'
            }`}
          >
            <Handshake className="w-3.5 h-3.5 text-amber-500/90" />
            <span>Partner With Us</span>
          </Link>

          {/* Action 3: Outlined Pill (Login / User Profile Menu) */}
          {userName ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-full text-xs font-medium transition-all duration-200 active:scale-95 border cursor-pointer ${
                  isDarkNav
                    ? 'border-white/30 text-white hover:bg-white/15'
                    : 'border-stone-400/60 text-[#2C2C2C] hover:bg-stone-200/50'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-[#1A2536] text-white flex items-center justify-center text-[10px] font-mono font-bold">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[70px] sm:max-w-[100px] truncate">{userName}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2.5 w-48 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-[#D4CFC0] p-1.5 text-[#2C2C2C] z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-3 py-2 border-b border-[#D4CFC0]/50 text-[11px] font-mono text-[#2C2C2C]/60 truncate">
                    Signed in as <b className="text-[#2C2C2C] block truncate">{userName}</b>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-[#F5F1E6] transition font-mono"
                  >
                    <User className="w-3.5 h-3.5 text-[#347F8C]" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    href="/trip"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-[#F5F1E6] transition font-mono"
                  >
                    <Compass className="w-3.5 h-3.5 text-[#347F8C]" />
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
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-medium transition-all duration-200 active:scale-95 border ${
                isDarkNav
                  ? 'border-white/30 text-white hover:bg-white/15'
                  : 'border-stone-400/60 text-[#2C2C2C] hover:bg-stone-200/50'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </Link>
          )}

          {/* Action 4: Mobile Hamburger Menu Toggle Button (Visible on screens < lg) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
            className={`lg:hidden flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 border cursor-pointer ${
              isDarkNav
                ? 'border-white/30 text-white hover:bg-white/15'
                : 'border-stone-400/60 text-[#2C2C2C] hover:bg-stone-200/50'
            }`}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Panel */}
      {isMobileMenuOpen && (
        <div
          style={{ WebkitOverflowScrolling: 'touch' }}
          className="pointer-events-auto lg:hidden max-w-6xl mx-auto mt-2 bg-[#F5F1E6]/95 backdrop-blur-xl border border-[#C4A265]/40 rounded-2xl p-4 shadow-xl text-[#2C2C2C] max-h-[calc(100dvh-5rem)] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex flex-col space-y-2">
            <Link
              href="/#curated-experiences"
              onClick={(e) => {
                setIsMobileMenuOpen(false);
                if (isHome) {
                  e.preventDefault();
                  document.getElementById('curated-experiences')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-black/5 text-sm font-medium transition-colors"
            >
              <span>The Collection</span>
              <span className="text-[10px] font-mono text-[#5C6460]">Experiences</span>
            </Link>

            <Link
              href="/explore"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-black/5 text-sm font-medium transition-colors"
            >
              <span>Explore All</span>
              <span className="text-[10px] font-mono text-[#5C6460]">Directory</span>
            </Link>

            <div className="px-4 py-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-[#2C2C2C]">Cities & Enclaves</span>
              <NearbyCitiesDropdown isHome={false} scrolled={true} />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsJournalOpen(true);
              }}
              className="flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-black/5 text-sm font-medium transition-colors text-left w-full cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Bookmark className={`w-4 h-4 ${count > 0 ? 'fill-[#C4A265] text-[#C4A265]' : 'text-[#347F8C]'}`} />
                <span>Travel Journal</span>
              </div>
              {count > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-[#C4A265] text-[#2C2C2C] text-[10px] font-mono font-bold">
                  {count} saved
                </span>
              ) : (
                <span className="text-[10px] font-mono text-[#5C6460]">0 saved</span>
              )}
            </button>

            <Link
              href="/provider/portal"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 text-sm font-medium text-amber-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Handshake className="w-4 h-4 text-amber-600" />
                <span>Partner With Us</span>
              </div>
              <span className="text-[10px] font-mono text-amber-700">Provider Portal</span>
            </Link>
          </div>
        </div>
      )}

      {/* Travel Journal Slide-Over Drawer */}
      <CollectionDrawer isOpen={isJournalOpen} onClose={() => setIsJournalOpen(false)} />
    </header>
  );
}
