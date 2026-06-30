import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search as SearchIcon, SquarePen, ShoppingBasket, ImageOff, ShoppingCart, Plus } from "lucide-react";
import { CategoryTabsSkeleton, SectionSkeleton } from "@/components/speedo/Skeletons";
import { ProductSheet } from "@/components/speedo/ProductSheet";
import { useCart } from "@/store/cart";
import { formatPKR } from "@/lib/format";
import { thumb } from "@/lib/imageUrl";
import { toast } from "@/hooks/use-toast";

export default function SpeedMart() {
  const [params, setParams] = useSearchParams();
  const cat = params.get("cat") || "all";
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const [openProduct, setOpenProduct] = useState<any | null>(null);
  const cartItems = useCart((s) => s.items);
  const hydrated = useCart((s) => s._hydrated);
  const cartCount = cartItems.reduce((a, b) => a + b.quantity, 0);
  const cartSubtotal = cartItems.reduce((a, b) => a + b.quantity * Number(b.price), 0);

  // Cart restore toast — fires once after persisted state rehydrates.
  const restoreNoticed = useRef(false);
  useEffect(() => {
    if (!hydrated || restoreNoticed.current) return;
    restoreNoticed.current = true;
    const count = cartItems.reduce((a, b) => a + b.quantity, 0);
    if (count > 0) {
      toast({
        title: "Cart restored",
        description: `${count} item${count > 1 ? "s" : ""} recovered from your last session.`,
      });
    }
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const cats = useQuery({
    queryKey: ["cats"],
    staleTime: 5 * 60_000,
    gcTime: 24 * 60 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      return data ?? [];
    },
  });

  const products = useQuery({
    queryKey: ["products", "all"],
    staleTime: 5 * 60_000,
    gcTime: 24 * 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, unit, description, image_url, category_id, is_active, created_at, categories(id, slug, name, sort_order)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const sections = useMemo(() => {
    const list = products.data ?? [];
    const allCats = cats.data ?? [];
    const s = q.trim().toLowerCase();
    const matched = list.filter((p: any) => {
      if (cat !== "all" && p.categories?.slug !== cat) return false;
      if (s && !p.name.toLowerCase().includes(s)) return false;
      return true;
    });
    const groups = new Map<string, { name: string; sort: number; items: any[] }>();
    matched.forEach((p: any) => {
      const c = p.categories;
      const key = c?.id ?? "_other";
      if (!groups.has(key)) {
        groups.set(key, { name: c?.name ?? "Other", sort: c?.sort_order ?? 9999, items: [] });
      }
      groups.get(key)!.items.push(p);
    });
    return Array.from(groups.values()).sort((a, b) => a.sort - b.sort);
  }, [products.data, cats.data, cat, q]);

  // Proactively prefetch category icons + visible product thumbnails after
  // the first successful load so repeat visits feel instant.
  useEffect(() => {
    if (!products.data || !cats.data) return;
    const urls = new Set<string>();
    (cats.data as any[]).forEach((c) => {
      const u = thumb(c.image_url, 96);
      if (u) urls.add(u);
    });
    (products.data as any[]).slice(0, 48).forEach((p) => {
      const u = thumb(p.image_url, 280);
      if (u) urls.add(u);
    });
    const idle = (cb: () => void) =>
      (window as any).requestIdleCallback ? (window as any).requestIdleCallback(cb) : setTimeout(cb, 200);
    idle(() => {
      urls.forEach((u) => {
        const img = new Image();
        img.decoding = "async";
        img.loading = "eager";
        img.src = u;
      });
    });
  }, [products.data, cats.data]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-0 py-3 lg:py-0 space-y-4 pb-28">
      {/* Search bar */}
      <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3 border border-border/60 shadow-[0_2px_10px_-6px_rgba(0,0,0,0.08)]">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`); }}
          placeholder="Search for 'Bottle'"
          className="flex-1 bg-transparent outline-none text-sm sm:text-base text-foreground placeholder:text-muted-foreground/70"
        />
        <SearchIcon className="h-5 w-5 text-foreground/80" />
        <span className="h-5 w-px bg-border" />
        <SquarePen className="h-5 w-5 text-foreground/70" />
      </div>

      {/* Category tabs */}
      <div className="overflow-x-auto no-scrollbar -mx-3 sm:-mx-4 lg:mx-0 px-3 sm:px-4 lg:px-0 border-b border-border/60">
        {cats.isLoading ? (
          <CategoryTabsSkeleton />
        ) : (
        <div className="flex gap-1 min-w-max">
          <Tab active={cat === "all"} onClick={() => setParams({})} label="All" icon={<ShoppingBasket className="h-5 w-5" strokeWidth={2} />} />
          {(cats.data ?? []).map((c: any) => (
            <Tab
              key={c.id}
              active={cat === c.slug}
              onClick={() => setParams({ cat: c.slug })}
              label={c.name}
              image={thumb(c.image_url, 96)}
            />
          ))}
        </div>
        )}
      </div>

      {/* Sections */}
      {products.isLoading || cats.isLoading ? (
        <div className="space-y-6 pb-4">
          <SectionSkeleton count={8} />
          <SectionSkeleton count={8} />
        </div>
      ) : sections.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No products found.</p>
      ) : (
        <div className="space-y-6 pb-4">
          {sections.map((g) => (
            <section key={g.name}>
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground mb-3 px-0.5">{g.name}</h2>
              <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2.5 sm:gap-3 lg:gap-4">
                {g.items.map((p: any) => <Tile key={p.id} p={p} onOpen={() => setOpenProduct(p)} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      <ProductSheet product={openProduct} open={!!openProduct} onOpenChange={(o) => !o && setOpenProduct(null)} />

      {cartCount > 0 && (
        <button
          onClick={() => nav("/cart")}
          className="fixed left-1/2 -translate-x-1/2 bottom-24 lg:bottom-6 z-40 w-[92%] max-w-md flex items-center justify-between gap-3 bg-primary text-primary-foreground rounded-2xl px-4 py-3 shadow-2xl shadow-primary/30 active:scale-[0.98] transition"
        >
          <div className="flex items-center gap-2 text-sm font-bold">
            <ShoppingCart className="h-5 w-5" />
            {cartCount} item{cartCount > 1 ? "s" : ""} · {formatPKR(cartSubtotal)}
          </div>
          <div className="text-sm font-extrabold">View Cart →</div>
        </button>
      )}
    </div>
  );
}

function Tab({ active, onClick, label, icon, image }: { active: boolean; onClick: () => void; label: string; icon?: React.ReactNode; image?: string | null }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1.5 px-4 sm:px-5 py-2.5 min-w-[72px] transition-colors ${
        active ? "text-foreground" : "text-muted-foreground/80 hover:text-foreground"
      }`}
    >
      <div className="h-6 w-6 flex items-center justify-center">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            className="h-6 w-6 object-contain"
          />
        ) : icon ?? <ShoppingBasket className="h-5 w-5" />}
      </div>
      <span className={`text-xs sm:text-sm whitespace-nowrap ${active ? "font-bold" : "font-medium"}`}>{label}</span>
      {active && <span className="absolute -bottom-px left-2 right-2 h-[2.5px] rounded-full bg-foreground" />}
    </button>
  );
}

function Tile({ p, onOpen }: { p: any; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="group flex flex-col items-center text-center text-left">
      <div className="w-full aspect-square rounded-2xl bg-[#eaf1fb] flex items-center justify-center overflow-hidden p-2 transition-transform group-hover:-translate-y-0.5 group-active:scale-95">
        {p.image_url ? (
          <img
            src={thumb(p.image_url, 280) || p.image_url}
            alt={p.name}
            loading="lazy"
            decoding="async"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
            className="w-full h-full object-contain transition-transform group-hover:scale-105"
          />
        ) : (
          <ImageOff className="h-7 w-7 text-muted-foreground/40" />
        )}
      </div>
      <span className="mt-2 text-[12px] sm:text-sm font-semibold text-foreground leading-tight line-clamp-2 px-0.5 w-full">
        {p.name}
      </span>
    </button>
  );
}