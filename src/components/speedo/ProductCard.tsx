import { Plus, Minus, Heart, ImageOff, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/store/cart";
import { useRecentlyViewed } from "@/store/recentlyViewed";
import { formatPKR } from "@/lib/format";
import { useRef, useState } from "react";
import { categoryColor } from "@/lib/categoryColor";
import { Skeleton } from "@/components/ui/skeleton";
import { useProductCardSettings } from "@/hooks/useBrandSettings";
import { thumb } from "@/lib/imageUrl";

type Product = {
  id: string;
  name: string;
  price: number;
  unit?: string | null;
  image_url?: string | null;
  category_id?: string | null;
  categories?: { name?: string | null } | null;
};

export function ProductCard({ p }: { p: Product }) {
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const trackView = useRecentlyViewed((s) => s.push);
  const settings = useProductCardSettings();
  const inCart = items.find((i) => i.product_id === p.id);
  const [liked, setLiked] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [bump, setBump] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const cat = categoryColor(p.category_id ?? p.categories?.name ?? null);

  const doAdd = () => {
    trackView(p.id);
    setBump(true);
    setConfirm(true);
    setTimeout(() => setBump(false), 500);
    setTimeout(() => setConfirm(false), 1200);
    add({
      product_id: p.id,
      name: p.name,
      price: Number(p.price),
      unit: p.unit,
      image_url: p.image_url,
    });
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null || touchStartY.current == null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dy > 14) { touchStartX.current = null; setSwipeX(0); return; }
    if (dx < 0) setSwipeX(Math.max(dx, -90));
  };
  const onTouchEnd = () => {
    if (swipeX <= -60 && !inCart) doAdd();
    setSwipeX(0);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        transform: swipeX ? `translateX(${swipeX}px)` : undefined,
        // Keep vertical scroll responsive while we listen for horizontal swipe
        touchAction: "pan-y",
      }}
      className="group relative flex flex-col bg-white rounded-2xl sm:rounded-3xl p-2 sm:p-3 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] transition-all duration-300 ease-out min-w-0"
    >
      {/* Swipe-reveal hint */}
      {swipeX < -10 && !inCart && (
        <div className="absolute inset-y-0 right-0 w-20 -z-10 flex items-center justify-center bg-accent text-accent-foreground rounded-r-3xl">
          <Plus className="h-6 w-6" strokeWidth={3} />
        </div>
      )}

      {/* Added confirmation */}
      {confirm && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-added-pop">
          <div className="bg-foreground text-background rounded-full px-2.5 py-1 flex items-center gap-1 shadow-lg text-[10px] font-bold">
            <Check className="h-3 w-3" strokeWidth={3} /> Added
          </div>
        </div>
      )}

      {/* Image stage */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <Link to={`/product/${p.id}`} aria-label={p.name} className="absolute inset-0 z-0" onClick={() => trackView(p.id)} />

        {settings.show_category && p.categories?.name ? (
          <span className={`absolute z-10 top-2 left-2 text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border shadow-sm flex items-center gap-1 ${cat.bg} ${cat.text} ${cat.border}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cat.dot}`} />
            {p.categories.name}
          </span>
        ) : settings.show_unit && p.unit ? (
          <span className="absolute z-10 top-2 left-2 text-[9px] font-bold uppercase tracking-wider bg-white/80 backdrop-blur-md text-muted-foreground rounded-full px-2 py-0.5 border border-border/40 shadow-sm">
            {p.unit}
          </span>
        ) : null}

        {settings.show_favorite && <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setLiked((v) => !v); }}
          aria-label="Save to favorites"
          className="absolute z-10 top-2 right-2 h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center bg-white/80 backdrop-blur-md rounded-full border border-border/40 text-muted-foreground/70 hover:text-primary shadow-sm transition-colors active:scale-90"
        >
          <Heart className={`h-4 w-4 sm:h-[18px] sm:w-[18px] transition-transform ${liked ? "fill-primary text-primary animate-heart-pop" : ""}`} />
        </button>}

        {p.image_url && !imgError ? (
          <>
            {!imgLoaded && <Skeleton className="absolute inset-3 rounded-xl" />}
            <img
              src={thumb(p.image_url, 320) || p.image_url}
              alt={p.name}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              onError={() => { setImgError(true); setImgLoaded(true); }}
              className={`relative pointer-events-none w-4/5 h-4/5 object-contain group-hover:scale-110 group-active:scale-95 transition-all duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            />
          </>
        ) : (
          <div className="relative pointer-events-none flex flex-col items-center justify-center text-muted-foreground/50 gap-1">
            <ImageOff className="h-7 w-7" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">No image</span>
          </div>
        )}

        {/* Floating ADD / qty stepper (uniform footprint so cards align) */}
        {!settings.show_add_button ? null : inCart ? (
          <div className="absolute z-10 bottom-2 right-2 flex items-center gap-0 bg-accent text-accent-foreground rounded-2xl p-0.5 shadow-lg shadow-emerald-900/30">
            <button
              onClick={(e) => { e.preventDefault(); setQty(p.id, inCart.quantity - 1); }}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
              aria-label="Decrease"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm font-extrabold tabular-nums min-w-[1.75ch] text-center px-1">{inCart.quantity}</span>
            <button
              onClick={(e) => { e.preventDefault(); setQty(p.id, inCart.quantity + 1); }}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
              aria-label="Increase"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.preventDefault();
              doAdd();
            }}
            aria-label="Add to cart"
            className={`absolute z-10 bottom-2 right-2 h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center shadow-lg shadow-emerald-900/30 hover:scale-110 active:scale-95 transition-all ${bump ? "animate-cart-bump" : ""}`}
          >
            <Plus className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Info area */}
      <Link to={`/product/${p.id}`} onClick={() => trackView(p.id)} className="pt-2.5 sm:pt-3 px-1 pb-1 flex flex-col gap-0.5 min-w-0">
        {settings.show_unit && p.unit && p.categories?.name && (
          <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wide">{p.unit}</span>
        )}
        {settings.show_price && (
          <span className="text-base sm:text-lg lg:text-xl font-bold text-foreground tracking-tight leading-none tabular-nums truncate">
            {formatPKR(Number(p.price))}
          </span>
        )}
        {settings.show_name && (
          <h3 className="text-[13px] sm:text-sm lg:text-[15px] font-medium text-muted-foreground line-clamp-2 leading-snug min-h-[2.25rem]">
            {p.name}
          </h3>
        )}
      </Link>
    </div>
  );
}