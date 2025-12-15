
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, SelectionChangedEvent } from 'ag-grid-community';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Package, MapPin, Filter, Truck, X, Calendar, Users, Search, Eye, Rows, Building2, Tag, Package2 } from 'lucide-react';
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
  attr_1?: number; // Used for litros multiplier
  attr_2?: number; // Used for peso multiplier
  attr_3?: number; // Used for cajas multiplier (CRITICAL for Cajas display!)
  months: { [key: string]: {
    forecast_sales_gap: number;
    calculated_forecast: number;
    kam_forecast_correction: number;
    effective_forecast: number;
    forecast_commercial_input: number; // Original commercial_input from forecast_data (approved_sm_kam)
    actual_by_m8: number; // Actual values from commercial_collaboration_view.actual for M8 Predict
    // New fields for the requested rows
    kam_26?: number;
    by_26?: number;
    
  }};
  // Store actual postdate mapping from month name to database postdate
  monthPostdates?: { [key: string]: string };
}



const ForecastCollaboration: React.FC = () => {
  // Helper function to format numbers, showing zeros but not null/undefined
  const formatValue = (value: number | null | undefined): string => {
    return (value !== null && value !== undefined) ? value.toLocaleString('es-MX') : '';
  };

  // ===== MONTH FORMATTING AND UTILITIES =====
  
  // Month names in Spanish (full names for display)
  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  // Helper function to convert between full month names and abbreviated keys
  const getDataKeyForMonth = useCallback((month: string, year?: number, customerData?: any): string => {
    const monthMap: { [key: string]: string } = {
      'enero': 'ene',
      'febrero': 'feb',
      'marzo': 'mar',
      'abril': 'abr',
      'mayo': 'may',
      'junio': 'jun',
      'julio': 'jul',
      'agosto': 'ago',
      'septiembre': 'sep',
      'octubre': 'oct',
      'noviembre': 'nov',
      'diciembre': 'dic'
    };
    
    const shortMonth = monthMap[month];
    if (!shortMonth) return month; // fallback
    
    // If year is provided, use it
    if (year) {
      return `${shortMonth}-${String(year).slice(-2)}`;
    }
    
    // If customer data is provided, try to find the best matching key
    if (customerData?.months) {
      const possibleKeys = Object.keys(customerData.months).filter(key => key.startsWith(shortMonth));
      if (possibleKeys.length > 0) {
        // Return the first match, or prioritize current year
        const currentYearKey = `${shortMonth}-${String(new Date().getFullYear()).slice(-2)}`;
        return possibleKeys.includes(currentYearKey) ? currentYearKey : possibleKeys[0];
      }
    }
    
    // Fallback to current year format
    const currentYear = new Date().getFullYear();
    return `${shortMonth}-${String(currentYear).slice(-2)}`;
  }, []);
  
  // Helper function to format month display (convert ene-25 to Enero)
  const formatMonthDisplay = (month: string): string => {
    // If it's already a full name, return it capitalized
    if (monthNames.includes(month.toLowerCase())) {
      return month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
    }
    
    // Convert abbreviated format (ene-25) to full name (Enero)
    const monthMap: { [key: string]: string } = {
      'ene': 'Enero',
      'feb': 'Febrero',
      'mar': 'Marzo',
      'abr': 'Abril',
      'may': 'Mayo',
      'jun': 'Junio',
      'jul': 'Julio',
      'ago': 'Agosto',
      'sep': 'Septiembre',
      'oct': 'Octubre',
      'nov': 'Noviembre',
      'dic': 'Diciembre'
    };
    
    // Extract the month abbreviation from formats like 'oct-24' or 'oct'
    const monthPart = month.split('-')[0].toLowerCase();
    return monthMap[monthPart] || month;
  };

  // Helper function to map business row types to their corresponding data field names
  const getFieldNameForRowType = (rowType: string): string => {
    const fieldMapping: { [key: string]: string } = {
      // Basic forecast fields
      'Forecast M8.predict': 'calculated_forecast',
      'Key Account Manager': 'kam_forecast_correction',
      'Kam Forecast': 'kam_forecast_correction',
      'Effective Forecast': 'effective_forecast',
      'KAM aprobado': 'xamview',
      
      // Individual row fields - these should match exactly what's displayed in the UI
      
      'Fcst Estadístico - BY': 'calculated_forecast',
      'Ajustes del KAM': 'kam_forecast_correction',
      'KAM A + 1': 'kam_forecast_correction', // KAM adjustments for next year
      
      // 2026 planning fields
      'KAM 26': 'kam_26',
      
      // M8 Predict fields
      'M8 Predict': 'actual_by_m8',
      
      // Legacy mappings for backward compatibility
      'Fcst Estadístico': 'calculated_forecast',

      'KAM': 'kam',
      'BY': 'by',
      
    };
    
    return fieldMapping[rowType] || 'calculated_forecast'; // fallback to calculated_forecast
  };

  // Helper function to calculate YTD for a specific row/field
  const calculateCustomerYTD = (customer: CustomerData, attribute: 'attr_1' | 'attr_2' | 'attr_3', fieldName?: string): number => {
    // For Cajas (attr_3), we don't need the attribute value since values are already in cajas units
    // For Litros (attr_1) and Pesos (attr_2), we need the attribute multiplier
    if (attribute !== 'attr_3' && !customer[attribute]) {
      return 0;
    }
    
    // ALWAYS use only the specific field for the current row
    // This ensures each row's Cajas/Litros/Pesos values correspond to that row's actual data
    // If no fieldName provided, fallback to calculated_forecast
    const rowValuesToUse = fieldName ? [fieldName] : ['calculated_forecast'];

    // Get all month keys and sort them chronologically
    const monthKeys = Object.keys(customer.months).sort((a, b) => {
      const [monthA, yearA] = a.split('-');
      const [monthB, yearB] = b.split('-');
      const monthOrder = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      const yearDiff = parseInt(yearA) - parseInt(yearB);
      if (yearDiff !== 0) return yearDiff;
      return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
    });

    // Get ALL 12 months (YTD = Year To Date = ALL 12 months)
    const allTwelveMonths = monthKeys; // All 12 months
    
    let total = 0;
    let totalRawSum = 0; // Track total before multiplication to check if we should return 0
    let debugInfo: any[] = [];
    
    // Sum ALL 12 months for YTD
    allTwelveMonths.forEach(monthKey => {
      const monthData = customer.months[monthKey];
      if (monthData) {
        let monthTotal = 0;
        rowValuesToUse.forEach(field => {
          const fieldValue = (monthData[field as keyof typeof monthData] || 0);
          monthTotal += fieldValue;
        });
        
        // Track total raw sum to determine if we should show 0
        totalRawSum += monthTotal;
        
        // Special handling for DDI (Days of Inventory) - never multiply by attributes since it's a time metric
        const isDDI = rowValuesToUse.some(field => field === 'ddi_totales' || field === 'inventory_days');
        
        if (isDDI) {
          // For DDI, use raw values directly - days should not be multiplied by attributes
          total += monthTotal;
        } else if (attribute === 'attr_3') {
          // For Cajas (attr_3), values are already in cajas units - no multiplication needed
          total += monthTotal;
        } else {
          // For Litros (attr_1) and Pesos (attr_2), multiply by their respective attributes
          const multiplier = customer[attribute] || 0;
          const contribution = monthTotal * multiplier;
          total += contribution;
        }
        
        if (monthTotal > 0) {
          debugInfo.push({ 
            month: monthKey, 
            rawSum: monthTotal,
            multiplier: attribute === 'attr_3' ? 1 : (customer[attribute] || 0),
            contribution: attribute === 'attr_3' ? monthTotal : monthTotal * (customer[attribute] || 0),
            fieldsUsed: rowValuesToUse 
          });
        }
      }
    });
    
    // 🔧 FIX: If the total raw sum is 0, return 0 regardless of multipliers
    // This prevents showing misleading values when there's no actual data
    if (totalRawSum === 0) {
      return 0;
    }
    
    return total;
  };

  // Helper function to calculate YTG for a specific row/field
  const calculateCustomerYTG = (customer: CustomerData, attribute: 'attr_1' | 'attr_2' | 'attr_3', fieldName?: string): number => {
    // For Cajas (attr_3), we don't need the attribute value since values are already in cajas units
    // For Litros (attr_1) and Pesos (attr_2), we need the attribute multiplier
    if (attribute !== 'attr_3' && !customer[attribute]) return 0;
    
    // ALWAYS use only the specific field for the current row
    // This ensures each row's Cajas/Litros/Pesos values correspond to that row's actual data
    // If no fieldName provided, fallback to calculated_forecast
    const rowValuesToUse = fieldName ? [fieldName] : ['calculated_forecast'];

    // Get all month keys and sort them chronologically
    const monthKeys = Object.keys(customer.months).sort((a, b) => {
      // Sort by month-year format (e.g., "ene-25", "feb-25", etc.)
      const [monthA, yearA] = a.split('-');
      const [monthB, yearB] = b.split('-');

      const monthOrder = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      const yearDiff = parseInt(yearA) - parseInt(yearB);
      
      if (yearDiff !== 0) return yearDiff;
      return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
    });
    
    // Get the last 3 months from the sorted array (YTG = Year To Go = last 3 months)
    const lastThreeMonths = monthKeys.slice(-3);
    
    let total = 0;
    let totalRawSum = 0; // Track total before multiplication to check if we should return 0
    let debugInfo: any[] = [];
    
    lastThreeMonths.forEach(monthKey => {
      const monthData = customer.months[monthKey];
      if (monthData) {
        let monthTotal = 0;
        rowValuesToUse.forEach(field => {
          const fieldValue = (monthData[field as keyof typeof monthData] || 0);
          monthTotal += fieldValue;
        });
        
        // Track total raw sum to determine if we should show 0
        totalRawSum += monthTotal;
        
        // Special handling for DDI (Days of Inventory) - never multiply by attributes since it's a time metric
        const isDDI = rowValuesToUse.some(field => field === 'ddi_totales' || field === 'inventory_days');
        
        if (isDDI) {
          // For DDI, use raw values directly - days should not be multiplied by attributes
          total += monthTotal;
        } else if (attribute === 'attr_3') {
          // For Cajas (attr_3), values are already in cajas units - no multiplication needed
          total += monthTotal;
        } else {
          // For Litros (attr_1) and Pesos (attr_2), multiply by their respective attributes
          const multiplier = customer[attribute] || 0;
          const contribution = monthTotal * multiplier;
          total += contribution;
        }
        
        if (monthTotal > 0) {
          debugInfo.push({ 
            month: monthKey, 
            rawSum: monthTotal,
            multiplier: attribute === 'attr_3' ? 1 : (customer[attribute] || 0),
            contribution: attribute === 'attr_3' ? monthTotal : monthTotal * (customer[attribute] || 0),
            fieldsUsed: rowValuesToUse 
          });
        }
      }
    });
    
    // 🔧 FIX: If the total raw sum is 0, return 0 regardless of multipliers
    // This prevents showing misleading values when there's no actual data
    if (totalRawSum === 0) {
      return 0;
    }
    
    return total;
  };

  // Helper function to calculate Total (YTD + YTG)
  const calculateCustomerTotal = (customer: CustomerData, attribute: 'attr_1' | 'attr_2' | 'attr_3', fieldName?: string): number => {
    const ytd = calculateCustomerYTD(customer, attribute, fieldName);
    const ytg = calculateCustomerYTG(customer, attribute, fieldName);
    return ytd + ytg;
  };

  // Helper function to calculate aggregate values for "Todos los clientes" using individual customer logic
  const calculateAggregateForAllCustomers = (customersToUse: CustomerData[], attribute: 'attr_1' | 'attr_2' | 'attr_3', calculationType: 'YTD' | 'YTG' | 'Total', fieldName?: string) => {
    // 🔧 SIMPLIFIED APPROACH: Just aggregate individual customer calculations
    // This ensures consistency with individual customer display
    let total = 0;
    let customersWithData = 0;
    let totalRawSum = 0; // Track total raw field values across all customers
    let detailDebug: any[] = [];
    
    customersToUse.forEach((customer, index) => {
      let customerValue = 0;
      let customerRawSum = 0; // Track raw field sum for this customer
      
      if (calculationType === 'YTD') {
        customerValue = calculateCustomerYTD(customer, attribute, fieldName);
      } else if (calculationType === 'YTG') {
        customerValue = calculateCustomerYTG(customer, attribute, fieldName);
      } else { // Total
        customerValue = calculateCustomerTotal(customer, attribute, fieldName);
      }
      
      // Calculate raw field sum for this customer to understand the issue
      if (fieldName) {
        const monthKeys = Object.keys(customer.months);
        monthKeys.forEach(monthKey => {
          const monthData = customer.months[monthKey];
          if (monthData) {
            const fieldValue = monthData[fieldName as keyof typeof monthData] || 0;
            if (calculationType === 'YTD') {
              customerRawSum += fieldValue; // All months for YTD
            } else if (calculationType === 'YTG') {
              // Last 3 months logic for YTG - simplified for debugging
              customerRawSum += fieldValue;
            } else { // Total
              customerRawSum += fieldValue; // This will be YTD + YTG raw sum
            }
          }
        });
        totalRawSum += customerRawSum;
      }
      
      total += customerValue;
      
      if (customerValue !== 0) {
        customersWithData++;
        if (detailDebug.length < 5) { // Log first 5 customers with data
          detailDebug.push({
            customer: customer.customer_name,
            attribute,
            calculationType,
            fieldName,
            value: customerValue,
            rawFieldSum: customerRawSum,
            multiplier: customer[attribute],
            attr_1: customer.attr_1,
            attr_2: customer.attr_2,
            attr_3: customer.attr_3,
            monthsAvailable: Object.keys(customer.months).length
          });
        }
      }
    });
    
    return total;
  };

  // Helper function to render summary columns for aggregate rows
  const renderSummaryColumns = (customersToUse: CustomerData[], rowType: string = "calculated_forecast") => {
    // Get the specific field name for this row type
    const fieldName = getFieldNameForRowType(rowType);

    // Special handling for rows that only consider specific year months
    const isCurrentYearOnly = rowType === "M8 Predict" || rowType === "Sell in Actual" || rowType === "SI Actual" || rowType === "Sell Out Actual";
    
    let sumCajasYTD, sumLitrosYTD, sumPesosYTD;
    let sumCajasYTG, sumLitrosYTG, sumPesosYTG;
    let sumCajasTotal, sumLitrosTotal, sumPesosTotal;
    
    if (isCurrentYearOnly) {
      // For M8 Predict, calculate sums only for the correct year based on row type
      let targetYear: number;
      if (rowType === "M8 Predict") {
        targetYear = new Date().getFullYear(); // 2025 for M8 Predict
      } else {
        targetYear = new Date().getFullYear(); // 2025 for other current year rows
      }
      
      const calculateCurrentYearSum = (attribute: 'attr_1' | 'attr_2' | 'attr_3') => {
        return customersToUse.reduce((total, customer) => {
          let customerTotal = 0;
          Object.keys(customer.months).forEach(monthKey => {
            if (shouldShowValueForYear(monthKey, targetYear)) {
              const monthData = customer.months[monthKey];
              if (monthData && fieldName) {
                const fieldValue = monthData[fieldName as keyof typeof monthData] || 0;
                
                if (attribute === 'attr_3') {
                  // Cajas: use raw values (already in cajas units)
                  customerTotal += fieldValue;
                } else {
                  // Litros/Pesos: multiply by attribute multiplier
                  const multiplier = customer[attribute] || 0;
                  customerTotal += fieldValue * multiplier;
                }
              }
            }
          });
          return total + customerTotal;
        }, 0);
      };
      
      // For year-filtered rows, all values are the same since we only show specific year
      sumCajasYTD = sumCajasYTG = sumCajasTotal = calculateCurrentYearSum('attr_3');
      sumLitrosYTD = sumLitrosYTG = sumLitrosTotal = calculateCurrentYearSum('attr_1');
      sumPesosYTD = sumPesosYTG = sumPesosTotal = calculateCurrentYearSum('attr_2');
    } else {
      // For other row types, use the original calculation functions
      sumCajasYTD = calculateAggregateForAllCustomers(customersToUse, 'attr_3', 'YTD', fieldName);
      sumLitrosYTD = calculateAggregateForAllCustomers(customersToUse, 'attr_1', 'YTD', fieldName);
      sumPesosYTD = calculateAggregateForAllCustomers(customersToUse, 'attr_2', 'YTD', fieldName);

      sumCajasYTG = calculateAggregateForAllCustomers(customersToUse, 'attr_3', 'YTG', fieldName);
      sumLitrosYTG = calculateAggregateForAllCustomers(customersToUse, 'attr_1', 'YTG', fieldName);
      sumPesosYTG = calculateAggregateForAllCustomers(customersToUse, 'attr_2', 'YTG', fieldName);

      sumCajasTotal = calculateAggregateForAllCustomers(customersToUse, 'attr_3', 'Total', fieldName);
      sumLitrosTotal = calculateAggregateForAllCustomers(customersToUse, 'attr_1', 'Total', fieldName);
      sumPesosTotal = calculateAggregateForAllCustomers(customersToUse, 'attr_2', 'Total', fieldName);
    }

    return (
      <>
        {/* Cajas column */}
        <div className="bg-purple-200 border-gray-300 p-2 text-center text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-right text-[10px]">
              {formatValue(sumCajasYTD)}
            </div>
            <div className="text-right text-[10px]">
              {formatValue(sumCajasYTG)}
            </div>
            <div className="text-right text-[10px]">
              {formatValue(sumCajasTotal)}
            </div>
          </div>
        </div>
        
        {/* Litros column */}
        <div className="bg-green-200 border-gray-300 p-2 text-center text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-right text-[10px]">
              {formatValue(sumLitrosYTD)}
            </div>
            <div className="text-right text-[10px]">
              {formatValue(sumLitrosYTG)}
            </div>
            <div className="text-right text-[10px]">
              {formatValue(sumLitrosTotal)}
            </div>
          </div>
        </div>
        
        {/* Pesos column */}
        <div className="bg-orange-200 border-gray-300 p-2 text-center text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-right text-[10px]">
              {formatValue(sumPesosYTD)}
            </div>
            <div className="text-right text-[10px]">
              {formatValue(sumPesosYTG)}
            </div>
            <div className="text-right text-[10px]">
              {formatValue(sumPesosTotal)}
            </div>
          </div>
        </div>
      </>
    );
  };

  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [allCustomers, setAllCustomers] = useState<CustomerData[]>([]);
  const [rawForecastData, setRawForecastData] = useState<CommercialCollaborationData[]>([]);
  const [customerNames, setCustomerNames] = useState<{[key: string]: string}>({});
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Changed to false - no initial loading
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedData, setHasLoadedData] = useState(false); // Track if data has been loaded at least once
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
  // Removed noResultsFound and noResultsMessageDismissed - no longer needed
  const [clearingFilters, setClearingFilters] = useState(false);
  // Global debounce for KAM error notifications - only ONE KAM error toast allowed every 10 seconds
  const [lastKamErrorTime, setLastKamErrorTime] = useState<number>(0);

  const dataTypes = [
     'Forecast M8.predict', 
    'Kam Forecast',  'Effective Forecast', 'KAM aprobado',
      'Fcst Estadístico - BY', 'Ajustes del KAM', 'KAM A + 1',
    'KAM 26', 'BY 26'  ];

  // ===== HOOKS =====
  const { getProductName } = useProducts();
  const { getLocationName } = useLocations();
  const { getCustomerName, customers: allCustomersFromHook } = useCustomers();

  // Helper function to show KAM error with global debouncing
  const showKamError = useCallback((title: string, description: string, duration: number = 8000) => {
    const now = Date.now();
    const timeSinceLastError = now - lastKamErrorTime;
    
    // Only show if more than 10 seconds have passed since last KAM error
    if (timeSinceLastError > 10000) {
      setLastKamErrorTime(now);
      toast.error(title, {
        description,
        duration,
        closeButton: true,
      });
    }
  }, [lastKamErrorTime]);

  // Helper function for other error notifications (without KAM-specific debouncing)
  const showGeneralError = useCallback((title: string, description: string, duration: number = 5000) => {
    toast.error(title, {
      description,
      duration,
      closeButton: true,
    });
  }, []);

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
    effectiveForecast: false, // Hidden by default
    lastYear: false, // Hidden by default
    m8PredictArea: true,
    pci26Area: true,
    kamAdjustmentsArea: true,
    pptoA1Area: true,
    sellInLine: true,
    sellInActualLine: true,
    sellOutAALine: true,
    sellOutActualLine: true,
    ddiBar: true
  });

  // Chart series colors state
  const [chartSeriesColors, setChartSeriesColors] = useState({
    m8Predict: '#ea580c', // orange-600
    kamForecast: '#f59e0b', // purple-600
    effectiveForecast: '#059669', // green-600
    lastYear: '#2563eb', // blue-600
    m8PredictArea: '#f97316', // orange-500
    pci26Area: '#0ea5e9', // sky-500
    kamAdjustmentsArea: '#9333ea',  // violet-500
    pptoA1Area: '#ec4899', // pink-500
    sellInLine: '#71537fff', // violet-500
    sellInActualLine:'#ef669dff', // purple-500
    sellOutAALine: '#10b981', // emerald-500
    sellOutActualLine: '#14b8a6', // teal-500
    ddiBar: '#fb923c' // orange-400
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

  // Helper function to check if a value should be shown for a specific year in a row
  // Used for rows like "SI 2025", "SO 2024", etc. that should only show values for that specific year
  const shouldShowValueForYear = useCallback((month: string, requiredYear?: number): boolean => {
    // If no year is specified, use current year
    if (!requiredYear) {
      requiredYear = new Date().getFullYear();
    }
    
    // Extract year from month key (e.g., 'ene-25' -> 2025, 'oct-24' -> 2024)
    const yearPart = month.split('-')[1];
    if (!yearPart) return false;
    
    const monthYear = parseInt(yearPart) + (parseInt(yearPart) < 50 ? 2000 : 1900);
    
    // Only show value if month's year matches the required year
    return monthYear === requiredYear;
  }, []);

  // Generate all months based on selected date range or default to 12 months
  const allMonths = useMemo(() => {
    if (!selectedDateRange?.from || !selectedDateRange?.to) {
      // Default to October 2024 through September 2025 (12 months)
      return ['oct-24', 'nov-24', 'dic-24', 'ene-25', 'feb-25', 'mar-25', 
              'abr-25', 'may-25', 'jun-25', 'jul-25', 'ago-25', 'sep-25'];
    }
    
    // Generate months from the selected date range
    const startDate = new Date(selectedDateRange.from);
    const endDate = new Date(selectedDateRange.to);
    const months: string[] = [];
    
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const monthIndex = currentDate.getMonth();
      const year = currentDate.getFullYear();
      const monthAbbr = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 
                         'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][monthIndex];
      const yearShort = String(year).slice(-2);
      months.push(`${monthAbbr}-${yearShort}`);
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return months;
  }, [selectedDateRange]);
  
  // Filter months based on selected date range
  const months = useMemo(() => {
    if (!selectedDateRange?.from || !selectedDateRange?.to) {
      return allMonths;
    }
    
    return allMonths.filter(month => isMonthInDateRange(month, selectedDateRange));
  }, [selectedDateRange, isMonthInDateRange, allMonths]);

  // Helper function to get the month key for a given month index (0=January, 11=December)
  const getMonthKeyForIndex = useCallback((monthIndex: number): string => {
    const monthAbbreviations = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const currentYear = new Date().getFullYear();
    const monthAbbr = monthAbbreviations[monthIndex];
    
    // Determine year based on month - October through December are previous year, January through September are current year
    const year = monthIndex >= 9 ? currentYear - 1 : currentYear; // oct(9), nov(10), dic(11) are -1 year
    const yearShort = String(year).slice(-2);
    
    return `${monthAbbr}-${yearShort}`;
  }, []);

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
    // Note: This function is kept for FilterDropdown compatibility but is no longer needed
    // since filtering is now automatic via useEffect. Data fetching happens automatically
    // when filters change, so this function doesn't need to do anything.
  }, []);

  // Handler for advanced filters from FilterPanel
  // Updates filters immediately so selections are preserved and UI reflects changes
  // Data fetching is debounced in useEffect to allow multiple selections
  const handleAdvancedFiltersChange = useCallback((filters: any) => {
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

  // Helper function to get grouped header display name
  const getGroupedHeaderName = useCallback(() => {
    // Priority order: Marca > Línea de productos > Jerarquía de cliente > Default
    if (advancedFilters.marca && advancedFilters.marca.length > 0) {
      return `Marca: ${advancedFilters.marca.join(', ')}`;
    }
    if (advancedFilters.productLine && advancedFilters.productLine.length > 0) {
      return `Línea de productos: ${advancedFilters.productLine.join(', ')}`;
    }
    if (advancedFilters.clientHierarchy && advancedFilters.clientHierarchy.length > 0) {
      return `Jerarquía de cliente: ${advancedFilters.clientHierarchy.join(', ')}`;
    }
    return 'Todos los clientes';
  }, [advancedFilters]);

  // Function to clear customer selection specifically
  const clearCustomerSelection = useCallback(async () => {
    setAdvancedFilters(prev => ({
      ...prev,
      selectedCustomers: [],
      clientHierarchy: [] // Also clear client hierarchy
    }));
    
    // Reset state (removed noResultsMessageDismissed)
    
    toast.success('Selección de cliente eliminada', {
      description: 'La selección de cliente específico ha sido eliminada. Los datos se cargarán para todos los clientes.',
      duration: 3000,
      closeButton: true,
    });
  }, [advancedFilters.selectedCustomers]);

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

      // Reset state (removed noResultsMessageDismissed)
      
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

  // Function to fetch sell-out data from v_time_series_sell_out.value for "Sell Out real"

  // Function to fetch inventory data from inventory_transactions table
  const fetchInventoryData = useCallback(async () => {
    try {
      let query = (supabase as any)
        .schema('m8_schema')
        .from('inventory_transactions')
        .select('product_id, location_node_id, customer_node_id, postdate, eoh')
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

      // Apply marca and productLine filters for inventory data using limited approach to avoid URL length limits
      if (advancedFilters.marca && advancedFilters.marca.length > 0) {
        // Use a more efficient JOIN-based query to avoid URL length limits
        const { data, error } = await (supabase as any)
          .schema('m8_schema')
          .rpc('get_inventory_by_marca', {
            marca_names: advancedFilters.marca,
            date_from: '2024-10-01',
            date_to: '2025-12-31'
          });
        
        if (!error && data) {
          return data;
        } else {
          // Fallback: Use limited batch processing if RPC not available
          const { data: marcaData } = await (supabase as any)
            .schema('m8_schema')
            .from('products')
            .select('product_id')
            .in('subcategory_name', advancedFilters.marca)
            .limit(100); // Limit to prevent URL overflow
          
          if (marcaData && marcaData.length > 0) {
            const productIds = marcaData.map(item => item.product_id).slice(0, 50); // Further limit
            query = query.in('product_id', productIds);
          }
        }
      }

      if (advancedFilters.productLine && advancedFilters.productLine.length > 0) {
        // Use a more efficient JOIN-based query to avoid URL length limits  
        const { data, error } = await (supabase as any)
          .schema('m8_schema')
          .rpc('get_inventory_by_product_line', {
            product_line_names: advancedFilters.productLine,
            date_from: '2024-10-01',
            date_to: '2025-12-31'
          });
        
        if (!error && data) {
          return data;
        } else {
          // Fallback: Use limited batch processing if RPC not available
          const { data: productLineData } = await (supabase as any)
            .schema('m8_schema')
            .from('products')
            .select('product_id')
            .in('class_name', advancedFilters.productLine)
            .limit(100); // Limit to prevent URL overflow
          
          if (productLineData && productLineData.length > 0) {
            const productIds = productLineData.map(item => item.product_id).slice(0, 50); // Further limit
            query = query.in('product_id', productIds);
          }
        }
      }
      
      // Apply date range filter if selected
      if (selectedDateRange?.from && selectedDateRange?.to) {
        query = query.gte('postdate', selectedDateRange.from.toISOString().split('T')[0])
                   .lte('postdate', selectedDateRange.to.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;


      
      return data || [];
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      return [];
    }
  }, [selectedProduct?.product_id, selectedLocation?.location_id, selectedCustomer?.customer_id, selectedDateRange, advancedFilters]);

  const processForecastData = useCallback((rawData: CommercialCollaborationData[], customerNamesMap: {[key: string]: string}, dateFilter: DateRange | null = null, productAttributesMap: { [key: string]: { attr_1: number; attr_2: number; attr_3: number } } = {}, kamDataArray: any[] = []) => {
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
    
    // Track records with actual data for M8 Predict debugging
    let recordsWithActualData = 0;
    let totalActualSum = 0;
    
    rawData.forEach((row: CommercialCollaborationData) => {
      // Skip rows with null customer_node_id to prevent errors
      if (!row.customer_node_id) {
        skippedMainRows++;
        return;
      }
      
      // Track actual data for debugging
      if (row.actual && row.actual !== 0) {
        recordsWithActualData++;
        totalActualSum += row.actual;
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
            forecast_sales_gap: 0,
            calculated_forecast: 0,
            kam_forecast_correction: 0,
            effective_forecast: 0,
            forecast_commercial_input: 0,
            actual_by_m8: 0,
            // Initialize new fields
            kam_26: 0,
            by_26: 0,
           
          };
        }        // Add the values (this allows aggregation if multiple products exist for same customer/month)
        const monthData = groupedData[customerProductKey].months[displayMonth];
    
        monthData.forecast_sales_gap += row.forecast_sales_gap || 0;
        monthData.calculated_forecast += row.forecast || 0;
    
        monthData.kam_forecast_correction += row.sm_kam_override || 0; // KAM adjustments from sm_kam_override field
    
        monthData.effective_forecast += row.sm_kam_override || row.commercial_input || row.forecast || 0; // sm_kam_override takes priority
        monthData.forecast_commercial_input += row.approved_sm_kam || 0; // Original commercial_input from forecast_data
        // TEMPORARY FIX: Try using forecast field if actual is empty
        const m8PredictValue = row.actual || row.forecast || 0;
        monthData.actual_by_m8 += m8PredictValue;
        
        
      }
    });

    // Process sell-in data from v_time_series_sell_in.quantity
    
    // Process KAM adjustments from commercial_collaboration table

    
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
            forecast_sales_gap: 0,
            calculated_forecast: 0,
            kam_forecast_correction: 0,
            effective_forecast: 0,
            forecast_commercial_input: 0,
            actual_by_m8: 0,
            // Initialize new fields
            kam_26: 0,
            by_26: 0,
          };
        }
        
        // Log KAM value assignment for debugging
        const previousValue = groupedData[customerProductKey].months[displayMonth].kam_forecast_correction;
        const newValue = kamRow.sm_kam_override || kamRow.commercial_input || 0;
        

        
        // Set the KAM adjustment value (overwrite, don't add, since this is the adjustment value)
        // Priority: sm_kam_override > commercial_input for KAM adjustments
        groupedData[customerProductKey].months[displayMonth].kam_forecast_correction = newValue;
        
     
     
      }
    });

    // Process inventory data from inventory_transactions table for DDI Totales
    let skippedInventoryRows = 0;
    
    
    // Log summary of skipped rows to avoid console spam
    const totalSkipped = skippedMainRows +   skippedKamRows ;

 

    const finalCustomers = Object.values(groupedData);

    return Object.values(groupedData);
  }, []);

  // Helper function to check if a customer has meaningful data (non-zero values)
  const customerHasValues = useCallback((customer: CustomerData) => {
    // Check if any month has non-zero values for key metrics
    const hasValues = Object.values(customer.months).some(monthData => {
      if (!monthData) return false;
      
      // Check key metrics that should have meaningful values
      const keyMetrics = [
       'calculated_forecast', 'effective_forecast', 
        
        'kam_forecast_correction'
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



    return filtered;
  }, [advancedFilters, hasActiveFilters, customerHasValues]);

  // Cache for customer names to avoid repeated database calls
  const [customerNamesCache, setCustomerNamesCache] = useState<{[key: string]: string}>({});
  const [customerNamesLoaded, setCustomerNamesLoaded] = useState(false);
  



  // Debug function to diagnose FilterPanel vs ForecastCollaboration data mismatch
  const debugAdvancedFiltersDataFlow = useCallback(async () => {
    // Simplified debug function - removed excessive logging
  }, [advancedFilters]);

  // ...existing code...
  // All console.log and debug statements removed for production readiness
  // ...existing code...

  const fetchForecastData = useCallback(async (isFilterOperation = false) => {
    // Only show loading indicator after a delay to avoid aggressive UI updates
    // This makes the experience smoother when selecting multiple filters
    let loadingTimer: NodeJS.Timeout | null = null;
    
    try {
      // Run debugging if advanced filters are active
      await debugAdvancedFiltersDataFlow();
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
        // FIX: Use product.product_id instead of product.id
        productAttributesMap[product.product_id] = {
          attr_1: product.attr_1 || 0,
          attr_2: product.attr_2 || 0,
          attr_3: product.attr_3 || 0
        };
      });
      


      // Try to fetch forecast data using commercial_collaboration_view with error handling
      
      // OPTIMIZATION: Use more focused date range to improve performance  
      const optimizedDateFrom = selectedDateRange?.from ? 
        selectedDateRange.from.toISOString().split('T')[0] : 
        '2025-01-01'; // Include more historical data for M8 Predict
      const optimizedDateTo = selectedDateRange?.to ? 
        selectedDateRange.to.toISOString().split('T')[0] : 
        '2025-12-31';

      let query = (supabase as any)
        .schema('m8_schema')
        .from('commercial_collaboration_view')
        .select('customer_node_id,postdate,forecast_ly,forecast,approved_sm_kam,sm_kam_override,forecast_sales_manager,commercial_input,forecast_sales_gap,product_id,subcategory_id,location_node_id,actual')
        .gte('postdate', optimizedDateFrom)
        .lte('postdate', optimizedDateTo)
        .order('customer_node_id', { ascending: true })
        .order('postdate', { ascending: true })
        .limit(100); // Add reasonable limit to prevent runaway queries
     
      // Also fetch KAM adjustments and PPTO data from commercial_collaboration table
      let kamQuery = (supabase as any)
        .schema('m8_schema')
        .from('commercial_collaboration')
        .select('product_id,customer_node_id,location_node_id,postdate,commercial_input,commercial_notes,initial_sales_plan,sm_kam_override')
        .gte('postdate', optimizedDateFrom)
        .lte('postdate', optimizedDateTo)
        .order('customer_node_id', { ascending: true })
        .order('postdate', { ascending: true })
        .limit(50); // Smaller limit for KAM data

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

      // Declare variables for supply network filtering
      let locationNodeIds: string[] = [];
      let needsSupplyNetworkFilter = false;

      // Apply advanced filters from FilterPanel
      
      // Use pre-filtered products and supply network nodes from FilterPanel if available (more efficient)
      if (advancedFilters.selectedProducts && advancedFilters.selectedProducts.length > 0 &&
          advancedFilters.selectedSupplyNetworkNodeIds && advancedFilters.selectedSupplyNetworkNodeIds.length > 0) {
        
        // Apply both product and location filters from FilterPanel
        query = query.in('product_id', advancedFilters.selectedProducts);
        
        // Validate UUID format for location_node_id to prevent "TEST" error
        const validSupplyNetworkNodeIds = advancedFilters.selectedSupplyNetworkNodeIds.filter(id => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return id && uuidRegex.test(id);
        });
        
        if (validSupplyNetworkNodeIds.length > 0) {
          query = query.in('location_node_id', validSupplyNetworkNodeIds);
          kamQuery = kamQuery.in('location_node_id', validSupplyNetworkNodeIds);
        }
        kamQuery = kamQuery.in('product_id', advancedFilters.selectedProducts);
        
        // Set flag to skip redundant supply network filtering below
        needsSupplyNetworkFilter = false;
      }
      // Use only supply network nodes if FilterPanel found nodes but no products
      else if (advancedFilters.selectedSupplyNetworkNodeIds && advancedFilters.selectedSupplyNetworkNodeIds.length > 0 &&
               (!advancedFilters.selectedProducts || advancedFilters.selectedProducts.length === 0)) {
        
        // Apply only location filter - products will be determined by what exists in the data
        // Validate UUID format for location_node_id to prevent "TEST" error
        const validSupplyNetworkNodeIds = advancedFilters.selectedSupplyNetworkNodeIds.filter(id => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return id && uuidRegex.test(id);
        });
        
        if (validSupplyNetworkNodeIds.length > 0) {
          query = query.in('location_node_id', validSupplyNetworkNodeIds);
          kamQuery = kamQuery.in('location_node_id', validSupplyNetworkNodeIds);
        }
        
        // Set flag to skip redundant supply network filtering below
        needsSupplyNetworkFilter = false;
      }
      // Use FilterPanel's pre-filtered products when marca or productLine are selected
      else if (advancedFilters.selectedProducts && advancedFilters.selectedProducts.length > 0) {
        // console.log('✅ Using FilterPanel pre-filtered products:', {
        //   count: advancedFilters.selectedProducts.length,
        //   sample: advancedFilters.selectedProducts.slice(0, 5),
        //   marca: advancedFilters.marca,
        //   productLine: advancedFilters.productLine
        // });
        
        // Apply product filter from FilterPanel (already handles marca/productLine)
        query = query.in('product_id', advancedFilters.selectedProducts);
        kamQuery = kamQuery.in('product_id', advancedFilters.selectedProducts);
        
        // Set flag to skip redundant supply network filtering below
        needsSupplyNetworkFilter = false;
      }
      
      if (advancedFilters.selectedCustomers && advancedFilters.selectedCustomers.length > 0) {

        query = query.in('customer_node_id', advancedFilters.selectedCustomers);
        kamQuery = kamQuery.in('customer_node_id', advancedFilters.selectedCustomers);
      }
      
      // Apply date range filter if selected
      if (selectedDateRange?.from && selectedDateRange?.to) {
        const fromDate = selectedDateRange.from.toISOString().split('T')[0];
        const toDate = selectedDateRange.to.toISOString().split('T')[0];
        query = query.gte('postdate', fromDate).lte('postdate', toDate);
        kamQuery = kamQuery.gte('postdate', fromDate).lte('postdate', toDate);
      }

      // Check if FilterPanel has already provided pre-filtered supply network node IDs
      if (advancedFilters.selectedSupplyNetworkNodeIds && advancedFilters.selectedSupplyNetworkNodeIds.length > 0) {
        needsSupplyNetworkFilter = true;
        // Validate UUID format before assigning to prevent "TEST" being used as UUID
        locationNodeIds = advancedFilters.selectedSupplyNetworkNodeIds.filter(id => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return id && uuidRegex.test(id);
        });
      } 
      // Fallback to manual filtering if FilterPanel didn't provide pre-filtered IDs
      else if ((advancedFilters.canal && advancedFilters.canal.length > 0) ||
          (advancedFilters.clientHierarchy && advancedFilters.clientHierarchy.length > 0) ||
          (advancedFilters.agente && advancedFilters.agente.length > 0) ||
          (advancedFilters.umn && advancedFilters.umn.length > 0)) {
        needsSupplyNetworkFilter = true;

        let supplyNetworkQuery = (supabase as any)
          .schema('m8_schema')
          .from('supply_network_nodes')
          .select('id, node_name, client_hierarchy, channel, agente, udn')
          .eq('status', 'active');

        // Apply Canal filter - search nodes where channel matches selected values
        if (advancedFilters.canal && advancedFilters.canal.length > 0) {
          supplyNetworkQuery = supplyNetworkQuery.in('channel', advancedFilters.canal);
        }

        // Apply Jerarquía de Cliente filter - search nodes where client_hierarchy matches selected values  
        if (advancedFilters.clientHierarchy && advancedFilters.clientHierarchy.length > 0) {
          supplyNetworkQuery = supplyNetworkQuery.in('client_hierarchy', advancedFilters.clientHierarchy);
        }

        // Apply Agente filter - search nodes where agent matches selected values
        if (advancedFilters.agente && advancedFilters.agente.length > 0) {
          supplyNetworkQuery = supplyNetworkQuery.in('agente', advancedFilters.agente);
        }

        // Apply UDN filter - search nodes where udn matches selected values
        if (advancedFilters.udn && advancedFilters.udn.length > 0) {
          supplyNetworkQuery = supplyNetworkQuery.in('udn', advancedFilters.udn);
        }

        // Execute the supply network query to get matching location node IDs
        const { data: supplyNetworkData, error: supplyNetworkError } = await supplyNetworkQuery;

        if (supplyNetworkError) {
          console.error('Error fetching supply network data for filtering:', supplyNetworkError);
        } else if (supplyNetworkData && supplyNetworkData.length > 0) {
          // Get the supply_network_nodes.id values that match the criteria - these will be used to filter commercial_collaboration_view.location_node_id
          locationNodeIds = [...new Set(supplyNetworkData.map((item: any) => item.id).filter(Boolean))] as string[];
        } else {
          // If no matching records found, set empty array to prevent any results
          locationNodeIds = [];
        }
      }

      // Apply the location_node_id filter if supply network filtering was used
      if (needsSupplyNetworkFilter) {
        if (locationNodeIds.length > 0) {
          // Validate UUIDs to prevent "TEST" being passed as location_node_id
          const validLocationNodeIds = locationNodeIds.filter(id => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            return id && uuidRegex.test(id);
          });
          
          console.log('🔍 DEBUG: ForecastCollaboration locationNodeIds validation:', {
            original: locationNodeIds.length,
            valid: validLocationNodeIds.length
          });

          if (validLocationNodeIds.length > 0) {
            query = query.in('location_node_id', validLocationNodeIds);
            kamQuery = kamQuery.in('location_node_id', validLocationNodeIds);
          } else {
            console.warn('⚠️ No valid location_node_id UUIDs found, returning empty results');
            setRawForecastData([]);
            setCustomers([]);
            setAllCustomers([]);
            return;
          }
        } else {
          // No matching customers found, return empty results
          setRawForecastData([]);
          setCustomers([]);
          setAllCustomers([]);
          // Removed setNoResultsFound - no longer needed
          
          // Don't show toast here - let the main UI handle no data display
          
          return;
        }
      }

      // Execute both queries with error handling
      let data = null;
      let error = null;
      let kamData = null;
      let kamError = null;

      try {
        // Add query performance monitoring
        const queryStartTime = Date.now();
        // console.log('🔄 Starting main query execution...');
        
        const mainQueryResult = await query;
        
        const queryDuration = Date.now() - queryStartTime;
        // console.log(`⏱️ Main query completed in ${queryDuration}ms`);
        data = mainQueryResult.data;
        error = mainQueryResult.error;
        
        // Debug: Check actual field data in the query results
        if (data && data.length > 0) {
          interface CommercialCollaborationRow {
            customer_node_id: string;
            postdate: string;
            forecast_ly: number;
            forecast: number;
            approved_sm_kam: number;
            sm_kam_override: number;
            forecast_sales_manager: number;
            commercial_input: number;
            forecast_sales_gap: number;
            product_id: string;
            subcategory_id: string;
            location_node_id: string;
            actual: number | null | undefined;
          }

          const recordsWithActual: CommercialCollaborationRow[] = (data as CommercialCollaborationRow[]).filter(
            (row: CommercialCollaborationRow) => row.actual && row.actual !== 0
          );
          const recordsWithNullActual = data.filter(row => row.actual === null || row.actual === undefined);
          const recordsWithZeroActual = data.filter(row => row.actual === 0);
          
          
        }
        
        if (error) {
          console.error('commercial_collaboration_view query failed:', error);
          
          // Handle specific timeout errors with user-friendly messages
          if (error.code === '57014' || error.message?.includes('timeout') || error.message?.includes('canceling statement')) {
            throw new Error('⏰ La consulta tardó demasiado tiempo. Para mejorar el rendimiento:\n• Reduce el rango de fechas\n• Selecciona menos productos\n• Usa filtros más específicos (marca, cliente, etc.)');
          }
          
          // Try fallback to base table if view fails (but not for timeout errors)
          if (!error.message?.includes('timeout')) {
            console.log('🔄 Trying fallback query with limited results...');
            const fallbackQuery = (supabase as any)
              .schema('m8_schema')
              .from('commercial_collaboration')
              .select('customer_node_id,postdate,product_id,location_node_id,commercial_input, sm_kam_override,forecast,approved_sm_kam,forecast_sales_gap,actual')
              .gte('postdate', '2025-01-01') // Reduced date range for fallback
              .lte('postdate', '2025-12-31')
              .order('customer_node_id', { ascending: true })
              .order('postdate', { ascending: true })
              .limit(50); // Increased limit but still reasonable
            
            const fallbackResult = await fallbackQuery;
            if (fallbackResult.error) {
              console.error('Fallback query also failed:', fallbackResult.error);
              throw new Error(`Error en consulta principal: ${error.message}`);
            } else {
              console.log('✅ Fallback query succeeded with limited data');
              data = fallbackResult.data;
              error = null;
              
              // Notify user about limited data
              toast.warning('Datos limitados', {
                description: 'Se cargó un subconjunto de datos debido a problemas de rendimiento.',
                duration: 4000,
              });
            }
          } else {
            throw error;
          }
        } else {

          if (!data || data.length === 0) {

          }
        }
        
        // Execute KAM query
        const kamQueryResult = await kamQuery;
        kamData = kamQueryResult.data;
        kamError = kamQueryResult.error;
        
        if (kamError) {
          console.error('KAM query failed:', kamError);
          // KAM query failure is not critical, we can continue without it
          kamData = [];
          kamError = null;
        }
        
      } catch (queryError) {
        console.error('Query execution error:', queryError);
        
        // Provide specific error messages for different types of failures
        if (queryError.message?.includes('timeout') || 
            queryError.message?.includes('57014') ||
            queryError.message?.includes('canceling statement')) {
          throw new Error('⏰ Consulta cancelada por tiempo de espera. Intenta reducir filtros o rango de fechas.');
        }
        
        if (queryError.message?.includes('connection')) {
          throw new Error('🔌 Error de conexión con la base de datos. Verifica tu conexión a internet.');
        }
        
        throw queryError;
      }

      if (error) throw error;



      // Store raw data for filtering
      setRawForecastData(data || []);







      // Process the data using the new function with KAM and inventory data
      const allCustomersData = processForecastData(data || [], customerNamesMap, selectedDateRange, kamData || []);


      const finalCustomersData = allCustomersData;
      
      // Apply client-side advanced filters
      const advancedFilteredData = applyAdvancedFilters(finalCustomersData);
      
      // Check if no results were found - show toast notification and keep table with zeros
      const hasActiveFiltersNow = hasActiveFilters();
      const noDataFound = advancedFilteredData.length === 0;
      
      // Removed noResultsFound logic - no longer needed
      // Data loading is now handled inline in the UI
      setError(null); // Clear any previous error state
      
      setAllCustomers(finalCustomersData);
      setCustomers(advancedFilteredData);
      setHasLoadedData(true); // Mark that data has been loaded successfully
      

      
      // Check if all values in "Todos los clientes" are 0
      // Only check when there are customers but all their values are zero
      if (advancedFilteredData.length > 0 && isFilterOperation) {
        // Calculate totals for main metrics
        const allCustomersTotals = {
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
         
        };
        
        // Check if all main totals are 0
        const allTotalsZero = 
        
          allCustomersTotals.calculatedForecast === 0 &&
          allCustomersTotals.effectiveForecast === 0 &&
          allCustomersTotals.kamForecast === 0 ;
        

        
        // Don't show toast for zero totals - let the main UI handle empty state display
        if (!allTotalsZero) {
          // If there are values, reset the dismissed flag so toast can show again if needed
          // Removed setNoResultsMessageDismissed
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
      
      // Don't set noResultsFound for errors - let user try different filters
      // setNoResultsFound(true);
    } finally {
      setLoading(false);
      setFilterLoading(false);
      // Clear loading timer if it was set
      if (loadingTimer) {
        clearTimeout(loadingTimer);
      }
    }
  }, [processForecastData, selectedProduct?.product_id, selectedLocation?.location_id, selectedCustomer?.customer_id, selectedDateRange, advancedFilters, customerNamesCache, customerNamesLoaded, applyAdvancedFilters, months]);

  // Function to manually refresh data
  const manualRefreshData = useCallback(() => {
    // Removed setNoResultsMessageDismissed
    fetchForecastData(true);
  }, [fetchForecastData]);

  // Removed dismissNoResultsMessage function - no longer needed

  // NOTE: Removed initial data fetching useEffect to improve page load performance
  // Data will only be fetched when filters are applied
  
  // Automatic data fetching when filters change
  // This provides real-time filtering functionality - only runs when filters are actually applied
  useEffect(() => {
    // Only fetch data when filters are actually set (not initial null state)
    const hasActiveFilters = selectedProduct !== null || selectedLocation !== null || 
                           selectedCustomer !== null || selectedDateRange !== null || 
                           Object.values(advancedFilters).some(arr => Array.isArray(arr) && arr.length > 0);
    
    if (hasActiveFilters) {
      // Debounce the filter changes to avoid excessive API calls
      const timeoutId = setTimeout(() => {

        fetchForecastData(true);
      }, 300); // 300ms debounce to allow multiple filter selections

      return () => clearTimeout(timeoutId);
    }
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

  // Helper function to check if there's meaningful data to show metrics, trends, and charts
  const hasDataForMetricsAndCharts = useCallback(() => {
    if (customers.length === 0) return false;
    
    // Calculate key totals
    const m8PredictTotal = calculateTotal('actual_by_m8');
    const kamForecastTotal = calculateTotal('kam_forecast_correction');
    const effectiveForecastTotal = calculateTotal('effective_forecast');
    
    // Check if M8 Predict has meaningful current-year-only data
    const currentYear = new Date().getFullYear();
    const hasCurrentYearM8Data = customers.some(customer => {
      return Object.keys(customer.months).some(monthKey => {
        if (shouldShowValueForYear(monthKey, currentYear-1)) {
          const monthData = customer.months[monthKey];
          return monthData && (monthData.actual_by_m8 || 0) > 0;
        }
        return false;
      });
    });
    
    // Check if any of the main metrics have non-zero values
    const hasMainData = m8PredictTotal > 0 || kamForecastTotal > 0 || effectiveForecastTotal > 0 ;
    
    // For metrics to show, we need both main data AND current year M8 data
    // This ensures the metrics section only appears when M8 Predict actually has current year values
    const hasRelevantData = hasMainData && hasCurrentYearM8Data;
    
    // Also check if any customer has meaningful values for the general data availability
    const hasCustomerData = customers.some(customer => customerHasValues(customer));
    
    return hasRelevantData || (hasMainData && hasCustomerData);
  }, [customers, calculateTotal, customerHasValues, shouldShowValueForYear]);

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
      
      'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12',
    };
    
    const [month, year] = monthStr.split('-');
    const monthNum = monthMap[month.toLowerCase()];
    const fullYear = year.length === 2 ? `20${year}` : year;
    
    return `${fullYear}-${monthNum}-01`;
  };

  // Helper function to resolve location_id from filters and database
  const resolveLocationIdFromFilters = async (customerId: string, productId: string): Promise<string | null> => {
    try {
      // If location is explicitly selected, use it
      if (selectedLocation?.location_id) {
        return selectedLocation.location_id;
      }

      // Get customer_id (text) for database queries
      const customerObj = allCustomersFromHook.find(c => c.customer_node_id === customerId);
      const customerIdText = customerObj?.id;

      if (!customerIdText) {
        console.error('Customer ID (text) not found for resolving location_id');
        return null;
      }

      // console.log('🔍 Resolving location_id from filters:', {
      //   customer_node_id: customerId,
      //   customer_id: customerIdText,
      //   product_id: productId,
      //   has_marca_filter: advancedFilters.marca?.length > 0,
      //   has_productLine_filter: advancedFilters.productLine?.length > 0,
      //   has_FilterPanel_locations: Object.keys(advancedFilters.availableLocations || {}).length > 0
      // });

      // Strategy 0: Use FilterPanel location data if available (most efficient)
      if (advancedFilters.productLocationMap && advancedFilters.availableLocations) {
        const productLocations = advancedFilters.productLocationMap[productId];
        if (productLocations && productLocations.length > 0) {
          const locationId = productLocations[0]; // Use first available location
          const locationName = advancedFilters.availableLocations[locationId];
          console.log('✅ Found location_id from FilterPanel:', {
            location_id: locationId,
            location_name: locationName,
            product_id: productId
          });
          return locationId;
        }
      }

      // Strategy 1: If we have marca filter, find location_id from commercial_collaboration
      // for products in that marca and this customer
      if (advancedFilters.marca && advancedFilters.marca.length > 0) {
        const { data: marcaLocationData } = await (supabase as any)
          .schema('m8_schema')
          .rpc('get_sales_in_by_marca', {
            marca_names: advancedFilters.marca,
            date_from: '2023-10-01',
            date_to: '2025-12-31'
          });

        if (marcaLocationData && marcaLocationData.length > 0) {
          // Find records matching our customer - try exact product match first
          let customerRecord = marcaLocationData.find(record => 
            record.customer_node_id === customerId && record.product_id === productId
          );
          
          // If no exact match, try any record for this customer in the marca
          if (!customerRecord) {
            customerRecord = marcaLocationData.find(record => 
              record.customer_node_id === customerId
            );
          }
          
          if (customerRecord) {
            // Now get the location_id from commercial_collaboration using the found data
            const { data: locationData } = await (supabase as any).schema('m8_schema')
              .from('commercial_collaboration')
              .select('location_id')
              .eq('customer_id', customerIdText)
              .eq('product_id', customerRecord.product_id)
              .limit(1);

            if (locationData && locationData.length > 0) {
              console.log('✅ Found location_id from marca filter:', locationData[0].location_id);
              return locationData[0].location_id;
            }
          }
        }
      }

      // Strategy 2: If we have productLine filter, similar approach
      if (advancedFilters.productLine && advancedFilters.productLine.length > 0) {
        const { data: productLineLocationData } = await (supabase as any)
          .schema('m8_schema')
          .rpc('get_sales_in_by_product_line', {
            product_line_names: advancedFilters.productLine,
            date_from: '2023-10-01',
            date_to: '2025-12-31'
          });

        if (productLineLocationData && productLineLocationData.length > 0) {
          // Find records matching our customer - try exact product match first
          let customerRecord = productLineLocationData.find(record => 
            record.customer_node_id === customerId && record.product_id === productId
          );
          
          // If no exact match, try any record for this customer in the product line
          if (!customerRecord) {
            customerRecord = productLineLocationData.find(record => 
              record.customer_node_id === customerId
            );
          }
          
          if (customerRecord) {
            const { data: locationData } = await (supabase as any).schema('m8_schema')
              .from('commercial_collaboration')
              .select('location_id')
              .eq('customer_id', customerIdText)
              .eq('product_id', customerRecord.product_id)
              .limit(1);

            if (locationData && locationData.length > 0) {
              console.log('✅ Found location_id from productLine filter:', locationData[0].location_id);
              return locationData[0].location_id;
            }
          }
        }
      }

      // Strategy 3: Fallback - find any location_id for this customer and product
      const { data: fallbackLocationData } = await (supabase as any).schema('m8_schema')
        .from('commercial_collaboration')
        .select('location_id')
        .eq('customer_id', customerIdText)
        .eq('product_id', productId)
        .limit(1);

      if (fallbackLocationData && fallbackLocationData.length > 0) {
        console.log('✅ Found location_id from fallback search:', fallbackLocationData[0].location_id);
        return fallbackLocationData[0].location_id;
      }

      // Strategy 4: Ultimate fallback - find any location_id for this customer
      const { data: ultimateFallbackData } = await (supabase as any).schema('m8_schema')
        .from('commercial_collaboration')
        .select('location_id')
        .eq('customer_id', customerIdText)
        .limit(1);

      if (ultimateFallbackData && ultimateFallbackData.length > 0) {
        console.log('✅ Found location_id from ultimate fallback:', ultimateFallbackData[0].location_id);
        return ultimateFallbackData[0].location_id;
      }

      console.warn('❌ Could not resolve location_id for customer:', customerId);
      return null;

    } catch (error) {
      console.error('Error resolving location_id from filters:', error);
      return null;
    }
  };

  // Function to save KAM Forecast to commercial_collaboration table using PostgreSQL function
  const saveKamForecastToDatabase = async (customerId: string, month: string, value: number) => {
    try {
      setSaving(true);
      
      // Validate customer ID
      if (customerId === 'all') {
        showKamError('Error al guardar ajuste KAM', 'No se puede guardar ajuste KAM para "todos los clientes"');
        return;
      }
      
      // Parse month and year
      const [monthAbbr, year] = month.split('-');
      if (!monthAbbr || !year) {
        showKamError('Error al guardar ajuste KAM', 'Formato de mes inválido');
        return;
      }
      
      // Prepare parameters for the PostgreSQL function
      let productIds: string[] = [];
      let marcaNames: string[] | null = null;
      let productLines: string[] | null = null;
      
      // Priority 1: Use marca filter - let PostgreSQL handle the product filtering
      if (advancedFilters.marca?.length > 0) {
        marcaNames = advancedFilters.marca;
        // Don't pass product_ids when using marca - let PostgreSQL do the join
        productIds = [];
      }
      // Priority 2: Use product line filter - let PostgreSQL handle the product filtering  
      else if (advancedFilters.productLine?.length > 0) {
        productLines = advancedFilters.productLine;
        // Don't pass product_ids when using product lines - let PostgreSQL do the join
        productIds = [];
      }
      // Priority 3: Use specific product selection
      else if (selectedProduct?.product_id) {
        productIds = [selectedProduct.product_id];
      }
      // Priority 4: Use FilterPanel selected brands (subcategory_id)
      else if (advancedFilters.selectedBrands?.length > 0) {
        const { data: marcaProducts, error: marcaError } = await (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('product_id')
          .in('subcategory_id', advancedFilters.selectedBrands)
          .limit(100);
        if (!marcaError && marcaProducts) {
          productIds = marcaProducts.map(p => p.product_id);
        }
      }
      // Priority 5: Don't use advancedFilters.selectedProducts as it contains ALL products
      // Instead, get product from current customer data if available
      else {
        const customerObj = customers.find(c => c.customer_node_id === customerId);
        if (customerObj?.product_id) {
          productIds = [customerObj.product_id];
        }
      }
      
      // console.log('Calling PostgreSQL KAM function with parameters:', {
      //   customer_uuid: customerId,
      //   month_abbr: monthAbbr,
      //   year: year,
      //   kam_value: value,
      //   product_ids: productIds.length > 0 ? productIds : 'null (using marca/product_line filter)',
      //   marca_names: marcaNames,
      //   product_lines: productLines,
      //   filter_strategy: marcaNames ? 'marca' : productLines ? 'product_line' : productIds.length > 0 ? 'product_ids' : 'all_customer_products'
      // });
      
      // Call the PostgreSQL function
      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .rpc('update_kam_adjustment', {
          p_customer_uuid: customerId,
          p_month_abbr: monthAbbr,
          p_year: year,
          p_kam_value: value,
          p_product_ids: productIds.length > 0 ? productIds : null,
          p_marca_names: marcaNames,
          p_product_lines: productLines
        });
      
      if (error) {
        console.error('Error calling KAM function:', error);
        showKamError('Error al guardar ajuste KAM', `Error en base de datos: ${error.message}`);
        return;
      }
      
      // Process the response from the function
      if (data && data.length > 0) {
        const result = data[0];
        
        if (result.success) {
          // console.log('✅ KAM adjustment saved successfully:', {
          //   savedRecords: result.records_updated,
          //   totalValue: value,
          //   valuePerRecord: result.records_updated > 0 ? value / result.records_updated : value,
          //   customer: customerId,
          //   month: month,
          //   updatedRecords: result.updated_records
          // });
          
          toast.success('Ajuste KAM guardado', {
            description: `Valor ${value.toLocaleString('es-MX')} distribuido en ${result.records_updated} registros`,
            duration: 3000,
          });
          
          // Refresh the data to ensure UI reflects the latest database state
          await fetchForecastData(true);
        } else {
          console.error('KAM function returned error:', result.error_message);
          showKamError('Error al guardar ajuste KAM', result.error_message || 'Error desconocido');
        }
      } else {
        showKamError('Error al guardar ajuste KAM', 'No se recibió respuesta de la base de datos');
      }
      
    } catch (error) {
      console.error('Error saving KAM Adjustment to database:', error);
      showKamError('Error al guardar ajuste KAM', 'No se pudo guardar el ajuste KAM. Inténtalo de nuevo.', 5000);
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
            const existingMonthData = customer.months[month];
            return {
              ...customer,
              months: {
                ...customer.months,
                [month]: {
                  ...existingMonthData,
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

  const handleKamApprovalChange = useCallback(async (customerId: string, month: string, value: string) => {
    // Update local state immediately for UI responsiveness
    setKamApprovals(prev => ({
      ...prev,
      [customerId]: {
        ...prev[customerId],
        [month]: value
      }
    }));

    // Save to database
    try {
      setSaving(true);
      
      // Parse month and year
      const [monthAbbr, year] = month.split('-');
      if (!monthAbbr || !year) {
        toast.error('Formato de mes inválido');
        return;
      }

      // Convert month abbreviation to full date (first day of the month)
      const monthMap: { [key: string]: string } = {
        'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 
        'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
      };
      const monthNum = monthMap[monthAbbr];
      const fullYear = year.length === 2 ? `20${year}` : year;
      const postdate = `${fullYear}-${monthNum}-01`;

      // Get the product IDs and location IDs from filters
      let productIds: string[] = [];
      let locationIds: string[] = [];

      // Determine product IDs based on filters
      if (advancedFilters.marca?.length > 0) {
        const { data: marcaProducts } = await (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('product_id')
          .in('subcategory_name', advancedFilters.marca);
        if (marcaProducts) productIds = marcaProducts.map((p: any) => p.product_id);
      } else if (advancedFilters.productLine?.length > 0) {
        const { data: lineProducts } = await (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('product_id')
          .in('class_name', advancedFilters.productLine);
        if (lineProducts) productIds = lineProducts.map((p: any) => p.product_id);
      } else if (advancedFilters.selectedProducts?.length > 0) {
        productIds = advancedFilters.selectedProducts;
      } else if (selectedProduct?.product_id) {
        productIds = [selectedProduct.product_id];
      }

      // Determine location IDs based on filters
      if (advancedFilters.selectedSupplyNetworkNodeIds?.length > 0) {
        locationIds = advancedFilters.selectedSupplyNetworkNodeIds;
      } else if (selectedLocation?.location_id) {
        locationIds = [selectedLocation.location_id];
      }

      // Build update query
      let updateQuery = (supabase as any)
        .schema('m8_schema')
        .from('commercial_collaboration')
        .update({ commercial_notes: value }) // Store approval in commercial_notes field
        .eq('customer_node_id', customerId)
        .eq('postdate', postdate);

      // Apply product filter if available
      if (productIds.length > 0) {
        updateQuery = updateQuery.in('product_id', productIds);
      }

      // Apply location filter if available
      if (locationIds.length > 0) {
        updateQuery = updateQuery.in('location_node_id', locationIds);
      }

      const { error } = await updateQuery;

      if (error) {
        console.error('Error saving KAM Approval:', error);
        toast.error('Error al guardar aprobación', {
          description: error.message,
          duration: 3000
        });
      } else {
        toast.success('Aprobación guardada', {
          description: `Aprobación "${value}" guardada para ${month}`,
          duration: 2000
        });
      }

    } catch (error) {
      console.error('Error saving KAM Approval:', error);
      toast.error('Error al guardar aprobación');
    } finally {
      setSaving(false);
    }
  }, [advancedFilters, selectedProduct, selectedLocation]);

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
      
      // If editing the "all" level, distribute value across all customer-product-location combinations
      if (customerId === 'all') {

        
        const updatedCustomers = await new Promise<CustomerData[]>((resolve) => {
          setCustomers(prevCustomers => {
            // Get the filtered customers based on current filter selections
            const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
              ? prevCustomers.filter(customer => customer.customer_node_id === selectedCustomerId)
              : prevCustomers;


            
            // Simple equal distribution across all customer-product-location combinations
            const totalCombinations = customersToUse.length;
            const distributedValue = newValue / totalCombinations;


            
            // Apply equal distribution to all combinations
            const updatedCustomers = prevCustomers.map(customer => {
              // Only update customers that are in the filtered set
              if (customersToUse.some(c => 
                c.customer_node_id === customer.customer_node_id && 
                c.product_id === customer.product_id
              )) {
                const existingMonthData = customer.months[month];
                
                // Only update the kam_forecast_correction field, preserve all other existing values
                return {
                  ...customer,
                  months: {
                    ...customer.months,
                    [month]: {
                      ...existingMonthData,
                      kam_forecast_correction: Math.round(distributedValue) // Round to ensure integer numbers
                    }
                  }
                };
              }
              return customer; // Don't change customers not in filtered set
            });
            
            resolve(updatedCustomers);
            return updatedCustomers;
          });
        });
        
        // Save all updated customer values to database
        const customersToSave = selectedCustomerId && selectedCustomerId !== 'all' 
          ? updatedCustomers.filter(customer => customer.customer_node_id === selectedCustomerId)
          : updatedCustomers;
        

        let savedCount = 0;
        for (const customer of customersToSave) {
          const monthData = customer.months[month];
          if (monthData && monthData.kam_forecast_correction !== undefined) {
            try {
              await saveKamForecastToDatabase(customer.customer_node_id, month, monthData.kam_forecast_correction);
              savedCount++;
            } catch (error) {
              console.error(`Failed to save KAM adjustment for customer ${customer.customer_name} (${customer.product_id}):`, error);
            }
          }
        }

        
      } else {
        // Individual customer edit - update only that customer

        
        setCustomers(prevCustomers => 
          prevCustomers.map(customer => {
            if (customer.customer_node_id === customerId) {
              const existingMonthData = customer.months[month];
              return {
                ...customer,
                months: {
                  ...customer.months,
                  [month]: {
                    ...existingMonthData,
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
    },
     
    
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

  }, []);







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

  if (error) {
    return null;
  }

  return (
    <div className="w-full min-h-screen p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">Colaboración en Pronósticos</h1>
      
  
      {/* Filtros Avanzados Section - Moved to top as requested */}
      <Card className="w-full max-w-full mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            Filtros Avanzados
          </CardTitle>
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
              <span className="font-medium">Filtrado automático activo</span>
            </div>
            <p className="mt-1 text-xs text-green-600">
              Los datos se actualizan automáticamente al seleccionar filtros. No es necesario presionar botones adicionales.
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <FilterPanel 
            customers={customers} 
            onFiltersChange={handleAdvancedFiltersChange}
          />

          {/* Status and Action Buttons */}
          <div className="mt-4 flex items-center gap-3">
            {/* Loading indicator for automatic filtering */}
            {filterLoading && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="text-sm">Actualizando datos automáticamente...</span>
              </div>
            )}
            
            {/* Clear filters button */}
            {hasActiveFilters() && (
              <Button
                onClick={clearAllFilters}
                disabled={loading || filterLoading || clearingFilters}
                variant="outline"
                className="h-9 px-4"
              >
                {clearingFilters ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2"></div>
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                {clearingFilters ? 'Limpiando...' : 'Limpiar Filtros'}
              </Button>
            )}
          </div>
          <div style={{ visibility: 'visible' }}>
          {/* Active Filters Display Section */}
          {hasActiveFilters() && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-semibold text-blue-800">Filtros Activos!!</span>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full"> 
                   {[
                    ...(advancedFilters.selectedProducts || []),
                    ...(advancedFilters.selectedSupplyNetworkNodeIds || []),
                    ...(advancedFilters.selectedCustomers || []),
                    ...(advancedFilters.clientHierarchy || []),
                    ...(advancedFilters.marca || []),
                    ...(advancedFilters.productLine || [])
                  ].length} filtros
                </span> 
              </div>
              
              <div className="flex flex-wrap gap-2">
                {/* Basic Filters */}
                {selectedProduct && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 border border-green-300 rounded-full text-xs">
                    <Package className="h-3 w-3" />
                    <span className="font-medium">Producto:</span>
                    {selectedProduct.product_id || selectedProduct.product_name}
                  </div>
                )}
                
                {selectedLocation && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 border border-purple-300 rounded-full text-xs">
                    <Truck className="h-3 w-3" />
                    <span className="font-medium">Ubicación:</span>
                    {selectedLocation.location_code}
                  </div>
                )}
                
                {selectedCustomer && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-800 border border-orange-300 rounded-full text-xs">
                    <Users className="h-3 w-3" />
                    <span className="font-medium">Cliente:</span>
                    {selectedCustomer.customer_code}
                  </div>
                )}

                {/* Advanced Filters */}
                {advancedFilters.selectedProducts?.map((productId, index) => (
                  <div key={`product-${index}`} className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 border border-green-300 rounded-full text-xs">
                    <Package className="h-3 w-3" />
                    <span className="font-medium">Producto:</span>
                    {productId}
                  </div>
                ))}
                
                {advancedFilters.selectedSupplyNetworkNodeIds?.map((nodeId, index) => (
                  <div key={`node-${index}`} className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 border border-purple-300 rounded-full text-xs">
                    <MapPin className="h-3 w-3" />
                    <span className="font-medium">Nodo:</span>
                    {nodeId}
                  </div>
                ))}
                
                {advancedFilters.selectedCustomers?.map((customerId, index) => (
                  <div key={`customer-${index}`} className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-800 border border-orange-300 rounded-full text-xs">
                    <Users className="h-3 w-3" />
                    <span className="font-medium">Cliente:</span>
                    {customerId}
                  </div>
                ))}
                
                {advancedFilters.clientHierarchy?.map((hierarchy, index) => (
                  <div key={`hierarchy-${index}`} className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-full text-xs">
                    <Building2 className="h-3 w-3" />
                    <span className="font-medium">Jerarquía:</span>
                    {hierarchy}
                  </div>
                ))}
                
                {advancedFilters.marca?.map((marca, index) => (
                  <div key={`marca-${index}`} className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-full text-xs">
                    <Tag className="h-3 w-3" />
                    <span className="font-medium">Marca:</span>
                    {marca}
                  </div>
                ))}
                
                {advancedFilters.productLine?.map((line, index) => (
                  <div key={`line-${index}`} className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-100 text-cyan-800 border border-cyan-300 rounded-full text-xs">
                    <Package2 className="h-3 w-3" />
                    <span className="font-medium">Línea:</span>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>

        </CardContent>
      </Card>
              
      <Card className="w-full max-w-full mb-6">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-base sm:text-lg">
              Forecast Collaboration Approval
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
          <div className="w-full overflow-x-auto overflow-y-auto max-h-[80vh] relative">
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
                  Selecciona filtros para cargar los datos
                </h3>
                <p className="text-gray-600 max-w-md mb-3">
                  Para mejorar el rendimiento, los datos se cargan solo cuando aplicas filtros. Selecciona al menos un filtro en las opciones de arriba.
                </p>
                <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-200 max-w-md">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">Carga optimizada:</span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    Sin filtros aplicados, no se realiza ninguna consulta a la base de datos, lo que hace que la página cargue más rápido.
                  </p>
                </div>
              </div>
            ) : (
              /* Grid Container - Only show when filters are active */
              <div 
                className="forecast-grid min-w-[1800px]" 
                style={{
                  display: 'grid',
                  gridTemplateColumns: `150px 120px 120px 180px repeat(12, 90px) 270px 270px 270px`,
                  gap: '1px',
                  backgroundColor: '#d1d5db' // Border color
                }}
              >
              {/* Header Row */}
              <div className="sticky top-0 bg-gray-200 border-gray-300 p-2 text-left font-semibold text-xs z-10">
                Jerarquía de cliente
              </div>
              <div className="sticky top-0 bg-gray-200 border-gray-300 p-2 text-left font-semibold text-xs z-10">
                Marca
              </div>
              <div className="sticky top-0 bg-gray-200 border-gray-300 p-2 text-left font-semibold text-xs z-10">
                Tipo
              </div>
              <div className="sticky top-0 bg-gray-200 border-gray-300 p-2 text-center font-semibold text-xs z-10">
                Detalle
              </div>
              {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((monthName, index) => (
                <div 
                  key={monthName} 
                  className={`sticky top-0 p-2 text-center font-semibold text-xs z-10 ${
                    index === 11 ? 'bg-yellow-200' : 'bg-blue-200'
                  }`}
                >
                  {monthName}
                </div>
              ))}
              
              {/* New summary columns */}
              <div className="sticky top-0 bg-purple-200 border-gray-300 p-2 text-center font-semibold text-xs z-10">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">YTD</div>
                  <div className="text-center">YTG</div>
                  <div className="text-center">Total</div>
                </div>
                <div className="text-center mt-1 font-bold">Cajas</div>
              </div>
              <div className="sticky top-0 bg-green-200 border-gray-300 p-2 text-center font-semibold text-xs z-10">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">YTD</div>
                  <div className="text-center">YTG</div>
                  <div className="text-center">Total</div>
                </div>
                <div className="text-center mt-1 font-bold">Litros</div>
              </div>
              <div className="sticky top-0 bg-orange-200 border-gray-300 p-2 text-center font-semibold text-xs z-10">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">YTD</div>
                  <div className="text-center">YTG</div>
                  <div className="text-center">Total</div>
                </div>
                <div className="text-center mt-1 font-bold">Pesos</div>
              </div>
              
              {/* Grid Body Content - properly structured */}
            {(!selectedCustomerId || selectedCustomerId === 'all') && (
              <>
                {/* Row 1: KAM A + 1 */}
                <div className="contents">
                  <div className="bg-gray-100 p-2 font-bold text-sm">
                    {(() => {
                    if (advancedFilters.clientHierarchy && advancedFilters.clientHierarchy.length > 0) {
                        return advancedFilters.clientHierarchy.join(', ');
                    }
                    return selectedLocation?.location_code ? selectedLocation.location_code : 'Todos los clientes';
                    })()}
                  </div>
                  <div className="bg-gray-100 p-1 text-xs">
                    {(() => {
                      if (advancedFilters.marca && advancedFilters.marca.length > 0) {
                        return   getGroupedHeaderName();
                      }
                      if (advancedFilters.productLine && advancedFilters.productLine.length > 0) {
                        return  getGroupedHeaderName();
                      }
                      
                      return selectedProduct?.product_id ? selectedProduct.product_id : 'Todos los productos';
                    })()}
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    KAM A + 1 📊
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    KAM {new Date().getFullYear() + 1} 📊
                  </div>
                  {Array.from({length: 12}, (_, index) => {
                    const month = getMonthKeyForIndex(index);
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

                    // Check if this cell is being edited (use 'all' as customerId for aggregate editing)
                    const isEditing = inlineEditingCell?.customerId === 'all' && inlineEditingCell?.month === month;
                    
                    return (
                      <div 
                        key={`all-${month}-kam-adjustments`} 
                        className={`p-1 text-right text-xs cursor-pointer hover:bg-blue-200 transition-colors ${
                          month.includes('24') ? 'bg-yellow-100' : 'bg-blue-100'
                        }`}
                        onDoubleClick={() => handleInlineEditStart('all', month, totalKamValue)}
                        title={`Total KAM Adjustments: ${totalKamValue.toLocaleString('es-MX')} | Double-click to edit and distribute across ${customersToUse.length} customer-product combinations`}
                      >
                        {isEditing ? (
                          <input
                            type="number"
                            value={inlineEditingValue}
                            onChange={(e) => setInlineEditingValue(e.target.value)}
                            onBlur={() => handleInlineEditSave('all', month)}
                            onKeyPress={(e) => handleInlineKeyPress(e, 'all', month)}
                            className="w-full bg-white border border-blue-500 rounded px-1 py-0 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-300"
                            autoFocus
                            disabled={saving}
                          />
                        ) : (
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1 font-medium">
                              {totalKamValue ? totalKamValue.toLocaleString('es-MX') : '0'}
                              {totalKamValue > 0 && <span className="text-blue-600 opacity-75">📊</span>}
                              <span className="text-blue-600 opacity-75">📊</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {renderSummaryColumns(
                    selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers
                  )}
                </div>

                {/* Row 32: M8 Predict - Using actual_by_m8 (from commercial_collaboration_view.actual) */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    M8 Predict !!
                  </div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                     M8 forecast {new Date().getFullYear() + 1}
                   
                  </div>
                  
                   {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      
                          <>
                        {Array.from({ length: 12 }, (_, index) => {
                          const month = getMonthKeyForIndex(index);
                          // M8 Predict - Show values for current year (2025)
                          const shouldShow = shouldShowValueForYear(month, new Date().getFullYear());

                          const totalValue = shouldShow ? customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.actual_by_m8 : 0);
                          }, 0) : 0;
                          
                          return (
                            <div key={`all-${month}-effective`} 
                                 className={`p-1 text-right text-xs ${
                                   index === 11 ? 'bg-yellow-100' : 'bg-green-100'
                                 } ${!shouldShow ? 'opacity-50' : ''}`}>
                              {shouldShow ? formatValue(totalValue) : '-'}
                              
                            </div>
                          );
                        })}
                        
                        
                        {/* Summary columns for M8 Predict - now correctly filtered to current year only */}
                        {renderSummaryColumns(customersToUse, " M8 Predict")}
                      </>
                    );
                  })()}
                </div>

                {/* Row 3: KAM Approval */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-purple-100 p-1 text-xs z-10">
                    KAM Approval
                  </div>
                  <div className="bg-purple-100 p-1 text-xs z-10">
                    KAM Approval Status
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {Array.from({length: 12}, (_, index) => {
                          const month = getMonthKeyForIndex(index);
                          return (
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
                          );
                        })}
                       
                        {/* Summary columns for KAM Approval - showing approvals count */}
                        <div className="bg-purple-200 border-gray-300 p-2 text-center text-xs">
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>-</div>
                            <div>-</div>
                            <div>-</div>
                          </div>
                        </div>
                        <div className="bg-purple-200 border-gray-300 p-2 text-center text-xs">
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>-</div>
                            <div>-</div>
                            <div>-</div>
                          </div>
                        </div>
                        <div className="bg-purple-200 border-gray-300 p-2 text-center text-xs">
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>-</div>
                            <div>-</div>
                            <div>-</div>
                          </div>
                        </div>
                      </>
                    );
                  })()} 
                </div>
              </>
            )}  
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
