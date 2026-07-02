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
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#fafaf7] p-6 overflow-hidden">
      {/* Ambient pastel glass wash */}
      <div className="pointer-events-none fixed -top-[10%] -left-[10%] w-[45%] h-[45%] bg-rose-200/25 blur-[120px] rounded-full" />
      <div className="pointer-events-none fixed -bottom-[10%] -right-[10%] w-[45%] h-[45%] bg-blue-100/30 blur-[120px] rounded-full" />
      <div className="pointer-events-none fixed top-1/3 left-1/2 -translate-x-1/2 w-[60%] h-[30%] bg-amber-100/20 blur-[100px] rounded-full" />

      <div className="relative w-full max-w-md">
        {/* Editorial brand header */}
        <header className="mb-8 text-center">
          <h1 style={{ fontFamily: "'Instrument Serif', serif" }} className="text-6xl text-stone-900 leading-none tracking-tight">
            Speedo <span className="italic">Pro</span>
          </h1>
          <p className="text-stone-400 font-light tracking-[0.25em] uppercase text-[10px] mt-3">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </p>
        </header>

        {/* Glass card */}
        <div className="bg-white/50 backdrop-blur-2xl border border-white/70 rounded-[32px] p-7 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.02]">
          {/* Tabs */}
          <div className="flex mb-7 p-1 bg-stone-900/5 rounded-full">
            {(["signup", "signin"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMode(t)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all ${
                  mode === t ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {t === "signup" ? "Sign Up" : "Sign In"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-5">
            {mode === "signup" && (
              <Field label="Full Name">
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name" maxLength={60} required
                  className="w-full bg-white/60 border border-white/80 rounded-2xl px-5 py-3.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:bg-white transition-all shadow-sm"
                />
              </Field>
            )}

            <Field label="Phone Number">
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-900 font-medium border-r border-stone-200 pr-3 text-sm">+92</span>
                <input
                  type="tel" inputMode="numeric" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="300 1234567" maxLength={11} required
                  className="w-full bg-white/60 border border-white/80 rounded-2xl pl-[68px] pr-5 py-3.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:bg-white transition-all shadow-sm"
                />
              </div>
            </Field>

            {mode === "signup" && (
              <Field label="Date of Birth" hint="A surprise gift awaits you on your birthday.">
                <input
                  type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)} required
                  className="w-full bg-white/60 border border-white/80 rounded-2xl px-5 py-3.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:bg-white transition-all shadow-sm"
                />
              </Field>
            )}

            <div className="space-y-2.5">
              <div className="flex justify-between items-end px-1">
                <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">4-Digit PIN</label>
                {mode === "signin" && (
                  <Link to="/forgot-pin" className="text-[11px] font-medium text-rose-500 hover:text-rose-600 transition-colors">
                    Forgot PIN?
                  </Link>
                )}
              </div>
              <div className="flex justify-between gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i} ref={pinRefs[i]} type="password" inputMode="numeric" maxLength={1}
                    value={pin[i] ?? ""}
                    onChange={(e) => setPinDigit(i, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Backspace" && !pin[i] && i > 0) pinRefs[i - 1].current?.focus(); }}
                    className="w-full aspect-square text-center text-xl font-semibold text-stone-900 bg-white/60 border border-white/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all shadow-sm"
                  />
                ))}
              </div>
            </div>

            <Button
              type="submit" disabled={busy}
              className="w-full mt-2 bg-stone-900 text-white py-5 h-auto rounded-2xl font-medium tracking-wide shadow-xl shadow-stone-900/20 active:scale-[0.98] transition-all hover:bg-stone-800"
            >
              {busy ? "Please wait…" : mode === "signup" ? "Create Account" : "Sign In"}
            </Button>

            {mode === "signup" && (
              <p className="text-[11px] text-center text-stone-400 leading-relaxed pt-1">
                New accounts need admin approval before placing orders.
              </p>
            )}
          </form>
        </div>

        {/* Editorial rule */}
        <div className="mt-10 text-center opacity-50">
          <span className="inline-block w-8 h-px bg-stone-400 align-middle" />
          <span style={{ fontFamily: "'Instrument Serif', serif" }} className="mx-4 italic text-stone-900 text-sm">
            Est. 2024
          </span>
          <span className="inline-block w-8 h-px bg-stone-400 align-middle" />
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider ml-1 block">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-stone-400 leading-relaxed px-1 pt-0.5">{hint}</p>}
    </div>
  );
}