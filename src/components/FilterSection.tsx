import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductFilterDialog } from "./ProductFilterDialog";
import { LocationFilterDialog, LocationHierarchyItem } from "./LocationFilterDialog";
import { CustomerFilterDialog, CustomerItem } from "./CustomerFilterDialog";
import { supabase } from "@/integrations/supabase/client";
import { Filter, X } from "lucide-react";

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

interface FilterSectionProps {
  onProductFilterChange?: (selection: ProductHierarchyItem | null) => void;
  onLocationFilterChange?: (location: LocationHierarchyItem | null) => void;
  onCustomerFilterChange?: (customer: CustomerItem | null) => void;
}

export const FilterSection = ({ onProductFilterChange, onLocationFilterChange, onCustomerFilterChange }: FilterSectionProps) => {
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductHierarchyItem | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationHierarchyItem | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [customerFilterVisible, setCustomerFilterVisible] = useState(false);

  const handleProductSelection = (selection: ProductHierarchyItem | null) => {
    setSelectedProduct(selection);
    onProductFilterChange?.(selection);
    setIsProductDialogOpen(false);
  };

  const handleLocationSelection = (location: LocationHierarchyItem | null) => {
    setSelectedLocation(location);
    onLocationFilterChange?.(location);
    setIsLocationDialogOpen(false);
  };

  const handleCustomerSelection = (customer: CustomerItem | null) => {
    setSelectedCustomer(customer);
    onCustomerFilterChange?.(customer);
    setIsCustomerDialogOpen(false);
  };

  useEffect(() => {
    // Set customer filter to always visible (removed database dependency)
    setCustomerFilterVisible(true);
  }, []);

  const clearProductFilter = () => {
    setSelectedProduct(null);
    onProductFilterChange?.(null);
  };

  const clearLocationFilter = () => {
    setSelectedLocation(null);
    onLocationFilterChange?.(null);
  };

  const clearCustomerFilter = () => {
    setSelectedCustomer(null);
    onCustomerFilterChange?.(null);
  };

  const getProductSelectionLabel = (item: ProductHierarchyItem) => {
    switch (item.level) {
      case 'category':
        return `${item.category_id} - ${item.category_name}`;
      case 'subcategory':
        return `${item.subcategory_id} - ${item.subcategory_name}`;
      case 'class':
        return `${item.class_id} - ${item.class_name}`;
      case 'product':
        return `${item.product_id} - ${item.product_name}`;
      default:
        return 'Unknown';
    }
  };

  const getLocationSelectionLabel = (location: LocationHierarchyItem): string => {
    switch (location.level) {
      case 'level1':
        return `Level 1: ${location.level_1}`;
      case 'level2':
        return `Level 2: ${location.level_2}`;
      case 'level3':
        return `Level 3: ${location.level_3}`;
      case 'level4':
        return `Level 4: ${location.level_4}`;
      default:
        return location.location_name;
    }
  };

  const getCustomerSelectionLabel = (customer: CustomerItem): string => {
    return `${customer.customer_code} - ${customer.description}`;
  };

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">Filters</h3>
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Product:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsProductDialogOpen(true)}
            className="h-8"
          >
            <Filter className="h-3 w-3 mr-1" />
            Select Product
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Location:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLocationDialogOpen(true)}
            className="h-8"
          >
            <Filter className="h-3 w-3 mr-1" />
            Select Location
          </Button>
        </div>

        {customerFilterVisible && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Customer:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCustomerDialogOpen(true)}
              className="h-8"
            >
              <Filter className="h-3 w-3 mr-1" />
              Select Customer
            </Button>
          </div>
        )}

        {selectedProduct && (
          <Badge variant="secondary" className="flex items-center gap-1">
            {getProductSelectionLabel(selectedProduct)}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={clearProductFilter}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}

        {selectedLocation && (
          <Badge variant="secondary" className="flex items-center gap-1">
            {getLocationSelectionLabel(selectedLocation)}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={clearLocationFilter}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}

        {selectedCustomer && (
          <Badge variant="secondary" className="flex items-center gap-1">
            {getCustomerSelectionLabel(selectedCustomer)}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={clearCustomerFilter}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}
      </div>

      <ProductFilterDialog
        open={isProductDialogOpen}
        onOpenChange={setIsProductDialogOpen}
        onSelectionChange={handleProductSelection}
        selectedItem={selectedProduct}
      />

      <LocationFilterDialog
        open={isLocationDialogOpen}
        onOpenChange={setIsLocationDialogOpen}
        onLocationSelect={handleLocationSelection}
        selectedLocation={selectedLocation}
      />

      <CustomerFilterDialog
        open={isCustomerDialogOpen}
        onOpenChange={setIsCustomerDialogOpen}
        onCustomerSelect={handleCustomerSelection}
        selectedCustomer={selectedCustomer}
      />
    </div>
  );
};