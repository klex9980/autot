import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CampoNumero, CampoScelta, CampoTesto } from '../../components/Campi';
import { DettaglioConvenienza } from '../../components/Convenienza';
import { MAX_CONFRONTO, useSelezioneConfronto } from '../../components/memoria';
import { useAnnunciArricchiti } from '../../db/useAnnunci';
import { db, nuovoId, oggiIso } from '../../db/db';
import { nomeModello, ordinaModelli, useCatalogo } from '../../db/hooks';
import {
  CAMBI, SI_NO_NONSO, STATI_ANNUNCIO, VENDITORI, etichetta, type Annuncio,
} from '../../db/schema';
import { euro } from '../../domain/numeri';

const annuncioVuoto = (): Annuncio => ({
  id: nuovoId(), modelloId: null, varianteId: null, allestimento: '', anno: null, km: null, prezzo: null,
  storicoPrezzi: [], cambio: null, venditore: null, proprietari: null, tagliandiDocumentati: 'non_so',
  distribuzioneFatta: 'non_so', kmDistribuzione: null, garanziaMesi: null, link: '', citta: '',
  dataInserimento: oggiIso(), note: '', testoOriginale: '', stato: 'da_vedere',
});

export function FormAnnuncio() {
  const { id } = useParams();
  const nuovo = !id || id === 'nuovo';
  const nav = useNavigate();
  const cat = useCatalogo();
  const dati = useAnnunciArricchiti();
  const { sel, toggle } = useSelezioneConfronto();
  const [a, setA] = useState<Annuncio | null>(nuovo ? annuncioVuoto() : null);
  const [prezzoSalvato, setPrezzoSalvato] = useState<number | null>(null);
  const [tuttiMotori, setTuttiMotori] = useState(false);
  const [errore, setErrore] = useState('');

  useEffect(() => {
    if (nuovo) return;
    db.annunci.get(id!).then((r) => {
      if (!r) { setErrore('Annuncio non trovato'); return; }
      setA(r); setPrezzoSalvato(r.prezzo);
    });
  }, [id, nuovo]);

  const modelli = useMemo(() => (cat ? [...cat.modelli.values()].sort(ordinaModelli) : []), [cat]);

  // varianti proposte: quelle del modello scelto, oppure tutte
  const opzioniMotore = useMemo(() => {
    if (!cat || !a) return [];
    const delModello = a.modelloId ? cat.motoriPerModello.get(a.modelloId) : undefined;
    const filtra = !tuttiMotori && delModello && delModello.size > 0;
    return [...cat.varianti.values()]
      .filter((v) => !filtra || delModello!.has(v.id) || v.id === a.varianteId)
      .map((v) => ({ id: v.id, nome: `${cat.famiglie.get(v.famigliaId)?.sigla ?? '?'} – ${v.potenzaCv} CV`, fam: cat.famiglie.get(v.famigliaId) }))
      .sort((x, y) => x.nome.localeCompare(y.nome, 'it', { numeric: true }));
  }, [cat, a, tuttiMotori]);

  if (errore) return <div className="messaggio">{errore}</div>;
  if (!a || !cat) return <p className="tenue">Caricamento…</p>;

  const set = <K extends keyof Annuncio>(k: K, v: Annuncio[K]) => setA({ ...a, [k]: v });

  async function salva() {
    if (!a) return;
    if (a.prezzo == null && a.modelloId == null) { setErrore('Indica almeno modello o prezzo.'); return; }
    const daSalvare = { ...a };
    // se il prezzo cambia, conserva quello vecchio nello storico
    if (!nuovo && prezzoSalvato != null && a.prezzo !== prezzoSalvato) {
      daSalvare.storicoPrezzi = [...a.storicoPrezzi, { data: oggiIso(), prezzo: prezzoSalvato }];
    }
    await db.annunci.put(daSalvare);
    nav('/annunci');
  }

  async function elimina() {
    if (!a || !confirm('Eliminare definitivamente questo annuncio?')) return;
    await db.annunci.delete(a.id);
    nav('/annunci');
  }

  return (
    <>
      <h1>{nuovo ? 'Nuovo annuncio' : 'Modifica annuncio'}</h1>
      {errore && <div className="messaggio">{errore}</div>}
      {!nuovo && (
        <div className="card barra">
          <div style={{ flex: '1 1 220px' }}><DettaglioConvenienza c={dati?.convenienza.get(a.id)} /></div>
          <button className={'btn-confronta' + (sel.annunci.includes(a.id) ? ' attivo' : '')}
            disabled={!sel.annunci.includes(a.id) && sel.annunci.length >= MAX_CONFRONTO}
            onClick={() => toggle('annunci', a.id)}>
            {sel.annunci.includes(a.id) ? '✓ Nel confronto' : '⇄ Aggiungi al confronto'}
          </button>
        </div>
      )}
      <div className="form card">
        <div className="campo intero">
          <label><span>Modello</span></label>
          <select value={a.modelloId ?? ''} onChange={(e) => set('modelloId', e.target.value || null)}>
            <option value="">— scegli —</option>
            {modelli.map((m) => (
              <option key={m.id} value={m.id}>{nomeModello(m)} {m.annoInizio ? `${m.annoInizio}–${m.annoFine ?? 'oggi'}` : ''}</option>
            ))}
          </select>
        </div>
        <div className="campo intero">
          <label>
            <span>Motore</span>
            <span className="verifica">
              <input type="checkbox" checked={tuttiMotori} onChange={(e) => setTuttiMotori(e.target.checked)} />
              mostra tutti i motori
            </span>
          </label>
          <select value={a.varianteId ?? ''} onChange={(e) => set('varianteId', e.target.value || null)}>
            <option value="">— scegli —</option>
            {opzioniMotore.map((o) => (
              <option key={o.id} value={o.id}>{o.nome}{o.fam ? ` (${etichetta(o.fam.alimentazione)})` : ''}</option>
            ))}
          </select>
        </div>
        <CampoNumero etichetta="Prezzo (€)" valore={a.prezzo} onChange={(v) => set('prezzo', v)} min={0} passo={50} />
        <CampoNumero etichetta="Anno" valore={a.anno} onChange={(v) => set('anno', v)} min={1950} max={2100} passo={1} />
        <CampoNumero etichetta="Chilometri" valore={a.km} onChange={(v) => set('km', v)} min={0} passo={1000} />
        <CampoTesto etichetta="Allestimento" valore={a.allestimento} onChange={(v) => set('allestimento', v)} placeholder="es. Highline, Lounge…" />
        <CampoScelta etichetta="Cambio" valore={a.cambio} opzioni={CAMBI} onChange={(v) => set('cambio', v)} vuoto="—" />
        <CampoScelta etichetta="Venditore" valore={a.venditore} opzioni={VENDITORI} onChange={(v) => set('venditore', v)} vuoto="—" />
        <CampoNumero etichetta="Numero proprietari" valore={a.proprietari} onChange={(v) => set('proprietari', v)} min={1} passo={1} />
        <CampoNumero etichetta="Garanzia (mesi)" valore={a.garanziaMesi} onChange={(v) => set('garanziaMesi', v)} min={0} passo={1} />
        <CampoScelta etichetta="Tagliandi documentati" valore={a.tagliandiDocumentati} opzioni={SI_NO_NONSO} onChange={(v) => set('tagliandiDocumentati', v ?? 'non_so')} />
        <CampoScelta etichetta="Distribuzione già sostituita" valore={a.distribuzioneFatta} opzioni={SI_NO_NONSO} onChange={(v) => set('distribuzioneFatta', v ?? 'non_so')} />
        {a.distribuzioneFatta === 'si' && (
          <CampoNumero etichetta="…a quanti km" valore={a.kmDistribuzione} onChange={(v) => set('kmDistribuzione', v)} min={0} passo={1000} />
        )}
        <CampoTesto etichetta="Città" valore={a.citta} onChange={(v) => set('citta', v)} />
        <CampoScelta etichetta="Stato" valore={a.stato} opzioni={STATI_ANNUNCIO} onChange={(v) => set('stato', v ?? 'da_vedere')} />
        <CampoTesto etichetta="Data inserimento" tipo="date" valore={a.dataInserimento} onChange={(v) => set('dataInserimento', v)} />
        <CampoTesto intero etichetta="Link annuncio" tipo="url" valore={a.link} onChange={(v) => set('link', v)}
          aiuto={a.link && <a href={a.link} target="_blank" rel="noreferrer">Apri annuncio ↗</a>} />
        <CampoTesto intero multilinea etichetta="Note" valore={a.note} onChange={(v) => set('note', v)} />
        {a.testoOriginale && (
          <CampoTesto intero multilinea etichetta="Testo originale incollato" valore={a.testoOriginale} onChange={(v) => set('testoOriginale', v)} />
        )}
        {a.storicoPrezzi.length > 0 && (
          <div className="intero">
            <div className="tenue" style={{ fontSize: '.85rem', marginBottom: 4 }}>Storico prezzi</div>
            {a.storicoPrezzi.map((p, i) => <div key={i}>{p.data}: {euro(p.prezzo)}</div>)}
          </div>
        )}
      </div>
      <div className="barra">
        <button className="btn primario" onClick={salva}>Salva</button>
        <button className="btn" onClick={() => nav(-1)}>Annulla</button>
        <span className="spazio" />
        {!nuovo && <button className="btn pericolo" onClick={elimina}>Elimina</button>}
      </div>
    </>
  );
}
