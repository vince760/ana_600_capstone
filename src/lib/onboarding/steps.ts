export type OnboardingSection = 'Identity' | 'Research' | 'Profile' | 'Finances' | 'Review'

export interface OnboardingStep {
  id: string
  index: number
  total: number
  route: string
  title: string
  section: OnboardingSection
}

export const TOTAL_STEPS = 9

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'research-consent',
    index: 2,
    total: TOTAL_STEPS,
    route: '/onboarding/research-consent',
    title: 'Research Participation & Consent',
    section: 'Research',
  },
  {
    id: 'household-basics',
    index: 3,
    total: TOTAL_STEPS,
    route: '/onboarding/household-basics',
    title: 'Household Basics',
    section: 'Profile',
  },
  {
    id: 'income-debt',
    index: 4,
    total: TOTAL_STEPS,
    route: '/onboarding/income-debt',
    title: 'Income & Debt Baseline',
    section: 'Finances',
  },
  {
    id: 'savings-spending',
    index: 5,
    total: TOTAL_STEPS,
    route: '/onboarding/savings-spending',
    title: 'Savings & Spending',
    section: 'Finances',
  },
  {
    id: 'additional-context',
    index: 6,
    total: TOTAL_STEPS,
    route: '/onboarding/additional-context',
    title: 'Additional Context',
    section: 'Profile',
  },
]

export const ONBOARDING_SECTIONS: OnboardingSection[] = [
  'Identity',
  'Research',
  'Profile',
  'Finances',
  'Review',
]

export const FIRST_ONBOARDING_ROUTE = ONBOARDING_STEPS[0].route

export function getStepByRoute(pathname: string): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find((step) => step.route === pathname)
}

export function getNextStep(current: OnboardingStep): OnboardingStep | undefined {
  const idx = ONBOARDING_STEPS.findIndex((s) => s.id === current.id)
  return idx >= 0 ? ONBOARDING_STEPS[idx + 1] : undefined
}

export function getPrevStep(current: OnboardingStep): OnboardingStep | undefined {
  const idx = ONBOARDING_STEPS.findIndex((s) => s.id === current.id)
  return idx > 0 ? ONBOARDING_STEPS[idx - 1] : undefined
}
