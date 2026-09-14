import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, Clock, UtensilsCrossed } from "lucide-react";
import { Seo } from "@/components/seo/Seo";
import { formatPKR } from "@/lib/format";

export default function Food() {
  const vendors = useQuery({
    queryKey: ["food-vendors"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_vendors")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="p-4 lg:p-0 space-y-5">
      <Seo
        title="Food Delivery — Bakeries & Cafés in Dipalpur | Speedo"
        description="Order food from your favourite bakeries, cafés and home-kitchens in Dipalpur. Fast delivery via Speedo."
        path="/food"
      />
      <header className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-primary-tint flex items-center justify-center">
          <UtensilsCrossed className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold leading-none">Food</h1>
          <p className="text-xs text-muted-foreground mt-1">Bakeries, cafés & vendors near you</p>
        </div>
      </header>

      {vendors.isLoading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl h-44 animate-pulse" />
          ))}
        </div>
      ) : (vendors.data ?? []).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">No bakeries yet</p>
          <p className="text-sm">Vendors will appear here once the team onboards them.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {(vendors.data ?? []).map((v: any) => (
            <Link
              key={v.id}
              to={`/food/${v.id}`}
              className="bg-card rounded-2xl shadow-card overflow-hidden hover:shadow-elevated transition-shadow"
            >
              <div className="relative aspect-[16/9] bg-muted">
                {v.cover_url ? (
                  <img
                    src={v.cover_url}
                    alt={v.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    onError={(e) => ((e.currentTarget.style.display = "none"))}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-tint to-accent-soft flex items-center justify-center">
                    <UtensilsCrossed className="h-10 w-10 text-primary/40" />
                  </div>
                )}
                <span
                  className={`absolute top-2 left-2 text-[10px] font-bold uppercase rounded-full px-2 py-0.5 ${
                    v.is_open ? "bg-success text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {v.is_open ? "Open" : "Closed"}
                </span>
              </div>
              <div className="p-3 space-y-1">
                <div className="flex items-start gap-2">
                  {v.logo_url && (
                    <img src={v.logo_url} alt="" className="h-9 w-9 rounded-xl object-cover bg-muted shrink-0" loading="lazy" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{v.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{v.cuisine ?? "Various"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                  <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" />{Number(v.rating).toFixed(1)}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{v.delivery_time_min} min</span>
                  {Number(v.min_order) > 0 && <span>Min {formatPKR(Number(v.min_order))}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}