import { describe, expect, it } from 'vitest';
import { datiSeed } from '../src/db/seed';
import { proponiMotori } from '../src/domain/parser/matchMotore';
import { parseAnnuncio } from '../src/domain/parser/parseAnnuncio';

const s = datiSeed();
const motoriPerModello = new Map<string, Set<string>>();
for (const r of s.modelliMotori) {
  if (!motoriPerModello.has(r.modelloId)) motoriPerModello.set(r.modelloId, new Set());
  motoriPerModello.get(r.modelloId)!.add(r.varianteId);
}
const cat = {
  famiglie: new Map(s.famiglie.map((x) => [x.id, x])),
  varianti: new Map(s.varianti.map((x) => [x.id, x])),
  motoriPerModello,
};
const parse = (t: string) => parseAnnuncio(t, s.modelli, 2026);

describe('parser annuncio: formato portale', () => {
  const testo = `Volkswagen Golf 1.5 TSI ACT DSG Highline BlueMotion
€ 18.900
Chilometraggio 62.000 km
Immatricolazione 03/2019
Potenza 110 kW (150 CV)
Cambio Automatico
Alimentazione Benzina
Cilindrata 1.498 cm³
Climatizzatore automatico bizona, alzacristalli elettrici`;
  const r = parse(testo);

  it('estrae i campi principali', () => {
    expect(r).toMatchObject({
      marca: 'Volkswagen', modelloId: 'vw-golf-7', anno: 2019, mese: 3, km: 62000, prezzo: 18900,
      alimentazione: 'benzina', potenzaCv: 150, potenzaKw: 110, cilindrataCc: 1498, cilindrataLitri: 1.5,
    });
    expect(r.paroleMotore).toContain('TSI');
    expect(r.avvisi).toEqual([]);
  });

  it('il campo "Cambio" vince su DSG? no: DSG è più specifico ma il campo dice Automatico', () => {
    expect(r.cambio).toBe('automatico');
  });

  it('propone il motore giusto per primo', () => {
    const c = proponiMotori(r, cat);
    expect(c[0].varianteId).toBe('vw-1.5-tsi-evo-150');
    expect(c[0].punteggio).toBeGreaterThanOrEqual(90);
    expect(c[0].motivi.join()).toMatch(/modello/);
  });
});

describe('parser annuncio: testo libero da privato', () => {
  const r = parse(`Vendo Fiat Panda 1.2 benzina del 2016, km 85000, unico proprietario, tagliandi in Fiat.
Gomme nuove, revisione fatta. Prezzo 6.500 euro trattabili. Zona Bologna.`);

  it('legge anno da "del 2016", km e prezzo senza simbolo €', () => {
    expect(r).toMatchObject({ marca: 'Fiat', modelloId: 'fiat-panda-3', anno: 2016, km: 85000, prezzo: 6500, alimentazione: 'benzina' });
    expect(r.potenzaCv).toBeNull();
  });

  it('senza potenza propone comunque il 1.2 Fire', () => {
    expect(proponiMotori(r, cat)[0].varianteId).toBe('fiat-1.2-fire-69');
  });
});

