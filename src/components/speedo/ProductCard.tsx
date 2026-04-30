import { Plus, Minus, Heart } from "lucide-react";
import { useCart } from "@/store/cart";
import { formatPKR } from "@/lib/format";
import { useState } from "react";

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
  const [liked, setLiked] = useState(false);

  return (
    <div className="relative flex flex-col group">
      {/* Image card: white, large rounded corners, soft border */}
      <div className="relative aspect-square bg-white rounded-3xl border border-border/60 overflow-hidden flex items-center justify-center p-4 sm:p-5">
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-muted rounded-xl" />
        )}

        {/* Heart (wishlist) - top right */}
        <button
          onClick={(e) => { e.stopPropagation(); setLiked((v) => !v); }}
          aria-label="Save to favorites"
          className="absolute top-2.5 right-2.5 h-9 w-9 flex items-center justify-center text-muted-foreground/60 hover:text-primary transition-colors"
        >
          <Heart className={`h-6 w-6 ${liked ? "fill-primary text-primary" : "fill-muted-foreground/25"}`} />
        </button>

        {p.unit && (
          <span className="absolute top-2.5 left-2.5 text-[9px] font-bold uppercase tracking-wide bg-card/90 backdrop-blur text-muted-foreground rounded-full px-2 py-0.5 shadow-sm">
            {p.unit}
          </span>
        )}

        {/* Floating ADD button (dark green squircle) bottom-right of image */}
        {inCart ? (
          <div className="absolute -bottom-3 right-3 flex items-center gap-1 bg-accent text-accent-foreground rounded-2xl p-1 shadow-elevated">
            <button
              onClick={() => setQty(p.id, inCart.quantity - 1)}
              className="h-8 w-8 rounded-xl bg-white/15 flex items-center justify-center"
              aria-label="Decrease"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm font-extrabold min-w-[1.25ch] text-center px-1">{inCart.quantity}</span>
            <button
              onClick={() => setQty(p.id, inCart.quantity + 1)}
              className="h-8 w-8 rounded-xl bg-white/15 flex items-center justify-center"
              aria-label="Increase"
            >
              <Plus className="h-4 w-4" />
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
            className="absolute bottom-3 right-3 h-12 w-12 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center shadow-elevated hover:bg-accent/90 active:scale-95 transition-all"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Info area below image */}
      <div className="pt-3 px-1 flex flex-col gap-1">
        <span className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight leading-none">
          {formatPKR(Number(p.price))}
        </span>
        <h3 className="text-sm sm:text-[15px] font-normal text-muted-foreground line-clamp-2 leading-snug min-h-[2.5rem]">
          {p.name}
        </h3>
      </div>
    </div>
  );
}