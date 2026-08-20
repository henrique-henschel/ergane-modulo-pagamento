import { describe, expect, it } from 'vitest';
import { formatMoney, parseAmountToCents } from '../format';

describe('parseAmountToCents', () => {
  it('interpreta formato pt-BR com vírgula decimal', () => {
    expect(parseAmountToCents('49,90')).toBe(4990);
    expect(parseAmountToCents('1.234,56')).toBe(123456);
    expect(parseAmountToCents('0,01')).toBe(1);
  });

  it('aceita ponto como decimal quando não há vírgula', () => {
    expect(parseAmountToCents('49.90')).toBe(4990);
    expect(parseAmountToCents('100')).toBe(10000);
  });

  it('não perde centavos por erro de ponto flutuante', () => {
    // 19.99 * 100 dá 1998.9999... em float; o arredondamento tem de salvar.
    expect(parseAmountToCents('19,99')).toBe(1999);
    expect(parseAmountToCents('8,29')).toBe(829);
  });

  it('rejeita entradas inválidas', () => {
    expect(parseAmountToCents('')).toBeNull();
    expect(parseAmountToCents('abc')).toBeNull();
    expect(parseAmountToCents('-10')).toBeNull();
    expect(parseAmountToCents('10,999')).toBeNull();
  });
});

describe('formatMoney', () => {
  it('formata centavos na moeda correspondente', () => {
    //   é o espaço não separável que o Intl insere após o símbolo.
    expect(formatMoney(9980, 'BRL')).toBe('R$ 99,80');
    expect(formatMoney(0, 'BRL')).toBe('R$ 0,00');
  });
});
