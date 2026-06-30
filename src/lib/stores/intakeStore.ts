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
import type { IntakePreset } from '$lib/data/testPresets';
import type {
  AddressInfo,
  CategoryDetails,
  CustomerInfo,
  IntakePayload,
  IssueDetails,
  WindowAccessInfo,
  OnSiteContact,
  PropertyDetails,
  PropertyType,
  SchedulingPreference,
  SelectedJobTypeSummary,
  UploadedPhoto,
  SpecialInstructions
} from '$lib/types/intake';

export type WizardStep =
  | 'triage'
  | 'property-type'
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
  propertyDetails: PropertyDetails;
  onSiteContact: OnSiteContact;
  issueDetails: IssueDetails;
  specialInstructions: SpecialInstructions;
  schedulingPreference: SchedulingPreference;
  /** Resolved at the review step; null while not yet loaded. */
  feeQuote: FeeQuoteClient | null;
  /** Stripe PaymentIntent id once the card hold is authorized. */
  paymentIntentId: string | null;
  paymentAuthorized: boolean;
  /** Customer chose "Pay later" at the charge step — book unpaid; OSC is collected
   *  by a texted payment link once the job is scheduled (GlassReports pipeline). */
  payLater: boolean;
  confirmationNumber: string | null;
  submitting: boolean;
  submitError: string | null;
  /** Returning-customer autofill state (greet + confirm flow). */
  returning: {
    status: 'idle' | 'checking' | 'found' | 'applied' | 'none';
    firstName: string | null;
  };
}

/**
 * All steps that can appear in the wizard, in their natural progression order.
 * Contact comes first (right after triage) so we capture the lead early and the
 * returning-customer lookup can run before we decide whether to ask property
 * type. Property type follows, and is skipped for recognized returning
 * customers (see shouldSkipStep).
 */
