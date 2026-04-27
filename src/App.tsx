import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import { AuthProvider } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/speedo/RequireAuth";
import Splash from "./pages/app/Splash";
import Onboarding from "./pages/app/Onboarding";
import Login from "./pages/app/Login";
import Otp from "./pages/app/Otp";
import Home from "./pages/app/Home";
import Search from "./pages/app/Search";
import SpeedMart from "./pages/app/SpeedMart";
import Cart from "./pages/app/Cart";
import Checkout from "./pages/app/Checkout";
import PaymentProof from "./pages/app/PaymentProof";
import OrderConfirm from "./pages/app/OrderConfirm";
import OrderDetails from "./pages/app/OrderDetails";
import Orders from "./pages/app/Orders";
import Notifications from "./pages/app/Notifications";
import Profile from "./pages/app/Profile";
import Addresses from "./pages/app/Addresses";
import Help from "./pages/app/Help";
import RequestForm from "./pages/app/RequestForm";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/splash" element={<Splash />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/login" element={<Login />} />
              <Route path="/otp" element={<Otp />} />
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/speedmart" element={<SpeedMart />} />
              <Route path="/pharmacy" element={<RequireAuth><RequestForm mode="pharmacy" /></RequireAuth>} />
              <Route path="/speedsend" element={<RequireAuth><RequestForm mode="speedsend" /></RequireAuth>} />
              <Route path="/custom" element={<RequireAuth><RequestForm mode="custom" /></RequireAuth>} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
              <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
              <Route path="/orders/:id" element={<RequireAuth><OrderDetails /></RequireAuth>} />
              <Route path="/orders/:id/payment" element={<RequireAuth><PaymentProof /></RequireAuth>} />
              <Route path="/orders/:id/confirm" element={<RequireAuth><OrderConfirm /></RequireAuth>} />
              <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/addresses" element={<RequireAuth><Addresses /></RequireAuth>} />
              <Route path="/help" element={<Help />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
