import React from 'react';
import { BarChart3, Play, CheckCircle, Zap, TrendingDown, TrendingUp } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ForecastChart } from '../ForecastChart';
import { useLaunchWizardStore } from '../../stores/launchWizard';
import { useTranslation } from '../../i18n';
import { launchService } from '../../services/launches';
import { Scenario } from '../../types';
import { useToast } from '@/hooks/use-toast';

const scenarioIcons = {
  'base': BarChart3,
  'optimistic': TrendingUp,
  'pessimistic': TrendingDown,
};

const scenarioColors = {
  'base': 'bg-blue-100 text-blue-800 border-blue-200',
  'optimistic': 'bg-green-100 text-green-800 border-green-200',
  'pessimistic': 'bg-orange-100 text-orange-800 border-orange-200',
};

export function ScenariosStep() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { currentDraft, updateDraft } = useLaunchWizardStore();

  const scenarios = currentDraft?.scenarios || [];
  const selectedScenarioId = currentDraft?.selectedScenarioId;

  const simulateMutation = useMutation({
    mutationFn: () => {
      if (!currentDraft) throw new Error('No draft available');
      return launchService.simulate(currentDraft);
    },
    onSuccess: (data) => {
      updateDraft({
        scenarios: data.scenarios,
      });
      toast({
        title: 'Forecasts Generated',
        description: `Generated ${data.scenarios.length} scenario forecasts`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Simulation Failed',
        description: 'Failed to generate forecasts. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSimulate = () => {
    simulateMutation.mutate();
  };

  const handleSelectScenario = (scenarioId: string) => {
    updateDraft({
      selectedScenarioId: scenarioId,
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (num: number, currency = 'MXN') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(num);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">{t('scenarios.title')}</h2>
          <p className="text-muted-foreground">{t('scenarios.subtitle')}</p>
        </div>
        
        <Button
          onClick={handleSimulate}
          disabled={simulateMutation.isPending || !currentDraft}
          size="lg"
          className="gap-2"
        >
          {simulateMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
              {t('scenarios.simulating')}
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              {t('scenarios.simulate')}
            </>
          )}
        </Button>
      </div>

      {simulateMutation.isPending && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
                <span className="font-medium text-blue-900">Generating AI forecasts...</span>
              </div>
              <Progress value={65} className="h-2" />
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Analyzing analog product patterns</p>
                <p>• Processing market inputs and seasonality</p>
                <p>• Calculating cannibalization effects</p>
                <p>• Generating scenario variations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {scenarios.length > 0 && (
        <div className="space-y-6">
          {/* Scenario Cards */}
          <div className="grid lg:grid-cols-3 gap-6">
            {scenarios.map((scenario) => {
              const IconComponent = scenarioIcons[scenario.id as keyof typeof scenarioIcons] || BarChart3;
              const isSelected = selectedScenarioId === scenario.id;
              
              return (
                <Card 
                  key={scenario.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleSelectScenario(scenario.id)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${scenarioColors[scenario.id as keyof typeof scenarioColors]}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-lg">{scenario.name}</CardTitle>
                      </div>
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {scenario.kpis && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-muted-foreground">Total Units</div>
                            <div className="font-semibold">{formatNumber(scenario.kpis.totalUnits)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Revenue</div>
                            <div className="font-semibold">{formatCurrency(scenario.kpis.revenue)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Gross Margin</div>
                            <div className="font-semibold">{formatCurrency(scenario.kpis.grossMargin)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Avg WOS</div>
                            <div className="font-semibold">{scenario.kpis.avgWOS?.toFixed(1) || 'N/A'}</div>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t">
                          <div className="text-sm text-muted-foreground mb-2">Peak Week</div>
                          <div className="text-sm font-medium">
                            {new Date(scenario.kpis.peakWeek).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    )}

                    {isSelected && (
                      <Badge variant="default" className="w-full justify-center">
                        Selected for Review
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Forecast Chart */}
          {scenarios.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t('scenarios.forecast')}
                </CardTitle>
                <CardDescription>
                  Compare weekly demand forecasts across scenarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ForecastChart scenarios={scenarios} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {scenarios.length === 0 && !simulateMutation.isPending && (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <Zap className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Ready to Generate Forecasts</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Click "Generate Forecasts" to create AI-powered demand scenarios based on your analog products and market inputs.
              </p>
              <Button onClick={handleSimulate} size="lg" className="gap-2">
                <Play className="h-5 w-5" />
                {t('scenarios.simulate')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Messages */}
      {scenarios.length > 0 && !selectedScenarioId && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-amber-800">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-sm font-medium">
                Please select a scenario to proceed to review
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}