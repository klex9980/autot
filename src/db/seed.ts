import type { FamigliaMotore, ModelloAuto, ModelloMotore, VarianteMotore } from './schema';
import motoriJson from './seed/motori.json';
import modelliJson from './seed/modelli.json';

type MotoreSeed = FamigliaMotore & { varianti: Omit<VarianteMotore, 'famigliaId'>[] };
type ModelloSeed = ModelloAuto & { varianti: string[] };

/** Converte i file seed (annidati, comodi da scrivere) nelle tabelle piatte del DB. */
export function datiSeed() {
  const motori = motoriJson as MotoreSeed[];
  const modelliS = modelliJson as ModelloSeed[];
  const famiglie: FamigliaMotore[] = motori.map(({ varianti: _, ...f }) => f);
  const varianti: VarianteMotore[] = motori.flatMap((f) =>
    f.varianti.map((v) => ({ ...v, famigliaId: f.id })),
  );
  const modelli: ModelloAuto[] = modelliS.map(({ varianti: _, ...m }) => m);
  const modelliMotori: ModelloMotore[] = modelliS.flatMap((m) =>
    m.varianti.map((varianteId) => ({ modelloId: m.id, varianteId })),
  );
  return { famiglie, varianti, modelli, modelliMotori };
}
