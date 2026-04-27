import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPKR, statusLabel } from "@/lib/format";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const STATUSES = ["submitted","rider_assigned","purchasing_items","out_for_delivery","delivered","cancelled"];

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    const [{ data: o }, { data: it }, { data: lg }] = await Promise.all([
      supabase.from("orders").select("*").eq("id", id).single(),
      supabase.from("order_items").select("*").eq("order_id", id),
      supabase.from("order_status_logs").select("*").eq("order_id", id).order("created_at"),
    ]);
    setOrder(o); setItems(it ?? []); setLogs(lg ?? []);
  };
  useEffect(() => { load(); }, [id]);

  const updateStatus = async (status: string) => {
    setBusy(true);
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Status updated"); await load(); }
    setBusy(false);
  };

  if (!order) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  const a = order.address_snapshot;

  return (
    <div className="space-y-5 max-w-3xl">
      <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Back</Link>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">{statusLabel(order.type)} · {new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={order.status} onValueChange={updateStatus} disabled={busy}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl shadow-card p-4 text-sm">
          <h2 className="font-bold mb-2">Customer & Delivery</h2>
          {a ? <>
            <div><b>{a.recipient_name}</b> · {a.phone}</div>
            <div className="text-muted-foreground">{a.street}, {a.area}</div>
            {a.details && <div className="text-muted-foreground text-xs mt-1">{a.details}</div>}
          </> : <div className="text-muted-foreground">No address</div>}
        </div>
        <div className="bg-card rounded-xl shadow-card p-4 text-sm space-y-1">
          <h2 className="font-bold mb-2">Payment</h2>
          <div>Method: <b>Cash on Delivery</b></div>
          <div>Status: <span className="px-2 py-0.5 rounded-pill bg-muted text-xs">{statusLabel(order.payment_status)}</span></div>
          {order.notes && <div className="text-muted-foreground text-xs mt-2">Notes: {order.notes}</div>}
        </div>
      </div>

      {items.length > 0 && (
        <div className="bg-card rounded-xl shadow-card p-4">
          <h2 className="font-bold mb-3">Items</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {items.map((i: any) => (
                <tr key={i.id}><td className="py-2">{i.name}</td><td className="text-right text-muted-foreground">× {i.quantity}</td><td className="text-right font-semibold w-28">{formatPKR(Number(i.price) * i.quantity)}</td></tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border">
              <tr><td className="pt-2 text-muted-foreground">Subtotal</td><td colSpan={2} className="pt-2 text-right">{formatPKR(Number(order.subtotal))}</td></tr>
              <tr><td className="text-muted-foreground">Delivery</td><td colSpan={2} className="text-right">{formatPKR(Number(order.delivery_fee))}</td></tr>
              <tr><td className="text-muted-foreground">Service</td><td colSpan={2} className="text-right">{formatPKR(Number(order.service_charge))}</td></tr>
              <tr><td className="font-bold pt-1">Total</td><td colSpan={2} className="font-bold text-right pt-1 text-primary">{formatPKR(Number(order.total))}</td></tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="bg-card rounded-xl shadow-card p-4">
        <h2 className="font-bold mb-3">Status History</h2>
        <ol className="space-y-1 text-sm">
          {logs.map((l) => (
            <li key={l.id} className="flex justify-between border-b border-border last:border-0 py-1">
              <span>{statusLabel(l.status)}</span>
              <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
            </li>
          ))}
          {logs.length === 0 && <p className="text-muted-foreground text-sm">No history</p>}
        </ol>
      </div>
    </div>
  );
}