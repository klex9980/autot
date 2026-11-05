import type { Colonna } from './csv';
import {
  ALIMENTAZIONI, ASPIRAZIONI, CAMBI, DISTRIBUZIONI, SEGMENTI, SI_NO_NONSO, STATI_ANNUNCIO, VENDITORI,
} from '../db/schema';

/** Specifiche CSV per ciascuna tabella. L'ordine è quello delle colonne nel file. */
export const COLONNE_CSV = {
  famiglie: [
    { chiave: 'id', tipo: 'testo' },
    { chiave: 'sigla', tipo: 'testo', obbligatoria: true },
    { chiave: 'costruttore', tipo: 'testo' },
    { chiave: 'cilindrata', tipo: 'numero' },
    { chiave: 'cilindri', tipo: 'numero' },
    { chiave: 'alimentazione', tipo: 'scelta', valori: ALIMENTAZIONI, obbligatoria: true },
    { chiave: 'aspirazione', tipo: 'scelta', valori: ASPIRAZIONI, obbligatoria: true },
    { chiave: 'distribuzione', tipo: 'scelta', valori: DISTRIBUZIONI, obbligatoria: true },
    { chiave: 'intervalloDistribuzioneKm', tipo: 'numero' },
    { chiave: 'affidabilita', tipo: 'numero' },
    { chiave: 'difettiNoti', tipo: 'testo' },
    { chiave: 'fonti', tipo: 'lista' },
    { chiave: 'daVerificare', tipo: 'lista' },
  ],
  varianti: [
    { chiave: 'id', tipo: 'testo' },
    { chiave: 'famigliaId', tipo: 'testo', obbligatoria: true },
    { chiave: 'potenzaCv', tipo: 'numero', obbligatoria: true },
    { chiave: 'potenzaKw', tipo: 'numero', obbligatoria: true },
    { chiave: 'coppiaNm', tipo: 'numero' },
    { chiave: 'consumoMedio', tipo: 'numero' },
    { chiave: 'classeEuro', tipo: 'testo', predefinito: null },
    { chiave: 'note', tipo: 'testo' },
    { chiave: 'daVerificare', tipo: 'lista' },
  ],
  modelli: [
    { chiave: 'id', tipo: 'testo' },
    { chiave: 'marca', tipo: 'testo', obbligatoria: true },
    { chiave: 'modello', tipo: 'testo', obbligatoria: true },
    { chiave: 'generazione', tipo: 'testo' },
    { chiave: 'annoInizio', tipo: 'numero' },
    { chiave: 'annoFine', tipo: 'numero' },
    { chiave: 'pesoVuotoKg', tipo: 'numero' },
    { chiave: 'segmento', tipo: 'scelta', valori: SEGMENTI, predefinito: 'altro' },
    { chiave: 'daVerificare', tipo: 'lista' },
  ],
  modelliMotori: [
    { chiave: 'modelloId', tipo: 'testo', obbligatoria: true },
    { chiave: 'varianteId', tipo: 'testo', obbligatoria: true },
  ],
  annunci: [
    { chiave: 'id', tipo: 'testo' },
    { chiave: 'modelloId', tipo: 'testo', predefinito: null },
    { chiave: 'varianteId', tipo: 'testo', predefinito: null },
    { chiave: 'allestimento', tipo: 'testo' },
    { chiave: 'anno', tipo: 'numero' },
    { chiave: 'km', tipo: 'numero' },
    { chiave: 'prezzo', tipo: 'numero' },
    { chiave: 'storicoPrezzi', tipo: 'json', predefinito: [] },
    { chiave: 'cambio', tipo: 'scelta', valori: CAMBI },
    { chiave: 'venditore', tipo: 'scelta', valori: VENDITORI },
    { chiave: 'proprietari', tipo: 'numero' },
    { chiave: 'tagliandiDocumentati', tipo: 'scelta', valori: SI_NO_NONSO, predefinito: 'non_so' },
    { chiave: 'distribuzioneFatta', tipo: 'scelta', valori: SI_NO_NONSO, predefinito: 'non_so' },
    { chiave: 'kmDistribuzione', tipo: 'numero' },
    { chiave: 'garanziaMesi', tipo: 'numero' },
    { chiave: 'link', tipo: 'testo' },
    { chiave: 'citta', tipo: 'testo' },
    { chiave: 'dataInserimento', tipo: 'testo' },
    { chiave: 'note', tipo: 'testo' },
    { chiave: 'testoOriginale', tipo: 'testo' },
    { chiave: 'stato', tipo: 'scelta', valori: STATI_ANNUNCIO, predefinito: 'da_vedere' },
  ],
} satisfies Record<string, Colonna[]>;

export type TabellaCsv = keyof typeof COLONNE_CSV;

export const NOMI_TABELLE_CSV: Record<TabellaCsv, string> = {
  famiglie: 'Motori (famiglie)',
  varianti: 'Motori (varianti di potenza)',
  modelli: 'Modelli auto',
  modelliMotori: 'Associazioni modello–motore',
  annunci: 'Annunci',
};
