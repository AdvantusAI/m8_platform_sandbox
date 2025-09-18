import React from 'react';
import { Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '../i18n';
import { WizardStep } from '../stores/launchWizard';

interface LaunchWizardLayoutProps {
  currentStep: WizardStep;
  steps: string[];
  onStepClick: (step: string) => void;
  canProceedToStep: (step: string) => boolean;
  isStepComplete: (step: WizardStep) => boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  children: React.ReactNode;
}

const stepTitles: Record<WizardStep, string> = {
  basics: 'basics.title',
  analogs: 'analogs.title',
  market: 'market.title',
  cannibalization: 'cannibalization.title',
  scenarios: 'scenarios.title',
  'supply-planning': 'supply.planning.title',
  review: 'review.title',
};

export function LaunchWizardLayout({
  currentStep,
  steps,
  onStepClick,
  canProceedToStep,
  isStepComplete,
  isSaving,
  lastSaved,
  children,
}: LaunchWizardLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-8">
      {/* Sidebar Stepper */}
      <div className="w-80 flex-shrink-0">
        <div className="sticky top-8">
          {/* Save Status */}
          <div className="mb-6 p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                  <span className="text-sm text-muted-foreground">
                    {t('wizard.saving')}
                  </span>
                </>
              ) : lastSaved ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">
                    {t('wizard.autosaved')} • {lastSaved.toLocaleTimeString()}
                  </span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Unsaved changes
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-1">
            {steps.map((step, index) => {
              const isActive = step === currentStep;
              const isComplete = isStepComplete(step as WizardStep);
              const canProceed = canProceedToStep(step);
              const isPast = steps.indexOf(currentStep) > index;

              return (
                <button
                  key={step}
                  onClick={() => canProceed && onStepClick(step)}
                  disabled={!canProceed}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : canProceed
                      ? 'hover:bg-muted/50 text-foreground'
                      : 'text-muted-foreground cursor-not-allowed',
                    !canProceed && 'opacity-50'
                  )}
                >
                  {/* Step indicator */}
                  <div
                    className={cn(
                      'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
                      isComplete
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isComplete ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>

                  {/* Step title */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {t(stepTitles[step as WizardStep] as any)}
                    </div>
                  </div>

                  {/* Status badge */}
                  {isComplete && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                      Complete
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}