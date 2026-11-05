import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { FamigliaMotore, ModelloAuto, VarianteMotore } from './schema';

export interface Catalogo {
  famiglie: Map<string, FamigliaMotore>;
  varianti: Map<string, VarianteMotore>;
  modelli: Map<string, ModelloAuto>;
  /** modelloId → id delle varianti montate */
  motoriPerModello: Map<string, Set<string>>;
}

/** Carica motori e modelli (si aggiorna da solo quando cambiano). */
export function useCatalogo(): Catalogo | undefined {
  return useLiveQuery(async () => {
    const [f, v, m, mm] = await Promise.all([
      db.famiglie.toArray(), db.varianti.toArray(), db.modelli.toArray(), db.modelliMotori.toArray(),
    ]);
    const motoriPerModello = new Map<string, Set<string>>();
    for (const r of mm) {
      if (!motoriPerModello.has(r.modelloId)) motoriPerModello.set(r.modelloId, new Set());
      motoriPerModello.get(r.modelloId)!.add(r.varianteId);
    }
    return {
      famiglie: new Map(f.map((x) => [x.id, x])),
      varianti: new Map(v.map((x) => [x.id, x])),
      modelli: new Map(m.map((x) => [x.id, x])),
      motoriPerModello,
    };
  });
}

export const nomeModello = (m: ModelloAuto | undefined) =>
  m ? `${m.marca} ${m.modello}${m.generazione ? ` (${m.generazione})` : ''}` : 'Modello non indicato';

export function nomeVariante(c: Catalogo, varianteId: string | null): string {
  if (!varianteId) return 'Motore non indicato';
  const v = c.varianti.get(varianteId);
  if (!v) return 'Motore sconosciuto';
  const f = c.famiglie.get(v.famigliaId);
  return `${f?.sigla ?? '?'} ${v.potenzaCv} CV`;
}

export const ordinaModelli = (a: ModelloAuto, b: ModelloAuto) =>
  a.marca.localeCompare(b.marca) || a.modello.localeCompare(b.modello) || (a.annoInizio ?? 0) - (b.annoInizio ?? 0);
