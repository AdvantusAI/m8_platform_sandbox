import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Truck, 
  Package, 
  RefreshCw,
  MapPin,
  X,
  Filter
} from 'lucide-react';
import { SupplyPlanService } from '@/services/supplyPlanService';
import { ProductSelectionModal } from '@/components/ProductSelectionModal';
import { CustomerSelectionModal } from '@/components/CustomerSelectionModal';
import { LocationSelectionModal } from '@/components/LocationSelectionModal';
import { useProducts } from '@/hooks/useProducts';
import { useCustomers } from '@/hooks/useCustomers';
import { useLocations } from '@/hooks/useLocations';


// Type definition for filter storage
interface FilterStorage {
  productId: string;
  locationId: string;
  customerId: string;
}

const ReplenishmentDashboard: React.FC = () => {
  // ===== LOCAL STORAGE HELPERS =====
  const getStoredFilters = (): Partial<FilterStorage> => {
    try {
      const stored = localStorage.getItem('replenishmentDashboardFilters');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const saveFiltersToStorage = (filters: FilterStorage): void => {
    try {
      localStorage.setItem('replenishmentDashboardFilters', JSON.stringify(filters));
    } catch (error) {
      console.warn('Failed to save filters to localStorage:', error);
    }
  };

  // ===== STATE MANAGEMENT =====
  const storedFilters = getStoredFilters();
  
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>(storedFilters.productId || '');
  const [selectedLocation, setSelectedLocation] = useState<string>(storedFilters.locationId || '');
  const [selectedCustomer, setSelectedCustomer] = useState<string>(storedFilters.customerId || '');
  const [availableProducts, setAvailableProducts] = useState<Array<{product_id: string, location_id?: string}>>([]);
  
  // Modal visibility states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  
  // ===== HOOKS =====
  const { getProductName } = useProducts();
  const { getCustomerName } = useCustomers();
  const { getLocationName } = useLocations();

  // Load available products
  const loadAvailableProducts = useCallback(async () => {
    try {
      const products = await SupplyPlanService.getAvailableProducts();
      setAvailableProducts(products);
      if (products.length > 0 && selectedProduct) {
        const matchingProduct = products.find(p => p.product_id === selectedProduct);
        if (matchingProduct) {
          setSelectedLocation(matchingProduct.location_id || '');
        }
      }
    } catch (error) {
      console.error('Error loading available products:', error);
      toast.error('Error al conectar con la base de datos. Verifique que la vista v_meio_supply_plan existe y tiene datos.');
      setAvailableProducts([]);
    }
  }, [selectedProduct]);


  // ===== EVENT HANDLERS =====
  /**
   * Handles product selection from modal
   * @param productId - Selected product ID
   */
  const handleProductSelect = (productId: string): void => {
    setSelectedProduct(productId);
    saveFiltersToStorage({
      productId,
      locationId: selectedLocation,
      customerId: selectedCustomer
    });
  };

  /**
   * Handles location selection from modal
   * @param locationId - Selected location ID
   */
  const handleLocationSelect = (locationId: string): void => {
    setSelectedLocation(locationId);
    saveFiltersToStorage({
      productId: selectedProduct,
      locationId,
      customerId: selectedCustomer
    });
  };

  /**
   * Handles customer selection from modal
   * @param customerId - Selected customer ID
   */
  const handleCustomerSelect = (customerId: string): void => {
    setSelectedCustomer(customerId);
    saveFiltersToStorage({
      productId: selectedProduct,
      locationId: selectedLocation,
      customerId
    });
  };

  /**
   * Clears all filters and resets to default state
   */
  const handleClearFilters = (): void => {
    setSelectedProduct('');
    setSelectedLocation('');
    setSelectedCustomer('');
    saveFiltersToStorage({
      productId: '',
      locationId: '',
      customerId: ''
    });
  };




  useEffect(() => {
    loadAvailableProducts();
  }, [loadAvailableProducts]);

  // Debug modal state changes
  useEffect(() => {
    console.log('Product modal state changed to:', isProductModalOpen);
  }, [isProductModalOpen]);


  return (
    <div className="space-y-6">
      {/* Header */}
      

      {/* ===== FILTER SECTION ===== */}
      <Card className="transition-all hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              
              {/* Product Filter - Required */}
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Producto:</span>
                {selectedProduct ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedProduct}</Badge>
                    <Badge variant="secondary">{getProductName(selectedProduct)}</Badge>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {availableProducts.length === 0 ? 'No hay productos disponibles' : 'No seleccionado (obligatorio)'}
                  </span>
                )}
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    console.log('Product button clicked!');
                    console.log('Current modal state before click:', isProductModalOpen);
                    console.log('Available products:', availableProducts.length);
                    setIsProductModalOpen(true);
                    console.log('Modal state set to true');
                  }}
                  className="ml-2 h-8 w-8"
                  disabled={availableProducts.length === 0}
                  title={availableProducts.length === 0 ? 'No hay productos disponibles en la base de datos' : 'Seleccionar producto'}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Location Filter - Optional */}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Ubicación:</span>
                {selectedLocation ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedLocation}</Badge>
                    <Badge variant="secondary">{getLocationName(selectedLocation)}</Badge>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No seleccionada (opcional)</span>
                )}
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="ml-2 h-8 w-8"
                >
                  <Filter className="h-4 w-4" />
                </Button>
                {/* Individual clear button for location */}
                {selectedLocation && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      setSelectedLocation('');
                      saveFiltersToStorage({
                        productId: selectedProduct,
                        locationId: '',
                        customerId: selectedCustomer
                      });
                    }}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Customer Filter - Optional */}
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Cliente:</span>           
                {selectedCustomer ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedCustomer}</Badge>
                    <Badge variant="secondary">{getCustomerName(selectedCustomer)}</Badge>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No seleccionado (opcional)</span>
                )}
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="ml-2 h-8 w-8"
                >
                  <Filter className="h-4 w-4" />
                </Button>
                {/* Individual clear button for customer */}
                {selectedCustomer && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      setSelectedCustomer('');
                      saveFiltersToStorage({
                        productId: selectedProduct,
                        locationId: selectedLocation,
                        customerId: ''
                      });
                    }}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
            </div>
            
            {/* Global clear all filters button */}
            {(selectedProduct || selectedLocation || selectedCustomer) && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleClearFilters}
                className="h-8 w-8"
                title="Limpiar todos los filtros"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>


      {/* ===== MODAL COMPONENTS ===== */}
      {console.log('Rendering ProductSelectionModal with isOpen:', isProductModalOpen)}
      <ProductSelectionModal
        isOpen={isProductModalOpen}
        onClose={() => {
          console.log('Product modal closing');
          setIsProductModalOpen(false);
        }}
        onSelect={handleProductSelect}
      />
      
      <LocationSelectionModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelect={handleLocationSelect}
        selectedLocationId={selectedLocation}
      />
      
      <CustomerSelectionModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelect={handleCustomerSelect}
        selectedCustomerId={selectedCustomer}
      />
    </div>
  );
};

export default ReplenishmentDashboard;