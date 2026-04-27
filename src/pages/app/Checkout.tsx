import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { addressSchema } from "@/lib/validators";
import { formatPKR } from "@/lib/format";
import { toast } from "sonner";
import { MapPin, Plus } from "lucide-react";

export default function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const nav = useNavigate();
  const [addressId, setAddressId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ label: "Home", recipient_name: "", phone: "", area: "Dipalpur", street: "", details: "" });

  const sub = subtotal();
  const delivery = sub > 1500 ? 0 : 99;
  const service = 25;
  const total = sub + delivery + service;

  const addrs = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("addresses").select("*").order("is_default", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (addrs.data && addrs.data.length && !addressId) setAddressId(addrs.data[0].id);
    if (addrs.data && addrs.data.length === 0) setShowNew(true);
  }, [addrs.data, addressId]);

  const saveNewAddress = async () => {
    const r = addressSchema.safeParse(form);
    if (!r.success) { toast.error(r.error.errors[0].message); return null; }
    if (!user) return null;
    const row = { ...(r.data as Required<typeof r.data>), user_id: user.id, is_default: addrs.data?.length === 0, details: r.data.details || null };
    const { data, error } = await supabase.from("addresses").insert(row as any).select().single();
    if (error) { toast.error(error.message); return null; }
    addrs.refetch();
    return data;
  };

  const placeOrder = async () => {
    if (!user || items.length === 0) return;
    setBusy(true);
    let useAddrId = addressId;
    if (showNew) {
      const a = await saveNewAddress();
      if (!a) { setBusy(false); return; }
      useAddrId = a.id;
    }
    const addr = (addrs.data ?? []).find((a) => a.id === useAddrId) || (await supabase.from("addresses").select("*").eq("id", useAddrId).single()).data;
    if (!addr) { setBusy(false); toast.error("Pick a delivery address"); return; }

    const { data: order, error } = await supabase.from("orders").insert({
      user_id: user.id, type: "speedmart" as const, address_id: useAddrId,
      address_snapshot: addr, payment_method: "cod" as any, payment_status: "pending" as const,
      subtotal: sub, delivery_fee: delivery, service_charge: service, total,
      status: "submitted" as const,
    }).select().single();
    if (error || !order) { toast.error(error?.message ?? "Failed"); setBusy(false); return; }

    const orderItems = items.map((i) => ({
      order_id: order.id, product_id: i.product_id, name: i.name, price: i.price, quantity: i.quantity, unit: i.unit, image_url: i.image_url,
    }));
    const { error: e2 } = await supabase.from("order_items").insert(orderItems);
    if (e2) { toast.error(e2.message); setBusy(false); return; }
    clear();
    nav(`/orders/${order.id}/confirm`, { replace: true });
  };

  if (items.length === 0) { nav("/cart", { replace: true }); return null; }

  return (
    <div className="p-4 lg:p-0 space-y-5 max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold">Checkout</h1>

      <section className="bg-card rounded-xl shadow-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Delivery Address</h2>
          <button onClick={() => setShowNew((x) => !x)} className="text-primary text-sm font-semibold flex items-center gap-1"><Plus className="h-4 w-4" />{showNew ? "Use saved" : "New"}</button>
        </div>
        {!showNew ? (
          <RadioGroup value={addressId} onValueChange={setAddressId} className="space-y-2">
            {(addrs.data ?? []).map((a: any) => (
              <label key={a.id} className={`flex gap-3 p-3 rounded-lg border-2 cursor-pointer ${addressId === a.id ? "border-primary bg-primary-tint" : "border-border"}`}>
                <RadioGroupItem value={a.id} className="mt-1" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">{a.label} · {a.recipient_name}</div>
                  <div className="text-xs text-muted-foreground">{a.street}, {a.area}</div>
                  <div className="text-xs text-muted-foreground">📞 {a.phone}</div>
                </div>
                <MapPin className="h-4 w-4 text-primary" />
              </label>
            ))}
            {(addrs.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No saved addresses.</p>}
          </RadioGroup>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Label (Home)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <Input placeholder="Recipient name" value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} />
            <Input placeholder="03xxxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g,"").slice(0,11) })} />
            <Input placeholder="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
            <Input className="col-span-2" placeholder="Street / house no." value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
            <Input className="col-span-2" placeholder="Landmark / details (optional)" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
          </div>
        )}
      </section>

      <section className="bg-card rounded-xl shadow-card p-4 space-y-2">
        <h2 className="font-bold">Payment Method</h2>
        <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-primary bg-primary-tint">
          <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">₨</div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Cash on Delivery</div>
            <div className="text-xs text-muted-foreground">Pay in cash to the rider when your order arrives.</div>
          </div>
        </div>
      </section>

      <section className="bg-card rounded-xl shadow-card p-4 space-y-2 text-sm">
        <h2 className="font-bold mb-2">Order Summary ({items.length} items)</h2>
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPKR(sub)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{delivery === 0 ? "FREE" : formatPKR(delivery)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span>{formatPKR(service)}</span></div>
        <div className="flex justify-between border-t border-border pt-2 mt-2 font-bold text-base"><span>Total</span><span className="text-primary">{formatPKR(total)}</span></div>
      </section>

      <Button className="w-full h-12 rounded-pill text-base" disabled={busy} onClick={placeOrder}>
        {busy ? "Placing order…" : "Place Order"}
      </Button>
    </div>
  );
}