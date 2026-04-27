import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatPKR, statusLabel } from "@/lib/format";
import { Check } from "lucide-react";

const FLOW = [
  "submitted","rider_assigned","purchasing_items","out_for_delivery","delivered",
];

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: o } = await supabase.from("orders").select("*").eq("id", id).single();
      const { data: items } = await supabase.from("order_items").select("*").eq("order_id", id);
      const { data: logs } = await supabase.from("order_status_logs").select("*").eq("order_id", id).order("created_at");
      setOrder({ ...o, items: items ?? [], logs: logs ?? [] });
    })();
  }, [id]);

  if (!order) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  const cur = FLOW.indexOf(order.status);
  const cancelled = order.status === "cancelled";

  return (
    <div className="p-4 lg:p-0 space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold">{order.order_number}</h1>
        <p className="text-muted-foreground text-sm">{statusLabel(order.type)} · {new Date(order.created_at).toLocaleString()}</p>
      </div>

      <div className="bg-card rounded-xl shadow-card p-4">
        <span className="inline-block px-3 py-1 rounded-pill text-xs font-bold bg-primary-tint text-primary">
          Payment: Cash on Delivery
        </span>
      </div>

      <div className="bg-card rounded-xl shadow-card p-4">
        <h2 className="font-bold mb-3">Order Tracking</h2>
        {cancelled ? (
          <p className="text-destructive font-semibold">Order Cancelled</p>
        ) : (
          <div className="space-y-3">
            {FLOW.map((s, i) => {
              const done = i <= cur;
              const log = order.logs.find((l: any) => l.status === s);
              return (
                <div key={s} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border-2 border-border"}`}>
                      {done ? <Check className="h-4 w-4" /> : <span className="text-xs">{i+1}</span>}
                    </div>
                    {i < FLOW.length - 1 && <div className={`w-0.5 flex-1 ${done ? "bg-primary" : "bg-border"}`} style={{ minHeight: 16 }} />}
                  </div>
                  <div className="pb-3">
                    <div className={`text-sm font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}>{statusLabel(s)}</div>
                    {log && <div className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {order.items.length > 0 && (
        <div className="bg-card rounded-xl shadow-card p-4">
          <h2 className="font-bold mb-3">Items</h2>
          <ul className="divide-y divide-border">
            {order.items.map((i: any) => (
              <li key={i.id} className="py-2 flex justify-between text-sm">
                <span>{i.name} × {i.quantity}</span>
                <span className="font-semibold">{formatPKR(Number(i.price) * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-border mt-2 pt-2 flex justify-between font-bold">
            <span>Total</span><span className="text-primary">{formatPKR(Number(order.total))}</span>
          </div>
        </div>
      )}

      {order.address_snapshot && (
        <div className="bg-card rounded-xl shadow-card p-4 text-sm">
          <h2 className="font-bold mb-2">Delivery Address</h2>
          <p>{order.address_snapshot.recipient_name} · {order.address_snapshot.phone}</p>
          <p className="text-muted-foreground">{order.address_snapshot.street}, {order.address_snapshot.area}</p>
        </div>
      )}
    </div>
  );
}