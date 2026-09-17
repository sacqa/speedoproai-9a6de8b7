import { useEffect, useState } from "react";

const STORAGE_KEY = "speedo-was-standalone";

/**
 * True when the app is launched as an installed PWA.
 * Covers:
 *  - Android / Desktop Chromium  → `display-mode: standalone`
 *  - Android Trusted Web Activity → `display-mode: minimal-ui` / referrer "android-app://"
 *  - iOS Safari Add-to-Home-Screen → `navigator.standalone === true`
 *  - Launched via PWA shortcut on Android → `?source=pwa` or `utm_source=homescreen`
 * Result is sticky for the session: once standalone, stays standalone even if
 * a subframe later reports otherwise.
 */
export function useIsStandalone() {
  const [standalone, setStandalone] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return true;
    } catch {}
    return detect();
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mqs = [
      window.matchMedia("(display-mode: standalone)"),
      window.matchMedia("(display-mode: minimal-ui)"),
      window.matchMedia("(display-mode: fullscreen)"),
    ];
    const update = () => {
      const isIt = detect();
      if (isIt) {
        try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch {}
        setStandalone(true);
      }
    };
    update();
    mqs.forEach((mq) => mq.addEventListener?.("change", update));
    return () => mqs.forEach((mq) => mq.removeEventListener?.("change", update));
  }, []);

  return standalone;
}

function detect(): boolean {
  if (typeof window === "undefined") return false;
  const nav: any = window.navigator;
  // Installed native app (Capacitor on Android / iOS) behaves like standalone.
  if ((window as any).Capacitor?.isNativePlatform?.()) return true;
  if (nav.standalone === true) return true; // iOS
  const dm = (q: string) => window.matchMedia(q).matches;
  if (dm("(display-mode: standalone)") || dm("(display-mode: minimal-ui)") || dm("(display-mode: fullscreen)")) return true;
  if (typeof document !== "undefined" && document.referrer.startsWith("android-app://")) return true;
  try {
    const p = new URLSearchParams(window.location.search);
    if (p.get("source") === "pwa" || p.get("utm_source") === "homescreen") return true;
  } catch {}
  return false;
}