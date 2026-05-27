import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpeedoLogo } from "@/components/speedo/SpeedoLogo";
import { toast } from "sonner";
import { Shield } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
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
        <p className="text-sm text-muted-foreground">Sign in with your admin email and password.</p>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1.5" />
        </div>
        <Button type="submit" className="w-full h-11 rounded-pill" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}