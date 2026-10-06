import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/700.css";
import { registerSW } from "virtual:pwa-register";
import { HelmetProvider } from "react-helmet-async";
import { initNative, isNative } from "@/lib/native";

// Native shell (Android / iOS): status bar, splash, keyboard, back button.
void initNative();

// Recover from stale page chunks after an update: reload once instead of a blank screen.
const reloadOnce = () => {
  const k = "speedo-chunk-reload";
  if (sessionStorage.getItem(k)) return;
  sessionStorage.setItem(k, "1");
  window.location.reload();
};
window.addEventListener("vite:preloadError", (e) => { e.preventDefault(); reloadOnce(); });
const isChunkErr = (m: unknown) => /dynamically imported module|Importing a module script failed|Loading chunk/i.test(String(m));
window.addEventListener("error", (e) => { if (isChunkErr(e.message)) reloadOnce(); });
window.addEventListener("unhandledrejection", (e) => { if (isChunkErr((e.reason as Error)?.message ?? e.reason)) reloadOnce(); });
window.addEventListener("load", () => setTimeout(() => sessionStorage.removeItem("speedo-chunk-reload"), 10000));

// PWA registration guard: never register inside the Lovable preview iframe / preview hosts.
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app");

if (isInIframe || isPreviewHost || isNative()) {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
  }
} else {
  // Auto-update: when a new SW takes over, reload so users always get the latest admin changes
  // without needing to manually refresh or re-bookmark.
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() { updateSW?.(true); },
    onRegisteredSW(_swUrl, reg) {
      // Poll for updates every 30 minutes while app is open.
      if (reg) setInterval(() => { reg.update().catch(() => {}); }, 30 * 60 * 1000);
    },
  });
  // Reload once the new SW activates and claims the page.
  if ("serviceWorker" in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);
