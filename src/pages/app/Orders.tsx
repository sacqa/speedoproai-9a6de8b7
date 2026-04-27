import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPKR, statusLabel } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";

export default function Orders() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div className="p-4 lg:p-0 space-y-3">
      <h1 className="text-2xl font-extrabold">My Orders</h1>
      {q.isLoading ? <p className="text-muted-foreground">Loading…</p> :
        (q.data ?? []).length === 0 ? <p className="text-muted-foreground py-8 text-center">No orders yet.</p> :
        (q.data ?? []).map((o: any) => (
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