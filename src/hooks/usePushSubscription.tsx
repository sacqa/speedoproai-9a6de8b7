import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/vapid";

export function usePushSubscription() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, []);

  const subscribe = async () => {
    if (!user) return false;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported"); return false;
    }
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
        });
      }
      const json: any = sub.toJSON();
      await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent,
      }, { onConflict: "endpoint" });
      setSubscribed(true);
      return true;
    } finally { setBusy(false); }
  };

  const unsubscribe = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally { setBusy(false); }
  };

  return { permission, subscribed, busy, subscribe, unsubscribe };
}