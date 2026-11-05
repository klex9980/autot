import { describe, expect, it } from 'vitest';
import { cvDaKw, kwDaCv, parseNumero } from '../src/domain/numeri';

describe('parseNumero', () => {
  it.each([
    ['12.500', 12500], ['€ 9.900', 9900], ['1.234.567', 1234567], ['4,5', 4.5],
    ['1.234,56', 1234.56], ['1,234.56', 1234.56], ['4.5', 4.5], ['150', 150], [' 85 000 ', 85000],
    ['-3', -3],
  ])('%s → %s', (input, atteso) => expect(parseNumero(input)).toBe(atteso));

  it.each(['', 'abc', '12a', null, undefined])('restituisce null per %s', (x) => expect(parseNumero(x)).toBeNull());
});

describe('conversione CV/kW', () => {
  it('converte nei due sensi', () => {
    expect(cvDaKw(110)).toBe(150);
    expect(kwDaCv(150)).toBe(110);
  });
});
