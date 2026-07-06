import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { pkPhone } from "@/lib/validators";
import { formatPKR } from "@/lib/format";
import { toast } from "sonner";
import { User, Phone, MapPin } from "lucide-react";

const guestSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60),
  phone: pkPhone,
  area: z.string().trim().min(2, "Enter your area").max(60),
  street: z.string().trim().min(2, "Enter your street / house").max(120),
  details: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
});

const LS_KEY = "speedo-guest-info";

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const saved = typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null;
  const initial = saved ? { ...JSON.parse(saved), notes: "" } : { name: "", phone: "", area: "Dipalpur", street: "", details: "", notes: "" };
  const [form, setForm] = useState<any>(initial);

  const sub = subtotal();
  const delivery = sub > 1500 ? 0 : 99;
  const total = sub + delivery;

  const placeOrder = async () => {
    if (items.length === 0) return;
    const parsed = guestSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setBusy(true);
    const d = parsed.data;
    const { data: order, error } = await supabase
      .from("guest_orders" as any)
      .insert({
        customer_name: d.name,
        phone: d.phone,
        area: d.area,
        street: d.street,
        details: d.details || null,
        notes: d.notes || null,
        items: items.map((i) => ({
          product_id: i.product_id, name: i.name, price: Number(i.price),
          quantity: i.quantity, unit: i.unit ?? null, image_url: i.image_url ?? null,
          variant_label: i.variant_label ?? null,
        })) as any,
        subtotal: sub, delivery_fee: delivery, total,
      })
      .select("id, order_number")
      .single();
    if (error || !order) {
      setBusy(false);
      toast.error(error?.message ?? "Failed to place order");
      return;
    }
    try { window.localStorage.setItem(LS_KEY, JSON.stringify({ name: d.name, phone: d.phone, area: d.area, street: d.street, details: d.details })); } catch {}
    // Cache the confirmation payload so the confirm page can render without a DB read.
    try {
      const o = order as { id: string; order_number: string };
      window.sessionStorage.setItem(
        `guest-order-${o.id}`,
        JSON.stringify({ id: o.id, order_number: o.order_number, customer_name: d.name, phone: d.phone, area: d.area, street: d.street, total, items }),
      );
    } catch {}
    clear();
    nav(`/order/${(order as any).id}`, { replace: true });
  };

  if (items.length === 0) { nav("/cart", { replace: true }); return null; }

  return (
    <div className="p-4 lg:p-0 space-y-5 max-w-2xl mx-auto pb-32 lg:pb-4">
      <h1 className="text-2xl font-extrabold">Checkout</h1>
      <p className="text-sm text-muted-foreground -mt-3">No account needed — just tell us where to deliver.</p>

      <section className="bg-card rounded-2xl shadow-card p-4 sm:p-5 space-y-3">
        <h2 className="font-bold flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Your details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" autoComplete="name" placeholder="e.g. Ali Raza" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.slice(0, 60) })} className="mt-1.5 h-11" />
          </div>
          <div>
            <Label htmlFor="phone">Mobile number</Label>
            <div className="mt-1.5 flex">
              <span className="inline-flex items-center px-3 h-11 rounded-l-md border border-r-0 border-input bg-muted text-xs font-semibold">+92</span>
              <Input id="phone" inputMode="numeric" autoComplete="tel" placeholder="03xxxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })} className="h-11 rounded-l-none" maxLength={11} />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-card rounded-2xl shadow-card p-4 sm:p-5 space-y-3">
        <h2 className="font-bold flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Delivery address</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="area">Area</Label>
            <Input id="area" placeholder="Dipalpur" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value.slice(0, 60) })} className="mt-1.5 h-11" />
          </div>
          <div>
            <Label htmlFor="street">House / Street</Label>
            <Input id="street" placeholder="House 12, Main Bazaar Road" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value.slice(0, 120) })} className="mt-1.5 h-11" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="details">Landmark (optional)</Label>
            <Input id="details" placeholder="Near HBL, blue gate" value={form.details ?? ""} onChange={(e) => setForm({ ...form, details: e.target.value.slice(0, 200) })} className="mt-1.5 h-11" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Order notes (optional)</Label>
            <Textarea id="notes" placeholder="Anything the rider should know?" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value.slice(0, 500) })} className="mt-1.5 min-h-[70px]" />
          </div>
        </div>
      </section>

      <section className="bg-card rounded-2xl shadow-card p-4 sm:p-5 space-y-2">
        <h2 className="font-bold">Payment Method</h2>
        <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-primary bg-primary-tint">
          <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">₨</div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Cash on Delivery</div>
            <div className="text-xs text-muted-foreground">Pay in cash to the rider when your order arrives.</div>
          </div>
        </div>
      </section>

      <section className="bg-card rounded-2xl shadow-card p-4 sm:p-5 space-y-2 text-sm">
        <h2 className="font-bold mb-2">Order Summary ({items.length} items)</h2>
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPKR(sub)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{delivery === 0 ? "FREE" : formatPKR(delivery)}</span></div>
        <div className="flex justify-between border-t border-border pt-2 mt-2 font-bold text-base"><span>Total</span><span className="text-primary">{formatPKR(total)}</span></div>
      </section>

      <Button className="w-full h-12 rounded-pill text-base" disabled={busy} onClick={placeOrder}>
        {busy ? "Placing order…" : `Place Order · ${formatPKR(total)}`}
      </Button>
    </div>
  );
}