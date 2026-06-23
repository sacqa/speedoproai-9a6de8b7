import { useEffect, useState } from "react";
import { MapPin, Bell, Mic, Check, ShieldCheck, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_KEY = "speedo-permissions-v1";

type Step = {
  key: "location" | "notifications" | "mic";
  icon: typeof MapPin;
  title: string;
  tagline: string;
  benefits: string[];
  cta: string;
  accent: string;
};

const STEPS: Step[] = [
  {
    key: "location",
    icon: MapPin,
    title: "Allow location",
    tagline: "So riders can find you in seconds.",
    benefits: [
      "Auto-fill your delivery address",
      "Live tracking of your order on the way",
      "Surface the closest shops and restaurants first",
    ],
    cta: "Use my location",
    accent: "from-primary/15 to-primary/0",
  },
  {
    key: "notifications",
    icon: Bell,
    title: "Turn on notifications",
    tagline: "We'll ping you the moment something matters.",
    benefits: [
      "Order status updates without opening the app",
      "Exclusive flash deals & low-stock alerts",
      "Replies from chat & support delivered instantly",
    ],
    cta: "Enable notifications",
    accent: "from-orange/20 to-orange/0",
  },
  {
    key: "mic",
    icon: Mic,
    title: "Allow microphone",
    tagline: "Talk instead of type — for voice search and voice notes.",
    benefits: [
      "Search for products by saying the name",
      "Record voice notes in chat & rider messages",
      "Hands-free when you're cooking or driving",
    ],
    cta: "Allow microphone",
    accent: "from-accent/25 to-accent/0",
  },
];

export function MobilePermissions() {
  const { user } = useAuth();
  const push = usePushSubscription();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Small delay so it doesn't fight the splash/login transition.
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, [user]);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setOpen(false);
  };
  const next = () => (i < STEPS.length - 1 ? setI(i + 1) : close());

  const handleAllow = async () => {
    const step = STEPS[i];
    setBusy(true);
    try {
      if (step.key === "location") {
        if (!("geolocation" in navigator)) { toast.error("Location not supported"); return next(); }
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                if (user) {
                  await supabase.from("user_locations").upsert({
                    user_id: user.id,
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    share_enabled: true,
                  });
                }
                toast.success("Location enabled");
              } catch {/* ignore */}
              resolve();
            },
            () => { toast.message("You can enable location later from Profile"); resolve(); },
            { enableHighAccuracy: true, timeout: 8000 },
          );
        });
      } else if (step.key === "notifications") {
        const ok = await push.subscribe();
        if (ok) toast.success("Notifications enabled");
      } else if (step.key === "mic") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
          toast.success("Microphone enabled");
        } catch {
          toast.message("Microphone declined — you can enable it later");
        }
      }
    } finally {
      setBusy(false);
      next();
    }
  };

  if (!open) return null;
  const step = STEPS[i];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[100] lg:hidden flex items-end animate-fade-in" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={close} />
      <div className="relative w-full bg-background rounded-t-[32px] overflow-hidden animate-slide-up safe-bottom shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.4)]">
        <div className={`relative pt-8 pb-6 px-6 bg-gradient-to-b ${step.accent}`}>
          <button onClick={close} aria-label="Skip" className="absolute right-4 top-4 h-9 w-9 rounded-full bg-white/70 backdrop-blur flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-3xl bg-white shadow-lg flex items-center justify-center ring-1 ring-black/5">
              <Icon className="h-9 w-9 text-primary" strokeWidth={2.2} />
            </div>
          </div>
          <div className="flex justify-center gap-1.5 mb-4">
            {STEPS.map((_, idx) => (
              <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-primary" : idx < i ? "w-3 bg-primary/40" : "w-3 bg-border"}`} />
            ))}
          </div>
          <h2 className="text-2xl font-extrabold text-center tracking-tight">{step.title}</h2>
          <p className="text-sm text-muted-foreground text-center mt-1.5 px-4">{step.tagline}</p>
        </div>
        <div className="px-6 pb-6">
          <ul className="space-y-3 mb-6">
            {step.benefits.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="text-foreground/85 leading-snug">{b}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl bg-muted/60 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <span>You're in control — change anytime in Profile → Settings.</span>
          </div>
          <Button onClick={handleAllow} disabled={busy} className="w-full h-12 rounded-pill text-base font-bold">
            {busy ? "Working…" : step.cta} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
          <button onClick={next} className="w-full mt-2 py-2.5 text-sm text-muted-foreground font-semibold">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}