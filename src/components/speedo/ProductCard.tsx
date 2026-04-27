import { Plus, Minus } from "lucide-react";
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
    <div className="bg-card rounded-xl shadow-card overflow-hidden flex flex-col group hover:shadow-elevated transition-shadow">
      <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden p-3">
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full bg-muted rounded-lg" />
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1">
        {p.unit && <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{p.unit}</span>}
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight min-h-[2.5rem]">{p.name}</h3>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-base font-bold text-primary">{formatPKR(Number(p.price))}</span>
          {inCart ? (
            <div className="flex items-center gap-1.5 bg-primary-tint rounded-pill p-0.5">
              <button
                onClick={() => setQty(p.id, inCart.quantity - 1)}
                className="h-7 w-7 rounded-full bg-card text-primary flex items-center justify-center"
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
              className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-card hover:bg-primary-dark transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}