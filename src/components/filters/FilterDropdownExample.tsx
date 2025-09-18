import { useState } from "react";
import { FilterDropdown, ProductHierarchyItem, LocationItem, CustomerItem } from "./FilterDropdown";

export const FilterDropdownExample = () => {
  const [selectedProduct, setSelectedProduct] = useState<ProductHierarchyItem | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);

  const handleSearch = () => {
    console.log('Searching with filters:', {
      product: selectedProduct,
      location: selectedLocation,
      customer: selectedCustomer
    });
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Filter Dropdown Example</h2>
      
      <div className="mb-4">
        <FilterDropdown
          onProductFilterChange={setSelectedProduct}
          onLocationFilterChange={setSelectedLocation}
          onCustomerFilterChange={setSelectedCustomer}
          onSearch={handleSearch}
        />
      </div>

      {/* Display selected filters */}
      <div className="space-y-2">
        <h3 className="font-medium">Selected Filters:</h3>
        {selectedProduct && (
          <div className="text-sm text-blue-600">
            Product: {selectedProduct.product_id} - {selectedProduct.product_name}
          </div>
        )}
        {selectedLocation && (
          <div className="text-sm text-green-600">
            Location: {selectedLocation.description} ({selectedLocation.location_code})
          </div>
        )}
        {selectedCustomer && (
          <div className="text-sm text-orange-600">
            Customer: {selectedCustomer.description} ({selectedCustomer.customer_code})
          </div>
        )}
        {!selectedProduct && !selectedLocation && !selectedCustomer && (
          <div className="text-sm text-gray-500">No filters selected</div>
        )}
      </div>
    </div>
  );
};
