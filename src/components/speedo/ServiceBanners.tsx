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
      className={`grid grid-cols-4 ${
        compact ? "gap-3" : "gap-3 sm:gap-4 lg:gap-4"
      }`}
    >
      {items.map((s) => {
        const Icon = ICONS[s.icon_name ?? ""] ?? ShoppingBasket;
        return (
          <Link
            key={s.id}
            to={s.link || "/"}
            className="group relative aspect-square lg:aspect-auto overflow-hidden rounded-2xl lg:rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-card hover:-translate-y-0.5 hover:shadow-elevated transition-all duration-300"
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
                className="absolute -right-3 -bottom-3 h-16 w-16 lg:h-20 lg:w-20 object-contain opacity-90 group-hover:scale-110 transition-transform duration-500"
              />
            )}
            <div className={`relative h-full flex flex-col items-center justify-center text-center lg:items-start lg:text-left ${compact ? "p-2 lg:p-3" : "p-2 lg:p-3.5"}`}>
              <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-xl lg:rounded-2xl bg-white/80 ring-1 ring-white shadow-sm backdrop-blur flex items-center justify-center mb-1.5 lg:mb-2">
                <Icon className="h-4 w-4 lg:h-5 lg:w-5 text-foreground" strokeWidth={2.3} />
              </div>
              <h3 className="font-bold text-[11px] lg:text-[15px] tracking-tight leading-tight line-clamp-2">{s.title}</h3>
              {s.subtitle && (
                <p className="hidden lg:block text-[11px] lg:text-xs text-foreground/70 mt-0.5 leading-tight line-clamp-1">{s.subtitle}</p>
              )}
            </div>
          </Link>
        );
      })}
    </section>
  );
}