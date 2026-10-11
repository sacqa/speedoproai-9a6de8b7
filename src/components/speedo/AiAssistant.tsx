import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { MessageCircleHeart, X, Send, Square, RotateCcw, Plus } from "lucide-react";
import { useCart } from "@/store/cart";
import { formatPKR } from "@/lib/format";
import { toast } from "sonner";

const KEY = "speedo-ai-chat";
const loadMsgs = (): UIMessage[] => {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};

type Prod = { id: string; name: string; price: number; unit: string | null; image_url: string | null; stock: number };

function ProductMini({ p }: { p: Prod }) {
  const add = useCart((s) => s.add);
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card p-2">
      <img src={p.image_url ?? "/placeholder.svg"} alt={p.name} loading="lazy"
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
        className="h-12 w-12 rounded-lg object-contain bg-muted shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold line-clamp-1">{p.name}</div>
        <div className="text-xs text-primary font-bold tabular-nums">{formatPKR(p.price)}{p.unit && <span className="text-muted-foreground font-medium"> / {p.unit}</span>}</div>
      </div>
      <button type="button" aria-label={`Add ${p.name}`}
        onClick={() => { add({ product_id: p.id, name: p.name, price: Number(p.price), unit: p.unit, image_url: p.image_url }); toast.success("Added to cart", { description: p.name }); }}
        className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold inline-flex items-center gap-1 active:scale-95 shrink-0">
        <Plus className="h-3.5 w-3.5" strokeWidth={3} /> Add
      </button>
    </div>
  );
}

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const initial = useMemo(loadMsgs, []);

  const transport = useMemo(() => new DefaultChatTransport({
    api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-shop`,
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: () => ({ mode: "chat", cart: useCart.getState().items.map((i) => i.product_id) }),
  }), []);

  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    id: "speedo-assistant",
    messages: initial,
    transport,
    onError: (e) => {
      let msg = e.message;
      try { msg = JSON.parse(msg).error ?? msg; } catch { /* plain text */ }
      toast.error(msg || "Assistant unavailable, please try again.");
    },
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (status === "ready" || status === "error") localStorage.setItem(KEY, JSON.stringify(messages.slice(-40)));
  }, [messages, status]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages, status, open]);
  useEffect(() => { if (open && !busy) inputRef.current?.focus(); }, [open, busy]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    sendMessage({ text: t });
    setInput("");
  };

  const suggestions = ["Breakfast ke liye kya lun?", "Suggest snacks for guests", "Healthy fruits under Rs 300"];

  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} aria-label="Open shopping assistant"
          className="fixed z-40 right-4 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] lg:bottom-6 lg:right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform">
          <MessageCircleHeart className="h-6 w-6" />
        </button>
      )}
      {open && (
        <div className="fixed z-50 inset-0 sm:inset-auto sm:right-4 sm:bottom-4 lg:right-6 lg:bottom-6 sm:w-[400px] sm:h-[min(640px,calc(100vh-2rem))] bg-background sm:rounded-3xl sm:border border-border shadow-2xl flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] sm:pt-0">
          <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <span className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center"><MessageCircleHeart className="h-5 w-5" /></span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold leading-tight">Speedo Assistant</div>
              <div className="text-[11px] text-muted-foreground">AI-powered shopping help</div>
            </div>
            {messages.length > 0 && (
              <button type="button" aria-label="New conversation" onClick={() => { stop(); setMessages([]); localStorage.removeItem(KEY); }}
                className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center"><RotateCcw className="h-4 w-4" /></button>
            )}
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center"><X className="h-5 w-5" /></button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center pt-6">
                <p className="text-sm text-muted-foreground mb-4">Assalam-o-Alaikum! Ask me what to buy — I'll suggest products from our store.</p>
                <div className="flex flex-col gap-2">
                  {suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} className="text-sm rounded-full border border-border px-4 py-2 hover:bg-muted">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : "space-y-2"}>
                {m.parts.map((part: any, i) => {
                  if (part.type === "text") {
                    return m.role === "user"
                      ? <div key={i} className="max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-3.5 py-2 text-sm whitespace-pre-wrap">{part.text}</div>
                      : <div key={i} className="prose prose-sm max-w-none text-foreground"><ReactMarkdown>{part.text}</ReactMarkdown></div>;
                  }
                  if (part.type === "tool-show_products" && part.state === "output-available") {
                    return <div key={i} className="space-y-2">{(part.output?.products ?? []).map((p: Prod) => <ProductMini key={p.id} p={p} />)}</div>;
                  }
                  return null;
                })}
              </div>
            ))}
            {status === "submitted" && (
              <div className="flex gap-1 items-center text-muted-foreground" aria-label="Assistant is typing">
                <span className="h-2 w-2 rounded-full bg-current animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:120ms]" />
                <span className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:240ms]" />
              </div>
            )}
            {error && !busy && <p className="text-xs text-destructive">Something went wrong. Please try again.</p>}
            <div ref={endRef} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t border-border p-3 flex items-end gap-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3">
            <textarea ref={inputRef} rows={1} value={input} autoFocus
              onChange={(e) => setInput(e.target.value.slice(0, 500))}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Ask for product suggestions…"
              className="flex-1 resize-none max-h-32 rounded-2xl bg-muted/60 px-4 py-2.5 text-base sm:text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            {busy ? (
              <button type="button" onClick={stop} aria-label="Stop" className="h-11 w-11 shrink-0 rounded-full bg-muted flex items-center justify-center"><Square className="h-4 w-4" /></button>
            ) : (
              <button type="submit" disabled={!input.trim()} aria-label="Send" className="h-11 w-11 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"><Send className="h-4 w-4" /></button>
            )}
          </form>
        </div>
      )}
    </>
  );
}