export const STEP_ORDER: WizardStep[] = [
  'triage',
  'contact',
  'property-type',
  'priority-upgrade',
  'issue',
  'site',
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
  { id: 'tell-us', label: 'Tell us', steps: ['triage'] },
  { id: 'you', label: 'About you', steps: ['contact', 'property-type'] },
  { id: 'details', label: 'Details', steps: ['priority-upgrade', 'issue', 'site', 'address'] },
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
    propertyDetails: { businessName: '', complexName: '', role: '' },
    onSiteContact: { differs: false, name: '', phone: '' },
    issueDetails: {
      serviceLocation: '',
      description: '',
      happenedAt: '',
      isSecure: true,
      hasBrokenGlass: false,
      hasWaterOrWeatherEntry: false,
      windowAccess: { floors: '', blocked: 'no', blockedNotes: '' },
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
    payLater: false,
    confirmationNumber: null,
    submitting: false,
    submitError: null,
    returning: { status: 'idle', firstName: null }
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

function postRouteStep(_state: IntakeState): WizardStep {
  // Contact comes first after the service is routed — capturing it early both
  // recovers abandoned leads and lets the returning-customer lookup decide
  // whether the property-type step is needed. The linear advance from there
  // skips property-type (recognized returning customers) and priority-upgrade
  // (when it doesn't apply).
  return 'contact';
}

/**
 * Steps that drop out of the linear flow depending on state:
 *  - priority-upgrade: only for jobs that can be upgraded.
 *  - property-type: skipped for recognized returning customers (we already have
 *    their details on file, so we don't re-ask).
 */
function shouldSkipStep(step: WizardStep, state: IntakeState): boolean {
  if (step === 'priority-upgrade') return !canUpgradeToPriority(state.selectedJobType);
  if (step === 'property-type') return state.returning.status === 'applied';
  return false;
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
      if (idx < 0) return state;
      // Walk forward past any steps that don't apply (handles consecutive skips,
      // e.g. a returning customer whose job also can't be upgraded).
      let nextIdx = idx + 1;
      while (nextIdx < STEP_ORDER.length && shouldSkipStep(STEP_ORDER[nextIdx], state)) nextIdx += 1;
      if (nextIdx >= STEP_ORDER.length) return state;
      return { ...state, step: STEP_ORDER[nextIdx] };
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
        if (shouldSkipStep(candidate, state)) continue;
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
    store.update((state) => {
      // Editing phone/email after a prior result invalidates it — re-arm the lookup.
      const resets = 'phone' in patch || 'email' in patch;
      return {
        ...state,
        customer: { ...state.customer, ...patch },
        returning: resets ? { status: 'idle', firstName: null } : state.returning
      };
    });
  }

  const PHONE_OK = /^[0-9+\-\s().]{7,}$/;
  const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /** Step 1: when phone + email are valid, quietly check for a returning customer. */
  async function lookupReturningCustomer() {
    const state = get(store);
    const phone = state.customer.phone.trim();
    const email = state.customer.email.trim();
    if (!PHONE_OK.test(phone) || !EMAIL_OK.test(email)) return;
    if (state.returning.status === 'checking' || state.returning.status === 'applied') return;

    store.update((s) => ({ ...s, returning: { status: 'checking', firstName: null } }));
    try {
      const res = await fetch('/api/customer-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email })
      });
      const data = (await res.json()) as { matched: boolean; firstName?: string | null };
      // Guard against a stale response after the user kept typing.
      const now = get(store);
      if (now.customer.phone.trim() !== phone || now.customer.email.trim() !== email) return;
      store.update((s) => ({
        ...s,
        returning: data.matched
          ? { status: 'found', firstName: data.firstName ?? null }
          : { status: 'none', firstName: null }
      }));
    } catch {
      store.update((s) => ({ ...s, returning: { status: 'none', firstName: null } }));
    }
  }

  /** Step 2: customer opted in — fetch and apply name + address. */
  async function applyReturningCustomer() {
    const state = get(store);
    const phone = state.customer.phone.trim();
    const email = state.customer.email.trim();
    try {
      const res = await fetch('/api/customer-prefill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email })
      });
      const data = (await res.json()) as {
        matched: boolean;
        prefill?: {
          firstName: string;
          lastName: string;
          address: { street: string; city: string; state: string; zip: string } | null;
        };
      };
      if (!data.matched || !data.prefill) {
        store.update((s) => ({ ...s, returning: { status: 'none', firstName: null } }));
        return;
      }
      const p = data.prefill;
      store.update((s) => ({
        ...s,
        customer: {
          ...s.customer,
          firstName: p.firstName || s.customer.firstName,
          lastName: p.lastName || s.customer.lastName
        },
        address: p.address ? { ...s.address, ...p.address } : s.address,
        // Address may have changed the ZIP — drop any stale fee/authorization/defer choice.
        feeQuote: p.address ? null : s.feeQuote,
        paymentIntentId: p.address ? null : s.paymentIntentId,
        paymentAuthorized: p.address ? false : s.paymentAuthorized,
        payLater: p.address ? false : s.payLater,
        returning: { status: 'applied', firstName: p.firstName || s.returning.firstName }
      }));
    } catch {
      store.update((s) => ({ ...s, returning: { status: 'none', firstName: null } }));
    }
  }

  function dismissReturningCustomer() {
    store.update((s) => ({ ...s, returning: { status: 'none', firstName: null } }));
  }

  function updateAddress(patch: Partial<AddressInfo>) {
    // A ZIP change can change the fee — drop any prior fee/authorization/defer choice.
    store.update((state) => ({
      ...state,
      address: { ...state.address, ...patch },
      feeQuote: null,
      paymentIntentId: null,
      paymentAuthorized: false,
      payLater: false
    }));
  }

  function setFeeQuote(quote: FeeQuoteClient) {
    store.update((state) => ({ ...state, feeQuote: quote }));
  }

  function setPaymentAuthorized(paymentIntentId: string) {
    store.update((state) => ({ ...state, paymentIntentId, paymentAuthorized: true, payLater: false }));
  }

  /** Customer chose "Pay later by text" — submit unpaid; GlassReports collects via SMS link. */
  function setPayLater(value: boolean) {
    store.update((state) => ({ ...state, payLater: value }));
  }

  function resetPayment() {
    store.update((state) => ({ ...state, feeQuote: null, paymentIntentId: null, paymentAuthorized: false, payLater: false }));
  }

  function setPropertyType(value: PropertyType) {
    // Switching type clears the type-specific details so a stale business/
    // complex name or role can't carry over.
    store.update((state) => ({
      ...state,
      propertyType: value,
      propertyDetails: { businessName: '', complexName: '', role: '' }
    }));
  }

  function updatePropertyDetails(patch: Partial<PropertyDetails>) {
    store.update((state) => ({ ...state, propertyDetails: { ...state.propertyDetails, ...patch } }));
  }

  function updateOnSiteContact(patch: Partial<OnSiteContact>) {
    store.update((state) => ({ ...state, onSiteContact: { ...state.onSiteContact, ...patch } }));
  }

  function updateIssueDetails(patch: Partial<IssueDetails>) {
    store.update((state) => ({
      ...state,
      issueDetails: { ...state.issueDetails, ...patch }
    }));
  }

  function updateWindowAccess(patch: Partial<WindowAccessInfo>) {
    store.update((state) => ({
      ...state,
      issueDetails: {
        ...state.issueDetails,
        windowAccess: { ...state.issueDetails.windowAccess, ...patch }
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
      propertyDetails: { ...state.propertyDetails },
      onSiteContact: { ...state.onSiteContact },
      answers: { ...state.answers },
      issueDetails: {
        ...state.issueDetails,
        windowAccess: { ...state.issueDetails.windowAccess },
        photos: state.issueDetails.photos.map((p) => ({ ...p })),
        categoryDetails: { ...state.issueDetails.categoryDetails }
      },
      specialInstructions: { ...state.specialInstructions },
      schedulingPreference: state.schedulingPreference,
      paymentIntentId: state.paymentAuthorized ? state.paymentIntentId : null,
      payLater: state.payLater,
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

  /**
   * TEST MODE ONLY: load a prefilled preset and jump to review so an operator can
   * submit a real ServiceTitan booking in one click. Starts from a clean state
   * (no stale answers / payment), resolves the job type, and derives emergency
   * routing from the job category. Gated in the UI by /api/config testMode.
   */
  function loadPreset(preset: IntakePreset) {
    const job = getPublicJobType(preset.jobTypeName);
    const emergency = job.category === 'emergency';
    const base = initialState();
    store.set({
      ...base,
      selectedJobType: job,
      originalJobType: job,
      isEmergency: emergency,
      isDuringBusinessHours: emergency ? isBusinessHours() : false,
      customer: { ...base.customer, ...preset.customer },
      address: { ...base.address, ...preset.address },
      propertyType: preset.propertyType,
      propertyDetails: { ...base.propertyDetails, ...(preset.propertyDetails ?? {}) },
      issueDetails: {
        ...base.issueDetails,
        ...(preset.issue ?? {}),
        windowAccess: { ...base.issueDetails.windowAccess, ...(preset.issue?.windowAccess ?? {}) },
        categoryDetails: { ...base.issueDetails.categoryDetails, ...(preset.issue?.categoryDetails ?? {}) },
        photos: base.issueDetails.photos
      },
      specialInstructions: { ...base.specialInstructions, ...(preset.special ?? {}) },
      schedulingPreference: preset.schedulingPreference,
      step: 'review'
    });
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
    lookupReturningCustomer,
    applyReturningCustomer,
    dismissReturningCustomer,
    setFeeQuote,
    setPaymentAuthorized,
    setPayLater,
    resetPayment,
    setPropertyType,
    updatePropertyDetails,
    updateOnSiteContact,
    updateIssueDetails,
    updateWindowAccess,
    updateSpecialInstructions,
    updateCategoryDetails,
    addPhoto,
    removePhoto,
    setSchedulingPreference,
    submit,
    reset,
    loadPreset,
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
