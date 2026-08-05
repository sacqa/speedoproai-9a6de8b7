import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatPKR, statusLabel } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import GuestOrdersPanel from "@/components/admin/GuestOrdersPanel";

const STATUSES = ["all","submitted","rider_assigned","purchasing_items","out_for_delivery","delivered","cancelled"];
const PAGE_SIZE = 25;

export default function AdminOrders() {
  const [params, setParams] = useSearchParams();
  const filter = params.get("status") ?? "all";
  const q = params.get("q") ?? "";
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const update = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => { if (v === null || v === "") p.delete(k); else p.set(k, v); });
    setParams(p, { replace: true });
  };
  const { user } = useAuth();
  const [isSuper, setIsSuper] = useState(false);
  const [resetting, setResetting] = useState(false);
  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin")
      .maybeSingle().then(({ data }) => setIsSuper(!!data));
  }, [user]);
  const orders = useQuery({
    queryKey: ["admin","orders", filter, q, page],
    queryFn: async () => {
      let query = supabase.from("orders")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      if (filter !== "all") query = query.eq("status", filter as any);
      if (q.trim()) query = query.ilike("order_number", `%${q.trim()}%`);
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });
  const filtered = orders.data?.rows ?? [];
  const total = orders.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleReset = async () => {
    setResetting(true);
    try {
      const { data: ids, error: e1 } = await supabase.from("orders").select("id");
      if (e1) throw e1;
      const orderIds = (ids ?? []).map((o: any) => o.id);
      if (orderIds.length === 0) {
        toast({ title: "Nothing to reset", description: "No orders found." });
        return;
      }
      await supabase.from("order_instructions").delete().in("order_id", orderIds);
      await supabase.from("order_status_logs").delete().in("order_id", orderIds);
      await supabase.from("order_items").delete().in("order_id", orderIds);
      await supabase.from("notifications").delete().in("order_id", orderIds);
      await supabase.from("notification_replies").delete().in("order_id", orderIds);
      const { error: e2 } = await supabase.from("orders").delete().in("id", orderIds);
      if (e2) throw e2;
      toast({ title: "Orders reset", description: `Deleted ${orderIds.length} orders.` });
      orders.refetch();
    } catch (err: any) {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold">Orders</h1>
        {isSuper && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={resetting}>
                <Trash2 className="h-4 w-4 mr-1" />
                {resetting ? "Resetting…" : "Reset all orders"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all orders?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes ALL orders and their items, logs, instructions, and related notifications. Use only before launch. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => update({ status: s === "all" ? null : s, page: null })} className={`px-3 py-1.5 rounded-pill text-xs font-semibold ${filter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
            {statusLabel(s)}
          </button>
        ))}
      </div>
      <Input placeholder="Search by order #…" value={q} onChange={(e) => update({ q: e.target.value || null, page: null })} className="max-w-sm" />
      <GuestOrdersPanel />
      <h2 className="text-lg font-extrabold pt-2">Account orders</h2>
      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {filtered.map((o: any) => (
          <Link
            key={o.id}
            to={`/admin/orders/${o.id}`}
            className="block bg-card rounded-2xl shadow-card p-3 active:scale-[0.99] transition-transform"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-primary truncate">{o.order_number}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {o.address_snapshot?.recipient_name ?? "—"}
                  {o.address_snapshot?.phone ? ` · ${o.address_snapshot.phone}` : ""}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-sm tabular-nums">{formatPKR(Number(o.total))}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-pill bg-primary-tint text-primary font-semibold">{statusLabel(o.type)}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-pill bg-muted font-semibold">{statusLabel(o.status)}</span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-10">No orders</p>}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-xl shadow-card overflow-x-auto">
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
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + filtered.length} of {total}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>Previous</Button>
          <span className="px-2 py-1 font-semibold text-foreground">Page {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) })}>Next</Button>
        </div>
      </div>
    </div>
  );
}