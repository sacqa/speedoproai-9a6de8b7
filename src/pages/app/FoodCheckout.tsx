import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFoodCart } from "@/store/foodCart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { addressSchema } from "@/lib/validators";
import { formatPKR } from "@/lib/format";
import { toast } from "sonner";
import { MapPin, Plus, Minus, Trash2 } from "lucide-react";
import { Seo } from "@/components/seo/Seo";

export default function FoodCheckout() {
  const { user } = useAuth();
  const cart = useFoodCart();
  const nav = useNavigate();
  const [addressId, setAddressId] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ label: "Home", recipient_name: "", phone: "", area: "Dipalpur", street: "", details: "" });

  const sub = cart.subtotal();
  const delivery = sub > 1500 ? 0 : 79;
  const total = sub + delivery;

  const addrs = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("addresses").select("*").order("is_default", { ascending: false })).data ?? [],
  });

  useEffect(() => {
    if (addrs.data?.length && !addressId) setAddressId(addrs.data[0].id);
    if (addrs.data && addrs.data.length === 0) setShowNew(true);
  }, [addrs.data, addressId]);

  useEffect(() => {
    if (cart.items.length === 0) nav("/food", { replace: true });
  }, [cart.items.length, nav]);

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
    if (!user || cart.items.length === 0 || !cart.vendorId) return;
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
      user_id: user.id,
      type: "food" as any,
      vendor_id: cart.vendorId,
      address_id: useAddrId,
      address_snapshot: addr,
      payment_method: "cod" as any,
      payment_status: "pending" as const,
      subtotal: sub, delivery_fee: delivery, service_charge: 0, total,
      status: "submitted" as const,
      custom_details: { vendor_name: cart.vendorName },
    }).select().single();
    if (error || !order) { toast.error(error?.message ?? "Failed"); setBusy(false); return; }

    const orderItems = cart.items.map((i) => ({
      order_id: order.id, product_id: null, name: i.name, price: i.price, quantity: i.quantity, image_url: i.image_url,
    }));
    const { error: e2 } = await supabase.from("order_items").insert(orderItems);
    if (e2) { toast.error(e2.message); setBusy(false); return; }
    cart.clear();
    nav(`/orders/${order.id}/confirm`, { replace: true });
  };

  return (
    <div className="p-4 lg:p-0 space-y-5 max-w-2xl mx-auto">
      <Seo title="Food Checkout | Speedo" description="Confirm your food order from Speedo." path="/food/checkout" />
      <h1 className="text-2xl font-extrabold">Food Checkout</h1>
      {cart.vendorName && (
        <div className="text-sm text-muted-foreground">From <b className="text-foreground">{cart.vendorName}</b></div>
      )}

      <section className="bg-card rounded-xl shadow-card p-4 space-y-2">
        <h2 className="font-bold">Your items</h2>
        {cart.items.map((i) => (
          <div key={i.item_id} className="flex items-center gap-3 py-1">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{i.name}</div>
              <div className="text-xs text-muted-foreground">{formatPKR(i.price)} × {i.quantity}</div>
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-full p-0.5">
              <button onClick={() => cart.setQty(i.item_id, i.quantity - 1)} className="h-7 w-7 rounded-full bg-card flex items-center justify-center"><Minus className="h-3 w-3" /></button>
              <span className="text-xs font-bold px-1 w-5 text-center">{i.quantity}</span>
              <button onClick={() => cart.setQty(i.item_id, i.quantity + 1)} className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Plus className="h-3 w-3" /></button>
            </div>
            <button onClick={() => cart.remove(i.item_id)} className="p-1 text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </section>

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
            <Input placeholder="03xxxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })} />
            <Input placeholder="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
            <Input className="col-span-2" placeholder="Street / house no." value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
            <Input className="col-span-2" placeholder="Landmark (optional)" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
          </div>
        )}
      </section>

      <section className="bg-card rounded-xl shadow-card p-4 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPKR(sub)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{delivery === 0 ? "FREE" : formatPKR(delivery)}</span></div>
        <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-1"><span>Total</span><span className="text-primary">{formatPKR(total)}</span></div>
      </section>

      <Button className="w-full h-12 rounded-pill text-base" disabled={busy} onClick={placeOrder}>
        {busy ? "Placing order…" : "Place Order (Cash on Delivery)"}
      </Button>
    </div>
  );
}