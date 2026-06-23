import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ShoppingBasket, Pill, UtensilsCrossed, Package, ArrowRight,
  ChevronLeft, ChevronRight, Sparkles, Flame, Pizza, Heart, Baby,
  Shirt, Dog, Wrench, Gift, Cake, Coffee, Smartphone, Tag,
} from "lucide-react";
import { ProductCard } from "@/components/speedo/ProductCard";

/**
 * Snoonu-inspired marketplace desktop home.
 * - Service tile grid (2 rows × 5) + tall promo on the right
 * - "For You" pill divider
 * - Trendy categories side card + featured product duo
 * - Offers & Events horizontal scroller
 * - 3-column product grid
 * - Favourite brands strip
 * Glassmorphism polish throughout: glass-card surfaces, soft shadows, subtle borders.
 * Only renders ≥ lg breakpoint via parent gating.
 */

const SERVICE_FALLBACK = [
  { name: "Restaurants", to: "/food", icon: UtensilsCrossed, tint: "from-orange/20 to-orange/5" },
  { name: "Grocery", to: "/speedmart", icon: ShoppingBasket, tint: "from-lime/30 to-lime/5" },
  { name: "Health & Beauty", to: "/pharmacy", icon: Heart, tint: "from-pink-200 to-pink-50" },
  { name: "Electronics", to: "/speedmart?cat=electronics", icon: Smartphone, tint: "from-sky-200 to-sky-50" },
  { name: "Pets", to: "/speedmart?cat=pets", icon: Dog, tint: "from-amber-200 to-amber-50" },
  { name: "Toys & Kids", to: "/speedmart?cat=toys", icon: Baby, tint: "from-fuchsia-200 to-fuchsia-50" },
  { name: "Premium", to: "/speedmart?cat=premium", icon: Gift, tint: "from-purple-200 to-purple-50" },
  { name: "Home & Garden", to: "/speedmart?cat=home", icon: Wrench, tint: "from-emerald-200 to-emerald-50" },
  { name: "Sweets & Bakery", to: "/food?cuisine=bakery", icon: Cake, tint: "from-rose-200 to-rose-50" },
  { name: "All Services", to: "/speedmart", icon: Tag, tint: "from-primary/15 to-primary/5" },
];

