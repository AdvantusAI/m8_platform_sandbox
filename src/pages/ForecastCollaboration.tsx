import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, SelectionChangedEvent } from 'ag-grid-community';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Package, MapPin, Filter, Truck, X, Calendar, Users } from 'lucide-react';
import { FilterDropdown, ProductHierarchyItem, LocationItem, CustomerItem, DateRange } from "@/components/filters/FilterDropdown";
import { toast } from 'sonner';
import FilterPanel from "@/components/FilterPanel";
import { useProducts } from '@/hooks/useProducts';
import { useLocations } from '@/hooks/useLocations';
import { useCustomers } from '@/hooks/useCustomers';
import { ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Scatter } from 'recharts';
import { ArrowDown, ArrowUp, Droplet, DollarSign, Weight } from "lucide-react";
// Interface for commercial_collaboration_view data
interface CommercialCollaborationData {
  product_id: string;
  location_node_id: string;
  customer_node_id: string;
  postdate: string;
  actual: number;
  forecast: number;
  approved_sm_kam: number; // commercial_input from forecast_data
  forecast_ly: number;
  category_id: string;
  subcategory_id: string;
  sm_kam_override: number; // from commercial_collaboration
  forecast_sales_manager: number; // from commercial_collaboration
  commercial_input: number; // from commercial_collaboration
  forecast_sales_gap: number; // calculated field
}

interface CustomerData {
  customer_node_id: string;
  customer_name: string;
  product_id?: string;
  product_name?: string; // Added to show product name in table
  location_node_id?: string; // Added to store location information
  // Product attributes for calculations
  attr_1?: number; // Used for litros and cajas
  attr_2?: number; // Used for peso
  attr_3?: number // /Used for kilos
  months: { [key: string]: {
    last_year: number;
    forecast_sales_gap: number;
    calculated_forecast: number;
    xamview: number;
    kam_forecast_correction: number;
    sales_manager_view: number;
    effective_forecast: number;
    sell_in_aa: number;
    sell_out_aa: number;
    sell_out_real: number;
    inventory_days: number;
    forecast_commercial_input: number; // Original commercial_input from forecast_data (approved_sm_kam)
    // New fields for the requested rows
    si_venta_2024?: number;
    si_2025?: number;
    so_2024?: number;
    so_2025?: number;
    ddi_totales?: number;
    si_pin_2025?: number;
    le_1?: number;
    si_pin_2026?: number;
    pin_vs_aa_1?: number;
    ppto_2025?: number;
    ppto_2026?: number;
    pin_26_vs_aa_25?: number;
    pin_26_vs_ppto_26?: number;
    pin_sep?: number;
    pin_sep_vs_pin?: number;
    kam_26?: number;
    by_26?: number;
    bb_26?: number;
    pci_26?: number;
  }};
  // Store actual postdate mapping from month name to database postdate
  monthPostdates?: { [key: string]: string };
}



