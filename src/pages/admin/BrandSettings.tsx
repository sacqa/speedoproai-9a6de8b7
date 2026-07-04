import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, ImageIcon, RotateCcw } from "lucide-react";
import { DEFAULT_CARD_SETTINGS, type ProductCardSettings } from "@/hooks/useBrandSettings";
import defaultLogo from "@/assets/speedo-logo.png.asset.json";

export default function BrandSettings() {
  const qc = useQueryClient();
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [card, setCard] = useState<ProductCardSettings>(DEFAULT_CARD_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const [{ data: brand }, { data: cardRow }] = await Promise.all([
        supabase.from("app_settings").select("value").eq("key", "brand").maybeSingle(),
        supabase.from("app_settings").select("value").eq("key", "product_card").maybeSingle(),
      ]);
      const b = (brand?.value ?? {}) as { logo_url?: string };
      setLogoUrl(b.logo_url ?? "");
      setCard({ ...DEFAULT_CARD_SETTINGS, ...((cardRow?.value ?? {}) as any) });
      setLoading(false);
    })();
  }, []);

  const onFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Please pick an image file");
    if (file.size > 3 * 1024 * 1024) return toast.error("Max 3 MB");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `brand/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("banners").upload(path, file, {
        cacheControl: "3600", upsert: true, contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("banners").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error } = await supabase.from("app_settings").upsert({ key: "brand", value: { logo_url: url } as any });
      if (error) throw error;
      setLogoUrl(url);
      qc.invalidateQueries({ queryKey: ["app_settings", "brand"] });
      toast.success("Logo updated — it now applies everywhere.");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const resetLogo = async () => {
    const { error } = await supabase.from("app_settings").upsert({ key: "brand", value: { logo_url: "" } as any });
    if (error) return toast.error(error.message);
    setLogoUrl("");
    qc.invalidateQueries({ queryKey: ["app_settings", "brand"] });
    toast.success("Reset to default logo");
  };

  const saveCard = async () => {
    setSavingCard(true);
    const { error } = await supabase.from("app_settings").upsert({ key: "product_card", value: card as any });
    setSavingCard(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["app_settings", "product_card"] });
    toast.success("Product card display saved");
  };

  if (loading) return <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading…</div>;

  const preview = logoUrl || defaultLogo.url;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Brand & Display</h1>
        <p className="text-sm text-muted-foreground">Update the global logo and choose what appears on product cards.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="h-4 w-4" />Global logo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-20 w-40 rounded-xl bg-muted flex items-center justify-center overflow-hidden border">
              <img src={preview} alt="Logo preview" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="text-xs text-muted-foreground">
              {logoUrl ? "Custom logo (used everywhere)." : "Using default bundled logo."}
              <div className="mt-1">Recommended: transparent PNG or SVG, ~400×120px.</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</> : <><Upload className="h-4 w-4 mr-2" />Upload new logo</>}
            </Button>
            {logoUrl && (
              <Button variant="outline" onClick={resetLogo}><RotateCcw className="h-4 w-4 mr-2" />Reset to default</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Product card display</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Toggle label="Category badge" checked={card.show_category} onChange={(v) => setCard({ ...card, show_category: v })} />
          <Toggle label="Unit label" checked={card.show_unit} onChange={(v) => setCard({ ...card, show_unit: v })} />
          <Toggle label="Price" checked={card.show_price} onChange={(v) => setCard({ ...card, show_price: v })} />
          <Toggle label="Product name" checked={card.show_name} onChange={(v) => setCard({ ...card, show_name: v })} />
          <Toggle label="Favorite (heart) button" checked={card.show_favorite} onChange={(v) => setCard({ ...card, show_favorite: v })} />
          <Toggle label="Add-to-cart button" checked={card.show_add_button} onChange={(v) => setCard({ ...card, show_add_button: v })} />
        </CardContent>
      </Card>

      <Button onClick={saveCard} disabled={savingCard} className="w-full sm:w-auto">
        {savingCard ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save display settings"}
      </Button>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5">
      <Label className="text-sm font-semibold cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}