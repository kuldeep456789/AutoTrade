export interface CjProduct {
    pid: string;
    productNameEn: string;
    productImage?: string;
    sellPrice?: string;
}

interface FeaturedProductsResponse {
    featured: CjProduct[];
}

/**
 * Returns the normalized backend origin (without trailing slash or /api).
 * Example: "https://autotrade-1-k96m.onrender.com" or "" in dev.
 */
export function getApiBaseUrl(): string {
    const envUrl = import.meta.env.VITE_API_URL;
    if (typeof envUrl === 'string' && envUrl.trim().startsWith('http')) {
        return envUrl.trim().replace(/\/+$/, '').replace(/\/api\/?$/, '');
    }
    return '';
}

/**
 * Builds a standardized API URL that preserves /api prefix and targets the backend origin.
 * Example: apiUrl('/api/contact') -> "https://autotrade-1-k96m.onrender.com/api/contact"
 *          apiUrl('contact') -> "https://autotrade-1-k96m.onrender.com/api/contact"
 */
export function apiUrl(path: string): string {
    const base = getApiBaseUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const pathWithApi =
        cleanPath === '/api' || cleanPath.startsWith('/api/')
            ? cleanPath
            : `/api${cleanPath}`;

    return base ? `${base}${pathWithApi}` : pathWithApi;
}

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
    const res = await fetch(apiUrl('/api/cj/featured-products'), {
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
