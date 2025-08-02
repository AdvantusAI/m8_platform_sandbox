
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MasterLayout } from "@/components/MasterLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import CommercialCollaboration from "./pages/CommercialCollaboration";
import { AdminRoute } from "@/components/AdminRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import DemandForecast from "./pages/DemandForecast";
import Products from "./pages/Products";
import ProductsCatalog from "./pages/ProductsCatalog";
import CustomersCatalog from "./pages/CustomersCatalog";
import LocationsCatalog from "./pages/LocationsCatalog";
import ProjectedInventory from "./pages/ProjectedInventory";
import SavedSearches from "./pages/SavedSearches";
import CompanyConfig from "./pages/CompanyConfig";
import UserManagement from "./pages/UserManagement";
import VendorAssignments from "./pages/VendorAssignments";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PlannerDashboard from "./pages/PlannerDashboard";
import Configuracion from "./pages/Configuracion";
import OrdenesCompra from "./pages/OrdenesCompra";
import AdvancedReports from "./pages/AdvancedReports";

import WhatIfAnalysis from "./pages/WhatIfAnalysis";
import InventoryProjections from "./pages/InventoryProjections";
import KPIDashboard from "./pages/KPIDashboard";

import CommercialCollaborationApproved from "./pages/CommercialCollaborationApproved";
import CommercialReviewedDashboard from "./pages/CommercialReviewedDashboard";

const queryClient = new QueryClient();

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/*" element={<Auth />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <MasterLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/planner-dashboard" element={<PlannerDashboard />} />
              <Route path="/demand-forecast" element={<DemandForecast />} />
              <Route path="/what-if-analysis" element={<WhatIfAnalysis />} />
              <Route path="/commercial-collaboration" element={<CommercialCollaboration />} />
              <Route path="/advanced-reports" element={<AdvancedReports />} />
              
              <Route path="/purchase-management" element={<OrdenesCompra />} />
              <Route path="/saved-searches" element={<SavedSearches  />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products-catalog" element={<ProductsCatalog />} />
              <Route path="/customers-catalog" element={<CustomersCatalog />} />
              <Route path="/locations-catalog" element={<LocationsCatalog />} />
              <Route path="/company-config" element={<CompanyConfig />} />
              <Route path="/user-management" element={<UserManagement />} />
              <Route path="/vendor-assignments" element={<VendorAssignments />} />
              <Route path="/inventory-projections" element={<InventoryProjections />} />
              <Route path="/kpi-dashboard" element={<KPIDashboard />} />
              <Route path="/commercial-approve" element={<CommercialCollaborationApproved />} />
              <Route path="/commercial-reviewed" element={<CommercialReviewedDashboard />} />
              {/* Protected Routes */}
            </Routes>
          </MasterLayout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
