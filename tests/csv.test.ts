import { describe, expect, it } from 'vitest';
import { COLONNE_CSV } from '../src/domain/colonneCsv';
import { aCsv, daCsv } from '../src/domain/csv';
import type { Annuncio, FamigliaMotore } from '../src/db/schema';

const famiglia: FamigliaMotore = {
  id: 'x', sigla: 'Test 1.0; "turbo"', costruttore: 'Prova', cilindrata: 999, cilindri: 3,
  alimentazione: 'benzina', aspirazione: 'turbo', distribuzione: 'catena', intervalloDistribuzioneKm: null,
  affidabilita: 4, difettiNoti: 'riga 1\nriga 2', fonti: ['https://a.it', 'https://b.it'], daVerificare: ['affidabilita'],
};

describe('CSV', () => {
  it('andata e ritorno senza perdita di dati', () => {
    const testo = aCsv([famiglia], COLONNE_CSV.famiglie);
    const { righe, errori } = daCsv<FamigliaMotore>(testo, COLONNE_CSV.famiglie);
    expect(errori).toEqual([]);
    expect(righe).toEqual([famiglia]);
  });

  it('annuncio con storico prezzi in JSON e valori predefiniti', () => {
    const csv = 'prezzo;km;storicoPrezzi;stato\n"12.500";"85.000";"[{""data"":""2026-01-01"",""prezzo"":13000}]";';
    const { righe, errori } = daCsv<Annuncio>(csv, COLONNE_CSV.annunci);
    expect(errori).toEqual([]);
    expect(righe[0].prezzo).toBe(12500);
    expect(righe[0].km).toBe(85000);
    expect(righe[0].storicoPrezzi).toEqual([{ data: '2026-01-01', prezzo: 13000 }]);
    expect(righe[0].stato).toBe('da_vedere');
    expect(righe[0].tagliandiDocumentati).toBe('non_so');
    expect(righe[0].modelloId).toBeNull();
  });

  it('accetta anche la virgola come separatore', () => {
    const { righe } = daCsv<Annuncio>('prezzo,anno\n9900,2018', COLONNE_CSV.annunci);
    expect(righe[0]).toMatchObject({ prezzo: 9900, anno: 2018 });
  });

  it('segnala valori non validi e scarta la riga', () => {
    const csv = 'sigla;alimentazione;aspirazione;distribuzione;cilindri\nA;benzina;turbo;catena;tre\nB;nafta;turbo;catena;4\nC;diesel;turbo;cinghia;4';
    const { righe, errori } = daCsv<FamigliaMotore>(csv, COLONNE_CSV.famiglie);
    expect(righe.map((r) => r.sigla)).toEqual(['C']);
    expect(errori).toHaveLength(2);
    expect(errori[0]).toMatch(/Riga 2.*cilindri/);
    expect(errori[1]).toMatch(/Riga 3.*alimentazione/);
  });

  it('segnala colonne obbligatorie mancanti', () => {
    const { righe, errori } = daCsv('sigla\nA', COLONNE_CSV.famiglie);
    expect(righe).toEqual([]);
    expect(errori[0]).toMatch(/alimentazione/);
  });
});
