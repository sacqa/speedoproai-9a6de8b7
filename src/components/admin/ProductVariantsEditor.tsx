import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id?: string;
  name: string;
  value: string;
  price_delta: number;
  stock: number;
  sort_order: number;
  is_active: boolean;
  _dirty?: boolean;
  _new?: boolean;
};

export function ProductVariantsEditor({ productId }: { productId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true });
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Row[]);
  };

  useEffect(() => { load(); }, [productId]);

  const update = (idx: number, patch: Partial<Row>) => {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch, _dirty: true } : row)));
  };

  const addRow = () => {
    setRows((r) => [...r, { name: "Size", value: "", price_delta: 0, stock: 0, sort_order: r.length, is_active: true, _new: true, _dirty: true }]);
  };

  const remove = async (idx: number) => {
    const row = rows[idx];
    if (row.id) {
      const { error } = await supabase.from("product_variants").delete().eq("id", row.id);
      if (error) return toast.error(error.message);
    }
    setRows((r) => r.filter((_, i) => i !== idx));
  };

  const validationErrors = (): string[] => {
    const errs: string[] = [];
    const dirty = rows.filter((r) => r._dirty);
    dirty.forEach((r, idx) => {
      if (!r.name.trim()) errs.push(`Row ${idx + 1}: group name required`);
      if (!r.value.trim()) errs.push(`Row ${idx + 1}: value required`);
      if (Number(r.stock) < 0) errs.push(`Row ${idx + 1}: stock cannot be negative`);
    });
    // duplicate (name+value) check
    const seen = new Set<string>();
    rows.forEach((r, idx) => {
      const key = `${r.name.trim().toLowerCase()}::${r.value.trim().toLowerCase()}`;
      if (!r.name.trim() || !r.value.trim()) return;
      if (seen.has(key)) errs.push(`Row ${idx + 1}: duplicate ${r.name}/${r.value}`);
      seen.add(key);
    });
    return errs;
  };

  const errors = validationErrors();

  const saveAll = async () => {
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    setSaving(true);
    try {
      const dirty = rows.filter((r) => r._dirty && r.value.trim() && r.name.trim());
      for (const row of dirty) {
        const payload = {
          product_id: productId,
          name: row.name.trim(),
          value: row.value.trim(),
          price_delta: Number(row.price_delta) || 0,
          stock: Number(row.stock) || 0,
          sort_order: Number(row.sort_order) || 0,
          is_active: !!row.is_active,
        };
        const op = row.id
          ? supabase.from("product_variants").update(payload).eq("id", row.id)
          : supabase.from("product_variants").insert(payload);
        const { error } = await op;
        if (error) throw error;
      }
      toast.success("Variants saved");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading variants…</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">Add Size, Flavor or other options. Price delta is added to base.</span>
        <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-4 w-4 mr-1" />Add variant</Button>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {rows.length === 0 && <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">No variants yet</div>}
        {rows.map((r, i) => (
          <div key={r.id ?? `n${i}`} className={`grid grid-cols-12 gap-2 items-center rounded-lg p-2 ${r.stock <= 0 ? "bg-destructive/5 border border-destructive/20" : "bg-muted/40"}`}>
            <Input className="col-span-3" placeholder="Group (Size)" value={r.name} onChange={(e) => update(i, { name: e.target.value })} />
            <Input className="col-span-3" placeholder="Value (500ml)" value={r.value} onChange={(e) => update(i, { value: e.target.value })} />
            <Input className="col-span-2" type="number" placeholder="±" value={r.price_delta} onChange={(e) => update(i, { price_delta: Number(e.target.value) })} />
            <Input className="col-span-2" type="number" min={0} placeholder="Stock" value={r.stock} onChange={(e) => update(i, { stock: Number(e.target.value) })} />
            <div className="col-span-1 flex justify-center"><Switch checked={r.is_active} onCheckedChange={(v) => update(i, { is_active: v })} /></div>
            <button className="col-span-1 text-destructive hover:bg-destructive/10 rounded p-1.5 flex items-center justify-center" onClick={() => remove(i)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
            {r.stock <= 0 && (
              <div className="col-span-12 text-[10px] font-bold uppercase tracking-wider text-destructive">Out of stock — will be disabled in storefront</div>
            )}
          </div>
        ))}
      </div>
      {errors.length > 0 && (
        <div className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-2 space-y-0.5">
          {errors.slice(0, 3).map((e, i) => <div key={i}>• {e}</div>)}
        </div>
      )}
      <Button onClick={saveAll} disabled={saving || !rows.some((r) => r._dirty) || errors.length > 0} className="w-full" size="sm">
        {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save variants"}
      </Button>
    </div>
  );
}