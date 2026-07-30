import { CURRENCIES, type CurrencyCode } from '../context/CurrencyContext';

export const formatINR = (price: number, currencyCode: CurrencyCode = 'INR'): string => {
  const num = Number(price);
  if (isNaN(num) || num <= 0) return `${CURRENCIES[currencyCode]?.symbol || '₹'}0`;

  const config = CURRENCIES[currencyCode] || CURRENCIES.INR;
  const converted = num * config.rate;

  if (currencyCode === 'INR') {
    return `₹${Math.round(converted).toLocaleString('en-IN')}`;
  }
  return `${config.symbol}${converted.toFixed(2)}`;
};

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}