import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader } from "@/components/ui/sidebar";
import { ChartSpline , Target, TrendingUp, Users, Home, Settings, Database, BarChart3, Package, ShoppingCart, ChartScatter, FileText, Calendar, Bell, Building2, Tag, UserPlus, Activity, Brain, Warehouse, Rocket, GitBranch, Network, TrendingDown, ArrowLeftRight, UserCheck, Factory, AlertTriangle, Truck, BellRing, Shield, ChevronDown, ChevronRight, Wrench, Search, Filter, Maximize2, Plus, Folder, Table } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
interface CompanyConfig {
  company_name: string;
  company_logo: string;
}
const items = [
  {
    title: "Forecasting",
    url: "/demand-forecast",
    icon: ChartSpline,
    type: "table"
  },
  {
    title: "Demand workbench",
    url: "/demand-workbench",
    icon: Table,
    type: "table"
  },
  {
    title: "All orders",
    url: "/kpi-dashboard",
    icon: Table,
    type: "table"
  },

  {
    title: "All orders & exc...",
    url: "/commercial-collaboration",
    icon: Table,
    type: "table"
  },
  {
    title: "Multiple orders per...",
    url: "/forecast-collaboration",
    icon: Folder,
    type: "folder",
    children: []
  },
  {
    title: "DC",
    url: "/launches",
    icon: Folder,
    type: "folder",
    children: []
  },
  {
    title: "Master data and settings",
    url: "/supply-planning",
    icon: Folder,
    type: "folder",
    children: []
  },
  {
    title: "Replenishment",
    url: "/npi-followup",
    icon: Folder,
    type: "folder",
    children: []
  },
  {
    title: "Product introductions",
    url: "/launches",
    icon: Folder,
    type: "folder",
    children: []
  },
  {
    title: "Events",
    url: "/events",
    icon: Folder,
    type: "folder",
    children: []
  }
];

// Seasonality items
const seasonalityItems = [
  {
    title: "Product terminations",
    url: "/product-terminations",
    icon: Folder,
    type: "folder",
    children: []
  },
  {
    title: "Inventory management and...",
    url: "/inventory-management",
    icon: Folder,
    type: "folder",
    children: []
  },
  {
    title: "Season management",
    url: "/season-management",
    icon: Folder,
    type: "folder",
    children: []
  },
  {
    title: "Promotions",
    url: "/promotions",
    icon: Folder,
    type: "folder",
    children: []
  },
  {
    title: "New store opening",
    url: "/new-store-opening",
    icon: Folder,
    type: "folder",
    children: []
  },
  {
    title: "Markdown optimization",
    url: "/markdown-optimization",
    icon: Folder,
    type: "folder",
    children: []
  },
  {
    title: "Temporary store closure",
    url: "/temporary-store-closure",
    icon: Folder,
    type: "folder",
    children: []
  }
];

/*
// NPI items
const npiItems = [{
  title: "NPI Dashboard",
  url: "/npi-dashboard",
  icon: Rocket
}, {
  title: "NPI Milestones",
  url: "/npi-milestones",
  icon: Target
}, {
  title: "NPI Scenarios",
  url: "/npi-scenarios",
  icon: GitBranch
}, {
  title: "NPI Analytics",
  url: "/npi-analytics",
  icon: BarChart3
}];
*/
// Admin-only items
const adminItems = [{
  title: "Productos",
  url: "/products-catalog",
  icon: Tag
}, {
  title: "Ventas",
  url: "/historydataview",
  icon: ChartScatter
},{
  title: "Clientes",
  url: "/customers-catalog",
  icon: Users
}, {
  title: "Inventarios",
  url: "/inventory-catalog",
  icon: Package
}, {
  title: "Cedis",
  url: "/locations-catalog",
  icon: Building2
}, {
  title: "Red",
  url: "/red",
  icon: Network
}, {
  title: "Gestión de Usuarios",
  url: "/user-management",
  icon: UserPlus
}, {
  title: "Roles de Usuario",
  url: "/user-roles",
  icon: UserPlus
}, {
  title: "Asignaciones de Usuario",
  url: "/user-assignments",
  icon: UserCheck
} ,{
  title: "Configuración de la Compañía",
  url: "/company-config",
  icon: Building2
}];
export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isAdministrator,
    loading
  } = useUserRole();
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig | null>(null);
  const [collapsedSections, setCollapsedSections] = useState({
    forecasting: true,
    seasonality: true,
    administracion: true
  });
  const [searchTerm, setSearchTerm] = useState("");
  const allItems = isAdministrator ? [...items, ...adminItems] : items;

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  useEffect(() => {
    const fetchCompanyConfig = async () => {
      try {
        const {
          data,
          error
        } = await supabase
        .schema('m8_schema' as any)
        .from('company_config' as any).select('company_name, company_logo').limit(1).single();
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
        <div className="px-2 pb-2">
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-white">
        <SidebarGroup>
          <div 
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-md"
            onClick={() => toggleSection('forecasting')}
          >
            <SidebarGroupLabel className="text-gray-600 font-semibold text-sm">
              Forecasting
            </SidebarGroupLabel>
            {collapsedSections.forecasting ? (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </div>
          {!collapsedSections.forecasting && (
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map(item => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      onClick={() => navigate(item.url)} 
                      isActive={location.pathname === item.url} 
                      className={`w-full justify-start text-sm hover:bg-gray-50 ${
                        location.pathname === item.url 
                          ? 'bg-gray-100 text-gray-900' 
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      <span className="font-normal">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        <SidebarGroup>
          <div 
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-md"
            onClick={() => toggleSection('seasonality')}
          >
            <SidebarGroupLabel className="text-gray-600 font-semibold text-sm">
              SEASONALITY
            </SidebarGroupLabel>
            {collapsedSections.seasonality ? (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </div>
          {!collapsedSections.seasonality && (
            <SidebarGroupContent>
              <SidebarMenu>
                {seasonalityItems.map(item => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      onClick={() => navigate(item.url)} 
                      isActive={location.pathname === item.url} 
                      className={`w-full justify-start text-sm hover:bg-gray-50 ${
                        location.pathname === item.url 
                          ? 'bg-gray-100 text-gray-900' 
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      <span className="font-normal">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        {isAdministrator && <SidebarGroup>
            <div 
              className="flex items-center justify-between cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-md"
              onClick={() => toggleSection('administracion')}
            >
              <SidebarGroupLabel className="text-gray-600 font-semibold text-sm">
                Administración
              </SidebarGroupLabel>
              {collapsedSections.administracion ? (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </div>
            {!collapsedSections.administracion && (
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map(item => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        onClick={() => navigate(item.url)} 
                        isActive={location.pathname === item.url} 
                        className={`w-full justify-start text-sm hover:bg-gray-50 ${
                          location.pathname === item.url 
                            ? 'bg-gray-100 text-gray-900' 
                            : 'text-gray-700 hover:text-gray-900'
                        }`}
                      >
                        <item.icon className="h-4 w-4 mr-2" />
                        <span className="font-normal">{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>}
      </SidebarContent>
    </Sidebar>;
}
