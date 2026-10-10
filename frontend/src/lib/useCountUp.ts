import { useEffect, useState } from 'react';

/** Eases a number from `from` to `to` once, respecting reduced motion. */
export function useCountUp(to: number, ms = 1400, from = 0, delay = 350): number {
  const [v, setV] = useState(from);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(to); return; }
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      if (now < t0) { raf = requestAnimationFrame(tick); return; }
      const p = Math.min(1, (now - t0) / ms);
      setV(from + (to - from) * (1 - Math.pow(1 - p, 4)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, from, delay]);
  return v;
}
