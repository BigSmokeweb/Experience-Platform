'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { X, Bookmark, Compass, Trash2, ArrowRight, Sparkles, MapPin, ExternalLink } from 'lucide-react';
import { useCollection, SavedCollectionItem } from '@/lib/collection-store';

interface CollectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CollectionDrawer({ isOpen, onClose }: CollectionDrawerProps) {
  const { collection, count, toggle, clear } = useCollection();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      />

      {/* Drawer Panel */}
      <aside
        ref={drawerRef}
        className="relative w-full max-w-md h-full journal-leather-panel border-l-2 border-[#C4A265] shadow-2xl z-10 flex flex-col animate-in slide-in-from-right duration-300"
      >
        {/* Header with Leather Journal Stitch Accent */}
        <div className="p-5 bg-white/90 backdrop-blur-md border-b border-[#D4CFC0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#C4A265] text-[#2C2C2C] flex items-center justify-center shadow-xs">
              <Bookmark className="w-4 h-4 fill-[#2C2C2C]" />
            </div>
            <div>
              <h2 className="font-edu-cursive text-xl text-[#2C2C2C] leading-none">
                Travel Journal
              </h2>
              <p className="text-[11px] font-mono tracking-wider text-[#5C6460] mt-0.5 uppercase">
                {count} {count === 1 ? 'Page Pinned' : 'Pages Pinned'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {count > 0 && (
              <button
                type="button"
                onClick={clear}
                className="p-1.5 text-[#5C6460] hover:text-red-700 transition-colors rounded-lg text-xs font-mono"
                title="Clear all pages"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#2C2C2C] hover:bg-[#EAE5D8] rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
          {count === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#5C6460]">
              <div className="w-16 h-16 rounded-full bg-[#EAE5D8] border border-[#D4CFC0] flex items-center justify-center mb-4 text-[#C4A265]">
                <Bookmark className="w-7 h-7" />
              </div>
              <h3 className="font-edu-cursive text-2xl text-[#2C2C2C] mb-2">
                Your Journal is Blank
              </h3>
              <p className="text-xs max-w-xs leading-relaxed">
                Click the dog-ear bookmark on any experience card to pin private memories and craft your personalized Maharashtra journey.
              </p>
            </div>
          ) : (
            collection.map((item: SavedCollectionItem) => (
              <div
                key={item.id}
                className="group relative bg-white/90 hover:bg-white rounded-xl border border-[#D4CFC0] hover:border-[#C4A265] p-3 shadow-xs hover:shadow-md transition-all duration-200 flex gap-3"
              >
                {/* Image */}
                <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-zinc-100 relative">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    unoptimized
                    sizes="80px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-1 left-1 bg-black/70 backdrop-blur-xs text-white text-[9px] font-mono px-1.5 py-0.5 rounded z-10">
                    {item.city}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <Link
                      href={`/experiences/${item.id}`}
                      onClick={onClose}
                      className="text-xs font-bold text-[#2C2C2C] hover:text-[#347F8C] line-clamp-2 transition-colors leading-tight"
                    >
                      {item.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono font-semibold text-[#347F8C]">
                        {item.priceFormatted}
                      </span>
                      <span className="text-[10px] font-mono text-[#5C6460]">
                        ★ {Number(item.ratingAverage).toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-100">
                    <Link
                      href={`/experiences/${item.id}`}
                      onClick={onClose}
                      className="text-[10px] font-mono font-bold text-[#347F8C] hover:text-[#2A6772] flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3 h-3 text-[#C4A265]" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => toggle({ id: item.id, title: item.title })}
                      className="text-[10px] font-mono text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      Unpin
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Summary */}
        {count > 0 && (
          <div className="p-4 bg-white/95 border-t border-[#D4CFC0]">
            <Link
              href="/#itinerary"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Build Journey with Pinned Items</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </aside>
    </div>,
    document.body
  );
}
