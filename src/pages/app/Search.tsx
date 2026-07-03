import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/speedo/ProductCard";
import { Search as SearchIcon, Mic, MicOff, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [debounced, setDebounced] = useState("");
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setVoiceSupported(false); return; }
  }, []);

  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch {}
    setListening(false);
  };

  const startVoice = async () => {
    if (listening) { stopListening(); return; }
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Voice search isn't supported on this browser"); return; }
    try {
      // Prompt mic permission explicitly for better UX
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch {
      toast.error("Microphone permission denied. Please allow mic access in your browser settings.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;
    let finalText = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setQ((finalText + interim).trim());
    };
    rec.onerror = (e: any) => {
      setListening(false); setProcessing(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        toast.error("Microphone permission denied.");
      } else if (e.error === "no-speech") {
        toast.info("Didn't catch that — try again.");
      } else {
        toast.error("Voice error: " + e.error);
      }
    };
    rec.onend = () => {
      setListening(false);
      setProcessing(false);
    };
    setListening(true);
    try { rec.start(); } catch { setListening(false); }
  };

  useEffect(() => () => { try { recognitionRef.current?.abort(); } catch {} }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = q.trim();
      setDebounced(trimmed);
      const p = new URLSearchParams(params);
      if (trimmed) p.set("q", trimmed); else p.delete("q");
      setParams(p, { replace: true });
    }, 250);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useQuery({
    queryKey: ["search", debounced],
    enabled: debounced.length > 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products").select("*")
        .ilike("name", `%${debounced}%`).eq("is_active", true).limit(40);
      if (error) throw error;
      return data;
    },
  });

  const featured = useQuery({
    queryKey: ["explore-featured"],
    enabled: debounced.length <= 1,
    queryFn: async () => {
      const { data } = await supabase
        .from("products").select("*")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(24);
      return data ?? [];
    },
  });

  return (
    <div className="p-4 lg:p-0 space-y-4">
      <div className="flex items-center gap-2 bg-card rounded-pill px-4 py-3 shadow-card border border-border">
        <SearchIcon className="h-5 w-5 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="flex-1 bg-transparent outline-none text-sm"
        />
        {voiceSupported && (
          <button
            type="button"
            onClick={startVoice}
            aria-label={listening ? "Stop voice search" : "Start voice search"}
            className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${
              listening ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40" : "bg-primary/10 text-primary hover:bg-primary/20"
            }`}
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        )}
      </div>
      {listening && <p className="text-xs text-center text-red-500 font-bold animate-pulse">🎙️ Listening… speak now</p>}
      {debounced.length <= 1 ? (
        <>
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl btn-glossy flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h2 className="font-bold text-base">Popular right now</h2>
            </div>
            {featured.isLoading ? (
              <div className="grid-products">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-44 glass-card animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid-products">
                {(featured.data ?? []).map((p: any) => <ProductCard key={p.id} p={p} />)}
              </div>
            )}
          </section>
        </>
      ) : results.isLoading ? (
        <p className="text-center text-muted-foreground py-12">Searching…</p>
      ) : results.data?.length ? (
        <div className="grid-products">
          {results.data.map((p) => <ProductCard key={p.id} p={p as any} />)}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-12">No results for "{debounced}"</p>
      )}
    </div>
  );
}