import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { PortalAuthProvider } from "@/lib/portalAuth";
import { Layout } from "@/components/Layout";
import { PortalProtectedLayout } from "@/components/PortalLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoginPage } from "@/pages/LoginPage";
import { PortalLoginPage } from "@/pages/portal/PortalLoginPage";
import { PortalOrdersPage } from "@/pages/portal/PortalOrdersPage";
import { PortalOrderDetailPage } from "@/pages/portal/PortalOrderDetailPage";
import { PortalQuotationsPage } from "@/pages/portal/PortalQuotationsPage";
import { PortalQuotationDetailPage } from "@/pages/portal/PortalQuotationDetailPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { CustomersPage } from "@/pages/CustomersPage";
import { CustomerDetailPage } from "@/pages/CustomerDetailPage";
import { RepairOrdersPage } from "@/pages/RepairOrdersPage";
import { NewRepairOrderPage } from "@/pages/NewRepairOrderPage";
import { RepairOrderDetailPage } from "@/pages/RepairOrderDetailPage";
import { ProductsPage } from "@/pages/ProductsPage";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { QuotationsPage } from "@/pages/QuotationsPage";
import { NewQuotationPage } from "@/pages/NewQuotationPage";
import { QuotationDetailPage } from "@/pages/QuotationDetailPage";
import { ServicesPage } from "@/pages/ServicesPage";
import { CashPage } from "@/pages/CashPage";
import { CashRegisterDetailPage } from "@/pages/CashRegisterDetailPage";
import { SalesPage } from "@/pages/SalesPage";
import { PurchasesPage } from "@/pages/PurchasesPage";
import { PurchaseDetailPage } from "@/pages/PurchaseDetailPage";
import { SuppliersPage } from "@/pages/SuppliersPage";
import { SupplierDetailPage } from "@/pages/SupplierDetailPage";
import { WarrantiesPage } from "@/pages/WarrantiesPage";
import { WarrantyDetailPage } from "@/pages/WarrantyDetailPage";
import { UsersPage } from "@/pages/UsersPage";
import { UserDetailPage } from "@/pages/UserDetailPage";
import { FinancePage } from "@/pages/FinancePage";
import { AccountPage } from "@/pages/AccountPage";
import { DeviceDetailPage } from "@/pages/DeviceDetailPage";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-bg" />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return (
    <Layout>
      {/* La key por ruta hace que el ErrorBoundary se reinicie al navegar
          a otra pantalla — si una página tuvo un error, no queda "atascada"
          mostrando el mensaje de error al volver a intentar desde el menú. */}
      <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>
    </Layout>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Portal de clientes: rutas completamente separadas del personal —
          ni comparten Layout, ni ProtectedLayout, ni sesión. */}
      <Route path="/portal/login" element={<PortalLoginPage />} />
      <Route
        path="/portal/orders"
        element={
          <PortalProtectedLayout>
            <PortalOrdersPage />
          </PortalProtectedLayout>
        }
      />
      <Route
        path="/portal/orders/:id"
        element={
          <PortalProtectedLayout>
            <PortalOrderDetailPage />
          </PortalProtectedLayout>
        }
      />
      <Route
        path="/portal/quotations"
        element={
          <PortalProtectedLayout>
            <PortalQuotationsPage />
          </PortalProtectedLayout>
        }
      />
      <Route
        path="/portal/quotations/:id"
        element={
          <PortalProtectedLayout>
            <PortalQuotationDetailPage />
          </PortalProtectedLayout>
        }
      />

      <Route path="/" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
      <Route path="/customers" element={<ProtectedLayout><CustomersPage /></ProtectedLayout>} />
      <Route path="/customers/:id" element={<ProtectedLayout><CustomerDetailPage /></ProtectedLayout>} />
      <Route path="/repair-orders" element={<ProtectedLayout><RepairOrdersPage /></ProtectedLayout>} />
      <Route path="/repair-orders/new" element={<ProtectedLayout><NewRepairOrderPage /></ProtectedLayout>} />
      <Route path="/repair-orders/:id" element={<ProtectedLayout><RepairOrderDetailPage /></ProtectedLayout>} />
      <Route path="/inventory" element={<ProtectedLayout><ProductsPage /></ProtectedLayout>} />
      <Route path="/inventory/:id" element={<ProtectedLayout><ProductDetailPage /></ProtectedLayout>} />
      <Route path="/quotations" element={<ProtectedLayout><QuotationsPage /></ProtectedLayout>} />
      <Route path="/quotations/new" element={<ProtectedLayout><NewQuotationPage /></ProtectedLayout>} />
      <Route path="/quotations/:id" element={<ProtectedLayout><QuotationDetailPage /></ProtectedLayout>} />
      <Route path="/services" element={<ProtectedLayout><ServicesPage /></ProtectedLayout>} />
      <Route path="/cash" element={<ProtectedLayout><CashPage /></ProtectedLayout>} />
      <Route path="/cash/:id" element={<ProtectedLayout><CashRegisterDetailPage /></ProtectedLayout>} />
      <Route path="/sales" element={<ProtectedLayout><SalesPage /></ProtectedLayout>} />
      <Route path="/purchases" element={<ProtectedLayout><PurchasesPage /></ProtectedLayout>} />
      <Route path="/purchases/:id" element={<ProtectedLayout><PurchaseDetailPage /></ProtectedLayout>} />
      <Route path="/suppliers" element={<ProtectedLayout><SuppliersPage /></ProtectedLayout>} />
      <Route path="/suppliers/:id" element={<ProtectedLayout><SupplierDetailPage /></ProtectedLayout>} />
      <Route path="/warranties" element={<ProtectedLayout><WarrantiesPage /></ProtectedLayout>} />
      <Route path="/warranties/:id" element={<ProtectedLayout><WarrantyDetailPage /></ProtectedLayout>} />
      <Route path="/users" element={<ProtectedLayout><UsersPage /></ProtectedLayout>} />
      <Route path="/users/:id" element={<ProtectedLayout><UserDetailPage /></ProtectedLayout>} />
      <Route path="/finance" element={<ProtectedLayout><FinancePage /></ProtectedLayout>} />
      <Route path="/account" element={<ProtectedLayout><AccountPage /></ProtectedLayout>} />
      <Route path="/devices/:id" element={<ProtectedLayout><DeviceDetailPage /></ProtectedLayout>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <PortalAuthProvider>
        <AppRoutes />
      </PortalAuthProvider>
    </AuthProvider>
  );
}
