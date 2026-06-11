import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/store/cart";
import { useRecentlyViewed } from "@/store/recentlyViewed";
import { formatPKR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Minus, Plus, ShoppingBag, Truck, ShieldCheck, RotateCcw, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { ProductGallery } from "@/components/speedo/ProductGallery";
import { VariantSelector, type Variant } from "@/components/speedo/VariantSelector";
import { categoryColor } from "@/lib/categoryColor";

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const trackView = useRecentlyViewed((s) => s.push);
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const [liked, setLiked] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => { if (id) trackView(id); }, [id, trackView]);

  const { data: p, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name), product_images(id,image_url,sort_order,is_primary), product_variants(id,name,value,price_delta,stock,is_active,sort_order)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!p) return <div className="p-10 text-center text-muted-foreground">Product not found</div>;

  const variants: Variant[] = (p.product_variants ?? [])
    .slice()
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;
  const galleryImages = (() => {
    const arr = (p.product_images ?? []).slice().sort((a: any, b: any) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
    if (arr.length) return arr;
    return p.image_url ? [{ image_url: p.image_url }] : [];
  })();

  const basePrice = Number(p.price);
  const price = basePrice + Number(selectedVariant?.price_delta ?? 0);
  const compare = p.compare_price ? Number(p.compare_price) + Number(selectedVariant?.price_delta ?? 0) : 0;
  const off = compare > price ? Math.round((1 - price / compare) * 100) : 0;
  const stock = selectedVariant ? selectedVariant.stock : p.stock;
  const variantSuffix = selectedVariant ? `:${selectedVariant.id}` : "";
  const cartKey = `${p.id}${variantSuffix}`;
  const inCart = items.find((i) => i.product_id === cartKey);
  const cat = categoryColor(p.category_id ?? p.categories?.name ?? null);

  const handleAdd = () => {
    add({
      product_id: cartKey,
      name: selectedVariant ? `${p.name} — ${selectedVariant.value}` : p.name,
      price,
      unit: p.unit,
      image_url: galleryImages[0]?.image_url ?? p.image_url,
      variant_id: selectedVariant?.id ?? null,
      variant_label: selectedVariant ? `${selectedVariant.name}: ${selectedVariant.value}` : null,
    });
    setConfirm(true);
    setTimeout(() => setConfirm(false), 1400);
  };

  const ctx = { p, price, inCart, add: handleAdd, setQty, stock, cartKey };

  return (
    <div className="pb-36 lg:pb-10 max-w-6xl mx-auto relative">
      <div className="grid lg:grid-cols-2 lg:gap-10 lg:items-start">
        {/* Image gallery stage */}
        <div className="relative lg:sticky lg:top-4">
          {/* Floating header buttons over gallery */}
          <div className="absolute top-4 left-4 right-4 z-30 flex justify-between items-center pointer-events-none">
            <button
              onClick={() => nav(-1)}
              aria-label="Back"
              className="pointer-events-auto w-11 h-11 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-foreground border border-border/40 active:scale-90 transition-transform"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              aria-label="Save"
              onClick={() => setLiked((v) => !v)}
              className="pointer-events-auto w-11 h-11 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-foreground border border-border/40 active:scale-90 transition-transform"
            >
              <Heart className={`h-5 w-5 transition-colors ${liked ? "fill-primary text-primary animate-heart-pop" : ""}`} />
            </button>
          </div>
          <div className="px-3 lg:px-0">
            <ProductGallery
              images={galleryImages}
              alt={p.name}
              badge={off > 0 ? (
                <span className="text-xs font-bold bg-orange-50 text-orange-600 border border-orange-100 rounded-xl px-2.5 py-1.5 shadow-sm">
                  {off}% OFF
                </span>
              ) : undefined}
            />
          </div>
        </div>

        {/* Content body */}
        <div className="relative -mt-6 lg:mt-0 bg-background lg:bg-transparent rounded-t-[2.5rem] lg:rounded-none px-5 sm:px-6 lg:px-2 pt-8 lg:pt-4 pb-6 z-10 shadow-[0_-15px_40px_rgba(0,0,0,0.04)] lg:shadow-none space-y-6 min-w-0">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {p.categories?.name && (
                <span className={`text-[10px] font-bold tracking-[0.2em] uppercase rounded-md px-2 py-1 border ${cat.bg} ${cat.text} ${cat.border}`}>
                  {p.categories.name}
                </span>
              )}
              {stock > 0 ? (
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

          {variants.length > 0 && (
            <VariantSelector
              variants={variants}
              selectedId={selectedVariantId}
              onSelect={(v) => setSelectedVariantId(v.id)}
            />
          )}

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
            <CartCta {...ctx} />
          </div>
        </div>
      </div>

      {/* Animated cart confirmation */}
      {confirm && (
        <div className="fixed bottom-44 lg:bottom-24 left-1/2 z-50 pointer-events-none animate-added-pop">
          <div className="bg-foreground text-background rounded-full px-4 py-2 flex items-center gap-2 shadow-2xl">
            <Check className="h-4 w-4" strokeWidth={3} />
            <span className="text-sm font-semibold">Added to cart</span>
          </div>
        </div>
      )}

      {/* Mobile sticky CTA — above the floating bottom-nav */}
      <div className="fixed bottom-24 lg:hidden left-3 right-3 p-3 bg-background/95 backdrop-blur border border-border rounded-2xl shadow-elevated z-30 safe-bottom">
        <CartCta {...ctx} />
      </div>
    </div>
  );
}

function CartCta({ p, price, inCart, add, setQty, stock, cartKey }: any) {
  if (inCart) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-muted rounded-2xl p-1.5 shrink-0 border border-border">
          <button onClick={() => setQty(cartKey, inCart.quantity - 1)} className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background active:scale-90 transition-all" aria-label="Decrease"><Minus className="h-4 w-4" /></button>
          <span className="w-8 text-center font-bold text-foreground tabular-nums">{inCart.quantity}</span>
          <button onClick={() => setQty(cartKey, inCart.quantity + 1)} className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background active:scale-90 transition-all" aria-label="Increase"><Plus className="h-4 w-4" /></button>
        </div>
        <Button asChild className="flex-1 h-12 text-base rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-emerald-900/20"><Link to="/cart">Go to cart</Link></Button>
      </div>
    );
  }
  return (
    <Button
      onClick={add}
      disabled={stock <= 0}
      className="w-full h-12 text-base rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-emerald-900/20 disabled:opacity-50"
    >
      <ShoppingBag className="h-5 w-5 mr-2" /> {stock <= 0 ? "Sold out" : "Add to cart"}
    </Button>
  );
}