import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/store/cart";
import { formatPKR } from "@/lib/format";
import { ChevronRight, ImageOff, Minus, Plus, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { VariantSelector, type Variant } from "@/components/speedo/VariantSelector";
import { thumb } from "@/lib/imageUrl";

type Product = {
  id: string;
  name: string;
  price: number;
  unit?: string | null;
  description?: string | null;
  image_url?: string | null;
  category_id?: string | null;
  categories?: { id?: string; name?: string | null; slug?: string | null } | null;
};

export function ProductSheet({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const [variantId, setVariantId] = useState<string | null>(null);

  const variants = useQuery({
    queryKey: ["product-variants", product?.id],
    enabled: !!product?.id && open,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_variants")
        .select("id,name,value,price_delta,stock,is_active")
        .eq("product_id", product!.id)
        .order("sort_order");
      return (data ?? []) as Variant[];
    },
  });

  useEffect(() => {
    if (!open) return;
    setVariantId(null);
  }, [open, product?.id]);

  useEffect(() => {
    const list = variants.data ?? [];
    if (!variantId && list.length) {
      const inStock = list.find((v) => v.is_active && v.stock > 0);
      if (inStock) setVariantId(inStock.id);
    }
  }, [variants.data, variantId]);

  const selectedVariant = useMemo(
    () => (variants.data ?? []).find((v) => v.id === variantId) ?? null,
    [variants.data, variantId]
  );

  if (!product) return null;

  const price = Number(product.price) + Number(selectedVariant?.price_delta ?? 0);
  const variantLabel = selectedVariant ? `${selectedVariant.name}: ${selectedVariant.value}` : null;
  const lineKey = product.id;
  const inCart = items.find(
    (i) => i.product_id === lineKey && (i.variant_id ?? null) === (selectedVariant?.id ?? null)
  );
  const outOfStock = (variants.data ?? []).length > 0 && (!selectedVariant || selectedVariant.stock <= 0);

  const doAdd = () => {
    add({
      product_id: product.id,
      name: product.name,
      price,
      unit: selectedVariant?.value ?? product.unit ?? null,
      image_url: product.image_url ?? null,
      variant_id: selectedVariant?.id ?? null,
      variant_label: variantLabel,
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] bg-background">
        <DrawerTitle className="sr-only">{product.name}</DrawerTitle>
        <DrawerDescription className="sr-only">Product details</DrawerDescription>

        <div className="overflow-y-auto px-4 pb-6 pt-2 max-w-2xl mx-auto w-full">
          {/* Hero image */}
          <div className="relative aspect-square rounded-3xl bg-[#f3e8f0] overflow-hidden flex items-center justify-center">
            {product.image_url ? (
              <img
                src={thumb(product.image_url, 640) || product.image_url}
                alt={product.name}
                loading="eager"
                decoding="async"
                className="w-4/5 h-4/5 object-contain"
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = "hidden")}
              />
            ) : (
              <ImageOff className="h-12 w-12 text-muted-foreground/40" />
            )}
            <div className="absolute bottom-3 right-4 text-xs font-semibold text-foreground/70 flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-success text-success" />
              <span className="text-success font-bold">4.5</span>
            </div>
          </div>

          {/* Explore link */}
          {product.categories?.slug && (
            <Link
              to={`/speedmart?cat=${product.categories.slug}`}
              onClick={() => onOpenChange(false)}
              className="mt-4 flex items-center justify-between bg-white rounded-2xl px-4 py-2.5 border border-border/60 shadow-sm text-primary font-bold text-sm"
            >
              <span>Explore all {product.categories.name} items</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}

          {/* Title */}
          <h2 className="mt-4 text-xl sm:text-2xl font-extrabold text-foreground leading-tight">{product.name}</h2>
          {product.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{product.description}</p>
          )}

          {/* Variants */}
          {variants.isLoading ? (
            <div className="mt-5 h-20 rounded-2xl bg-muted animate-pulse" />
          ) : (variants.data ?? []).length > 0 ? (
            <div className="mt-5">
              <VariantSelector variants={variants.data ?? []} selectedId={variantId} onSelect={(v) => setVariantId(v.id)} />
            </div>
          ) : null}
        </div>

        {/* Sticky footer */}
        <div className="border-t border-border bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-3 max-w-2xl mx-auto w-full">
          <div className="flex-1 min-w-0">
            {selectedVariant?.value && (
              <div className="text-[11px] font-semibold text-muted-foreground">{selectedVariant.value}</div>
            )}
            <div className="text-lg font-extrabold text-foreground tabular-nums">{formatPKR(price)}</div>
          </div>
          {inCart ? (
            <div className="flex items-center gap-1 bg-primary text-primary-foreground rounded-2xl p-1 shadow-md">
              <button onClick={() => setQty(inCart.product_id, inCart.quantity - 1)} aria-label="Decrease" className="h-10 w-10 flex items-center justify-center rounded-xl active:scale-95 transition">
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-base font-extrabold min-w-[1.5ch] text-center tabular-nums">{inCart.quantity}</span>
              <button onClick={() => setQty(inCart.product_id, inCart.quantity + 1)} aria-label="Increase" className="h-10 w-10 flex items-center justify-center rounded-xl active:scale-95 transition">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Button onClick={doAdd} disabled={outOfStock} className="h-12 rounded-2xl px-8 text-base font-extrabold">
              {outOfStock ? "Sold out" : "ADD"}
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}