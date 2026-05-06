import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPKR, statusLabel } from "@/lib/format";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Save, Pill, ExternalLink } from "lucide-react";
import InstructionsThread from "@/components/order/InstructionsThread";

const STATUSES = ["submitted","rider_assigned","purchasing_items","out_for_delivery","delivered","cancelled"];

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [editAddr, setEditAddr] = useState<any>(null);
  const [fees, setFees] = useState({ delivery_fee: 0, service_charge: 0 });
  const [notes, setNotes] = useState("");
  const [newItem, setNewItem] = useState({ name: "", price: "", quantity: "1", unit: "" });
  const [prescriptionSignedUrl, setPrescriptionSignedUrl] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const [{ data: o }, { data: it }, { data: lg }] = await Promise.all([
      supabase.from("orders").select("*").eq("id", id).single(),
      supabase.from("order_items").select("*").eq("order_id", id),
      supabase.from("order_status_logs").select("*").eq("order_id", id).order("created_at"),
    ]);
    setOrder(o);
    setItems(it ?? []);
    setLogs(lg ?? []);
    if (o) {
      setEditAddr(o.address_snapshot ?? { recipient_name: "", phone: "", street: "", area: "", details: "" });
      setFees({ delivery_fee: Number(o.delivery_fee) || 0, service_charge: Number(o.service_charge) || 0 });
      setNotes(o.notes ?? "");
      if (o.prescription_url) {
        const { data: signed } = await supabase.storage
          .from("prescriptions")
          .createSignedUrl(o.prescription_url, 60 * 60);
        setPrescriptionSignedUrl(signed?.signedUrl ?? null);
      } else {
        setPrescriptionSignedUrl(null);
      }
    }
  };
  useEffect(() => { load(); }, [id]);

  const updateStatus = async (status: string) => {
    setBusy(true);
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Status updated"); await load(); }
    setBusy(false);
  };

  const recalcAndSave = async (nextItems: any[], nextFees = fees) => {
    const subtotal = nextItems.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
    const total = subtotal + Number(nextFees.delivery_fee) + Number(nextFees.service_charge);
    const { error } = await supabase.from("orders").update({
      subtotal, delivery_fee: nextFees.delivery_fee, service_charge: nextFees.service_charge, total,
    }).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const updateItem = async (itemId: string, patch: Record<string, any>) => {
    setBusy(true);
    const { error } = await supabase.from("order_items").update(patch as any).eq("id", itemId);
    if (error) { toast.error(error.message); setBusy(false); return; }
    const nextItems = items.map((i) => (i.id === itemId ? { ...i, ...patch } : i));
    setItems(nextItems);
    await recalcAndSave(nextItems);
    await load();
    setBusy(false);
    toast.success("Item updated");
  };

  const removeItem = async (itemId: string) => {
    setBusy(true);
    const { error } = await supabase.from("order_items").delete().eq("id", itemId);
    if (error) { toast.error(error.message); setBusy(false); return; }
    const nextItems = items.filter((i) => i.id !== itemId);
    setItems(nextItems);
    await recalcAndSave(nextItems);
    await load();
    setBusy(false);
    toast.success("Item removed");
  };

  const addNewItem = async () => {
    if (!newItem.name.trim() || !newItem.price || !newItem.quantity) { toast.error("Fill name, price, qty"); return; }
    setBusy(true);
    const { error } = await supabase.from("order_items").insert({
      order_id: id, name: newItem.name.trim(), price: Number(newItem.price),
      quantity: Number(newItem.quantity), unit: newItem.unit || null,
    });
    if (error) { toast.error(error.message); setBusy(false); return; }
    const { data: it } = await supabase.from("order_items").select("*").eq("order_id", id);
    setItems(it ?? []);
    await recalcAndSave(it ?? []);
    await load();
    setNewItem({ name: "", price: "", quantity: "1", unit: "" });
    setBusy(false);
    toast.success("Item added");
  };

  const saveAddress = async () => {
    setBusy(true);
    const { error } = await supabase.from("orders").update({ address_snapshot: editAddr }).eq("id", id);
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("Address updated");
  };

  const saveFees = async () => {
    setBusy(true);
    const ok = await recalcAndSave(items, fees);
    setBusy(false);
    if (ok) { toast.success("Fees & total updated"); await load(); }
  };

  const saveNotes = async () => {
    setBusy(true);
    const { error } = await supabase.from("orders").update({ notes }).eq("id", id);
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("Notes saved");
  };

  if (!order) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Back</Link>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">{statusLabel(order.type)} · {new Date(order.created_at).toLocaleString()}</p>
        </div>
        <Select value={order.status} onValueChange={updateStatus} disabled={busy}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <InstructionsThread orderId={order.id} asAdmin />

      {(order.type === "pharmacy" || order.prescription_url) && (
        <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-primary" />
            <h2 className="font-bold">Prescription</h2>
          </div>
          {prescriptionSignedUrl ? (
            <a href={prescriptionSignedUrl} target="_blank" rel="noreferrer" className="block">
              <img
                src={prescriptionSignedUrl}
                alt="Prescription"
                className="rounded-xl max-h-96 object-contain w-full bg-muted"
              />
              <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-semibold">
                Open full size <ExternalLink className="h-3 w-3" />
              </span>
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">No prescription image uploaded.</p>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl shadow-card p-4 text-sm space-y-2">
          <h2 className="font-bold mb-1">Customer & Delivery</h2>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Recipient" value={editAddr?.recipient_name ?? ""} onChange={(e) => setEditAddr({ ...editAddr, recipient_name: e.target.value })} />
            <Input placeholder="Phone" value={editAddr?.phone ?? ""} onChange={(e) => setEditAddr({ ...editAddr, phone: e.target.value })} />
            <Input className="col-span-2" placeholder="Street" value={editAddr?.street ?? ""} onChange={(e) => setEditAddr({ ...editAddr, street: e.target.value })} />
            <Input placeholder="Area" value={editAddr?.area ?? ""} onChange={(e) => setEditAddr({ ...editAddr, area: e.target.value })} />
            <Input placeholder="Details" value={editAddr?.details ?? ""} onChange={(e) => setEditAddr({ ...editAddr, details: e.target.value })} />
          </div>
          <Button size="sm" onClick={saveAddress} disabled={busy} className="gap-1"><Save className="h-3 w-3" />Save Address</Button>
        </div>

        <div className="bg-card rounded-xl shadow-card p-4 text-sm space-y-2">
          <h2 className="font-bold mb-1">Payment & Fees</h2>
          <div>Method: <b>Cash on Delivery</b></div>
          <div>Status: <span className="px-2 py-0.5 rounded-pill bg-muted text-xs">{statusLabel(order.payment_status)}</span></div>
          <label className="text-xs text-muted-foreground block">Delivery fee
            <Input type="number" value={fees.delivery_fee} onChange={(e) => setFees({ ...fees, delivery_fee: Number(e.target.value) })} />
          </label>
          <label className="text-xs text-muted-foreground block">Service charge
            <Input type="number" value={fees.service_charge} onChange={(e) => setFees({ ...fees, service_charge: Number(e.target.value) })} />
          </label>
          <Button size="sm" onClick={saveFees} disabled={busy} className="gap-1"><Save className="h-3 w-3" />Save Fees & Recalc Total</Button>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
        <h2 className="font-bold">Items</h2>
        <div className="space-y-2">
          {items.map((i: any) => (
            <div key={i.id} className="grid grid-cols-12 gap-2 items-center text-sm">
              <Input className="col-span-5" defaultValue={i.name} onBlur={(e) => e.target.value !== i.name && updateItem(i.id, { name: e.target.value })} />
              <Input className="col-span-2" type="number" defaultValue={i.price} onBlur={(e) => Number(e.target.value) !== Number(i.price) && updateItem(i.id, { price: Number(e.target.value) })} />
              <Input className="col-span-2" type="number" defaultValue={i.quantity} onBlur={(e) => Number(e.target.value) !== Number(i.quantity) && updateItem(i.id, { quantity: Number(e.target.value) })} />
              <div className="col-span-2 text-right font-semibold">{formatPKR(Number(i.price) * Number(i.quantity))}</div>
              <Button size="icon" variant="ghost" className="col-span-1 text-destructive" onClick={() => removeItem(i.id)} disabled={busy}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {items.length === 0 && <p className="text-xs text-muted-foreground">No items.</p>}
        </div>

        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Add new item</p>
          <div className="grid grid-cols-12 gap-2">
            <Input className="col-span-5" placeholder="Name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
            <Input className="col-span-2" type="number" placeholder="Price" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} />
            <Input className="col-span-2" type="number" placeholder="Qty" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} />
            <Input className="col-span-2" placeholder="Unit" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} />
            <Button size="icon" className="col-span-1" onClick={addNewItem} disabled={busy}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="border-t border-border pt-2 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPKR(Number(order.subtotal))}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{formatPKR(Number(order.delivery_fee))}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span>{formatPKR(Number(order.service_charge))}</span></div>
          <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary">{formatPKR(Number(order.total))}</span></div>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-card p-4 space-y-2">
        <h2 className="font-bold">Order Notes</h2>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal/order notes" className="min-h-20" />
        <Button size="sm" onClick={saveNotes} disabled={busy} className="gap-1"><Save className="h-3 w-3" />Save Notes</Button>
      </div>

      <div className="bg-card rounded-xl shadow-card p-4">
        <h2 className="font-bold mb-3">Status History</h2>
        <ol className="space-y-1 text-sm">
          {logs.map((l) => (
            <li key={l.id} className="flex justify-between border-b border-border last:border-0 py-1">
              <span>{statusLabel(l.status)}</span>
              <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
            </li>
          ))}
          {logs.length === 0 && <p className="text-muted-foreground text-sm">No history</p>}
        </ol>
      </div>
    </div>
  );
}