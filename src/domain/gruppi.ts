import { etichetta } from '../db/schema';
import { formatta } from './numeri';
import type { AnnuncioArricchito } from './arricchisci';
import { statistiche, type Statistiche } from './statistiche';

export const CRITERI = [
  'motore', 'famiglia', 'modello', 'cilindri', 'alimentazione', 'aspirazione', 'distribuzione',
  'cilindrata', 'prezzo', 'anno', 'km',
] as const;
export type Criterio = (typeof CRITERI)[number];

export const NOMI_CRITERI: Record<Criterio, string> = {
  motore: 'Motore (variante)', famiglia: 'Motore (famiglia)', modello: 'Modello',
  cilindri: 'Numero cilindri', alimentazione: 'Alimentazione', aspirazione: 'Aspirato / turbo',
  distribuzione: 'Distribuzione', cilindrata: 'Fascia di cilindrata', prezzo: 'Fascia di prezzo',
  anno: 'Fascia di anno', km: 'Fascia di km',
};

/** Soglie delle fasce: ogni fascia va da una soglia (inclusa) alla successiva (esclusa). */
export const FASCE: Record<'cilindrata' | 'prezzo' | 'anno' | 'km', number[]> = {
  cilindrata: [1000, 1400, 1800, 2200],
  prezzo: [5000, 10000, 15000, 20000, 25000, 30000],
  anno: [2013, 2016, 2019, 2022],
  km: [30000, 60000, 100000, 150000],
};

const fmt = (n: number) => formatta(n, 0);

/** Restituisce indice e nome della fascia in cui cade v. */
export function fascia(v: number, soglie: number[], unita = '', anni = false): { indice: number; nome: string } {
  const i = soglie.findIndex((s) => v < s);
  const idx = i === -1 ? soglie.length : i;
  const u = unita ? ` ${unita}` : '';
  if (anni) {
    if (idx === 0) return { indice: 0, nome: `fino al ${soglie[0] - 1}` };
    if (idx === soglie.length) return { indice: idx, nome: `dal ${soglie[idx - 1]}` };
    return { indice: idx, nome: `${soglie[idx - 1]}–${soglie[idx] - 1}` };
  }
  if (idx === 0) return { indice: 0, nome: `meno di ${fmt(soglie[0])}${u}` };
  if (idx === soglie.length) return { indice: idx, nome: `${fmt(soglie[idx - 1])}${u} e oltre` };
  return { indice: idx, nome: `${fmt(soglie[idx - 1])}–${fmt(soglie[idx])}${u}` };
}

const ND = { chiave: '~nd', nome: 'Non indicato', ordine: Number.MAX_SAFE_INTEGER };

interface Chiave { chiave: string; nome: string; ordine: number | string }

export function chiaveGruppo(x: AnnuncioArricchito, c: Criterio): Chiave {
  const { annuncio: a, famiglia: f, variante: v, modello: m } = x;
  switch (c) {
    case 'motore':
      return v && f ? { chiave: v.id, nome: `${f.sigla} ${v.potenzaCv} CV`, ordine: `${f.sigla} ${String(v.potenzaCv).padStart(4, '0')}` } : ND;
    case 'famiglia':
      return f ? { chiave: f.id, nome: f.sigla, ordine: f.sigla } : ND;
    case 'modello':
      return m ? { chiave: m.id, nome: `${m.marca} ${m.modello} ${m.generazione}`.trim(), ordine: `${m.marca} ${m.modello} ${m.generazione}` } : ND;
    case 'cilindri':
      return f?.cilindri ? { chiave: String(f.cilindri), nome: `${f.cilindri} cilindri`, ordine: f.cilindri } : ND;
    case 'alimentazione':
    case 'aspirazione':
    case 'distribuzione': {
      const val = f?.[c];
      return val ? { chiave: val, nome: etichetta(val), ordine: etichetta(val) } : ND;
    }
    case 'cilindrata': {
      if (f?.cilindrata == null) return ND;
      const r = fascia(f.cilindrata, FASCE.cilindrata, 'cc');
      return { chiave: `c${r.indice}`, nome: r.nome, ordine: r.indice };
    }
    case 'prezzo':
    case 'km':
    case 'anno': {
      const val = a[c];
      if (val == null) return ND;
      const r = fascia(val, FASCE[c], c === 'prezzo' ? '€' : c === 'km' ? 'km' : '', c === 'anno');
      return { chiave: `${c}${r.indice}`, nome: r.nome, ordine: r.indice };
    }
  }
}

export interface Gruppo {
  chiave: string;
  nome: string;
  ordine: number | string;
  annunci: AnnuncioArricchito[];
  stat: Statistiche;
}

export function raggruppa(xs: AnnuncioArricchito[], c: Criterio): Gruppo[] {
  const mappa = new Map<string, { k: Chiave; annunci: AnnuncioArricchito[] }>();
  for (const x of xs) {
    const k = chiaveGruppo(x, c);
    if (!mappa.has(k.chiave)) mappa.set(k.chiave, { k, annunci: [] });
    mappa.get(k.chiave)!.annunci.push(x);
  }
  return [...mappa.values()]
    .map(({ k, annunci }) => ({ ...k, annunci, stat: statistiche(annunci) }))
    .sort((a, b) => {
      if (a.chiave === ND.chiave) return 1;
      if (b.chiave === ND.chiave) return -1;
      return typeof a.ordine === 'number' && typeof b.ordine === 'number'
        ? a.ordine - b.ordine
        : String(a.ordine).localeCompare(String(b.ordine), 'it', { numeric: true });
    });
}

export const ORDINAMENTI_GRUPPI = {
  naturale: 'Ordine naturale',
  n: 'Numero annunci',
  prezzoMediano: 'Prezzo mediano',
  euroPerCv: '€/CV',
  kgPerCv: 'kg/CV',
} as const;
export type OrdinamentoGruppi = keyof typeof ORDINAMENTI_GRUPPI;

export function ordinaGruppi(g: Gruppo[], o: OrdinamentoGruppi): Gruppo[] {
  if (o === 'naturale') return g;
  const val = (x: Gruppo) => x.stat[o];
  // numero annunci decrescente, gli altri crescenti; i valori mancanti in fondo
  return [...g].sort((a, b) => {
    const va = val(a), vb = val(b);
    if (va == null) return 1;
    if (vb == null) return -1;
    return o === 'n' ? vb - va : va - vb;
  });
}
