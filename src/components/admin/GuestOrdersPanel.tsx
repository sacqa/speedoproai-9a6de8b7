import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPKR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Phone, MapPin, Package } from "lucide-react";

const GUEST_STATUSES = ["submitted", "confirmed", "packing", "out_for_delivery", "delivered", "cancelled"];
const nice = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function GuestOrdersPanel() {
  const [open, setOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "guest_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-guest-orders-panel")
      .on("postgres_changes", { event: "*", schema: "public", table: "guest_orders" }, () => q.refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatus = async (id: string, status: string) => {
    setSaving(id);
    const { error } = await supabase.from("guest_orders").update({ status }).eq("id", id);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked as ${nice(status)}`);
    q.refetch();
  };

  const rows = q.data ?? [];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" /> App orders (guest checkout)
        </h2>
        <span className="text-xs text-muted-foreground">{rows.length} shown</span>
      </div>

      {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!q.isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground bg-card rounded-xl shadow-card p-6 text-center">No app orders yet.</p>
      )}

      <div className="space-y-2">
        {rows.map((o: any) => {
          const items: any[] = Array.isArray(o.items) ? o.items : [];
          const isOpen = open === o.id;
          return (
            <div key={o.id} className="bg-card rounded-2xl shadow-card overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : o.id)}
                className="w-full text-left p-3 sm:p-4 flex items-start gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-primary">{o.order_number}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-pill bg-muted font-semibold">{nice(o.status)}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-pill bg-primary-tint text-primary font-semibold uppercase">{o.payment_method}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    {o.customer_name} · {o.phone} · {items.length} item{items.length === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold tabular-nums text-sm">{formatPKR(Number(o.total))}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4 mt-1 shrink-0" /> : <ChevronDown className="h-4 w-4 mt-1 shrink-0" />}
              </button>

              {isOpen && (
                <div className="border-t border-border p-3 sm:p-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div className="space-y-1">
                      <div className="font-semibold flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Contact</div>
                      <div className="text-muted-foreground">{o.customer_name}</div>
                      <a href={`tel:+92${String(o.phone).replace(/^0/, "")}`} className="text-primary font-semibold">{o.phone}</a>
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Delivery</div>
                      <div className="text-muted-foreground">{o.street}, {o.area}</div>
                      {o.details && <div className="text-muted-foreground">{o.details}</div>}
                      {(() => {
                        const g = (o.meta as any)?.geo;
                        if (!g?.lat || !g?.lng) return null;
                        return (
                          <a href={`https://www.google.com/maps?q=${g.lat},${g.lng}`} target="_blank" rel="noreferrer"
                             className="inline-flex items-center gap-1 text-primary font-semibold">
                            <MapPin className="h-3.5 w-3.5" /> Exact pinned location
                            <span className="text-muted-foreground font-normal">({g.lat}, {g.lng}{g.accuracy ? ` ±${g.accuracy}m` : ""})</span>
                          </a>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border overflow-hidden">
                    {items.map((i, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2.5 border-b border-border last:border-0">
                        <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden shrink-0">
                          {i.image_url && <img src={i.image_url} alt={i.name} className="h-full w-full object-contain" loading="lazy" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{i.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatPKR(Number(i.price))} × {i.quantity}{i.variant_label ? ` · ${i.variant_label}` : ""}
                          </div>
                        </div>
                        <div className="text-sm font-semibold tabular-nums">{formatPKR(Number(i.price) * Number(i.quantity))}</div>
                      </div>
                    ))}
                  </div>

                  <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPKR(Number(o.subtotal))}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{Number(o.delivery_fee) === 0 ? "FREE" : formatPKR(Number(o.delivery_fee))}</span></div>
                    <div className="flex justify-between font-bold border-t border-border pt-1"><span>Total</span><span className="text-primary">{formatPKR(Number(o.total))}</span></div>
                  </div>

                  {o.notes && (
                    <div className="text-sm bg-muted/50 rounded-xl p-3">
                      <span className="font-semibold">Notes: </span>{o.notes}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {GUEST_STATUSES.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={o.status === s ? "default" : "outline"}
                        disabled={saving === o.id || o.status === s}
                        onClick={() => setStatus(o.id, s)}
                        className="rounded-pill text-xs"
                      >
                        {nice(s)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
