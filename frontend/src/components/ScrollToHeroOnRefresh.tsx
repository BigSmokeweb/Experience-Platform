'use client';

import { useEffect } from 'react';

export function ScrollToHeroOnRefresh() {
  useEffect(() => {
    try {
      // Enable auto scroll restoration so browser back/forward preserves user position in navigation stack
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }

      // Check if returning from a subpage like /seasonal that preserved scroll position
      const returnScroll = sessionStorage.getItem('journi_return_scroll');
      if (returnScroll) {
        sessionStorage.removeItem('journi_return_scroll');
        const pos = parseInt(returnScroll, 10);
        if (!isNaN(pos)) {
          const restore = () => window.scrollTo({ top: pos, behavior: 'instant' });
          restore();
          const t1 = setTimeout(restore, 50);
          const t2 = setTimeout(restore, 150);
          const t3 = setTimeout(restore, 350);
          return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
          };
        }
      }

      // If URL has an anchor hash (e.g. #curated-experiences, #itinerary, #seasonal-spots), scroll down to that section
      if (window.location.hash) {
        const targetId = window.location.hash.replace('#', '');
        const scrollToTarget = () => {
          const el = document.getElementById(targetId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        };

        scrollToTarget();
        const t1 = setTimeout(scrollToTarget, 80);
        const t2 = setTimeout(scrollToTarget, 300);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      }

      // Only on explicit browser reload (F5 / Ctrl+R) without hash, scroll to top hero
      const navEntries = performance.getEntriesByType('navigation');
      const isReload =
        navEntries.length > 0 &&
        (navEntries[0] as PerformanceNavigationTiming).type === 'reload';

      if (isReload && !window.location.hash) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    } catch {
      // Fallback
    }
  }, []);

  return null;
}

