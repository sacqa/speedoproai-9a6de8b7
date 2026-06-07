import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { BellRing, Send, X, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

type BannerNotif = {
  id: string;
  title: string;
  message: string;
  order_id: string | null;
};

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [banner, setBanner] = useState<BannerNotif | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);

  // Unlock audio on first user gesture (iOS/Android autoplay policy)
  useEffect(() => {
    const unlock = async () => {
      if (unlockedRef.current) return;
      try {
        const a = new Audio("/sounds/shopify.mp3");
        a.preload = "auto"; a.muted = true; a.volume = 0;
        await a.play().catch(() => {});
        a.pause(); a.currentTime = 0; a.muted = false; a.volume = 0.85;
        audioRef.current = a;
        unlockedRef.current = true;
      } catch {}
    };
    window.addEventListener("pointerdown", unlock, { passive: true, once: false });
    window.addEventListener("touchstart", unlock, { passive: true, once: false });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  const playTone = () => {
    // Customer-side: keep silent on mobile (no ringtone, no vibration).
    // Audio is reserved for admin order alerts.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) return;
    const el = audioRef.current ?? new Audio("/sounds/shopify.mp3");
    el.currentTime = 0; el.volume = 0.85;
    el.play().catch(() => {});
  };

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
        playTone();
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
    <div className="fixed top-3 left-3 right-3 z-[60] mx-auto max-w-md animate-fade-in safe-top">
      <div
        className="glass-card p-3 pr-2 cursor-pointer"
        onClick={() => banner.order_id && navigate(`/orders/${banner.order_id}`)}
      >
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shrink-0 shadow-elevated">
            <BellRing className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="flex items-center gap-1.5">
              <Package className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Order Update</span>
            </div>
            <div className="font-bold text-sm text-foreground truncate">{banner.title}</div>
            <div className="text-xs text-muted-foreground line-clamp-2">{banner.message}</div>
          </div>
          <button
            aria-label="Dismiss"
            onClick={(e) => { e.stopPropagation(); setBanner(null); }}
            className="p-1.5 rounded-full hover:bg-muted shrink-0 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          className="mt-2.5 flex items-center gap-2 neu-inset rounded-pill pl-4 pr-1 py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
            placeholder="Reply to support…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          <button
            onClick={sendReply}
            disabled={sending || !reply.trim()}
            aria-label="Send reply"
            className="h-8 w-8 rounded-full btn-glossy flex items-center justify-center disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { Banner };
}