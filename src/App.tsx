import { lazy, Suspense } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import { AuthProvider } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
// Home stays eager (it's the landing route); everything else is code-split.
import Home from "./pages/app/Home";
const Splash = lazy(() => import("./pages/app/Splash"));
const Search = lazy(() => import("./pages/app/Search"));
const SpeedMart = lazy(() => import("./pages/app/SpeedMart"));
const Cart = lazy(() => import("./pages/app/Cart"));
// Checkout is merged into the Cart page; /checkout now redirects to /cart.
const OrderConfirm = lazy(() => import("./pages/app/OrderConfirm"));
const Help = lazy(() => import("./pages/app/Help"));
const RequestForm = lazy(() => import("./pages/app/RequestForm"));
const Food = lazy(() => import("./pages/app/Food"));
const FoodVendor = lazy(() => import("./pages/app/FoodVendor"));
const FoodCheckout = lazy(() => import("./pages/app/FoodCheckout"));
const Nearby = lazy(() => import("./pages/app/Nearby"));
const CmsPage = lazy(() => import("./pages/app/CmsPage"));
const TrackOrder = lazy(() => import("./pages/app/TrackOrder"));
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
const AdminChats = lazy(() => import("./pages/admin/Chats"));
const AdminReceipt = lazy(() => import("./pages/admin/Receipt"));
const AdminReceiptSettings = lazy(() => import("./pages/admin/ReceiptSettings"));
const AdminFooterSettings = lazy(() => import("./pages/admin/FooterSettings"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminLayoutSettings = lazy(() => import("./pages/admin/LayoutSettings"));
const AdminPages = lazy(() => import("./pages/admin/Pages"));
const AdminAnalyticsSettings = lazy(() => import("./pages/admin/AnalyticsSettings"));
const AdminLiveMap = lazy(() => import("./pages/admin/LiveMap"));
const AdminServiceBanners = lazy(() => import("./pages/admin/ServiceBanners"));
const AdminBrandSettings = lazy(() => import("./pages/admin/BrandSettings"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Persist catalog queries to localStorage so products, categories and banners
// still render (and can be added to the cart) when the PWA is opened offline.
const persister =
  typeof window === "undefined"
    ? undefined
    : createSyncStoragePersister({ storage: window.localStorage, key: "speedo-query-cache", throttleTime: 2000 });

const AdminPage = ({ children }: { children: React.ReactNode }) => (
  <RequireAdmin>
    <AdminLayout>
      <Suspense fallback={<div className="p-10 text-center text-muted-foreground">Loading…</div>}>{children}</Suspense>
    </AdminLayout>
  </RequireAdmin>
);

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister: persister!,
      maxAge: 24 * 60 * 60_000,
      dehydrateOptions: {
        shouldDehydrateQuery: (q) => {
          const key = String(q.queryKey?.[0] ?? "");
          return (
            q.state.status === "success" &&
            ["products", "cats", "categories", "banners", "service-banners", "home-products", "vendors"].includes(key)
          );
        },
      },
    }}
  >
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppShell>
            <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
            <Routes>
              <Route path="/splash" element={<Splash />} />
              {/* Legacy auth routes redirect home — the app no longer requires sign-in. */}
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/onboarding" element={<Navigate to="/" replace />} />
              <Route path="/forgot-pin" element={<Navigate to="/" replace />} />
              <Route path="/pending" element={<Navigate to="/" replace />} />
              <Route path="/profile" element={<Navigate to="/" replace />} />
              <Route path="/addresses" element={<Navigate to="/" replace />} />
              <Route path="/orders" element={<Navigate to="/" replace />} />
              <Route path="/notifications" element={<Navigate to="/" replace />} />
              <Route path="/friends" element={<Navigate to="/" replace />} />
              <Route path="/chat/:friendId" element={<Navigate to="/" replace />} />
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/speedmart" element={<SpeedMart />} />
              <Route path="/product/:id" element={<Navigate to="/speedmart" replace />} />
              <Route path="/pharmacy" element={<RequestForm mode="pharmacy" />} />
              <Route path="/speedsend" element={<RequestForm mode="speedsend" />} />
              <Route path="/custom" element={<RequestForm mode="custom" />} />
              <Route path="/food" element={<Food />} />
              <Route path="/food/checkout" element={<FoodCheckout />} />
              <Route path="/food/:vendorId" element={<FoodVendor />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Navigate to="/cart" replace />} />
              <Route path="/order/:id" element={<OrderConfirm />} />
              <Route path="/track" element={<TrackOrder />} />
              <Route path="/help" element={<Help />} />
              <Route path="/nearby" element={<Nearby />} />
              {/* Public CMS pages (admin-editable) */}
              <Route path="/about" element={<CmsPage slug="about" />} />
              <Route path="/contact" element={<CmsPage slug="contact" />} />
              <Route path="/careers" element={<CmsPage slug="careers" />} />
              <Route path="/privacy" element={<CmsPage slug="privacy" />} />
              <Route path="/terms" element={<CmsPage slug="terms" />} />
              <Route path="/admin" element={<AdminPage><AdminDashboard /></AdminPage>} />
              <Route path="/admin/orders" element={<AdminPage><AdminOrders /></AdminPage>} />
              <Route path="/admin/orders/:id" element={<AdminPage><AdminOrderDetail /></AdminPage>} />
              <Route path="/admin/orders/:id/receipt" element={<AdminPage><AdminReceipt /></AdminPage>} />
              <Route path="/admin/receipt-settings" element={<AdminPage><AdminReceiptSettings /></AdminPage>} />
              <Route path="/admin/footer-settings" element={<AdminPage><AdminFooterSettings /></AdminPage>} />
              <Route path="/admin/layout-settings" element={<AdminPage><AdminLayoutSettings /></AdminPage>} />
              <Route path="/admin/brand-settings" element={<AdminPage><AdminBrandSettings /></AdminPage>} />
              <Route path="/admin/pages" element={<AdminPage><AdminPages /></AdminPage>} />
              <Route path="/admin/analytics" element={<AdminPage><AdminAnalyticsSettings /></AdminPage>} />
              <Route path="/admin/live-map" element={<AdminPage><AdminLiveMap /></AdminPage>} />
              <Route path="/admin/products" element={<AdminPage><AdminProducts /></AdminPage>} />
              <Route path="/admin/categories" element={<AdminPage><AdminCategories /></AdminPage>} />
              <Route path="/admin/banners" element={<AdminPage><AdminBanners /></AdminPage>} />
              <Route path="/admin/service-banners" element={<AdminPage><AdminServiceBanners /></AdminPage>} />
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
              <Route path="/admin/chats" element={<AdminPage><AdminChats /></AdminPage>} />
              <Route path="/admin/birthdays" element={<Navigate to="/admin/customers?tab=birthdays" replace />} />
              <Route path="/admin/login" element={<Suspense fallback={null}><AdminLogin /></Suspense>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </AppShell>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
);

export default App;
