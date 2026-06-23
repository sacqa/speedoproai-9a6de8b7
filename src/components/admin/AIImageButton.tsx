import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, Download, RefreshCw, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

type Preset = "square" | "banner" | "hero_banner" | "portrait" | "landscape";
type Context = "product" | "category" | "banner" | "generic";
type Style =
  | "studio"
  | "cinematic"
  | "lifestyle"
  | "minimal"
  | "vibrant"
  | "luxury"
  | "social_post";
type Model = "gemini-3-pro" | "gemini-latest" | "nano-banana" | "gpt-image-2" | "gpt-image-1-mini" | "gpt-2";

interface HistoryItem {
  url: string;
  prompt: string;
  model: Model;
  preset: Preset;
  style: Style;
  at: number;
}
const HISTORY_KEY = "ai-image-history-v1";
const loadHistory = (): HistoryItem[] => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); } catch { return []; }
};
const saveHistory = (h: HistoryItem[]) => {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 40))); } catch {}
};

interface Props {
  onGenerated: (url: string) => void;
  /** Called for each image when generating multiple */
  onGeneratedMany?: (urls: string[]) => void;
  preset?: Preset;
  context?: Context;
  bucket?: "products" | "banners" | "food" | "avatars";
  defaultPrompt?: string;
  label?: string;
  size?: "sm" | "default";
  /** Allow admin to pick how many photos to generate (max 6). */
  allowMultiple?: boolean;
}

