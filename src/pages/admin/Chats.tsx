import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { MessageCircle, ArrowLeft } from "lucide-react";

type Msg = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string };
type Profile = { id: string; full_name: string | null; phone: string | null; avatar_url?: string | null };

export default function AdminChats() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const data = useQuery({
    queryKey: ["admin", "chats"],
    queryFn: async () => {
      const { data: msgs } = await supabase.from("chat_messages")
        .select("*").order("created_at", { ascending: true }).limit(2000);
      const ids = Array.from(new Set((msgs ?? []).flatMap((m: any) => [m.sender_id, m.recipient_id])));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name, phone, avatar_url").in("id", ids)
        : { data: [] as Profile[] };
      return { msgs: (msgs ?? []) as Msg[], profiles: new Map((profs ?? []).map((p: any) => [p.id, p as Profile])) };
    },
  });

  const { profiles, conversations } = useMemo(() => {
    const profiles = data.data?.profiles ?? new Map<string, Profile>();
    const map = new Map<string, { user: Profile; lastMsg: Msg; count: number }>();
    for (const m of data.data?.msgs ?? []) {
      for (const uid of [m.sender_id, m.recipient_id]) {
        const p = profiles.get(uid);
        if (!p) continue;
        const prev = map.get(uid);
        if (!prev || new Date(m.created_at) > new Date(prev.lastMsg.created_at)) {
          map.set(uid, { user: p, lastMsg: m, count: (prev?.count ?? 0) + 1 });
        } else {
          prev.count++;
        }
      }
    }
    const list = Array.from(map.values()).sort((a, b) => +new Date(b.lastMsg.created_at) - +new Date(a.lastMsg.created_at));
    return { profiles, conversations: list };
  }, [data.data]);

  const filtered = conversations.filter((c) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return [c.user.full_name, c.user.phone, c.lastMsg.body].some((x) => (x ?? "").toLowerCase().includes(s));
  });

  const activeMsgs = useMemo(() => {
    if (!selected) return [];
    return (data.data?.msgs ?? []).filter((m) => m.sender_id === selected || m.recipient_id === selected);
  }, [selected, data.data]);
  const activeUser = selected ? profiles.get(selected) : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold flex items-center gap-2"><MessageCircle className="h-6 w-6 text-primary" /> Customer Chats</h1>

      <div className="grid md:grid-cols-[320px_1fr] gap-4 bg-card rounded-2xl shadow-card overflow-hidden h-[70vh]">
        {/* Sidebar */}
        <div className={`border-r border-border flex flex-col ${selected ? "hidden md:flex" : "flex"}`}>
          <div className="p-3 border-b border-border">
            <Input placeholder="Search customers…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.user.id}
                onClick={() => setSelected(c.user.id)}
                className={`w-full text-left flex items-center gap-3 px-3 py-3 border-b border-border hover:bg-muted/60 transition-colors ${selected === c.user.id ? "bg-primary/10" : ""}`}
              >
                <div className="h-11 w-11 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 overflow-hidden">
                  {c.user.avatar_url ? <img src={c.user.avatar_url} alt="" className="h-full w-full object-cover" /> : (c.user.full_name?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold truncate">{c.user.full_name ?? c.user.phone ?? "Unknown"}</div>
                    <div className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(c.lastMsg.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{c.lastMsg.body}</div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && <div className="text-center text-muted-foreground text-sm p-8">No conversations yet</div>}
          </div>
        </div>

        {/* Conversation */}
        <div className={`flex flex-col ${selected ? "flex" : "hidden md:flex"}`}>
          {activeUser ? (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-muted/40">
                <button className="md:hidden" onClick={() => setSelected(null)}><ArrowLeft className="h-5 w-5" /></button>
                <div className="h-10 w-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center overflow-hidden">
                  {activeUser.avatar_url ? <img src={activeUser.avatar_url} alt="" className="h-full w-full object-cover" /> : (activeUser.full_name?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold truncate">{activeUser.full_name ?? "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">{activeUser.phone}</div>
                </div>
                <div className="ml-auto text-xs text-muted-foreground">{activeMsgs.length} messages</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ background: "linear-gradient(180deg, hsl(var(--muted)/.25), transparent)" }}>
                {activeMsgs.map((m) => {
                  const fromCustomer = m.sender_id === selected;
                  const other = profiles.get(fromCustomer ? m.recipient_id : m.sender_id);
                  return (
                    <div key={m.id} className={`flex ${fromCustomer ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${fromCustomer ? "bg-card border border-border rounded-tl-sm" : "bg-primary text-primary-foreground rounded-tr-sm"}`}>
                        <div className="text-[10px] opacity-70 mb-0.5">{fromCustomer ? activeUser.full_name : `→ ${other?.full_name ?? "Unknown"}`}</div>
                        <div className="whitespace-pre-wrap break-words">{m.body}</div>
                        <div className={`text-[10px] mt-1 ${fromCustomer ? "text-muted-foreground" : "opacity-80"}`}>{new Date(m.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  );
                })}
                {activeMsgs.length === 0 && <div className="text-center text-muted-foreground text-sm p-8">No messages</div>}
              </div>
              <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground text-center bg-muted/30">
                Admin view — read only
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a customer to view conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}