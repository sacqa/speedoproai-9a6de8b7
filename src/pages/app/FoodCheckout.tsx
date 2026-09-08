import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFoodCart } from "@/store/foodCart";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPKR } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Minus, Trash2, Wallet } from "lucide-react";
import { Seo } from "@/components/seo/Seo";
import { GuestDetailsFields } from "@/components/order/GuestDetailsFields";
import { guestDetailsSchema } from "@/lib/guestValidation";
import { loadGuestInfo, placeGuestOrder, type GuestInfo } from "@/lib/guestOrder";
import { OrderSteps, CHECKOUT_STEPS, etaLabel } from "@/components/speedo/OrderSteps";
import { useDeliveryZones, quoteDelivery } from "@/lib/deliveryRules";
import { DeliveryRuleNotice } from "@/components/order/DeliveryRuleNotice";

export default function FoodCheckout() {
  const cart = useFoodCart();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [guest, setGuest] = useState<GuestInfo>(loadGuestInfo());

  const sub = cart.subtotal();
  const zones = useDeliveryZones();
  const quote = quoteDelivery({ zones: zones.data, area: guest.area, subtotal: sub, fallbackFee: 79 });
  const delivery = quote.fee;
  const total = sub + delivery;

  useEffect(() => {
    if (cart.items.length === 0) nav("/food", { replace: true });
  }, [cart.items.length, nav]);

  const detailsDone = guest.name.trim().length >= 2 && guest.phone.trim().length >= 10 && guest.street.trim().length >= 2;
  const step = busy ? 3 : detailsDone ? 2 : 1;

  const placeOrder = async () => {
    if (cart.items.length === 0) return;
    const parsed = guestDetailsSchema.safeParse(guest);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    const d = parsed.data;
    if (quote.blockedReason) { toast.error(quote.blockedReason); return; }
    setBusy(true);
    try {
      const order = await placeGuestOrder({
        service_type: "food",
        name: d.name, phone: d.phone, area: d.area, street: d.street,
        items: cart.items.map((i) => ({
          name: i.name, price: Number(i.price), quantity: i.quantity, image_url: i.image_url ?? null,
        })),
        subtotal: sub, delivery_fee: delivery, total,
        notes: notes.trim() || null,
        geo: guest.geo ?? null,
        vendor_id: cart.vendorId,
        vendor_name: cart.vendorName,
      });
      cart.clear();
      nav(`/order/${order.id}`, { replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not place the order");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 lg:p-0 pb-28 space-y-5 max-w-2xl mx-auto">
      <Seo title="Food Checkout | Speedo" description="Confirm your food order from Speedo." path="/food/checkout" />
      <header className="pt-1">
        <h1 className="text-3xl lg:text-4xl font-serif font-semibold tracking-tight">Food checkout</h1>
        {cart.vendorName && (
          <p className="text-sm text-muted-foreground mt-1">From <b className="text-foreground">{cart.vendorName}</b></p>
        )}
      </header>

      <OrderSteps steps={CHECKOUT_STEPS} current={step} eta={quote.zone ? quote.etaLabel : etaLabel()} title="Checkout progress" />

      <section className="bg-card rounded-2xl border border-border/60 p-4 space-y-2">
        <h2 className="font-serif text-lg font-semibold">Your items</h2>
        {cart.items.map((i) => (
          <div key={i.item_id} className="flex items-center gap-3 py-1">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{i.name}</div>
              <div className="text-xs text-muted-foreground">{formatPKR(i.price)} × {i.quantity}</div>
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-full p-0.5">
              <button aria-label="Decrease" onClick={() => cart.setQty(i.item_id, i.quantity - 1)} className="h-7 w-7 rounded-full bg-card flex items-center justify-center"><Minus className="h-3 w-3" /></button>
              <span className="text-xs font-bold px-1 w-5 text-center">{i.quantity}</span>
              <button aria-label="Increase" onClick={() => cart.setQty(i.item_id, i.quantity + 1)} className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Plus className="h-3 w-3" /></button>
            </div>
            <button aria-label="Remove" onClick={() => cart.remove(i.item_id)} className="p-1 text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </section>

      <section className="bg-card rounded-2xl border border-border/60 p-4 lg:p-5 space-y-4">
        <h2 className="font-serif text-lg font-semibold">Delivery details</h2>
        <GuestDetailsFields value={guest} onChange={setGuest} />
        <DeliveryRuleNotice quote={quote} />
        <div>
          <Label htmlFor="food-notes" className="text-[13px] font-semibold">Notes for the kitchen (optional)</Label>
          <Textarea id="food-notes" className="mt-1.5 min-h-[64px] resize-none" placeholder="e.g. Less spicy, extra raita"
            value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 500))} />
        </div>
      </section>

      <section className="bg-card rounded-2xl border border-border/60 p-4 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatPKR(sub)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className="tabular-nums">{delivery === 0 ? "FREE" : formatPKR(delivery)}</span></div>
        <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-1"><span>Total</span><span className="text-primary tabular-nums">{formatPKR(total)}</span></div>
        <div className="pt-3 flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Cash on delivery</div>
      </section>

      <Button className="w-full h-12 rounded-full text-base font-bold" disabled={busy || !!quote.blockedReason} onClick={placeOrder}>
        {busy ? "Placing order…" : quote.blockedReason ? (quote.zone ? (quote.isOpen ? `Add ${formatPKR(quote.shortfall)} to continue` : "Closed right now") : "Select a delivery area") : `Place order · ${formatPKR(total)}`}
      </Button>
    </div>
  );
}
