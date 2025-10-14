import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Filter, 
  Search, 
  Check, 
  MapPin, 
  Package, 
  Container,
  Calendar,
  Tag,
  FileText,
  Layers,
  Folder,
  BarChart3,
  Zap,
  ChevronRight,
  ChevronDown,
  Circle,
  CheckCircle2,
  CalendarDays
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";

export interface ProductHierarchyItem {
  category_id: string;
  category_name: string;
  subcategory_id: string;
  subcategory_name: string;
  class_id?: string;
  class_name?: string;
  product_id?: string;
  product_name?: string;
  level: 'category' | 'subcategory' | 'class' | 'product';
}

interface HierarchyNode {
  id: string;
  name: string;
  level: 'category' | 'subcategory' | 'class' | 'product';
  children?: HierarchyNode[];
  data: ProductHierarchyItem;
}

export interface LocationItem {
  location_id: string;
  description: string;
  location_code: string;
}

export interface CustomerItem {
  customer_id: string;
  customer_code: string;
  description: string;
  status: string;
}

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface FilterDropdownProps {
  onProductFilterChange?: (selection: ProductHierarchyItem | null) => void;
  onLocationFilterChange?: (location: LocationItem | null) => void;
  onCustomerFilterChange?: (customer: CustomerItem | null) => void;
  onDateRangeChange?: (dateRange: DateRange | null) => void;
  onSearch?: () => void;
}

interface FilterCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  count: number;
  active: boolean;
}

