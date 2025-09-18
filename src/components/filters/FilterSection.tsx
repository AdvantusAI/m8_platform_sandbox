import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductFilterDialog } from "./ProductFilterDialog";
import { LocationFilterDialog, LocationItem } from "./LocationFilterDialog";
import { CustomerFilterDialog, CustomerItem } from "./CustomerFilterDialog";
import { supabase } from "@/integrations/supabase/client";
import { Filter, Package, X, MapPin, Container } from "lucide-react";

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
  onLocationFilterChange?: (location: LocationItem | null) => void;
  onCustomerFilterChange?: (customer: CustomerItem | null) => void;
  onSearch?: () => void;
}

export const FilterSection = ({ onProductFilterChange, onLocationFilterChange, onCustomerFilterChange, onSearch }: FilterSectionProps) => {
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductHierarchyItem | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [customerFilterVisible, setCustomerFilterVisible] = useState(false);

  const handleProductSelection = (selection: ProductHierarchyItem | null) => {
    setSelectedProduct(selection);
    onProductFilterChange?.(selection);
    setIsProductDialogOpen(false);
  };

  const handleLocationSelection = (location: LocationItem | null) => {
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

  const getLocationSelectionLabel = (location: LocationItem): string => {
    return `${location.description} (${location.location_code})`;
  };

  const getCustomerSelectionLabel = (customer: CustomerItem): string => {
    return `${customer.customer_code} - ${customer.description}`;
  };

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
      </div>
       <div className="flex flex-wrap items-center justify-between gap-2">


         <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">|   Producto:</span>
        
          <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setIsProductDialogOpen(true)}
                  className="ml-2 h-8 w-8"
                >
                  <Package className="h-4 w-4 text-blue-500" />
                </Button>
                {selectedProduct && (
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200  flex items-center gap-2">
            {getProductSelectionLabel(selectedProduct)}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={clearProductFilter}
            >
                <X className="h-3 w-3 text-red-500" />
            </Button>
          </Badge>
        )}
         
        </div>
       

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">|   Ubicación:</span>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsLocationDialogOpen(true)}
            className="h-8"
          >
            <MapPin className="h-4 w-4 text-green-500" />
          </Button>
          {selectedLocation && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 flex items-center gap-2">
              {getLocationSelectionLabel(selectedLocation)}
              <Button
                variant="ghost"
                size="sm"
                   className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={clearLocationFilter}
              >
                <X className="h-3 w-3 text-red-500" />
              </Button>
              
            </Badge>
          )}
        </div>

        {customerFilterVisible && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">|   Cliente:</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsCustomerDialogOpen(true)}
              className="h-8"
            >
            <Container className="h-4 w-4 text-orange-500" />
              
            </Button>
            
        {selectedCustomer && (
          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200  flex items-center gap-2">
            {getCustomerSelectionLabel(selectedCustomer)}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={clearCustomerFilter}
            >
              <X className="h-3 w-3 text-red-500" />
            </Button>
          </Badge>
         )}
           </div>
         )}

         {/* Buscar button aligned to the right */}
         <div className="flex items-center">
           <Button 
             variant="default"
             onClick={() => {
               console.log('Searching with filters:', {
                 product: selectedProduct,
                 location: selectedLocation,
                 customer: selectedCustomer
               });
               onSearch?.();
             }}
           >
             Buscar
           </Button>
         </div>

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