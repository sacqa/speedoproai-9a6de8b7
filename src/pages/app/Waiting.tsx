import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SpeedoLogo } from "@/components/speedo/SpeedoLogo";
import { Loader2, Clock, CheckCircle2, XCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "pending" | "approved" | "rejected";

export default function Waiting() {
  const { user, signOut, loading } = useAuth();
  const nav = useNavigate();
  const [status, setStatus] = useState<Status>("pending");
  const [elapsed, setElapsed] = useState(0);

  // Redirect to login if not signed in
  useEffect(() => {
    if (!loading && !user) nav("/login", { replace: true });
  }, [loading, user, nav]);

  // Poll + realtime
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase.from("profiles").select("approval_status").eq("id", user.id).maybeSingle();
      if (cancelled) return;
      const s = (data?.approval_status as Status) ?? "pending";
      setStatus(s);
      if (s === "approved") setTimeout(() => nav("/", { replace: true }), 800);
    };
    check();
    const interval = setInterval(check, 2000);
    const tick = setInterval(() => setElapsed((e) => e + 1), 1000);
    const ch = supabase
      .channel(`approval-${user.id}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload: any) => {
          const s = payload.new?.approval_status as Status;
          if (s) {
            setStatus(s);
            if (s === "approved") setTimeout(() => nav("/", { replace: true }), 800);
          }
        })
      .subscribe();
    return () => {
      cancelled = true;
      clearInterval(interval); clearInterval(tick);
      supabase.removeChannel(ch);
    };
  }, [user, nav]);

  const stillWaiting = elapsed >= 15 && status === "pending";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="bg-primary text-white px-6 pt-14 pb-10 rounded-b-3xl">
        <SpeedoLogo size={48} />
        <h1 className="mt-4 text-3xl font-extrabold">Account Verification</h1>
      </div>
      <div className="flex-1 px-6 pt-10 max-w-md w-full mx-auto text-center">
        {status === "pending" && (
          <>
            <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              {stillWaiting ? <Clock className="h-10 w-10 text-primary" /> : <Loader2 className="h-10 w-10 text-primary animate-spin" />}
            </div>
            <p className="mt-6 text-lg font-semibold">
              {stillWaiting
                ? "Your request is pending. Please wait for admin approval."
                : "Please wait, your account approval request has been sent to admin."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {stillWaiting ? "You'll be redirected automatically once approved." : `Checking… ${15 - elapsed}s`}
            </p>
          </>
        )}
        {status === "approved" && (
          <>
            <CheckCircle2 className="mx-auto h-20 w-20 text-success" />
            <p className="mt-6 text-lg font-semibold">You're approved! Redirecting…</p>
          </>
        )}
        {status === "rejected" && (
          <>
            <XCircle className="mx-auto h-20 w-20 text-destructive" />
            <p className="mt-6 text-lg font-semibold">Your signup request was rejected.</p>
            <p className="mt-2 text-sm text-muted-foreground">Please contact Speedo support if you believe this is a mistake.</p>
          </>
        )}
        <Button variant="outline" className="mt-10 rounded-pill gap-2" onClick={async () => { await signOut(); nav("/login", { replace: true }); }}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}