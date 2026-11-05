import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
  type TooltipProps,
} from 'recharts';
import { COLORI_GRAFICI, FORME, useTemaScuro } from '../../components/tema';
import { nomeModello } from '../../db/hooks';
import type { AnnuncioArricchito } from '../../domain/arricchisci';
import type { Gruppo } from '../../domain/gruppi';
import { euro, formatta, num } from '../../domain/numeri';
import { quantile } from '../../domain/statistiche';

const MAX_SERIE = 3;

interface Punto {
  id: string; x: number; y: number;
  anno: number; km: number; prezzo: number;
  titolo: string; motore: string; gruppo: string;
}

interface Serie { nome: string; n: number; colore: string; forma: (typeof FORME)[number] | 'circle'; punti: Punto[]; altri: boolean }

const kEuro = (v: number) => (v >= 1000 ? `${formatta(v / 1000, 0)}k` : String(v));

/** Marcatore con anello del colore di sfondo, così i punti sovrapposti restano distinguibili. */
function Marcatore({ cx, cy, fill, forma, anello }: { cx?: number; cy?: number; fill?: string; forma: Serie['forma']; anello: string }) {
  if (cx == null || cy == null) return null;
  const r = 5;
  const comune = { fill, stroke: anello, strokeWidth: 1.5, style: { cursor: 'pointer' } };
  if (forma === 'square') return <rect x={cx - r + 0.5} y={cy - r + 0.5} width={2 * r - 1} height={2 * r - 1} rx={1.5} {...comune} />;
  if (forma === 'triangle') return <path d={`M${cx},${cy - r - 1} L${cx + r + 0.5},${cy + r - 0.5} L${cx - r - 0.5},${cy + r - 0.5} Z`} {...comune} strokeLinejoin="round" />;
  return <circle cx={cx} cy={cy} r={r} {...comune} />;
}

function Suggerimento({ active, payload }: TooltipProps<number, string>) {
  const p = active && payload?.[0]?.payload as Punto | undefined;
  if (!p) return null;
  return (
    <div className="tooltip-grafico">
      <div className="titolo">{p.titolo}</div>
      <div className="tenue">{p.motore}</div>
      <div><strong>{euro(p.prezzo)}</strong> · {p.anno} · {num(p.km, 'km', 0)}</div>
      <div className="tenue" style={{ fontSize: '.75rem' }}>Tocca per aprire</div>
    </div>
  );
}

function Legenda({ serie, colori }: { serie: Serie[]; colori: typeof COLORI_GRAFICI.chiaro }) {
  return (
    <div className="legenda">
      {serie.map((s) => (
        <span key={s.nome} className="voce">
          <svg width="14" height="14" aria-hidden><Marcatore cx={7} cy={7} fill={s.colore} forma={s.forma} anello={colori.superficie} /></svg>
          {s.nome} <span className="tenue">({s.n})</span>
        </span>
      ))}
    </div>
  );
}

