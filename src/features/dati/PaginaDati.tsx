import { useState } from 'react';
import { db } from '../../db/db';
import { COLONNE_CSV, NOMI_TABELLE_CSV, type TabellaCsv } from '../../domain/colonneCsv';
import { generaAnnunciDemo, PREFISSO_DEMO } from '../../domain/demo';
import { esportaBackup, esportaCsv, importaCsv, ripristinaBackup, scaricaFile } from '../../domain/backup';

const TABELLE = Object.keys(COLONNE_CSV) as TabellaCsv[];
const leggiFile = (f: File) => f.text();

export function PaginaDati() {
  const [msg, setMsg] = useState('');

  async function esporta(t: TabellaCsv) {
    scaricaFile(`${t}.csv`, await esportaCsv(db, t), 'text/csv');
  }

  async function importa(t: TabellaCsv, file: File | undefined) {
    if (!file) return;
    try {
      const r = await importaCsv(db, t, await leggiFile(file));
      setMsg(`${NOMI_TABELLE_CSV[t]}: importati ${r.importate} record.` +
        (r.errori.length ? `\n${r.errori.length} errori:\n- ${r.errori.slice(0, 20).join('\n- ')}` : ''));
    } catch (e) {
      setMsg(`Errore di importazione: ${(e as Error).message}`);
    }
  }

  async function backup() {
    scaricaFile(`auto-confronto-backup-${new Date().toISOString().slice(0, 10)}.json`, await esportaBackup(db), 'application/json');
  }

  async function ripristina(file: File | undefined) {
    if (!file) return;
    if (!confirm('Il ripristino SOSTITUISCE tutti i dati attuali con quelli del backup. Continuare?')) return;
    try { await ripristinaBackup(db, await leggiFile(file)); setMsg('Backup ripristinato.'); }
    catch (e) { setMsg(`Errore: ${(e as Error).message}`); }
  }

  async function caricaDemo() {
    const [m, v, mm] = await Promise.all([db.modelli.toArray(), db.varianti.toArray(), db.modelliMotori.toArray()]);
    const demo = generaAnnunciDemo(m, v, mm, new Date().getFullYear());
    await db.annunci.bulkPut(demo);
    setMsg(`Caricati ${demo.length} annunci di prova (fittizi).`);
  }

  async function eliminaDemo() {
    const n = await db.annunci.where('id').startsWith(PREFISSO_DEMO).delete();
    setMsg(`Eliminati ${n} annunci di prova.`);
  }

  async function reset() {
    if (!confirm('Cancellare TUTTI i dati (annunci compresi) e ricaricare motori e modelli iniziali?')) return;
    await db.delete();
    location.reload();
  }

  return (
    <>
      <h1>Dati</h1>
      {msg && <div className="messaggio">{msg}</div>}

      <h2>Backup completo</h2>
      <div className="card">
        <p className="tenue" style={{ marginTop: 0 }}>
          I dati restano solo in questo browser. Fai un backup ogni tanto, anche per spostarli su un altro dispositivo.
        </p>
        <div className="barra" style={{ marginBottom: 0 }}>
          <button className="btn primario" onClick={backup}>Scarica backup (JSON)</button>
          <label className="btn">Ripristina backup…
            <input type="file" accept=".json,application/json" hidden onChange={(e) => { ripristina(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        </div>
      </div>

      <h2>CSV</h2>
      <p className="tenue" style={{ fontSize: '.88rem' }}>
        Separatore “;”. L’import aggiorna i record con lo stesso <code>id</code> e aggiunge quelli nuovi (id vuoto = nuovo).
        Le liste usano “ | ”. Esporta prima un file per vedere il formato delle colonne.
      </p>
      {TABELLE.map((t) => (
        <div key={t} className="card barra">
          <span className="titolo" style={{ flex: '1 1 180px' }}>{NOMI_TABELLE_CSV[t]}</span>
          <button className="btn piccolo" onClick={() => esporta(t)}>Esporta</button>
          <label className="btn piccolo">Importa…
            <input type="file" accept=".csv,text/csv" hidden onChange={(e) => { importa(t, e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        </div>
      ))}

      <h2>Annunci di prova</h2>
      <div className="card">
        <p className="tenue" style={{ marginTop: 0 }}>
          Circa 120 annunci <strong>inventati</strong> (prezzi da una formula, non dal mercato) per provare gruppi,
          statistiche e confronti. Hanno la nota “Annuncio di PROVA” e non toccano i tuoi annunci.
        </p>
        <div className="barra" style={{ marginBottom: 0 }}>
          <button className="btn" onClick={caricaDemo}>Carica annunci di prova</button>
          <button className="btn pericolo" onClick={eliminaDemo}>Elimina annunci di prova</button>
        </div>
      </div>

      <h2>Ripristino iniziale</h2>
      <div className="card">
        <button className="btn pericolo" onClick={reset}>Cancella tutto e ricarica i dati iniziali</button>
      </div>
    </>
  );
}
