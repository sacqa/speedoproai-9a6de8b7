import { Plus, Minus, ShoppingCart } from "lucide-react";
import { useCart } from "@/store/cart";
import { formatPKR } from "@/lib/format";

type Product = {
  id: string;
  name: string;
  price: number;
  unit?: string | null;
  image_url?: string | null;
};

export function ProductCard({ p }: { p: Product }) {
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const inCart = items.find((i) => i.product_id === p.id);

  return (
    <div className="relative bg-card rounded-2xl shadow-card overflow-hidden flex flex-col group hover:shadow-elevated transition-all hover:-translate-y-0.5 border border-border/60">
      {/* Image area with soft tinted background */}
      <div className="relative aspect-square bg-accent-soft/40 flex items-center justify-center overflow-hidden p-3 sm:p-4">
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-muted rounded-lg" />
        )}
        {p.unit && (
          <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wide bg-card/90 backdrop-blur text-muted-foreground rounded-full px-2 py-0.5 shadow-sm">
            {p.unit}
          </span>
        )}
        {inCart && (
          <span className="absolute top-2 right-2 text-[10px] font-bold bg-accent text-accent-foreground rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
            {inCart.quantity}
          </span>
        )}
      </div>
      {/* Info */}
      <div className="p-2.5 sm:p-3 flex-1 flex flex-col gap-1.5">
        <h3 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 leading-snug min-h-[2.25rem]">
          {p.name}
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div className="flex flex-col leading-tight">
            <span className="text-base sm:text-lg font-extrabold text-primary">{formatPKR(Number(p.price))}</span>
          </div>
          {inCart ? (
            <div className="flex items-center gap-1 bg-primary-tint rounded-pill p-0.5">
              <button
                onClick={() => setQty(p.id, inCart.quantity - 1)}
                className="h-7 w-7 rounded-full bg-card text-primary flex items-center justify-center shadow-sm"
                aria-label="Decrease"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-sm font-bold text-primary min-w-[1ch] text-center px-1">{inCart.quantity}</span>
              <button
                onClick={() => setQty(p.id, inCart.quantity + 1)}
                className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                aria-label="Increase"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() =>
                add({
                  product_id: p.id,
                  name: p.name,
                  price: Number(p.price),
                  unit: p.unit,
                  image_url: p.image_url,
                })
              }
              aria-label="Add to cart"
              className="flex items-center gap-1 h-8 px-2.5 rounded-pill bg-primary text-primary-foreground text-xs font-bold shadow-card hover:bg-primary-dark transition-colors active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" /> ADD
            </button>
          )}
        </div>
      </div>
    </div>
  );
}