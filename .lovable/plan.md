# Full PWA Quality & Modernization Pass

A focused, multi-area sweep. Brand colors stay the same — only typography, spacing, glass/blur, icon treatment, and component polish change.

## 1. Double footer fix (desktop)
- Audit `AppShell.tsx` + `Footer.tsx` + routes. Likely the global `Footer` is rendered both in `AppShell` and inside a page (Home/SpeedMart). Remove the duplicate so only one renders on desktop, and keep the mobile bottom-nav untouched.

## 2. Customer screen responsive sweep (320 / 375 / 414 / 768 / 1024 / 1280)
Screens audited & fixed:
- Home, SpeedMart, Search, ProductDetail, Cart, Checkout, OrderConfirm, Orders, OrderDetails, Notifications, Profile, Addresses, Chat, Help, Food, FoodVendor, FoodCheckout, Nearby, Friends, Login/Otp/Onboarding/Splash.

Common fixes:
- Container `max-w` + `px-4 sm:px-6 lg:px-8`, `min-w-0` on flex children to stop overflow.
- Sticky CTAs sit above the floating bottom-nav (`bottom-24`) with `safe-bottom`.
- Touch targets ≥ 44px. Text wrapping with `break-words` / `truncate` where needed.
- Horizontal scrollers use `no-scrollbar` + `snap-x`.
- Drawers/dialogs: `max-h-[90vh] overflow-y-auto`, full-width on mobile.

## 3. Admin responsive sweep
- All admin tables (`Products`, `Orders`, `Customers`, `Categories`, `Approvals`, `Birthdays`, `Roles`, `FoodVendors`, `Chats`) get a **card-list fallback below `md:`** while keeping the desktop table.
- Admin dialogs become scrollable on mobile; sidebar already uses `Sheet`.

## 4. SpeedMart + cart hardening
- ProductCard: prevent swipe-to-add gesture from conflicting with vertical scroll on small phones; ensure stepper buttons never overflow on 320px (already shrink-0, verify); make the floating ADD button never clip the badge.
- Cart page: variant label wraps; quantity stepper + remove are reachable on 320px; sticky checkout bar above bottom-nav.
- ProductDetail: sticky stepper consistent; variant chips wrap; gallery thumbs scroll horizontally.
- Checkout: form fields stack at <640px, address card wraps, totals stay visible.

## 5. Premium UI modernization (reference-inspired, brand colors kept)
Applied app-wide via tokens & component polish — **no palette change**.
- **Typography**: keep current fonts but tighten — bold tracking-tight headings, lighter body. Bigger first-screen titles on mobile.
- **Cards**: softer 2xl–3xl radii, layered shadows (`shadow-[0_10px_40px_-15px_rgba(0,0,0,0.08)]`), subtle gradient surfaces.
- **Glassmorphism**: bottom-nav, sticky CTAs, top headers get `bg-background/80 backdrop-blur-xl border border-border/40`.
- **Icon treatment**: lucide icons in rounded tinted tiles (like the reference's category icons).
- **Hero banner**: SpeedMart/Home banners get the reference's "big offer + product image right, dark pill CTA, soft pastel bg" layout — using existing brand accent for the CTA.
- **Bottom nav**: floating pill nav with the active item lifted in brand accent (matches reference exactly).
- **Footer (desktop)**: clean multi-column with subtle divider, smaller secondary links, brand mark left — replaces the current heavier footer.
- **Micro-interactions**: keep existing `cart-bump`, `heart-pop`, `added-pop`; add `hover:-translate-y-0.5` on tappable cards.

## 6. Out of scope
- No color/brand changes.
- No new features, no DB changes, no auth changes.
- No native (Capacitor) work.

## Files likely touched
`src/components/layout/AppShell.tsx`, `Footer.tsx`, `src/index.css`, `tailwind.config.ts` (utility only),
`src/pages/app/*` (responsive sweep), `src/pages/admin/*` (card fallbacks),
`src/components/speedo/*` (ProductCard, ProductGallery, VariantSelector, Skeletons),
new `src/components/admin/ResponsiveTable.tsx` helper if needed.

## Deliverable
A single large patch series across the above files. After applying I'll spot-check at 320/375/768/1280 via the preview and report what changed.
