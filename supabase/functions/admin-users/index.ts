import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPER_ADMIN_PHONE = "03110406221";
const SUPER_ADMIN_PIN = "8080";

// Same synthetic-credential formula used by the customer & admin sign-in pages.
const phoneEmail = (phone: string) => `${phone}@phone.speedo.local`;
const phonePass = (phone: string, pin: string) => `spd-${pin}-${phone.slice(-4)}-pin`;

// In-memory PIN-reset tokens (single edge worker scope, 10 min TTL).
const resetTokens = new Map<string, { user_id: string; phone: string; exp: number }>();
const issueResetToken = (user_id: string, phone: string) => {
  const token = crypto.randomUUID() + "-" + crypto.randomUUID();
  resetTokens.set(token, { user_id, phone, exp: Date.now() + 10 * 60 * 1000 });
  return token;
};
const consumeResetToken = (token: string) => {
  const rec = resetTokens.get(token);
  if (!rec) return null;
  resetTokens.delete(token);
  if (rec.exp < Date.now()) return null;
  return rec;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const action = body?.action as string;

  // Public bootstrap: ensures the phone-based super admin exists with the canonical PIN.
  if (action === "bootstrap_super_admin") {
    const email = phoneEmail(SUPER_ADMIN_PHONE);
    const password = phonePass(SUPER_ADMIN_PHONE, SUPER_ADMIN_PIN);
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let user = list?.users?.find((u: any) => u.email === email);
    if (!user) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: "Super Admin", phone: SUPER_ADMIN_PHONE },
      });
      if (error) return json({ error: error.message }, 400);
      user = created.user!;
    } else {
      await admin.auth.admin.updateUserById(user.id, { password });
    }
    await admin.from("profiles").upsert({
      id: user.id, full_name: "Super Admin", phone: SUPER_ADMIN_PHONE,
      approval_status: "approved", approved_at: new Date().toISOString(),
    });
    await admin.from("user_roles").upsert({ user_id: user.id, role: "super_admin" });
    await admin.from("user_roles").upsert({ user_id: user.id, role: "admin" });
    return json({ ok: true, phone: SUPER_ADMIN_PHONE });
  }

  // Public: verify identity via phone + dob, return a short-lived reset token.
  if (action === "verify_dob_for_pin_reset") {
    const phone = String(body.phone ?? "").trim();
    const dob = String(body.dob ?? "").trim();
    if (!/^03\d{9}$/.test(phone) || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      return json({ error: "Invalid phone or date of birth" }, 400);
    }
    const { data: profile } = await admin
      .from("profiles").select("id, dob, phone").eq("phone", phone).maybeSingle();
    if (!profile || !profile.dob) {
      // Generic message to avoid account enumeration.
      return json({ error: "Could not verify identity" }, 400);
    }
    const profileDob = String(profile.dob).slice(0, 10);
    if (profileDob !== dob) {
      return json({ error: "Could not verify identity" }, 400);
    }
    const reset_token = issueResetToken(profile.id, phone);
    return json({ ok: true, reset_token });
  }

  // Public: consume a reset token and set a new PIN.
  if (action === "reset_pin_with_token") {
    const token = String(body.reset_token ?? "");
    const new_pin = String(body.new_pin ?? "");
    if (!/^\d{4}$/.test(new_pin)) return json({ error: "PIN must be 4 digits" }, 400);
    const rec = consumeResetToken(token);
    if (!rec) return json({ error: "Reset session expired. Please verify again." }, 400);
    const { error } = await admin.auth.admin.updateUserById(rec.user_id, {
      password: phonePass(rec.phone, new_pin),
    });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  // Authenticated: user changes their own PIN after verifying current PIN.
  if (action === "change_my_pin") {
    const authHeader0 = req.headers.get("Authorization") ?? "";
    const token0 = authHeader0.replace(/^Bearer\s+/i, "");
    if (!token0) return json({ error: "Missing auth" }, 401);
    const caller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token0}` } },
    });
    const { data: ur, error: ue } = await caller.auth.getUser();
    if (ue || !ur.user) return json({ error: "Invalid auth" }, 401);
    const current_pin = String(body.current_pin ?? "");
    const new_pin = String(body.new_pin ?? "");
    if (!/^\d{4}$/.test(new_pin)) return json({ error: "New PIN must be 4 digits" }, 400);
    const { data: prof } = await admin
      .from("profiles").select("phone").eq("id", ur.user.id).maybeSingle();
    if (!prof?.phone) return json({ error: "No phone on file" }, 400);
    // Verify current PIN by attempting a sign-in with a throwaway client.
    const verifier = createClient(SUPABASE_URL, ANON_KEY);
    const { error: signErr } = await verifier.auth.signInWithPassword({
      email: phoneEmail(prof.phone),
      password: phonePass(prof.phone, current_pin),
    });
    if (signErr) return json({ error: "Current PIN is incorrect" }, 400);
    const { error } = await admin.auth.admin.updateUserById(ur.user.id, {
      password: phonePass(prof.phone, new_pin),
    });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  // All other actions require an authenticated admin caller.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Missing auth" }, 401);
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: ures, error: uerr } = await callerClient.auth.getUser();
  if (uerr || !ures.user) return json({ error: "Invalid auth" }, 401);
  const callerId = ures.user.id;
  const { data: callerRoles } = await admin
    .from("user_roles").select("role").eq("user_id", callerId);
  const roles = (callerRoles ?? []).map((r: any) => r.role);
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const isSuper = roles.includes("super_admin");
  if (!isAdmin) return json({ error: "Admin only" }, 403);

  const audit = async (entry: { action: string; target_id?: string | null; target_label?: string | null; details?: unknown }) => {
    try {
      const { data: prof } = await admin.from("profiles").select("full_name, phone").eq("id", callerId).maybeSingle();
      await admin.from("admin_audit_log").insert({
        actor_id: callerId,
        actor_label: prof?.full_name ?? prof?.phone ?? null,
        action: entry.action,
        target_id: entry.target_id ?? null,
        target_label: entry.target_label ?? null,
        details: entry.details ?? null,
      });
    } catch (_) { /* audit best-effort */ }
  };

  try {
    if (action === "create_user") {
      const { full_name, phone, pin, role } = body;
      if (!phone || !pin || !role) return json({ error: "phone, pin, role required" }, 400);
      if (!/^03\d{9}$/.test(phone)) return json({ error: "Invalid PK phone" }, 400);
      if (!/^\d{4}$/.test(pin)) return json({ error: "PIN must be 4 digits" }, 400);
      if ((role === "admin" || role === "super_admin") && !isSuper) {
        return json({ error: "Only super_admin can create admins" }, 403);
      }
      const { data: created, error } = await admin.auth.admin.createUser({
        email: phoneEmail(phone),
        password: phonePass(phone, pin),
        email_confirm: true,
        user_metadata: { full_name, phone },
      });
      if (error) return json({ error: error.message }, 400);
      await admin.from("profiles").upsert({
        id: created.user!.id, full_name, phone,
        approval_status: "approved", approved_at: new Date().toISOString(),
      });
      await admin.from("user_roles").upsert({ user_id: created.user!.id, role });
      return json({ ok: true, user_id: created.user!.id });
    }

    if (action === "set_pin") {
      const { user_id, pin } = body;
      if (!user_id || !pin) return json({ error: "user_id, pin required" }, 400);
      if (!/^\d{4}$/.test(pin)) return json({ error: "PIN must be 4 digits" }, 400);
      // Need the target user's phone to derive the synthetic password.
      const { data: targetProfile } = await admin
        .from("profiles").select("phone").eq("id", user_id).maybeSingle();
      if (!targetProfile?.phone) return json({ error: "Target user has no phone on file" }, 400);
      const { data: targetRoles } = await admin
        .from("user_roles").select("role").eq("user_id", user_id);
      const targetIsAdmin = (targetRoles ?? []).some((r: any) =>
        r.role === "admin" || r.role === "super_admin");
      if (targetIsAdmin && !isSuper && user_id !== callerId) {
        return json({ error: "Only super_admin can change another admin's PIN" }, 403);
      }
      const { error } = await admin.auth.admin.updateUserById(user_id, {
        password: phonePass(targetProfile.phone, pin),
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "assign_role") {
      const { user_id, role } = body;
      if (!user_id || !role) return json({ error: "user_id, role required" }, 400);
      if ((role === "admin" || role === "super_admin") && !isSuper) {
        return json({ error: "Only super_admin can grant admin roles" }, 403);
      }
      const { error } = await admin.from("user_roles").upsert({ user_id, role });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "remove_role") {
      const { user_id, role } = body;
      if (!user_id || !role) return json({ error: "user_id, role required" }, 400);
      if (!isSuper) return json({ error: "Only super_admin can remove roles" }, 403);
      if (role === "super_admin" && user_id === callerId) {
        return json({ error: "Cannot remove your own super_admin role" }, 400);
      }
      const { error } = await admin.from("user_roles")
        .delete().eq("user_id", user_id).eq("role", role);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "wipe_app_data") {
      if (!isSuper) return json({ error: "Only super_admin can wipe data" }, 403);
      // Wipe order-related rows
      await admin.from("order_instructions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await admin.from("order_status_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await admin.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await admin.from("notification_replies").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await admin.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await admin.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      // Wipe social
      await admin.from("chat_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await admin.from("friendships").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await admin.from("user_locations").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
      await admin.from("addresses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      // Delete all non-admin auth users + their profile rows
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const { data: adminRoles } = await admin.from("user_roles").select("user_id").in("role", ["admin","super_admin"]);
      const adminIds = new Set((adminRoles ?? []).map((r: any) => r.user_id));
      let deleted = 0;
      for (const u of list?.users ?? []) {
        if (adminIds.has(u.id)) continue;
        await admin.from("profiles").delete().eq("id", u.id);
        await admin.from("user_roles").delete().eq("user_id", u.id);
        const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
        if (!delErr) deleted++;
      }
      return json({ ok: true, deleted_users: deleted });
    }

    if (action === "delete_user") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id required" }, 400);
      if (user_id === callerId) return json({ error: "Cannot delete yourself" }, 400);
      const { data: targetRoles } = await admin.from("user_roles").select("role").eq("user_id", user_id);
      const targetIsAdmin = (targetRoles ?? []).some((r: any) => r.role === "admin" || r.role === "super_admin");
      if (targetIsAdmin && !isSuper) return json({ error: "Only super_admin can delete admins" }, 403);
      const { data: targetProf } = await admin.from("profiles").select("full_name, phone").eq("id", user_id).maybeSingle();
      await admin.from("chat_messages").delete().or(`sender_id.eq.${user_id},recipient_id.eq.${user_id}`);
      await admin.from("friendships").delete().or(`requester_id.eq.${user_id},addressee_id.eq.${user_id}`);
      await admin.from("user_locations").delete().eq("user_id", user_id);
      await admin.from("addresses").delete().eq("user_id", user_id);
      await admin.from("notifications").delete().eq("user_id", user_id);
      await admin.from("notification_replies").delete().eq("user_id", user_id);
      const { data: ords } = await admin.from("orders").select("id").eq("user_id", user_id);
      const oids = (ords ?? []).map((o: any) => o.id);
      if (oids.length) {
        await admin.from("order_instructions").delete().in("order_id", oids);
        await admin.from("order_status_logs").delete().in("order_id", oids);
        await admin.from("order_items").delete().in("order_id", oids);
        await admin.from("orders").delete().in("id", oids);
      }
      await admin.from("user_roles").delete().eq("user_id", user_id);
      await admin.from("profiles").delete().eq("id", user_id);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 400);
      await audit({
        action: "delete_user",
        target_id: user_id,
        target_label: targetProf?.full_name ?? targetProf?.phone ?? null,
        details: { orders_deleted: oids.length },
      });
      return json({ ok: true });
    }

    if (action === "delete_all_users") {
      if (!isSuper) return json({ error: "Only super_admin can delete all users" }, 403);
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const { data: adminRoles } = await admin.from("user_roles").select("user_id").in("role", ["admin","super_admin"]);
      const adminIds = new Set((adminRoles ?? []).map((r: any) => r.user_id));
      let deleted = 0;
      for (const u of list?.users ?? []) {
        if (adminIds.has(u.id)) continue;
        await admin.from("chat_messages").delete().or(`sender_id.eq.${u.id},recipient_id.eq.${u.id}`);
        await admin.from("friendships").delete().or(`requester_id.eq.${u.id},addressee_id.eq.${u.id}`);
        await admin.from("user_locations").delete().eq("user_id", u.id);
        await admin.from("addresses").delete().eq("user_id", u.id);
        await admin.from("notifications").delete().eq("user_id", u.id);
        await admin.from("notification_replies").delete().eq("user_id", u.id);
        const { data: ords } = await admin.from("orders").select("id").eq("user_id", u.id);
        const oids = (ords ?? []).map((o: any) => o.id);
        if (oids.length) {
          await admin.from("order_instructions").delete().in("order_id", oids);
          await admin.from("order_status_logs").delete().in("order_id", oids);
          await admin.from("order_items").delete().in("order_id", oids);
          await admin.from("orders").delete().in("id", oids);
        }
        await admin.from("user_roles").delete().eq("user_id", u.id);
        await admin.from("profiles").delete().eq("id", u.id);
        const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
        if (!delErr) deleted++;
      }
      await audit({ action: "delete_all_users", details: { deleted } });
      return json({ ok: true, deleted });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    return json({ error: e?.message ?? "Unknown error" }, 500);
  }
});