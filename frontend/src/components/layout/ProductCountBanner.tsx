import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../../lib/api';

const ProductCountBanner = () => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const base = getApiBaseUrl();
    fetch(`${base}/api/cj/product-count`)
      .then((res) => res.json())
      .then((data) => setCount(data.count ?? 0))
      .catch(() => setCount(0));
  }, []);

  const display = count !== null && count >= 1000 ? `${(count / 1000).toFixed(1)}K+` : String(count ?? '');

  return (
    <div className="mt-[112px] sm:mt-[116px] lg:mt-[124px] min-h-[28px]">
      {count !== null && count > 0 && (
        <div className="w-full bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-center py-2 text-[11px] font-semibold tracking-widest uppercase">
          <span>{display} Products from CJ Dropshipping</span>
        </div>
      )}
    </div>
  );
};

export default ProductCountBanner;
