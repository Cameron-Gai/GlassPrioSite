import { writable, derived, get } from 'svelte/store';
import { businessHours } from '$lib/config/businessHours';
import { isBusinessHours } from '$lib/utils/businessHours';
import {
  TRIAGE_ROOT_ID,
  canUpgradeToPriority,
  getNode,
  resolveRoute,
  type TriageNode,
  type TriageOption
} from '$lib/triage/triageTree';
import { getPublicJobType, type JobType } from '$lib/data/jobTypes';
import type {
  AddressInfo,
  CategoryDetails,
  CustomerInfo,
  IntakePayload,
  IssueDetails,
  LadderInfo,
  PropertyType,
  SchedulingPreference,
  SelectedJobTypeSummary,
  UploadedPhoto,
  SpecialInstructions
} from '$lib/types/intake';

export type WizardStep =
  | 'triage'
  | 'priority-upgrade'
  | 'issue'
  | 'site'
  | 'contact'
  | 'address'
  | 'scheduling'
  | 'review'
  | 'confirmation';

/** The on-site-charge quote for the customer's ZIP + job type, resolved at review. */
export interface FeeQuoteClient {
  serviced: boolean;
  osc: number;
  currency: string;
  zoneName: string | null;
  flag: string;
  /** True only when a real (>0) charge must be collected online via Stripe. */
  paymentRequired: boolean;
}

export interface IntakeState {
  step: WizardStep;
  triageHistory: string[];
  currentNodeId: string;
  answers: Record<string, string>;
  selectedJobType: JobType | null;
  /** The originally-routed job (before any priority upgrade). */
  originalJobType: JobType | null;
  isEmergency: boolean;
  isDuringBusinessHours: boolean;
  priorityUpgrade: boolean;
  customer: CustomerInfo;
  address: AddressInfo;
  propertyType: PropertyType;
  issueDetails: IssueDetails;
  specialInstructions: SpecialInstructions;
  schedulingPreference: SchedulingPreference;
  /** Resolved at the review step; null while not yet loaded. */
  feeQuote: FeeQuoteClient | null;
  /** Stripe PaymentIntent id once the card hold is authorized. */
  paymentIntentId: string | null;
  paymentAuthorized: boolean;
  confirmationNumber: string | null;
  submitting: boolean;
  submitError: string | null;
}

/** All steps that can appear in the wizard, in their natural progression order. */
export const STEP_ORDER: WizardStep[] = [
  'triage',
  'priority-upgrade',
  'issue',
  'site',
  'contact',
  'address',
  'scheduling',
  'review',
  'confirmation'
];

export interface PhaseDef {
  id: string;
  label: string;
  steps: WizardStep[];
}

export const PHASES: PhaseDef[] = [
  { id: 'tell-us', label: 'Tell us', steps: ['triage', 'priority-upgrade'] },
  { id: 'details', label: 'Details', steps: ['issue', 'site'] },
  { id: 'you', label: 'You', steps: ['contact', 'address'] },
  { id: 'finish', label: 'Finish', steps: ['scheduling', 'review'] }
];

function initialState(): IntakeState {
  return {
    step: 'triage',
    triageHistory: [],
    currentNodeId: TRIAGE_ROOT_ID,
    answers: {},
    selectedJobType: null,
    originalJobType: null,
    isEmergency: false,
    isDuringBusinessHours: false,
    priorityUpgrade: false,
    customer: { firstName: '', lastName: '', phone: '', email: '' },
    address: { street: '', city: '', state: '', zip: '' },
    propertyType: '',
    issueDetails: {
      serviceLocation: '',
      description: '',
      happenedAt: '',
      isSecure: true,
      hasBrokenGlass: false,
      hasWaterOrWeatherEntry: false,
      ladder: { required: false, story: '' },
      photos: [],
      categoryDetails: {
        storefrontScope: '',
        doorOperational: '',
        showerMirrorType: '',
        approximateSize: '',
        hardwareProblem: '',
        multiServiceList: ''
      }
    },
    specialInstructions: {
      gateCode: '',
      hasDog: false,
      parkingNotes: '',
      preferredWindow: '',
      other: ''
    },
    schedulingPreference: '',
    feeQuote: null,
    paymentIntentId: null,
    paymentAuthorized: false,
    confirmationNumber: null,
    submitting: false,
    submitError: null
  };
}

function applyEmergencyRoute(state: IntakeState): IntakeState {
  const duringHours = isBusinessHours();
  const targetName = duringHours
    ? 'Priority Service (Business Hours)'
    : 'Emergency Services (After Hours)';
  const job = getPublicJobType(targetName);
  return {
    ...state,
    selectedJobType: job,
    originalJobType: job,
    isEmergency: true,
    isDuringBusinessHours: duringHours,
    priorityUpgrade: false
  };
}

