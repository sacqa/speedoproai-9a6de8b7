import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, X, Pill, Package, Sparkles, User } from "lucide-react";
import { compressImage } from "@/lib/imageCompress";
import { GuestDetailsFields } from "@/components/order/GuestDetailsFields";
import { guestDetailsSchema } from "@/lib/guestValidation";
import { loadGuestInfo, placeGuestOrder, type GuestInfo } from "@/lib/guestOrder";
import { Seo } from "@/components/seo/Seo";
import { useDeliveryZones, quoteDelivery } from "@/lib/deliveryRules";
import { DeliveryRuleNotice } from "@/components/order/DeliveryRuleNotice";

type Mode = "pharmacy" | "speedsend" | "custom";

const META: Record<Mode, {
  title: string; blurb: string; path: string; formTitle: string;
  bar: string; iconColor: string; softBox: string; icon: typeof Pill;
}> = {
  pharmacy: {
    title: "Pharmacy Order",
    blurb: "List your medicines or upload a prescription. We'll confirm availability and price before delivering.",
    path: "/pharmacy",
    formTitle: "What do you need?",
    bar: "bg-emerald-500",
    iconColor: "text-emerald-500",
    softBox: "bg-emerald-50 border-emerald-100 text-emerald-900",
    icon: Pill,
  },
  speedsend: {
    title: "SpeedSend Parcel",
    blurb: "Send a parcel across town. Share the pickup and drop-off details and we'll quote the fare.",
    path: "/speedsend",
    formTitle: "Parcel details",
    bar: "bg-amber-500",
    iconColor: "text-amber-500",
    softBox: "bg-amber-50 border-amber-100 text-amber-900",
    icon: Package,
  },
  custom: {
    title: "Custom Order",
    blurb: "Need something we don't stock? Describe it and we'll source it from the bazaar for you.",
    path: "/custom",
    formTitle: "Your request",
    bar: "bg-primary",
    iconColor: "text-primary",
    softBox: "bg-primary/5 border-primary/10 text-foreground",
    icon: Sparkles,
  },
};

