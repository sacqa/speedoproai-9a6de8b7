import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, ShoppingBasket, Pill, UtensilsCrossed, Package, ArrowUpRight } from "lucide-react";
import { ProductCard } from "@/components/speedo/ProductCard";

/**
 * Editorial magazine-grid desktop home.
 * Calm Premium Neutral palette: #fafaf7 surface, #e8e4dd panels, #1a1a1a ink, #8a00d4 accent.
 * Only renders ≥ lg breakpoint via parent gating.
 */
export function DesktopHome() {
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