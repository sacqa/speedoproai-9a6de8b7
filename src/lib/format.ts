export const formatPKR = (n: number) =>
  `Rs ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(Math.round(n))}`;

export const statusLabel = (s: string) =>
  s.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const WHATSAPP_NUMBER = "923337339009";

export function buildWhatsAppUrl(text: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}