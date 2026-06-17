import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/speedo/ProductCard";
import { Sparkles } from "lucide-react";

type Mode = "cart" | "explore";

export function SmartSuggestions({
  mode,
  cartItems = [],
  recent = [],
  title,
}: {
  mode: Mode;
  cartItems?: string[];
  recent?: string[];
  title?: string;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const hasInput = (mode === "cart" ? cartItems.length : recent.length) > 0;
    if (!hasInput) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    async function run() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.functions.invoke("ai-suggest", {
        body: { mode, cartItems, recent },
      });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setItems([]);
      } else {
        setItems(data?.suggestions ?? []);
      }
      setLoading(false);
    }
    // Debounce so cart edits don't spam the gateway.
    const t = setTimeout(run, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, cartItems.join(","), recent.join(",")]);

  if (!loading && items.length === 0 && !error) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-xl btn-glossy flex items-center justify-center">
          <Sparkles className="h-4 w-4" />
        </div>
        <h2 className="font-bold text-base">{title ?? (mode === "cart" ? "Often bought together" : "Recommended for you")}</h2>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">AI</span>
      </div>
      {loading ? (
        <div className="grid-products">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 glass-card animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-xs text-muted-foreground">Couldn't load suggestions right now.</p>
      ) : (
        <div className="grid-products">
          {items.map((p) => (
            <ProductCard key={p.id} p={p as any} />
          ))}
        </div>
      )}
    </section>
  );
}