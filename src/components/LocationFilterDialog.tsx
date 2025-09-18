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

export interface LocationHierarchyItem {
  location_id: string;
  location_name: string;
  level_1?: string;
  level_2?: string;
  level_3?: string;
  level_4?: string;
  level: 'level1' | 'level2' | 'level3' | 'level4' | 'location';
}

interface LocationFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationSelect: (location: LocationHierarchyItem | null) => void;
  selectedLocation: LocationHierarchyItem | null;
}

interface HierarchyNode {
  id: string;
  name: string;
  level: 'level1' | 'level2' | 'level3' | 'level4' | 'location';
  children?: HierarchyNode[];
  data: LocationHierarchyItem;
}

export function LocationFilterDialog({
  open,
  onOpenChange,
  onLocationSelect,
  selectedLocation,
}: LocationFilterDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [hierarchyData, setHierarchyData] = useState<HierarchyNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [locationLevels, setLocationLevels] = useState(['level1', 'level2', 'location']);

  useEffect(() => {
    if (open) {
      fetchHierarchyData();
    }
  }, [open, searchTerm]);

  const fetchHierarchyData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_locations_hierarchy', {
        search_term: searchTerm || null,
      });
      
      if (error) throw error;

      const hierarchy = buildHierarchy(data || []);
      setHierarchyData(hierarchy);
    } catch (error) {
      console.error('Error fetching hierarchy:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildHierarchy = (data: any[]): HierarchyNode[] => {
    const level1Map = new Map<string, HierarchyNode>();
    const level2Map = new Map<string, HierarchyNode>();
    const level3Map = new Map<string, HierarchyNode>();
    const level4Map = new Map<string, HierarchyNode>();

    data.forEach((item) => {
      // Create level 1 node
      if (item.level_1) {
        const level1Key = item.level_1;
        if (!level1Map.has(level1Key)) {
          level1Map.set(level1Key, {
            id: `level1_${item.level_1}`,
            name: item.level_1,
            level: 'level1',
            children: [],
            data: {
              location_id: `level1_${item.level_1}`,
              location_name: item.level_1,
              level_1: item.level_1,
              level_2: item.level_2,
              level_3: item.level_3,
              level_4: item.level_4,
              level: 'level1'
            }
          });
        }
      }

      // Create level 2 node if included in levels
      if (locationLevels.includes('level2') && item.level_2) {
        const level2Key = `${item.level_1}_${item.level_2}`;
        if (!level2Map.has(level2Key)) {
          const level2Node: HierarchyNode = {
            id: `level2_${item.level_1}_${item.level_2}`,
            name: item.level_2,
            level: 'level2',
            children: [],
            data: {
              location_id: `level2_${item.level_1}_${item.level_2}`,
              location_name: item.level_2,
              level_1: item.level_1,
              level_2: item.level_2,
              level_3: item.level_3,
              level_4: item.level_4,
              level: 'level2'
            }
          };
          level2Map.set(level2Key, level2Node);
          level1Map.get(item.level_1)?.children?.push(level2Node);
        }
      }

      // Create level 3 node if included in levels and exists
      if (locationLevels.includes('level3') && item.level_3) {
        const level3Key = `${item.level_1}_${item.level_2}_${item.level_3}`;
        if (!level3Map.has(level3Key)) {
          const level3Node: HierarchyNode = {
            id: `level3_${item.level_1}_${item.level_2}_${item.level_3}`,
            name: item.level_3,
            level: 'level3',
            children: [],
            data: {
              location_id: `level3_${item.level_1}_${item.level_2}_${item.level_3}`,
              location_name: item.level_3,
              level_1: item.level_1,
              level_2: item.level_2,
              level_3: item.level_3,
              level_4: item.level_4,
              level: 'level3'
            }
          };
          level3Map.set(level3Key, level3Node);
          
          const parentKey = locationLevels.includes('level2') 
            ? `${item.level_1}_${item.level_2}`
            : item.level_1;
          const parentMap = locationLevels.includes('level2') ? level2Map : level1Map;
          parentMap.get(parentKey)?.children?.push(level3Node);
        }
      }

      // Create level 4 node if included in levels and exists
      if (locationLevels.includes('level4') && item.level_4) {
        const level4Key = `${item.level_1}_${item.level_2}_${item.level_3}_${item.level_4}`;
        if (!level4Map.has(level4Key)) {
          const level4Node: HierarchyNode = {
            id: `level4_${item.level_1}_${item.level_2}_${item.level_3}_${item.level_4}`,
            name: item.level_4,
            level: 'level4',
            children: [],
            data: {
              location_id: `level4_${item.level_1}_${item.level_2}_${item.level_3}_${item.level_4}`,
              location_name: item.level_4,
              level_1: item.level_1,
              level_2: item.level_2,
              level_3: item.level_3,
              level_4: item.level_4,
              level: 'level4'
            }
          };
          level4Map.set(level4Key, level4Node);
          
          // Find the correct parent
          let parentNode: HierarchyNode | undefined;
          if (locationLevels.includes('level3') && item.level_3) {
            const level3Key = `${item.level_1}_${item.level_2}_${item.level_3}`;
            parentNode = level3Map.get(level3Key);
          } else if (locationLevels.includes('level2')) {
            const level2Key = `${item.level_1}_${item.level_2}`;
            parentNode = level2Map.get(level2Key);
          } else {
            parentNode = level1Map.get(item.level_1);
          }
          
          if (parentNode) {
            if (!parentNode.children) parentNode.children = [];
            parentNode.children.push(level4Node);
          }
        }
      }

      // Add location if included in levels
      if (locationLevels.includes('location')) {
        const locationNode: HierarchyNode = {
          id: `location_${item.location_id}`,
          name: `${item.location_id} - ${item.location_name}`,
          level: 'location',
          data: {
            location_id: item.location_id,
            location_name: item.location_name,
            level_1: item.level_1,
            level_2: item.level_2,
            level_3: item.level_3,
            level_4: item.level_4,
            level: 'location'
          }
        };

        // Find the correct parent
        let parentNode: HierarchyNode | undefined;
        if (locationLevels.includes('level4') && item.level_4) {
          const level4Key = `${item.level_1}_${item.level_2}_${item.level_3}_${item.level_4}`;
          parentNode = level4Map.get(level4Key);
        } else if (locationLevels.includes('level3') && item.level_3) {
          const level3Key = `${item.level_1}_${item.level_2}_${item.level_3}`;
          parentNode = level3Map.get(level3Key);
        } else if (locationLevels.includes('level2') && item.level_2) {
          const level2Key = `${item.level_1}_${item.level_2}`;
          parentNode = level2Map.get(level2Key);
        } else {
          parentNode = level1Map.get(item.level_1);
        }

        if (parentNode) {
          if (!parentNode.children) parentNode.children = [];
          parentNode.children.push(locationNode);
        }
      }
    });

    return Array.from(level1Map.values());
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
    onLocationSelect(node.data);
  };

  const isSelected = (node: HierarchyNode) => {
    if (!selectedLocation) return false;
    return (
      selectedLocation.level === node.level &&
      selectedLocation.location_id === node.data.location_id
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
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Location</DialogTitle>
          <DialogDescription>
            Choose a location from the hierarchy. You can select at any level.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Loading hierarchy...</span>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-1 p-2">
                  {hierarchyData.map((node) => renderNode(node))}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                onLocationSelect(null);
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
}