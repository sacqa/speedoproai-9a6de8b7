import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpeedoLogo } from "@/components/speedo/SpeedoLogo";
import { pkPhone } from "@/lib/validators";
import { toast } from "sonner";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const nav = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = pkPhone.safeParse(phone);
    if (!r.success) { toast.error(r.error.errors[0].message); return; }
    sessionStorage.setItem("speedo-otp-phone", phone);
    sessionStorage.setItem("speedo-otp-name", name.trim());
    toast.success("OTP sent. Use 123456 (mock).");
    nav("/otp");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="bg-primary text-white px-6 pt-14 pb-10 rounded-b-3xl">
        <SpeedoLogo size={48} />
        <h1 className="mt-4 text-3xl font-extrabold">Welcome to Speedo</h1>
        <p className="opacity-90 mt-1">Sign in to start ordering</p>
      </div>
      <form onSubmit={submit} className="flex-1 px-6 pt-8 space-y-5 max-w-md w-full mx-auto">
        <div>
          <Label htmlFor="name">Your name (optional)</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ali Khan" className="mt-1.5 h-12 rounded-xl" maxLength={60} />
        </div>
        <div>
          <Label htmlFor="phone">Mobile number</Label>
          <div className="mt-1.5 flex">
            <span className="inline-flex items-center px-3 h-12 rounded-l-xl border border-r-0 border-input bg-muted text-sm font-semibold">PK +92</span>
            <Input
              id="phone"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="03xxxxxxxxx"
              className="h-12 rounded-r-xl rounded-l-none"
              maxLength={11}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">We'll send a 6-digit OTP. Use <b>123456</b> for testing.</p>
        </div>
        <Button type="submit" className="w-full h-12 rounded-pill text-base">Send OTP</Button>
        <p className="text-xs text-center text-muted-foreground pt-4">
          By continuing you agree to Speedo's Terms & Privacy.
        </p>
      </form>
    </div>
  );
}