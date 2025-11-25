import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from '@/hooks/useProducts';

interface FilterState {
  canal: string[];
  marca: string[];
  clientHierarchy: string[];
  umn: string[];
  productLine: string[];
  agente: string[];
  // Add structured fields for better integration
  selectedCustomers: string[];
  selectedCategories: string[];
  selectedBrands: string[];
  selectedLocations: string[];
  // Add product information for table display
  selectedProducts: string[];
  productDetails: {[key: string]: {product_id: string, product_name?: string}};
}

interface Brand {
  subcategory_id: string;
  subcategory_name: string;
}

interface ProductLine {
  class_id: string;
  class_name: string;
}

interface FilterPanelProps {
  customers?: any[];
  onFiltersChange?: (filters: FilterState) => void;
}

export default function FilterPanel({ customers = [], onFiltersChange }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>({
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

  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [productLinesLoading, setProductLinesLoading] = useState(true);
  const [allProductLines, setAllProductLines] = useState<ProductLine[]>([]);
  const [brandProductLineMap, setBrandProductLineMap] = useState<{[subcategoryId: string]: ProductLine[]}>({});
  
  // State for supply network data
  const [clientHierarchyOptions, setClientHierarchyOptions] = useState<string[]>([]);
  const [channelOptions, setChannelOptions] = useState<string[]>([]);
  const [agentOptions, setAgentOptions] = useState<string[]>([]);
  const [udnOptions, setUdnOptions] = useState<string[]>([]);
  const [supplyNetworkLoading, setSupplyNetworkLoading] = useState(true);
  
  // State for filtered options based on hierarchy selection
  const [filteredChannelOptions, setFilteredChannelOptions] = useState<string[]>([]);
  const [filteredAgentOptions, setFilteredAgentOptions] = useState<string[]>([]);
  const [filteredUdnOptions, setFilteredUdnOptions] = useState<string[]>([]);
  const [allSupplyNetworkData, setAllSupplyNetworkData] = useState<any[]>([]);
  
  // State to track when we're showing fallback options (all options when hierarchy has no matches)
  const [usingFallbackOptions, setUsingFallbackOptions] = useState({
    channels: false,
    agents: false,
    udn: false
  });

  // Fetch brands from products table
  const fetchBrands = async () => {
    try {
      setBrandsLoading(true);
      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .from('products')
        .select('product_id, attr_1, attr_2, attr_3, subcategory_name, subcategory_id')
        .order('subcategory_name');

      if (error) throw error;

      // Remove duplicates based on subcategory_id
      const uniqueBrands = data?.reduce((acc: Brand[], current) => {
        const exists = acc.find(item => item.subcategory_id === current.subcategory_id);
        if (!exists) {
          acc.push({
            subcategory_id: current.subcategory_id,
            subcategory_name: current.subcategory_name
          });
        }
        return acc;
      }, []) || [];

      setBrands(uniqueBrands);
    } catch (err) {
      console.error('Error fetching brands:', err);
    } finally {
      setBrandsLoading(false);
    }
  };

  // Fetch product lines from products table with brand relationship
  const fetchProductLines = async () => {
    try {
      setProductLinesLoading(true);
      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .from('products')
        .select('class_id, class_name, subcategory_id, subcategory_name')
        .order('class_name');

      if (error) throw error;

      // Remove duplicates based on class_id
      const uniqueProductLines = data?.reduce((acc: ProductLine[], current) => {
        const exists = acc.find(item => item.class_id === current.class_id);
        if (!exists && current.class_id && current.class_name) {
          acc.push({
            class_id: current.class_id,
            class_name: current.class_name
          });
        }
        return acc;
      }, []) || [];

      // Create mapping between brands (subcategories) and product lines (classes)
      const brandProductLineMapping: {[subcategoryId: string]: ProductLine[]} = {};
      data?.forEach(product => {
        if (product.subcategory_id && product.class_id && product.class_name) {
          if (!brandProductLineMapping[product.subcategory_id]) {
            brandProductLineMapping[product.subcategory_id] = [];
          }
          
          // Add product line if not already exists for this brand
          const exists = brandProductLineMapping[product.subcategory_id].find(
            pl => pl.class_id === product.class_id
          );
          if (!exists) {
            brandProductLineMapping[product.subcategory_id].push({
              class_id: product.class_id,
              class_name: product.class_name
            });
          }
        }
      });

      setAllProductLines(uniqueProductLines);
      setProductLines(uniqueProductLines);
      setBrandProductLineMap(brandProductLineMapping);
      
      console.log('Brand-ProductLine mapping:', brandProductLineMapping);
    } catch (err) {
      console.error('Error fetching product lines:', err);
    } finally {
      setProductLinesLoading(false);
    }
  };

  // Fetch products based on current filter selection
  const fetchProductsForFilters = async () => {
    try {
      let query = (supabase as any)
        .schema('m8_schema')
        .from('products')
        .select('product_id, product_name, subcategory_id, subcategory_name, class_id, class_name')
        .order('product_name');

      // Apply marca filter if selected
      if (filters.selectedBrands.length > 0) {
        query = query.in('subcategory_id', filters.selectedBrands);
      }

      // Apply productLine filter if selected  
      if (filters.productLine.length > 0) {
        query = query.in('class_name', filters.productLine);
      }

      const { data, error } = await query.limit(100); // Limit to prevent too much data

      if (error) throw error;

      // Update productDetails and selectedProducts
      const productDetails: {[key: string]: {product_id: string, product_name?: string}} = {};
      const selectedProducts: string[] = [];

      data?.forEach(product => {
        if (product.product_id) {
          productDetails[product.product_id] = {
            product_id: product.product_id,
            product_name: product.product_name
          };
          selectedProducts.push(product.product_id);
        }
      });

      setFilters(prev => ({
        ...prev,
        productDetails,
        selectedProducts
      }));

      console.log('Products fetched for filters:', {
        count: data?.length || 0,
        brands_applied: filters.selectedBrands,
        product_lines_applied: filters.productLine,
        sample_products: Object.keys(productDetails).slice(0, 5)
      });

    } catch (err) {
      console.error('Error fetching products for filters:', err);
    }
  };

  // Fetch supply network data
  const fetchSupplyNetworkData = async () => {
    try {
      setSupplyNetworkLoading(true);
      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .from('supply_network_nodes')
        .select('client_hierarchy, channel, agente, agent_name, udn')
        .order('client_hierarchy');

      if (error) throw error;

      // Store all data for filtering
      setAllSupplyNetworkData(data || []);

      // Extract unique values for each field
      const uniqueClientHierarchy = [...new Set(
        data?.map((item: any) => item.client_hierarchy).filter(Boolean) || []
      )].sort() as string[];
      
      const uniqueChannels = [...new Set(
        data?.map((item: any) => item.channel).filter(Boolean) || []
      )].sort() as string[];
      
      const uniqueAgents = [...new Set(
        data?.map((item: any) => item.agent_name).filter(Boolean) || []
      )].sort() as string[];

      const uniqueUdn = [...new Set(
        data?.map((item: any) => item.udn).filter(Boolean) || []
      )].sort() as string[];

      setClientHierarchyOptions(uniqueClientHierarchy);
      setChannelOptions(uniqueChannels);
      setAgentOptions(uniqueAgents);
      setUdnOptions(uniqueUdn);
      
      // Initially show all options
      setFilteredChannelOptions(uniqueChannels);
      setFilteredAgentOptions(uniqueAgents);
      setFilteredUdnOptions(uniqueUdn);

      console.log('Supply network data loaded:', {
        clientHierarchy: uniqueClientHierarchy.length,
        channels: uniqueChannels.length,
        agents: uniqueAgents.length,
        udn: uniqueUdn.length,
        totalRecords: data?.length || 0,
        sampleAgentNames: uniqueAgents.slice(0, 3)
      });
    } catch (err) {
      console.error('Error fetching supply network data:', err);
    } finally {
      setSupplyNetworkLoading(false);
    }
  };

  // Initialize data fetching
  useEffect(() => {
    fetchBrands();
    fetchProductLines();
    fetchSupplyNetworkData();
  }, []);

  // Fetch products when brand or product line filters change
  useEffect(() => {
    if (filters.selectedBrands.length > 0 || filters.productLine.length > 0) {
      fetchProductsForFilters();
    } else {
      // Clear products when no filters
      setFilters(prev => ({
        ...prev,
        productDetails: {},
        selectedProducts: []
      }));
    }
  }, [filters.selectedBrands, filters.productLine]);

  // Get customer hierarchy from supply_network_nodes
  const getCustomerHierarchy = () => {
    return clientHierarchyOptions.length > 0 ? clientHierarchyOptions : [];
  };

  // Filter channels, agents and UDN based on selected client hierarchy
  const filterChannelsAndAgentsByHierarchy = () => {
    if (filters.clientHierarchy.length === 0) {
      // No hierarchy selected, show all options
      setFilteredChannelOptions(channelOptions);
      setFilteredAgentOptions(agentOptions);
      setFilteredUdnOptions(udnOptions);
      
      // Reset fallback state when no hierarchy is selected
      setUsingFallbackOptions({
        channels: false,
        agents: false,
        udn: false
      });
    } else {
      // Filter based on selected hierarchies
      const relatedData = allSupplyNetworkData.filter(item => 
        filters.clientHierarchy.includes(item.client_hierarchy)
      );

      const relatedChannels = [...new Set(
        relatedData.map(item => item.channel).filter(Boolean)
      )].sort() as string[];

      const relatedAgents = [...new Set(
        relatedData.map(item => item.agent_name).filter(Boolean)
      )].sort() as string[];

      const relatedUdn = [...new Set(
        relatedData.map(item => item.udn).filter(Boolean)
      )].sort() as string[];

      // If hierarchy filtering results in no options, keep all options available
      // This allows users to still see and select other filters even when hierarchy has no matches
      const finalChannels = relatedChannels.length > 0 ? relatedChannels : channelOptions;
      const finalAgents = relatedAgents.length > 0 ? relatedAgents : agentOptions;
      const finalUdn = relatedUdn.length > 0 ? relatedUdn : udnOptions;

      setFilteredChannelOptions(finalChannels);
      setFilteredAgentOptions(finalAgents);
      setFilteredUdnOptions(finalUdn);

      // Track which options are using fallback (showing all options due to no hierarchy matches)
      setUsingFallbackOptions({
        channels: relatedChannels.length === 0,
        agents: relatedAgents.length === 0,
        udn: relatedUdn.length === 0
      });

      // Only clear selected filters if there are actually related options
      // This prevents losing selections when hierarchy doesn't match anything
      if (relatedChannels.length > 0 || relatedAgents.length > 0 || relatedUdn.length > 0) {
        setFilters(prev => ({
          ...prev,
          canal: prev.canal.filter(canal => finalChannels.includes(canal)),
          agente: prev.agente.filter(agente => finalAgents.includes(agente)),
          umn: prev.umn.filter(umn => finalUdn.includes(umn))
        }));
      }

      console.log('Filtered channels, agents and UDN by hierarchy:', {
        selectedHierarchies: filters.clientHierarchy,
        availableChannels: finalChannels.length,
        availableAgents: finalAgents.length,
        availableUdn: finalUdn.length,
        relatedRecords: relatedData.length,
        sampleAgentNames: finalAgents.slice(0, 3),
        fallbackUsed: {
          channels: relatedChannels.length === 0,
          agents: relatedAgents.length === 0,
          udn: relatedUdn.length === 0
        }
      });
    }
  };

  useEffect(() => {
    if (onFiltersChange) {
      console.log('FilterPanel: Sending filter changes:', filters);
      onFiltersChange(filters);
    }
  }, [filters, onFiltersChange]);

  const toggleFilter = (category: keyof FilterState, item: string) => {
    setFilters(prev => {
      if (category === 'productDetails') {
        // Special handling for productDetails object
        return prev;
      }
      
      const currentArray = prev[category] as string[];
      return {
        ...prev,
        [category]: currentArray.includes(item)
          ? currentArray.filter(i => i !== item)
          : [...currentArray, item]
      };
    });
  };

  const isSelected = (category: keyof FilterState, item: string) => {
    if (category === 'productDetails') {
      return false; // productDetails is not directly selectable
    }
    return (filters[category] as string[]).includes(item);
  };

  // Filter product lines based on selected brands
  const filterProductLinesBySelectedBrands = () => {
    if (filters.selectedBrands.length === 0) {
      // If no brands selected, show all product lines
      setProductLines(allProductLines);
    } else {
      // Show only product lines that belong to selected brands
      const filteredProductLines: ProductLine[] = [];
      filters.selectedBrands.forEach(brandId => {
        const brandProductLines = brandProductLineMap[brandId] || [];
        
        brandProductLines.forEach(pl => {
          // Add if not already exists
          const exists = filteredProductLines.find(existing => existing.class_id === pl.class_id);
          if (!exists) {
            filteredProductLines.push(pl);
          }
        });
      });
      
      const sortedFilteredProductLines = filteredProductLines.sort((a, b) => a.class_name.localeCompare(b.class_name));
      setProductLines(sortedFilteredProductLines);
    }
  };

  // Effect to filter product lines when brands change
  useEffect(() => {
    if (allProductLines.length > 0 && Object.keys(brandProductLineMap).length > 0) {
      filterProductLinesBySelectedBrands();
    }
  }, [filters.selectedBrands, allProductLines, brandProductLineMap]);

  // Effect to filter channels, agents and UDN when client hierarchy changes
  useEffect(() => {
    if (allSupplyNetworkData.length > 0) {
      filterChannelsAndAgentsByHierarchy();
    }
  }, [filters.clientHierarchy, allSupplyNetworkData, channelOptions, agentOptions, udnOptions]);

  return (
    <div className="w-full max-w-6xl mx-auto bg-white p-4 rounded-xl grid grid-cols-4 gap-4 shadow-lg border border-gray-200">
      {/* Canal */}
      <div className="bg-blue-900 text-white rounded-lg p-3">
        <p className="font-semibold mb-2">
          Canal
          {filters.clientHierarchy.length > 0 && (
            <span className={`text-xs font-normal ml-2 opacity-75 px-2 py-1 rounded ${
              usingFallbackOptions.channels 
                ? 'bg-yellow-600 text-yellow-100' 
                : 'bg-blue-800 text-blue-100'
            }`}>
              {usingFallbackOptions.channels 
                ? 'sin coincidencias - mostrando todos' 
                : `filtrado por ${filters.clientHierarchy.length} jerarquía${filters.clientHierarchy.length > 1 ? 's' : ''}`}
            </span>
          )}
        </p>
        <div className="flex flex-col gap-2 text-blue-900 max-h-60 overflow-y-auto">
          {supplyNetworkLoading ? (
            <div className="bg-white rounded-md px-2 py-1 text-sm text-center text-gray-500">
              Cargando canales...
            </div>
          ) : filteredChannelOptions.length > 0 ? (
            filteredChannelOptions.map((item) => (
              <button
                key={item}
                onClick={() => toggleFilter('canal', item)}
                className={`rounded-md px-2 py-1 text-sm text-left transition-all ${
                  isSelected('canal', item)
                    ? 'bg-blue-200 text-blue-900 font-semibold'
                    : 'bg-white text-blue-900 hover:bg-blue-50'
                }`}
              >
                {item}
              </button>
            ))
          ) : filters.clientHierarchy.length > 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md px-2 py-1 text-sm text-center text-yellow-700">
              Las jerarquías seleccionadas no tienen canales asociados
            </div>
          ) : (
            <div className="bg-white rounded-md px-2 py-1 text-sm text-center text-gray-500">
              Selecciona una jerarquía de cliente para ver canales relacionados
            </div>
          )}
        </div>
      </div>

      {/* Marca */}
      <div className="bg-blue-900 text-white rounded-lg p-3">
        <p className="font-semibold mb-2">Marca</p>
        <div className="flex flex-col gap-2 text-blue-900 max-h-60 overflow-y-auto">
          {brandsLoading ? (
            <div className="bg-white rounded-md px-2 py-1 text-sm text-center text-gray-500">
              Cargando marcas...
            </div>
          ) : brands.length > 0 ? (
            brands.map((brand) => (
              <button
                key={brand.subcategory_id}
                onClick={() => {
                  toggleFilter('marca', brand.subcategory_name);
                  
                  // Update selectedBrands and clear invalid product line selections
                  setFilters(prev => {
                    const isRemoving = prev.selectedBrands.includes(brand.subcategory_id);
                    const newSelectedBrands = isRemoving
                      ? prev.selectedBrands.filter(id => id !== brand.subcategory_id)
                      : [...prev.selectedBrands, brand.subcategory_id];
                    
                    // Get valid product lines for the new brand selection
                    let validProductLines: string[] = [];
                    if (newSelectedBrands.length > 0) {
                      newSelectedBrands.forEach(brandId => {
                        const brandProductLines = brandProductLineMap[brandId] || [];
                        brandProductLines.forEach(pl => {
                          if (!validProductLines.includes(pl.class_name)) {
                            validProductLines.push(pl.class_name);
                          }
                        });
                      });
                    } else {
                      // If no brands selected, all product lines are valid
                      validProductLines = allProductLines.map(pl => pl.class_name);
                    }
                    
                    // Filter current product line selections to keep only valid ones
                    const filteredProductLineSelections = prev.productLine.filter(
                      plName => validProductLines.includes(plName)
                    );
                    
                    return {
                      ...prev,
                      selectedBrands: newSelectedBrands,
                      productLine: filteredProductLineSelections
                    };
                  });
                }}
                className={`rounded-md px-2 py-1 text-sm text-left transition-all ${
                  isSelected('marca', brand.subcategory_name)
                    ? 'bg-blue-200 text-blue-900 font-semibold'
                    : 'bg-white text-blue-900 hover:bg-blue-50'
                }`}
              >
                {brand.subcategory_name}
              </button>
            ))
          ) : (
            <div className="bg-white rounded-md px-2 py-1 text-sm text-center text-gray-500">
              No hay marcas disponibles
            </div>
          )}
        </div>
      </div>

      {/* Jerarquía de Cliente */}
      <div className="bg-blue-900 text-white rounded-lg p-3">
        <p className="font-semibold mb-2">Jerarquía de Cliente</p>
        <div className="flex flex-col gap-2 text-blue-900 max-h-60 overflow-y-auto">
          {supplyNetworkLoading ? (
            <div className="bg-white rounded-md px-2 py-1 text-sm text-center text-gray-500">
              Cargando jerarquía de clientes...
            </div>
          ) : getCustomerHierarchy().length > 0 ? (
            getCustomerHierarchy().map((item) => {
              // Find the customer ID for better integration
              const customer = customers.find(c => c.customer_name === item);
              const customerId = customer?.customer_node_id || item;
              
              return (
                <button
                  key={item}
                  onClick={() => {
                    toggleFilter('clientHierarchy', item);
                    // Also update selectedCustomers for better integration
                    setFilters(prev => {
                      const isRemoving = prev.clientHierarchy.includes(item);
                      return {
                        ...prev,
                        selectedCustomers: isRemoving
                          ? prev.selectedCustomers.filter(id => id !== customerId)
                          : [...prev.selectedCustomers, customerId]
                      };
                    });
                  }}
                  className={`rounded-md px-2 py-1 text-sm text-left transition-all ${
                    isSelected('clientHierarchy', item)
                      ? 'bg-blue-200 text-blue-900 font-semibold'
                      : 'bg-white text-blue-900 hover:bg-blue-50'
                  }`}
                >
                  {item}
                </button>
              );
            })
          ) : (
            <div className="bg-white rounded-md px-2 py-1 text-sm text-center text-gray-500">
              No hay jerarquía de clientes disponible
            </div>
          )}
        </div>
      </div>

      {/* Agente */}
      <div className="bg-blue-900 text-white rounded-lg p-3">
        <p className="font-semibold mb-2">
          Agente
          {filters.clientHierarchy.length > 0 && (
            <span className={`text-xs font-normal ml-2 opacity-75 px-2 py-1 rounded ${
              usingFallbackOptions.agents 
                ? 'bg-yellow-600 text-yellow-100' 
                : 'bg-blue-800 text-blue-100'
            }`}>
              {usingFallbackOptions.agents 
                ? 'sin coincidencias - mostrando todos' 
                : `filtrado por ${filters.clientHierarchy.length} jerarquía${filters.clientHierarchy.length > 1 ? 's' : ''}`}
            </span>
          )}
        </p>
        <div className="flex flex-col gap-2 text-blue-900 max-h-60 overflow-y-auto">
          {supplyNetworkLoading ? (
            <div className="bg-white rounded-md px-2 py-1 text-sm text-center text-gray-500">
              Cargando agentes...
            </div>
          ) : filteredAgentOptions.length > 0 ? (
            filteredAgentOptions.map((item) => (
              <button
                key={item}
                onClick={() => toggleFilter('agente', item)}
                className={`rounded-md px-2 py-1 text-sm text-left transition-all ${
                  isSelected('agente', item)
                    ? 'bg-blue-200 text-blue-900 font-semibold'
                    : 'bg-white text-blue-900 hover:bg-blue-50'
                }`}
              >
                {item}
              </button>
            ))
          ) : filters.clientHierarchy.length > 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md px-2 py-1 text-sm text-center text-yellow-700">
              Las jerarquías seleccionadas no tienen agentes asociados
            </div>
          ) : (
            <div className="bg-white rounded-md px-2 py-1 text-sm text-center text-gray-500">
              Selecciona una jerarquía de cliente para ver agentes relacionados
            </div>
          )}
        </div>
      </div>

      {/* UDN */}
      <div className="bg-blue-900 text-white rounded-lg p-3 col-span-2">
        <p className="font-semibold mb-2">
          UDN
          {filters.clientHierarchy.length > 0 && (
            <span className={`text-xs font-normal ml-2 opacity-75 px-2 py-1 rounded ${
              usingFallbackOptions.udn 
                ? 'bg-yellow-600 text-yellow-100' 
                : 'bg-blue-800 text-blue-100'
            }`}>
              {usingFallbackOptions.udn 
                ? 'sin coincidencias - mostrando todos' 
                : `filtrado por ${filters.clientHierarchy.length} jerarquía${filters.clientHierarchy.length > 1 ? 's' : ''}`}
            </span>
          )}
        </p>
        <div className="flex flex-col gap-2 text-blue-900 max-h-60 overflow-y-auto">
          {supplyNetworkLoading ? (
            <div className="bg-white rounded-md px-2 py-1 text-sm text-center text-gray-500">
              Cargando UDN...
            </div>
          ) : filteredUdnOptions.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {filteredUdnOptions.map((item) => (
                <button
                  key={item}
                  onClick={() => toggleFilter('umn', item)}
                  className={`rounded-md px-2 py-1 text-sm transition-all ${
                    isSelected('umn', item)
                      ? 'bg-blue-200 text-blue-900 font-semibold'
                      : 'bg-white text-blue-900 hover:bg-blue-50'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          ) : filters.clientHierarchy.length > 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md px-2 py-1 text-sm text-center text-yellow-700">
              Las jerarquías seleccionadas no tienen UDN asociadas
            </div>
          ) : (
            <div className="bg-white rounded-md px-2 py-1 text-sm text-center text-gray-500">
              Selecciona una jerarquía de cliente para ver UDN relacionadas
            </div>
          )}
        </div>
      </div>

      {/* Línea de Producto */}
      <div className="bg-blue-900 text-white rounded-lg p-3 col-span-2">
        <p className="font-semibold mb-2">
          Línea de Producto
          {filters.selectedBrands.length > 0 && (
            <span className="text-xs font-normal ml-2 opacity-75 bg-blue-800 px-2 py-1 rounded">
              filtrado por {filters.selectedBrands.length} marca{filters.selectedBrands.length > 1 ? 's' : ''}
            </span>
          )}
        </p>
        <div className="flex flex-col gap-2 text-blue-900 max-h-60 overflow-y-auto">
          {productLinesLoading ? (
            <div className="bg-white rounded-md px-2 py-1 text-sm text-center text-gray-500">
              Cargando líneas de producto...
            </div>
          ) : productLines.length > 0 ? (
            productLines.map((productLine) => (
              <button
                key={productLine.class_id}
                onClick={() => toggleFilter('productLine', productLine.class_name)}
                className={`rounded-md px-2 py-1 text-sm text-left transition-all ${
                  isSelected('productLine', productLine.class_name)
                    ? 'bg-blue-200 text-blue-900 font-semibold'
                    : 'bg-white text-blue-900 hover:bg-blue-50'
                }`}
              >
                {productLine.class_name}
              </button>
            ))
          ) : filters.selectedBrands.length > 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md px-2 py-1 text-sm text-center text-yellow-700">
              Las marcas seleccionadas no tienen líneas de producto asociadas
            </div>
          ) : (
            <div className="bg-white rounded-md px-2 py-1 text-sm text-center text-gray-500">
              Selecciona una marca para ver las líneas de producto disponibles
            </div>
          )}
        </div>
      </div>

      {/* Filter Summary and Statistics */}
      <div className="col-span-4 mt-4 space-y-3">
        {/* Applied Filters */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(filters)
            .filter(([category, items]) => Array.isArray(items) && items.length > 0)
            .flatMap(([category, items]) =>
              (items as string[]).map(item => (
                <span
                  key={`${category}-${item}`}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {item}
                  <button
                    onClick={() => toggleFilter(category as keyof FilterState, item)}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          {Object.values(filters).some(items => Array.isArray(items) && items.length > 0) && (
            <button
              onClick={() => {
                setFilters({ 
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
                // Reset product lines to show all when filters are cleared
                setProductLines(allProductLines);
              }}
              className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full hover:bg-gray-200"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Filter Statistics */}
        {Object.values(filters).some(items => items.length > 0) && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="grid grid-cols-5 gap-4 text-sm mb-3">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {customers.length}
                </div>
                <div className="text-gray-600">Clientes</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {filters.marca.length + filters.productLine.length}
                </div>
                <div className="text-gray-600">Productos</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">
                  {filters.canal.length + filters.umn.length}
                </div>
                <div className="text-gray-600">Canales</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">
                  {filters.agente.length}
                </div>
                <div className="text-gray-600">Agentes</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">
                  {Object.values(filters).reduce((sum, items) => {
                    return sum + (Array.isArray(items) ? items.length : 0);
                  }, 0)}
                </div>
                <div className="text-gray-600">Total Filtros</div>
              </div>
            </div>
            
            {/* Sample Impact Visualization */}
            <div className="border-t border-gray-300 pt-3">
              <div className="text-xs text-gray-600 mb-2">Impacto en Ventas Estimado:</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-green-100 p-2 rounded text-center">
                  <div className="font-bold text-green-700">+15.2%</div>
                  <div className="text-green-600">Q1 2025</div>
                </div>
                <div className="bg-blue-100 p-2 rounded text-center">
                  <div className="font-bold text-blue-700">+8.7%</div>
                  <div className="text-blue-600">Q2 2025</div>
                </div>
                <div className="bg-orange-100 p-2 rounded text-center">
                  <div className="font-bold text-orange-700">+12.4%</div>
                  <div className="text-orange-600">Total</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
