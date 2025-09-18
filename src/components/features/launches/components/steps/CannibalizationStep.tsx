import React, { useState } from 'react';
import { Search, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLaunchWizardStore } from '../../stores/launchWizard';
import { useTranslation } from '../../i18n';
import { launchService } from '../../services/launches';
import { AnalogProduct } from '../../types';

export function CannibalizationStep() {
  const { t } = useTranslation();
  const { currentDraft, updateDraft } = useLaunchWizardStore();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['cannibalization-products', searchQuery],
    queryFn: () => launchService.searchAnalogs(searchQuery),
    enabled: searchQuery.length > 2,
  });

  const cannibalization = currentDraft?.cannibalization || { impactedSkus: [] };
  const totalImpact = cannibalization.impactedSkus.reduce((sum, sku) => sum + sku.cannibalizationPct, 0);

  const handleAddProduct = (product: AnalogProduct) => {
    if (cannibalization.impactedSkus.find(s => s.productId === product.productId)) {
      return; // Already selected
    }

    const newImpactedSku = {
      productId: product.productId,
      name: product.name,
      cannibalizationPct: 10,
    };

    updateDraft({
      cannibalization: {
        impactedSkus: [...cannibalization.impactedSkus, newImpactedSku],
      },
    });
  };

  const handleRemoveProduct = (productId: string) => {
    updateDraft({
      cannibalization: {
        impactedSkus: cannibalization.impactedSkus.filter(s => s.productId !== productId),
      },
    });
  };

  const handleRateChange = (productId: string, rate: number) => {
    updateDraft({
      cannibalization: {
        impactedSkus: cannibalization.impactedSkus.map(sku =>
          sku.productId === productId
            ? { ...sku, cannibalizationPct: rate }
            : sku
        ),
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t('cannibalization.title')}</h2>
        <p className="text-muted-foreground">{t('cannibalization.subtitle')}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Search & Add Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              {t('cannibalization.search')}
            </CardTitle>
            <CardDescription>
              Find products that may lose sales to your new launch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or category"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-auto">
              {isLoading && (
                <>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-8 w-16" />
                    </div>
                  ))}
                </>
              )}

              {searchResults?.items.map((product) => {
                const isSelected = cannibalization.impactedSkus.find(s => s.productId === product.productId);
                
                return (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {product.category} • ${product.price}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isSelected ? "secondary" : "default"}
                      onClick={() => handleAddProduct(product)}
                      disabled={!!isSelected}
                    >
                      {isSelected ? 'Selected' : (
                        <>
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}

              {searchQuery.length > 2 && !isLoading && (!searchResults?.items.length) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No products found</p>
                </div>
              )}

              {searchQuery.length <= 2 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Type at least 3 characters to search</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Impacted Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {t('cannibalization.impacted')}
              </div>
              <Badge 
                variant={totalImpact <= 50 ? "default" : "destructive"}
                className="text-xs"
              >
                {t('cannibalization.total', { total: totalImpact })}
              </Badge>
            </CardTitle>
            <CardDescription>
              Set cannibalization rates for impacted products
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4 max-h-96 overflow-auto">
              {cannibalization.impactedSkus.map((sku) => (
                <div
                  key={sku.productId}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{sku.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Cannibalization: {sku.cannibalizationPct}%
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveProduct(sku.productId)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Slider
                      value={[sku.cannibalizationPct]}
                      onValueChange={([value]) => handleRateChange(sku.productId, value)}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {cannibalization.impactedSkus.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No products selected</p>
                <p className="text-sm">Search and add products that may be cannibalized</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Information Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">
                Cannibalization Analysis
              </p>
              <p className="text-sm text-blue-800">
                Cannibalization represents the percentage of an existing product's sales that will be lost to your new launch. 
                This is optional but helps create more accurate forecasts by accounting for substitution effects.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}