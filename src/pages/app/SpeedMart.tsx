import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/speedo/ProductCard";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon } from "lucide-react";

const PAGE = 12;

export default function SpeedMart() {
  const [params, setParams] = useSearchParams();
  const cat = params.get("cat") || "all";
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);

  const cats = useQuery({
    queryKey: ["cats"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      return data ?? [];
    },
  });

  const products = useQuery({
    queryKey: ["products", cat],
    queryFn: async () => {
      let query = supabase.from("products").select("*, categories!inner(slug)").eq("is_active", true);
      if (cat !== "all") query = query.eq("categories.slug", cat);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const list = products.data ?? [];
    if (!q.trim()) return list;
    const s = q.trim().toLowerCase();
    return list.filter((p: any) => p.name.toLowerCase().includes(s));
  }, [products.data, q]);

  return (
    <div className="p-4 lg:p-0 space-y-4">
      <h1 className="text-2xl font-extrabold">SpeedMart</h1>

      <div className="flex items-center gap-2 bg-card rounded-pill px-4 py-2.5 shadow-card border border-border">
        <SearchIcon className="h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search SpeedMart…" className="flex-1 bg-transparent outline-none text-sm" />
      </div>

      <div className="overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
        <div className="flex gap-3 py-1">
          <Chip active={cat === "all"} onClick={() => { setParams({}); setShown(PAGE); }} icon="🛒">All</Chip>
          {(cats.data ?? []).map((c: any) => (
            <Chip key={c.id} active={cat === c.slug} onClick={() => { setParams({ cat: c.slug }); setShown(PAGE); }} icon={c.icon}>
              {c.name}
            </Chip>
          ))}
        </div>
      </div>

      {products.isLoading ? (
        <p className="text-center text-muted-foreground py-12">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {filtered.slice(0, shown).map((p: any) => <ProductCard key={p.id} p={p} />)}
          </div>
          {shown < filtered.length && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => setShown((x) => x + PAGE)} className="rounded-pill px-8">
                View More
              </Button>
            </div>
          )}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">No products found.</p>}
        </>
      )}
    </div>
  );
}

function Chip({ active, children, onClick, icon }: { active: boolean; children: React.ReactNode; onClick: () => void; icon?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold whitespace-nowrap border-2 shadow-sm transition-all active:scale-95 ${
        active
          ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
          : "bg-card text-foreground border-border hover:border-primary/40"
      }`}
    >
      {icon && <span className="text-base leading-none">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}