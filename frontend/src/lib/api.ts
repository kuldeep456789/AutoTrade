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
 * The production Render backend URL.
 * This is the single source of truth for the backend origin.
 * It is embedded at build time by Vite and never changes at runtime.
 */
export const PROD_BACKEND_URL = 'https://autotrade-1-k96m.onrender.com';

/**
 * Returns the normalized backend origin (no trailing slash, no /api suffix).
 *
 * Resolution order:
 *  1. VITE_API_URL env var (set in Vercel Project Settings at build time)
 *  2. Hardcoded PROD_BACKEND_URL — always used in production builds
 *
 * Local development:
 *  - Set VITE_API_URL=http://127.0.0.1:3000 in frontend/.env to point
 *    directly at the local backend, OR leave it unset to use Vite proxy.
 *
 * NOTE: This function is intentionally NEVER empty in a production build.
 * import.meta.env.MODE is baked at Vite build time ('production' | 'development').
 */
export function getApiBaseUrl(): string {
    const envUrl: string | undefined = import.meta.env.VITE_API_URL;

    // 1. Explicit env var wins (configured in Vercel / local .env)
    if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
        // Strip any trailing slash or /api suffix so baseUrl is always the origin
        return envUrl.trim().replace(/\/+$/, '').replace(/\/api\/?$/, '');
    }

    // 2. In a production Vite build (import.meta.env.PROD === true),
    //    always use the Render backend, even if VITE_API_URL was not set.
    //    This prevents relative-URL fallback which would hit Vercel's SPA catch-all.
    if (import.meta.env.PROD) {
        return PROD_BACKEND_URL;
    }

    // 3. Development-only fallback: empty string so Vite proxy handles /api/*
    return '';
}

/**
 * Builds an absolute URL to the backend API.
 *
 * Examples (production):
 *   apiUrl('/api/auth/send-register-otp')
 *     → 'https://autotrade-1-k96m.onrender.com/api/auth/send-register-otp'
 *   apiUrl('products')
 *     → 'https://autotrade-1-k96m.onrender.com/api/products'
 *   apiUrl('/api/contact')
 *     → 'https://autotrade-1-k96m.onrender.com/api/contact'
 *
 * Never produces /api/api/... — the /api prefix is added only once.
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
