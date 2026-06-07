import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatPKR } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Download, Upload, FileText, Sparkles, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AIImageButton } from "@/components/admin/AIImageButton";

type Product = { id: string; name: string; description: string | null; price: number; compare_price: number | null; stock: number; unit: string | null; image_url: string | null; category_id: string | null; is_active: boolean; is_featured: boolean; };

const empty = { name: "", description: "", price: 0, compare_price: null as number | null, stock: 100, unit: "", image_url: "", category_id: "", is_active: true, is_featured: false };

const PAGE_SIZE = 25;

const UNIT_PRESETS = ["kg", "g", "litre", "ml", "pcs", "pack", "dozen", "bottle", "box"];

const CSV_HEADERS = ["name","description","price","compare_price","stock","unit","image_url","category_slug","is_active","is_featured"];

function csvEscape(v: any) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let cur: string[] = []; let val = ""; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i+1] === '"') { val += '"'; i++; }
      else if (c === '"') inQ = false;
      else val += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { cur.push(val); val = ""; }
      else if (c === "\n") { cur.push(val); rows.push(cur); cur = []; val = ""; }
      else if (c !== "\r") val += c;
    }
  }
  if (val.length || cur.length) { cur.push(val); rows.push(cur); }
  return rows.filter(r => r.some(x => x.trim() !== ""));
}

