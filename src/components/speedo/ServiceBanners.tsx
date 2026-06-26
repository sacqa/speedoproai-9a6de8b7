import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ShoppingBasket, UtensilsCrossed, Pill, Package,
  Truck, Sparkles, Heart, Coffee, Gift, Store, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  ShoppingBasket, UtensilsCrossed, Pill, Package,
  Truck, Sparkles, Heart, Coffee, Gift, Store,
};

type ServiceBanner = {
  id: string;
  service_key: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link: string;
  gradient_from: string | null;
  gradient_to: string | null;
  icon_name: string | null;
  sort_order: number;
  is_active: boolean;
};

/**
 * Editable 4-up service banners (admin-managed via /admin/service-banners).
 * Responsive: 2 cols on mobile, 4 cols on desktop.
 */
export function ServiceBanners({ compact = false }: { compact?: boolean }) {
  const q = useQuery({
    queryKey: ["service_banners"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("service_banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return (data ?? []) as ServiceBanner[];
    },
  });

  const items = q.data ?? [];
  if (items.length === 0) return null;

  return (
    <section
      className={`grid grid-cols-2 lg:grid-cols-4 ${
        compact ? "gap-3" : "gap-3 sm:gap-4 lg:gap-5"
      }`}
    >
      {items.map((s) => {
        const Icon = ICONS[s.icon_name ?? ""] ?? ShoppingBasket;
        return (
          <Link
            key={s.id}
            to={s.link || "/"}
            className="group relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-card hover:-translate-y-0.5 hover:shadow-elevated transition-all duration-300"
            style={{
              backgroundImage: s.gradient_from && s.gradient_to
                ? `linear-gradient(135deg, ${s.gradient_from}, ${s.gradient_to})`
                : undefined,
            }}
          >
            {s.image_url && (
              <img
                src={s.image_url}
                alt=""
                loading="lazy"
                decoding="async"
                aria-hidden
                className="absolute -right-4 -bottom-4 h-24 w-24 object-contain opacity-90 group-hover:scale-110 transition-transform duration-500"
              />
            )}
            <div className={`relative ${compact ? "p-3" : "p-4 lg:p-5"}`}>
              <div className="h-10 w-10 lg:h-11 lg:w-11 rounded-2xl bg-white/80 ring-1 ring-white shadow-sm backdrop-blur flex items-center justify-center mb-2.5">
                <Icon className="h-5 w-5 text-foreground" strokeWidth={2.3} />
              </div>
              <h3 className="font-extrabold text-sm lg:text-base tracking-tight leading-tight">{s.title}</h3>
              {s.subtitle && (
                <p className="text-[11px] lg:text-xs text-foreground/70 mt-0.5 leading-tight line-clamp-1">{s.subtitle}</p>
              )}
            </div>
          </Link>
        );
      })}
    </section>
  );
}