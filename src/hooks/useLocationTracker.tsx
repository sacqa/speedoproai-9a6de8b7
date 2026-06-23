import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Continuously syncs the signed-in user's geolocation to public.user_locations
 * whenever the browser has already granted permission. Silent (never prompts).
 * Throttles writes to once per 30 s OR 25 m movement to keep usage cheap.
 */
export function useLocationTracker() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || typeof navigator === "undefined" || !("geolocation" in navigator)) return;

    let watchId: number | null = null;
    let lastSent = 0;
    let lastLat = 0;
    let lastLng = 0;
    let cancelled = false;

    const start = () => {
      if (cancelled) return;
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const now = Date.now();
          const dx = haversine(lastLat, lastLng, pos.coords.latitude, pos.coords.longitude);
          if (now - lastSent < 30_000 && dx < 25) return;
          lastSent = now;
          lastLat = pos.coords.latitude;
          lastLng = pos.coords.longitude;
          try {
            await supabase.from("user_locations").upsert({
              user_id: user.id,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              share_enabled: true,
            });
          } catch {/* offline / RLS — ignore */}
        },
        () => {/* ignore errors silently */},
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 20_000 },
      );
    };

    // Only start if permission already granted — never prompt here.
    if ("permissions" in navigator && (navigator as any).permissions?.query) {
      (navigator as any).permissions
        .query({ name: "geolocation" as PermissionName })
        .then((status: PermissionStatus) => {
          if (status.state === "granted") start();
          status.onchange = () => {
            if (status.state === "granted" && watchId == null) start();
            if (status.state !== "granted" && watchId != null) {
              navigator.geolocation.clearWatch(watchId);
              watchId = null;
            }
          };
        })
        .catch(() => {/* fallback: try once silently */});
    }

    return () => {
      cancelled = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, [user]);
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}