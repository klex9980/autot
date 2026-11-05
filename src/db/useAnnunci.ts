import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { arricchisciTutti, type AnnuncioArricchito } from '../domain/arricchisci';
import { convenienzaTutti, type Convenienza } from '../domain/convenienza';
import { db } from './db';
import { useCatalogo, type Catalogo } from './hooks';

export interface DatiAnnunci {
  cat: Catalogo;
  tutti: AnnuncioArricchito[];
  convenienza: Map<string, Convenienza>;
}

/** Tutti gli annunci arricchiti con dati motore e valutazione di convenienza. */
export function useAnnunciArricchiti(): DatiAnnunci | undefined {
  const annunci = useLiveQuery(() => db.annunci.toArray());
  const cat = useCatalogo();
  return useMemo(() => {
    if (!annunci || !cat) return undefined;
    const tutti = arricchisciTutti(annunci, cat);
    return { cat, tutti, convenienza: convenienzaTutti(tutti) };
  }, [annunci, cat]);
}
