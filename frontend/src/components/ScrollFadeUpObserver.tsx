'use client';

/**
 * Reserved animation boundary. The former observer changed server-rendered
 * classes during hydration, which caused React hydration errors on refresh.
 */
export function ScrollFadeUpObserver() {
  return null;
}

export default ScrollFadeUpObserver;
