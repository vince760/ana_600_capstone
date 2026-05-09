import { createClient } from '@/lib/supabase/client'

const DEFAULT_API_URL = 'http://127.0.0.1:8000'

function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_ASSESSMENT_API_URL?.trim().replace(/\/+$/, '') ||
    DEFAULT_API_URL
  )
}

async function buildHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }

  return headers
}

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...(await buildHeaders()),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`
    try {
      const payload = await response.json()
      if (typeof payload?.detail === 'string') {
        detail = payload.detail
      }
    } catch {
      // keep fallback message when response is not JSON
    }
    throw new Error(detail)
  }

  return response.json() as Promise<T>
}

export interface AssessmentInputPayload {
  primary_user_age_years: number
  num_children_under_18: number
  annual_household_income_usd: number
  total_household_debt_usd: number
  monthly_consumer_debt_payments_usd: number
  liquid_assets_usd: number
  credit_card_revolving_balance_usd: number
  monthly_grocery_spend_usd: number
  monthly_dining_spend_usd: number
}

export interface AssessmentRequestPayload {
  submission_source: 'onboarding'
  input: AssessmentInputPayload
  research: {
    research_consent_accepted: boolean
    research_consent_version: string
    flow_version: string
  }
}

export interface DriverPayload {
  feature_key: string
  display_name: string
  normalized_value: number
  shap_value: number
  effect: 'increases_probability' | 'decreases_probability'
  plain_description: string
}

export interface AssessmentPayload {
  assessment_id: string
  status: string
  created_at: string
  submission_source: string
  experiment: {
    experiment_name: string
    experiment_version: string
    arm: 'control' | 'structured_explanation' | 'llm_explanation'
    assigned_at: string
  }
  prediction: {
    target: 'expenshilo_probability'
    probability: number
    model_version: string
    feature_version: string
    prediction_model_name: string
    shap_model_name: string
  }
  drivers: DriverPayload[]
  explanation: {
    status: 'not_generated' | 'generated' | 'failed'
    source: 'none' | 'structured' | 'llm'
    message: string
    prompt_version?: string | null
    llm_model_name?: string | null
  }
}

export interface SurveyRequestPayload {
  survey_version: string
  answers: Record<string, string | number | boolean>
  context?: {
    time_on_results_ms?: number
    time_on_survey_ms?: number
  }
}

export interface SurveyReceiptPayload {
  survey_response_id: string
  assessment_id: string
  survey_version: string
  experiment_name: string
  experiment_version: string
  experiment_arm: 'control' | 'structured_explanation' | 'llm_explanation'
  submitted_at: string
}

export async function createAssessment(
  payload: AssessmentRequestPayload
): Promise<AssessmentPayload> {
  return request<AssessmentPayload>('/v1/assessments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getAssessment(
  assessmentId: string
): Promise<AssessmentPayload> {
  return request<AssessmentPayload>(`/v1/assessments/${assessmentId}`)
}

export async function submitSurveyResponse(
  assessmentId: string,
  payload: SurveyRequestPayload
): Promise<SurveyReceiptPayload> {
  return request<SurveyReceiptPayload>(
    `/v1/assessments/${assessmentId}/survey-responses`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )
}
