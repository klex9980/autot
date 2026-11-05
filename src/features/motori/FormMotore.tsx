import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CampoNumero, CampoScelta, CampoTesto, FlagVerifica } from '../../components/Campi';
import { db, eliminaFamiglia, nuovoId } from '../../db/db';
import {
  ALIMENTAZIONI, ASPIRAZIONI, DISTRIBUZIONI, type FamigliaMotore, type VarianteMotore,
} from '../../db/schema';
import { cvDaKw, kwDaCv } from '../../domain/numeri';

const famigliaVuota = (): FamigliaMotore => ({
  id: nuovoId(), sigla: '', costruttore: '', cilindrata: null, cilindri: null, alimentazione: 'benzina',
  aspirazione: 'turbo', distribuzione: 'cinghia', intervalloDistribuzioneKm: null, affidabilita: null,
  difettiNoti: '', fonti: [], daVerificare: [],
});
const varianteVuota = (famigliaId: string): VarianteMotore => ({
  id: nuovoId(), famigliaId, potenzaCv: 0, potenzaKw: 0, coppiaNm: null, consumoMedio: null,
  classeEuro: null, note: '', daVerificare: [],
});

export function FormMotore() {
  const { id } = useParams();
  const nuovo = !id || id === 'nuovo';
  const nav = useNavigate();
  const [f, setF] = useState<FamigliaMotore | null>(nuovo ? famigliaVuota() : null);
  const [varianti, setVarianti] = useState<VarianteMotore[]>([]);
  const [rimosse, setRimosse] = useState<string[]>([]);
  const [errore, setErrore] = useState('');

  useEffect(() => {
    if (nuovo) return;
    Promise.all([db.famiglie.get(id!), db.varianti.where('famigliaId').equals(id!).sortBy('potenzaCv')]).then(([fam, vs]) => {
      if (!fam) { setErrore('Motore non trovato'); return; }
      setF(fam); setVarianti(vs);
    });
  }, [id, nuovo]);

  if (!f) return errore ? <div className="messaggio">{errore}</div> : <p className="tenue">Caricamento…</p>;

  const set = <K extends keyof FamigliaMotore>(k: K, v: FamigliaMotore[K]) => setF({ ...f, [k]: v });
  const flag = (campo: string) => <FlagVerifica campo={campo} elenco={f.daVerificare} onChange={(l) => set('daVerificare', l)} />;
  const setV = (i: number, patch: Partial<VarianteMotore>) =>
    setVarianti(varianti.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const flagV = (i: number, campo: string) => (
    <FlagVerifica campo={campo} elenco={varianti[i].daVerificare} onChange={(l) => setV(i, { daVerificare: l })} />
  );

  async function rimuoviVariante(i: number) {
    const v = varianti[i];
    const usata = await db.annunci.where('varianteId').equals(v.id).count();
    if (usata) { setErrore(`La variante ${v.potenzaCv} CV è usata da ${usata} annunci: non può essere rimossa.`); return; }
    setRimosse([...rimosse, v.id]);
    setVarianti(varianti.filter((_, j) => j !== i));
  }

  async function salva() {
    if (!f) return;
    if (!f.sigla.trim()) { setErrore('La sigla è obbligatoria.'); return; }
    if (varianti.some((v) => !v.potenzaCv)) { setErrore('Ogni variante deve avere la potenza.'); return; }
    await db.transaction('rw', db.famiglie, db.varianti, db.modelliMotori, async () => {
      await db.famiglie.put(f);
      await db.varianti.bulkPut(varianti.map((v) => ({ ...v, famigliaId: f.id })));
      if (rimosse.length) {
        await db.modelliMotori.where('varianteId').anyOf(rimosse).delete();
        await db.varianti.bulkDelete(rimosse);
      }
    });
    nav('/motori');
  }

  async function elimina() {
    if (!f || !confirm(`Eliminare il motore ${f.sigla} e tutte le sue varianti?`)) return;
    const err = await eliminaFamiglia(db, f.id);
    if (err) setErrore(err); else nav('/motori');
  }

  return (
    <>
      <h1>{nuovo ? 'Nuovo motore' : f.sigla}</h1>
      {errore && <div className="messaggio">{errore}</div>}
      <div className="form card">
        <CampoTesto etichetta="Sigla" valore={f.sigla} onChange={(v) => set('sigla', v)} placeholder="es. EA211 evo 1.5 TSI" />
        <CampoTesto etichetta="Costruttore" valore={f.costruttore} onChange={(v) => set('costruttore', v)} />
        <CampoNumero etichetta="Cilindrata (cc)" valore={f.cilindrata} onChange={(v) => set('cilindrata', v)} extra={flag('cilindrata')} passo={1} />
        <CampoNumero etichetta="Numero cilindri" valore={f.cilindri} onChange={(v) => set('cilindri', v)} extra={flag('cilindri')} passo={1} min={1} />
        <CampoScelta etichetta="Alimentazione" valore={f.alimentazione} opzioni={ALIMENTAZIONI} onChange={(v) => v && set('alimentazione', v)} />
        <CampoScelta etichetta="Aspirazione" valore={f.aspirazione} opzioni={ASPIRAZIONI} onChange={(v) => v && set('aspirazione', v)} />
        <CampoScelta etichetta="Distribuzione" valore={f.distribuzione} opzioni={DISTRIBUZIONI} onChange={(v) => v && set('distribuzione', v)} extra={flag('distribuzione')} />
        <CampoNumero etichetta="Intervallo sostituzione distribuzione (km)" valore={f.intervalloDistribuzioneKm}
          onChange={(v) => set('intervalloDistribuzioneKm', v)} extra={flag('intervalloDistribuzioneKm')} passo={1000}
          aiuto={f.distribuzione === 'catena' ? 'Per la catena di solito non è previsto un intervallo fisso.' : undefined} />
        <CampoNumero etichetta="Affidabilità (1–5, indicativa)" valore={f.affidabilita} onChange={(v) => set('affidabilita', v)} extra={flag('affidabilita')} min={1} max={5} passo={1} />
        <CampoTesto intero multilinea etichetta="Difetti noti" valore={f.difettiNoti} onChange={(v) => set('difettiNoti', v)} extra={flag('difettiNoti')} />
        <CampoTesto intero multilinea etichetta="Fonti (un link per riga)" valore={f.fonti.join('\n')}
          onChange={(v) => set('fonti', v.split('\n').map((s) => s.trim()).filter(Boolean))} />
        {f.fonti.length > 0 && (
          <div className="intero" style={{ fontSize: '.88rem' }}>
            {f.fonti.map((u) => <div key={u}><a href={u} target="_blank" rel="noreferrer">{u}</a></div>)}
          </div>
        )}
      </div>

      <h2>Varianti di potenza</h2>
      {varianti.map((v, i) => (
        <div key={v.id} className="form card">
          <CampoNumero etichetta="Potenza (CV)" valore={v.potenzaCv || null} passo={1}
            onChange={(cv) => setV(i, { potenzaCv: cv ?? 0, potenzaKw: cv ? kwDaCv(cv) : v.potenzaKw })} />
          <CampoNumero etichetta="Potenza (kW)" valore={v.potenzaKw || null} passo={1}
            onChange={(kw) => setV(i, { potenzaKw: kw ?? 0, potenzaCv: kw ? cvDaKw(kw) : v.potenzaCv })} />
          <CampoNumero etichetta="Coppia (Nm)" valore={v.coppiaNm} onChange={(x) => setV(i, { coppiaNm: x })} extra={flagV(i, 'coppiaNm')} passo={1} />
          <CampoNumero etichetta="Consumo medio (l/100 km)" valore={v.consumoMedio} onChange={(x) => setV(i, { consumoMedio: x })} extra={flagV(i, 'consumoMedio')} passo={0.1} />
          <CampoTesto etichetta="Classe Euro" valore={v.classeEuro ?? ''} onChange={(x) => setV(i, { classeEuro: x || null })} extra={flagV(i, 'classeEuro')} placeholder="es. Euro 6d-TEMP" />
          <CampoTesto etichetta="Note" valore={v.note} onChange={(x) => setV(i, { note: x })} />
          <div className="intero"><button className="btn pericolo piccolo" onClick={() => rimuoviVariante(i)}>Rimuovi variante</button></div>
        </div>
      ))}
      <button className="btn" onClick={() => setVarianti([...varianti, varianteVuota(f.id)])}>+ Aggiungi variante</button>

      <div className="barra" style={{ marginTop: 16 }}>
        <button className="btn primario" onClick={salva}>Salva</button>
        <button className="btn" onClick={() => nav(-1)}>Annulla</button>
        <span className="spazio" />
        {!nuovo && <button className="btn pericolo" onClick={elimina}>Elimina motore</button>}
      </div>
    </>
  );
}
