import { useMemo } from "react";
import { Wand2 } from "lucide-react";
import { useCart } from "@/store/cart";
import { useCatalog, recommend } from "@/lib/shopAssistant";
import { ProductCard } from "./ProductCard";

/** Smart picks from the live catalog (rule-based, free). With cart items → complementary. */
export function AiPicks({ title, limit = 8, className = "" }: { title?: string; limit?: number; className?: string }) {
  const cartIds = useCart((s) => s.items.map((i) => i.product_id).sort().join(","));
  const { data: catalog, isLoading } = useCatalog();
  const data = useMemo(() => (catalog ? recommend(catalog, cartIds ? cartIds.split(",") : [], limit) : []), [catalog, cartIds, limit]);

  if (!isLoading && !data.length) return null;
  const heading = title ?? (cartIds ? "Goes well with your basket" : "Picked for you");

  return (
    <section className={className}>
      <div className="flex items-center gap-2 mb-3">
        <span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Wand2 className="h-4 w-4" /></span>
        <h2 className="text-lg lg:text-xl font-semibold tracking-tight">{heading}</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />)
          : data.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}
