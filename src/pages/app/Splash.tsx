import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SpeedoLogo } from "@/components/speedo/SpeedoLogo";

export default function Splash() {
  const nav = useNavigate();
  useEffect(() => {
    const seen = localStorage.getItem("speedo-onboarded");
    const t = setTimeout(() => nav(seen ? "/" : "/onboarding", { replace: true }), 1600);
    return () => clearTimeout(t);
  }, [nav]);
  return (
    <div className="min-h-screen gradient-primary flex flex-col items-center justify-center text-white">
      <div className="animate-bolt-pulse">
        <SpeedoLogo size={120} />
      </div>
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight">Speedo</h1>
      <p className="mt-2 text-sm opacity-80">Hyperlocal delivery in Dipalpur</p>
    </div>
  );
}