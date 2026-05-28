import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

export default function AdminCustomers() {
  const q = useQuery({
    queryKey: ["admin","customers"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500);
      const { data: orders } = await supabase.from("orders").select("user_id,total");
      const stats = new Map<string, { count: number; spent: number }>();
      (orders ?? []).forEach((o: any) => {
        const s = stats.get(o.user_id) ?? { count: 0, spent: 0 };
        s.count++; s.spent += Number(o.total ?? 0);
        stats.set(o.user_id, s);
      });
      return (profiles ?? []).map((p: any) => ({ ...p, ...(stats.get(p.id) ?? { count: 0, spent: 0 }) }));
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Customers</h1>
      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border">
            <tr><th className="text-left p-3">Name</th><th className="text-left">Phone</th><th className="text-right">Orders</th><th className="text-right p-3">Spent</th><th className="text-right p-3">Joined</th></tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((c: any) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="p-3 font-semibold">
                  <Link to={`/admin/customers/${c.id}`} className="text-primary hover:underline">
                    {c.full_name ?? "—"}
                  </Link>
                </td>
                <td>{c.phone ?? "—"}</td>
                <td className="text-right">{c.count}</td>
                <td className="text-right p-3 font-semibold">Rs {Math.round(c.spent).toLocaleString()}</td>
                <td className="text-right p-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {(q.data ?? []).length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">No customers</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}