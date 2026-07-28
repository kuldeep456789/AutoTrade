export interface CjProduct {
    pid: string;
    productNameEn: string;
    productImage?: string;
    sellPrice?: string;
}

interface FeaturedProductsResponse {
    featured: CjProduct[];
}

/** Absolute backend origin when VITE_API_URL is a full URL; empty string uses Vite /api proxy. */
export function getApiBaseUrl(): string {
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    if (apiUrl.startsWith('http')) {
        return apiUrl.replace(/\/api\/?$/, '');
    }
    return '';
}

const API_URL = import.meta.env.VITE_API_URL || '/api';

const EXCLUDED_IDS = new Set([
    '2607130752441623600',
    '2607130905271619800',
    '2075876029409300482',
    '2046802660565475329',
    '2502151121241601900',
    '2043934021520044033',
    '2043944570651648002',
    '2043945824983830529',
    '2043943887814762497',
    '2043294797236301825',
    '2606121220391623700',
    '2075130484984541185',
]);

const isExcluded = (p: any) =>
    EXCLUDED_IDS.has(String(p?.pid ?? '')) ||
    EXCLUDED_IDS.has(String(p?.categoryId ?? p?.category ?? ''));

export async function getFeaturedProducts(): Promise<CjProduct[]> {
    const res = await fetch(`${API_URL}/cj/featured-products`, {
        headers: {
            'ngrok-skip-browser-warning': 'true',
        },
    });

    if (!res.ok) {
        throw new Error('Failed to fetch featured products');
    }

    const data: FeaturedProductsResponse = await res.json();
    return (data.featured || []).filter((p) => !isExcluded(p));
}
