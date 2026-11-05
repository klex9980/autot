import { useEffect, useState } from 'react';

/** Stato salvato nel browser (comodità per l'utente: filtri, selezioni). Mai dati importanti. */
function leggi<T>(chiave: string, iniziale: T): T {
  try {
    const s = localStorage.getItem(chiave);
    return s == null ? iniziale : { ...iniziale, ...JSON.parse(s) } as T;
  } catch { return iniziale; }
}

const EVENTO = 'memoria-cambiata';

export function useMemoria<T extends object>(chiave: string, iniziale: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => leggi(chiave, iniziale));
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail === chiave) setV(leggi(chiave, iniziale)); };
    window.addEventListener(EVENTO, h);
    return () => window.removeEventListener(EVENTO, h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiave]);
  const salva = (nuovo: T) => {
    setV(nuovo);
    try { localStorage.setItem(chiave, JSON.stringify(nuovo)); } catch { /* storage non disponibile */ }
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: chiave }));
  };
  return [v, salva];
}

export const MAX_CONFRONTO = 4;

/** Selezione per la vista confronto (annunci e varianti motore). */
export function useSelezioneConfronto() {
  const [sel, setSel] = useMemoria('confronto', { annunci: [] as string[], motori: [] as string[] });
  const toggle = (tipo: 'annunci' | 'motori', id: string) => {
    const l = sel[tipo];
    if (l.includes(id)) setSel({ ...sel, [tipo]: l.filter((x) => x !== id) });
    else if (l.length < MAX_CONFRONTO) setSel({ ...sel, [tipo]: [...l, id] });
  };
  return { sel, setSel, toggle };
}
