import { describe, expect, it } from 'vitest';
import { datiSeed } from '../src/db/seed';
import {
  bolloStimato, calcolaPunteggio, calcolaRiferimenti, classeEuroNumero, costoEnergia100km, datiMotori,
  normalizzaInverso, PESI_PREDEFINITI, PREZZI_PREDEFINITI, punteggiMotori, type DatiMotore,
} from '../src/domain/punteggio';

describe('bollo stimato', () => {
  it('Euro 6 sotto e sopra i 100 kW', () => {
    expect(bolloStimato(81, 'Euro 6d-TEMP', 'benzina').importo).toBeCloseTo(81 * 2.58);
    expect(bolloStimato(110, 'Euro 6', 'benzina').importo).toBeCloseTo(100 * 2.58 + 10 * 3.87);
  });
  it('classi Euro più vecchie costano di più', () => {
    expect(bolloStimato(70, 'Euro 3', 'diesel').importo).toBeCloseTo(70 * 2.7);
    expect(bolloStimato(70, 'Euro 0', 'benzina').importo).toBeGreaterThan(bolloStimato(70, 'Euro 4', 'benzina').importo);
  });
  it('classe sconosciuta → Euro 6 con nota', () => {
    const b = bolloStimato(74, null, 'benzina');
    expect(b.importo).toBeCloseTo(74 * 2.58);
    expect(b.note.join()).toMatch(/Euro 6/);
  });
  it('superbollo oltre 185 kW', () => {
    expect(bolloStimato(200, 'Euro 6', 'benzina').importo).toBeCloseTo(258 + 387 + 15 * 20);
  });
  it('elettrica ridotta, GPL con nota sulle regioni', () => {
    expect(bolloStimato(100, 'Euro 6', 'elettrico').importo).toBeCloseTo(64.5);
    expect(bolloStimato(100, 'Euro 6', 'GPL').note.join()).toMatch(/regioni/);
  });
  it('legge la classe Euro dal testo', () => {
    expect(classeEuroNumero('Euro 6d-TEMP')).toBe(6);
    expect(classeEuroNumero('EURO5')).toBe(5);
    expect(classeEuroNumero('boh')).toBeNull();
  });
});

describe('costo carburante', () => {
  it('usa il prezzo giusto per alimentazione', () => {
    expect(costoEnergia100km(5, 'benzina', PREZZI_PREDEFINITI)).toBeCloseTo(9);
    expect(costoEnergia100km(4, 'diesel', PREZZI_PREDEFINITI)).toBeCloseTo(6.8);
    expect(costoEnergia100km(8, 'GPL', PREZZI_PREDEFINITI)).toBeCloseTo(6);
    expect(costoEnergia100km(4, 'ibrido', PREZZI_PREDEFINITI)).toBeCloseTo(7.2);
    expect(costoEnergia100km(null, 'benzina', PREZZI_PREDEFINITI)).toBeNull();
  });
});

describe('normalizzazione', () => {
  it('più basso = meglio, limitata a 0–1', () => {
    expect(normalizzaInverso(10, [10, 20])).toBe(1);
    expect(normalizzaInverso(20, [10, 20])).toBe(0);
    expect(normalizzaInverso(15, [10, 20])).toBe(0.5);
    expect(normalizzaInverso(25, [10, 20])).toBe(0);
    expect(normalizzaInverso(7, [7, 7])).toBe(0.5);
    expect(normalizzaInverso(null, [1, 2])).toBeNull();
  });
});

const motore = (p: Partial<DatiMotore>): DatiMotore => ({
  affidabilita: 3, costoEnergia100km: null, bollo: null, distribuzione: null, kgPerCv: null, ...p,
});

