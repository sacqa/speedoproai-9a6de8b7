import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ShoppingBasket, Pill, UtensilsCrossed, Package, ArrowRight,
  ChevronLeft, ChevronRight, Sparkles, Flame, Tag,
} from "lucide-react";
import { ProductCard } from "@/components/speedo/ProductCard";

/**
 * Editorial glass desktop home — mirrors the mobile structure.
 * Sections (top → bottom):
 *  1. 4 equal service banners (SpeedMart, Food, Pharmacy, SpeedSend)
 *  2. Hero promo banner (admin banners[0]) with floating glass card overlay
 *  3. Categories grid (all popular categories)
 *  4. Featured products
 *  5. Hot-selling products
 * Calm-premium-neutral glassmorphism — frosted surfaces, soft purple aurora.
 */

const SERVICES = [
  { name: "SpeedMart", desc: "Groceries in minutes",   to: "/speedmart", icon: ShoppingBasket, tint: "from-primary/15 to-primary/0" },
  { name: "Food",      desc: "Restaurants & cafés",    to: "/food",      icon: UtensilsCrossed, tint: "from-amber-300/30 to-amber-50/0" },
  { name: "Pharmacy",  desc: "Health & wellness",      to: "/pharmacy",  icon: Pill,            tint: "from-emerald-300/30 to-emerald-50/0" },
  { name: "SpeedSend", desc: "Send a parcel fast",     to: "/speedsend", icon: Package,         tint: "from-sky-300/30 to-sky-50/0" },
];

