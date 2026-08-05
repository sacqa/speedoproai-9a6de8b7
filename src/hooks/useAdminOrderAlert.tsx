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

// ===== Audio unlock for iOS / Android / PWA =====
// Mobile browsers block audio playback until a user gesture has happened
// at least once. We pre-create an <audio> element on first interaction,
// play a muted/silent buffer to unlock the audio context, then reuse the
// same element so later programmatic .play() calls succeed without a gesture.

let unlocked = false;
let primedAudio: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;

export function isAudioUnlocked() {
  return unlocked;
}

export async function unlockAudio() {
  if (unlocked) return true;
  try {
    // 1. Resume / create a WebAudio context (needed for synthetic fallback).
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctx && !audioCtx) audioCtx = new Ctx();
    if (audioCtx?.state === "suspended") await audioCtx.resume();

    // 2. Prime an <audio> element with the current tone, play muted briefly.
    const tone = RINGTONES.find((r) => r.id === getAdminTone()) ?? RINGTONES[0];
    primedAudio = new Audio(tone.url);
    primedAudio.preload = "auto";
    primedAudio.muted = true;
    primedAudio.volume = 0;
    await primedAudio.play().catch(() => {});
    primedAudio.pause();
    primedAudio.currentTime = 0;
    primedAudio.muted = false;
    primedAudio.volume = 0.85;
    unlocked = true;
    return true;
  } catch {
    return false;
  }
}

function attachUnlockListeners() {
  if (typeof window === "undefined") return;
  const handler = () => {
    unlockAudio().finally(() => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    });
  };
  window.addEventListener("pointerdown", handler, { passive: true });
  window.addEventListener("keydown", handler);
  window.addEventListener("touchstart", handler, { passive: true });
}

// Web Audio fallback if mp3 missing — generates a short beep tone per id
function playSyntheticTone(id: string) {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = audioCtx ?? new Ctx();
    if (ctx.state === "suspended") ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const map: Record<string, { f: number; type: OscillatorType; dur: number }> = {
      shopify: { f: 988, type: "sine",     dur: 0.45 },
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
  // Vibrate too — works on Android / installed PWA even if audio is muted.
  try { (navigator as any).vibrate?.([180, 80, 180]); } catch {}
  if (!t) return playSyntheticTone(toneId);

  // Reuse the primed element when possible — bypasses iOS autoplay limits.
  const play = (el: HTMLAudioElement) => {
    el.currentTime = 0;
    el.volume = 0.85;
    el.muted = false;
    return el.play();
  };

  if (primedAudio) {
    // Swap source if user changed tone after priming.
    if (!primedAudio.src.endsWith(t.url)) primedAudio.src = t.url;
    play(primedAudio).catch(() => playSyntheticTone(toneId));
    return;
  }
  const a = new Audio(t.url);
  a.volume = 0.85;
  play(a).catch(() => playSyntheticTone(toneId));
}

export function useAdminOrderAlert(enabled: boolean) {
  const seen = useRef<Set<string>>(new Set());
  const navigate = useNavigate();
  useEffect(() => {
    if (!enabled) return;
    // Make sure the first admin tap anywhere unlocks audio for later alerts.
    if (!unlocked) attachUnlockListeners();
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const o: any = payload.new;
        if (seen.current.has(o.id)) return;
        seen.current.add(o.id);
        playAdminTone();
        // Show an OS-level notification if granted (works for installed PWA).
        try {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`New order ${o.order_number}`, {
              body: `Total Rs ${Number(o.total).toFixed(0)}`,
              icon: "/icon-192.png",
              tag: o.id,
            });
          }
        } catch {}
        toast.success(`New order ${o.order_number}`, {
          description: `Total Rs ${Number(o.total).toFixed(0)} · tap to view`,
          action: { label: "Open", onClick: () => navigate(`/admin/orders/${o.id}`) },
          duration: 10000,
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "guest_orders" }, (payload) => {
        const o: any = payload.new;
        if (seen.current.has(o.id)) return;
        seen.current.add(o.id);
        playAdminTone();
        const itemCount = Array.isArray(o.items)
          ? o.items.reduce((n: number, i: any) => n + Number(i?.quantity ?? 1), 0)
          : 0;
        const detail = `${o.customer_name} · ${o.phone} · ${itemCount} item${itemCount === 1 ? "" : "s"} · Rs ${Number(o.total).toFixed(0)} · ${o.area}`;
        try {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`New order ${o.order_number}`, {
              body: detail,
              icon: "/icon-192.png",
              tag: o.id,
            });
          }
        } catch {}
        toast.success(`New order ${o.order_number}`, {
          description: detail,
          action: { label: "Open", onClick: () => navigate("/admin/orders") },
          duration: 15000,
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [enabled, navigate]);
}