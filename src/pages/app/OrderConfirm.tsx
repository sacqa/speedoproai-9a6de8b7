import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, MessageCircle, Pencil, Phone, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildWhatsAppUrl, formatPKR, WHATSAPP_NUMBER } from "@/lib/format";
import { OrderSteps, FULFILMENT_STEPS, etaLabel } from "@/components/speedo/OrderSteps";
import { lookupOrder, myOrders, SERVICE_LABEL, type ServiceType } from "@/lib/guestOrder";
import { STATUS_STEP, statusText } from "@/lib/orderStatus";
import { Seo } from "@/components/seo/Seo";

export default function OrderConfirm() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState<string>("submitted");
  const [refreshing, setRefreshing] = useState(false);

  // The checkout caches the order locally; the live status is fetched by
  // order number + phone so it keeps working after a refresh or on any device.
  const saved = myOrders().find((o) => o.id === id);

  const refresh = useCallback(async () => {
    if (!saved) return;
    setRefreshing(true);
    try {
      const live = await lookupOrder(saved.order_number, saved.phone);
      if (live) {
        setOrder((prev: any) => ({ ...(prev ?? {}), ...live }));
        setStatus(String(live.status));
      }
    } catch {}
    setRefreshing(false);
  }, [saved?.order_number, saved?.phone]);

  useEffect(() => {
    if (!id) return;
    try {
      const raw = sessionStorage.getItem(`guest-order-${id}`);
      if (raw) setOrder(JSON.parse(raw));
    } catch {}
    refresh();
  }, [id, refresh]);

  if (!order) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-3">
        <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
        <h1 className="text-2xl font-serif font-semibold">Order placed</h1>
        <p className="text-sm text-muted-foreground">
          Track it any time with your order number and phone number.
        </p>
        <Link to="/track"><Button className="rounded-full mt-2 gap-2"><Search className="h-4 w-4" /> Track my order</Button></Link>
        <Link to="/" className="block text-sm text-muted-foreground pt-2">Back to Home</Link>
      </div>
    );
  }

  const service = (order.service_type ?? "speedmart") as ServiceType;
  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const summaryLines = [
    `*Speedo Order ${order.order_number}*`,
    `Service: ${SERVICE_LABEL[service] ?? service}`,
    `Customer: ${order.customer_name} (${order.phone ?? saved?.phone ?? ""})`,
    `Address: ${order.street}, ${order.area}`,
    "Payment: Cash on Delivery",
    "",
    "Items:",
    ...items.map((i: any) => `• ${i.name} × ${i.quantity}${Number(i.price) ? ` — ${formatPKR(Number(i.price) * i.quantity)}` : ""}`),
    "",
    Number(order.total) ? `Total: ${formatPKR(Number(order.total))}` : "Total: to be confirmed",
  ].filter(Boolean).join("\n");

  const supportText = `Hi Speedo support 👋\nI just placed order *${order.order_number}*. Please process it as fast as possible.`;
  const editText = `Hi Speedo 👋\nI'd like to *edit* my order *${order.order_number}*.\n\nCurrent details:\n${summaryLines}\n\nChanges I want:\n• `;

  return (
    <div className="p-5 lg:p-0 max-w-md mx-auto space-y-5 pb-24">
      <Seo title={`Order ${order.order_number} | Speedo`} description="Your Speedo order status." path={`/order/${id}`} />
      <div className="text-center space-y-3 pt-4">
        <div className="animate-scale-in mx-auto h-24 w-24 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle2 className="h-14 w-14 text-success" />
        </div>
        <h1 className="text-3xl font-serif font-semibold">Order placed!</h1>
        <p className="text-muted-foreground text-sm">
          Order <b className="text-foreground">{order.order_number}</b> ({SERVICE_LABEL[service] ?? service}) has been received.
          Pay <b>cash on delivery</b> when it arrives.
        </p>
      </div>

      <OrderSteps
        steps={FULFILMENT_STEPS}
        current={STATUS_STEP[status] ?? 0}
        eta={status === "delivered" || status === "cancelled" ? null : etaLabel()}
        title={`Status · ${statusText(status)}`}
      />

      <Button variant="ghost" size="sm" onClick={refresh} disabled={refreshing} className="w-full gap-2 text-muted-foreground">
        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh status
      </Button>

      {items.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
          {items.map((i: any, idx: number) => (
            <div key={idx} className="flex justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{i.name} × {i.quantity}</span>
              {Number(i.price) > 0 && <span className="tabular-nums shrink-0">{formatPKR(Number(i.price) * i.quantity)}</span>}
            </div>
          ))}
          <div className="border-t border-border pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-primary tabular-nums">{Number(order.total) ? formatPKR(Number(order.total)) : "To be confirmed"}</span>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-success/5 border border-success/20 p-4 space-y-3">
        <a href={buildWhatsAppUrl(supportText)} target="_blank" rel="noopener noreferrer" className="block">
          <Button className="w-full h-12 rounded-full bg-success hover:bg-success/90 text-white gap-2">
            <MessageCircle className="h-5 w-5" /> Chat with support
          </Button>
        </a>
        <a href={buildWhatsAppUrl(editText)} target="_blank" rel="noopener noreferrer" className="block">
          <Button variant="outline" className="w-full h-12 rounded-full border-success/40 text-success hover:bg-success/10 gap-2">
            <Pencil className="h-5 w-5" /> Edit your order via WhatsApp
          </Button>
        </a>
      </div>

      <a href={`tel:+${WHATSAPP_NUMBER}`}>
        <Button variant="outline" className="w-full h-12 rounded-full gap-2"><Phone className="h-4 w-4" /> Call Speedo</Button>
      </a>

      <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground pt-1">
        <Link to="/track" className="underline underline-offset-4">Track an order</Link>
        <Link to="/">Back to Home</Link>
      </div>
    </div>
  );
}
