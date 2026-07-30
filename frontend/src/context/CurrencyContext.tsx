import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type CurrencyCode = 'INR' | 'USD' | 'EUR';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
  flag: string;
  rate: number; // Conversion multiplier from INR base
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    label: 'INR (₹)',
    flag: '🇮🇳',
    rate: 1.0,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    label: 'USD ($)',
    flag: '🇺🇸',
    rate: 0.01198, // Market rate: 1 USD = 83.50 INR
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    label: 'EUR (€)',
    flag: '🇪🇺',
    rate: 0.01105, // Market rate: 1 EUR = 90.50 INR
  },
};

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  formatCurrency: (priceInINR: number) => string;
  currencyConfig: CurrencyConfig;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'INR',
  setCurrency: () => {},
  formatCurrency: (priceInINR: number) => `₹${Math.round(priceInINR).toLocaleString('en-IN')}`,
  currencyConfig: CURRENCIES.INR,
});

export const useCurrency = () => useContext(CurrencyContext);

const STORAGE_KEY = 'autotrade_currency';

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>('INR');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
    if (stored && CURRENCIES[stored]) {
      setCurrencyState(stored);
    }
  }, []);

  const setCurrency = (code: CurrencyCode) => {
    if (CURRENCIES[code]) {
      setCurrencyState(code);
      localStorage.setItem(STORAGE_KEY, code);
    }
  };

  const formatCurrency = (priceInINR: number): string => {
    const num = Number(priceInINR);
    if (isNaN(num) || num <= 0) return `${CURRENCIES[currency].symbol}0`;

    const config = CURRENCIES[currency];
    const converted = num * config.rate;

    if (currency === 'INR') {
      return `₹${Math.round(converted).toLocaleString('en-IN')}`;
    }
    return `${config.symbol}${converted.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        formatCurrency,
        currencyConfig: CURRENCIES[currency],
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};
