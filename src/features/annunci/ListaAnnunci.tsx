import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeConvenienza } from '../../components/Convenienza';
import { MAX_CONFRONTO, useMemoria, useSelezioneConfronto } from '../../components/memoria';
import { nomeModello, nomeVariante } from '../../db/hooks';
import { STATI_ANNUNCIO, etichetta, type StatoAnnuncio } from '../../db/schema';
import { useAnnunciArricchiti } from '../../db/useAnnunci';
import { euro, num } from '../../domain/numeri';

type Ordine = 'recenti' | 'prezzo' | 'km' | 'anno' | 'convenienza';

export function ListaAnnunci() {
  const dati = useAnnunciArricchiti();
  const [pref, setPref] = useMemoria('lista-annunci', {
    stati: ['da_vedere', 'visto', 'preferito'] as StatoAnnuncio[], ordine: 'recenti' as Ordine, soloConvenienti: false,
  });
  const [cerca, setCerca] = useState('');
  const { sel, toggle } = useSelezioneConfronto();

  const visibili = useMemo(() => {
    if (!dati) return [];
    const { cat, convenienza } = dati;
    const q = cerca.trim().toLowerCase();
    const scarto = (id: string) => convenienza.get(id)?.scarto ?? Infinity;
    return dati.tutti
      .map((x) => x.annuncio)
      .filter((a) => pref.stati.includes(a.stato))
      .filter((a) => !pref.soloConvenienti || convenienza.get(a.id)?.conveniente)
      .filter((a) => !q || [nomeModello(cat.modelli.get(a.modelloId ?? '')), nomeVariante(cat, a.varianteId), a.citta, a.allestimento, a.note]
        .join(' ').toLowerCase().includes(q))
      .sort((a, b) => {
        switch (pref.ordine) {
          case 'prezzo': return (a.prezzo ?? Infinity) - (b.prezzo ?? Infinity);
          case 'km': return (a.km ?? Infinity) - (b.km ?? Infinity);
          case 'anno': return (b.anno ?? 0) - (a.anno ?? 0);
          case 'convenienza': return scarto(a.id) - scarto(b.id);
          default: return b.dataInserimento.localeCompare(a.dataInserimento);
        }
      });
  }, [dati, pref, cerca]);

  if (!dati) return <p className="tenue">Caricamento…</p>;
  const { cat, convenienza } = dati;

  const toggleStato = (s: StatoAnnuncio) =>
    setPref({ ...pref, stati: pref.stati.includes(s) ? pref.stati.filter((x) => x !== s) : [...pref.stati, s] });

  return (
    <>
      <div className="barra">
        <h1 style={{ margin: 0 }}>Annunci</h1>
        <span className="spazio" />
        <Link className="btn primario" to="/annunci/nuovo">+ Nuovo annuncio</Link>
      </div>
      <div className="barra">
        <input className="input" style={{ flex: '1 1 200px' }} placeholder="Cerca modello, motore, città…" value={cerca} onChange={(e) => setCerca(e.target.value)} />
        <select className="input" style={{ width: 'auto' }} value={pref.ordine} onChange={(e) => setPref({ ...pref, ordine: e.target.value as Ordine })} aria-label="Ordina per">
          <option value="recenti">Più recenti</option>
          <option value="prezzo">Prezzo crescente</option>
          <option value="km">Km crescenti</option>
          <option value="anno">Anno (più nuove)</option>
          <option value="convenienza">Più convenienti</option>
        </select>
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        {STATI_ANNUNCIO.map((s) => (
          <label key={s} className={'chip' + (pref.stati.includes(s) ? ' attivo' : '')}>
            <input type="checkbox" checked={pref.stati.includes(s)} onChange={() => toggleStato(s)} />{etichetta(s)}
          </label>
        ))}
        <label className={'chip' + (pref.soloConvenienti ? ' attivo' : '')} title="Prezzo sotto la mediana di annunci simili">
          <input type="checkbox" checked={pref.soloConvenienti} onChange={(e) => setPref({ ...pref, soloConvenienti: e.target.checked })} />💰 Solo convenienti
        </label>
      </div>

      {dati.tutti.length === 0 ? (
        <div className="vuoto">Nessun annuncio ancora. Aggiungine uno con “Nuovo annuncio”, importa un CSV o carica gli annunci di prova dalla sezione Dati.</div>
      ) : visibili.length === 0 ? (
        <div className="vuoto">Nessun annuncio corrisponde ai filtri.</div>
      ) : (
        visibili.map((a) => {
          const prec = a.storicoPrezzi.at(-1)?.prezzo;
          const inConfronto = sel.annunci.includes(a.id);
          const pieno = !inConfronto && sel.annunci.length >= MAX_CONFRONTO;
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
                <span>{num(a.km, 'km', 0)}</span>
                {a.citta && <span>{a.citta}</span>}
                <span className={`badge stato-${a.stato}`}>{etichetta(a.stato)}</span>
                <BadgeConvenienza c={convenienza.get(a.id)} />
                {prec != null && a.prezzo != null && prec > a.prezzo && (
                  <span className="badge avviso">ribassato da {euro(prec)}</span>
                )}
                <span className="spazio" style={{ flex: 1 }} />
                <button type="button" className={'btn-confronta' + (inConfronto ? ' attivo' : '')} disabled={pieno}
                  title={pieno ? `Massimo ${MAX_CONFRONTO} annunci` : undefined}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle('annunci', a.id); }}>
                  {inConfronto ? '✓ Nel confronto' : '⇄ Confronta'}
                </button>
              </div>
            </Link>
          );
        })
      )}
      {sel.annunci.length >= 2 && (
        <div className="barra-fissa">
          <Link className="btn primario" to="/confronto" style={{ boxShadow: '0 4px 14px rgba(0,0,0,.2)' }}>
            Confronta {sel.annunci.length} annunci →
          </Link>
        </div>
      )}
    </>
  );
}
