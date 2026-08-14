import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useGetSettingsQuery } from '../store/slices/settingsApiSlice';

interface DiscountContextType {
  discountPercentage: number;
  setDiscountPercentage: (percentage: number) => void;
  getOriginalPrice: (
    sellingPrice: number,
    discountPercentage?: number
  ) => number;
  getDiscountPercent: (
    sellingPrice: number,
    originalPrice?: number
  ) => number;
  getSavingsAmount: (
    sellingPrice: number,
    discountPercentage?: number
  ) => number;
}

interface Settings {
  defaultDiscountPct?: number;
  discountPercentage?: number;
}

const STORAGE_KEY = 'autotrade_discount_pct';
const FALLBACK_DISCOUNT = 20;

const DiscountContext = createContext<DiscountContextType | null>(null);

export const useDiscount = () => {
  const context = useContext(DiscountContext);

  if (!context) {
    throw new Error('useDiscount must be used inside DiscountProvider');
  }

  return context;
};

export const DiscountProvider = ({ children }: { children: ReactNode }) => {
  const { data } = useGetSettingsQuery(undefined);

  const settings: Settings = data?.settings ?? data ?? {};

  const serverDiscount =
    Number(
      settings.defaultDiscountPct ?? settings.discountPercentage
    ) || FALLBACK_DISCOUNT;

  const [discountPercentage, setDiscountPercentageState] = useState(
    FALLBACK_DISCOUNT
  );

  useEffect(() => {
    const storedDiscount = Number(localStorage.getItem(STORAGE_KEY));

    if (storedDiscount > 0 && storedDiscount < 100) {
      setDiscountPercentageState(storedDiscount);
      return;
    }

    if (serverDiscount > 0 && serverDiscount < 100) {
      setDiscountPercentageState(serverDiscount);
    }
  }, [serverDiscount]);

  const setDiscountPercentage = (percentage: number) => {
    const value = Number(percentage);

    if (value <= 0 || value >= 100 || Number.isNaN(value)) {
      return;
    }

    setDiscountPercentageState(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  };

  const getOriginalPrice = (
    sellingPrice: number,
    customDiscount?: number
  ) => {
    const price = Number(sellingPrice) || 0;

    if (price <= 0) {
      return 0;
    }

    const discount = customDiscount ?? discountPercentage;
    const factor = 1 - discount / 100;

    if (factor <= 0) {
      return price;
    }

    return Math.round(price / factor);
  };

  const getDiscountPercent = (
    sellingPrice: number,
    originalPrice?: number
  ) => {
    const selling = Number(sellingPrice) || 0;
    const original = Number(originalPrice) || 0;

    if (selling > 0 && original > selling) {
      return Math.round(((original - selling) / original) * 100);
    }

    return discountPercentage;
  };

  const getSavingsAmount = (
    sellingPrice: number,
    customDiscount?: number
  ) => {
    const selling = Number(sellingPrice) || 0;
    const original = getOriginalPrice(selling, customDiscount);

    return Math.max(0, original - selling);
  };

  const value: DiscountContextType = {
    discountPercentage,
    setDiscountPercentage,
    getOriginalPrice,
    getDiscountPercent,
    getSavingsAmount,
  };

  return (
    <DiscountContext.Provider value={value}>
      {children}
    </DiscountContext.Provider>
  );
};