'use client';

import { useEffect, useRef, useState } from 'react';

export function AnimatedCounter({ target, duration = 800 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(target);
  const prevTarget = useRef(target);

  useEffect(() => {
    const startVal = prevTarget.current !== target ? prevTarget.current : 0;
    prevTarget.current = target;
    if (startVal === target) {
      setCount(target);
      return;
    }

    const start = performance.now();
    let rafId: number;

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(startVal + (target - startVal) * ease));
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return <span>{count}</span>;
}

export default AnimatedCounter;
