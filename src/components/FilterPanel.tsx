import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from '@/hooks/useProducts';
import { toast } from "sonner";

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
  // Add supply network node IDs for commercial collaboration filtering
  selectedSupplyNetworkNodeIds: string[];
  // Add location mapping for KAM adjustments
  availableLocations: {[key: string]: string}; // location_id -> location_name
  productLocationMap: {[product_id: string]: string[]}; // product_id -> location_ids[]
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
  onApplyFilters?: () => void;
}

export default function FilterPanel({ customers = [], onFiltersChange, onApplyFilters }: FilterPanelProps) {
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
    productDetails: {},
    selectedSupplyNetworkNodeIds: [],
    availableLocations: {},
    productLocationMap: {}
  });
  
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);

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
      
      console.log('Brand-ProductLine mapping created:', {
        totalBrands: Object.keys(brandProductLineMapping).length,
        sampleMappings: Object.entries(brandProductLineMapping).slice(0, 3).map(([brandId, productLines]) => ({
          brandId,
          productLinesCount: productLines.length,
          productLineNames: productLines.map(pl => pl.class_name)
        })),
        allProductLinesCount: uniqueProductLines.length
      });
    } catch (err) {
      console.error('Error fetching product lines:', err);
    } finally {
      setProductLinesLoading(false);
    }
  };

  // Function to fetch location data for selected brands/products
  const fetchLocationDataForBrands = async (selectedBrandIds: string[]) => {
    if (selectedBrandIds.length === 0) {
      return { availableLocations: {}, productLocationMap: {} };
    }

    try {
      console.log('Fetching location data for brand IDs:', selectedBrandIds);
      
      // First, get all products that belong to the selected brands
      const { data: productBrands, error: productError } = await (supabase as any)
        .schema('m8_schema')
        .from('products')
        .select('product_id, subcategory_id')
        .in('subcategory_id', selectedBrandIds);

      if (productError) {
        console.error('Error fetching products for brands:', productError);
        return { availableLocations: {}, productLocationMap: {} };
      }

      const productIds = productBrands?.map(pb => pb.product_id) || [];
      
      if (productIds.length === 0) {
        console.log('No products found for selected brands');
        return { availableLocations: {}, productLocationMap: {} };
      }

      // Now get location data from commercial_collaboration (using location_node_id)
      const { data: locationData, error: locationError } = await (supabase as any)
        .schema('m8_schema')
        .from('commercial_collaboration')
        .select('product_id, location_node_id')
        .in('product_id', productIds);

      if (locationError) {
        console.error('Error fetching location data:', locationError);
        return { availableLocations: {}, productLocationMap: {} };
      }

      // Get unique location_node_ids to fetch location details
      const locationNodeIds = Array.from(new Set(
        locationData?.map(item => item.location_node_id).filter(Boolean) || []
      ));

      if (locationNodeIds.length === 0) {
        console.log('No locations found for selected products');
        return { availableLocations: {}, productLocationMap: {} };
      }

      // Fetch location details from v_warehouse_node
      const { data: locationsDetail, error: locationsError } = await (supabase as any)
        .schema('m8_schema')
        .from('v_warehouse_node')
        .select('location_id, location_code, description')
        .in('location_id', locationNodeIds);

      if (locationsError) {
        console.error('Error fetching location details:', locationsError);
        return { availableLocations: {}, productLocationMap: {} };
      }

      // Process the data to create the maps
      const availableLocations: {[key: string]: string} = {};
      const productLocationMap: {[key: string]: string[]} = {};

      // Create location lookup map
      const locationLookup: {[key: string]: string} = {};
      locationsDetail?.forEach(location => {
        if (location.location_id && location.description) {
          locationLookup[location.location_id] = location.description;
        }
      });

      // Process commercial_collaboration data
      locationData?.forEach(item => {
        if (item.location_node_id && item.product_id && locationLookup[item.location_node_id]) {
          // Add to available locations map
          availableLocations[item.location_node_id] = locationLookup[item.location_node_id];
          
          // Add to product-location map
          if (!productLocationMap[item.product_id]) {
            productLocationMap[item.product_id] = [];
          }
          if (!productLocationMap[item.product_id].includes(item.location_node_id)) {
            productLocationMap[item.product_id].push(item.location_node_id);
          }
        }
      });

      console.log('Location data fetched:', {
        availableLocationsCount: Object.keys(availableLocations).length,
        productLocationMapCount: Object.keys(productLocationMap).length,
        sampleLocations: Object.entries(availableLocations).slice(0, 3)
      });

      return { availableLocations, productLocationMap };
    } catch (error) {
      console.error('Error in fetchLocationDataForBrands:', error);
      return { availableLocations: {}, productLocationMap: {} };
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

  // Fetch products using JOIN query exactly like the SQL example
  const fetchProductsFromSupplyNetworkFilters = async () => {
    try {
      // Only fetch if any supply network filters are selected
      if (filters.clientHierarchy.length === 0 && filters.canal.length === 0 && 
          filters.agente.length === 0 && filters.umn.length === 0) {
        return;
      }

      console.log('=== SUPPLY NETWORK JOIN FILTERING ===');
      console.log('Applied filters:', {
        clientHierarchy: filters.clientHierarchy,
        canal: filters.canal,
        agente: filters.agente,
        umn: filters.umn
      });

      // Execute the exact same logic as the SQL query:
      // SELECT p.product_id, p.attr_1, p.attr_2, p.attr_3, p.subcategory_name, p.subcategory_id
      // FROM supply_network_nodes snn
      // JOIN commercial_collaboration_view ccv ON ccv.location_node_id = snn.id  
      // JOIN products p ON p.product_id = ccv.product_id
      // WHERE snn.client_hierarchy = 'TEST'

      // Step 1: Get supply_network_nodes that match our filters
      let supplyQuery = (supabase as any)
        .schema('m8_schema')
        .from('supply_network_nodes')
        .select('id');

      // Apply filter conditions
      if (filters.clientHierarchy.length > 0) {
        console.log('Applying client_hierarchy filter:', filters.clientHierarchy);
        supplyQuery = supplyQuery.in('client_hierarchy', filters.clientHierarchy);
      }
      if (filters.canal.length > 0) {
        console.log('Applying channel filter:', filters.canal);
        supplyQuery = supplyQuery.in('channel', filters.canal);
      }
      if (filters.agente.length > 0) {
        console.log('Applying agent filter:', filters.agente);
        // Try both agent and agent_name fields to handle different schema versions
        supplyQuery = supplyQuery.or(`agente.in.(${filters.agente.map(a => `"${a}"`).join(',')}),agent_name.in.(${filters.agente.map(a => `"${a}"`).join(',')})`);
      }
      if (filters.umn.length > 0) {
        console.log('Applying udn filter:', filters.umn);
        supplyQuery = supplyQuery.in('udn', filters.umn);
      }
      const { data: supplyNodes, error: supplyError } = await supplyQuery;

      if (supplyError) {
        console.error('Error fetching supply network nodes:', supplyError);
        if (supplyError.message?.includes('invalid input syntax for type uuid')) {
          console.error('🚨 UUID ERROR in supply network query! Check client_hierarchy values:', filters.clientHierarchy);
        }
        return;
      }

      if (!supplyNodes || supplyNodes.length === 0) {
        console.log('No supply network nodes found for selected filters');
        setFilters(prev => ({
          ...prev,
          selectedProducts: [],
          productDetails: {},
          selectedSupplyNetworkNodeIds: []
        }));
        return;
      }

      const nodeIds = supplyNodes.map(node => node.id).filter(id => {
        // Validate that ID is a proper UUID format to prevent "TEST" from being treated as UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return id && uuidRegex.test(id);
      });
      console.log('Found supply network node IDs:', nodeIds.length, 'nodes');
      console.log('Sample node IDs:', nodeIds.slice(0, 3));
      console.log('Raw supply nodes sample:', supplyNodes?.slice(0, 2));

      // Step 2: Join with commercial_collaboration_view and products in one query
      // This mimics: JOIN commercial_collaboration_view ccv ON ccv.location_node_id = snn.id  
      //              JOIN products p ON p.product_id = ccv.product_id
      const { data: joinedData, error: joinError } = await (supabase as any)
        .schema('m8_schema')
        .from('commercial_collaboration_view')
        .select(`
          product_id,
          products!inner(
            product_id,
            product_name,
            attr_1,
            attr_2,
            attr_3,
            subcategory_name,
            subcategory_id,
            class_id,
            class_name
          )
        `)
        .in('location_node_id', nodeIds);

      // Debug logging to track UUID issues
      console.log('🔍 DEBUG: Applying location_node_id filter with nodeIds:', {
        count: nodeIds.length,
        sampleIds: nodeIds.slice(0, 3),
        allUUIDs: nodeIds.every(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)),
        selectedHierarchies: filters.clientHierarchy
      });

      if (joinError) {
        console.error('Error executing join query:', joinError);
        if (joinError.message?.includes('invalid input syntax for type uuid')) {
          console.error('🚨 UUID ERROR DETECTED! Check nodeIds values:', nodeIds);
          // Filter out any non-UUID values and retry
          const validNodeIds = nodeIds.filter(id => 
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
          );
          console.log('Retrying with only valid UUIDs:', validNodeIds);
        }
        return;
      }

      if (!joinedData || joinedData.length === 0) {
        console.log('No products found in commercial_collaboration_view for selected supply network nodes');
        setFilters(prev => ({
          ...prev,
          selectedProducts: [],
          productDetails: {},
          selectedSupplyNetworkNodeIds: nodeIds
        }));
        return;
      }

      // Extract unique products - only those that exist in commercial_collaboration_view
      const uniqueProducts = new Map();
      joinedData.forEach((item: any) => {
        if (item.products && item.product_id) {
          uniqueProducts.set(item.product_id, {
            product_id: item.product_id,
            product_name: item.products.product_name,
            attr_1: item.products.attr_1,
            attr_2: item.products.attr_2,
            attr_3: item.products.attr_3,
            subcategory_name: item.products.subcategory_name,
            subcategory_id: item.products.subcategory_id,
            class_id: item.products.class_id,
            class_name: item.products.class_name
          });
        }
      });

      const productsArray = Array.from(uniqueProducts.values());
      const uniqueProductIds = Array.from(uniqueProducts.keys());

      // Create product details map
      const productDetails: {[key: string]: {product_id: string, product_name?: string}} = {};
      productsArray.forEach((product: any) => {
        productDetails[product.product_id] = {
          product_id: product.product_id,
          product_name: product.product_name
        };
      });

      console.log('✅ Supply network JOIN filtering complete:', {
        supplyNodeCount: nodeIds.length,
        collaborationRecords: joinedData.length,
        uniqueProducts: uniqueProductIds.length,
        sampleProductIds: uniqueProductIds.slice(0, 5),
        sampleProducts: productsArray.slice(0, 3).map((p: any) => ({
          id: p.product_id,
          name: p.product_name,
          subcategory: p.subcategory_name
        })),
        appliedFilters: {
          clientHierarchy: filters.clientHierarchy,
          canal: filters.canal,
          agente: filters.agente,
          umn: filters.umn
        }
      });

      // Update filters with the found products that exist in commercial_collaboration_view
      setFilters(prev => ({
        ...prev,
        selectedProducts: uniqueProductIds,
        productDetails: productDetails,
        selectedSupplyNetworkNodeIds: nodeIds
      }));

    } catch (err) {
      console.error('Error in supply network JOIN filtering:', err);
    }
  };

  // Fetch supply network data
  const fetchSupplyNetworkData = async () => {
    try {
      setSupplyNetworkLoading(true);
      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .from('supply_network_nodes')
        .select('client_hierarchy, channel, agente, agent_name, udn, id')
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
        data?.map((item: any) =>  item.agent_name).filter(Boolean) || []
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

  // Fetch products from commercial_collaboration_view when supply network filters change
  useEffect(() => {
    if (filters.clientHierarchy.length > 0 || filters.canal.length > 0 || 
        filters.agente.length > 0 || filters.umn.length > 0) {
      fetchProductsFromSupplyNetworkFilters();
    } else if (filters.selectedBrands.length === 0 && filters.productLine.length === 0) {
      // Clear products when no supply network filters and no brand/product line filters
      setFilters(prev => ({
        ...prev,
        selectedProducts: [],
        productDetails: {},
        selectedSupplyNetworkNodeIds: []
      }));
    }
  }, [filters.clientHierarchy, filters.canal, filters.agente, filters.umn]);

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
        relatedData.map(item =>  item.agent_name).filter(Boolean)
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

  // Track when filters change to show "Apply" button
  useEffect(() => {
    setHasUnappliedChanges(true);
  }, [filters]);

  // Function to apply filters
  const handleApplyFilters = () => {
    // Check if at least one filter is selected to prevent timeout
    const hasAnyFilter = 
      filters.canal.length > 0 ||
      filters.marca.length > 0 ||
      filters.clientHierarchy.length > 0 ||
      filters.umn.length > 0 ||
      filters.productLine.length > 0 ||
      filters.agente.length > 0 ||
      filters.selectedBrands.length > 0 ||
      filters.selectedProducts.length > 0;

    if (!hasAnyFilter) {
      toast.error('Selecciona al menos un filtro', {
        description: 'Para mejorar el rendimiento, debes seleccionar al menos una marca, cliente, canal o producto antes de buscar.',
        duration: 5000,
      });
      return;
    }

    if (onFiltersChange) {
      console.log('FilterPanel: Applying filters:', {
        ...filters,
        selectedProductsCount: filters.selectedProducts.length,
        selectedSupplyNetworkNodeIdsCount: filters.selectedSupplyNetworkNodeIds.length
      });
      onFiltersChange(filters);
    }
    if (onApplyFilters) {
      onApplyFilters();
    }
    setHasUnappliedChanges(false);
  };

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
      const processedClassIds = new Set<string>();
      
      filters.selectedBrands.forEach(brandId => {
        const brandProductLines = brandProductLineMap[brandId] || [];
        
        brandProductLines.forEach(pl => {
          // Add if not already processed (using Set for better performance)
          if (!processedClassIds.has(pl.class_id)) {
            processedClassIds.add(pl.class_id);
            filteredProductLines.push(pl);
          }
        });
      });
      
      console.log('Filtering product lines by selected brands:', {
        selectedBrands: filters.selectedBrands,
        brandProductLineMap: filters.selectedBrands.map(brandId => ({
          brandId,
          productLines: brandProductLineMap[brandId]?.map(pl => pl.class_name) || []
        })),
        filteredProductLines: filteredProductLines.map(pl => pl.class_name),
        totalFiltered: filteredProductLines.length
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
    <div className="w-full max-w-full bg-white p-2 sm:p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 shadow-lg border border-gray-200 overflow-hidden">
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
                  console.log('Brand clicked:', {
                    subcategory_id: brand.subcategory_id,
                    subcategory_name: brand.subcategory_name,
                    currentSelectedBrands: filters.selectedBrands,
                    currentMarca: filters.marca
                  });
                  
                  // Update both marca (for display) and selectedBrands (for filtering)
                  setFilters(prev => {
                    const isRemovingFromMarca = prev.marca.includes(brand.subcategory_name);
                    const isRemovingFromSelectedBrands = prev.selectedBrands.includes(brand.subcategory_id);
                    
                    // Both should be in sync - if one is selected, both should be selected
                    const isRemoving = isRemovingFromMarca || isRemovingFromSelectedBrands;
                    
                    const newMarca = isRemoving
                      ? prev.marca.filter(name => name !== brand.subcategory_name)
                      : [...prev.marca, brand.subcategory_name];
                      
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
                    
                    console.log('Updated brand selection:', {
                      newMarca,
                      newSelectedBrands,
                      validProductLines: validProductLines.slice(0, 5), // Show first 5
                      filteredProductLineSelections
                    });
                    
                    // Fetch location data for the selected brands
                    fetchLocationDataForBrands(newSelectedBrands).then(locationData => {
                      setFilters(current => ({
                        ...current,
                        availableLocations: locationData.availableLocations,
                        productLocationMap: locationData.productLocationMap
                      }));
                    }).catch(error => {
                      console.error('Error fetching location data:', error);
                    });
                    
                    return {
                      ...prev,
                      marca: newMarca,
                      selectedBrands: newSelectedBrands,
                      productLine: filteredProductLineSelections
                    };
                  });
                }}
                className={`rounded-md px-2 py-1 text-sm text-left transition-all ${
                  isSelected('marca', brand.subcategory_name) || filters.selectedBrands.includes(brand.subcategory_id)
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
        {/* Apply Filters Button */}
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={handleApplyFilters}
            disabled={!hasUnappliedChanges && Object.values(filters).every(items => !Array.isArray(items) || items.length === 0)}
            className={`
              px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 shadow-md
              ${hasUnappliedChanges 
                ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105' 
                : 'bg-green-500 cursor-default'
              }
            `}
          >
            {hasUnappliedChanges ? '🔍 Buscar / Aplicar Filtros' : '✓ Filtros Aplicados'}
          </button>
          
          {Object.values(filters).some(items => Array.isArray(items) && items.length > 0) && (
            <button
              onClick={() => {
                console.log('Clearing all filters');
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
                  productDetails: {},
                  selectedSupplyNetworkNodeIds: [],
                  availableLocations: {},
                  productLocationMap: {}
                });
                // Reset product lines to show all when filters are cleared
                setProductLines(allProductLines);
                setHasUnappliedChanges(false);
              }}
              className="px-6 py-3 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              🗑️ Limpiar Filtros
            </button>
          )}
        </div>
        
        {/* Applied Filters */}
         <div className="flex flex-wrap gap-2" style={{ display: 'none' }}>
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
                console.log('Clearing all filters');
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
                  productDetails: {},
                  selectedSupplyNetworkNodeIds: [],
                  availableLocations: {},
                  productLocationMap: {}
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
            {/* <div className="border-t border-gray-300 pt-3">
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
            </div> */}
          </div>
        )}
      </div>
    </div>
  );
}



