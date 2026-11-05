import { describe, expect, it } from 'vitest';
import { datiSeed } from '../src/db/seed';
import { ALIMENTAZIONI, ASPIRAZIONI, DISTRIBUZIONI, SEGMENTI } from '../src/db/schema';

const s = datiSeed();

describe('dati iniziali', () => {
  it('contiene 15–25 famiglie motore', () => {
    expect(s.famiglie.length).toBeGreaterThanOrEqual(15);
    expect(s.famiglie.length).toBeLessThanOrEqual(25);
  });

  it('id univoci', () => {
    for (const lista of [s.famiglie, s.varianti, s.modelli]) {
      expect(new Set(lista.map((x) => x.id)).size).toBe(lista.length);
    }
  });

  it('valori enumerati validi e campi coerenti', () => {
    for (const f of s.famiglie) {
      expect(ALIMENTAZIONI).toContain(f.alimentazione);
      expect(ASPIRAZIONI).toContain(f.aspirazione);
      expect(DISTRIBUZIONI).toContain(f.distribuzione);
      if (f.affidabilita != null) expect(f.affidabilita).toBeGreaterThanOrEqual(1);
      if (f.affidabilita != null) expect(f.affidabilita).toBeLessThanOrEqual(5);
      for (const c of f.daVerificare) expect(Object.keys(f)).toContain(c);
    }
    for (const m of s.modelli) expect(SEGMENTI).toContain(m.segmento);
  });

  it('CV e kW coerenti (±2 CV)', () => {
    for (const v of s.varianti) expect(Math.abs(v.potenzaKw * 1.35962 - v.potenzaCv)).toBeLessThanOrEqual(2);
  });

  it('ogni campo nullo è marcato da verificare (niente dati inventati né lacune silenziose)', () => {
    for (const v of s.varianti) {
      for (const c of ['coppiaNm', 'consumoMedio', 'classeEuro'] as const) {
        if (v[c] == null) expect(v.daVerificare, `${v.id}.${c}`).toContain(c);
      }
    }
    for (const f of s.famiglie) {
      if (f.affidabilita == null) expect(f.daVerificare, f.id).toContain('affidabilita');
    }
  });

  it('relazioni modello–motore puntano a record esistenti', () => {
    const v = new Set(s.varianti.map((x) => x.id));
    const m = new Set(s.modelli.map((x) => x.id));
    const f = new Set(s.famiglie.map((x) => x.id));
    for (const r of s.modelliMotori) { expect(v).toContain(r.varianteId); expect(m).toContain(r.modelloId); }
    for (const x of s.varianti) expect(f).toContain(x.famigliaId);
  });
});
