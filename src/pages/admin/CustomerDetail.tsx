import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Ban, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function CustomerDetail() {
  const { id = "" } = useParams();

  const q = useQuery({
    queryKey: ["admin", "customer", id],
    enabled: !!id,
    queryFn: async () => {
      const [profile, orders, replies, notifs] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("orders").select("id,order_number,status,total,created_at,type").eq("user_id", id).order("created_at", { ascending: false }).limit(100),
        supabase.from("notification_replies").select("id,message,created_at,is_read").eq("user_id", id).order("created_at", { ascending: false }).limit(50),
        supabase.from("notifications").select("id,title,message,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
      ]);
      return {
        profile: profile.data,
        orders: orders.data ?? [],
        replies: replies.data ?? [],
        notifs: notifs.data ?? [],
      };
    },
  });

  if (q.isLoading) return <div className="p-6">Loading…</div>;
  const p: any = q.data?.profile;
  if (!p) return <div className="p-6">Customer not found.</div>;

  const orders = q.data!.orders;
  const totalSpent = orders.reduce((s, o: any) => s + Number(o.total ?? 0), 0);

  const setApproval = async (status: "approved" | "rejected") => {
    const { error } = await supabase.from("profiles").update({
      approval_status: status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Customer ${status}`);
    q.refetch();
  };
  const toggleBan = async () => {
    const { error } = await supabase.from("profiles").update({ is_banned: !p.is_banned }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(p.is_banned ? "Unbanned" : "Banned");
    q.refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/customers" className="p-2 rounded-lg hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-2xl font-extrabold">Customer profile</h1>
      </div>

      <div className="bg-card rounded-xl shadow-card p-5">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div>
            <div className="text-xl font-extrabold">{p.full_name ?? "—"}</div>
            <div className="text-sm text-muted-foreground">{p.phone ?? "—"}</div>
          </div>
          <div className="flex gap-2">
            {p.approval_status !== "approved" && (
              <Button size="sm" onClick={() => setApproval("approved")}>
                <CheckCircle2 className="h-4 w-4 mr-1" />Approve
              </Button>
            )}
            {p.approval_status !== "rejected" && (
              <Button size="sm" variant="outline" onClick={() => setApproval("rejected")}>Reject</Button>
            )}
            <Button size="sm" variant={p.is_banned ? "outline" : "destructive"} onClick={toggleBan}>
              {p.is_banned ? <><ShieldCheck className="h-4 w-4 mr-1" />Unban</> : <><Ban className="h-4 w-4 mr-1" />Ban</>}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5 text-sm">
          <Field label="Date of birth" value={p.dob ? new Date(p.dob).toLocaleDateString() : "—"} />
          <Field label="Joined" value={new Date(p.created_at).toLocaleString()} />
          <Field label="Approval status" value={
            <span className={`font-semibold ${p.approval_status === "approved" ? "text-emerald-600" : p.approval_status === "rejected" ? "text-destructive" : "text-amber-600"}`}>
              {p.approval_status}
            </span>
          } />
          <Field label="Approved at" value={p.approved_at ? new Date(p.approved_at).toLocaleString() : "—"} />
          <Field label="Banned" value={p.is_banned ? <span className="text-destructive font-semibold">Yes</span> : "No"} />
          <Field label="Total orders" value={`${orders.length}`} />
          <Field label="Total spent" value={`Rs ${Math.round(totalSpent).toLocaleString()}`} />
        </div>
      </div>

      <Section title={`Order history (${orders.length})`}>
        {orders.length === 0 ? <Empty text="No orders yet" /> : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr><th className="text-left p-3">Order</th><th className="text-left">Type</th><th className="text-left">Status</th><th className="text-right">Total</th><th className="text-right p-3">Date</th></tr>
            </thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-semibold"><Link to={`/admin/orders/${o.id}`} className="text-primary hover:underline">{o.order_number}</Link></td>
                  <td className="capitalize">{o.type}</td>
                  <td className="capitalize">{o.status}</td>
                  <td className="text-right font-semibold">Rs {Math.round(Number(o.total)).toLocaleString()}</td>
                  <td className="text-right p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={`Messages from customer (${q.data!.replies.length})`}>
        {q.data!.replies.length === 0 ? <Empty text="No messages" /> : (
          <ul className="divide-y divide-border">
            {q.data!.replies.map((r: any) => (
              <li key={r.id} className="p-3">
                <div className="text-sm">{r.message}</div>
                <div className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}{r.is_read ? "" : " · unread"}</div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Notifications sent (${q.data!.notifs.length})`}>
        {q.data!.notifs.length === 0 ? <Empty text="No notifications" /> : (
          <ul className="divide-y divide-border">
            {q.data!.notifs.map((n: any) => (
              <li key={n.id} className="p-3">
                <div className="text-sm font-semibold">{n.title}</div>
                <div className="text-sm text-muted-foreground">{n.message}</div>
                <div className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl shadow-card overflow-x-auto">
      <div className="px-4 py-3 border-b border-border font-bold">{title}</div>
      {children}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="p-8 text-center text-sm text-muted-foreground">{text}</div>;
}