import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductCard from './ProductCard';

interface CategorySectionProps {
  /** The slug used to build the "View All" link, e.g. "men" | "women" */
  gender: string;
  /** Display name shown as the large heading */
  categoryName: string;
  /** Products for this category — passed in from the parent so no extra API call is needed */
  products: any[];
}


const CategorySection: React.FC<CategorySectionProps> = ({ gender, categoryName, products }) => {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Lazy-render: only paint the product row once the section enters the viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Don't render empty sections
  if (products.length === 0) return null;

  const categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  return (
    <section ref={ref} className="border-b-2 border-black dark:border-white">
      {/* Header */}
      <div className="px-6 sm:px-10 py-10 flex items-end justify-between gap-4 border-b-2 border-black dark:border-white">
        <h2 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase">{categoryName}</h2>
        <Link
          to={`/collections/${gender}/${categorySlug}`}
          className="hidden sm:inline-flex items-center gap-2 text-sm font-black tracking-widest hover:text-red-600 transition-colors"
        >
          VIEW ALL <ArrowRight size={16} strokeWidth={2.5} />
        </Link>
      </div>

      {/* Horizontally scrollable product row — lazy rendered */}
      {isVisible ? (
        <div className="flex overflow-x-auto scrollbar-hide">
          {products.slice(0, 12).map((product: any) => (
            <div
              key={product.pid ?? product._id}
              className="min-w-[280px] max-w-[280px] sm:min-w-[320px] sm:max-w-[320px] shrink-0 border-r-2 border-black dark:border-white last:border-r-0"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        // Placeholder row while not yet in viewport
        <div className="flex overflow-x-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="min-w-[280px] aspect-[3/4] bg-zinc-100 dark:bg-zinc-900 border-r-2 border-black dark:border-white"
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default CategorySection;
