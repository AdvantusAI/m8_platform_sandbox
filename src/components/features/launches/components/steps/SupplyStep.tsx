import React from 'react';
import { Package, Clock, AlertTriangle, CheckCircle, Truck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useLaunchWizardStore } from '../../stores/launchWizard';
import { useTranslation } from '../../i18n';
import { launchService } from '../../services/launches';

export function SupplyStep() {
  const { t } = useTranslation();
  const { currentDraft } = useLaunchWizardStore();

  // Mock product ID for supply signals - in real app this would come from product selection
  const productId = currentDraft?.basics.name ? 'mock_product_id' : '';

  const { data: supplySignals, isLoading } = useQuery({
    queryKey: ['supply-signals', productId],
    queryFn: () => launchService.getSupplySignals(productId),
    enabled: !!productId,
  });

  const launchDate = currentDraft?.basics.launchDate ? new Date(currentDraft.basics.launchDate) : null;
  const leadTimeDate = supplySignals ? new Date(Date.now() + supplySignals.leadTimeDays * 24 * 60 * 60 * 1000) : null;
  const isLeadTimeWarning = launchDate && leadTimeDate && launchDate < leadTimeDate;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t('supply.title')}</h2>
        <p className="text-muted-foreground">{t('supply.subtitle')}</p>
      </div>

      {/* Warnings */}
      {isLeadTimeWarning && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {t('supply.warning.leadTime')}. Current lead time requires production to start by{' '}
            {leadTimeDate?.toLocaleDateString()}.
          </AlertDescription>
        </Alert>
      )}

      {supplySignals?.capacityFlag && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {t('supply.warning.capacity')}. Contact supply planning team for mitigation.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Lead Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('supply.leadTime')}
            </CardTitle>
            <CardDescription>
              Time required from order to delivery
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="text-3xl font-bold">
                  {supplySignals?.leadTimeDays || 0}
                </div>
                <div className="text-sm text-muted-foreground">days</div>
                {leadTimeDate && (
                  <div className="text-sm">
                    Start production by: {leadTimeDate.toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* MOQ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t('supply.moq')}
            </CardTitle>
            <CardDescription>
              Minimum order quantity required
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="text-3xl font-bold">
                  {formatNumber(supplySignals?.moq || 0)}
                </div>
                <div className="text-sm text-muted-foreground">units</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Inventory */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {t('supply.onHand')}
            </CardTitle>
            <CardDescription>
              Current inventory levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="text-3xl font-bold">
                  {formatNumber(supplySignals?.onHand || 0)}
                </div>
                <div className="text-sm text-muted-foreground">units</div>
                <Badge variant={supplySignals?.onHand === 0 ? "secondary" : "default"}>
                  {supplySignals?.onHand === 0 ? 'New Product' : 'In Stock'}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Supplier Capacity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('supply.capacity')}
          </CardTitle>
          <CardDescription>
            Supplier production capacity status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-6 w-32" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {supplySignals?.capacityFlag ? (
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              ) : (
                <CheckCircle className="h-8 w-8 text-green-500" />
              )}
              <div>
                <div className="font-semibold">
                  {supplySignals?.capacityFlag 
                    ? t('supply.capacity.constrained')
                    : t('supply.capacity.ok')
                  }
                </div>
                <div className="text-sm text-muted-foreground">
                  {supplySignals?.capacityFlag
                    ? 'Additional planning required for launch volumes'
                    : 'Sufficient capacity available for planned launch'
                  }
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Supply Readiness Summary</CardTitle>
          <CardDescription>
            Overall assessment of supply chain readiness for launch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span>Lead Time Compliance</span>
              <Badge variant={isLeadTimeWarning ? "destructive" : "default"}>
                {isLeadTimeWarning ? 'At Risk' : 'On Track'}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span>Supplier Capacity</span>
              <Badge variant={supplySignals?.capacityFlag ? "destructive" : "default"}>
                {supplySignals?.capacityFlag ? 'Constrained' : 'Available'}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span>Overall Readiness</span>
              <Badge variant={isLeadTimeWarning || supplySignals?.capacityFlag ? "destructive" : "default"}>
                {isLeadTimeWarning || supplySignals?.capacityFlag ? 'Needs Attention' : 'Ready'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}