import Papa from 'papaparse';
import { parseNumero } from './numeri';

/**
 * Import/export CSV generico guidato da una specifica di colonne.
 * Separatore ";" (default di Excel in italiano). Le liste usano " | ",
 * i campi strutturati (es. storico prezzi) sono serializzati in JSON.
 */
export type TipoColonna = 'testo' | 'numero' | 'lista' | 'json' | 'scelta';

export interface Colonna {
  chiave: string;
  tipo: TipoColonna;
  obbligatoria?: boolean;
  valori?: readonly string[]; // per tipo "scelta"
  /** valore usato se la cella è vuota (default: null, "" per testo, [] per lista) */
  predefinito?: unknown;
}

export const SEP_LISTA = ' | ';

function serializza(v: unknown, c: Colonna): string {
  if (v == null) return '';
  switch (c.tipo) {
    case 'lista': return (v as string[]).join(SEP_LISTA);
    case 'json': return JSON.stringify(v);
    case 'numero': return String(v); // punto decimale: non ambiguo
    default: return String(v);
  }
}

export function aCsv(righe: object[], colonne: Colonna[]): string {
  const dati = righe.map((r) =>
    colonne.map((c) => serializza((r as Record<string, unknown>)[c.chiave], c)),
  );
  return Papa.unparse({ fields: colonne.map((c) => c.chiave), data: dati }, { delimiter: ';' });
}

export interface RisultatoImport<T> {
  righe: T[];
  errori: string[];
}

function vuoto(c: Colonna): unknown {
  if (c.predefinito !== undefined) return c.predefinito;
  if (c.tipo === 'testo') return '';
  if (c.tipo === 'lista') return [];
  return null;
}

export function daCsv<T>(testo: string, colonne: Colonna[]): RisultatoImport<T> {
  const parsed = Papa.parse<Record<string, string>>(testo.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'), {
    header: true,
    skipEmptyLines: 'greedy',
    delimiter: '', // rileva automaticamente ; o ,
    transformHeader: (h) => h.trim(),
  });
  const errori = parsed.errors.map((e) => `Riga ${(e.row ?? 0) + 2}: ${e.message}`);
  const intestazioni = parsed.meta.fields ?? [];
  const mancanti = colonne.filter((c) => c.obbligatoria && !intestazioni.includes(c.chiave));
  if (mancanti.length) {
    return { righe: [], errori: [`Colonne obbligatorie mancanti: ${mancanti.map((c) => c.chiave).join(', ')}`] };
  }

  const righe: T[] = [];
  parsed.data.forEach((raw, i) => {
    const nRiga = i + 2; // +1 intestazione, +1 base 1
    const out: Record<string, unknown> = {};
    let ok = true;
    for (const c of colonne) {
      const cella = (raw[c.chiave] ?? '').trim();
      if (cella === '') {
        if (c.obbligatoria) { errori.push(`Riga ${nRiga}: "${c.chiave}" obbligatorio`); ok = false; }
        out[c.chiave] = vuoto(c);
        continue;
      }
      switch (c.tipo) {
        case 'numero': {
          const n = parseNumero(cella);
          if (n == null) { errori.push(`Riga ${nRiga}: "${c.chiave}" non è un numero (${cella})`); ok = false; }
          out[c.chiave] = n;
          break;
        }
        case 'lista':
          out[c.chiave] = cella.split('|').map((s) => s.trim()).filter(Boolean);
          break;
        case 'json':
          try { out[c.chiave] = JSON.parse(cella); } catch {
            errori.push(`Riga ${nRiga}: "${c.chiave}" JSON non valido`); ok = false;
          }
          break;
        case 'scelta':
          if (c.valori && !c.valori.includes(cella)) {
            errori.push(`Riga ${nRiga}: "${c.chiave}" valore non ammesso (${cella}); ammessi: ${c.valori.join(', ')}`);
            ok = false;
          }
          out[c.chiave] = cella;
          break;
        default:
          out[c.chiave] = cella;
      }
    }
    if (ok) righe.push(out as T);
  });
  return { righe, errori };
}
