import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpeedoLogo } from "@/components/speedo/SpeedoLogo";
import { pkPhone } from "@/lib/validators";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Mode = "signin" | "signup";

export default function Login() {
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) { toast.error("Enter a valid email"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const r = pkPhone.safeParse(phone);
        if (!r.success) { toast.error(r.error.errors[0].message); setBusy(false); return; }
        if (!name.trim()) { toast.error("Enter your name"); setBusy(false); return; }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name.trim(), phone }, emailRedirectTo: window.location.origin },
        });
        if (error) { toast.error(error.message); setBusy(false); return; }
        // Sign in immediately (auto-confirm may be off; try to sign in anyway)
        await supabase.auth.signInWithPassword({ email, password });
        toast.success("Account created. Awaiting admin approval.");
        nav("/pending", { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { toast.error(error.message); setBusy(false); return; }
        // Check approval status
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
            <>
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ali Khan" className="mt-1.5 h-12 rounded-xl" maxLength={60} required />
              </div>
              <div>
                <Label htmlFor="phone">Mobile number</Label>
                <div className="mt-1.5 flex">
                  <span className="inline-flex items-center px-3 h-12 rounded-l-xl border border-r-0 border-input bg-muted text-sm font-semibold">PK +92</span>
                  <Input id="phone" inputMode="numeric" value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="03xxxxxxxxx" className="h-12 rounded-r-xl rounded-l-none" maxLength={11} required />
                </div>
              </div>
            </>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1.5 h-12 rounded-xl" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="mt-1.5 h-12 rounded-xl" required />
          </div>
          <Button type="submit" disabled={busy} className="w-full h-12 rounded-pill text-base">
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </Button>
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