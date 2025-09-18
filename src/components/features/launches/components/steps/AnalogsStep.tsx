import React, { useState } from 'react';
import { Search, Plus, Trash2, BarChart3 } from 'lucide-react';
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
import { AnalogProduct, AnalogSelection } from '../../types';

export function AnalogsStep() {
  const { t } = useTranslation();
  const { currentDraft, updateDraft } = useLaunchWizardStore();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['analogs', searchQuery],
    queryFn: () => launchService.searchAnalogs(searchQuery),
    enabled: searchQuery.length > 2,
  });

  const selectedAnalogs = currentDraft?.analogs || [];
  const totalWeight = selectedAnalogs.reduce((sum, analog) => sum + analog.weight, 0);

  const handleAddAnalog = (product: AnalogProduct) => {
    if (selectedAnalogs.find(a => a.productId === product.productId)) {
      return; // Already selected
    }

    const newAnalog: AnalogSelection = {
      productId: product.productId,
      name: product.name,
      weight: 0,
    };

    updateDraft({
      analogs: [...selectedAnalogs, newAnalog],
    });
  };

  const handleRemoveAnalog = (productId: string) => {
    updateDraft({
      analogs: selectedAnalogs.filter(a => a.productId !== productId),
    });
  };

  const handleWeightChange = (productId: string, weight: number) => {
    updateDraft({
      analogs: selectedAnalogs.map(analog =>
        analog.productId === productId
          ? { ...analog, weight }
          : analog
      ),
    });
  };

  const handleNormalizeWeights = () => {
    if (selectedAnalogs.length === 0) return;

    const equalWeight = Math.round(100 / selectedAnalogs.length);
    let remainingWeight = 100;

    const normalizedAnalogs = selectedAnalogs.map((analog, index) => {
      const weight = index === selectedAnalogs.length - 1 
        ? remainingWeight 
        : equalWeight;
      remainingWeight -= weight;
      
      return { ...analog, weight };
    });

    updateDraft({
      analogs: normalizedAnalogs,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t('analogs.title')}</h2>
        <p className="text-muted-foreground">{t('analogs.subtitle')}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Search & Add Analogs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              {t('analogs.search')}
            </CardTitle>
            <CardDescription>
              Search for similar products to use as analogs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('analogs.search.placeholder')}
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
                const isSelected = selectedAnalogs.find(a => a.productId === product.productId);
                
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
                      onClick={() => handleAddAnalog(product)}
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
                  <p>{t('analogs.noResults')}</p>
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

        {/* Selected Analogs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t('analogs.selected')}
              </div>
              <Badge 
                variant={totalWeight === 100 ? "default" : "destructive"}
                className="text-xs"
              >
                {t('analogs.totalWeight', { weight: totalWeight })}
              </Badge>
            </CardTitle>
            <CardDescription>
              Configure weights for selected analog products
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedAnalogs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNormalizeWeights}
                className="w-full"
              >
                {t('analogs.normalize')}
              </Button>
            )}

            <div className="space-y-4 max-h-96 overflow-auto">
              {selectedAnalogs.map((analog) => (
                <div
                  key={analog.productId}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{analog.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Weight: {analog.weight}%
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveAnalog(analog.productId)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Slider
                      value={[analog.weight]}
                      onValueChange={([value]) => handleWeightChange(analog.productId, value)}
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

            {selectedAnalogs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No analogs selected yet</p>
                <p className="text-sm">Search and add products to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Validation Messages */}
      {selectedAnalogs.length > 0 && totalWeight !== 100 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-amber-800">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-sm font-medium">
                Analog weights must sum to 100%. Current total: {totalWeight}%
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}