function GraficoPunti({ titolo, serie, asseX, colori, formatoX, scuro, daZero }: {
  titolo: string; serie: Serie[]; asseX: string; colori: typeof COLORI_GRAFICI.chiaro;
  formatoX: (v: number) => string; scuro: boolean; daZero?: boolean;
}) {
  const xs = serie.flatMap((s) => s.punti.map((p) => p.x));
  const ticksX = daZero && xs.length ? scalaTacche(0, Math.max(...xs), 4) : undefined;
  const nav = useNavigate();
  const tick = { fill: colori.testo, fontSize: 12 };
  return (
    <div className="card grafico">
      <div className="titolo">{titolo}</div>
      {serie.length > 1 && <Legenda serie={[...serie.filter((x) => !x.altri), ...serie.filter((x) => x.altri)]} colori={colori} />}
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={colori.griglia} vertical={false} />
            <XAxis type="number" dataKey="x" name={asseX} domain={ticksX ? [ticksX[0], ticksX[ticksX.length - 1]] : ['dataMin', 'dataMax']} ticks={ticksX} tickFormatter={formatoX}
              tick={tick} stroke={colori.griglia} tickLine={false} allowDecimals={false} />
            <YAxis type="number" dataKey="y" name="Prezzo" tickFormatter={kEuro} width={44}
              tick={tick} stroke={colori.griglia} tickLine={false} axisLine={false} />
            <ZAxis range={[80, 80]} />
            <Tooltip content={<Suggerimento />} cursor={{ stroke: colori.griglia, strokeDasharray: '3 3' }}
              wrapperStyle={{ outline: 'none', zIndex: 5 }} isAnimationActive={false} />
            {serie.map((s) => (
              <Scatter key={s.nome + scuro} name={s.nome} data={s.punti} fill={s.colore} isAnimationActive={false}
                shape={(props: { cx?: number; cy?: number; fill?: string }) => <Marcatore {...props} forma={s.forma} anello={colori.superficie} />}
                onClick={(d: { payload?: Punto }) => d?.payload && nav(`/annunci/${d.payload.id}`)} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="tenue didascalia">Asse verticale: prezzo (€, k = migliaia). Asse orizzontale: {asseX.toLowerCase()}.</div>
    </div>
  );
}

interface RigaBox { nome: string; n: number; min: number; q1: number; med: number; q3: number; max: number }

/** Distribuzione dei prezzi per gruppo: linea min–max, barra dal 1° al 3° quartile, tacca sulla mediana. */
function DistribuzionePrezzi({ gruppi, colori }: { gruppi: Gruppo[]; colori: typeof COLORI_GRAFICI.chiaro }) {
  const [attivo, setAttivo] = useState<number | null>(null);
  const righe: RigaBox[] = gruppi.flatMap((g) => {
    const prezzi = g.annunci.map((x) => x.annuncio.prezzo);
    const med = quantile(prezzi, 0.5);
    if (med == null) return [];
    return [{ nome: g.nome, n: g.stat.n, min: quantile(prezzi, 0)!, q1: quantile(prezzi, 0.25)!, med, q3: quantile(prezzi, 0.75)!, max: quantile(prezzi, 1)! }];
  }).sort((a, b) => a.med - b.med).slice(0, 15);
  if (!righe.length) return null;

  const lo = Math.min(...righe.map((r) => r.min));
  const hi = Math.max(...righe.map((r) => r.max));
  const tacche = scalaTacche(lo, hi);
  const [t0, t1] = [tacche[0], tacche[tacche.length - 1]];
  const pct = (v: number) => `${((v - t0) / (t1 - t0)) * 100}%`;

  return (
    <div className="card grafico">
      <div className="titolo">Distribuzione dei prezzi per gruppo</div>
      <div className="tenue didascalia" style={{ marginBottom: 8 }}>
        Linea sottile: dal più economico al più caro · barra: metà centrale degli annunci · tacca: mediana. Ordinati per mediana{righe.length === 15 ? ' (primi 15 gruppi)' : ''}.
      </div>
      <div className="box-righe">
        {righe.map((r, i) => (
          <div key={r.nome} className={'box-riga' + (attivo === i ? ' attiva' : '')}
            onMouseEnter={() => setAttivo(i)} onMouseLeave={() => setAttivo(null)} onClick={() => setAttivo(attivo === i ? null : i)}>
            <div className="box-nome" title={r.nome}>{r.nome} <span className="tenue">({r.n})</span></div>
            <div className="box-traccia">
              {tacche.map((t) => <div key={t} className="box-griglia" style={{ left: pct(t), background: colori.griglia }} />)}
              <div className="box-linea" style={{ left: pct(r.min), width: `calc(${pct(r.max)} - ${pct(r.min)})`, background: colori.estremi }} />
              <div className="box-iqr" style={{ left: pct(r.q1), width: `max(4px, calc(${pct(r.q3)} - ${pct(r.q1)}))`, background: colori.intervallo }} />
              <div className="box-mediana" style={{ left: pct(r.med), background: colori.mediana, boxShadow: `0 0 0 2px ${colori.superficie}` }} />
              {attivo === i && (
                <div className="tooltip-grafico box-tooltip" style={{ left: `min(${pct(r.med)}, calc(100% - 170px))` }}>
                  <div className="titolo">{r.nome}</div>
                  <div>Mediana <strong>{euro(r.med)}</strong></div>
                  <div className="tenue">Metà centrale {euro(r.q1)} – {euro(r.q3)}</div>
                  <div className="tenue">Min {euro(r.min)} · max {euro(r.max)} · {r.n} annunci</div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div className="box-riga asse">
          <div className="box-nome" />
          <div className="box-traccia">
            {tacche.map((t) => <span key={t} className="box-tacca" style={{ left: pct(t), color: colori.testo }}>{kEuro(t)}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tacche "tonde" (1, 2, 5 × 10^n) che coprono l'intervallo. */
function scalaTacche(lo: number, hi: number, quante = 5): number[] {
  if (hi <= lo) hi = lo + 1;
  const grezzo = (hi - lo) / quante;
  const pot = 10 ** Math.floor(Math.log10(grezzo));
  const passo = [1, 2, 5, 10].map((m) => m * pot).find((p) => p >= grezzo)!;
  const out: number[] = [];
  for (let v = Math.floor(lo / passo) * passo; v <= hi + passo * 0.001; v += passo) out.push(v);
  if (out[out.length - 1] < hi) out.push(out[out.length - 1] + passo);
  return out;
}

/** Piccolo spostamento deterministico per non sovrapporre gli annunci dello stesso anno. */
const jitter = (id: string) => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * 0.5;
};

export default function Grafici({ gruppi }: { gruppi: Gruppo[] }) {
  const scuro = useTemaScuro();
  const colori = scuro ? COLORI_GRAFICI.scuro : COLORI_GRAFICI.chiaro;

  const [perKm, perAnno] = useMemo(() => {
    // le serie colorate sono i gruppi più numerosi; l'ordine segue il gruppo, non la posizione
    const conPrezzo = gruppi
      .map((g) => ({ g, punti: g.annunci.filter((x) => x.annuncio.prezzo != null) }))
      .filter((x) => x.punti.length);
    const principali = [...conPrezzo].sort((a, b) => b.punti.length - a.punti.length).slice(0, MAX_SERIE);
    const chiavi = new Set(principali.map((x) => x.g.chiave));
    const costruisci = (asse: 'km' | 'anno'): Serie[] => {
      const punto = (x: AnnuncioArricchito, gruppo: string): Punto | null => {
        const a = x.annuncio;
        if (a.prezzo == null || a[asse] == null) return null;
        return {
          id: a.id, x: asse === 'anno' ? a.anno! + jitter(a.id) : a.km!, y: a.prezzo,
          anno: a.anno ?? 0, km: a.km ?? 0, prezzo: a.prezzo, gruppo,
          titolo: nomeModello(x.modello ?? undefined),
          motore: x.famiglia && x.variante ? `${x.famiglia.sigla} ${x.variante.potenzaCv} CV` : 'Motore non indicato',
        };
      };
      const colorate: Serie[] = principali.map((x, i) => ({
        nome: x.g.nome, n: x.punti.length, colore: colori.serie[i], forma: FORME[i], altri: false,
        punti: x.punti.map((a) => punto(a, x.g.nome)).filter((p): p is Punto => !!p),
      }));
      const resto = conPrezzo.filter((x) => !chiavi.has(x.g.chiave));
      const altri: Serie[] = resto.length ? [{
        nome: `Altri (${resto.length} gruppi)`, n: resto.reduce((s, x) => s + x.punti.length, 0),
        colore: colori.altri, forma: 'circle', altri: true,
        punti: resto.flatMap((x) => x.punti.map((a) => punto(a, x.g.nome))).filter((p): p is Punto => !!p),
      }] : [];
      // "Altri" disegnati per primi, sotto le serie colorate
      return [...altri, ...colorate];
    };
    return [costruisci('km'), costruisci('anno')];
  }, [gruppi, colori]);

  return (
    <div className="grafici">
      <GraficoPunti titolo="Prezzo rispetto ai chilometri" serie={perKm} asseX="Chilometri"
        colori={colori} formatoX={(v) => `${formatta(v / 1000, 0)}k`} scuro={scuro} daZero />
      <GraficoPunti titolo="Prezzo rispetto all’anno" serie={perAnno} asseX="Anno di immatricolazione"
        colori={colori} formatoX={(v) => String(Math.round(v))} scuro={scuro} />
      <DistribuzionePrezzi gruppi={gruppi} colori={colori} />
    </div>
  );
}
