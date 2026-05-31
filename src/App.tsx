import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import { AuthProvider } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/speedo/RequireAuth";
import { RequireApproved } from "@/components/speedo/RequireApproved";
import Splash from "./pages/app/Splash";
import Onboarding from "./pages/app/Onboarding";
import Login from "./pages/app/Login";
import ForgotPin from "./pages/app/ForgotPin";
import Waiting from "./pages/app/Waiting";
import Home from "./pages/app/Home";
import Search from "./pages/app/Search";
import SpeedMart from "./pages/app/SpeedMart";
import Cart from "./pages/app/Cart";
import Checkout from "./pages/app/Checkout";
import OrderConfirm from "./pages/app/OrderConfirm";
import OrderDetails from "./pages/app/OrderDetails";
import Orders from "./pages/app/Orders";
import Notifications from "./pages/app/Notifications";
import Profile from "./pages/app/Profile";
import Addresses from "./pages/app/Addresses";
import Help from "./pages/app/Help";
import RequestForm from "./pages/app/RequestForm";
import Food from "./pages/app/Food";
import FoodVendor from "./pages/app/FoodVendor";
import FoodCheckout from "./pages/app/FoodCheckout";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";

// Lazy-load all admin pages to keep the customer bundle small.
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const AdminOrderDetail = lazy(() => import("./pages/admin/OrderDetail"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminCategories = lazy(() => import("./pages/admin/Categories"));
const AdminBanners = lazy(() => import("./pages/admin/Banners"));
const AdminCustomers = lazy(() => import("./pages/admin/Customers"));
const AdminCustomerDetail = lazy(() => import("./pages/admin/CustomerDetail"));
const AdminPricing = lazy(() => import("./pages/admin/Pricing"));
const AdminBroadcast = lazy(() => import("./pages/admin/Broadcast"));
const AdminReplies = lazy(() => import("./pages/admin/Replies"));
const AdminAnnouncements = lazy(() => import("./pages/admin/Announcements"));
const AdminFoodVendors = lazy(() => import("./pages/admin/FoodVendors"));
const AdminFoodVendorMenu = lazy(() => import("./pages/admin/FoodVendorMenu"));
const AdminRoles = lazy(() => import("./pages/admin/Roles"));
const AdminApprovals = lazy(() => import("./pages/admin/Approvals"));
const AdminBirthdays = lazy(() => import("./pages/admin/Birthdays"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AdminPage = ({ children }: { children: React.ReactNode }) => (
  <RequireAdmin>
    <AdminLayout>
      <Suspense fallback={<div className="p-10 text-center text-muted-foreground">Loading…</div>}>{children}</Suspense>
    </AdminLayout>
  </RequireAdmin>
);

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
              <Route path="/forgot-pin" element={<ForgotPin />} />
              <Route path="/pending" element={<Waiting />} />
              <Route path="/" element={<RequireApproved><Home /></RequireApproved>} />
              <Route path="/search" element={<RequireApproved><Search /></RequireApproved>} />
              <Route path="/speedmart" element={<RequireApproved><SpeedMart /></RequireApproved>} />
              <Route path="/pharmacy" element={<RequireApproved><RequestForm mode="pharmacy" /></RequireApproved>} />
              <Route path="/speedsend" element={<RequireApproved><RequestForm mode="speedsend" /></RequireApproved>} />
              <Route path="/custom" element={<RequireApproved><RequestForm mode="custom" /></RequireApproved>} />
              <Route path="/food" element={<RequireApproved><Food /></RequireApproved>} />
              <Route path="/food/checkout" element={<RequireApproved><FoodCheckout /></RequireApproved>} />
              <Route path="/food/:vendorId" element={<RequireApproved><FoodVendor /></RequireApproved>} />
              <Route path="/cart" element={<RequireApproved><Cart /></RequireApproved>} />
              <Route path="/checkout" element={<RequireApproved><Checkout /></RequireApproved>} />
              <Route path="/orders" element={<RequireApproved><Orders /></RequireApproved>} />
              <Route path="/orders/:id" element={<RequireApproved><OrderDetails /></RequireApproved>} />
              <Route path="/orders/:id/confirm" element={<RequireApproved><OrderConfirm /></RequireApproved>} />
              <Route path="/notifications" element={<RequireApproved><Notifications /></RequireApproved>} />
              <Route path="/profile" element={<RequireApproved><Profile /></RequireApproved>} />
              <Route path="/addresses" element={<RequireApproved><Addresses /></RequireApproved>} />
              <Route path="/help" element={<RequireApproved><Help /></RequireApproved>} />
              <Route path="/admin" element={<AdminPage><AdminDashboard /></AdminPage>} />
              <Route path="/admin/orders" element={<AdminPage><AdminOrders /></AdminPage>} />
              <Route path="/admin/orders/:id" element={<AdminPage><AdminOrderDetail /></AdminPage>} />
              <Route path="/admin/products" element={<AdminPage><AdminProducts /></AdminPage>} />
              <Route path="/admin/categories" element={<AdminPage><AdminCategories /></AdminPage>} />
              <Route path="/admin/banners" element={<AdminPage><AdminBanners /></AdminPage>} />
              <Route path="/admin/customers" element={<AdminPage><AdminCustomers /></AdminPage>} />
              <Route path="/admin/customers/:id" element={<AdminPage><AdminCustomerDetail /></AdminPage>} />
              <Route path="/admin/pricing" element={<AdminPage><AdminPricing /></AdminPage>} />
              <Route path="/admin/broadcast" element={<AdminPage><AdminBroadcast /></AdminPage>} />
              <Route path="/admin/announcements" element={<AdminPage><AdminAnnouncements /></AdminPage>} />
              <Route path="/admin/replies" element={<AdminPage><AdminReplies /></AdminPage>} />
              <Route path="/admin/food-vendors" element={<AdminPage><AdminFoodVendors /></AdminPage>} />
              <Route path="/admin/food-vendors/:id/menu" element={<AdminPage><AdminFoodVendorMenu /></AdminPage>} />
              <Route path="/admin/roles" element={<AdminPage><AdminRoles /></AdminPage>} />
              <Route path="/admin/approvals" element={<AdminPage><AdminApprovals /></AdminPage>} />
              <Route path="/admin/birthdays" element={<Navigate to="/admin/customers?tab=birthdays" replace />} />
              <Route path="/admin/login" element={<Suspense fallback={null}><AdminLogin /></Suspense>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