export default function AdminProducts() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Product> & { id?: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [aiBulkBusy, setAiBulkBusy] = useState(false);
  const [aiProgress, setAiProgress] = useState<{ done: number; total: number } | null>(null);
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const update = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => { if (v === null || v === "") p.delete(k); else p.set(k, v); });
    setParams(p, { replace: true });
  };

  const cats = useQuery({ queryKey: ["admin","cats"], queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [] });
  const prods = useQuery({ queryKey: ["admin","prods"], queryFn: async () => (await supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false })).data ?? [] });

  const downloadCsv = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  const exportCsv = () => {
    const slugMap = new Map((cats.data ?? []).map((c: any) => [c.id, c.slug]));
    const rows = [CSV_HEADERS.join(",")];
    (prods.data ?? []).forEach((p: any) => {
      rows.push([
        p.name, p.description ?? "", p.price, p.compare_price ?? "", p.stock,
        p.unit ?? "", p.image_url ?? "", slugMap.get(p.category_id) ?? "",
        p.is_active, p.is_featured,
      ].map(csvEscape).join(","));
    });
    downloadCsv(`products-${new Date().toISOString().slice(0,10)}.csv`, rows.join("\n"));
  };
  const downloadSample = () => {
    const sample = [
      CSV_HEADERS.join(","),
      `Sample Tea,"Premium black tea, 250g pack",450,500,100,250g,,grocery,true,false`,
      `Sample Milk,Fresh full-cream milk,180,,50,litre,,grocery,true,true`,
    ].join("\n");
    downloadCsv("products-sample.csv", sample);
  };
  const importCsv = async (file: File) => {
    setBulkBusy(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) { toast.error("CSV is empty"); return; }
      const headers = rows[0].map(h => h.trim().toLowerCase());
      const idx = (k: string) => headers.indexOf(k);
      const need = ["name","price"]; for (const k of need) if (idx(k) < 0) { toast.error(`Missing column: ${k}`); return; }
      const slugToId = new Map((cats.data ?? []).map((c: any) => [String(c.slug).toLowerCase(), c.id]));
      const payload: any[] = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const name = (r[idx("name")] ?? "").trim();
        const price = Number(r[idx("price")]);
        if (!name || !price) continue;
        const slug = (r[idx("category_slug")] ?? "").trim().toLowerCase();
        payload.push({
          name,
          description: idx("description") >= 0 ? (r[idx("description")] || null) : null,
          price,
          compare_price: idx("compare_price") >= 0 && r[idx("compare_price")] ? Number(r[idx("compare_price")]) : null,
          stock: idx("stock") >= 0 && r[idx("stock")] ? Number(r[idx("stock")]) : 100,
          unit: idx("unit") >= 0 ? (r[idx("unit")] || null) : null,
          image_url: idx("image_url") >= 0 ? (r[idx("image_url")] || null) : null,
          category_id: slug ? (slugToId.get(slug) ?? null) : null,
          is_active: idx("is_active") >= 0 ? !/^(false|0|no)$/i.test(r[idx("is_active")] ?? "true") : true,
          is_featured: idx("is_featured") >= 0 ? /^(true|1|yes)$/i.test(r[idx("is_featured")] ?? "") : false,
        });
      }
      if (!payload.length) { toast.error("No valid rows"); return; }
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success(`Imported ${payload.length} product(s)`);
      prods.refetch();
    } finally { setBulkBusy(false); }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected product(s)?`)) return;
    setBulkBusy(true);
    const { error } = await supabase.from("products").delete().in("id", Array.from(selected));
    setBulkBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Deleted ${selected.size}`); setSelected(new Set()); prods.refetch();
  };
  const bulkUpdate = async (patch: { is_active?: boolean; is_featured?: boolean }) => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    const { error } = await supabase.from("products").update(patch).in("id", Array.from(selected));
    setBulkBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Updated ${selected.size}`); prods.refetch();
  };

  const bulkGenerateImages = async () => {
    if (selected.size === 0) return;
    const targets = (prods.data ?? []).filter((p: any) => selected.has(p.id));
    if (!confirm(`Generate AI product images for ${targets.length} selected product(s)? This may take a while and consumes AI credits.`)) return;
    setAiBulkBusy(true);
    setAiProgress({ done: 0, total: targets.length });
    let ok = 0, fail = 0;
    for (let i = 0; i < targets.length; i++) {
      const p: any = targets[i];
      try {
        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: { prompt: p.name, preset: "square", context: "product", bucket: "products" },
        });
        if (error || !data?.url) throw new Error(error?.message || "no url");
        const { error: uErr } = await supabase.from("products").update({ image_url: data.url }).eq("id", p.id);
        if (uErr) throw uErr;
        ok++;
      } catch (e: any) {
        fail++;
        const msg = String(e?.message ?? "");
        if (msg.includes("402")) { toast.error("AI credits exhausted — stopping bulk generation"); break; }
      }
      setAiProgress({ done: i + 1, total: targets.length });
    }
    setAiBulkBusy(false);
    setAiProgress(null);
    if (ok) toast.success(`Generated ${ok} image(s)${fail ? `, ${fail} failed` : ""}`);
    else if (fail) toast.error(`All ${fail} generations failed`);
    prods.refetch();
  };

  const openNew = () => { setEditing(empty); setOpen(true); };
  const openEdit = (p: any) => { setEditing(p); setOpen(true); };

  const remove = async (p: any) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); prods.refetch(); }
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name?.trim()) return toast.error("Name required");
    if (!Number(editing.price)) return toast.error("Price required");
    const payload: any = {
      name: editing.name.trim(),
      description: editing.description ?? null,
      price: Number(editing.price),
      compare_price: editing.compare_price ? Number(editing.compare_price) : null,
      stock: Number(editing.stock ?? 0),
      unit: editing.unit || null,
      image_url: editing.image_url || null,
      category_id: editing.category_id || null,
      is_active: !!editing.is_active,
      is_featured: !!editing.is_featured,
    };
    const op = editing.id
      ? supabase.from("products").update(payload).eq("id", editing.id)
      : supabase.from("products").insert(payload);
    const { error } = await op;
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false);
    prods.refetch();
  };

  const uploadImage = async (file: File) => {
    if (!file) return;
    const path = `${Date.now()}-${file.name.replace(/\s/g,"_")}`;
    const { error } = await supabase.storage.from("products").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("products").getPublicUrl(path);
    setEditing((e) => ({ ...e, image_url: data.publicUrl }));
  };

  const filteredAll = (prods.data ?? []).filter((p: any) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  const total = filteredAll.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const list = filteredAll.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold">Products</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
          <Button variant="outline" size="sm" onClick={downloadSample}><FileText className="h-4 w-4 mr-1" />Sample CSV</Button>
          <label className="inline-flex">
            <input type="file" accept=".csv,text/csv" className="hidden" disabled={bulkBusy}
              onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
            <Button asChild variant="outline" size="sm" disabled={bulkBusy}>
              <span><Upload className="h-4 w-4 mr-1" />Import CSV</span>
            </Button>
          </label>
          <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" />Add Product</Button>
        </div>
      </div>
      <Input placeholder="Search products…" value={q} onChange={(e) => update({ q: e.target.value || null, page: null })} className="max-w-sm" />
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-2 items-center bg-primary/5 border border-primary/20 rounded-lg p-2">
          <span className="text-sm font-semibold mr-2">{selected.size} selected</span>
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulkUpdate({ is_active: true })}>Activate</Button>
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulkUpdate({ is_active: false })}>Deactivate</Button>
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulkUpdate({ is_featured: true })}>Mark Popular</Button>
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulkUpdate({ is_featured: false })}>Unpopular</Button>
          <Button size="sm" variant="outline" disabled={aiBulkBusy || bulkBusy} onClick={bulkGenerateImages}>
            {aiBulkBusy
              ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generating {aiProgress?.done}/{aiProgress?.total}</>
              : <><Sparkles className="h-4 w-4 mr-1 text-primary" />AI Generate Images</>}
          </Button>
          <Button size="sm" variant="destructive" disabled={bulkBusy} onClick={bulkDelete}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}
      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border">
            <tr>
              <th className="p-3"><Checkbox checked={list.length > 0 && list.every((p: any) => selected.has(p.id))} onCheckedChange={(v) => { const next = new Set(selected); list.forEach((p: any) => { if (v) next.add(p.id); else next.delete(p.id); }); setSelected(next); }} /></th>
              <th className="text-left">Image</th><th className="text-left">Name</th><th className="text-left">Category</th><th className="text-right">Price</th><th className="text-right">Stock</th><th className="text-center">Active</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p: any) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="p-3"><Checkbox checked={selected.has(p.id)} onCheckedChange={(v) => { const next = new Set(selected); if (v) next.add(p.id); else next.delete(p.id); setSelected(next); }} /></td>
                <td><div className="h-10 w-10 rounded bg-muted overflow-hidden">{p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}</div></td>
                <td><div className="font-semibold">{p.name}</div><div className="text-xs text-muted-foreground">{p.unit ?? ""}</div></td>
                <td className="text-xs text-muted-foreground">{p.categories?.name ?? "—"}</td>
                <td className="text-right font-semibold">{formatPKR(Number(p.price))}</td>
                <td className="text-right">{p.stock}</td>
                <td className="text-center"><span className={`text-xs px-2 py-0.5 rounded-pill ${p.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{p.is_active ? "Yes" : "No"}</span></td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">No products</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Showing {list.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{(safePage - 1) * PAGE_SIZE + list.length} of {total}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => update({ page: String(safePage - 1) })}>Previous</Button>
          <span className="px-2 py-1 font-semibold text-foreground">Page {safePage} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => update({ page: String(safePage + 1) })}>Next</Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Product" : "New Product"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Price (PKR)</Label><Input type="number" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
                <div><Label>Compare price <span className="text-muted-foreground font-normal">(for sale)</span></Label><Input type="number" placeholder="Leave empty if not on sale" value={(editing as any).compare_price ?? ""} onChange={(e) => setEditing({ ...editing, compare_price: e.target.value ? Number(e.target.value) : null } as any)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Stock</Label><Input type="number" value={editing.stock ?? 0} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} /></div>
                <div>
                  <Label>Unit</Label>
                  <Select
                    value={UNIT_PRESETS.includes((editing.unit ?? "").trim()) ? (editing.unit as string).trim() : (editing.unit ? "__custom" : "")}
                    onValueChange={(v) => setEditing({ ...editing, unit: v === "__custom" ? "" : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                    <SelectContent>
                      {UNIT_PRESETS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      <SelectItem value="__custom">Custom (type below)</SelectItem>
                    </SelectContent>
                  </Select>
                  {!UNIT_PRESETS.includes((editing.unit ?? "").trim()) && (
                    <Input
                      className="mt-2"
                      value={editing.unit ?? ""}
                      onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                      placeholder="e.g. 250g, 1.5L, family pack"
                    />
                  )}
                </div>
              </div>
              <div><Label>Category</Label>
                <Select value={editing.category_id ?? ""} onValueChange={(v) => setEditing({ ...editing, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
                  <SelectContent>{(cats.data ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Image</Label>
                <div className="flex items-center gap-3">
                  {editing.image_url && <img src={editing.image_url} alt="" className="h-14 w-14 rounded object-cover" />}
                  <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                  <AIImageButton
                    context="product"
                    preset="square"
                    bucket="products"
                    defaultPrompt={editing.name ?? ""}
                    onGenerated={(url) => setEditing((s: any) => ({ ...s, image_url: url }))}
                  />
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />Active</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.is_featured} onCheckedChange={(v) => setEditing({ ...editing, is_featured: v })} />Featured</label>
              </div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}