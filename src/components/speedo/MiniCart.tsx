import { useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, ShoppingCart, Trash2, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/store/cart";
import { formatPKR } from "@/lib/format";
import { thumb } from "@/lib/imageUrl";

/**
 * Persistent mini-cart: a floating pill that is present on every customer
 * screen and opens a drawer with the full basket, quantity controls and a
 * shortcut to checkout. Works fully offline (cart lives in localStorage).
 */
export function MiniCart({ bump }: { bump?: boolean }) {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const [open, setOpen] = useState(false);

  const qty = items.reduce((a, b) => a + b.quantity, 0);
  const sub = items.reduce((a, b) => a + b.quantity * Number(b.price), 0);
  if (qty === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open mini cart"
        className={`fixed left-1/2 -translate-x-1/2 bottom-28 lg:bottom-6 z-50 w-[92%] max-w-md flex items-center justify-between gap-3 btn-glossy px-4 py-3 hover:scale-[1.02] transition-transform ${
          bump ? "animate-cart-bump" : ""
        }`}
      >
        <span className="flex items-center gap-3">
          <span className="relative h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
              {qty}
            </span>
          </span>
          <span className="leading-tight text-left">
            <span className="block text-[11px] opacity-90">
              {qty} item{qty > 1 ? "s" : ""} · {formatPKR(sub)}
            </span>
            <span className="block text-sm font-bold">View basket</span>
          </span>
        </span>
        <span className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center font-bold">→</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
            <SheetTitle className="text-xl font-serif font-semibold tracking-tight">Your basket</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {items.map((i) => (
              <div key={`${i.product_id}-${i.variant_id ?? ""}`} className="flex items-center gap-3 rounded-2xl border border-border/60 p-2.5">
                <div className="h-14 w-14 shrink-0 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
                  <img
                    src={(i.image_url && (thumb(i.image_url, 160) || i.image_url)) || "/placeholder.svg"}
                    alt={i.name}
                    loading="lazy"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                    className="h-full w-full object-contain p-1"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold line-clamp-2 leading-snug">{i.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                    {formatPKR(i.price)} {i.unit ? `· ${i.unit}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 border border-border rounded-full h-8 px-1 shrink-0">
                  <button onClick={() => setQty(i.product_id, i.quantity - 1)} aria-label="Decrease" className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-xs font-bold tabular-nums min-w-[1.75ch] text-center">{i.quantity}</span>
                  <button onClick={() => setQty(i.product_id, i.quantity + 1)} aria-label="Increase" className="h-6 w-6 rounded-full flex items-center justify-center text-primary hover:bg-primary/10">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <button onClick={() => remove(i.product_id)} aria-label="Remove" className="h-8 w-8 shrink-0 rounded-full text-destructive/70 hover:text-destructive hover:bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-border p-4 space-y-3 safe-bottom">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-xl font-bold text-primary tabular-nums">{formatPKR(sub)}</span>
            </div>
            <Link to="/cart" onClick={() => setOpen(false)} className="block">
              <Button className="w-full h-12 rounded-full text-base font-bold">
                Checkout <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}