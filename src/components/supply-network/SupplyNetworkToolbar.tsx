import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, RefreshCw, Download, Upload, Settings, Network } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AddNodeForm } from './AddNodeForm';
import { RelationshipForm } from './RelationshipForm';
import { toast } from 'sonner';

export const SupplyNetworkToolbar: React.FC = () => {
    


  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Card className="absolute top-4 left-4 z-10 p-2">
      <div className="flex items-center gap-2">
      

       
      
      
      </div>
    </Card>
  );
};