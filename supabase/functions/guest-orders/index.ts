// Public guest order endpoint. Runs the privileged order RPCs with the service role
// so the underlying SECURITY DEFINER functions are not exposed to anonymous callers.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const str = (v: unknown, max: number) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > max ? s.slice(0, max) : s;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const action = body?.action;

  try {
    if (action === "lookup") {
      const order_number = str(body.order_number, 40);
      const phone = str(body.phone, 30);
      if (!order_number || phone.replace(/\D/g, "").length < 7) {
        return json({ error: "Order number and phone are required" }, 400);
      }
      const { data, error } = await admin.rpc("lookup_guest_order", {
        _order_number: order_number,
        _phone: phone,
      });
      if (error) return json({ error: "Could not look up that order" }, 400);
      return json({ order: (Array.isArray(data) ? data[0] : data) ?? null });
    }

    if (action === "place") {
      const items = Array.isArray(body.items) ? body.items : null;
      if (!items || items.length === 0) return json({ error: "Your cart is empty" }, 400);
      const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : NaN);
      const subtotal = num(body.subtotal);
      let delivery_fee = num(body.delivery_fee);
      let total = num(body.total);
      if ([subtotal, delivery_fee, total].some((n) => Number.isNaN(n) || n < 0)) {
        return json({ error: "Invalid order amounts" }, 400);
      }

      // --- Delivery rules are re-checked here so they can't be bypassed by a crafted request.
      const service_type = str(body.service_type, 20);
      const area = str(body.area, 120);
      const areaSlug = area.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { data: zones } = await admin
        .from("delivery_zones")
        .select("area, slug, delivery_fee, min_order, free_delivery_threshold, is_active");
      const zone = (zones ?? []).find((z: any) => z.slug === areaSlug && z.is_active) ?? null;
      const chargeable = service_type === "speedmart" || service_type === "food";

      if (zone && chargeable) {
        const minOrder = Number(zone.min_order ?? 0);
        if (subtotal < minOrder) {
          return json({ error: `Minimum order for ${zone.area} is Rs ${Math.round(minOrder)}.` }, 400);
        }
        const freeAt = zone.free_delivery_threshold == null ? null : Number(zone.free_delivery_threshold);
        delivery_fee = subtotal <= 0 ? 0 : freeAt != null && subtotal >= freeAt ? 0 : Number(zone.delivery_fee ?? 0);
        total = subtotal + delivery_fee;
      } else if (chargeable) {
        // Unlisted area: keep the quoted fee but never trust an arbitrary amount.
        delivery_fee = Math.min(delivery_fee, 500);
        total = subtotal + delivery_fee;
      }

      const { data, error } = await admin.rpc("place_guest_order", {
        _customer_name: str(body.name, 120),
        _phone: str(body.phone, 30),
        _area: str(body.area, 120),
        _street: str(body.street, 200),
        _items: items,
        _subtotal: subtotal,
        _delivery_fee: delivery_fee,
        _total: total,
        _details: body.details ? str(body.details, 500) : null,
        _notes: body.notes ? str(body.notes, 1000) : null,
        _service_type: str(body.service_type, 20),
        _vendor_id: body.vendor_id ?? null,
        _vendor_name: body.vendor_name ? str(body.vendor_name, 160) : null,
        _attachment_url: body.attachment_url ? str(body.attachment_url, 1000) : null,
        _meta: (() => {
          const m = body.meta && typeof body.meta === "object" ? { ...body.meta } : {};
          const g = (m as any).geo;
          if (g && Number.isFinite(Number(g.lat)) && Number.isFinite(Number(g.lng))) {
            (m as any).geo = {
              lat: Number(g.lat), lng: Number(g.lng),
              accuracy: Number.isFinite(Number(g.accuracy)) ? Number(g.accuracy) : null,
              at: typeof g.at === "string" ? g.at.slice(0, 40) : new Date().toISOString(),
            };
          } else delete (m as any).geo;
          return m;
        })(),
      });
      if (error) {
        console.error("place_guest_order failed", error.message);
        return json({ error: "Could not place the order. Please check your details and try again." }, 400);
      }
      const row = (Array.isArray(data) ? data[0] : data) ?? null;
      if (!row) return json({ error: "Could not place the order. Please try again." }, 400);
      return json({ order: row });
    }

    if (action === "upload") {
      // Server-side upload proxy so the storage bucket needs no public insert policy.
      const service = str(body.service, 20);
      if (!["pharmacy", "speedsend", "custom"].includes(service)) {
        return json({ error: "Invalid upload type" }, 400);
      }
      const contentType = str(body.content_type, 60).toLowerCase();
      const allowed: Record<string, string> = {
        "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
      };
      const ext = allowed[contentType];
      if (!ext) return json({ error: "Only JPG, PNG or WebP images are allowed" }, 400);
      const b64 = typeof body.data === "string" ? body.data : "";
      if (!b64 || b64.length > 7_500_000) return json({ error: "Image must be under 5MB" }, 400);
      let bytes: Uint8Array;
      try { bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); }
      catch { return json({ error: "Invalid image data" }, 400); }
      if (bytes.length > 5 * 1024 * 1024) return json({ error: "Image must be under 5MB" }, 400);
      const path = `${service}/${Date.now()}-${crypto.randomUUID()}${ext}`;
      const { error } = await admin.storage.from("request-uploads").upload(path, bytes, {
        cacheControl: "3600", upsert: false, contentType,
      });
      if (error) {
        console.error("upload failed", error.message);
        return json({ error: "Could not upload the image. Please try again." }, 400);
      }
      return json({ path });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("guest-orders error", e);
    return json({ error: "Server error" }, 500);
  }
});
