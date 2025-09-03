import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Package, MapPin, X } from "lucide-react";
import { ProductSelectionModal } from "@/components/ProductSelectionModal";
import { LocationSelectionModal } from "@/components/LocationSelectionModal";

import { InventoryProjectionsChart } from "@/components/InventoryProjectionsChart";
import { useInventoryProjectionsChart } from "@/hooks/useInventoryProjectionsChart";
import { useState, useEffect } from "react";

export default function SupplyWorkbench() {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const { data, loading, error, fetchChartData } = useInventoryProjectionsChart();

  // Fetch chart data when filters change
  useEffect(() => {
    fetchChartData({
      product_id: selectedProductId || undefined,
      location_node_id: selectedLocationId || undefined,
    });
  }, [selectedProductId, selectedLocationId, fetchChartData]);

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    ////console.log('Producto seleccionado en Supply Workbench:', productId);
  };

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId);
    ////console.log('Ubicación seleccionada en Supply Workbench:', locationId);
  };

  const handleClearFilters = () => {
    setSelectedProductId('');
    setSelectedLocationId('');
  };

  return (
    <div className="flex-1 space-y-4 p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Supply Workbench</h2>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Product Filter */}
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Producto:</span>
              <span className="text-sm text-muted-foreground">
                {selectedProductId || 'No seleccionado'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProductModalOpen(true)}
              >
                Seleccionar Producto
              </Button>
            </div>

            {/* Location Filter */}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Ubicación:</span>
              <span className="text-sm text-muted-foreground">
                {selectedLocationId || 'No seleccionada'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLocationModalOpen(true)}
              >
                Seleccionar Ubicación
              </Button>
            </div>

          </div>

          {/* Clear Filters Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Limpiar filtros
          </Button>
        </div>
      </Card>

      {/* Inventory Projections Chart */}
      <InventoryProjectionsChart
        data={data}
        loading={loading}
        error={error}
      />

      {/* Modals */}
      <ProductSelectionModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSelect={handleProductSelect}
      />

      <LocationSelectionModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelect={handleLocationSelect}
      />

    </div>
  );
}