import type { Punteggio } from '../domain/punteggio';

/** Punteggio motore compatto: ⭐ 72 (con asterisco se parziale). */
export function BadgePunteggio({ p }: { p: Punteggio | undefined }) {
  if (p?.totale == null) return null;
  const classe = p.totale < 40 ? 'avviso' : ''; // il verde resta riservato alla convenienza
  return (
    <span className={`badge ${classe}`} title={`Punteggio motore${p.parziale ? ' (parziale: mancano alcuni dati)' : ''}`}>
      ⭐ {p.totale}{p.parziale ? '*' : ''}
    </span>
  );
}
