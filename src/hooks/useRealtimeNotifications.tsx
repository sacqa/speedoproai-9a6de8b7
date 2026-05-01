import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Send, X } from "lucide-react";

type BannerNotif = {
  id: string;
  title: string;
  message: string;
  order_id: string | null;
};

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [banner, setBanner] = useState<BannerNotif | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const n: any = payload.new;
        setBanner({ id: n.id, title: n.title, message: n.message, order_id: n.order_id ?? null });
        setReply("");
        // Try OS-level notification when tab is hidden / installed PWA
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted" && document.visibilityState !== "visible") {
            try {
              new Notification(n.title, { body: n.message, icon: "/favicon.ico" });
            } catch (_) { /* ignore */ }
          }
        }
        qc.invalidateQueries({ queryKey: ["notif", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  // Auto-dismiss after 20s if user doesn't interact
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 20000);
    return () => clearTimeout(t);
  }, [banner]);

  const sendReply = async () => {
    if (!user || !banner || !reply.trim()) return;
    setSending(true);
    const { error } = await supabase.from("notification_replies").insert({
      notification_id: banner.id,
      user_id: user.id,
      order_id: banner.order_id,
      message: reply.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("Could not send reply");
      return;
    }
    toast.success("Reply sent to support");
    setBanner(null);
    setReply("");
  };

  const Banner = banner ? (
    <div className="fixed top-2 left-2 right-2 z-[60] mx-auto max-w-xl animate-fade-in">
      <div className="rounded-2xl bg-primary text-primary-foreground shadow-elevated p-3 pr-2">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Bell className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="font-bold text-sm truncate">{banner.title}</div>
            <div className="text-xs opacity-90 line-clamp-2">{banner.message}</div>
          </div>
          <button
            aria-label="Dismiss"
            onClick={() => setBanner(null)}
            className="p-1 rounded-full hover:bg-white/15 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2 bg-white/15 rounded-pill pl-3 pr-1 py-1">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
            placeholder="Reply to support…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-primary-foreground/70"
          />
          <button
            onClick={sendReply}
            disabled={sending || !reply.trim()}
            aria-label="Send reply"
            className="h-8 w-8 rounded-full bg-white/25 hover:bg-white/35 flex items-center justify-center disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { Banner };
}