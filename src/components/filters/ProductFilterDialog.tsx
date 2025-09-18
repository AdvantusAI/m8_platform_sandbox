import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ChevronRight, ChevronDown, Circle, CheckCircle2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductHierarchyItem } from "./FilterSection";

interface ProductFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectionChange: (selection: ProductHierarchyItem | null) => void;
  selectedItem: ProductHierarchyItem | null;
}

interface HierarchyNode {
  id: string;
  name: string;
  level: 'category' | 'subcategory' | 'class' | 'product';
  children?: HierarchyNode[];
  data: ProductHierarchyItem;
}

export const ProductFilterDialog = ({
  open,
  onOpenChange,
  onSelectionChange,
  selectedItem,
}: ProductFilterDialogProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [hierarchyData, setHierarchyData] = useState<HierarchyNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [previousExpandedNodes, setPreviousExpandedNodes] = useState<Set<string>>(new Set());
  const [productLevels, setProductLevels] = useState<string[]>(['category', 'subcategory', 'product']);

  useEffect(() => {
    if (open) {
      fetchProductLevels();
      fetchHierarchyData();
    }
  }, [open]);

  // Debounced search effect
  useEffect(() => {
    if (!open) return;
    
    const timeoutId = setTimeout(() => {
      fetchHierarchyData();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm, open]);

  const fetchProductLevels = async () => {
    // Use default levels for now
    // TODO: Create system config function if needed
    setProductLevels(['category', 'subcategory', 'product']);
  };

  const fetchHierarchyData = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .schema('m8_schema')
        .from('products')
        .select('product_id, product_name, category_name, subcategory_name, class_name')
        .order('category_name, subcategory_name, class_name, product_name');

      // Add search filter if searchTerm is provided
      if (searchTerm) {
        // Check if searchTerm is numeric for exact product_id match
        const isNumeric = !isNaN(Number(searchTerm));
        if (isNumeric) {
          // For numeric searches, try exact match on product_id first, then fallback to text search
          query = query.or(`product_id.eq.${searchTerm},product_id.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%,category_name.ilike.%${searchTerm}%,subcategory_name.ilike.%${searchTerm}%,class_name.ilike.%${searchTerm}%`);
        } else {
          // For text searches, use ilike on all fields
          query = query.or(`product_id.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%,category_name.ilike.%${searchTerm}%,subcategory_name.ilike.%${searchTerm}%,class_name.ilike.%${searchTerm}%`);
        }
      }

      const { data, error } = await query;
      
      if (error) throw error;

      const hierarchy = buildHierarchy(data || []);
      setHierarchyData(hierarchy);
      
      // Handle expanded state based on search
      if (searchTerm) {
        // If searching, save current state and expand all nodes to show results
        if (expandedNodes.size > 0) {
          setPreviousExpandedNodes(expandedNodes);
        }
        const allNodeIds = new Set<string>();
        const collectNodeIds = (nodes: HierarchyNode[]) => {
          nodes.forEach(node => {
            allNodeIds.add(node.id);
            if (node.children) {
              collectNodeIds(node.children);
            }
          });
        };
        collectNodeIds(hierarchy);
        setExpandedNodes(allNodeIds);
      } else {
        // If clearing search, restore previous expanded state
        if (previousExpandedNodes.size > 0) {
          setExpandedNodes(previousExpandedNodes);
          setPreviousExpandedNodes(new Set());
        }
      }
    } catch (error) {
      console.error('Error fetching hierarchy:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildHierarchy = (data: any[]): HierarchyNode[] => {
    const categoryMap = new Map<string, HierarchyNode>();
    const subcategoryMap = new Map<string, HierarchyNode>();
    const classMap = new Map<string, HierarchyNode>();

    data.forEach((item) => {
      // Create category node
      const categoryKey = item.category_name || 'Uncategorized';
      if (!categoryMap.has(categoryKey)) {
        categoryMap.set(categoryKey, {
          id: `category_${categoryKey}`,
          name: categoryKey,
          level: 'category',
          children: [],
          data: {
            category_id: categoryKey,
            category_name: categoryKey,
            subcategory_id: item.subcategory_name,
            subcategory_name: item.subcategory_name,
            class_id: item.class_name,
            class_name: item.class_name,
            product_id: item.product_id,
            product_name: item.product_name,
            level: 'category'
          }
        });
      }

      // Create subcategory node if included in levels and exists
      if (productLevels.includes('subcategory') && item.subcategory_name) {
        const subcategoryKey = `${categoryKey}_${item.subcategory_name}`;
        if (!subcategoryMap.has(subcategoryKey)) {
          const subcategoryNode: HierarchyNode = {
            id: `subcategory_${subcategoryKey}`,
            name: item.subcategory_name,
            level: 'subcategory',
            children: [],
            data: {
              category_id: categoryKey,
              category_name: categoryKey,
              subcategory_id: item.subcategory_name,
              subcategory_name: item.subcategory_name,
              class_id: item.class_name,
              class_name: item.class_name,
              product_id: item.product_id,
              product_name: item.product_name,
              level: 'subcategory'
            }
          };
          subcategoryMap.set(subcategoryKey, subcategoryNode);
          categoryMap.get(categoryKey)?.children?.push(subcategoryNode);
        }
      }

      // Create class node if included in levels and exists
      if (productLevels.includes('class') && item.class_name) {
        const classKey = `${categoryKey}_${item.subcategory_name || 'default'}_${item.class_name}`;
        if (!classMap.has(classKey)) {
          const classNode: HierarchyNode = {
            id: `class_${classKey}`,
            name: item.class_name,
            level: 'class',
            children: [],
            data: {
              category_id: categoryKey,
              category_name: categoryKey,
              subcategory_id: item.subcategory_name,
              subcategory_name: item.subcategory_name,
              class_id: item.class_name,
              class_name: item.class_name,
              product_id: item.product_id,
              product_name: item.product_name,
              level: 'class'
            }
          };
          classMap.set(classKey, classNode);
          
          const parentKey = productLevels.includes('subcategory') && item.subcategory_name
            ? `${categoryKey}_${item.subcategory_name}`
            : categoryKey;
          const parentMap = productLevels.includes('subcategory') && item.subcategory_name ? subcategoryMap : categoryMap;
          parentMap.get(parentKey)?.children?.push(classNode);
        }
      }

      // Add product if included in levels
      if (productLevels.includes('product')) {
        const productNode: HierarchyNode = {
          id: `product_${item.product_id}`,
          name: `${item.product_id} - ${item.product_name}`,
          level: 'product',
          data: {
            category_id: categoryKey,
            category_name: categoryKey,
            subcategory_id: item.subcategory_name,
            subcategory_name: item.subcategory_name,
            class_id: item.class_name,
            class_name: item.class_name,
            product_id: item.product_id,
            product_name: item.product_name,
            level: 'product'
          }
        };

        // Find the correct parent
        let parentNode: HierarchyNode | undefined;
        if (productLevels.includes('class') && item.class_name) {
          const classKey = `${categoryKey}_${item.subcategory_name || 'default'}_${item.class_name}`;
          parentNode = classMap.get(classKey);
        } else if (productLevels.includes('subcategory') && item.subcategory_name) {
          const subcategoryKey = `${categoryKey}_${item.subcategory_name}`;
          parentNode = subcategoryMap.get(subcategoryKey);
        } else {
          parentNode = categoryMap.get(categoryKey);
        }

        if (parentNode) {
          if (!parentNode.children) parentNode.children = [];
          parentNode.children.push(productNode);
        }
      }
    });

    return Array.from(categoryMap.values());
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleSelection = (node: HierarchyNode) => {
    onSelectionChange(node.data);
  };

  const isSelected = (node: HierarchyNode) => {
    if (!selectedItem) return false;
    return (
      selectedItem.level === node.level &&
      selectedItem.category_id === node.data.category_id &&
      selectedItem.subcategory_id === node.data.subcategory_id &&
      selectedItem.class_id === node.data.class_id &&
      selectedItem.product_id === node.data.product_id
    );
  };

  const renderNode = (node: HierarchyNode, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const selected = isSelected(node);

    return (
      <div key={node.id} className="space-y-1">
        <div
          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent/50 ${
            selected ? 'bg-accent text-accent-foreground' : ''
          }`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => handleSelection(node)}
        >
          <div className="flex items-center gap-2 flex-1">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            ) : (
              <div className="w-4" />
            )}
            
            {selected ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
            
            <span className="text-sm">{node.name}</span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {node.children?.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[600px] h-[600px] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Select Product</DialogTitle>
          <DialogDescription>
            Choose a product from the hierarchy. You can select at any level.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 space-y-4 min-h-0">
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex-1 overflow-hidden min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Loading products...</span>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-1 p-2">
                  {hierarchyData.map((node) => renderNode(node))}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="flex justify-end gap-2 flex-shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                onSelectionChange(null);
                onOpenChange(false);
              }}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};