
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
  location_id: string; // Added location_id for better mapping
  customer_id: string; // Added customer_id for better mapping
  
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
    sell_in_23: number; // Year-2 (2023) sell-in data
    sell_in_actual: number; // Current year (2025) sell-in data
    sell_out_aa: number;
    sell_out_actual: number; // Current year (2025) sell-out data
    sell_out_real: number;
    inventory_days: number;
    forecast_commercial_input: number; // Original commercial_input from forecast_data (approved_sm_kam)
    actual_by_m8: number; // Actual values from commercial_collaboration_view.actual for M8 Predict
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
  // Helper function to format numbers, always showing 0 for null/undefined values
  const formatValue = (value: number | null | undefined): string => {
    if (value !== null && value !== undefined) {
      return value.toLocaleString('es-MX');
    }
    return '0';
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
      'Año pasado (LY)': 'last_year', // Historical data from last year
      
      'Sell in AA': 'sell_in_aa', // Year-1 (2024) sell-in data
      'Sell in 23': 'sell_in_23', // Year-2 (2023) sell-in data
      'Sell in Actual': 'sell_in_actual', // Current year (2025) sell-in data
      'SI Actual': 'sell_in_actual', // Current year (2025) sell-in data
      'SI VENTA A-2': 'sell_in_23', // Year-2 (2023) sell-in data
      'Sell in last year': 'last_year', // Use the last_year field from database
      'Sell in this year': 'sell_in_aa_y', // Current year sell-in data
      'Sell Out AA': 'sell_out_aa',
      'Sell Out Actual': 'sell_out_actual', // Current year sell-out data
      'SO A': 'sell_out_actual', // Current year sell-out data
      'Sell Out real': 'sell_out_real',
      'Fcst Estadístico - BY': 'calculated_forecast',
      'Ajustes del KAM': 'kam_forecast_correction',
      'KAM A + 1': 'kam_forecast_correction', // KAM adjustments for next year
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
      'DDI Totales': 'ddi_totales',
      'PPTO 2025': 'ppto_2025',
      'PPTO 2026': 'ppto_2026',
      'PPTO Actual': 'ppto_2025', // PPTO for current year (2025)
      'PPTO A+1': 'ppto_2026', // PPTO for next year (2026)
      'PPTO A + 1': 'ppto_2026', // PPTO for next year (2026) - alternate spacing
      
      
      // 2026 planning fields
      'KAM 26': 'kam_26',
      'BY 26': 'by_26',
      'BB 26': 'bb_26',
      'PCI 26': 'pci_26',
      'PCI Actual': 'pci_26', // PCI for current year
      
      // M8 Predict fields
      'M8 Predict': 'actual_by_m8',
      'M8 Predic ind': 'actual_by_m8',

      // Legacy mappings for backward compatibility
      'Fcst Estadístico': 'calculated_forecast',

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
        
        if (attribute === 'attr_3') {
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
    
    // Get the last 4 months from the sorted array (YTG = Year To Go = last 4 months)
    const lastFourMonths = monthKeys.slice(-4);
    
    let total = 0;
    let totalRawSum = 0; // Track total before multiplication to check if we should return 0
    let debugInfo: any[] = [];
    
    lastFourMonths.forEach(monthKey => {
      const monthData = customer.months[monthKey];
      if (monthData) {
        let monthTotal = 0;
        rowValuesToUse.forEach(field => {
          const fieldValue = (monthData[field as keyof typeof monthData] || 0);
          monthTotal += fieldValue;
        });
        
        // Track total raw sum to determine if we should show 0
        totalRawSum += monthTotal;
        
        if (attribute === 'attr_3') {
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
    const isCurrentYearOnly = rowType === "M8 Predict" || rowType === "Sell in Actual" || rowType === "SI Actual" || rowType === "Sell Out Actual" || rowType == "Inventory Days" || rowType == "DDI Totales";
    
    // Special handling for PPTO rows - budget values should not be multiplied by attributes
    const isPPTO = rowType === "PPTO 2025" || rowType === "PPTO 2026" || rowType === "PPTO Actual" || rowType === "PPTO A+1" || rowType === "PPTO A + 1" ;
    
    let sumCajasYTD, sumLitrosYTD, sumPesosYTD;
    let sumCajasYTG, sumLitrosYTG, sumPesosYTG;
    let sumCajasTotal, sumLitrosTotal, sumPesosTotal;
    
    if (isCurrentYearOnly) {
      // For M8 Predict, calculate sums only for the correct year based on row type
      let targetYear: number;
      if (rowType === "M8 Predict") {
        targetYear = new Date().getFullYear() + 1; // 2025 for M8 Predict
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
    } else if (isPPTO) {
      // ✅ Special handling for PPTO (Budget) rows - Sum raw values without multiplying by attributes
      // PPTO values are budget targets and should be shown as-is
      const calculatePPTOSum = () => {
        return customersToUse.reduce((total, customer) => {
          let customerPPTO = 0;
          Object.keys(customer.months).forEach(monthKey => {
            // Filter by year based on row type
            let targetYear: number;
            if (rowType === "PPTO 2025" || rowType === "PPTO Actual") {
              targetYear = new Date().getFullYear(); // 2025
            } else if (rowType === "PPTO 2026" || rowType === "PPTO A+1" || rowType === "PPTO A + 1") {
              targetYear = new Date().getFullYear() + 1; // 2026
            } else {
              targetYear = new Date().getFullYear(); // Default
            }
            
            if (shouldShowValueForYear(monthKey, targetYear)) {
              const monthData = customer.months[monthKey];
              if (monthData && fieldName) {
                const fieldValue = monthData[fieldName as keyof typeof monthData] || 0;
                customerPPTO += fieldValue; // Sum the budget values directly, no multiplication
              }
            }
          });
          return total + customerPPTO;
        }, 0);
      };
      
      // For PPTO, all columns show the same total budget value
      sumCajasYTD = sumCajasYTG = sumCajasTotal = calculatePPTOSum();
      sumLitrosYTD = sumLitrosYTG = sumLitrosTotal = calculatePPTOSum();
      sumPesosYTD = sumPesosYTG = sumPesosTotal = calculatePPTOSum();
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

  // Helper function to render summary columns for individual customer rows
  const renderIndividualSummaryColumns = (customer: CustomerData, rowType: string = "calculated_forecast") => {
    // Get the specific field name for this row type
    const fieldName = getFieldNameForRowType(rowType);
    
    // Special handling for rows that only consider specific year months
    const isYearFiltered = rowType === "M8 Predict" || rowType === "Sell in Actual" || rowType === "SI Actual" || 
                          rowType === "Sell Out Actual" || rowType === "PPTO 2025" || rowType === "PPTO 2026" ||
                          rowType === "SI VENTA A-2" || rowType === "Sell in AA" || rowType === "PPTO Actual" || 
                          rowType === "PPTO A+1" || rowType === "PPTO A + 1";
    
    // Special handling for PPTO rows - don't multiply by attributes
    const isPPTO = rowType === "PPTO 2025" || rowType === "PPTO 2026" || rowType === "PPTO Actual" || 
                   rowType === "PPTO A+1" || rowType === "PPTO A + 1";
    
    // Helper function to calculate values with optional year filtering
    const calculateWithYearFilter = (customer: CustomerData, attribute: 'attr_1' | 'attr_2' | 'attr_3', calculationType: 'YTD' | 'YTG' | 'Total') => {
      if (isYearFiltered) {
        // Determine which year to filter by based on row type
        let targetYear: number;
        if (rowType === "SI VENTA A-2") {
          targetYear = new Date().getFullYear() - 2; // 2023
        } else if (rowType === "Sell in AA") {
          targetYear = new Date().getFullYear() - 1; // 2024
        } else if (rowType === "M8 Predict") {
          targetYear = new Date().getFullYear() + 1; // Always year + 1 for M8 Predict
        } else if (rowType === "PPTO 2025" || rowType === "PPTO Actual" || rowType === "Sell in Actual" || rowType === "SI Actual" || rowType === "Sell Out Actual") {
          targetYear = new Date().getFullYear(); // 2025
        } else if (rowType === "PPTO 2026" || rowType === "PPTO A+1" || rowType === "PPTO A + 1") {
          targetYear = new Date().getFullYear() + 1; // 2026
        } else {
          targetYear = new Date().getFullYear(); // Default to current year
        }
        
        let total = 0;
        
        Object.keys(customer.months).forEach(monthKey => {
          if (shouldShowValueForYear(monthKey, targetYear)) {
            const monthData = customer.months[monthKey];
            if (monthData && fieldName) {
              const fieldValue = monthData[fieldName as keyof typeof monthData] || 0;
              
              // Special handling for PPTO - use raw values without multiplication
              if (isPPTO) {
                total += fieldValue; // Budget values should not be multiplied
              } else if (attribute === 'attr_3') {
                // Cajas: use raw values (already in cajas units)
                total += fieldValue;
              } else {
                // Litros/Pesos: multiply by attribute multiplier
                const multiplier = customer[attribute] || 0;
                total += fieldValue * multiplier;
              }
            }
          }
        });
        
        return total;
      } else {
        // For other row types, use the original calculation functions
        if (calculationType === 'YTD') {
          return calculateCustomerYTD(customer, attribute, fieldName);
        } else if (calculationType === 'YTG') {
          return calculateCustomerYTG(customer, attribute, fieldName);
        } else {
          return calculateCustomerTotal(customer, attribute, fieldName);
        }
      }
    };
    
    return (
      <>
        {/* Cajas column */}
        <div className="bg-purple-50 p-1 text-center text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-right text-xs">
              {formatValue(calculateWithYearFilter(customer, 'attr_3', 'YTD'))}
            </div>
            <div className="text-right text-xs">
              {formatValue(calculateWithYearFilter(customer, 'attr_3', 'YTG'))}
            </div>
            <div className="text-right text-xs">
              {formatValue(calculateWithYearFilter(customer, 'attr_3', 'Total'))}
            </div>
          </div>
        </div>
        
        {/* Litros column */}
        <div className="bg-green-50 p-1 text-center text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-right text-xs">
              {formatValue(calculateWithYearFilter(customer, 'attr_1', 'YTD'))}
            </div>
            <div className="text-right text-xs">
              {formatValue(calculateWithYearFilter(customer, 'attr_1', 'YTG'))}
            </div>
            <div className="text-right text-xs">
              {formatValue(calculateWithYearFilter(customer, 'attr_1', 'Total'))}
            </div>
          </div>
        </div>
        
        {/* Pesos column */}
        <div className="bg-orange-50 p-1 text-center text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-right text-xs">
              {formatValue(calculateWithYearFilter(customer, 'attr_2', 'YTD'))}
            </div>
            <div className="text-right text-xs">
              {formatValue(calculateWithYearFilter(customer, 'attr_2', 'YTG'))}
            </div>
            <div className="text-right text-xs">
              {formatValue(calculateWithYearFilter(customer, 'attr_2', 'Total'))}
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
  const [lastEditedKamTotal, setLastEditedKamTotal] = useState<{ [month: string]: number }>({});
  

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
  const [kamA1Sums, setKamA1Sums] = useState<{ [month: string]: number }>({});
  const [previousKamValue, setPreviousKamValue] = useState<number | null>(null);
  const dataTypes = [
    'Año pasado (LY)', 'Gap Forecast vs ventas', 'Forecast M8.predict', 'Key Account Manager', 
    'Kam Forecast', 'Sales manager view', 'Effective Forecast', 'KAM aprobado',
    'SI VENTA 2024', 'SI 2025', 'SO 2024', 'SO 2025', 'DDI Totales', 'SI PIN 2025', 
    'LE-1', 'SI PIN 2026', '% PIN vs AA-1', 'PPTO 2025', 'PPTO 2026', 
    '% PIN 26 vs AA 25', '% PIN 26 vs PPTO 26', 'PIN SEP', '% PIN SEP vs PIN', 
    'KAM 26', 'BY 26', 'BB 26', 'PCI 26' , 'PCI Actual', 'M8 Predict', 'Sell in Actual', 
    'SI Actual', 'Sell Out Actual', 'Inventory Days', 'PPTO Actual', 'PPTO A+1', 'PPTO A + 1',
    'SI VENTA A-2',  'Sell in AA'
  ];

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



useEffect(() => {
  async function fetchKamA1Sums() {
    const targetYear = new Date().getFullYear() + 1;
    const monthAbbrs = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const newSums: { [month: string]: number } = {};

    for (let i = 0; i < 12; i++) {
      const monthAbbr = monthAbbrs[i];
      const year = String(targetYear).slice(-2);

      // Use your current filters
      const marcaNames = advancedFilters.marca?.length > 0 ? advancedFilters.marca : null;
      const productLines = advancedFilters.productLine?.length > 0 ? advancedFilters.productLine : null;
      const clientHierarchy = advancedFilters.clientHierarchy?.length > 0 ? advancedFilters.clientHierarchy : null;
      const channel = advancedFilters.canal?.length > 0 ? advancedFilters.canal : null;
      const agente = advancedFilters.agente?.length > 0 ? advancedFilters.agente : null;
      const udn = advancedFilters.umn?.length > 0 ? advancedFilters.umn : null;

      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .rpc('get_kam_a1_total_flexible', {
          p_month_abbr: monthAbbr,
          p_year: year,
          p_marca_names: marcaNames,
          p_product_lines: productLines,
          p_class_names: null,
          p_subclass_names: null,
          p_client_hierarchy: clientHierarchy,
          p_channel: channel,
          p_agente: agente,
          p_udn: udn,
        });
      
      newSums[`${monthAbbr}-${year}`] = error ? 0 : (data ?? 0);
    }
    setKamA1Sums(newSums);
  }

  fetchKamA1Sums();
}, [advancedFilters]);


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

  // Generate all months based on selected date range or default to 24 months
  const allMonths = useMemo(() => {
    if (!selectedDateRange?.from || !selectedDateRange?.to) {
      // Default to October 2024 through September 2026 (24 months)
      return [
        'oct-24', 'nov-24', 'dic-24',
        'ene-25', 'feb-25', 'mar-25', 'abr-25', 'may-25', 'jun-25', 'jul-25', 'ago-25', 'sep-25',
        'oct-25', 'nov-25', 'dic-25',
        'ene-26', 'feb-26', 'mar-26', 'abr-26', 'may-26', 'jun-26', 'jul-26', 'ago-26', 'sep-26'
      ];
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
    const year = monthIndex >= 11 ? currentYear - 1 : currentYear; // oct(9), nov(10), dic(11) are -1 year
    const yearShort = String(year).slice(-2);
    
    return `${monthAbbr}-${yearShort}`;
  }, []);

  // Helper function to get month key for calendar year (enero to diciembre of specific year)
  const getMonthKeyForCalendarYear = useCallback((monthIndex: number, targetYear: number): string => {
    const monthAbbreviations = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const monthAbbr = monthAbbreviations[monthIndex];
    const yearShort = String(targetYear).slice(-2);
    
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

  // Helper function to determine if we should show grouped view (no individual customers)
  const shouldShowGroupedView = useCallback(() => {
    return !!(
      (advancedFilters.marca && advancedFilters.marca.length > 0) ||
      (advancedFilters.productLine && advancedFilters.productLine.length > 0) ||
      (advancedFilters.clientHierarchy && advancedFilters.clientHierarchy.length > 0)
    );
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
  const fetchSellInData = useCallback(async () => {
    try {
      let query = (supabase as any)
        .schema('m8_schema')
        .from('v_sales_transaction_in')
        .select('product_id, location_node_id, customer_node_id, postdate, quantity')
        .gte('postdate', '2023-10-01')
        .lte('postdate', '2026-12-31') // <-- include 2026
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

      // Apply marca and productLine filters for sell-in data using limited approach to avoid URL length limits
      if (advancedFilters.marca && advancedFilters.marca.length > 0) {
        // Use a more efficient JOIN-based query to avoid URL length limits
        const { data, error } = await (supabase as any)
          .schema('m8_schema')
          .rpc('get_sales_in_by_marca', {
            marca_names: advancedFilters.marca,
            date_from: '2023-01-01',
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
          .rpc('get_sales_in_by_product_line', {
            product_line_names: advancedFilters.productLine,
            date_from: '2023-01-01',
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
        .gte('postdate', '2023-01-01')
        .lte('postdate', '2025-12-31') // <-- include 2026
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
        console.log('� SEND - Adding advanced customers filter to v_sales_transaction_out:', advancedFilters.selectedCustomers);
        query = query.in('customer_node_id', advancedFilters.selectedCustomers);
      }
    
      // Apply marca and productLine filters for sell-out data using JOIN approach to avoid long URLs
      if (advancedFilters.marca && advancedFilters.marca.length > 0 && !advancedFilters.productLine.length) {
        // Use a more efficient JOIN-based query to avoid URL length limits
        const { data, error } = await (supabase as any)
          .schema('m8_schema')
          .rpc('get_sales_out_by_marca', {
            marca_names: advancedFilters.marca,
            date_from: '2023-01-01',
            date_to: '2025-12-31',
          });
        console.log('� FETCH - Fetching sell-OUT marca get data with filters:', {
          data, error
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
          console.log('� FETCH - Fetching sell out line get data with filters:')
        const { data, error } = await (supabase as any)
          .schema('m8_schema')
          .rpc('get_sales_out_by_product_line', {
            product_line_names: advancedFilters.productLine,
            date_from: '2023-01-01',
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
      console.log("DATA del sell out resultante", data);
     if (error) throw error;


      setSellOutData(data || []);
      
      return data || [];
    } catch (error) {
      console.error('Error fetching sell-OUT data:', error);
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
        .gte('postdate', '2025-01-01')
        .lte('postdate', '2025-12-31') // <-- include 2026
        .order('customer_node_id', { ascending: true })
        .order('postdate', { ascending: true });
      console.log('� FETCH - Fetching inventory data with filters:', {
        selectedProduct,
        selectedLocation,
        selectedCustomer,
        selectedDateRange,
        advancedFilters
      });
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
            date_from: '2025-01-01',
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
            .limit(1000); // Limit to prevent URL overflow
          
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
            date_from: '2025-01-01',
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
            .limit(1000); // Limit to prevent URL overflow
          
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

  const processForecastData = useCallback((rawData: CommercialCollaborationData[], customerNamesMap: {[key: string]: string}, dateFilter: DateRange | null = null, sellInDataArray: any[] = [], sellOutDataArray: any[] = [], productAttributesMap: { [key: string]: { attr_1: number; attr_2: number; attr_3: number } } = {}, kamDataArray: any[] = [], inventoryDataArray: any[] = []) => {
    const groupedData: { [key: string]: CustomerData } = {};
    
    // Counters for skipped rows to avoid console spam
    let skippedMainRows = 0;
    let skippedSellInRows = 0;
    let skippedSellOutRows = 0;
    let skippedKamRows = 0;
    
    // Pre-define month map for better performance - includes all calendar years (2023-2027)
    // Dynamically generate monthMap for any year range (e.g., 2023-2030)
    const monthMap: { [key: string]: string } = (() => {
      const map: { [key: string]: string } = {};
      const monthAbbrs = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      // Extend range to include 2026 and 2027 for A+1 and future years
      const startYear = 2023;
      const endYear = new Date().getFullYear() + 2; // e.g., 2027 if now is 2025
      for (let year = startYear; year <= endYear; year++) {
        const yearShort = String(year).slice(-2);
        for (let m = 0; m < 12; m++) {
          const monthNum = String(m + 1).padStart(2, '0');
          map[`${monthNum}-${yearShort}`] = `${monthAbbrs[m]}-${yearShort}`;
        }
      }
      return map;
    })();
    
    // Track records with actual data for M8 Predict debugging
    let recordsWithActualData = 0;
    let totalActualSum = 0;
    
    // 🔍 DEBUG: Log first 5 raw data records to see what's coming in
    console.log('📊 RAW DATA SAMPLE (first 5 records):', rawData.slice(0, 5).map(row => ({
      customer_node_id: row.customer_node_id,
      product_id: row.product_id,
      location_node_id: row.location_node_id,
      postdate: row.postdate,
      actual: row.actual,
      forecast: row.forecast,
      forecast_ly: row.forecast_ly
    })));
    console.log('📊 TOTAL RAW DATA RECORDS:', rawData.length);
    
    rawData.forEach((row: CommercialCollaborationData) => {
      // Use customer_node_id/location_node_id if present, else fallback to customer_id/location_id
      const customerNodeId = row.customer_node_id || row.customer_id;
      const locationNodeId = row.location_node_id || row.location_id;
      if (!customerNodeId || !locationNodeId) {
        skippedMainRows++;
        return;
      }
      
      // Track actual data for debugging
      if (row.actual && row.actual !== 0) {
        recordsWithActualData++;
        totalActualSum += row.actual;
      }
      
      // Group by customer_node_id and product_id combination
      const customerProductKey = `${customerNodeId}-${row.product_id || 'no-product'}`;
      
      if (!groupedData[customerProductKey]) {
        const productAttributes = productAttributesMap[row.product_id] || { attr_1: 0, attr_2: 0, attr_3: 0 };
        
    
        
        // Get customer name with enhanced fallback logic and null safety
        const customerName = customerNamesMap[customerNodeId] || 
                            (customerNodeId ? `Cliente ${customerNodeId.substring(0, 8)}...` : 'Cliente desconocido');
        
        groupedData[customerProductKey] = {
          customer_node_id: customerNodeId,
          customer_name: customerName,
          product_id: row.product_id || 'no-product',
          product_name: row.product_id ? getProductName(row.product_id) : 'Sin producto',
          location_node_id: locationNodeId, // Add location information
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
            sell_in_23: 0, // Year-2 (2023) sell-in data
            sell_in_actual: 0, // Current year (2025) sell-in data
            sell_out_aa: 0,
            sell_out_actual: 0, // Current year (2025) sell-out data
            sell_out_real: 0,
            inventory_days: 0,
            forecast_commercial_input: 0,
            actual_by_m8: 0,
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
        monthData.kam_forecast_correction += row.sm_kam_override || 0; // KAM adjustments from sm_kam_override field
        monthData.sales_manager_view += row.forecast_sales_manager || 0; // From commercial_collaboration
        monthData.effective_forecast += row.sm_kam_override || row.commercial_input || row.forecast || 0; // sm_kam_override takes priority
        monthData.forecast_commercial_input += row.approved_sm_kam || 0; // Original commercial_input from forecast_data
        // TEMPORARY FIX: Try using forecast field if actual is empty
        const m8PredictValue = row.actual || row.forecast || 0;
        monthData.actual_by_m8 += m8PredictValue;
        
    
        
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
            sell_in_23: 0, // Year-2 (2023) sell-in data
            sell_in_actual: 0, // Current year (2025) sell-in data
            sell_out_aa: 0,
            sell_out_actual: 0, // Current year (2025) sell-out data
            sell_out_real: 0,
            inventory_days: 0,
            forecast_commercial_input: 0,
            actual_by_m8: 0,
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
        
        // Add sell-in quantity to the appropriate field based on year
        const date = new Date(sellInRow.postdate);
        const year = date.getFullYear();
        
        if (year === 2023) {
          // Year-2 (2023) data goes to sell_in_23
          groupedData[customerProductKey].months[displayMonth].sell_in_23 += sellInRow.quantity || 0;
        } else if (year === 2024) {
          // Year-1 (2024) data goes to sell_in_aa 
          groupedData[customerProductKey].months[displayMonth].sell_in_aa += sellInRow.quantity || 0;
        } else if (year === 2025) {
          // Current year (2025) data goes to sell_in_actual
          groupedData[customerProductKey].months[displayMonth].sell_in_actual += sellInRow.quantity || 0;
        }
      }
    });

    // Process sell-out data from v_time_series_sell_out.value
    let sellOutRecordsProcessed = 0;
    let sellOutRecordsAdded = 0;
    
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
      
      // 🔍 DEBUG: Track if we're finding the customer
      if (!groupedData[customerProductKey]) {
        // Create customer entry if it doesn't exist (sell-out data without forecast data)
        const productAttributes = productAttributesMap[sellOutRow.product_id] || { attr_1: 0, attr_2: 0, attr_3: 0 };
        const customerName = customerNamesMap[sellOutRow.customer_node_id] || 
                            (sellOutRow.customer_node_id ? `Cliente ${sellOutRow.customer_node_id.substring(0, 8)}...` : 'Cliente desconocido');
        
        groupedData[customerProductKey] = {
          customer_node_id: sellOutRow.customer_node_id,
          customer_name: customerName,
          product_id: sellOutRow.product_id || 'no-product',
          product_name: sellOutRow.product_id ? getProductName(sellOutRow.product_id) : 'Sin producto',
          location_node_id: sellOutRow.location_node_id,
          attr_1: productAttributes.attr_1,
          attr_2: productAttributes.attr_2,
          attr_3: productAttributes.attr_3,
          months: {},
          monthPostdates: {}
        };
      }
      
      if (displayMonth && groupedData[customerProductKey] && isMonthInDateRange(displayMonth, dateFilter)) {
        sellOutRecordsProcessed++;
        
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
            sell_in_23: 0, // Year-2 (2023) sell-in data
            sell_in_actual: 0, // Current year (2025) sell-in data
            sell_out_aa: 0,
            sell_out_actual: 0, // Current year (2025) sell-out data
            sell_out_real: 0,
            inventory_days: 0,
            forecast_commercial_input: 0,
            actual_by_m8: 0,
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
        
        // Add sell-out value to the appropriate field based on year
        const date = new Date(sellOutRow.postdate);
        const year = date.getFullYear();
        
        if (year === 2023) {
          // Year-2 (2023) data - could be used for historical comparison
          // For now, we'll add it to sell_out_aa as additional historical data
          groupedData[customerProductKey].months[displayMonth].sell_out_aa += sellOutRow.quantity || 0;
          sellOutRecordsAdded++;
        } else if (year === 2024) {
          // Year-1 (2024) data goes to sell_out_aa
          groupedData[customerProductKey].months[displayMonth].sell_out_aa += sellOutRow.quantity || 0;
          sellOutRecordsAdded++;
        } else if (year === 2025) {
          // Current year (2025) data goes to sell_out_actual
          groupedData[customerProductKey].months[displayMonth].sell_out_actual += sellOutRow.quantity || 0;
          sellOutRecordsAdded++;
        }
      }
    });

    // 🔍 DEBUG: Log sell-out data summary with enhanced details
    console.log('📊 SELL-OUT DATA PROCESSING:', {
      total_sellout_records: sellOutDataArray.length,
      skipped_sellout_rows: skippedSellOutRows,
      records_processed: sellOutRecordsProcessed,
      records_added: sellOutRecordsAdded,
      sample_sellout: sellOutDataArray.slice(0, 3).map((row: any) => ({
        customer_node_id: row.customer_node_id,
        product_id: row.product_id,
        postdate: row.postdate,
        quantity: row.quantity,
        year: new Date(row.postdate).getFullYear(),
        monthKey: `${(new Date(row.postdate).getMonth() + 1).toString().padStart(2, '0')}-${new Date(row.postdate).getFullYear().toString().slice(-2)}`,
        displayMonth: monthMap[`${(new Date(row.postdate).getMonth() + 1).toString().padStart(2, '0')}-${new Date(row.postdate).getFullYear().toString().slice(-2)}`]
      }))
    });
    
    // 🔍 DEBUG: Log actual sell-out values stored
    const customersWithSellOut = Object.values(groupedData).filter(customer => 
      Object.values(customer.months).some(m => m.sell_out_aa > 0 || m.sell_out_actual > 0)
    );
    console.log('📊 CUSTOMERS WITH SELL-OUT DATA:', {
      total_customers_with_sellout: customersWithSellOut.length,
      sample_customer_sellout: customersWithSellOut.slice(0, 2).map(c => ({
        customer_id: c.customer_node_id,
        product_id: c.product_id,
        months_with_sellout: Object.entries(c.months)
          .filter(([_, m]) => m.sell_out_aa > 0 || m.sell_out_actual > 0)
          .map(([month, m]) => ({ month, sell_out_aa: m.sell_out_aa, sell_out_actual: m.sell_out_actual }))
      }))
    });

    // Process KAM adjustments from commercial_collaboration table
    let pptoRecordsProcessed = 0;
    let pptoRecordsAdded = 0;
    
    // 🔍 DEBUG: Log ALL fields from first 3 KAM records to identify field names
    console.log('📊 PPTO/KAM FIRST 3 RECORDS - RAW DATA:', kamDataArray.slice(0, 3).map((row: any, idx: number) => {
      const allFields = Object.keys(row);
      return {
        index: idx,
        all_fields: allFields,
        all_values: row,
        has_initial_sales_plan: !!row.initial_sales_plan,
        initial_sales_plan_value: row.initial_sales_plan,
        // Try various possible field names for customer
        customer_checks: {
          customer_node_id: row.customer_node_id,
          customer_id: row.customer_id,
          customerid: row.customerid,
          node_id: row.node_id,
          id: row.id
        }
      };
    }));
    
    // 🔍 DEBUG: Count and log ALL records with initial_sales_plan values
    const recordsWithPPTO = kamDataArray.filter((row: any) => row.initial_sales_plan && row.initial_sales_plan !== null && row.initial_sales_plan !== 0);
    console.log('💰 PPTO RECORDS ANALYSIS:', {
      total_kam_records: kamDataArray.length,
      records_with_initial_sales_plan: recordsWithPPTO.length,
      sample_ppto_records: recordsWithPPTO.slice(0, 5).map((row: any) => ({
        customer_node_id: row.customer_node_id,
        customer_id: row.customer_id,
        product_id: row.product_id,
        location_node_id: row.location_node_id,
        location_id: row.location_id,
        postdate: row.postdate,
        initial_sales_plan: row.initial_sales_plan,
        year: new Date(row.postdate).getFullYear()
      }))
    });
    
    // 🔧 FIX: Map various customer/location field name variations
    let pptoFieldMappingCount = 0;
    kamDataArray = kamDataArray.map((row: any, idx: number) => {
      // Try multiple field name variations for customer
      const customerId = row.customer_node_id || row.customer_id || row.customerid || row.node_id;
      const locationId = row.location_node_id || row.location_id || row.locationid;
      
      // 🔍 DEBUG: Log first 5 PPTO records with initial_sales_plan
      if (row.initial_sales_plan && pptoFieldMappingCount < 5) {
        console.log(`💰 PPTO FIELD MAPPING #${pptoFieldMappingCount + 1}:`, {
          original_customer_node_id: row.customer_node_id,
          original_customer_id: row.customer_id,
          mapped_customer_node_id: customerId,
          original_location_id: row.location_id,
          mapped_location_node_id: locationId,
          postdate: row.postdate,
          initial_sales_plan: row.initial_sales_plan,
          product_id: row.product_id
        });
        pptoFieldMappingCount++;
      }
      
      return {
        ...row,
        customer_node_id: customerId,
        location_node_id: locationId
      };
    });
    
    kamDataArray.forEach((kamRow: any, index: number) => {
      // 🔧 SPECIAL HANDLING: PPTO records without customer_node_id should be distributed to all matching products
      if (!kamRow.customer_node_id) {
        // If this is a PPTO record (has initial_sales_plan), distribute it to all customers with this product
        if (kamRow.initial_sales_plan && kamRow.product_id) {
          // Log first 3 for debugging
          if (pptoRecordsProcessed < 3) {
            console.log(`💰 PPTO Record WITHOUT customer_node_id - will distribute to all customers with product ${kamRow.product_id}:`, {
              product_id: kamRow.product_id,
              location_node_id: kamRow.location_node_id,
              initial_sales_plan: kamRow.initial_sales_plan,
              postdate: kamRow.postdate
            });
          }
          
          pptoRecordsProcessed++;
          
          // Parse postdate
          const date = new Date(kamRow.postdate);
          const month = date.getMonth() + 1;
          const year = date.getFullYear();
          const monthKey = `${month.toString().padStart(2, '0')}-${year.toString().slice(-2)}`;
          const displayMonth = monthMap[monthKey];
          
          if (!displayMonth || !isMonthInDateRange(displayMonth, dateFilter)) {
            return; // Skip if month not in range
          }
          
          // Find all customers with this product (and optionally this location)
          const matchingCustomers = Object.keys(groupedData).filter(key => {
            const parts = key.split('-');
            const keyProductId = parts[1];
            const customer = groupedData[key];
            
            // Match by product_id and optionally location_node_id
            const productMatches = keyProductId === kamRow.product_id;
            const locationMatches = !kamRow.location_node_id || customer.location_node_id === kamRow.location_node_id;
            
            return productMatches && locationMatches;
          });
          
          if (matchingCustomers.length === 0) {
            console.warn(`⚠️ No matching customers found for PPTO record:`, {
              product_id: kamRow.product_id,
              location_node_id: kamRow.location_node_id
            });
            return;
          }
          
          // Distribute PPTO, DDI, M8 Predict, and PCI to all matching customers
          matchingCustomers.forEach(customerProductKey => {
            if (!groupedData[customerProductKey].months[displayMonth]) {
              // Initialize month if it doesn't exist
              groupedData[customerProductKey].months[displayMonth] = {
                last_year: 0,
                forecast_sales_gap: 0,
                calculated_forecast: 0,
                kam_forecast_correction: 0,
                sales_manager_view: 0,
                effective_forecast: 0,
                xamview: 0,
                forecast_commercial_input: 0,
                actual_by_m8: 0,
                sell_in_aa: 0,
                sell_in_23: 0,
                sell_in_actual: 0,
                sell_out_aa: 0,
                sell_out_actual: 0,
                sell_out_real: 0,
                inventory_days: 0,
                ddi_totales: 0,
                ppto_2025: 0,
                ppto_2026: 0,
                kam_26: 0,
                by_26: 0,
                bb_26: 0,
                pci_26: 0,
                si_venta_2024: 0,
                si_2025: 0,
                so_2024: 0,
                so_2025: 0,
                si_pin_2025: 0,
                le_1: 0,
                si_pin_2026: 0,
                pin_vs_aa_1: 0,
                pin_26_vs_aa_25: 0,
                pin_26_vs_ppto_26: 0,
                pin_sep: 0,
                pin_sep_vs_pin: 0
              };
            }
            
            // Assign PPTO to appropriate year
            const monthYear = parseInt(displayMonth.split('-')[1]) + (parseInt(displayMonth.split('-')[1]) < 50 ? 2000 : 1900);
            if (monthYear === 2025) {
              groupedData[customerProductKey].months[displayMonth].ppto_2025 = kamRow.initial_sales_plan;
              pptoRecordsAdded++;
              
              // 🔍 DEBUG: Log distributed PPTO 2025
              if (pptoRecordsAdded <= 3) {
                console.log(`💰 DISTRIBUTED PPTO 2025 to customer ${customerProductKey}:`, {
                  displayMonth,
                  monthYear,
                  initial_sales_plan: kamRow.initial_sales_plan,
                  customer_key: customerProductKey
                });
              }
            } else if (monthYear === 2026) {
              groupedData[customerProductKey].months[displayMonth].ppto_2026 = kamRow.initial_sales_plan;
              pptoRecordsAdded++;
              
              // 🔍 DEBUG: Log distributed PPTO 2026
              if (pptoRecordsAdded <= 3) {
                console.log(`💰 DISTRIBUTED PPTO 2026 (A+1) to customer ${customerProductKey}:`, {
                  displayMonth,
                  monthYear,
                  initial_sales_plan: kamRow.initial_sales_plan,
                  customer_key: customerProductKey
                });
              }
            }
            
            // ✅ Also distribute DDI Totales from database
            if (kamRow.ddi_totales && kamRow.ddi_totales > 0) {
              groupedData[customerProductKey].months[displayMonth].ddi_totales = kamRow.ddi_totales;
              groupedData[customerProductKey].months[displayMonth].inventory_days = kamRow.ddi_totales;
            }
            
            // ✅ Also distribute M8 Predict from database
            if (kamRow.m8_predict && kamRow.m8_predict > 0) {
              groupedData[customerProductKey].months[displayMonth].actual_by_m8 += kamRow.m8_predict;
            }
            
            // ✅ Also distribute PCI Actual from database
            if (kamRow.pci_actual && kamRow.pci_actual > 0) {
              groupedData[customerProductKey].months[displayMonth].pci_26 = kamRow.pci_actual;
            }
          });
          
          return; // Done processing this PPTO record
        }
        
        // For non-PPTO records, skip if no customer_node_id
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
            sell_in_23: 0, // Year-2 (2023) sell-in data
            sell_in_actual: 0, // Current year (2025) sell-in data
            sell_out_aa: 0,
            sell_out_actual: 0, // Current year (2025) sell-out data
            sell_out_real: 0,
            inventory_days: 0,
            forecast_commercial_input: 0,
            actual_by_m8: 0,
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
        const newValue = kamRow.sm_kam_override || kamRow.commercial_input || 0;
        

        
        // Set the KAM adjustment value (overwrite, don't add, since this is the adjustment value)
        // Priority: sm_kam_override > commercial_input for KAM adjustments
        groupedData[customerProductKey].months[displayMonth].kam_forecast_correction = newValue;
        
        // ✅ Process PPTO (Budget) data from initial_sales_plan based on year
        if (kamRow.initial_sales_plan) {
          pptoRecordsProcessed++;
          const monthYear = parseInt(displayMonth.split('-')[1]) + (parseInt(displayMonth.split('-')[1]) < 50 ? 2000 : 1900);
          
          if (monthYear === 2025) {
            groupedData[customerProductKey].months[displayMonth].ppto_2025 = kamRow.initial_sales_plan;
            pptoRecordsAdded++;
            
          
            
          } else if (monthYear === 2026) {
            groupedData[customerProductKey].months[displayMonth].ppto_2026 = kamRow.initial_sales_plan;
            pptoRecordsAdded++;
            
            // 🔍 DEBUG: Log first 5 PPTO 2026 assignments
            if (pptoRecordsAdded <= 5) {
              console.log(`💰 PPTO 2026 (A+1) ASSIGNMENT #${pptoRecordsAdded}:`, {
                customer_id: kamRow.customer_node_id,
                product_id: kamRow.product_id,
                postdate: kamRow.postdate,
                displayMonth,
                monthYear,
                initial_sales_plan: kamRow.initial_sales_plan,
                stored_value: groupedData[customerProductKey].months[displayMonth].ppto_2026
              });
            }
          }
        }
        
        // ✅ Process DDI Totales from database (from KAM function)
        if (kamRow.ddi_totales && kamRow.ddi_totales > 0) {
          groupedData[customerProductKey].months[displayMonth].ddi_totales = kamRow.ddi_totales;
          groupedData[customerProductKey].months[displayMonth].inventory_days = kamRow.ddi_totales;
        }
        
        // ✅ Process M8 Predict from database (from KAM function)
        if (kamRow.m8_predict && kamRow.m8_predict > 0) {
          groupedData[customerProductKey].months[displayMonth].actual_by_m8 += kamRow.m8_predict;
        }
        
        // ✅ Process PCI from database (from KAM function)
        if (kamRow.pci_actual && kamRow.pci_actual > 0) {
          groupedData[customerProductKey].months[displayMonth].pci_26 = kamRow.pci_actual;
        }
      }
    });
    
    
    // Process inventory data from inventory_transactions table for DDI Totales
    let skippedInventoryRows = 0;
    let inventoryRecordsProcessed = 0;
    let inventoryRecordsAdded = 0;
    
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
      
      // 🔍 DEBUG: Track if we're finding the customer
      if (!groupedData[customerProductKey]) {
        // Create customer entry if it doesn't exist (inventory data without forecast data)
        const productAttributes = productAttributesMap[inventoryRow.product_id] || { attr_1: 0, attr_2: 0, attr_3: 0 };
        const customerName = customerNamesMap[inventoryRow.customer_node_id] || 
                            (inventoryRow.customer_node_id ? `Cliente ${inventoryRow.customer_node_id.substring(0, 8)}...` : 'Cliente desconocido');
        
        groupedData[customerProductKey] = {
          customer_node_id: inventoryRow.customer_node_id,
          customer_name: customerName,
          product_id: inventoryRow.product_id || 'no-product',
          product_name: inventoryRow.product_id ? getProductName(inventoryRow.product_id) : 'Sin producto',
          location_node_id: inventoryRow.location_node_id,
          attr_1: productAttributes.attr_1,
          attr_2: productAttributes.attr_2,
          attr_3: productAttributes.attr_3,
          months: {},
          monthPostdates: {}
        };
      }
      
      if (displayMonth && groupedData[customerProductKey] && isMonthInDateRange(displayMonth, dateFilter)) {
        inventoryRecordsProcessed++;
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
            sell_in_23: 0, // Year-2 (2023) sell-in data
            sell_in_actual: 0, // Current year (2025) sell-in data
            sell_out_aa: 0,
            sell_out_actual: 0, // Current year (2025) sell-out data
            sell_out_real: 0,
            inventory_days: 0,
            forecast_commercial_input: 0,
            actual_by_m8: 0,
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
        
        // Set both inventory_days and ddi_totales using EOH (End of Hand) from inventory_transactions
        // EOH represents the current inventory level, which is used for DDI (Días de inventario) calculation
        // Parse EOH value - it comes as string from database (e.g., "3370.0000")
        const eohValue = parseFloat(inventoryRow.eoh) || 0;
        groupedData[customerProductKey].months[displayMonth].inventory_days = eohValue;
        groupedData[customerProductKey].months[displayMonth].ddi_totales = eohValue;
        
        if (eohValue > 0) {
          inventoryRecordsAdded++;
        }
      }
    });

    // 🔍 DEBUG: Log inventory data summary with enhanced details
    console.log('📊 INVENTORY DATA PROCESSING:', {
      total_inventory_records: inventoryDataArray.length,
      skipped_inventory_rows: skippedInventoryRows,
      records_processed: inventoryRecordsProcessed,
      records_added: inventoryRecordsAdded,
      sample_inventory: inventoryDataArray.slice(0, 3).map((row: any) => ({
        customer_node_id: row.customer_node_id,
        product_id: row.product_id,
        postdate: row.postdate,
        eoh: row.eoh,
        year: new Date(row.postdate).getFullYear(),
        monthKey: `${(new Date(row.postdate).getMonth() + 1).toString().padStart(2, '0')}-${new Date(row.postdate).getFullYear().toString().slice(-2)}`,
        displayMonth: monthMap[`${(new Date(row.postdate).getMonth() + 1).toString().padStart(2, '0')}-${new Date(row.postdate).getFullYear().toString().slice(-2)}`]
      }))
    });
    
    // 🔍 DEBUG: Log actual inventory values stored
    const customersWithInventory = Object.values(groupedData).filter(customer => 
      Object.values(customer.months).some(m => m.ddi_totales > 0 || m.inventory_days > 0)
    );
    console.log('📊 CUSTOMERS WITH INVENTORY DATA:', {
      total_customers_with_inventory: customersWithInventory.length,
      sample_customer_inventory: customersWithInventory.slice(0, 2).map(c => ({
        customer_id: c.customer_node_id,
        product_id: c.product_id,
        months_with_inventory: Object.entries(c.months)
          .filter(([_, m]) => m.ddi_totales > 0 || m.inventory_days > 0)
          .map(([month, m]) => ({ month, ddi_totales: m.ddi_totales, inventory_days: m.inventory_days }))
      }))
    });

    // Log summary of skipped rows to avoid console spam
    const totalSkipped = skippedMainRows + skippedSellInRows + skippedSellOutRows + skippedKamRows + skippedInventoryRows;

    // Log summary for M8 Predict debugging
    console.log('🔍 M8 Predict Data Summary:', {
      total_records: rawData.length,
      records_with_actual_data: recordsWithActualData,
      total_actual_sum: totalActualSum,
      skipped_rows: totalSkipped,
      final_customers: Object.values(groupedData).length
    });

    const finalCustomers = Object.values(groupedData);
    
    // 🔍 DEBUG: Log first 3 processed customers with their data
    console.log('📋 PROCESSED CUSTOMERS SAMPLE (first 3):', finalCustomers.slice(0, 3).map(customer => ({
      customer_node_id: customer.customer_node_id,
      customer_name: customer.customer_name,
      product_id: customer.product_id,
      product_name: customer.product_name,
      location_node_id: customer.location_node_id,
      months_with_data: Object.keys(customer.months),
      sample_month_data: customer.months[Object.keys(customer.months)[0]],
      actual_by_m8_totals: Object.values(customer.months).reduce((sum, m) => sum + (m.actual_by_m8 || 0), 0)
    })));

    return Object.values(groupedData);
  }, []);

  // Helper function to check if a customer has meaningful data (non-zero values)
  const customerHasValues = useCallback((customer: CustomerData) => {
    // Check if any month has non-zero values for key metrics
    const hasValues = Object.values(customer.months).some(monthData => {
      if (!monthData) return false;
      
      // Check key metrics that should have meaningful values
      const keyMetrics = [
        'last_year', 'calculated_forecast', 'effective_forecast', 'actual_by_m8',
        'sell_in_aa', 'sell_out_aa', 'sell_out_real',
        'kam_forecast_correction', 'sales_manager_view',
        'ddi_totales', 'inventory_days' // ✅ Include inventory metrics
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



  // Debug function to diagnose FilterPanel vs ForecastCollaboration data mismatch
  const debugAdvancedFiltersDataFlow = useCallback(async () => {
    // Simplified debug function - removed excessive logging
  }, [advancedFilters]);


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
      


      // OPTIMIZATION: Collect all filters first, then use optimized database function
      
      // Use focused date range for PPTO data (current year + next year only)
      // PPTO Actual = 2025, PPTO A+1 = 2026
      const optimizedDateFrom = selectedDateRange?.from ? 
        selectedDateRange.from.toISOString().split('T')[0] : 
        '2025-01-01'; // PPTO starts from current year 2025
      const optimizedDateTo = selectedDateRange?.to ? 
        selectedDateRange.to.toISOString().split('T')[0] : 
        '2026-12-31'; // Include 2026 for PPTO A+1 budget data

      // Prepare filter arrays for database function - collect from all sources
      let productIdsFilter: string[] = [];
      let customerIdsFilter: string[] = [];
      let locationIdsFilter: string[] = [];
      let subcategoryIdsFilter: string[] = [];

      // Collect filters from selected dropdowns
      if (selectedProduct?.product_id) {
        productIdsFilter.push(selectedProduct.product_id);
      }
      if (selectedCustomer?.customer_id) {
        customerIdsFilter.push(selectedCustomer.customer_id);
      }
      if (selectedLocation?.location_id) {
        locationIdsFilter.push(selectedLocation.location_id);
      }

      // Collect filters from FilterPanel - process advanced filters
      if (advancedFilters.selectedProducts && advancedFilters.selectedProducts.length > 0) {
        // OPTIMIZATION: If too many products, limit to prevent timeout
        if (advancedFilters.selectedProducts.length > 50) {
          console.warn(`Large product list detected (${advancedFilters.selectedProducts.length} products). Limiting to first 50.`);
          productIdsFilter.push(...advancedFilters.selectedProducts.slice(0, 50));
          
          toast.warning('Lista de productos muy grande', {
            description: `Mostrando los primeros 50 de ${advancedFilters.selectedProducts.length} productos para mejorar rendimiento.`,
            duration: 5000,
          });
        } else {
          productIdsFilter.push(...advancedFilters.selectedProducts);
        }
      }

      if (advancedFilters.selectedCustomers && advancedFilters.selectedCustomers.length > 0) {
        customerIdsFilter.push(...advancedFilters.selectedCustomers);
      }

      if (advancedFilters.selectedSupplyNetworkNodeIds && advancedFilters.selectedSupplyNetworkNodeIds.length > 0) {
        // Validate UUID format for location_node_id
        const validSupplyNetworkNodeIds = advancedFilters.selectedSupplyNetworkNodeIds.filter(id => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return id && uuidRegex.test(id);
        });
        locationIdsFilter.push(...validSupplyNetworkNodeIds);
      }

      if (advancedFilters.selectedBrands && advancedFilters.selectedBrands.length > 0) {
        subcategoryIdsFilter.push(...advancedFilters.selectedBrands);
      }

      // Handle marca filter by converting names to IDs
      if (advancedFilters.marca && advancedFilters.marca.length > 0 && subcategoryIdsFilter.length === 0) {
        const { data: marcaData } = await (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('subcategory_id')
          .in('subcategory_name', advancedFilters.marca)
          .limit(50);
        
        if (marcaData && marcaData.length > 0) {
          const filteredIds = marcaData.map((item: any) => item.subcategory_id as string).filter(Boolean);
          const subcategoryIds = [...new Set(filteredIds)] as string[];
          subcategoryIdsFilter.push(...subcategoryIds);
        }
      }

      // Handle productLine filter by converting to product IDs
      if (advancedFilters.productLine && advancedFilters.productLine.length > 0 && productIdsFilter.length === 0) {
        const { data: productLineData } = await (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('product_id')
          .in('class_name', advancedFilters.productLine)
          .limit(50);
        
        if (productLineData && productLineData.length > 0) {
          const productIds = productLineData.map((item: any) => item.product_id as string).filter(Boolean).slice(0, 30);
          productIdsFilter.push(...productIds);
        }
      }

      // Handle supply network filters (canal, clientHierarchy, agente, umn)
      if ((advancedFilters.canal && advancedFilters.canal.length > 0) ||
          (advancedFilters.clientHierarchy && advancedFilters.clientHierarchy.length > 0) ||
          (advancedFilters.agente && advancedFilters.agente.length > 0) ||
          (advancedFilters.umn && advancedFilters.umn.length > 0)) {
        
        let supplyNetworkQuery = (supabase as any)
          .schema('m8_schema')
          .from('supply_network_nodes')
          .select('id')
          .eq('status', 'active');

        if (advancedFilters.canal && advancedFilters.canal.length > 0) {
          supplyNetworkQuery = supplyNetworkQuery.in('channel', advancedFilters.canal);
        }
        if (advancedFilters.clientHierarchy && advancedFilters.clientHierarchy.length > 0) {
          supplyNetworkQuery = supplyNetworkQuery.in('client_hierarchy', advancedFilters.clientHierarchy);
        }
        if (advancedFilters.agente && advancedFilters.agente.length > 0) {
          supplyNetworkQuery = supplyNetworkQuery.in('agente', advancedFilters.agente);
        }
        if (advancedFilters.umn && advancedFilters.umn.length > 0) {
          supplyNetworkQuery = supplyNetworkQuery.in('udn', advancedFilters.umn);
        }

        const { data: supplyNetworkData, error: supplyNetworkError } = await supplyNetworkQuery;

        if (supplyNetworkError) {
          console.error('Error fetching supply network data for filtering:', supplyNetworkError);
        } else if (supplyNetworkData && supplyNetworkData.length > 0) {
          const networkLocationIds = supplyNetworkData.map((item: any) => item.id).filter(Boolean);
          const validLocationIds = networkLocationIds.filter((id: string) => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            return id && uuidRegex.test(id);
          });
          locationIdsFilter.push(...validLocationIds);
        } else if (locationIdsFilter.length === 0) {
          // No matching locations found, return empty results
          setRawForecastData([]);
          setCustomers([]);
          setAllCustomers([]);
          return;
        }
      }

      // Remove duplicates
      productIdsFilter = [...new Set(productIdsFilter)];
      customerIdsFilter = [...new Set(customerIdsFilter)];
      locationIdsFilter = [...new Set(locationIdsFilter)];
      subcategoryIdsFilter = [...new Set(subcategoryIdsFilter)];

      // 🔧 CRITICAL: Validate UUIDs for fields that actually use UUID type
      // NOTE: product_id and subcategory_id are TEXT in database, not UUID
      // Only validate customer_id and location_id which are actual UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      const validateUUIDs = (ids: string[], label: string): string[] => {
        const valid = ids.filter(id => {
          if (!id || typeof id !== 'string') return false;
          return uuidRegex.test(id);
        });
        
        const invalid = ids.filter(id => !valid.includes(id));
        if (invalid.length > 0) {
          console.warn(`⚠️ Filtered out ${invalid.length} invalid ${label} UUIDs:`, invalid.slice(0, 5));
        }
        
        return valid;
      };

      // Validate ONLY UUID fields (customer_id and location_id)
      // Product_id and subcategory_id are TEXT, so don't validate them as UUIDs
      customerIdsFilter = validateUUIDs(customerIdsFilter, 'customer');
      locationIdsFilter = validateUUIDs(locationIdsFilter, 'location');
      
      // Product and subcategory IDs are TEXT - just filter out null/undefined
      productIdsFilter = productIdsFilter.filter(id => id && typeof id === 'string');
      subcategoryIdsFilter = subcategoryIdsFilter.filter(id => id && typeof id === 'string');

      console.log('🔍 Calling optimized RPC function with filters:', {
        dateRange: `${optimizedDateFrom} to ${optimizedDateTo}`,
        products: productIdsFilter.length,
        customers: customerIdsFilter.length,
        locations: locationIdsFilter.length,
        subcategories: subcategoryIdsFilter.length
      });

      // Check if we have at least one valid filter after UUID validation
      const hasValidFilters = 
        productIdsFilter.length > 0 ||
        customerIdsFilter.length > 0 ||
        locationIdsFilter.length > 0 ||
        subcategoryIdsFilter.length > 0;

      if (!hasValidFilters) {
        console.log('ℹ️ No filters applied yet - waiting for filter processing to complete');
        // Don't show warning or stop execution - let the filter processing complete
        // The function may be called again with proper filters
        setRawForecastData([]);
        setCustomers([]);
        setAllCustomers([]);
        if (loadingTimer) clearTimeout(loadingTimer);
        setFilterLoading(false);
        return;
      }

      // Use optimized database function with all filters
      let query = (supabase as any)
        .schema('m8_schema')
        .rpc('get_commercial_collaboration_optimized', {
          p_date_from: optimizedDateFrom,
          p_date_to: optimizedDateTo,
          p_product_ids: productIdsFilter.length > 0 ? productIdsFilter : null,
          p_customer_ids: customerIdsFilter.length > 0 ? customerIdsFilter : null,
          p_location_ids: locationIdsFilter.length > 0 ? locationIdsFilter : null,
          p_subcategory_ids: subcategoryIdsFilter.length > 0 ? subcategoryIdsFilter : null,
          p_limit: 2000  // Increased from 500 to 2000 for more complete data
        });
     
      // Also fetch KAM adjustments using optimized function
      let kamQuery = (supabase as any)
        .schema('m8_schema')
        .rpc('get_kam_adjustments_optimized', {
          p_date_from: optimizedDateFrom,
          p_date_to: optimizedDateTo,
          p_product_ids: productIdsFilter.length > 0 ? productIdsFilter : null,
          p_customer_ids: customerIdsFilter.length > 0 ? customerIdsFilter : null,
          p_location_ids: locationIdsFilter.length > 0 ? locationIdsFilter : null,
          // p_limit: 1000  // Increased from 300 to 1000 for complete PPTO data
        });

      // Declare variables for later use (keeping for compatibility)
      let locationNodeIds: string[] = locationIdsFilter;
      let needsSupplyNetworkFilter = false; // Already handled above
      
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
        console.log('🔄 Starting main query execution...');
        
        const mainQueryResult = await query;
        
        const queryDuration = Date.now() - queryStartTime;
        console.log(`⏱️ Main query completed in ${queryDuration}ms`);
        data = mainQueryResult.data;
        error = mainQueryResult.error;
        
        // Debug: Check actual field data in the query results
        if (data && data.length > 0) {
          const recordsWithActual = data.filter(row => row.actual && row.actual !== 0);
          const recordsWithNullActual = data.filter(row => row.actual === null || row.actual === undefined);
          const recordsWithZeroActual = data.filter(row => row.actual === 0);
          
          console.log('🔍 Query Result - Actual Data Analysis:', {
            total_records: data.length,
            records_with_actual_nonzero: recordsWithActual.length,
            records_with_null_actual: recordsWithNullActual.length,
            records_with_zero_actual: recordsWithZeroActual.length,
            sample_nonzero_actual: recordsWithActual.slice(0, 3).map(row => ({
              customer: row.customer_node_id?.substring(0, 8),
              product: row.product_id,
              date: row.postdate,
              actual: row.actual
            })),
            sample_all_data: data.slice(0, 2).map(row => ({
              customer: row.customer_node_id?.substring(0, 8),
              product: row.product_id,
              date: row.postdate,
              actual: row.actual,
              forecast: row.forecast,
              approved_sm_kam: row.approved_sm_kam
            }))
          });
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
              .select('customer_node_id,postdate,product_id,location_node_id,commercial_input,initial_sales_plan')
              .gte('postdate', '2024-01-01') // Reduced date range for fallback
              .lte('postdate', '2025-12-31')
              .order('customer_node_id', { ascending: true })
              .order('postdate', { ascending: true })
              .limit(5000); // Increased limit but still reasonable
            
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
        console.log('🔍 Executing KAM query with parameters:', {
          p_date_from: optimizedDateFrom,
          p_date_to: optimizedDateTo,
          p_product_ids_count: productIdsFilter.length,
          p_customer_ids_count: customerIdsFilter.length,
          p_location_ids_count: locationIdsFilter.length,
          p_limit: 300,
          sample_product_ids: productIdsFilter.slice(0, 3)
        });
        
        // 🔍 DEBUG: Query database directly to verify PPTO data exists
        console.log('🔍 Checking if PPTO data exists in database...');
        let pptoCheckQuery = (supabase as any)
          .schema('m8_schema')
          .from('commercial_collaboration')
          .select('product_id, customer_node_id, location_node_id, postdate, initial_sales_plan')
          .not('initial_sales_plan', 'is', null)
          .gte('postdate', optimizedDateFrom)
          .lte('postdate', optimizedDateTo);
        
        // Apply product filter if we have specific products selected
        if (productIdsFilter.length > 0) {
          pptoCheckQuery = pptoCheckQuery.in('product_id', productIdsFilter); // Check ALL filtered products, not just first 10
        }
        
        const { data: pptoCheck, error: pptoCheckError } = await pptoCheckQuery.limit(100); // Increased from 20 to 100
        
        if (!pptoCheckError && pptoCheck) {
          console.log('💰 DIRECT PPTO CHECK FROM DATABASE:', {
            total_ppto_records: pptoCheck.length,
            sample_ppto_records: pptoCheck.slice(0, 5).map(row => ({
              product_id: row.product_id,
              customer_node_id: row.customer_node_id,
              postdate: row.postdate,
              initial_sales_plan: row.initial_sales_plan,
              year: new Date(row.postdate).getFullYear(),
              has_customer: !!row.customer_node_id
            }))
          });
        } else {
          console.error('❌ PPTO check failed:', pptoCheckError);
        }
        
        const kamQueryResult = await kamQuery;
        kamData = kamQueryResult.data;
        kamError = kamQueryResult.error;
        
        if (kamError) {
          console.error('KAM query failed:', kamError);
          // KAM query failure is not critical, we can continue without it
          kamData = [];
          kamError = null;
        } else {
          // 🔍 DEBUG: Analyze KAM query results immediately after fetching
          console.log('💰 KAM QUERY RESULTS - IMMEDIATE ANALYSIS:', {
            total_records: kamData?.length || 0,
            records_with_initial_sales_plan: kamData?.filter((row: any) => (row.initial_sales_plan && row.initial_sales_plan !== null && row.initial_sales_plan !== 0) || (row.forecast_qty && row.forecast_qty !== null && row.forecast_qty !== 0)).length || 0,
            sample_all_records: kamData?.slice(0, 3).map((row: any) => ({
              product_id: row.product_id,
              customer_node_id: row.customer_node_id,
              postdate: row.postdate,
              initial_sales_plan: row.initial_sales_plan,
              forecast_qty: row.forecast_qty,
              commercial_input: row.commercial_input,
              sm_kam_override: row.sm_kam_override,
              ddi_totales: row.ddi_totales,
              m8_predict: row.m8_predict,
              pci_actual: row.pci_actual
            })),
            sample_with_ppto: kamData?.filter((row: any) => (row.initial_sales_plan && row.initial_sales_plan !== null && row.initial_sales_plan !== 0) || (row.forecast_qty && row.forecast_qty !== null && row.forecast_qty !== 0)).slice(0, 5).map((row: any) => ({
              product_id: row.product_id,
              customer_node_id: row.customer_node_id,
              postdate: row.postdate,
              initial_sales_plan: row.initial_sales_plan,
              forecast_qty: row.forecast_qty,
              year: new Date(row.postdate).getFullYear()
            }))
          });
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


      // Fetch sell-in data
      const sellInDataArray = await fetchSellInData();


      // Fetch sell-out data
      const sellOutDataArray = await fetchSellOutData();


      // Fetch inventory data for DDI Totales
      const inventoryDataArray = await fetchInventoryData();


      // Process the data using the new function with KAM and inventory data
      const allCustomersData = processForecastData(data || [], customerNamesMap, selectedDateRange, sellInDataArray, sellOutDataArray, productAttributesMap, kamData || [], inventoryDataArray);


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
  }, [processForecastData, selectedProduct?.product_id, selectedLocation?.location_id, selectedCustomer?.customer_id, selectedDateRange, advancedFilters, customerNamesCache, customerNamesLoaded, fetchSellInData, fetchSellOutData, fetchInventoryData, applyAdvancedFilters, months]);

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
    const currentPeriod = calculateTotal('actual_by_m8');
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
    // const effectiveForecastTotal = calculateTotal('effective_forecast');
    // const lastYearTotal = calculateTotal('last_year');
    // const sellInTotal = calculateTotal('sell_in_aa');
    // const sellOutTotal = calculateTotal('sell_out_aa');
    
    // Check if M8 Predict has meaningful current-year-only data
    const currentYear = new Date().getFullYear() + 1;
    const hasCurrentYearM8Data = customers.some(customer => {
      return Object.keys(customer.months).some(monthKey => {
        if (shouldShowValueForYear(monthKey, currentYear)) {
          const monthData = customer.months[monthKey];
          return monthData && (monthData.actual_by_m8 || 0) > 0;
        }
        return false;
      });
    });
    
    // Check if any of the main metrics have non-zero values
    const hasMainData = m8PredictTotal > 0 || kamForecastTotal > 0;
    // effectiveForecastTotal > 0 || 
    //                lastYearTotal > 0 || sellInTotal > 0 || sellOutTotal > 0;
    
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

  // ===== M8 Predict Metrics and Quarterly Table Helpers =====
  const getM8PredictTotal = (field: string) => {
    return customers.reduce((total, customer) => {
      return total + Object.values(customer.months).reduce((monthTotal, monthData) => {
        return monthTotal + (monthData && monthData[field] ? monthData[field] : 0);
      }, 0);
    }, 0);
  };
  const getQuarterlyM8Total = (field: string, start: number, end: number) => {
    return months.slice(start, end).reduce((sum, month) => {
      return sum + customers.reduce((customerSum, customer) => {
        const monthData = customer.months[month];
        return customerSum + (monthData && monthData[field] ? monthData[field] : 0);
      }, 0);
    }, 0);
  };
  const m8PredictCajasTotal = getM8PredictTotal('actual_by_m8_cajas');
  const m8PredictLitrosTotal = getM8PredictTotal('actual_by_m8_litros');
  const m8PredictPesosTotal = getM8PredictTotal('actual_by_m8_pesos');
console.log('📊 M8 Predict Totals:',  {
  cajas: m8PredictCajasTotal,
  litros: m8PredictLitrosTotal,
  pesos: m8PredictPesosTotal
});

  // ===== KAM Adjustments Inline Editing Handlers =====
  const handleDoubleClick = useCallback((customerId: string, month: string, currentValue: number) => {
    setPreviousKamValue(currentValue); // Store previous value
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

      console.log('🔍 Resolving location_id from filters:', {
        customer_node_id: customerId,
        customer_id: customerIdText,
        product_id: productId,
        has_marca_filter: advancedFilters.marca?.length > 0,
        has_productLine_filter: advancedFilters.productLine?.length > 0,
        has_FilterPanel_locations: Object.keys(advancedFilters.availableLocations || {}).length > 0
      });

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
            date_from: '2023-01-01',
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


  const calculateM8Metric = (field: string) => {
  return customers.reduce((total, customer) => {
    return total + Object.values(customer.months).reduce((monthTotal, monthData) => {
      return monthTotal + (monthData && monthData[field] ? monthData[field] : 0);
    }, 0);
  }, 0);
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
      
      console.log('Calling PostgreSQL KAM function with parameters:', {
        customer_uuid: customerId,
        month_abbr: monthAbbr,
        year: year,
        kam_value: value,
        product_ids: productIds.length > 0 ? productIds : 'null (using marca/product_line filter)',
        marca_names: marcaNames,
        product_lines: productLines,
        filter_strategy: marcaNames ? 'marca' : productLines ? 'product_line' : productIds.length > 0 ? 'product_ids' : 'all_customer_products'
      });
      
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
          console.log('✅ KAM adjustment saved successfully:', {
            savedRecords: result.records_updated,
            totalValue: value,
            valuePerRecord: result.records_updated > 0 ? value / result.records_updated : value,
            customer: customerId,
            month: month,
            updatedRecords: result.updated_records
          });
          
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

  const getM8TotalsForNextYear = () => {
  const customersToUse = customers;
  // Use your existing logic for summary columns
  // This matches the renderSummaryColumns logic for "M8 Predict"
  const fieldName = 'actual_by_m8';
  const targetYear = new Date().getFullYear() + 1;

  let cajas = 0, litros = 0, pesos = 0;
  customersToUse.forEach(customer => {
    Object.keys(customer.months).forEach(monthKey => {
      if (shouldShowValueForYear(monthKey, targetYear)) {
        const monthData = customer.months[monthKey];
        if (monthData) {
          const value = monthData[fieldName] || 0;
          cajas += value;
          litros += value * (customer.attr_1 || 0);
          pesos += value * (customer.attr_2 || 0);
        }
      }
    });
  });
  return { cajas, litros, pesos };
}

  const handleSaveEdit = useCallback(async (customerId: string, month: string) => {
    const newValue = parseFloat(editingValue) || 0;
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
    await fetchForecastData(true);
    toast.success(`Ajuste KAM guardado.\nValor anterior: ${previousKamValue?.toLocaleString('es-MX')}\nNuevo valor: ${newValue.toLocaleString('es-MX')}`);
    setEditingCell(null);
    setEditingValue('');
    setPreviousKamValue(null);
  }, [editingValue, saveKamForecastToDatabase, fetchForecastData, previousKamValue]);

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
    if (inlineEditingCell) return;
    setPreviousKamValue(currentValue); // Store previous value
    requestAnimationFrame(() => {
      setInlineEditingCell({ customerId, month });
      setInlineEditingValue(currentValue.toString());
    });
  }, [inlineEditingCell]);

  function getTotalKamForMonth(month: string) {
  return customers.reduce((sum, customer) => {
    const monthData = customer.months[month];
    return sum + (monthData ? monthData.kam_forecast_correction : 0);
  }, 0);
}

const handleInlineEditSave = useCallback(async (customerId: string, month: string) => {
  
  const newValue = parseFloat(inlineEditingValue) || 0;
  try {
    setSaving(true);

    // Solo para "todos los clientes"
    if (customerId === 'all') {
      
      const [monthAbbr, year] = month.split('-');

      // Usa los filtros activos, si existen
      const marcaNames = advancedFilters.marca?.length > 0 ? advancedFilters.marca : null;
      const productLines = advancedFilters.productLine?.length > 0 ? advancedFilters.productLine : null;
      const productIds = advancedFilters.selectedProducts?.length > 0 ? advancedFilters.selectedProducts : null;
      // Si quieres filtrar por clientes específicos, usa advancedFilters.selectedCustomers

      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .rpc('update_kam_adjustment_bulk', {
          p_month_abbr: monthAbbr,
          p_year: year,
          p_kam_value: newValue,
          p_customer_ids: null, // null = todos los clientes
          p_product_ids: null,
          p_marca_names: marcaNames,
          p_product_lines: productLines
        });

        
      
      if (error || !data || !data[0]?.success) {
        if (data && data[0]?.message?.includes('No valid records found')) {
          showKamError('No se encontró registro para editar en este mes/producto/cliente/ubicación.', '', 8000);
        } else {
          showKamError('Error al guardar ajuste KAM', error?.message || data?.[0]?.message || 'Error desconocido');
        }
      } else {
        setLastEditedKamTotal(prev => ({ ...prev, [month]: newValue }));
        await fetchForecastData(true);
        // Optionally clear after reload
        setTimeout(() => setLastEditedKamTotal(prev => {
          const copy = { ...prev };
          delete copy[month];
          return copy;
        }), 2000);
        toast.success('Ajuste KAM guardado correctamente.');
      }
    } else {
      // Para clientes individuales
    }
  } catch (error) {
    showKamError('Error inesperado al guardar el ajuste KAM.', '', 8000);
  } finally {
    setSaving(false);
    setInlineEditingCell(null);
    setInlineEditingValue('');
  }
}, [inlineEditingValue, advancedFilters, fetchForecastData, showKamError]);

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

  if (error) {
    return null;
  }

  return (
    <div className="w-full min-h-screen p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">Colaboración en Pronósticos</h1>
      
      {/* ===== FILTER SECTION ===== */}
      {/* <div className="w-full space-y-4">
        <div className="flex flex-wrap justify-start">
          <FilterDropdown 
            onProductFilterChange={handleProductFilterChange}
            onLocationFilterChange={handleLocationFilterChange}
            onCustomerFilterChange={handleCustomerFilterChange}
            onDateRangeChange={handleDateRangeChange}
            onSearch={handleSearch}
          />
        </div>
         */}
        {/* Selected Filters Display */}
        {/* {(selectedProduct || selectedLocation || selectedCustomer || selectedDateRange) && (
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
                 */}
                {/* Clear Filters Button */}
                {/* <Button 
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
      </div> */}

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
            onApplyFilters={() => fetchForecastData(true)}
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


    

      {/* Show message when metrics and charts are hidden due to no data */}
      {/* {!hasDataForMetricsAndCharts() && customers.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Datos disponibles sin métricas principales</h3>
              <p className="text-gray-600 mb-4">
                Los datos están disponibles en la tabla de colaboración, pero las métricas principales (M8 Predict, KAM Forecast, etc.) no tienen valores para mostrar gráficos y tendencias.
              </p>
              <div className="text-sm text-gray-500">
                Las secciones de "Forecast Collaboration Metrics" y "Tendencias de Ventas" se ocultan automáticamente cuando no hay datos de pronóstico disponibles.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
       */}

      
      {/* Forecast Metrics Card - Only show when there's meaningful data */}
      {hasDataForMetricsAndCharts() && (
        <Card className="w-full max-w-full mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              Forecast Collaboration Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">

          {/* Mixed Chart with Multiple Y-Axis */}
          {(() => {
            // Use filtered customers (already filtered by advanced filters in fetchForecastData)
            const filteredCustomers = customers;
            
            const m8PredictTotal = calculateTotal('actual_by_m8');
            console.log('M8 Predict Total:', m8PredictTotal);
            const kamForecastTotal = calculateTotal('kam_forecast_correction');
            // const effectiveForecastTotal = calculateTotal('effective_forecast');
            // const lastYearTotal = calculateTotal('last_year');
            
            // Calculate totals for M8 Predict using the same logic as data table
            // Only calculate these if there's actual current-year M8 data to avoid showing misleading zero-based calculations
            const currentYear = new Date().getFullYear();
            const hasRealM8Data = filteredCustomers.some(customer => 
              Object.keys(customer.months).some(monthKey => {
                if (shouldShowValueForYear(monthKey, currentYear -1)) {
                  const monthData = customer.months[monthKey];
                  return monthData && (monthData.actual_by_m8 || 0) > 0;
                }
                return false;
              })
            );

            const m8PredictCajasTotal = hasRealM8Data ? calculateAggregateForAllCustomers(filteredCustomers, 'attr_3', 'Total', calculateM8Metric('actual_by_m8')) : 0;
            const m8PredictLitrosTotal = hasRealM8Data ? calculateAggregateForAllCustomers(filteredCustomers, 'attr_1', 'Total', calculateM8Metric('actual_by_m8')) : 0;
            const m8PredictPesosTotal = hasRealM8Data ? calculateAggregateForAllCustomers(filteredCustomers, 'attr_2', 'Total', calculateM8Metric('actual_by_m8')) : 0;
            console.log('M8 Predict Litros Total:', m8PredictLitrosTotal);
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
                return sum + (monthData ? (monthData.actual_by_m8 || 0) : 0);
              }, 0);

              return {
                month,
                displayMonth: month.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
                // M8 Predict - Using actual_by_m8 (from commercial_collaboration_view.actual)
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
                // PPTO A + 1 - Using ppto_2026 field
                pptoA1: customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.ppto_2026 || 0) : 0);
                }, 0),
                // DDI Totales - Using inventory_days field
                ddi: customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.inventory_days || 0) : 0);
                }, 0),
                // SI AA - Using sell_in_aa field (only show for year-1/2024 months)
                sellInAA: shouldShowValueForYear(month, new Date().getFullYear() - 1) ? customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.sell_in_aa || 0) : 0);
                }, 0) : null,
                // SI Actual - Using sell_in_aa field (only show for current year/2025 months)
                sellInActual: shouldShowValueForYear(month, new Date().getFullYear()) ? customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.sell_in_actual || 0) : 0);
                }, 0) : null,
                // SO AA - Using sell_out_aa field (only show for year-1/2024 months)
                sellOutAA: shouldShowValueForYear(month, new Date().getFullYear() - 1) ? customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.sell_out_aa || 0) : 0);
                }, 0) : null,
                // SO Actual - Using sell_out_real field (only show for current year/2025 months)
                sellOutActual: shouldShowValueForYear(month, new Date().getFullYear()) ? customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.sell_out_actual || 0) : 0);
                }, 0) : null,
                // Legacy fields for backward compatibility
                kamForecast: customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.kam_26 || 0) : 0);
                }, 0),
                effectiveForecast: customersToUse.reduce((sum, customer) => {
                  const monthData = customer.months[month];
                  return sum + (monthData ? (monthData.effective_forecast || 0) : 0);
                }, 0),
                lastYear
              };
            });

            // Find max values for scaling (filtering out null values)
            const maxForecastValue = Math.max(
              ...chartData.map(d => Math.max(
                d.m8Predict, 
                d.pci26, 
                d.kamAdjustments, 
                d.pptoA1, 
                d.ddi, 
                ...[d.sellInAA, d.sellOutAA, d.sellInActual, d.sellOutActual].filter(val => val !== null)
              ))
            );


            const { cajas, litros, pesos } = getM8TotalsForNextYear();
            return (
              
              <div className="space-y-6">
                {/* KPI Summary Card with Real Data */}
                <div className="w-full max-w-full bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
                  {/* Top Section - Using M8 Predict (actual_by_m8) totals from data table */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b pb-6">
                    {/* CAJAS - Using M8 Predict (actual_by_m8) with attr_3 for cajas */}
                    <div className="flex items-center gap-4 sm:border-r sm:pr-4 border-b sm:border-b-0 pb-4 sm:pb-0">
                      <div className="bg-blue-100 p-3 rounded-full">
                        <Package className="text-blue-700 w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-blue-700">
                           {(cajas / 1000000).toFixed(1)} M
                        </p>
                        <p className="text-gray-600 text-sm font-medium">CAJAS</p>
                        <p className={`text-sm font-semibold mt-1 ${
                          salesTrends.growthPercentage >= 0 ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {/* {salesTrends.growthPercentage >= 0 ? '+' : ''}{salesTrends.growthPercentage.toFixed(1)}% vs AA */}
                        </p>
                     
                      </div>
                    </div>

                    {/* LITROS - Using M8 Predict (actual_by_m8) with attr_1 for litros */}
                    <div className="flex items-center gap-4 sm:border-r sm:pr-4 border-b sm:border-b-0 pb-4 sm:pb-0">
                      <div className="bg-orange-100 p-3 rounded-full">
                        <Droplet className="text-orange-600 w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-orange-600">
                           {(litros / 1000000).toFixed(1)} M
                        </p>
                        <p className="text-gray-600 text-sm font-medium">LITROS</p>
                        <p className={`text-sm font-semibold mt-1 ${
                          salesTrends.growthPercentage >= 0 ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {/* {salesTrends.growthPercentage >= 0 ? '+' : ''}{(salesTrends.growthPercentage * 0.8).toFixed(1)}% vs AA */}
                        </p>
                   
                      </div>
                    </div>

                    {/* PESOS - Using M8 Predict (actual_by_m8) with attr_2 for pesos */}
                    <div className="flex items-center gap-4 sm:pl-4">
                      <div className="bg-green-100 p-3 rounded-full">
                        <DollarSign className="text-green-700 w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-green-700">
                           {(pesos / 1000000).toFixed(1)} M
                        </p>
                        <p className="text-gray-600 text-sm font-medium">PESOS</p>
                        <p className={`text-sm font-semibold mt-1 ${
                          salesTrends.growthPercentage >= 0 ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {/* {salesTrends.growthPercentage >= 0 ? '+' : ''}{(salesTrends.growthPercentage * 0.9).toFixed(1)}% vs AA */}
                        </p>
                       
                      </div>
                    </div>
                  </div>

                  {/* Bottom Table - Quarterly Breakdown */}
                  <div className="mt-6 w-full overflow-x-auto">
                    <table className="w-full min-w-[600px] text-center border-collapse">
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
                          {/* <td className="py-2 font-semibold">
                            {(effectiveForecastTotal / 1000).toFixed(0)}
                          </td> */}
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
                          {/* <td className="py-2 font-semibold">
                            {(lastYearTotal / 1000).toFixed(0)}
                          </td> */}
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
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-orange-700">M8 predict</div>
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
                  
                  {/* <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-green-700">Effective</div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="text-xl font-bold text-green-800">
                      {effectiveForecastTotal.toLocaleString('es-MX')}
                    </div> 
                  </div> */}
                  
                  {/* <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
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
                  </div> */}
                </div>

                {/* Recharts ComposedChart with Multiple Y-Axis */}
                <div className="w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-2 sm:p-4 lg:p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="mb-3 sm:mb-4 lg:mb-6">
                    <div>
                      <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800 mb-1">Forecast Analysis with Multiple Y-Axis</h3>
                      <p className="text-xs sm:text-sm text-gray-600">
                        <span className="hidden md:inline">Bars & Area: Valores absolutos (Left) | Line: Crecimiento vs año anterior % (Right)</span>
                        <span className="md:hidden">Valores absolutos y crecimiento</span>
                      </p>
                    </div>
                  </div>
                  
                  {/* Recharts ComposedChart */}
                  <div className="w-full bg-white rounded-lg p-1 sm:p-2 lg:p-4 border border-gray-200 overflow-x-auto">
                    <div className="w-full min-w-[320px] sm:min-w-[600px] lg:min-w-[800px]" style={{ minHeight: '250px' }}>
                      <ComposedChart
                        width={
                          typeof window !== 'undefined' 
                            ? Math.max(
                                Math.min(window.innerWidth - 80, window.innerWidth * 0.95), 
                                window.innerWidth < 640 ? 320 : window.innerWidth < 1024 ? 600 : 800
                              )
                            : 800
                        }
                        height={
                          typeof window !== 'undefined' 
                            ? window.innerWidth < 640 ? 280 : window.innerWidth < 1024 ? 350 : 450
                            : 400
                        }
                        data={chartData}
                        margin={{
                          top: typeof window !== 'undefined' && window.innerWidth < 640 ? 15 : 20,
                          right: typeof window !== 'undefined' && window.innerWidth < 640 ? 15 : window.innerWidth < 1024 ? 25 : 40,
                          bottom: typeof window !== 'undefined' && window.innerWidth < 640 ? 15 : 20,
                          left: typeof window !== 'undefined' && window.innerWidth < 640 ? 15 : window.innerWidth < 1024 ? 25 : 40,
                        }}
                      >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="displayMonth" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ 
                          fontSize: typeof window !== 'undefined' 
                            ? window.innerWidth < 640 ? 8 : window.innerWidth < 1024 ? 10 : 12
                            : 12, 
                          fill: '#64748b' 
                        }}
                        angle={typeof window !== 'undefined' 
                          ? window.innerWidth < 640 ? -75 : window.innerWidth < 1024 ? -60 : -45
                          : -45
                        }
                        textAnchor="end"
                        height={typeof window !== 'undefined' 
                          ? window.innerWidth < 640 ? 80 : window.innerWidth < 1024 ? 70 : 60
                          : 60
                        }
                      />
                      
                      {/* Left Y-Axis for Values */}
                      <YAxis 
                        yAxisId="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{ 
                          fontSize: typeof window !== 'undefined' 
                            ? window.innerWidth < 640 ? 8 : window.innerWidth < 1024 ? 10 : 12
                            : 12, 
                          fill: '#3b82f6' 
                        }}
                        tickFormatter={(value) => value.toLocaleString('es-MX', { notation: 'compact' })}
                        label={{ 
                          value: typeof window !== 'undefined' 
                            ? window.innerWidth < 640 ? '$' : window.innerWidth < 1024 ? 'MX$' : 'Values (MX$)'
                            : 'Values (MX$)', 
                          angle: -90, 
                          position: 'insideLeft', 
                          style: { 
                            textAnchor: 'middle', 
                            fill: '#3b82f6', 
                            fontSize: typeof window !== 'undefined' 
                              ? window.innerWidth < 640 ? '8px' : window.innerWidth < 1024 ? '10px' : '12px'
                              : '12px', 
                            fontWeight: 'bold' 
                          } 
                        }}
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
                          typeof value === 'number' ? value.toLocaleString('es-MX') : value,
                          name
                        ]}
                      />
                      




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
                          name="M8 Predict"
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
                          name="PCI Actual"
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

                      {/* Area Chart for PPTO A + 1 */}
                      {chartSeriesVisible.pptoA1Area && (
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="pptoA1"
                          stroke={chartSeriesColors.pptoA1Area}
                          fill={`${chartSeriesColors.pptoA1Area}50`}
                          strokeWidth={2}
                          fillOpacity={0.4}
                          name={`PPTO ${new Date().getFullYear() + 1}`}
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



                      {/* Sell-In AA Line (continuous) */}
                      {chartSeriesVisible.sellInLine && (
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="sellInAA"
                          stroke={chartSeriesColors.sellInLine}
                          strokeWidth={2}
                          connectNulls={false}
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
                          connectNulls={false}
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
                          connectNulls={false}
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
                          connectNulls={false}
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


                      </ComposedChart>
                    </div>
                  </div>

                  {/* Legend-style Series Toggle - Similar to Demand Forecast */}
                  <div className="mt-4 pt-4 border-t border-gray-200 w-full">
                    <div className="flex flex-col gap-4">
                      {/* All Control and Series Buttons in Single Container */}
                      <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
                        {/* Control Buttons */}
                        <button
                          onClick={() => {
                            // Hide all series
                            Object.keys(chartSeriesVisible).forEach(seriesKey => {
                              setChartSeriesVisible(prev => ({ ...prev, [seriesKey]: false }));
                            });
                          }}
                          className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-md transition-all duration-200 shadow-sm"
                        >
                          <div 
                            className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                            style={{ 
                              backgroundColor: '#ef4444'
                            }}
                          ></div>
                          <span>
                            Quitar Todos
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            // Show all series
                            Object.keys(chartSeriesVisible).forEach(seriesKey => {
                              setChartSeriesVisible(prev => ({ ...prev, [seriesKey]: true }));
                            });
                          }}
                          className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 rounded-md transition-all duration-200 shadow-sm"
                        >
                          <div 
                            className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                            style={{ 
                              backgroundColor: '#22c55e'
                            }}
                          ></div>
                          <span>
                            Mostrar Todos
                          </span>
                        </button>
                        
                        {/* Series Legend */}
                        {/* All Series with Smaller Circle Indicators */}
                        <button
                        onClick={() => toggleSeriesVisibility('m8PredictArea')}
                        className="flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-gray-100 rounded-md border border-gray-200 transition-all duration-200 shadow-sm"
                      >
                        <div 
                          className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                          style={{ 
                            backgroundColor: chartSeriesVisible.m8PredictArea ? chartSeriesColors.m8PredictArea : '#e5e7eb',
                            opacity: chartSeriesVisible.m8PredictArea ? 1 : 0.4
                          }}
                        ></div>
                        <span className={`font-medium ${chartSeriesVisible.m8PredictArea ? 'text-gray-700' : 'text-gray-400'}`}>
                          M8 Predict
                        </span>
                      </button>
                      
                      <button
                        onClick={() => toggleSeriesVisibility('pci26Area')}
                        className="flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-gray-100 rounded-md border border-gray-200 transition-all duration-200 shadow-sm"
                      >
                        <div 
                          className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                          style={{ 
                            backgroundColor: chartSeriesVisible.pci26Area ? chartSeriesColors.pci26Area : '#e5e7eb',
                            opacity: chartSeriesVisible.pci26Area ? 1 : 0.4
                          }}
                        ></div>
                        <span className={`font-medium ${chartSeriesVisible.pci26Area ? 'text-gray-700' : 'text-gray-400'}`}>
                          PCI Actual
                        </span>
                      </button>
                      
                      <button
                        onClick={() => toggleSeriesVisibility('kamAdjustmentsArea')}
                        className="flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-gray-100 rounded-md border border-gray-200 transition-all duration-200 shadow-sm"
                      >
                        <div 
                          className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                          style={{ 
                            backgroundColor: chartSeriesVisible.kamAdjustmentsArea ? chartSeriesColors.kamAdjustmentsArea : '#e5e7eb',
                            opacity: chartSeriesVisible.kamAdjustmentsArea ? 1 : 0.4
                          }}
                        ></div>
                        <span className={`font-medium ${chartSeriesVisible.kamAdjustmentsArea ? 'text-gray-700' : 'text-gray-400'}`}>
                          Ajustes KAM
                        </span>
                      </button>
                      
                      <button
                        onClick={() => toggleSeriesVisibility('pptoA1Area')}
                        className="flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-gray-100 rounded-md border border-gray-200 transition-all duration-200 shadow-sm"
                      >
                        <div 
                          className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                          style={{ 
                            backgroundColor: chartSeriesVisible.pptoA1Area ? chartSeriesColors.pptoA1Area : '#e5e7eb',
                            opacity: chartSeriesVisible.pptoA1Area ? 1 : 0.4
                          }}
                        ></div>
                        <span className={`font-medium ${chartSeriesVisible.pptoA1Area ? 'text-gray-700' : 'text-gray-400'}`}>
                          PPTO {new Date().getFullYear() + 1}
                        </span>
                      </button>

                      <button
                        onClick={() => toggleSeriesVisibility('sellInLine')}
                        className="flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-gray-100 rounded-md border border-gray-200 transition-all duration-200 shadow-sm"
                      >
                        <div 
                          className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                          style={{ 
                            backgroundColor: chartSeriesVisible.sellInLine ? chartSeriesColors.sellInLine : '#e5e7eb',
                            opacity: chartSeriesVisible.sellInLine ? 1 : 0.4
                          }}
                        ></div>
                        <span className={`font-medium ${chartSeriesVisible.sellInLine ? 'text-gray-700' : 'text-gray-400'}`}>
                          SI AA
                        </span>
                      </button>
                      
                      <button
                        onClick={() => toggleSeriesVisibility('sellInActualLine')}
                        className="flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-gray-100 rounded-md border border-gray-200 transition-all duration-200 shadow-sm"
                      >
                        <div 
                          className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                          style={{ 
                            backgroundColor: chartSeriesVisible.sellInActualLine ? chartSeriesColors.sellInActualLine : '#e5e7eb',
                            opacity: chartSeriesVisible.sellInActualLine ? 1 : 0.4
                          }}
                        ></div>
                        <span className={`font-medium ${chartSeriesVisible.sellInActualLine ? 'text-gray-700' : 'text-gray-400'}`}>
                          SI Actual
                        </span>
                      </button>
                      
                      <button
                        onClick={() => toggleSeriesVisibility('sellOutAALine')}
                        className="flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-gray-100 rounded-md border border-gray-200 transition-all duration-200 shadow-sm"
                      >
                        <div 
                          className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                          style={{ 
                            backgroundColor: chartSeriesVisible.sellOutAALine ? chartSeriesColors.sellOutAALine : '#e5e7eb',
                            opacity: chartSeriesVisible.sellOutAALine ? 1 : 0.4
                          }}
                        ></div>
                        <span className={`font-medium ${chartSeriesVisible.sellOutAALine ? 'text-gray-700' : 'text-gray-400'}`}>
                          SO AA
                        </span>
                      </button>
                      
                      <button
                        onClick={() => toggleSeriesVisibility('sellOutActualLine')}
                        className="flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-gray-100 rounded-md border border-gray-200 transition-all duration-200 shadow-sm"
                      >
                        <div 
                          className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                          style={{ 
                            backgroundColor: chartSeriesVisible.sellOutActualLine ? chartSeriesColors.sellOutActualLine : '#e5e7eb',
                            opacity: chartSeriesVisible.sellOutActualLine ? 1 : 0.4
                          }}
                        ></div>
                        <span className={`font-medium ${chartSeriesVisible.sellOutActualLine ? 'text-gray-700' : 'text-gray-400'}`}>
                          SO Actual 
                        </span>
                      </button>

                      <button
                        onClick={() => toggleSeriesVisibility('ddiBar')}
                        className="flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-gray-100 rounded-md border border-gray-200 transition-all duration-200 shadow-sm"
                      >
                        <div 
                          className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                          style={{ 
                            backgroundColor: chartSeriesVisible.ddiBar ? chartSeriesColors.ddiBar : '#e5e7eb',
                            opacity: chartSeriesVisible.ddiBar ? 1 : 0.4
                          }}
                        ></div>
                        <span className={`font-medium ${chartSeriesVisible.ddiBar ? 'text-gray-700' : 'text-gray-400'}`}>
                          DDI Totales
                        </span>
                      </button>


                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            );
          })()}

         
        </CardContent>
        </Card>
      )}

      <Card className="w-full max-w-full mb-6">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-base sm:text-lg">
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
                  <div className="text-center">YTD*</div>
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
                        {Array.from({length: 12}, (_, index) => {
                          const month = getMonthKeyForIndex(index);
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
                    SI A-2 
                  </div>
                    <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    Sell-in {new Date().getFullYear() - 2}
                    </div>
                  
                      {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    const targetYear = new Date().getFullYear() - 2; // 2023
                    
                    return (
                      <>
                        {Array.from({ length: 12 }, (_, index) => {
                          // Use calendar year months (enero to diciembre) for 2023
                         
                          const month = getMonthKeyForCalendarYear(index, targetYear);
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.sell_in_23 : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-sell-in-23`} 
                                 className="p-1 text-right text-xs bg-[#e8f4fd]">
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
                    SI AA
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                     Sell-in {new Date().getFullYear() -1}
                  </div>
                 
                      {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    const targetYear = new Date().getFullYear() - 1; // 2024
                    
                    return (
                      <>
                        {Array.from({ length: 12 }, (_, index) => {
                          // Use calendar year months (enero to diciembre) for 2024
                          const month = getMonthKeyForCalendarYear(index, targetYear);
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.sell_in_aa : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-sell-in-aa`} 
                                 className="p-1 text-right text-xs bg-[#e8f4fd]">
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
                    
                    const targetYear = new Date().getFullYear(); // 2025
                    
                    return (
                      <>
                        {Array.from({ length: 12 }, (_, index) => {
                          // Use calendar year months (enero to diciembre) for 2025
                          const month = getMonthKeyForCalendarYear(index, targetYear);
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.sell_in_actual : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-sell-in-actual`} 
                                 className="p-1 text-right text-xs bg-[#e8f4fd]">
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse, "Sell in Actual")}
                   
               
                       
                      </>
                    );
                  })()}
                </div>

                {/* Row 4: SO 2024 */}
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
                     
                     const targetYear = new Date().getFullYear() - 1; // 2024
                     
                     
                    return (
                      <>
                        {Array.from({length: 12}, (_, index) => {
                          const month = getMonthKeyForCalendarYear(index, targetYear);
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.sell_out_aa : 0);
                          }, 0);
                       
                          return (
                            <div key={`all-${month}-sell-out-aa`} 
                                 className="p-1 text-right text-xs bg-[#fef3c7]">
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
                     const targetYear = new Date().getFullYear(); // 2025
                    return (
                      <>
                        {Array.from({length: 12}, (_, index) => {
                          const month = getMonthKeyForCalendarYear(index, targetYear);
                          // Only show values for current year (2025) months
                          // const shouldShowValue = shouldShowValueForYear(month, new Date().getFullYear());
                           const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.sell_out_actual : 0);
                          }, 0);
                          
                          
                          return (
                            <div key={`all-${month}-sell-out-actual`} 
                                 className="p-1 text-right text-xs bg-[#fef3c7]"
                                //  style={{ color: totalValue ? '#374151' : '#d1d5db' }}
                                >
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
                     const targetYear = new Date().getFullYear();
                     
                    return (
                      <>
                        {Array.from({length: 12}, (_, index) => {
                          const month = getMonthKeyForCalendarYear(index, targetYear);
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? (monthData.ddi_totales || monthData.inventory_days || 0) : 0);
                          }, 0);
                          
                          
                          return (
                            <div key={`all-${month}-inventory-days`} 
                                 className={`p-1 text-right text-xs ${
                                   month.includes('12') ? 'bg-green-100' : 'bg-green-50'
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
                      const targetYear = new Date().getFullYear();

                    return (
                      <>
                        {Array.from({length: 12}, (_, index) => {
                          const month = getMonthKeyForCalendarYear(index, targetYear);
                          
                          // const shouldShowValue = shouldShowValueForYear(month, 2025);
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.ppto_2025 : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-ppto-2025`} 
                                 className="p-1 text-right text-xs bg-[#dcfce7]"
                                 style={{ color: customersToUse.length > 0 ? '#374151' : '#d1d5db' }}>
                              {formatValue(totalValue)}
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
                    const targetYear = new Date().getFullYear() + 1;
                    return (
                      <>
                        {Array.from({length: 12}, (_, index) => {
                          const month = getMonthKeyForCalendarYear(index, targetYear);
                          // Only show values for 2026 months
                          // const shouldShowValue = shouldShowValueForYear(month, 2026);
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.ppto_2026 : 0);
                          }, 0) ;
                          
                          return (
                            <div key={`all-${month}-ppto-2026`} 
                                 className="p-1 text-right text-xs bg-[#dcfce7]"
                                //  style={{ color: totalValue  ? '#374151' : '#d1d5db' }}
                                >
                              {formatValue(totalValue)}
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
                    KAM A + 1
                  </div>
                  <div className="bg-[#e8f4fd] p-1 text-xs z-10">
                    KAM {new Date().getFullYear() + 1} ✏️
                  </div>
                  
                  
                  {Array.from({length: 12}, (_, index) => {
                    const targetYear = new Date().getFullYear() + 1 ; // 
                     
                      const monthAbbrs = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
                      const monthAbbr = monthAbbrs[index];
                      const year = String(targetYear).slice(-2);
                      const monthKey = `${monthAbbr}-${year}`;
                      
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                      const month = getMonthKeyForCalendarYear(index, targetYear);

                     // Only allow editing if at least one customer has M8 Predict for this month
                    const canEdit = customersToUse.some(customer => {
                      const monthData = customer.months[month];
                      return monthData && monthData.actual_by_m8 && monthData.actual_by_m8 > 0;
                    }); 
                    // // Show the original forecast commercial_input values from forecast_data
                    // const totalForecastCommercialInput = customersToUse.reduce((sum, customer) => {
                    //   const monthData = customer.months[month];
                    //   return sum + (monthData ? monthData.forecast_commercial_input : 0);
                    // }, 0);
                    
                    // For display, use the current KAM adjustment values
                   const totalKamValue = customersToUse.reduce((sum, customer) => {
                    const monthData = customer.months[month];
                    return sum + (monthData ? monthData.kam_forecast_correction : 0);
                  }, 0);
                  
                    // Determine display value (show 0 if totalKamValue is 0)
                      
                    const displayKamValue = totalKamValue;
                    const valueAdd = kamA1Sums[monthKey] ?? 0;
                   
                    // Check if this cell is being edited (use 'all' as customerId for aggregate editing)
                    //const isEditing = inlineEditingCell?.customerId === 'all' && inlineEditingCell?.month === month;
                    const isEditing = inlineEditingCell?.customerId === 'all' && inlineEditingCell?.month === monthKey;
                    return (
                      <div 
                        key={`all-${month}-kam-a1`} 
                        className={`p-1 text-right text-xs transition-colors ${
                          month.includes('12') ? 'bg-yellow-100' : 'bg-blue-100'
                        } ${canEdit ? 'cursor-pointer hover:bg-blue-200' : 'opacity-50 cursor-not-allowed'} `}
                        
                        onDoubleClick={canEdit ? () => handleInlineEditStart('all', month, totalKamValue) : undefined}
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
                              {valueAdd ? valueAdd.toLocaleString('es-MX') : '0'}
                              {valueAdd > 0 && <span className="text-blue-600 opacity-75"></span>}
                              <span className="text-gray-500"> ✏️</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {renderSummaryColumns(
                    selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers, "KAM A + 1"
                  )}
                </div>

                {/* Row 32: M8 Predict - Using actual_by_m8 (from commercial_collaboration_view.actual) */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    M8 Predict
                  </div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                     M8 forecast {new Date().getFullYear() + 1}
                   
                  </div>
                  
                   {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                    
                    // 🔍 DEBUG: Log customers being displayed
                    console.log('🎨 RENDERING M8 Predict Row - Customers to display:', {
                      total_customers: customersToUse.length,
                      customer_ids: customersToUse.map(c => c.customer_node_id).slice(0, 10),
                      product_ids: customersToUse.map(c => c.product_id).slice(0, 10),
                      location_ids: customersToUse.map(c => c.location_node_id).slice(0, 10)
                    });
                    const targetYear = new Date().getFullYear() + 1; //
                    
                    return (
                      
                          <>
                        {Array.from({ length: 12 }, (_, index) => {
                          const month = getMonthKeyForCalendarYear(index, targetYear);
                          // M8 Predict - Show values for current year (2025)
                          // const shouldShow = shouldShowValueForYear(month, new Date().getFullYear());

                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            // const value = monthData ? monthData.actual_by_m8 : 0;
                            return sum + (monthData ? monthData.actual_by_m8 || 0 : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-actual_by_m8`} 
                                 className={`p-1 text-right text-xs bg-[#fef3c7]`}>
                              {formatValue(totalValue)}
                              
                            </div>
                          );
                        })}
                        
                        
                        {/* Summary columns for M8 Predict - now correctly filtered to current year only */}
                        {renderSummaryColumns(customersToUse, "M8 Predict")}
                      </>
                    );
                  })()}
                </div>

             
                {/* Row 34: PCI  */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#e0e7ff] p-1 text-xs z-10">
                    PCI Actual *
                  </div>
                  <div className="bg-[#e0e7ff] p-1 text-xs z-10">
                    PCI {new Date().getFullYear() }
                  </div>
                  {(() => {
                    const customersToUse = selectedCustomerId && selectedCustomerId !== 'all' 
                      ? customers.filter(customer => customer.customer_node_id === selectedCustomerId)
                      : customers;
                     const targetYear = new Date().getFullYear(); 
                    return (
                      <>
                        {Array.from({length: 12}, (_, index) => {
                          const month = getMonthKeyForCalendarYear(index, targetYear);
                          const totalValue = customersToUse.reduce((sum, customer) => {
                            const monthData = customer.months[month];
                            return sum + (monthData ? monthData.pci_26 || 0 : 0);
                          }, 0);
                          
                          return (
                            <div key={`all-${month}-pci-26`} 
                                 className="p-1 text-right text-xs bg-[#e0e7ff]">
                              {formatValue(totalValue)}
                            </div>
                          );
                        })}
                        
                        {renderSummaryColumns(customersToUse, "PCI Actual")}
                      </>
                    );
                  })()}
                </div>

              {/*  Row 35: KAM Approval  */}
                {/* <div className="contents">
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
                       
                         Summary columns for KAM Approval - showing approvals count
                        <div className="bg-green-200 border-gray-300 p-2 text-center text-xs">
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>-</div>
                            <div>-</div>
                            <div>-</div>
                          </div>
                        </div>
                        <div className="bg-orange-200 border-gray-300 p-2 text-center text-xs">
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
                </div>*/}
              </>
            )}  

            {/* Grouped view information message */}
            {shouldShowGroupedView() && (
              <div className="contents">
                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 text-sm col-span-full" style={{ gridColumn: '1 / -1' }}>
                  <div className="flex items-center gap-2">
                    <div className="text-blue-600">ℹ️</div>
                    <div>
                      <strong>Vista agrupada activa:</strong> Los datos están agregados por {
                        advancedFilters.marca?.length ? 'Marca' : 
                        advancedFilters.productLine?.length ? 'Línea de productos' : 
                        'Jerarquía de cliente'
                      }. Los clientes individuales están ocultos para mostrar totales consolidados.
                    </div>
                  </div>
                </div>
              </div>
            )}
{/* ----------------------------------------------------- */}
       {/* Individual customer sections - only show when not in grouped view */}
            {!shouldShowGroupedView() && filteredCustomers().map((customer, customerIndex) => (
              <React.Fragment key={`${customer.customer_node_id}-${customer.product_id}`}>
               

                
                
                {/* Row 1: Año pasado (LY) - HIDDEN but data available for calculations */}
                 
                <div className="contents" style={{ display: 'none' }}>
                  
                  <div className="bg-gray-100 p-1 text-xs">
                    Año pasado (LY)
                  </div>
                  <div className="bg-gray-100 p-1 text-xs">
                    Histórico
                  </div>
                  {Array.from({length: 12}, (_, index) => {
                    const month = getMonthKeyForIndex(index);
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
                  {Array.from({length: 12}, (_, index) => {
                    const month = getMonthKeyForIndex(index);
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
                   {Array.from({length: 12}, (_, index) => {
                    const targetYear = new Date().getFullYear() - 2; // 2023
                    // Use calendar year months (enero to diciembre) for 2023
                    const month = getMonthKeyForCalendarYear(index, targetYear);
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.sell_in_23 : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-sell-in-23`} 
                           className="p-1 text-right text-xs bg-[#e8f4fd]">
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
                  {Array.from({length: 12}, (_, index) => {
                    const targetYear = new Date().getFullYear() - 1; // 2024
                    // Use calendar year months (enero to diciembre) for 2024
                    const month = getMonthKeyForCalendarYear(index, targetYear);
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.sell_in_aa : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-si-aa`} 
                           className="p-1 text-right text-xs bg-[#e8f4fd]">
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
                  {Array.from({length: 12}, (_, index) => {
                    const targetYear = new Date().getFullYear(); // 2025
                    // Use calendar year months (enero to diciembre) for 2025
                    const month = getMonthKeyForCalendarYear(index, targetYear);
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.sell_in_actual : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-sell-in-actual`} 
                           className="p-1 text-right text-xs bg-[#e8f4fd]">
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
                  {Array.from({length: 12}, (_, index) => {
                    const targetYear = new Date().getFullYear() - 1; // 2024
                    const month = getMonthKeyForCalendarYear(index, targetYear);
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.sell_out_aa : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-so-aa`} 
                           className="p-1 text-right text-xs bg-[#fef3c7]">
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {renderIndividualSummaryColumns(customer, "Sell Out AA")}
                </div>

                {/* Row 4: SO Actual */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    SO Actual
                  </div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    Sell-out {new Date().getFullYear()}
                  </div>
                  {Array.from({length: 12}, (_, index) => {
                    const targetYear = new Date().getFullYear(); // 2025
                    const month = getMonthKeyForCalendarYear(index, targetYear);
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.sell_out_actual : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-sell-out-actual`} 
                           className="p-1 text-right text-xs bg-[#fef3c7]">
                        {formatValue(value)}
                      </div>
                    );
                  })}

                  {renderIndividualSummaryColumns(customer, "SO A")}
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
                  {Array.from({length: 12}, (_, index) => {
                    const targetYear = new Date().getFullYear(); // 2025
                    const month = getMonthKeyForCalendarYear(index, targetYear);
                    const monthData = customer.months[month];
                    const value = monthData ? (monthData.ddi_totales || monthData.inventory_days || 0) : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-ddi-totales`} 
                           className="p-1 text-right text-xs bg-[#dcfce7]">
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
                  {Array.from({length: 12}, (_, index) => {
                    const month = getMonthKeyForIndex(index);
                    const monthData = customer.months[month];
                    const shouldShowValue = shouldShowValueForYear(month, 2025);
                    const value = shouldShowValue ? (monthData ? monthData.ppto_2025 || 0 : 0) : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-ppto-2025`} 
                           className="p-1 text-right text-xs bg-[#dcfce7]"
                           style={{ color: shouldShowValue ? '#374151' : '#d1d5db' }}>
                        {formatValue(value)}
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
                  {Array.from({length: 12}, (_, index) => {
                    const month = getMonthKeyForIndex(index);
                    const monthData = customer.months[month];
                    const shouldShowValue = shouldShowValueForYear(month, 2026);
                    const value = shouldShowValue ? (monthData ? monthData.ppto_2026 || 0 : 0) : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-ppto-2026`} 
                           className="p-1 text-right text-xs bg-[#dcfce7]"
                           style={{ color: shouldShowValue ? '#374151' : '#d1d5db' }}>
                        {formatValue(value)}
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
                  {Array.from({length: 12}, (_, index) => {
  const targetYear = new Date().getFullYear() + 1;
  const monthAbbrs = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const monthAbbr = monthAbbrs[index];
  const year = String(targetYear).slice(-2);
  const monthKey = `${monthAbbr}-${year}`;
  const value = kamA1Sums[monthKey] ?? 0;

  return (
    <div
      key={`all-${monthKey}-kam-a1`}
      className={`p-1 text-right text-xs transition-colors ${
        monthKey.includes('12') ? 'bg-yellow-100' : 'bg-blue-100'
      }`}
      title={`KAM A+1: ${value.toLocaleString('es-MX')}`}
    >
      {value.toLocaleString('es-MX')}
    </div>
  );
})}
                  {renderIndividualSummaryColumns(customer, "KAM")}
                </div>

                {/* Row 32: M8 Predict - Using actual_by_m8 (from commercial_collaboration_view.actual) - Current year only */}
                <div className="contents">
                  <div className="bg-gray-50"></div>
                  <div className="bg-gray-50"></div>
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    M8 Predict***
                  </div> 
                  <div className="bg-[#fef3c7] p-1 text-xs z-10">
                    M8 Forecast {new Date().getFullYear() + 1}
                  </div>
                  {Array.from({length: 12}, (_, index) => {
                    const month = getMonthKeyForIndex(index);
                    // M8 Predict - Only show values for current year (2025) 
                    const shouldShow = shouldShowValueForYear(month, new Date().getFullYear()+1);
                    const monthData = customer.months[month];
                    const value = shouldShow && monthData ? monthData.effective_forecast : 0;

                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-effective-forecast`} 
                           className={`p-1 text-right text-xs bg-[#fef3c7] ${!shouldShow ? 'opacity-50' : ''}`}>
                        {formatValue(value)}
                      </div>
                    );
                  })}
                  
                  {/* Summary columns for M8 Predict - now correctly filtered to current year only */}
                  {renderIndividualSummaryColumns(customer, "M8 Predict")}
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
                  {Array.from({length: 12}, (_, index) => {
                    const month = getMonthKeyForIndex(index);
                    const monthData = customer.months[month];
                    const value = monthData ? monthData.pci_26 || 0 : 0;
                    
                    return (
                      <div key={`${customer.customer_node_id}-${customer.product_id}-${month}-pci-actual`} 
                           className="p-1 text-right text-xs bg-[#e0e7ff]">
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
