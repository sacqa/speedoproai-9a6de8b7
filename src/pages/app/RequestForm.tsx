import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, X, Pill, Package, Sparkles } from "lucide-react";
import { compressImage } from "@/lib/imageCompress";
import { GuestDetailsFields } from "@/components/order/GuestDetailsFields";
import { guestDetailsSchema } from "@/lib/guestValidation";
import { loadGuestInfo, placeGuestOrder, type GuestInfo } from "@/lib/guestOrder";
import { Seo } from "@/components/seo/Seo";
import { useDeliveryZones, quoteDelivery } from "@/lib/deliveryRules";
import { DeliveryRuleNotice } from "@/components/order/DeliveryRuleNotice";

type Mode = "pharmacy" | "speedsend" | "custom";

const META: Record<Mode, {
  title: string; blurb: string; path: string;
  badge: string; label: string; glow: string; icon: typeof Pill;
}> = {
  pharmacy: {
    title: "Pharmacy Order",
    blurb: "List your medicines or upload a prescription. We'll confirm availability and price before delivering.",
    path: "/pharmacy",
    badge: "from-emerald-500 to-teal-400",
    label: "text-emerald-600",
    glow: "bg-emerald-500/10",
    icon: Pill,
  },
  speedsend: {
    title: "SpeedSend Parcel",
    blurb: "Send a parcel across town. Share the pickup and drop-off details and we'll quote the fare.",
    path: "/speedsend",
    badge: "from-amber-500 to-yellow-400",
    label: "text-amber-600",
    glow: "bg-amber-500/10",
    icon: Package,
  },
  custom: {
    title: "Custom Order",
    blurb: "Need something we don't stock? Describe it and we'll source it from the bazaar for you.",
    path: "/custom",
    badge: "from-primary to-primary-glow",
    label: "text-primary",
    glow: "bg-primary/10",
    icon: Sparkles,
  },
};

const CARD = "relative overflow-hidden bg-white/60 backdrop-blur-sm rounded-2xl lg:rounded-[28px] border border-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.05)] p-4 lg:p-7";

