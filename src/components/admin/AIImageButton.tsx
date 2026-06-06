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

interface Props {
  onGenerated: (url: string) => void;
  preset?: Preset;
  context?: Context;
  bucket?: "products" | "banners" | "food" | "avatars";
  defaultPrompt?: string;
  label?: string;
  size?: "sm" | "default";
}

export function AIImageButton({ onGenerated, preset = "square", context = "generic", bucket = "products", defaultPrompt = "", label = "AI Generate", size = "sm" }: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!prompt.trim()) return toast.error("Enter a prompt");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt: prompt.trim(), preset, context, bucket },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No image returned");
      onGenerated(data.url);
      toast.success("Image generated");
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

  return (
    <>
      <Button type="button" size={size} variant="outline" onClick={() => { setPrompt(defaultPrompt); setOpen(true); }}>
        <Sparkles className="h-4 w-4 mr-1 text-primary" />{label}
      </Button>
      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />AI Image Generation</DialogTitle></DialogHeader>
          <div className="space-y-3">
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
            <Button onClick={go} disabled={busy} className="w-full">
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</> : <><Sparkles className="h-4 w-4 mr-2" />Generate</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}