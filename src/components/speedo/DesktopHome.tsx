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
  const banners = useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const { data } = await supabase.from("banners").select("*").eq("is_active", true).order("sort_order");
      return data ?? [];
    },
  });
  const popularCats = useQuery({
    queryKey: ["categories", "popular"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).eq("is_popular", true).order("sort_order");
      return data ?? [];
    },
  });
  const sale = useQuery({
    queryKey: ["products", "sale"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("is_active", true).not("compare_price", "is", null).order("created_at", { ascending: false }).limit(8);
      return (data ?? []).filter((p: any) => Number(p.compare_price) > Number(p.price));
    },
  });
  const hero = banners.data?.[0];

  return (
    <div className="min-h-screen bg-[#fafaf7] text-[#1a1a1a] -mx-6 -my-6 px-10 py-10 xl:px-16 xl:py-12 selection:bg-primary selection:text-primary-foreground">
      {/* ===== Editorial Hero ===== */}
      <section className="grid grid-cols-12 gap-10 mb-24">
        <div className="col-span-12 lg:col-span-5 flex flex-col justify-center">
          <span className="text-primary font-semibold uppercase tracking-[0.22em] text-[11px] mb-7">
            Hyperlocal · Dipalpur
          </span>
          <h1 className="font-serif text-[88px] leading-[0.9] mb-8 tracking-tight">
            Essentials,<br />
            delivered <em className="text-primary not-italic font-serif italic">fast.</em>
          </h1>
          <p className="text-lg text-[#1a1a1a]/65 leading-relaxed mb-10 max-w-md">
            Dipalpur's premier concierge for groceries, medicine, gourmet meals and parcels — at your doorstep in minutes.
          </p>
          <div className="flex gap-4 mb-10">
            <Link to="/speedmart" className="bg-primary text-primary-foreground px-9 py-4 text-sm font-semibold tracking-wide hover:bg-primary-dark transition-colors rounded-sm">
              Start Order
            </Link>
            <Link to="/search" className="border border-[#e8e4dd] px-9 py-4 text-sm font-semibold tracking-wide hover:bg-[#e8e4dd] transition-colors rounded-sm">
              Browse
            </Link>
          </div>
          <div className="flex items-center gap-2 bg-white border border-[#e8e4dd] rounded-sm px-4 py-3 max-w-md">
            <Search className="h-4 w-4 text-[#1a1a1a]/40" />
            <Link to="/search" className="text-sm text-[#1a1a1a]/55 flex-1">Search for fresh food, medicine, anything…</Link>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-7 relative h-[620px] overflow-hidden rounded-sm bg-[#e8e4dd] group">
          {hero?.image_url ? (
            <img src={hero.image_url} alt={hero.title || "Speedo"} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="eager" decoding="async" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#e8e4dd] to-[#d8d2c8]" />
          )}
          {hero?.title && (
            <div className="absolute bottom-8 left-8 bg-[#fafaf7] p-6 max-w-xs shadow-xl rounded-sm">
              <p className="font-serif italic text-xl mb-2 leading-snug">"{hero.title}"</p>
              {hero.subtitle && <p className="text-[10px] uppercase tracking-[0.2em] text-[#1a1a1a]/40">{hero.subtitle}</p>}
            </div>
          )}
        </div>
      </section>

      {/* ===== Magazine Category Grid ===== */}
      <section className="mb-24">
        <div className="flex items-end justify-between mb-10 border-b border-[#e8e4dd] pb-5">
          <h2 className="font-serif text-5xl tracking-tight">Categories</h2>
          <Link to="/speedmart" className="text-[11px] uppercase tracking-[0.22em] text-[#1a1a1a]/55 hover:text-primary transition-colors font-semibold">View All →</Link>
        </div>
        <div className="grid grid-cols-12 gap-6">
          {/* Featured tile */}
          <Link to="/speedmart" className="col-span-12 md:col-span-7 aspect-[16/10] relative overflow-hidden group rounded-sm bg-[#e8e4dd]">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#1a1a1a]/35 to-transparent z-10" />
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1400')" }} />
            <div className="absolute bottom-10 left-10 z-20">
              <span className="text-[10px] uppercase tracking-[0.22em] text-white/80 font-semibold mb-2 block">Daily essentials</span>
              <h3 className="text-white font-serif text-6xl mb-2">SpeedMart</h3>
              <p className="text-white/85 text-sm tracking-wide">Fresh produce, pantry & more</p>
            </div>
            <ArrowUpRight className="absolute top-6 right-6 z-20 h-8 w-8 text-white/90 group-hover:rotate-45 transition-transform" />
          </Link>
          <div className="col-span-12 md:col-span-5 flex flex-col gap-6">
            <Link to="/pharmacy" className="h-1/2 relative overflow-hidden group bg-[#e8e4dd] rounded-sm">
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1576091160550-2173bdd9962a?auto=format&fit=crop&q=80&w=900')" }} />
              <div className="absolute inset-0 bg-primary/10" />
              <div className="absolute bottom-6 left-6 z-10">
                <Pill className="h-5 w-5 text-white mb-2" />
                <h3 className="text-white font-serif text-4xl">Pharmacy</h3>
              </div>
            </Link>
            <div className="h-1/2 grid grid-cols-2 gap-6">
              <Link to="/food" className="bg-[#e8e4dd] flex flex-col justify-end p-6 hover:bg-primary hover:text-primary-foreground transition-colors rounded-sm group">
                <UtensilsCrossed className="h-5 w-5 mb-3 opacity-60 group-hover:opacity-100" />
                <span className="text-[10px] uppercase tracking-[0.22em] opacity-60 mb-1">Food</span>
                <h3 className="text-xl font-semibold">Cuisines</h3>
              </Link>
              <Link to="/speedsend" className="bg-[#1a1a1a] flex flex-col justify-end p-6 text-[#fafaf7] hover:bg-primary transition-colors rounded-sm group">
                <Package className="h-5 w-5 mb-3 opacity-60 group-hover:opacity-100" />
                <span className="text-[10px] uppercase tracking-[0.22em] opacity-50 mb-1">Logistics</span>
                <h3 className="text-xl font-semibold">Parcels</h3>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Popular Categories rail ===== */}
      {(popularCats.data ?? []).length > 0 && (
        <section className="mb-24">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">Popular categories</h2>
            <Link to="/speedmart" className="text-[11px] uppercase tracking-[0.22em] text-[#1a1a1a]/55 hover:text-primary font-semibold">View all →</Link>
          </div>
          <div className="grid grid-cols-6 lg:grid-cols-8 gap-5">
            {(popularCats.data ?? []).slice(0, 16).map((c: any) => (
              <Link key={c.id} to={`/speedmart?cat=${c.slug}`} className="group text-center">
                <div className="aspect-square w-full bg-white border border-[#e8e4dd] rounded-sm overflow-hidden mb-3 group-hover:border-primary/40 transition-all">
                  <img src={c.image_url || "/placeholder.svg"} alt={c.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <p className="text-xs font-semibold leading-tight line-clamp-2">{c.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ===== Featured Daily product grid ===== */}
      {(sale.data ?? []).length > 0 && (
        <section className="mb-24">
          <div className="flex items-end justify-between mb-8 border-b border-[#e8e4dd] pb-5">
            <div>
              <span className="text-[11px] uppercase tracking-[0.22em] text-primary font-semibold">Limited-time</span>
              <h2 className="font-serif text-4xl tracking-tight mt-1">Offers & Sale</h2>
            </div>
            <Link to="/speedmart" className="text-[11px] uppercase tracking-[0.22em] text-[#1a1a1a]/55 hover:text-primary font-semibold">View all →</Link>
          </div>
          <div className="grid grid-cols-4 gap-7">
            {(sale.data ?? []).slice(0, 8).map((p: any) => {
              const off = Math.max(0, Math.round((1 - Number(p.price) / Number(p.compare_price)) * 100));
              return (
                <div key={p.id} className="relative">
                  {off > 0 && (
                    <span className="absolute top-3 left-3 z-10 text-[10px] font-bold bg-primary text-primary-foreground rounded-sm px-2 py-1">
                      −{off}%
                    </span>
                  )}
                  <ProductCard p={p as any} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== Newsletter / closing band ===== */}
      <section className="bg-[#e8e4dd] py-20 px-12 rounded-sm text-center mb-8">
        <div className="max-w-2xl mx-auto">
          <span className="text-[11px] uppercase tracking-[0.22em] text-primary font-semibold">Stay close</span>
          <h2 className="text-5xl font-serif italic mt-3 mb-5">Get the app.</h2>
          <p className="text-[#1a1a1a]/65 mb-9 leading-relaxed">
            Install Speedo on your phone — exclusive weekly offers and faster reorders for Dipalpur.
          </p>
          <Link to="/splash" className="inline-block bg-primary text-primary-foreground px-10 py-4 text-sm font-semibold tracking-wide hover:bg-primary-dark transition-colors rounded-sm">
            Open on mobile →
          </Link>
        </div>
      </section>
    </div>
  );
}