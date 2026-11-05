import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { nomeVariante, useCatalogo } from '../../db/hooks';
import { ALIMENTAZIONI, etichetta, type Alimentazione } from '../../db/schema';
import { usePunteggi } from '../../db/usePunteggi';
import { euro, num } from '../../domain/numeri';
import {
  PESI_PREDEFINITI, PREZZI_PREDEFINITI, VALORE_DISTRIBUZIONE, type PesiPunteggio, type PrezziEnergia, type Punteggio,
} from '../../domain/punteggio';

const NOMI_PESI: Record<keyof PesiPunteggio, string> = {
  affidabilita: 'Affidabilità', costi: 'Costi di gestione', pesoPotenza: 'Rapporto peso/potenza',
};
const NOMI_PREZZI: Record<keyof PrezziEnergia, string> = {
  benzina: 'Benzina (€/l)', diesel: 'Diesel (€/l)', GPL: 'GPL (€/l)', metano: 'Metano (€/kg)', elettrico: 'Elettricità (€/kWh)',
};

function Barra({ valore }: { valore: number | null }) {
  return (
    <div className="barra-punti" aria-hidden>
      <div style={{ width: `${Math.round((valore ?? 0) * 100)}%` }} />
    </div>
  );
}

function Componente({ nome, valore }: { nome: string; valore: number | null }) {
  return (
    <div className="stat">
      <div className="et">{nome}</div>
      <div className="va">{valore == null ? <span className="tenue">n.d.</span> : Math.round(valore * 100)}</div>
      <Barra valore={valore} />
    </div>
  );
}

export function PaginaPunteggio() {
  const cat = useCatalogo();
  const { pronto, pesi, prezzi, punteggi, salvaPesi, salvaPrezzi } = usePunteggi();
  const [alim, setAlim] = useState<Alimentazione | ''>('');

  const classifica = useMemo(() => {
    if (!cat) return [];
    return [...punteggi.entries()]
      .filter(([id]) => !alim || cat.famiglie.get(cat.varianti.get(id)?.famigliaId ?? '')?.alimentazione === alim)
      .sort(([, a], [, b]) => (b.totale ?? -1) - (a.totale ?? -1));
  }, [cat, punteggi, alim]);

  if (!cat || !pronto) return <p className="tenue">Caricamento…</p>;
  const sommaPesi = pesi.affidabilita + pesi.costi + pesi.pesoPotenza;

  return (
    <>
      <div className="barra">
        <h1 style={{ margin: 0 }}>Punteggio motori</h1>
        <span className="spazio" />
        <Link className="btn" to="/motori">← Motori</Link>
      </div>

      <div className="card">
        <div className="titolo">Quanto conta ogni aspetto</div>
        {(Object.keys(NOMI_PESI) as (keyof PesiPunteggio)[]).map((k) => (
          <div key={k} className="slider">
            <label htmlFor={`peso-${k}`}>
              <span>{NOMI_PESI[k]}</span>
              <strong>{sommaPesi ? Math.round((pesi[k] / sommaPesi) * 100) : 0}%</strong>
            </label>
            <input id={`peso-${k}`} type="range" min={0} max={10} step={1} value={pesi[k]}
              onChange={(e) => salvaPesi({ ...pesi, [k]: Number(e.target.value) })} />
          </div>
        ))}
        <button className="btn piccolo" onClick={() => salvaPesi(PESI_PREDEFINITI)}>Ripristina pesi</button>
      </div>

      <details className="pannello">
        <summary><span>Come si calcola · prezzi carburante</span></summary>
        <div className="corpo" style={{ fontSize: '.9rem' }}>
          <p style={{ marginTop: 0 }}>Il punteggio (0–100) è la media pesata di tre voci, ognuna da 0 a 100:</p>
          <ul style={{ paddingLeft: 18 }}>
            <li><strong>Affidabilità</strong>: il voto 1–5 del motore (1 = 0, 5 = 100).</li>
            <li><strong>Costi di gestione</strong>: media di costo carburante per 100 km (serve il consumo della variante),
              bollo stimato (da kW e classe Euro, tariffe nazionali) e tipo di distribuzione
              ({Object.entries(VALORE_DISTRIBUZIONE).filter(([d]) => d !== 'nessuna').map(([d, v]) => `${etichetta(d).toLowerCase()} ${v * 100}`).join(', ')}).</li>
            <li><strong>Peso/potenza</strong>: kg/CV, col peso medio dei modelli che montano il motore.</li>
          </ul>
          <p>Carburante, bollo e kg/CV si confrontano con tutti i motori del catalogo: il migliore prende 100, il peggiore 0.
            Se manca un dato, la voce viene esclusa e il punteggio è segnato con * (parziale).</p>
          <div className="form" style={{ marginTop: 8 }}>
            {(Object.keys(NOMI_PREZZI) as (keyof PrezziEnergia)[]).map((k) => (
              <div key={k} className="campo">
                <label><span>{NOMI_PREZZI[k]}</span></label>
                <input type="number" step={0.01} min={0} value={prezzi[k]}
                  onChange={(e) => e.target.value !== '' && salvaPrezzi({ ...prezzi, [k]: Number(e.target.value) })} />
              </div>
            ))}
          </div>
          <p className="tenue" style={{ fontSize: '.82rem' }}>Prezzi indicativi: aggiornali con quelli attuali.
            <button className="btn piccolo" style={{ marginLeft: 8 }} onClick={() => salvaPrezzi(PREZZI_PREDEFINITI)}>Ripristina</button></p>
        </div>
      </details>

      <div className="barra">
        <h2 style={{ margin: 0 }}>Classifica</h2>
        <span className="spazio" />
        <select className="input" style={{ width: 'auto' }} value={alim} onChange={(e) => setAlim(e.target.value as Alimentazione | '')} aria-label="Alimentazione">
          <option value="">Tutte le alimentazioni</option>
          {ALIMENTAZIONI.map((a) => <option key={a} value={a}>{etichetta(a)}</option>)}
        </select>
      </div>
      {classifica.map(([id, p], i) => <RigaClassifica key={id} pos={i + 1} id={id} p={p} nome={nomeVariante(cat, id)} famigliaId={cat.varianti.get(id)?.famigliaId ?? ''} />)}
    </>
  );
}

