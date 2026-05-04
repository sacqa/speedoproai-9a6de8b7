import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export const RINGTONES = [
  { id: "shopify", label: "Shopify Cha-ching", url: "/sounds/shopify.mp3" },
  { id: "ding", label: "Ding", url: "/sounds/ding.mp3" },
  { id: "chime", label: "Chime", url: "/sounds/chime.mp3" },
  { id: "bell", label: "Bell", url: "/sounds/bell.mp3" },
  { id: "alert", label: "Alert", url: "/sounds/alert.mp3" },
];

export function getAdminTone() {
  return localStorage.getItem("admin_tone") || "shopify";
}
export function setAdminTone(id: string) {
  localStorage.setItem("admin_tone", id);
}

// Web Audio fallback if mp3 missing — generates a short beep tone per id
function playSyntheticTone(id: string) {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const map: Record<string, { f: number; type: OscillatorType; dur: number }> = {
      ding:  { f: 880, type: "sine",     dur: 0.35 },
      chime: { f: 1320, type: "triangle", dur: 0.5 },
      bell:  { f: 660, type: "sine",     dur: 0.7 },
      alert: { f: 440, type: "square",   dur: 0.4 },
    };
    const c = map[id] ?? map.ding;
    o.type = c.type; o.frequency.value = c.f;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + c.dur);
    o.connect(g); g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + c.dur + 0.05);
  } catch (_) { /* ignore */ }
}

export function playAdminTone(id?: string) {
  const toneId = id || getAdminTone();
  const t = RINGTONES.find((r) => r.id === toneId);
  if (!t) return playSyntheticTone(toneId);
  const a = new Audio(t.url);
  a.volume = 0.7;
  a.play().catch(() => playSyntheticTone(toneId));
}

export function useAdminOrderAlert(enabled: boolean) {
  const seen = useRef<Set<string>>(new Set());
  const navigate = useNavigate();
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const o: any = payload.new;
        if (seen.current.has(o.id)) return;
        seen.current.add(o.id);
        playAdminTone();
        toast.success(`New order ${o.order_number}`, {
          description: `Total Rs ${Number(o.total).toFixed(0)} · tap to view`,
          action: { label: "Open", onClick: () => navigate(`/admin/orders/${o.id}`) },
          duration: 10000,
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [enabled, navigate]);
}