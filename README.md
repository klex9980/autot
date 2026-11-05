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
│   ├── backup.ts          backup JSON, import/export CSV sul database
│   ├── arricchisci.ts     annuncio + dati motore/modello, €/CV e kg/CV
│   ├── filtri.ts          filtri per cilindri, alimentazione, prezzo, anno, km…
│   ├── gruppi.ts          raggruppamenti e fasce
│   ├── statistiche.ts     media, mediana, statistiche di gruppo
│   ├── convenienza.ts     confronto del prezzo con annunci simili
│   └── demo.ts            annunci di prova fittizi
├── components/Campi.tsx   campi dei form, segnalazione "da verificare"
└── features/              pagine: annunci, gruppi, confronto, motori, modelli, dati
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

## Gruppi, statistiche e confronto

- **Gruppi**: raggruppa gli annunci per motore (variante o famiglia), modello, numero cilindri,
  alimentazione, aspirato/turbo, distribuzione, fascia di cilindrata, prezzo, anno o km.
  Per ogni gruppo: prezzo medio e mediano, min–max, km medi, anno medio, €/CV, kg/CV, numero annunci.
  I filtri (pannello “Filtri”) e il criterio scelto restano memorizzati nel browser.
- **€/CV** = prezzo / potenza. **kg/CV** = peso a vuoto del modello / potenza (più basso = più brillante).
- **Annunci convenienti** (💰): un annuncio è conveniente se il prezzo è sotto la **mediana** di
  almeno 5 annunci simili. Il criterio si allarga solo se i simili sono troppo pochi:
  1. stesso modello e motore, anno ±2, km ±30.000
  2. stesso motore su qualsiasi modello, anno ±2, km ±30.000
  3. stesso motore, anno ±3, km ±50.000

  Contano anche gli annunci scartati (sono comunque dati di mercato). Se i simili sono meno di 5
  l'app lo dice invece di dare un giudizio. Nel dettaglio dell'annuncio vedi mediana, numero di
  annunci usati e criterio applicato.
- **Confronto**: fino a 4 annunci o 4 motori affiancati; in verde il valore migliore di ogni riga.
  Aggiungi annunci con “⇄ Confronta” nella lista o dal dettaglio.
- **Annunci di prova**: in Dati puoi caricare ~120 annunci **inventati** (prezzi da una formula)
  per provare queste funzioni, ed eliminarli con un clic. Non toccano i tuoi annunci.

## Stato del progetto

- [x] **Fase 1**: modello dati, seed, CRUD di motori/modelli/annunci, import/export CSV, backup
- [x] **Fase 2**: raggruppamenti, filtri, statistiche per gruppo, annunci convenienti, vista confronto
- [ ] **Fase 3**: parser incolla-annuncio, punteggio motore, grafici