function postRouteStep(state: IntakeState): WizardStep {
  if (state.isEmergency) return 'issue';
  if (canUpgradeToPriority(state.selectedJobType)) return 'priority-upgrade';
  return 'issue';
}

function createIntakeStore() {
  const store = writable<IntakeState>(initialState());

  function selectOption(option: TriageOption) {
    store.update((state) => {
      const nextAnswers = { ...state.answers, [state.currentNodeId]: option.label };
      const nextHistory = [...state.triageHistory, state.currentNodeId];

      if (option.systemAction === 'checkBusinessHours' && option.isEmergency) {
        const routed = applyEmergencyRoute({
          ...state,
          answers: nextAnswers,
          triageHistory: nextHistory
        });
        return { ...routed, step: postRouteStep(routed) };
      }

      const route = resolveRoute(option);
      if (route) {
        const next: IntakeState = {
          ...state,
          answers: nextAnswers,
          triageHistory: nextHistory,
          selectedJobType: route.jobType,
          originalJobType: route.jobType,
          isEmergency: route.isEmergency,
          isDuringBusinessHours: route.isEmergency ? isBusinessHours() : state.isDuringBusinessHours,
          priorityUpgrade: false
        };
        return { ...next, step: postRouteStep(next) };
      }

      if (option.nextNodeId) {
        return {
          ...state,
          answers: nextAnswers,
          triageHistory: nextHistory,
          currentNodeId: option.nextNodeId
        };
      }

      return state;
    });
  }

  function acceptPriorityUpgrade() {
    store.update((state) => {
      const upgrade = getPublicJobType('Priority Service (Business Hours)');
      return {
        ...state,
        selectedJobType: upgrade,
        priorityUpgrade: true,
        isEmergency: false,
        isDuringBusinessHours: isBusinessHours(),
        step: 'issue'
      };
    });
  }

  function declinePriorityUpgrade() {
    store.update((state) => ({
      ...state,
      selectedJobType: state.originalJobType ?? state.selectedJobType,
      priorityUpgrade: false,
      step: 'issue'
    }));
  }

  function advance() {
    store.update((state) => {
      const idx = STEP_ORDER.indexOf(state.step);
      if (idx < 0 || idx === STEP_ORDER.length - 1) return state;
      // Skip the priority upgrade step on returns if it's been answered already
      // (priorityUpgrade=true or originalJobType set + we have a selectedJobType).
      let nextStep = STEP_ORDER[idx + 1];
      if (nextStep === 'priority-upgrade' && !canUpgradeToPriority(state.selectedJobType)) {
        nextStep = STEP_ORDER[idx + 2] ?? nextStep;
      }
      return { ...state, step: nextStep };
    });
  }

  function goBack() {
    store.update((state) => {
      if (state.step === 'triage') {
        if (state.triageHistory.length === 0) return state;
        const previous = state.triageHistory[state.triageHistory.length - 1];
        const nextAnswers = { ...state.answers };
        delete nextAnswers[previous];
        return {
          ...state,
          currentNodeId: previous,
          triageHistory: state.triageHistory.slice(0, -1),
          answers: nextAnswers
        };
      }

      // Find the previous valid step.
      const idx = STEP_ORDER.indexOf(state.step);
      for (let i = idx - 1; i >= 0; i -= 1) {
        const candidate = STEP_ORDER[i];
        if (candidate === 'priority-upgrade' && !canUpgradeToPriority(state.selectedJobType)) {
          continue;
        }
        if (candidate === 'triage') {
          // Re-enter triage at the last decision; drop the route.
          const previous = state.triageHistory[state.triageHistory.length - 1] ?? TRIAGE_ROOT_ID;
          const nextAnswers = { ...state.answers };
          delete nextAnswers[previous];
          return {
            ...state,
            step: 'triage',
            currentNodeId: previous,
            triageHistory: state.triageHistory.slice(0, -1),
            answers: nextAnswers,
            selectedJobType: null,
            originalJobType: null,
            isEmergency: false,
            priorityUpgrade: false
          };
        }
        return { ...state, step: candidate };
      }
      return state;
    });
  }

  function updateCustomer(patch: Partial<CustomerInfo>) {
    store.update((state) => ({ ...state, customer: { ...state.customer, ...patch } }));
  }

  function updateAddress(patch: Partial<AddressInfo>) {
    // A ZIP change can change the fee — drop any prior fee/authorization.
    store.update((state) => ({
      ...state,
      address: { ...state.address, ...patch },
      feeQuote: null,
      paymentIntentId: null,
      paymentAuthorized: false
    }));
  }

  function setFeeQuote(quote: FeeQuoteClient) {
    store.update((state) => ({ ...state, feeQuote: quote }));
  }

  function setPaymentAuthorized(paymentIntentId: string) {
    store.update((state) => ({ ...state, paymentIntentId, paymentAuthorized: true }));
  }

  function resetPayment() {
    store.update((state) => ({ ...state, feeQuote: null, paymentIntentId: null, paymentAuthorized: false }));
  }

  function setPropertyType(value: PropertyType) {
    store.update((state) => ({ ...state, propertyType: value }));
  }

  function updateIssueDetails(patch: Partial<IssueDetails>) {
    store.update((state) => ({
      ...state,
      issueDetails: { ...state.issueDetails, ...patch }
    }));
  }

  function updateLadder(patch: Partial<LadderInfo>) {
    store.update((state) => ({
      ...state,
      issueDetails: {
        ...state.issueDetails,
        ladder: { ...state.issueDetails.ladder, ...patch }
      }
    }));
  }

  function updateSpecialInstructions(patch: Partial<SpecialInstructions>) {
    store.update((state) => ({
      ...state,
      specialInstructions: { ...state.specialInstructions, ...patch }
    }));
  }

  function updateCategoryDetails(patch: Partial<CategoryDetails>) {
    store.update((state) => ({
      ...state,
      issueDetails: {
        ...state.issueDetails,
        categoryDetails: { ...state.issueDetails.categoryDetails, ...patch }
      }
    }));
  }

  function addPhoto(photo: UploadedPhoto) {
    store.update((state) => ({
      ...state,
      issueDetails: {
        ...state.issueDetails,
        photos: [...state.issueDetails.photos, photo]
      }
    }));
  }

  function removePhoto(name: string) {
    store.update((state) => ({
      ...state,
      issueDetails: {
        ...state.issueDetails,
        photos: state.issueDetails.photos.filter((photo) => photo.name !== name)
      }
    }));
  }

  function setSchedulingPreference(value: SchedulingPreference) {
    store.update((state) => ({ ...state, schedulingPreference: value }));
  }

  function buildPayload(state: IntakeState): IntakePayload {
    const jobSummary: SelectedJobTypeSummary = state.selectedJobType
      ? {
          name: state.selectedJobType.name,
          priority: state.selectedJobType.priority,
          duration: state.selectedJobType.duration,
          category: state.selectedJobType.category
        }
      : { name: '', priority: '', duration: '', category: '' };

    return {
      source: 'customer-intake-site',
      selectedJobType: jobSummary,
      routing: {
        isEmergency: state.isEmergency,
        isDuringBusinessHours: state.isDuringBusinessHours,
        businessHoursTimezone: businessHours.timezone,
        routedBy: 'triage-tree',
        priorityUpgrade: state.priorityUpgrade
      },
      customer: { ...state.customer },
      address: { ...state.address },
      propertyType: state.propertyType,
      answers: { ...state.answers },
      issueDetails: {
        ...state.issueDetails,
        ladder: { ...state.issueDetails.ladder },
        photos: state.issueDetails.photos.map((p) => ({ ...p })),
        categoryDetails: { ...state.issueDetails.categoryDetails }
      },
      specialInstructions: { ...state.specialInstructions },
      schedulingPreference: state.schedulingPreference,
      paymentIntentId: state.paymentAuthorized ? state.paymentIntentId : null,
      createdAt: new Date().toISOString()
    };
  }

  async function submit(): Promise<boolean> {
    const state = get(store);
    const payload = buildPayload(state);
    console.log('[intake] submitting payload', payload);

    store.update((s) => ({ ...s, submitting: true, submitError: null }));

    try {
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = (await response.json()) as {
        success: boolean;
        confirmationNumber?: string;
        error?: string;
      };
      if (!response.ok || !data.success || !data.confirmationNumber) {
        throw new Error(data.error ?? 'Submission failed');
      }
      store.update((s) => ({
        ...s,
        confirmationNumber: data.confirmationNumber ?? null,
        submitting: false,
        step: 'confirmation'
      }));
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Submission failed';
      store.update((s) => ({ ...s, submitting: false, submitError: message }));
      return false;
    }
  }

  function reset() {
    store.set(initialState());
  }

  return {
    subscribe: store.subscribe,
    selectOption,
    acceptPriorityUpgrade,
    declinePriorityUpgrade,
    advance,
    goBack,
    updateCustomer,
    updateAddress,
    setFeeQuote,
    setPaymentAuthorized,
    resetPayment,
    setPropertyType,
    updateIssueDetails,
    updateLadder,
    updateSpecialInstructions,
    updateCategoryDetails,
    addPhoto,
    removePhoto,
    setSchedulingPreference,
    submit,
    reset,
    buildPayload
  };
}

export const intakeStore = createIntakeStore();

export const currentTriageNode = derived(intakeStore, ($state): TriageNode | null => {
  if ($state.step !== 'triage') return null;
  return getNode($state.currentNodeId);
});

export const currentPhaseIndex = derived(intakeStore, ($state) =>
  PHASES.findIndex((phase) => phase.steps.includes($state.step))
);
