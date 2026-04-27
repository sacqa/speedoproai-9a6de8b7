import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingBasket, Pill, Package } from "lucide-react";

const slides = [
  { icon: ShoppingBasket, title: "Groceries in 40 minutes", desc: "Order daily essentials, fresh produce & more from SpeedMart." },
  { icon: Pill, title: "Pharmacy at your door", desc: "Upload a prescription. We'll source the medicines and deliver them." },
  { icon: Package, title: "Send anything, anywhere", desc: "SpeedSend parcels and request custom items across Dipalpur." },
];

export default function Onboarding() {
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const finish = () => { localStorage.setItem("speedo-onboarded", "1"); nav("/", { replace: true }); };
  const S = slides[i];
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex justify-end p-4">
        <button onClick={finish} className="text-sm font-semibold text-muted-foreground">Skip</button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center animate-fade-in" key={i}>
        <div className="h-32 w-32 rounded-full gradient-purple-soft flex items-center justify-center mb-8">
          <S.icon className="h-14 w-14 text-primary" />
        </div>
        <h2 className="text-2xl font-extrabold mb-3">{S.title}</h2>
        <p className="text-muted-foreground max-w-sm">{S.desc}</p>
      </div>
      <div className="flex justify-center gap-2 mb-6">
        {slides.map((_, idx) => (
          <span key={idx} className={`h-2 rounded-full transition-all ${idx === i ? "w-8 bg-primary" : "w-2 bg-border"}`} />
        ))}
      </div>
      <div className="px-6 pb-10 safe-bottom">
        <Button className="w-full h-12 text-base rounded-pill" onClick={() => i < slides.length - 1 ? setI(i + 1) : finish()}>
          {i < slides.length - 1 ? "Next" : "Get Started"}
        </Button>
      </div>
    </div>
  );
}