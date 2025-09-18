import React, { useState } from 'react';
import { FileText, Users, Download, Send, CheckCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useLaunchWizardStore } from '../../stores/launchWizard';
import { useTranslation } from '../../i18n';
import { useUserRole } from '../../hooks/useUserRole';
import { launchService } from '../../services/launches';
import { ForecastChart } from '../ForecastChart';
import { ApproversSection } from './ApproversSection';
import { supabase } from '@/integrations/supabase/client';

export function ReviewStep() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isAdmin, isPlanner } = useUserRole();
  const { currentDraft } = useLaunchWizardStore();
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const selectedScenario = currentDraft?.scenarios.find(s => s.id === currentDraft.selectedScenarioId);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!currentDraft) throw new Error('No draft available');
      
      // Create approval records when submitting
      await supabase.schema('m8_schema').rpc('create_launch_approvals', {
        p_launch_id: currentDraft.id
      });
      
      return launchService.submit(currentDraft.id);
    },
    onSuccess: () => {
      toast({
        title: 'Submitted for Approval',
        description: 'Your launch plan has been submitted for review.',
      });
      queryClient.invalidateQueries({ queryKey: ['launch-approvals', currentDraft?.id] });
    },
    onError: () => {
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit launch plan. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => {
      if (!currentDraft) throw new Error('No draft available');
      return launchService.approve(currentDraft.id);
    },
    onSuccess: () => {
      toast({
        title: 'Launch Approved',
        description: 'The launch plan has been approved.',
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => {
      if (!currentDraft) throw new Error('No draft available');
      return launchService.publish(currentDraft.id);
    },
    onSuccess: (data) => {
      toast({
        title: 'Launch Published',
        description: `Forecast job created: ${data.forecastJobId}`,
      });
    },
  });

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (num: number, currency = 'MXN') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(num);
  };

  if (!currentDraft) {
    return <div>No draft available</div>;
  }

  const status = currentDraft.status;
  const canSubmit = status === 'draft' && isPlanner;
  const canApprove = status === 'in_review' && isAdmin;
  const canPublish = status === 'approved' && isAdmin;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">{t('review.title')}</h2>
          <p className="text-muted-foreground">{t('review.subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {t(`review.status.${status}` as any)}
          </Badge>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('review.exportPdf')}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Launch Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('review.summary')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible defaultValue="basics">
                <AccordionItem value="basics">
                  <AccordionTrigger>Product Basics</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Product Name:</span>
                        <div>{currentDraft.basics.name}</div>
                      </div>
                      <div>
                        <span className="font-medium">Category:</span>
                        <div>{currentDraft.basics.category}</div>
                      </div>
                      <div>
                        <span className="font-medium">Brand:</span>
                        <div>{currentDraft.basics.brand}</div>
                      </div>
                      <div>
                        <span className="font-medium">Launch Date:</span>
                        <div>{new Date(currentDraft.basics.launchDate).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="font-medium">Price:</span>
                        <div>{formatCurrency(currentDraft.market.price, currentDraft.market.currency)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Channels:</span>
                        <div>{currentDraft.basics.channels.join(', ')}</div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="analogs">
                  <AccordionTrigger>Analog Products ({currentDraft.analogs.length})</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {currentDraft.analogs.map((analog) => (
                        <div key={analog.productId} className="flex justify-between text-sm">
                          <span>{analog.name}</span>
                          <Badge variant="secondary">{analog.weight}%</Badge>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cannibalization">
                  <AccordionTrigger>Cannibalization ({currentDraft.cannibalization.impactedSkus.length})</AccordionTrigger>
                  <AccordionContent>
                    {currentDraft.cannibalization.impactedSkus.length > 0 ? (
                      <div className="space-y-2">
                        {currentDraft.cannibalization.impactedSkus.map((sku) => (
                          <div key={sku.productId} className="flex justify-between text-sm">
                            <span>{sku.name}</span>
                            <Badge variant="secondary">{sku.cannibalizationPct}%</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No cannibalization effects configured</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Selected Scenario */}
          {selectedScenario && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  {t('review.selectedScenario')}: {selectedScenario.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* KPIs */}
                {selectedScenario.kpis && (
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{formatNumber(selectedScenario.kpis.totalUnits)}</div>
                      <div className="text-sm text-muted-foreground">Total Units</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{formatCurrency(selectedScenario.kpis.revenue)}</div>
                      <div className="text-sm text-muted-foreground">Revenue</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{formatCurrency(selectedScenario.kpis.grossMargin)}</div>
                      <div className="text-sm text-muted-foreground">Gross Margin</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{selectedScenario.kpis.avgWOS?.toFixed(1) || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">Avg WOS</div>
                    </div>
                  </div>
                )}

                {/* Chart */}
                {selectedScenario.forecast && (
                  <div>
                    <h4 className="font-semibold mb-3">26-Week Forecast</h4>
                    <ForecastChart scenarios={[selectedScenario]} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canSubmit && (
                <Button
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitMutation.isPending ? 'Submitting...' : t('review.submit')}
                </Button>
              )}

              {canApprove && (
                <Button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {approveMutation.isPending ? 'Approving...' : 'Approve Launch'}
                </Button>
              )}

              {canPublish && (
                <Button
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending}
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {publishMutation.isPending ? 'Publishing...' : t('review.publish')}
                </Button>
              )}

              <Button variant="outline" className="w-full">
                Save & Exit
              </Button>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>{t('review.notes')}</CardTitle>
              <CardDescription>
                Add notes for approvers or team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={t('review.notes.placeholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Approvers */}
          <ApproversSection 
            launchId={currentDraft.id}
            canApprove={isAdmin || isPlanner}
            currentUserEmail="admin@company.com" // This should come from auth context
          />
        </div>
      </div>
    </div>
  );
}