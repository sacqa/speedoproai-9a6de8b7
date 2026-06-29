import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search as SearchIcon, SquarePen, ShoppingBasket, ImageOff } from "lucide-react";
import { ProductGridSkeleton } from "@/components/speedo/Skeletons";
import { useNavigate } from "react-router-dom";

export default function SpeedMart() {
  const [params, setParams] = useSearchParams();
  const cat = params.get("cat") || "all";
  const [q, setQ] = useState("");
  const nav = useNavigate();

  const cats = useQuery({
    queryKey: ["cats"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      return data ?? [];
    },
  });

  const products = useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(id, slug, name, sort_order)")
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

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-0 py-3 lg:py-0 space-y-4">
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
        <div className="flex gap-1 min-w-max">
          <Tab active={cat === "all"} onClick={() => setParams({})} label="All" icon={<ShoppingBasket className="h-5 w-5" strokeWidth={2} />} />
          {(cats.data ?? []).map((c: any) => (
            <Tab
              key={c.id}
              active={cat === c.slug}
              onClick={() => setParams({ cat: c.slug })}
              label={c.name}
              image={c.image_url}
            />
          ))}
        </div>
      </div>

      {/* Sections */}
      {products.isLoading || cats.isLoading ? (
        <ProductGridSkeleton count={8} />
      ) : sections.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No products found.</p>
      ) : (
        <div className="space-y-6 pb-4">
          {sections.map((g) => (
            <section key={g.name}>
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground mb-3 px-0.5">{g.name}</h2>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
                {g.items.map((p: any) => <Tile key={p.id} p={p} />)}
              </div>
            </section>
          ))}
        </div>
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

function Tile({ p }: { p: any }) {
  return (
    <Link to={`/product/${p.id}`} className="group flex flex-col items-center text-center">
      <div className="w-full aspect-square rounded-2xl bg-[#eaf1fb] flex items-center justify-center overflow-hidden p-2 transition-transform group-hover:-translate-y-0.5 group-active:scale-95">
        {p.image_url ? (
          <img
            src={p.image_url}
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
      <span className="mt-2 text-[12px] sm:text-sm font-semibold text-foreground leading-tight line-clamp-2 px-0.5">
        {p.name}
      </span>
    </Link>
  );
}