import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Otp() {
  const phone = sessionStorage.getItem("speedo-otp-phone") || "";
  const name = sessionStorage.getItem("speedo-otp-name") || "";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const verify = async () => {
    if (code !== "123456") { toast.error("Wrong code. Use 123456."); return; }
    setBusy(true);
    // Mock OTP: sign user in via email/password derived from phone (no real email needed).
    const email = `${phone}@speedo.local`;
    const password = `speedo_${phone}_pwd!`;
    try {
      let { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Try to create the account; ignore "already registered" errors.
        const { error: signUpErr } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name, phone }, emailRedirectTo: window.location.origin },
        });
        if (signUpErr && !/registered|exists/i.test(signUpErr.message)) {
          toast.error(signUpErr.message);
          setBusy(false);
          return;
        }
        const r = await supabase.auth.signInWithPassword({ email, password });
        if (r.error) {
          toast.error(r.error.message);
          setBusy(false);
          return;
        }
      }
      toast.success("Signed in!");
      nav("/", { replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? "Sign-in failed");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 pt-16">
      <button onClick={() => nav(-1)} className="text-sm text-muted-foreground self-start mb-6">← Back</button>
      <h1 className="text-2xl font-extrabold">Verify your number</h1>
      <p className="text-muted-foreground mt-1 text-sm">Enter the 6-digit code sent to <b>+92 {phone}</b></p>
      <div className="my-10 flex justify-center">
        <InputOTP maxLength={6} value={code} onChange={setCode}>
          <InputOTPGroup>
            {[0,1,2,3,4,5].map((i) => (
              <InputOTPSlot key={i} index={i} className="h-12 w-11 text-lg" />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <Button className="w-full h-12 rounded-pill" disabled={code.length < 6 || busy} onClick={verify}>
        {busy ? "Verifying…" : "Verify & Continue"}
      </Button>
      <button className="mt-6 text-sm text-primary font-semibold mx-auto">Resend code</button>
    </div>
  );
}