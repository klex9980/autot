import { TABELLE, nuovoId, oggiIso, type AutoDb } from '../db/db';
import { COLONNE_CSV, type TabellaCsv } from './colonneCsv';
import { aCsv, daCsv } from './csv';

const VERSIONE_BACKUP = 1;

export async function esportaBackup(d: AutoDb): Promise<string> {
  const dati: Record<string, unknown[]> = {};
  for (const t of TABELLE) dati[t] = await d.table(t).toArray();
  return JSON.stringify({ app: 'auto-confronto', versione: VERSIONE_BACKUP, data: new Date().toISOString(), dati }, null, 2);
}

/** Ripristina un backup sostituendo TUTTI i dati attuali. */
export async function ripristinaBackup(d: AutoDb, json: string): Promise<void> {
  const b = JSON.parse(json.replace(/^\uFEFF/, ''));
  if (b?.app !== 'auto-confronto' || typeof b.dati !== 'object') throw new Error('File di backup non valido');
  await d.transaction('rw', TABELLE.map((t) => d.table(t)), async () => {
    for (const t of TABELLE) {
      await d.table(t).clear();
      const righe = b.dati[t];
      if (Array.isArray(righe)) await d.table(t).bulkAdd(righe);
    }
  });
}

export async function esportaCsv(d: AutoDb, tabella: TabellaCsv): Promise<string> {
  return aCsv(await d.table(tabella).toArray(), COLONNE_CSV[tabella]);
}

export interface EsitoImport { importate: number; errori: string[] }

/** Importa un CSV aggiornando i record con lo stesso id e aggiungendo i nuovi. */
export async function importaCsv(d: AutoDb, tabella: TabellaCsv, testo: string): Promise<EsitoImport> {
  const { righe, errori } = daCsv<Record<string, unknown>>(testo, COLONNE_CSV[tabella]);
  if (tabella !== 'modelliMotori') {
    for (const r of righe) {
      if (!r.id) r.id = nuovoId();
      if (tabella === 'annunci' && !r.dataInserimento) r.dataInserimento = oggiIso();
    }
  }
  // controlli di integrità sui riferimenti
  const valide: Record<string, unknown>[] = [];
  for (const [i, r] of righe.entries()) {
    const err = await controllaRiferimenti(d, tabella, r);
    if (err) errori.push(`Record ${i + 1}: ${err}`);
    else valide.push(r);
  }
  await d.table(tabella).bulkPut(valide);
  return { importate: valide.length, errori };
}

async function controllaRiferimenti(d: AutoDb, t: TabellaCsv, r: Record<string, unknown>): Promise<string | null> {
  const esiste = async (tab: string, id: unknown) => id == null || (await d.table(tab).get(id as string)) != null;
  if (t === 'varianti' && !(await esiste('famiglie', r.famigliaId))) return `famiglia "${r.famigliaId}" inesistente`;
  if (t === 'modelliMotori' || t === 'annunci') {
    if (!(await esiste('modelli', r.modelloId))) return `modello "${r.modelloId}" inesistente`;
    if (!(await esiste('varianti', r.varianteId))) return `variante "${r.varianteId}" inesistente`;
  }
  return null;
}

/** Scarica un testo come file nel browser. */
export function scaricaFile(nome: string, contenuto: string, tipo = 'text/plain') {
  const bom = tipo === 'text/csv' ? '\uFEFF' : ''; // il BOM fa leggere gli accenti a Excel
  const blob = new Blob([bom + contenuto], { type: `${tipo};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
