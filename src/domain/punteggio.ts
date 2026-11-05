import type { Alimentazione, Distribuzione, FamigliaMotore, ModelloAuto, ModelloMotore, VarianteMotore } from '../db/schema';

/**
 * Punteggio motore 0–100 = media pesata di tre componenti normalizzate 0–1:
 *  - affidabilità: (voto − 1) / 4
 *  - costi di gestione: media di carburante €/100 km, bollo €/anno e tipo di distribuzione
 *  - peso/potenza: kg/CV (peso medio dei modelli che montano il motore)
 * Carburante, bollo e kg/CV sono normalizzati min–max sui motori del catalogo (più basso = meglio).
 * Le componenti senza dati sono escluse e i pesi delle altre ridistribuiti ("punteggio parziale").
 */

export interface PesiPunteggio { affidabilita: number; costi: number; pesoPotenza: number }
export const PESI_PREDEFINITI: PesiPunteggio = { affidabilita: 5, costi: 3, pesoPotenza: 2 };

/** €/litro (metano €/kg, elettrico €/kWh). Indicativi: aggiornali nella pagina Punteggio. */
export interface PrezziEnergia { benzina: number; diesel: number; GPL: number; metano: number; elettrico: number }
export const PREZZI_PREDEFINITI: PrezziEnergia = { benzina: 1.8, diesel: 1.7, GPL: 0.75, metano: 1.4, elettrico: 0.35 };

/** Valutazione della distribuzione ai fini dei costi (0–1). Scelta dell'app, non un dato tecnico. */
export const VALORE_DISTRIBUZIONE: Record<Distribuzione, number> = {
  nessuna: 1, ingranaggi: 1, catena: 0.8, cinghia: 0.5, cinghia_bagno_olio: 0.3,
};

// ---------- bollo ----------

/**
 * Tariffe nazionali del bollo auto (€/kW) per classe Euro: fino a 100 kW e per i kW oltre.
 * Molte regioni applicano maggiorazioni o esenzioni (ibride, GPL/metano, elettriche): è una stima.
 */
const TARIFFE_BOLLO: Record<number, [number, number]> = {
  0: [3.0, 4.5], 1: [2.9, 4.35], 2: [2.8, 4.2], 3: [2.7, 4.05], 4: [2.58, 3.87], 5: [2.58, 3.87], 6: [2.58, 3.87],
};
const SUPERBOLLO_KW = 185;
const SUPERBOLLO_EURO_KW = 20;

export function classeEuroNumero(classe: string | null | undefined): number | null {
  const m = /euro\s*([0-6])/i.exec(classe ?? '');
  return m ? Number(m[1]) : null;
}

export interface Bollo { importo: number; note: string[] }

export function bolloStimato(kw: number, classeEuro: string | null, alimentazione: Alimentazione): Bollo {
  const note: string[] = [];
  let euro = classeEuroNumero(classeEuro);
  if (euro == null) { euro = 6; note.push('classe Euro non indicata: considerata Euro 6'); }
  const [base, oltre] = TARIFFE_BOLLO[euro];
  let importo = Math.min(kw, 100) * base + Math.max(0, kw - 100) * oltre;
  if (kw > SUPERBOLLO_KW) {
    importo += (kw - SUPERBOLLO_KW) * SUPERBOLLO_EURO_KW;
    note.push('include superbollo pieno (si riduce con l’età dell’auto)');
  }
  if (alimentazione === 'elettrico') {
    importo *= 0.25;
    note.push('elettrica: esente i primi anni, poi ridotto; varia per regione');
  } else if (alimentazione !== 'benzina' && alimentazione !== 'diesel') {
    note.push('alcune regioni prevedono esenzioni o riduzioni per questa alimentazione');
  }
  return { importo: Math.round(importo * 100) / 100, note };
}

// ---------- carburante ----------

export function costoEnergia100km(consumo: number | null, alimentazione: Alimentazione, p: PrezziEnergia): number | null {
  if (consumo == null) return null;
  const prezzo = alimentazione === 'diesel' ? p.diesel
    : alimentazione === 'GPL' ? p.GPL
    : alimentazione === 'metano' ? p.metano
    : alimentazione === 'elettrico' ? p.elettrico
    : p.benzina; // benzina e ibride (consumo espresso in litri di benzina)
  return consumo * prezzo;
}

