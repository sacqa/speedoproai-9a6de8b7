import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";

interface Msg {
  id: string;
  order_id: string;
  user_id: string;
  author_role: string;
  message: string;
  created_at: string;
}

interface Props {
  orderId: string;
  asAdmin?: boolean;
  compact?: boolean;
}

export default function InstructionsThread({ orderId, asAdmin = false, compact = false }: Props) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("order_instructions")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    setMsgs((data ?? []) as Msg[]);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`order-instructions-${orderId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_instructions", filter: `order_id=eq.${orderId}` },
        (payload) => setMsgs((prev) => [...prev, payload.new as Msg]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs.length]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    if (trimmed.length > 1000) { toast.error("Message too long"); return; }
    setBusy(true);
    const { error } = await supabase.from("order_instructions").insert({
      order_id: orderId,
      user_id: user.id,
      author_role: asAdmin ? "admin" : "customer",
      message: trimmed,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setText("");
  };

  return (
    <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h2 className="font-bold">Order Instructions</h2>
      </div>
      <div className={`space-y-2 overflow-y-auto ${compact ? "max-h-48" : "max-h-72"}`}>
        {msgs.length === 0 && (
          <p className="text-xs text-muted-foreground">No messages yet. Add notes or special requests for this order.</p>
        )}
        {msgs.map((m) => {
          const mine = m.author_role === (asAdmin ? "admin" : "customer");
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                  m.author_role === "admin"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <div className="text-[10px] opacity-70 mb-0.5 uppercase tracking-wide">
                  {m.author_role === "admin" ? "Speedo Team" : "Customer"} ·{" "}
                  {new Date(m.created_at).toLocaleString()}
                </div>
                {m.message}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 items-end">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 1000))}
          placeholder={asAdmin ? "Reply to customer…" : "Add note, change item, or ask a question…"}
          className="min-h-[44px] max-h-32 resize-none"
          rows={1}
        />
        <Button onClick={send} disabled={busy || !text.trim()} className="h-11 rounded-pill px-4 gap-1">
          <Send className="h-4 w-4" /> Send
        </Button>
      </div>
    </div>
  );
}