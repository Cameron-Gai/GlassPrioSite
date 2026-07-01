import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { businessHours } from '$lib/config/businessHours';
import { isBusinessHours } from '$lib/utils/businessHours';
import {
  TRIAGE_ROOT_ID,
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
  | 'issue'
  | 'site'
  | 'address'
  | 'contact'
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
  /** Customer opted into a remote (virtual) consultation instead of an on-site visit:
   *  the OSC is waived until we roll a truck, and a photo is required. */
  remoteConsult: boolean;
  confirmationNumber: string | null;
  submitting: boolean;
  submitError: string | null;
  /** Returning-customer autofill state (greet + confirm flow). Runs inline on the
   *  contact step once we have 2+ identifying fields; matches on any 2 of
   *  {phone, email, name, address}. customerId/locationId link the booking to the
   *  existing ServiceTitan record at conversion. */
  returning: {
    // idle → checking → found (awaiting decision) → applied | declined; or none (no match).
    status: 'idle' | 'checking' | 'found' | 'applied' | 'declined' | 'none';
    firstName: string | null;
    customerId: number | null;
    locationId: number | null;
  };
}

/**
 * All steps that can appear in the wizard, in their natural progression order.
 *
 * Order (decided with the operator): triage first, then the job/property/issue
 * detail, then the *service address*, then *contact* info. Address before contact
 * is deliberate — it lets the returning-customer lookup begin the moment we have
 * two identifying fields (address + phone/email/name) and offer to autofill the
 * rest. Timing (with the Priority upsell folded in) and review come last.
 *
 * The Priority upgrade and the returning-customer check are NOT separate steps
 * anymore: the upsell lives on the scheduling step, and the returning check runs
 * inline on the contact step.
 */
export const STEP_ORDER: WizardStep[] = [
  'triage',
  'property-type',
  'issue',
  'site',
  'address',
  'contact',
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
  { id: 'details', label: 'Details', steps: ['property-type', 'issue', 'site'] },
  { id: 'you', label: 'About you', steps: ['address', 'contact'] },
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
    remoteConsult: false,
    confirmationNumber: null,
    submitting: false,
    submitError: null,
    returning: { status: 'idle', firstName: null, customerId: null, locationId: null }
  };
}

// ---------------------------------------------------------------------------
// Draft persistence (localStorage). A 9-step form with photo uploads shouldn't
// evaporate on a refresh or a backgrounded mobile tab, so we persist the draft
// and rehydrate it. Time-sensitive fields (fee/payment holds) and the returning
// lookup are reset on rehydrate; a completed request starts fresh.
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'glass-intake-draft-v1';
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

function readPersisted(): IntakeState | null {
  if (!browser) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; state?: IntakeState };
    if (!parsed?.state || typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.state;
  } catch {
    return null;
  }
}

/** Merge a persisted draft over a clean state, tolerating schema drift and
 *  clearing transient / time-sensitive fields. Returns a clean state when there's
 *  nothing safe to restore. */
function sanitizeForHydrate(saved: IntakeState): IntakeState {
  const base = initialState();
  // A finished request must not rehydrate into the confirmation screen.
  if (saved.step === 'confirmation' || saved.confirmationNumber) return base;
  const merged: IntakeState = {
    ...base,
    ...saved,
    customer: { ...base.customer, ...saved.customer },
    address: { ...base.address, ...saved.address },
    propertyDetails: { ...base.propertyDetails, ...saved.propertyDetails },
    onSiteContact: { ...base.onSiteContact, ...saved.onSiteContact },
    issueDetails: {
      ...base.issueDetails,
      ...saved.issueDetails,
      windowAccess: { ...base.issueDetails.windowAccess, ...saved.issueDetails?.windowAccess },
      categoryDetails: { ...base.issueDetails.categoryDetails, ...saved.issueDetails?.categoryDetails },
      photos: Array.isArray(saved.issueDetails?.photos) ? saved.issueDetails.photos : []
    },
    specialInstructions: { ...base.specialInstructions, ...saved.specialInstructions },
    // Time-sensitive / transient — never trust these across a reload.
    feeQuote: null,
    paymentIntentId: null,
    paymentAuthorized: false,
    payLater: false,
    remoteConsult: false,
    submitting: false,
    submitError: null,
    returning: { status: 'idle', firstName: null, customerId: null, locationId: null }
  };
  if (!STEP_ORDER.includes(merged.step)) merged.step = 'triage';
  // The fee/payment state is dropped above, so the review step would be stale —
  // step back to contact so it re-resolves cleanly.
  if (merged.step === 'review') merged.step = 'contact';
  return merged;
}

