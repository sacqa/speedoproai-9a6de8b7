import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatPKR, statusLabel } from "@/lib/format";
import { Package, ShoppingBag, Users, DollarSign } from "lucide-react";

export default function AdminDashboard() {
  const stats = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const [orders, products, customers, recent] = await Promise.all([
        supabase.from("orders").select("id,total,status,created_at"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id,order_number,total,status,created_at,address_snapshot").order("created_at", { ascending: false }).limit(10),
      ]);
      const all = orders.data ?? [];
      const today = new Date(); today.setHours(0,0,0,0);
      const todays = all.filter((o: any) => new Date(o.created_at) >= today);
      const revenue = all.filter((o: any) => o.status === "delivered").reduce((s: number, o: any) => s + Number(o.total || 0), 0);
      const pending = all.filter((o: any) => !["delivered","cancelled"].includes(o.status)).length;
      return {
        totalOrders: all.length,
        todaysOrders: todays.length,
        revenue,
        pending,
        productsCount: products.count ?? 0,
        customersCount: customers.count ?? 0,
        recent: recent.data ?? [],
      };
    },
  });

  const s = stats.data;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={ShoppingBag} label="Today's Orders" value={s?.todaysOrders ?? "—"} />
        <Stat icon={DollarSign} label="Revenue (delivered)" value={s ? formatPKR(s.revenue) : "—"} />
        <Stat icon={Package} label="Active Products" value={s?.productsCount ?? "—"} />
        <Stat icon={Users} label="Customers" value={s?.customersCount ?? "—"} />
      </div>
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Recent Orders</h2>
          <Link to="/admin/orders" className="text-primary text-sm font-semibold">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr><th className="text-left py-2">Order</th><th className="text-left">Customer</th><th className="text-left">Status</th><th className="text-right">Total</th><th className="text-right">When</th></tr>
            </thead>
            <tbody>
              {(s?.recent ?? []).map((o: any) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="py-2"><Link to={`/admin/orders/${o.id}`} className="font-semibold text-primary">{o.order_number}</Link></td>
                  <td>{o.address_snapshot?.recipient_name ?? "—"}</td>
                  <td><span className="text-xs px-2 py-0.5 rounded-pill bg-muted">{statusLabel(o.status)}</span></td>
                  <td className="text-right font-semibold">{formatPKR(Number(o.total))}</td>
                  <td className="text-right text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {(!s?.recent || s.recent.length === 0) && (
                <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl neu-inset text-primary flex items-center justify-center"><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-extrabold">{value}</div>
        </div>
      </div>
    </div>
  );
}