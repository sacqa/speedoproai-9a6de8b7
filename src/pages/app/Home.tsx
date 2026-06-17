import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, ShoppingBasket, Pill, Package, UtensilsCrossed, ArrowRight, Search as SearchIcon, Mic, Flame } from "lucide-react";
import { ProductCard } from "@/components/speedo/ProductCard";
import { SectionHeader } from "@/components/speedo/SectionHeader";
import { Seo } from "@/components/seo/Seo";
import { CategoryRowSkeleton, ProductGridSkeleton } from "@/components/speedo/Skeletons";

export default function Home() {
  const nav = useNavigate();
  useEffect(() => {
    // Show mobile splash on first session entry (skip when already navigated through splash).
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("speedo-splash-shown")) return;
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (isMobile) nav("/splash", { replace: true });
    else sessionStorage.setItem("speedo-splash-shown", "1");
  }, [nav]);
  const banners = useQuery({
    queryKey: ["banners"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const popularCats = useQuery({
    queryKey: ["categories", "popular"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).eq("is_popular", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const sale = useQuery({
    queryKey: ["products", "sale"],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .not("compare_price", "is", null)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []).filter((p: any) => Number(p.compare_price) > Number(p.price));
    },
  });
  const hotCategory = useQuery({
    queryKey: ["categories", "hot"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .eq("is_hot_selling", true)
        .order("sort_order")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const hotProducts = useQuery({
    queryKey: ["products", "hot", hotCategory.data?.id],
    enabled: !!hotCategory.data?.id,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("category_id", hotCategory.data!.id)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-7 lg:space-y-10 pb-4 bg-page-gradient">
      <Seo
        title="Speedo — Groceries, Pharmacy, Food & Parcels in Dipalpur"
        description="Order groceries, medicines, food and send parcels across Dipalpur. Fast hyperlocal delivery via Speedo."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Speedo",
          url: "https://speedoproai.lovable.app",
          areaServed: "Dipalpur, Pakistan",
        }}
      />
      {/* Search bar */}
      <div className="px-4 lg:px-0 pt-4 lg:pt-0">
        <Link
          to="/search"
          className="flex items-center gap-3 bg-white/90 backdrop-blur-md rounded-2xl px-4 py-4 shadow-card border border-accent/40 hover:border-primary/40 transition-colors"
        >
          <SearchIcon className="h-5 w-5 text-primary shrink-0" strokeWidth={2.5} />
          <span className="text-muted-foreground text-sm flex-1 truncate font-medium">
            Search food, medicine, items…
          </span>
          <Mic className="h-5 w-5 text-primary shrink-0" />
        </Link>
      </div>

      {/* 4 service shortcuts in single row */}
      <ServiceShortcuts />

      {/* Hero banner */}
      <BannerSlider banners={banners.data ?? []} />

      {/* Popular Categories (admin-curated) */}
      {popularCats.isLoading ? (
        <section>
          <SectionHeader title="Popular Categories" viewAllTo="/speedmart" />
          <CategoryRowSkeleton />
        </section>
      ) : (popularCats.data ?? []).length > 0 && (
        <section>
          <SectionHeader title="Popular Categories" viewAllTo="/speedmart" />
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-3 sm:gap-4 lg:gap-5 px-4 lg:px-0 pb-2">
              {(popularCats.data ?? []).map((c: any) => (
                <Link
                  to={`/speedmart?cat=${c.slug}`}
                  key={c.id}
                  className="flex-shrink-0 w-[68px] sm:w-20 lg:w-24 text-center group"
                >
                  <div className="aspect-square w-full rounded-3xl bg-white border border-accent/40 shadow-card flex items-center justify-center overflow-hidden group-hover:scale-105 group-hover:border-primary/40 transition-all">
                    <CategoryIcon src={c.image_url} alt={c.name} />
                  </div>
                  <p className="mt-2 text-[11px] sm:text-xs font-semibold leading-tight line-clamp-2 text-primary">{c.name}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Hot Selling — admin curates a category */}
      {hotCategory.data && (hotProducts.data ?? []).length > 0 && (
        <section>
          <div className="flex items-center justify-between px-4 lg:px-0 mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl gradient-primary flex items-center justify-center text-white text-base">
                {hotCategory.data.icon || "🔥"}
              </div>
              <div>
                <h2 className="font-extrabold text-lg leading-none">Hot Selling</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Trending in {hotCategory.data.name}</p>
              </div>
            </div>
            <Link to={`/speedmart?cat=${hotCategory.data.slug}`} className="text-xs font-bold text-primary">View all →</Link>
          </div>
          <div className="px-4 lg:px-0 grid-products">
            {(hotProducts.data ?? []).map((p: any) => (
              <ProductCard key={p.id} p={p as any} />
            ))}
          </div>
        </section>
      )}
      {hotProducts.isLoading && hotCategory.data && (
        <section className="px-4 lg:px-0">
          <ProductGridSkeleton count={4} />
        </section>
      )}

      {/* Offers / Sale (auto from compare_price) */}
      {(sale.data ?? []).length > 0 && (
        <section>
          <div className="flex items-center justify-between px-4 lg:px-0 mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl gradient-primary flex items-center justify-center">
                <Flame className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-extrabold text-lg leading-none">Offers & Sale</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Limited-time discounts</p>
              </div>
            </div>
            <Link to="/speedmart" className="text-xs font-bold text-primary">View all →</Link>
          </div>
          <div className="px-4 lg:px-0 grid-products">
            {(sale.data ?? []).map((p: any) => {
              const off = Math.max(0, Math.round((1 - Number(p.price) / Number(p.compare_price)) * 100));
              return (
                <div key={p.id} className="relative">
                  {off > 0 && (
                    <span className="absolute top-2 left-2 z-10 text-[10px] font-bold bg-primary text-white rounded-full px-2 py-0.5 shadow">
                      -{off}%
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

function BannerSlider({ banners }: { banners: any[] }) {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (banners.length === 0) return;
    const t = setInterval(() => setI((x) => (x + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);
  if (!banners.length) return null;
  const b = banners[i];
  return (
    <div className="px-4 lg:px-0">
      <div
        ref={ref}
        className="relative rounded-[28px] overflow-hidden mx-auto max-w-md lg:max-w-3xl bg-gradient-to-br from-accent via-white to-accent/40 border border-white/70 shadow-[0_20px_50px_-25px_hsl(var(--primary)/0.4)]"
      >
        <div className="relative grid grid-cols-[1.05fr_1fr] items-center gap-2 p-5 lg:p-8 min-h-[180px] lg:min-h-[240px]">
          <div className="relative z-10 flex flex-col">
            <h3 className="font-display text-[22px] leading-[1.05] lg:text-4xl font-extrabold tracking-tight text-foreground">
              {b.title}
            </h3>
            {b.subtitle && (
              <p className="mt-1.5 lg:mt-2 text-[12px] lg:text-sm text-muted-foreground line-clamp-2 max-w-[22ch]">
                {b.subtitle}
              </p>
            )}
            {b.cta_label && (
              <Link
                to={b.cta_link || "/"}
                className="mt-4 lg:mt-5 inline-flex items-center gap-2 self-start bg-foreground text-background font-bold text-[13px] lg:text-sm pl-4 pr-3 py-2.5 lg:py-3 rounded-full shadow-[0_10px_24px_-8px_rgba(0,0,0,0.5)] hover:scale-[1.03] active:scale-95 transition-transform"
              >
                {b.cta_label}
                <span className="h-5 w-5 rounded-full bg-background/15 flex items-center justify-center">
                  <ArrowRight className="h-3 w-3" strokeWidth={3} />
                </span>
              </Link>
            )}
          </div>
          <div className="relative h-full min-h-[140px] lg:min-h-[200px]">
            <img
              src={b.image_url}
              alt={b.title}
              loading="lazy"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
              className="absolute inset-0 w-full h-full object-contain object-right drop-shadow-[0_15px_25px_rgba(0,0,0,0.18)]"
            />
          </div>
        </div>
        <button
          onClick={() => setI((x) => (x - 1 + banners.length) % banners.length)}
          aria-label="Previous"
          className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-card hover:bg-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => setI((x) => (x + 1) % banners.length)}
          aria-label="Next"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-card hover:bg-white"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, idx) => (
            <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-primary" : "w-1.5 bg-primary/30"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ServiceShortcuts() {
  const services = [
    { to: "/speedmart", icon: ShoppingBasket, name: "SpeedMart", desc: "Groceries & Essentials" },
    { to: "/food", icon: UtensilsCrossed, name: "Food", desc: "Restaurants & Cafés" },
    { to: "/pharmacy", icon: Pill, name: "Pharmacy", desc: "Medicines & Health" },
    { to: "/speedsend", icon: Package, name: "SpeedSend", desc: "Send a Parcel" },
  ];
  return (
    <div className="px-4 lg:px-0">
      <div className="grid grid-cols-4 gap-2 lg:gap-3">
        {services.map((s) => (
          <Link key={s.to} to={s.to} className="flex flex-col items-center gap-2 group">
            <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-2xl bg-accent flex items-center justify-center group-hover:bg-primary/15 group-active:scale-95 transition-all shadow-card">
              <s.icon className="h-7 w-7 lg:h-8 lg:w-8 text-primary" strokeWidth={2.2} />
            </div>
            <div className="text-[11px] lg:text-xs font-bold text-foreground text-center leading-tight">{s.name}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CategoryIcon({ src, alt }: { src?: string | null; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const actual = errored || !src ? "/placeholder.svg" : src;
  return (
    <div className="relative w-full h-full">
      {!loaded && <div className="absolute inset-0 animate-pulse bg-muted" />}
      <img
        src={actual}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => { setErrored(true); setLoaded(true); }}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}