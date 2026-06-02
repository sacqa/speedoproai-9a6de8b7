import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/store/cart";
import { useRecentlyViewed } from "@/store/recentlyViewed";
import { formatPKR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ImageOff, Minus, Plus, ShoppingBag } from "lucide-react";
import { useEffect } from "react";

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const trackView = useRecentlyViewed((s) => s.push);
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);

  useEffect(() => { if (id) trackView(id); }, [id, trackView]);

  const { data: p, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!p) return <div className="p-10 text-center text-muted-foreground">Product not found</div>;

  const inCart = items.find((i) => i.product_id === p.id);
  const compare = p.compare_price ? Number(p.compare_price) : 0;
  const price = Number(p.price);
  const off = compare > price ? Math.round((1 - price / compare) * 100) : 0;

  return (
    <div className="pb-32 lg:pb-10">
      <div className="flex items-center gap-3 px-4 lg:px-0 py-3">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-bold truncate flex-1">{p.name}</h1>
      </div>

      <div className="bg-white mx-4 lg:mx-0 rounded-3xl border border-border/60 overflow-hidden aspect-square flex items-center justify-center p-6">
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} className="max-h-full max-w-full object-contain" />
        ) : (
          <div className="text-muted-foreground/50 flex flex-col items-center gap-2">
            <ImageOff className="h-10 w-10" />
            <span className="text-xs">No image</span>
          </div>
        )}
      </div>

      <div className="px-4 lg:px-0 pt-5 space-y-3">
        {p.categories?.name && (
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">
            {p.categories.name}
          </div>
        )}
        <h2 className="text-2xl font-extrabold tracking-tight leading-tight">{p.name}</h2>
        {p.unit && (
          <div className="text-sm text-muted-foreground">{p.unit}</div>
        )}

        <div className="flex items-end gap-3 pt-1">
          <span className="text-3xl font-extrabold text-foreground">{formatPKR(price)}</span>
          {off > 0 && (
            <>
              <span className="text-base text-muted-foreground line-through pb-1">{formatPKR(compare)}</span>
              <span className="text-xs font-bold bg-primary text-white rounded-full px-2 py-0.5 pb-0.5 mb-1.5">-{off}%</span>
            </>
          )}
        </div>

        {p.description && (
          <div className="pt-4">
            <h3 className="text-sm font-bold mb-1.5">Description</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{p.description}</p>
          </div>
        )}

        <div className="pt-3 text-xs text-muted-foreground">
          {p.stock > 0 ? <span className="text-success font-semibold">In stock</span> : <span className="text-destructive font-semibold">Out of stock</span>}
        </div>
      </div>

      <div className="fixed bottom-16 lg:static lg:mt-6 left-0 right-0 px-4 lg:px-0 py-3 bg-background/95 backdrop-blur border-t border-border lg:border-0 lg:bg-transparent z-30">
        {inCart ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-accent text-accent-foreground rounded-2xl p-1">
              <button onClick={() => setQty(p.id, inCart.quantity - 1)} className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center" aria-label="Decrease"><Minus className="h-4 w-4" /></button>
              <span className="px-3 font-extrabold tabular-nums">{inCart.quantity}</span>
              <button onClick={() => setQty(p.id, inCart.quantity + 1)} className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center" aria-label="Increase"><Plus className="h-4 w-4" /></button>
            </div>
            <Button asChild className="flex-1 h-12 text-base"><Link to="/cart">Go to cart</Link></Button>
          </div>
        ) : (
          <Button
            onClick={() => add({ product_id: p.id, name: p.name, price, unit: p.unit, image_url: p.image_url })}
            disabled={p.stock <= 0}
            className="w-full h-12 text-base"
          >
            <ShoppingBag className="h-5 w-5 mr-2" /> Add to cart
          </Button>
        )}
      </div>
    </div>
  );
}