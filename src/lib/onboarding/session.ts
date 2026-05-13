import type {
  AssessmentInputPayload,
  AssessmentPayload,
  AssessmentRequestPayload,
} from "@/lib/api/finsight-backend";

const ONBOARDING_DRAFT_KEY = "finsight:onboarding-draft:v1";
const ASSESSMENT_SESSION_KEY = "finsight:assessment-session:v1";
const ASSESSMENT_CACHE_KEY = "finsight:assessment-cache:v1";
const SURVEY_STATE_KEY = "finsight:survey-state:v1";

export interface OnboardingDraft {
  research_consent_accepted: boolean;
  research_consent_version: string;
  flow_version: string;
  primary_user_age_years: number | null;
  num_children_under_18: number | null;
  annual_household_income_usd: number | null;
  total_household_debt_usd: number | null;
  monthly_consumer_debt_payments_usd: number | null;
  liquid_assets_usd: number | null;
  credit_card_revolving_balance_usd: number | null;
  monthly_grocery_spend_usd: number | null;
  monthly_dining_spend_usd: number | null;
  employment_status: string;
  marital_status: string;
  housing_status: string;
  education_level: string;
  free_text_notes: string;
}

export interface AssessmentSession {
  assessment_id: string;
  input: AssessmentInputPayload;
}

export interface SurveySubmissionState {
  assessment_id: string;
  submitted: boolean;
  submitted_at?: string;
}

const DEFAULT_DRAFT: OnboardingDraft = {
  research_consent_accepted: false,
  research_consent_version: "consent_v1",
  flow_version: "onboarding_v1",
  primary_user_age_years: null,
  num_children_under_18: null,
  annual_household_income_usd: null,
  total_household_debt_usd: null,
  monthly_consumer_debt_payments_usd: null,
  liquid_assets_usd: null,
  credit_card_revolving_balance_usd: null,
  monthly_grocery_spend_usd: null,
  monthly_dining_spend_usd: null,
  employment_status: "",
  marital_status: "",
  housing_status: "",
  education_level: "",
  free_text_notes: "",
};

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function parseDraftPayload(raw: string | null): OnboardingDraft {
  if (!raw) {
    return { ...DEFAULT_DRAFT };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
    return { ...DEFAULT_DRAFT, ...parsed };
  } catch {
    return { ...DEFAULT_DRAFT };
  }
}

function readDraft(): OnboardingDraft {
  if (!hasWindow()) {
    return { ...DEFAULT_DRAFT };
  }

  return parseDraftPayload(window.localStorage.getItem(ONBOARDING_DRAFT_KEY));
}

function writeDraft(draft: OnboardingDraft): void {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
}

function toOptionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function requireNumber(value: number | null, key: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Missing required field: ${key}`);
  }
  return value;
}

export function getOnboardingDraft(): OnboardingDraft {
  return readDraft();
}

export function saveOnboardingDraft(
  patch: Partial<OnboardingDraft>,
): OnboardingDraft {
  const nextDraft = {
    ...readDraft(),
    ...patch,
  };
  writeDraft(nextDraft);
  return nextDraft;
}

export function clearOnboardingDraft(): void {
  if (!hasWindow()) {
    return;
  }
  window.localStorage.removeItem(ONBOARDING_DRAFT_KEY);
}

export function buildAssessmentRequestFromDraft(
  draft: OnboardingDraft,
): AssessmentRequestPayload {
  const input: AssessmentInputPayload = {
    primary_user_age_years: requireNumber(
      draft.primary_user_age_years,
      "primary_user_age_years",
    ),
    num_children_under_18: requireNumber(
      draft.num_children_under_18,
      "num_children_under_18",
    ),
    annual_household_income_usd: requireNumber(
      draft.annual_household_income_usd,
      "annual_household_income_usd",
    ),
    total_household_debt_usd: requireNumber(
      draft.total_household_debt_usd,
      "total_household_debt_usd",
    ),
    monthly_consumer_debt_payments_usd: requireNumber(
      draft.monthly_consumer_debt_payments_usd,
      "monthly_consumer_debt_payments_usd",
    ),
    liquid_assets_usd: requireNumber(draft.liquid_assets_usd, "liquid_assets_usd"),
    credit_card_revolving_balance_usd: requireNumber(
      draft.credit_card_revolving_balance_usd,
      "credit_card_revolving_balance_usd",
    ),
    monthly_grocery_spend_usd: requireNumber(
      draft.monthly_grocery_spend_usd,
      "monthly_grocery_spend_usd",
    ),
    monthly_dining_spend_usd: requireNumber(
      draft.monthly_dining_spend_usd,
      "monthly_dining_spend_usd",
    ),
  };

  const context = {
    employment_status: toOptionalString(draft.employment_status),
    housing_status: toOptionalString(draft.housing_status),
    marital_status: toOptionalString(draft.marital_status),
    education_level: toOptionalString(draft.education_level),
    free_text_notes: toOptionalString(draft.free_text_notes),
  };

  const hasContext = Object.values(context).some(Boolean);

  return {
    submission_source: "onboarding",
    input,
    research: {
      research_consent_accepted: draft.research_consent_accepted,
      research_consent_version: draft.research_consent_version,
      flow_version: draft.flow_version,
    },
    ...(hasContext ? { context } : {}),
  };
}

export function setAssessmentSession(session: AssessmentSession): void {
  if (!hasWindow()) {
    return;
  }
  window.localStorage.setItem(ASSESSMENT_SESSION_KEY, JSON.stringify(session));
}

export function getAssessmentSession(): AssessmentSession | null {
  if (!hasWindow()) {
    return null;
  }

  const raw = window.localStorage.getItem(ASSESSMENT_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AssessmentSession;
  } catch {
    return null;
  }
}

type AssessmentCacheStore = Record<string, AssessmentPayload>;
type SurveyStateStore = Record<string, SurveySubmissionState>;

function readAssessmentCacheStore(): AssessmentCacheStore {
  if (!hasWindow()) {
    return {};
  }
  const raw = window.localStorage.getItem(ASSESSMENT_CACHE_KEY);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as AssessmentCacheStore;
  } catch {
    return {};
  }
}

function writeAssessmentCacheStore(store: AssessmentCacheStore): void {
  if (!hasWindow()) {
    return;
  }
  window.localStorage.setItem(ASSESSMENT_CACHE_KEY, JSON.stringify(store));
}

function readSurveyStateStore(): SurveyStateStore {
  if (!hasWindow()) {
    return {};
  }
  const raw = window.localStorage.getItem(SURVEY_STATE_KEY);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as SurveyStateStore;
  } catch {
    return {};
  }
}

function writeSurveyStateStore(store: SurveyStateStore): void {
  if (!hasWindow()) {
    return;
  }
  window.localStorage.setItem(SURVEY_STATE_KEY, JSON.stringify(store));
}

export function cacheAssessmentResult(assessment: AssessmentPayload): void {
  const store = readAssessmentCacheStore();
  store[assessment.assessment_id] = assessment;
  writeAssessmentCacheStore(store);
}

export function getCachedAssessmentResult(
  assessmentId: string,
): AssessmentPayload | null {
  const store = readAssessmentCacheStore();
  return store[assessmentId] ?? null;
}

export function markSurveySubmitted(assessmentId: string): void {
  const store = readSurveyStateStore();
  store[assessmentId] = {
    assessment_id: assessmentId,
    submitted: true,
    submitted_at: new Date().toISOString(),
  };
  writeSurveyStateStore(store);
}

export function getSurveySubmissionState(
  assessmentId: string,
): SurveySubmissionState | null {
  const store = readSurveyStateStore();
  return store[assessmentId] ?? null;
}
