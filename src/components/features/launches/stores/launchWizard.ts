import { create } from 'zustand';
import { LaunchDraft } from '../types';

export type WizardStep = 'basics' | 'analogs' | 'market' | 'cannibalization' | 'scenarios' | 'supply-planning' | 'review';

interface LaunchWizardState {
  currentStep: WizardStep;
  currentDraft: LaunchDraft | null;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  
  // Actions
  setCurrentStep: (step: WizardStep) => void;
  setCurrentDraft: (draft: LaunchDraft | null) => void;
  updateDraft: (updates: Partial<LaunchDraft>) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setLastSaved: (date: Date) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  
  // Computed
  canProceedToStep: (step: WizardStep) => boolean;
  getStepIndex: (step: WizardStep) => number;
  isStepComplete: (step: WizardStep) => boolean;
}

const steps: WizardStep[] = ['basics', 'analogs', 'market', 'cannibalization', 'scenarios', 'supply-planning', 'review'];

export const useLaunchWizardStore = create<LaunchWizardState>((set, get) => ({
  currentStep: 'basics',
  currentDraft: null,
  isLoading: false,
  isSaving: false,
  lastSaved: null,
  hasUnsavedChanges: false,

  setCurrentStep: (step) => set({ currentStep: step }),
  
  setCurrentDraft: (draft) => set({ 
    currentDraft: draft,
    hasUnsavedChanges: false,
  }),
  
  updateDraft: (updates) => set((state) => ({
    currentDraft: state.currentDraft ? { ...state.currentDraft, ...updates } : null,
    hasUnsavedChanges: true,
  })),
  
  setLoading: (loading) => set({ isLoading: loading }),
  setSaving: (saving) => set({ isSaving: saving }),
  setLastSaved: (date) => set({ lastSaved: date, hasUnsavedChanges: false }),
  setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),

  getStepIndex: (step) => steps.indexOf(step),
  
  isStepComplete: (step) => {
    const { currentDraft } = get();
    if (!currentDraft) return false;

    switch (step) {
      case 'basics':
        return !!(
          currentDraft.basics.name &&
          currentDraft.basics.category &&
          currentDraft.basics.brand &&
          currentDraft.basics.launchDate &&
          currentDraft.basics.locations.length > 0 &&
          currentDraft.basics.channels.length > 0
        );
      
      case 'analogs':
        return currentDraft.analogs.length > 0 && 
               currentDraft.analogs.every(a => a.weight > 0);
      
      case 'market':
        return !!(
          currentDraft.market.price > 0 &&
          currentDraft.market.distribution.weeks.length > 0
        );
      
      case 'cannibalization':
        return true; // Optional step
      
      case 'scenarios':
        return currentDraft.scenarios.length > 0 && 
               currentDraft.scenarios.some(s => s.forecast && s.kpis);
      
      case 'supply-planning':
        return !!currentDraft.supplyPlan;
      
      case 'review':
        return !!currentDraft.selectedScenarioId;
      
      default:
        return false;
    }
  },

  canProceedToStep: (targetStep) => {
    const { getStepIndex, isStepComplete } = get();
    const targetIndex = getStepIndex(targetStep);
    
    // Can always go to current or previous steps
    const currentIndex = getStepIndex(get().currentStep);
    if (targetIndex <= currentIndex) return true;
    
    // Can only proceed if all previous steps are complete
    for (let i = 0; i < targetIndex; i++) {
      if (!isStepComplete(steps[i])) return false;
    }
    
    return true;
  },
}));