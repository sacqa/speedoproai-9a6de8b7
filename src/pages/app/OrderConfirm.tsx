import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, MessageCircle, Pencil, Phone, Truck, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildWhatsAppUrl, formatPKR, statusLabel, WHATSAPP_NUMBER } from "@/lib/format";
import InstructionsThread from "@/components/order/InstructionsThread";

export default function OrderConfirm() {
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: o } = await supabase.from("orders").select("*").eq("id", id).single();
      const { data: items } = await supabase.from("order_items").select("*").eq("order_id", id);
      setOrder({ ...o, items: items ?? [] });
    })();
  }, [id]);

  useEffect(() => {
    if (!order) return;
    const addr = order.address_snapshot;
    const lines = [
      `*Speedo Order ${order.order_number}*`,
      `Type: ${statusLabel(order.type)}`,
      `Status: ${statusLabel(order.status)}`,
      addr ? `Customer: ${addr.recipient_name} (${addr.phone})` : "",
      addr ? `Address: ${addr.street}, ${addr.area}` : "",
      `Payment: Cash on Delivery`,
      "",
      "Items:",
      ...order.items.map((i: any) => `• ${i.name} × ${i.quantity} — ${formatPKR(i.price * i.quantity)}`),
      "",
      `Total: ${formatPKR(Number(order.total))}`,
    ].filter(Boolean).join("\n");
    const key = `wa-sent-${order.id}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      const url = buildWhatsAppUrl(lines);
      setTimeout(() => window.open(url, "_blank", "noopener,noreferrer"), 500);
    }
  }, [order]);

  if (!order) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  const addr = order.address_snapshot;
  const summaryLines = [
    `*Speedo Order ${order.order_number}*`,
    `Type: ${statusLabel(order.type)}`,
    `Status: ${statusLabel(order.status)}`,
    addr ? `Customer: ${addr.recipient_name} (${addr.phone})` : "",
    addr ? `Address: ${addr.street}, ${addr.area}` : "",
    `Payment: Cash on Delivery`,
    "",
    "Items:",
    ...order.items.map((i: any) => `• ${i.name} × ${i.quantity} — ${formatPKR(i.price * i.quantity)}`),
    "",
    `Total: ${formatPKR(Number(order.total))}`,
  ].filter(Boolean).join("\n");

  const supportText = `Hi Speedo support 👋\nI just placed order *${order.order_number}*. Please process it as fast as possible.`;
  const editText = `Hi Speedo 👋\nI'd like to *edit* my order *${order.order_number}*.\n\nCurrent details:\n${summaryLines}\n\nChanges I want:\n• `;

  const submitNote = async () => {
    const trimmed = note.trim();
    if (!trimmed || !user) return;
    if (trimmed.length > 1000) { toast.error("Message too long"); return; }
    setBusy(true);
    const { error } = await supabase.from("order_instructions").insert({
      order_id: order.id,
      user_id: user.id,
      author_role: "customer",
      message: trimmed,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Note sent to admin");
    setNote("");
    setOpen(false);
  };

  return (
    <div className="p-5 lg:p-0 max-w-md mx-auto space-y-5">
      <div className="text-center space-y-3 pt-4">
        <div className="animate-scale-in mx-auto h-24 w-24 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle2 className="h-14 w-14 text-success" />
        </div>
        <h1 className="text-2xl font-extrabold">Order Placed!</h1>
        <p className="text-muted-foreground text-sm">
          Order <b className="text-foreground">{order.order_number}</b> has been received. Pay <b>cash on delivery</b> when it arrives.
        </p>
      </div>

      <div className="rounded-2xl bg-success/5 border border-success/20 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-sm">Need it fast or want to change something?</div>
            <div className="text-xs text-muted-foreground mt-0.5">Chat with our team on WhatsApp — fastest way to get help with your order.</div>
          </div>
        </div>

        <a href={buildWhatsAppUrl(supportText)} target="_blank" rel="noopener noreferrer" className="block">
          <Button className="w-full h-12 rounded-pill bg-success hover:bg-success/90 text-white gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat with Support to Make It Fast
          </Button>
        </a>

        <a href={buildWhatsAppUrl(editText)} target="_blank" rel="noopener noreferrer" className="block">
          <Button variant="outline" className="w-full h-12 rounded-pill border-success/40 text-success hover:bg-success/10 gap-2">
            <Pencil className="h-5 w-5" />
            Edit Your Order via WhatsApp
          </Button>
        </a>

        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="w-full h-12 rounded-pill border-primary/40 text-primary hover:bg-primary/10 gap-2"
        >
          <MessageSquarePlus className="h-5 w-5" />
          Add Instructions In-App
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to={`/orders/${order.id}`}>
          <Button variant="outline" className="w-full h-12 rounded-pill gap-2">
            <Truck className="h-4 w-4" /> Track
          </Button>
        </Link>
        <a href={`tel:+${WHATSAPP_NUMBER}`}>
          <Button variant="outline" className="w-full h-12 rounded-pill gap-2">
            <Phone className="h-4 w-4" /> Call
          </Button>
        </a>
      </div>

      <InstructionsThread orderId={order.id} compact />

      <Link to="/" className="block text-center text-sm text-muted-foreground pt-2">Back to Home</Link>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add instructions to your order</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Add changes or special requests. Our team will see this on your order in admin.
          </p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 1000))}
            placeholder="e.g. Please add 1 extra packet of milk, no onions, leave at gate, etc."
            className="min-h-28"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submitNote} disabled={busy || !note.trim()}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}