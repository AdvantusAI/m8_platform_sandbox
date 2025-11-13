import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit, Save, X } from 'lucide-react';
import { RelationshipDetails } from './RelationshipDetails';
import { useSupplyNetwork } from '@/hooks/useSupplyNetwork';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RelationshipEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  relationshipId: string;
}

export const RelationshipEditorModal: React.FC<RelationshipEditorModalProps> = ({
  isOpen,
  onClose,
  relationshipId,
}) => {
  const { nodes, relationships, deleteRelationship, updateRelationship } = useSupplyNetwork();
  const [isEditing, setIsEditing] = useState(false);
  const [relationshipTypes, setRelationshipTypes] = useState<Array<{id: string, type_code: string, type_name: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState({
    relationship_code: '',
    relationship_type_id: '',
    cost: '',
    lead_time_days: '',
    capacity: ''
  });

  const relationship = relationships?.find(rel => rel.id === relationshipId);
  const sourceNode = nodes?.find(node => node.id === relationship?.source_node_id);
  const targetNode = nodes?.find(node => node.id === relationship?.target_node_id);

  useEffect(() => {
    const fetchRelationshipTypes = async () => {
      try {
        const { data, error } = await (supabase as any).schema('m8_schema').rpc('get_supply_network_relationship_types');
        if (error) throw error;
        setRelationshipTypes(data || []);
      } catch (error) {
        console.error('Error fetching relationship types:', error);
        toast.error('Error al cargar tipos de relación');
      } finally {
        setLoading(false);
      }
    };

    fetchRelationshipTypes();
  }, []);

  // Initialize edit values when entering edit mode
  const handleStartEdit = () => {
    if (relationship) {
      setEditValues({
        relationship_code: relationship.relationship_code || '',
        relationship_type_id: relationship.relationship_type_id || '',
        cost: relationship.cost?.toString() || '',
        lead_time_days: relationship.lead_time_days?.toString() || '',
        capacity: relationship.capacity?.toString() || ''
      });
      setIsEditing(true);
    }
  };
  

  const handleSaveEdit = () => {

    
  
    if (!relationship || !editValues.relationship_type_id) {
      toast.error('El tipo de relación es requerido');
      return;
    }

    const updateData: any = {
      id: relationship.id,
      relationship_type_id: editValues.relationship_type_id,
    };

    if (!relationship || !editValues.relationship_code) {
      toast.error('El código de relación es requerido');
      return;
    }
    updateData.relationship_code = editValues.relationship_code;

    // Only include numeric values if they're not empty and valid
    if (editValues.cost) {
      const costValue = Number(editValues.cost);
      if (isNaN(costValue) || costValue < 0) {
        toast.error('El costo debe ser un número válido mayor o igual a 0');
        return;
      }
      updateData.cost = costValue;
    }

    if (editValues.lead_time_days) {
      const leadTimeValue = Number(editValues.lead_time_days);
      if (isNaN(leadTimeValue) || leadTimeValue < 0) {
        toast.error('El tiempo de entrega debe ser un número válido mayor o igual a 0');
        return;
      }
      updateData.lead_time_days = leadTimeValue;
    }

    if (editValues.capacity) {
      const capacityValue = Number(editValues.capacity);
      if (isNaN(capacityValue) || capacityValue < 0) {
        toast.error('La capacidad debe ser un número válido mayor o igual a 0');
        return;
      }
      updateData.capacity = capacityValue;
    }

    updateRelationship.mutate(updateData, {
      onSuccess: () => {
        toast.success('Relación actualizada exitosamente');
        setIsEditing(false);
      },
      onError: (error) => {
        console.error('Update error:', error);
        toast.error('Error al actualizar la relación');
      }
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValues({
      relationship_code: '',
      relationship_type_id: '',
      cost: '',
      lead_time_days: '',
      capacity: ''
    });
  };

  const handleDeleteRelationship = () => {
    if (relationship) {
      deleteRelationship.mutate(relationship.id, {
        onSuccess: () => {
          toast.success('Relación eliminada exitosamente');
          onClose();
        },
        onError: () => {
          toast.error('Error al eliminar la relación');
        }
      });
    }
  };

  if (!relationship) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Relación' : 'Detalles de Relación'}
          </DialogTitle>
        </DialogHeader>
        
        {isEditing ? (
          <div className="space-y-4">
            {/* Node Information (Read-only) */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-sm font-medium">Nodo Origen</Label>
                <p className="text-sm">{sourceNode?.node_name || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Nodo Destino</Label>
                <p className="text-sm">{targetNode?.node_name || 'N/A'}</p>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="relationship_code">
                  Código de Relación <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="relationship_code"
                  value={editValues.relationship_code}
                  onChange={(e) => setEditValues(prev => ({ ...prev, relationship_code: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="relationship_type_id">
                  Tipo de Relación <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={editValues.relationship_type_id} 
                  onValueChange={(value) => setEditValues(prev => ({ ...prev, relationship_type_id: value }))}
                >
                  <SelectTrigger className={!editValues.relationship_type_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {loading ? (
                      <SelectItem value="loading" disabled>
                        Cargando tipos de relación...
                      </SelectItem>
                    ) : (
                      relationshipTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.type_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cost">Costo</Label>
                <Input
                  id="cost"
                  type="number"
                  placeholder="0"
                  value={editValues.cost}
                  onChange={(e) => setEditValues(prev => ({ ...prev, cost: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="lead_time_days">Tiempo de Entrega (días)</Label>
                <Input
                  id="lead_time_days" //OJO segun. la base de datos puede ser lead_time o lead_time_days  
                  type="number"
                  placeholder="0"
                  value={editValues.lead_time_days}
                  onChange={(e) => setEditValues(prev => ({ ...prev, lead_time_days: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="capacity">Capacidad</Label>
                <Input
                  id="capacity"
                  type="number"
                  placeholder="0"
                  value={editValues.capacity}
                  onChange={(e) => setEditValues(prev => ({ ...prev, capacity: e.target.value }))}
                />
              </div>
            </div>
          </div>
        ) : (
          <RelationshipDetails 
            relationship={relationship}
            sourceNode={sourceNode}
            targetNode={targetNode}
          />
        )}
        
        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateRelationship.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {updateRelationship.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={handleStartEdit}
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Editar
              </Button>
            )}
          </div>
          
          {!isEditing && (
            <Button
              variant="destructive"
              onClick={handleDeleteRelationship}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar Relación
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};