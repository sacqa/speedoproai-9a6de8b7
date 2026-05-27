import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPER_ADMIN_EMAIL = "speedoaipro@gmail.com";
const SUPER_ADMIN_PASSWORD = "Console@6221";
const SUPER_ADMIN_PHONE = "03110406221";

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

  // Public bootstrap: only succeeds when no super_admin exists yet.
  if (action === "bootstrap_super_admin") {
    const { data: existing } = await admin
      .from("user_roles").select("id").eq("role", "super_admin").limit(1);
    if (existing && existing.length > 0) {
      return json({ ok: true, already: true });
    }
    // Find or create the user
    const { data: list } = await admin.auth.admin.listUsers();
    let user = list?.users?.find((u) => u.email === SUPER_ADMIN_EMAIL);
    if (!user) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "Super Admin", phone: SUPER_ADMIN_PHONE },
      });
      if (error) return json({ error: error.message }, 400);
      user = created.user!;
    } else {
      await admin.auth.admin.updateUserById(user.id, { password: SUPER_ADMIN_PASSWORD });
    }
    await admin.from("profiles").upsert({
      id: user.id, full_name: "Super Admin", phone: SUPER_ADMIN_PHONE,
    });
    await admin.from("user_roles").upsert({ user_id: user.id, role: "super_admin" });
    await admin.from("user_roles").upsert({ user_id: user.id, role: "admin" });
    return json({ ok: true, created: true });
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

  try {
    if (action === "create_user") {
      const { email, password, full_name, phone, role } = body;
      if (!email || !password || !role) return json({ error: "email, password, role required" }, 400);
      if ((role === "admin" || role === "super_admin") && !isSuper) {
        return json({ error: "Only super_admin can create admins" }, 403);
      }
      const { data: created, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name, phone },
      });
      if (error) return json({ error: error.message }, 400);
      await admin.from("profiles").upsert({ id: created.user!.id, full_name, phone });
      await admin.from("user_roles").upsert({ user_id: created.user!.id, role });
      return json({ ok: true, user_id: created.user!.id });
    }

    if (action === "set_password") {
      const { user_id, password } = body;
      if (!user_id || !password) return json({ error: "user_id, password required" }, 400);
      // Only super_admin can change another admin's password
      const { data: targetRoles } = await admin
        .from("user_roles").select("role").eq("user_id", user_id);
      const targetIsAdmin = (targetRoles ?? []).some((r: any) =>
        r.role === "admin" || r.role === "super_admin");
      if (targetIsAdmin && !isSuper && user_id !== callerId) {
        return json({ error: "Only super_admin can change another admin's password" }, 403);
      }
      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
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

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    return json({ error: e?.message ?? "Unknown error" }, 500);
  }
});