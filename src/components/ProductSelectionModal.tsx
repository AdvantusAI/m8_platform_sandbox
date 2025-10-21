import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Package, ChevronRight, ChevronDown } from 'lucide-react';

interface Product {
  product_id: string;
  product_name: string;
  category_name?: string;
  subcategory_name?: string;
  category_id?: string;
  subcategory_id?: string;
}

interface CategoryNode {
  id: string;
  name: string;
  type: 'category' | 'subcategory' | 'product';
  children?: CategoryNode[];
  product_id?: string;
}

interface ProductSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selection: { ids: string[]; name: string; type: 'product' | 'category' | 'subcategory' }) => void;
}

export function ProductSelectionModal({ isOpen, onClose, onSelect }: ProductSelectionModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/products');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
      }
      
      const productsData = await response.json();
      setProducts(productsData || []);
      buildCategoryTree(productsData || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildCategoryTree = (productsData: Product[]) => {
    const tree: CategoryNode[] = [];
    const categoryMap = new Map<string, CategoryNode>();
    const subcategoryMap = new Map<string, CategoryNode>();

    productsData.forEach(product => {
      // Create or get category
      const categoryKey = product.category_id || product.category_name || 'Sin Categoría';
      let categoryNode = categoryMap.get(categoryKey);
      if (!categoryNode) {
        categoryNode = {
          id: categoryKey,
          name: product.category_name || 'Sin Categoría',
          type: 'category',
          children: []
        };
        categoryMap.set(categoryKey, categoryNode);
        tree.push(categoryNode);
      }

      // Create or get subcategory
      const subcategoryKey = `${categoryKey}-${product.subcategory_id || product.subcategory_name || 'Sin Subcategoría'}`;
      let subcategoryNode = subcategoryMap.get(subcategoryKey);
      if (!subcategoryNode) {
        subcategoryNode = {
          id: subcategoryKey,
          name: product.subcategory_name || 'Sin Subcategoría',
          type: 'subcategory',
          children: []
        };
        subcategoryMap.set(subcategoryKey, subcategoryNode);
        categoryNode.children!.push(subcategoryNode);
      }

      // Add product to subcategory
      const productNode: CategoryNode = {
        id: product.product_id,
        name: product.product_name || product.product_id,
        type: 'product',
        product_id: product.product_id
      };
      subcategoryNode.children!.push(productNode);
    });

    setCategoryTree(tree);
  };

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleSelect = async (id: string, type: 'category' | 'subcategory' | 'product') => {
    setSelectedItem(id);
    let name = '';
    let ids: string[] = [];
    if (type === 'category') {
      const node = categoryTree.find(node => node.id === id);
      name = node?.name || id;
      // Collect all product ids under this category
      const collectIds = (nodes: CategoryNode[]) => {
        nodes.forEach(n => {
          if (n.type === 'product' && n.product_id) {
            ids.push(n.product_id);
          } else if (n.children) {
            collectIds(n.children);
          }
        });
      };
      if (node?.children) collectIds(node.children);
    } else if (type === 'subcategory') {
      const node = categoryTree.flatMap(node => node.children || []).find(node => node.id === id);
      name = node?.name || id;
      // Collect all product ids under this subcategory
      const collectIds = (nodes: CategoryNode[]) => {
        nodes.forEach(n => {
          if (n.type === 'product' && n.product_id) {
            ids.push(n.product_id);
          } else if (n.children) {
            collectIds(n.children);
          }
        });
      };
      if (node?.children) collectIds(node.children);
    } else {
      const product = products.find(p => p.product_id === id);
      name = product?.product_name || id;
      ids = [id];
    }
    onSelect({ ids, name, type });
  };

  const filterTree = (nodes: CategoryNode[], searchTerm: string): CategoryNode[] => {
    return nodes.reduce<CategoryNode[]>((filtered, node) => {
      if (node.children) {
        const filteredChildren = filterTree(node.children, searchTerm);
        if (filteredChildren.length > 0) {
          return [...filtered, { ...node, children: filteredChildren }];
        }
        if (node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return [...filtered, node];
        }
      }
      return filtered;
    }, []);
  };

  const renderTreeNode = (node: CategoryNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const paddingLeft = level * 20;
    return (
      <div key={node.id}>
        <div
          className={`flex items-center p-2 hover:bg-gray-50 cursor-pointer ${
            node.type === 'product' ? 'text-sm' : 'font-medium'
          }`}
          style={{ paddingLeft: `${paddingLeft + 8}px` }}
          onClick={() => {
            if (node.type === 'product' && node.product_id) {
              handleSelect(node.product_id, 'product');
            } else if (node.type === 'category') {
              toggleExpanded(node.id);
            } else if (node.type === 'subcategory') {
              toggleExpanded(node.id);
            } else if (hasChildren) {
              toggleExpanded(node.id);
            }
          }}
        >
          {hasChildren && (
            <div className="mr-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          )}
          {node.type === 'product' && <Package className="h-4 w-4 mr-2 text-blue-500" />}
          <span className="flex-1">{node.name}</span>
          {node.type === 'category' && (
            <Badge
              variant="outline"
              className="ml-2 text-xs cursor-pointer"
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering parent click logic
                handleSelect(node.id, 'category');
              }}
            >
              Categoría
            </Badge>
          )}
          {node.type === 'subcategory' && (
            <Badge
              variant="outline"
              className="ml-2 text-xs cursor-pointer"
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering parent click logic
                handleSelect(node.id, 'subcategory');
              }}
            >
              Subcategoría
            </Badge>
          )}
          {node.type === 'product' && (
            <Badge variant="outline" className="ml-2 text-xs">
              {node.product_id}
            </Badge>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredTree = filterTree(categoryTree, searchTerm);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Seleccionar Producto
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar por nombre, ID o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <ScrollArea className="h-96 border rounded-md">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-sm text-muted-foreground">Cargando productos...</div>
              </div>
            ) : filteredTree.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-sm text-muted-foreground">
                  {searchTerm ? 'No se encontraron productos' : 'No hay productos disponibles'}
                </div>
              </div>
            ) : (
              <div className="p-2">
                {filteredTree.map(node => renderTreeNode(node))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
