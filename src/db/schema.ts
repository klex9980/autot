// Tipi del modello dati. I campi incerti sono nullable e il loro nome
// compare nell'array `daVerificare` del record.

export const ALIMENTAZIONI = [
  'benzina', 'diesel', 'ibrido', 'ibrido_plugin', 'mild_hybrid', 'GPL', 'metano', 'elettrico',
] as const;
export type Alimentazione = (typeof ALIMENTAZIONI)[number];

export const ASPIRAZIONI = ['aspirato', 'turbo', 'sovralimentato'] as const;
export type Aspirazione = (typeof ASPIRAZIONI)[number];

export const DISTRIBUZIONI = ['cinghia', 'cinghia_bagno_olio', 'catena', 'ingranaggi', 'nessuna'] as const;
export type Distribuzione = (typeof DISTRIBUZIONI)[number];

export const SEGMENTI = ['A', 'B', 'C', 'D', 'E', 'SUV-B', 'SUV-C', 'SUV-D', 'MPV', 'altro'] as const;
export type Segmento = (typeof SEGMENTI)[number];

export const CAMBI = ['manuale', 'automatico', 'robotizzato', 'doppia_frizione', 'CVT'] as const;
export type Cambio = (typeof CAMBI)[number];

export const STATI_ANNUNCIO = ['da_vedere', 'visto', 'preferito', 'scartato'] as const;
export type StatoAnnuncio = (typeof STATI_ANNUNCIO)[number];

export const VENDITORI = ['privato', 'concessionario'] as const;
export type Venditore = (typeof VENDITORI)[number];

export const SI_NO_NONSO = ['si', 'no', 'non_so'] as const;
export type SiNoNonSo = (typeof SI_NO_NONSO)[number];

/** Blocco motore: caratteristiche comuni a tutte le potenze. */
export interface FamigliaMotore {
  id: string;
  sigla: string; // es. "EA211 evo 1.5 TSI"
  costruttore: string;
  cilindrata: number | null; // cc
  cilindri: number | null;
  alimentazione: Alimentazione;
  aspirazione: Aspirazione;
  distribuzione: Distribuzione;
  intervalloDistribuzioneKm: number | null; // null per catena o se non noto
  affidabilita: number | null; // 1–5, valutazione indicativa
  difettiNoti: string;
  fonti: string[];
  daVerificare: string[];
}

/** Variante di potenza di una famiglia motore. */
export interface VarianteMotore {
  id: string;
  famigliaId: string;
  potenzaCv: number;
  potenzaKw: number;
  coppiaNm: number | null;
  consumoMedio: number | null; // l/100 km (kWh/100 km per elettrico)
  classeEuro: string | null; // es. "Euro 6d-TEMP"
  note: string;
  daVerificare: string[];
}

export interface ModelloAuto {
  id: string;
  marca: string;
  modello: string;
  generazione: string;
  annoInizio: number | null;
  annoFine: number | null; // null = ancora in produzione
  pesoVuotoKg: number | null;
  segmento: Segmento;
  daVerificare: string[];
}

/** Relazione molti-a-molti modello ↔ variante motore. */
export interface ModelloMotore {
  modelloId: string;
  varianteId: string;
}

export interface PrezzoStorico {
  data: string; // ISO yyyy-mm-dd
  prezzo: number;
}

export interface Annuncio {
  id: string;
  modelloId: string | null;
  varianteId: string | null;
  allestimento: string;
  anno: number | null;
  km: number | null;
  prezzo: number | null;
  storicoPrezzi: PrezzoStorico[];
  cambio: Cambio | null;
  venditore: Venditore | null;
  proprietari: number | null;
  tagliandiDocumentati: SiNoNonSo;
  distribuzioneFatta: SiNoNonSo;
  kmDistribuzione: number | null;
  garanziaMesi: number | null;
  link: string;
  citta: string;
  dataInserimento: string; // ISO yyyy-mm-dd
  note: string;
  testoOriginale: string;
  stato: StatoAnnuncio;
}

export interface Impostazione {
  chiave: string;
  valore: unknown;
}

// ---- Etichette italiane per l'interfaccia ----

export const ETICHETTE: Record<string, string> = {
  benzina: 'Benzina', diesel: 'Diesel', ibrido: 'Ibrido', ibrido_plugin: 'Ibrido plug-in',
  mild_hybrid: 'Mild hybrid', GPL: 'GPL', metano: 'Metano', elettrico: 'Elettrico',
  aspirato: 'Aspirato', turbo: 'Turbo', sovralimentato: 'Sovralimentato (compressore)',
  cinghia: 'Cinghia', cinghia_bagno_olio: 'Cinghia a bagno d’olio', catena: 'Catena',
  ingranaggi: 'Ingranaggi', nessuna: 'Nessuna (elettrico)',
  manuale: 'Manuale', automatico: 'Automatico', robotizzato: 'Robotizzato',
  doppia_frizione: 'Doppia frizione (DSG/EDC…)', CVT: 'CVT / e-CVT',
  da_vedere: 'Da vedere', visto: 'Visto', preferito: 'Preferito', scartato: 'Scartato',
  privato: 'Privato', concessionario: 'Concessionario',
  si: 'Sì', no: 'No', non_so: 'Non so',
};

export const etichetta = (v: string | null | undefined): string =>
  v == null ? '—' : (ETICHETTE[v] ?? v);