describe('punteggio motore', () => {
  const rif = calcolaRiferimenti([
    motore({ costoEnergia100km: 6, bollo: 150, kgPerCv: 8 }),
    motore({ costoEnergia100km: 10, bollo: 350, kgPerCv: 14 }),
  ]);

  it('il motore migliore in tutto fa 100, il peggiore 0', () => {
    const top = calcolaPunteggio(motore({ affidabilita: 5, costoEnergia100km: 6, bollo: 150, distribuzione: 'ingranaggi', kgPerCv: 8 }), rif, PESI_PREDEFINITI);
    expect(top.totale).toBe(100);
    expect(top.parziale).toBe(false);
    const flop = calcolaPunteggio(motore({ affidabilita: 1, costoEnergia100km: 10, bollo: 350, distribuzione: 'cinghia_bagno_olio', kgPerCv: 14 }), rif, PESI_PREDEFINITI);
    // costi = media(0, 0, 0.3) = 0.1 → 100 × 3×0.1 / 10 = 3
    expect(flop.totale).toBe(3);
  });

  it('media pesata delle componenti', () => {
    // affidabilità 0.5, costi media(0.5, 0.5, 0.8)=0.6, peso/potenza 0.5
    const p = calcolaPunteggio(motore({ affidabilita: 3, costoEnergia100km: 8, bollo: 250, distribuzione: 'catena', kgPerCv: 11 }), rif, PESI_PREDEFINITI);
    expect(p.componenti).toEqual({ affidabilita: 0.5, costi: expect.closeTo(0.6), pesoPotenza: 0.5 });
    expect(p.totale).toBe(Math.round((100 * (5 * 0.5 + 3 * 0.6 + 2 * 0.5)) / 10));
  });

  it('i pesi cambiano la classifica', () => {
    const affidabile = motore({ affidabilita: 5, kgPerCv: 14 });
    const brillante = motore({ affidabilita: 2, kgPerCv: 8 });
    const conPesi = (pesi: typeof PESI_PREDEFINITI) =>
      [calcolaPunteggio(affidabile, rif, pesi).totale!, calcolaPunteggio(brillante, rif, pesi).totale!];
    const [a1, b1] = conPesi({ affidabilita: 10, costi: 0, pesoPotenza: 1 });
    expect(a1).toBeGreaterThan(b1);
    const [a2, b2] = conPesi({ affidabilita: 1, costi: 0, pesoPotenza: 10 });
    expect(b2).toBeGreaterThan(a2);
  });

  it('dati mancanti: componente esclusa, pesi ridistribuiti, segnalato come parziale', () => {
    const p = calcolaPunteggio(motore({ affidabilita: 5 }), rif, PESI_PREDEFINITI);
    expect(p.componenti.costi).toBeNull();
    expect(p.componenti.pesoPotenza).toBeNull();
    expect(p.totale).toBe(100);
    expect(p.parziale).toBe(true);
  });

  it('un peso a zero non rende il punteggio parziale', () => {
    const p = calcolaPunteggio(motore({ affidabilita: 5, distribuzione: 'catena' }), rif, { affidabilita: 1, costi: 1, pesoPotenza: 0 });
    expect(p.parziale).toBe(false);
    expect(p.totale).toBe(90);
  });

  it('nessun dato o tutti i pesi a zero → null', () => {
    expect(calcolaPunteggio(motore({ affidabilita: null }), rif, PESI_PREDEFINITI).totale).toBeNull();
    expect(calcolaPunteggio(motore({}), rif, { affidabilita: 0, costi: 0, pesoPotenza: 0 }).totale).toBeNull();
  });
});

describe('punteggio sul catalogo iniziale', () => {
  const s = datiSeed();
  const dati = datiMotori(new Map(s.famiglie.map((f) => [f.id, f])), s.varianti, new Map(s.modelli.map((m) => [m.id, m])), s.modelliMotori, PREZZI_PREDEFINITI);
  const p = punteggiMotori(dati, PESI_PREDEFINITI);

  it('calcola un punteggio 0–100 per ogni variante con dati', () => {
    for (const [id, x] of p) {
      if (x.totale == null) continue;
      expect(x.totale, id).toBeGreaterThanOrEqual(0);
      expect(x.totale, id).toBeLessThanOrEqual(100);
    }
    expect([...p.values()].filter((x) => x.totale != null).length).toBeGreaterThan(30);
  });

  it('kg/CV usa il peso medio dei modelli che montano il motore', () => {
    // 1.8 Hybrid 122 CV: solo Corolla XII (1350 kg)
    expect(dati.get('toyota-1.8-hybrid-122')!.kgPerCv).toBeCloseTo(1350 / 122);
  });

  it('a parità di altro, l\'ibrido Toyota supera il PureTech', () => {
    expect(p.get('toyota-1.8-hybrid-122')!.totale!).toBeGreaterThan(p.get('psa-1.2-puretech-130')!.totale!);
  });
});
