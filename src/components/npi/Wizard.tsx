import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { LaunchWizardLayout } from '../../components/features/launches/components/LaunchWizardLayout';
import { BasicsStep } from '../../components/features/launches/components/steps/BasicsStep';
import { AnalogsStep } from '../../components/features/launches/components/steps/AnalogsStep';
import { MarketStep } from '../../components/features/launches/components/steps/MarketStep';
import { CannibalizationStep } from '../../components/features/launches/components/steps/CannibalizationStep';
import { ScenariosStep } from '../../components/features/launches/components/steps/ScenariosStep';
import { SupplyPlanningStep } from '../../components/features/launches/components/steps/SupplyPlanningStep';
import { ReviewStep } from '../../components/features/launches/components/steps/ReviewStep';
import { useLaunchWizardStore } from '../../components/features/launches/stores/launchWizard';
import { launchService } from '../../components/features/launches/services/launches';
import { useTranslation } from '../../components/features/launches/i18n';
import { LaunchDraft } from '../../components/features/launches/types';  

const stepComponents = {
  basics: BasicsStep,
  analogs: AnalogsStep,
  market: MarketStep,
  cannibalization: CannibalizationStep,
  scenarios: ScenariosStep,
  'supply-planning': SupplyPlanningStep,
  review: ReviewStep,
};

const steps = Object.keys(stepComponents) as Array<keyof typeof stepComponents>;

export function LaunchWizard() {
  const { draftId } = useParams<{ draftId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    currentStep,
    currentDraft,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    setCurrentStep,
    setCurrentDraft,
    setLoading,
    setSaving,
    setLastSaved,
    getStepIndex,
    canProceedToStep,
    isStepComplete,
  } = useLaunchWizardStore();

  // Load or create draft
  const { data: loadedDraft, isError, error } = useQuery({
    queryKey: ['launch-draft', draftId],
    queryFn: async () => {
      if (draftId && draftId !== 'new') {
        try {
          return await launchService.getDraft(draftId);
        } catch (err) {
          // If draft doesn't exist, create it with the requested ID
          const newDraft = await launchService.createDraft();
          return await launchService.getDraft(newDraft.id);
        }
      }
      return null;
    },
    enabled: !!draftId && draftId !== 'new',
    retry: false,
  });

  // Create new draft mutation
  const createDraftMutation = useMutation({
    mutationFn: launchService.createDraft,
    onSuccess: (data) => {
      navigate(`/launches/${data.id}`, { replace: true });
      queryClient.invalidateQueries({ queryKey: ['launch-draft', data.id] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create draft',
        variant: 'destructive',
      });
    },
  });

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: (draft: LaunchDraft) => launchService.saveDraft(draft),
    onSuccess: () => {
      setLastSaved(new Date());
      toast({
        title: t('wizard.autosaved'),
        description: `${new Date().toLocaleTimeString()}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to save draft',
        variant: 'destructive',
      });
    },
  });

  // Initialize draft
  useEffect(() => {
    if (draftId === 'new' && !currentDraft) {
      createDraftMutation.mutate();
    } else if (loadedDraft && loadedDraft.id !== currentDraft?.id) {
      setCurrentDraft(loadedDraft);
    }
  }, [draftId, loadedDraft]);

  // Auto-save
  useEffect(() => {
    if (currentDraft && hasUnsavedChanges && !isSaving) {
      const timeoutId = setTimeout(() => {
        setSaving(true);
        saveDraftMutation.mutate(currentDraft);
      }, 10000); // 10 second debounce

      return () => clearTimeout(timeoutId);
    }
  }, [currentDraft, hasUnsavedChanges, isSaving]);

  // Handle navigation
  const handleNext = () => {
    const currentIndex = getStepIndex(currentStep);
    const nextStep = steps[currentIndex + 1];
    if (nextStep && canProceedToStep(nextStep)) {
      setCurrentStep(nextStep);
    }
  };

  const handleBack = () => {
    const currentIndex = getStepIndex(currentStep);
    const prevStep = steps[currentIndex - 1];
    if (prevStep) {
      setCurrentStep(prevStep);
    }
  };

  const handleSave = () => {
    if (currentDraft) {
      setSaving(true);
      saveDraftMutation.mutate(currentDraft);
    }
  };

  const handleStepClick = (step: string) => {
    if (canProceedToStep(step as any)) {
      setCurrentStep(step as any);
    }
  };

  if (createDraftMutation.isPending || (draftId !== 'new' && !currentDraft && !isError)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive">Error loading draft: {error?.message}</p>
          <Button onClick={() => navigate('/launches')} className="mt-4">
            Back to Launches
          </Button>
        </div>
      </div>
    );
  }

  const currentStepIndex = getStepIndex(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  const StepComponent = stepComponents[currentStep];

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/launches">Supply Planning</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{t('launch.title')}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <LaunchWizardLayout
          currentStep={currentStep}
          steps={steps}
          onStepClick={handleStepClick}
          canProceedToStep={canProceedToStep}
          isStepComplete={isStepComplete}
          isSaving={isSaving}
          lastSaved={null}
        >
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold">
                {currentDraft.basics.name || t('launch.title')}
              </h1>
              <span className="text-sm text-muted-foreground">
                {t('wizard.progress', { current: currentStepIndex + 1, total: steps.length })}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Content */}
          <div className="mb-8">
            <StepComponent />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between border-t pt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStepIndex === 0}
            >
              {t('wizard.back')}
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={saveDraftMutation.isPending}
              >
                {saveDraftMutation.isPending ? t('wizard.saving') : t('wizard.save')}
              </Button>

              {currentStepIndex < steps.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={!isStepComplete(currentStep)}
                >
                  {t('wizard.next')}
                </Button>
              ) : (
                <Button
                  onClick={() => navigate(`/launches/${currentDraft.id}/review`)}
                  disabled={!isStepComplete(currentStep)}
                >
                  {t('review.title')}
                </Button>
              )}
            </div>
          </div>
        </LaunchWizardLayout>
      </div>
    </div>
  );
}