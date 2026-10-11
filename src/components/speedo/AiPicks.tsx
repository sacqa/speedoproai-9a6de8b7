import { useQuery } from "@tanstack/react-query";
import { Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/store/cart";
import { ProductCard } from "./ProductCard";

const FIELDS = "id,name,price,unit,image_url,category_id,stock,is_active";

/** AI-picked real products. With cart items → complementary; otherwise personalized picks. */
export function AiPicks({ title, limit = 8, className = "" }: { title?: string; limit?: number; className?: string }) {
  const cartIds = useCart((s) => s.items.map((i) => i.product_id).sort().join(","));
  const { data, isLoading } = useQuery({
    queryKey: ["ai-picks", cartIds, limit],
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    retry: false,
    queryFn: async () => {
      const cacheKey = `speedo-ai-picks:${limit}:${cartIds}`;
      let ids: string[] | null = null;
      try {
        const c = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
        if (c && Date.now() - c.at < 30 * 60_000) ids = c.ids;
      } catch { /* ignore */ }
      if (!ids) {
        const { data, error } = await supabase.functions.invoke("ai-shop", {
          body: { mode: "recommend", cart: cartIds ? cartIds.split(",") : [], limit },
        });
        if (error) throw error;
        ids = (data?.ids ?? []) as string[];
        sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), ids }));
      }
      if (!ids.length) return [];
      // Re-read live price & stock from the database.
      const { data: rows } = await supabase.from("products").select(FIELDS).in("id", ids).eq("is_active", true).gt("stock", 0);
      const map = new Map((rows ?? []).map((r: any) => [r.id, r]));
      return ids.map((id) => map.get(id)).filter(Boolean) as any[];
    },
  });

  if (!isLoading && !data?.length) return null;
  const heading = title ?? (cartIds ? "Goes well with your basket" : "Picked for you");

  return (
    <section className={className}>
      <div className="flex items-center gap-2 mb-3">
        <span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Wand2 className="h-4 w-4" /></span>
        <h2 className="text-lg lg:text-xl font-semibold tracking-tight">{heading}</h2>
        <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-primary/80 bg-primary/10 rounded-full px-2 py-0.5">AI</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />)
          : data!.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}
