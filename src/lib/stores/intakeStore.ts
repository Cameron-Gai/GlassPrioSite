import { writable, derived, get } from 'svelte/store';
import { businessHours } from '$lib/config/businessHours';
import { isBusinessHours } from '$lib/utils/businessHours';
import {
  TRIAGE_ROOT_ID,
  getNode,
  resolveRoute,
  type TriageNode,
  type TriageOption
} from '$lib/triage/triageTree';
import type { JobType } from '$lib/data/jobTypes';
import type {
  AddressInfo,
  CustomerInfo,
  IntakePayload,
  IssueDetails,
  PropertyType,
  SchedulingPreference,
  SelectedJobTypeSummary
} from '$lib/types/intake';

export type WizardStep =
  | 'triage'
  | 'property-type'
  | 'customer'
  | 'address'
  | 'issue-details'
  | 'photos'
  | 'scheduling'
  | 'review'
  | 'confirmation';

export const COMMON_INTAKE_STEPS: WizardStep[] = [
  'property-type',
  'customer',
  'address',
  'issue-details',
  'photos',
  'scheduling',
  'review'
];

export interface IntakeState {
  step: WizardStep;
  history: string[];
  currentNodeId: string;
  answers: Record<string, string>;
  selectedJobType: JobType | null;
  isEmergency: boolean;
  isDuringBusinessHours: boolean;
  customer: CustomerInfo;
  address: AddressInfo;
  propertyType: PropertyType;
  issueDetails: IssueDetails;
  uploadedPhotos: string[];
  schedulingPreference: SchedulingPreference;
  confirmationNumber: string | null;
  submitting: boolean;
  submitError: string | null;
}

function initialState(): IntakeState {
  return {
    step: 'triage',
    history: [],
    currentNodeId: TRIAGE_ROOT_ID,
    answers: {},
    selectedJobType: null,
    isEmergency: false,
    isDuringBusinessHours: false,
    customer: { firstName: '', lastName: '', phone: '', email: '' },
    address: { street: '', city: '', state: '', zip: '' },
    propertyType: '',
    issueDetails: {
      description: '',
      happenedAt: '',
      isSecure: true,
      hasBrokenGlass: false,
      hasWaterOrWeatherEntry: false,
      photos: []
    },
    uploadedPhotos: [],
    schedulingPreference: '',
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
  // Pull from the registry so duration/priority stay in sync with the canonical list.
  const job: JobType = {
    name: targetName,
    priority: 'Urgent',
    duration: '2 hours',
    category: 'emergency',
    customerFacing: true,
    publicIntakeEnabled: true
  };
  return {
    ...state,
    selectedJobType: job,
    isEmergency: true,
    isDuringBusinessHours: duringHours
  };
}

function createIntakeStore() {
  const store = writable<IntakeState>(initialState());

  function selectOption(option: TriageOption) {
    store.update((state) => {
      const nextAnswers = { ...state.answers, [state.currentNodeId]: option.label };
      const nextHistory = [...state.history, state.currentNodeId];

      // Emergency branch: system-driven business hours check, no further triage.
      if (option.systemAction === 'checkBusinessHours' && option.isEmergency) {
        const routed = applyEmergencyRoute({
          ...state,
          answers: nextAnswers,
          history: nextHistory
        });
        return {
          ...routed,
          step: 'property-type'
        };
      }

      const route = resolveRoute(option);
      if (route) {
        return {
          ...state,
          answers: nextAnswers,
          history: nextHistory,
          selectedJobType: route.jobType,
          isEmergency: route.isEmergency,
          isDuringBusinessHours: route.isEmergency ? isBusinessHours() : state.isDuringBusinessHours,
          step: 'property-type'
        };
      }

      if (option.nextNodeId) {
        return {
          ...state,
          answers: nextAnswers,
          history: nextHistory,
          currentNodeId: option.nextNodeId
        };
      }

      return state;
    });
  }

  function goBack() {
    store.update((state) => {
      if (state.step === 'triage') {
        if (state.history.length === 0) return state;
        const previous = state.history[state.history.length - 1];
        const nextAnswers = { ...state.answers };
        delete nextAnswers[previous];
        return {
          ...state,
          currentNodeId: previous,
          history: state.history.slice(0, -1),
          answers: nextAnswers
        };
      }

      const commonIndex = COMMON_INTAKE_STEPS.indexOf(state.step as WizardStep);
      if (commonIndex > 0) {
        return { ...state, step: COMMON_INTAKE_STEPS[commonIndex - 1] };
      }

      if (state.step === 'property-type') {
        // Re-enter the triage flow at the most recent decision node.
        if (state.history.length === 0) {
          return state;
        }
        const previous = state.history[state.history.length - 1];
        const nextAnswers = { ...state.answers };
        delete nextAnswers[previous];
        return {
          ...state,
          step: 'triage',
          currentNodeId: previous,
          history: state.history.slice(0, -1),
          answers: nextAnswers,
          selectedJobType: null,
          isEmergency: false
        };
      }

      return state;
    });
  }

  function advance() {
    store.update((state) => {
      const idx = COMMON_INTAKE_STEPS.indexOf(state.step as WizardStep);
      if (idx >= 0 && idx < COMMON_INTAKE_STEPS.length - 1) {
        return { ...state, step: COMMON_INTAKE_STEPS[idx + 1] };
      }
      return state;
    });
  }

  function updateCustomer(patch: Partial<CustomerInfo>) {
    store.update((state) => ({ ...state, customer: { ...state.customer, ...patch } }));
  }

  function updateAddress(patch: Partial<AddressInfo>) {
    store.update((state) => ({ ...state, address: { ...state.address, ...patch } }));
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

  function addPhoto(name: string) {
    store.update((state) => ({
      ...state,
      uploadedPhotos: [...state.uploadedPhotos, name],
      issueDetails: {
        ...state.issueDetails,
        photos: [...state.issueDetails.photos, name]
      }
    }));
  }

  function removePhoto(name: string) {
    store.update((state) => ({
      ...state,
      uploadedPhotos: state.uploadedPhotos.filter((photo) => photo !== name),
      issueDetails: {
        ...state.issueDetails,
        photos: state.issueDetails.photos.filter((photo) => photo !== name)
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
        routedBy: 'triage-tree'
      },
      customer: { ...state.customer },
      address: { ...state.address },
      propertyType: state.propertyType,
      answers: { ...state.answers },
      issueDetails: { ...state.issueDetails, photos: [...state.issueDetails.photos] },
      schedulingPreference: state.schedulingPreference,
      createdAt: new Date().toISOString()
    };
  }

  async function submit(): Promise<void> {
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
      const data = (await response.json()) as { success: boolean; confirmationNumber?: string; error?: string };
      if (!response.ok || !data.success || !data.confirmationNumber) {
        throw new Error(data.error ?? 'Submission failed');
      }
      store.update((s) => ({
        ...s,
        confirmationNumber: data.confirmationNumber ?? null,
        submitting: false,
        step: 'confirmation'
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Submission failed';
      store.update((s) => ({ ...s, submitting: false, submitError: message }));
    }
  }

  function reset() {
    store.set(initialState());
  }

  return {
    subscribe: store.subscribe,
    selectOption,
    goBack,
    advance,
    updateCustomer,
    updateAddress,
    setPropertyType,
    updateIssueDetails,
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
