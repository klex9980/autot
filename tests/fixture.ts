import type { Annuncio, FamigliaMotore, ModelloAuto, VarianteMotore } from '../src/db/schema';
import type { CatalogoMin } from '../src/domain/arricchisci';

export const famiglia = (p: Partial<FamigliaMotore> & { id: string }): FamigliaMotore => ({
  sigla: p.id, costruttore: '', cilindrata: 1000, cilindri: 3, alimentazione: 'benzina', aspirazione: 'turbo',
  distribuzione: 'cinghia', intervalloDistribuzioneKm: null, affidabilita: 3, difettiNoti: '', fonti: [], daVerificare: [], ...p,
});
export const variante = (p: Partial<VarianteMotore> & { id: string; famigliaId: string }): VarianteMotore => ({
  potenzaCv: 100, potenzaKw: 74, coppiaNm: null, consumoMedio: null, classeEuro: null, note: '', daVerificare: [], ...p,
});
export const modello = (p: Partial<ModelloAuto> & { id: string }): ModelloAuto => ({
  marca: 'Marca', modello: p.id, generazione: '', annoInizio: null, annoFine: null, pesoVuotoKg: 1000, segmento: 'B', daVerificare: [], ...p,
});

let seq = 0;
export const annuncio = (p: Partial<Annuncio>): Annuncio => ({
  id: `a${seq++}`, modelloId: 'm1', varianteId: 'v100', allestimento: '', anno: 2018, km: 80000, prezzo: 10000,
  storicoPrezzi: [], cambio: null, venditore: null, proprietari: null, tagliandiDocumentati: 'non_so',
  distribuzioneFatta: 'non_so', kmDistribuzione: null, garanziaMesi: null, link: '', citta: '',
  dataInserimento: '2026-11-01', note: '', testoOriginale: '', stato: 'da_vedere', ...p,
});

/** Catalogo minimo: un 3 cilindri turbo (100 e 130 CV), un 4 cilindri diesel aspirato-assente, due modelli. */
export function catalogo(): CatalogoMin {
  const f = [
    famiglia({ id: 'f3', sigla: '1.0 T', cilindri: 3, cilindrata: 999 }),
    famiglia({ id: 'f4d', sigla: '1.6 D', cilindri: 4, cilindrata: 1598, alimentazione: 'diesel', distribuzione: 'catena' }),
  ];
  const v = [
    variante({ id: 'v100', famigliaId: 'f3', potenzaCv: 100 }),
    variante({ id: 'v130', famigliaId: 'f3', potenzaCv: 130 }),
    variante({ id: 'vd', famigliaId: 'f4d', potenzaCv: 115 }),
  ];
  const m = [modello({ id: 'm1', pesoVuotoKg: 1100 }), modello({ id: 'm2', pesoVuotoKg: null })];
  return {
    famiglie: new Map(f.map((x) => [x.id, x])),
    varianti: new Map(v.map((x) => [x.id, x])),
    modelli: new Map(m.map((x) => [x.id, x])),
  };
}