function createIntakeStore() {
  const store = writable<IntakeState>(initialState());
  // Persistence stays off until the browser has had a chance to hydrate, so the
  // clean SSR/initial value never clobbers a saved draft before we read it.
  let persistEnabled = false;

  function writeDraft(state: IntakeState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), state }));
    } catch {
      // Almost always a quota error from base64 photos — keep the draft, drop
      // the photos rather than lose everything.
      try {
        const lean = { ...state, issueDetails: { ...state.issueDetails, photos: [] } };
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), state: lean }));
      } catch {
        /* give up silently — persistence is best-effort */
      }
    }
  }

  if (browser) {
    // Debounce writes: state changes on every keystroke and the draft can carry
    // multi-MB base64 photos, so serializing on each change would be wasteful.
    let writeTimer: ReturnType<typeof setTimeout> | null = null;
    store.subscribe((state) => {
      if (!persistEnabled) return;
      if (writeTimer) clearTimeout(writeTimer);
      writeTimer = setTimeout(() => {
        writeTimer = null;
        writeDraft(state);
      }, 400);
    });
  }

  /** Called once from the wizard's onMount (browser only): restore a saved draft,
   *  then enable ongoing persistence. */
  function hydrate() {
    if (!browser || persistEnabled) return;
    const saved = readPersisted();
    if (saved) store.set(sanitizeForHydrate(saved));
    persistEnabled = true;
  }

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
        return { ...routed, step: 'property-type' };
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
        return { ...next, step: 'property-type' };
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

  /** Priority upsell (now on the scheduling step): swap in Priority Service. Stays
   *  on the current step — the customer continues to review afterwards. */
  function acceptPriorityUpgrade() {
    store.update((state) => {
      const upgrade = getPublicJobType('Priority Service (Business Hours)');
      return {
        ...state,
        selectedJobType: upgrade,
        priorityUpgrade: true,
        isEmergency: false,
        isDuringBusinessHours: isBusinessHours(),
        // Job type changed → the OSC may differ; drop any resolved fee/payment.
        feeQuote: null,
        paymentIntentId: null,
        paymentAuthorized: false,
        payLater: false,
        remoteConsult: false
      };
    });
  }

  function declinePriorityUpgrade() {
    store.update((state) => ({
      ...state,
      selectedJobType: state.originalJobType ?? state.selectedJobType,
      priorityUpgrade: false,
      feeQuote: null,
      paymentIntentId: null,
      paymentAuthorized: false,
      payLater: false,
      remoteConsult: false
    }));
  }

  function advance() {
    store.update((state) => {
      const idx = STEP_ORDER.indexOf(state.step);
      if (idx < 0 || idx + 1 >= STEP_ORDER.length) return state;
      return { ...state, step: STEP_ORDER[idx + 1] };
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

      const idx = STEP_ORDER.indexOf(state.step);
      const candidate = STEP_ORDER[idx - 1];
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
      if (idx > 0) return { ...state, step: candidate };
      return state;
    });
  }

  function updateCustomer(patch: Partial<CustomerInfo>) {
    store.update((state) => {
      // Editing any identifying field after a prior result invalidates it — re-arm.
      const resets = 'phone' in patch || 'email' in patch || 'firstName' in patch || 'lastName' in patch;
      return {
        ...state,
        customer: { ...state.customer, ...patch },
        returning: resets ? { status: 'idle', firstName: null, customerId: null, locationId: null } : state.returning
      };
    });
  }

  const PHONE_OK = /^[0-9+\-\s().]{7,}$/;
  const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /** How many of the four identifying fields are filled well enough to match on. */
  function identifyingFieldCount(state: IntakeState): number {
    let n = 0;
    if (PHONE_OK.test(state.customer.phone.trim())) n += 1;
    if (EMAIL_OK.test(state.customer.email.trim())) n += 1;
    if (state.customer.firstName.trim() && state.customer.lastName.trim()) n += 1;
    if (state.address.street.trim() && state.address.zip.trim()) n += 1;
    return n;
  }

  /** True once we have enough (2+) identifying fields to attempt a 2-of-4 match. */
  function canRunReturningLookup(state: IntakeState = get(store)): boolean {
    return identifyingFieldCount(state) >= 2;
  }

  /** Step 1: with 2+ identifying fields present, quietly check for a returning
   *  customer (server does the 2-of-4 match). Returns only the first name here. */
  async function lookupReturningCustomer() {
    const state = get(store);
    if (!canRunReturningLookup(state)) return;
    if (state.returning.status === 'checking' || state.returning.status === 'applied') return;

    const snapshot = {
      phone: state.customer.phone.trim(),
      email: state.customer.email.trim(),
      firstName: state.customer.firstName.trim(),
      lastName: state.customer.lastName.trim(),
      address: { ...state.address }
    };

    store.update((s) => ({ ...s, returning: { ...s.returning, status: 'checking' } }));
    try {
      const res = await fetch('/api/customer-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot)
      });
      const data = (await res.json()) as { matched: boolean; firstName?: string | null };
      // Guard against a stale response after the user kept typing.
      const now = get(store);
      if (
        now.customer.phone.trim() !== snapshot.phone ||
        now.customer.email.trim() !== snapshot.email ||
        now.customer.firstName.trim() !== snapshot.firstName ||
        now.customer.lastName.trim() !== snapshot.lastName ||
        now.address.street.trim() !== snapshot.address.street.trim() ||
        now.address.zip.trim() !== snapshot.address.zip.trim()
      ) {
        // The inputs changed underneath us — reset to idle so a fresh lookup can run.
        store.update((s) => ({ ...s, returning: { ...s.returning, status: 'idle' } }));
        return;
      }
      store.update((s) => ({
        ...s,
        returning: data.matched
          ? { ...s.returning, status: 'found', firstName: data.firstName ?? null }
          : { status: 'none', firstName: null, customerId: null, locationId: null }
      }));
    } catch {
      store.update((s) => ({ ...s, returning: { status: 'none', firstName: null, customerId: null, locationId: null } }));
    }
  }

  /** Step 2: customer confirmed it's them — fetch and apply the prefill. Because
   *  address + contact are entered before this runs, we only FILL EMPTY fields
   *  (never overwrite what the customer typed — they may be booking a new
   *  location) and record the ServiceTitan customer/location id for linking. */
  async function applyReturningCustomer() {
    const state = get(store);
    const body = {
      phone: state.customer.phone.trim(),
      email: state.customer.email.trim(),
      firstName: state.customer.firstName.trim(),
      lastName: state.customer.lastName.trim(),
      address: { ...state.address }
    };
    try {
      const res = await fetch('/api/customer-prefill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = (await res.json()) as {
        matched: boolean;
        prefill?: {
          firstName: string;
          lastName: string;
          customerId: number | null;
          locationId: number | null;
          address: { street: string; city: string; state: string; zip: string } | null;
        };
      };
      if (!data.matched || !data.prefill) {
        store.update((s) => ({ ...s, returning: { status: 'none', firstName: null, customerId: null, locationId: null } }));
        return;
      }
      const p = data.prefill;
      store.update((s) => ({
        ...s,
        customer: {
          ...s.customer,
          // Fill only what the customer left blank; respect their own input.
          firstName: s.customer.firstName.trim() || p.firstName || '',
          lastName: s.customer.lastName.trim() || p.lastName || ''
        },
        returning: {
          status: 'applied',
          firstName: p.firstName || s.returning.firstName,
          customerId: p.customerId ?? null,
          locationId: p.locationId ?? null
        }
      }));
    } catch {
      store.update((s) => ({ ...s, returning: { status: 'none', firstName: null, customerId: null, locationId: null } }));
    }
  }

  function dismissReturningCustomer() {
    store.update((s) => ({
      ...s,
      returning: { status: 'declined', firstName: s.returning.firstName, customerId: null, locationId: null }
    }));
  }

  function updateAddress(patch: Partial<AddressInfo>) {
    // A ZIP change can change the fee — drop any prior fee/authorization/defer
    // choice. An address change also invalidates a returning-customer match.
    store.update((state) => ({
      ...state,
      address: { ...state.address, ...patch },
      feeQuote: null,
      paymentIntentId: null,
      paymentAuthorized: false,
      payLater: false,
      remoteConsult: false,
      returning:
        'street' in patch || 'zip' in patch || 'city' in patch || 'state' in patch
          ? { status: 'idle', firstName: null, customerId: null, locationId: null }
          : state.returning
    }));
  }

  function setFeeQuote(quote: FeeQuoteClient) {
    store.update((state) => ({ ...state, feeQuote: quote }));
  }

  function setPaymentAuthorized(paymentIntentId: string) {
    store.update((state) => ({ ...state, paymentIntentId, paymentAuthorized: true, payLater: false, remoteConsult: false }));
  }

  /** Customer chose "Pay later by text" — submit unpaid; GlassReports collects via SMS link. */
  function setPayLater(value: boolean) {
    store.update((state) => ({ ...state, payLater: value, remoteConsult: value ? false : state.remoteConsult }));
  }

  /** Customer opted into a remote consultation — waive the OSC (until we roll a
   *  truck); a photo is required before submit. */
  function setRemoteConsult(value: boolean) {
    store.update((state) => ({ ...state, remoteConsult: value, payLater: value ? false : state.payLater }));
  }

  function resetPayment() {
    store.update((state) => ({
      ...state,
      feeQuote: null,
      paymentIntentId: null,
      paymentAuthorized: false,
      payLater: false,
      remoteConsult: false
    }));
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
      remoteConsult: state.remoteConsult,
      returningCustomer: {
        matched: state.returning.status === 'applied',
        customerId: state.returning.status === 'applied' ? state.returning.customerId : null,
        locationId: state.returning.status === 'applied' ? state.returning.locationId : null
      },
      createdAt: new Date().toISOString()
    };
  }

  async function submit(): Promise<boolean> {
    const state = get(store);
    const payload = buildPayload(state);

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
      // The lead is booked — clear the saved draft so a refresh starts clean.
      clearDraft();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Submission failed';
      store.update((s) => ({ ...s, submitting: false, submitError: message }));
      return false;
    }
  }

  function clearDraft() {
    if (!browser) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  function reset() {
    clearDraft();
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
    hydrate,
    selectOption,
    acceptPriorityUpgrade,
    declinePriorityUpgrade,
    advance,
    goBack,
    updateCustomer,
    updateAddress,
    canRunReturningLookup,
    lookupReturningCustomer,
    applyReturningCustomer,
    dismissReturningCustomer,
    setFeeQuote,
    setPaymentAuthorized,
    setPayLater,
    setRemoteConsult,
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
