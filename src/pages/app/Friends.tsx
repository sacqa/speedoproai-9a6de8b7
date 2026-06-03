import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Check, X, MessageCircle, MapPin, Users } from "lucide-react";

export default function Friends() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["friends", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: fs } = await supabase.from("friendships").select("*")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      const ids = Array.from(new Set((fs ?? []).flatMap((f: any) => [f.requester_id, f.addressee_id]).filter((i: string) => i !== user!.id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] as any[] };
      const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (fs ?? []).map((f: any) => ({
        ...f,
        other_id: f.requester_id === user!.id ? f.addressee_id : f.requester_id,
        other: pmap.get(f.requester_id === user!.id ? f.addressee_id : f.requester_id),
        iSent: f.requester_id === user!.id,
      }));
    },
  });
  const list = q.data ?? [];
  const incoming = list.filter((f: any) => !f.iSent && f.status === "pending");
  const outgoing = list.filter((f: any) => f.iSent && f.status === "pending");
  const friends = list.filter((f: any) => f.status === "accepted");

  const respond = async (id: string, status: "accepted" | "declined") => {
    const { error } = await supabase.from("friendships").update({ status, responded_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "accepted" ? "Friend added" : "Declined"); q.refetch();
  };
  const remove = async (id: string) => {
    if (!confirm("Remove friend?")) return;
    const { error } = await supabase.from("friendships").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed"); q.refetch();
  };

  return (
    <div className="p-4 lg:p-0 max-w-md mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Friends</h1>
        <Link to="/nearby"><Button size="sm" variant="outline"><MapPin className="h-4 w-4 mr-1" />Find Nearby</Button></Link>
      </div>

      {incoming.length > 0 && <Section title={`Requests (${incoming.length})`}>
        {incoming.map((f: any) => (
          <Row key={f.id} name={f.other?.full_name}>
            <Button size="sm" onClick={() => respond(f.id, "accepted")}><Check className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => respond(f.id, "declined")}><X className="h-4 w-4" /></Button>
          </Row>
        ))}
      </Section>}

      {outgoing.length > 0 && <Section title="Sent">
        {outgoing.map((f: any) => (
          <Row key={f.id} name={f.other?.full_name}>
            <span className="text-xs text-muted-foreground">Pending</span>
            <Button size="sm" variant="ghost" onClick={() => remove(f.id)}><X className="h-4 w-4" /></Button>
          </Row>
        ))}
      </Section>}

      <Section title={`Friends (${friends.length})`}>
        {friends.length === 0 && <div className="text-sm text-muted-foreground">No friends yet. Find people nearby.</div>}
        {friends.map((f: any) => (
          <Row key={f.id} name={f.other?.full_name}>
            <Link to={`/chat/${f.other_id}`}><Button size="sm"><MessageCircle className="h-4 w-4 mr-1" />Chat</Button></Link>
            <Button size="sm" variant="ghost" onClick={() => remove(f.id)}><X className="h-4 w-4" /></Button>
          </Row>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-2"><div className="text-xs font-bold text-muted-foreground uppercase">{title}</div>{children}</div>;
}
function Row({ name, children }: { name?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl shadow-card p-3 flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">{name?.[0]?.toUpperCase() ?? "?"}</div>
      <div className="flex-1 font-semibold truncate">{name ?? "User"}</div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}