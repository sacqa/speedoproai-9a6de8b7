import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Clock, Star, Minus, Plus, UtensilsCrossed, ShoppingBag } from "lucide-react";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { formatPKR } from "@/lib/format";
import { useFoodCart } from "@/store/foodCart";

export default function FoodVendor() {
  const { vendorId } = useParams();
  const nav = useNavigate();
  const cart = useFoodCart();

  const vendor = useQuery({
    queryKey: ["food-vendor", vendorId],
    enabled: !!vendorId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("food_vendors").select("*").eq("id", vendorId!).single();
      if (error) throw error;
      return data;
    },
  });

  const menu = useQuery({
    queryKey: ["food-menu", vendorId],
    enabled: !!vendorId,
    staleTime: 60_000,
    queryFn: async () => {
      const [{ data: cats }, { data: items }] = await Promise.all([
        supabase.from("food_menu_categories").select("*").eq("vendor_id", vendorId!).order("sort_order"),
        supabase.from("food_menu_items").select("*").eq("vendor_id", vendorId!).eq("is_available", true).order("sort_order"),
      ]);
      return { cats: cats ?? [], items: items ?? [] };
    },
  });

  const grouped = useMemo(() => {
    const cats = menu.data?.cats ?? [];
    const items = menu.data?.items ?? [];
    const map = new Map<string | null, any[]>();
    items.forEach((i: any) => {
      const k = i.category_id ?? null;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(i);
    });
    const groups: { name: string; items: any[] }[] = cats
      .map((c: any) => ({ name: c.name, items: map.get(c.id) ?? [] }))
      .filter((g: any) => g.items.length > 0);
    if (map.has(null)) groups.push({ name: "Other", items: map.get(null)! });
    return groups;
  }, [menu.data]);

  if (vendor.isLoading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!vendor.data) return <div className="p-10 text-center text-muted-foreground">Restaurant not found.</div>;

  const v = vendor.data;
  const qtyOf = (id: string) => cart.items.find((i) => i.item_id === id)?.quantity ?? 0;

  return (
    <div className="pb-32">
      <Seo
        title={`${v.name} — Order online | Speedo`}
        description={v.description ?? `${v.name} (${v.cuisine ?? "Various"}) delivered fast in Dipalpur. Browse menu and order via Speedo.`}
        path={`/food/${v.id}`}
        image={v.cover_url ?? undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Restaurant",
          name: v.name,
          image: v.cover_url || v.logo_url || undefined,
          servesCuisine: v.cuisine,
          telephone: v.phone,
          address: v.address,
          aggregateRating: { "@type": "AggregateRating", ratingValue: Number(v.rating), reviewCount: 25 },
        }}
      />

      <div className="relative h-40 sm:h-56 bg-muted">
        {v.cover_url ? (
          <img src={v.cover_url} alt={v.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-tint to-accent-soft" />
        )}
        <button onClick={() => nav(-1)} aria-label="Back" className="absolute top-3 left-3 h-10 w-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow">
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 lg:px-0 -mt-6 relative">
        <div className="bg-card rounded-2xl shadow-card p-4 flex items-center gap-3">
          {v.logo_url && <img src={v.logo_url} alt="" className="h-14 w-14 rounded-xl object-cover bg-muted shrink-0" />}
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-lg leading-tight truncate">{v.name}</h1>
            <div className="text-xs text-muted-foreground truncate">{v.cuisine ?? "Various"}</div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
              <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" />{Number(v.rating).toFixed(1)}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{v.delivery_time_min} min</span>
              <span className={v.is_open ? "text-success font-semibold" : "text-destructive font-semibold"}>{v.is_open ? "Open" : "Closed"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-0 space-y-6 pt-5">
        {menu.isLoading && <p className="text-center text-muted-foreground py-8">Loading menu…</p>}
        {!menu.isLoading && grouped.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <UtensilsCrossed className="h-10 w-10 mx-auto mb-2 opacity-40" />
            Menu coming soon.
          </div>
        )}
        {grouped.map((g) => (
          <section key={g.name}>
            <h2 className="font-extrabold text-base mb-2">{g.name}</h2>
            <div className="space-y-2">
              {g.items.map((it: any) => {
                const q = qtyOf(it.id);
                return (
                  <div key={it.id} className="bg-card rounded-2xl shadow-card p-3 flex gap-3 items-center">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm leading-tight">{it.name}</div>
                      {it.description && <div className="text-[11px] text-muted-foreground line-clamp-2">{it.description}</div>}
                      <div className="text-primary font-extrabold mt-1">{formatPKR(Number(it.price))}</div>
                    </div>
                    <div className="relative shrink-0">
                      {it.image_url ? (
                        <img src={it.image_url} alt={it.name} loading="lazy" decoding="async" className="h-20 w-20 rounded-xl object-cover bg-muted" />
                      ) : (
                        <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center"><UtensilsCrossed className="h-6 w-6 text-muted-foreground/40" /></div>
                      )}
                      {q === 0 ? (
                        <button
                          onClick={() => cart.add(v.id, v.name, { item_id: it.id, name: it.name, price: Number(it.price), image_url: it.image_url })}
                          className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold rounded-full px-4 py-1.5 shadow-elevated"
                        >
                          ADD
                        </button>
                      ) : (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground rounded-full flex items-center gap-1 px-1 shadow-elevated">
                          <button onClick={() => cart.setQty(it.id, q - 1)} className="h-7 w-7 flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                          <span className="text-xs font-bold w-4 text-center">{q}</span>
                          <button onClick={() => cart.setQty(it.id, q + 1)} className="h-7 w-7 flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {cart.items.length > 0 && cart.vendorId === v.id && (
        <Link
          to="/food/checkout"
          className="fixed left-1/2 -translate-x-1/2 bottom-24 lg:bottom-6 z-40 w-[92%] max-w-md flex items-center justify-between gap-3 bg-accent text-accent-foreground rounded-2xl px-4 py-3 shadow-elevated"
        >
          <div className="flex items-center gap-2 text-sm font-bold">
            <ShoppingBag className="h-5 w-5" />
            {cart.totalQty()} item{cart.totalQty() > 1 ? "s" : ""} · {formatPKR(cart.subtotal())}
          </div>
          <div className="text-sm font-bold">Checkout →</div>
        </Link>
      )}
    </div>
  );
}