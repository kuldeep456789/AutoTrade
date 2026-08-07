import { CURRENCIES, type CurrencyCode } from '../context/CurrencyContext';

export const formatINR = (price: number, currencyCode?: CurrencyCode): string => {
  const activeCurrency = currencyCode || (typeof window !== 'undefined' ? localStorage.getItem('autotrade_currency') as CurrencyCode : undefined) || 'INR';
  const num = Number(price);
  if (isNaN(num) || num <= 0) return `${CURRENCIES[activeCurrency]?.symbol || '₹'}0`;

  const config = CURRENCIES[activeCurrency] || CURRENCIES.INR;
  const converted = num * config.rate;

  if (activeCurrency === 'INR') {
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

export const formatInCurrency = (
  amount: number,
  currencyCode: CurrencyCode,
): string => {
  const num = Number(amount);
  const config = CURRENCIES[currencyCode] || CURRENCIES.INR;
  if (isNaN(num) || num <= 0) return `${config.symbol}0`;

  const converted = num * config.rate;

  if (currencyCode === 'INR') {
    return `₹${Math.round(converted).toLocaleString('en-IN')}`;
  }
  return `${config.symbol}${converted.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};