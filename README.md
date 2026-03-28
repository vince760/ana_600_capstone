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

## Disclaimer

This application provides financial guidance for informational purposes only. It is not a licensed financial advisor. All projections are estimated based on current data and are not guaranteed.
