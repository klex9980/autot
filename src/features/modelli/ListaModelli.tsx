import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Val } from '../../components/Campi';
import { nomeVariante, ordinaModelli, useCatalogo } from '../../db/hooks';
import { num } from '../../domain/numeri';

export function ListaModelli() {
  const cat = useCatalogo();
  const [cerca, setCerca] = useState('');
  const modelli = useMemo(() => {
    if (!cat) return [];
    const q = cerca.trim().toLowerCase();
    return [...cat.modelli.values()]
      .filter((m) => !q || `${m.marca} ${m.modello} ${m.generazione}`.toLowerCase().includes(q))
      .sort(ordinaModelli);
  }, [cat, cerca]);
  if (!cat) return <p className="tenue">Caricamento…</p>;

  return (
    <>
      <div className="barra">
        <h1 style={{ margin: 0 }}>Modelli</h1>
        <span className="spazio" />
        <Link className="btn primario" to="/modelli/nuovo">+ Nuovo modello</Link>
      </div>
      <input className="input" style={{ marginBottom: 12 }} placeholder="Cerca marca o modello…" value={cerca} onChange={(e) => setCerca(e.target.value)} />
      {modelli.length === 0 && <div className="vuoto">Nessun modello trovato.</div>}
      {modelli.map((m) => {
        const motori = [...(cat.motoriPerModello.get(m.id) ?? [])].map((v) => nomeVariante(cat, v)).sort();
        return (
          <Link key={m.id} to={`/modelli/${m.id}`} className="card card-link">
            <div className="titolo">{m.marca} {m.modello} <span className="tenue">{m.generazione}</span></div>
            <div className="riga-dati">
              <span><Val campo="annoInizio" daVerificare={m.daVerificare}>{m.annoInizio ?? '?'}–{m.annoFine ?? 'oggi'}</Val></span>
              <span>Segmento {m.segmento}</span>
              <span>Peso <Val campo="pesoVuotoKg" daVerificare={m.daVerificare}>{num(m.pesoVuotoKg, 'kg')}</Val></span>
            </div>
            <div className="chips" style={{ marginTop: 8 }}>
              {motori.map((n) => <span key={n} className="badge">{n}</span>)}
              {motori.length === 0 && <span className="tenue" style={{ fontSize: '.85rem' }}>Nessun motore associato</span>}
            </div>
          </Link>
        );
      })}
    </>
  );
}
