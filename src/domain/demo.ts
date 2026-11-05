import type { Annuncio, ModelloAuto, ModelloMotore, VarianteMotore } from '../db/schema';

/**
 * Genera annunci FITTIZI per provare gruppi, statistiche e convenienza.
 * Prezzi da una formula semplice (svalutazione per età e km + rumore): non sono dati di mercato.
 * Gli id iniziano con "demo-" per poterli eliminare tutti insieme.
 */
export const PREFISSO_DEMO = 'demo-';

/** Generatore pseudo-casuale deterministico (stessi annunci a ogni caricamento). */
function rng(seme: number) {
  let s = seme >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CITTA = ['Milano', 'Roma', 'Torino', 'Bologna', 'Napoli', 'Firenze', 'Verona', 'Bari', 'Padova', 'Brescia'];

export function generaAnnunciDemo(
  modelli: ModelloAuto[], varianti: VarianteMotore[], associazioni: ModelloMotore[], annoCorrente: number, quanti = 120,
): Annuncio[] {
  const r = rng(42);
  const perId = new Map(varianti.map((v) => [v.id, v]));
  const coppie = associazioni
    .map((a) => ({ m: modelli.find((m) => m.id === a.modelloId), v: perId.get(a.varianteId) }))
    .filter((c): c is { m: ModelloAuto; v: VarianteMotore } => !!c.m && !!c.v);
  if (!coppie.length) return [];
  // concentra gli annunci su una parte delle combinazioni, così i confronti hanno campioni sufficienti
  const scelte = coppie.filter((_, i) => i % 4 === 0);
  const out: Annuncio[] = [];
  for (let i = 0; i < quanti; i++) {
    const { m, v } = scelte[Math.floor(r() * scelte.length)];
    const da = m.annoInizio ?? annoCorrente - 10;
    const a = Math.min(m.annoFine ?? annoCorrente, annoCorrente);
    const anno = Math.max(da, Math.min(a, da + Math.floor(r() * (a - da + 1))));
    const eta = Math.max(0, annoCorrente - anno);
    const km = Math.round((eta * (9000 + r() * 12000) + r() * 8000) / 1000) * 1000;
    const nuovo = 9000 + v.potenzaCv * 120 + (m.pesoVuotoKg ?? 1100) * 4;
    const prezzo = nuovo * Math.pow(0.87, eta) * (1 - Math.min(0.35, km / 600000)) * (0.85 + r() * 0.3);
    out.push({
      id: `${PREFISSO_DEMO}${String(i).padStart(3, '0')}`,
      modelloId: m.id, varianteId: v.id, allestimento: '', anno, km,
      prezzo: Math.max(1500, Math.round(prezzo / 100) * 100), storicoPrezzi: [],
      cambio: r() < 0.75 ? 'manuale' : 'automatico',
      venditore: r() < 0.6 ? 'concessionario' : 'privato',
      proprietari: 1 + Math.floor(r() * 3),
      tagliandiDocumentati: r() < 0.6 ? 'si' : 'non_so',
      distribuzioneFatta: 'non_so', kmDistribuzione: null,
      garanziaMesi: null, link: '', citta: CITTA[Math.floor(r() * CITTA.length)],
      dataInserimento: `${annoCorrente}-01-01`,
      note: 'Annuncio di PROVA (fittizio)', testoOriginale: '', stato: 'da_vedere',
    });
  }
  return out;
}
