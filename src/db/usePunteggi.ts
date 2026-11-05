import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import {
  datiMotori, PESI_PREDEFINITI, PREZZI_PREDEFINITI, punteggiMotori,
  type PesiPunteggio, type PrezziEnergia, type Punteggio,
} from '../domain/punteggio';
import { db } from './db';
import { useCatalogo } from './hooks';

/** Pesi e prezzi sono salvati nel database (finiscono anche nel backup). */
export function usePunteggi() {
  const cat = useCatalogo();
  const imp = useLiveQuery(() => db.impostazioni.bulkGet(['pesiPunteggio', 'prezziEnergia']));
  const associazioni = useLiveQuery(() => db.modelliMotori.toArray());
  const pesi = { ...PESI_PREDEFINITI, ...(imp?.[0]?.valore as Partial<PesiPunteggio> | undefined) };
  const prezzi = { ...PREZZI_PREDEFINITI, ...(imp?.[1]?.valore as Partial<PrezziEnergia> | undefined) };
  const chiave = JSON.stringify([pesi, prezzi]);

  const punteggi = useMemo(() => {
    if (!cat || !associazioni) return undefined;
    const dati = datiMotori(cat.famiglie, [...cat.varianti.values()], cat.modelli, associazioni, prezzi);
    return punteggiMotori(dati, pesi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, associazioni, chiave]);

  return {
    pronto: imp !== undefined && punteggi !== undefined,
    pesi, prezzi,
    punteggi: punteggi ?? new Map<string, Punteggio>(),
    salvaPesi: (p: PesiPunteggio) => db.impostazioni.put({ chiave: 'pesiPunteggio', valore: p }),
    salvaPrezzi: (p: PrezziEnergia) => db.impostazioni.put({ chiave: 'prezziEnergia', valore: p }),
  };
}
