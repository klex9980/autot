import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MAX_CONFRONTO, useSelezioneConfronto } from '../../components/memoria';
import { nomeModello, nomeVariante, ordinaModelli } from '../../db/hooks';
import { etichetta, type FamigliaMotore, type VarianteMotore } from '../../db/schema';
import { useAnnunciArricchiti, type DatiAnnunci } from '../../db/useAnnunci';
import type { AnnuncioArricchito } from '../../domain/arricchisci';
import { euro, num, percento } from '../../domain/numeri';
import { mediana } from '../../domain/statistiche';
import { useMemoria } from '../../components/memoria';

/** Una riga della tabella: come mostrare il valore e, se numerico, quale valore è il migliore. */
interface Riga<T> {
  nome: string;
  mostra: (x: T) => ReactNode;
  numero?: (x: T) => number | null | undefined;
  meglio?: 'min' | 'max';
  lungo?: boolean;
}

function TabellaConfronto<T>({ elementi, intestazione, righe, onRimuovi }: {
  elementi: T[]; intestazione: (x: T) => ReactNode; righe: Riga<T>[]; onRimuovi: (i: number) => void;
}) {
  // indici dei migliori per riga (solo se almeno 2 valori e non tutti uguali)
  const migliori = righe.map((r) => {
    if (!r.numero || !r.meglio) return new Set<number>();
    const v = elementi.map((e) => r.numero!(e));
    const validi = v.filter((x): x is number => x != null);
    if (validi.length < 2 || new Set(validi).size === 1) return new Set<number>();
    const best = r.meglio === 'min' ? Math.min(...validi) : Math.max(...validi);
    return new Set(v.flatMap((x, i) => (x === best ? [i] : [])));
  });
  return (
    <div className="scroll-x card" style={{ padding: 0 }}>
      <table className="confronto">
        <thead>
          <tr>
            <th scope="row" />
            {elementi.map((e, i) => (
              <th key={i}>
                <div className="intestazione-col">
                  <span>{intestazione(e)}</span>
                  <button className="btn-confronta" aria-label="Rimuovi dal confronto" title="Rimuovi" onClick={() => onRimuovi(i)}>✕</button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {righe.map((r, ri) => (
            <tr key={r.nome}>
              <th scope="row">{r.nome}</th>
              {elementi.map((e, i) => (
                <td key={i} className={(migliori[ri].has(i) ? 'migliore ' : '') + (r.lungo ? 'testo-lungo' : '')}>{r.mostra(e)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConfrontoAnnunci({ dati, ids, onChange }: { dati: DatiAnnunci; ids: string[]; onChange: (ids: string[]) => void }) {
  const perId = new Map(dati.tutti.map((x) => [x.annuncio.id, x]));
  const elementi = ids.map((id) => perId.get(id)).filter((x): x is AnnuncioArricchito => !!x);
  const conv = (x: AnnuncioArricchito) => dati.convenienza.get(x.annuncio.id);
  const disponibili = dati.tutti
    .filter((x) => !ids.includes(x.annuncio.id))
    .sort((a, b) => nomeModello(a.modello ?? undefined).localeCompare(nomeModello(b.modello ?? undefined)) || (a.annuncio.prezzo ?? 0) - (b.annuncio.prezzo ?? 0));

  const righe: Riga<AnnuncioArricchito>[] = [
    { nome: 'Prezzo', mostra: (x) => euro(x.annuncio.prezzo), numero: (x) => x.annuncio.prezzo, meglio: 'min' },
    { nome: 'Vs annunci simili', mostra: (x) => { const c = conv(x); return c?.scarto != null ? <>{percento(c.scarto)}<div className="tenue" style={{ fontSize: '.78rem', fontWeight: 400 }}>mediana {euro(c.mediana)} · {c.campione} simili</div></> : <span className="tenue">dati insufficienti</span>; }, numero: (x) => conv(x)?.scarto, meglio: 'min' },
    { nome: 'Anno', mostra: (x) => x.annuncio.anno ?? '—', numero: (x) => x.annuncio.anno, meglio: 'max' },
    { nome: 'Km', mostra: (x) => num(x.annuncio.km, 'km', 0), numero: (x) => x.annuncio.km, meglio: 'min' },
    { nome: 'Motore', mostra: (x) => nomeVariante(dati.cat, x.annuncio.varianteId) },
    { nome: 'Potenza', mostra: (x) => num(x.potenzaCv, 'CV'), numero: (x) => x.potenzaCv, meglio: 'max' },
    { nome: 'Coppia', mostra: (x) => num(x.variante?.coppiaNm, 'Nm'), numero: (x) => x.variante?.coppiaNm, meglio: 'max' },
    { nome: '€/CV', mostra: (x) => num(x.euroPerCv, '€', 0), numero: (x) => x.euroPerCv, meglio: 'min' },
    { nome: 'kg/CV', mostra: (x) => num(x.kgPerCv), numero: (x) => x.kgPerCv, meglio: 'min' },
    { nome: 'Alimentazione', mostra: (x) => etichetta(x.famiglia?.alimentazione) },
    { nome: 'Cilindri / cc', mostra: (x) => x.famiglia ? `${x.famiglia.cilindri ?? '?'} / ${num(x.famiglia.cilindrata, 'cc', 0)}` : '—' },
    { nome: 'Aspirazione', mostra: (x) => etichetta(x.famiglia?.aspirazione) },
    { nome: 'Distribuzione', mostra: (x) => etichetta(x.famiglia?.distribuzione) },
    { nome: 'Affidabilità', mostra: (x) => (x.famiglia?.affidabilita != null ? `${x.famiglia.affidabilita}/5` : '—'), numero: (x) => x.famiglia?.affidabilita, meglio: 'max' },
    { nome: 'Difetti noti', mostra: (x) => x.famiglia?.difettiNoti || '—', lungo: true },
    { nome: 'Distribuzione fatta', mostra: (x) => etichetta(x.annuncio.distribuzioneFatta) + (x.annuncio.kmDistribuzione ? ` (${num(x.annuncio.kmDistribuzione, 'km', 0)})` : '') },
    { nome: 'Tagliandi documentati', mostra: (x) => etichetta(x.annuncio.tagliandiDocumentati) },
    { nome: 'Proprietari', mostra: (x) => x.annuncio.proprietari ?? '—', numero: (x) => x.annuncio.proprietari, meglio: 'min' },
    { nome: 'Garanzia', mostra: (x) => (x.annuncio.garanziaMesi != null ? `${x.annuncio.garanziaMesi} mesi` : '—'), numero: (x) => x.annuncio.garanziaMesi, meglio: 'max' },
    { nome: 'Cambio', mostra: (x) => etichetta(x.annuncio.cambio) },
    { nome: 'Venditore', mostra: (x) => etichetta(x.annuncio.venditore) },
    { nome: 'Città', mostra: (x) => x.annuncio.citta || '—' },
    { nome: 'Stato', mostra: (x) => etichetta(x.annuncio.stato) },
    { nome: 'Note', mostra: (x) => x.annuncio.note || '—', lungo: true },
    { nome: 'Link', mostra: (x) => (x.annuncio.link ? <a href={x.annuncio.link} target="_blank" rel="noreferrer">apri ↗</a> : '—') },
  ];

  return (
    <>
      {ids.length < MAX_CONFRONTO && (
        <select className="input" style={{ marginBottom: 12 }} value="" onChange={(e) => e.target.value && onChange([...ids, e.target.value])}>
          <option value="">+ Aggiungi un annuncio ({ids.length}/{MAX_CONFRONTO})</option>
          {disponibili.map((x) => (
            <option key={x.annuncio.id} value={x.annuncio.id}>
              {nomeModello(x.modello ?? undefined)} · {x.potenzaCv ?? '?'} CV · {x.annuncio.anno ?? '—'} · {num(x.annuncio.km, 'km', 0)} · {euro(x.annuncio.prezzo)}
            </option>
          ))}
        </select>
      )}
      {elementi.length === 0 ? (
        <div className="vuoto">Scegli fino a {MAX_CONFRONTO} annunci dal menu qui sopra, oppure tocca “Confronta” nella lista annunci.</div>
      ) : (
        <TabellaConfronto
          elementi={elementi}
          onRimuovi={(i) => onChange(ids.filter((id) => id !== elementi[i].annuncio.id))}
          intestazione={(x) => <Link to={`/annunci/${x.annuncio.id}`}>{nomeModello(x.modello ?? undefined)}</Link>}
          righe={righe}
        />
      )}
    </>
  );
}

interface MotoreConfronto {
  v: VarianteMotore;
  f: FamigliaMotore | undefined;
  nAnnunci: number;
  prezzoMediano: number | null;
  modelli: string[];
}

function ConfrontoMotori({ dati, ids, onChange }: { dati: DatiAnnunci; ids: string[]; onChange: (ids: string[]) => void }) {
  const { cat } = dati;
  const elementi: MotoreConfronto[] = ids.flatMap((id) => {
    const v = cat.varianti.get(id);
    if (!v) return [];
    const annunci = dati.tutti.filter((x) => x.annuncio.varianteId === id);
    const modelli = [...cat.modelli.values()].filter((m) => cat.motoriPerModello.get(m.id)?.has(id)).sort(ordinaModelli).map((m) => nomeModello(m));
    return [{ v, f: cat.famiglie.get(v.famigliaId), nAnnunci: annunci.length, prezzoMediano: mediana(annunci.map((x) => x.annuncio.prezzo)), modelli }];
  });
  const disponibili = [...cat.varianti.values()]
    .filter((v) => !ids.includes(v.id))
    .map((v) => ({ id: v.id, nome: nomeVariante(cat, v.id) }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it', { numeric: true }));
  const dv = (m: MotoreConfronto, campo: string) => (m.f?.daVerificare.includes(campo) || m.v.daVerificare.includes(campo) ? ' ⚠' : '');

  const righe: Riga<MotoreConfronto>[] = [
    { nome: 'Costruttore', mostra: (m) => m.f?.costruttore || '—' },
    { nome: 'Potenza', mostra: (m) => `${m.v.potenzaCv} CV / ${m.v.potenzaKw} kW`, numero: (m) => m.v.potenzaCv, meglio: 'max' },
    { nome: 'Coppia', mostra: (m) => num(m.v.coppiaNm, 'Nm') + dv(m, 'coppiaNm'), numero: (m) => m.v.coppiaNm, meglio: 'max' },
    { nome: 'Alimentazione', mostra: (m) => etichetta(m.f?.alimentazione) },
    { nome: 'Cilindri', mostra: (m) => m.f?.cilindri ?? '—' },
    { nome: 'Cilindrata', mostra: (m) => num(m.f?.cilindrata, 'cc', 0) },
    { nome: 'Aspirazione', mostra: (m) => etichetta(m.f?.aspirazione) },
    { nome: 'Distribuzione', mostra: (m) => etichetta(m.f?.distribuzione) + dv(m, 'distribuzione') },
    { nome: 'Intervallo distribuzione', mostra: (m) => num(m.f?.intervalloDistribuzioneKm, 'km', 0) + dv(m, 'intervalloDistribuzioneKm'), numero: (m) => m.f?.intervalloDistribuzioneKm, meglio: 'max' },
    { nome: 'Affidabilità', mostra: (m) => (m.f?.affidabilita != null ? `${m.f.affidabilita}/5` : '—') + dv(m, 'affidabilita'), numero: (m) => m.f?.affidabilita, meglio: 'max' },
    { nome: 'Consumo medio', mostra: (m) => num(m.v.consumoMedio, 'l/100 km') + dv(m, 'consumoMedio'), numero: (m) => m.v.consumoMedio, meglio: 'min' },
    { nome: 'Classe Euro', mostra: (m) => (m.v.classeEuro ?? '—') + dv(m, 'classeEuro') },
    { nome: 'Difetti noti', mostra: (m) => m.f?.difettiNoti || '—', lungo: true },
    { nome: 'Annunci salvati', mostra: (m) => m.nAnnunci },
    { nome: 'Prezzo mediano annunci', mostra: (m) => euro(m.prezzoMediano), numero: (m) => m.prezzoMediano, meglio: 'min' },
    { nome: 'Montato su', mostra: (m) => m.modelli.join(', ') || '—', lungo: true },
  ];

  return (
    <>
      {ids.length < MAX_CONFRONTO && (
        <select className="input" style={{ marginBottom: 12 }} value="" onChange={(e) => e.target.value && onChange([...ids, e.target.value])}>
          <option value="">+ Aggiungi un motore ({ids.length}/{MAX_CONFRONTO})</option>
          {disponibili.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      )}
      {elementi.length === 0 ? (
        <div className="vuoto">Scegli fino a {MAX_CONFRONTO} motori dal menu qui sopra.</div>
      ) : (
        <TabellaConfronto
          elementi={elementi}
          onRimuovi={(i) => onChange(ids.filter((id) => id !== elementi[i].v.id))}
          intestazione={(m) => <Link to={`/motori/${m.v.famigliaId}`}>{m.f?.sigla ?? '?'} {m.v.potenzaCv} CV</Link>}
          righe={righe}
        />
      )}
    </>
  );
}

export function PaginaConfronto() {
  const dati = useAnnunciArricchiti();
  const { sel, setSel } = useSelezioneConfronto();
  const [tab, setTab] = useMemoria('tab-confronto', { tipo: 'annunci' as 'annunci' | 'motori' });
  const ids = useMemo(() => sel[tab.tipo], [sel, tab]);
  if (!dati) return <p className="tenue">Caricamento…</p>;
  const onChange = (l: string[]) => setSel({ ...sel, [tab.tipo]: l });

  return (
    <>
      <h1>Confronto</h1>
      <div className="tabs">
        <button className={'btn' + (tab.tipo === 'annunci' ? ' primario' : '')} onClick={() => setTab({ tipo: 'annunci' })}>Annunci ({sel.annunci.length})</button>
        <button className={'btn' + (tab.tipo === 'motori' ? ' primario' : '')} onClick={() => setTab({ tipo: 'motori' })}>Motori ({sel.motori.length})</button>
        <span className="spazio" style={{ flex: 1 }} />
        {ids.length > 0 && <button className="btn piccolo" onClick={() => onChange([])}>Svuota</button>}
      </div>
      <p className="tenue" style={{ fontSize: '.82rem' }}>In verde il valore migliore di ogni riga. ⚠ = dato da verificare.</p>
      {tab.tipo === 'annunci'
        ? <ConfrontoAnnunci dati={dati} ids={ids} onChange={onChange} />
        : <ConfrontoMotori dati={dati} ids={ids} onChange={onChange} />}
    </>
  );
}
