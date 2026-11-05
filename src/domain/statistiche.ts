import type { AnnuncioArricchito } from './arricchisci';

const valori = (xs: (number | null | undefined)[]) => xs.filter((x): x is number => x != null && Number.isFinite(x));

export function media(xs: (number | null | undefined)[]): number | null {
  const v = valori(xs);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}

export function mediana(xs: (number | null | undefined)[]): number | null {
  const v = valori(xs).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export const minimo = (xs: (number | null | undefined)[]) => { const v = valori(xs); return v.length ? Math.min(...v) : null; };
export const massimo = (xs: (number | null | undefined)[]) => { const v = valori(xs); return v.length ? Math.max(...v) : null; };

export interface Statistiche {
  n: number;
  prezzoMedio: number | null;
  prezzoMediano: number | null;
  prezzoMin: number | null;
  prezzoMax: number | null;
  kmMedi: number | null;
  annoMedio: number | null;
  euroPerCv: number | null; // media
  kgPerCv: number | null; // media
}

export function statistiche(xs: AnnuncioArricchito[]): Statistiche {
  const prezzi = xs.map((x) => x.annuncio.prezzo);
  return {
    n: xs.length,
    prezzoMedio: media(prezzi),
    prezzoMediano: mediana(prezzi),
    prezzoMin: minimo(prezzi),
    prezzoMax: massimo(prezzi),
    kmMedi: media(xs.map((x) => x.annuncio.km)),
    annoMedio: media(xs.map((x) => x.annuncio.anno)),
    euroPerCv: media(xs.map((x) => x.euroPerCv)),
    kgPerCv: media(xs.map((x) => x.kgPerCv)),
  };
}
