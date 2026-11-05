import type { Alimentazione, Aspirazione, Distribuzione, StatoAnnuncio } from '../db/schema';
import type { AnnuncioArricchito } from './arricchisci';

export interface Intervallo { min: number | null; max: number | null }

export interface Filtri {
  stati: StatoAnnuncio[];
  cilindri: number[];
  alimentazioni: Alimentazione[];
  aspirazioni: Aspirazione[];
  distribuzioni: Distribuzione[];
  cilindrata: Intervallo;
  prezzo: Intervallo;
  anno: Intervallo;
  km: Intervallo;
}

const vuoto = (): Intervallo => ({ min: null, max: null });

export const filtriVuoti = (): Filtri => ({
  stati: ['da_vedere', 'visto', 'preferito'],
  cilindri: [], alimentazioni: [], aspirazioni: [], distribuzioni: [],
  cilindrata: vuoto(), prezzo: vuoto(), anno: vuoto(), km: vuoto(),
});

/** Un intervallo vuoto accetta tutto; un valore mancante viene escluso solo se l'intervallo è impostato. */
const nellIntervallo = (v: number | null | undefined, i: Intervallo) =>
  (i.min == null && i.max == null) || (v != null && (i.min == null || v >= i.min) && (i.max == null || v <= i.max));

/** Una lista vuota significa "nessun filtro". */
const inLista = <T>(v: T | null | undefined, l: T[]) => l.length === 0 || (v != null && l.includes(v));

export function applicaFiltri(xs: AnnuncioArricchito[], f: Filtri): AnnuncioArricchito[] {
  return xs.filter((x) =>
    inLista(x.annuncio.stato, f.stati) &&
    inLista(x.famiglia?.cilindri, f.cilindri) &&
    inLista(x.famiglia?.alimentazione, f.alimentazioni) &&
    inLista(x.famiglia?.aspirazione, f.aspirazioni) &&
    inLista(x.famiglia?.distribuzione, f.distribuzioni) &&
    nellIntervallo(x.famiglia?.cilindrata, f.cilindrata) &&
    nellIntervallo(x.annuncio.prezzo, f.prezzo) &&
    nellIntervallo(x.annuncio.anno, f.anno) &&
    nellIntervallo(x.annuncio.km, f.km),
  );
}

/** Numero di filtri attivi (escluso lo stato), per il riepilogo. */
export function contaFiltriAttivi(f: Filtri): number {
  const liste = [f.cilindri, f.alimentazioni, f.aspirazioni, f.distribuzioni].filter((l) => l.length).length;
  const intervalli = [f.cilindrata, f.prezzo, f.anno, f.km].filter((i) => i.min != null || i.max != null).length;
  return liste + intervalli;
}
