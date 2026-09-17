import { ImageOff, Plus, Minus } from "lucide-react";
import { memo, useState } from "react";
import { formatPKR } from "@/lib/format";
import { useProductCardSettings } from "@/hooks/useBrandSettings";
import { thumb } from "@/lib/imageUrl";
import { useCart } from "@/store/cart";
import { toast } from "@/hooks/use-toast";

type Product = {
  id: string;
  name: string;
  price: number;
  unit?: string | null;
  image_url?: string | null;
  category_id?: string | null;
  categories?: { name?: string | null } | null;
};

/**
 * Simple product tile: image + name + price + add-to-cart.
 * The tile is NOT clickable — there is no product detail page.
 */
function ProductCardImpl({ p }: { p: Product }) {
  const settings = useProductCardSettings();
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const src = p.image_url ? (thumb(p.image_url, 320) || p.image_url) : null;
  const line = useCart((s) => s.items.find((i) => i.product_id === p.id));
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const qty = line?.quantity ?? 0;

  const handleAdd = () => {
    add({ product_id: p.id, name: p.name, price: Number(p.price), unit: p.unit ?? null, image_url: p.image_url ?? null });
    toast({ title: "Added to cart", description: p.name });
  };

  return (
    <div
      aria-label={p.name}
      className="group flex flex-col bg-white rounded-2xl sm:rounded-3xl p-2 sm:p-3 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out min-w-0"
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        {src && !imgError ? (
          <img
            src={src}
            alt={p.name}
            loading="lazy"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            onError={() => { setImgError(true); setImgLoaded(true); }}
            className={`pointer-events-none w-4/5 h-4/5 object-contain group-hover:scale-105 transition-all duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          />
        ) : (
          <div className="pointer-events-none flex flex-col items-center justify-center text-muted-foreground/50 gap-1">
            <ImageOff className="h-7 w-7" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">No image</span>
          </div>
        )}
      </div>

      <div className="pt-2.5 sm:pt-3 px-1 pb-1 flex flex-col gap-0.5 min-w-0">
        {settings.show_name && (
          <h3 className="text-[13px] sm:text-sm lg:text-[15px] font-semibold text-foreground line-clamp-2 leading-snug min-h-[2.25rem]">
            {p.name}
          </h3>
        )}
        {settings.show_price && (
          <span className="text-base sm:text-lg lg:text-xl font-bold text-primary tracking-tight leading-none tabular-nums truncate">
            {formatPKR(Number(p.price))}
            {settings.show_unit && p.unit && (
              <span className="ml-1.5 text-[11px] font-medium text-muted-foreground normal-case">/ {p.unit}</span>
            )}
          </span>
        )}
      </div>

      {settings.show_add_button && (
        <div className="mt-2 px-1 pb-1">
          {qty === 0 ? (
            <button
              type="button"
              onClick={handleAdd}
              className="w-full h-10 sm:h-11 rounded-xl bg-primary text-primary-foreground text-[12px] sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 transition-transform touch-manipulation"
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
              Add
            </button>
          ) : (
            <div className="w-full h-10 sm:h-11 rounded-xl bg-primary/10 flex items-center justify-between px-1 touch-manipulation">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQty(p.id, qty - 1)}
                className="h-9 w-9 rounded-lg bg-white shadow-sm flex items-center justify-center active:scale-90 transition-transform"
              >
                <Minus className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
              </button>
              <span className="text-sm font-bold tabular-nums text-primary">{qty}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQty(p.id, qty + 1)}
                className="h-9 w-9 rounded-lg bg-white shadow-sm flex items-center justify-center active:scale-90 transition-transform"
              >
                <Plus className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const ProductCard = memo(ProductCardImpl);