import { useEffect, useState } from 'react';

export const MOBILE_BREAKPOINT = 768;

/**
 * Einheitliche Breitenabfrage fuer die Admin-Oberflaeche.
 *
 * Vorher hatte jede Komponente ihren eigenen useState(window.innerWidth) samt
 * resize-Listener - dieselbe Grenze, mehrfach gepflegt. matchMedia statt
 * resize, weil es nur beim tatsaechlichen Ueberschreiten der Grenze feuert und
 * nicht bei jedem Pixel waehrend einer Fensteraenderung.
 */
export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth < breakpoint
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}
