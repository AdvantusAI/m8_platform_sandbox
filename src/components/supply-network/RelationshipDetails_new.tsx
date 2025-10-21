import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, TrendingUp, Package } from 'lucide-react';

interface RelationshipDetailsProps {
  relationship: any;
  sourceNode?: any;
  targetNode?: any;
}

export const RelationshipDetails: React.FC<RelationshipDetailsProps> = ({
  relationship,
  sourceNode,
  targetNode,
}) => {
  const getRelationshipTypeLabel = (type: string) => {
    switch (type) {
      case 'supply-001': return 'Suministro';
      case 'transport-001': return 'Transporte';
      case 'distribution-001': return 'Distribución';
      case 'supplies': return 'Suministros';
      default: return type || 'Desconocido';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {getRelationshipTypeLabel(relationship.relationship_type)}
            </CardTitle>
            <Badge variant="default">Activo</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Relación entre {sourceNode?.node_name || 'Nodo origen'} y {targetNode?.node_name || 'Nodo destino'}
          </p>
        </CardHeader>
      </Card>

      {/* Nodes Information */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Nodo Origen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium">{sourceNode?.node_name || 'N/A'}</p>
              <p className="text-sm text-muted-foreground">{sourceNode?.location_code || 'N/A'}</p>
              <p className="text-xs text-muted-foreground">{sourceNode?.description || ''}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Nodo Destino</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium">{targetNode?.node_name || 'N/A'}</p>
              <p className="text-sm text-muted-foreground">{targetNode?.location_code || 'N/A'}</p>
              <p className="text-xs text-muted-foreground">{targetNode?.description || ''}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Relationship Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Detalles de la Relación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <div>
                <p className="text-sm font-medium">
                  {getRelationshipTypeLabel(relationship.relationship_type)}
                </p>
                <p className="text-xs text-muted-foreground">Tipo de relación</p>
              </div>
            </div>
            
            {relationship.lead_time && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <div>
                  <p className="text-sm font-medium">{relationship.lead_time} días</p>
                  <p className="text-xs text-muted-foreground">Tiempo de entrega</p>
                </div>
              </div>
            )}
            
            {relationship.cost && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <div>
                  <p className="text-sm font-medium">${relationship.cost}</p>
                  <p className="text-xs text-muted-foreground">Costo</p>
                </div>
              </div>
            )}
          </div>
          
          {relationship.capacity && (
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <div>
                <p className="text-sm font-medium">{relationship.capacity} unidades</p>
                <p className="text-xs text-muted-foreground">Capacidad</p>
              </div>
            </div>
          )}

          {/* Relationship ID and timestamps */}
          <div className="pt-4 border-t space-y-2">
            <div className="text-xs text-muted-foreground">
              <p>ID: {relationship.id}</p>
              <p>Creado: {new Date(relationship.created_at).toLocaleString()}</p>
              <p>Actualizado: {new Date(relationship.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
