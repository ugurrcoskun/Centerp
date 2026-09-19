import Decimal from 'decimal.js';

/** Stellar amounts are strings everywhere; token units are exact integers. */
export function amount(value: unknown, decimals = 7): string {
  if (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value)) throw new Error('Geçerli bir pozitif tutar girin.');
  const number = new Decimal(value);
  if (!number.greaterThan(0) || number.decimalPlaces() > decimals || number.greaterThan('1000000'))
    throw new Error(`Tutar 0’dan büyük olmalı ve en fazla ${decimals} ondalık içermeli.`);
  return number.toFixed(decimals);
}
export const units = (value: string) => BigInt(new Decimal(amount(value)).mul('10000000').toFixed(0));
export const sumAmounts = (values: string[]) => values.reduce((sum, value) => sum.plus(value), new Decimal(0)).toFixed(7);
export const money = (value: string | number, currency = 'USDC') => `${new Intl.NumberFormat('tr-TR', {maximumFractionDigits: 2, minimumFractionDigits: 2}).format(Number(value))} ${currency}`;