export function AIImageButton({
  onGenerated, onGeneratedMany,
  preset = "square", context = "generic", bucket = "products",
  defaultPrompt = "", label = "AI Generate", size = "sm",
  allowMultiple = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number>(1);
  const [style, setStyle] = useState<Style>(context === "product" ? "studio" : context === "banner" ? "cinematic" : "vibrant");
  const [model, setModel] = useState<Model>("gemini-3-pro");
  const normalizePreset = (p: Preset): Preset => (p === "banner" ? "hero_banner" : p);
  const [activePreset, setActivePreset] = useState<Preset>(normalizePreset(preset));
  const [preview, setPreview] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => { if (open) setHistory(loadHistory()); }, [open]);

  const go = async (overridePrompt?: string) => {
    const p = (overridePrompt ?? prompt).trim();
    if (!p) return toast.error("Enter a prompt");
    setBusy(true);
    setPreview([]);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt: p, preset: activePreset, context, bucket, count, style, model },
      });
      if (error) {
        // Surface real server error body (supabase-js swallows non-2xx body).
        const ctx: any = (error as any).context;
        let msg = error.message;
        try {
          const body = await ctx?.json?.();
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }
      const urls: string[] = data?.urls ?? (data?.url ? [data.url] : []);
      if (!urls.length) throw new Error("No image returned");
      setPreview(urls);
      // Save to history
      const next = [
        ...urls.map((u) => ({ url: u, prompt: p, model, preset: activePreset, style, at: Date.now() })),
        ...history,
      ].slice(0, 40);
      setHistory(next);
      saveHistory(next);
      toast.success(urls.length > 1 ? `${urls.length} images generated` : "Image generated");
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("429")) toast.error("Provider busy — please retry in a few seconds");
      else toast.error(msg || "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const useImage = (url: string) => {
    onGenerated(url);
    setOpen(false);
    setPrompt("");
    setPreview([]);
  };
  const useAll = () => {
    if (preview.length > 1 && onGeneratedMany) onGeneratedMany(preview);
    else preview.forEach((u) => onGenerated(u));
    setOpen(false);
    setPrompt("");
    setPreview([]);
  };
  const download = async (url: string) => {
    try {
      const r = await fetch(url);
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ai-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { toast.error("Download failed"); }
  };
  const deleteFromHistory = (i: number) => {
    const next = history.filter((_, idx) => idx !== i);
    setHistory(next);
    saveHistory(next);
  };
  const reuse = (h: HistoryItem) => {
    setPrompt(h.prompt);
    setModel(h.model);
    setActivePreset(h.preset);
    setStyle(h.style);
  };

  const MODELS: { id: Model; label: string; sub: string }[] = [
    { id: "gemini-3-pro", label: "Gemini 3 Pro", sub: "Masterpiece ★" },
    { id: "gemini-latest", label: "Nano Banana 2", sub: "Fast · Pro quality" },
    { id: "nano-banana", label: "Nano Banana", sub: "Photoreal" },
    { id: "gpt-image-2", label: "GPT-Image-2", sub: "OpenAI HQ" },
    { id: "gpt-image-1-mini", label: "GPT-Image-1 Mini", sub: "Fastest" },
    { id: "gpt-2", label: "GPT 2", sub: "OpenAI · Free" },
  ];
  const ALL_PRESETS: { id: Preset; label: string; sub: string }[] = [
    { id: "square", label: "Square", sub: "1024×1024" },
    { id: "portrait", label: "Portrait", sub: "1024×1536" },
    { id: "landscape", label: "Landscape", sub: "1536×1024" },
    { id: "hero_banner", label: "Hero Banner", sub: "1536×768 (2:1)" },
  ];
  // When the caller pins a banner preset, lock the size picker to it so admins always
  // get an image at the exact banner dimensions.
  const PRESETS = preset === "hero_banner" || preset === "banner"
    ? ALL_PRESETS.filter((p) => p.id === "hero_banner")
    : ALL_PRESETS.filter((p) => p.id !== "hero_banner");

  const STYLES: { id: Style; label: string }[] = [
    { id: "studio", label: "Studio" },
    { id: "cinematic", label: "Cinematic" },
    { id: "lifestyle", label: "Lifestyle" },
    { id: "minimal", label: "Minimal" },
    { id: "vibrant", label: "Vibrant" },
    { id: "luxury", label: "Luxury" },
    { id: "social_post", label: "Social Post" },
  ];

  return (
    <>
      <Button type="button" size={size} variant="outline" onClick={() => { setPrompt(defaultPrompt); setActivePreset(normalizePreset(preset)); setPreview([]); setOpen(true); }}>
        <Sparkles className="h-4 w-4 mr-1 text-primary" />{label}
      </Button>
      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent className="max-w-2xl glass-sheet border-white/60 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />AI Image Studio
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700">Unlimited · Free</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Describe the image</Label>
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={context === "product" ? "e.g. Tapal Danedar tea 250g" : context === "banner" ? "e.g. Ramadan grocery sale up to 30% off" : context === "category" ? "e.g. Bakery & breads" : "Describe your image…"}
                onKeyDown={(e) => { if (e.key === "Enter" && !busy) go(); }}
                autoFocus
              />
            </div>

            <div>
              <Label className="mb-1.5 block">Model</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModel(m.id)}
                    className={`p-2 rounded-lg text-left border transition-colors ${
                      model === m.id ? "bg-primary text-primary-foreground border-primary" : "bg-white/60 border-white/60 hover:bg-white"
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">{m.label}</div>
                    <div className={`text-[10px] ${model === m.id ? "opacity-90" : "text-muted-foreground"}`}>{m.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">Size</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePreset(p.id)}
                    className={`p-2 rounded-lg text-left border transition-colors ${
                      activePreset === p.id ? "bg-primary text-primary-foreground border-primary" : "bg-white/60 border-white/60 hover:bg-white"
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">{p.label}</div>
                    <div className={`text-[10px] ${activePreset === p.id ? "opacity-90" : "text-muted-foreground"}`}>{p.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">Creative style</Label>
              <div className="flex flex-wrap gap-1.5">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStyle(s.id)}
                    className={`text-xs px-2.5 py-1.5 rounded-full font-semibold border transition-colors ${
                      style === s.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white/60 border-white/60 text-foreground/80 hover:bg-white"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {allowMultiple && (
              <div>
                <Label className="mb-1.5 block">How many photos?</Label>
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(n)}
                      className={`py-2 rounded-lg text-sm font-bold border transition-colors ${
                        count === n
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white/60 border-white/60 text-foreground/80 hover:bg-white"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={() => go()} disabled={busy} className="w-full">
              {busy ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating {count > 1 ? `${count} photos…` : "…"}</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Generate {count > 1 ? `${count} photos` : ""}</>
              )}
            </Button>

            {/* Preview of newly generated images */}
            {preview.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/40">
                <div className="flex items-center justify-between">
                  <Label>Preview</Label>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => go()}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />Regenerate
                    </Button>
                    <Button size="sm" onClick={useAll}>
                      <Check className="h-3.5 w-3.5 mr-1" />Use {preview.length > 1 ? "all" : ""}
                    </Button>
                  </div>
                </div>
                <div className={`grid gap-2 ${preview.length > 1 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1"}`}>
                  {preview.map((u, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-white/60 bg-white/40">
                      <img src={u} alt={`Preview ${i + 1}`} className="w-full h-auto object-cover" loading="lazy" />
                      <div className="absolute inset-x-0 bottom-0 p-1.5 flex gap-1 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition">
                        <Button size="sm" variant="secondary" className="h-7 px-2 text-xs flex-1" onClick={() => useImage(u)}>
                          <Check className="h-3 w-3 mr-1" />Use
                        </Button>
                        <Button size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={() => download(u)}>
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/40">
                <div className="flex items-center justify-between">
                  <Label>History</Label>
                  <button
                    type="button"
                    className="text-[11px] text-muted-foreground hover:text-destructive"
                    onClick={() => { setHistory([]); saveHistory([]); }}
                  >
                    Clear all
                  </button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-44 overflow-y-auto">
                  {history.map((h, i) => (
                    <div key={i} className="relative group rounded-md overflow-hidden border border-white/60 aspect-square bg-white/40">
                      <img src={h.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-black/55 flex flex-col items-center justify-center gap-1 p-1">
                        <button type="button" onClick={() => useImage(h.url)} className="text-[10px] font-bold text-white bg-primary px-2 py-0.5 rounded-full">Use</button>
                        <button type="button" onClick={() => reuse(h)} className="text-[10px] text-white/90 hover:text-white">Reuse prompt</button>
                        <button type="button" onClick={() => download(h.url)} className="text-[10px] text-white/90 hover:text-white">Download</button>
                        <button type="button" onClick={() => deleteFromHistory(i)} className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/60 hover:bg-destructive">
                          <Trash2 className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}