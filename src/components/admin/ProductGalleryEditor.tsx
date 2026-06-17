import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Star, Trash2, Upload, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { AIImageButton } from "@/components/admin/AIImageButton";

type Img = { id: string; image_url: string; sort_order: number; is_primary: boolean };

export function ProductGalleryEditor({ productId }: { productId: string }) {
  const [images, setImages] = useState<Img[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true });
    setLoading(false);
    if (error) return toast.error(error.message);
    setImages((data ?? []) as Img[]);
  };

  useEffect(() => { load(); }, [productId]);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      return toast.error("Please choose an image file (JPG, PNG, WebP).");
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Image must be 5MB or less.");
    }
    // Optional aspect-ratio hint (recommend square)
    try {
      const dims = await new Promise<{ w: number; h: number }>((res, rej) => {
        const img = new Image();
        img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = rej;
        img.src = URL.createObjectURL(file);
      });
      if (dims.w < 400 || dims.h < 400) {
        toast.warning(`Low resolution (${dims.w}×${dims.h}). 800×800+ recommended.`);
      }
    } catch { /* ignore */ }
    setUploading(true);
    try {
      const path = `${productId}/${Date.now()}-${file.name.replace(/\s/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("products").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("products").getPublicUrl(path);
      const { error } = await supabase.from("product_images").insert({
        product_id: productId,
        image_url: data.publicUrl,
        sort_order: images.length,
        is_primary: images.length === 0,
      });
      if (error) throw error;
      toast.success("Image added");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("product_images").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await load();
  };

  const addUrls = async (urls: string[]) => {
    if (!urls.length) return;
    const base = images.length;
    const rows = urls.map((image_url, i) => ({
      product_id: productId,
      image_url,
      sort_order: base + i,
      is_primary: base === 0 && i === 0,
    }));
    const { error } = await supabase.from("product_images").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`${urls.length} AI image${urls.length > 1 ? "s" : ""} added`);
    await load();
  };

  const setPrimary = async (id: string) => {
    await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
    const { error } = await supabase.from("product_images").update({ is_primary: true }).eq("id", id);
    if (error) return toast.error(error.message);
    await load();
  };

  const reorder = async (id: string, delta: number) => {
    const idx = images.findIndex((i) => i.id === id);
    const swapIdx = idx + delta;
    if (idx < 0 || swapIdx < 0 || swapIdx >= images.length) return;
    const a = images[idx], b = images[swapIdx];
    await supabase.from("product_images").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("product_images").update({ sort_order: a.sort_order }).eq("id", b.id);
    await load();
  };

  if (loading) return <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading gallery…</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <span className="text-xs text-muted-foreground">Add multiple images for the swipeable gallery.</span>
        <div className="flex items-center gap-2 flex-wrap">
          <AIImageButton
            context="product"
            preset="square"
            bucket="products"
            allowMultiple
            label="AI Generate"
            onGenerated={(url) => addUrls([url])}
            onGeneratedMany={(urls) => addUrls(urls)}
          />
          <label>
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <Button asChild size="sm" variant="outline" disabled={uploading}>
              <span>{uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Uploading…</> : <><Upload className="h-4 w-4 mr-1" />Add image</>}</span>
            </Button>
          </label>
        </div>
      </div>
      {images.length === 0 && <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">No gallery images. Falls back to main image.</div>}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {images.map((img, i) => (
          <div key={img.id} className="relative group rounded-lg overflow-hidden border bg-card">
            <img src={img.image_url} alt="" className="aspect-square w-full object-cover" />
            {img.is_primary && (
              <span className="absolute top-1 left-1 text-[9px] font-bold uppercase bg-primary text-primary-foreground px-1.5 py-0.5 rounded">Primary</span>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-center gap-1 p-1.5 opacity-0 group-hover:opacity-100">
              <button onClick={() => setPrimary(img.id)} className="h-7 w-7 rounded bg-white/95 flex items-center justify-center text-foreground hover:bg-white" aria-label="Set primary"><Star className="h-3.5 w-3.5" /></button>
              <button onClick={() => reorder(img.id, -1)} disabled={i === 0} className="h-7 w-7 rounded bg-white/95 flex items-center justify-center text-foreground hover:bg-white disabled:opacity-40" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button onClick={() => reorder(img.id, 1)} disabled={i === images.length - 1} className="h-7 w-7 rounded bg-white/95 flex items-center justify-center text-foreground hover:bg-white disabled:opacity-40" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
              <button onClick={() => remove(img.id)} className="h-7 w-7 rounded bg-destructive flex items-center justify-center text-destructive-foreground" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}