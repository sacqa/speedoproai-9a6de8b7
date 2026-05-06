import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/speedo/ProductCard";
import { Search as SearchIcon, Sparkles, TrendingUp } from "lucide-react";
import { SmartSuggestions } from "@/components/app/SmartSuggestions";
import { useCart } from "@/store/cart";
import { useRecentlyViewed } from "@/store/recentlyViewed";

export default function Search() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const cartIds = useCart((s) => s.items.map((i) => i.product_id));
  const recent = useRecentlyViewed((s) => s.ids);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const results = useQuery({
    queryKey: ["search", debounced],
    enabled: debounced.length > 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products").select("*")
        .ilike("name", `%${debounced}%`).eq("is_active", true).limit(40);
      if (error) throw error;
      return data;
    },
  });

  const featured = useQuery({
    queryKey: ["explore-featured"],
    enabled: debounced.length <= 1,
    queryFn: async () => {
      const { data } = await supabase
        .from("products").select("*")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(24);
      return data ?? [];
    },
  });

  return (
    <div className="p-4 lg:p-0 space-y-4">
      <div className="flex items-center gap-2 bg-card rounded-pill px-4 py-3 shadow-card border border-border">
        <SearchIcon className="h-5 w-5 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="flex-1 bg-transparent outline-none text-sm"
        />
      </div>
      {debounced.length <= 1 ? (
        <>
          <SmartSuggestions mode="explore" recent={[...recent, ...cartIds]} title="Recommended for you" />
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl btn-glossy flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h2 className="font-bold text-base">Popular right now</h2>
            </div>
            {featured.isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-44 glass-card animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {(featured.data ?? []).map((p: any) => <ProductCard key={p.id} p={p} />)}
              </div>
            )}
          </section>
        </>
      ) : results.isLoading ? (
        <p className="text-center text-muted-foreground py-12">Searching…</p>
      ) : results.data?.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {results.data.map((p) => <ProductCard key={p.id} p={p as any} />)}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-12">No results for "{debounced}"</p>
      )}
    </div>
  );
}