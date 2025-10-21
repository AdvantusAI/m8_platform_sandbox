import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MasterLayout } from "@/components/MasterLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { configureAGGridLicense } from "@/lib/ag-grid-config";
import CommercialCollaboration from "./pages/CommercialCollaboration";
import ForecastCollaboration from "./pages/ForecastCollaboration";
import { AdminRoute } from "@/components/AdminRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import DemandForecast from "./pages/DemandForecast";
import RetailForecast from "./pages/RetailForecast";
import Products from "./pages/Products";
import ProductsCatalog from "./pages/ProductsCatalog";
import CustomersCatalog from "./pages/CustomersCatalog";
import InventoryCatalog from "./pages/InventoryCatalog";
import LocationsCatalog from "./pages/LocationsCatalog";
import ProjectedInventory from "./pages/ProjectedInventory";
import SavedSearches from "./pages/SavedSearches";
import CompanyConfig from "./pages/CompanyConfig";
import UserManagement from "./pages/UserManagement";
import UserRoles from "./pages/UserRoles";
import UserAssignments from "./pages/UserAssignments";
import VendorAssignments from "./pages/VendorAssignments";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PlannerDashboard from "./pages/PlannerDashboard";
import Configuracion from "./pages/Configuracion";
import OrdenesCompra from "./pages/OrdenesCompra";
import AdvancedReports from "./pages/AdvancedReports";
import DashboardGallery from "./pages/DashboardGallery";

import WhatIfAnalysis from "./pages/WhatIfAnalysis";
import InventoryProjections from "./pages/InventoryProjections";
import NPIDashboard from "./pages/NPIDashboard";
import NPIProductDetail from "./pages/NPIProductDetail";
import NPIMilestones from "./pages/NPIMilestones";
import NPIScenarios from "./pages/NPIScenarios";
import NPIAnalytics from "./pages/NPIAnalytics";
import SupplyWorkbench from "./pages/SupplyWorkbench";
import SupplyNetworkVisualization from "./pages/SupplyNetworkVisualization";
import SellThroughAnalytics from "./pages/SellThroughAnalytics";
import ForecastReconciliation from "./pages/ForecastReconciliation";
import HistoryDataView from "./pages/HistoryDataView";
import KPIDashboard from "./pages/KPIDashboard";
import { DataGrids } from "./components/DataGrid";

import CommercialCollaborationApproved from "./pages/CommercialCollaborationApproved";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error?.message?.includes('auth') || error?.message?.includes('401')) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

// Initialize AG Grid globally
configureAGGridLicense();

const App = () => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Conectando a MongoDB...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
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
              <Route path="/retail-forecast" element={<RetailForecast />} />
              <Route path="/supply-workbench" element={<SupplyWorkbench />} />
              <Route path="/supply-network" element={<SupplyNetworkVisualization />} />
              <Route path="/what-if-analysis" element={<WhatIfAnalysis />} />
              <Route path="/forecast-collaboration" element={<ForecastCollaboration />} />
              <Route path="/dashboard-gallery" element={<DashboardGallery />} />
              <Route path="/advanced-reports" element={<AdvancedReports />} />
              <Route path="/advanced-reports/:dashboardId" element={<AdvancedReports />} />
              <Route path="/kpi-dashboard" element={<KPIDashboard />} />
              <Route path="/what-if-analysis" element={<WhatIfAnalysis />} />
              <Route path="/purchase-management" element={<OrdenesCompra />} />
              <Route path="/saved-searches" element={<SavedSearches  />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products-catalog" element={<ProductsCatalog />} />
              <Route path="/customers-catalog" element={<CustomersCatalog />} />
              <Route path="/inventory-catalog" element={<InventoryCatalog />} />
              <Route path="/locations-catalog" element={<LocationsCatalog />} />
              <Route path="/company-config" element={<CompanyConfig />} />
              <Route path="/user-management" element={<AdminRoute><UserManagement /></AdminRoute>} />
              <Route path="/historydataview" element={<AdminRoute><HistoryDataView /></AdminRoute>} />
              <Route path="/user-roles" element={<AdminRoute><UserRoles /></AdminRoute>} />
              <Route path="/user-assignments" element={<AdminRoute><UserAssignments /></AdminRoute>} />
              <Route path="/vendor-assignments" element={<VendorAssignments />} />
              <Route path="/inventory-projections" element={<InventoryProjections />} />
              <Route path="/npi-dashboard" element={<NPIDashboard />} />
              <Route path="/npi-product/:id" element={<NPIProductDetail />} />
              <Route path="/npi-milestones" element={<NPIMilestones />} />
              <Route path="/npi-scenarios" element={<NPIScenarios />} />
              <Route path="/npi-analytics" element={<NPIAnalytics />} />
              <Route path="/sell-through-analytics" element={<SellThroughAnalytics />} />
              <Route path="/forecast-reconciliation" element={<ForecastReconciliation />} />
              <Route path="/ag-data-grids" element={<DataGrids />} />
              <Route path="/commercial-collaboration" element={<CommercialCollaboration />} />
              <Route path="/commercial-approve" element={<CommercialCollaborationApproved />} />
              {/* Protected Routes */}
            </Routes>
          </MasterLayout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
