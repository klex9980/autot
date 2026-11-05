import type { AnnuncioArricchito } from './arricchisci';
import { mediana } from './statistiche';

/**
 * Confronta il prezzo di un annuncio con la mediana di annunci simili.
 * Si parte dal criterio più stretto; se gli annunci simili sono troppo pochi
 * si allarga per passi. Tutti gli annunci (anche scartati) contano come dato di mercato.
 */
export interface LivelloConfronto {
  nome: string;
  stessoModello: boolean;
  annoDelta: number;
  kmDelta: number;
}

export const LIVELLI: LivelloConfronto[] = [
  { nome: 'stesso modello e motore, anno ±2, km ±30.000', stessoModello: true, annoDelta: 2, kmDelta: 30000 },
  { nome: 'stesso motore (qualsiasi modello), anno ±2, km ±30.000', stessoModello: false, annoDelta: 2, kmDelta: 30000 },
  { nome: 'stesso motore (qualsiasi modello), anno ±3, km ±50.000', stessoModello: false, annoDelta: 3, kmDelta: 50000 },
];

export const MIN_CAMPIONE = 5;

export interface Convenienza {
  /** null se non si può calcolare (dati mancanti o campione troppo piccolo) */
  mediana: number | null;
  campione: number;
  livello: LivelloConfronto | null;
  /** differenza percentuale rispetto alla mediana: negativa = più economico */
  scarto: number | null;
  conveniente: boolean;
  motivo?: string;
}

export function simili(x: AnnuncioArricchito, tutti: AnnuncioArricchito[], l: LivelloConfronto): AnnuncioArricchito[] {
  const a = x.annuncio;
  return tutti.filter(({ annuncio: b }) =>
    b.id !== a.id &&
    b.prezzo != null && b.anno != null && b.km != null &&
    b.varianteId === a.varianteId &&
    (!l.stessoModello || b.modelloId === a.modelloId) &&
    Math.abs(b.anno - a.anno!) <= l.annoDelta &&
    Math.abs(b.km - a.km!) <= l.kmDelta,
  );
}

export function valutaConvenienza(x: AnnuncioArricchito, tutti: AnnuncioArricchito[], minCampione = MIN_CAMPIONE): Convenienza {
  const a = x.annuncio;
  const nulla = (motivo: string, campione = 0): Convenienza =>
    ({ mediana: null, campione, livello: null, scarto: null, conveniente: false, motivo });
  if (a.prezzo == null || a.anno == null || a.km == null || !a.varianteId) {
    return nulla('servono prezzo, anno, km e motore');
  }
  let maxTrovati = 0;
  for (const l of LIVELLI) {
    const s = simili(x, tutti, l);
    maxTrovati = Math.max(maxTrovati, s.length);
    if (s.length >= minCampione) {
      const med = mediana(s.map((y) => y.annuncio.prezzo))!;
      const scarto = (a.prezzo - med) / med;
      return { mediana: med, campione: s.length, livello: l, scarto, conveniente: a.prezzo < med };
    }
  }
  return nulla(`dati insufficienti: ${maxTrovati} annunci simili (ne servono almeno ${minCampione})`, maxTrovati);
}

/** Calcola la convenienza di tutti gli annunci: id → risultato. */
export function convenienzaTutti(tutti: AnnuncioArricchito[], minCampione = MIN_CAMPIONE): Map<string, Convenienza> {
  return new Map(tutti.map((x) => [x.annuncio.id, valutaConvenienza(x, tutti, minCampione)]));
}
