import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

export default function AdminChats() {
  const [q, setQ] = useState("");
  const data = useQuery({
    queryKey: ["admin","chats"],
    queryFn: async () => {
      const { data: msgs } = await supabase.from("chat_messages")
        .select("*").order("created_at", { ascending: false }).limit(500);
      const ids = Array.from(new Set((msgs ?? []).flatMap((m: any) => [m.sender_id, m.recipient_id])));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name, phone").in("id", ids)
        : { data: [] as any[] };
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (msgs ?? []).map((m: any) => ({ ...m, sender: map.get(m.sender_id), recipient: map.get(m.recipient_id) }));
    },
  });
  const rows = (data.data ?? []).filter((m: any) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return [m.sender?.full_name, m.recipient?.full_name, m.sender?.phone, m.recipient?.phone, m.body]
      .some((x: any) => (x ?? "").toLowerCase().includes(s));
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Customer Chats</h1>
      <Input placeholder="Search name, phone or message…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border">
            <tr><th className="text-left p-3">From</th><th className="text-left">To</th><th className="text-left">Message</th><th className="text-right p-3">When</th></tr>
          </thead>
          <tbody>
            {rows.map((m: any) => (
              <tr key={m.id} className="border-b border-border last:border-0">
                <td className="p-3"><div className="font-semibold">{m.sender?.full_name ?? "—"}</div><div className="text-xs text-muted-foreground">{m.sender?.phone}</div></td>
                <td><div className="font-semibold">{m.recipient?.full_name ?? "—"}</div><div className="text-xs text-muted-foreground">{m.recipient?.phone}</div></td>
                <td className="max-w-md"><div className="truncate">{m.body}</div></td>
                <td className="text-right p-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(m.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-muted-foreground">No messages</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}