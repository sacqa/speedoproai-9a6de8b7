import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { formatPKR } from "@/lib/format";

export default function AdminReceipt() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [s, setS] = useState<any>({});

  useEffect(() => {
    (async () => {
      const [{ data: o }, { data: it }, { data: cfg }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).single(),
        supabase.from("order_items").select("*").eq("order_id", id),
        supabase.from("app_settings").select("value").eq("key", "receipt").maybeSingle(),
      ]);
      setOrder(o); setItems(it ?? []); setS(cfg?.value ?? {});
    })();
  }, [id]);

  if (!order) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  const subtotal = items.reduce((t, i) => t + Number(i.price) * Number(i.quantity), 0);

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0; }
          .no-print { display: none !important; }
          .receipt { width: 80mm !important; box-shadow: none !important; padding: 4mm !important; }
        }
      `}</style>
      <div className="no-print flex items-center justify-between gap-2">
        <Link to={`/admin/orders/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Back</Link>
        <Button onClick={() => window.print()} className="gap-1"><Printer className="h-4 w-4" />Print receipt</Button>
      </div>
      <div className="receipt mx-auto bg-white text-black shadow-card p-4" style={{ width: "80mm", fontFamily: "ui-monospace, 'Courier New', monospace", fontSize: "12px", lineHeight: 1.35 }}>
        {s.logo_url && <img src={s.logo_url} alt="logo" style={{ maxHeight: 64, margin: "0 auto 6px", display: "block" }} />}
        <div style={{ textAlign: "center", fontWeight: 800, fontSize: 16 }}>{s.business_name || "Speedo Mart"}</div>
        {s.address && <div style={{ textAlign: "center", fontSize: 11 }}>{s.address}</div>}
        {s.phone && <div style={{ textAlign: "center", fontSize: 11 }}>Tel: {s.phone}</div>}
        {s.tax_id && <div style={{ textAlign: "center", fontSize: 11 }}>NTN: {s.tax_id}</div>}
        <Sep />
        <Row l="Receipt #" r={order.order_number} />
        <Row l="Date" r={new Date(order.created_at).toLocaleString()} />
        <Row l="Cashier" r="Admin" />
        {order.address_snapshot?.recipient_name && <Row l="Customer" r={order.address_snapshot.recipient_name} />}
        {order.address_snapshot?.phone && <Row l="Phone" r={order.address_snapshot.phone} />}
        <Sep />
        <div style={{ display: "flex", fontWeight: 700, borderBottom: "1px dashed #000", paddingBottom: 2 }}>
          <div style={{ flex: 2 }}>Item</div>
          <div style={{ width: 30, textAlign: "right" }}>Qty</div>
          <div style={{ width: 60, textAlign: "right" }}>Amount</div>
        </div>
        {items.map((i) => (
          <div key={i.id} style={{ display: "flex", marginTop: 2 }}>
            <div style={{ flex: 2 }}>
              {i.name}
              <div style={{ fontSize: 10, opacity: 0.7 }}>{formatPKR(Number(i.price))}{i.unit ? ` / ${i.unit}` : ""}</div>
            </div>
            <div style={{ width: 30, textAlign: "right" }}>{i.quantity}</div>
            <div style={{ width: 60, textAlign: "right" }}>{formatPKR(Number(i.price) * Number(i.quantity))}</div>
          </div>
        ))}
        <Sep />
        <Row l="Subtotal" r={formatPKR(subtotal)} />
        {Number(order.delivery_fee) > 0 && <Row l="Delivery" r={formatPKR(Number(order.delivery_fee))} />}
        {Number(order.service_charge) > 0 && <Row l="Service" r={formatPKR(Number(order.service_charge))} />}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 14, marginTop: 4, borderTop: "1px dashed #000", paddingTop: 4 }}>
          <span>TOTAL</span><span>{formatPKR(Number(order.total))}</span>
        </div>
        <Row l="Payment" r={(order.payment_method || "COD").toString().toUpperCase()} />
        <Sep />
        <div style={{ textAlign: "center", fontSize: 11, marginTop: 4 }}>{s.footer || "Thank you for shopping with us!"}</div>
        <div style={{ textAlign: "center", fontSize: 10, marginTop: 6, opacity: 0.7 }}>Powered by Speedo</div>
      </div>
    </div>
  );
}

const Sep = () => <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />;
const Row = ({ l, r }: { l: string; r: any }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
    <span>{l}</span><span>{r}</span>
  </div>
);