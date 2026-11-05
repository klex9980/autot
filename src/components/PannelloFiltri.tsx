import { ALIMENTAZIONI, ASPIRAZIONI, DISTRIBUZIONI, STATI_ANNUNCIO, etichetta } from '../db/schema';
import { contaFiltriAttivi, filtriVuoti, type Filtri, type Intervallo } from '../domain/filtri';

function Chips<T extends string | number>({ nome, valori, scelti, onChange, testo }: {
  nome: string; valori: readonly T[]; scelti: T[]; onChange: (l: T[]) => void; testo?: (v: T) => string;
}) {
  return (
    <div className="gruppo-filtro">
      <div className="nome">{nome}</div>
      <div className="chips">
        {valori.map((v) => {
          const on = scelti.includes(v);
          return (
            <label key={String(v)} className={'chip' + (on ? ' attivo' : '')}>
              <input type="checkbox" checked={on} onChange={() => onChange(on ? scelti.filter((x) => x !== v) : [...scelti, v])} />
              {testo ? testo(v) : etichetta(String(v))}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function Range({ nome, valore, onChange, passo }: { nome: string; valore: Intervallo; onChange: (i: Intervallo) => void; passo?: number }) {
  const n = (s: string) => (s === '' ? null : Number(s));
  return (
    <div className="gruppo-filtro">
      <div className="nome">{nome}</div>
      <div className="intervallo">
        <input className="input" type="number" inputMode="numeric" step={passo} placeholder="da" aria-label={`${nome} minimo`}
          value={valore.min ?? ''} onChange={(e) => onChange({ ...valore, min: n(e.target.value) })} />
        <span className="tenue">–</span>
        <input className="input" type="number" inputMode="numeric" step={passo} placeholder="a" aria-label={`${nome} massimo`}
          value={valore.max ?? ''} onChange={(e) => onChange({ ...valore, max: n(e.target.value) })} />
      </div>
    </div>
  );
}

export function PannelloFiltri({ filtri, onChange, cilindriDisponibili, risultati, totale }: {
  filtri: Filtri; onChange: (f: Filtri) => void; cilindriDisponibili: number[]; risultati: number; totale: number;
}) {
  const set = <K extends keyof Filtri>(k: K, v: Filtri[K]) => onChange({ ...filtri, [k]: v });
  const attivi = contaFiltriAttivi(filtri);
  return (
    <details className="pannello">
      <summary>
        <span>Filtri{attivi ? ` (${attivi} attivi)` : ''} · <span className="tenue" style={{ fontWeight: 400 }}>{risultati} di {totale} annunci</span></span>
      </summary>
      <div className="corpo">
        <Chips nome="Stato annuncio" valori={STATI_ANNUNCIO} scelti={filtri.stati} onChange={(l) => set('stati', l)} />
        <div className="griglia-filtri">
          <Chips nome="Numero cilindri" valori={cilindriDisponibili} scelti={filtri.cilindri} onChange={(l) => set('cilindri', l)} testo={(v) => `${v} cil`} />
          <Chips nome="Aspirazione" valori={ASPIRAZIONI} scelti={filtri.aspirazioni} onChange={(l) => set('aspirazioni', l)} />
        </div>
        <Chips nome="Alimentazione" valori={ALIMENTAZIONI} scelti={filtri.alimentazioni} onChange={(l) => set('alimentazioni', l)} />
        <Chips nome="Distribuzione" valori={DISTRIBUZIONI.filter((d) => d !== 'nessuna')} scelti={filtri.distribuzioni} onChange={(l) => set('distribuzioni', l)} />
        <div className="griglia-filtri">
          <Range nome="Prezzo (€)" valore={filtri.prezzo} onChange={(i) => set('prezzo', i)} passo={500} />
          <Range nome="Km" valore={filtri.km} onChange={(i) => set('km', i)} passo={10000} />
          <Range nome="Anno" valore={filtri.anno} onChange={(i) => set('anno', i)} passo={1} />
          <Range nome="Cilindrata (cc)" valore={filtri.cilindrata} onChange={(i) => set('cilindrata', i)} passo={100} />
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn piccolo" onClick={() => onChange(filtriVuoti())}>Azzera filtri</button>
        </div>
      </div>
    </details>
  );
}
