import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatPKR, statusLabel } from "@/lib/format";
import { Input } from "@/components/ui/input";

const STATUSES = ["all","submitted","rider_assigned","purchasing_items","out_for_delivery","delivered","cancelled"];

export default function AdminOrders() {
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const orders = useQuery({
    queryKey: ["admin","orders", filter],
    queryFn: async () => {
      let query = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
      if (filter !== "all") query = query.eq("status", filter as any);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
  const filtered = (orders.data ?? []).filter((o: any) =>
    !q.trim() || o.order_number?.toLowerCase().includes(q.toLowerCase()) ||
    o.address_snapshot?.recipient_name?.toLowerCase().includes(q.toLowerCase()) ||
    o.address_snapshot?.phone?.includes(q));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Orders</h1>
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-pill text-xs font-semibold ${filter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
            {statusLabel(s)}
          </button>
        ))}
      </div>
      <Input placeholder="Search by order #, name, or phone…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border">
            <tr><th className="text-left p-3">Order</th><th className="text-left">Type</th><th className="text-left">Customer</th><th className="text-left">Status</th><th className="text-right">Total</th><th className="text-right p-3">Date</th></tr>
          </thead>
          <tbody>
            {filtered.map((o: any) => (
              <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="p-3"><Link to={`/admin/orders/${o.id}`} className="font-semibold text-primary">{o.order_number}</Link></td>
                <td><span className="text-xs px-2 py-0.5 rounded-pill bg-primary-tint text-primary">{statusLabel(o.type)}</span></td>
                <td>{o.address_snapshot?.recipient_name ?? "—"}<div className="text-xs text-muted-foreground">{o.address_snapshot?.phone ?? ""}</div></td>
                <td><span className="text-xs px-2 py-0.5 rounded-pill bg-muted">{statusLabel(o.status)}</span></td>
                <td className="text-right font-semibold">{formatPKR(Number(o.total))}</td>
                <td className="text-right p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No orders</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}