const FIELD_LABEL = "text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block";
const FIELD = "h-12 rounded-xl bg-muted/60 border-transparent focus-visible:ring-primary/20";
const AREA = "rounded-xl bg-muted/60 border-transparent focus-visible:ring-primary/20 resize-none";

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
      try {
        const buf = await toUpload.arrayBuffer();
        let bin = "";
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i += 0x8000) {
          bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        }
        const { data, error } = await supabase.functions.invoke("guest-orders", {
          body: { action: "upload", service: mode, content_type: toUpload.type, data: btoa(bin) },
        });
        if (error || !data?.path) throw new Error(data?.error ?? "upload failed");
        attachment_url = data.path;
      } catch {
        toast.error("Could not upload the image. Please try again."); setBusy(false); return;
      }
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

  const uploadBox = (label: string, tall: boolean) => (
    <div>
      <span className={FIELD_LABEL}>{label}</span>
      {preview ? (
        <div className="mt-1 relative rounded-xl overflow-hidden border border-border">
          <img src={preview} alt="Upload preview" className="w-full max-h-56 object-contain bg-muted" />
          <button type="button" onClick={() => pickFile(null)} aria-label="Remove image"
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/90 border border-border flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className={`mt-1 flex ${tall ? "flex-col p-6" : "flex-row gap-2 p-4"} items-center justify-center border-2 border-dashed border-border rounded-xl cursor-pointer bg-muted/30 hover:border-primary/40 transition-colors`}>
          <Upload className={`${tall ? "h-6 w-6 mb-2" : "h-4 w-4"} text-primary`} />
          <span className="text-sm font-semibold">{tall ? "Tap to upload" : "Attach a photo"}</span>
          {tall && <span className="text-xs text-muted-foreground mt-0.5">Max 5MB · JPG / PNG</span>}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
        </label>
      )}
    </div>
  );

  return (
    <div className="p-4 lg:p-0 pb-28 max-w-xl lg:max-w-6xl mx-auto">
      <Seo title={`${m.title} | Speedo`} description={m.blurb} path={m.path} />

      <header className="pt-1 mb-5 lg:mb-10 text-center lg:text-left">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-1.5">{m.title}</h1>
        <p className="text-sm lg:text-base text-muted-foreground">{m.blurb}</p>
      </header>

      <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
        {/* Left: service-specific form */}
        <section className="lg:col-span-7 relative overflow-hidden bg-card rounded-2xl lg:rounded-3xl border border-border/60 shadow-sm p-4 lg:p-8">
          <div className={`absolute top-0 left-0 w-1.5 h-full ${m.bar}`} />
          <h2 className="text-lg lg:text-xl font-semibold mb-4 lg:mb-6 flex items-center gap-2">
            <Icon className={`h-5 w-5 ${m.iconColor}`} />
            {m.formTitle}
          </h2>

          {mode === "pharmacy" && (
            <div className="space-y-5">
              <div>
                <label htmlFor="meds" className={FIELD_LABEL}>List medicines</label>
                <Textarea id="meds" className={`mt-1 ${AREA}`} value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={1000}
                  placeholder="Panadol Extra × 2, Augmentin 625mg × 1 strip, …" />
              </div>
              {uploadBox("Prescription image (optional)", true)}
            </div>
          )}

          {mode === "speedsend" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><span className={FIELD_LABEL}>Sender name</span>
                  <Input className={FIELD} placeholder="Sender name" value={s.sender_name} onChange={(e) => setS({ ...s, sender_name: e.target.value })} /></div>
                <div><span className={FIELD_LABEL}>Sender phone</span>
                  <Input className={FIELD} placeholder="Sender phone" inputMode="numeric" value={s.sender_phone} onChange={(e) => setS({ ...s, sender_phone: e.target.value.replace(/\D/g, "").slice(0, 11) })} /></div>
                <div><span className={FIELD_LABEL}>Recipient name</span>
                  <Input className={FIELD} placeholder="Recipient name" value={s.recipient_name} onChange={(e) => setS({ ...s, recipient_name: e.target.value })} /></div>
                <div><span className={FIELD_LABEL}>Recipient phone</span>
                  <Input className={FIELD} placeholder="Recipient phone" inputMode="numeric" value={s.recipient_phone} onChange={(e) => setS({ ...s, recipient_phone: e.target.value.replace(/\D/g, "").slice(0, 11) })} /></div>
              </div>
              <div><span className={FIELD_LABEL}>Pickup address</span>
                <Input className={FIELD} placeholder="Pickup address" value={s.pickup_address} onChange={(e) => setS({ ...s, pickup_address: e.target.value })} /></div>
              <div><span className={FIELD_LABEL}>Drop-off address</span>
                <Input className={FIELD} placeholder="Drop-off address" value={s.drop_address} onChange={(e) => setS({ ...s, drop_address: e.target.value })} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><span className={FIELD_LABEL}>Package type</span>
                  <Input className={FIELD} placeholder="e.g. Document, Electronics" value={s.package_type} onChange={(e) => setS({ ...s, package_type: e.target.value })} /></div>
                <div><span className={FIELD_LABEL}>Weight (kg)</span>
                  <Input className={FIELD} placeholder="Weight (kg)" inputMode="decimal" value={s.weight} onChange={(e) => setS({ ...s, weight: e.target.value })} /></div>
              </div>
              <label className={`flex items-center gap-3 p-4 rounded-2xl border ${m.softBox} cursor-pointer`}>
                <input type="checkbox" className="h-5 w-5 rounded" checked={s.fragile} onChange={(e) => setS({ ...s, fragile: e.target.checked })} />
                <span className="font-medium text-sm">Fragile — handle with care</span>
              </label>
              <div><span className={FIELD_LABEL}>Extra instructions</span>
                <Textarea className={`mt-1 ${AREA}`} placeholder="Any specific instructions for the rider?" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} /></div>
            </div>
          )}

          {mode === "custom" && (
            <div className="space-y-5">
              <div>
                <label htmlFor="desc" className={FIELD_LABEL}>What do you need?</label>
                <Textarea id="desc" className={`mt-1 ${AREA}`} rows={5} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="Describe the items, where to source them, and any details we should know…" />
              </div>
              <div>
                <label htmlFor="budget" className={FIELD_LABEL}>Budget (PKR, optional)</label>
                <Input id="budget" className={`mt-1 ${FIELD}`} inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, "").slice(0, 7))} />
              </div>
              {uploadBox("Reference photo (optional)", false)}
            </div>
          )}
        </section>

        {/* Right: details + submit (sticky on desktop) */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-8">
          <section className="bg-card rounded-2xl lg:rounded-3xl border border-border/60 shadow-lg shadow-primary/5 p-4 lg:p-8">
            <h2 className="text-lg lg:text-xl font-semibold mb-4 lg:mb-6 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Your details
            </h2>
            <GuestDetailsFields value={guest} onChange={setGuest} />
            <DeliveryRuleNotice quote={quote} showMinimum={false} />

            <div className="mt-6 lg:mt-8">
              <Button className="w-full h-12 lg:h-14 rounded-2xl text-base lg:text-lg font-bold shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-all" disabled={busy} onClick={submit}>
                {busy ? "Submitting…" : "Submit request"}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center mt-4 leading-relaxed">
                No account needed. We'll call you to confirm the price before delivering. Payment is cash on delivery.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