export function DesktopHome() {
  const banners = useQuery({
    queryKey: ["banners"],
    queryFn: async () => (await supabase.from("banners").select("*").eq("is_active", true).order("sort_order")).data ?? [],
  });
  const popularCats = useQuery({
    queryKey: ["categories", "popular"],
    queryFn: async () => (await supabase.from("categories").select("*").eq("is_active", true).eq("is_popular", true).order("sort_order")).data ?? [],
  });
  const featured = useQuery({
    queryKey: ["products", "featured-2"],
    queryFn: async () => (await supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(2)).data ?? [],
  });
  const sale = useQuery({
    queryKey: ["products", "sale-grid"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("is_active", true).not("compare_price", "is", null).order("created_at", { ascending: false }).limit(18);
      return (data ?? []).filter((p: any) => Number(p.compare_price) > Number(p.price));
    },
  });
  const brands = useQuery({
    queryKey: ["food-vendors", "brands"],
    queryFn: async () => (await supabase.from("food_vendors").select("id,name,logo_url,cover_url").eq("is_active", true).limit(10)).data ?? [],
  });

  const heroPromo = banners.data?.[0];
  const tallPromo = banners.data?.[1] ?? banners.data?.[0];

  return (
    <div className="-mx-8 xl:-mx-12 -my-6 px-8 xl:px-12 py-8 bg-[radial-gradient(120%_80%_at_50%_-10%,hsl(279_100%_94%/0.7),transparent_55%),linear-gradient(180deg,#fafaf7,#f3f1ec)] min-h-screen">
      {/* ===== TOP: service tiles + tall promo ===== */}
      <section className="grid grid-cols-12 gap-5 mb-10">
        <div className="col-span-12 xl:col-span-9 grid grid-cols-5 gap-3">
          {SERVICE_FALLBACK.map((s) => (
            <Link
              key={s.name}
              to={s.to}
              className="group relative flex flex-col items-center justify-center gap-2 py-5 rounded-2xl glass-card hover:-translate-y-0.5 hover:shadow-elevated transition-all"
            >
              <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${s.tint} flex items-center justify-center ring-1 ring-white/60`}>
                <s.icon className="h-6 w-6 text-foreground/80" strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-semibold text-center text-foreground/85 leading-tight px-2 line-clamp-2">{s.name}</span>
            </Link>
          ))}
        </div>
        <Link
          to={tallPromo?.cta_link || "/speedmart"}
          className="col-span-12 xl:col-span-3 relative h-[260px] xl:h-auto rounded-2xl overflow-hidden group glass-card p-0"
        >
          {tallPromo?.image_url ? (
            <img src={tallPromo.image_url} alt={tallPromo.title || ""} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700" loading="eager" decoding="async" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-fuchsia-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-extrabold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> Now live
          </div>
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h3 className="font-serif text-2xl leading-tight drop-shadow">{tallPromo?.title || "Featured deal"}</h3>
            {tallPromo?.subtitle && <p className="text-[11px] opacity-90 mt-1 line-clamp-2">{tallPromo.subtitle}</p>}
          </div>
        </Link>
      </section>

      {/* ===== "For You" pill divider ===== */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-foreground text-background text-xs font-bold tracking-wide shadow-elevated">
          <Sparkles className="h-3.5 w-3.5" /> For You
        </div>
      </div>

      {/* ===== Featured duo + Trendy categories card ===== */}
      <section className="grid grid-cols-12 gap-5 mb-12">
        {(featured.data ?? []).slice(0, 2).map((p: any) => (
          <div key={p.id} className="col-span-12 md:col-span-4">
            <div className="rounded-2xl glass-card p-3 h-full">
              <ProductCard p={p as any} />
            </div>
          </div>
        ))}
        {(featured.data ?? []).length < 2 && Array.from({ length: 2 - (featured.data?.length ?? 0) }).map((_, i) => (
          <div key={`ph-${i}`} className="col-span-12 md:col-span-4 rounded-2xl glass-card h-[260px] flex items-center justify-center text-muted-foreground text-xs">
            Add a product
          </div>
        ))}
        <div className="col-span-12 md:col-span-4 rounded-2xl glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-base flex items-center gap-1.5"><Flame className="h-4 w-4 text-primary" /> Trendy categories</h3>
            <Link to="/speedmart" className="text-[11px] text-primary font-bold">All →</Link>
          </div>
          <div className="divide-y divide-white/60">
            {((popularCats.data ?? []).slice(0, 5).length > 0
              ? (popularCats.data ?? []).slice(0, 5)
              : [{ id: "x1", name: "Toys", slug: "toys" }, { id: "x2", name: "Pet Food", slug: "pets" }, { id: "x3", name: "Makeup", slug: "makeup" }, { id: "x4", name: "Perfumes & Fragrance", slug: "fragrance" }]
            ).map((c: any) => (
              <Link key={c.id} to={`/speedmart?cat=${c.slug ?? c.id}`} className="flex items-center gap-3 py-2.5 hover:text-primary group">
                <div className="h-9 w-9 rounded-xl bg-white/80 ring-1 ring-white/60 overflow-hidden flex items-center justify-center shrink-0">
                  {c.image_url ? <img src={c.image_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Tag className="h-4 w-4 text-primary/70" />}
                </div>
                <span className="text-sm font-semibold flex-1 truncate">{c.name}</span>
                <ChevronRight className="h-4 w-4 text-foreground/40 group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Offers & Events horizontal scroller ===== */}
      <OffersStrip banners={banners.data ?? []} />

      {/* ===== Product grid ===== */}
      <section className="mb-14">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
          {(sale.data ?? []).map((p: any) => {
            const off = Math.max(0, Math.round((1 - Number(p.price) / Number(p.compare_price)) * 100));
            return (
              <div key={p.id} className="relative rounded-2xl glass-card p-2.5 hover:-translate-y-0.5 transition-all">
                {off > 0 && (
                  <span className="absolute top-3 left-3 z-10 text-[10px] font-extrabold bg-primary text-primary-foreground rounded-full px-2 py-0.5 shadow">
                    −{off}%
                  </span>
                )}
                <ProductCard p={p as any} />
              </div>
            );
          })}
        </div>
        {(sale.data ?? []).length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">Offers will appear here once products go on sale.</div>
        )}
        {(sale.data ?? []).length >= 12 && (
          <div className="flex justify-center mt-10">
            <Link to="/speedmart" className="px-7 py-3 rounded-full glass-card text-sm font-bold hover:text-primary inline-flex items-center gap-2">
              Show more <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>

      {/* ===== Favourite brands ===== */}
      {(brands.data ?? []).length > 0 && (
        <section className="mb-4">
          <h2 className="text-xl font-extrabold tracking-tight mb-4">Favourite Brands</h2>
          <div className="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-8 gap-4">
            {(brands.data ?? []).map((b: any) => (
              <Link
                key={b.id}
                to={`/food/${b.id}`}
                className="rounded-2xl glass-card p-3 flex flex-col items-center gap-2 hover:-translate-y-0.5 hover:shadow-elevated transition-all"
              >
                <div className="h-16 w-16 rounded-2xl bg-white/80 ring-1 ring-white/60 overflow-hidden flex items-center justify-center">
                  {b.logo_url ? (
                    <img src={b.logo_url} alt={b.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <Coffee className="h-6 w-6 text-primary/70" />
                  )}
                </div>
                <span className="text-xs font-bold text-center leading-tight line-clamp-1">{b.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function OffersStrip({ banners }: { banners: any[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const items = banners.length ? banners : [];
  if (items.length === 0) return null;
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * 600, behavior: "smooth" });
  return (
    <section className="mb-12">
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-xl font-extrabold tracking-tight">Offers & Events</h2>
        <div className="flex gap-2">
          <button onClick={() => scroll(-1)} className="h-9 w-9 rounded-full glass-card flex items-center justify-center hover:text-primary" aria-label="Scroll left">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => scroll(1)} className="h-9 w-9 rounded-full glass-card flex items-center justify-center hover:text-primary" aria-label="Scroll right">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={ref} className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 -mx-2 px-2">
        {items.map((b) => (
          <Link
            key={b.id}
            to={b.cta_link || "/"}
            className="relative shrink-0 w-[280px] md:w-[340px] h-[150px] rounded-2xl overflow-hidden snap-start glass-card p-0 group"
          >
            {b.image_url && (
              <img src={b.image_url} alt={b.title || ""} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700" loading="lazy" decoding="async" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 text-white">
              {b.title && <h3 className="font-bold text-base leading-snug drop-shadow line-clamp-2">{b.title}</h3>}
              {b.subtitle && <p className="text-[10px] opacity-90 line-clamp-1 mt-0.5">{b.subtitle}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
