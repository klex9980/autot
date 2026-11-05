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

/** Formatta all'italiana con il punto delle migliaia anche sotto 10.000 (Intl lo omette). */
export function formatta(n: number, decimali = 1): string {
  const [int, dec] = Math.abs(n).toFixed(decimali).split('.');
  const conPunti = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPulito = dec?.replace(/0+$/, '');
  return (n < 0 ? '-' : '') + conPunti + (decPulito ? ',' + decPulito : '');
}

export const euro = (n: number | null | undefined) => (n == null ? '—' : `${formatta(Math.round(n), 0)} €`);
export const num = (n: number | null | undefined, suffisso = '', decimali = 1) =>
  n == null ? '—' : formatta(n, decimali) + (suffisso ? ` ${suffisso}` : '');
export const percento = (x: number | null | undefined) =>
  x == null ? '—' : `${x > 0 ? '+' : ''}${formatta(x * 100, 0)}%`;

export const cvDaKw = (kw: number) => Math.round(kw * 1.35962);
export const kwDaCv = (cv: number) => Math.round(cv / 1.35962);
