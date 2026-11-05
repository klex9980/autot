import Dexie, { type EntityTable } from 'dexie';
import type {
  Annuncio, FamigliaMotore, Impostazione, ModelloAuto, ModelloMotore, VarianteMotore,
} from './schema';
import { datiSeed } from './seed';

export class AutoDb extends Dexie {
  famiglie!: EntityTable<FamigliaMotore, 'id'>;
  varianti!: EntityTable<VarianteMotore, 'id'>;
  modelli!: EntityTable<ModelloAuto, 'id'>;
  modelliMotori!: Dexie.Table<ModelloMotore, [string, string]>;
  annunci!: EntityTable<Annuncio, 'id'>;
  impostazioni!: EntityTable<Impostazione, 'chiave'>;

  constructor(nome = 'auto-confronto') {
    super(nome);
    this.version(1).stores({
      famiglie: 'id, sigla, costruttore, alimentazione',
      varianti: 'id, famigliaId',
      modelli: 'id, marca, modello',
      modelliMotori: '[modelloId+varianteId], modelloId, varianteId',
      annunci: 'id, modelloId, varianteId, stato, prezzo, anno, km, dataInserimento',
      impostazioni: 'chiave',
    });
    // Al primo avvio carica motori e modelli iniziali.
    this.on('populate', (tx) => {
      const s = datiSeed();
      tx.table('famiglie').bulkAdd(s.famiglie);
      tx.table('varianti').bulkAdd(s.varianti);
      tx.table('modelli').bulkAdd(s.modelli);
      tx.table('modelliMotori').bulkAdd(s.modelliMotori);
    });
  }
}

export const db = new AutoDb();

export const TABELLE = ['famiglie', 'varianti', 'modelli', 'modelliMotori', 'annunci', 'impostazioni'] as const;
export type NomeTabella = (typeof TABELLE)[number];

export const nuovoId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);

export const oggiIso = (): string => new Date().toISOString().slice(0, 10);

/** Elimina una famiglia con le sue varianti, se nessun annuncio le usa. */
export async function eliminaFamiglia(d: AutoDb, id: string): Promise<string | null> {
  const varianti = await d.varianti.where('famigliaId').equals(id).primaryKeys();
  const usate = await d.annunci.where('varianteId').anyOf(varianti).count();
  if (usate > 0) return `Impossibile eliminare: ${usate} annunci usano questo motore.`;
  await d.transaction('rw', d.famiglie, d.varianti, d.modelliMotori, async () => {
    await d.modelliMotori.where('varianteId').anyOf(varianti).delete();
    await d.varianti.bulkDelete(varianti);
    await d.famiglie.delete(id);
  });
  return null;
}

/** Elimina una variante se nessun annuncio la usa. */
export async function eliminaVariante(d: AutoDb, id: string): Promise<string | null> {
  const usate = await d.annunci.where('varianteId').equals(id).count();
  if (usate > 0) return `Impossibile eliminare: ${usate} annunci usano questa variante.`;
  await d.transaction('rw', d.varianti, d.modelliMotori, async () => {
    await d.modelliMotori.where('varianteId').equals(id).delete();
    await d.varianti.delete(id);
  });
  return null;
}

export async function eliminaModello(d: AutoDb, id: string): Promise<string | null> {
  const usati = await d.annunci.where('modelloId').equals(id).count();
  if (usati > 0) return `Impossibile eliminare: ${usati} annunci usano questo modello.`;
  await d.transaction('rw', d.modelli, d.modelliMotori, async () => {
    await d.modelliMotori.where('modelloId').equals(id).delete();
    await d.modelli.delete(id);
  });
  return null;
}

/** Sostituisce le varianti associate a un modello. */
export async function impostaMotoriModello(d: AutoDb, modelloId: string, varianteIds: string[]) {
  await d.transaction('rw', d.modelliMotori, async () => {
    await d.modelliMotori.where('modelloId').equals(modelloId).delete();
    await d.modelliMotori.bulkAdd(varianteIds.map((varianteId) => ({ modelloId, varianteId })));
  });
}