// ---------- punteggio ----------

export interface DatiMotore {
  affidabilita: number | null;
  costoEnergia100km: number | null;
  bollo: number | null;
  distribuzione: Distribuzione | null;
  kgPerCv: number | null;
}

export interface Riferimenti {
  costoEnergia: [number, number] | null;
  bollo: [number, number] | null;
  kgPerCv: [number, number] | null;
}

export interface Punteggio {
  totale: number | null;
  componenti: { affidabilita: number | null; costi: number | null; pesoPotenza: number | null };
  parziale: boolean;
  dati: DatiMotore;
}

const intervallo = (xs: (number | null)[]): [number, number] | null => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? [Math.min(...v), Math.max(...v)] : null;
};

export function calcolaRiferimenti(dati: DatiMotore[]): Riferimenti {
  return {
    costoEnergia: intervallo(dati.map((d) => d.costoEnergia100km)),
    bollo: intervallo(dati.map((d) => d.bollo)),
    kgPerCv: intervallo(dati.map((d) => d.kgPerCv)),
  };
}

/** 1 = il valore più basso del catalogo, 0 = il più alto. Se tutti uguali: 0,5. */
export function normalizzaInverso(v: number | null, r: [number, number] | null): number | null {
  if (v == null || !r) return null;
  const [min, max] = r;
  if (max === min) return 0.5;
  return Math.min(1, Math.max(0, (max - v) / (max - min)));
}

const mediaValori = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};

export function calcolaPunteggio(d: DatiMotore, rif: Riferimenti, pesi: PesiPunteggio): Punteggio {
  const componenti = {
    affidabilita: d.affidabilita != null ? Math.min(1, Math.max(0, (d.affidabilita - 1) / 4)) : null,
    costi: mediaValori([
      normalizzaInverso(d.costoEnergia100km, rif.costoEnergia),
      normalizzaInverso(d.bollo, rif.bollo),
      d.distribuzione ? VALORE_DISTRIBUZIONE[d.distribuzione] : null,
    ]),
    pesoPotenza: normalizzaInverso(d.kgPerCv, rif.kgPerCv),
  };
  const voci = (Object.keys(componenti) as (keyof typeof componenti)[]).filter((k) => pesi[k] > 0);
  const disponibili = voci.filter((k) => componenti[k] != null);
  const sommaPesi = disponibili.reduce((s, k) => s + pesi[k], 0);
  const totale = sommaPesi > 0
    ? Math.round((100 * disponibili.reduce((s, k) => s + pesi[k] * componenti[k]!, 0)) / sommaPesi)
    : null;
  return { totale, componenti, parziale: disponibili.length < voci.length, dati: d };
}

/** Dati di ogni variante dal catalogo: il peso è la media dei modelli che la montano. */
export function datiMotori(
  famiglie: Map<string, FamigliaMotore>, varianti: VarianteMotore[], modelli: Map<string, ModelloAuto>,
  associazioni: ModelloMotore[], prezzi: PrezziEnergia,
): Map<string, DatiMotore> {
  const pesi = new Map<string, number[]>();
  for (const a of associazioni) {
    const p = modelli.get(a.modelloId)?.pesoVuotoKg;
    if (p != null) pesi.set(a.varianteId, [...(pesi.get(a.varianteId) ?? []), p]);
  }
  const out = new Map<string, DatiMotore>();
  for (const v of varianti) {
    const f = famiglie.get(v.famigliaId);
    if (!f) continue;
    const peso = mediaValori(pesi.get(v.id) ?? []);
    out.set(v.id, {
      affidabilita: f.affidabilita,
      costoEnergia100km: costoEnergia100km(v.consumoMedio, f.alimentazione, prezzi),
      bollo: v.potenzaKw ? bolloStimato(v.potenzaKw, v.classeEuro, f.alimentazione).importo : null,
      distribuzione: f.distribuzione,
      kgPerCv: peso != null && v.potenzaCv ? peso / v.potenzaCv : null,
    });
  }
  return out;
}

export function punteggiMotori(dati: Map<string, DatiMotore>, pesi: PesiPunteggio): Map<string, Punteggio> {
  const rif = calcolaRiferimenti([...dati.values()]);
  return new Map([...dati].map(([id, d]) => [id, calcolaPunteggio(d, rif, pesi)]));
}
