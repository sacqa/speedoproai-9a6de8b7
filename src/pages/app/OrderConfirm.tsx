import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { buildWhatsAppUrl, formatPKR, statusLabel } from "@/lib/format";

export default function OrderConfirm() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: o } = await supabase.from("orders").select("*").eq("id", id).single();
      const { data: items } = await supabase.from("order_items").select("*").eq("order_id", id);
      setOrder({ ...o, items: items ?? [] });
    })();
  }, [id]);

  if (!order) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  const addr = order.address_snapshot;
  const lines = [
    `*Speedo Order ${order.order_number}*`,
    `Type: ${statusLabel(order.type)}`,
    `Status: ${statusLabel(order.status)}`,
    addr ? `Customer: ${addr.recipient_name} (${addr.phone})` : "",
    addr ? `Address: ${addr.street}, ${addr.area}` : "",
    `Payment: ${statusLabel(order.payment_method ?? "")}`,
    `Txn ID: ${order.payment_txn_id ?? "—"}`,
    "",
    "Items:",
    ...order.items.map((i: any) => `• ${i.name} × ${i.quantity} — ${formatPKR(i.price * i.quantity)}`),
    "",
    `Total: ${formatPKR(Number(order.total))}`,
  ].filter(Boolean).join("\n");

  return (
    <div className="p-6 lg:p-0 max-w-md mx-auto text-center space-y-5">
      <div className="animate-scale-in mx-auto h-24 w-24 rounded-full bg-success/10 flex items-center justify-center">
        <CheckCircle2 className="h-14 w-14 text-success" />
      </div>
      <h1 className="text-2xl font-extrabold">Order Placed!</h1>
      <p className="text-muted-foreground">Order <b>{order.order_number}</b> is awaiting payment review.</p>
      <p className="text-sm text-muted-foreground">Confirm details with our team on WhatsApp to speed things up.</p>
      <a href={buildWhatsAppUrl(lines)} target="_blank" rel="noopener noreferrer">
        <Button className="w-full h-12 rounded-pill bg-success hover:bg-success/90 text-white">💬 Confirm on WhatsApp</Button>
      </a>
      <Link to={`/orders/${order.id}`} className="block"><Button variant="outline" className="w-full h-12 rounded-pill">Track Order</Button></Link>
      <Link to="/" className="block text-sm text-muted-foreground">Back to Home</Link>
    </div>
  );
}