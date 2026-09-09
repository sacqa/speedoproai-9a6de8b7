import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DeliveryZone = {
  id: string;
  area: string;
  slug: string;
  delivery_fee: number;
  min_order: number;
  free_delivery_threshold: number | null;
  is_active: boolean;
  sort_order: number;
};

export const slugifyArea = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** All active delivery zones, cached — safe to call from any checkout screen. */
export function useDeliveryZones() {
  return useQuery({
    queryKey: ["delivery-zones"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<DeliveryZone[]> => {
      const { data, error } = await supabase
        .from("delivery_zones")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map((z: any) => ({
        ...z,
        delivery_fee: Number(z.delivery_fee),
        min_order: Number(z.min_order),
        free_delivery_threshold: z.free_delivery_threshold == null ? null : Number(z.free_delivery_threshold),
      }));
    },
  });
}

export function findZone(zones: DeliveryZone[] | undefined, area: string | null | undefined) {
  if (!zones?.length || !area) return null;
  const s = slugifyArea(area);
  return zones.find((z) => z.slug === s || slugifyArea(z.area) === s) ?? null;
}

export type DeliveryQuote = {
  zone: DeliveryZone | null;
  known: boolean;
  fee: number;
  minOrder: number;
  meetsMinimum: boolean;
  shortfall: number;
  freeThreshold: number | null;
  freeDelivery: boolean;
  /** Blocking reason for checkout, or null when the order can be placed. */
  blockedReason: string | null;
};

const money = (n: number) => `Rs ${Math.round(n).toLocaleString("en-PK")}`;

export function quoteDelivery({
  zones,
  area,
  subtotal,
  fallbackFee = 99,
  requiresMinimum = true,
}: {
  zones: DeliveryZone[] | undefined;
  area: string | null | undefined;
  subtotal: number;
  fallbackFee?: number;
  /** Quote-later services (pharmacy, parcels) skip the minimum-order rule. */
  requiresMinimum?: boolean;
}): DeliveryQuote {
  const zone = findZone(zones, area);
  const minOrder = zone?.min_order ?? 0;
  const freeThreshold = zone?.free_delivery_threshold ?? null;
  const freeDelivery = freeThreshold != null && subtotal >= freeThreshold;
  const baseFee = zone?.delivery_fee ?? fallbackFee;
  const fee = subtotal <= 0 ? 0 : freeDelivery ? 0 : baseFee;
  const meetsMinimum = !requiresMinimum || subtotal >= minOrder;
  let blockedReason: string | null = null;
  // A typed-in (unlisted) area is allowed — we quote the standard fee and confirm on call.
  if (!zone && String(area ?? "").trim().length < 2) blockedReason = "Enter or choose your delivery area.";
  else if (!meetsMinimum) blockedReason = `Minimum order for ${zone.area} is ${money(minOrder)} — add ${money(minOrder - subtotal)} more.`;

  return {
    zone,
    known: !!zone,
    fee,
    minOrder,
    meetsMinimum,
    shortfall: Math.max(minOrder - subtotal, 0),
    freeThreshold,
    freeDelivery,
    blockedReason,
  };
}
