# Confronto Auto Usate

App personale per decidere quale auto usata comprare: raccoglie annunci inseriti a mano,
li collega ai dati tecnici del motore e (nelle prossime fasi) li raggruppa e confronta.

> I dati degli annunci entrano **solo** tramite inserimento manuale, incolla-testo o import CSV.
> Nessuno scraping di portali (le loro condizioni d'uso lo vietano).

## Caratteristiche tecniche

- **React + TypeScript + Vite**, solo frontend: nessun server da mantenere.
- **IndexedDB** (tramite [Dexie](https://dexie.org)) per salvare i dati nel browser.
- Interfaccia in italiano, pensata prima per lo smartphone.
- I dati restano nel browser in cui usi l'app: per spostarli o non perderli usa
  **Dati → Scarica backup** e poi **Ripristina backup** sull'altro dispositivo.

## Requisiti

- Node.js 20 o superiore (testato con Node 22)

## Installazione e avvio

```bash
npm install
npm run dev          # sviluppo: http://localhost:5173
```

Per provarla dallo smartphone sulla stessa rete Wi-Fi:

```bash
npm run dev -- --host   # poi apri sul telefono l'indirizzo "Network" mostrato
```

Altri comandi:

```bash
npm test             # test (Vitest)
npm run lint         # controllo del codice
npm run build        # versione di produzione in dist/
npm run preview      # serve la build localmente
```

La cartella `dist/` è un sito statico: si può pubblicare così com'è su GitHub Pages,
Netlify o simili (usa percorsi relativi e il routing con `#`, quindi non serve configurazione).

## Struttura

```
src/
├── db/
│   ├── schema.ts          tipi del modello dati + etichette italiane
│   ├── db.ts              database Dexie, operazioni con controlli di integrità
│   ├── hooks.ts           caricamento reattivo di motori e modelli
│   ├── seed.ts            conversione dei dati iniziali
│   └── seed/              motori.json, modelli.json (dati iniziali)
├── domain/                logica pura, senza interfaccia (testabile)
│   ├── numeri.ts          lettura numeri all'italiana ("12.500", "4,5"), formattazione
│   ├── csv.ts             import/export CSV generico
│   ├── colonneCsv.ts      colonne CSV di ogni tabella
│   └── backup.ts          backup JSON, import/export CSV sul database
├── components/Campi.tsx   campi dei form, segnalazione "da verificare"
└── features/              pagine: annunci, motori, modelli, dati
tests/                     test Vitest
```

## Modello dati

| Tabella | Contenuto |
|---|---|
| `famiglie` | Blocco motore: sigla, costruttore, cilindrata, cilindri, alimentazione, aspirazione, distribuzione e intervallo, affidabilità (1–5, indicativa), difetti noti, fonti |
| `varianti` | Potenze di una famiglia: CV, kW, coppia, consumo medio, classe Euro |
| `modelli` | Marca, modello, generazione, anni di produzione, peso a vuoto, segmento |
| `modelliMotori` | Quali varianti motore monta ogni modello (molti-a-molti) |
| `annunci` | Modello, variante, anno, km, prezzo (con storico ribassi), cambio, venditore, proprietari, tagliandi, distribuzione già fatta, garanzia, link, città, note, stato |

Ogni record di motori e modelli ha un elenco `daVerificare` con i nomi dei campi incerti:
nell'interfaccia sono marcati con ⚠ e si possono spuntare/togliere nei form.

Quando modifichi il prezzo di un annuncio salvato, quello precedente viene conservato
nello storico e la lista mostra “ribassato da …”.

## Dati iniziali

`src/db/seed/` contiene 22 famiglie motore (36 varianti di potenza) e 20 modelli diffusi
nel mercato italiano dell'usato. Vengono caricati al primo avvio
(o con **Dati → Cancella tutto e ricarica i dati iniziali**).

**Attenzione:** sono dati compilati senza consultare fonti in tempo reale.
- I campi incerti sono vuoti o marcati ⚠ “da verificare”; consumo e classe Euro sono sempre
  da compilare perché dipendono da modello e anno.
- I pesi a vuoto dei modelli sono valori indicativi, tutti marcati da verificare.
- L'affidabilità è una valutazione indicativa, non un dato tecnico: correggila con le tue fonti
  e aggiungi i link nel campo “Fonti”.

## CSV

Da **Dati** puoi esportare/importare ogni tabella. Formato:
- separatore `;` (quello di Excel in italiano); all'import viene accettata anche la `,`
- numeri sia `12500` sia `12.500`; decimali con `,` o `.`
- liste (fonti, daVerificare) separate da ` | `
- `storicoPrezzi` in JSON, es. `[{"data":"2026-10-01","prezzo":13000}]`
- l'import **aggiorna** i record con lo stesso `id` e **aggiunge** quelli nuovi (id vuoto = nuovo);
  le righe con errori o riferimenti a modelli/motori inesistenti vengono scartate e segnalate.

Consiglio: esporta prima un file per vedere i nomi e l'ordine delle colonne.

## Stato del progetto

- [x] **Fase 1**: modello dati, seed, CRUD di motori/modelli/annunci, import/export CSV, backup
- [ ] **Fase 2**: raggruppamenti, filtri, statistiche per gruppo, annunci convenienti, vista confronto
- [ ] **Fase 3**: parser incolla-annuncio, punteggio motore, grafici
