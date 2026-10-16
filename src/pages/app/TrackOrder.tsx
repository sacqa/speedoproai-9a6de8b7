import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PackageSearch, ChevronLeft, Phone } from "lucide-react";
import { Seo } from "@/components/seo/Seo";
import { formatPKR } from "@/lib/format";
import { lookupOrder, myOrders, ordersByPhone, SERVICE_LABEL, type ServiceType } from "@/lib/guestOrder";
import { OrderSteps, FULFILMENT_STEPS } from "@/components/speedo/OrderSteps";
import { STATUS_STEP, statusText } from "@/lib/orderStatus";

export default function TrackOrder() {
  const recent = myOrders();
  const [phone, setPhone] = useState(recent[0]?.phone ?? "");
  const [orderNumber, setOrderNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<any[] | null>(null);
  const [result, setResult] = useState<any>(null);

  const searchByPhone = async (ph = phone) => {
    const digits = ph.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("Apna mobile number darj karein (03xxxxxxxxx)");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const rows = await ordersByPhone(digits);
      if (!rows.length) {
        setList(null);
        toast.error("Is number par koi order nahi mila");
      } else {
        setList(rows);
        if (rows.length === 1) setResult(rows[0]);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Orders load nahi ho sake");
    } finally {
      setBusy(false);
    }
  };

  const searchByNumber = async () => {
    const digits = phone.replace(/\D/g, "");
    if (!orderNumber.trim() || digits.length < 10) {
      toast.error("Order number aur mobile number dono darj karein");
      return;
    }
    setBusy(true);
    try {
      const row = await lookupOrder(orderNumber.trim(), digits);
      if (!row) { toast.error("In details se koi order nahi mila"); }
      else { setResult(row); setList(null); }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not look up that order");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 lg:p-0 pb-28 max-w-xl mx-auto space-y-5">
      <Seo title="Track your order | Speedo" description="Check the live status of your Speedo order using your mobile number." path="/track" />
      <header className="pt-2">
        <h1 className="text-3xl lg:text-4xl font-serif font-semibold tracking-tight">Track your order</h1>
        <p className="text-sm text-muted-foreground mt-1">Bas apna mobile number darj karein — aapke tamam orders yahan mil jayenge.</p>
      </header>

      <section className="bg-card rounded-2xl border border-border/60 p-4 lg:p-5 space-y-4">
        <div>
          <Label htmlFor="t-phone" className="text-[13px] font-semibold flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" /> Mobile number
          </Label>
          <Input id="t-phone" className="mt-1.5 h-11" inputMode="numeric" maxLength={11} placeholder="03xxxxxxxxx"
            value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} />
        </div>
        <Button className="w-full h-12 rounded-full font-bold gap-2" disabled={busy} onClick={() => searchByPhone()}>
          <PackageSearch className="h-4 w-4" /> {busy ? "Searching…" : "Mere orders dikhayein"}
        </Button>

        <div className="border-t border-border/60 pt-3">
          <p className="text-xs text-muted-foreground mb-2">Order number se dhoondna hai? (optional)</p>
          <div className="flex gap-2">
            <Input className="h-10 uppercase tracking-wide" placeholder="SPD-1024"
              value={orderNumber} onChange={(e) => setOrderNumber(e.target.value.toUpperCase().slice(0, 24))} />
            <Button variant="outline" className="h-10 shrink-0" disabled={busy} onClick={searchByNumber}>Search</Button>
          </div>
        </div>
      </section>

      {list && !result && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Is number ke orders ({list.length})</h2>
          {list.map((o) => (
            <button key={o.id} onClick={() => setResult(o)}
              className="w-full text-left bg-card rounded-xl border border-border/60 p-3 flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="font-bold text-primary">{o.order_number}</span>
                <span className="block text-xs text-muted-foreground">
                  {SERVICE_LABEL[o.service_type as ServiceType] ?? o.service_type} · {statusText(String(o.status))} · {new Date(o.created_at).toLocaleDateString()}
                </span>
              </span>
              <span className="text-sm font-semibold tabular-nums shrink-0">{Number(o.total) ? formatPKR(Number(o.total)) : "—"}</span>
            </button>
          ))}
        </section>
      )}

      {result && (
        <section className="space-y-4">
          {list && list.length > 1 && (
            <button onClick={() => setResult(null)} className="flex items-center gap-1 text-sm font-semibold text-primary">
              <ChevronLeft className="h-4 w-4" /> Sab orders par wapas
            </button>
          )}
          <OrderSteps
            steps={FULFILMENT_STEPS}
            current={STATUS_STEP[String(result.status)] ?? 0}
            title={`${result.order_number} · ${statusText(String(result.status))}`}
          />
          <div className="bg-card rounded-2xl border border-border/60 p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-semibold">{SERVICE_LABEL[result.service_type as ServiceType] ?? result.service_type}</span></div>
            {result.vendor_name && <div className="flex justify-between"><span className="text-muted-foreground">From</span><span className="font-semibold">{result.vendor_name}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Placed</span><span>{new Date(result.created_at).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Deliver to</span><span className="text-right max-w-[60%]">{result.street}, {result.area}</span></div>
            <div className="border-t border-border pt-2 mt-1 space-y-1">
              {(Array.isArray(result.items) ? result.items : []).map((i: any, idx: number) => (
                <div key={idx} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">{i.name} × {i.quantity}</span>
                  {Number(i.price) > 0 && <span className="tabular-nums shrink-0">{formatPKR(Number(i.price) * i.quantity)}</span>}
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold border-t border-border pt-2">
              <span>Total</span>
              <span className="text-primary tabular-nums">{Number(result.total) ? formatPKR(Number(result.total)) : "To be confirmed"}</span>
            </div>
          </div>
        </section>
      )}

      <Link to="/" className="block text-center text-sm text-muted-foreground">Back to Home</Link>
    </div>
  );
}
