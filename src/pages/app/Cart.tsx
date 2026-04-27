import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { formatPKR } from "@/lib/format";

export default function Cart() {
  const { items, setQty, remove, subtotal } = useCart();
  const nav = useNavigate();
  const sub = subtotal();
  const delivery = sub > 1500 || sub === 0 ? 0 : 99;
  const service = sub === 0 ? 0 : 25;

  if (items.length === 0) {
    return (
      <div className="p-8 text-center">
        <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold">Your cart is empty</h2>
        <p className="text-muted-foreground mt-1 mb-6">Add some products to get started</p>
        <Link to="/speedmart"><Button className="rounded-pill px-8">Browse SpeedMart</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-0 space-y-4">
      <h1 className="text-2xl font-extrabold">Your Cart</h1>
      <div className="space-y-3">
        {items.map((i) => (
          <div key={i.product_id} className="bg-card rounded-xl shadow-card p-3 flex gap-3 items-center">
            <img src={i.image_url ?? ""} alt={i.name} className="h-16 w-16 rounded-lg object-cover bg-muted" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm line-clamp-1">{i.name}</div>
              <div className="text-xs text-muted-foreground">{i.unit}</div>
              <div className="text-primary font-bold mt-1">{formatPKR(i.price)}</div>
            </div>
            <div className="flex items-center gap-1.5 bg-primary-tint rounded-pill p-0.5">
              <button onClick={() => setQty(i.product_id, i.quantity - 1)} className="h-7 w-7 rounded-full bg-card text-primary flex items-center justify-center"><Minus className="h-3 w-3" /></button>
              <span className="text-sm font-bold text-primary px-1">{i.quantity}</span>
              <button onClick={() => setQty(i.product_id, i.quantity + 1)} className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Plus className="h-3 w-3" /></button>
            </div>
            <button onClick={() => remove(i.product_id)} className="p-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <div className="bg-card rounded-xl shadow-card p-4 space-y-2 text-sm">
        <Row label="Subtotal" value={formatPKR(sub)} />
        <Row label="Delivery fee" value={delivery === 0 ? "FREE" : formatPKR(delivery)} />
        <Row label="Service charge" value={formatPKR(service)} />
        <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-base">
          <span>Total</span><span className="text-primary">{formatPKR(sub + delivery + service)}</span>
        </div>
      </div>
      <Button className="w-full h-12 rounded-pill text-base" onClick={() => nav("/checkout")}>Proceed to Checkout</Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>;
}