import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pkPhone } from "@/lib/validators";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

type Mode = "signin" | "signup";

// Convert phone + 4-digit PIN into the internal credentials used by auth.
// Customers never see these — they only enter phone + PIN.
const phoneEmail = (phone: string) => `${phone}@phone.speedo.local`;
const phonePass = (phone: string, pin: string) => `spd-${pin}-${phone.slice(-4)}-pin`;

export default function Login() {
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const setPinDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = (pin.padEnd(4, " ").split(""));
    next[i] = d || " ";
    const joined = next.join("").trimEnd();
    setPin(joined);
    if (d && i < 3) pinRefs[i + 1].current?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = pkPhone.safeParse(phone);
    if (!r.success) { toast.error(r.error.errors[0].message); return; }
    if (!/^\d{4}$/.test(pin)) { toast.error("PIN must be 4 digits"); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) { toast.error("Enter your name"); setBusy(false); return; }
        if (!dob) { toast.error("Enter your date of birth"); setBusy(false); return; }
        const { error } = await supabase.auth.signUp({
          email: phoneEmail(phone),
          password: phonePass(phone, pin),
          options: {
            data: { full_name: name.trim(), phone, dob },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) {
          if (/registered|exists/i.test(error.message)) toast.error("This phone is already registered. Please sign in.");
          else toast.error(error.message);
          setBusy(false); return;
        }
        await supabase.auth.signInWithPassword({
          email: phoneEmail(phone), password: phonePass(phone, pin),
        });
        toast.success("Account created. Awaiting admin approval.");
        nav("/pending", { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: phoneEmail(phone), password: phonePass(phone, pin),
        });
        if (error) { toast.error("Wrong phone or PIN"); setBusy(false); return; }
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: p } = await supabase.from("profiles").select("approval_status").eq("id", user.id).maybeSingle();
          if (p?.approval_status !== "approved") { nav("/pending", { replace: true }); return; }
        }
        nav("/", { replace: true });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-[420px] bg-card rounded-[42px] shadow-[0_32px_64px_-24px_hsl(var(--primary)/0.18)] overflow-hidden border border-border">
        {/* Brand header */}
        <div className="relative bg-gradient-to-br from-primary via-[hsl(var(--primary))] to-[hsl(var(--primary)/0.85)] pt-14 pb-12 px-10 overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/20 rounded-full blur-[60px] animate-pulse" />
          <div className="absolute -bottom-20 -left-10 w-48 h-48 bg-white/15 rounded-full blur-[40px]" />
          <div className="relative z-10">
            <h1 className="text-white text-3xl font-extrabold tracking-tight mb-2">Welcome to Speedo</h1>
            <p className="text-white/85 text-sm font-medium leading-relaxed">{mode === "signup" ? "Create your account to get started" : "Sign in to continue"}</p>
          </div>
        </div>

        <div className="px-8 pt-10 pb-10 bg-card relative">
          {/* Tabs */}
          <div className="flex p-1.5 bg-muted rounded-2xl mb-8">
            {(["signup","signin"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setMode(t)}
                className={`flex-1 py-2.5 text-sm rounded-xl transition-all ${mode === t ? "bg-card text-primary font-bold shadow-sm" : "text-muted-foreground font-semibold hover:text-foreground"}`}>
                {t === "signup" ? "Sign Up" : "Sign In"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-6">
            {mode === "signup" && (
              <FloatingField id="full_name" label="Full Name">
                <input id="full_name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder=" " maxLength={60} required
                  className="peer w-full px-5 py-4 bg-muted/40 border border-border rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-card transition-all text-foreground placeholder-transparent" />
              </FloatingField>
            )}

            <div className="flex gap-3">
              <div className="flex items-center gap-2 px-4 py-4 bg-muted/40 border border-border rounded-2xl">
                <span className="text-sm font-bold text-foreground">+92</span>
              </div>
              <FloatingField id="mobile_number" label="Mobile Number" className="flex-1">
                <input id="mobile_number" type="tel" inputMode="numeric" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder=" " maxLength={11} required
                  className="peer w-full px-5 py-4 bg-muted/40 border border-border rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-card transition-all text-foreground placeholder-transparent" />
              </FloatingField>
            </div>

            {mode === "signup" && (
              <div className="relative">
                <input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                  max={new Date().toISOString().slice(0,10)} required
                  className="peer w-full px-5 py-4 bg-muted/40 border border-border rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-card transition-all text-foreground" />
                <label htmlFor="dob" className="absolute left-4 -top-2.5 text-xs text-primary bg-card px-1.5 font-medium">Date of Birth</label>
                <p className="mt-2.5 text-[11px] text-muted-foreground leading-relaxed px-1">A surprise gift awaits you on your birthday.</p>
              </div>
            )}

            <div>
              <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3 ml-1">Secure PIN</span>
              <div className="flex justify-between gap-3">
                {[0,1,2,3].map((i) => (
                  <input key={i} ref={pinRefs[i]} type="password" inputMode="numeric" maxLength={1} value={pin[i] ?? ""}
                    onChange={(e) => setPinDigit(i, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Backspace" && !pin[i] && i > 0) pinRefs[i-1].current?.focus(); }}
                    className="w-full h-14 text-center bg-muted/40 border border-border rounded-2xl text-xl font-bold text-primary focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-card focus:outline-none transition-all" />
                ))}
              </div>
            </div>

            <Button type="submit" disabled={busy}
              className="w-full mt-2 bg-primary text-primary-foreground font-bold py-4 h-auto rounded-[22px] shadow-[0_12px_28px_-6px_hsl(var(--primary)/0.45)] hover:bg-primary/90 hover:shadow-[0_16px_32px_-6px_hsl(var(--primary)/0.5)] active:scale-[0.98] transition-all">
              {busy ? "Please wait…" : mode === "signup" ? "Create Account" : "Sign In"}
            </Button>

            {mode === "signin" && (
              <p className="text-xs text-center pt-1">
                <Link to="/forgot-pin" className="text-primary font-semibold hover:underline">Forgot PIN?</Link>
              </p>
            )}
            {mode === "signup" && (
              <p className="text-[11px] text-center text-muted-foreground pt-1">
                New accounts need admin approval before placing orders.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function FloatingField({ id, label, className = "", children }: { id: string; label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`relative ${className}`}>
      {children}
      <label htmlFor={id}
        className="absolute left-5 top-4 text-muted-foreground text-sm font-medium transition-all pointer-events-none
                   peer-focus:-top-2.5 peer-focus:left-4 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-card peer-focus:px-1.5
                   peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary peer-[:not(:placeholder-shown)]:bg-card peer-[:not(:placeholder-shown)]:px-1.5">
        {label}
      </label>
    </div>
  );
}