import type { Alimentazione, Cambio, ModelloAuto } from '../../db/schema';
import { cvDaKw, kwDaCv, parseNumero } from '../numeri';

/**
 * Estrae i dati principali dal testo di un annuncio incollato.
 * Approccio a regole (regex + dizionari): deterministico, offline, testabile.
 * Il risultato è sempre una PROPOSTA: l'utente conferma o corregge prima di salvare.
 */
export interface RisultatoParser {
  marca: string | null;
  modelloTesto: string | null; // come scritto nel testo
  modelloId: string | null; // se trovato nel catalogo
  anno: number | null;
  mese: number | null;
  km: number | null;
  prezzo: number | null;
  alimentazione: Alimentazione | null;
  potenzaCv: number | null;
  potenzaKw: number | null;
  cilindrataCc: number | null; // se scritta esplicitamente (es. "1.498 cc")
  cilindrataLitri: number | null; // dalla sigla (es. "1.5 TSI")
  cambio: Cambio | null;
  paroleMotore: string[]; // sigle tecniche trovate (TSI, PureTech, …)
  avvisi: string[];
}

// Numero con eventuali separatori delle migliaia: 12.500 / 12 500 / 12'500 / 12500
const NUM = String.raw`\d{1,3}(?:[. '\u00a0]\d{3})+|\d+`; // niente a capo dentro un numero
const num = (s: string) => parseNumero(s.replace(/[\s'\u00a0]/g, ''));

export const MARCHE: Record<string, string[]> = {
  'Alfa Romeo': ['alfa romeo', 'alfa'], Audi: ['audi'], BMW: ['bmw'], Citroën: ['citroën', 'citroen'],
  Cupra: ['cupra'], Dacia: ['dacia'], DS: ['ds automobiles', 'ds'], Fiat: ['fiat'], Ford: ['ford'], Honda: ['honda'],
  Hyundai: ['hyundai'], Jeep: ['jeep'], Kia: ['kia'], Lancia: ['lancia'], 'Land Rover': ['land rover'], Lexus: ['lexus'],
  Mazda: ['mazda'], 'Mercedes-Benz': ['mercedes-benz', 'mercedes benz', 'mercedes'], MG: ['mg'], Mini: ['mini'],
  Mitsubishi: ['mitsubishi'], Nissan: ['nissan'], Opel: ['opel'], Peugeot: ['peugeot'], Porsche: ['porsche'],
  Renault: ['renault'], Seat: ['seat'], Skoda: ['škoda', 'skoda'], Smart: ['smart'], Subaru: ['subaru'],
  Suzuki: ['suzuki'], Tesla: ['tesla'], Toyota: ['toyota'], Volkswagen: ['volkswagen', 'vw'], Volvo: ['volvo'],
};

/** Sigle tecniche dei motori, nella forma usata per cercarle nel catalogo. */
export const PAROLE_MOTORE = [
  'TSI', 'TFSI', 'TDI', 'TGI', 'PureTech', 'BlueHDi', 'HDi', 'MultiJet', 'TwinAir', 'FireFly', 'Fire', 'TCe', 'dCi',
  'EcoBoost', 'T-GDi', 'CRDi', 'Skyactiv-G', 'Skyactiv-D', 'Skyactiv-X', 'Hybrid', 'GPL-Tech', 'e-HDi', 'D-4D', 'CDI',
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function cerca(testo: string, re: RegExp): RegExpExecArray[] {
  return [...testo.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))];
}

function trovaMarca(t: string): { marca: string; fine: number } | null {
  let migliore: { marca: string; inizio: number; fine: number } | null = null;
  for (const [marca, alias] of Object.entries(MARCHE)) {
    for (const a of alias) {
      const m = new RegExp(`(?<![\\p{L}\\d])${escape(a)}(?![\\p{L}\\d])`, 'iu').exec(t);
      // la marca che compare prima (di solito nel titolo); a parità, l'alias più lungo
      if (m && (!migliore || m.index < migliore.inizio || (m.index === migliore.inizio && m[0].length > migliore.fine - migliore.inizio))) {
        migliore = { marca, inizio: m.index, fine: m.index + m[0].length };
      }
    }
  }
  return migliore && { marca: migliore.marca, fine: migliore.fine };
}

function trovaModello(t: string, marca: string, fineMarca: number, modelli: ModelloAuto[], anno: number | null) {
  const stessaMarca = modelli.filter((m) => m.marca.toLowerCase() === marca.toLowerCase());
  const dopo = t.slice(fineMarca);
  const candidati = stessaMarca.filter((m) => {
    const nome = escape(m.modello);
    // nomi corti o numerici ("3", "500") solo subito dopo la marca, per evitare falsi positivi
    const re = m.modello.length <= 3 || /^\d+$/.test(m.modello)
      ? new RegExp(`^\\s*[-–]?\\s*${nome}(?![\\p{L}\\d])`, 'iu')
      : new RegExp(`(?<![\\p{L}\\d])${nome}(?![\\p{L}\\d])`, 'iu');
    return re.test(m.modello.length <= 3 ? dopo : t);
  });
  // più generazioni dello stesso modello: scegli quella che copre l'anno
  const coprono = candidati.filter((m) => anno != null && (m.annoInizio ?? 0) <= anno && anno <= (m.annoFine ?? 9999));
  const scelto = coprono[0] ?? (candidati.length === 1 ? candidati[0] : null);
  const testo = candidati[0]?.modello ?? /^\s*[-–]?\s*([\p{L}\d][\p{L}\d-]*)/u.exec(dopo)?.[1] ?? null;
  return { modello: scelto, testo, ambiguo: !scelto && candidati.length > 1 };
}

function trovaPrezzo(t: string): number | null {
  const candidati: { v: number; pos: number; etichetta: boolean }[] = [];
  const aggiungi = (m: RegExpExecArray, gruppo: number) => {
    const v = num(m[gruppo]);
    if (v == null || v < 300 || v > 500000) return;
    const inizioRiga = t.lastIndexOf('\n', m.index) + 1;
    const prima = t.slice(Math.max(inizioRiga, m.index - 30), m.index).toLowerCase();
    const dopo = t.slice(m.index + m[0].length, m.index + m[0].length + 15).toLowerCase();
    // esclude rate, anticipi e simili
    if (/mese|mensil|\/\s*m\b|rata|rate\b/.test(dopo) || /rata|rate|anticipo|maxi|al mese|finanz/.test(prima)) return;
    const riga = t.slice(inizioRiga, m.index + m[0].length).toLowerCase();
    candidati.push({ v, pos: m.index, etichetta: /prezzo|costo|richiesta|vendo a/.test(riga) });
  };
  for (const m of cerca(t, new RegExp(String.raw`(?:€|eur\b|euro\b)[ \t\u00a0]*(${NUM})(?:,\d{2}|,-+)?`, 'gi'))) aggiungi(m, 1);
  for (const m of cerca(t, new RegExp(String.raw`(?<![\d.,])(${NUM})(?:,\d{2}|,-+)?[ \t\u00a0]*(?:€|eur\b|euro\b)`, 'gi'))) aggiungi(m, 1);
  for (const m of cerca(t, new RegExp(String.raw`prezzo[^\d\n€]{0,20}(${NUM})`, 'gi'))) aggiungi(m, 1);
  if (!candidati.length) return null;
  const conEtichetta = candidati.filter((c) => c.etichetta).sort((a, b) => a.pos - b.pos);
  return (conEtichetta[0] ?? candidati.sort((a, b) => a.pos - b.pos)[0]).v;
}

function trovaKm(t: string): number | null {
  const valido = (v: number | null): v is number => v != null && v >= 0 && v <= 1500000;
  for (const re of [
    new RegExp(String.raw`(?:chilometraggio|percorrenza|km\s*percorsi|chilometri|\bkm)\s*[:-]?\s*(${NUM})(?!\s*(?:cc|cv|kw|€))`, 'gi'),
    new RegExp(String.raw`(?<![\d.,])(${NUM})\s*(?:km|chilometri)\b(?!\s*\/)`, 'gi'),
  ]) {
    for (const m of cerca(t, re)) {
      const prima = t.slice(Math.max(t.lastIndexOf('\n', m.index) + 1, m.index - 15), m.index).toLowerCase();
      if (/autonomia|garanzia|tagliando/.test(prima)) continue;
      const v = num(m[1]);
      if (valido(v)) return v;
    }
  }
  return null;
}

function trovaAnno(t: string, annoMax: number): { anno: number | null; mese: number | null } {
  const ok = (a: number) => a >= 1950 && a <= annoMax;
  const etichetta = /(?:immatricolazione|immatricolata|immatr\.?|anno(?:\s+di\s+immatricolazione)?|del)\s*[:-]?\s*(?:(\d{1,2})\s*[/.-]\s*)?((?:19|20)\d{2})\b/gi;
  for (const m of cerca(t, etichetta)) {
    const a = Number(m[2]);
    const mese = m[1] ? Number(m[1]) : null;
    if (ok(a)) return { anno: a, mese: mese && mese >= 1 && mese <= 12 ? mese : null };
  }
  for (const m of cerca(t, /(?<![\d/.])(0?[1-9]|1[0-2])\s*[/.-]\s*((?:19|20)\d{2})\b/g)) {
    const a = Number(m[2]);
    if (ok(a)) return { anno: a, mese: Number(m[1]) };
  }
  for (const m of cerca(t, /(?<![\d'])(?<!\d[.,])((?:19|20)\d{2})(?!\d|[.,]\d)(?!\s*(?:cc|cm|km|€|eur|kg|nm|cv|kw))/gi)) {
    const a = Number(m[1]);
    if (ok(a)) return { anno: a, mese: null };
  }
  return { anno: null, mese: null };
}

function trovaPotenza(t: string): { cv: number | null; kw: number | null } {
  const cv = /(?<![\d.,])(\d{2,3})\s*(?:cv|ch|ps|hp)\b/i.exec(t);
  const kw = /(?<![\d.,])(\d{2,3})\s*kw\b(?!\s*h)/i.exec(t);
  const vCv = cv ? Number(cv[1]) : null;
  const vKw = kw ? Number(kw[1]) : null;
  const plaus = (v: number | null, min: number, max: number) => (v != null && v >= min && v <= max ? v : null);
  // "PureTech 100", "1.0 TSI 110": numero senza unità subito dopo la sigla del motore = CV
  const sigle = PAROLE_MOTORE.map(escape).join('|');
  const dopoSigla = new RegExp(`(?:${sigle})(?:\\s+[A-Za-z]{2,5})?\\s+(\\d{2,3})(?![\\d.,]|\\s*(?:cc|km|€|kw|cv|nm|porte|posti))`, 'i').exec(t);
  const c = plaus(vCv, 40, 900) ?? (vKw == null ? plaus(dopoSigla ? Number(dopoSigla[1]) : null, 50, 500) : null);
  const k = plaus(vKw, 30, 700);
  return { cv: c ?? (k ? cvDaKw(k) : null), kw: k ?? (c ? kwDaCv(c) : null) };
}

function trovaCilindrata(t: string): { cc: number | null; litri: number | null } {
  const cc = new RegExp(String.raw`(?:(${NUM})\s*(?:cc|cm3|cm³|cm\^3)\b|cilindrata\s*[:-]?\s*(${NUM}))`, 'i').exec(t);
  let vcc = cc ? num(cc[1] ?? cc[2]) : null;
  if (vcc != null && (vcc < 500 || vcc > 8000)) vcc = null;
  // "1.5 TSI", "1.2 PureTech", "2.0 Skyactiv": cifra.cifra seguita da una parola (non "l/100")
  const l = /(?<![\d.,])([0-6])[.,](\d)\s*(?=[A-Za-z])(?![lL]\s*\/)/.exec(t);
  return { cc: vcc, litri: l ? Number(`${l[1]}.${l[2]}`) : null };
}

const VALORE_ALIM: [RegExp, Alimentazione][] = [
  [/plug[\s-]?in|\bphev\b|ricaricabile/i, 'ibrido_plugin'],
  [/mild[\s-]?hybrid|\bmhev\b|ibrido leggero|\b48\s?v\b/i, 'mild_hybrid'],
  [/\bibrid[oa]\b|\bhybrid\b|\bhev\b/i, 'ibrido'],
  [/\bgpl\b|\blpg\b/i, 'GPL'],
  [/\bmetano\b|\bcng\b|natural power|\btgi\b/i, 'metano'],
  [/elettric[ao]|\bev\b|\bbev\b|electric/i, 'elettrico'],
  [/\bdiesel\b|\bgasolio\b/i, 'diesel'],
  [/\bbenzina\b|\bpetrol\b/i, 'benzina'],
];
// fuori da un campo "Alimentazione:", "elettrico" è troppo ambiguo (alzacristalli elettrici…)
const INDIZI_ALIM: [RegExp, Alimentazione][] = [
  ...VALORE_ALIM.filter(([, a]) => a !== 'elettrico'),
  [/100\s?% elettric|auto elettrica|full electric|\bbev\b/i, 'elettrico'],
  [/\btdi\b|\bdci\b|multi\s?jet|\bhdi\b|bluehdi|\bcrdi\b|\bjtdm?\b|\bd-?4d\b|\bcdi\b|skyactiv-d/i, 'diesel'],
  [/\btsi\b|\btfsi\b|puretech|\btce\b|ecoboost|t-?gdi|\bfire\b|twinair|skyactiv-g/i, 'benzina'],
];

function trovaAlimentazione(t: string): Alimentazione | null {
  const campo = /(?:alimentazione|carburante|combustibile)\s*[:-]?\s*([^\n,;]{2,40})/i.exec(t);
  if (campo) for (const [re, a] of VALORE_ALIM) if (re.test(campo[1])) return a;
  for (const [re, a] of INDIZI_ALIM) if (re.test(t)) return a;
  return null;
}

const VALORE_CAMBIO: [RegExp, Cambio][] = [
  [/dsg|doppia frizione|\bedc\b|s[\s-]?tronic|\bdct\b|\bdkg\b/i, 'doppia_frizione'],
  [/\be?-?cvt\b|variazione continua/i, 'CVT'],
  [/robotizzat|dualogic|\bmta\b|\basg\b|sequenziale/i, 'robotizzato'],
  [/automatic|\beat\d\b|tiptronic|steptronic/i, 'automatico'],
  [/manuale/i, 'manuale'],
];

function trovaCambio(t: string): Cambio | null {
  const campo = /(?:cambio|trasmissione)\s*[:-]?\s*([^\n,;]{2,30})/i.exec(t);
  if (campo) for (const [re, c] of VALORE_CAMBIO) if (re.test(campo[1])) return c;
  // fuori dal campo, "automatico" è ambiguo (climatizzatore automatico): solo indizi specifici
  for (const [re, c] of VALORE_CAMBIO.slice(0, 3)) if (re.test(t)) return c;
  return null;
}

function trovaParoleMotore(t: string): string[] {
  return PAROLE_MOTORE.filter((p) => new RegExp(`(?<![\\p{L}\\d])${escape(p)}(?![\\p{L}\\d])`, 'iu').test(t));
}

export function parseAnnuncio(testo: string, modelli: ModelloAuto[], annoCorrente = new Date().getFullYear()): RisultatoParser {
  const t = testo.replace(/\r\n?/g, '\n');
  const avvisi: string[] = [];
  const { anno, mese } = trovaAnno(t, annoCorrente + 1);
  const m = trovaMarca(t);
  const mod = m ? trovaModello(t, m.marca, m.fine, modelli, anno) : null;
  const pot = trovaPotenza(t);
  const cil = trovaCilindrata(t);
  const r: RisultatoParser = {
    marca: m?.marca ?? null,
    modelloTesto: mod?.testo ?? null,
    modelloId: mod?.modello?.id ?? null,
    anno, mese,
    km: trovaKm(t),
    prezzo: trovaPrezzo(t),
    alimentazione: trovaAlimentazione(t),
    potenzaCv: pot.cv, potenzaKw: pot.kw,
    cilindrataCc: cil.cc, cilindrataLitri: cil.litri,
    cambio: trovaCambio(t),
    paroleMotore: trovaParoleMotore(t),
    avvisi,
  };
  if (!r.marca) avvisi.push('Marca non riconosciuta.');
  else if (!r.modelloId) {
    avvisi.push(mod?.ambiguo
      ? `Più generazioni di ${r.marca} ${r.modelloTesto} nel catalogo: scegli quella giusta.`
      : `Modello “${r.marca} ${r.modelloTesto ?? '?'}” non presente nel catalogo: scegli o crea il modello.`);
  }
  if (r.prezzo == null) avvisi.push('Prezzo non trovato.');
  if (r.km == null) avvisi.push('Chilometri non trovati.');
  if (r.anno == null) avvisi.push('Anno non trovato.');
  return r;
}
