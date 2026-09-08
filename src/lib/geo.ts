import { useState } from "react";

export type GeoPoint = { lat: number; lng: number; accuracy?: number | null; at?: string };

export const mapsLink = (g: { lat: number; lng: number }) =>
  `https://www.google.com/maps?q=${g.lat},${g.lng}`;

/** Asks the browser for the device's exact position (used at checkout). */
export function useCurrentLocation() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = (): Promise<GeoPoint | null> =>
    new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        setError("Your device can't share location.");
        resolve(null);
        return;
      }
      setBusy(true);
      setError(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setBusy(false);
          resolve({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
            accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null,
            at: new Date().toISOString(),
          });
        },
        (err) => {
          setBusy(false);
          setError(
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied. Allow it in your browser settings."
              : "Couldn't get your location. Try again outdoors.",
          );
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });

  return { request, busy, error };
}
