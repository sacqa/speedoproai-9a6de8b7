import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpeedoLogo } from "@/components/speedo/SpeedoLogo";
import { pkPhone } from "@/lib/validators";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function ForgotPin() {
  const [step, setStep] = useState<"verify" | "reset">("verify");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [token, setToken] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = pkPhone.safeParse(phone);
    if (!r.success) return toast.error(r.error.errors[0].message);
    if (!dob) return toast.error("Enter your date of birth");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "verify_dob_for_pin_reset", phone, dob },
    });
    setBusy(false);
    if (error || data?.error) {
      return toast.error(data?.error ?? "Could not verify identity");
    }
    setToken(data.reset_token);
    setStep("reset");
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) return toast.error("PIN must be 4 digits");
    if (pin !== confirmPin) return toast.error("PINs do not match");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "reset_pin_with_token", reset_token: token, new_pin: pin },
    });
    setBusy(false);
    if (error || data?.error) {
      return toast.error(data?.error ?? "Failed to update PIN");
    }
    toast.success("PIN updated. Please sign in.");
    nav("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="bg-primary text-white px-6 pt-14 pb-10 rounded-b-3xl">
        <SpeedoLogo size={48} />
        <h1 className="mt-4 text-3xl font-extrabold">Forgot PIN</h1>
        <p className="opacity-90 mt-1">
          {step === "verify" ? "Verify your identity with your date of birth" : "Set a new 4-digit PIN"}
        </p>
      </div>
      <div className="px-6 pt-6 max-w-md w-full mx-auto">
        {step === "verify" ? (
          <form onSubmit={verify} className="space-y-4">
            <div>
              <Label htmlFor="phone">Mobile number</Label>
              <div className="mt-1.5 flex">
                <span className="inline-flex items-center px-3 h-12 rounded-l-xl border border-r-0 border-input bg-muted text-sm font-semibold">PK +92</span>
                <Input id="phone" inputMode="numeric" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="03xxxxxxxxx" className="h-12 rounded-r-xl rounded-l-none" maxLength={11} required />
              </div>
            </div>
            <div>
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                max={new Date().toISOString().slice(0,10)} className="mt-1.5 h-12 rounded-xl" required />
              <p className="text-xs text-muted-foreground mt-1.5">
                Enter the same date of birth you used during signup.
              </p>
            </div>
            <Button type="submit" disabled={busy} className="w-full h-12 rounded-pill text-base">
              {busy ? "Verifying…" : "Verify"}
            </Button>
            <p className="text-xs text-center pt-2">
              <Link to="/login" className="text-primary font-semibold">Back to sign in</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={reset} className="space-y-4">
            <div>
              <Label htmlFor="pin">New 4-digit PIN</Label>
              <Input id="pin" inputMode="numeric" type="password" value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••" className="mt-1.5 h-12 rounded-xl tracking-[0.5em] text-center" maxLength={4} required />
            </div>
            <div>
              <Label htmlFor="cpin">Confirm PIN</Label>
              <Input id="cpin" inputMode="numeric" type="password" value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••" className="mt-1.5 h-12 rounded-xl tracking-[0.5em] text-center" maxLength={4} required />
            </div>
            <Button type="submit" disabled={busy} className="w-full h-12 rounded-pill text-base">
              {busy ? "Saving…" : "Save new PIN"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}