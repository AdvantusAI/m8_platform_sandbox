import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SellThroughAnalyticsDashboard } from '@/components/SellThroughAnalyticsDashboard';
import { SellInOutDataEntry } from '@/components/SellInOutDataEntry';
import { BarChart3, Database } from 'lucide-react';

export default function SellThroughAnalytics() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-4xl font-bold">Sell-Through Analytics</h1>
          <p className="text-lg text-muted-foreground">
            Comprehensive sell-in to sell-out performance tracking and analysis
          </p>
        </div>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics Dashboard
          </TabsTrigger>
          <TabsTrigger value="data-entry" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Entry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <SellThroughAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="data-entry">
          <SellInOutDataEntry />
        </TabsContent>
      </Tabs>
    </div>
  );
}