import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send } from "lucide-react";

export default function AdminBroadcast() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("/notifications");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required"); return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("send-broadcast", {
      body: { title, message, url },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Sent · ${data?.users ?? 0} users · ${data?.push_sent ?? 0} push delivered`);
    setTitle(""); setMessage("");
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-extrabold">Send Broadcast</h1>
        <p className="text-sm text-muted-foreground">Push an update or offer to all customers (in-app + browser push).</p>
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
    </div>
  );
}