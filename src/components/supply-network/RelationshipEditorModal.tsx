import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit, Save, X } from 'lucide-react';
import { RelationshipDetails } from './RelationshipDetails';
import { useSupplyNetwork } from '@/hooks/useSupplyNetwork';
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
  const [editValues, setEditValues] = useState({
    relationship_type: '',
    cost: '',
    lead_time: '',
    capacity: ''
  });

  const relationship = relationships?.find(rel => rel.id === relationshipId);
  const sourceNode = nodes?.find(node => node.id === relationship?.from_node_id);
  const targetNode = nodes?.find(node => node.id === relationship?.to_node_id);

  // Initialize edit values when entering edit mode
  const handleStartEdit = () => {
    if (relationship) {
      setEditValues({
        relationship_type: relationship.relationship_type || '',
        cost: relationship.cost?.toString() || '',
        lead_time: relationship.lead_time?.toString() || '',
        capacity: relationship.capacity?.toString() || ''
      });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (!relationship || !editValues.relationship_type) {
      toast.error('El tipo de relación es requerido');
      return;
    }

    const updateData: any = {
      id: relationship.id,
      relationship_type: editValues.relationship_type,
    };

    // Only include numeric values if they're not empty and valid
    if (editValues.cost) {
      const costValue = Number(editValues.cost);
      if (isNaN(costValue) || costValue < 0) {
        toast.error('El costo debe ser un número válido mayor o igual a 0');
        return;
      }
      updateData.cost = costValue;
    }

    if (editValues.lead_time) {
      const leadTimeValue = Number(editValues.lead_time);
      if (isNaN(leadTimeValue) || leadTimeValue < 0) {
        toast.error('El tiempo de entrega debe ser un número válido mayor o igual a 0');
        return;
      }
      updateData.lead_time = leadTimeValue;
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
      relationship_type: '',
      cost: '',
      lead_time: '',
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
                <Label htmlFor="relationship_type">
                  Tipo de Relación <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={editValues.relationship_type} 
                  onValueChange={(value) => setEditValues(prev => ({ ...prev, relationship_type: value }))}
                >
                  <SelectTrigger className={!editValues.relationship_type ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supply-001">Suministro</SelectItem>
                    <SelectItem value="transport-001">Transporte</SelectItem>
                    <SelectItem value="distribution-001">Distribución</SelectItem>
                    <SelectItem value="supplies">Suministros</SelectItem>
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
                <Label htmlFor="lead_time">Tiempo de Entrega (días)</Label>
                <Input
                  id="lead_time"
                  type="number"
                  placeholder="0"
                  value={editValues.lead_time}
                  onChange={(e) => setEditValues(prev => ({ ...prev, lead_time: e.target.value }))}
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