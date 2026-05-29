import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpeedoLogo } from "@/components/speedo/SpeedoLogo";
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
    <div className="min-h-screen flex flex-col bg-background">
      <div className="bg-primary text-white px-6 pt-14 pb-10 rounded-b-3xl">
        <SpeedoLogo size={48} />
        <h1 className="mt-4 text-3xl font-extrabold">Welcome to Speedo</h1>
        <p className="opacity-90 mt-1">{mode === "signup" ? "Create your account" : "Sign in to continue"}</p>
      </div>
      <div className="px-6 pt-6 max-w-md w-full mx-auto">
        <div className="flex gap-1 bg-muted rounded-pill p-1 mb-5">
          {(["signup","signin"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setMode(t)}
              className={`flex-1 py-2 rounded-pill text-sm font-bold capitalize ${mode === t ? "bg-card shadow-card text-foreground" : "text-muted-foreground"}`}>
              {t === "signup" ? "Sign up" : "Sign in"}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ali Khan" className="mt-1.5 h-12 rounded-xl" maxLength={60} required />
            </div>
          )}
          <div>
            <Label htmlFor="phone">Mobile number</Label>
            <div className="mt-1.5 flex">
              <span className="inline-flex items-center px-3 h-12 rounded-l-xl border border-r-0 border-input bg-muted text-sm font-semibold">PK +92</span>
              <Input id="phone" inputMode="numeric" value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="03xxxxxxxxx" className="h-12 rounded-r-xl rounded-l-none" maxLength={11} required />
            </div>
          </div>
          {mode === "signup" && (
            <div>
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                max={new Date().toISOString().slice(0,10)}
                className="mt-1.5 h-12 rounded-xl" required />
              <p className="text-xs text-muted-foreground mt-1.5">Enter your real birthday to receive a surprise gift on your birthday.</p>
            </div>
          )}
          <div>
            <Label htmlFor="pin">4-digit PIN</Label>
            <Input id="pin" inputMode="numeric" type="password" value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••" className="mt-1.5 h-12 rounded-xl tracking-[0.5em] text-center" maxLength={4} required />
          </div>
          <Button type="submit" disabled={busy} className="w-full h-12 rounded-pill text-base">
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </Button>
          {mode === "signin" && (
            <p className="text-xs text-center pt-1">
              <Link to="/forgot-pin" className="text-primary font-semibold hover:underline">Forgot PIN?</Link>
            </p>
          )}
          {mode === "signup" && (
            <p className="text-xs text-center text-muted-foreground pt-1">
              New accounts need admin approval before placing orders.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}