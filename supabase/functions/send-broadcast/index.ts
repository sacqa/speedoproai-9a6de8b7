// Send a push notification + in-app notification to all users (or a single user).
// Uses VAPID web-push with mock keys (replace for production).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mock VAPID keys for testing. Replace with production keys before going live.
const VAPID_PUBLIC_KEY = "BJ_pRtddKZtOU8t1KD4L21zYdeyEbYdhFVrRyf2FaAEHnBOvYoP_IwMECXvkLArXSJFpMrARbx6TtOaWuzXBFgE";
const VAPID_PRIVATE_KEY = "jxZtjfXMQnnETYar3251rS3BXNVg1d_rQqNYzXbjq3A";
const VAPID_SUBJECT = "mailto:admin@speedo.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const uid = claims.claims.sub as string;

    // Verify admin
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const title = String(body.title ?? "").trim();
    const message = String(body.message ?? "").trim();
    const url = typeof body.url === "string" ? body.url : "/notifications";
    if (!title || !message) return json({ error: "title and message required" }, 400);

    // Use service role for broadcast writes
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get all user ids
    const { data: users } = await admin.from("profiles").select("id");
    const userIds = (users ?? []).map((u: any) => u.id);

    // Insert in-app notifications (one per user)
    if (userIds.length) {
      const rows = userIds.map((id: string) => ({ user_id: id, title, message }));
      await admin.from("notifications").insert(rows);
    }

    // Get all push subscriptions
    const { data: subs } = await admin.from("push_subscriptions").select("*");
    const payload = JSON.stringify({ title, body: message, url });

    let sent = 0, failed = 0;
    const stale: string[] = [];
    await Promise.all((subs ?? []).map(async (s: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (e: any) {
        failed++;
        if (e?.statusCode === 404 || e?.statusCode === 410) stale.push(s.endpoint);
      }
    }));
    if (stale.length) await admin.from("push_subscriptions").delete().in("endpoint", stale);

    return json({ ok: true, users: userIds.length, push_sent: sent, push_failed: failed, removed_stale: stale.length });
  } catch (e: any) {
    return json({ error: e?.message ?? "Server error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}