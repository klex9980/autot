import { describe, expect, it } from 'vitest';
import { arricchisciTutti } from '../src/domain/arricchisci';
import { valutaConvenienza } from '../src/domain/convenienza';
import { annuncio, catalogo } from './fixture';

const cat = catalogo();
const prova = (lista: Parameters<typeof annuncio>[0][], min = 5) => {
  const xs = arricchisciTutti(lista.map(annuncio), cat);
  return valutaConvenienza(xs[0], xs, min);
};
// 5 annunci simili allo stesso modello/motore: prezzi 10k..14k → mediana 12k
const simili = [10000, 11000, 12000, 13000, 14000].map((prezzo) => ({ prezzo, anno: 2018, km: 80000 }));

describe('annunci convenienti', () => {
  it('sotto la mediana di annunci simili → conveniente', () => {
    const r = prova([{ prezzo: 9600 }, ...simili]);
    expect(r).toMatchObject({ mediana: 12000, campione: 5, conveniente: true });
    expect(r.scarto).toBeCloseTo(-0.2);
    expect(r.livello?.stessoModello).toBe(true);
  });

  it('sopra la mediana → non conveniente', () => {
    const r = prova([{ prezzo: 15000 }, ...simili]);
    expect(r.conveniente).toBe(false);
    expect(r.scarto).toBeCloseTo(0.25);
  });

  it('esclude sé stesso e chi è fuori da anno ±2 o km ±30.000', () => {
    const r = prova([
      { prezzo: 9000 }, ...simili,
      { prezzo: 1000, anno: 2015 }, // anno -3
      { prezzo: 1000, km: 111000 }, // km +31.000
      { prezzo: 1000, varianteId: 'v130' }, // altro motore
    ]);
    expect(r.campione).toBe(5);
    expect(r.mediana).toBe(12000);
  });

  it('allarga a modelli diversi con lo stesso motore se il campione è piccolo', () => {
    const r = prova([{ prezzo: 9000 }, ...simili.slice(0, 2), ...simili.slice(2).map((s) => ({ ...s, modelloId: 'm2' }))]);
    expect(r.campione).toBe(5);
    expect(r.livello?.stessoModello).toBe(false);
    expect(r.livello?.annoDelta).toBe(2);
  });

  it('allarga ad anno ±3 e km ±50.000 come ultimo passo', () => {
    const r = prova([{ prezzo: 9000 }, ...simili.slice(0, 3), { prezzo: 12500, anno: 2021 }, { prezzo: 12500, km: 125000 }]);
    expect(r.campione).toBe(5);
    expect(r.livello?.annoDelta).toBe(3);
  });

  it('con meno di 5 annunci simili non dà un giudizio', () => {
    const r = prova([{ prezzo: 9000 }, ...simili.slice(0, 4)]);
    expect(r).toMatchObject({ mediana: null, conveniente: false, campione: 4 });
    expect(r.motivo).toMatch(/4 annunci simili/);
  });

  it('richiede prezzo, anno, km e motore', () => {
    expect(prova([{ km: null }, ...simili]).motivo).toMatch(/servono/);
    expect(prova([{ varianteId: null }, ...simili]).motivo).toMatch(/servono/);
  });

  it('soglia minima configurabile', () => {
    expect(prova([{ prezzo: 9000 }, ...simili.slice(0, 3)], 3).mediana).toBe(11000);
  });
});
