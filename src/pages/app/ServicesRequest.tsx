import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Wrench, Upload, X, User, CheckCircle2 } from "lucide-react";
import { compressImage } from "@/lib/imageCompress";
import { GuestDetailsFields } from "@/components/order/GuestDetailsFields";
import { guestDetailsSchema } from "@/lib/guestValidation";
import { loadGuestInfo, saveGuestInfo, type GuestInfo } from "@/lib/guestOrder";
import { SERVICE_CATEGORIES, URGENCY } from "@/lib/serviceRequests";
import { Seo } from "@/components/seo/Seo";

const FIELD_LABEL = "text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block";
const FIELD = "h-12 rounded-xl bg-muted/60 border-transparent focus-visible:ring-primary/20";

const formSchema = z.object({
  category: z.string().min(1, "Choose a service"),
  description: z.string().trim().min(5, "Please describe the problem").max(1000),
  preferred: z.string().max(40).optional(),
});

export default function ServicesRequest() {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [preferred, setPreferred] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [guest, setGuest] = useState<GuestInfo>(loadGuestInfo());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const pickFile = (f: File | null) => {
    if (f && f.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async () => {
    const f = formSchema.safeParse({ category, description, preferred });
    if (!f.success) { toast.error(f.error.errors[0].message); return; }
    const g = guestDetailsSchema.safeParse(guest);
    if (!g.success) { toast.error(g.error.errors[0].message); return; }
    setBusy(true);
    let attachment_url: string | null = null;
    try {
      if (file) {
        let up = file;
        try { up = await compressImage(file, { maxDimension: 1600, quality: 0.8 }); } catch {}
        const bytes = new Uint8Array(await up.arrayBuffer());
        let bin = "";
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        const { data, error } = await supabase.functions.invoke("guest-orders", {
          body: { action: "upload", service: "services", content_type: up.type, data: btoa(bin) },
        });
        if (error || !data?.path) throw new Error("Could not upload the photo. Please try again.");
        attachment_url = data.path;
      }
      const number = "SR-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      const geo = guest.geo ? { lat: guest.geo.lat, lng: guest.geo.lng, accuracy: guest.geo.accuracy ?? null } : null;
      const { error } = await supabase.from("service_requests").insert({
        request_number: number,
        category,
        description: description.trim(),
        customer_name: g.data.name,
        phone: g.data.phone,
        area: g.data.area,
        address: g.data.street,
        geo,
        preferred_at: preferred || null,
        urgency,
        attachment_url,
      });
      if (error) throw new Error("Could not submit your request. Please try again.");
      saveGuestInfo(guest);
      setDone(number);
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="p-6 max-w-md mx-auto text-center space-y-4 pt-16">
        <CheckCircle2 className="h-14 w-14 text-primary mx-auto" />
        <h1 className="text-2xl font-bold">Request submitted</h1>
        <p className="text-muted-foreground text-sm">Your request number is <b className="text-foreground">{done}</b>. Our team will call you shortly to confirm the visit.</p>
        <Button className="rounded-2xl" onClick={() => { setDone(null); setDescription(""); pickFile(null); setCategory(""); }}>Submit another request</Button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-0 pb-28 max-w-xl lg:max-w-6xl mx-auto">
      <Seo title="Services & Repairs | Speedo" description="Book a plumber, electrician, AC technician, cleaner, mechanic and more." path="/services" />
      <header className="pt-1 mb-5 lg:mb-10 text-center lg:text-left">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-1.5">Services & Repairs</h1>
        <p className="text-sm lg:text-base text-muted-foreground">Tell us what needs fixing — we'll send a trusted professional to your door.</p>
      </header>

      <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
        <section className="lg:col-span-7 relative overflow-hidden bg-card rounded-2xl lg:rounded-3xl border border-border/60 shadow-sm p-4 lg:p-8">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
          <h2 className="text-lg lg:text-xl font-semibold mb-4 lg:mb-6 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" /> What do you need?
          </h2>
          <div className="space-y-5">
            <div>
              <span className={FIELD_LABEL}>Service category</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                {SERVICE_CATEGORIES.map((c) => (
                  <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                    className={`min-h-11 px-3 py-2 rounded-xl text-sm font-semibold border text-left transition-colors ${category === c.value ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-transparent hover:border-primary/30"}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="sr-desc" className={FIELD_LABEL}>Problem description</label>
              <Textarea id="sr-desc" rows={4} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)}
                className="mt-1 rounded-xl bg-muted/60 border-transparent resize-none" placeholder="e.g. Kitchen tap is leaking, needs replacement…" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sr-when" className={FIELD_LABEL}>Preferred date & time</label>
                <Input id="sr-when" type="datetime-local" className={FIELD} value={preferred} onChange={(e) => setPreferred(e.target.value)} />
              </div>
              <div>
                <span className={FIELD_LABEL}>Urgency</span>
                <div className="flex gap-2">
                  {URGENCY.map((u) => (
                    <button key={u.value} type="button" onClick={() => setUrgency(u.value)}
                      className={`flex-1 h-12 rounded-xl text-sm font-semibold border ${urgency === u.value ? (u.value === "urgent" ? "bg-destructive text-destructive-foreground border-destructive" : "bg-primary text-primary-foreground border-primary") : "bg-muted/50 border-transparent"}`}>
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <span className={FIELD_LABEL}>Photo (optional)</span>
              {preview ? (
                <div className="mt-1 relative rounded-xl overflow-hidden border border-border">
                  <img src={preview} alt="Problem photo" className="w-full max-h-56 object-contain bg-muted" />
                  <button type="button" onClick={() => pickFile(null)} aria-label="Remove photo"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/90 border border-border flex items-center justify-center">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="mt-1 flex flex-row gap-2 p-4 items-center justify-center border-2 border-dashed border-border rounded-xl cursor-pointer bg-muted/30 hover:border-primary/40">
                  <Upload className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Attach a photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>
          </div>
        </section>

        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-8">
          <section className="bg-card rounded-2xl lg:rounded-3xl border border-border/60 shadow-lg shadow-primary/5 p-4 lg:p-8">
            <h2 className="text-lg lg:text-xl font-semibold mb-4 lg:mb-6 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Your details
            </h2>
            <GuestDetailsFields value={guest} onChange={setGuest} />
            <Button className="w-full mt-6 h-12 lg:h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/30" disabled={busy} onClick={submit}>
              {busy ? "Submitting…" : "Submit request"}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-4">No account needed. We'll call to confirm the visit and charges.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
