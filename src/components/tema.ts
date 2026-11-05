import { useEffect, useState } from 'react';

/** true se il sistema è in modalità scura (i grafici usano passi di colore diversi). */
export function useTemaScuro(): boolean {
  const q = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : undefined;
  const [scuro, setScuro] = useState(!!q?.matches);
  useEffect(() => {
    if (!q) return;
    const h = (e: MediaQueryListEvent) => setScuro(e.matches);
    q.addEventListener('change', h);
    return () => q.removeEventListener('change', h);
  }, [q]);
  return scuro;
}

/**
 * Colori dei grafici (palette di riferimento validata per daltonismo).
 * Nei grafici a punti al massimo 3 serie colorate: le altre finiscono in "Altri" (grigio).
 */
export const COLORI_GRAFICI = {
  chiaro: {
    serie: ['#2a78d6', '#eb6834', '#1baf7a'], altri: '#b4b2aa', superficie: '#ffffff',
    testo: '#52514e', griglia: '#e6e5e0', mediana: '#256abf', intervallo: '#9ec5f4', estremi: '#86b6ef',
  },
  scuro: {
    serie: ['#3987e5', '#d95926', '#199e70'], altri: '#5f5e58', superficie: '#1c222b',
    testo: '#c3c2b7', griglia: '#2e3743', mediana: '#6da7ec', intervallo: '#1c5cab', estremi: '#184f95',
  },
};
export const FORME = ['circle', 'square', 'triangle'] as const;
