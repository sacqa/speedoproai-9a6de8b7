import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Locks the whole customer app behind admin approval.
// Pending / rejected / banned users cannot reach ANY app screen.
export function RequireApproved({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<"approved" | "pending" | "rejected" | "banned" | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (loading) return;
    if (!user) { setChecking(false); return; }
    setChecking(true);
    supabase
      .from("profiles")
      .select("approval_status,is_banned")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.is_banned) setStatus("banned");
        else setStatus((data?.approval_status as any) ?? "pending");
        setChecking(false);
      });
    return () => { cancelled = true; };
  }, [user, loading]);

  if (loading || (user && checking)) {
    return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (status !== "approved") return <Navigate to="/pending" replace />;
  return children;
}