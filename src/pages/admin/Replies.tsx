import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageSquare, Phone, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";

type Reply = {
  id: string;
  message: string;
  created_at: string;
  is_read: boolean;
  user_id: string;
  order_id: string | null;
  notification_id: string | null;
};

export default function AdminReplies() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"unread" | "all">("unread");

  const { data: replies = [], isLoading } = useQuery({
    queryKey: ["admin-replies", tab],
    queryFn: async () => {
      let q = supabase
        .from("notification_replies")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (tab === "unread") q = q.eq("is_read", false);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Reply[];
    },
  });

  // fetch profiles, notifications, orders in batch
  const userIds = Array.from(new Set(replies.map((r) => r.user_id)));
  const notifIds = Array.from(new Set(replies.map((r) => r.notification_id).filter(Boolean) as string[]));
  const orderIds = Array.from(new Set(replies.map((r) => r.order_id).filter(Boolean) as string[]));

  const { data: profiles = [] } = useQuery({
    queryKey: ["replies-profiles", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, phone").in("id", userIds);
      return data ?? [];
    },
  });
  const { data: notifs = [] } = useQuery({
    queryKey: ["replies-notifs", notifIds],
    enabled: notifIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("id, title, message").in("id", notifIds);
      return data ?? [];
    },
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["replies-orders", orderIds],
    enabled: orderIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("id, order_number").in("id", orderIds);
      return data ?? [];
    },
  });

  // Realtime: refresh on new replies
  useEffect(() => {
    const ch = supabase
      .channel("admin-replies")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notification_replies" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-replies"] });
        toast("New reply received");
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const markRead = async (id: string) => {
    const { error } = await supabase.from("notification_replies").update({ is_read: true }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-replies"] });
  };

  const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
  const notifMap = new Map(notifs.map((n: any) => [n.id, n]));
  const orderMap = new Map(orders.map((o: any) => [o.id, o]));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" /> Notification Replies
          </h1>
          <p className="text-sm text-muted-foreground">Replies users sent from in-app push banners.</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-pill p-1">
          {(["unread", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-pill text-xs font-bold capitalize transition-colors ${
                tab === t ? "bg-card shadow-card text-foreground" : "text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-10">Loading…</div>
      ) : replies.length === 0 ? (
        <div className="text-center text-muted-foreground py-16 bg-card rounded-2xl border border-border">
          No {tab === "unread" ? "unread " : ""}replies yet.
        </div>
      ) : (
        <div className="space-y-3">
          {replies.map((r) => {
            const profile: any = profileMap.get(r.user_id);
            const notif: any = r.notification_id ? notifMap.get(r.notification_id) : null;
            const order: any = r.order_id ? orderMap.get(r.order_id) : null;
            const wa = profile?.phone ? `https://wa.me/${profile.phone.replace(/\D/g, "")}` : null;
            return (
              <div
                key={r.id}
                className={`bg-card rounded-2xl shadow-card p-4 border ${r.is_read ? "border-border" : "border-primary/40"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-bold">{profile?.full_name || "Customer"}</div>
                      {profile?.phone && (
                        <a
                          href={`tel:${profile.phone}`}
                          className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
                        >
                          <Phone className="h-3 w-3" /> {profile.phone}
                        </a>
                      )}
                      {!r.is_read && (
                        <span className="text-[10px] font-bold uppercase bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    {notif && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Re: <b>{notif.title}</b> — {notif.message}
                      </div>
                    )}
                    {order && (
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="text-xs text-primary font-semibold inline-flex items-center gap-1 mt-1 hover:underline"
                      >
                        Order {order.order_number} <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground shrink-0">
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="mt-3 bg-muted rounded-xl p-3 text-sm whitespace-pre-wrap">{r.message}</div>

                <div className="mt-3 flex items-center gap-2">
                  {wa && (
                    <a href={wa} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="rounded-pill bg-success hover:bg-success/90 text-white gap-1">
                        <MessageSquare className="h-4 w-4" /> WhatsApp
                      </Button>
                    </a>
                  )}
                  {!r.is_read && (
                    <Button size="sm" variant="outline" className="rounded-pill gap-1" onClick={() => markRead(r.id)}>
                      <Check className="h-4 w-4" /> Mark read
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}