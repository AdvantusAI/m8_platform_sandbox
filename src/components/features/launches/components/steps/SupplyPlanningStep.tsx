import React, { useState, useEffect } from 'react';
import { Package, Clock, AlertTriangle, CheckCircle, Truck, TrendingUp, ArrowRight, Calculator } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useLaunchWizardStore } from '../../stores/launchWizard';
import { useTranslation } from '../../i18n';
import { launchService } from '../../services/launches';
import { supabase } from '@/integrations/supabase/client';
import { SupplyPlan, ReplacedProduct, ProductionBatch } from '../../types';

interface ProductOption {
  product_id: string;
  product_name: string;
  current_inventory: number;
  category_name?: string;
}

export function SupplyPlanningStep() {
  const { t } = useTranslation();
  const { currentDraft, updateDraft } = useLaunchWizardStore();
  const [selectedScenario, setSelectedScenario] = useState<'new_product' | 'product_replacement'>(
    currentDraft?.supplyPlan?.scenario || 'new_product'
  );
  const [selectedReplacedProduct, setSelectedReplacedProduct] = useState<string>('');
  const [overlapWeeks, setOverlapWeeks] = useState(4);
  const [isCalculating, setIsCalculating] = useState(false);

  // Get selected scenario forecast for supply calculation
  const selectedScenarioData = currentDraft?.scenarios.find(s => s.id === currentDraft.selectedScenarioId);
  const demandForecast = selectedScenarioData?.forecast || [];
  const totalDemand = demandForecast.reduce((sum, point) => sum + point.value, 0);

  // Mock product ID for supply signals
  const productId = currentDraft?.basics.name ? 'mock_product_id' : '';

  const { data: supplySignals, isLoading: loadingSignals } = useQuery({
    queryKey: ['supply-signals', productId],
    queryFn: () => launchService.getSupplySignals(productId),
    enabled: !!productId,
  });

  // Fetch available products for replacement scenario
  const { data: availableProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products-for-replacement'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_products_hierarchy');
      
      if (error) throw error;
      
      return data?.map(p => ({
        product_id: p.product_id,
        product_name: p.product_name,
        current_inventory: Math.floor(Math.random() * 50000), // Mock inventory
        category_name: p.category_name,
      })) || [];
    },
    enabled: selectedScenario === 'product_replacement',
  });

  // Get inventory for replaced product
  const { data: replacedProductInventory, isLoading: loadingInventory } = useQuery({
    queryKey: ['inventory', selectedReplacedProduct],
    queryFn: async () => {
      if (!selectedReplacedProduct) return null;
      
      const { data, error } = await supabase.rpc('get_inventory_on_hand_latest', {
        p_product_id: selectedReplacedProduct
      });
      
      if (error) throw error;
      return data?.[0]?.on_hand_units || 0;
    },
    enabled: !!selectedReplacedProduct && selectedScenario === 'product_replacement',
  });

  // Calculate supply plan
  const calculateSupplyPlan = async () => {
    if (!currentDraft || !supplySignals) return;

    setIsCalculating(true);

    try {
      const launchDate = new Date(currentDraft.basics.launchDate);
      const leadTimeDays = supplySignals.leadTimeDays;
      const moq = supplySignals.moq;

      let supplyPlan: SupplyPlan;

      if (selectedScenario === 'new_product') {
        // Scenario 1: New product, no replacement
        const totalNeeded = Math.max(totalDemand, moq);
        const batches = calculateProductionBatches(totalNeeded, moq, launchDate, leadTimeDays);

        supplyPlan = {
          scenario: 'new_product',
          demandForecast,
          supplyRecommendation: {
            totalQuantityNeeded: totalNeeded,
            productionSchedule: batches,
            warnings: generateWarnings(batches, launchDate, supplySignals),
          },
          riskAssessment: {
            overallRisk: supplySignals.capacityFlag ? 'high' : 'low',
            risks: assessRisks(supplySignals, batches, launchDate),
          },
        };
      } else {
        // Scenario 2: Product replacement with existing inventory
        const availableInventory = replacedProductInventory || 0;
        const netDemand = Math.max(0, totalDemand - availableInventory);
        const totalNeeded = Math.max(netDemand, netDemand > 0 ? moq : 0);
        const batches = totalNeeded > 0 ? calculateProductionBatches(totalNeeded, moq, launchDate, leadTimeDays) : [];

        const replacedProduct: ReplacedProduct = {
          productId: selectedReplacedProduct,
          name: availableProducts.find(p => p.product_id === selectedReplacedProduct)?.product_name || '',
          currentInventory: availableInventory,
          plannedPhaseOutDate: new Date(launchDate.getTime() + overlapWeeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          transitionPlan: {
            overlapWeeks,
            inventoryTransfer: availableInventory > 0,
            salesDown: generatePhaseOutPlan(availableInventory, overlapWeeks),
          },
        };

        supplyPlan = {
          scenario: 'product_replacement',
          replacedProduct,
          demandForecast,
          supplyRecommendation: {
            totalQuantityNeeded: totalNeeded,
            productionSchedule: batches,
            inventoryUtilization: {
              availableFromReplaced: availableInventory,
              utilizationPct: Math.min(100, (availableInventory / totalDemand) * 100),
              avoidedOverstock: Math.min(availableInventory, totalDemand),
              transferCost: availableInventory * 0.5, // Mock transfer cost
            },
            warnings: generateReplacementWarnings(availableInventory, totalDemand, batches, launchDate),
          },
          riskAssessment: {
            overallRisk: assessOverallRisk(supplySignals, availableInventory, totalDemand),
            risks: assessReplacementRisks(supplySignals, availableInventory, totalDemand, batches, launchDate),
          },
        };
      }

      updateDraft({ supplyPlan });
    } finally {
      setIsCalculating(false);
    }
  };

  // Helper functions
  const calculateProductionBatches = (totalNeeded: number, moq: number, launchDate: Date, leadTimeDays: number): ProductionBatch[] => {
    const batches: ProductionBatch[] = [];
    let remaining = totalNeeded;
    let batchNumber = 1;

    while (remaining > 0) {
      const batchSize = Math.min(remaining, Math.max(moq, remaining));
      const productionStart = new Date(launchDate.getTime() - leadTimeDays * 24 * 60 * 60 * 1000);
      productionStart.setDate(productionStart.getDate() - (batchNumber - 1) * 14); // Stagger batches

      batches.push({
        batchNumber,
        quantity: batchSize,
        productionStartDate: productionStart.toISOString().split('T')[0],
        deliveryDate: new Date(productionStart.getTime() + leadTimeDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        cost: batchSize * 2.5, // Mock cost
      });

      remaining -= batchSize;
      batchNumber++;
    }

    return batches;
  };

  const generatePhaseOutPlan = (inventory: number, weeks: number) => {
    const plan = [];
    const weeklyReduction = inventory / weeks;
    
    for (let i = 0; i < weeks; i++) {
      plan.push({
        date: new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: Math.max(0, inventory - (i + 1) * weeklyReduction),
      });
    }
    
    return plan;
  };

  const generateWarnings = (batches: ProductionBatch[], launchDate: Date, signals: any) => {
    const warnings = [];
    
    if (signals.capacityFlag) {
      warnings.push('Supplier capacity constraints detected. Consider alternative suppliers or adjusted timeline.');
    }
    
    if (batches.some(b => new Date(b.productionStartDate) < new Date())) {
      warnings.push('Production start date is in the past. Review launch timeline.');
    }
    
    return warnings;
  };

  const generateReplacementWarnings = (inventory: number, demand: number, batches: ProductionBatch[], launchDate: Date) => {
    const warnings = [];
    
    if (inventory > demand * 1.5) {
      warnings.push('Existing inventory significantly exceeds demand. Consider extended phase-out period.');
    }
    
    if (inventory < demand * 0.1) {
      warnings.push('Limited existing inventory available. Minimal cost savings from replacement scenario.');
    }
    
    return warnings;
  };

  const assessRisks = (signals: any, batches: ProductionBatch[], launchDate: Date) => {
    const risks = [];
    
    if (signals.capacityFlag) {
      risks.push({
        type: 'capacity' as const,
        severity: 'high' as const,
        description: 'Supplier capacity constraints may delay production',
        mitigation: 'Secure backup supplier or adjust launch timeline',
      });
    }
    
    return risks;
  };

  const assessReplacementRisks = (signals: any, inventory: number, demand: number, batches: ProductionBatch[], launchDate: Date) => {
    const risks = [];
    
    if (inventory > demand) {
      risks.push({
        type: 'inventory' as const,
        severity: 'medium' as const,
        description: 'Risk of overstock with existing inventory',
        mitigation: 'Implement gradual phase-out strategy',
      });
    }
    
    return risks;
  };

  const assessOverallRisk = (signals: any, inventory: number, demand: number) => {
    if (signals.capacityFlag || inventory > demand * 2) return 'high';
    if (inventory > demand * 1.2) return 'medium';
    return 'low';
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);
  const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t('supply.planning.title')}</h2>
        <p className="text-muted-foreground">{t('supply.planning.subtitle')}</p>
      </div>

      {/* Scenario Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Supply Planning Scenario
          </CardTitle>
          <CardDescription>
            Select the appropriate scenario for your product launch
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card 
              className={`cursor-pointer transition-all ${selectedScenario === 'new_product' ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
              onClick={() => setSelectedScenario('new_product')}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 mt-1 ${selectedScenario === 'new_product' ? 'bg-primary border-primary' : 'border-muted-foreground'}`} />
                  <div>
                    <h4 className="font-semibold">New Product Launch</h4>
                    <p className="text-sm text-muted-foreground">
                      No existing product will be replaced. Calculate supply needs normally.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${selectedScenario === 'product_replacement' ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
              onClick={() => setSelectedScenario('product_replacement')}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 mt-1 ${selectedScenario === 'product_replacement' ? 'bg-primary border-primary' : 'border-muted-foreground'}`} />
                  <div>
                    <h4 className="font-semibold">Product Replacement</h4>
                    <p className="text-sm text-muted-foreground">
                      NPI will replace an existing product with inventory. Optimize for smooth transition.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Replacement Product Selection */}
      {selectedScenario === 'product_replacement' && (
        <Card>
          <CardHeader>
            <CardTitle>Product to Replace</CardTitle>
            <CardDescription>
              Select the existing product that will be replaced by this NPI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="replaced-product">Product</Label>
                <Select value={selectedReplacedProduct} onValueChange={setSelectedReplacedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product to replace..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map(product => (
                      <SelectItem key={product.product_id} value={product.product_id}>
                        {product.product_name} ({formatNumber(product.current_inventory)} units)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="overlap-weeks">Transition Period (weeks)</Label>
                <Input
                  id="overlap-weeks"
                  type="number"
                  value={overlapWeeks}
                  onChange={(e) => setOverlapWeeks(Number(e.target.value))}
                  min={1}
                  max={12}
                />
              </div>
            </div>

            {selectedReplacedProduct && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  Current inventory: <strong>{formatNumber(replacedProductInventory || 0)} units</strong>
                  {replacedProductInventory && totalDemand ? (
                    <>
                      {' • '}Covers <strong>{Math.round((replacedProductInventory / totalDemand) * 100)}%</strong> of demand
                    </>
                  ) : null}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calculate Supply Plan */}
      <div className="flex justify-center">
        <Button
          onClick={calculateSupplyPlan}
          disabled={isCalculating || loadingSignals || (selectedScenario === 'product_replacement' && !selectedReplacedProduct)}
          size="lg"
        >
          {isCalculating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
              Calculating...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4 mr-2" />
              Calculate Supply Plan
            </>
          )}
        </Button>
      </div>

      {/* Supply Plan Results */}
      {currentDraft?.supplyPlan && (
        <div className="space-y-6">
          <Separator />
          
          {/* Supply Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Supply Plan Summary</CardTitle>
              <CardDescription>
                Optimized supply recommendation for {selectedScenario === 'new_product' ? 'new product launch' : 'product replacement'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {formatNumber(currentDraft.supplyPlan.supplyRecommendation.totalQuantityNeeded)}
                  </div>
                  <div className="text-sm text-muted-foreground">Units to Produce</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {currentDraft.supplyPlan.supplyRecommendation.productionSchedule.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Production Batches</div>
                </div>
                
                {currentDraft.supplyPlan.supplyRecommendation.inventoryUtilization && (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {Math.round(currentDraft.supplyPlan.supplyRecommendation.inventoryUtilization.utilizationPct)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Inventory Utilized</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className={`h-5 w-5 ${
                  currentDraft.supplyPlan.riskAssessment.overallRisk === 'high' ? 'text-red-500' : 
                  currentDraft.supplyPlan.riskAssessment.overallRisk === 'medium' ? 'text-amber-500' : 
                  'text-green-500'
                }`} />
                Risk Assessment
                <Badge variant={
                  currentDraft.supplyPlan.riskAssessment.overallRisk === 'high' ? 'destructive' : 
                  currentDraft.supplyPlan.riskAssessment.overallRisk === 'medium' ? 'secondary' : 
                  'default'
                }>
                  {currentDraft.supplyPlan.riskAssessment.overallRisk.toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentDraft.supplyPlan.riskAssessment.risks.length > 0 ? (
                <div className="space-y-3">
                  {currentDraft.supplyPlan.riskAssessment.risks.map((risk, index) => (
                    <div key={index} className="border-l-4 border-amber-500 pl-4">
                      <div className="font-semibold">{risk.description}</div>
                      <div className="text-sm text-muted-foreground">
                        <strong>Mitigation:</strong> {risk.mitigation}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  No significant risks identified
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warnings */}
          {currentDraft.supplyPlan.supplyRecommendation.warnings.length > 0 && (
            <div className="space-y-2">
              {currentDraft.supplyPlan.supplyRecommendation.warnings.map((warning, index) => (
                <Alert key={index} className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">{warning}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}