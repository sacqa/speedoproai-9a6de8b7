import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { playAdminTone } from "@/hooks/useAdminOrderAlert";

/**
 * Live notification for admin whenever a new customer profile is created.
 * Plays the admin tone and shows a toast with the customer name + join time.
 * Clicking the toast opens the customer's profile page.
 */
export function useAdminNewCustomerAlert(enabled: boolean) {
  const seen = useRef<Set<string>>(new Set());
  const navigate = useNavigate();
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("admin-new-customers")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        (payload) => {
          const p: any = payload.new;
          if (!p?.id || seen.current.has(p.id)) return;
          seen.current.add(p.id);
          const name = p.full_name || "New customer";
          const when = new Date(p.created_at || Date.now());
          playAdminTone();
          try {
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("New customer joined", {
                body: `${name} · ${when.toLocaleString()}`,
                icon: "/icon-192.png",
                tag: `cust-${p.id}`,
              });
            }
          } catch {}
          toast.success("New customer joined", {
            description: `${name} · ${when.toLocaleString()}`,
            action: { label: "View", onClick: () => navigate(`/admin/customers/${p.id}`) },
            duration: 10000,
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [enabled, navigate]);
}