describe('parser annuncio: casi difficili', () => {
  it('ignora la rata mensile e l\'anticipo', () => {
    const r = parse('Peugeot 208 PureTech 100 Allure\nDa 199 €/mese, anticipo 2.500 €\nPrezzo: 15.400 €\n2021 - 30.000 km');
    expect(r.prezzo).toBe(15400);
    expect(r).toMatchObject({ modelloId: 'peugeot-208-2', anno: 2021, km: 30000, potenzaCv: 100, alimentazione: 'benzina' });
    expect(proponiMotori(r, cat)[0].varianteId).toBe('psa-1.2-puretech-100');
  });

  it('"alzacristalli elettrici" e "climatizzatore automatico" non ingannano', () => {
    const r = parse('Renault Clio 1.5 dCi 90 CV, 2017, 110.000 km, 7.900 €. Alzacristalli elettrici, climatizzatore automatico, cambio manuale.');
    expect(r.alimentazione).toBe('diesel');
    expect(r.cambio).toBe('manuale');
    expect(proponiMotori(r, cat)[0].varianteId).toBe('renault-1.5-dci-90');
  });

  it('solo kW → calcola i CV', () => {
    const r = parse('Toyota Yaris Hybrid 85 kW, anno 2021, 40.500 km, prezzo 17.990 €');
    expect(r.potenzaCv).toBe(116);
    expect(r.alimentazione).toBe('ibrido');
    expect(r.cambio).toBeNull();
    expect(proponiMotori(r, cat)[0].varianteId).toBe('toyota-1.5-hybrid-116');
  });

  it('nome modello numerico solo subito dopo la marca ("Mazda 3")', () => {
    const r = parse('Mazda 3 2.0 Skyactiv-G 120 CV Evolve, 3 porte, 2015, 98.000 km, 10.500 €');
    expect(r).toMatchObject({ modelloId: 'mazda-3-3', potenzaCv: 120, anno: 2015, prezzo: 10500 });
    expect(proponiMotori(r, cat)[0].varianteId).toBe('mazda-2.0-skyactiv-g-120');
  });

  it('sceglie la generazione in base all\'anno', () => {
    const vecchia = parse('Opel Astra 1.4 Turbo GPL-Tech 140 CV 2013 120.000 km 7.000 €');
    expect(vecchia.modelloId).toBe('opel-astra-j');
    expect(vecchia.alimentazione).toBe('GPL');
    expect(proponiMotori(vecchia, cat)[0].varianteId).toBe('opel-1.4-turbo-gpl-140');
  });

  it('marca o modello sconosciuti → avviso, ma estrae il resto', () => {
    const r = parse('Skoda Octavia 2.0 TDI 150 CV 2019 90.000 km 16.500 €');
    expect(r.marca).toBe('Skoda');
    expect(r.modelloTesto).toBe('Octavia');
    expect(r.modelloId).toBeNull();
    expect(r.avvisi.join()).toMatch(/non presente nel catalogo/);
    // stesso motore del gruppo VW: lo propone anche senza modello
    expect(proponiMotori(r, cat)[0].varianteId).toBe('vw-2.0-tdi-150');
  });

  it('numeri con spazio o apostrofo come separatore e "km" prima del numero', () => {
    const r = parse("Ford Fiesta 1.0 EcoBoost 125cv - Km 45 000 - € 11'900 - 06/2019");
    expect(r).toMatchObject({ km: 45000, prezzo: 11900, anno: 2019, mese: 6, potenzaCv: 125 });
  });

  it('non scambia cilindrata o prezzo per l\'anno', () => {
    const r = parse('Mazda 3 Skyactiv-G 1998 cc, 165 CV, 2.000 € di optional, immatricolata nel 2017');
    expect(r.anno).toBe(2017);
    expect(r.cilindrataCc).toBe(1998);
  });

  it('testo vuoto o senza dati', () => {
    const r = parse('bella macchina, chiamare ore pasti');
    expect(r).toMatchObject({ marca: null, anno: null, km: null, prezzo: null });
    expect(r.avvisi.length).toBeGreaterThanOrEqual(4);
    expect(proponiMotori(r, cat)).toEqual([]);
  });
});

describe('potenza senza unità dopo la sigla', () => {
  it.each([
    ['Volkswagen Polo 1.0 TSI 95 Comfortline 2019', 95],
    ['Peugeot 308 1.2 PureTech 130 S&S Allure', 130],
    ['Fiat 500 1.2 Fire 69 Lounge', 69],
  ])('%s → %i CV', (t, cv) => expect(parse(t).potenzaCv).toBe(cv));

  it('non confonde porte o cilindrata', () => {
    expect(parse('Fiat 500 1.2 Fire 3 porte').potenzaCv).toBeNull();
    expect(parse('Kia Ceed 1.6 CRDi 1582 cc').potenzaCv).toBeNull();
  });
});
