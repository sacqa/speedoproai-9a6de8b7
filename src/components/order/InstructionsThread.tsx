import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquare, Send, Paperclip, X, ImageIcon } from "lucide-react";
import { compressImage } from "@/lib/imageCompress";

interface Msg {
  id: string;
  order_id: string;
  user_id: string;
  author_role: string;
  message: string;
  image_url?: string | null;
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
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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
    if (asAdmin) {
      (async () => {
        const { data: o } = await supabase.from("orders").select("user_id").eq("id", orderId).maybeSingle();
        if (!o?.user_id) return;
        const { data: p } = await supabase.from("profiles").select("phone").eq("id", o.user_id).maybeSingle();
        setCustomerPhone(p?.phone ?? null);
      })();
    }
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
    if ((!trimmed && !pendingFile) || !user) return;
    if (trimmed.length > 1000) { toast.error("Message too long"); return; }
    setBusy(true);
    let image_url: string | null = null;
    if (pendingFile) {
      let toUpload = pendingFile;
      try {
        toUpload = await compressImage(pendingFile, { maxDimension: 1280, quality: 0.78 });
      } catch { /* fall back to original */ }
      const ext = toUpload.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${orderId}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("order-images").upload(path, toUpload, {
        cacheControl: "3600", upsert: false, contentType: toUpload.type,
      });
      if (up.error) {
        setBusy(false);
        toast.error("Image upload failed: " + up.error.message);
        return;
      }
      image_url = supabase.storage.from("order-images").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("order_instructions").insert({
      order_id: orderId,
      user_id: user.id,
      author_role: asAdmin ? "admin" : "customer",
      message: trimmed || (image_url ? "📷 Photo" : ""),
      image_url,
    } as any);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setText("");
    setPendingFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onPickFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Please pick an image"); return; }
    if (f.size > 8 * 1024 * 1024) { toast.error("Max 8 MB"); return; }
    setPendingFile(f);
    const r = new FileReader();
    r.onload = (e) => setPreview(e.target?.result as string);
    r.readAsDataURL(f);
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
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words space-y-1.5 ${
                  m.author_role === "admin"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <div className="text-[10px] opacity-70 mb-0.5 uppercase tracking-wide">
                  {m.author_role === "admin" ? "Speedo Team" : "Customer"}
                  {asAdmin && m.author_role !== "admin" && customerPhone && (
                    <> · 📞 +92 {customerPhone}</>
                  )}
                  {" · "}{new Date(m.created_at).toLocaleString()}
                </div>
                {m.image_url && (
                  <a href={m.image_url} target="_blank" rel="noreferrer" className="block">
                    <img
                      src={m.image_url}
                      alt="Attachment"
                      className="rounded-xl max-h-56 object-cover w-full"
                      loading="lazy"
                    />
                  </a>
                )}
                {m.message}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {preview && (
        <div className="relative inline-block">
          <img src={preview} alt="preview" className="h-20 w-20 rounded-xl object-cover border border-border" />
          <button
            onClick={() => { setPendingFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-card"
            aria-label="Remove image"
          ><X className="h-3 w-3" /></button>
        </div>
      )}
      <div className="flex gap-2 items-end">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileRef.current?.click()}
          className="h-11 w-11 rounded-full shrink-0"
          aria-label="Attach photo"
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 1000))}
          placeholder={asAdmin ? "Reply to customer…" : "Add note, change item, or ask a question…"}
          className="min-h-[44px] max-h-32 resize-none"
          rows={1}
        />
        <Button onClick={send} disabled={busy || (!text.trim() && !pendingFile)} className="h-11 rounded-pill px-4 gap-1">
          <Send className="h-4 w-4" /> Send
        </Button>
      </div>
    </div>
  );
}