export const FilterDropdown = ({ 
  onProductFilterChange, 
  onLocationFilterChange, 
  onCustomerFilterChange, 
  onDateRangeChange,
  onSearch 
}: FilterDropdownProps) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ubicacion');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductHierarchyItem | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | null>(null);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [hierarchyData, setHierarchyData] = useState<HierarchyNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [productLevels, setProductLevels] = useState<string[]>(['category', 'subcategory', 'product']);

  const filterCategories: FilterCategory[] = [
    { id: 'fecha', name: 'Fecha', icon: <Calendar className="h-4 w-4" />, count: selectedDateRange ? 1 : 0, active: !!selectedDateRange },
    { id: 'item', name: 'Producto', icon: <Package className="h-4 w-4" />, count: selectedProduct ? 1 : 0, active: !!selectedProduct },
    { id: 'ubicacion', name: 'Ubicación', icon: <MapPin className="h-4 w-4" />, count: selectedLocation ? 1 : 0, active: !!selectedLocation },
    { id: 'cliente', name: 'Cliente', icon: <Container className="h-4 w-4" />, count: selectedCustomer ? 1 : 0, active: !!selectedCustomer },
  ];

  useEffect(() => {
    fetchLocations();
    fetchCustomers();
    fetchHierarchyData();
  }, []);

  // Refetch hierarchy data when search term changes
  useEffect(() => {
    if (activeCategory === 'item') {
      fetchHierarchyData();
    }
  }, [searchTerm, activeCategory]);

  // Clear search term when category changes
  useEffect(() => {
    setSearchTerm("");
  }, [activeCategory]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .from('v_warehouse_node')
        .select('location_id, description, location_code')
        .order('description');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .from('v_customer_node')
        .select('customer_id, customer_code, description, status')
        .eq('status', 'active')
        .order('description');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchHierarchyData = async () => {
    try {
      let query = (supabase as any)
        .schema('m8_schema')
        .from('products')
        .select('product_id, product_name, category_name, subcategory_name, class_name')
        .order('category_name, subcategory_name, class_name, product_name');

      // Add search filter if searchTerm is provided
      if (searchTerm) {
        // Check if searchTerm is numeric for exact product_id match
        const isNumeric = !isNaN(Number(searchTerm));
        if (isNumeric) {
          // For numeric searches, try exact match on product_id first, then fallback to text search
          query = query.or(`product_id.eq.${searchTerm},product_id.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%,category_name.ilike.%${searchTerm}%,subcategory_name.ilike.%${searchTerm}%,class_name.ilike.%${searchTerm}%`);
        } else {
          // For text searches, use ilike on all fields
          query = query.or(`product_id.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%,category_name.ilike.%${searchTerm}%,subcategory_name.ilike.%${searchTerm}%,class_name.ilike.%${searchTerm}%`);
        }
      }

      const { data, error } = await query;
      
      if (error) throw error;

      const hierarchy = buildHierarchy(data || []);
      setHierarchyData(hierarchy);
    } catch (error) {
      console.error('Error fetching hierarchy:', error);
    }
  };

  const buildHierarchy = (data: any[]): HierarchyNode[] => {
    const categoryMap = new Map<string, HierarchyNode>();
    const subcategoryMap = new Map<string, HierarchyNode>();
    const classMap = new Map<string, HierarchyNode>();

    data.forEach((item) => {
      // Create category node
      const categoryKey = item.category_name || 'Uncategorized';
      if (!categoryMap.has(categoryKey)) {
        categoryMap.set(categoryKey, {
          id: `category_${categoryKey}`,
          name: categoryKey,
          level: 'category',
          children: [],
          data: {
            category_id: categoryKey,
            category_name: categoryKey,
            subcategory_id: item.subcategory_name,
            subcategory_name: item.subcategory_name,
            class_id: item.class_name,
            class_name: item.class_name,
            product_id: item.product_id,
            product_name: item.product_name,
            level: 'category'
          }
        });
      }

      // Create subcategory node if included in levels and exists
      if (productLevels.includes('subcategory') && item.subcategory_name) {
        const subcategoryKey = `${categoryKey}_${item.subcategory_name}`;
        if (!subcategoryMap.has(subcategoryKey)) {
          const subcategoryNode: HierarchyNode = {
            id: `subcategory_${subcategoryKey}`,
            name: item.subcategory_name,
            level: 'subcategory',
            children: [],
            data: {
              category_id: categoryKey,
              category_name: categoryKey,
              subcategory_id: item.subcategory_name,
              subcategory_name: item.subcategory_name,
              class_id: item.class_name,
              class_name: item.class_name,
              product_id: item.product_id,
              product_name: item.product_name,
              level: 'subcategory'
            }
          };
          subcategoryMap.set(subcategoryKey, subcategoryNode);
          categoryMap.get(categoryKey)?.children?.push(subcategoryNode);
        }
      }

      // Create class node if included in levels and exists
      if (productLevels.includes('class') && item.class_name) {
        const classKey = `${categoryKey}_${item.subcategory_name || 'default'}_${item.class_name}`;
        if (!classMap.has(classKey)) {
          const classNode: HierarchyNode = {
            id: `class_${classKey}`,
            name: item.class_name,
            level: 'class',
            children: [],
            data: {
              category_id: categoryKey,
              category_name: categoryKey,
              subcategory_id: item.subcategory_name,
              subcategory_name: item.subcategory_name,
              class_id: item.class_name,
              class_name: item.class_name,
              product_id: item.product_id,
              product_name: item.product_name,
              level: 'class'
            }
          };
          classMap.set(classKey, classNode);
          
          const parentKey = productLevels.includes('subcategory') && item.subcategory_name
            ? `${categoryKey}_${item.subcategory_name}`
            : categoryKey;
          const parentMap = productLevels.includes('subcategory') && item.subcategory_name ? subcategoryMap : categoryMap;
          parentMap.get(parentKey)?.children?.push(classNode);
        }
      }

      // Add product if included in levels
      if (productLevels.includes('product')) {
        const productNode: HierarchyNode = {
          id: `product_${item.product_id}`,
          name: `${item.product_id} - ${item.product_name}`,
          level: 'product',
          data: {
            category_id: categoryKey,
            category_name: categoryKey,
            subcategory_id: item.subcategory_name,
            subcategory_name: item.subcategory_name,
            class_id: item.class_name,
            class_name: item.class_name,
            product_id: item.product_id,
            product_name: item.product_name,
            level: 'product'
          }
        };

        // Find the correct parent
        let parentNode: HierarchyNode | undefined;
        if (productLevels.includes('class') && item.class_name) {
          const classKey = `${categoryKey}_${item.subcategory_name || 'default'}_${item.class_name}`;
          parentNode = classMap.get(classKey);
        } else if (productLevels.includes('subcategory') && item.subcategory_name) {
          const subcategoryKey = `${categoryKey}_${item.subcategory_name}`;
          parentNode = subcategoryMap.get(subcategoryKey);
        } else {
          parentNode = categoryMap.get(categoryKey);
        }

        if (parentNode) {
          if (!parentNode.children) parentNode.children = [];
          parentNode.children.push(productNode);
        }
      }
    });

    return Array.from(categoryMap.values());
  };

  const handleLocationSelect = (location: LocationItem) => {
    setSelectedLocation(location);
    onLocationFilterChange?.(location);
  };

  const handleCustomerSelect = (customer: CustomerItem) => {
    setSelectedCustomer(customer);
    onCustomerFilterChange?.(customer);
  };

  const handleProductSelect = (product: ProductHierarchyItem) => {
    setSelectedProduct(product);
    onProductFilterChange?.(product);
  };

  const clearLocationFilter = () => {
    setSelectedLocation(null);
    onLocationFilterChange?.(null);
  };

  const clearCustomerFilter = () => {
    setSelectedCustomer(null);
    onCustomerFilterChange?.(null);
  };

  const clearProductFilter = () => {
    setSelectedProduct(null);
    onProductFilterChange?.(null);
  };

  const handleDateRangeChange = (dateRange: DateRange) => {
    setSelectedDateRange(dateRange);
    onDateRangeChange?.(dateRange);
  };

  const clearDateRangeFilter = () => {
    setSelectedDateRange(null);
    onDateRangeChange?.(null);
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleProductSelection = (node: HierarchyNode) => {
    // Create a new ProductHierarchyItem based on the selected node level
    const selectedItem: ProductHierarchyItem = {
      category_id: node.data.category_id,
      category_name: node.data.category_name,
      subcategory_id: node.data.subcategory_id,
      subcategory_name: node.data.subcategory_name,
      class_id: node.data.class_id,
      class_name: node.data.class_name,
      product_id: node.data.product_id,
      product_name: node.data.product_name,
      level: node.level // Use the actual level of the selected node
    };
    
    setSelectedProduct(selectedItem);
    onProductFilterChange?.(selectedItem);
  };

  const isProductSelected = (node: HierarchyNode) => {
    if (!selectedProduct) return false;
    
    // Only highlight if the node level matches the selected level exactly
    if (selectedProduct.level !== node.level) return false;
    
    // Check if the selected product matches the current node based on the selected level
    switch (selectedProduct.level) {
      case 'category':
        return selectedProduct.category_id === node.data.category_id;
      case 'subcategory':
        return selectedProduct.category_id === node.data.category_id &&
               selectedProduct.subcategory_id === node.data.subcategory_id;
      case 'class':
        return selectedProduct.category_id === node.data.category_id &&
               selectedProduct.subcategory_id === node.data.subcategory_id &&
               selectedProduct.class_id === node.data.class_id;
      case 'product':
        return selectedProduct.category_id === node.data.category_id &&
               selectedProduct.subcategory_id === node.data.subcategory_id &&
               selectedProduct.class_id === node.data.class_id &&
               selectedProduct.product_id === node.data.product_id;
      default:
        return false;
    }
  };

  const getFilteredData = () => {
    const category = activeCategory;
    let data: any[] = [];
    
    switch (category) {
      case 'fecha':
        // For date range, we return a special marker
        data = ['date-range-selector'];
        break;
      case 'ubicacion':
        data = locations.filter(item => 
          !searchTerm || 
          item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.location_code.toLowerCase().includes(searchTerm.toLowerCase())
        );
        break;
      case 'cliente':
        data = customers.filter(item => 
          !searchTerm || 
          item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.customer_code.toLowerCase().includes(searchTerm.toLowerCase())
        );
        break;
      case 'item':
        // For products, we return the hierarchy data directly
        data = hierarchyData;
        break;
      default:
        data = [];
    }
    
    return data;
  };

  const renderNode = (node: HierarchyNode, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const selected = isProductSelected(node);

    return (
      <div key={node.id} className="space-y-1">
        <div
          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent/50 ${
            selected ? 'bg-accent text-accent-foreground' : ''
          }`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => handleProductSelection(node)}
        >
          <div className="flex items-center gap-2 flex-1">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            ) : (
              <div className="w-4" />
            )}
            
            {selected ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
            
            <span className="text-sm">{node.name}</span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {node.children?.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderFilterContent = () => {
    const data = getFilteredData();
    const category = activeCategory;

    return (
      <div className="flex flex-col h-full">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Selected Filters */}
        {((category === 'fecha' && selectedDateRange) ||
          (category === 'ubicacion' && selectedLocation) || 
          (category === 'cliente' && selectedCustomer) || 
          (category === 'item' && selectedProduct)) && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Filtros seleccionados</span>
              </div>
              <Button variant="link" size="sm" className="text-xs p-0 h-auto">
                Ver todos
              </Button>
            </div>
            
            <div className="space-y-1">
              {category === 'fecha' && selectedDateRange && (
                <div className="flex items-center justify-between p-2 bg-green-50 rounded-md">
                  <span className="text-sm">
                    {selectedDateRange.from?.toLocaleDateString('es-ES')} - {selectedDateRange.to?.toLocaleDateString('es-ES')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={clearDateRangeFilter}
                  >
                    <span className="text-red-500">×</span>
                  </Button>
                </div>
              )}
              {category === 'ubicacion' && selectedLocation && (
                <div className="flex items-center justify-between p-2 bg-green-50 rounded-md">
                  <span className="text-sm">{selectedLocation.description} ({selectedLocation.location_code})</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={clearLocationFilter}
                  >
                    <span className="text-red-500">×</span>
                  </Button>
                </div>
              )}
              {category === 'cliente' && selectedCustomer && (
                <div className="flex items-center justify-between p-2 bg-green-50 rounded-md">
                  <span className="text-sm">{selectedCustomer.description} ({selectedCustomer.customer_code})</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={clearCustomerFilter}
                  >
                    <span className="text-red-500">×</span>
                  </Button>
                </div>
              )}
              {category === 'item' && selectedProduct && (
                <div className="flex items-center justify-between p-2 bg-green-50 rounded-md">
                  <span className="text-sm">
                    {selectedProduct.level === 'product' && `${selectedProduct.product_id} - ${selectedProduct.product_name}`}
                    {selectedProduct.level === 'class' && `${selectedProduct.class_name} (Clase)`}
                    {selectedProduct.level === 'subcategory' && `${selectedProduct.subcategory_name} (Subcategoría)`}
                    {selectedProduct.level === 'category' && `${selectedProduct.category_name} (Categoría)`}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={clearProductFilter}
                  >
                    <span className="text-red-500">×</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filter Options */}
          <div className="flex-1 min-h-0">
            <ScrollArea style={{ height: '300px' }}>
            <div className="space-y-1">
              {category === 'fecha' ? (
                // Render date range selector
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Seleccionar rango de fechas</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
                      <Input
                        type="date"
                        value={selectedDateRange?.from ? selectedDateRange.from.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          const fromDate = e.target.value ? new Date(e.target.value) : null;
                          const currentTo = selectedDateRange?.to;
                          handleDateRangeChange({ from: fromDate, to: currentTo });
                        }}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
                      <Input
                        type="date"
                        value={selectedDateRange?.to ? selectedDateRange.to.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          const toDate = e.target.value ? new Date(e.target.value) : null;
                          const currentFrom = selectedDateRange?.from;
                          handleDateRangeChange({ from: currentFrom, to: toDate });
                        }}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {/* Quick date range buttons */}
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">Rangos rápidos:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const today = new Date();
                          const lastWeek = new Date(today);
                          lastWeek.setDate(today.getDate() - 7);
                          handleDateRangeChange({ from: lastWeek, to: today });
                        }}
                      >
                        Última semana
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const today = new Date();
                          const lastMonth = new Date(today);
                          lastMonth.setMonth(today.getMonth() - 1);
                          handleDateRangeChange({ from: lastMonth, to: today });
                        }}
                      >
                        Último mes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const today = new Date();
                          const last3Months = new Date(today);
                          last3Months.setMonth(today.getMonth() - 3);
                          handleDateRangeChange({ from: last3Months, to: today });
                        }}
                      >
                        Últimos 3 meses
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const today = new Date();
                          const lastYear = new Date(today);
                          lastYear.setFullYear(today.getFullYear() - 1);
                          handleDateRangeChange({ from: lastYear, to: today });
                        }}
                      >
                        Último año
                      </Button>
                    </div>
                  </div>
                </div>
              ) : category === 'item' ? (
                // Render tree structure for products
                data.map((node: HierarchyNode) => renderNode(node))
              ) : (
                // Render flat list for other categories
                data.map((item, index) => {
                  const isSelected = 
                    (category === 'ubicacion' && selectedLocation?.location_id === item.location_id) ||
                    (category === 'cliente' && selectedCustomer?.customer_code === item.customer_code);

                  return (
                    <div
                      key={index}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                      onClick={() => {
                        if (category === 'ubicacion') handleLocationSelect(item);
                        if (category === 'cliente') handleCustomerSelect(item);
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => {
                          if (category === 'ubicacion') handleLocationSelect(item);
                          if (category === 'cliente') handleCustomerSelect(item);
                        }}
                      />
                      <span className="text-sm">
                        {category === 'ubicacion' && `${item.description} (${item.location_code})`}
                        {category === 'cliente' && `${item.description} (${item.customer_code})`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  const getActiveFiltersCount = () => {
    return filterCategories.reduce((sum, cat) => sum + cat.count, 0);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {getActiveFiltersCount() > 0 && (
            <Badge variant="secondary" className="ml-1">
              {getActiveFiltersCount()}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-[720px] p-0" align="start">
        <div className="flex h-[500px]">
          {/* Left Panel - Filter Categories */}
          <div className="w-48 bg-gray-50 border-r">
            <div className="p-4">
              <h3 className="font-semibold text-sm mb-3">Categorías</h3>
              <div className="space-y-1">
                {filterCategories.map((category) => (
                  <div
                    key={category.id}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                      activeCategory === category.id 
                        ? 'bg-primary/10 text-primary border border-primary/20' 
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    <div className="flex items-center gap-2">
                      {category.icon}
                      <span className="text-sm">{category.name}</span>
                    </div>
                    {category.count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        ({category.count})
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Filter Options */}
          <div className="flex-1 p-4">
            <h3 className="font-semibold text-sm mb-4 capitalize">
              {filterCategories.find(cat => cat.id === activeCategory)?.name}
            </h3>
            {renderFilterContent()}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => {
              onSearch?.();
              setIsOpen(false);
            }}
            className="bg-primary hover:bg-primary/90"
          >
            Aplicar
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
