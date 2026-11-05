import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../db/db';
import { nomeModello, nomeVariante, useCatalogo } from '../../db/hooks';
import { STATI_ANNUNCIO, etichetta, type StatoAnnuncio } from '../../db/schema';
import { euro, num } from '../../domain/numeri';

type Ordine = 'recenti' | 'prezzo' | 'km' | 'anno';

export function ListaAnnunci() {
  const annunci = useLiveQuery(() => db.annunci.toArray());
  const cat = useCatalogo();
  const [stati, setStati] = useState<StatoAnnuncio[]>(['da_vedere', 'visto', 'preferito']);
  const [cerca, setCerca] = useState('');
  const [ordine, setOrdine] = useState<Ordine>('recenti');

  const visibili = useMemo(() => {
    if (!annunci || !cat) return [];
    const q = cerca.trim().toLowerCase();
    return annunci
      .filter((a) => stati.includes(a.stato))
      .filter((a) => !q || [nomeModello(cat.modelli.get(a.modelloId ?? '')), nomeVariante(cat, a.varianteId), a.citta, a.allestimento, a.note]
        .join(' ').toLowerCase().includes(q))
      .sort((a, b) => {
        switch (ordine) {
          case 'prezzo': return (a.prezzo ?? Infinity) - (b.prezzo ?? Infinity);
          case 'km': return (a.km ?? Infinity) - (b.km ?? Infinity);
          case 'anno': return (b.anno ?? 0) - (a.anno ?? 0);
          default: return b.dataInserimento.localeCompare(a.dataInserimento);
        }
      });
  }, [annunci, cat, stati, cerca, ordine]);

  if (!annunci || !cat) return <p className="tenue">Caricamento…</p>;

  const toggle = (s: StatoAnnuncio) => setStati((l) => (l.includes(s) ? l.filter((x) => x !== s) : [...l, s]));

  return (
    <>
      <div className="barra">
        <h1 style={{ margin: 0 }}>Annunci</h1>
        <span className="spazio" />
        <Link className="btn primario" to="/annunci/nuovo">+ Nuovo annuncio</Link>
      </div>
      <div className="barra">
        <input className="input" style={{ flex: '1 1 200px' }} placeholder="Cerca modello, motore, città…" value={cerca} onChange={(e) => setCerca(e.target.value)} />
        <select className="input" style={{ width: 'auto' }} value={ordine} onChange={(e) => setOrdine(e.target.value as Ordine)} aria-label="Ordina per">
          <option value="recenti">Più recenti</option>
          <option value="prezzo">Prezzo crescente</option>
          <option value="km">Km crescenti</option>
          <option value="anno">Anno (più nuove)</option>
        </select>
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        {STATI_ANNUNCIO.map((s) => (
          <label key={s} className={'chip' + (stati.includes(s) ? ' attivo' : '')}>
            <input type="checkbox" checked={stati.includes(s)} onChange={() => toggle(s)} />{etichetta(s)}
          </label>
        ))}
      </div>

      {annunci.length === 0 ? (
        <div className="vuoto">Nessun annuncio ancora. Aggiungine uno con “Nuovo annuncio” o importa un CSV dalla sezione Dati.</div>
      ) : visibili.length === 0 ? (
        <div className="vuoto">Nessun annuncio corrisponde ai filtri.</div>
      ) : (
        visibili.map((a) => {
          const prec = a.storicoPrezzi.at(-1)?.prezzo;
          return (
            <Link key={a.id} to={`/annunci/${a.id}`} className="card card-link">
              <div className="barra" style={{ marginBottom: 0 }}>
                <span className="titolo">{nomeModello(cat.modelli.get(a.modelloId ?? ''))}</span>
                <span className="spazio" />
                <span className="prezzo">{euro(a.prezzo)}</span>
              </div>
              <div className="sotto">{nomeVariante(cat, a.varianteId)}{a.allestimento && ` · ${a.allestimento}`}</div>
              <div className="riga-dati">
                <span>{a.anno ?? '—'}</span>
                <span>{num(a.km, 'km')}</span>
                {a.citta && <span>{a.citta}</span>}
                <span className={`badge stato-${a.stato}`}>{etichetta(a.stato)}</span>
                {prec != null && a.prezzo != null && prec > a.prezzo && (
                  <span className="badge avviso">ribassato da {euro(prec)}</span>
                )}
              </div>
            </Link>
          );
        })
      )}
    </>
  );
}
