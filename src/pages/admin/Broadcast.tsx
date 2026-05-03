import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, RefreshCw, Volume2 } from "lucide-react";
import { RINGTONES, getAdminTone, setAdminTone, playAdminTone } from "@/hooks/useAdminOrderAlert";

type Hist = {
  id: string; title: string; message: string; url: string | null;
  users_count: number; push_sent: number; created_at: string;
};

export default function AdminBroadcast() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("/notifications");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Hist[]>([]);
  const [tone, setTone] = useState(getAdminTone());

  const loadHistory = async () => {
    const { data } = await supabase.from("broadcast_history")
      .select("*").order("created_at", { ascending: false }).limit(50);
    setHistory((data ?? []) as Hist[]);
  };
  useEffect(() => { loadHistory(); }, []);

  const sendNow = async (t: string, m: string, u: string) => {
    if (!t.trim() || !m.trim()) {
      toast.error("Title and message are required"); return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("send-broadcast", {
      body: { title: t, message: m, url: u },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Sent · ${data?.users ?? 0} users · ${data?.push_sent ?? 0} push delivered`);
    loadHistory();
  };

  const send = async () => {
    await sendNow(title, message, url);
    setTitle(""); setMessage("");
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-extrabold">Send Broadcast</h1>
        <p className="text-sm text-muted-foreground">Push an update or offer to all customers (in-app + browser push).</p>
      </div>

      <div className="bg-card rounded-xl shadow-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-primary" />
          <h2 className="font-bold">New-order ringtone</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {RINGTONES.map((r) => (
            <button
              key={r.id}
              onClick={() => { setTone(r.id); setAdminTone(r.id); playAdminTone(r.id); }}
              className={`px-3 py-1.5 rounded-pill text-sm font-semibold border ${
                tone === r.id ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-muted"
              }`}
            >{r.label}</button>
          ))}
          <button onClick={() => playAdminTone(tone)} className="px-3 py-1.5 rounded-pill text-sm font-semibold border border-input hover:bg-muted">
            ▶ Test
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Plays whenever a new order arrives while the admin tab is open.</p>
      </div>

      <div className="bg-card rounded-xl shadow-card p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="🎉 Weekend Offer" maxLength={80} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Message</label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Flat 20% off on SpeedMart orders today only!" rows={4} maxLength={300} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Click-through URL (optional)</label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/speedmart" />
        </div>
        <Button onClick={send} disabled={busy} className="w-full h-12 rounded-pill">
          <Send className="h-4 w-4 mr-2" /> {busy ? "Sending..." : "Send to all customers"}
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="font-bold">Broadcast history</h2>
        {history.length === 0 && <p className="text-sm text-muted-foreground">No broadcasts sent yet.</p>}
        {history.map((h) => (
          <div key={h.id} className="bg-card rounded-xl shadow-card p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{h.title}</div>
              <div className="text-xs text-muted-foreground line-clamp-2">{h.message}</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {new Date(h.created_at).toLocaleString()} · {h.users_count} users · {h.push_sent} push
              </div>
            </div>
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => sendNow(h.title, h.message, h.url || "/notifications")}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Re-send
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}