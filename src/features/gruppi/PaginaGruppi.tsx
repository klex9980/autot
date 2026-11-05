import { lazy, Suspense, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BadgeConvenienza } from '../../components/Convenienza';
import { useMemoria } from '../../components/memoria';
import { PannelloFiltri } from '../../components/PannelloFiltri';
import { nomeModello } from '../../db/hooks';
import { useAnnunciArricchiti } from '../../db/useAnnunci';
import type { Convenienza } from '../../domain/convenienza';
import { applicaFiltri, filtriVuoti } from '../../domain/filtri';
import {
  CRITERI, NOMI_CRITERI, ORDINAMENTI_GRUPPI, ordinaGruppi, raggruppa, type Criterio, type Gruppo, type OrdinamentoGruppi,
} from '../../domain/gruppi';
import { euro, num } from '../../domain/numeri';
import { statistiche, type Statistiche } from '../../domain/statistiche';
// i grafici (libreria pesante) si caricano solo quando servono
const Grafici = lazy(() => import('./Grafici'));

function GrigliaStat({ s }: { s: Statistiche }) {
  const voci: [string, string][] = [
    ['Prezzo medio', euro(s.prezzoMedio)],
    ['Prezzo mediano', euro(s.prezzoMediano)],
    ['Min – max', s.prezzoMin == null ? '—' : `${euro(s.prezzoMin)} – ${euro(s.prezzoMax)}`],
    ['Km medi', num(s.kmMedi, 'km', 0)],
    ['Anno medio', s.annoMedio == null ? '—' : String(Math.round(s.annoMedio))],
    ['€/CV medio', num(s.euroPerCv, '€', 0)],
    ['kg/CV medio', num(s.kgPerCv, '', 1)],
    ['Annunci', String(s.n)],
  ];
  return (
    <div className="stat-griglia">
      {voci.map(([et, va]) => <div key={et} className="stat"><div className="et">{et}</div><div className="va">{va}</div></div>)}
    </div>
  );
}

function CardGruppo({ g, convenienza }: { g: Gruppo; convenienza: Map<string, Convenienza> }) {
  const ordinati = [...g.annunci].sort((a, b) => (a.annuncio.prezzo ?? Infinity) - (b.annuncio.prezzo ?? Infinity));
  return (
    <div className="card">
      <div className="titolo">{g.nome}</div>
      <GrigliaStat s={g.stat} />
      <details>
        <summary className="tenue" style={{ fontSize: '.85rem', marginTop: 8, cursor: 'pointer' }}>Mostra annunci ({g.stat.n})</summary>
        <div className="mini-lista">
          {ordinati.map((x) => (
            <Link key={x.annuncio.id} to={`/annunci/${x.annuncio.id}`}>
              <span>
                {nomeModello(x.modello ?? undefined)} · {x.annuncio.anno ?? '—'} · {num(x.annuncio.km, 'km', 0)}
                {' '}<BadgeConvenienza c={convenienza.get(x.annuncio.id)} />
              </span>
              <strong>{euro(x.annuncio.prezzo)}</strong>
            </Link>
          ))}
        </div>
      </details>
    </div>
  );
}

export function PaginaGruppi() {
  const dati = useAnnunciArricchiti();
  const [filtri, setFiltri] = useMemoria('filtri-gruppi', filtriVuoti());
  const [vista, setVista] = useMemoria('vista-gruppi', { criterio: 'motore' as Criterio, ordine: 'naturale' as OrdinamentoGruppi, schermata: 'statistiche' as 'statistiche' | 'grafici' });

  const filtrati = useMemo(() => (dati ? applicaFiltri(dati.tutti, filtri) : []), [dati, filtri]);
  const gruppi = useMemo(() => ordinaGruppi(raggruppa(filtrati, vista.criterio), vista.ordine), [filtrati, vista]);
  const cilindri = useMemo(
    () => (dati ? [...new Set([...dati.cat.famiglie.values()].map((f) => f.cilindri).filter((c): c is number => c != null))].sort((a, b) => a - b) : []),
    [dati],
  );

  if (!dati) return <p className="tenue">Caricamento…</p>;

  return (
    <>
      <h1>Gruppi e statistiche</h1>
      <div className="barra">
        <label className="campo" style={{ flex: '1 1 180px' }}>
          <span className="tenue" style={{ fontSize: '.82rem' }}>Raggruppa per</span>
          <select className="input" value={vista.criterio} onChange={(e) => setVista({ ...vista, criterio: e.target.value as Criterio })}>
            {CRITERI.map((c) => <option key={c} value={c}>{NOMI_CRITERI[c]}</option>)}
          </select>
        </label>
        <label className="campo" style={{ flex: '1 1 140px' }}>
          <span className="tenue" style={{ fontSize: '.82rem' }}>Ordina gruppi per</span>
          <select className="input" value={vista.ordine} onChange={(e) => setVista({ ...vista, ordine: e.target.value as OrdinamentoGruppi })}>
            {Object.entries(ORDINAMENTI_GRUPPI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      <div className="tabs">
        <button className={'btn' + (vista.schermata === 'statistiche' ? ' primario' : '')} onClick={() => setVista({ ...vista, schermata: 'statistiche' })}>Statistiche</button>
        <button className={'btn' + (vista.schermata === 'grafici' ? ' primario' : '')} onClick={() => setVista({ ...vista, schermata: 'grafici' })}>Grafici</button>
      </div>
      <PannelloFiltri filtri={filtri} onChange={setFiltri} cilindriDisponibili={cilindri} risultati={filtrati.length} totale={dati.tutti.length} />

      {dati.tutti.length === 0 ? (
        <div className="vuoto">Nessun annuncio. Aggiungine qualcuno, oppure carica gli annunci di prova dalla sezione Dati.</div>
      ) : filtrati.length === 0 ? (
        <div className="vuoto">Nessun annuncio corrisponde ai filtri.</div>
      ) : vista.schermata === 'grafici' ? (
        <Suspense fallback={<p className="tenue">Caricamento grafici…</p>}><Grafici gruppi={gruppi} /></Suspense>
      ) : (
        <>
          <div className="card">
            <div className="titolo">Totale selezione</div>
            <GrigliaStat s={statistiche(filtrati)} />
          </div>
          <p className="tenue" style={{ fontSize: '.82rem' }}>
            {gruppi.length} gruppi. €/CV = prezzo diviso potenza; kg/CV = peso a vuoto del modello diviso potenza (più basso = più brillante).
          </p>
          <div className="gruppi">
            {gruppi.map((g) => <CardGruppo key={g.chiave} g={g} convenienza={dati.convenienza} />)}
          </div>
        </>
      )}
    </>
  );
}
