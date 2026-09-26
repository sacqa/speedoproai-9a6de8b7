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

/**
 * Luxe Glassmorphism accents per service: gradient icon badge, tinted corner
 * glow and colored uppercase label. Falls back to the admin-stored gradient
 * (badge + glow) and the brand primary (label) when no accent matches.
 */
const ACCENTS: Record<string, { badge: string; label: string; glow: string }> = {
  speedmart: { badge: "from-violet-600 to-indigo-400", label: "text-violet-600", glow: "bg-violet-500/10" },
  food: { badge: "from-rose-500 to-orange-400", label: "text-rose-600", glow: "bg-rose-500/10" },
  pharmacy: { badge: "from-emerald-500 to-teal-400", label: "text-emerald-600", glow: "bg-emerald-500/10" },
  speedsend: { badge: "from-amber-500 to-yellow-400", label: "text-amber-600", glow: "bg-amber-500/10" },
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
 * Luxe Glassmorphism: white/60 glass tiles, gradient icon badge, corner glow.
 * Responsive: 4 cols mobile, 4 wider tiles on desktop.
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
        compact ? "gap-3" : "gap-3 sm:gap-4 lg:gap-5"
      }`}
    >
      {items.map((s) => {
        const Icon = ICONS[s.icon_name ?? ""] ?? ShoppingBasket;
        const accent = ACCENTS[s.service_key ?? ""];
        // Admin gradient colors tint the corner glow; icon badges always use a
        // vivid per-service gradient so white icons stay legible.
        const glowStyle = s.gradient_from
          ? { backgroundColor: s.gradient_from, opacity: 0.15 }
          : undefined;
        return (
          <Link
            key={s.id}
            to={s.link || "/"}
            className="group relative aspect-square lg:aspect-auto overflow-hidden rounded-2xl lg:rounded-[32px] bg-white/60 backdrop-blur-sm border border-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.05)] hover:shadow-xl hover:-translate-y-0.5 lg:hover:-translate-y-1 transition-all duration-300"
          >
            {/* Tinted corner glow */}
            <div
              aria-hidden
              className={`pointer-events-none absolute top-0 right-0 w-16 h-16 lg:w-24 lg:h-24 rounded-full -mr-6 -mt-6 lg:-mr-8 lg:-mt-8 ${
                s.gradient_from ? "" : accent?.glow ?? "bg-primary/10"
              }`}
              style={glowStyle}
            />
            {s.image_url && (
              <img
                src={s.image_url}
                alt=""
                loading="lazy"
                decoding="async"
                aria-hidden
                className="absolute -right-2 -bottom-2 h-12 w-12 lg:h-16 lg:w-16 object-contain opacity-90 group-hover:scale-110 transition-transform duration-500"
              />
            )}
            <div className="relative h-full flex flex-col justify-between p-2.5 lg:p-5">
              <div
                className={`h-8 w-8 lg:h-12 lg:w-12 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-tr from-primary to-primary-glow ${badgeStyle ? "" : accent?.badge ?? ""}`}
                style={badgeStyle}
              >
                <Icon className="h-4 w-4 lg:h-6 lg:w-6 text-white" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-[11px] lg:text-[15px] text-foreground tracking-tight leading-tight line-clamp-2">{s.title}</h3>
                {s.subtitle && (
                  <p className={`hidden lg:block text-[10px] lg:text-[11px] font-semibold uppercase tracking-wider mt-1 leading-tight line-clamp-1 ${accent?.label ?? "text-primary"}`}>
                    {s.subtitle}
                  </p>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
