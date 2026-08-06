import { supabase } from "@/integrations/supabase/client";

export type ServiceType = "speedmart" | "food" | "pharmacy" | "speedsend" | "custom";

export const SERVICE_LABEL: Record<ServiceType, string> = {
  speedmart: "SpeedMart",
  food: "Food",
  pharmacy: "Pharmacy",
  speedsend: "SpeedSend",
  custom: "Custom",
};

const INFO_KEY = "speedo-guest-info";
const ORDERS_KEY = "speedo-my-orders";

export type GuestInfo = { name: string; phone: string; area: string; street: string };

export function loadGuestInfo(): GuestInfo {
  try {
    const raw = localStorage.getItem(INFO_KEY);
    if (raw) return { name: "", phone: "", area: "Dipalpur", street: "", ...JSON.parse(raw) };
  } catch {}
  return { name: "", phone: "", area: "Dipalpur", street: "" };
}

export function saveGuestInfo(info: GuestInfo) {
  try { localStorage.setItem(INFO_KEY, JSON.stringify(info)); } catch {}
}

export type SavedOrder = {
  id: string;
  order_number: string;
  phone: string;
  total: number;
  service_type: ServiceType;
  created_at: string;
};

export function myOrders(): SavedOrder[] {
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]"); } catch { return []; }
}

function rememberOrder(o: SavedOrder) {
  try {
    const list = [o, ...myOrders().filter((x) => x.id !== o.id)].slice(0, 20);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(list));
  } catch {}
}

export type PlaceOrderItem = {
  product_id?: string | null;
  name: string;
  price: number;
  quantity: number;
  unit?: string | null;
  image_url?: string | null;
  variant_label?: string | null;
};

export type PlaceOrderInput = {
  service_type: ServiceType;
  name: string;
  phone: string;
  area: string;
  street: string;
  details?: string | null;
  notes?: string | null;
  items: PlaceOrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  vendor_id?: string | null;
  vendor_name?: string | null;
  attachment_url?: string | null;
  meta?: Record<string, unknown>;
};

/** Places an order for any Speedo service through the single guest-order RPC. */
export async function placeGuestOrder(input: PlaceOrderInput) {
  const { data, error } = await supabase.rpc("place_guest_order" as any, {
    _customer_name: input.name,
    _phone: input.phone,
    _area: input.area,
    _street: input.street,
    _items: input.items,
    _subtotal: input.subtotal,
    _delivery_fee: input.delivery_fee,
    _total: input.total,
    _details: input.details ?? null,
    _notes: input.notes ?? null,
    _service_type: input.service_type,
    _vendor_id: input.vendor_id ?? null,
    _vendor_name: input.vendor_name ?? null,
    _attachment_url: input.attachment_url ?? null,
    _meta: input.meta ?? {},
  } as any);

  const row = (Array.isArray(data) ? data[0] : data) as { id: string; order_number: string } | null;
  if (error || !row) throw new Error(error?.message ?? "Could not place the order. Please try again.");

  saveGuestInfo({ name: input.name, phone: input.phone, area: input.area, street: input.street });
  rememberOrder({
    id: row.id,
    order_number: row.order_number,
    phone: input.phone,
    total: input.total,
    service_type: input.service_type,
    created_at: new Date().toISOString(),
  });
  try {
    sessionStorage.setItem(
      `guest-order-${row.id}`,
      JSON.stringify({ ...input, ...row, customer_name: input.name }),
    );
  } catch {}
  return row;
}

/** Looks an order back up by order number + phone (works for anyone, no sign-in). */
export async function lookupOrder(orderNumber: string, phone: string) {
  const { data, error } = await supabase.rpc("lookup_guest_order" as any, {
    _order_number: orderNumber,
    _phone: phone,
  } as any);
  if (error) throw new Error(error.message);
  return (Array.isArray(data) ? data[0] : data) ?? null;
}
