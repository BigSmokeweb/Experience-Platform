'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * ScrollFadeUpObserver
 * Automatically applies fade-up on scroll (opacity: 0 -> 1, translateY: 30px -> 0)
 * to section headings, cards, and paragraphs as they cross threshold: 0.15.
 * Staggers direct/grouped children by 80ms.
 */
export function ScrollFadeUpObserver() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Do not add fade-up animation to the create your itinerary page
    if (pathname?.startsWith('/trip')) return;

    // Respect user's motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const isExcluded = (el: HTMLElement) => {
      return Boolean(
        el.closest('nav') ||
        el.closest('#hero') ||
        el.closest('#itinerary') ||
        el.closest('.itinerary-builder') ||
        el.closest('[data-no-fade]')
      );
    };

    // Find candidate targets: headings, cards, and paragraphs
    const collectTargets = () => {
      const candidates: HTMLElement[] = [];

      // Query headings, cards, and paragraphs inside main content
      const elements = document.querySelectorAll<HTMLElement>(
        'main h1, main h2, main h3, main h4, main article, main p, footer h2, footer h3, footer p, footer article'
      );

      elements.forEach((el) => {
        if (!isExcluded(el) && !el.classList.contains('scroll-fade-done')) {
          candidates.push(el);
        }
      });

      return candidates;
    };

    // Group elements by their nearest section or grid container for staggered animation
    const groupElementsByContainer = (targets: HTMLElement[]) => {
      const groupMap = new Map<HTMLElement, HTMLElement[]>();

      targets.forEach((target) => {
        // Nearest meaningful container: section, form, or direct card grid
        const container =
          target.closest<HTMLElement>('section, form, [id], .grid, footer') ||
          target.parentElement ||
          document.body;

        if (!groupMap.has(container)) {
          groupMap.set(container, []);
        }
        groupMap.get(container)!.push(target);
      });

      return groupMap;
    };

    const targets = collectTargets();
    const groups = groupElementsByContainer(targets);

    // Prepare elements with initial hidden state
    targets.forEach((el) => {
      if (!el.classList.contains('scroll-fade-ready') && !el.classList.contains('scroll-fade-done')) {
        el.classList.add('scroll-fade-ready');
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const container = entry.target as HTMLElement;
          const items = groups.get(container) || [];

          if (entry.isIntersecting) {
            items.forEach((item, index) => {
              const staggerDelay = `${index * 80}ms`;
              item.style.transitionDelay = staggerDelay;
              item.classList.add('scroll-fade-in');
              item.classList.remove('scroll-fade-ready');
            });
          } else if (entry.boundingClientRect.top > 0) {
            // Element exited below the viewport (scrolled back up above it) -> reset for re-animation
            items.forEach((item) => {
              item.style.transitionDelay = '0ms';
              item.classList.remove('scroll-fade-in');
              item.classList.add('scroll-fade-ready');
            });
          }
        });
      },
      {
        root: null,
        threshold: 0.15,
        rootMargin: '0px 0px -30px 0px',
      }
    );

    // Observe each container group
    groups.forEach((_, container) => {
      observer.observe(container);
    });

    // Also observe individual elements that might have large containers
    const individualObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            el.classList.add('scroll-fade-in');
            el.classList.remove('scroll-fade-ready');
          } else if (entry.boundingClientRect.top > 0) {
            el.style.transitionDelay = '0ms';
            el.classList.remove('scroll-fade-in');
            el.classList.add('scroll-fade-ready');
          }
        });
      },
      {
        root: null,
        threshold: 0.15,
        rootMargin: '0px 0px -30px 0px',
      }
    );

    targets.forEach((target) => {
      individualObserver.observe(target);
    });

    // MutationObserver to capture dynamically rendered components (e.g. filtered cards)
    const mutationObserver = new MutationObserver(() => {
      const newTargets = collectTargets();
      if (newTargets.length === 0) return;

      const newGroups = groupElementsByContainer(newTargets);
      newTargets.forEach((el) => {
        if (!el.classList.contains('scroll-fade-ready') && !el.classList.contains('scroll-fade-done')) {
          el.classList.add('scroll-fade-ready');
          individualObserver.observe(el);
        }
      });

      newGroups.forEach((_, container) => {
        observer.observe(container);
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      individualObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [pathname]);

  return null;
}

export default ScrollFadeUpObserver;
