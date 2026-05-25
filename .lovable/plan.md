
This is a big, multi-track request. Here is what I'd build and the trade-offs so you can confirm before I touch the database.

## 1. New "Food" section (replaces "Custom")

A Zomato/foodpanda-style mini-section inside Speedo.

**Customer side**
- Home "Service shortcuts": replace the **Custom** tile with **Food** (utensils icon) linking to `/food`.
- `/food` — list of restaurants/cafes/vendors with cover image, name, cuisine tags, rating, delivery time, min order, open/closed badge.
- `/food/:vendorId` — vendor page with banner, info, menu grouped by category, "Add to cart" per item with variations/notes.
- Food cart is **scoped per vendor** (you can't mix items from two restaurants in one order — standard food-delivery rule). Checkout reuses existing address + payment flow; creates an `order` with `type = 'food'` and a `vendor_id` snapshot.
- Order confirmation reuses the existing `/orders/:id/confirm` screen so the experience matches Speed Mart / Pharmacy.

**Admin side** (new pages under `/admin`)
- **Food Vendors** — CRUD: name, slug, logo, cover, cuisine tags, address, phone, delivery_time_min, min_order, is_open, is_active, sort_order.
- **Food Menu** — per vendor: menu categories + menu items (name, description, price, image, is_available, sort_order).
- **Orders** — existing orders page picks up food orders automatically (filter chip for "Food"). Order detail shows vendor name + items just like Speed Mart orders.

**Database** (new tables, all with RLS)
- `food_vendors` — public read, admin write
- `food_menu_categories` — public read, admin write
- `food_menu_items` — public read, admin write
- `orders.type` enum gets `'food'` added; `orders.vendor_id uuid` nullable column
- `order_items` keeps working as-is (name/price/image snapshot)

The old "Custom request" flow (`/custom`, `RequestForm.tsx` custom path) — **keep code but unlink from home**, or delete entirely? I'd default to **unlink from home** and keep the page reachable only by URL so existing custom orders aren't orphaned. Tell me if you'd rather fully delete.

## 2. SpeedMart image fixes

- Add a shared `<ProductImage>` component with proper aspect-ratio box, `loading="lazy"`, `decoding="async"`, `srcset` for 1x/2x, fallback to `/placeholder.svg` on error.
- Apply Supabase storage image transforms (`?width=400&quality=70&format=webp`) when the image lives in our buckets, so the same source serves a small, fast WebP.
- Fix any rows with broken/empty `image_url` by falling back to the category icon + placeholder instead of a grey square.
- Audit `ProductCard`: ensure `object-contain` + min height so 3-up grid never collapses or overflows on small phones.

## 3. Performance pass

- Route-level **code splitting**: convert admin pages and the new Food pages to `React.lazy` so the customer bundle stays small.
- Wrap heavy lists (`SpeedMart`, `/food`) with `useMemo` + virtualize only if needed (likely not at current product counts).
- `react-query`: add sensible `staleTime` (60s) to banners/categories/featured so Home stops refetching on every nav.
- Preload the LCP hero banner image; add `fetchpriority="high"` on the first banner slide.
- Remove unused imports / dead components flagged earlier.
- Add `vite-imagetools`-style query params only where bundled (keep simple — main win is route splitting + query caching).

## 4. SEO

- Tighten `index.html`: title `Speedo — Groceries, Pharmacy, Food & Parcels in Dipalpur` (<60 chars), description <160 chars, canonical, og:url, JSON-LD `Organization` + `WebSite`.
- Add `react-helmet-async` and per-page `<Helmet>` for: Home, SpeedMart, Pharmacy, Food, each vendor page, Search. Each gets unique title + description + canonical.
- Single H1 per page, semantic landmarks (`<main>`, `<nav>`, `<footer>`).
- `public/sitemap.xml` generator script (`scripts/generate-sitemap.ts`) wired into `predev`/`prebuild`, includes static routes + every active vendor.
- `robots.txt` keeps `Allow: /`, adds `Sitemap: https://speedoproai.lovable.app/sitemap.xml`, disallows `/admin` and `/~oauth`.

## 5. Full PWA

Heads up: PWA inside the Lovable preview iframe **will not** show install prompts or run the service worker — you'll only see the real install experience on the **published** URL (`speedoproai.lovable.app`) or your own domain. The current setup already has `vite-plugin-pwa` configured; I'll harden it:

- Manifest: name, short_name, description, `theme_color #e84c0a`, `background_color`, `display: standalone`, proper `start_url`, `scope`, `orientation`, screenshots, shortcuts (Speed Mart / Pharmacy / Food / Orders), maskable + any icons (192, 512).
- Splash: iOS splash via `apple-touch-startup-image` set; Android handled by manifest `background_color` + icon.
- Offline: NetworkFirst for HTML, CacheFirst for fonts/images, runtime cache for Supabase product/category GETs with short TTL so the app opens offline showing last-seen catalog.
- Custom **InstallPrompt** component: listens for `beforeinstallprompt`, shows a branded bottom sheet ("Install Speedo") with Install / Not now; on iOS Safari shows instructional sheet ("Share → Add to Home Screen"). Suppress on `/admin` and on preview hosts.
- Keep the existing iframe/preview guard in `main.tsx` so the SW never registers inside the editor.

## Technical notes

```text
DB migration (new):
  + table food_vendors
  + table food_menu_categories (vendor_id fk, name, sort_order)
  + table food_menu_items     (vendor_id, category_id, name, desc, price, image_url, is_available)
  + ALTER TYPE order_type ADD VALUE 'food'
  + ALTER TABLE orders ADD COLUMN vendor_id uuid
  + storage bucket: food (public) for vendor logos/covers/menu images
  + RLS: public read on vendors/categories/items where is_active;
         admin write everywhere

Routes added:
  /food                       -> FoodVendors.tsx
  /food/:vendorId             -> FoodVendor.tsx
  /admin/food-vendors         -> admin/FoodVendors.tsx
  /admin/food-vendors/:id     -> admin/FoodVendorEdit.tsx (menu + items)

Removed from home tiles:
  /custom (page stays, just unlinked)

New deps:
  react-helmet-async
```

## What I'd like you to confirm

1. **Custom page** — unlink from home (default) or fully delete?
2. **Food cart scope** — one vendor at a time (recommended). OK?
3. **Seed data** — should I seed 2-3 demo vendors with sample menu so you can see it working, or leave the admin to add the first one?

Once you confirm, I'll execute in this order: DB migration → admin CRUD → customer Food pages → SpeedMart image polish → SEO/Helmet → PWA hardening → perf pass. Reply with answers (or just "go ahead with defaults") and I'll start.
