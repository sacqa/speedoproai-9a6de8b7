import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shield, Check, X, Phone, Mail, Clock } from "lucide-react";
import { toast } from "sonner";

type Status = "pending" | "approved" | "rejected";
type Row = { id: string; full_name: string | null; phone: string | null; approval_status: Status; created_at: string; email?: string | null };

export default function AdminApprovals() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Status>("pending");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-approvals", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, approval_status, created_at")
        .eq("approval_status", tab)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      // Fetch emails via admin-users edge function (optional). Fall back to id.
      return (data ?? []) as Row[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-approvals")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => qc.invalidateQueries({ queryKey: ["admin-approvals"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const setStatus = async (id: string, s: Status) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({ approval_status: s, approved_at: new Date().toISOString(), approved_by: user?.id })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(s === "approved" ? "Customer approved" : "Customer rejected");
    qc.invalidateQueries({ queryKey: ["admin-approvals"] });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Customer Approvals
          </h1>
          <p className="text-sm text-muted-foreground">Review new signups before they can place orders.</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-pill p-1">
          {(["pending", "approved", "rejected"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-pill text-xs font-bold capitalize ${tab === t ? "bg-card shadow-card text-foreground" : "text-muted-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-10">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-muted-foreground py-16 bg-card rounded-2xl border border-border">
          No {tab} signups.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="bg-card rounded-2xl shadow-card p-4 border border-border flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-bold">{r.full_name || "Unnamed customer"}</div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {r.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />+92 {r.phone}</span>}
                  <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{r.id.slice(0, 8)}…</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(r.created_at).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {tab !== "approved" && (
                  <Button size="sm" className="rounded-pill bg-success hover:bg-success/90 text-white gap-1" onClick={() => setStatus(r.id, "approved")}>
                    <Check className="h-4 w-4" /> Accept
                  </Button>
                )}
                {tab !== "rejected" && (
                  <Button size="sm" variant="outline" className="rounded-pill gap-1 text-destructive border-destructive/50" onClick={() => setStatus(r.id, "rejected")}>
                    <X className="h-4 w-4" /> Reject
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}