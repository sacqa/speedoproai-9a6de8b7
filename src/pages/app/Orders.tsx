import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPKR, statusLabel } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUSES = ["all","submitted","rider_assigned","purchasing_items","out_for_delivery","delivered","cancelled"];

export default function Orders() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  const status = params.get("status") ?? "all";
  const update = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => { if (v === null || v === "") p.delete(k); else p.set(k, v); });
    setParams(p, { replace: true });
  };
  const query = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const rows = ((query.data ?? []) as any[])
    .filter((o: any) => status === "all" || o.status === status)
    .filter((o: any) => !search || o.order_number?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="p-4 lg:p-0 space-y-3">
      <h1 className="text-2xl font-extrabold">My Orders</h1>
      <div className="flex gap-2">
        <Input
          placeholder="Search order #…"
          defaultValue={search}
          onChange={(e) => update({ q: e.target.value || null })}
          className="flex-1"
        />
        <Select value={status} onValueChange={(v) => update({ status: v === "all" ? null : v })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {query.isLoading ? <p className="text-muted-foreground">Loading…</p> :
        rows.length === 0 ? <p className="text-muted-foreground py-8 text-center">No orders match.</p> :
        rows.map((o: any) => (
          <Link to={`/orders/${o.id}`} key={o.id} className="block bg-card rounded-xl shadow-card p-4">
            <div className="flex justify-between">
              <div>
                <div className="font-bold">{o.order_number}</div>
                <div className="text-xs text-muted-foreground">{statusLabel(o.type)} · {new Date(o.created_at).toLocaleDateString()}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-primary">{formatPKR(Number(o.total))}</div>
                <div className="text-[10px] font-semibold mt-1 px-2 py-0.5 rounded-pill bg-primary-tint text-primary inline-block">{statusLabel(o.status)}</div>
              </div>
            </div>
          </Link>
        ))}
    </div>
  );
}