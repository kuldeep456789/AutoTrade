┌───────────────────────────────┐
│     CJ Dropshipping API       │
│  developers.cjdropshipping.com│
└──────────────┬────────────────┘
               │  1. Scheduled Cron Job / Manual Sync (POST /api/cj/sync-now)
               │     Iterates 42 Automobile Category IDs (1500ms rate limiter)
               ▼
┌───────────────────────────────┐
│      Upstash Redis Buffer     │
│   'products:next:all'         │  <-- Writes to buffer first (Zero Downtime)
└──────────────┬────────────────┘
               │  2. Atomic Swap (Rename :next → :current)
               ▼
┌───────────────────────────────┐
│     Upstash Redis Warehouse   │
│   'products:all' & Cat Keys   │  <-- PERSISTENT WAREHOUSE (NO TTL / Expiry)
└──────────────┬────────────────┘
               │  3. Frontend REST Requests (GET /api/products?subcategoryName=...)
               ▼
┌───────────────────────────────┐
│       NestJS Backend API      │
│     products.service.ts       │  <-- Reads from Redis in-memory (0ms latency, zero CJ calls)
└──────────────┬────────────────┘
               │  4. Fast JSON Response (Paginated: 20 per page)
               ▼
┌───────────────────────────────┐
│      React Frontend UI        │
│   Redux RTK Query / Navbar    │  <-- Renders Product Cards, Mega Dropdown & Related Items
└───────────────────────────────┘



 Redis Caching & TTL Strategy
Key Pattern	Type	TTL (Time-To-Live)	Purpose / Rationale
products:all	JSON Array	NO TTL (Infinite)	Primary warehouse pool for all 42 automobile categories. Never expires so the website never shows 0 products.
products:<parent>:<subcat>	JSON Array	NO TTL (Infinite)	Fine-grained category warehouse keys (e.g. products:exterioraccessories:carstickers) for instant subcategory tab filtering.
api:products:*	JSON Object	6 Hours (21,600s)	Cache layer for specific API query responses (e.g. search terms, price filters). Flushed automatically on backend restart.
product:<pid>	JSON Object	6 Hours (21,600s)	Single product detail cache (variants, reviews, images). Invalidated when a user posts a review.
products:related:<id>	JSON Array	1 Hour (3,600s)	Related products array for a specific product detail page.
3. 📂 Files Modified & Their Responsibilities
Backend (backend/src/)


backend/src/modules/cj/collections.ts
Role: Single Source of Truth for Automobile categories.
Changes: Added all 42 real CJ Dropshipping categoryIds under 6 main groups (Exterior Accessories, Interior Accessories, Tools, Maintenance & Care, Car Electronics, Motorcycle Accessories & Parts, Auto Replacement Parts).


backend/src/modules/cj/cj.service.ts
Role: CJ Dropshipping API client & Redis sync engine.
Changes: Refactored fetchCatalog(), runCatalogSync(), and getWarehouseProducts() to iterate over Automobile category IDs instead of clothing.


backend/src/modules/products/products.service.ts
Role: Serves product listings & detail endpoints to the frontend.
Changes: Updated getRelatedProducts() to query warehouse subcategories with an automatic fallback to the main warehouse pool (guaranteeing related items are always returned).


backend/src/modules/products/collections.controller.ts
Role: Collection URL routing endpoints.
Changes: Replaced legacy clothing checks with Automobile category slug handlers.


backend/src/modules/categories/categories.service.ts
Role: Exposes category tree to frontend APIs.
Changes: Derived directly from Automobiles dictionary in collections.ts.
Frontend (frontend/src/)


frontend/src/components/layout/Navbar.tsx
Role: Header navigation & Mega Dropdown menu.
Changes: Updated all 6 main category links and dynamic flyout sub-menus. Fixed mobile menu link map.


frontend/src/pages/ProductDetailsPage.tsx
Role: Single Product View Page.
Changes: Integrated useGetRelatedProductsQuery hook and rendered "YOU MIGHT ALSO LIKE" related product grid.


frontend/src/pages/CollectionPage.tsx
Role: Product listing & category filter page.
Changes: Dynamically derives subcategory tabs from warehouse product data (_category).