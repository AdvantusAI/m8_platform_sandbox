import React, { useState } from 'react';
import { DollarSign, Calendar, TrendingUp, Upload, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLaunchWizardStore } from '../../stores/launchWizard';
import { useTranslation } from '../../i18n';
import { MarketInputs, PromoWeek, RolloutWeek } from '../../types';

export function MarketStep() {
  const { t } = useTranslation();
  const { currentDraft, updateDraft } = useLaunchWizardStore();
  const [newPromoWeek, setNewPromoWeek] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState(10);
  const [newRolloutWeek, setNewRolloutWeek] = useState('');
  const [newRolloutAcv, setNewRolloutAcv] = useState(10);

  const marketInputs = currentDraft?.market || {
    price: 0,
    currency: 'MXN',
    distribution: { weeks: [] },
    promoCalendar: [],
  };

  const handleInputChange = (field: keyof MarketInputs, value: any) => {
    updateDraft({
      market: {
        ...marketInputs,
        [field]: value,
      },
    });
  };

  const handleAddPromo = () => {
    if (!newPromoWeek) return;

    const newPromo: PromoWeek = {
      week: newPromoWeek,
      discountPct: newPromoDiscount,
    };

    handleInputChange('promoCalendar', [
      ...(marketInputs.promoCalendar || []),
      newPromo,
    ]);

    setNewPromoWeek('');
    setNewPromoDiscount(10);
  };

  const handleRemovePromo = (week: string) => {
    handleInputChange('promoCalendar', 
      marketInputs.promoCalendar?.filter(p => p.week !== week) || []
    );
  };

  const handleAddRollout = () => {
    if (!newRolloutWeek) return;

    const newRollout: RolloutWeek = {
      week: newRolloutWeek,
      acvPct: newRolloutAcv,
    };

    handleInputChange('distribution', {
      weeks: [
        ...marketInputs.distribution.weeks,
        newRollout,
      ],
    });

    setNewRolloutWeek('');
    setNewRolloutAcv(10);
  };

  const handleRemoveRollout = (week: string) => {
    handleInputChange('distribution', {
      weeks: marketInputs.distribution.weeks.filter(r => r.week !== week),
    });
  };

  const totalAcv = marketInputs.distribution.weeks.reduce((sum, week) => sum + week.acvPct, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t('market.title')}</h2>
        <p className="text-muted-foreground">{t('market.subtitle')}</p>
      </div>

      <Tabs defaultValue="pricing" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pricing">Pricing & Marketing</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
        </TabsList>

        {/* Pricing & Marketing */}
        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing & Marketing
              </CardTitle>
              <CardDescription>
                Set launch price and marketing investment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">{t('market.price')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={marketInputs.price || ''}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                    <Select
                      value={marketInputs.currency}
                      onValueChange={(value) => handleInputChange('currency', value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MXN">MXN</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marketing">{t('market.marketing')}</Label>
                  <Input
                    id="marketing"
                    type="number"
                    value={marketInputs.marketingGRPs || ''}
                    onChange={(e) => handleInputChange('marketingGRPs', parseInt(e.target.value) || 0)}
                    placeholder={t('market.marketing.placeholder')}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="seasonality">{t('market.seasonality')}</Label>
                  <Select
                    value={marketInputs.seasonalityCurveId || ''}
                    onValueChange={(value) => handleInputChange('seasonalityCurveId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('market.seasonality.placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="category">Category Default</SelectItem>
                      <SelectItem value="brand">Brand Pattern</SelectItem>
                      <SelectItem value="flat">Flat (No Seasonality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution */}
        <TabsContent value="distribution" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {t('market.distribution')}
                </div>
                <Badge variant={totalAcv <= 100 ? "default" : "destructive"}>
                  Total ACV: {totalAcv}%
                </Badge>
              </CardTitle>
              <CardDescription>
                Plan your distribution build-up by week
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new rollout week */}
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newRolloutWeek}
                  onChange={(e) => setNewRolloutWeek(e.target.value)}
                  className="flex-1"
                />
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm">ACV:</span>
                  <Slider
                    value={[newRolloutAcv]}
                    onValueChange={([value]) => setNewRolloutAcv(value)}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-sm w-12">{newRolloutAcv}%</span>
                </div>
                <Button onClick={handleAddRollout} disabled={!newRolloutWeek}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Distribution timeline */}
              <div className="space-y-2 max-h-64 overflow-auto">
                {marketInputs.distribution.weeks
                  .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
                  .map((rollout) => (
                    <div
                      key={rollout.week}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">
                          {new Date(rollout.week).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Week of {new Date(rollout.week).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">
                          {rollout.acvPct}% ACV
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveRollout(rollout.week)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>

              {marketInputs.distribution.weeks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No distribution plan yet</p>
                  <p className="text-sm">Add weeks to build your rollout timeline</p>
                </div>
              )}

              {/* Upload option */}
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">{t('market.uploadACV')}</p>
                  <p className="text-xs text-muted-foreground">
                    Upload CSV with weekly ACV data
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Choose File
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promotions */}
        <TabsContent value="promotions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('market.promos')}
              </CardTitle>
              <CardDescription>
                Schedule promotional activities and discounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new promotion */}
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newPromoWeek}
                  onChange={(e) => setNewPromoWeek(e.target.value)}
                  className="flex-1"
                />
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm">Discount:</span>
                  <Slider
                    value={[newPromoDiscount]}
                    onValueChange={([value]) => setNewPromoDiscount(value)}
                    max={50}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-sm w-12">{newPromoDiscount}%</span>
                </div>
                <Button onClick={handleAddPromo} disabled={!newPromoWeek}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Promotions list */}
              <div className="space-y-2 max-h-64 overflow-auto">
                {(marketInputs.promoCalendar || [])
                  .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
                  .map((promo) => (
                    <div
                      key={promo.week}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">
                          {new Date(promo.week).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Promotional week
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">
                          {promo.discountPct}% off
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemovePromo(promo.week)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>

              {(!marketInputs.promoCalendar || marketInputs.promoCalendar.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No promotions scheduled</p>
                  <p className="text-sm">Add promotional weeks to boost demand</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}