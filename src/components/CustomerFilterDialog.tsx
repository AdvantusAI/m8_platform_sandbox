import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Check } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);

  useEffect(() => {
    if (open) {
      fetchCustomers();
    }
  }, [open]);

const fetchCustomers = async () => {
  setLoading(true);
  try {
    const { data, error } = await supabase.rpc('get_locations_hierarchy');

    if (error) throw error;

    const transformed: CustomerItem[] = (data ?? []).map((row: any) => ({
      customer_id: row.node_id ?? row.id ?? String(row.node_code ?? ''),
      customer_code: row.node_code ?? String(row.node_id ?? row.id ?? ''),
      description: row.node_name ?? 'Customer',
      status: 'active',
    }));

    setCustomers(transformed);               // ← actually set the state
  } catch (err) {
    console.error('Error fetching customers from v_customer_nodes:', err);
    setCustomers([]);                        // fail safe
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
      <DialogContent className="max-w-md h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Customer</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-1">
                {customers.map((customer) => (
                  <div
                    key={customer.customer_id}
                    className={`
                      flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
                      ${
                        isSelected(customer)
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted"
                      }
                    `}
                    onClick={() => handleSelection(customer)}
                  >
                    <div className="w-4 h-4 flex items-center justify-center">
                      {isSelected(customer) ? (
                        <Check className="h-3 w-3 text-primary" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        {customer.description} - {customer.customer_code}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => onCustomerSelect(null)}
                className="flex-1"
              >
                Clear Selection
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};