// Public VAPID key (mock/test). Safe to expose in client.
// Replace with production key + matching private key in edge function before going live.
export const VAPID_PUBLIC_KEY =
  "BJ_pRtddKZtOU8t1KD4L21zYdeyEbYdhFVrRyf2FaAEHnBOvYoP_IwMECXvkLArXSJFpMrARbx6TtOaWuzXBFgE";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}