import React, { useState, useEffect } from 'react';
import { Search, Users, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

interface CustomerNode {
  id: string;
  node_name: string;
  description?: string;
}

interface CustomerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customerId: string) => void;
  selectedCustomerId?: string;
}

export function CustomerSelectionModal({
  isOpen,
  onClose,
  onSelect,
  selectedCustomerId
}: CustomerSelectionModalProps) {
  const [customers, setCustomers] = useState<CustomerNode[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { isAdministrator } = useUserRole();

  useEffect(() => {
    if (isOpen && user) {
      fetchCustomers();
    }
  }, [isOpen, searchTerm, user, isAdministrator]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      //console.log('Fetching customers...');
      
      if (!user) {
        setCustomers([]);
        return;
      }

      // Fetch customer nodes from supply_network_nodes where node_type_id corresponds to CUSTOMERS type
      let query = supabase
        .schema('m8_schema')
        .from('supply_network_nodes')
        .select(`
          id,
          node_name,
          description,
          node_type_id,
          supply_network_node_types!inner(type_code)
        `)
        .eq('supply_network_node_types.type_code', 'CUSTOMERS')
        .eq('status', 'active')
        .order('node_name');

      if (searchTerm) {
        query = query.or(`node_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      ////console.log('Customers data:', data);
      
      const customerNodes: CustomerNode[] = (data || []).map(customer => ({
        id: customer.id,
        node_name: customer.node_name || 'Sin nombre',
        description: customer.description
      }));

      setCustomers(customerNodes);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerClick = (customerId: string) => {
    onSelect(customerId);
    onClose();
  };

  const renderCustomer = (customer: CustomerNode) => {
    const isSelected = selectedCustomerId === customer.id;

    return (
      <div key={customer.id} className="w-full">
        <div
          className={cn(
            "flex items-center py-3 px-3 cursor-pointer hover:bg-gray-100 rounded transition-colors border-b border-gray-100",
            isSelected && "bg-blue-100 text-blue-800"
          )}
          onClick={() => handleCustomerClick(customer.id)}
        >
          <div className="mr-3">
            <div className="h-4 w-4 flex items-center justify-center">
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className={cn(
              "text-sm font-medium truncate",
              isSelected && "font-semibold"
            )}>
              {customer.node_name}
            </div>
            {customer.description && (
              <div className="text-xs text-gray-500 truncate">
                {customer.description}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
                        Seleccionar Cliente
          </DialogTitle>
            <DialogDescription>
              Elige un cliente de la lista para asignarlo.
            </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col h-[500px]">
          <div className="mb-4 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Buscar clientes por nombre, ID o nivel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                Cargando clientes...
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                {searchTerm ? 'No se encontraron clientes' : 'No hay clientes disponibles'}
              </div>
            ) : (
              <div className="space-y-1">
                {customers.map(customer => renderCustomer(customer))}
              </div>
            )}
          </ScrollArea>
          
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}