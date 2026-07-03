import { useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { pkPhone } from "@/lib/validators";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/speedo-logo.png.asset.json";

type Mode = "signin" | "signup";

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
    <div className="min-h-screen w-full bg-neutral-50 flex items-center justify-center font-sans p-0 lg:p-6">
      <div className="w-full h-screen lg:h-auto lg:min-h-[720px] lg:max-w-6xl lg:rounded-3xl lg:shadow-2xl overflow-hidden flex flex-col lg:flex-row bg-white">
        {/* Brand panel — desktop only */}
        <div className="hidden lg:flex lg:w-1/2 bg-neutral-900 relative p-14 flex-col justify-between overflow-hidden">
          <div aria-hidden className="absolute top-0 right-0 w-96 h-96 bg-purple-600/25 rounded-full blur-3xl -mr-20 -mt-20" />
          <div aria-hidden className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl -ml-10 -mb-10" />
          <div className="relative z-10">
            <img src={logoAsset.url} alt="Speedo" className="h-12 w-auto brightness-0 invert" draggable={false} />
            <h2 className="text-4xl xl:text-5xl font-bold text-white mt-14 leading-[1.1] tracking-tight">
              Experience the next generation of <span className="text-purple-400">velocity</span>.
            </h2>
            <p className="text-neutral-400 mt-4 text-base font-normal max-w-md leading-relaxed">
              Join thousands who accelerate daily grocery, food, pharmacy and parcel deliveries on Speedo.
            </p>
          </div>
          <p className="relative z-10 text-neutral-500 text-xs font-normal">© 2026 Speedo. All rights reserved.</p>
        </div>

        {/* Form panel */}
        <div className="flex-1 flex flex-col p-6 sm:p-10 lg:p-14 overflow-y-auto">
          <div className="lg:hidden flex justify-center mb-8 pt-4">
            <img src={logoAsset.url} alt="Speedo" className="h-10 w-auto" draggable={false} />
          </div>

          <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
            {/* Tabs */}
            <div className="flex border-b border-neutral-100 mb-8">
              {(["signin", "signup"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMode(t)}
                  className={`flex-1 pb-4 text-sm font-bold border-b-2 transition-colors ${
                    mode === t ? "text-purple-600 border-purple-600" : "text-neutral-400 border-transparent hover:text-neutral-600"
                  }`}
                >
                  {t === "signup" ? "Sign Up" : "Sign In"}
                </button>
              ))}
            </div>

            <header className="mb-6">
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
                {mode === "signup" ? "Create an account" : "Welcome back"}
              </h1>
              <p className="text-neutral-500 mt-1 text-sm font-normal">
                {mode === "signup" ? "Get started with your phone number." : "Sign in with your phone and PIN."}
              </p>
            </header>

            <form onSubmit={submit} className="space-y-5">
              {mode === "signup" && (
                <Field label="Full Name">
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe" maxLength={60} required autoComplete="name"
                    className="w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all font-normal placeholder:text-neutral-400"
                  />
                </Field>
              )}

              <Field label="Phone Number">
                <div className="flex">
                  <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-neutral-200 bg-neutral-100 text-neutral-600 font-bold text-sm">+92</span>
                  <input
                    type="tel" inputMode="numeric" autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="300 1234567" maxLength={11} required
                    className="w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-r-xl focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all font-normal placeholder:text-neutral-400"
                  />
                </div>
              </Field>

              {mode === "signup" && (
                <Field label="Date of Birth" hint="A surprise gift awaits on your birthday.">
                  <input
                    type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)} required
                    className="w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all font-normal text-neutral-700"
                  />
                </Field>
              )}

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    {mode === "signup" ? "Set 4-Digit PIN" : "4-Digit PIN"}
                  </label>
                  {mode === "signin" && (
                    <Link to="/forgot-pin" className="text-xs font-bold text-purple-600 hover:text-purple-700">
                      Forgot PIN?
                    </Link>
                  )}
                </div>
                <div className="flex gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <input
                      key={i} ref={pinRefs[i]} type="password" inputMode="numeric" maxLength={1}
                      autoComplete="off"
                      value={pin[i] ?? ""}
                      onChange={(e) => setPinDigit(i, e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Backspace" && !pin[i] && i > 0) pinRefs[i - 1].current?.focus(); }}
                      className="w-full h-14 text-center text-xl font-bold bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600 transition-all"
                    />
                  ))}
                </div>
              </div>

              <Button
                type="submit" disabled={busy}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-4 h-auto rounded-xl transition-all shadow-lg active:scale-[0.98] mt-2"
              >
                {busy ? "Please wait…" : mode === "signup" ? "Create Account" : "Sign In"}
              </Button>

              {mode === "signup" && (
                <p className="text-center text-neutral-400 text-xs font-normal">
                  New accounts need admin approval before placing orders.
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-xs text-neutral-400 leading-relaxed pt-0.5 font-normal">{hint}</p>}
    </div>
  );
}