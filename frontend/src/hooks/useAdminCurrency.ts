import { useState, useEffect, useCallback } from 'react';
import { CURRENCIES, type CurrencyCode } from '../context/CurrencyContext';
import { getApiBaseUrl } from '../lib/api';

export function useAdminCurrency() {
  const [currency, setCurrency] = useState<CurrencyCode>('INR');

  const syncCurrencyFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem('userInfo');
      if (raw) {
        const user = JSON.parse(raw);
        if (user?.adminCurrencyPreference && (CURRENCIES as any)[user.adminCurrencyPreference]) {
          setCurrency(user.adminCurrencyPreference as CurrencyCode);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    syncCurrencyFromStorage();

    const handleCustomEvent = (e: any) => {
      if (e.detail && (CURRENCIES as any)[e.detail]) {
        setCurrency(e.detail as CurrencyCode);
      } else {
        syncCurrencyFromStorage();
      }
    };

    window.addEventListener('admin_currency_changed', handleCustomEvent);
    window.addEventListener('storage', syncCurrencyFromStorage);

    return () => {
      window.removeEventListener('admin_currency_changed', handleCustomEvent);
      window.removeEventListener('storage', syncCurrencyFromStorage);
    };
  }, [syncCurrencyFromStorage]);

  const formatAdminCurrency = useCallback((amount: number) => {
    const num = Number(amount);
    const config = CURRENCIES[currency] || CURRENCIES.INR;
    if (isNaN(num) || num <= 0) return `${config.symbol}0`;

    const converted = num * config.rate;

    if (currency === 'INR') {
      return `₹${Math.round(converted).toLocaleString('en-IN')}`;
    }
    return `${config.symbol}${converted.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, [currency]);

  const updateAdminCurrency = useCallback(async (newCurrency: CurrencyCode) => {
    try {
      const raw = localStorage.getItem('userInfo');
      const token = raw ? (JSON.parse(raw)?.accessToken || JSON.parse(raw)?.token) : '';
      const baseUrl = getApiBaseUrl();
      const endpoint = `${baseUrl}/api/users/admin-currency`;

      await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currency: newCurrency })
      });

      if (raw) {
        const user = JSON.parse(raw);
        user.adminCurrencyPreference = newCurrency;
        localStorage.setItem('userInfo', JSON.stringify(user));
      }

      setCurrency(newCurrency);
      window.dispatchEvent(new CustomEvent('admin_currency_changed', { detail: newCurrency }));
    } catch (e) {
      console.error(e);
    }
  }, []);

  return { adminCurrency: currency, formatAdminCurrency, updateAdminCurrency };
}
