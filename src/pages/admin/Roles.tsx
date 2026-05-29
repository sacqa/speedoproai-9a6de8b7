import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, KeyRound, UserPlus, Trash2, Crown, Rocket } from "lucide-react";

type RoleRow = { user_id: string; role: string };
const ROLE_OPTIONS = ["super_admin", "admin", "staff", "customer"] as const;

export default function AdminRoles() {
  const qc = useQueryClient();

  const profiles = useQuery({
    queryKey: ["admin", "profiles-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, phone, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      return data ?? [];
    },
  });

  const roles = useQuery({
    queryKey: ["admin", "user-roles-all"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role");
      return (data ?? []) as RoleRow[];
    },
  });

  const callFn = async (action: string, payload: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action, ...payload },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  // Bootstrap super admin
  const bootstrap = async () => {
    try {
      const r = await callFn("bootstrap_super_admin");
      toast.success(r?.already ? "Super admin already exists." : "Super admin created.");
      qc.invalidateQueries({ queryKey: ["admin", "user-roles-all"] });
    } catch (e: any) { toast.error(e.message); }
  };

  // Create user dialog (phone + PIN only)
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", pin: "", role: "staff" });
  const submitCreate = async () => {
    if (!/^03\d{9}$/.test(form.phone)) return toast.error("Enter a valid PK mobile number");
    if (!/^\d{4}$/.test(form.pin)) return toast.error("PIN must be 4 digits");
    if (!form.full_name.trim()) return toast.error("Full name required");
    try {
      await callFn("create_user", form);
      toast.success("User created");
      setCreateOpen(false);
      setForm({ full_name: "", phone: "", pin: "", role: "staff" });
      qc.invalidateQueries({ queryKey: ["admin", "profiles-all"] });
      qc.invalidateQueries({ queryKey: ["admin", "user-roles-all"] });
    } catch (e: any) { toast.error(e.message); }
  };

  // PIN reset dialog
  const [pinUser, setPinUser] = useState<{ id: string; name: string } | null>(null);
  const [newPin, setNewPin] = useState("");
  const submitPin = async () => {
    if (!/^\d{4}$/.test(newPin)) return toast.error("PIN must be 4 digits");
    try {
      await callFn("set_pin", { user_id: pinUser!.id, pin: newPin });
      toast.success("PIN updated");
      setPinUser(null); setNewPin("");
    } catch (e: any) { toast.error(e.message); }
  };

  const assign = async (user_id: string, role: string) => {
    try {
      await callFn("assign_role", { user_id, role });
      toast.success(`Assigned ${role}`);
      qc.invalidateQueries({ queryKey: ["admin", "user-roles-all"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const revoke = async (user_id: string, role: string) => {
    if (!confirm(`Remove ${role} role?`)) return;
    try {
      await callFn("remove_role", { user_id, role });
      toast.success("Role removed");
      qc.invalidateQueries({ queryKey: ["admin", "user-roles-all"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const rolesByUser = new Map<string, string[]>();
  (roles.data ?? []).forEach((r) => {
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(r.role);
    rolesByUser.set(r.user_id, arr);
  });

  const allUsers = (profiles.data ?? []).slice().sort((a: any, b: any) => {
    const ra = rolesByUser.get(a.id) ?? [];
    const rb = rolesByUser.get(b.id) ?? [];
    const rank = (rs: string[]) =>
      rs.includes("super_admin") ? 0 : rs.includes("admin") ? 1 : rs.includes("staff") ? 2 : 3;
    return rank(ra) - rank(rb);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Roles & Permissions
          </h1>
          <p className="text-sm text-muted-foreground">
            Assign roles, create admins/staff, and reset passwords.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={bootstrap}>
            <Rocket className="h-4 w-4" /> Init Super Admin
          </Button>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" /> Create User
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left">Phone</th>
              <th className="text-left">Roles</th>
              <th className="text-left">Add role</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map((u: any) => {
              const rs = rolesByUser.get(u.id) ?? [];
              return (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-semibold flex items-center gap-1.5">
                    {rs.includes("super_admin") && <Crown className="h-4 w-4 text-amber-500" />}
                    {u.full_name || "—"}
                  </td>
                  <td>{u.phone || "—"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {rs.length === 0 && <span className="text-xs text-muted-foreground">no roles</span>}
                      {rs.map((r) => (
                        <span key={r} className="inline-flex items-center gap-1 text-[10px] uppercase font-bold bg-muted px-2 py-0.5 rounded-pill">
                          {r}
                          <button onClick={() => revoke(u.id, r)} className="text-destructive hover:opacity-70">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <Select onValueChange={(v) => assign(u.id, v)}>
                      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Add…" /></SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.filter((r) => !rs.includes(r)).map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="text-right p-3">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => setPinUser({ id: u.id, name: u.full_name || u.id })}>
                      <KeyRound className="h-3.5 w-3.5" /> Set PIN
                    </Button>
                  </td>
                </tr>
              );
            })}
            {allUsers.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">No users</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create user dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create user</DialogTitle>
            <DialogDescription>Set a phone + 4-digit PIN and assign a role.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone (PK)</Label>
                <Input value={form.phone} inputMode="numeric" maxLength={11}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                  placeholder="03xxxxxxxxx" />
              </div>
              <div>
                <Label>4-digit PIN</Label>
                <Input value={form.pin} inputMode="numeric" maxLength={4}
                  onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  placeholder="••••" />
              </div>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={submitCreate} className="w-full">Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Set PIN dialog */}
      <Dialog open={!!pinUser} onOpenChange={(o) => !o && setPinUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set new PIN</DialogTitle>
            <DialogDescription>For: <b>{pinUser?.name}</b></DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input inputMode="numeric" maxLength={4} placeholder="New 4-digit PIN"
              className="tracking-[0.5em] text-center"
              value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
            <Button onClick={submitPin} className="w-full">Update PIN</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}