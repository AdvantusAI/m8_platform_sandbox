
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronDown, ChevronRight, Search, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Location{
  id: string,
  location_code: string,
  description?: string,
  type_code?: string
}
 

interface LocationSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (locationId: string) => void;
}

interface LocationFilterProps {
  onLocationSelect?: (locationId: string) => void;
  selectedLocationId?: string;
}

export function LocationSelectionModal({isOpen,onClose, onSelect}: LocationSelectionModalProps) {  
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  
  useEffect(() => {
      if (isOpen) {
        fetchLocations();
      }
  }, [isOpen]);

const fetchLocations = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .from('v_warehouse_node')
        .select('*')
        .order('description');

      if (error) throw error;
      
      const locationsData = data || [];
      setLocations(locationsData);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  
  const handleSelect = (locationId: string) => {
    onSelect(locationId);
    onClose();
    setSearchTerm('');
  };

  const filterLocations = (locations: Location[], searchTerm: string): Location[] => {
    if (!searchTerm) return locations;
    
    return locations.filter(location => 
      location.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.location_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.description?.toLowerCase().includes(searchTerm.toLowerCase()) 
    );
  };

  const filteredLocations = filterLocations(locations, searchTerm);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Seleccionar Ubicación
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar por nombre, ID, código, descripción o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* Scrollable location list area */}
          <ScrollArea className="h-96 border rounded-md">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-sm text-muted-foreground">Cargando ubicaciones...</div>
              </div>
               ) : filteredLocations.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-sm text-muted-foreground">
                  {searchTerm ? 'No se encontraron ubicaciones' : 'No hay ubicaciones disponibles'}
                </div>
              </div>
            ) : (
              <div className="p-2">
                {filteredLocations.map(location => (
                  <div 
                  key={location.location_code}
                    className="flex items-center p-2 hover:bg-gray-50 cursor-pointer text-sm"
                    onClick={() => handleSelect(location.location_code)}
                  >
                    <Package className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="flex-1">{location.description || location.location_code}</span>
                    <div className="ml-2 flex gap-1">
                    <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-200">
                     {location.location_code}
                    </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
