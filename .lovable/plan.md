A large, multi-area change. Below is the scoped plan.

## 1. Database schema (new)

Two new tables in `public`, both with GRANTs, RLS, and update triggers.

**`product_variants`**
- `product_id` (fk → products, on delete cascade)
- `name` (e.g. "Size", "Flavor")
- `value` (e.g. "500ml", "Mango")
- `price_delta` (numeric, default 0 — added to base price)
- `stock` (int, default 0)
- `sort_order` (int, default 0)
- `is_active` (bool, default true)

**`product_images`**
- `product_id` (fk → products, on delete cascade)
- `image_url` (text)
- `sort_order` (int, default 0)
- `is_primary` (bool, default false)

RLS: public read for active rows; admin-only write (mirrors existing `products` policies).

## 2. Admin UI

Extend `src/pages/admin/Products.tsx` product edit dialog with two new tabs/sections:
- **Variants editor**: add/remove rows (name, value, price delta, stock, active toggle).
- **Gallery editor**: drag-and-drop reorder, mark primary, upload to existing `products` storage bucket.

Keep existing single `image_url` working as fallback / primary.

## 3. Storefront — Product Detail (`src/pages/app/ProductDetail.tsx`)

- **Swipeable gallery**: Embla carousel hero + thumbnail strip below. Smooth fade between hero changes. Pinch/swipe on mobile. Falls back to single `image_url` when no `product_images` rows exist.
- **Variant selector**: grouped by `name` → chip pills per `value`. Out-of-stock chips disabled with strikethrough. Selected chip uses accent. Shows live price (`base + delta`) and stock count.
- **Sticky bottom stepper** (mobile): already present — upgrade with quantity stepper visible at all times, animated +1 fly-to-cart confirmation toast.
- **Animated cart confirmation**: framer-motion-less CSS keyframes — a small badge "Added ✓" slides up + cart icon bounces in bottom nav.

## 4. Storefront — Product Card (`src/components/speedo/ProductCard.tsx`)

- **Category-colored badge**: derive from `category_id` via a stable hash → palette of 6 tailwind-safe tints. Shown as small pill above price.
- **Hover/press micro-interactions**: card lifts (translate-y), image scales (already partial), add button pulses on press, wishlist heart pop animation.

## 5. Responsive sweep — customer app

Audit and fix on `375 / 414 / 768 / 1024 / 1280` widths:
- `Home`, `ProductDetail`, `Cart`, `Checkout`, `Orders`, `OrderDetails`, `Search`, `Profile`, `Notifications`.
- Common fixes: container max-widths, overflow-x on horizontal lists with `no-scrollbar`, sticky footers above bottom-nav (`bottom-24 lg:bottom-0`), text wrapping (`break-words`), safe-area padding (`safe-bottom`), grid breakpoints (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`).

## 6. Responsive sweep — admin

Audit and fix `Dashboard`, `Products`, `Orders`, `Categories`, `Banners`, `Customers`, `Chats`:
- Tables → switch to card lists below `md:`.
- Dialogs → `max-h-[90vh] overflow-y-auto`, `w-[95vw] sm:max-w-lg`.
- Sidebar collapses cleanly on mobile (use existing `Sheet`).

## Technical notes

- New files: `src/components/speedo/ProductGallery.tsx`, `src/components/speedo/VariantSelector.tsx`, `src/components/speedo/AddedToCartToast.tsx`, `src/components/admin/ProductVariantsEditor.tsx`, `src/components/admin/ProductGalleryEditor.tsx`.
- Cart store gets optional `variant_id`, `variant_label` fields (additive; existing items keep working).
- Category colors derived via small util `src/lib/categoryColor.ts` (no DB change).
- Embla already in `package.json` (used by `ui/carousel.tsx`).
- No design exploration needed — we already locked the Modern Grocery Chic direction.

## Out of scope

- Variant images (one image set per product, not per variant).
- Admin responsive pass beyond layout fixes (no full redesign).
- Push/notification UX.

Approve and I'll proceed in this order: migration → admin editors → storefront gallery/variants → cart UX → responsive sweep.