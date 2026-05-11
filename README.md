# FinSight AI

An AI-powered financial decision-support assistant that helps users gain clarity over their personal finances through machine learning forecasting, risk prediction, and Monte Carlo simulation.

## Features

- **Transaction Upload & Categorization** - Upload bank statements (CSV/Excel) with AI-powered NLP categorization
- **Cash Flow Forecasting** - 30/60/90-day projections with confidence intervals from Monte Carlo simulations
- **Risk Prediction** - Transparent risk scoring with SHAP-attributed drivers showing exactly what factors affect your financial risk
- **Scenario Simulator** - Test financial decisions (lump-sum payments, savings changes, windfalls) and see projected outcomes
- **AI Assistant** - Plain-language chat interface that translates complex model outputs into actionable guidance

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **Charts:** Recharts
- **Auth:** Supabase Auth
- **File Parsing:** PapaParse (CSV), SheetJS (XLS/XLSX)
- **Backend API:** FastAPI
- **Modeling:** Python, scikit-learn, XGBoost, SHAP
- **Persistence:** Supabase
- **LLM Explanations:** Anthropic Claude

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase project (for authentication)
- Python 3.9+ for the backend API/model pipeline
- An Anthropic API key if testing Claude explanations

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd <repo-directory>
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy [.env.example](.env.example) and create the env files you need:

   - `.env.local` for the Next.js frontend
   - `.env` for the Python backend API

4. Add your frontend Supabase credentials to `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

5. If you want Supabase-backed backend persistence instead of the default
   in-memory mode, add backend values to `.env` such as:

   ```env
   FINSIGHT_STORE_BACKEND=supabase
   FINSIGHT_AUTH_MODE=supabase
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
  app/
    (auth)/          # Login and signup pages
    (protected)/     # Authenticated routes (dashboard, forecast, risk, simulator, assistant)
    page.tsx         # Landing page
  components/
    app-shell/       # Sidebar, mobile nav, layout shell
    dashboard/       # Dashboard section components
    forecast/        # Forecast page components
    risk/            # Risk score and SHAP visualization components
    simulator/       # Scenario simulator components
    ui/              # shadcn/ui primitives
  contexts/          # Auth context provider
  lib/               # Utilities, Supabase client, mock data
  types/             # Shared TypeScript type definitions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Backend Docs

- [CLI Commands](docs/cli-commands.md) - Machine-agnostic command reference for exporting the model, running tests, and starting the API
- [Frontend API Handoff](docs/frontend-api-handoff.md) - Current endpoints, auth expectations, assessment payloads, simulations, explanations, and survey submission
- [Backend Deployment: Heroku](docs/backend-deploy-heroku.md) - Deploy the FastAPI backend separately from the Vercel frontend, including GitHub Actions CI/CD
- [Phase 4 Persistence and Experiments](docs/phase-04-persistence-and-experiments.md) - Supabase persistence, experiment assignment, and survey tracking setup
- [Phase 5 Claude Explanations](docs/phase-05-llm-explanations.md) - Anthropic-backed explanation generation, logging, and env setup

## Backend API and Model Pipeline

The `backend/` directory contains the SCF expenshilo modeling pipeline and the
FastAPI assessment service used by the frontend onboarding/results flow.

### What it does

1. Loads the Survey of Consumer Finances extract used for the capstone model.
2. Engineers household financial features such as debt-to-income,
   payment-to-income, liquid-assets-to-income, grocery spend, dining spend, and
   child count.
3. Trains and compares Logistic Regression, Random Forest, XGBoost, and MLP
   classifiers.
4. Selects the best prediction model by cross-validated AUC and exports a
   reusable inference artifact.
5. Serves calibrated expenshilo probabilities and ranked SHAP drivers through a
   FastAPI API.
6. Stores assessment inputs, model outputs, explanation payloads, experiment
   assignments, and survey responses in Supabase.
7. Uses Claude for the LLM explanation arm while preserving deterministic factor
   cards and recommendation scenarios for frontend rendering.

### Backend setup

**Prerequisites:** Python 3.9+

```bash
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate

python -m pip install -r backend/requirements.txt
```

Run the remaining backend commands from the repo root unless the command
explicitly changes directories.

### Exporting the model artifact

```bash
python backend/train_expenshilo_artifact.py
```

The API expects:

```text
backend/artifacts/expenshilo_artifact.pkl
```

### Running the API

```bash
python backend/run_api.py
```

Open the local API docs at:

```text
http://127.0.0.1:8000/docs
```

### Running the research pipeline

```bash
cd backend
python scf_spending_pipeline.py
```

The script writes charts, model comparison outputs, and SHAP analysis artifacts
to `backend/outputs`.

### Data

The current expenshilo model artifact is based on the Survey of Consumer
Finances data extract in `backend/data/SCFP2022.csv`.

