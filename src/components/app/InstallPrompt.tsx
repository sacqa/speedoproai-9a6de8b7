import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SpeedoLogo } from "@/components/speedo/SpeedoLogo";
import { X, Download, Share } from "lucide-react";

const DISMISS_KEY = "speedo.install.dismissedAt";
const DISMISS_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as any).standalone === true
  );
}

function isIos() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isInIframe() {
  try { return window.self !== window.top; } catch { return true; }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isInIframe() || isStandalone()) return;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS Safari has no beforeinstallprompt — show manual hint after a small delay.
    let t: number | undefined;
    if (isIos()) {
      t = window.setTimeout(() => { setIosHint(true); setOpen(true); }, 1200);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (t) clearTimeout(t);
    };
  }, []);

  if (!open) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    setDeferred(null);
    setOpen(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-md bg-card shadow-2xl rounded-2xl border border-border p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <SpeedoLogo size={28} variant="mark" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">Install Speedo</div>
          {iosHint && !deferred ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Tap <Share className="inline h-3 w-3 mx-0.5" /> then <b>Add to Home Screen</b> for the app experience.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              Get faster access, offline support and push updates.
            </p>
          )}
          <div className="flex gap-2 mt-3">
            {deferred && (
              <Button size="sm" onClick={install} className="rounded-pill h-8">
                <Download className="h-3.5 w-3.5 mr-1" /> Install
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={dismiss} className="rounded-pill h-8">
              Not now
            </Button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Close" className="p-1 -m-1 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}