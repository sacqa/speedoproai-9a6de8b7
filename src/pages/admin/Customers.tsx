import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function AdminCustomers() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
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

  const rows = useMemo(() => {
    const list = q.data ?? [];
    return list.filter((c: any) => {
      if (status !== "all" && c.approval_status !== status) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (c.full_name ?? "").toLowerCase().includes(s) || (c.phone ?? "").includes(s);
    });
  }, [q.data, search, status]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Customers</h1>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{rows.length} shown</span>
      </div>
      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left">Phone</th>
              <th className="text-left">Date of birth</th>
              <th className="text-left">Status</th>
              <th className="text-right">Orders</th>
              <th className="text-right p-3">Spent</th>
              <th className="text-right p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c: any) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="p-3 font-semibold">
                  <Link to={`/admin/customers/${c.id}`} className="text-primary hover:underline">
                    {c.full_name ?? "—"}
                  </Link>
                </td>
                <td>{c.phone ?? "—"}</td>
                <td className="text-xs">{c.dob ? new Date(c.dob).toLocaleDateString() : "—"}</td>
                <td className="text-xs">
                  <span className={`font-semibold ${c.approval_status === "approved" ? "text-emerald-600" : c.approval_status === "rejected" ? "text-destructive" : "text-amber-600"}`}>
                    {c.approval_status}
                  </span>
                </td>
                <td className="text-right">{c.count}</td>
                <td className="text-right p-3 font-semibold">Rs {Math.round(c.spent).toLocaleString()}</td>
                <td className="text-right p-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No customers</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}