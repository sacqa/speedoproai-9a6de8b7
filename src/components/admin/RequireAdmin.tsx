import { Navigate, useLocation } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/hooks/useAuth";

export function RequireAdmin({ children }: { children: JSX.Element }) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading } = useIsAdmin();
  const location = useLocation();
  if (authLoading || loading) {
    return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!isAdmin) {
    return (
      <div className="p-10 text-center max-w-md mx-auto">
        <h1 className="text-2xl font-extrabold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground mt-2 text-sm">Your account does not have admin privileges.</p>
      </div>
    );
  }
  return children;
}