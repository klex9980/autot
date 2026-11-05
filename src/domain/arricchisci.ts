import type { Catalogo } from '../db/hooks';
import type { Annuncio, FamigliaMotore, ModelloAuto, VarianteMotore } from '../db/schema';

/** Annuncio con i dati tecnici collegati e le grandezze derivate. */
export interface AnnuncioArricchito {
  annuncio: Annuncio;
  modello: ModelloAuto | null;
  variante: VarianteMotore | null;
  famiglia: FamigliaMotore | null;
  potenzaCv: number | null;
  pesoKg: number | null;
  /** €/CV: quanto si paga ogni cavallo */
  euroPerCv: number | null;
  /** kg/CV: più è basso, più l'auto è brillante */
  kgPerCv: number | null;
}

/** Parte di Catalogo che serve qui (comoda nei test). */
export type CatalogoMin = Pick<Catalogo, 'famiglie' | 'varianti' | 'modelli'>;

export function arricchisci(a: Annuncio, c: CatalogoMin): AnnuncioArricchito {
  const modello = (a.modelloId && c.modelli.get(a.modelloId)) || null;
  const variante = (a.varianteId && c.varianti.get(a.varianteId)) || null;
  const famiglia = (variante && c.famiglie.get(variante.famigliaId)) || null;
  const potenzaCv = variante?.potenzaCv || null;
  const pesoKg = modello?.pesoVuotoKg ?? null;
  return {
    annuncio: a, modello, variante, famiglia, potenzaCv, pesoKg,
    euroPerCv: a.prezzo != null && potenzaCv ? a.prezzo / potenzaCv : null,
    kgPerCv: pesoKg != null && potenzaCv ? pesoKg / potenzaCv : null,
  };
}

export const arricchisciTutti = (annunci: Annuncio[], c: CatalogoMin) => annunci.map((a) => arricchisci(a, c));
