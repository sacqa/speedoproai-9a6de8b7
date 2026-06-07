import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/store/cart";
import { useRecentlyViewed } from "@/store/recentlyViewed";
import { formatPKR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ImageOff, Minus, Plus, ShoppingBag, Truck, ShieldCheck, RotateCcw } from "lucide-react";
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
      <div className="flex items-center gap-3 px-4 lg:px-0 py-3 sticky top-0 z-20 bg-background/85 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-bold truncate flex-1">{p.name}</h1>
      </div>

      <div className="grid lg:grid-cols-2 lg:gap-10 lg:items-start px-4 lg:px-0">
        {/* Image */}
        <div className="relative bg-white rounded-3xl border border-border/60 overflow-hidden aspect-square flex items-center justify-center p-6 lg:p-10 lg:sticky lg:top-20">
          {off > 0 && (
            <span className="absolute top-3 left-3 text-xs font-bold bg-primary text-white rounded-full px-2.5 py-1 shadow z-10">
              -{off}% OFF
            </span>
          )}
          {p.image_url ? (
            <img
              src={p.image_url}
              alt={p.name}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="text-muted-foreground/50 flex flex-col items-center gap-2">
              <ImageOff className="h-10 w-10" />
              <span className="text-xs">No image</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="pt-5 lg:pt-2 space-y-4 min-w-0">
          {p.categories?.name && (
            <div className="text-[11px] uppercase tracking-wider text-primary font-bold">
              {p.categories.name}
            </div>
          )}
          <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight break-words">{p.name}</h2>
          {p.unit && <div className="text-sm text-muted-foreground">{p.unit}</div>}

          <div className="flex flex-wrap items-end gap-x-3 gap-y-1 pt-1">
            <span className="text-3xl lg:text-4xl font-extrabold text-foreground tabular-nums">{formatPKR(price)}</span>
            {off > 0 && (
              <>
                <span className="text-base text-muted-foreground line-through pb-1 tabular-nums">{formatPKR(compare)}</span>
                <span className="text-[11px] font-bold bg-success/15 text-success rounded-full px-2 py-0.5 mb-1.5">You save {formatPKR(compare - price)}</span>
              </>
            )}
          </div>

          <div className="text-xs">
            {p.stock > 0
              ? <span className="inline-flex items-center gap-1.5 text-success font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-success" />In stock</span>
              : <span className="text-destructive font-semibold">Out of stock</span>}
          </div>

          {p.description && (
            <div className="pt-2">
              <h3 className="text-sm font-bold mb-1.5">About this product</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed break-words">{p.description}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-3">
            {[
              { icon: Truck, label: "Fast delivery" },
              { icon: ShieldCheck, label: "Quality assured" },
              { icon: RotateCcw, label: "Easy returns" },
            ].map((f) => (
              <div key={f.label} className="flex flex-col items-center text-center gap-1 bg-accent/40 rounded-2xl p-3">
                <f.icon className="h-5 w-5 text-primary" />
                <span className="text-[11px] font-semibold leading-tight">{f.label}</span>
              </div>
            ))}
          </div>

          {/* Desktop CTA inline */}
          <div className="hidden lg:block pt-4">
            <CartCta p={p} price={price} inCart={inCart} add={add} setQty={setQty} />
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA — sits above the floating bottom-nav (which is bottom-3 + h-16) */}
      <div className="fixed bottom-24 lg:hidden left-3 right-3 px-3 py-2.5 bg-background/95 backdrop-blur border border-border rounded-2xl shadow-elevated z-30 safe-bottom">
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