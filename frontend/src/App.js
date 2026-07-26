import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/AuthContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import { CartProvider } from "@/lib/CartContext";
import Navbar from "@/components/Navbar";
import ChatWidget from "@/components/ChatWidget";
import ProtectedRoute from "@/components/ProtectedRoute";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
import CustomerMenu from "@/pages/CustomerMenu";
import CartPage from "@/pages/CartPage";
import OrderTrack from "@/pages/OrderTrack";
import MyOrders from "@/pages/MyOrders";
import Reservations from "@/pages/Reservations";
import BillView from "@/pages/BillView";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminTables from "@/pages/admin/AdminTables";
import AdminMenu from "@/pages/admin/AdminMenu";
import AdminInventory from "@/pages/admin/AdminInventory";
import AdminStaff from "@/pages/admin/AdminStaff";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import StaffView from "@/pages/StaffView";
import KitchenKDS from "@/pages/KitchenKDS";
import "@/App.css";

function AppRouter() {
  const location = useLocation();
  // Handle Emergent OAuth callback before any route rendering
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)]">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/menu" element={<CustomerMenu />} />
          <Route path="/cart" element={<ProtectedRoute roles={["customer"]}><CartPage /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute roles={["customer"]}><MyOrders /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderTrack /></ProtectedRoute>} />
          <Route path="/bills/:id" element={<ProtectedRoute><BillView /></ProtectedRoute>} />
          <Route path="/reservations" element={<ProtectedRoute><Reservations /></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute roles={["staff", "admin"]}><StaffView /></ProtectedRoute>} />
          <Route path="/kitchen" element={<ProtectedRoute roles={["kitchen", "admin"]}><KitchenKDS /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="tables" element={<AdminTables />} />
            <Route path="menu" element={<AdminMenu />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="analytics" element={<AdminAnalytics />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <ChatWidget />
      <Toaster richColors position="top-right" theme="dark" />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <AppRouter />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