export default function RequestForm({ mode }: { mode: Mode }) {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [budget, setBudget] = useState("");
  const [guest, setGuest] = useState<GuestInfo>(loadGuestInfo());
  const zones = useDeliveryZones();
  const quote = quoteDelivery({ zones: zones.data, area: guest.area, subtotal: 0, requiresMinimum: false });
  const [s, setS] = useState({
    sender_name: "", sender_phone: "", recipient_name: "", recipient_phone: "",
    pickup_address: "", drop_address: "", package_type: "Document", weight: "", fragile: false,
  });

  const pickFile = (f: File | null) => {
    if (f && f.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async () => {
    const parsed = guestDetailsSchema.safeParse(guest);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    const d = parsed.data;
    if (quote.blockedReason) { toast.error(quote.blockedReason); return; }

    if (mode === "pharmacy" && !text.trim() && !file) {
      toast.error("List your medicines or upload a prescription"); return;
    }
    if (mode === "custom" && text.trim().length < 5) {
      toast.error("Please describe what you need"); return;
    }
    if (mode === "speedsend" && (!s.recipient_name.trim() || !s.drop_address.trim())) {
      toast.error("Recipient name and drop-off address are required"); return;
    }

    setBusy(true);
    let attachment_url: string | null = null;
    if (file) {
      let toUpload = file;
      try { toUpload = await compressImage(file, { maxDimension: 1600, quality: 0.8 }); } catch {}
      const safeName = toUpload.name.replace(/[^\w.-]/g, "_");
      const path = `${mode}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
      const up = await supabase.storage.from("request-uploads").upload(path, toUpload, {
        cacheControl: "3600", upsert: false, contentType: toUpload.type,
      });
      if (up.error) { toast.error("Could not upload the image. Please try again."); setBusy(false); return; }
      attachment_url = path;
    }

    const summary =
      mode === "pharmacy" ? (text.trim() ? `Medicines: ${text.trim()}` : "Prescription image attached")
      : mode === "speedsend" ? `Parcel to ${s.recipient_name} — ${s.drop_address}`
      : `Custom request${budget ? ` (budget Rs ${budget})` : ""}`;

    const meta: Record<string, unknown> =
      mode === "speedsend" ? { ...s, instructions: text.trim() || null }
      : mode === "custom" ? { description: text.trim(), budget: budget ? Number(budget) : null }
      : { medicines: text.trim() || null, has_prescription: !!attachment_url };

    try {
      const order = await placeGuestOrder({
        service_type: mode,
        name: d.name, phone: d.phone, area: d.area, street: d.street,
        items: [{ name: summary.slice(0, 200), price: 0, quantity: 1 }],
        subtotal: 0, delivery_fee: 0, total: 0,
        notes: text.trim() ? text.trim().slice(0, 1000) : null,
        attachment_url,
        geo: guest.geo ?? null,
        meta,
      });
      toast.success(`Request ${order.order_number} submitted`);
      nav(`/order/${order.id}`, { replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit your request");
    } finally {
      setBusy(false);
    }
  };

  const m = META[mode];
  const Icon = m.icon;

  const requestCard = (
    <section className={CARD}>
      <div className={`pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl ${m.glow}`} />
      <h2 className="relative text-lg font-serif font-semibold mb-4">
        {mode === "pharmacy" ? "What do you need?" : mode === "speedsend" ? "Parcel details" : "Your request"}
      </h2>
      <div className="relative space-y-4">
        {mode === "pharmacy" && (
          <>
            <div>
              <Label htmlFor="meds">List medicines</Label>
              <Textarea id="meds" className="mt-1.5 bg-white/70" value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={1000}
                placeholder="Panadol Extra × 2, Augmentin 625mg × 1 strip, …" />
            </div>
            <div>
              <Label>Prescription image (optional)</Label>
              {preview ? (
                <div className="mt-1.5 relative rounded-xl overflow-hidden border border-border">
                  <img src={preview} alt="Prescription preview" className="w-full max-h-56 object-contain bg-muted" />
                  <button type="button" onClick={() => pickFile(null)} aria-label="Remove image"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/90 border border-border flex items-center justify-center">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="mt-1.5 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 cursor-pointer bg-white/50 hover:border-primary/40 transition-colors">
                  <Upload className="h-6 w-6 text-primary mb-2" />
                  <span className="text-sm font-semibold">Tap to upload</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Max 5MB · JPG / PNG</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>
          </>
        )}

        {mode === "speedsend" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Input placeholder="Sender name" value={s.sender_name} onChange={(e) => setS({ ...s, sender_name: e.target.value })} />
            <Input placeholder="Sender phone" inputMode="numeric" value={s.sender_phone} onChange={(e) => setS({ ...s, sender_phone: e.target.value.replace(/\D/g, "").slice(0, 11) })} />
            <Input placeholder="Recipient name" value={s.recipient_name} onChange={(e) => setS({ ...s, recipient_name: e.target.value })} />
            <Input placeholder="Recipient phone" inputMode="numeric" value={s.recipient_phone} onChange={(e) => setS({ ...s, recipient_phone: e.target.value.replace(/\D/g, "").slice(0, 11) })} />
            <Input className="sm:col-span-2" placeholder="Pickup address" value={s.pickup_address} onChange={(e) => setS({ ...s, pickup_address: e.target.value })} />
            <Input className="sm:col-span-2" placeholder="Drop-off address" value={s.drop_address} onChange={(e) => setS({ ...s, drop_address: e.target.value })} />
            <Input placeholder="Package type" value={s.package_type} onChange={(e) => setS({ ...s, package_type: e.target.value })} />
            <Input placeholder="Weight (kg)" inputMode="decimal" value={s.weight} onChange={(e) => setS({ ...s, weight: e.target.value })} />
            <label className="sm:col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={s.fragile} onChange={(e) => setS({ ...s, fragile: e.target.checked })} /> Fragile — handle with care
            </label>
            <Textarea className="sm:col-span-2" placeholder="Extra instructions" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} />
          </div>
        )}

        {mode === "custom" && (
          <>
            <div>
              <Label htmlFor="desc">What do you need?</Label>
              <Textarea id="desc" className="mt-1.5 bg-white/70" rows={5} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)}
                placeholder="Describe the items, where to source them, and any details we should know…" />
            </div>
            <div>
              <Label htmlFor="budget">Budget (PKR, optional)</Label>
              <Input id="budget" className="mt-1.5" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, "").slice(0, 7))} />
            </div>
            <div>
              <Label>Reference photo (optional)</Label>
              {preview ? (
                <div className="mt-1.5 relative rounded-xl overflow-hidden border border-border">
                  <img src={preview} alt="Reference preview" className="w-full max-h-56 object-contain bg-muted" />
                  <button type="button" onClick={() => pickFile(null)} aria-label="Remove image"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/90 border border-border flex items-center justify-center">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="mt-1.5 flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-4 cursor-pointer bg-white/50 hover:border-primary/40 transition-colors text-sm font-semibold">
                  <Upload className="h-4 w-4 text-primary" /> Attach a photo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );

  const detailsCard = (
    <section className={CARD}>
      <div className={`pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full blur-3xl ${m.glow}`} />
      <h2 className="relative text-lg font-serif font-semibold mb-4">Your details</h2>
      <div className="relative">
        <GuestDetailsFields value={guest} onChange={setGuest} />
        <DeliveryRuleNotice quote={quote} showMinimum={false} />
      </div>
    </section>
  );

  const submitBlock = (
    <>
      <p className="text-xs text-muted-foreground">
        No account needed. We'll call you on the number above to confirm the price before delivering. Payment is cash on delivery.
      </p>
      <Button className="w-full h-12 rounded-full text-base font-bold shadow-lg shadow-primary/25" disabled={busy} onClick={submit}>
        {busy ? "Submitting…" : "Submit request"}
      </Button>
    </>
  );

  return (
    <div className="p-4 lg:p-0 pb-28 max-w-xl lg:max-w-5xl mx-auto">
      <Seo title={`${m.title} | Speedo`} description={m.blurb} path={m.path} />

      <header className="flex items-center gap-4 pt-1 mb-5 lg:mb-8">
        <div className={`h-12 w-12 lg:h-14 lg:w-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-tr ${m.badge} shrink-0`}>
          <Icon className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
        </div>
        <div className="space-y-0.5">
          <p className={`text-[10px] lg:text-[11px] font-semibold uppercase tracking-wider ${m.label}`}>Speedo {mode === "speedsend" ? "SpeedSend" : mode}</p>
          <h1 className="text-3xl lg:text-4xl font-serif font-semibold tracking-tight leading-none">{m.title}</h1>
          <p className="text-sm text-muted-foreground">{m.blurb}</p>
        </div>
      </header>

      {/* Mobile: stacked. Desktop: two columns — request left, details + submit right */}
      <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-5 lg:gap-8 lg:items-start">
        <div className="lg:col-span-3">{requestCard}</div>
        <div className="lg:col-span-2 space-y-5 lg:sticky lg:top-24">
          {detailsCard}
          {submitBlock}
        </div>
      </div>
    </div>
  );
}
