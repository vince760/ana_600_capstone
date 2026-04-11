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

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase project (for authentication)

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd ai-financial-assistant
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file with your Supabase credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

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



## Backend 

The `backend/` directory contains the SHED (Survey of Household Economics and Decisionmaking) data analysis pipeline. This pipeline trains a Random Forest model on Federal Reserve survey data to identify the key indicators of consumer financial distress.

### What it does

1. Loads the SHED 2024 public dataset (12,295 respondents, 751 variables)
2. Selects and renames 78 distress-relevant variables using the official SHED codebook definitions
3. Encodes the target variable (B2 — "How well are you managing financially?") using the codebook's numeric codes
4. Converts all feature variables to numeric using codebook-defined scales
5. Handles missing values based on documented survey skip logic (conditional questions, split-ballot design)
6. Trains a Random Forest Regressor to learn which features predict financial distress
7. Outputs ranked feature importances — the distress signals learned from the data

### Key findings

The model identified the top predictors of financial distress (R-squared: 0.64):

| Rank | Feature | Importance |
|------|---------|------------|
| 1 | Money left at end of month | 26.5% |
| 2 | Max emergency expense from savings | 19.9% |
| 3 | Subjective financial stress ("just getting by") | 14.9% |
| 4 | Finances vs. year ago | 4.7% |
| 5 | Financial hopelessness | 3.4% |

### Backend setup

**Prerequisites:** Python 3.9+

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### Running the pipeline

```bash
python distressed_signals.py
```

The script outputs the full pipeline results to the console including target distribution, missing value handling, model performance, and all 67 ranked feature importances.

### Data

The SHED 2024 public dataset (`data/public2024.csv`) and codebook (`data/SHED_2024codebook.pdf`) are sourced from the Federal Reserve Board of Governors:
- Dataset: https://www.federalreserve.gov/consumerscommunities/shed.htm
- Citation: Board of Governors of the Federal Reserve System, Survey of Household Economics and Decisionmaking [dataset] (Washington: Board of Governors, 2025)


