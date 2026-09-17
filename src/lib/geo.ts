import { useState } from "react";
import { getPosition } from "@/lib/native";

export type GeoPoint = { lat: number; lng: number; accuracy?: number | null; at?: string };

export const mapsLink = (g: { lat: number; lng: number }) =>
  `https://www.google.com/maps?q=${g.lat},${g.lng}`;

/** Asks the browser for the device's exact position (used at checkout). */
export function useCurrentLocation() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async (): Promise<GeoPoint | null> => {
    setBusy(true);
    setError(null);
    try {
      const pos = await getPosition();
      setBusy(false);
      return {
        lat: Number(pos.coords.latitude.toFixed(6)),
        lng: Number(pos.coords.longitude.toFixed(6)),
        accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null,
        at: new Date().toISOString(),
      };
    } catch (err: unknown) {
      setBusy(false);
      const code = (err as GeolocationPositionError | undefined)?.code;
      setError(
        code === 1
          ? "Location permission denied. Allow location access in your settings."
          : "Couldn't get your location. Try again outdoors.",
      );
      return null;
    }
  };

  return { request, busy, error };
}