function RigaClassifica({ pos, id, p, nome, famigliaId }: { pos: number; id: string; p: Punteggio; nome: string; famigliaId: string }) {
  return (
    <details className="card" style={{ padding: 0 }}>
      <summary style={{ padding: '10px 14px', cursor: 'pointer', listStyle: 'none', display: 'flex', gap: 10, alignItems: 'center' }}>
        <span className="tenue" style={{ width: 24 }}>{pos}.</span>
        <span style={{ flex: 1 }}>{nome}</span>
        <strong style={{ fontSize: '1.1rem' }}>{p.totale ?? '—'}{p.parziale ? '*' : ''}</strong>
      </summary>
      <div style={{ padding: '0 14px 12px' }}>
        <div className="stat-griglia" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <Componente nome="Affidabilità" valore={p.componenti.affidabilita} />
          <Componente nome="Costi" valore={p.componenti.costi} />
          <Componente nome="Peso/potenza" valore={p.componenti.pesoPotenza} />
        </div>
        <div className="riga-dati tenue" style={{ fontSize: '.85rem' }}>
          <span>Bollo stimato: {euro(p.dati.bollo)}/anno</span>
          <span>Carburante: {p.dati.costoEnergia100km == null ? 'consumo non indicato' : `${num(p.dati.costoEnergia100km, '€', 2)}/100 km`}</span>
          <span>kg/CV: {num(p.dati.kgPerCv)}</span>
        </div>
        <Link className="btn piccolo" style={{ marginTop: 8 }} to={`/motori/${famigliaId}`} data-variante={id}>Modifica dati motore</Link>
      </div>
    </details>
  );
}