export function DesktopHome() {
  const banners = useQuery({
    queryKey: ["banners"],
    queryFn: async () => (await supabase.from("banners").select("*").eq("is_active", true).order("sort_order")).data ?? [],
  });
  const allCats = useQuery({
    queryKey: ["categories", "all-active"],
    queryFn: async () => (await supabase.from("categories").select("*").eq("is_active", true).order("sort_order")).data ?? [],
  });
  const featured = useQuery({
    queryKey: ["products", "featured-desktop"],
    queryFn: async () => (await supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(8)).data ?? [],
  });
  const hotCategory = useQuery({
    queryKey: ["categories", "hot"],
    queryFn: async () =>
      (await supabase.from("categories").select("*").eq("is_active", true).eq("is_hot_selling", true).order("sort_order").limit(1).maybeSingle()).data,
  });
  const hotProducts = useQuery({
    queryKey: ["products", "hot-desktop", hotCategory.data?.id],
    enabled: !!hotCategory.data?.id,
    queryFn: async () => (await supabase.from("products").select("*").eq("is_active", true).eq("category_id", hotCategory.data!.id).order("created_at", { ascending: false }).limit(8)).data ?? [],
  });
  const sale = useQuery({
    queryKey: ["products", "sale-desktop"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("is_active", true).not("compare_price", "is", null).order("created_at", { ascending: false }).limit(8);
      return (data ?? []).filter((p: any) => Number(p.compare_price) > Number(p.price));
    },
  });

  const trending = (hotProducts.data ?? []).length > 0 ? hotProducts.data! : (sale.data ?? []);
  const trendingTitle = hotCategory.data?.name ? `Hot in ${hotCategory.data.name}` : "Hot This Week";
  const hero = banners.data?.[0];

  return (
    <div className="-mx-8 xl:-mx-12 -my-6 px-8 xl:px-12 py-10 min-h-screen relative">
      {/* Aurora background wash */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] rounded-full opacity-50"
             style={{ background: "radial-gradient(closest-side, hsl(279 100% 85% / 0.55), transparent 70%)" }} />
        <div className="absolute top-[40%] -right-40 w-[600px] h-[600px] rounded-full opacity-40"
             style={{ background: "radial-gradient(closest-side, hsl(190 95% 75% / 0.35), transparent 70%)" }} />
        <div className="absolute bottom-0 -left-40 w-[600px] h-[600px] rounded-full opacity-40"
             style={{ background: "radial-gradient(closest-side, hsl(330 95% 80% / 0.35), transparent 70%)" }} />
      </div>

      {/* ===== 1. SERVICE BANNERS — 4 equal ===== */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {SERVICES.map((s) => (
          <Link
            key={s.name}
            to={s.to}
            className="group relative overflow-hidden rounded-[28px] glass-card p-6 hover:-translate-y-1 hover:shadow-elevated transition-all duration-300"
          >
            <div className={`absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-gradient-to-br ${s.tint} blur-2xl opacity-80 group-hover:opacity-100 transition-opacity`} />
            <div className="relative h-12 w-12 rounded-2xl bg-white/70 ring-1 ring-white/80 backdrop-blur flex items-center justify-center mb-5">
              <s.icon className="h-6 w-6 text-primary" strokeWidth={2.2} />
            </div>
            <h3 className="relative font-extrabold text-lg tracking-tight">{s.name}</h3>
            <p className="relative text-xs text-muted-foreground mt-1">{s.desc}</p>
          </Link>
        ))}
      </section>

      {/* ===== 2. HERO PROMO ===== */}
      <section className="relative mb-12 rounded-[36px] overflow-hidden glass-card p-0 h-[420px] group">
        {hero?.image_url ? (
          <img
            src={hero.image_url}
            alt={hero.title || "Featured offer"}
            loading="eager"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[1200ms]"
          />
        ) : (
          <div className="absolute inset-0 gradient-hero" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/55 via-foreground/15 to-transparent" />
        <div className="relative h-full flex items-center px-10 xl:px-16">
          <div className="max-w-md p-8 rounded-[28px] bg-white/35 backdrop-blur-2xl border border-white/50 shadow-2xl space-y-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary text-primary-foreground text-[10px] font-extrabold tracking-[0.18em] uppercase rounded-full">
              <Sparkles className="h-3 w-3" /> {hero?.cta_label ? "Featured" : "Now Live"}
            </span>
            <h1 className="text-4xl xl:text-5xl font-black leading-[1.05] text-foreground tracking-tight">
              {hero?.title || "Premium Quality. Express Speed."}
            </h1>
            <p className="text-foreground/80 leading-relaxed text-sm">
              {hero?.subtitle || "From groceries to gourmet meals — discover what's trending around you, delivered fast."}
            </p>
            <Link
              to={hero?.cta_link || "/speedmart"}
              className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-2xl font-bold text-sm hover:scale-[1.03] transition-transform shadow-lg"
            >
              {hero?.cta_label || "Shop now"} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 3. CATEGORIES GRID ===== */}
      {(allCats.data ?? []).length > 0 && (
        <section className="mb-12">
          <SectionTitle title="Shop by Category" subtitle="Everything you need, organized" viewAll="/speedmart" />
          <div className="grid grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-4">
            {(allCats.data ?? []).slice(0, 16).map((c: any) => (
              <Link
                key={c.id}
                to={`/speedmart?cat=${c.slug ?? c.id}`}
                className="group flex flex-col items-center gap-3 cursor-pointer"
              >
                <div className="w-full aspect-square rounded-3xl glass-card flex items-center justify-center overflow-hidden group-hover:-translate-y-1 group-hover:shadow-elevated transition-all p-3">
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} loading="lazy" decoding="async" className="h-full w-full object-cover rounded-2xl" />
                  ) : c.icon ? (
                    <span className="text-4xl">{c.icon}</span>
                  ) : (
                    <Tag className="h-7 w-7 text-primary/70" />
                  )}
                </div>
                <span className="text-xs font-bold text-foreground/80 text-center leading-tight line-clamp-1">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ===== 4. FEATURED PRODUCTS ===== */}
      {(featured.data ?? []).length > 0 && (
        <section className="mb-12">
          <SectionTitle title="Featured Items" subtitle="Curated picks just for you" viewAll="/speedmart" accent="primary" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {(featured.data ?? []).slice(0, 8).map((p: any) => (
              <div key={p.id} className="rounded-3xl glass-card p-3 hover:-translate-y-1 hover:shadow-elevated transition-all duration-300">
                <ProductCard p={p as any} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== 5. HOT-SELLING / TRENDING ===== */}
      {trending.length > 0 && (
        <section className="mb-6">
          <SectionTitle title={trendingTitle} subtitle="Best sellers everyone's loving" viewAll="/speedmart" accent="orange" icon={Flame} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {trending.slice(0, 8).map((p: any) => {
              const off = p.compare_price ? Math.max(0, Math.round((1 - Number(p.price) / Number(p.compare_price)) * 100)) : 0;
              return (
                <div key={p.id} className="relative rounded-3xl glass-card p-3 hover:-translate-y-1 hover:shadow-elevated transition-all duration-300">
                  {off > 0 && (
                    <span className="absolute top-4 left-4 z-10 text-[10px] font-extrabold bg-primary text-primary-foreground rounded-full px-2 py-0.5 shadow">
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
    </div>
  );
}

function SectionTitle({
  title, subtitle, viewAll, accent = "primary", icon: Icon,
}: { title: string; subtitle?: string; viewAll?: string; accent?: "primary" | "orange"; icon?: React.ElementType }) {
  const bar = accent === "orange" ? "bg-orange" : "bg-primary";
  return (
    <div className="flex items-end justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className={`w-1.5 h-9 rounded-full ${bar}`} />
        <div>
          <h2 className="text-2xl xl:text-[26px] font-black tracking-tight flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-primary" />}
            {title}
          </h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {viewAll && (
        <Link to={viewAll} className="text-sm font-bold text-primary inline-flex items-center gap-1 hover:gap-2 transition-all">
          View all <ArrowRight className="h-4 w-4" />
        </Link>
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
