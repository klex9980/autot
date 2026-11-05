import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nomeModello, nomeVariante, useCatalogo } from '../../db/hooks';
import { etichetta } from '../../db/schema';
import { euro, num } from '../../domain/numeri';
import { proponiMotori, type CandidatoMotore } from '../../domain/parser/matchMotore';
import { parseAnnuncio, type RisultatoParser } from '../../domain/parser/parseAnnuncio';

/** Dati passati al form annuncio per la conferma. */
export interface BozzaDaTesto {
  parser: RisultatoParser;
  candidati: CandidatoMotore[];
  testo: string;
  link: string;
}

export function IncollaAnnuncio() {
  const cat = useCatalogo();
  const nav = useNavigate();
  const [testo, setTesto] = useState('');
  const [link, setLink] = useState('');
  const [analizzato, setAnalizzato] = useState('');

  const risultato = useMemo(() => {
    if (!cat || !analizzato.trim()) return null;
    const parser = parseAnnuncio(analizzato, [...cat.modelli.values()]);
    return { parser, candidati: proponiMotori(parser, cat) };
  }, [cat, analizzato]);

  if (!cat) return <p className="tenue">Caricamento…</p>;

  const continua = () => {
    if (!risultato) return;
    const bozza: BozzaDaTesto = { ...risultato, testo: analizzato, link };
    nav('/annunci/nuovo', { state: { bozza } });
  };

  const p = risultato?.parser;
  const voci: [string, string | null][] = p ? [
    ['Marca', p.marca],
    ['Modello', p.modelloId ? nomeModello(cat.modelli.get(p.modelloId)) : p.modelloTesto && `${p.modelloTesto} (non in catalogo)`],
    ['Anno', p.anno ? `${p.mese ? `${String(p.mese).padStart(2, '0')}/` : ''}${p.anno}` : null],
    ['Km', p.km != null ? num(p.km, 'km', 0) : null],
    ['Prezzo', p.prezzo != null ? euro(p.prezzo) : null],
    ['Alimentazione', p.alimentazione && etichetta(p.alimentazione)],
    ['Potenza', p.potenzaCv ? `${p.potenzaCv} CV (${p.potenzaKw} kW)` : null],
    ['Cilindrata', p.cilindrataCc ? num(p.cilindrataCc, 'cc', 0) : p.cilindrataLitri ? `${num(p.cilindrataLitri)} l` : null],
    ['Cambio', p.cambio && etichetta(p.cambio)],
  ] : [];

  return (
    <>
      <h1>Incolla annuncio</h1>
      <p className="tenue" style={{ marginTop: 0, fontSize: '.9rem' }}>
        Copia il testo dell’annuncio (titolo, prezzo, caratteristiche) e incollalo qui. L’app propone i dati:
        li controlli e correggi prima di salvare.
      </p>
      <div className="card form">
        <div className="campo intero">
          <label htmlFor="testo"><span>Testo dell’annuncio</span></label>
          <textarea id="testo" style={{ minHeight: 180 }} value={testo} onChange={(e) => setTesto(e.target.value)}
            placeholder={'es. Volkswagen Golf 1.5 TSI 150 CV DSG\n€ 18.900\n62.000 km · 03/2019 · Benzina'} />
        </div>
        <div className="campo intero">
          <label htmlFor="link"><span>Link (facoltativo)</span></label>
          <input id="link" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
        </div>
        <div className="intero barra" style={{ marginBottom: 0 }}>
          <button className="btn primario" disabled={!testo.trim()} onClick={() => setAnalizzato(testo)}>Analizza</button>
          {testo && <button className="btn" onClick={() => { setTesto(''); setAnalizzato(''); }}>Pulisci</button>}
        </div>
      </div>

      {p && (
        <>
          <h2>Dati trovati</h2>
          <div className="card">
            <table className="tab">
              <tbody>
                {voci.map(([k, v]) => (
                  <tr key={k}><th style={{ width: '40%' }} className="tenue">{k}</th><td>{v ?? <span className="da-verificare">non trovato</span>}</td></tr>
                ))}
              </tbody>
            </table>
            {p.avvisi.length > 0 && (
              <div className="messaggio" style={{ marginTop: 10, marginBottom: 0 }}>{p.avvisi.join('\n')}</div>
            )}
          </div>

          <h2>Motore proposto</h2>
          <div className="card">
            {risultato!.candidati.length === 0 ? (
              <span className="tenue">Nessun motore riconosciuto: lo sceglierai nel passo successivo.</span>
            ) : risultato!.candidati.map((c, i) => (
              <div key={c.varianteId} style={{ padding: '6px 0', borderTop: i ? '1px solid var(--bordo)' : undefined }}>
                <div className="barra" style={{ marginBottom: 0 }}>
                  <strong>{nomeVariante(cat, c.varianteId)}</strong>
                  <span className="spazio" />
                  <span className={'badge' + (i === 0 ? ' conveniente' : '')}>{c.punteggio}% affinità</span>
                </div>
                <div className="tenue" style={{ fontSize: '.82rem' }}>{c.motivi.join(' · ')}</div>
              </div>
            ))}
            <p className="tenue" style={{ fontSize: '.82rem', marginBottom: 0 }}>Il primo viene preselezionato; puoi cambiarlo nel modulo.</p>
          </div>
          <div className="barra">
            <button className="btn primario" onClick={continua}>Continua: controlla e salva →</button>
          </div>
        </>
      )}
    </>
  );
}
