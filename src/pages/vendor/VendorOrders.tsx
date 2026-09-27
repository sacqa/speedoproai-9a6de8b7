import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GuestOrdersPanel from "@/components/admin/GuestOrdersPanel";
import { Button } from "@/components/ui/button";

export default function VendorOrders() {
  const { user, loading, signOut } = useAuth();
  const [vendor, setVendor] = useState<{ id: string; name: string } | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: link } = await supabase.from("vendor_users").select("vendor_id").eq("user_id", user.id).maybeSingle();
      if (!link) { setVendor(null); return; }
      const { data: v } = await supabase.from("food_vendors").select("id,name").eq("id", link.vendor_id).maybeSingle();
      setVendor({ id: link.vendor_id, name: v?.name ?? "Your shop" });
    })();
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (vendor === undefined) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="min-h-screen bg-muted/30 p-4 max-w-3xl mx-auto space-y-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold truncate">{vendor?.name ?? "Vendor"}</h1>
        <Button size="sm" variant="outline" onClick={signOut}>Sign out</Button>
      </header>
      {vendor ? (
        <GuestOrdersPanel vendorId={vendor.id} readOnly />
      ) : (
        <p className="text-sm text-muted-foreground bg-card rounded-xl p-6 text-center">
          This account isn't linked to a shop yet. Ask the Speedo admin to link it.
        </p>
      )}
    </div>
  );
}
