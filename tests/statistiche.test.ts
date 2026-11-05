import { describe, expect, it } from 'vitest';
import { arricchisci, arricchisciTutti } from '../src/domain/arricchisci';
import { applicaFiltri, contaFiltriAttivi, filtriVuoti } from '../src/domain/filtri';
import { fascia, FASCE, ordinaGruppi, raggruppa } from '../src/domain/gruppi';
import { media, mediana, statistiche } from '../src/domain/statistiche';
import { annuncio, catalogo } from './fixture';

const cat = catalogo();

describe('media e mediana', () => {
  it('ignorano i valori mancanti', () => {
    expect(media([1, null, 3])).toBe(2);
    expect(mediana([5, 1, null, 3])).toBe(3);
    expect(mediana([4, 1, 3, 2])).toBe(2.5);
    expect(media([])).toBeNull();
    expect(mediana([null])).toBeNull();
  });
});

describe('arricchimento', () => {
  it('calcola €/CV e kg/CV', () => {
    const x = arricchisci(annuncio({ prezzo: 12000, varianteId: 'v100', modelloId: 'm1' }), cat);
    expect(x.euroPerCv).toBe(120);
    expect(x.kgPerCv).toBe(11);
    expect(x.famiglia?.cilindri).toBe(3);
  });
  it('lascia null se mancano i dati', () => {
    const x = arricchisci(annuncio({ prezzo: null, varianteId: null, modelloId: 'm2' }), cat);
    expect(x).toMatchObject({ euroPerCv: null, kgPerCv: null, famiglia: null, pesoKg: null });
  });
});

describe('statistiche di gruppo', () => {
  it('calcola i valori principali', () => {
    const xs = arricchisciTutti([
      annuncio({ prezzo: 10000, km: 50000 }), annuncio({ prezzo: 12000, km: 70000 }), annuncio({ prezzo: 20000, km: null }),
    ], cat);
    const s = statistiche(xs);
    expect(s).toMatchObject({ n: 3, prezzoMedio: 14000, prezzoMediano: 12000, prezzoMin: 10000, prezzoMax: 20000, kmMedi: 60000 });
    expect(s.euroPerCv).toBe(140);
  });
});

describe('filtri', () => {
  const xs = arricchisciTutti([
    annuncio({ id: 'benz', varianteId: 'v100', prezzo: 9000, anno: 2017 }),
    annuncio({ id: 'dies', varianteId: 'vd', prezzo: 15000, anno: 2020 }),
    annuncio({ id: 'scart', varianteId: 'v100', stato: 'scartato' }),
    annuncio({ id: 'senza', varianteId: null, prezzo: null }),
  ], cat);
  const ids = (f = filtriVuoti()) => applicaFiltri(xs, f).map((x) => x.annuncio.id);

  it('di default esclude gli scartati e tiene chi non ha motore', () => {
    expect(ids()).toEqual(['benz', 'dies', 'senza']);
  });
  it('per cilindri, alimentazione e distribuzione', () => {
    expect(ids({ ...filtriVuoti(), cilindri: [4] })).toEqual(['dies']);
    expect(ids({ ...filtriVuoti(), alimentazioni: ['benzina'] })).toEqual(['benz']);
    expect(ids({ ...filtriVuoti(), distribuzioni: ['catena'] })).toEqual(['dies']);
  });
  it('per intervalli: estremi inclusi, valori mancanti esclusi', () => {
    expect(ids({ ...filtriVuoti(), prezzo: { min: 9000, max: 15000 } })).toEqual(['benz', 'dies']);
    expect(ids({ ...filtriVuoti(), anno: { min: 2019, max: null } })).toEqual(['dies']);
    expect(ids({ ...filtriVuoti(), cilindrata: { min: null, max: 1200 } })).toEqual(['benz']);
  });
  it('conta i filtri attivi', () => {
    expect(contaFiltriAttivi(filtriVuoti())).toBe(0);
    expect(contaFiltriAttivi({ ...filtriVuoti(), cilindri: [3], km: { min: 1, max: null } })).toBe(2);
  });
});

describe('fasce', () => {
  it('assegnano i limiti alla fascia superiore', () => {
    expect(fascia(4999, FASCE.prezzo, '€').nome).toBe('meno di 5.000 €');
    expect(fascia(5000, FASCE.prezzo, '€').nome).toBe('5.000–10.000 €');
    expect(fascia(40000, FASCE.prezzo, '€').nome).toBe('30.000 € e oltre');
    expect(fascia(2012, FASCE.anno, '', true).nome).toBe('fino al 2012');
    expect(fascia(2017, FASCE.anno, '', true).nome).toBe('2016–2018');
    expect(fascia(2024, FASCE.anno, '', true).nome).toBe('dal 2022');
  });
});

describe('raggruppamento', () => {
  const xs = arricchisciTutti([
    annuncio({ varianteId: 'v100', prezzo: 8000 }), annuncio({ varianteId: 'v130', prezzo: 11000 }),
    annuncio({ varianteId: 'vd', prezzo: 14000 }), annuncio({ varianteId: null, prezzo: 5000 }),
  ], cat);

  it('per numero cilindri, con "Non indicato" in fondo', () => {
    const g = raggruppa(xs, 'cilindri');
    expect(g.map((x) => [x.nome, x.stat.n])).toEqual([['3 cilindri', 2], ['4 cilindri', 1], ['Non indicato', 1]]);
    expect(g[0].stat.prezzoMedio).toBe(9500);
  });
  it('per famiglia e per variante', () => {
    expect(raggruppa(xs, 'famiglia').map((g) => g.nome)).toEqual(['1.0 T', '1.6 D', 'Non indicato']);
    expect(raggruppa(xs, 'motore').map((g) => g.nome)).toEqual(['1.0 T 100 CV', '1.0 T 130 CV', '1.6 D 115 CV', 'Non indicato']);
  });
  it('per fascia di prezzo in ordine crescente', () => {
    expect(raggruppa(xs, 'prezzo').map((g) => g.nome)).toEqual(['5.000–10.000 €', '10.000–15.000 €']);
  });
  it('ordinamento per prezzo mediano', () => {
    const g = ordinaGruppi(raggruppa(xs, 'motore'), 'prezzoMediano');
    expect(g.map((x) => x.stat.prezzoMediano)).toEqual([5000, 8000, 11000, 14000]);
  });
});
