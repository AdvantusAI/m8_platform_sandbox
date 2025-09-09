import React, { useState, useEffect } from 'react';
import { Search, Users, X, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

interface CustomerNode {
  customer_id: string;
  customer_code: string;
  description: string;
  status?: string;
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
      //////console.log('Fetching customers...');
      
      if (!user) {
        setCustomers([]);
        return;
      }

      // Fetch customer nodes from supply_network_nodes where node_type_id corresponds to CUSTOMERS type
      let query = (supabase as any)
        .schema('m8_schema')
        .from('v_customer_node')
        .select(`*`)
        .eq('status', 'active')
        .order('description');

      if (searchTerm) {
        query = query.or(`customer_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      ////////console.log('Customers data:', data);
      
      const customerNodes: CustomerNode[] = (data || []).map(customer => ({
        customer_id: customer.customer_id,
        customer_code: customer.customer_code,
        description: customer.description,
        status: customer.status
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
    const isSelected = selectedCustomerId === customer.customer_code;

    return (
      <div key={customer.customer_code} 
          className="flex items-center p-2 hover:bg-gray-50 cursor-pointer text-sm"
          onClick={() => handleCustomerClick(customer.customer_code)}
          
        >
          <ShoppingCart className="h-4 w-4 mr-2 text-orange-500" />

          <span className="flex-1">{customer.description}</span>
                    <div className="ml-2 flex gap-1">
                    <Badge variant="outline" className="ml-2 text-xs bg-orange-50 text-orange-700 border-orange-200">
                     {customer.customer_code}
                    </Badge>
                    </div>
                  </div>

    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center  gap-2">
          <ShoppingCart className="h-5 w-5" />
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
              <div className="flex items-center justify-center p-8">
                <div className="text-sm text-muted-foreground">Cargando clientes...</div>
              </div>
            ) : customers.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <Users className="text-sm text-muted-foreground" />
                {searchTerm ? 'No se encontraron clientes' : 'No hay clientes disponibles'}
              </div>
            ) : (
              <div className="p-2">
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