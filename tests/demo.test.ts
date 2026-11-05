import { describe, expect, it } from 'vitest';
import { datiSeed } from '../src/db/seed';
import { arricchisciTutti } from '../src/domain/arricchisci';
import { convenienzaTutti } from '../src/domain/convenienza';
import { generaAnnunciDemo, PREFISSO_DEMO } from '../src/domain/demo';

describe('annunci di prova', () => {
  const s = datiSeed();
  const demo = generaAnnunciDemo(s.modelli, s.varianti, s.modelliMotori, 2026);

  it('sono deterministici, marcati e coerenti col catalogo', () => {
    expect(generaAnnunciDemo(s.modelli, s.varianti, s.modelliMotori, 2026)).toEqual(demo);
    expect(demo).toHaveLength(120);
    for (const a of demo) {
      expect(a.id.startsWith(PREFISSO_DEMO)).toBe(true);
      expect(a.note).toMatch(/PROVA/);
      expect(s.modelliMotori).toContainEqual({ modelloId: a.modelloId, varianteId: a.varianteId });
      const m = s.modelli.find((x) => x.id === a.modelloId)!;
      expect(a.anno).toBeGreaterThanOrEqual(m.annoInizio!);
      expect(a.anno).toBeLessThanOrEqual(m.annoFine ?? 2026);
      expect(a.prezzo).toBeGreaterThan(0);
    }
  });

  it('permettono di calcolare la convenienza per buona parte degli annunci', () => {
    const cat = {
      famiglie: new Map(s.famiglie.map((x) => [x.id, x])),
      varianti: new Map(s.varianti.map((x) => [x.id, x])),
      modelli: new Map(s.modelli.map((x) => [x.id, x])),
    };
    const conv = convenienzaTutti(arricchisciTutti(demo, cat));
    const valutati = [...conv.values()].filter((c) => c.mediana != null).length;
    expect(valutati).toBeGreaterThan(30);
  });
});
