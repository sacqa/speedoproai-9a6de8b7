import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/store/cart";
import { useRecentlyViewed } from "@/store/recentlyViewed";
import { formatPKR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, ImageOff, Minus, Plus, ShoppingBag, Truck, ShieldCheck, RotateCcw } from "lucide-react";
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
    <div className="pb-32 lg:pb-10 max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-2 lg:gap-10 lg:items-start">
        {/* Image hero stage */}
        <div className="relative lg:sticky lg:top-4">
          <div className="relative aspect-square lg:aspect-auto lg:h-[560px] bg-gradient-to-br from-emerald-50/60 via-white to-slate-50 lg:rounded-3xl overflow-hidden flex items-center justify-center p-8 lg:p-12">
            {/* Floating header buttons */}
            <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
              <button
                onClick={() => nav(-1)}
                aria-label="Back"
                className="w-11 h-11 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-foreground border border-border/40 active:scale-90 transition-transform"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                aria-label="Save"
                className="w-11 h-11 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-foreground border border-border/40 active:scale-90 transition-transform"
              >
                <Heart className="h-5 w-5" />
              </button>
            </div>

            {off > 0 && (
              <span className="absolute bottom-4 left-4 z-10 text-xs font-bold bg-orange-50 text-orange-600 border border-orange-100 rounded-xl px-2.5 py-1.5">
                {off}% OFF
              </span>
            )}

            {p.image_url ? (
              <img
                src={p.image_url}
                alt={p.name}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                className="relative z-10 max-h-full max-w-full object-contain drop-shadow-xl"
              />
            ) : (
              <div className="text-muted-foreground/50 flex flex-col items-center gap-2 relative z-10">
                <ImageOff className="h-10 w-10" />
                <span className="text-xs">No image</span>
              </div>
            )}
          </div>
        </div>

        {/* Content body */}
        <div className="relative -mt-10 lg:mt-0 bg-background lg:bg-transparent rounded-t-[2.5rem] lg:rounded-none px-6 lg:px-2 pt-8 lg:pt-4 pb-6 z-10 shadow-[0_-15px_40px_rgba(0,0,0,0.04)] lg:shadow-none space-y-6 min-w-0">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {p.categories?.name && (
                <span className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase bg-primary/10 rounded-md px-2 py-1">
                  {p.categories.name}
                </span>
              )}
              {p.stock > 0 ? (
                <span className="bg-success/10 text-success text-[10px] font-bold px-2.5 py-1.5 rounded-xl border border-success/20 uppercase">In stock</span>
              ) : (
                <span className="bg-destructive/10 text-destructive text-[10px] font-bold px-2.5 py-1.5 rounded-xl border border-destructive/20 uppercase">Out of stock</span>
              )}
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight leading-tight break-words">{p.name}</h1>
            {p.unit && <div className="text-sm text-muted-foreground">{p.unit}</div>}
          </div>

          <div className="flex items-end flex-wrap gap-x-3 gap-y-1">
            <span className="text-3xl lg:text-4xl font-bold text-foreground tabular-nums">{formatPKR(price)}</span>
            {off > 0 && (
              <>
                <span className="text-base text-muted-foreground/70 line-through decoration-muted-foreground/40 tabular-nums pb-1">{formatPKR(compare)}</span>
                <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-1 rounded-lg mb-0.5">Save {formatPKR(compare - price)}</span>
              </>
            )}
          </div>

          {p.description && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line break-words">{p.description}</p>
          )}

          {/* Feature chips */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {[
              { icon: Truck, label: "Fast Delivery", color: "text-emerald-600" },
              { icon: ShieldCheck, label: "Quality Verified", color: "text-blue-600" },
              { icon: RotateCcw, label: "Easy Returns", color: "text-orange-600" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-card border border-border shrink-0">
                <div className={`w-8 h-8 rounded-xl bg-background shadow-sm flex items-center justify-center ${f.color}`}>
                  <f.icon className="h-4 w-4" strokeWidth={2.5} />
                </div>
                <span className="text-[11px] font-bold text-foreground whitespace-nowrap">{f.label}</span>
              </div>
            ))}
          </div>

          {/* Desktop CTA inline */}
          <div className="hidden lg:block pt-2">
            <CartCta p={p} price={price} inCart={inCart} add={add} setQty={setQty} />
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA — above the floating bottom-nav */}
      <div className="fixed bottom-24 lg:hidden left-3 right-3 p-3 bg-background/95 backdrop-blur border border-border rounded-2xl shadow-elevated z-30 safe-bottom">
        <CartCta p={p} price={price} inCart={inCart} add={add} setQty={setQty} />
      </div>
    </div>
  );
}

function CartCta({ p, price, inCart, add, setQty }: any) {
  if (inCart) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-primary text-primary-foreground rounded-2xl p-1">
          <button onClick={() => setQty(p.id, inCart.quantity - 1)} className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center" aria-label="Decrease"><Minus className="h-4 w-4" /></button>
          <span className="px-3 font-extrabold tabular-nums">{inCart.quantity}</span>
          <button onClick={() => setQty(p.id, inCart.quantity + 1)} className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center" aria-label="Increase"><Plus className="h-4 w-4" /></button>
        </div>
        <Button asChild className="flex-1 h-12 text-base"><Link to="/cart">Go to cart</Link></Button>
      </div>
    );
  }
  return (
    <Button
      onClick={() => add({ product_id: p.id, name: p.name, price, unit: p.unit, image_url: p.image_url })}
      disabled={p.stock <= 0}
      className="w-full h-12 text-base"
    >
      <ShoppingBag className="h-5 w-5 mr-2" /> Add to cart
    </Button>
  );
}