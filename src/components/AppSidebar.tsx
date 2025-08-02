import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader } from "@/components/ui/sidebar";
import { Target, TrendingUp, Users, Home, Settings, Database, BarChart3, Package, ShoppingCart, FileText, Calendar, Bell, Building2, Tag, UserPlus, Activity, Brain, Warehouse, CheckSquare } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
interface CompanyConfig {
  company_name: string;
  company_logo: string;
}
const items = [
  /*{
  title: "Inicio",
  url: "/planner-dashboard",
  icon: Home
}, */{
  title: "Pronóstico de Demanda",
  url: "/demand-forecast",
  icon: TrendingUp
}, {
  title: "Análisis What-If",
  url: "/what-if-analysis",
  icon: Brain
}, {
  title: "Proyecciones de Inventario",
  url: "/inventory-projections",
  icon: Warehouse
}, {
  title: "Gestión de Compras",
  url: "/purchase-management",
  icon: ShoppingCart
}, {
  title: "Colaboración Comercial",
  url: "/commercial-collaboration",
  icon: Users
}, {
  title: "Revisión Plan Comercial",
  url: "/commercial-approve",
  icon: Users
}, {
  title: "Dashboard Revisiones Comerciales",
  url: "/commercial-reviewed",
  icon: CheckSquare
}, {
  title: "Dashboard de KPIs",
  url: "/kpi-dashboard",
  icon: Target
}
/*, {
  title: "Analítica",
  url: "/advanced-reports",
  icon: BarChart3
}*/];

// Admin-only items
const adminItems = [{
  title: "Catálogo de Productos",
  url: "/products-catalog",
  icon: Tag
}, {
  title: "Catálogo de Clientes",
  url: "/customers-catalog",
  icon: Users
}, {
  title: "Catálogo de Ubicaciones",
  url: "/locations-catalog",
  icon: Building2
}, {
  title: "Análisis de Inventario",
  url: "/inventory-analysis",
  icon: Package
}, {
  title: "Reportes Avanzados",
  url: "/advanced-reports",
  icon: FileText
}, {
  title: "Configuración de la Compañía",
  url: "/company-config",
  icon: Building2
}, {
  title: "Gestión de Usuarios",
  url: "/user-management",
  icon: UserPlus
}, {
  title: "Asignación de Proveedores",
  url: "/vendor-assignments",
  icon: Building2
}, {
  title: "Búsquedas rápidas",
  url: "/saved-searches",
  icon: Settings
}, {
  title: "Configuración del Sistema",
  url: "/system-config",
  icon: Settings
}, {
  title: "Base de Datos",
  url: "/database-management",
  icon: Database
}];
export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isAdministrator,
    loading
  } = useUserRole();
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig | null>(null);
  const allItems = isAdministrator ? [...items, ...adminItems] : items;
  useEffect(() => {
    const fetchCompanyConfig = async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('company_config').select('company_name, company_logo').limit(1).single();
        if (error) {
          console.error('Error fetching company config:', error);
          return;
        }
        if (data) {
          setCompanyConfig(data);
        }
      } catch (error) {
        console.error('Error fetching company config:', error);
      }
    };
    fetchCompanyConfig();
  }, []);
  if (loading) {
    return <Sidebar className="border-r border-gray-200 bg-white">
        <SidebarHeader className="border-b border-gray-200" style={{
        backgroundColor: '#f3f4f6'
      }}>
          <div className="flex items-center gap-2 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-semibold text-sm">
              M8
            </div>
            <span className="font-semibold text-gray-900">Platform</span>
          </div>
        </SidebarHeader>
        <SidebarContent className="bg-white">
          <div className="p-4">Cargando...</div>
        </SidebarContent>
      </Sidebar>;
  }
  return <Sidebar className="border-r border-gray-200 bg-white">
      <SidebarHeader className="border-b border-gray-200" style={{
      backgroundColor: '#f3f4f6'
    }}>
        <div className="flex items-center gap-2 px-2">
          {companyConfig?.company_logo ? <img src={companyConfig.company_logo} alt={companyConfig.company_name || 'Company Logo'} onError={e => {
          console.error('Error loading company logo:', companyConfig.company_logo);
          e.currentTarget.style.display = 'none';
          // Show fallback
          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = 'flex';
        }} className="h-10w-10 object-contain rounded-lg" /> : <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-semibold text-sm">
              M8
            </div>}
          <div className="hidden h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-semibold text-sm">
            M8
          </div>
          
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-white">
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-600 font-semibold">
            Planificación
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton onClick={() => navigate(item.url)} isActive={location.pathname === item.url} className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100 data-[active=true]:bg-blue-50 data-[active=true]:text-blue-900 data-[active=true]:border-r-2 data-[active=true]:border-blue-600">
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdministrator && <SidebarGroup>
            <SidebarGroupLabel className="text-gray-600 font-semibold">
              Administración
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map(item => <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton onClick={() => navigate(item.url)} isActive={location.pathname === item.url} className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-orange-100 data-[active=true]:bg-orange-100 data-[active=true]:text-orange-900 data-[active=true]:border-r-2 data-[active=true]:border-orange-600">
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}
      </SidebarContent>
    </Sidebar>;
}
