'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getNextStep,
  getPrevStep,
  getStepByRoute,
} from '@/lib/onboarding/steps'

const EMPLOYMENT_OPTIONS = [
  'Employed full-time',
  'Employed part-time',
  'Self-employed',
  'Unemployed',
  'Retired',
  'Student',
]

const MARITAL_OPTIONS = [
  'Single',
  'Married',
  'Domestic partnership',
  'Divorced',
  'Widowed',
]

const HOUSING_OPTIONS = [
  'Own (mortgaged)',
  'Own (outright)',
  'Rent',
  'Live with family',
  'Other',
]

const EDUCATION_OPTIONS = [
  'High school',
  'Some college',
  'Associate degree',
  "Bachelor's degree",
  "Master's degree",
  'Doctorate',
  'Other',
]

interface SelectFieldProps {
  id: string
  label: string
  placeholder: string
  options: string[]
  value: string
  onChange: (v: string) => void
}

function SelectField({ id, label, placeholder, options, value, onChange }: SelectFieldProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <label
        htmlFor={id}
        className="text-[11px] font-bold uppercase tracking-widest text-text-secondary"
      >
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          className="mt-2 h-12 border-slate-200 bg-slate-100 text-base text-navy data-[placeholder]:text-text-muted focus:ring-teal/30"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default function AdditionalContextPage() {
  const [employment, setEmployment] = useState('')
  const [marital, setMarital] = useState('')
  const [housing, setHousing] = useState('')
  const [education, setEducation] = useState('')
  const [notes, setNotes] = useState('')
  const router = useRouter()

  const current = getStepByRoute('/onboarding/additional-context')
  const next = current ? getNextStep(current) : undefined
  const prev = current ? getPrevStep(current) : undefined

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-4xl font-bold tracking-tight text-navy">
        Additional Context
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
        Help us understand the demographics behind the data. This information
        is purely for research and is entirely optional.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <SelectField
          id="employment"
          label="Employment Status"
          placeholder="Select status..."
          options={EMPLOYMENT_OPTIONS}
          value={employment}
          onChange={setEmployment}
        />
        <SelectField
          id="marital"
          label="Marital Status"
          placeholder="Select status..."
          options={MARITAL_OPTIONS}
          value={marital}
          onChange={setMarital}
        />
        <SelectField
          id="housing"
          label="Housing Status"
          placeholder="Select status..."
          options={HOUSING_OPTIONS}
          value={housing}
          onChange={setHousing}
        />

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="notes"
            className="text-[11px] font-bold uppercase tracking-widest text-text-secondary"
          >
            Optional Research Notes
          </label>
          <textarea
            id="notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Is there anything else you think we should know about your current financial environment?"
            className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-slate-100 p-3 text-sm text-navy placeholder:text-text-muted focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
          />
        </div>

        <SelectField
          id="education"
          label="Education Level"
          placeholder="Select level..."
          options={EDUCATION_OPTIONS}
          value={education}
          onChange={setEducation}
        />

        <div className="flex items-start gap-3 rounded-xl border-l-4 border-mint bg-white p-5 shadow-sm">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
          <div>
            <p className="text-sm font-bold text-navy">Why we ask this</p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              Demographic context helps us study how different groups respond
              to AI explanations. Your responses remain anonymous and are
              never used for credit or eligibility decisions.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {prev && (
            <button
              type="button"
              onClick={() => router.push(prev.route)}
              className="text-sm font-medium text-text-secondary hover:text-navy"
            >
              &larr; Back
            </button>
          )}
          <span className="text-xs text-text-muted">
            Step 6 of 9 &middot; Optional Context
          </span>
        </div>

        <Button
          type="button"
          onClick={() => next && router.push(next.route)}
          disabled={!next}
          className="h-12 gap-2 rounded-full bg-navy px-6 text-sm font-semibold text-white hover:bg-navyMid disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
