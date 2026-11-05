/**
 * Converte un numero scritto all'italiana o all'inglese in number.
 * "12.500" → 12500, "4,5" → 4.5, "1.234,56" → 1234.56, "€ 9.900" → 9900, "4.5" → 4.5.
 * Restituisce null se il testo non contiene un numero valido.
 */
export function parseNumero(testo: string | null | undefined): number | null {
  if (testo == null) return null;
  let s = String(testo).trim().replace(/[€\s\u00a0']/g, '');
  if (s === '') return null;
  const haPunto = s.includes('.');
  const haVirgola = s.includes(',');
  if (haPunto && haVirgola) {
    // il separatore che compare per ultimo è quello decimale
    s = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else if (haVirgola) {
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) && s.split(',').length > 2 ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (haPunto && /^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, ''); // puntini delle migliaia
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const fmtEuro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fmtNum = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

export const euro = (n: number | null | undefined) => (n == null ? '—' : fmtEuro.format(n));
export const num = (n: number | null | undefined, suffisso = '') =>
  n == null ? '—' : fmtNum.format(n) + (suffisso ? ` ${suffisso}` : '');

export const cvDaKw = (kw: number) => Math.round(kw * 1.35962);
export const kwDaCv = (cv: number) => Math.round(cv / 1.35962);
