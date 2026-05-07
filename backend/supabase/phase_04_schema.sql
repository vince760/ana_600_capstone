create extension if not exists pgcrypto;

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  submission_source text not null,
  status text not null check (status in ('complete', 'processing', 'failed')),
  created_at timestamptz not null default timezone('utc', now()),
  experiment_name text not null,
  experiment_version text not null,
  experiment_arm text not null check (
    experiment_arm in ('control', 'structured_explanation', 'llm_explanation')
  ),
  prediction_target text not null,
  prediction_probability double precision not null check (
    prediction_probability >= 0 and prediction_probability <= 1
  ),
  model_version text not null,
  feature_version text not null,
  prediction_model_name text not null,
  shap_model_name text not null,
  raw_input_snapshot jsonb not null,
  research_snapshot jsonb not null,
  context_snapshot jsonb,
  normalized_input jsonb not null,
  engineered_features jsonb not null,
  model_features jsonb not null,
  drivers jsonb not null,
  explanation_status text not null,
  explanation_message text not null,
  response_payload jsonb not null
);

alter table public.assessments
  add column if not exists explanation_source text,
  add column if not exists explanation_prompt_version text,
  add column if not exists explanation_llm_model_name text;

create index if not exists assessments_user_id_idx
  on public.assessments (user_id);

create index if not exists assessments_created_at_idx
  on public.assessments (created_at desc);

create index if not exists assessments_experiment_arm_idx
  on public.assessments (experiment_arm);

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null unique references public.assessments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  survey_version text not null,
  experiment_name text not null,
  experiment_version text not null,
  experiment_arm text not null check (
    experiment_arm in ('control', 'structured_explanation', 'llm_explanation')
  ),
  submitted_at timestamptz not null default timezone('utc', now()),
  answers jsonb not null,
  context_snapshot jsonb
);

create index if not exists survey_responses_user_id_idx
  on public.survey_responses (user_id);

create index if not exists survey_responses_submitted_at_idx
  on public.survey_responses (submitted_at desc);

create table if not exists public.llm_explanations (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null unique references public.assessments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  prompt_version text not null,
  llm_model_name text not null,
  status text not null,
  request_payload jsonb not null,
  response_text text,
  response_metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.assessments enable row level security;
alter table public.survey_responses enable row level security;
alter table public.llm_explanations enable row level security;

drop policy if exists "Service role can manage assessments" on public.assessments;
create policy "Service role can manage assessments"
  on public.assessments
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Users can read own assessments" on public.assessments;
create policy "Users can read own assessments"
  on public.assessments
  for select
  using (auth.uid() = user_id);

drop policy if exists "Service role can manage survey responses" on public.survey_responses;
create policy "Service role can manage survey responses"
  on public.survey_responses
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Users can read own survey responses" on public.survey_responses;
create policy "Users can read own survey responses"
  on public.survey_responses
  for select
  using (auth.uid() = user_id);

drop policy if exists "Service role can manage llm explanations" on public.llm_explanations;
create policy "Service role can manage llm explanations"
  on public.llm_explanations
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Users can read own llm explanations" on public.llm_explanations;
create policy "Users can read own llm explanations"
  on public.llm_explanations
  for select
  using (auth.uid() = user_id);
