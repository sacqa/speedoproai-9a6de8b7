import { buildWhatsAppUrl } from "@/lib/format";

export default function Help() {
  return (
    <div className="p-4 lg:p-0 space-y-4 max-w-md mx-auto">
      <h1 className="text-2xl font-extrabold">Help & Support</h1>
      <div className="bg-card rounded-xl shadow-card p-5 space-y-3">
        <p className="text-sm text-muted-foreground">Need help with an order? Reach us 9am – 11pm daily.</p>
        <a href={buildWhatsAppUrl("Hi Speedo, I need help with…")} target="_blank" rel="noopener noreferrer" className="block bg-success text-white font-bold rounded-pill py-3 text-center">💬 Chat on WhatsApp</a>
        <a href="tel:+923337339009" className="block bg-primary text-primary-foreground font-bold rounded-pill py-3 text-center">📞 Call +92 333 7339009</a>
      </div>
      <div className="bg-card rounded-xl shadow-card p-5 text-sm space-y-2">
        <h2 className="font-bold">FAQs</h2>
        <p><b>Do you accept cash?</b> No. Speedo is digital-only. Pay via JazzCash, EasyPaisa or Bank Transfer.</p>
        <p><b>How long does delivery take?</b> Instant orders arrive in ~40 minutes within Dipalpur.</p>
        <p><b>Can I cancel an order?</b> Only before payment is verified. Contact support to assist.</p>
      </div>
    </div>
  );
}