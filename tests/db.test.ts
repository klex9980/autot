import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AutoDb, eliminaFamiglia, eliminaModello, eliminaVariante, impostaMotoriModello } from '../src/db/db';
import { esportaBackup, esportaCsv, importaCsv, ripristinaBackup } from '../src/domain/backup';
import type { Annuncio } from '../src/db/schema';

let d: AutoDb;
let n = 0;
beforeEach(async () => { d = new AutoDb(`test-${n++}`); await d.open(); });
afterEach(async () => { await d.delete(); });

const annuncio = (p: Partial<Annuncio>): Annuncio => ({
  id: 'a1', modelloId: 'vw-golf-7', varianteId: 'vw-1.5-tsi-evo-150', allestimento: '', anno: 2019, km: 60000,
  prezzo: 17500, storicoPrezzi: [], cambio: 'manuale', venditore: 'privato', proprietari: 1,
  tagliandiDocumentati: 'si', distribuzioneFatta: 'non_so', kmDistribuzione: null, garanziaMesi: null,
  link: '', citta: 'Milano', dataInserimento: '2026-11-01', note: '', testoOriginale: '', stato: 'da_vedere', ...p,
});

describe('database', () => {
  it('al primo avvio carica il seed', async () => {
    expect(await d.famiglie.count()).toBeGreaterThanOrEqual(15);
    expect(await d.modelliMotori.where('modelloId').equals('vw-golf-7').count()).toBeGreaterThan(0);
  });

  it('impedisce di eliminare motori e modelli usati da annunci', async () => {
    await d.annunci.add(annuncio({}));
    expect(await eliminaFamiglia(d, 'vw-1.5-tsi-evo')).toMatch(/1 annunci/);
    expect(await eliminaVariante(d, 'vw-1.5-tsi-evo-150')).toMatch(/1 annunci/);
    expect(await eliminaModello(d, 'vw-golf-7')).toMatch(/1 annunci/);
    expect(await d.famiglie.get('vw-1.5-tsi-evo')).toBeDefined();
  });

  it('eliminando una famiglia rimuove varianti e associazioni', async () => {
    expect(await eliminaFamiglia(d, 'vw-1.5-tsi-evo')).toBeNull();
    expect(await d.varianti.where('famigliaId').equals('vw-1.5-tsi-evo').count()).toBe(0);
    expect(await d.modelliMotori.where('varianteId').equals('vw-1.5-tsi-evo-150').count()).toBe(0);
  });

  it('imposta i motori di un modello', async () => {
    await impostaMotoriModello(d, 'vw-golf-7', ['vw-1.0-tsi-110']);
    const r = await d.modelliMotori.where('modelloId').equals('vw-golf-7').toArray();
    expect(r).toEqual([{ modelloId: 'vw-golf-7', varianteId: 'vw-1.0-tsi-110' }]);
  });

  it('import CSV: aggiorna per id, aggiunge i nuovi, scarta riferimenti inesistenti', async () => {
    await d.annunci.add(annuncio({}));
    const csv = await esportaCsv(d, 'annunci');
    const modificato = csv.replace('17500', '16900')
      + '\n;vw-golf-7;;;2018;90000;14000;;;;;;;;;;Roma;;;;'
      + '\n;modello-inesistente;;;2018;90000;14000;;;;;;;;;;Roma;;;;';
    const esito = await importaCsv(d, 'annunci', modificato);
    expect(esito.importate).toBe(2);
    expect(esito.errori.join()).toMatch(/modello-inesistente/);
    expect((await d.annunci.get('a1'))!.prezzo).toBe(16900);
    const nuovo = (await d.annunci.toArray()).find((a) => a.id !== 'a1')!;
    expect(nuovo).toMatchObject({ citta: 'Roma', km: 90000, stato: 'da_vedere' });
    expect(nuovo.dataInserimento).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('backup e ripristino', async () => {
    await d.annunci.add(annuncio({}));
    const json = await esportaBackup(d);
    await d.annunci.clear();
    await d.famiglie.clear();
    await ripristinaBackup(d, json);
    expect(await d.annunci.count()).toBe(1);
    expect(await d.famiglie.count()).toBeGreaterThanOrEqual(15);
    await expect(ripristinaBackup(d, '{"x":1}')).rejects.toThrow(/non valido/);
  });
});
