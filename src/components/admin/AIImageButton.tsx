import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Preset = "square" | "banner" | "portrait";
type Context = "product" | "category" | "banner" | "generic";
type Style =
  | "studio"
  | "cinematic"
  | "lifestyle"
  | "minimal"
  | "vibrant"
  | "luxury"
  | "social_post";

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

  const go = async () => {
    if (!prompt.trim()) return toast.error("Enter a prompt");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt: prompt.trim(), preset, context, bucket, count, style },
      });
      if (error) throw error;
      const urls: string[] = data?.urls ?? (data?.url ? [data.url] : []);
      if (!urls.length) throw new Error("No image returned");
      if (urls.length > 1 && onGeneratedMany) onGeneratedMany(urls);
      else urls.forEach((u) => onGenerated(u));
      toast.success(urls.length > 1 ? `${urls.length} images generated` : "Image generated");
      setOpen(false);
      setPrompt("");
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("429")) toast.error("Rate limit — please try again shortly");
      else if (msg.includes("402")) toast.error("AI credits exhausted — please top up");
      else toast.error(msg || "Generation failed");
    } finally {
      setBusy(false);
    }
  };

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
      <Button type="button" size={size} variant="outline" onClick={() => { setPrompt(defaultPrompt); setOpen(true); }}>
        <Sparkles className="h-4 w-4 mr-1 text-primary" />{label}
      </Button>
      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent className="max-w-md glass-sheet border-white/60">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />AI Image Generation</DialogTitle></DialogHeader>
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
              <p className="text-xs text-muted-foreground mt-1">
                Optimized for {preset === "banner" ? "1536×1024 banner" : preset === "portrait" ? "1024×1536 portrait" : "1024×1024 square"}
              </p>
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

            <Button onClick={go} disabled={busy} className="w-full">
              {busy ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating {count > 1 ? `${count} photos…` : "…"}</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Generate {count > 1 ? `${count} photos` : ""}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}