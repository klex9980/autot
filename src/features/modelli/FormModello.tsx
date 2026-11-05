import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CampoNumero, CampoScelta, CampoTesto, FlagVerifica } from '../../components/Campi';
import { db, eliminaModello, impostaMotoriModello, nuovoId } from '../../db/db';
import { useCatalogo } from '../../db/hooks';
import { SEGMENTI, type ModelloAuto } from '../../db/schema';

const modelloVuoto = (): ModelloAuto => ({
  id: nuovoId(), marca: '', modello: '', generazione: '', annoInizio: null, annoFine: null,
  pesoVuotoKg: null, segmento: 'C', daVerificare: [],
});

export function FormModello() {
  const { id } = useParams();
  const nuovo = !id || id === 'nuovo';
  const nav = useNavigate();
  const cat = useCatalogo();
  const [m, setM] = useState<ModelloAuto | null>(nuovo ? modelloVuoto() : null);
  const [scelti, setScelti] = useState<Set<string>>(new Set());
  const [errore, setErrore] = useState('');

  useEffect(() => {
    if (nuovo) return;
    Promise.all([db.modelli.get(id!), db.modelliMotori.where('modelloId').equals(id!).toArray()]).then(([mod, mm]) => {
      if (!mod) { setErrore('Modello non trovato'); return; }
      setM(mod); setScelti(new Set(mm.map((r) => r.varianteId)));
    });
  }, [id, nuovo]);

  const gruppi = useMemo(() => {
    if (!cat) return [];
    return [...cat.famiglie.values()]
      .sort((a, b) => a.sigla.localeCompare(b.sigla))
      .map((f) => ({ f, varianti: [...cat.varianti.values()].filter((v) => v.famigliaId === f.id).sort((a, b) => a.potenzaCv - b.potenzaCv) }));
  }, [cat]);

  if (!m || !cat) return errore ? <div className="messaggio">{errore}</div> : <p className="tenue">Caricamento…</p>;
  const set = <K extends keyof ModelloAuto>(k: K, v: ModelloAuto[K]) => setM({ ...m, [k]: v });
  const flag = (campo: string) => <FlagVerifica campo={campo} elenco={m.daVerificare} onChange={(l) => set('daVerificare', l)} />;
  const toggle = (vid: string) => {
    const s = new Set(scelti);
    if (s.has(vid)) s.delete(vid); else s.add(vid);
    setScelti(s);
  };

  async function salva() {
    if (!m) return;
    if (!m.marca.trim() || !m.modello.trim()) { setErrore('Marca e modello sono obbligatori.'); return; }
    await db.modelli.put(m);
    await impostaMotoriModello(db, m.id, [...scelti]);
    nav('/modelli');
  }
  async function elimina() {
    if (!m || !confirm(`Eliminare ${m.marca} ${m.modello}?`)) return;
    const err = await eliminaModello(db, m.id);
    if (err) setErrore(err); else nav('/modelli');
  }

  return (
    <>
      <h1>{nuovo ? 'Nuovo modello' : `${m.marca} ${m.modello}`}</h1>
      {errore && <div className="messaggio">{errore}</div>}
      <div className="form card">
        <CampoTesto etichetta="Marca" valore={m.marca} onChange={(v) => set('marca', v)} />
        <CampoTesto etichetta="Modello" valore={m.modello} onChange={(v) => set('modello', v)} />
        <CampoTesto etichetta="Generazione" valore={m.generazione} onChange={(v) => set('generazione', v)} placeholder="es. VII, II, 2016" />
        <CampoScelta etichetta="Segmento" valore={m.segmento} opzioni={SEGMENTI} onChange={(v) => v && set('segmento', v)} />
        <CampoNumero etichetta="Anno inizio produzione" valore={m.annoInizio} onChange={(v) => set('annoInizio', v)} extra={flag('annoInizio')} passo={1} />
        <CampoNumero etichetta="Anno fine (vuoto = in produzione)" valore={m.annoFine} onChange={(v) => set('annoFine', v)} extra={flag('annoFine')} passo={1} />
        <CampoNumero etichetta="Peso a vuoto (kg)" valore={m.pesoVuotoKg} onChange={(v) => set('pesoVuotoKg', v)} extra={flag('pesoVuotoKg')} passo={5} />
      </div>

      <h2>Motori disponibili</h2>
      <div className="card">
        {gruppi.map(({ f, varianti }) => (
          <div key={f.id} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: 4 }}>{f.sigla}</div>
            <div className="chips">
              {varianti.map((v) => (
                <label key={v.id} className={'chip' + (scelti.has(v.id) ? ' attivo' : '')}>
                  <input type="checkbox" checked={scelti.has(v.id)} onChange={() => toggle(v.id)} />{v.potenzaCv} CV
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="barra" style={{ marginTop: 16 }}>
        <button className="btn primario" onClick={salva}>Salva</button>
        <button className="btn" onClick={() => nav(-1)}>Annulla</button>
        <span className="spazio" />
        {!nuovo && <button className="btn pericolo" onClick={elimina}>Elimina</button>}
      </div>
    </>
  );
}
