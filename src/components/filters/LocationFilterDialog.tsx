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
import { Loader2, Circle, CheckCircle2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface LocationItem {
  location_id: string;
  description: string;
  location_code: string;
}

interface LocationFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationSelect: (location: LocationItem | null) => void;
  selectedLocation: LocationItem | null;
}

export function LocationFilterDialog({
  open,
  onOpenChange,
  onLocationSelect,
  selectedLocation,
}: LocationFilterDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<LocationItem[]>([]);

  useEffect(() => {
    if (open) {
      fetchLocations();
    }
  }, [open, searchTerm]);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .schema('m8_schema')
        .from('v_warehouse_node')
        .select('location_id, description, location_code');

      // Add search filter if searchTerm is provided
      if (searchTerm) {
        query = query.or(`description.ilike.%${searchTerm}%,location_code.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelection = (location: LocationItem) => {
    onLocationSelect(location);
  };

  const isSelected = (location: LocationItem) => {
    if (!selectedLocation) return false;
    return selectedLocation.location_id === location.location_id;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Location</DialogTitle>
          <DialogDescription>
            Choose a location from the list.
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
                <span className="ml-2 text-sm text-muted-foreground">Loading locations...</span>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-1 p-2">
                  {locations.map((location) => {
                    const selected = isSelected(location);
                    return (
                      <div
                        key={location.location_id}
                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent/50 ${
                          selected ? 'bg-accent text-accent-foreground' : ''
                        }`}
                        onClick={() => handleSelection(location)}
                      >
                        {selected ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium">{location.description}</div>
                          <div className="text-xs text-muted-foreground">{location.location_code}</div>
                        </div>
                      </div>
                    );
                  })}
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