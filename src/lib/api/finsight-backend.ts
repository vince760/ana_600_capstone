import { createClient } from "@/lib/supabase/client";

const DEFAULT_API_URL =
  "https://finsight-assessment-api-1879fcf6be78.herokuapp.com";

export function getAssessmentApiBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_ASSESSMENT_API_URL?.trim();
  return (configuredUrl || DEFAULT_API_URL).replace(/\/+$/, "");
}

function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getAssessmentApiBaseUrl()}${normalizedPath}`;
}

async function buildHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return headers;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const controller = new AbortController();
  const timeoutMs = 12000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${normalizedPath}`, {
      ...init,
      headers: {
        ...(await buildHeaders()),
        ...(init?.headers ?? {}),
      },
      signal: init?.signal ?? controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const payload = await response.json();
      if (typeof payload?.detail === "string") {
        detail = payload.detail;
      }
    } catch {
      // keep fallback message when response is not JSON
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

function normalizeAssessmentPayload(
  payload: AssessmentPayload,
): AssessmentPayload {
  return {
    ...payload,
    explanation: {
      ...payload.explanation,
      factor_explanations: payload.explanation?.factor_explanations ?? [],
      recommendation_scenarios:
        payload.explanation?.recommendation_scenarios ?? [],
    },
  };
}

export interface AssessmentInputPayload {
  primary_user_age_years: number;
  num_children_under_18: number;
  annual_household_income_usd: number;
  total_household_debt_usd: number;
  monthly_consumer_debt_payments_usd: number;
  liquid_assets_usd: number;
  credit_card_revolving_balance_usd: number;
  monthly_grocery_spend_usd: number;
  monthly_dining_spend_usd: number;
}

export interface AssessmentRequestPayload {
  submission_source: "onboarding";
  input: AssessmentInputPayload;
  research: {
    research_consent_accepted: boolean;
    research_consent_version: string;
    flow_version: string;
  };
  context?: {
    employment_status?: string;
    housing_status?: string;
    marital_status?: string;
    education_level?: string;
    free_text_notes?: string;
  };
}

export type AssessmentInputOverridesPayload = Partial<AssessmentInputPayload>;

export interface SimulateAssessmentRequestPayload {
  input?: AssessmentInputPayload;
  input_overrides?: AssessmentInputOverridesPayload;
}

export interface DriverPayload {
  feature_key: string;
  display_name: string;
  normalized_value: number;
  shap_value: number;
  effect: "increases_probability" | "decreases_probability";
  plain_description: string;
}

export interface ExplanationFactorPayload {
  feature_key: string;
  title: string;
  summary: string;
  effect: "increases_probability" | "decreases_probability";
  source: "structured" | "llm" | "none";
}

export interface RecommendationScenarioPayload {
  feature_key: string;
  title: string;
  suggested_change: string;
  summary: string;
  current_probability: number;
  projected_probability: number;
  absolute_improvement: number;
  source: "structured" | "llm" | "none";
}

export interface AssessmentPayload {
  assessment_id: string;
  status: string;
  created_at: string;
  submission_source: string;
  experiment: {
    experiment_name: string;
    experiment_version: string;
    arm: "control" | "structured_explanation" | "llm_explanation";
    assigned_at: string;
  };
  prediction: {
    target: "expenshilo_probability";
    probability: number;
    model_version: string;
    feature_version: string;
    prediction_model_name: string;
    shap_model_name: string;
  };
  drivers: DriverPayload[];
  explanation: {
    status: "not_generated" | "generated" | "failed";
    source: "none" | "structured" | "llm";
    message: string;
    prompt_version?: string | null;
    llm_model_name?: string | null;
    factor_explanations: ExplanationFactorPayload[];
    recommendation_scenarios: RecommendationScenarioPayload[];
  };
}

export interface SimulatedAssessmentPayload {
  assessment_id: string;
  base_probability: number;
  simulated_prediction: AssessmentPayload["prediction"];
  probability_delta: number;
  input: AssessmentInputPayload;
  changed_fields: string[];
  drivers: DriverPayload[];
}

export interface SurveyRequestPayload {
  survey_version: string;
  answers: Record<string, string | number | boolean>;
  context?: {
    time_on_results_ms?: number;
    time_on_survey_ms?: number;
  };
}

export interface SurveyReceiptPayload {
  survey_response_id: string;
  assessment_id: string;
  survey_version: string;
  experiment_name: string;
  experiment_version: string;
  experiment_arm: "control" | "structured_explanation" | "llm_explanation";
  submitted_at: string;
}

export async function createAssessment(
  payload: AssessmentRequestPayload,
): Promise<AssessmentPayload> {
  const response = await request<AssessmentPayload>("/v1/assessments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeAssessmentPayload(response);
}

export async function getAssessment(
  assessmentId: string,
): Promise<AssessmentPayload> {
  const response = await request<AssessmentPayload>(
    `/v1/assessments/${assessmentId}`,
  );
  return normalizeAssessmentPayload(response);
}

export async function simulateAssessment(
  assessmentId: string,
  payload: SimulateAssessmentRequestPayload,
): Promise<SimulatedAssessmentPayload> {
  return request<SimulatedAssessmentPayload>(
    `/v1/assessments/${assessmentId}/simulations`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function submitSurveyResponse(
  assessmentId: string,
  payload: SurveyRequestPayload,
): Promise<SurveyReceiptPayload> {
  return request<SurveyReceiptPayload>(
    `/v1/assessments/${assessmentId}/survey-responses`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
