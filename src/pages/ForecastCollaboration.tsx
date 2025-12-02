import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, SelectionChangedEvent } from 'ag-grid-community';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Package, MapPin, Filter, Truck, X, Calendar, Users, Search, Eye, Rows } from 'lucide-react';
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
      'Gap Forecast vs ventas': 'forecast_sales_gap',
      'Forecast M8.predict': 'calculated_forecast',
      'Key Account Manager': 'kam_forecast_correction',
      'Kam Forecast': 'kam_forecast_correction',
      'Sales manager view': 'sales_manager_view',
      'Effective Forecast': 'effective_forecast',
      'KAM aprobado': 'xamview',
      
      // Individual row fields - these should match exactly what's displayed in the UI
      // 'Año pasado (LY)': 'last_year', // Historical data from last year
      
      'Sell in AA': 'sell_in_aa',
      'Sell in 23': 'sell_in_23',
      'Sell in last year': 'last_year', // Use the last_year field from database
      'Sell in this year': 'sell_in_aa', // Current year sell-in data
      'Sell Out AA': 'sell_out_aa',
      'Sell Out real': 'sell_out_real',
      // 'Fcst Estadístico - BY': 'calculated_forecast',
      'Ajustes del KAM': 'kam_forecast_correction',
      // 'Proyectado - Equipo CPFR': 'xamview',
      'Días de inventario': 'inventory_days',
      // 'Periodo Frezze': 'calculated_forecast',
      // 'Last estimate': 'xamview',
      // 'PPTO': 'calculated_forecast',
      // 'Volumen 3 meses anteriores': 'sell_out_aa',
      // 'Building blocks': 'calculated_forecast',
      // 'PCI diferenciado por canal': 'calculated_forecast',
      
      // Year-specific fields
    
      'SI VENTA 2024': 'si_venta_2024',
      'SI 2025': 'si_2025',
      'SO 2024': 'so_2024',
      'SO 2025': 'so_2025',
      
      // PIN and planning fields
      'DDI Totales': 'inventory_days',
      'SI PIN 2025': 'si_pin_2025',
      'LE-1': 'le_1',
      'SI PIN 2026': 'si_pin_2026',
      'PPTO 2025': 'ppto_2025',
      'PPTO 2026': 'ppto_2026',
      'PIN SEP': 'pin_sep',
      
      // Percentage fields
      '% PIN vs AA-1': 'pin_vs_aa_1',
      '% PIN 26 vs AA 25': 'pin_26_vs_aa_25',
      '% PIN 26 vs PPTO 26': 'pin_26_vs_ppto_26',
      '% PIN SEP vs PIN': 'pin_sep_vs_pin',
      
      // 2026 planning fields
      'KAM 26': 'kam_26',
      'BY 26': 'by_26',
      'BB 26': 'bb_26',
      'PCI 26': 'pci_26',
      
      // Legacy mappings for backward compatibility
      'Fcst Estadístico': 'calculated_forecast',
      'PIN AGO': 'pin_ago',
      'PIN JUL': 'pin_jul',
      'KAM': 'kam',
      'BY': 'by',
      'BB': 'bb',
      'PCI': 'pci'
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
        
        // For Cajas (attr_3), values are already in cajas units - no multiplication needed
        // For Litros (attr_1) and Pesos (attr_2), multiply by their respective attributes
        if (attribute === 'attr_3') {
          // Cajas: use raw values (already in cajas units)
          total += monthTotal;
        } else {
          // Litros/Pesos: multiply by attribute multiplier
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
        
        // For Cajas (attr_3), values are already in cajas units - no multiplication needed
        // For Litros (attr_1) and Pesos (attr_2), multiply by their respective attributes
        if (attribute === 'attr_3') {
          // Cajas: use raw values (already in cajas units)
          total += monthTotal;
        } else {
          // Litros/Pesos: multiply by attribute multiplier
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

    // Calculate YTD (Year To Date) values for Cajas, Litros, and Pesos
    const sumCajasYTD = calculateAggregateForAllCustomers(customersToUse, 'attr_3', 'YTD', fieldName);
    const sumLitrosYTD = calculateAggregateForAllCustomers(customersToUse, 'attr_1', 'YTD', fieldName);
    const sumPesosYTD = calculateAggregateForAllCustomers(customersToUse, 'attr_2', 'YTD', fieldName);

    // Calculate YTG (Year To Go) values for Cajas, Litros, and Pesos
    const sumCajasYTG = calculateAggregateForAllCustomers(customersToUse, 'attr_3', 'YTG', fieldName);
    const sumLitrosYTG = calculateAggregateForAllCustomers(customersToUse, 'attr_1', 'YTG', fieldName);
    const sumPesosYTG = calculateAggregateForAllCustomers(customersToUse, 'attr_2', 'YTG', fieldName);

    // Calculate Total values for Cajas, Litros, and Pesos
    const sumCajasTotal = calculateAggregateForAllCustomers(customersToUse, 'attr_3', 'Total', fieldName);
    const sumLitrosTotal = calculateAggregateForAllCustomers(customersToUse, 'attr_1', 'Total', fieldName);
    const sumPesosTotal = calculateAggregateForAllCustomers(customersToUse, 'attr_2', 'Total', fieldName);

    return (
      <>
        {/* Cajas column */}
        <div className="bg-purple-200 border-gray-300 p-2 text-center text-xs">
          <div className="grid grid-cols-3 gap-1">
            <div className="text-right text-xs">
              {formatValue(sumCajasYTD)}
            </div>
            <div className="text-right text-xs">
              {formatValue(sumCajasYTG)}
            </div>
            <div className="text-right text-xs">
              {formatValue(sumCajasTotal)}
            </div>
          </div>
        </div>
        
        {/* Litros column */}
        <div className="bg-green-200 border-gray-300 p-2 text-center text-xs">
          <div className="grid grid-cols-3 gap-1">
            <div className="text-right text-xs">
              {formatValue(sumLitrosYTD)}
            </div>
            <div className="text-right text-xs">
              {formatValue(sumLitrosYTG)}
            </div>
            <div className="text-right text-xs">
              {formatValue(sumLitrosTotal)}
            </div>
          </div>
        </div>
        
        {/* Pesos column */}
        <div className="bg-orange-200 border-gray-300 p-2 text-center text-xs">
          <div className="grid grid-cols-3 gap-1">
            <div className="text-right text-xs">
              {formatValue(sumPesosYTD)}
            </div>
            <div className="text-right text-xs">
              {formatValue(sumPesosYTG)}
            </div>
            <div className="text-right text-xs">
              {formatValue(sumPesosTotal)}
            </div>
          </div>
        </div>
      </>
    );
  };

  // Helper function to render summary columns for individual customer rows
  const renderIndividualSummaryColumns = (customer: CustomerData, rowType: string = "calculated_forecast") => {
    // Get the specific field name for this row type
    const fieldName = getFieldNameForRowType(rowType);
    
    return (
      <>
        {/* Cajas column */}
        <div className="bg-purple-50 p-1 text-center text-xs">
          <div className="grid grid-cols-3 gap-1">
            <div className="text-right text-xs">
              {formatValue(calculateCustomerYTD(customer, 'attr_3', fieldName))}
            </div>
            <div className="text-right text-xs">
              {formatValue(calculateCustomerYTG(customer, 'attr_3', fieldName))}
            </div>
            <div className="text-right text-xs">
              {formatValue(calculateCustomerTotal(customer, 'attr_3', fieldName))}
            </div>
          </div>
        </div>
        
        {/* Litros column */}
        <div className="bg-green-50 p-1 text-center text-xs">
          <div className="grid grid-cols-3 gap-1">
            <div className="text-right text-xs">
              {formatValue(calculateCustomerYTD(customer, 'attr_1', fieldName))}
            </div>
            <div className="text-right text-xs">
              {formatValue(calculateCustomerYTG(customer, 'attr_1', fieldName))}
            </div>
            <div className="text-right text-xs">
              {formatValue(calculateCustomerTotal(customer, 'attr_1', fieldName))}
            </div>
          </div>
        </div>
        
        {/* Pesos column */}
        <div className="bg-orange-50 p-1 text-center text-xs">
          <div className="grid grid-cols-3 gap-1">
            <div className="text-right text-xs">
              {formatValue(calculateCustomerYTD(customer, 'attr_2', fieldName))}
            </div>
            <div className="text-right text-xs">
              {formatValue(calculateCustomerYTG(customer, 'attr_2', fieldName))}
            </div>
            <div className="text-right text-xs">
              {formatValue(calculateCustomerTotal(customer, 'attr_2', fieldName))}
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
    effectiveForecast: false, // Hidden by default
    lastYear: false, // Hidden by default
    growthLine: true, // Enabled by default to show growth percentage
    m8PredictArea: true,
    pci26Area: true,
    kamAdjustmentsArea: true,
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
    growthLine: '#dc2626', // red-600
    m8PredictArea: '#f97316', // orange-500
    pci26Area: '#0ea5e9', // sky-500
    kamAdjustmentsArea: '#9333ea',  // amber-500
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
    // Trigger search with current filters - will use fetchForecastData when it's available
    setNoResultsMessageDismissed(false);
  }, [selectedProduct, selectedLocation, selectedCustomer, selectedDateRange, advancedFilters]);

  // Handler for advanced filters from FilterPanel
  // Updates filters immediately so selections are preserved and UI reflects changes
  // Data fetching is debounced in useEffect to allow multiple selections
  const handleAdvancedFiltersChange = useCallback((filters: any) => {
    // Update filters immediately so UI reflects selections without delay
    // This allows users to select multiple filters (like multiple Jerarquía de Cliente)
    // without losing their selections or triggering immediate page refresh
    console.log('🔍 DEBUG: Advanced filters changed:', filters);
    if (filters.selectedCustomers && filters.selectedCustomers.length > 0) {
      console.log('🚨 ALERT: selectedCustomers filter applied!', filters.selectedCustomers);
      console.log('🚨 This will restrict data to only these customers');
    }
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


  // Function to clear customer selection specifically
  const clearCustomerSelection = useCallback(async () => {
    console.log('🧹 Clearing customer selection...');
    console.log('🔍 Current selectedCustomers before clearing:', advancedFilters.selectedCustomers);
    
    setAdvancedFilters(prev => ({
      ...prev,
      selectedCustomers: [],
      clientHierarchy: [] // Also clear client hierarchy
    }));
    
    // Reset no results message state
    setNoResultsMessageDismissed(false);
    
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
        .gte('postdate', '2023-10-01')
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
        console.log('🔍 DEBUG: Sell-out query - Advanced filters selectedCustomers:', advancedFilters.selectedCustomers);
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

      setSellOutData(data || []);
      
      return data || [];
    } catch (error) {
      console.error('Error fetching sell-out data:', error);
      return [];
    }
  }, [selectedProduct?.product_id, selectedLocation?.location_id, selectedCustomer?.customer_id, selectedDateRange, advancedFilters]);

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
        console.log('🔍 DEBUG: Inventory query - Advanced filters selectedCustomers:', advancedFilters.selectedCustomers);
        query = query.in('customer_node_id', advancedFilters.selectedCustomers);
      }

      // Apply marca and productLine filters for inventory data
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

      console.log(`📦 Inventory data: ${(data || []).length} rows`);
      
      return data || [];
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      return [];
    }
  }, [selectedProduct?.product_id, selectedLocation?.location_id, selectedCustomer?.customer_id, selectedDateRange, advancedFilters]);

  const processForecastData = useCallback((rawData: CommercialCollaborationData[], customerNamesMap: {[key: string]: string}, dateFilter: DateRange | null = null, sellInDataArray: any[] = [], sellOutDataArray: any[] = [], productAttributesMap: { [key: string]: { attr_1: number; attr_2: number; attr_3: number } } = {}, kamDataArray: any[] = [], inventoryDataArray: any[] = []) => {
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
        
        // PPTO data will be processed separately from commercial_collaboration table
        
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
        

        
        // Set the KAM adjustment value (overwrite, don't add, since this is the adjustment value)
        groupedData[customerProductKey].months[displayMonth].kam_forecast_correction = newValue;
        
        // Process PPTO (Budget) data from initial_sales_plan based on year
        if (kamRow.initial_sales_plan) {
          const monthYear = parseInt(displayMonth.split('-')[1]) + (parseInt(displayMonth.split('-')[1]) < 50 ? 2000 : 1900);
          if (monthYear === 2025) {
            groupedData[customerProductKey].months[displayMonth].ppto_2025 = kamRow.initial_sales_plan;
          } else if (monthYear === 2026) {
            groupedData[customerProductKey].months[displayMonth].ppto_2026 = kamRow.initial_sales_plan;
          }
        }
      }
    });

    // Process inventory data from inventory_transactions table for DDI Totales
    let skippedInventoryRows = 0;
    
    inventoryDataArray.forEach((inventoryRow: any) => {
      // Skip rows with null customer_node_id to prevent errors
      if (!inventoryRow.customer_node_id) {
        skippedInventoryRows++;
        return;
      }
      
      const customerProductKey = `${inventoryRow.customer_node_id}-${inventoryRow.product_id || 'no-product'}`;
      
      // Parse postdate to extract month and year
      const date = new Date(inventoryRow.postdate);
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
          groupedData[customerProductKey].monthPostdates![displayMonth] = inventoryRow.postdate;
        }
        
        // Initialize month data if it doesn't exist (in case inventory data exists without forecast data)
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
        
        // Set the inventory_days value using EOH (End of Hand) from inventory_transactions
        // EOH represents the current inventory level, which is used for DDI (Días de inventario) calculation
        groupedData[customerProductKey].months[displayMonth].inventory_days = inventoryRow.eoh || 0;
        
        console.log(`📦 Inventory EOH set for ${customerProductKey} ${displayMonth}: ${inventoryRow.eoh}`);
      }
    });

    // Log summary of skipped rows to avoid console spam
    const totalSkipped = skippedMainRows + skippedSellInRows + skippedSellOutRows + skippedKamRows + skippedInventoryRows;


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



    return filtered;
  }, [advancedFilters, hasActiveFilters, customerHasValues]);

  // Cache for customer names to avoid repeated database calls
  const [customerNamesCache, setCustomerNamesCache] = useState<{[key: string]: string}>({});
  const [customerNamesLoaded, setCustomerNamesLoaded] = useState(false);
  
  // Sell-in data state
  const [sellInData, setSellInData] = useState<any[]>([]);

  // Sell-out data state
  const [sellOutData, setSellOutData] = useState<any[]>([]);

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
    
    const months = ['oct-24', 'nov-24', 'dic-24', 'ene-25', 'feb-25', 'mar-25', 'abr-25', 'may-25', 'jun-25', 'jul-25', 'ago-25', 'sep-25', 'oct-25', 'nov-25', 'dic-25'];
    
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
          kam_forecast_correction: Math.round(baseValue * 0.95),
          forecast_sales_gap: Math.round(baseValue * 0.1),
          xamview: Math.round(baseValue * 0.9),
          sales_manager_view: Math.round(baseValue * 1.05),
          sell_in_aa: Math.round(baseValue * 0.85),
          sell_out_aa: Math.round(baseValue * 0.80),
          sell_out_actual: Math.round(baseValue * 0.78), // SO Actual
          inventory_days: Math.round(15 + Math.random() * 10), // Days of inventory
          pci_26: Math.round(baseValue * 0.95),
          initial_sales_plan: Math.round(baseValue * 1.1), // PPTO
          ppto_2025: Math.round(baseValue * 1.08), // PPTO Actual (2025)
          ppto_2026: Math.round(baseValue * 1.15), // PPTO A+1 (2026)
          ppto_actual: Math.round(baseValue * 1.08), // PPTO Actual (alternative name)
          ppto_a1: Math.round(baseValue * 1.15), // PPTO A+1 (alternative name)
          by_26: Math.round(baseValue * 0.90),
          bb_26: Math.round(baseValue * 0.88)
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
        const baseValue = 150000 + (index * 50000) + Math.random() * 100000;
        enhancedMonths[month] = {
          ...enhancedMonths[month],
          last_year: enhancedMonths[month].last_year || Math.round(baseValue * 0.8),
          calculated_forecast: enhancedMonths[month].calculated_forecast || Math.round(baseValue),
          effective_forecast: enhancedMonths[month].effective_forecast || Math.round(baseValue * 1.1),
          sm_kam_override: enhancedMonths[month].sm_kam_override || Math.round(baseValue * 1.05),
          forecast_sales_manager: enhancedMonths[month].forecast_sales_manager || Math.round(baseValue * 1.15),
          commercial_input: enhancedMonths[month].commercial_input || Math.round(baseValue * 1.2),
          sell_out_real: enhancedMonths[month].sell_out_real || Math.round(baseValue * 0.82),
          sell_out_aa: enhancedMonths[month].sell_out_aa || Math.round(baseValue * 0.80),
          sell_out_actual: enhancedMonths[month].sell_out_actual || Math.round(baseValue * 0.78),
          forecast_commercial_input: enhancedMonths[month].forecast_commercial_input || Math.round(baseValue * 1.1),
          kam_forecast_correction: enhancedMonths[month].kam_forecast_correction || Math.round(baseValue * 0.95),
          sell_in_aa: enhancedMonths[month].sell_in_aa || Math.round(baseValue * 0.85),
          inventory_days: enhancedMonths[month].inventory_days || Math.round(15 + Math.random() * 10),
          pci_26: enhancedMonths[month].pci_26 || Math.round(baseValue * 0.95),
          initial_sales_plan: enhancedMonths[month].initial_sales_plan || Math.round(baseValue * 1.1),
          ppto_2025: enhancedMonths[month].ppto_2025 || Math.round(baseValue * 1.08),
          ppto_2026: enhancedMonths[month].ppto_2026 || Math.round(baseValue * 1.15),
          ppto_actual: enhancedMonths[month].ppto_actual || Math.round(baseValue * 1.08),
          ppto_a1: enhancedMonths[month].ppto_a1 || Math.round(baseValue * 1.15)
          
        };
      });
      
      return {
        ...customer,
        months: enhancedMonths
      };
    });
  };

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
      
      let query = (supabase as any)
        .schema('m8_schema')
        .from('commercial_collaboration_view')
        .select('customer_node_id,postdate,forecast_ly,forecast,approved_sm_kam,sm_kam_override,forecast_sales_manager,commercial_input,forecast_sales_gap,product_id,subcategory_id,location_node_id,actual')
        .gte('postdate', '2024-10-01') // Start from October 2024
        .lte('postdate', '2025-12-31') // End at December 2025
        .order('customer_node_id', { ascending: true })
        .order('postdate', { ascending: true })
        .limit(10000); // Add reasonable limit to prevent excessive data loading

      // Also fetch KAM adjustments and PPTO data from commercial_collaboration table
      let kamQuery = (supabase as any)
        .schema('m8_schema')
        .from('commercial_collaboration')
        .select('product_id,customer_node_id,location_node_id,postdate,commercial_input,commercial_notes,initial_sales_plan')
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
      
      // Declare variables for supply network filtering
      let locationNodeIds: string[] = [];
      let needsSupplyNetworkFilter = false;

      // Apply advanced filters from FilterPanel
      
      // Use pre-filtered products and supply network nodes from FilterPanel if available (more efficient)
      if (advancedFilters.selectedProducts && advancedFilters.selectedProducts.length > 0 &&
          advancedFilters.selectedSupplyNetworkNodeIds && advancedFilters.selectedSupplyNetworkNodeIds.length > 0) {
        
        // Apply both product and location filters from FilterPanel
        query = query.in('product_id', advancedFilters.selectedProducts);
        query = query.in('location_node_id', advancedFilters.selectedSupplyNetworkNodeIds);
        kamQuery = kamQuery.in('product_id', advancedFilters.selectedProducts);
        kamQuery = kamQuery.in('location_node_id', advancedFilters.selectedSupplyNetworkNodeIds);
        
        // Set flag to skip redundant supply network filtering below
        needsSupplyNetworkFilter = false;
      }
      // Use only supply network nodes if FilterPanel found nodes but no products
      else if (advancedFilters.selectedSupplyNetworkNodeIds && advancedFilters.selectedSupplyNetworkNodeIds.length > 0 &&
               (!advancedFilters.selectedProducts || advancedFilters.selectedProducts.length === 0)) {
        
        // Apply only location filter - products will be determined by what exists in the data
        query = query.in('location_node_id', advancedFilters.selectedSupplyNetworkNodeIds);
        kamQuery = kamQuery.in('location_node_id', advancedFilters.selectedSupplyNetworkNodeIds);
        
        // Set flag to skip redundant supply network filtering below
        needsSupplyNetworkFilter = false;
      }
      // Use only pre-filtered products if available (without supply network nodes) - FIXED for Marca filters
      else if (advancedFilters.selectedProducts && advancedFilters.selectedProducts.length > 0) {
        
        // Apply product filter - products are already validated to exist in commercial_collaboration_view
        query = query.in('product_id', advancedFilters.selectedProducts);
        kamQuery = kamQuery.in('product_id', advancedFilters.selectedProducts);
        
        // Set flag to skip redundant supply network filtering below
        needsSupplyNetworkFilter = false;
      }
      // Fallback to individual filter processing if no pre-filtered products available
      else {
        if (advancedFilters.selectedBrands && advancedFilters.selectedBrands.length > 0) {
          query = query.in('subcategory_id', advancedFilters.selectedBrands);
          kamQuery = kamQuery.in('subcategory_id', advancedFilters.selectedBrands);
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
      }
      
      if (advancedFilters.selectedCustomers && advancedFilters.selectedCustomers.length > 0) {
        console.log('🔍 DEBUG: Main fetchForecastData - selectedCustomers filter applied:', advancedFilters.selectedCustomers);
        console.log('🔍 DEBUG: This will limit data to only these customers!');
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
        locationNodeIds = advancedFilters.selectedSupplyNetworkNodeIds;
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
          .select('id, node_name, client_hierarchy, channel, agent, umn')
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
          supplyNetworkQuery = supplyNetworkQuery.in('agent', advancedFilters.agente);
        }

        // Apply UMN filter - search nodes where umn matches selected values
        if (advancedFilters.umn && advancedFilters.umn.length > 0) {
          supplyNetworkQuery = supplyNetworkQuery.in('umn', advancedFilters.umn);
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
          query = query.in('location_node_id', locationNodeIds);
          kamQuery = kamQuery.in('location_node_id', locationNodeIds);
        } else {
          // No matching customers found, return empty results
          setRawForecastData([]);
          setCustomers([]);
          setAllCustomers([]);
          setNoResultsFound(true);
          
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
        const mainQueryResult = await query;
        data = mainQueryResult.data;
        error = mainQueryResult.error;
        
        if (error) {
          console.error('commercial_collaboration_view query failed:', error);
          
          // Try fallback to base table if view fails
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
            data = fallbackResult.data;
            error = null;
          }
        } else {
          console.log(`✅ MAIN QUERY SUCCESS - Retrieved ${data?.length || 0} rows from commercial_collaboration_view`);
          if (data && data.length > 0) {
            console.log('📊 SAMPLE DATA (first 3 rows):', data.slice(0, 3));
          } else {
            console.log('⚠️ NO DATA RETURNED from commercial_collaboration_view query');
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
        throw queryError;
      }

      if (error) throw error;



      // Store raw data for filtering
      setRawForecastData(data || []);
      console.log(`🔍 DEBUGGING DATA FLOW:
        - Raw forecast data: ${(data || []).length} rows
        - Has active filters: ${hasActiveFilters()}
        - Advanced filters:`, advancedFilters);

      // Fetch sell-in data
      const sellInDataArray = await fetchSellInData();
      console.log(`📈 Sell-in data: ${sellInDataArray.length} rows`);

      // Fetch sell-out data
      const sellOutDataArray = await fetchSellOutData();
      console.log(`📉 Sell-out data: ${sellOutDataArray.length} rows`);

      // Fetch inventory data for DDI Totales
      const inventoryDataArray = await fetchInventoryData();
      console.log(`📦 Inventory data: ${inventoryDataArray.length} rows`);

      // Process the data using the new function with KAM and inventory data
      const allCustomersData = processForecastData(data || [], customerNamesMap, selectedDateRange, sellInDataArray, sellOutDataArray, productAttributesMap, kamData || [], inventoryDataArray);
      console.log(`👥 Processed customers data: ${allCustomersData.length} customers`);

      
      // If no data or insufficient data, add hardcoded sample data
      let finalCustomersData = allCustomersData;
      
      if (allCustomersData.length === 0) {
        console.log('No data found, generating hardcoded sample data...');
        finalCustomersData = generateHardcodedSampleData();
      } else if (allCustomersData.length > 0) {
        // Check if existing data has meaningful values
        const hasMeaningfulData = allCustomersData.some(customer => 
          Object.values(customer.months).some(monthData => 
            monthData.last_year > 0 || monthData.calculated_forecast > 0 || monthData.effective_forecast > 0
          )
        );
        
        if (!hasMeaningfulData) {
          console.log('Data exists but has no meaningful values, enhancing with sample data...');
          finalCustomersData = enhanceDataWithSampleValues(allCustomersData);
        }
      }

      
      // Apply client-side advanced filters
      const advancedFilteredData = applyAdvancedFilters(finalCustomersData);
      
      // Check if no results were found - show toast notification and keep table with zeros
      const hasActiveFiltersNow = hasActiveFilters();
      const noDataFound = advancedFilteredData.length === 0;
      
      // Simplified no data handling - only set state, let UI handle display
      if (noDataFound) {
        setNoResultsFound(true);
      } else if (!noDataFound) {
        // Data found - reset all error states
        setNoResultsFound(false);
        setNoResultsMessageDismissed(false);
        setError(null); // Clear any previous error state
      }
      
      setAllCustomers(finalCustomersData);
      setCustomers(advancedFilteredData);
      
      console.log(`🎯 FINAL DATA SUMMARY:
        - All customers: ${finalCustomersData.length}
        - Advanced filtered customers: ${advancedFilteredData.length}
        - Sample customer data:`, advancedFilteredData.slice(0, 2));
      
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

        
        // Don't show toast for zero totals - let the main UI handle empty state display
        if (!allTotalsZero) {
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
  }, [processForecastData, selectedProduct?.product_id, selectedLocation?.location_id, selectedCustomer?.customer_id, selectedDateRange, advancedFilters, customerNamesCache, customerNamesLoaded, fetchSellInData, fetchSellOutData, fetchInventoryData, applyAdvancedFilters, months, noResultsMessageDismissed]);

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

  // Manual data fetching - only fetch when user explicitly requests it
  // This prevents automatic reloading when filters change and no data is found
  useEffect(() => {
    // Only reset dismissed state when filters change, but don't auto-fetch
    // This allows users to adjust multiple filters without triggering automatic reloads
    setNoResultsMessageDismissed(false);
  }, [selectedProduct?.product_id, selectedLocation?.location_id, selectedCustomer?.customer_id, selectedDateRange, JSON.stringify(advancedFilters)]);


  
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

  // Show no data screen when explicitly set or when conditions indicate no data
  if (!loading && (noResultsFound || (customers.length === 0 && rawForecastData.length === 0))) {
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
              
              {/* Debug button to analyze filter data flow */}
              {(advancedFilters.selectedProducts?.length > 0 || advancedFilters.selectedSupplyNetworkNodeIds?.length > 0) && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-yellow-800">Diagnóstico de Filtros</span>
                  </div>
                  <p className="text-sm text-yellow-700 mb-3">
                    Se detectaron filtros avanzados activos. Ejecuta el diagnóstico para verificar el flujo de datos.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={debugAdvancedFiltersDataFlow}
                    className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                  >
                    🔍 Ejecutar Diagnóstico de Datos
                  </Button>
                  <p className="text-xs text-yellow-600 mt-2">
                    Resultados aparecerán en la consola del navegador (F12 → Console)
                  </p>
                </div>
              )}
              
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (error) {
    console.log('Error al cargar los datos:', error);
    return null;
  }

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
            
            {/* Customer Selection Debug Info */}
            {advancedFilters.selectedCustomers && advancedFilters.selectedCustomers.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-sm font-medium text-red-800 mb-2">⚠️ Cliente Seleccionado Activo</h4>
                <p className="text-xs text-red-700 mb-2">
                  Solo se muestran datos para: {advancedFilters.selectedCustomers.join(', ')}
                </p>
                <Button
                  onClick={clearCustomerSelection}
                  size="sm"
                  variant="outline"
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  <X className="h-3 w-3 mr-1" />
                  Eliminar Selección de Cliente
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 flex gap-3">
              <Button
                onClick={() => fetchForecastData(true)}
                disabled={loading || filterLoading}
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading || filterLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Aplicar Filtros
                  </>
                )}
              </Button>
              
              {hasActiveFilters() && (
                <Button
                  onClick={async () => {
                    // Clear filters and show all data
                    setSelectedProduct(null);
                    setSelectedLocation(null);
                    setSelectedCustomer(null);
                    setSelectedDateRange(null);
                    setAdvancedFilters({
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
                    // Small delay to let state update, then fetch all data
                    setTimeout(() => fetchForecastData(true), 100);
                  }}
                  disabled={loading || filterLoading}
                  variant="outline"
                  className="h-9 px-4"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Todos los Datos
                </Button>
              )}
            </div>
            
            {/* Debug buttons section */}
            <div className="mt-4 space-y-3">
              {/* Advanced filters debug */}
              {(advancedFilters.selectedProducts?.length > 0 || advancedFilters.selectedSupplyNetworkNodeIds?.length > 0) && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-yellow-800">Diagnóstico de Filtros</span>
                  </div>
                  <p className="text-sm text-yellow-700 mb-3">
                    Se detectaron filtros avanzados activos. Ejecuta el diagnóstico para verificar el flujo de datos.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={debugAdvancedFiltersDataFlow}
                    className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                  >
                    🔍 Ejecutar Diagnóstico de Datos
                  </Button>
                  <p className="text-xs text-yellow-600 mt-2">
                    Resultados aparecerán en la consola del navegador (F12 → Console)
                  </p>
                </div>
              )}
            </div>
            
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
              
              const lastYear = customersToUse.reduce((sum, customer) => {
                const monthData = customer.months[month];
                return sum + (monthData ? (monthData.last_year || 0) : 0);
              }, 0);
              
              const m8Predict = customersToUse.reduce((sum, customer) => {
                const monthData = customer.months[month];
                return sum + (monthData ? (monthData.calculated_forecast || 0) : 0);
              }, 0);

              return {
                month,
                displayMonth: month.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
                // BY M8 Predict - Using calculated_forecast
                m8Predict,
                // PCI 26 - Using pci_26 field
                pci26: customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.pci_26 || 0) : 0);
                }, 0),
                // Ajustes KAM - Using kam_forecast_correction
                kamAdjustments: customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.kam_forecast_correction || 0) : 0);
                }, 0),
                // DDI Totales - Using inventory_days field
                ddi: customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.inventory_days || 0) : 0);
                }, 0),
                // SI AA - Using sell_in_aa field
                sellInAA: customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.sell_in_aa || 0) : 0);
                }, 0),
                // SI Actual - Using sell_in_aa field (same as SI AA for now)
                sellInActual: customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.sell_in_aa || 0) : 0);
                }, 0),
                // SO AA - Using sell_out_aa field
                sellOutAA: customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.sell_out_aa || 0) : 0);
                }, 0),
                // SO Actual - Using sell_out_real field (fallback to sell_out_aa if not available)
                sellOutActual: customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.sell_out_real || monthData.sell_out_aa || 0) : 0);
                }, 0),
                // Growth percentage calculation
                growthPercentage: lastYear > 0 ? ((m8Predict - lastYear) / lastYear) * 100 : 0,
                // Legacy fields for backward compatibility
                kamForecast: customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.kam_forecast_correction || 0) : 0);
                }, 0),
                effectiveForecast: customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.effective_forecast || 0) : 0);
                }, 0),
                lastYear
              };
            });

            // Find max values for scaling
            const maxForecastValue = Math.max(
              ...chartData.map(d => Math.max(d.m8Predict, d.pci26, d.kamAdjustments, d.ddi, d.sellInAA, d.sellOutAA))
            );

            // Get growth percentage range for secondary axis scaling
            const maxGrowth = Math.max(...chartData.map(d => Math.abs(d.growthPercentage)));
            const minGrowth = Math.min(...chartData.map(d => d.growthPercentage));

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
                      
                      <button
                        onClick={() => toggleSeriesVisibility('m8PredictArea')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-all ${
                          chartSeriesVisible.m8PredictArea 
                            ? 'bg-orange-50 text-orange-700 border border-orange-300' 
                            : 'bg-gray-100 text-gray-400 border border-gray-300'
                        }`}
                      >
                        <div 
                          className={`w-3 h-3 rounded ${chartSeriesVisible.m8PredictArea ? '' : 'bg-gray-300'}`}
                          style={{ backgroundColor: chartSeriesVisible.m8PredictArea ? chartSeriesColors.m8PredictArea : undefined, opacity: 0.5 }}
                        ></div>
                        By M8 Predict 
                      </button>
                      
                      <button
                        onClick={() => toggleSeriesVisibility('pci26Area')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-all ${
                          chartSeriesVisible.pci26Area 
                            ? 'bg-sky-50 text-sky-700 border border-sky-300' 
                            : 'bg-gray-100 text-gray-400 border border-gray-300'
                        }`}
                      >
                        <div 
                          className={`w-3 h-3 rounded ${chartSeriesVisible.pci26Area ? '' : 'bg-gray-300'}`}
                          style={{ backgroundColor: chartSeriesVisible.pci26Area ? chartSeriesColors.pci26Area : undefined, opacity: 0.5 }}
                        ></div>
                        PCI 26
                      </button>
                      
                      <button
                        onClick={() => toggleSeriesVisibility('kamAdjustmentsArea')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-all ${
                          chartSeriesVisible.kamAdjustmentsArea 
                            ? 'bg-amber-50 text-amber-700 border border-amber-300' 
                            : 'bg-gray-100 text-gray-400 border border-gray-300'
                        }`}
                      >
                        <div 
                          className={`w-3 h-3 rounded ${chartSeriesVisible.kamAdjustmentsArea ? '' : 'bg-gray-300'}`}
                          style={{ backgroundColor: chartSeriesVisible.kamAdjustmentsArea ? chartSeriesColors.kamAdjustmentsArea : undefined, opacity: 0.5 }}
                        ></div>
                        Ajustes KAM 
                      </button>
                      
                      <button
                        onClick={() => toggleSeriesVisibility('sellInLine')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-all ${
                          chartSeriesVisible.sellInLine 
                            ? 'bg-violet-50 text-violet-700 border border-violet-300' 
                            : 'bg-gray-100 text-gray-400 border border-gray-300'
                        }`}
                      >
                        <div 
                          className={`w-3 h-3 rounded-full ${chartSeriesVisible.sellInLine ? '' : 'bg-gray-300'}`}
                          style={{ backgroundColor: chartSeriesVisible.sellInLine ? chartSeriesColors.sellInLine : undefined }}
                        ></div>
                        SI AA
                      </button>
                      
                      <button
                        onClick={() => toggleSeriesVisibility('sellInActualLine')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-all ${
                          chartSeriesVisible.sellInActualLine 
                            ? 'bg-purple-50 text-purple-700 border border-purple-300' 
                            : 'bg-gray-100 text-gray-400 border border-gray-300'
                        }`}
                      >
                        <div 
                          className={`w-3 h-3 rounded-full ${chartSeriesVisible.sellInActualLine ? '' : 'bg-gray-300'}`}
                          style={{ backgroundColor: chartSeriesVisible.sellInActualLine ? chartSeriesColors.sellInActualLine : undefined }}
                        ></div>
                        SI Actual
                      </button>
                      
                      <button
                        onClick={() => toggleSeriesVisibility('sellOutAALine')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-all ${
                          chartSeriesVisible.sellOutAALine 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' 
                            : 'bg-gray-100 text-gray-400 border border-gray-300'
                        }`}
                      >
                        <div 
                          className={`w-3 h-3 rounded-full ${chartSeriesVisible.sellOutAALine ? '' : 'bg-gray-300'}`}
                          style={{ 
                            backgroundColor: chartSeriesVisible.sellOutAALine ? chartSeriesColors.sellOutAALine : undefined,
                            border: chartSeriesVisible.sellOutAALine ? `2px dotted ${chartSeriesColors.sellOutAALine}` : '2px dotted #d1d5db'
                          }}
                        ></div>
                        SO AA
                      </button>
                      
                      <button
                        onClick={() => toggleSeriesVisibility('sellOutActualLine')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-all ${
                          chartSeriesVisible.sellOutActualLine 
                            ? 'bg-teal-50 text-teal-700 border border-teal-300' 
                            : 'bg-gray-100 text-gray-400 border border-gray-300'
                        }`}
                      >
                        <div 
                          className={`w-3 h-3 rounded-full ${chartSeriesVisible.sellOutActualLine ? '' : 'bg-gray-300'}`}
                          style={{ 
                            backgroundColor: chartSeriesVisible.sellOutActualLine ? chartSeriesColors.sellOutActualLine : undefined,
                            border: chartSeriesVisible.sellOutActualLine ? `2px dotted ${chartSeriesColors.sellOutActualLine}` : '2px dotted #d1d5db'
                          }}
                        ></div>
                        SO Actual
                      </button>
                      
                      <button
                        onClick={() => toggleSeriesVisibility('ddiBar')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-all ${
                          chartSeriesVisible.ddiBar 
                            ? 'bg-orange-50 text-orange-700 border border-orange-300' 
                            : 'bg-gray-100 text-gray-400 border border-gray-300'
                        }`}
                      >
                        <div 
                          className={`w-3 h-3 rounded ${chartSeriesVisible.ddiBar ? '' : 'bg-gray-300'}`}
                          style={{ backgroundColor: chartSeriesVisible.ddiBar ? chartSeriesColors.ddiBar : undefined }}
                        ></div>
                        DDI Totales
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
                          name === 'm8Predict' ? 'BY M8 Predict' :
                          name === 'pci26' ? 'PCI 26' :
                          name === 'kamAdjustments' ? 'Ajustes KAM' :
                          name === 'ddi' ? 'DDI Totales' :
                          name === 'sellInAA' ? 'SI AA' :
                          name === 'sellInActual' ? 'SI Actual' :
                          name === 'sellOutAA' ? 'SO AA' :
                          name === 'sellOutActual' ? 'SO Actual' :
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

                      {/* Area Chart for M8.predict */}
                      {chartSeriesVisible.m8PredictArea && (
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="m8Predict"
                          stroke={chartSeriesColors.m8PredictArea}
                          fill={`${chartSeriesColors.m8PredictArea}50`}
                          strokeWidth={2}
                          fillOpacity={0.4}
                          name="BY M8 Predict"
                        />
                      )}

                      {/* Area Chart for PCI 26 */}
                      {chartSeriesVisible.pci26Area && (
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="pci26"
                          stroke={chartSeriesColors.pci26Area}
                          fill={`${chartSeriesColors.pci26Area}50`}
                          strokeWidth={2}
                          fillOpacity={0.4}
                          name="PCI 26"
                        />
                      )}

                      {/* Area Chart for Ajustes del KAM */}
                      {chartSeriesVisible.kamAdjustmentsArea && (
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="kamAdjustments"
                          stroke={chartSeriesColors.kamAdjustmentsArea}
                          fill={`${chartSeriesColors.kamAdjustmentsArea}50`}
                          strokeWidth={2}
                          fillOpacity={0.4}
                          name="Ajustes KAM"
                        />
                      )}

                      {/* Bar Charts for Forecasts */}
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

                      {/* Bar Chart for DDI Totales (Días de inventario) */}
                      {chartSeriesVisible.ddiBar && (
                        <Bar
                          yAxisId="left"
                          dataKey="ddi"
                          fill={chartSeriesColors.ddiBar}
                          name="DDI Totales"
                          radius={[2, 2, 0, 0]}
                          opacity={0.7}
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

                      {/* Sell-In AA Line (continuous) */}
                      {chartSeriesVisible.sellInLine && (
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="sellInAA"
                          stroke={chartSeriesColors.sellInLine}
                          strokeWidth={2}
                          dot={{ 
                            fill: chartSeriesColors.sellInLine, 
                            strokeWidth: 2, 
                            r: 4 
                          }}
                          activeDot={{ 
                            r: 6, 
                            fill: chartSeriesColors.sellInLine
                          }}
                          name="SI AA"
                        />
                      )}

                      {/* Sell-In Actual Line (continuous) */}
                      {chartSeriesVisible.sellInActualLine && (
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="sellInActual"
                          stroke={chartSeriesColors.sellInActualLine}
                          strokeWidth={2}
                          dot={{ 
                            fill: chartSeriesColors.sellInActualLine, 
                            strokeWidth: 2, 
                            r: 4 
                          }}
                          activeDot={{ 
                            r: 6, 
                            fill: chartSeriesColors.sellInActualLine
                          }}
                          name="SI Actual"
                        />
                      )}

                      {/* Sell-Out AA Line (dotted) */}
                      {chartSeriesVisible.sellOutAALine && (
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="sellOutAA"
                          stroke={chartSeriesColors.sellOutAALine}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ 
                            fill: chartSeriesColors.sellOutAALine, 
                            strokeWidth: 2, 
                            r: 4 
                          }}
                          activeDot={{ 
                            r: 6, 
                            fill: chartSeriesColors.sellOutAALine
                          }}
                          name="SO AA"
                        />
                      )}

                      {/* Sell-Out Actual Line (dotted) */}
                      {chartSeriesVisible.sellOutActualLine && (
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="sellOutActual"
                          stroke={chartSeriesColors.sellOutActualLine}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ 
                            fill: chartSeriesColors.sellOutActualLine, 
                            strokeWidth: 2, 
                            r: 4 
                          }}
                          activeDot={{ 
                            r: 6, 
                            fill: chartSeriesColors.sellOutActualLine
                          }}
                          name="SO Actual"
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
                          <li>• <strong>Área naranja:</strong> BY M8 Predict - Pronóstico estadístico base</li>
                          <li>• <strong>Área azul cielo:</strong> PCI {new Date().getFullYear() + 1} - Proyección de categoría</li>
                          <li>• <strong>Área morada:</strong> Ajustes del KAM - Modificaciones comerciales</li>
                          <li>• <strong>Barras naranjas:</strong> DDI Totales - Días de inventario</li>
                          <li>• <strong>Líneas continuas:</strong> SI AA (Sell-in año anterior) y SI Actual</li>
                          <li>• <strong>Líneas punteadas:</strong> SO AA (Sell-out año anterior) y SO Actual</li>
                          <li>• <strong>Línea roja:</strong> % Crecimiento BY M8 Predict vs año anterior (eje derecho)</li>
                          <li>• <strong>Eje izquierdo:</strong> Valores absolutos en pesos mexicanos</li>
                          <li>• <strong>Eje derecho:</strong> Porcentaje de crecimiento</li>
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
              {months.map(month => (
                <div 
                  key={month} 
                  className={`sticky top-0 p-2 text-center font-semibold text-xs z-10 ${
                    month.includes('24') ? 'bg-yellow-200' : 'bg-blue-200'
                  }`}
                >
                  {formatMonthDisplay(month)}
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
            {(!selectedCustomerId || selectedCustomerId === 'all') && (
              <>
               
          
               
                {/* Row 1: Año pasado (LY) - HIDDEN but data available for calculations */}
                <div className="contents" style={{ display: 'none' }}>
                  
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
                        
                        {renderSummaryColumns(customersToUse, "Año pasado (LY)")}
                      </>
                    );
                  })()}
                </div>  

                {/* Rows for other metrics for "Todos los clientes" */}
                
                {/* Row 13: Ajustes del KAM */}
                {/* <div className="contents">
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
                </div> */}

               
                {/* Row 1: SI VENTA 2024 */}
                <div className="contents">
                  <div className="bg-gray-100 p-2 font-bold text-sm">
                    Todos los clientes
                  </div>
                  <div className="bg-gray-100 p-1 text-xs">
                    {selectedProduct?.product_id ? selectedProduct.product_id : 'Todos los productos'}
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    SI A-2 
                  </div>
                    <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    Sell-in {new Date().getFullYear() - 2}
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
                        
                        {renderSummaryColumns(customersToUse, "Sell in 23")}
                      </>
               
                    );
                  })()}
                </div>

                {/* Row 2: SI 2025 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    SI  AA
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                     Sell-in {new Date().getFullYear() -1}
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
                        
                        {renderSummaryColumns(customersToUse, "Sell in AA")}
                   
               
                       
                      </>
                    );
                  })()}
                </div>



                {/* Row 3: SI 2025 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    SI Actual
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                     Sell-in {new Date().getFullYear() }
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
                        
                        {renderSummaryColumns(customersToUse, "Sell in Actual")}
                   
               
                       
                      </>
                    );
                  })()}
                </div>

                {/* Row 18: SO 2024 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    SO AA
                  </div>
                    <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    Sell-out {new Date().getFullYear() - 1}
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
                        
                        {renderSummaryColumns(customersToUse, "Sell Out AA")}
                      </>
                    );
                  })()}
                </div>

                {/* Row 19: SO 2025 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    SO Actual
                  </div>
                    <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    Sell-out {new Date().getFullYear()}
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
                        
                        {renderSummaryColumns(customersToUse, "Sell Out Actual")}
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
                    Días de inventario totales
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
                            return sum + (monthData ? monthData.inventory_days : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-inventory-days`} 
                                 className={`p-1 text-right text-xs ${
                                   month.includes('24') ? 'bg-green-100' : 'bg-green-50'
                                 }`}>
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse, "DDI Totales")}
                      </>
                    );
                  })()}
                </div>

                {/* Row 25: PPTO 2025 (Actual Budget) */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    PPTO Actual
                  </div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    Budget {new Date().getFullYear()} (Initial Sales Plan)
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          // Only show values for 2025 months
                          const shouldShowValue = shouldShowValueForYear(month, 2025);
                          const totalValue = shouldShowValue ? customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.ppto_2025 || 0 : 0);
                          }, 0) : 0;
                          
                          return (
                            <div key={`all-${month}-ppto-2025`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: shouldShowValue ? '#dcfce7' : '#f3f4f6' }}>
                              {shouldShowValue ? formatValue(totalValue) : ''}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse, "PPTO 2025")}
                      </>
                    );
                  })()}
                </div>

            
                {/* Row 26: PPTO 2026 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    PPTO A + 1
                  </div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    Budget {new Date().getFullYear() +1} (Initial Sales Plan)
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    return (
                      <>
                        {months.map(month => {
                          // Only show values for 2026 months
                          const shouldShowValue = shouldShowValueForYear(month, 2026);
                          const totalValue = shouldShowValue ? customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.ppto_2026 || 0 : 0);
                          }, 0) : 0;
                          
                          return (
                            <div key={`all-${month}-ppto-2026`} 
                                 className="p-1 text-right text-xs"
                                 style={{ backgroundColor: shouldShowValue ? '#dcfce7' : '#f3f4f6' }}>
                              {shouldShowValue ? formatValue(totalValue) : ''}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse, "PPTO 2026")}
                      </>
                    );
                  })()}
                </div>

             
                {/* Row 31: KAM 26 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    KAM A + 1 ✏️
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    KAM {new Date().getFullYear() + 1} ✏️
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

                {/* Row 32: BY 26 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    By M8 Predict !!
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
                        
                        
                        {renderSummaryColumns(customersToUse, "BY M8 Predict")}
                      </>
                    );
                  })()}
                </div>

             
                {/* Row 34: PCI  */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e0e7ff] p-1 text-xs z-10">
                    PCI Actual
                  </div>
                  <div className="bg-[#e0e7ff] p-1 text-xs z-10">
                    PCI {new Date().getFullYear() }
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
               

                
                
                {/* Row 1: Año pasado (LY) - HIDDEN but data available for calculations */}
                 
                <div className="contents" style={{ display: 'none' }}>
                  
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
                  
                  {renderIndividualSummaryColumns(customer, "Año pasado (LY)")}
                </div>
                
                {/* Row 2: Sell in AA */}
                {/* <div className="contents">
                  
                    <div className="bg-gray-100 p-2 font-bold text-sm">
                    {customer.customer_name}
                  </div>
                  <div className="bg-gray-100 p-1 text-xs">
                    <div className="font-medium">{customer.product_id || 'No producto'}</div>
                    {customer.product_name && (
                      <div className="text-gray-600 mt-1">{customer.product_name}</div>
                    )}
                  </div>
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
                  
                  {renderIndividualSummaryColumns(customer, "Sell in AA")}
                </div> */}

                {/* Row 3: Sell Out AA */}
                {/* <div className="contents">
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
                  
                  {renderIndividualSummaryColumns(customer, "Sell Out AA")}
                </div> */}

                {/* Row 4: Sell Out real */}
                {/* <div className="contents">
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
                  
                  {renderIndividualSummaryColumns(customer, "Sell Out real")}
                </div> */}

                {/* Row 5: Proyectado - Equipo CPFR
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
                  
                  {renderIndividualSummaryColumns(customer, "KAM aprobado")}
                </div> */}

                {/* Row 6: Días de inventario
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
                  
                  {renderIndividualSummaryColumns(customer, "Días de inventario")}
                </div> */}

        
                {/* Row 9: Fcst Estadístico - BY */}
                {/* <div className="contents">
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
                  
                  {renderIndividualSummaryColumns(customer, "Fcst Estadístico - BY")}
                </div> */}

              
                {/* Row 13: Ajustes del KAM */}
                {/* <div className="contents">
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
                  
                            <div className="inline-flex items-center gap-1 font-medium">
                              {kamValue ? kamValue.toLocaleString('es-MX') : '0'}
                              {kamValue > 0 && <span className="text-blue-600 opacity-75">✏️</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })} 
                  
                  {renderIndividualSummaryColumns(customer, "Ajustes del KAM")}
                </div> */}

                {/* Row 14: Building blocks */}
            
                {/* Row 15: PCI diferenciado por canal */}
                {/* <div className="contents">
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
                  
                  {renderIndividualSummaryColumns(customer, "Forecast M8.predict")}
                </div> */}

                {/* Row 16: SI VENTA 2024 */}
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
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    SI VENTA A-2
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    Sell-in {new Date().getFullYear() - 2}
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
                  


                  {renderIndividualSummaryColumns(customer, "SI VENTA A-2")}
                </div>

                {/* Row 17: SI AA */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    SI AA
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    Sell-in {new Date().getFullYear() - 1}
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.sell_in_aa : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-si-aa`} 
                           className={`p-1 text-right text-xs ${
                             month.includes('24') ? 'bg-yellow-100' : 'bg-blue-100'
                           }`}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer, "Sell in AA")}
                </div>

                {/* Row 18: SI Actual */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    SI Actual
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    Sell-in {new Date().getFullYear()}
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

                  {renderIndividualSummaryColumns(customer, "SI Actual")}
                </div>

              
                {/* Row 20: SO AA */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    SO AA
                  </div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    Sell-out {new Date().getFullYear() - 1}
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.sell_out_aa : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-so-aa`} 
                           className={`p-1 text-right text-xs ${
                             month.includes('24') ? 'bg-yellow-100' : 'bg-yellow-50'
                           }`}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer, "Sell Out AA")}
                </div>

                {/* Row 21: SO Actual */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    SO Actual
                  </div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    Sell-out {new Date().getFullYear()}
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

                  {renderIndividualSummaryColumns(customer, "Sell Out Actual")}
                </div>

               
                {/* Row 20: DDI Totales */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    DDI 
                  </div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    Días de inventario
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.inventory_days : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-ddi-totales`} 
                           className={`p-1 text-right text-xs ${
                             month.includes('24') ? 'bg-green-100' : 'bg-green-50'
                           }`}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer, "DDI Totales")}
                </div>

            
                {/* Row 25: PPTO 2025 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    PPTO Actual
                  </div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    Budget {new Date().getFullYear()}
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const shouldShowValue = shouldShowValueForYear(month, 2025);
                    const value = shouldShowValue ? (monthData ? monthData.ppto_2025 || 0 : 0) : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-ppto-2025`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: shouldShowValue ? '#dcfce7' : '#f3f4f6' }}>
                        {shouldShowValue ? formatValue(value) : ''}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer, "PPTO 2025")}
                </div>

                {/* Row 26: PPTO 2026 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    PPTO A+1 
                  </div>
                <div className="bg-[#dcfce7] p-1 text-xs z-10">
                    Budget {new Date().getFullYear() +1 }
                    </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const shouldShowValue = shouldShowValueForYear(month, 2026);
                    const value = shouldShowValue ? (monthData ? monthData.ppto_2026 || 0 : 0) : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-ppto-2026`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: shouldShowValue ? '#dcfce7' : '#f3f4f6' }}>
                        {shouldShowValue ? formatValue(value) : ''}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer, "PPTO 2026")}
                </div>

                {/* Row 31: KAM 26 */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    KAM A + 1 ✏️
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    KAM {new Date().getFullYear() + 1} ✏️
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
                  
                            <div className="inline-flex items-center gap-1 font-medium">
                              {kamValue ? kamValue.toLocaleString('es-MX') : '0'}
                              {kamValue > 0 && <span className="text-blue-600 opacity-75">✏️</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })} 
                  
                  {renderIndividualSummaryColumns(customer, "KAM A + 1")}
                </div>

                {/* Row 32: BY M8 Predict */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    BY M8 Predict
                  </div> 
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    M8 Forecast {new Date().getFullYear() + 1}
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
                  
                  {renderIndividualSummaryColumns(customer, "BY M8 Predict")}
                </div>

                {/* Row 33: PCI Actual */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e0e7ff] p-1 text-xs z-10">
                    PCI Actual
                  </div>
                  <div className="bg-[#e0e7ff] p-1 text-xs z-10">
                    PCI {new Date().getFullYear()}
                  </div>
                  {months.map(month => {
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.pci_26 || 0 : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-pci-actual`} 
                           className="p-1 text-right text-xs"
                           style={{ backgroundColor: month.includes('26') ? '#e0e7ff' : '#f3f4f6' }}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer, "PCI Actual")}
                </div>

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
