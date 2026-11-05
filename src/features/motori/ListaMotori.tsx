import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Val } from '../../components/Campi';
import { useCatalogo } from '../../db/hooks';
import { ALIMENTAZIONI, etichetta, type Alimentazione } from '../../db/schema';
import { num } from '../../domain/numeri';

export function ListaMotori() {
  const cat = useCatalogo();
  const [cerca, setCerca] = useState('');
  const [alim, setAlim] = useState<Alimentazione | ''>('');

  const famiglie = useMemo(() => {
    if (!cat) return [];
    const q = cerca.trim().toLowerCase();
    return [...cat.famiglie.values()]
      .filter((f) => !alim || f.alimentazione === alim)
      .filter((f) => !q || `${f.sigla} ${f.costruttore}`.toLowerCase().includes(q))
      .sort((a, b) => a.costruttore.localeCompare(b.costruttore) || a.sigla.localeCompare(b.sigla));
  }, [cat, cerca, alim]);

  if (!cat) return <p className="tenue">Caricamento…</p>;
  const variantiDi = (fid: string) =>
    [...cat.varianti.values()].filter((v) => v.famigliaId === fid).sort((a, b) => a.potenzaCv - b.potenzaCv);

  return (
    <>
      <div className="barra">
        <h1 style={{ margin: 0 }}>Motori</h1>
        <span className="spazio" />
        <Link className="btn primario" to="/motori/nuovo">+ Nuovo motore</Link>
      </div>
      <div className="barra">
        <input className="input" style={{ flex: '1 1 200px' }} placeholder="Cerca sigla o costruttore…" value={cerca} onChange={(e) => setCerca(e.target.value)} />
        <select className="input" style={{ width: 'auto' }} value={alim} onChange={(e) => setAlim(e.target.value as Alimentazione | '')} aria-label="Alimentazione">
          <option value="">Tutte le alimentazioni</option>
          {ALIMENTAZIONI.map((a) => <option key={a} value={a}>{etichetta(a)}</option>)}
        </select>
      </div>
      <p className="tenue" style={{ fontSize: '.85rem' }}>⚠ = dato da verificare. Affidabilità: valutazione indicativa 1–5.</p>
      {famiglie.length === 0 && <div className="vuoto">Nessun motore trovato.</div>}
      {famiglie.map((f) => (
        <Link key={f.id} to={`/motori/${f.id}`} className="card card-link">
          <div className="titolo">{f.sigla}</div>
          <div className="sotto">{f.costruttore}</div>
          <div className="riga-dati">
            <span>{f.cilindri ?? '?'} cil · <Val campo="cilindrata" daVerificare={f.daVerificare}>{num(f.cilindrata, 'cc')}</Val></span>
            <span>{etichetta(f.alimentazione)}</span>
            <span>{etichetta(f.aspirazione)}</span>
            <span><Val campo="distribuzione" daVerificare={f.daVerificare}>{etichetta(f.distribuzione)}</Val></span>
            <span>Affidabilità: <Val campo="affidabilita" daVerificare={f.daVerificare}>{f.affidabilita != null ? `${f.affidabilita}/5` : '—'}</Val></span>
          </div>
          <div className="chips" style={{ marginTop: 8 }}>
            {variantiDi(f.id).map((v) => (
              <span key={v.id} className="badge">{v.potenzaCv} CV{v.coppiaNm ? ` · ${v.coppiaNm} Nm` : ''}</span>
            ))}
          </div>
        </Link>
      ))}
    </>
  );
}
