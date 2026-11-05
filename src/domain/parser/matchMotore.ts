import type { Catalogo } from '../../db/hooks';
import type { Alimentazione } from '../../db/schema';
import type { RisultatoParser } from './parseAnnuncio';

export interface CandidatoMotore {
  varianteId: string;
  punteggio: number; // 0–100, quanto è probabile
  motivi: string[];
}

type CatalogoMatch = Pick<Catalogo, 'famiglie' | 'varianti' | 'motoriPerModello'>;

const affini = (a: Alimentazione, b: Alimentazione) =>
  a === b || (['ibrido', 'mild_hybrid', 'ibrido_plugin'].includes(a) && ['ibrido', 'mild_hybrid', 'ibrido_plugin'].includes(b));

/** Punteggi parziali: modello 40, potenza 30, sigla 20, alimentazione 15, cilindrata 15 (max 120 → scalato a 100). */
const MAX = 120;

export function proponiMotori(p: RisultatoParser, cat: CatalogoMatch, quanti = 3): CandidatoMotore[] {
  const delModello = p.modelloId ? cat.motoriPerModello.get(p.modelloId) : undefined;
  const indizi = delModello?.size || p.potenzaCv || p.alimentazione || p.paroleMotore.length || p.cilindrataLitri || p.cilindrataCc;
  if (!indizi) return [];

  const out: CandidatoMotore[] = [];
  for (const v of cat.varianti.values()) {
    const f = cat.famiglie.get(v.famigliaId);
    if (!f) continue;
    let s = 0;
    const motivi: string[] = [];
    if (delModello?.has(v.id)) { s += 40; motivi.push('montato su questo modello'); }
    else if (delModello?.size) s -= 10;

    if (p.potenzaCv) {
      const d = Math.abs(v.potenzaCv - p.potenzaCv);
      if (d <= 2) { s += 30; motivi.push(`potenza ${v.potenzaCv} CV`); }
      else if (d <= 5) { s += 20; motivi.push(`potenza simile (${v.potenzaCv} CV)`); }
      else if (d <= 10) s += 6;
      else s -= 25;
    }
    if (p.alimentazione) {
      if (f.alimentazione === p.alimentazione) { s += 15; motivi.push('stessa alimentazione'); }
      else if (affini(f.alimentazione, p.alimentazione)) s += 8;
      else s -= 30;
    }
    if (f.cilindrata) {
      if (p.cilindrataCc) {
        const d = Math.abs(f.cilindrata - p.cilindrataCc);
        if (d <= 60) { s += 15; motivi.push(`cilindrata ${f.cilindrata} cc`); } else if (d > 200) s -= 15;
      } else if (p.cilindrataLitri) {
        const d = Math.abs(f.cilindrata / 1000 - p.cilindrataLitri);
        if (d <= 0.08) { s += 15; motivi.push(`cilindrata ${p.cilindrataLitri.toFixed(1)}`); } else if (d > 0.2) s -= 15;
      }
    }
    const sigla = f.sigla.toLowerCase();
    const parole = p.paroleMotore.filter((w) => new RegExp(`(?<![a-z])${w.toLowerCase().replace(/[-]/g, '\\-')}(?![a-z])`).test(sigla));
    if (parole.length) { s += 20; motivi.push(`sigla ${parole.join(', ')}`); }

    if (s > 0) out.push({ varianteId: v.id, punteggio: Math.min(100, Math.round((s / MAX) * 100)), motivi });
  }
  return out.sort((a, b) => b.punteggio - a.punteggio).slice(0, quanti);
}
