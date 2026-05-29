import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpeedoLogo } from "@/components/speedo/SpeedoLogo";
import { toast } from "sonner";
import { Shield } from "lucide-react";

const phoneEmail = (phone: string) => `${phone}@phone.speedo.local`;
const phonePass = (phone: string, pin: string) => `spd-${pin}-${phone.slice(-4)}-pin`;

export default function AdminLogin() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^03\d{9}$/.test(phone)) { toast.error("Enter a valid mobile number"); return; }
    if (!/^\d{4}$/.test(pin)) { toast.error("PIN must be 4 digits"); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneEmail(phone), password: phonePass(phone, pin),
    });
    setBusy(false);
    if (error) { toast.error("Wrong phone or PIN"); return; }
    toast.success("Signed in");
    nav("/admin", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-card rounded-2xl shadow-card p-6 space-y-4 border border-border">
        <div className="flex items-center gap-2">
          <SpeedoLogo size={32} />
          <div className="font-extrabold text-lg flex items-center gap-1">
            Speedo <Shield className="h-4 w-4 text-primary" /> Admin
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Sign in with your phone number and PIN.</p>
        <div>
          <Label htmlFor="phone">Mobile number</Label>
          <div className="mt-1.5 flex">
            <span className="inline-flex items-center px-3 h-11 rounded-l-xl border border-r-0 border-input bg-muted text-sm font-semibold">PK +92</span>
            <Input id="phone" inputMode="numeric" autoComplete="username" value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="03xxxxxxxxx" className="h-11 rounded-r-xl rounded-l-none" maxLength={11} required />
          </div>
        </div>
        <div>
          <Label htmlFor="pin">4-digit PIN</Label>
          <Input id="pin" inputMode="numeric" type="password" autoComplete="current-password" value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="••••" className="mt-1.5 h-11 rounded-xl tracking-[0.5em] text-center" maxLength={4} required />
        </div>
        <Button type="submit" className="w-full h-11 rounded-pill" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}