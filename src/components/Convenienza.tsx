import type { Convenienza } from '../domain/convenienza';
import { euro, percento } from '../domain/numeri';

/** Badge breve per le liste: mostrato solo se il confronto è possibile. */
export function BadgeConvenienza({ c }: { c: Convenienza | undefined }) {
  if (!c || c.scarto == null) return null;
  const titolo = `Mediana ${euro(c.mediana)} su ${c.campione} annunci simili (${c.livello?.nome})`;
  return c.conveniente
    ? <span className="badge conveniente" title={titolo}>💰 {percento(c.scarto)} vs simili</span>
    : <span className="badge" title={titolo}>{percento(c.scarto)} vs simili</span>;
}

/** Spiegazione completa, per il dettaglio annuncio. */
export function DettaglioConvenienza({ c }: { c: Convenienza | undefined }) {
  if (!c) return null;
  if (c.scarto == null) return <div className="tenue" style={{ fontSize: '.88rem' }}>Confronto prezzo: {c.motivo}.</div>;
  return (
    <div style={{ fontSize: '.9rem' }}>
      <strong className={c.conveniente ? 'testo-ok' : ''}>
        {c.conveniente ? 'Sotto' : 'Sopra'} la mediana di {percento(c.scarto)}
      </strong>{' '}
      — mediana {euro(c.mediana)} su {c.campione} annunci simili
      <div className="tenue" style={{ fontSize: '.82rem' }}>Criterio: {c.livello?.nome}</div>
    </div>
  );
}
