import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { SUPABASE_SCHEMA } from "@/constants/supabaseSchema";


export interface CustomerItem {
  customer_id: string;
  customer_code: string;
  description: string;
  status: string;
}

interface CustomerFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerSelect: (customer: CustomerItem | null) => void;
  selectedCustomer: CustomerItem | null;
}

export const CustomerFilterDialog = ({
  open,
  onOpenChange,
  onCustomerSelect,
  selectedCustomer,
}: CustomerFilterDialogProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);

  useEffect(() => {
    if (open) {
      fetchCustomers();
    }
  }, [open, searchTerm]);

const fetchCustomers = async () => {
  setLoading(true);
  try {
    let query = (supabase as any)
      .schema('m8_schema')
      .from('v_customer_node')
      .select('customer_id, customer_code, description, status')
      .eq('status', 'active')
      .order('description');

    // Add search filter if searchTerm is provided
    if (searchTerm) {
      query = query.or(`customer_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query;
    
    if (error) throw error;

    setCustomers(data || []);
  } catch (err) {
    console.error('Error fetching customers from v_customer_node:', err);
    setCustomers([]);
  } finally {
    setLoading(false);
  }
};

  const handleSelection = (customer: CustomerItem) => {
    onCustomerSelect(customer);
  };

  const isSelected = (customer: CustomerItem) => {
    return selectedCustomer?.customer_code === customer.customer_code;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Customer</DialogTitle>
          <DialogDescription>
            Choose a customer from the list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">cargando clientes...</span>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-1 p-2">
                  {customers.map((customer) => {
                    const selected = isSelected(customer);
                    return (
                      <div
                        key={customer.customer_id}
                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent/50 ${
                          selected ? 'bg-accent text-accent-foreground' : ''
                        }`}
                        onClick={() => handleSelection(customer)}
                      >
                        {selected ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium">{customer.description}</div>
                          <div className="text-xs text-muted-foreground">{customer.customer_code}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  onCustomerSelect(null);
                  onOpenChange(false);
                }}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};