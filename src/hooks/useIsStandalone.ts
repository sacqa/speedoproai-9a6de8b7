import { useEffect, useState } from "react";

/**
 * True when the app is launched as an installed PWA
 * (Add to Home Screen on iOS/Android, or installed on desktop).
 */
export function useIsStandalone() {
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(display-mode: standalone)");
    const update = () =>
      setStandalone(mq.matches || (window.navigator as any).standalone === true);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return standalone;
}