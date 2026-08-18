import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DeliveryZone = {
  id: string;
  area: string;
  slug: string;
  delivery_fee: number;
  min_order: number;
  free_delivery_threshold: number | null;
  eta_min_minutes: number;
  eta_max_minutes: number;
  opens_at: string | null;
  closes_at: string | null;
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

const toMinutes = (t: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m ?? 0);
};

/** True when the zone accepts orders right now (always true when no hours are set). */
export function zoneIsOpen(zone: DeliveryZone | null, now = new Date()) {
  if (!zone) return true;
  const open = toMinutes(zone.opens_at);
  const close = toMinutes(zone.closes_at);
  if (open == null || close == null) return true;
  const cur = now.getHours() * 60 + now.getMinutes();
  return close > open ? cur >= open && cur < close : cur >= open || cur < close; // supports past-midnight windows
}

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

export function zoneHoursLabel(zone: DeliveryZone | null) {
  if (!zone?.opens_at || !zone?.closes_at) return "Open 24 hours";
  return `${hhmm(zone.opens_at)} – ${hhmm(zone.closes_at)}`;
}

/** Estimated delivery window, e.g. "6:20 – 6:50 PM". */
export function zoneEtaLabel(zone: DeliveryZone | null, from = new Date()) {
  const min = zone?.eta_min_minutes ?? 30;
  const max = zone?.eta_max_minutes ?? 60;
  const fmt = (mins: number) =>
    new Date(from.getTime() + mins * 60_000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${fmt(min)} – ${fmt(max)}`;
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
  isOpen: boolean;
  hoursLabel: string;
  etaLabel: string;
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
  now = new Date(),
}: {
  zones: DeliveryZone[] | undefined;
  area: string | null | undefined;
  subtotal: number;
  fallbackFee?: number;
  /** Quote-later services (pharmacy, parcels) skip the minimum-order rule. */
  requiresMinimum?: boolean;
  now?: Date;
}): DeliveryQuote {
  const zone = findZone(zones, area);
  const minOrder = zone?.min_order ?? 0;
  const freeThreshold = zone?.free_delivery_threshold ?? null;
  const freeDelivery = freeThreshold != null && subtotal >= freeThreshold;
  const baseFee = zone?.delivery_fee ?? fallbackFee;
  const fee = subtotal <= 0 ? 0 : freeDelivery ? 0 : baseFee;
  const meetsMinimum = !requiresMinimum || subtotal >= minOrder;
  const isOpen = zoneIsOpen(zone, now);

  let blockedReason: string | null = null;
  if (!zone) blockedReason = area ? "We don't deliver to that area yet — please pick a delivery area." : "Choose your delivery area.";
  else if (!isOpen) blockedReason = `${zone.area} is closed right now. Orders are taken ${zoneHoursLabel(zone)}.`;
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
    isOpen,
    hoursLabel: zoneHoursLabel(zone),
    etaLabel: zoneEtaLabel(zone, now),
    blockedReason,
  };
}
