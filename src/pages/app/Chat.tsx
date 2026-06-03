import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";

export default function Chat() {
  const { friendId } = useParams();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  const friend = useQuery({
    queryKey: ["chat-friend", friendId],
    enabled: !!friendId,
    queryFn: async () => (await supabase.from("profiles").select("id, full_name").eq("id", friendId!).maybeSingle()).data,
  });

  const msgs = useQuery({
    queryKey: ["chat", user?.id, friendId],
    enabled: !!user && !!friendId,
    queryFn: async () => {
      const { data } = await supabase.from("chat_messages").select("*")
        .or(`and(sender_id.eq.${user!.id},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${user!.id})`)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [msgs.data]);

  useEffect(() => {
    if (!user || !friendId) return;
    const ch = supabase.channel(`chat:${user.id}:${friendId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => msgs.refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, friendId]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    const { error } = await supabase.from("chat_messages").insert({
      sender_id: user!.id, recipient_id: friendId!, body,
    });
    if (error) { toast.error(error.message); setText(body); }
    else msgs.refetch();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] lg:h-[calc(100vh-7rem)] max-w-md mx-auto">
      <div className="flex items-center gap-2 p-3 border-b border-border bg-card">
        <Link to="/friends"><Button size="icon" variant="ghost"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
          {friend.data?.full_name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="font-semibold">{friend.data?.full_name ?? "Chat"}</div>
      </div>
      <div ref={scroller} className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/30">
        {(msgs.data ?? []).map((m: any) => {
          const mine = m.sender_id === user!.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                {m.body}
                <div className={`text-[10px] mt-0.5 ${mine ? "opacity-75" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
        {(msgs.data ?? []).length === 0 && <div className="text-center text-sm text-muted-foreground py-8">Say hi 👋</div>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 p-3 border-t border-border bg-card">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" className="flex-1" />
        <Button type="submit" size="icon" disabled={!text.trim()}><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}