const ForecastCollaboration: React.FC = () => {
  // Helper function to format numbers, showing zeros but not null/undefined
  const formatValue = (value: number | null | undefined): string => {
    return (value !== null && value !== undefined) ? value.toLocaleString('es-MX') : '';
  };

  // Helper function to calculate YTD (Year To Date) - sum of all 12 months
  const calculateCustomerYTD = (customer: CustomerData, attribute: 'attr_1' | 'attr_2' | 'attr_3'): number => {
    if (!customer[attribute]) return 0;
    
    const allRowValues = [
      'sell_in_aa', 'sell_out_aa', 'sell_out_real', 'xamview', 'calculated_forecast',
      'kam_forecast_correction', 'sales_manager_view', 'effective_forecast', 'inventory_days'
    ];
    
    let total = 0;
    Object.values(customer.months).forEach(monthData => {
      allRowValues.forEach(field => {
        total += (monthData[field as keyof typeof monthData] || 0) * (customer[attribute] || 0);
      });
    });
    
    return total;
  };

  // Helper function to calculate YTG (Year To Go) - sum of last 3 months
  const calculateCustomerYTG = (customer: CustomerData, attribute: 'attr_1' | 'attr_2' | 'attr_3'): number => {
    if (!customer[attribute]) return 0;
    
    const allRowValues = [
      'sell_in_aa', 'sell_out_aa', 'sell_out_real', 'xamview', 'calculated_forecast',
      'kam_forecast_correction', 'sales_manager_view', 'effective_forecast', 'inventory_days'
    ];
    
    // Get the last 3 months from the months array
    const monthKeys = Object.keys(customer.months).sort().slice(-3);
    
    let total = 0;
    monthKeys.forEach(monthKey => {
      const monthData = customer.months[monthKey];
      if (monthData) {
        allRowValues.forEach(field => {
          total += (monthData[field as keyof typeof monthData] || 0) * (customer[attribute] || 0);
        });
      }
    });
    
    return total;
  };

  // Helper function to calculate Total (YTD + YTG)
  const calculateCustomerTotal = (customer: CustomerData, attribute: 'attr_1' | 'attr_2' | 'attr_3'): number => {
    return calculateCustomerYTD(customer, attribute) + calculateCustomerYTG(customer, attribute);
  };

  // Helper function to render summary columns for aggregate rows
  const renderSummaryColumns = (customersToUse: CustomerData[]) => (
    <>
      {/* Cajas column */}
      <div className="bg-purple-100 p-1 text-center text-xs">
        <div className="grid grid-cols-3 gap-1">
          <div className="text-right text-xs">
            {formatValue(customersToUse.reduce((sum, customer) => sum + calculateCustomerYTD(customer, 'attr_3'), 0))}
          </div>
          <div className="text-right text-xs">
            {formatValue(customersToUse.reduce((sum, customer) => sum + calculateCustomerYTG(customer, 'attr_3'), 0))}
          </div>
          <div className="text-right text-xs">
            {formatValue(customersToUse.reduce((sum, customer) => sum + calculateCustomerTotal(customer, 'attr_3'), 0))}
          </div>
        </div>
      </div>
      
      {/* Litro column */}
      <div className="bg-green-100 p-1 text-center text-xs">
        <div className="grid grid-cols-3 gap-1">
          <div className="text-right text-xs">
            {formatValue(customersToUse.reduce((sum, customer) => sum + calculateCustomerYTD(customer, 'attr_1'), 0))}
          </div>
          <div className="text-right text-xs">
            {formatValue(customersToUse.reduce((sum, customer) => sum + calculateCustomerYTG(customer, 'attr_1'), 0))}
          </div>
          <div className="text-right text-xs">
            {formatValue(customersToUse.reduce((sum, customer) => sum + calculateCustomerTotal(customer, 'attr_1'), 0))}
          </div>
        </div>
      </div>
      
      {/* Peso column */}
      <div className="bg-orange-100 p-1 text-center text-xs">
        <div className="grid grid-cols-3 gap-1">
          <div className="text-right text-xs">
            {formatValue(customersToUse.reduce((sum, customer) => sum + calculateCustomerYTD(customer, 'attr_2'), 0))}
          </div>
          <div className="text-right text-xs">
            {formatValue(customersToUse.reduce((sum, customer) => sum + calculateCustomerYTG(customer, 'attr_2'), 0))}
          </div>
          <div className="text-right text-xs">
            {formatValue(customersToUse.reduce((sum, customer) => sum + calculateCustomerTotal(customer, 'attr_2'), 0))}
          </div>
        </div>
      </div>
    </>
  );

  // Helper function to render summary columns for individual customer rows
  const renderIndividualSummaryColumns = (customer: CustomerData) => (
    <>
      {/* Cajas column */}
      <div className="bg-purple-50 p-1 text-center text-xs">
        <div className="grid grid-cols-3 gap-1">
          <div className="text-right text-xs">
            {formatValue(calculateCustomerYTD(customer, 'attr_3'))}
          </div>
          <div className="text-right text-xs">
            {formatValue(calculateCustomerYTG(customer, 'attr_3'))}
          </div>
          <div className="text-right text-xs">
            {formatValue(calculateCustomerTotal(customer, 'attr_3'))}
          </div>
        </div>
      </div>
      
      {/* Litro column */}
      <div className="bg-green-50 p-1 text-center text-xs">
        <div className="grid grid-cols-3 gap-1">
          <div className="text-right text-xs">
            {formatValue(calculateCustomerYTD(customer, 'attr_1'))}
          </div>
          <div className="text-right text-xs">
            {formatValue(calculateCustomerYTG(customer, 'attr_1'))}
          </div>
          <div className="text-right text-xs">
            {formatValue(calculateCustomerTotal(customer, 'attr_1'))}
          </div>
        </div>
      </div>
      
      {/* Peso column */}
      <div className="bg-orange-50 p-1 text-center text-xs">
        <div className="grid grid-cols-3 gap-1">
          <div className="text-right text-xs">
            {formatValue(calculateCustomerYTD(customer, 'attr_2'))}
          </div>
          <div className="text-right text-xs">
            {formatValue(calculateCustomerYTG(customer, 'attr_2'))}
          </div>
          <div className="text-right text-xs">
            {formatValue(calculateCustomerTotal(customer, 'attr_2'))}
          </div>
        </div>
      </div>
    </>
  );

  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [allCustomers, setAllCustomers] = useState<CustomerData[]>([]);
  const [rawForecastData, setRawForecastData] = useState<CommercialCollaborationData[]>([]);
  const [customerNames, setCustomerNames] = useState<{[key: string]: string}>({});
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{customerId: string, month: string} | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [inlineEditingCell, setInlineEditingCell] = useState<{customerId: string, month: string} | null>(null);
  const [inlineEditingValue, setInlineEditingValue] = useState<string>('');
  const [isCollapsibleOpen, setIsCollapsibleOpen] = useState(false);
  const [salesTrends, setSalesTrends] = useState({
    currentPeriod: 0,
    lastYearPeriod: 0,
    growthPercentage: 0,
    trendDirection: 'neutral' as 'up' | 'down' | 'neutral'
  });
  const [kamApprovals, setKamApprovals] = useState<{[key: string]: {[key: string]: string}}>({});
  const [saving, setSaving] = useState(false);
  const [noResultsFound, setNoResultsFound] = useState(false);
  const [clearingFilters, setClearingFilters] = useState(false);
  const [noResultsMessageDismissed, setNoResultsMessageDismissed] = useState(false);

  const dataTypes = [
    'Año pasado (LY)', 'Gap Forecast vs ventas', 'Forecast M8.predict', 'Key Account Manager', 
    'Kam Forecast', 'Sales manager view', 'Effective Forecast', 'KAM aprobado',
    'SI VENTA 2024', 'SI 2025', 'SO 2024', 'SO 2025', 'DDI Totales', 'SI PIN 2025', 
    'LE-1', 'SI PIN 2026', '% PIN vs AA-1', 'PPTO 2025', 'PPTO 2026', 
    '% PIN 26 vs AA 25', '% PIN 26 vs PPTO 26', 'PIN SEP', '% PIN SEP vs PIN', 
    'KAM 26', 'BY 26', 'BB 26', 'PCI 26'
  ];

  // ===== HOOKS =====
  const { getProductName } = useProducts();
  const { getLocationName } = useLocations();
  const { getCustomerName } = useCustomers();

  // ===== FILTER STATE =====  
  // Filter state using FilterDropdown types
  const [selectedProduct, setSelectedProduct] = useState<ProductHierarchyItem | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | null>(null);
  
  // Advanced filters from FilterPanel
  const [advancedFilters, setAdvancedFilters] = useState<any>({
    canal: [],
    marca: [],
    clientHierarchy: [],
    umn: [],
    productLine: [],
    agente: [],
    selectedCustomers: [],
    selectedCategories: [],
    selectedBrands: [],
    selectedLocations: [],
    selectedProducts: [],
    productDetails: {}
  });


  // Chart series visibility state
  const [chartSeriesVisible, setChartSeriesVisible] = useState({
    m8Predict: true,
    kamForecast: true,
    effectiveForecast: true,
    lastYear: true,
    growthLine: true
  });

  // Chart series colors state
  const [chartSeriesColors, setChartSeriesColors] = useState({
    m8Predict: '#ea580c', // orange-600
    kamForecast: '#9333ea', // purple-600
    effectiveForecast: '#059669', // green-600
    lastYear: '#2563eb', // blue-600
    growthLine: '#dc2626' // red-600
  });

  // Show color picker state
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

  // Toggle series visibility
  const toggleSeriesVisibility = useCallback((seriesName: keyof typeof chartSeriesVisible) => {
    setChartSeriesVisible(prev => ({
      ...prev,
      [seriesName]: !prev[seriesName]
    }));
  }, []);

  // Update series color
  const updateSeriesColor = useCallback((seriesName: keyof typeof chartSeriesColors, color: string) => {
    setChartSeriesColors(prev => ({
      ...prev,
      [seriesName]: color
    }));
  }, []);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.color-picker-container')) {
        setShowColorPicker(null);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showColorPicker]);

  // Helper function to check if a month is within the selected date range
  const isMonthInDateRange = useCallback((monthKey: string, dateRange: DateRange | null): boolean => {
    if (!dateRange?.from || !dateRange?.to) return true;
    
    // Convert month key (e.g., 'gor -24') to date for comparison
    const monthMap: { [key: string]: Date } = {
      'oct-24': new Date(2024, 9, 1), 'nov-24': new Date(2024, 10, 1), 'dic-24': new Date(2024, 11, 1),
      'ene-25': new Date(2025, 0, 1), 'feb-25': new Date(2025, 1, 1), 'mar-25': new Date(2025, 2, 1),
      'abr-25': new Date(2025, 3, 1), 'may-25': new Date(2025, 4, 1), 'jun-25': new Date(2025, 5, 1),
      'jul-25': new Date(2025, 6, 1), 'ago-25': new Date(2025, 7, 1), 'sep-25': new Date(2025, 8, 1),
      'oct-25': new Date(2025, 9, 1), 'nov-25': new Date(2025, 10, 1), 'dic-25': new Date(2025, 11, 1)
    };
    
    const monthDate = monthMap[monthKey];
    if (!monthDate) return false;
    
    return monthDate >= dateRange.from && monthDate <= dateRange.to;
  }, []);

  // All available months - will be filtered based on date range selection
  const allMonths = ['oct-24', 'nov-24', 'dic-24', 'ene-25', 'feb-25', 'mar-25', 'abr-25', 'may-25', 'jun-25', 'jul-25', 'ago-25', 'sep-25', 'oct-25', 'nov-25', 'dic-25'];
  
  // Filter months based on selected date range
  const months = useMemo(() => {
    if (!selectedDateRange?.from || !selectedDateRange?.to) {
      return allMonths;
    }
    
    return allMonths.filter(month => isMonthInDateRange(month, selectedDateRange));
  }, [selectedDateRange, isMonthInDateRange]);

  // Note: Filter persistence is now handled by the FilterDropdown component

  // ===== FILTER HANDLERS =====
  const handleProductFilterChange = (selection: ProductHierarchyItem | null) => {
    setSelectedProduct(selection);
  };

  const handleLocationFilterChange = (location: LocationItem | null) => {
    setSelectedLocation(location);
  };

  const handleCustomerFilterChange = (customer: CustomerItem | null) => {
    setSelectedCustomer(customer);
  };

  const handleDateRangeChange = (dateRange: DateRange | null) => {
    setSelectedDateRange(dateRange);
  };

  const handleSearch = useCallback(() => {
    console.log('Search triggered with filters:', {
      selectedProduct,
      selectedLocation,
      selectedCustomer,
      selectedDateRange,
      advancedFilters
    });
  }, [selectedProduct, selectedLocation, selectedCustomer, selectedDateRange, advancedFilters]);

  // Handler for advanced filters from FilterPanel
  // Updates filters immediately so selections are preserved and UI reflects changes
  // Data fetching is debounced in useEffect to allow multiple selections
  const handleAdvancedFiltersChange = useCallback((filters: any) => {
    console.log('Advanced filters changed:', filters);
    // Update filters immediately so UI reflects selections without delay
    // This allows users to select multiple filters (like multiple Jerarquía de Cliente)
    // without losing their selections or triggering immediate page refresh
    setAdvancedFilters(filters);
  }, []);

  // Helper function to check if any filters are active
  const hasActiveFilters = useCallback(() => {
    // Check basic filters
    const hasBasicFilters = !!(selectedProduct || selectedLocation || selectedCustomer || selectedDateRange);
    
    // Check advanced filters
    const hasAdvancedFilters = !!(
      (advancedFilters.canal && advancedFilters.canal.length > 0) ||
      (advancedFilters.marca && advancedFilters.marca.length > 0) ||
      (advancedFilters.clientHierarchy && advancedFilters.clientHierarchy.length > 0) ||
      (advancedFilters.umn && advancedFilters.umn.length > 0) ||
      (advancedFilters.productLine && advancedFilters.productLine.length > 0) ||
      (advancedFilters.agente && advancedFilters.agente.length > 0) ||
      (advancedFilters.selectedCustomers && advancedFilters.selectedCustomers.length > 0) ||
      (advancedFilters.selectedCategories && advancedFilters.selectedCategories.length > 0) ||
      (advancedFilters.selectedBrands && advancedFilters.selectedBrands.length > 0) ||
      (advancedFilters.selectedLocations && advancedFilters.selectedLocations.length > 0) ||
      (advancedFilters.selectedProducts && advancedFilters.selectedProducts.length > 0)
    );
    
    return hasBasicFilters || hasAdvancedFilters;
  }, [selectedProduct, selectedLocation, selectedCustomer, selectedDateRange, advancedFilters]);


  // Function to clear all filters
  const clearAllFilters = useCallback(async () => {
    setClearingFilters(true);
    
    try {
      // Clear basic filters
      setSelectedProduct(null);
      setSelectedLocation(null);
      setSelectedCustomer(null);
      setSelectedDateRange(null);
      
      // Clear advanced filters including clientHierarchy (Jerarquía de clientes)
      setAdvancedFilters({
        canal: [],
        marca: [],
        clientHierarchy: [], // This clears "Jerarquía de clientes"
        umn: [],
        productLine: [],
        agente: [],
        selectedCustomers: [],
        selectedCategories: [],
        selectedBrands: [],
        selectedLocations: [],
        selectedProducts: [],
        productDetails: {}
      });

      // Reset no results message state
      setNoResultsMessageDismissed(false);
      
      // Add a small delay to show the loading animation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Show success notification
      toast.success('Filtros limpiados', {
        description: 'Todos los filtros han sido eliminados, incluyendo la Jerarquía de clientes. Los datos se cargarán automáticamente.',
        duration: 3000,
        closeButton: true,
      });
    } catch (error) {
      console.error('Error clearing filters:', error);
      toast.error('Error al limpiar filtros', {
        description: 'Ocurrió un error al limpiar los filtros. Intenta de nuevo.',
        duration: 3000,
        closeButton: true,
      });
    } finally {
      setClearingFilters(false);
    }
  }, []);

  // Process raw data into customer format with filtering
  // Function to fetch sell-in data from v_sales_transaction_in
  // Function to fetch sell-in data from v_time_series_sell_in.quantity for "Sell in AA"
  const fetchSellInData = useCallback(async () => {
    try {
      let query = (supabase as any)
        .schema('m8_schema')
        .from('v_sales_transaction_in')
        .select('product_id, location_node_id, customer_node_id, postdate, quantity')
        .gte('postdate', '2024-10-01')
        .lte('postdate', '2025-12-31')
        .order('customer_node_id', { ascending: true })
        .order('postdate', { ascending: true });

      // Apply filters
      if (selectedProduct?.product_id) {
        query = query.eq('product_id', selectedProduct.product_id);
      }
      if (selectedLocation?.location_id) {
        query = query.eq('location_node_id', selectedLocation.location_id);
      }
      if (selectedCustomer?.customer_id) {
        query = query.eq('customer_node_id', selectedCustomer.customer_id);
      }
      
      // Apply advanced filters
      if (advancedFilters.selectedCustomers && advancedFilters.selectedCustomers.length > 0) {
        query = query.in('customer_node_id', advancedFilters.selectedCustomers);
      }

      // Apply marca and productLine filters for sell-in data
      if (advancedFilters.marca && advancedFilters.marca.length > 0) {
        const { data: marcaData } = await (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('product_id')
          .in('subcategory_name', advancedFilters.marca);
        
        if (marcaData && marcaData.length > 0) {
          const productIds = [...new Set(marcaData.map(item => item.product_id))];
          query = query.in('product_id', productIds);
        }
      }

      if (advancedFilters.productLine && advancedFilters.productLine.length > 0) {
        const { data: productLineData } = await (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('product_id')
          .in('class_name', advancedFilters.productLine);
        
        if (productLineData && productLineData.length > 0) {
          const productIds = [...new Set(productLineData.map(item => item.product_id))];
          query = query.in('product_id', productIds);
        }
      }
      
      // Apply date range filter if selected
      if (selectedDateRange?.from && selectedDateRange?.to) {
        query = query.gte('postdate', selectedDateRange.from.toISOString().split('T')[0])
                   .lte('postdate', selectedDateRange.to.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log('Sell-in data (from v_time_series_sell_in.quantity) loaded:', data?.length || 0);
      setSellInData(data || []);
      
      return data || [];
    } catch (error) {
      console.error('Error fetching sell-in data:', error);
      return [];
    }
  }, [selectedProduct?.product_id, selectedLocation?.location_id, selectedCustomer?.customer_id, selectedDateRange, advancedFilters]);

  // Function to fetch sell-out data from v_time_series_sell_out.value for "Sell Out real"
  const fetchSellOutData = useCallback(async () => {
    try {
      let query = (supabase as any)
        .schema('m8_schema')
        .from('v_sales_transaction_out')
        .select('product_id, location_node_id, customer_node_id, postdate, value')
        .gte('postdate', '2024-10-01')
        .lte('postdate', '2025-12-31')
        .order('customer_node_id', { ascending: true })
        .order('postdate', { ascending: true });

      // Apply filters
      if (selectedProduct?.product_id) {
        query = query.eq('product_id', selectedProduct.product_id);
      }
      if (selectedLocation?.location_id) {
        query = query.eq('location_node_id', selectedLocation.location_id);
      }
      if (selectedCustomer?.customer_id) {
        query = query.eq('customer_node_id', selectedCustomer.customer_id);
      }
      
      // Apply advanced filters
      if (advancedFilters.selectedCustomers && advancedFilters.selectedCustomers.length > 0) {
        query = query.in('customer_node_id', advancedFilters.selectedCustomers);
      }

      // Apply marca and productLine filters for sell-out data
      if (advancedFilters.marca && advancedFilters.marca.length > 0) {
        const { data: marcaData } = await (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('product_id')
          .in('subcategory_name', advancedFilters.marca);
        
        if (marcaData && marcaData.length > 0) {
          const productIds = [...new Set(marcaData.map(item => item.product_id))];
          query = query.in('product_id', productIds);
        }
      }

      if (advancedFilters.productLine && advancedFilters.productLine.length > 0) {
        const { data: productLineData } = await (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('product_id')
          .in('class_name', advancedFilters.productLine);
        
        if (productLineData && productLineData.length > 0) {
          const productIds = [...new Set(productLineData.map(item => item.product_id))];
          query = query.in('product_id', productIds);
        }
      }
      
      // Apply date range filter if selected
      if (selectedDateRange?.from && selectedDateRange?.to) {
        query = query.gte('postdate', selectedDateRange.from.toISOString().split('T')[0])
                   .lte('postdate', selectedDateRange.to.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log('Sell-out data (from v_time_series_sell_out.value) loaded:', data?.length || 0);
      
      return data || [];
    } catch (error) {
      console.error('Error fetching sell-out data:', error);
      return [];
    }
  }, [selectedProduct?.product_id, selectedLocation?.location_id, selectedCustomer?.customer_id, selectedDateRange, advancedFilters]);

  const processForecastData = useCallback((rawData: CommercialCollaborationData[], customerNamesMap: {[key: string]: string}, dateFilter: DateRange | null = null, sellInDataArray: any[] = [], sellOutDataArray: any[] = [], productAttributesMap: { [key: string]: { attr_1: number; attr_2: number; attr_3: number } } = {}, kamDataArray: any[] = []) => {
    const groupedData: { [key: string]: CustomerData } = {};
    
    // Counters for skipped rows to avoid console spam
    let skippedMainRows = 0;
    let skippedSellInRows = 0;
    let skippedSellOutRows = 0;
    let skippedKamRows = 0;
    
    // Pre-define month map for better performance
    const monthMap: { [key: string]: string } = {
      '10-24': 'oct-24', '11-24': 'nov-24', '12-24': 'dic-24',
      '01-25': 'ene-25', '02-25': 'feb-25', '03-25': 'mar-25',
      '04-25': 'abr-25', '05-25': 'may-25', '06-25': 'jun-25',
      '07-25': 'jul-25', '08-25': 'ago-25', '09-25': 'sep-25',
      '10-25': 'oct-25', '11-25': 'nov-25', '12-25': 'dic-25'
    };
    
    rawData.forEach((row: CommercialCollaborationData) => {
      // Skip rows with null customer_node_id to prevent errors
      if (!row.customer_node_id) {
        skippedMainRows++;
        return;
      }
      
      // Group by customer_node_id and product_id combination
      const customerProductKey = `${row.customer_node_id}-${row.product_id || 'no-product'}`;
      
      if (!groupedData[customerProductKey]) {
        const productAttributes = productAttributesMap[row.product_id] || { attr_1: 0, attr_2: 0, attr_3: 0 };
        // Get customer name with enhanced fallback logic and null safety
        const customerName = customerNamesMap[row.customer_node_id] || 
                            (row.customer_node_id ? `Cliente ${row.customer_node_id.substring(0, 8)}...` : 'Cliente desconocido');
        
        groupedData[customerProductKey] = {
          customer_node_id: row.customer_node_id,
          customer_name: customerName,
          product_id: row.product_id || 'no-product',
          product_name: row.product_id ? getProductName(row.product_id) : 'Sin producto',
          location_node_id: row.location_node_id, // Add location information
            attr_1: productAttributes.attr_1,
            attr_2: productAttributes.attr_2,
            attr_3: productAttributes.attr_3, // For cajas, using attr_3 for third attribute
          months: {},
          monthPostdates: {} // Initialize postdate mapping
        };
      }

      // Parse postdate to extract month and year
      const date = new Date(row.postdate);
      const month = date.getMonth() + 1; // 1-based month
      const year = date.getFullYear();
      
      const monthKey = `${month.toString().padStart(2, '0')}-${year.toString().slice(-2)}`;
      const displayMonth = monthMap[monthKey];
      
      if (displayMonth && groupedData[customerProductKey] && isMonthInDateRange(displayMonth, dateFilter)) {
        // Store the actual postdate for this month
        if (!groupedData[customerProductKey].monthPostdates) {
          groupedData[customerProductKey].monthPostdates = {};
        }
        groupedData[customerProductKey].monthPostdates![displayMonth] = row.postdate;
        
        // Initialize month data if it doesn't exist
        if (!groupedData[customerProductKey].months[displayMonth]) {
          groupedData[customerProductKey].months[displayMonth] = {
            last_year: 0,
            forecast_sales_gap: 0,
            calculated_forecast: 0,
            xamview: 0,
            kam_forecast_correction: 0,
            sales_manager_view: 0,
            effective_forecast: 0,
            sell_in_aa: 0,
            sell_out_aa: 0,
            sell_out_real: 0,
            inventory_days: 0,
            forecast_commercial_input: 0,
            // Initialize new fields
            si_venta_2024: 0,
            si_2025: 0,
            so_2024: 0,
            so_2025: 0,
            ddi_totales: 0,
            si_pin_2025: 0,
            le_1: 0,
            si_pin_2026: 0,
            pin_vs_aa_1: 0,
            ppto_2025: 0,
            ppto_2026: 0,
            pin_26_vs_aa_25: 0,
            pin_26_vs_ppto_26: 0,
            pin_sep: 0,
            pin_sep_vs_pin: 0,
            kam_26: 0,
            by_26: 0,
            bb_26: 0,
            pci_26: 0
          };
        }        // Add the values (this allows aggregation if multiple products exist for same customer/month)
        const monthData = groupedData[customerProductKey].months[displayMonth];
        monthData.last_year += row.forecast_ly || 0;
        monthData.forecast_sales_gap += row.forecast_sales_gap || 0;
        monthData.calculated_forecast += row.forecast || 0;
        monthData.xamview += row.approved_sm_kam || 0; // This is from commercial_collaboration
        monthData.kam_forecast_correction += row.commercial_input || 0; // KAM adjustments from forecast_data.commercial_input
        monthData.sales_manager_view += row.forecast_sales_manager || 0; // From commercial_collaboration
        monthData.effective_forecast += row.commercial_input || row.forecast || 0; // commercial_input from forecast_data, fallback to forecast
        monthData.forecast_commercial_input += row.approved_sm_kam || 0; // Original commercial_input from forecast_data
        // KAM adjustments will be loaded separately from commercial_collaboration table
      }
    });

    // Process sell-in data from v_time_series_sell_in.quantity
    sellInDataArray.forEach((sellInRow: any) => {
      // Skip rows with null customer_node_id to prevent errors
      if (!sellInRow.customer_node_id) {
        skippedSellInRows++;
        return;
      }
      
      const customerProductKey = `${sellInRow.customer_node_id}-${sellInRow.product_id || 'no-product'}`;
      
      // Parse postdate to extract month and year
      const date = new Date(sellInRow.postdate);
      const month = date.getMonth() + 1; // 1-based month
      const year = date.getFullYear();
      
      const monthKey = `${month.toString().padStart(2, '0')}-${year.toString().slice(-2)}`;
      const displayMonth = monthMap[monthKey];
      
      if (displayMonth && groupedData[customerProductKey] && isMonthInDateRange(displayMonth, dateFilter)) {
        // Store the actual postdate for this month (in case this is the first data for this month)
        if (!groupedData[customerProductKey].monthPostdates) {
          groupedData[customerProductKey].monthPostdates = {};
        }
        if (!groupedData[customerProductKey].monthPostdates![displayMonth]) {
          groupedData[customerProductKey].monthPostdates![displayMonth] = sellInRow.postdate;
        }
        
        // Initialize month data if it doesn't exist (in case sell-in data exists without forecast data)
        if (!groupedData[customerProductKey].months[displayMonth]) {
          groupedData[customerProductKey].months[displayMonth] = {
            last_year: 0,
            forecast_sales_gap: 0,
            calculated_forecast: 0,
            xamview: 0,
            kam_forecast_correction: 0,
            sales_manager_view: 0,
            effective_forecast: 0,
            sell_in_aa: 0,
            sell_out_aa: 0,
            sell_out_real: 0,
            inventory_days: 0,
            forecast_commercial_input: 0,
            // Initialize new fields
            si_venta_2024: 0,
            si_2025: 0,
            so_2024: 0,
            so_2025: 0,
            ddi_totales: 0,
            si_pin_2025: 0,
            le_1: 0,
            si_pin_2026: 0,
            pin_vs_aa_1: 0,
            ppto_2025: 0,
            ppto_2026: 0,
            pin_26_vs_aa_25: 0,
            pin_26_vs_ppto_26: 0,
            pin_sep: 0,
            pin_sep_vs_pin: 0,
            kam_26: 0,
            by_26: 0,
            bb_26: 0,
            pci_26: 0
          };
        }
        
        // Add sell-in quantity to the sell_in_aa field (from v_time_series_sell_in.quantity)
        groupedData[customerProductKey].months[displayMonth].sell_in_aa += sellInRow.quantity || 0;
      }
    });

    // Process sell-out data from v_time_series_sell_out.value
    sellOutDataArray.forEach((sellOutRow: any) => {
      // Skip rows with null customer_node_id to prevent errors
      if (!sellOutRow.customer_node_id) {
        skippedSellOutRows++;
        return;
      }
      
      const customerProductKey = `${sellOutRow.customer_node_id}-${sellOutRow.product_id || 'no-product'}`;
      
      // Parse postdate to extract month and year
      const date = new Date(sellOutRow.postdate);
      const month = date.getMonth() + 1; // 1-based month
      const year = date.getFullYear();
      
      const monthKey = `${month.toString().padStart(2, '0')}-${year.toString().slice(-2)}`;
      const displayMonth = monthMap[monthKey];
      
      if (displayMonth && groupedData[customerProductKey] && isMonthInDateRange(displayMonth, dateFilter)) {
        // Store the actual postdate for this month (in case this is the first data for this month)
        if (!groupedData[customerProductKey].monthPostdates) {
          groupedData[customerProductKey].monthPostdates = {};
        }
        if (!groupedData[customerProductKey].monthPostdates![displayMonth]) {
          groupedData[customerProductKey].monthPostdates![displayMonth] = sellOutRow.postdate;
        }
        
        // Initialize month data if it doesn't exist (in case sell-out data exists without forecast data)
        if (!groupedData[customerProductKey].months[displayMonth]) {
          groupedData[customerProductKey].months[displayMonth] = {
            last_year: 0,
            forecast_sales_gap: 0,
            calculated_forecast: 0,
            xamview: 0,
            kam_forecast_correction: 0,
            sales_manager_view: 0,
            effective_forecast: 0,
            sell_in_aa: 0,
            sell_out_aa: 0,
            sell_out_real: 0,
            inventory_days: 0,
            forecast_commercial_input: 0,
            // Initialize new fields
            si_venta_2024: 0,
            si_2025: 0,
            so_2024: 0,
            so_2025: 0,
            ddi_totales: 0,
            si_pin_2025: 0,
            le_1: 0,
            si_pin_2026: 0,
            pin_vs_aa_1: 0,
            ppto_2025: 0,
            ppto_2026: 0,
            pin_26_vs_aa_25: 0,
            pin_26_vs_ppto_26: 0,
            pin_sep: 0,
            pin_sep_vs_pin: 0,
            kam_26: 0,
            by_26: 0,
            bb_26: 0,
            pci_26: 0
          };
        }
        
        // Add sell-out value to the sell_out_aa field (from v_time_series_sell_out.value)
        groupedData[customerProductKey].months[displayMonth].sell_out_aa += sellOutRow.value || 0;
      }
    });

    // Process KAM adjustments from commercial_collaboration table
    console.log('=== PROCESSING KAM DATA ===');
    console.log(`Processing ${kamDataArray.length} KAM adjustment records`);
    
    kamDataArray.forEach((kamRow: any, index: number) => {
      // Skip rows with null customer_node_id to prevent errors
      if (!kamRow.customer_node_id) {
        skippedKamRows++;
        return;
      }
      
      const customerProductKey = `${kamRow.customer_node_id}-${kamRow.product_id || 'no-product'}`;
      
      // Parse postdate to extract month and year
      const date = new Date(kamRow.postdate);
      const month = date.getMonth() + 1; // 1-based month
      const year = date.getFullYear();
      
      const monthKey = `${month.toString().padStart(2, '0')}-${year.toString().slice(-2)}`;
      const displayMonth = monthMap[monthKey];
      
      if (displayMonth && groupedData[customerProductKey] && isMonthInDateRange(displayMonth, dateFilter)) {
        // Store the actual postdate for this month (in case this is the first data for this month)
        if (!groupedData[customerProductKey].monthPostdates) {
          groupedData[customerProductKey].monthPostdates = {};
        }
        if (!groupedData[customerProductKey].monthPostdates![displayMonth]) {
          groupedData[customerProductKey].monthPostdates![displayMonth] = kamRow.postdate;
        }
        
        // Initialize month data if it doesn't exist (in case KAM data exists without forecast data)
        if (!groupedData[customerProductKey].months[displayMonth]) {
          groupedData[customerProductKey].months[displayMonth] = {
            last_year: 0,
            forecast_sales_gap: 0,
            calculated_forecast: 0,
            xamview: 0,
            kam_forecast_correction: 0,
            sales_manager_view: 0,
            effective_forecast: 0,
            sell_in_aa: 0,
            sell_out_aa: 0,
            sell_out_real: 0,
            inventory_days: 0,
            forecast_commercial_input: 0,
            // Initialize new fields
            si_venta_2024: 0,
            si_2025: 0,
            so_2024: 0,
            so_2025: 0,
            ddi_totales: 0,
            si_pin_2025: 0,
            le_1: 0,
            si_pin_2026: 0,
            pin_vs_aa_1: 0,
            ppto_2025: 0,
            ppto_2026: 0,
            pin_26_vs_aa_25: 0,
            pin_26_vs_ppto_26: 0,
            pin_sep: 0,
            pin_sep_vs_pin: 0,
            kam_26: 0,
            by_26: 0,
            bb_26: 0,
            pci_26: 0
          };
        }
        
        // Log KAM value assignment for debugging
        const previousValue = groupedData[customerProductKey].months[displayMonth].kam_forecast_correction;
        const newValue = kamRow.commercial_input || 0;
        
        if (index < 5) { // Log first 5 records to avoid spam
          console.log(`KAM adjustment ${index + 1}:`, {
            customer_node_id: kamRow.customer_node_id,
            product_id: kamRow.product_id,
            month: displayMonth,
            postdate: kamRow.postdate,
            previous_kam_value: previousValue,
            new_kam_value: newValue,
            overwriting: previousValue !== 0 ? `${previousValue} → ${newValue}` : 'setting initial value'
          });
        }
        
        // Set the KAM adjustment value (overwrite, don't add, since this is the adjustment value)
        groupedData[customerProductKey].months[displayMonth].kam_forecast_correction = newValue;
      }
    });

    // Final debug log of all processed KAM values
    console.log('=== FINAL KAM VALUES SUMMARY ===');
    const processedCustomers = Object.values(groupedData);
    let totalKamValues = 0;
    processedCustomers.forEach(customer => {
      Object.keys(customer.months).forEach(month => {
        const kamValue = customer.months[month].kam_forecast_correction;
        if (kamValue !== 0) {
          totalKamValues++;
          if (totalKamValues <= 10) { // Log first 10 non-zero KAM values
            console.log(`Final KAM value: ${customer.customer_name} - ${month}: ${kamValue}`);
          }
        }
      });
    });
    console.log(`Total customers with KAM adjustments: ${totalKamValues}`);

    // Log summary of skipped rows to avoid console spam
    const totalSkipped = skippedMainRows + skippedSellInRows + skippedSellOutRows + skippedKamRows;
    if (totalSkipped > 0) {
      console.log('=== DATA PROCESSING SUMMARY ===');
      console.log(`Skipped rows due to null customer_node_id:`, {
        main_data: skippedMainRows,
        sell_in_data: skippedSellInRows,
        sell_out_data: skippedSellOutRows,
        kam_data: skippedKamRows,
        total_skipped: totalSkipped
      });
    }

    return Object.values(groupedData);
  }, []);

  // Helper function to check if a customer has meaningful data (non-zero values)
  const customerHasValues = useCallback((customer: CustomerData) => {
    // Check if any month has non-zero values for key metrics
    const hasValues = Object.values(customer.months).some(monthData => {
      if (!monthData) return false;
      
      // Check key metrics that should have meaningful values
      const keyMetrics = [
        'last_year', 'calculated_forecast', 'effective_forecast', 
        'sell_in_aa', 'sell_out_aa', 'sell_out_real',
        'kam_forecast_correction', 'sales_manager_view'
      ];
      
      return keyMetrics.some(metric => {
        const value = (monthData as any)[metric];
        return value != null && value !== 0;
      });
    });
    
    return hasValues;
  }, []);

  // Client-side filtering function for advanced filters
  const applyAdvancedFilters = useCallback((customers: CustomerData[]) => {
    let filtered = customers;

    // Filter by customer hierarchy (client names)
    if (advancedFilters.clientHierarchy && advancedFilters.clientHierarchy.length > 0) {
      filtered = filtered.filter(customer => 
        advancedFilters.clientHierarchy.includes(customer.customer_name)
      );
    }

    // Filter by selected customers (IDs) - this should be the primary customer filter
    if (advancedFilters.selectedCustomers && advancedFilters.selectedCustomers.length > 0) {
      filtered = filtered.filter(customer => 
        advancedFilters.selectedCustomers.includes(customer.customer_node_id)
      );
    }

    // Filter out customers/products with no meaningful values when advanced filters are applied
    if (hasActiveFilters()) {
      filtered = filtered.filter(customer => customerHasValues(customer));
    }

    // Note: marca, productLine, canal, umn, and agente filters are primarily handled at the database level
    // since they require product/location data that may not be available in the customer objects.
    // However, we can add additional client-side validation here if needed.

    // Additional client-side filtering for canal, umn, agente could be added here
    // if we have that information in the customer data structure

    console.log('Advanced filtering applied:', {
      original_count: customers.length,
      filtered_count: filtered.length,
      filtered_out_empty: customers.length - customers.filter(customer => customerHasValues(customer)).length,
      applied_filters: {
        clientHierarchy: advancedFilters.clientHierarchy?.length || 0,
        selectedCustomers: advancedFilters.selectedCustomers?.length || 0,
        marca: advancedFilters.marca?.length || 0,
        productLine: advancedFilters.productLine?.length || 0,
        canal: advancedFilters.canal?.length || 0,
        umn: advancedFilters.umn?.length || 0,
        agente: advancedFilters.agente?.length || 0
      }
    });

    return filtered;
  }, [advancedFilters, hasActiveFilters, customerHasValues]);

  // Cache for customer names to avoid repeated database calls
  const [customerNamesCache, setCustomerNamesCache] = useState<{[key: string]: string}>({});
  const [customerNamesLoaded, setCustomerNamesLoaded] = useState(false);
  
  // Sell-in data state
  const [sellInData, setSellInData] = useState<any[]>([]);

  // Function to generate hardcoded sample data
  const generateHardcodedSampleData = () => {
    const sampleCustomers = [
      'WALMEX',
      'OXXO', 
      'DUERO',
      'FEMSA',
      'SORIANA',
      'COPPEL'
    ];
    
    const months = ['2024-10', '2024-11', '2024-12', '2025-01', '2025-02', '2025-03'];
    
    return sampleCustomers.map((customerName, index) => ({
      customer_name: customerName,
      customer_id: `customer-${index + 1}`,
      customer_node_id: `node-${index + 1}`,
      months: months.reduce((acc, month) => {
        const baseValue = 150000 + (index * 50000) + Math.random() * 100000;
        acc[month] = {
          last_year: Math.round(baseValue * 0.8),
          calculated_forecast: Math.round(baseValue),
          effective_forecast: Math.round(baseValue * 1.1),
          sm_kam_override: Math.round(baseValue * 1.05),
          forecast_sales_manager: Math.round(baseValue * 1.15),
          commercial_input: Math.round(baseValue * 1.2),
          sellIn: Math.round(baseValue * 0.9),
          sellOut: Math.round(baseValue * 0.85),
          sell_out_real: Math.round(baseValue * 0.82),
          forecast_commercial_input: Math.round(baseValue * 1.1),
          kam_forecast_correction: Math.round(baseValue * 0.95) // Sample KAM adjustments
        };
        return acc;
      }, {} as any)
    }));
  };

  // Function to enhance existing data with sample values
  const enhanceDataWithSampleValues = (existingData: any[]) => {
    return existingData.map((customer, index) => {
      const enhancedMonths = { ...customer.months };
      
      Object.keys(enhancedMonths).forEach(month => {
        const baseValue = 100000 + (index * 30000) + Math.random() * 80000;
        enhancedMonths[month] = {
          ...enhancedMonths[month],
          last_year: enhancedMonths[month].last_year || Math.round(baseValue * 0.8),
          calculated_forecast: enhancedMonths[month].calculated_forecast || Math.round(baseValue),
          effective_forecast: enhancedMonths[month].effective_forecast || Math.round(baseValue * 1.1),
          sm_kam_override: enhancedMonths[month].sm_kam_override || Math.round(baseValue * 1.05),
          forecast_sales_manager: enhancedMonths[month].forecast_sales_manager || Math.round(baseValue * 1.15),
          commercial_input: enhancedMonths[month].commercial_input || Math.round(baseValue * 1.2),
          sellIn: enhancedMonths[month].sellIn || Math.round(baseValue * 0.9),
          sellOut: enhancedMonths[month].sellOut || Math.round(baseValue * 0.85),
          sell_out_real: enhancedMonths[month].sell_out_real || Math.round(baseValue * 0.82)
        };
      });
      
      return {
        ...customer,
        months: enhancedMonths
      };
    });
  };

  // Debug function to check KAM values - accessible from browser console
  const debugKamValues = useCallback(async (customerId?: string, month?: string) => {
    console.log('=== KAM VALUES DEBUG ===');
    console.log('Current UI state for KAM adjustments:');
    
    customers.forEach(customer => {
      if (!customerId || customer.customer_node_id === customerId) {
        Object.keys(customer.months).forEach(monthKey => {
          if (!month || monthKey === month) {
            const monthData = customer.months[monthKey];
            console.log(`${customer.customer_name} (${customer.customer_node_id}) - ${monthKey}:`, {
              kam_forecast_correction: monthData.kam_forecast_correction,
              forecast_commercial_input: monthData.forecast_commercial_input,
              postdate: customer.monthPostdates?.[monthKey]
            });
          }
        });
      }
    });
    
    // Also check database directly
    console.log('Checking database values:');
    try {
      let query = (supabase as any).schema('m8_schema')
        .from('commercial_collaboration')
        .select('customer_node_id, product_id, postdate, commercial_input, commercial_notes')
        .order('customer_node_id')
        .order('postdate');
      
      if (customerId) {
        query = query.eq('customer_node_id', customerId);
      }
      
      const { data, error } = await query.limit(20);
      
      if (error) {
        console.error('Database query error:', error);
      } else {
        console.log('Database KAM adjustments:', data);
      }
    } catch (error) {
      console.error('Error querying database:', error);
    }
  }, [customers]);

  // Debug function to check customer name mappings
  const debugCustomerNames = useCallback(async (customerId?: string) => {
    console.log('=== CUSTOMER NAMES DEBUG ===');
    console.log('Current customer names state:', customerNames);
    console.log('Customer names cache:', customerNamesCache);
    console.log('Customer names loaded:', customerNamesLoaded);
    
    if (customerId) {
      console.log(`Specific customer ${customerId}:`, {
        name_from_state: customerNames[customerId],
        name_from_cache: customerNamesCache[customerId],
        exists_in_state: customerId in customerNames,
        exists_in_cache: customerId in customerNamesCache
      });
    }
    
    // Check database directly
    console.log('Checking database directly...');
    try {
      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .from('supply_network_nodes')
        .select('id, node_name, status, supply_network_node_types!inner(type_code)')
        .eq('supply_network_node_types.type_code', 'Customer')
        .eq('status', 'active')
        .limit(10);
      
      if (error) {
        console.error('Database query error:', error);
      } else {
        console.log('Sample database records:', data);
        if (customerId) {
          const customerRecord = data?.find(c => c.id === customerId);
          console.log(`Customer ${customerId} in database:`, customerRecord);
        }
      }
    } catch (error) {
      console.error('Error querying database:', error);
    }
  }, [customerNames, customerNamesCache, customerNamesLoaded]);

  // Debug function to test database connectivity and views
  const debugDatabaseConnections = useCallback(async () => {
    console.log('=== DATABASE CONNECTION TESTS ===');
    
    // Test 1: Basic connection to m8_schema
    try {
      console.log('Test 1: Testing basic schema access...');
      const { data: schemaTest, error: schemaError } = await (supabase as any)
        .schema('m8_schema')
        .from('supply_network_nodes')
        .select('id')
        .limit(1);
      
      if (schemaError) {
        console.error('❌ Schema access failed:', schemaError);
      } else {
        console.log('✅ Schema access successful');
      }
    } catch (err) {
      console.error('❌ Schema access error:', err);
    }
    
    // Test 2: Test commercial_collaboration table
    try {
      console.log('Test 2: Testing commercial_collaboration table...');
      const { data: tableTest, error: tableError } = await (supabase as any)
        .schema('m8_schema')
        .from('commercial_collaboration')
        .select('customer_node_id,product_id,postdate')
        .limit(5);
      
      if (tableError) {
        console.error('❌ commercial_collaboration table access failed:', tableError);
      } else {
        console.log('✅ commercial_collaboration table access successful, records:', tableTest?.length || 0);
      }
    } catch (err) {
      console.error('❌ commercial_collaboration table error:', err);
    }
    
    // Test 3: Test commercial_collaboration_view
    try {
      console.log('Test 3: Testing commercial_collaboration_view...');
      const { data: viewTest, error: viewError } = await (supabase as any)
        .schema('m8_schema')
        .from('commercial_collaboration_view')
        .select('customer_node_id,product_id,postdate')
        .limit(5);
      
      if (viewError) {
        console.error('❌ commercial_collaboration_view access failed:', viewError);
        console.log('View error details:', {
          message: viewError.message,
          details: viewError.details,
          hint: viewError.hint,
          code: viewError.code
        });
      } else {
        console.log('✅ commercial_collaboration_view access successful, records:', viewTest?.length || 0);
      }
    } catch (err) {
      console.error('❌ commercial_collaboration_view error:', err);
    }
    
    // Test 4: Test view with simplified select
    try {
      console.log('Test 4: Testing view with minimal select...');
      const { data: minimalTest, error: minimalError } = await (supabase as any)
        .schema('m8_schema')
        .from('commercial_collaboration_view')
        .select('*')
        .limit(1);
      
      if (minimalError) {
        console.error('❌ Minimal view query failed:', minimalError);
      } else {
        console.log('✅ Minimal view query successful');
        if (minimalTest && minimalTest.length > 0) {
          console.log('Available columns:', Object.keys(minimalTest[0]));
        }
      }
    } catch (err) {
      console.error('❌ Minimal view query error:', err);
    }
    
    console.log('=== DATABASE TESTS COMPLETED ===');
  }, []);

  // Make debug functions available globally
  useEffect(() => {
    (window as any).debugKamValues = debugKamValues;
    (window as any).debugCustomerNames = debugCustomerNames;
    (window as any).debugDatabaseConnections = debugDatabaseConnections;
    return () => {
      delete (window as any).debugKamValues;
      delete (window as any).debugCustomerNames;
      delete (window as any).debugDatabaseConnections;
    };
  }, [debugKamValues, debugCustomerNames, debugDatabaseConnections]);

  const fetchForecastData = useCallback(async (isFilterOperation = false) => {
    // Only show loading indicator after a delay to avoid aggressive UI updates
    // This makes the experience smoother when selecting multiple filters
    let loadingTimer: NodeJS.Timeout | null = null;
    
    try {
      if (isFilterOperation) {
        // Delay showing loading state by 500ms - only show if operation takes longer
        // This prevents aggressive UI updates while user is still selecting filters
        loadingTimer = setTimeout(() => {
          setFilterLoading(true);
        }, 500);
      }
      
      // Only fetch customer names if not already cached
      let customerNamesMap = customerNamesCache;
      if (!customerNamesLoaded) {
        const { data: customersData, error: customersError } = await (supabase as any)
          .schema('m8_schema')
          .from('supply_network_nodes')
          .select(`
            id,
            node_name,
            node_type_id,
            supply_network_node_types!inner(type_code)
          `)
          .eq('supply_network_node_types.type_code', 'Customer')
          .eq('status', 'active');

        if (customersError) throw customersError;

        customerNamesMap = {};
        customersData?.forEach(customer => {
          customerNamesMap[customer.id] = customer.node_name;
        });
        
        setCustomerNames(customerNamesMap);
        setCustomerNamesCache(customerNamesMap);
        setCustomerNamesLoaded(true);
        
        // Debug: Log customer names mapping
        console.log('=== CUSTOMER NAMES LOADED ===');
        console.log(`Total customers loaded: ${Object.keys(customerNamesMap).length}`);
        console.log('Sample customer mappings:', Object.entries(customerNamesMap).slice(0, 5));
        console.log('Query used:', 'SELECT id, node_name FROM m8_schema.supply_network_nodes WHERE supply_network_node_types.type_code = \'Customer\' AND status = \'active\'');
        
        // Check specific customer if exists
        const specificCustomerId = '036952da-be05-4d87-bc94-1405100988de';
        if (customerNamesMap[specificCustomerId]) {
          console.log(`✓ Customer ${specificCustomerId} mapped to: "${customerNamesMap[specificCustomerId]}"`);
        } else {
          console.log(`⚠️ Customer ${specificCustomerId} not found in customer names mapping`);
        }
      }

      // Fetch product attributes from product table
      const { data: productData, error: productError } = await (supabase as any)
        .schema('m8_schema')
        .from('products')
        .select('product_id, attr_1, attr_2, attr_3');

      if (productError) {
        console.error('Error fetching product attributes:', productError);
      }

      // Create product attributes map
      const productAttributesMap: { [key: string]: { attr_1: number; attr_2: number; attr_3: number } } = {};
      productData?.forEach(product => {
        productAttributesMap[product.id] = {
          attr_1: product.attr_1 || 0,
          attr_2: product.attr_2 || 0,
          attr_3: product.attr_3 || 0
        };
      });

      // Try to fetch forecast data using commercial_collaboration_view with error handling
      console.log('=== ATTEMPTING DATABASE QUERY ===');
      console.log('Trying to query commercial_collaboration_view...');
      
      let query = (supabase as any)
        .schema('m8_schema')
        .from('commercial_collaboration_view')
        .select('customer_node_id,postdate,forecast_ly,forecast,approved_sm_kam,sm_kam_override,forecast_sales_manager,commercial_input,forecast_sales_gap,product_id,subcategory_id,location_node_id,actual')
        .gte('postdate', '2024-10-01') // Start from October 2024
        .lte('postdate', '2025-12-31') // End at December 2025
        .order('customer_node_id', { ascending: true })
        .order('postdate', { ascending: true })
        .limit(10000); // Add reasonable limit to prevent excessive data loading

      // Also fetch KAM adjustments from commercial_collaboration table
      let kamQuery = (supabase as any)
        .schema('m8_schema')
        .from('commercial_collaboration')
        .select('product_id,customer_node_id,location_node_id,postdate,commercial_input,commercial_notes')
        .gte('postdate', '2024-10-01')
        .lte('postdate', '2025-12-31')
        .order('customer_node_id', { ascending: true })
        .order('postdate', { ascending: true });

      // Apply filters to both queries
      if (selectedProduct?.product_id) {
        query = query.eq('product_id', selectedProduct.product_id);
        kamQuery = kamQuery.eq('product_id', selectedProduct.product_id);
      }
      if (selectedLocation?.location_id) {
        query = query.eq('location_node_id', selectedLocation.location_id);
        kamQuery = kamQuery.eq('location_node_id', selectedLocation.location_id);
      }
      if (selectedCustomer?.customer_id) {
        query = query.eq('customer_node_id', selectedCustomer.customer_id);
        kamQuery = kamQuery.eq('customer_node_id', selectedCustomer.customer_id);
      }
      
      // Apply advanced filters from FilterPanel
      if (advancedFilters.selectedBrands && advancedFilters.selectedBrands.length > 0) {
        query = query.in('subcategory_id', advancedFilters.selectedBrands);
        kamQuery = kamQuery.in('subcategory_id', advancedFilters.selectedBrands);
      }
      
      if (advancedFilters.selectedCustomers && advancedFilters.selectedCustomers.length > 0) {
        query = query.in('customer_node_id', advancedFilters.selectedCustomers);
        kamQuery = kamQuery.in('customer_node_id', advancedFilters.selectedCustomers);
      }

      // Apply marca filter using subcategory_name
      if (advancedFilters.marca && advancedFilters.marca.length > 0) {
        // We need to get subcategory_ids for the selected marca names
        const { data: marcaData } = await (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('subcategory_id')
          .in('subcategory_name', advancedFilters.marca);
        
        if (marcaData && marcaData.length > 0) {
          const subcategoryIds = [...new Set(marcaData.map(item => item.subcategory_id))];
          query = query.in('subcategory_id', subcategoryIds);
          kamQuery = kamQuery.in('subcategory_id', subcategoryIds);
        }
      }

      // Apply productLine filter using class_name 
      if (advancedFilters.productLine && advancedFilters.productLine.length > 0) {
        // We need to get product_ids for the selected product line names
        const { data: productLineData } = await (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('product_id')
          .in('class_name', advancedFilters.productLine);
        
        if (productLineData && productLineData.length > 0) {
          const productIds = [...new Set(productLineData.map(item => item.product_id))];
          query = query.in('product_id', productIds);
          kamQuery = kamQuery.in('product_id', productIds);
        }
      }
      
      // Apply date range filter if selected
      if (selectedDateRange?.from && selectedDateRange?.to) {
        const fromDate = selectedDateRange.from.toISOString().split('T')[0];
        const toDate = selectedDateRange.to.toISOString().split('T')[0];
        query = query.gte('postdate', fromDate).lte('postdate', toDate);
        kamQuery = kamQuery.gte('postdate', fromDate).lte('postdate', toDate);
      }

      // Apply canal, clientHierarchy, and agente filters using supply_network_nodes
      let customerNodeIds: string[] = [];
      let needsSupplyNetworkFilter = false;

      // Check if we need to filter by supply_network_nodes data
      if ((advancedFilters.canal && advancedFilters.canal.length > 0) ||
          (advancedFilters.clientHierarchy && advancedFilters.clientHierarchy.length > 0) ||
          (advancedFilters.agente && advancedFilters.agente.length > 0)) {
        needsSupplyNetworkFilter = true;

        let supplyNetworkQuery = (supabase as any)
          .schema('m8_schema')
          .from('supply_network_nodes')
          .select('customer_node_id');

        // Apply canal filter
        if (advancedFilters.canal && advancedFilters.canal.length > 0) {
          supplyNetworkQuery = supplyNetworkQuery.in('channel', advancedFilters.canal);
        }

        // Apply clientHierarchy filter
        if (advancedFilters.clientHierarchy && advancedFilters.clientHierarchy.length > 0) {
          supplyNetworkQuery = supplyNetworkQuery.in('client_hierarchy', advancedFilters.clientHierarchy);
        }

        // Apply agente filter
        if (advancedFilters.agente && advancedFilters.agente.length > 0) {
          supplyNetworkQuery = supplyNetworkQuery.in('agente', advancedFilters.agente);
        }

        const { data: supplyNetworkData, error: supplyNetworkError } = await supplyNetworkQuery;

        if (supplyNetworkError) {
          console.error('Error fetching supply network data for filtering:', supplyNetworkError);
        } else if (supplyNetworkData && supplyNetworkData.length > 0) {
          customerNodeIds = [...new Set(supplyNetworkData.map((item: any) => item.customer_node_id).filter(Boolean))] as string[];
          console.log('Found customer_node_ids from supply_network_nodes filtering:', customerNodeIds.length);
        } else {
          // If no matching records found, set empty array to prevent any results
          customerNodeIds = [];
          console.log('No matching customer_node_ids found in supply_network_nodes with applied filters');
        }
      }

      // Apply the customer_node_id filter if supply network filtering was used
      if (needsSupplyNetworkFilter) {
        if (customerNodeIds.length > 0) {
          query = query.in('customer_node_id', customerNodeIds);
          kamQuery = kamQuery.in('customer_node_id', customerNodeIds);
        } else {
          // No matching customers found, return empty results
          console.log('No customers match the supply network filters, skipping database query');
          setRawForecastData([]);
          setCustomers([]);
          setAllCustomers([]);
          setNoResultsFound(true);
          
          if (isFilterOperation && !hasActiveFilters()) {
            toast('No se encontraron datos', {
              description: 'Los filtros aplicados no produjeron resultados. Intenta con diferentes criterios.',
              duration: 4000,
            });
          }
          
          return;
        }
      }

      // Execute both queries with error handling
      let data = null;
      let error = null;
      let kamData = null;
      let kamError = null;

      try {
        console.log('Executing main query...');
        const mainQueryResult = await query;
        data = mainQueryResult.data;
        error = mainQueryResult.error;
        
        if (error) {
          console.error('commercial_collaboration_view query failed:', error);
          console.log('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          
          // Try fallback to base table if view fails
          console.log('Trying fallback to commercial_collaboration table...');
          const fallbackQuery = (supabase as any)
            .schema('m8_schema')
            .from('commercial_collaboration')
            .select('customer_node_id,postdate,product_id,location_node_id,commercial_input')
            .gte('postdate', '2024-10-01')
            .lte('postdate', '2025-12-31')
            .order('customer_node_id', { ascending: true })
            .order('postdate', { ascending: true })
            .limit(5000);
          
          const fallbackResult = await fallbackQuery;
          if (fallbackResult.error) {
            console.error('Fallback query also failed:', fallbackResult.error);
            throw new Error(`Database query failed: ${error.message}. Fallback also failed: ${fallbackResult.error.message}`);
          } else {
            console.log('✅ Fallback query successful, got', fallbackResult.data?.length || 0, 'records');
            data = fallbackResult.data;
            error = null;
          }
        } else {
          console.log('✅ Main query successful, got', data?.length || 0, 'records');
        }
        
        // Execute KAM query
        console.log('Executing KAM query...');
        const kamQueryResult = await kamQuery;
        kamData = kamQueryResult.data;
        kamError = kamQueryResult.error;
        
        if (kamError) {
          console.error('KAM query failed:', kamError);
          // KAM query failure is not critical, we can continue without it
          kamData = [];
          kamError = null;
        } else {
          console.log('✅ KAM query successful, got', kamData?.length || 0, 'records');
        }
        
      } catch (queryError) {
        console.error('Query execution error:', queryError);
        throw queryError;
      }

      if (error) throw error;

      // Debug logging to understand data flow
      console.log('=== FORECAST COLLABORATION DEBUG ===');
      console.log('Loaded forecast records:', data?.length || 0);
      console.log('Loaded KAM adjustment records:', kamData?.length || 0);
      console.log('Applied filters:', {
        product: selectedProduct?.product_id,
        location: selectedLocation?.location_id,
        customer: selectedCustomer?.customer_id,
        dateRange: selectedDateRange ? `${selectedDateRange.from?.toISOString().split('T')[0]} to ${selectedDateRange.to?.toISOString().split('T')[0]}` : 'none',
        advancedFilters: {
          selectedBrands: advancedFilters.selectedBrands?.length || 0,
          selectedCustomers: advancedFilters.selectedCustomers?.length || 0,
          marca: advancedFilters.marca?.length || 0,
          canal: advancedFilters.canal?.length || 0,
          productLine: advancedFilters.productLine?.length || 0,
          clientHierarchy: advancedFilters.clientHierarchy?.length || 0,
          umn: advancedFilters.umn?.length || 0,
          agente: advancedFilters.agente?.length || 0
        }
      });
      
      // Debug advanced filters content
      if (Object.values(advancedFilters).some(arr => Array.isArray(arr) && arr.length > 0)) {
        console.log('Active advanced filters:', {
          marca: advancedFilters.marca,
          productLine: advancedFilters.productLine,
          clientHierarchy: advancedFilters.clientHierarchy,
          selectedCustomers: advancedFilters.selectedCustomers,
          canal: advancedFilters.canal,
          umn: advancedFilters.umn,
          agente: advancedFilters.agente
        });
      }
      
      if (data && data.length > 0) {
        console.log('Sample forecast data (first 2 rows):', data.slice(0, 2));
        console.log('All available fields in first row:', Object.keys(data[0]));
      }
      
      if (kamData && kamData.length > 0) {
        console.log('Sample KAM data (first 2 rows):', kamData.slice(0, 2));
        console.log('KAM data fields:', Object.keys(kamData[0]));
      }

      // Store raw data for filtering
      setRawForecastData(data || []);

      // Fetch sell-in data
      const sellInDataArray = await fetchSellInData();

      // Fetch sell-out data
      const sellOutDataArray = await fetchSellOutData();

      // Process the data using the new function with KAM data
      const allCustomersData = processForecastData(data || [], customerNamesMap, selectedDateRange, sellInDataArray, sellOutDataArray, productAttributesMap, kamData || []);
      console.log('Processed customers:', allCustomersData.length);
      
      // If no data or insufficient data, add hardcoded sample data
      let finalCustomersData = allCustomersData;
      
      if (allCustomersData.length === 0) {
        console.log('No data found, generating hardcoded sample data...');
        finalCustomersData = generateHardcodedSampleData();
      } else {
        // Check if we have any actual data values
        let hasNonZeroValues = false;
        allCustomersData.forEach(customer => {
          Object.values(customer.months).forEach((monthData: any) => {
            if (monthData.last_year > 0 || monthData.calculated_forecast > 0 || monthData.effective_forecast > 0) {
              hasNonZeroValues = true;
            }
          });
        });
        
        console.log('Has non-zero values:', hasNonZeroValues);
        
        // If data exists but has no meaningful values, enhance it with sample data
        if (!hasNonZeroValues) {
          console.log('Enhancing existing data with sample values...');
          finalCustomersData = enhanceDataWithSampleValues(allCustomersData);
        }
        
        if (allCustomersData.length > 0) {
          console.log('Sample processed customer:', allCustomersData[0]);
          console.log('Sample customer months:', Object.keys(allCustomersData[0].months));
          if (Object.keys(allCustomersData[0].months).length > 0) {
            const firstMonth = Object.keys(allCustomersData[0].months)[0];
            console.log(`Sample month data (${firstMonth}):`, allCustomersData[0].months[firstMonth]);
          }
        }
      }
      
      // Apply client-side advanced filters
      const advancedFilteredData = applyAdvancedFilters(finalCustomersData);
      
      // Check if no results were found - show toast notification and keep table with zeros
      const hasActiveFiltersNow = hasActiveFilters();
      const noDataFound = advancedFilteredData.length === 0;
      
      if (noDataFound && hasActiveFiltersNow && isFilterOperation && !noResultsMessageDismissed) {
        // Show toast notification when filters result in no data
        // Encourage user to try other filters
        setTimeout(() => {
          toast.warning('No se encontraron datos', {
            description: 'Los filtros seleccionados no devolvieron resultados. Prueba con otros filtros para ver si hay datos disponibles.',
            duration: 5000,
            closeButton: true,
            action: {
              label: 'Limpiar filtros',
              onClick: clearAllFilters
            }
          });
          setNoResultsFound(true);
          // Don't set noResultsMessageDismissed here - let users try other filters
        }, 100);
      } else if (noDataFound && !hasActiveFiltersNow && !noResultsMessageDismissed) {
        // Show toast for general no data situation
        setTimeout(() => {
          toast.info('No hay datos disponibles', {
            description: 'No se encontraron datos para mostrar en este momento.',
            duration: 4000,
            closeButton: true,
          });
          setNoResultsFound(true);
        }, 100);
      } else if (!noDataFound) {
        // Data found - reset state
        setNoResultsFound(false);
        setNoResultsMessageDismissed(false);
      }
      
      setAllCustomers(finalCustomersData);
      setCustomers(advancedFilteredData);
      
      // Check if all values in "Todos los clientes" are 0
      // Only check when there are customers but all their values are zero
      if (advancedFilteredData.length > 0 && isFilterOperation) {
        // Calculate totals for main metrics
        const allCustomersTotals = {
          lastYear: advancedFilteredData.reduce((sum, customer) => {
            return sum + months.reduce((monthTotal, month) => {
              const monthData = customer.months[month];
              return monthTotal + (monthData ? (monthData.last_year || 0) : 0);
            }, 0);
          }, 0),
          calculatedForecast: advancedFilteredData.reduce((sum, customer) => {
            return sum + months.reduce((monthTotal, month) => {
              const monthData = customer.months[month];
              return monthTotal + (monthData ? (monthData.calculated_forecast || 0) : 0);
            }, 0);
          }, 0),
          effectiveForecast: advancedFilteredData.reduce((sum, customer) => {
            return sum + months.reduce((monthTotal, month) => {
              const monthData = customer.months[month];
              return monthTotal + (monthData ? (monthData.effective_forecast || 0) : 0);
            }, 0);
          }, 0),
          kamForecast: advancedFilteredData.reduce((sum, customer) => {
            return sum + months.reduce((monthTotal, month) => {
              const monthData = customer.months[month];
              return monthTotal + (monthData ? (monthData.kam_forecast_correction || 0) : 0);
            }, 0);
          }, 0),
          sellIn: advancedFilteredData.reduce((sum, customer) => {
            return sum + months.reduce((monthTotal, month) => {
              const monthData = customer.months[month];
              return monthTotal + (monthData ? (monthData.sell_in_aa || 0) : 0);
            }, 0);
          }, 0),
          sellOut: advancedFilteredData.reduce((sum, customer) => {
            return sum + months.reduce((monthTotal, month) => {
              const monthData = customer.months[month];
              return monthTotal + (monthData ? (monthData.sell_out_aa || 0) : 0);
            }, 0);
          }, 0)
        };
        
        // Check if all main totals are 0
        const allTotalsZero = 
          allCustomersTotals.lastYear === 0 &&
          allCustomersTotals.calculatedForecast === 0 &&
          allCustomersTotals.effectiveForecast === 0 &&
          allCustomersTotals.kamForecast === 0 &&
          allCustomersTotals.sellIn === 0 &&
          allCustomersTotals.sellOut === 0;
        
        if (allTotalsZero && !noResultsMessageDismissed) {
          // Show toast when all values in "Todos los clientes" are 0
          setTimeout(() => {
            toast.warning('No hay valores para mostrar', {
              description: 'Los filtros actuales no muestran datos. Prueba con otros filtros o combinaciones diferentes.',
              duration: 5000,
              closeButton: true,
              action: {
                label: 'Limpiar filtros',
                onClick: clearAllFilters
              }
            });
            // Don't set noResultsMessageDismissed here - allow trying other filters
          }, 200);
        } else if (!allTotalsZero) {
          // If there are values, reset the dismissed flag so toast can show again if needed
          setNoResultsMessageDismissed(false);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      // Show error notification
      toast.error('Error al cargar los datos', {
        description: errorMessage,
        duration: 5000,
        closeButton: true,
      });
      
      setNoResultsFound(true);
    } finally {
      setLoading(false);
      setFilterLoading(false);
      // Clear loading timer if it was set
      if (loadingTimer) {
        clearTimeout(loadingTimer);
      }
    }
  }, [processForecastData, selectedProduct?.product_id, selectedLocation?.location_id, selectedCustomer?.customer_id, selectedDateRange, advancedFilters, customerNamesCache, customerNamesLoaded, fetchSellInData, fetchSellOutData, applyAdvancedFilters, months, noResultsMessageDismissed]);

  // Function to manually refresh data
  const manualRefreshData = useCallback(() => {
    setNoResultsMessageDismissed(false);
    fetchForecastData(true);
  }, [fetchForecastData]);

  // Function to dismiss no results message
  // Note: This will be reset automatically when filters change, allowing users to try other filters
  const dismissNoResultsMessage = useCallback(() => {
    setNoResultsMessageDismissed(true);
  }, []);

  useEffect(() => {
    fetchForecastData();
  }, []);

  // Reset dismissed state when filters change, then refetch data
  // This allows users to try different filters even after getting no results
  useEffect(() => {
    // Reset the dismissed state whenever any filter changes
    // This allows users to try different filters and see results
    setNoResultsMessageDismissed(false);
    
    // Longer debounce to allow users to select multiple filters comfortably
    // This prevents aggressive page refreshing while user is still selecting filters
    const timer = setTimeout(() => {
      fetchForecastData(true);
    }, 1200); // Wait 1.2 seconds after last filter change before fetching
    
    return () => clearTimeout(timer);
  }, [selectedProduct?.product_id, selectedLocation?.location_id, selectedCustomer?.customer_id, selectedDateRange, JSON.stringify(advancedFilters), fetchForecastData]);


  
  const calculateTotal = useCallback((field: string) => {
    // Use filtered customers (already filtered by advanced filters in fetchForecastData)
    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
      : customers;
      
    return customersToUse.reduce((total, customer) => {
      return total + months.reduce((monthTotal, month) => {
        const monthData = customer.months[month];
        return monthTotal + (monthData ? (monthData as Record<string, number>)[field] || 0 : 0);
      }, 0);
    }, 0);
  }, [customers, months, selectedCustomerId]);

  const calculateSalesTrends = useCallback(() => {
    const currentPeriod = calculateTotal('effective_forecast');
    const lastYearPeriod = calculateTotal('last_year');
    
    let growthPercentage = 0;
    let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';
    
    if (lastYearPeriod > 0) {
      growthPercentage = ((currentPeriod - lastYearPeriod) / lastYearPeriod) * 100;
      trendDirection = growthPercentage > 0 ? 'up' : growthPercentage < 0 ? 'down' : 'neutral';
    }
    
    setSalesTrends({
      currentPeriod,
      lastYearPeriod,
      growthPercentage,
      trendDirection
    });
  }, [calculateTotal]);

  // Calculate sales trends when filters change
  useEffect(() => {
    calculateSalesTrends();
  }, [customers, selectedCustomerId]);

  const handleDoubleClick = useCallback((customerId: string, month: string, currentValue: number) => {
    setEditingCell({ customerId, month });
    setEditingValue(currentValue.toString());
  }, []);

  // Helper function to convert month string to date
  const monthToDate = (monthStr: string): string => {
    const monthMap: { [key: string]: string } = {
      'oct': '10', 'nov': '11', 'dic': '12',
      'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'ago': '08', 'sep': '09'
    };
    
    const [month, year] = monthStr.split('-');
    const monthNum = monthMap[month.toLowerCase()];
    const fullYear = year.length === 2 ? `20${year}` : year;
    
    return `${fullYear}-${monthNum}-01`;
  };

  // Function to save KAM Forecast to commercial_collaboration table
  const saveKamForecastToDatabase = async (customerId: string, month: string, value: number) => {
    try {
      setSaving(true);
      
      // Find the exact customer object from our loaded data to get the correct values
      let actualProductId: string | null = null;
      let actualLocationId: string | null = null;
      let actualPostdate: string | null = null;
      
      if (customerId === 'all') {
        // For aggregate "all customers", use filter values and get postdate from first customer
        actualProductId = selectedProduct?.product_id;
        actualLocationId = selectedLocation?.location_id;
        
        // Get postdate from first customer that has data for this month
        const customerWithMonth = customers.find(c => c.monthPostdates && c.monthPostdates[month]);
        actualPostdate = customerWithMonth?.monthPostdates?.[month] || null;
        
        // If no filters, get from first customer
        if ((!actualProductId || !actualLocationId) && customers.length > 0) {
          actualProductId = actualProductId || customers[0].product_id;
          actualLocationId = actualLocationId || customers[0].location_node_id;
        }
      } else {
        // For individual customers, find the exact customer object and validate all required fields
        const customerObj = customers.find(c => c.customer_node_id === customerId);
        if (customerObj) {
          actualProductId = customerObj.product_id;
          actualLocationId = customerObj.location_node_id;
          // Get the actual postdate from customer data
          actualPostdate = customerObj.monthPostdates?.[month] || null;
          
          // Enhanced validation for individual customers
          console.log('=== INDIVIDUAL CUSTOMER KAM VALIDATION ===');
          console.log('Customer validation data:', {
            customer_node_id: customerId,
            customer_name: customerObj.customer_name,
            product_id: actualProductId,
            location_node_id: actualLocationId,
            month: month,
            actualPostdate: actualPostdate,
            commercial_input_value: value,
            hasMonthData: !!customerObj.months[month],
            monthPostdates: customerObj.monthPostdates
          });
          
          // Validate required fields for individual customer
          const missingFields = [];
          if (!actualProductId) missingFields.push('product_id');
          if (!actualLocationId) missingFields.push('location_node_id');
          if (!customerId) missingFields.push('customer_node_id');
          
          if (missingFields.length > 0) {
            console.error('Missing required fields for individual customer KAM adjustment:', {
              customer_node_id: customerId,
              customer_name: customerObj.customer_name,
              month: month,
              missing_fields: missingFields,
              available_data: {
                product_id: actualProductId,
                location_node_id: actualLocationId,
                customer_node_id: customerId
              }
            });
            alert(`Cannot save KAM adjustment for ${customerObj.customer_name}: Missing required fields (${missingFields.join(', ')})`);
            return;
          }
        } else {
          console.error('Customer object not found in customers array:', {
            searched_customer_id: customerId,
            available_customers: customers.map(c => c.customer_node_id),
            total_customers: customers.length
          });
          alert(`Customer not found: ${customerId}`);
          return;
        }
      }
      
      // Fallback to monthToDate conversion if no actual postdate found
      const postdate = actualPostdate || monthToDate(month);
      
      // Ensure postdate is in correct format (YYYY-MM-DD)
      const formattedPostdate = postdate.includes('T') ? postdate.split('T')[0] : postdate;
      
      console.log('Date formatting debug:', {
        originalMonth: month,
        actualPostdate,
        convertedPostdate: monthToDate(month),
        finalPostdate: postdate,
        formattedPostdate
      });
      
      // If we still don't have the values, try to get them from the database
      if (!actualProductId || !actualLocationId) {
        console.log('=== FALLBACK DATABASE QUERY ===');
        console.log('Missing fields - trying database fallback:', {
          missing_product_id: !actualProductId,
          missing_location_id: !actualLocationId,
          search_criteria: {
            customer_node_id: customerId,
            postdate: formattedPostdate
          }
        });

        const { data: existingData, error: fetchError } = await (supabase as any).schema('m8_schema')
          .from('commercial_collaboration')
          .select('product_id, location_node_id, customer_node_id, postdate')
          .eq('customer_node_id', customerId)
          .eq('postdate', formattedPostdate)
          .limit(5); // Get a few records to see what's available
        
        console.log('Fallback database query result:', {
          error: fetchError,
          found_records: existingData?.length || 0,
          sample_records: existingData?.slice(0, 2)
        });

        if (!fetchError && existingData && existingData.length > 0) {
          const record = existingData[0];
          actualProductId = actualProductId || record.product_id;
          actualLocationId = actualLocationId || record.location_node_id;
          
          console.log('Updated values from database fallback:', {
            actualProductId,
            actualLocationId,
            used_record: record
          });
        } else {
          console.error('Database fallback failed:', {
            error: fetchError,
            no_records_found: !existingData || existingData.length === 0,
            search_criteria: {
              customer_node_id: customerId,
              postdate: formattedPostdate
            }
          });
        }
      }
      
      // Enhanced logging for KAM adjustment with field validation
      const kamAdjustmentData = {
        product_id: actualProductId,
        customer_node_id: customerId,
        location_node_id: actualLocationId,
        postdate: postdate,
        formattedPostdate: formattedPostdate,
        actualPostdate: actualPostdate,
        month: month,
        commercial_input: value,
        postdateSource: actualPostdate ? 'customer_data' : 'converted_from_month'
      };
      
      console.log('=== KAM ADJUSTMENT DATA VALIDATION ===');
      console.log('Saving KAM Adjustment (commercial_input):', kamAdjustmentData);
      
      // Comprehensive validation of all required fields before database operation
      const validationResults = {
        product_id: { value: actualProductId, valid: !!actualProductId },
        customer_node_id: { value: customerId, valid: !!customerId },
        location_node_id: { value: actualLocationId, valid: !!actualLocationId },
        postdate: { value: formattedPostdate, valid: !!formattedPostdate },
        commercial_input: { value: value, valid: typeof value === 'number' }
      };
      
      console.log('Field validation results:', validationResults);
      
      const invalidFields = Object.entries(validationResults)
        .filter(([_, validation]) => !validation.valid)
        .map(([field, validation]) => ({ field, value: validation.value }));
      
      if (invalidFields.length > 0) {
        console.error('Validation failed - Missing/invalid required values for KAM adjustment:', {
          invalid_fields: invalidFields,
          all_data: kamAdjustmentData,
          customer_type: customerId === 'all' ? 'aggregate' : 'individual'
        });
        
        const fieldNames = invalidFields.map(f => f.field).join(', ');
        const customerName = customerId === 'all' ? 'Todos los clientes' : 
          (customers.find(c => c.customer_node_id === customerId)?.customer_name || customerId);
        
        alert(`Cannot save KAM adjustment for ${customerName}: Missing/invalid required fields (${fieldNames})`);
        return;
      }
      
      console.log('✓ All required fields validated successfully');
      
      // Compare values with existing database record before update
      console.log('=== PRE-UPDATE COMPARISON ===');
      const comparisonCriteria = {
        customer_node_id: customerId,
        postdate: formattedPostdate,
        product_id: actualProductId,
        location_node_id: actualLocationId
      };
      console.log('Database lookup criteria:', comparisonCriteria);
      
      // First, check existing record to compare values before upsert
      const { data: existingRecord, error: selectError } = await (supabase as any).schema('m8_schema')
        .from('commercial_collaboration')
        .select('customer_node_id, product_id, location_node_id, postdate, commercial_input')
        .eq('customer_node_id', customerId)
        .eq('postdate', formattedPostdate)
        .eq('product_id', actualProductId)
        .eq('location_node_id', actualLocationId)
        .limit(1);

      if (selectError) {
        console.error('Error checking existing record:', selectError);
      } else if (existingRecord && existingRecord.length > 0) {
        const existing = existingRecord[0];
        console.log('Found existing record for comparison:', {
          existing_values: {
            customer_node_id: existing.customer_node_id,
            product_id: existing.product_id,
            location_node_id: existing.location_node_id,
            postdate: existing.postdate,
            commercial_input: existing.commercial_input
          },
          new_values: {
            customer_node_id: customerId,
            product_id: actualProductId,
            location_node_id: actualLocationId,
            postdate: formattedPostdate,
            commercial_input: value
          },
          changes: {
            commercial_input: existing.commercial_input !== value ? 
              `${existing.commercial_input} → ${value}` : 'no change'
          }
        });
      } else {
        console.warn('No existing record found with the specified criteria:', comparisonCriteria);
      }

      // Before executing UPSERT, let's check if records exist with these exact criteria
      console.log('=== PRE-UPSERT RECORD CHECK ===');
      const { data: checkData, error: checkError } = await (supabase as any).schema('m8_schema')
        .from('commercial_collaboration')
        .select('customer_node_id, product_id, location_node_id, postdate, commercial_input')
        .eq('customer_node_id', customerId)
        .eq('postdate', formattedPostdate)
        .eq('product_id', actualProductId)
        .eq('location_node_id', actualLocationId);

      console.log('Records matching exact criteria:', {
        error: checkError,
        found_records: checkData?.length || 0,
        records: checkData
      });

      // If no exact match, try broader searches to understand what's in the database
      if (!checkData || checkData.length === 0) {
        console.log('=== BROADER SEARCH FOR DEBUGGING ===');
        
        // Search by customer only
        const { data: customerOnlyData } = await (supabase as any).schema('m8_schema')
          .from('commercial_collaboration')
          .select('customer_node_id, product_id, location_node_id, postdate, commercial_input')
          .eq('customer_node_id', customerId)
          .limit(3);
        
        console.log('Records for customer only:', {
          found: customerOnlyData?.length || 0,
          sample: customerOnlyData?.slice(0, 2)
        });

        // Search by customer and date
        const { data: customerDateData } = await (supabase as any).schema('m8_schema')
          .from('commercial_collaboration')
          .select('customer_node_id, product_id, location_node_id, postdate, commercial_input')
          .eq('customer_node_id', customerId)
          .eq('postdate', formattedPostdate)
          .limit(3);
        
        console.log('Records for customer and date:', {
          found: customerDateData?.length || 0,
          sample: customerDateData?.slice(0, 2)
        });
      }

      // Execute UPSERT query to commercial_collaboration table
      console.log('=== EXECUTING UPSERT QUERY ===');
      console.log('UPSERT data:', {
        customer_node_id: customerId,
        postdate: formattedPostdate,
        product_id: actualProductId,
        location_node_id: actualLocationId,
        commercial_input: value
      });

      // Use UPSERT (INSERT ... ON CONFLICT) to handle both insert and update
      let { data: upsertData, error: upsertError } = await (supabase as any).schema('m8_schema')
        .from('commercial_collaboration')
        .upsert({
          product_id: actualProductId,
          customer_node_id: customerId,
          location_node_id: actualLocationId,
          postdate: formattedPostdate,
          commercial_input: value,
          commercial_notes: `KAM adjustment updated at ${new Date().toISOString()}`
        }, {
          onConflict: 'product_id,customer_node_id,location_node_id,postdate'
        })
        .select('*'); // Add select to see what was upserted

      console.log('UPSERT query result:', {
        upsertData,
        upsertError,
        affectedRows: upsertData?.length || 0
      });

      if (upsertError) {
        console.error('Error saving KAM Adjustment to commercial_collaboration:', upsertError);
        alert(`Error saving KAM adjustment: ${upsertError.message}`);
        throw upsertError;
      }

      // Success - log detailed results
      console.log('=== KAM ADJUSTMENT SAVED SUCCESSFULLY ===');
      console.log('UPSERT operation completed:', {
        affected_records: upsertData?.length || 0,
        upserted_record: upsertData?.[0],
        operation_summary: {
          customer_name: customers.find(c => c.customer_node_id === customerId)?.customer_name || customerId,
          customer_id: customerId,
          month: month,
          new_commercial_input: value,
          table: 'commercial_collaboration'
        }
      });
      
      // Show success feedback with details
      const customerName = customers.find(c => c.customer_node_id === customerId)?.customer_name || customerId;
      console.log(`✓ KAM adjustment saved successfully: ${value} for ${customerName} in ${month}`);
      
      // Verify saved value by re-querying the database
      console.log('=== POST-SAVE VERIFICATION ===');
      const { data: verificationData, error: verificationError } = await (supabase as any).schema('m8_schema')
        .from('commercial_collaboration')
        .select('commercial_input')
        .eq('customer_node_id', customerId)
        .eq('postdate', formattedPostdate)
        .eq('product_id', actualProductId)
        .eq('location_node_id', actualLocationId)
        .limit(1);

      if (verificationError) {
        console.error('Error verifying saved value:', verificationError);
      } else if (verificationData && verificationData.length > 0) {
        const savedValue = verificationData[0].commercial_input;
        console.log('Verification result:', {
          expected_value: value,
          saved_value: savedValue,
          match: savedValue === value ? '✓ MATCH' : '✗ MISMATCH',
          customer: customerName,
          month: month
        });
        
        if (savedValue !== value) {
          console.warn(`Display value does not match saved value! Expected: ${value}, Saved: ${savedValue}`);
        }
      } else {
        console.warn('No record found during verification - this might indicate a save issue');
      }
      
      // Refresh the data to ensure UI reflects the latest database state
      console.log('Refreshing forecast data to reflect saved changes...');
      await fetchForecastData(true);
      
    } catch (error) {
      console.error('Error saving KAM Adjustment to database:', error);
      // Show user-friendly error message
      alert(`Failed to save KAM adjustment. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = useCallback(async (customerId: string, month: string) => {
    const newValue = parseFloat(editingValue) || 0;
    
    // Save to database
    await saveKamForecastToDatabase(customerId, month, newValue);
    
          setCustomers(prevCustomers => 
        prevCustomers.map(customer => {
          if (customer.customer_node_id === customerId) {
            return {
              ...customer,
              months: {
                ...customer.months,
                [month]: {
                  ...customer.months[month],
                  kam_forecast_correction: newValue
                }
              }
            };
          }
          return customer;
        })
      );
    
    setEditingCell(null);
    setEditingValue('');
  }, [editingValue, selectedProduct?.product_id, selectedLocation?.location_id]);

  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditingValue('');
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent, customerId: string, month: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(customerId, month);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  const handleKamApprovalChange = useCallback((customerId: string, month: string, value: string) => {
    setKamApprovals(prev => ({
      ...prev,
      [customerId]: {
        ...prev[customerId],
        [month]: value
      }
    }));
  }, []);

  const handleInlineEditStart = useCallback((customerId: string, month: string, currentValue: number) => {
    // Prevent multiple rapid double-clicks
    if (inlineEditingCell) return;
    
    // Use requestAnimationFrame to defer the state update and prevent blocking
    requestAnimationFrame(() => {
      setInlineEditingCell({ customerId, month });
      setInlineEditingValue(currentValue.toString());
    });
  }, [inlineEditingCell]);

  const handleInlineEditSave = useCallback(async (customerId: string, month: string) => {
    const newValue = parseFloat(inlineEditingValue) || 0;
    
    try {
      setSaving(true);
      
      // If editing the "all" level, apply fair share formula to individual customers
      if (customerId === 'all') {
        console.log(`Distributing total KAM adjustment of ${newValue} across all customers for ${month}`);
        
        const updatedCustomers = await new Promise<CustomerData[]>((resolve) => {
          setCustomers(prevCustomers => {
            // Calculate total effective forecast for all customers in this month
            const totalEffectiveForecast = prevCustomers.reduce((total, customer) => {
              const monthData = customer.months[month];
              return total + (monthData ? monthData.effective_forecast : 0);
            }, 0);
            
            console.log(`Total effective forecast for ${month}: ${totalEffectiveForecast}`);
            
            // Apply fair share formula to each customer
            const updatedCustomers = prevCustomers.map(customer => {
              const monthData = customer.months[month];
              const customerEffectiveForecast = monthData ? monthData.effective_forecast : 0;
              
              // Calculate fair share: (customer's effective forecast / total effective forecast) * new total value
              let fairShareValue = 0;
              if (totalEffectiveForecast > 0) {
                fairShareValue = (customerEffectiveForecast / totalEffectiveForecast) * newValue;
              } else {
                // If no effective forecast, distribute equally
                fairShareValue = newValue / prevCustomers.length;
              }
              
              console.log(`Customer ${customer.customer_name}: ${customerEffectiveForecast}/${totalEffectiveForecast} * ${newValue} = ${fairShareValue}`);
              
              return {
                ...customer,
                months: {
                  ...customer.months,
                  [month]: {
                    ...monthData,
                    kam_forecast_correction: Math.round(fairShareValue) // Round to ensure integer numbers
                  }
                }
              };
            });
            
            resolve(updatedCustomers);
            return updatedCustomers;
          });
        });
        
        // Save all customer values to database
        console.log(`Saving KAM adjustments for ${updatedCustomers.length} customers...`);
        let savedCount = 0;
        for (const customer of updatedCustomers) {
          const monthData = customer.months[month];
          if (monthData && monthData.kam_forecast_correction !== undefined) {
            try {
              await saveKamForecastToDatabase(customer.customer_node_id, month, monthData.kam_forecast_correction);
              savedCount++;
            } catch (error) {
              console.error(`Failed to save KAM adjustment for customer ${customer.customer_name}:`, error);
            }
          }
        }
        console.log(`✓ Successfully saved KAM adjustments to ${savedCount} customers`);
        
      } else {
        // Individual customer edit - update only that customer
        console.log(`Saving individual KAM adjustment: ${newValue} for customer ${customerId} in ${month}`);
        
        setCustomers(prevCustomers => 
          prevCustomers.map(customer => {
            if (customer.customer_node_id === customerId) {
              return {
                ...customer,
                months: {
                  ...customer.months,
                  [month]: {
                    ...customer.months[month],
                    kam_forecast_correction: newValue
                  }
                }
              };
            }
            return customer;
          })
        );
        
        // Save individual customer value to database
        await saveKamForecastToDatabase(customerId, month, newValue);
        console.log(`✓ Successfully saved individual KAM adjustment`);
      }
      
    } catch (error) {
      console.error('Error saving KAM adjustments:', error);
      alert('Failed to save KAM adjustments. Please try again.');
    } finally {
      setSaving(false);
      setInlineEditingCell(null);
      setInlineEditingValue('');
    }
  }, [inlineEditingValue, saveKamForecastToDatabase]);

  const handleInlineEditCancel = useCallback(() => {
    setInlineEditingCell(null);
    setInlineEditingValue('');
  }, []);

  const handleInlineKeyPress = useCallback((e: React.KeyboardEvent, customerId: string, month: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInlineEditSave(customerId, month);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleInlineEditCancel();
    }
  }, [handleInlineEditSave, handleInlineEditCancel]);

  // AG Grid column definitions
  const customerColumnDefs: ColDef[] = [
    {
      field: 'customer_node_id',
      headerName: 'ID Cliente',
      width: 120,
      cellStyle: { fontWeight: 'bold' }
    },
    {
      field: 'customer_name',
      headerName: 'Nombre del Cliente',
      flex: 1,
      minWidth: 200
    }
  ];

  const productCategoryColumnDefs: ColDef[] = [
    {
      field: 'category_id',
      headerName: 'ID Categoría',
      width: 120,
      cellStyle: { fontWeight: 'bold' }
    },
    {
      field: 'category_name',
      headerName: 'Categoría',
      flex: 1,
      minWidth: 150
    },
    {
      field: 'subcategory_id',
      headerName: 'ID Subcategoría',
      width: 120
    },
    {
      field: 'subcategory_name',
      headerName: 'Subcategoría',
      flex: 1,
      minWidth: 150
    },
    {
      field: 'customer_node_id',
      headerName: 'ID Cliente',
      width: 120
    }
  ];

  // AG Grid event handlers
  const onGridReady = useCallback((params: GridReadyEvent) => {
    ////console.log('Customer grid ready:', params);
  }, []);







  // Filter customers based on selection
  const filteredCustomers = useCallback(() => {
    let filtered = customers;
    
    // Filter by customer if selected
    if (selectedCustomerId && selectedCustomerId !== 'all') {
      filtered = filtered.filter(customer => customer.customer_node_id === selectedCustomerId);
    }
    
    return filtered;
  }, [customers, selectedCustomerId]);

  if (loading || clearingFilters) return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Colaboración en Pronósticos</h1>
      
      {/* Loading skeleton for filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>

      {/* Loading skeleton for table */}
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="mt-4 text-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600 font-medium">
              {clearingFilters ? 'Limpiando filtros...' : 
               filterLoading ? 'Aplicando filtros...' : 
               'Cargando datos de colaboración...'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {clearingFilters ? 'Eliminando filtros incluyendo Jerarquía de clientes y recargando datos' : 
               filterLoading ? 'Buscando datos con los filtros seleccionados' : 
               'Conectando con la base de datos y procesando información'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Show debug information when no data is found
  if (!loading && customers.length === 0 && rawForecastData.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Colaboración en Pronósticos</h1>
        
        {/* ===== FILTER SECTION ===== */}
        <div className="space-y-4 mb-6">
          <div className="flex justify-start">
            <FilterDropdown 
              onProductFilterChange={handleProductFilterChange}
              onLocationFilterChange={handleLocationFilterChange}
              onCustomerFilterChange={handleCustomerFilterChange}
              onDateRangeChange={handleDateRangeChange}
              onSearch={handleSearch}
            />
          </div>

          {/* Selected Filters Display */}
          {(selectedProduct || selectedLocation || selectedCustomer || selectedDateRange) && (
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Filtros activos:</span>
                  
                  {selectedProduct && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm">
                      <Package className="h-3 w-3" />
                      {selectedProduct.level === 'product' && `${selectedProduct.product_id} - ${selectedProduct.product_name}`}
                      {selectedProduct.level === 'class' && `${selectedProduct.class_name} (Clase)`}
                      {selectedProduct.level === 'subcategory' && `${selectedProduct.subcategory_name} (Subcategoría)`}
                      {selectedProduct.level === 'category' && `${selectedProduct.category_name} (Categoría)`}
                    </div>
                  )}
                  
                  {selectedLocation && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-sm">
                      <Truck className="h-3 w-3" />
                      {selectedLocation.description} ({selectedLocation.location_code})
                    </div>
                  )}
                  
                  {selectedCustomer && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-sm">
                      <Users className="h-3 w-3" />
                      {selectedCustomer.description} ({selectedCustomer.customer_code})
                    </div>
                  )}
                  
                  {selectedDateRange && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm">
                      <Calendar className="h-3 w-3" />
                      {selectedDateRange.from?.toLocaleDateString('es-ES')} - {selectedDateRange.to?.toLocaleDateString('es-ES')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No se encontraron datos</h3>
              <p className="text-gray-600 mb-6">
                {hasActiveFilters() 
                  ? 'Los filtros seleccionados no devolvieron resultados. Intenta con diferentes combinaciones.' 
                  : 'No hay datos disponibles en la base de datos en este momento.'
                }
              </p>
              
              {hasActiveFilters() && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center justify-center gap-2">
                    <Filter className="w-4 h-4" />
                    Sugerencias para encontrar datos
                  </h4>
                  <div className="text-left space-y-2 text-sm text-blue-700">
                    <p>• <strong>Amplía el rango de fechas:</strong> Algunos datos pueden estar en meses diferentes</p>
                    <p>• <strong>Reduce los filtros:</strong> Quita algunos filtros para obtener más resultados</p>
                    <p>• <strong>Verifica las combinaciones:</strong> Asegúrate de que las marcas y líneas de productos coincidan</p>
                    <p>• <strong>Usa Filtros Avanzados:</strong> Prueba con diferentes jerarquías de clientes</p>
                  </div>
                </div>
              )}
              <div className="text-left bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium mb-2">Información de depuración:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Filtros aplicados: Producto={selectedProduct?.product_id || 'ninguno'}, Ubicación={selectedLocation?.location_code || 'ninguna'}, Cliente={selectedCustomer?.customer_id || 'ninguno'}</li>
                  <li>• Registros en rawForecastData: {rawForecastData.length}</li>
                  <li>• Clientes procesados: {customers.length}</li>
                  <li>• Vista consultada: m8_schema.commercial_collaboration_view</li>
                </ul>
              </div>
              <div className="flex justify-center gap-3">
                <Button 
                  onClick={() => fetchForecastData()} 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Reintentar carga
                </Button>
                {hasActiveFilters() && (
                  <Button 
                    onClick={clearAllFilters}
                    variant="outline"
                    disabled={clearingFilters}
                    className="flex items-center gap-2"
                  >
                    {clearingFilters ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    {clearingFilters ? 'Limpiando filtros...' : 'Limpiar todos los filtros'}
                  </Button>
                )}
              </div>
            </div>
            
            {/* Show FilterPanel when no data is found to allow trying different combinations */}
            <div className="mt-6 pt-6 border-t border-gray-200 bg-blue-50 p-6 rounded-lg">
              <div className="mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-800">
                  <Filter className="h-5 w-5 text-blue-600" />
                  Filtros Avanzados
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Prueba diferentes combinaciones de filtros para encontrar datos. Selecciona por canal, marca, jerarquía de cliente, línea de producto, etc.
                </p>
              </div>
              <div className="bg-white rounded-lg p-2">
                <FilterPanel 
                  customers={customers} 
                  onFiltersChange={handleAdvancedFiltersChange}
                />
              </div>
              
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Error al cargar los datos</h3>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        
        {/* Additional debugging information */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-left">
          <h4 className="font-medium text-gray-700 mb-2">Información de depuración:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Error: Problema al consultar la vista de base de datos</li>
            <li>• Vista: m8_schema.commercial_collaboration_view</li>
            <li>• Posibles causas: Vista no existe, permisos, o columnas faltantes</li>
            <li>• Abrir consola del navegador para más detalles</li>
          </ul>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Intentar de nuevo
          </button>
          <button 
            onClick={() => {
              if ((window as any).debugDatabaseConnections) {
                (window as any).debugDatabaseConnections();
              } else {
                console.log('Debug function not available');
              }
            }} 
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Ejecutar diagnóstico
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Colaboración en Pronósticos</h1>
      
      {/* ===== FILTER SECTION ===== */}
      <div className="space-y-4">
        <div className="flex justify-start">
          <FilterDropdown 
            onProductFilterChange={handleProductFilterChange}
            onLocationFilterChange={handleLocationFilterChange}
            onCustomerFilterChange={handleCustomerFilterChange}
            onDateRangeChange={handleDateRangeChange}
            onSearch={handleSearch}
          />
        </div>

        {/* Selected Filters Display */}
        {(selectedProduct || selectedLocation || selectedCustomer || selectedDateRange) && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Filtros activos:</span>
                  
                  {selectedProduct && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm">
                      <Package className="h-3 w-3" />
                      {selectedProduct.level === 'product' && `${selectedProduct.product_id} - ${selectedProduct.product_name}`}
                      {selectedProduct.level === 'class' && `${selectedProduct.class_name} (Clase)`}
                      {selectedProduct.level === 'subcategory' && `${selectedProduct.subcategory_name} (Subcategoría)`}
                      {selectedProduct.level === 'category' && `${selectedProduct.category_name} (Categoría)`}
                    </div>
                  )}
                  
                  {selectedLocation && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-sm">
                      <Truck className="h-3 w-3" />
                      {selectedLocation.description} ({selectedLocation.location_code})
                    </div>
                  )}
                  
                  {selectedCustomer && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-sm">
                      {selectedCustomer.description} ({selectedCustomer.customer_code})
                    </div>
                  )}
                  
                  {selectedDateRange && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm">
                      <Calendar className="h-3 w-3" />
                      {selectedDateRange.from?.toLocaleDateString('es-ES')} - {selectedDateRange.to?.toLocaleDateString('es-ES')}
                    </div>
                  )}
                </div>
                
                {/* Clear Filters Button */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedProduct(null);
                    setSelectedLocation(null);
                    setSelectedCustomer(null);
                    setSelectedDateRange(null);
                  }}
                  className="h-8 px-3 text-xs"
                  disabled={filterLoading}
                >
                  {filterLoading ? (
                    <div className="w-3 h-3 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin mr-1"></div>
                  ) : (
                    <X className="h-3 w-3 mr-1" />
                  )}
                  Limpiar filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
 {/* Additional Filter Panel - Moved inside metrics card */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-600" />
                Filtros Avanzados
              </h3>
            </div>
            <FilterPanel 
              customers={customers} 
              onFiltersChange={handleAdvancedFiltersChange}
            />
            
          </div>

    {/* Forecast Metrics Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Forecast Collaboration Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mixed Chart with Multiple Y-Axis */}
          {(() => {
            // Use filtered customers (already filtered by advanced filters in fetchForecastData)
            const filteredCustomers = customers;
            
            const m8PredictTotal = calculateTotal('calculated_forecast');
            const kamForecastTotal = calculateTotal('kam_forecast_correction');
            const effectiveForecastTotal = calculateTotal('effective_forecast');
            const lastYearTotal = calculateTotal('last_year');
            
            // Calculate monthly data for the chart using filtered customers
            // Note: filteredCustomers is already filtered by advanced filters (marca, productLine, etc.)
            // via the applyAdvancedFilters function in fetchForecastData
            const chartData = months.map(month => {
              const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                ? filteredCustomers.filter(customer => customer.customer_node_id === selectedCustomerId)
                : filteredCustomers;
              
              return {
                month,
                displayMonth: month.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
                m8Predict: customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.calculated_forecast || 0) : 0);
                }, 0),
                kamForecast: customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.kam_forecast_correction || 0) : 0);
                }, 0),
                effectiveForecast: customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.effective_forecast || 0) : 0);
                }, 0),
                lastYear: customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.last_year || 0) : 0);
                }, 0)
              };
            });

            // Find max values for scaling
            const maxForecastValue = Math.max(
              ...chartData.map(d => Math.max(d.m8Predict, d.kamForecast, d.effectiveForecast, d.lastYear))
            );

            // Calculate growth percentages for secondary axis
            const growthData = chartData.map(data => {
              const growth = data.lastYear > 0 ? ((data.effectiveForecast - data.lastYear) / data.lastYear) * 100 : 0;
              return { ...data, growthPercentage: growth };
            });

            const maxGrowth = Math.max(...growthData.map(d => Math.abs(d.growthPercentage)));
            const minGrowth = Math.min(...growthData.map(d => d.growthPercentage));

            return (
              <div className="space-y-6">
                {/* KPI Summary Card with Real Data */}
                <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 mb-6">
                  {/* Top Section */}
                  <div className="grid grid-cols-3 gap-4 border-b pb-6">
                    {/* CAJAS - Using effective_forecast totals with attr_1 for cajas */}
                    <div className="flex items-center gap-4 border-r pr-4">
                      <div className="bg-blue-100 p-3 rounded-full">
                        <Package className="text-blue-700 w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-blue-700">
                          {(customers.reduce((total, customer) => {
                            return total + months.reduce((monthTotal, month) => {
                              const monthData = customer.months[month];
                              return monthTotal + (monthData ? (monthData.effective_forecast * (customer.attr_1 || 0)) : 0);
                            }, 0);
                          }, 0) / 1000000).toFixed(0)} M
                        </p>
                        <p className="text-gray-600 text-sm font-medium">CAJAS</p>
                        <p className={`text-sm font-semibold mt-1 ${
                          salesTrends.growthPercentage >= 0 ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {salesTrends.growthPercentage >= 0 ? '+' : ''}{salesTrends.growthPercentage.toFixed(1)}% vs AA
                        </p>
                        <div className="mt-2 border-dotted border-2 border-blue-200 rounded-full text-center w-20 py-1">
                          <p className={`text-sm font-semibold ${
                            (effectiveForecastTotal - m8PredictTotal) >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {(effectiveForecastTotal - m8PredictTotal) >= 0 ? '+' : ''}
                            {m8PredictTotal > 0 ? (((effectiveForecastTotal - m8PredictTotal) / m8PredictTotal) * 100).toFixed(1) : '0.0'}%
                          </p>
                          <p className="text-gray-500 text-xs">vs M8</p>
                        </div>
                      </div>
                    </div>

                    {/* LITROS - Using product attr_1 calculations */}
                    <div className="flex items-center gap-4 border-r pr-4">
                      <div className="bg-orange-100 p-3 rounded-full">
                        <Droplet className="text-orange-600 w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-orange-600">
                          {(customers.reduce((total, customer) => {
                            return total + months.reduce((monthTotal, month) => {
                              const monthData = customer.months[month];
                              return monthTotal + (monthData ? (monthData.effective_forecast * (customer.attr_1 || 0)) : 0);
                            }, 0);
                          }, 0) / 1000000).toFixed(0)} M
                        </p>
                        <p className="text-gray-600 text-sm font-medium">LITROS</p>
                        <p className={`text-sm font-semibold mt-1 ${
                          salesTrends.growthPercentage >= 0 ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {salesTrends.growthPercentage >= 0 ? '+' : ''}{(salesTrends.growthPercentage * 0.8).toFixed(1)}% vs AA
                        </p>
                        <div className="mt-2 border-dotted border-2 border-blue-200 rounded-full text-center w-20 py-1">
                          <p className={`text-sm font-semibold ${
                            (kamForecastTotal - lastYearTotal) >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {(kamForecastTotal - lastYearTotal) >= 0 ? '+' : ''}
                            {lastYearTotal > 0 ? (((kamForecastTotal - lastYearTotal) / lastYearTotal) * 100).toFixed(1) : '0.0'}%
                          </p>
                          <p className="text-gray-500 text-xs">vs KAM</p>
                        </div>
                      </div>
                    </div>

                    {/* PESOS - Using calculated_forecast totals */}
                    <div className="flex items-center gap-4 pl-4">
                      <div className="bg-green-100 p-3 rounded-full">
                        <DollarSign className="text-green-700 w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-green-700">
                          {((effectiveForecastTotal) / 1000000).toFixed(0)} M
                        </p>
                        <p className="text-gray-600 text-sm font-medium">PESOS</p>
                        <p className={`text-sm font-semibold mt-1 ${
                          salesTrends.growthPercentage >= 0 ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {salesTrends.growthPercentage >= 0 ? '+' : ''}{(salesTrends.growthPercentage * 0.9).toFixed(1)}% vs AA
                        </p>
                        <div className="mt-2 border-dotted border-2 border-blue-200 rounded-full text-center w-20 py-1">
                          <p className={`text-sm font-semibold ${
                            (effectiveForecastTotal - kamForecastTotal) >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {(effectiveForecastTotal - kamForecastTotal) >= 0 ? '+' : ''}
                            {kamForecastTotal > 0 ? (((effectiveForecastTotal - kamForecastTotal) / kamForecastTotal) * 100).toFixed(1) : '0.0'}%
                          </p>
                          <p className="text-gray-500 text-xs">vs Eff</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Table - Quarterly Breakdown */}
                  <div className="mt-6">
                    <table className="w-full text-center border-collapse">
                      <thead>
                        <tr className="bg-blue-900 text-white text-sm">
                          <th className="py-2">Q1</th>
                          <th className="py-2">Q2</th>
                          <th className="py-2">Q3</th>
                          <th className="py-2">Q4</th>
                          <th className="py-2">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-700">
                        {/* Effective Forecast Row */}
                        <tr>
                          <td className="py-2">
                            {chartData.length >= 3 ? (chartData.slice(0, 3).reduce((sum, data) => sum + data.effectiveForecast, 0) / 1000).toFixed(0) : '0'}
                          </td>
                          <td className="py-2">
                            {chartData.length >= 6 ? (chartData.slice(3, 6).reduce((sum, data) => sum + data.effectiveForecast, 0) / 1000).toFixed(0) : '0'}
                          </td>
                          <td className="py-2">
                            {chartData.length >= 9 ? (chartData.slice(6, 9).reduce((sum, data) => sum + data.effectiveForecast, 0) / 1000).toFixed(0) : '0'}
                          </td>
                          <td className="py-2">
                            {chartData.length >= 12 ? (chartData.slice(9, 12).reduce((sum, data) => sum + data.effectiveForecast, 0) / 1000).toFixed(0) : '0'}
                          </td>
                          <td className="py-2 font-semibold">
                            {(effectiveForecastTotal / 1000).toFixed(0)}
                          </td>
                        </tr>
                        {/* KAM Forecast Row */}
                        <tr>
                          <td className="py-2">
                            {chartData.length >= 3 ? (chartData.slice(0, 3).reduce((sum, data) => sum + data.kamForecast, 0) / 1000).toFixed(0) : '0'}
                          </td>
                          <td className="py-2">
                            {chartData.length >= 6 ? (chartData.slice(3, 6).reduce((sum, data) => sum + data.kamForecast, 0) / 1000).toFixed(0) : '0'}
                          </td>
                          <td className="py-2">
                            {chartData.length >= 9 ? (chartData.slice(6, 9).reduce((sum, data) => sum + data.kamForecast, 0) / 1000).toFixed(0) : '0'}
                          </td>
                          <td className="py-2">
                            {chartData.length >= 12 ? (chartData.slice(9, 12).reduce((sum, data) => sum + data.kamForecast, 0) / 1000).toFixed(0) : '0'}
                          </td>
                          <td className="py-2 font-semibold">
                            {(kamForecastTotal / 1000).toFixed(0)}
                          </td>
                        </tr>
                        {/* Last Year Row */}
                        <tr>
                          <td className="py-2">
                            {chartData.length >= 3 ? (chartData.slice(0, 3).reduce((sum, data) => sum + data.lastYear, 0) / 1000).toFixed(0) : '0'}
                          </td>
                          <td className="py-2">
                            {chartData.length >= 6 ? (chartData.slice(3, 6).reduce((sum, data) => sum + data.lastYear, 0) / 1000).toFixed(0) : '0'}
                          </td>
                          <td className="py-2">
                            {chartData.length >= 9 ? (chartData.slice(6, 9).reduce((sum, data) => sum + data.lastYear, 0) / 1000).toFixed(0) : '0'}
                          </td>
                          <td className="py-2">
                            {chartData.length >= 12 ? (chartData.slice(9, 12).reduce((sum, data) => sum + data.lastYear, 0) / 1000).toFixed(0) : '0'}
                          </td>
                          <td className="py-2 font-semibold">
                            {(lastYearTotal / 1000).toFixed(0)}
                          </td>
                        </tr>
                        {/* Growth Percentage Row */}
                        <tr className="text-sm">
                          <td className="py-2">
                            <div className={`flex items-center justify-center gap-1 ${
                              chartData.length >= 3 && chartData.slice(0, 3).reduce((sum, data) => sum + data.effectiveForecast, 0) > 
                              chartData.slice(0, 3).reduce((sum, data) => sum + data.lastYear, 0) ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {chartData.length >= 3 && chartData.slice(0, 3).reduce((sum, data) => sum + data.effectiveForecast, 0) > 
                               chartData.slice(0, 3).reduce((sum, data) => sum + data.lastYear, 0) ? 
                               <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                              {chartData.length >= 3 ? ((chartData.slice(0, 3).reduce((sum, data) => sum + data.effectiveForecast, 0) - 
                                 chartData.slice(0, 3).reduce((sum, data) => sum + data.lastYear, 0)) /
                                 Math.max(chartData.slice(0, 3).reduce((sum, data) => sum + data.lastYear, 0), 1) * 100).toFixed(1) : '0.0'}%
                            </div>
                          </td>
                          <td className="py-2">
                            <div className={`flex items-center justify-center gap-1 ${
                              chartData.length >= 6 && chartData.slice(3, 6).reduce((sum, data) => sum + data.effectiveForecast, 0) > 
                              chartData.slice(3, 6).reduce((sum, data) => sum + data.lastYear, 0) ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {chartData.length >= 6 && chartData.slice(3, 6).reduce((sum, data) => sum + data.effectiveForecast, 0) > 
                               chartData.slice(3, 6).reduce((sum, data) => sum + data.lastYear, 0) ? 
                               <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                              {chartData.length >= 6 ? ((chartData.slice(3, 6).reduce((sum, data) => sum + data.effectiveForecast, 0) - 
                                 chartData.slice(3, 6).reduce((sum, data) => sum + data.lastYear, 0)) /
                                 Math.max(chartData.slice(3, 6).reduce((sum, data) => sum + data.lastYear, 0), 1) * 100).toFixed(1) : '0.0'}%
                            </div>
                          </td>
                          <td className="py-2">
                            <div className={`flex items-center justify-center gap-1 ${
                              chartData.length >= 9 && chartData.slice(6, 9).reduce((sum, data) => sum + data.effectiveForecast, 0) > 
                              chartData.slice(6, 9).reduce((sum, data) => sum + data.lastYear, 0) ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {chartData.length >= 9 && chartData.slice(6, 9).reduce((sum, data) => sum + data.effectiveForecast, 0) > 
                               chartData.slice(6, 9).reduce((sum, data) => sum + data.lastYear, 0) ? 
                               <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                              {chartData.length >= 9 ? ((chartData.slice(6, 9).reduce((sum, data) => sum + data.effectiveForecast, 0) - 
                                 chartData.slice(6, 9).reduce((sum, data) => sum + data.lastYear, 0)) /
                                 Math.max(chartData.slice(6, 9).reduce((sum, data) => sum + data.lastYear, 0), 1) * 100).toFixed(1) : '0.0'}%
                            </div>
                          </td>
                          <td className="py-2">
                            <div className={`flex items-center justify-center gap-1 ${
                              chartData.length >= 12 && chartData.slice(9, 12).reduce((sum, data) => sum + data.effectiveForecast, 0) > 
                              chartData.slice(9, 12).reduce((sum, data) => sum + data.lastYear, 0) ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {chartData.length >= 12 && chartData.slice(9, 12).reduce((sum, data) => sum + data.effectiveForecast, 0) > 
                               chartData.slice(9, 12).reduce((sum, data) => sum + data.lastYear, 0) ? 
                               <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                              {chartData.length >= 12 ? ((chartData.slice(9, 12).reduce((sum, data) => sum + data.effectiveForecast, 0) - 
                                 chartData.slice(9, 12).reduce((sum, data) => sum + data.lastYear, 0)) /
                                 Math.max(chartData.slice(9, 12).reduce((sum, data) => sum + data.lastYear, 0), 1) * 100).toFixed(1) : '0.0'}%
                            </div>
                          </td>
                          <td className={`py-2 font-semibold ${
                            salesTrends.growthPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {salesTrends.growthPercentage >= 0 ? '+' : ''}{salesTrends.growthPercentage.toFixed(1)}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-orange-700">M8.predict</div>
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    </div>
                    <div className="text-xl font-bold text-orange-800">
                      {m8PredictTotal.toLocaleString('es-MX')}
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-purple-700">KAM Forecast</div>
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    </div>
                    <div className="text-xl font-bold text-purple-800">
                      {kamForecastTotal.toLocaleString('es-MX')}
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-green-700">Effective</div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="text-xl font-bold text-green-800">
                      {effectiveForecastTotal.toLocaleString('es-MX')}
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-blue-700">Growth vs LY</div>
                      <div className={`h-3 w-3 rounded-full ${
                        salesTrends.trendDirection === 'up' ? 'bg-green-500' : 
                        salesTrends.trendDirection === 'down' ? 'bg-red-500' : 'bg-gray-500'
                      }`}></div>
                    </div>
                    <div className={`text-xl font-bold ${
                      salesTrends.trendDirection === 'up' ? 'text-green-600' : 
                      salesTrends.trendDirection === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {salesTrends.growthPercentage >= 0 ? '+' : ''}{salesTrends.growthPercentage.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Recharts ComposedChart with Multiple Y-Axis */}
                <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">Forecast Analysis with Multiple Y-Axis</h3>
                      <p className="text-sm text-gray-600">Bars & Area: Valores absolutos (Left) | Line: Crecimiento vs año anterior % (Right)</p>
                    </div>
                    
                    {/* Series Toggle Controls */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => toggleSeriesVisibility('m8Predict')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-all ${
                          chartSeriesVisible.m8Predict 
                            ? 'bg-orange-50 text-orange-700 border border-orange-300' 
                            : 'bg-gray-100 text-gray-400 border border-gray-300'
                        }`}
                      >
                        <div 
                          className={`w-3 h-3 rounded ${chartSeriesVisible.m8Predict ? '' : 'bg-gray-300'}`}
                          style={{ backgroundColor: chartSeriesVisible.m8Predict ? chartSeriesColors.m8Predict : undefined }}
                        ></div>
                        M8.predict
                      </button>
                      
                      <button
                        onClick={() => toggleSeriesVisibility('kamForecast')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-all ${
                          chartSeriesVisible.kamForecast 
                            ? 'bg-purple-50 text-purple-700 border border-purple-300' 
                            : 'bg-gray-100 text-gray-400 border border-gray-300'
                        }`}
                      >
                        <div 
                          className={`w-3 h-3 rounded ${chartSeriesVisible.kamForecast ? '' : 'bg-gray-300'}`}
                          style={{ backgroundColor: chartSeriesVisible.kamForecast ? chartSeriesColors.kamForecast : undefined }}
                        ></div>
                        KAM Forecast
                      </button>
                      
                      <button
                        onClick={() => toggleSeriesVisibility('effectiveForecast')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-all ${
                          chartSeriesVisible.effectiveForecast 
                            ? 'bg-green-50 text-green-700 border border-green-300' 
                            : 'bg-gray-100 text-gray-400 border border-gray-300'
                        }`}
                      >
                        <div 
                          className={`w-3 h-3 rounded ${chartSeriesVisible.effectiveForecast ? '' : 'bg-gray-300'}`}
                          style={{ backgroundColor: chartSeriesVisible.effectiveForecast ? chartSeriesColors.effectiveForecast : undefined }}
                        ></div>
                        Effective
                      </button>
                      
                      <button
                        onClick={() => toggleSeriesVisibility('lastYear')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-all ${
                          chartSeriesVisible.lastYear 
                            ? 'bg-blue-50 text-blue-700 border border-blue-300' 
                            : 'bg-gray-100 text-gray-400 border border-gray-300'
                        }`}
                      >
                        <div 
                          className={`w-3 h-3 rounded ${chartSeriesVisible.lastYear ? '' : 'bg-gray-300'}`}
                          style={{ backgroundColor: chartSeriesVisible.lastYear ? chartSeriesColors.lastYear : undefined }}
                        ></div>
                        Last Year
                      </button>
                      
                      <button
                        onClick={() => toggleSeriesVisibility('growthLine')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-all ${
                          chartSeriesVisible.growthLine 
                            ? 'bg-red-50 text-red-700 border border-red-300' 
                            : 'bg-gray-100 text-gray-400 border border-gray-300'
                        }`}
                      >
                        <div 
                          className={`w-3 h-3 rounded-full ${chartSeriesVisible.growthLine ? '' : 'bg-gray-300'}`}
                          style={{ backgroundColor: chartSeriesVisible.growthLine ? chartSeriesColors.growthLine : undefined }}
                        ></div>
                        Growth %
                      </button>
                    </div>
                  </div>
                  
                  {/* Recharts ComposedChart */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <ComposedChart
                      width={800}
                      height={400}
                      data={chartData}
                      margin={{
                        top: 20,
                        right: 60,
                        bottom: 20,
                        left: 60,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="displayMonth" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      
                      {/* Left Y-Axis for Values */}
                      <YAxis 
                        yAxisId="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#3b82f6' }}
                        tickFormatter={(value) => value.toLocaleString('es-MX', { notation: 'compact' })}
                        label={{ value: 'Values (MX$)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#3b82f6', fontSize: '12px', fontWeight: 'bold' } }}
                      />
                      
                      {/* Right Y-Axis for Growth % */}
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#dc2626' }}
                        tickFormatter={(value) => `${value.toFixed(1)}%`}
                        label={{ value: 'Growth %', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#dc2626', fontSize: '12px', fontWeight: 'bold' } }}
                      />
                      
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px'
                        }}
                        labelStyle={{ color: '#1f2937', fontWeight: 'bold' }}
                        formatter={(value, name) => [
                          typeof value === 'number' ? (
                            name === 'growthPercentage' 
                              ? `${value.toFixed(1)}%` 
                              : value.toLocaleString('es-MX')
                          ) : value,
                          name === 'm8Predict' ? 'M8.predict' :
                          name === 'kamForecast' ? 'KAM Forecast' :
                          name === 'effectiveForecast' ? 'Effective' :
                          name === 'lastYear' ? 'Last Year' :
                          name === 'growthPercentage' ? 'Growth %' : name
                        ]}
                      />
                      
                      <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="rect"
                        wrapperStyle={{ fontSize: '12px', paddingBottom: '20px' }}
                      />

                      {/* Area Chart for Last Year (Background) */}
                      {chartSeriesVisible.lastYear && (
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="lastYear"
                          stroke={chartSeriesColors.lastYear}
                          fill={`${chartSeriesColors.lastYear}30`}
                          strokeWidth={2}
                          fillOpacity={0.3}
                          name="Last Year"
                        />
                      )}

                      {/* Bar Charts for Forecasts */}
                      {chartSeriesVisible.m8Predict && (
                        <Bar
                          yAxisId="left"
                          dataKey="m8Predict"
                          fill={chartSeriesColors.m8Predict}
                          name="M8.predict"
                          radius={[2, 2, 0, 0]}
                          opacity={0.8}
                        />
                      )}
                      
                      {chartSeriesVisible.kamForecast && (
                        <Bar
                          yAxisId="left"
                          dataKey="kamForecast"
                          fill={chartSeriesColors.kamForecast}
                          name="KAM Forecast"
                          radius={[2, 2, 0, 0]}
                          opacity={0.8}
                        />
                      )}
                      
                      {chartSeriesVisible.effectiveForecast && (
                        <Bar
                          yAxisId="left"
                          dataKey="effectiveForecast"
                          fill={chartSeriesColors.effectiveForecast}
                          name="Effective"
                          radius={[2, 2, 0, 0]}
                          opacity={0.8}
                        />
                      )}

                      {/* Line Chart for Growth Percentage */}
                      {chartSeriesVisible.growthLine && (
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="growthPercentage"
                          stroke={chartSeriesColors.growthLine}
                          strokeWidth={3}
                          dot={{ 
                            fill: chartSeriesColors.growthLine, 
                            strokeWidth: 2, 
                            stroke: '#ffffff',
                            r: 5 
                          }}
                          activeDot={{ 
                            r: 8, 
                            fill: chartSeriesColors.growthLine,
                            stroke: '#ffffff',
                            strokeWidth: 2
                          }}
                          name="Growth %"
                        />
                      )}

                      {/* Scatter plot for additional data points if needed */}
                      {chartSeriesVisible.growthLine && (
                        <Scatter
                          yAxisId="right"
                          dataKey="growthPercentage"
                          fill={chartSeriesColors.growthLine}
                          opacity={0.6}
                        />
                      )}
                    </ComposedChart>
                  </div>
                  
                  {/* Chart Description */}
                  <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <strong>Cómo leer este gráfico:</strong>
                        <ul className="mt-1 space-y-1 text-xs">
                          <li>• <strong>Área azul:</strong> Datos del año anterior como referencia</li>
                          <li>• <strong>Barras:</strong> Diferentes tipos de pronósticos (eje izquierdo)</li>
                          <li>• <strong>Línea roja:</strong> Porcentaje de crecimiento vs año anterior (eje derecho)</li>
                          <li>• <strong>Puntos de datos:</strong> Valores específicos de crecimiento por mes</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

         
        </CardContent>
      </Card>

      {/* Sales Trends Collapsible Panel */}
      <Collapsible 
        open={isCollapsibleOpen} 
        onOpenChange={setIsCollapsibleOpen}
        className="mb-6"
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Tendencias de Ventas</CardTitle>
                {isCollapsibleOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Current Period Sales */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Ventas Período Actual</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {salesTrends.currentPeriod.toLocaleString('es-MX')}
                        </p>
                      </div>
                      <div className="text-blue-500">
                        <TrendingUp className="h-8 w-8" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Last Year Sales */}
                <Card className="border-l-4 border-l-gray-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Ventas Año Anterior</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {salesTrends.lastYearPeriod.toLocaleString('es-MX')}
                        </p>
                      </div>
                      <div className="text-gray-500">
                        <Minus className="h-8 w-8" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Growth Percentage */}
                <Card className={`border-l-4 ${
                  salesTrends.trendDirection === 'up' 
                    ? 'border-l-green-500' 
                    : salesTrends.trendDirection === 'down' 
                    ? 'border-l-red-500' 
                    : 'border-l-gray-500'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Crecimiento vs Año Anterior</p>
                        <p className={`text-2xl font-bold ${
                          salesTrends.trendDirection === 'up' 
                            ? 'text-green-600' 
                            : salesTrends.trendDirection === 'down' 
                            ? 'text-red-600' 
                            : 'text-gray-600'
                        }`}>
                          {salesTrends.growthPercentage.toFixed(1)}%
                        </p>
                      </div>
                      <div className={`${
                        salesTrends.trendDirection === 'up' 
                          ? 'text-green-500' 
                          : salesTrends.trendDirection === 'down' 
                          ? 'text-red-500' 
                          : 'text-gray-500'
                      }`}>
                        {salesTrends.trendDirection === 'up' ? (
                          <TrendingUp className="h-8 w-8" />
                        ) : salesTrends.trendDirection === 'down' ? (
                          <TrendingDown className="h-8 w-8" />
                        ) : (
                          <Minus className="h-8 w-8" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Forecast Collaboration Data
              {(selectedProduct || selectedLocation || selectedCustomer) ? (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  - Filtrado por: 
                  {selectedProduct && (
                    <span className="ml-1">Producto: {selectedProduct.product_id}</span>
                  )}
                  {selectedLocation && (
                    <span className="ml-1">
                      {selectedProduct ? ', ' : ''}
                      Ubicación: {selectedLocation.location_code}
                    </span>
                  )}
                  {selectedCustomer && (
                    <span className="ml-1">
                      {(selectedProduct || selectedLocation) ? ', ' : ''}
                      Cliente: {selectedCustomer.description} ({selectedCustomer.customer_code})
                    </span>
                  )}
                </span>
              ) : null}
            </CardTitle>
            {saving && (
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <span>Guardando ajustes del KAM...</span>
              </div>
            )}
          </div>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="text-blue-600 mt-0.5">
                ℹ️
              </div>
              <div className="text-sm text-blue-800">
                <strong>Ajustes del KAM:</strong> Haz doble clic en las celdas de "Ajustes del KAM" ✏️ para editarlas. 
                Los cambios se guardan automáticamente en la base de datos. 
                Al editar el total, los valores se distribuyen proporcionalmente entre todos los clientes.
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[80vh] max-w-full relative">
            {filterLoading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-700">Actualizando datos...</p>
                </div>
              </div>
            )}
            
            {/* Show message when no filters are selected */}
            {!hasActiveFilters() ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Selecciona filtros para ver los datos
                </h3>
                <p className="text-gray-600 max-w-md">
                  Para mostrar la tabla de datos de colaboración de pronósticos, selecciona al menos un filtro en las opciones de arriba (Producto, Ubicación, Cliente, Rango de fechas o Filtros Avanzados).
                </p>
              </div>
            ) : (
              /* Grid Container - Only show when filters are active */
              <div 
                className="forecast-grid min-w-[1800px]" 
                style={{
                  display: 'grid',
                  gridTemplateColumns: `150px 120px 120px 180px repeat(${months.length}, 90px) 270px 270px 270px`,
                  gap: '1px',
                  backgroundColor: '#d1d5db' // Border color
                }}
              >
              {/* Header Row */}
              <div className="sticky top-0 bg-gray-200 border-gray-300 p-2 text-left font-semibold text-xs z-10">
                Cliente
              </div>
              <div className="sticky top-0 bg-gray-200 border-gray-300 p-2 text-left font-semibold text-xs z-10">
                Producto
              </div>
              <div className="sticky top-0 bg-gray-200 border-gray-300 p-2 text-left font-semibold text-xs z-10">
                Tipo
              </div>
              <div className="sticky top-0 bg-gray-200 border-gray-300 p-2 text-center font-semibold text-xs z-10">
                Detalle
              </div>
              {months.map(month => (
                <div 
                  key={month} 
                  className={`sticky top-0 p-2 text-center font-semibold text-xs z-10 ${
                    month.includes('24') ? 'bg-yellow-200' : 'bg-blue-200'
                  }`}
                >
                  {month}
                </div>
              ))}
              
              {/* New summary columns */}
              <div className="sticky top-0 bg-purple-200 border-gray-300 p-2 text-center font-semibold text-xs z-10">
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-center">YTD</div>
                  <div className="text-center">YTG</div>
                  <div className="text-center">Total</div>
                </div>
                <div className="text-center mt-1 font-bold">Cajas</div>
              </div>
              <div className="sticky top-0 bg-green-200 border-gray-300 p-2 text-center font-semibold text-xs z-10">
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-center">YTD</div>
                  <div className="text-center">YTG</div>
                  <div className="text-center">Total</div>
                </div>
                <div className="text-center mt-1 font-bold">Litros</div>
              </div>
              <div className="sticky top-0 bg-orange-200 border-gray-300 p-2 text-center font-semibold text-xs z-10">
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-center">YTD</div>
                  <div className="text-center">YTG</div>
                  <div className="text-center">Total</div>
                </div>
                <div className="text-center mt-1 font-bold">Pesos</div>
              </div>
              
              {/* Grid Body Content - properly structured */}
            {/* Todos los clientes section */}
            {(!selectedCustomerId || selectedCustomerId === 'all') && (
              <>
              <div className="contents" hidden={false}>
                {/* Row 1: Año pasado (LY) */}
                <div className="contents">
                  <div className="bg-gray-100 p-2 font-bold text-sm">
                    Todos los clientes
                  </div>
                  <div className="bg-gray-100 p-1 text-xs">
                    {selectedProduct?.product_id ? selectedProduct.product_id : 'Todos los productos'}
                  </div>
                  <div className="bg-gray-100 p-1 text-xs">
                    Año pasado (LY)
                  </div>
                  <div className="bg-gray-100 p-1 text-xs">
                    Histórico
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.last_year : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-last-year`} 
                                 className={`p-1 text-right text-xs ${
                                   month.includes('24') ? 'bg-yellow-200' : 'bg-gray-100'
                                 }`}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>  

                {/* Row 2: Gap Forecast vs ventas */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-100 p-1 text-xs">
                    {/* Gap Forecast vs ventas */} Sell in AA
                  </div>
                  <div className="bg-gray-100 p-1 text-xs">
                    Sell-in quantity
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.sell_in_aa : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-sell-in-aa`} 
                                 className={`p-1 text-right text-xs ${
                                   month.includes('24') ? 'bg-yellow-100' : 'bg-gray-100'
                                 }`}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 3: Sell Out AA */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Sell Out AA
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Sell-out value
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.sell_out_aa : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-sell-out-aa`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 4: Sell Out real */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Sell Out real
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Sell-out real value
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.sell_out_real : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-sell-out-real`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 5: KAM Forecast - Editable */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-purple-100 p-1 text-xs z-10">
                    Proyectado - Equipo CPFR
                  </div>
                  <div className=" bg-purple-100 p-1 text-xs z-10">
                   -
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.xamview : 0);
                          }, 0);
                          
                          const isEditing = inlineEditingCell?.customerId === 'all' && inlineEditingCell?.month === month;
                          
                          return (
                            <div key={`all-${month}-cpfr-forecast`} 
                                 className="p-1 text-right text-xs"
                                 style={{ 
                                   backgroundColor: totalValue > 0 ? '#c3e7eeff' : (month.includes('24') ? '#fef3c7' : '#dbeafe')
                                 }}>
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={inlineEditingValue}
                                  onChange={(e) => setInlineEditingValue(e.target.value)}
                                  onKeyDown={(e) => handleInlineKeyPress(e, 'all', month)}
                                  onBlur={() => handleInlineEditSave('all', month)}
                                  className="w-full text-xs border-0 bg-transparent focus:outline-none focus:ring-0 text-right"
                                  autoFocus
                                />
                              ) : (
                                formatValue(totalValue)
                              )}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 6: Sales Manager View */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-purple-100 p-1 text-xs z-10">
                    Días de inventario
                  </div>
                  <div className=" bg-purple-100 p-1 text-xs z-10">
                    Plan de ventas (SM)
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.sales_manager_view : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-sales-manager`} 
                                 className={`p-1 text-right text-xs ${
                                   month.includes('24') ? 'bg-yellow-50' : 'bg-blue-50'
                                 }`}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 7: Effective Forecast */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-green-100 p-1 text-xs z-10">
                    Periodo Frezze
                  </div>
                  <div className=" bg-green-100 p-1 text-xs z-10">
                    Forecast
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.effective_forecast : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-effective`} 
                                 className={`p-1 text-right text-xs ${
                                   month.includes('24') ? 'bg-yellow-100' : 'bg-green-100'
                                 }`}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>
              </div>
                {/* Row 8: Last estimate */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Last estimate
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Estimado
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.xamview : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-estimate`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 9: Fcst Estadístico - BY */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Fcst Estadístico - BY
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Statistical Forecast
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.calculated_forecast : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-fcst-estadistico`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 10: PPTO */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    PPTO
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Presupuesto
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.calculated_forecast : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-ppto`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 11: Comparativas vs AA y vs PPTO */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Comparativas vs AA y vs PPTO
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Comparatives
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.calculated_forecast : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-comparativas`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 12: Volumen 3 meses anteriores */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Volumen 3 meses anteriores
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Volume 3M Previous
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.sell_out_aa : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-volumen-3m`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 13: Ajustes del KAM */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-blue-100 p-1 text-left text-xs whitespace-nowrap overflow-hidden text-ellipsis z-10">
                    Ajustes del KAM
                  </div>
                  <div className=" bg-blue-100 p-1 text-xs whitespace-nowrap overflow-hidden text-ellipsis z-10">
                    KAM Adjustments
                  </div>
                  {months.map(month => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    // Show the original forecast commercial_input values from forecast_data
                    const totalForecastCommercialInput = customersToUse.reduce((sum, customer) => {
                      const monthData = customer.months[month];
                      return sum + (monthData ? monthData.forecast_commercial_input : 0);
                    }, 0);
                    
                    // For display, use the current KAM adjustment values
                    const totalKamValue = customersToUse.reduce((sum, customer) => {
                      const monthData = customer.months[month];
                      return sum + (monthData ? monthData.kam_forecast_correction : 0);
                    }, 0);
                    
                    return (
                      <div 
                        key={`all-${month}-kam-adjustments`} 
                        className={`p-1 text-right text-xs ${
                          month.includes('24') ? 'bg-yellow-100' : 'bg-blue-100'
                        }`}
                        title={`Total KAM Adjustments: ${totalKamValue.toLocaleString('es-MX')}`}
                      >
                        <div className="space-y-1">
                          {/* <div className="text-gray-600 text-xs">
                            Orig: {totalForecastCommercialInput ? totalForecastCommercialInput.toLocaleString('es-MX') : '0'}
                          </div> */}
                          <div className="inline-flex items-center gap-1 font-medium">
                            {totalKamValue ? totalKamValue.toLocaleString('es-MX') : '0'}
                            {totalKamValue > 0 && <span className="text-blue-600 opacity-75">📊</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {renderSummaryColumns(
                    selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers
                  )}
                </div>

                {/* Row 14: Building blocks */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Building blocks
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Building Blocks
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.calculated_forecast : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-building-blocks`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 15: PCI diferenciado por canal */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    PCI diferenciado por canal
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    PCI by Channel
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.calculated_forecast : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-pci-canal`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 16: SI VENTA 2024 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    SI VENTA 2024
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    Sell-in Sales 2024
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          // Only show values for 2024 months
                          const shouldShowValue = month.includes('24');
                          const totalValue = shouldShowValue ? customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.si_venta_2024 || 0 : 0);
                          }, 0) : 0;
                          
                          return (
                            <div key={`all-${month}-si-venta-2024`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('24') ? '#dbeafe' : '#f3f4f6' }}>
                              {shouldShowValue ? formatValue(totalValue) : ''}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 17: SI 2025 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    SI 2025
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    Sell-in 2025
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          // Only show values for 2025 months
                          const shouldShowValue = month.includes('25');
                          const totalValue = shouldShowValue ? customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.si_2025 || 0 : 0);
                          }, 0) : 0;
                          
                          return (
                            <div key={`all-${month}-si-2025`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('25') ? '#dbeafe' : '#f3f4f6' }}>
                              {shouldShowValue ? formatValue(totalValue) : ''}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 18: SO 2024 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    SO 2024
                  </div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    Sell-out 2024
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          // Only show values for 2024 months
                          const shouldShowValue = month.includes('24');
                          const totalValue = shouldShowValue ? customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.so_2024 || 0 : 0);
                          }, 0) : 0;
                          
                          return (
                            <div key={`all-${month}-so-2024`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#f3f4f6' }}>
                              {shouldShowValue ? formatValue(totalValue) : ''}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 19: SO 2025 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    SO 2025
                  </div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    Sell-out 2025
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          // Only show values for 2025 months
                          const shouldShowValue = month.includes('25');
                          const totalValue = shouldShowValue ? customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.so_2025 || 0 : 0);
                          }, 0) : 0;
                          
                          return (
                            <div key={`all-${month}-so-2025`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('25') ? '#fef3c7' : '#f3f4f6' }}>
                              {shouldShowValue ? formatValue(totalValue) : ''}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 20: DDI Totales */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    DDI Totales
                  </div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    DDI Totals
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.ddi_totales || 0 : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-ddi-totales`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#dcfce7' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 21: SI PIN 2025 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    SI PIN 2025
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    Sell-in PIN 2025
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.si_pin_2025 || 0 : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-si-pin-2025`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('25') ? '#dbeafe' : '#f3f4f6' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 22: LE-1 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    LE-1
                  </div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    Latest Estimate -1
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.le_1 || 0 : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-le-1`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 23: SI PIN 2026 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    SI PIN 2026
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    Sell-in PIN 2026
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.si_pin_2026 || 0 : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-si-pin-2026`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('26') ? '#dbeafe' : '#f3f4f6' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 24: % PIN vs AA-1 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fde68a] p-1 text-xs z-10">
                    % PIN vs AA-1
                  </div>
                  <div className="bg-[#fde68a] p-1 text-xs z-10">
                    PIN vs AA-1 Percentage
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.pin_vs_aa_1 || 0 : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-pin-vs-aa-1`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#fde68a' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 25: PPTO 2025 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    PPTO 2025
                  </div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    Budget 2025
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.ppto_2025 || 0 : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-ppto-2025`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('25') ? '#dcfce7' : '#f3f4f6' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 26: PPTO 2026 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    PPTO 2026
                  </div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    Budget 2026
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.ppto_2026 || 0 : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-ppto-2026`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('26') ? '#dcfce7' : '#f3f4f6' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 27: % PIN 26 vs AA 25 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fde68a] p-1 text-xs z-10">
                    % PIN 26 vs AA 25
                  </div>
                  <div className="bg-[#fde68a] p-1 text-xs z-10">
                    PIN 26 vs AA 25 %
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.pin_26_vs_aa_25 || 0 : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-pin-26-vs-aa-25`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('26') ? '#fde68a' : '#f3f4f6' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 28: % PIN 26 vs PPTO 26 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fde68a] p-1 text-xs z-10">
                    % PIN 26 vs PPTO 26
                  </div>
                  <div className="bg-[#fde68a] p-1 text-xs z-10">
                    PIN 26 vs PPTO 26 %
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.pin_26_vs_ppto_26 || 0 : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-pin-26-vs-ppto-26`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('26') ? '#fde68a' : '#f3f4f6' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 29: PIN SEP */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e0e7ff] p-1 text-xs z-10">
                    PIN SEP
                  </div>
                  <div className="bg-[#e0e7ff] p-1 text-xs z-10">
                    PIN September
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.pin_sep || 0 : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-pin-sep`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('sep') ? '#e0e7ff' : '#f3f4f6' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 30: % PIN SEP vs PIN */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fde68a] p-1 text-xs z-10">
                    % PIN SEP vs PIN
                  </div>
                  <div className="bg-[#fde68a] p-1 text-xs z-10">
                    PIN SEP vs PIN %
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.pin_sep_vs_pin || 0 : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-pin-sep-vs-pin`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('sep') ? '#fde68a' : '#f3f4f6' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 31: KAM 26 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    KAM 26
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    KAM 2026
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.kam_26 || 0 : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-kam-26`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('26') ? '#dbeafe' : '#f3f4f6' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 32: BY 26 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    BY 26
                  </div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    Budget Year 2026
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.by_26 || 0 : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-by-26`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('26') ? '#fef3c7' : '#f3f4f6' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 33: BB 26 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    BB 26
                  </div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    Building Blocks 2026
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.bb_26 || 0 : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-bb-26`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('26') ? '#dcfce7' : '#f3f4f6' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

                {/* Row 34: PCI 26 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e0e7ff] p-1 text-xs z-10">
                    PCI 26
                  </div>
                  <div className="bg-[#e0e7ff] p-1 text-xs z-10">
                    PCI 2026
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.pci_26 || 0 : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-pci-26`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: month.includes('26') ? '#e0e7ff' : '#f3f4f6' }}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse)}
                      </>
                    );
                  })()}
                </div>

              {/*  Row 35: KAM Approval
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-purple-100 p-1 text-xs z-10">
                    KAM aprobado
                  </div>
                  <div className=" bg-purple-100 p-1 text-xs z-10">
                    Aprobación
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => (
                          <div key={`all-${month}-kam-approval`} 
                               className="p-1 text-center text-xs bg-purple-50">
                            <select 
                              className="w-full text-xs border-0 bg-transparent focus:outline-none focus:ring-0"
                              defaultValue=""
                              onChange={(e) => {
                                customersToUse.forEach(customer => {
                                  handleKamApprovalChange(customer.customer_node_id, month, e.target.value);
                                });
                              }}
                            >
                              <option value="">-</option>
                              <option value="Si">Si</option>
                              <option value="No">No</option>
                            </select>
                          </div>
                        ))}
                        
                         Summary columns for KAM Approval - showing approvals count
                        <div className="bg-green-200 border-gray-300 p-2 text-center text-xs">
                          <div className="grid grid-cols-3 gap-1 text-xs">
                            <div>-</div>
                            <div>-</div>
                            <div>-</div>
                          </div>
                        </div>
                        <div className="bg-orange-200 border-gray-300 p-2 text-center text-xs">
                          <div className="grid grid-cols-3 gap-1 text-xs">
                            <div>-</div>
                            <div>-</div>
                            <div>-</div>
                          </div>
                        </div>
                        <div className="bg-purple-200 border-gray-300 p-2 text-center text-xs">
                          <div className="grid grid-cols-3 gap-1 text-xs">
                            <div>-</div>
                            <div>-</div>
                            <div>-</div>
                          </div>
                        </div>
                      </>
                    );
                  })()} 
                </div>*/}
              </>
            )} 
            


            {/* Individual customer sections */}
            {filteredCustomers().map((customer, customerIndex) => (
              <React.Fragment key={`${customer.customer_node_id}-${customer.product_id}`}>
                {/* Row 1: Año pasado (LY) */}
                <div className="contents">
                  <div className="bg-gray-100 p-2 font-bold text-sm">
                    {customer.customer_name}
                  </div>
                  <div className="bg-gray-100 p-1 text-xs">
                    <div className="font-medium">{customer.product_id || 'No producto'}</div>
                    {customer.product_name && (
                      <div className="text-gray-600 mt-1">{customer.product_name}</div>
                    )}
                  </div>
                  <div className="bg-gray-100 p-1 text-xs">
                    Año pasado (LY)
                  </div>
                  <div className="bg-gray-100 p-1 text-xs">
                    Histórico
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.last_year : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-last-year`} 
                           className={`p-1 text-right text-xs ${
                             month.includes('24') ? 'bg-yellow-50' : 'bg-blue-50'
                           }`}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>
                
                {/* Row 2: Sell in AA */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-gray-100 p-1 text-xs z-10">
                    Sell in AA
                  </div>
                  <div className=" bg-gray-100 p-1 text-xs z-10">
                    Sell-in quantity
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.sell_in_aa : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-sell-in-aa`} 
                           className={`p-1 text-right text-xs ${
                             month.includes('24') ? 'bg-yellow-100' : 'bg-gray-100'
                           }`}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 3: Sell Out AA */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Sell Out AA
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Sell-out value
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.sell_out_aa : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-sell-out-aa`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 4: Sell Out real */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Sell Out real
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Real Sell-out
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.sell_out_real : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-sell-out-real`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 5: Proyectado - Equipo CPFR */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Proyectado - Equipo CPFR
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    CPFR Projection
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.xamview : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-cpfr`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 6: Días de inventario */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Días de inventario
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Inventory Days
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.inventory_days : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-inventory-days`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 7: Periodo Frezze */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Periodo Frezze
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Freeze Period
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.calculated_forecast : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-freeze`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 8: Last estimate */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Last estimate
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Estimado
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.xamview : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-estimate`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 9: Fcst Estadístico - BY */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Fcst Estadístico - BY
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Statistical Forecast
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.calculated_forecast : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-fcst-estadistico`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 10: PPTO */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    PPTO
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Presupuesto
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.calculated_forecast : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-ppto`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 11: Comparativas vs AA y vs PPTO */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Comparativas vs AA y vs PPTO
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Comparatives
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.calculated_forecast : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-comparativas`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 12: Volumen 3 meses anteriores */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Volumen 3 meses anteriores
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Volume 3M Previous
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.sell_out_aa : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-volumen-3m`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 13: Ajustes del KAM */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-blue-100 p-1 text-left text-xs whitespace-nowrap overflow-hidden text-ellipsis z-10">
                    Ajustes del KAM ✏️
                  </div>
                  <div className=" bg-blue-100 p-1 text-xs whitespace-nowrap overflow-hidden text-ellipsis z-10">
                    KAM Adjustments ✏️
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const kamValue = monthData ? monthData.kam_forecast_correction : 0;
                    const forecastCommercialInput = monthData ? monthData.forecast_commercial_input : 0;
                    const isEditing = inlineEditingCell?.customerId === customer.customer_node_id && inlineEditingCell?.month === month;
                    
                    return (
                      <div 
                        key={`${customer.customer_node_id}-${customer.product_id}-${month}-kam-adjustments`} 
                        className={`p-1 text-right text-xs cursor-pointer hover:bg-blue-200 transition-colors ${
                          month.includes('24') ? 'bg-yellow-100' : 'bg-blue-100'
                        }`}
                        onDoubleClick={() => handleInlineEditStart(customer.customer_node_id, month, kamValue)}
                        title={`Original Forecast Commercial Input: ${forecastCommercialInput.toLocaleString('es-MX')} | Double-click to edit KAM adjustment for ${customer.customer_name}`}
                      >
                        {isEditing ? (
                          <input
                            type="number"
                            value={inlineEditingValue}
                            onChange={(e) => setInlineEditingValue(e.target.value)}
                            onBlur={() => handleInlineEditSave(customer.customer_node_id, month)}
                            onKeyPress={(e) => handleInlineKeyPress(e, customer.customer_node_id, month)}
                            className="w-full bg-white border border-blue-500 rounded px-1 py-0 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-300"
                            autoFocus
                            disabled={saving}
                          />
                        ) : (
                          <div className="space-y-1">
                            {/* <div className="text-gray-600 text-xs" style={{ display: 'none' }}>
                              Orig: {forecastCommercialInput !== undefined && forecastCommercialInput !== null ? forecastCommercialInput.toLocaleString('es-MX') : '0'}
                            </div> */}
                            <div className="inline-flex items-center gap-1 font-medium">
                              {kamValue ? kamValue.toLocaleString('es-MX') : '0'}
                              {kamValue > 0 && <span className="text-blue-600 opacity-75">✏️</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 14: Building blocks */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Building blocks
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    Building Blocks
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.calculated_forecast : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-building-blocks`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 15: PCI diferenciado por canal */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    PCI diferenciado por canal
                  </div>
                  <div className=" bg-[#ffebd4] p-1 text-xs z-10">
                    PCI by Channel
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.calculated_forecast : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-pci-canal`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 16: SI VENTA 2024 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    SI VENTA 2024
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    Sell-in Sales 2024
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const shouldShowValue = month.includes('24');
                    const value = shouldShowValue ? (monthData ? monthData.si_venta_2024 || 0 : 0) : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-si-venta-2024`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('24') ? '#dbeafe' : '#f3f4f6' }}>
                        {shouldShowValue ? formatValue(value) : ''}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 17: SI 2025 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    SI 2025
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    Sell-in 2025
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const shouldShowValue = month.includes('25');
                    const value = shouldShowValue ? (monthData ? monthData.si_2025 || 0 : 0) : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-si-2025`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('25') ? '#dbeafe' : '#f3f4f6' }}>
                        {shouldShowValue ? formatValue(value) : ''}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 18: SO 2024 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    SO 2024
                  </div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    Sell-out 2024
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const shouldShowValue = month.includes('24');
                    const value = shouldShowValue ? (monthData ? monthData.so_2024 || 0 : 0) : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-so-2024`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#f3f4f6' }}>
                        {shouldShowValue ? formatValue(value) : ''}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 19: SO 2025 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    SO 2025
                  </div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    Sell-out 2025
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const shouldShowValue = month.includes('25');
                    const value = shouldShowValue ? (monthData ? monthData.so_2025 || 0 : 0) : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-so-2025`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('25') ? '#fef3c7' : '#f3f4f6' }}>
                        {shouldShowValue ? formatValue(value) : ''}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 20: DDI Totales */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    DDI Totales
                  </div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    DDI Totals
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.ddi_totales || 0 : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-ddi-totales`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#dcfce7' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 21: SI PIN 2025 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    SI PIN 2025
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    Sell-in PIN 2025
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.si_pin_2025 || 0 : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-si-pin-2025`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('25') ? '#dbeafe' : '#f3f4f6' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 22: LE-1 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    LE-1
                  </div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    Latest Estimate -1
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.le_1 || 0 : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-le-1`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#ffebd4' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 23: SI PIN 2026 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    SI PIN 2026
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    Sell-in PIN 2026
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.si_pin_2026 || 0 : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-si-pin-2026`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('26') ? '#dbeafe' : '#f3f4f6' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 24: % PIN vs AA-1 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fde68a] p-1 text-xs z-10">
                    % PIN vs AA-1
                  </div>
                  <div className="bg-[#fde68a] p-1 text-xs z-10">
                    PIN vs AA-1 Percentage
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.pin_vs_aa_1 || 0 : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-pin-vs-aa-1`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('24') ? '#fef3c7' : '#fde68a' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 25: PPTO 2025 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    PPTO 2025
                  </div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    Budget 2025
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.ppto_2025 || 0 : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-ppto-2025`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('25') ? '#dcfce7' : '#f3f4f6' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 26: PPTO 2026 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    PPTO 2026
                  </div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    Budget 2026
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.ppto_2026 || 0 : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-ppto-2026`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('26') ? '#dcfce7' : '#f3f4f6' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 27: % PIN 26 vs AA 25 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fde68a] p-1 text-xs z-10">
                    % PIN 26 vs AA 25
                  </div>
                  <div className="bg-[#fde68a] p-1 text-xs z-10">
                    PIN 26 vs AA 25 %
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.pin_26_vs_aa_25 || 0 : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-pin-26-vs-aa-25`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('26') ? '#fde68a' : '#f3f4f6' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 28: % PIN 26 vs PPTO 26 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fde68a] p-1 text-xs z-10">
                    % PIN 26 vs PPTO 26
                  </div>
                  <div className="bg-[#fde68a] p-1 text-xs z-10">
                    PIN 26 vs PPTO 26 %
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.pin_26_vs_ppto_26 || 0 : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-pin-26-vs-ppto-26`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('26') ? '#fde68a' : '#f3f4f6' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 29: PIN SEP */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e0e7ff] p-1 text-xs z-10">
                    PIN SEP
                  </div>
                  <div className="bg-[#e0e7ff] p-1 text-xs z-10">
                    PIN September
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.pin_sep || 0 : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-pin-sep`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('sep') ? '#e0e7ff' : '#f3f4f6' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 30: % PIN SEP vs PIN */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fde68a] p-1 text-xs z-10">
                    % PIN SEP vs PIN
                  </div>
                  <div className="bg-[#fde68a] p-1 text-xs z-10">
                    PIN SEP vs PIN %
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.pin_sep_vs_pin || 0 : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-pin-sep-vs-pin`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('sep') ? '#fde68a' : '#f3f4f6' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 31: KAM 26 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    KAM 26
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    KAM 2026
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.kam_26 || 0 : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-kam-26`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('26') ? '#dbeafe' : '#f3f4f6' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 32: BY 26 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    BY 26
                  </div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    Budget Year 2026
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.by_26 || 0 : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-by-26`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('26') ? '#fef3c7' : '#f3f4f6' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 33: BB 26 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    BB 26
                  </div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    Building Blocks 2026
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.bb_26 || 0 : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-bb-26`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('26') ? '#dcfce7' : '#f3f4f6' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 34: PCI 26 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e0e7ff] p-1 text-xs z-10">
                    PCI 26
                  </div>
                  <div className="bg-[#e0e7ff] p-1 text-xs z-10">
                    PCI 2026
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.pci_26 || 0 : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-pci-26`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('26') ? '#e0e7ff' : '#f3f4f6' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer)}
                </div>

                {/* Row 35: KAM Approval
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className=" bg-purple-100 p-1 text-xs z-10">
                    KAM aprobado
                  </div>
                  <div className=" bg-purple-100 p-1 text-xs z-10">
                    Aprobación
                  </div>
                  {months.map(month => {
                    const currentValue = kamApprovals[customer.customer_node_id]?.[month] || '';
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-kam-approval`} 
                           className="p-1 text-center text-xs bg-purple-50">
                        <select 
                          className="w-full text-xs border-0 bg-transparent focus:outline-none focus:ring-0"
                          value={currentValue}
                          onChange={(e) => handleKamApprovalChange(customer.customer_node_id, month, e.target.value)}
                        >
                          <option value="">-</option>
                          <option value="Si">Si</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    );
                  })} */}
                {/* </div> */}
              </React.Fragment>
            ))}
              </div>
            )}
          </div>
          
          {/* Edit Modal */}
          {editingCell && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-4">
                  Edit Kam Forecast
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Customer: {editingCell.customerId === 'all' ? 'Todos los clientes' : customerNames[editingCell.customerId]}
                  </label>
                  <label className="block text-sm font-medium mb-2">
                    Month: {editingCell.month}
                  </label>
                  <input 
                    type="number" 
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    className="w-full p-2 border rounded"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button 
                    onClick={() => setEditingCell(null)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleInlineEditSave(editingCell?.customerId || '', editingCell?.month || '')}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default ForecastCollaboration;
