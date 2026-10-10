import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ShoppingBasket, UtensilsCrossed, Pill, Package,
  Truck, Sparkles, Heart, Coffee, Gift, Store, Wrench, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  ShoppingBasket, UtensilsCrossed, Pill, Package,
  Truck, Sparkles, Heart, Coffee, Gift, Store, Wrench,
};

const SERVICE_ACCENTS: Record<string, string> = {
  speedmart: "service-accent-speedmart",
  food: "service-accent-food",
  pharmacy: "service-accent-pharmacy",
  speedsend: "service-accent-speedsend",
  services: "service-accent-services",
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

/** Editable 4-up service banners (admin-managed via /admin/service-banners). */
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
      className={`grid w-full grid-cols-2 md:grid-cols-5 ${
        compact ? "gap-1.5 min-[375px]:gap-2" : "gap-1.5 min-[375px]:gap-2 md:gap-3"
      }`}
    >
      {items.map((s, i) => {
        const Icon = ICONS[s.icon_name ?? ""] ?? ShoppingBasket;
        const accentClass = SERVICE_ACCENTS[s.service_key ?? ""] ?? "service-accent-default";
        // Odd tile count: the last tile fills the phone-width row so no empty slot is left.
        const spanLast = i === items.length - 1 && items.length % 2 === 1 ? "col-span-2 md:col-span-1" : "";
        // Admin-selected gradient still tints the corner only; badges stay legible.
        const glowStyle = s.gradient_from
          ? { backgroundColor: s.gradient_from, opacity: 0.15 }
          : undefined;
        return (
          <Link
            key={s.id}
            to={s.link || "/"}
            className={`group relative flex min-w-0 items-center gap-2 lg:gap-3 overflow-hidden rounded-lg bg-card border border-border/70 shadow-card hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring p-2 md:p-3 min-h-[68px] ${accentClass} ${spanLast}`}
          >
            {/* Tinted corner glow */}
            <div
              aria-hidden
              className={`pointer-events-none absolute top-0 right-0 w-10 h-10 rounded-full -mr-3 -mt-3 ${s.gradient_from ? "" : "service-corner-glow"}`}
              style={glowStyle}
            />
            {s.image_url && (
              <img
                src={s.image_url}
                alt=""
                loading="lazy"
                decoding="async"
                aria-hidden
                className="absolute -right-1 -bottom-1 h-7 w-7 object-contain opacity-25 pointer-events-none"
              />
            )}
            <div className="relative flex min-w-0 items-center gap-2 lg:gap-3 w-full">
              <div className="flex shrink-0 h-9 w-9 lg:h-12 lg:w-12 items-center justify-center rounded-lg service-icon-badge transition-transform duration-300 group-hover:scale-105">
                <Icon className="h-4 w-4 lg:h-6 lg:w-6" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 text-left">
                <h3 className="font-display font-semibold text-[11px] md:text-sm text-foreground leading-tight break-words">{s.title}</h3>
                {s.subtitle && <p className="hidden md:block text-[10px] font-medium uppercase leading-tight mt-0.5 service-accent-label line-clamp-1">{s.subtitle}</p>}
              </div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
