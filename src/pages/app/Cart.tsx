import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useCart } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, Trash2, ShoppingCart, User, Phone, MapPin, Tag, Wallet, ChevronRight, Lightbulb } from "lucide-react";
import { formatPKR, buildWhatsAppUrl } from "@/lib/format";
import { z } from "zod";
import { pkPhone } from "@/lib/validators";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OrderSteps, CHECKOUT_STEPS, etaLabel } from "@/components/speedo/OrderSteps";

const guestSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60),
  phone: pkPhone,
  area: z.string().trim().min(2, "Enter your area").max(60),
  street: z.string().trim().min(2, "Enter your address").max(200),
  notes: z.string().trim().max(500).optional(),
});

const LS_KEY = "speedo-guest-info";

export default function Cart() {
  const { items, setQty, remove, subtotal, clear } = useCart();
  const nav = useNavigate();
  const sub = subtotal();
  const delivery = sub === 0 ? 0 : sub > 1500 ? 0 : 99;
  const total = sub + delivery;

  const saved = typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null;
  const initial = saved ? { ...JSON.parse(saved), notes: "" } : { name: "", phone: "", area: "Dipalpur", street: "", notes: "" };
  const [form, setForm] = useState<any>(initial);
  const [discount, setDiscount] = useState("");
  const [busy, setBusy] = useState(false);

  // Checkout progress: basket → details → payment → placed.
  const detailsDone =
    String(form.name ?? "").trim().length >= 2 &&
    String(form.phone ?? "").trim().length >= 10 &&
    String(form.street ?? "").trim().length >= 2;
  const step = busy ? 3 : detailsDone ? 2 : 1;

  if (items.length === 0) {
    return (
      <div className="px-4 py-16 lg:py-24 text-center max-w-md mx-auto">
        <div className="mx-auto h-24 w-24 rounded-full bg-primary/5 flex items-center justify-center mb-6">
          <ShoppingCart className="h-11 w-11 text-primary" strokeWidth={1.5} />
        </div>
        <h2 className="text-3xl font-serif font-semibold tracking-tight">Your basket is empty</h2>
        <p className="text-muted-foreground mt-2 mb-8">Browse SpeedMart and add a few items — we deliver same-day in Dipalpur.</p>
        <Link to="/speedmart"><Button className="rounded-full px-8 h-11">Start shopping</Button></Link>
      </div>
    );
  }

  const placeOrder = async () => {
    const parsed = guestSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setBusy(true);
    const d = parsed.data;
    const { data: order, error } = await supabase
      .from("guest_orders" as any)
      .insert({
        customer_name: d.name, phone: d.phone, area: d.area, street: d.street,
        details: null, notes: d.notes || null,
        items: items.map((i) => ({
          product_id: i.product_id, name: i.name, price: Number(i.price),
          quantity: i.quantity, unit: i.unit ?? null, image_url: i.image_url ?? null,
          variant_label: i.variant_label ?? null,
        })) as any,
        subtotal: sub, delivery_fee: delivery, total,
      })
      .select("id, order_number").single();
    if (error || !order) { setBusy(false); toast.error(error?.message ?? "Failed to place order"); return; }
    try { window.localStorage.setItem(LS_KEY, JSON.stringify({ name: d.name, phone: d.phone, area: d.area, street: d.street })); } catch {}
    try {
      const o = order as unknown as { id: string; order_number: string };
      window.sessionStorage.setItem(`guest-order-${o.id}`, JSON.stringify({ id: o.id, order_number: o.order_number, customer_name: d.name, phone: d.phone, area: d.area, street: d.street, total, items }));
    } catch {}
    clear();
    nav(`/order/${(order as unknown as { id: string }).id}`, { replace: true });
  };

  const applyDiscount = () => {
    if (!discount.trim()) return;
    toast.error("This code isn't valid or has expired.");
  };

  return (
    <div className="pb-32 lg:pb-8">
      {/* Page header */}
      <div className="px-4 lg:px-0 pt-2 lg:pt-4 pb-4 lg:pb-8">
        <h1 className="text-3xl lg:text-5xl font-serif font-semibold tracking-tight text-foreground">Your basket</h1>
        <p className="text-sm lg:text-base text-muted-foreground mt-1">Review your items, then share your details and choose how to pay.</p>
      </div>

      <div className="px-4 lg:px-0 pb-5 lg:pb-8">
        <OrderSteps steps={CHECKOUT_STEPS} current={step} eta={etaLabel()} title="Checkout progress" />
      </div>

      <div className="px-4 lg:px-0 grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px] gap-6 lg:gap-10 items-start">
        {/* LEFT — items */}
        <div className="space-y-3 lg:space-y-4 order-1">
          {items.map((i) => (
            <div key={i.product_id} className="group bg-card rounded-2xl border border-border/60 hover:border-border transition-colors p-3 lg:p-4 flex gap-3 lg:gap-5 items-center">
              <div className="shrink-0">
                <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
                  <img src={i.image_url ?? "/placeholder.svg"} alt={i.name}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                    className="h-full w-full object-contain p-1" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] lg:text-base line-clamp-2 leading-snug">{i.name}</p>
                <div className="text-[11px] lg:text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  {i.unit && <span>{i.unit}</span>}
                  {i.unit && <span>·</span>}
                  <span>{formatPKR(i.price)}</span>
                  {i.variant_label && (<><span>·</span><span className="text-accent-foreground">{i.variant_label}</span></>)}
                </div>
              </div>
              <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                <div className="flex items-center gap-1 border border-border rounded-full h-9 px-1">
                  <button onClick={() => setQty(i.product_id, i.quantity - 1)} aria-label="Decrease" className="h-7 w-7 rounded-full flex items-center justify-center text-foreground/70 hover:bg-muted"><Minus className="h-3.5 w-3.5" /></button>
                  <span className="text-sm font-bold tabular-nums min-w-[1.75ch] text-center">{i.quantity}</span>
                  <button onClick={() => setQty(i.product_id, i.quantity + 1)} aria-label="Increase" className="h-7 w-7 rounded-full flex items-center justify-center text-primary hover:bg-primary/10"><Plus className="h-3.5 w-3.5" /></button>
                </div>
                <div className="hidden sm:block text-right min-w-[70px]">
                  <div className="font-bold tabular-nums text-[15px]">{formatPKR(i.price * i.quantity)}</div>
                </div>
                <button onClick={() => remove(i.product_id)} aria-label="Remove" className="h-9 w-9 rounded-full text-destructive/70 hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}

          {/* Request an item card */}
          <a
            href={buildWhatsAppUrl("Hi! I'd like to request an item that isn't on the app: ")}
            target="_blank" rel="noreferrer"
            className="hidden lg:flex mt-6 rounded-2xl border-2 border-dashed border-primary/25 bg-primary/[0.03] p-5 flex-col items-center text-center gap-2 hover:bg-primary/[0.06] transition-colors"
          >
            <div className="text-lg font-serif font-semibold">Can't find what you need? 🛒</div>
            <p className="text-sm text-muted-foreground max-w-xl">Message us the item on WhatsApp and we'll get it for you — or add it to your order notes. Bazaar se Ghar Tak!</p>
            <span className="mt-1 inline-flex items-center gap-1.5 bg-accent text-accent-foreground font-bold text-sm rounded-full px-5 py-2">Request an item on WhatsApp →</span>
          </a>
        </div>

        {/* RIGHT — summary + details + payment */}
        <aside className="order-2 lg:sticky lg:top-24 space-y-4">
          <div className="bg-card rounded-2xl border border-border/60 p-5 lg:p-6 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.15)]">
            <h2 className="text-xl lg:text-2xl font-serif font-semibold tracking-tight">Order summary</h2>
            <div className="mt-4 space-y-2.5 text-[15px]">
              <Row label="Subtotal" value={formatPKR(sub)} />
              <Row label="Delivery" value={delivery === 0 ? "FREE" : formatPKR(delivery)} />
            </div>
            <div className="border-t border-border my-4" />
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-serif font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary tabular-nums">{formatPKR(total)}</span>
            </div>

            {/* Discount */}
            <div className="mt-5">
              <Label className="text-[13px] font-semibold flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Have a discount code?</Label>
              <div className="mt-1.5 flex gap-2">
                <Input value={discount} onChange={(e) => setDiscount(e.target.value.toUpperCase().slice(0, 24))} placeholder="ENTER CODE" className="h-11 uppercase tracking-wider" />
                <Button onClick={applyDiscount} className="h-11 rounded-md px-5">Apply</Button>
              </div>
            </div>

            {/* Customer details */}
            <div className="mt-6 space-y-4">
              <Field id="name" label="Your name" icon={User}>
                <Input id="name" placeholder="e.g. Ahmed Khan" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.slice(0, 60) })} className="h-11" />
              </Field>
              <Field id="phone" label="Phone / WhatsApp" icon={Phone}>
                <div className="flex">
                  <span className="inline-flex items-center px-3 h-11 rounded-l-md border border-r-0 border-input bg-muted text-xs font-semibold">+92</span>
                  <Input id="phone" inputMode="numeric" autoComplete="tel" placeholder="03xx xxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })} className="h-11 rounded-l-none" maxLength={11} />
                </div>
              </Field>
              <Field id="street" label="Delivery address" icon={MapPin}>
                <Textarea id="street" placeholder="House #, street, area, landmark" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value.slice(0, 200) })} className="min-h-[72px] resize-none" />
              </Field>
              <div>
                <Label htmlFor="notes" className="text-[13px] font-semibold">Notes (optional)</Label>
                <Textarea id="notes" placeholder="e.g. Please also bring 1kg vermicelli if available" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value.slice(0, 500) })} className="mt-1.5 min-h-[64px] resize-none" />
                <p className="mt-1.5 text-[11.5px] text-primary/80 flex items-start gap-1"><Lightbulb className="h-3 w-3 mt-[3px] shrink-0" /> Need something not in our shop? Add it here and we'll try to bring it with your order!</p>
              </div>
            </div>

            {/* Payment method */}
            <div className="mt-6">
              <div className="text-[13px] font-semibold flex items-center gap-1.5 mb-2"><Wallet className="h-3.5 w-3.5" /> Payment method</div>
              <div className="rounded-xl border-2 border-primary bg-primary/[0.04] p-3.5 flex items-start gap-3">
                <span className="h-5 w-5 rounded-full border-[6px] border-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-[15px]">Cash on Delivery</div>
                  <div className="text-xs text-muted-foreground">Pay our rider in cash when your order arrives.</div>
                </div>
              </div>
              <p className="mt-2 text-[11.5px] text-muted-foreground">More payment methods (RAAST, JazzCash, Bank Transfer) coming soon.</p>
            </div>

            <Button disabled={busy} onClick={placeOrder} className="mt-5 w-full h-12 rounded-full text-base font-bold">
              {busy ? "Placing order…" : (<span className="flex items-center gap-2">Place order · {formatPKR(total)} <ChevronRight className="h-4 w-4" /></span>)}
            </Button>
          </div>

          <a
            href={buildWhatsAppUrl("Hi! I'd like to request an item that isn't on the app: ")}
            target="_blank" rel="noreferrer"
            className="lg:hidden flex rounded-2xl border-2 border-dashed border-primary/25 bg-primary/[0.03] p-4 flex-col items-center text-center gap-1.5"
          >
            <div className="text-base font-serif font-semibold">Can't find what you need? 🛒</div>
            <p className="text-xs text-muted-foreground">Message us on WhatsApp — Bazaar se Ghar Tak!</p>
            <span className="mt-1 inline-flex items-center gap-1.5 bg-accent text-accent-foreground font-bold text-xs rounded-full px-4 py-1.5">Request on WhatsApp →</span>
          </a>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-semibold tabular-nums">{value}</span></div>;
}

function Field({ id, label, icon: Icon, children }: { id: string; label: string; icon: any; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={id} className="text-[13px] font-semibold flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}