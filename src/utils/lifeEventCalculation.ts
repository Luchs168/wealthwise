import { CATEGORY_CONFIG } from '../types/lifeEvents'
import type { LifeEvent } from '../types/lifeEvents'

export interface YearlyEventImpact {
  year: number
  amount: number  // positive = inflow, negative = outflow
  label: string
  icon: string
  category: string
}

export function expandEventsToYears(events: LifeEvent[]): YearlyEventImpact[] {
  const result: YearlyEventImpact[] = []
  for (const evt of events) {
    if (!evt.enabled || evt.amount <= 0) continue
    const sign = evt.art === 'einnahme' ? 1 : -1
    const cfg = CATEGORY_CONFIG[evt.category]

    if (evt.art === 'laufend' && evt.duration > 0) {
      for (let y = 0; y < evt.duration; y++) {
        result.push({
          year: evt.year + y,
          amount: sign * evt.amount,
          label: evt.details.customLabel || cfg.label,
          icon: cfg.icon,
          category: evt.category,
        })
      }
    } else {
      result.push({
        year: evt.year,
        amount: sign * evt.amount,
        label: evt.details.customLabel || cfg.label,
        icon: cfg.icon,
        category: evt.category,
      })
    }
  }
  return result
}

export function applyEventsToProjection<T extends { year: number; age: number; wealthEndOfYear: number }>(
  cashflow: T[],
  events: LifeEvent[],
): Array<T & { eventAmount: number }> {
  const impacts = expandEventsToYears(events)

  const byYear = new Map<number, number>()
  for (const impact of impacts) {
    byYear.set(impact.year, (byYear.get(impact.year) ?? 0) + impact.amount)
  }

  let cumulative = 0
  return cashflow.map(row => {
    const delta = byYear.get(row.year) ?? 0
    cumulative += delta
    return { ...row, wealthEndOfYear: row.wealthEndOfYear + cumulative, eventAmount: delta }
  })
}

export function calculatePKReductionFromWithdrawal(
  withdrawalAmount: number,
  yearsToRetirement: number,
  conversionRate: number,
): number {
  // Capital lost compounds at ~2% p.a. until retirement
  const capitalLost = withdrawalAmount * Math.pow(1.02, Math.max(0, yearsToRetirement))
  return Math.round((capitalLost * (conversionRate / 100)) / 12)
}

export function calculateMortgageAffordability(
  grossIncome: number,
  mortgageAmount: number,
  interestRate: number,
): { annualCost: number; incomeRatio: number; affordable: boolean; monthlyCost: number } {
  const interest = mortgageAmount * (interestRate / 100)
  const maintenance = mortgageAmount * 0.01
  const amortisation = mortgageAmount * 0.01
  const totalAnnual = interest + maintenance + amortisation
  return {
    annualCost: Math.round(totalAnnual),
    incomeRatio: grossIncome > 0 ? totalAnnual / grossIncome : 0,
    affordable: grossIncome > 0 && totalAnnual / grossIncome <= 0.33,
    monthlyCost: Math.round(totalAnnual / 12),
  }
}

export interface EventImpactSummary {
  totalOutflow: number
  totalInflow: number
  netImpact: number
  beforeRetirement: number
  afterRetirement: number
  enabledCount: number
}

export function getEventImpactSummary(events: LifeEvent[], retirementYear: number): EventImpactSummary {
  const enabled = events.filter(e => e.enabled && e.amount > 0)
  let totalOutflow = 0
  let totalInflow = 0
  let beforeRetirement = 0
  let afterRetirement = 0

  for (const evt of enabled) {
    const years = evt.art === 'laufend' ? (evt.duration || 1) : 1
    const total = evt.amount * years

    if (evt.art === 'einnahme') {
      totalInflow += total
    } else {
      totalOutflow += total
      // Portion before retirement
      if (evt.year < retirementYear) {
        const yearsBeforeRetirement = Math.min(years, retirementYear - evt.year)
        beforeRetirement += evt.amount * yearsBeforeRetirement
        const remaining = years - yearsBeforeRetirement
        if (remaining > 0) afterRetirement += evt.amount * remaining
      } else {
        afterRetirement += total
      }
    }
  }

  return {
    totalOutflow,
    totalInflow,
    netImpact: totalInflow - totalOutflow,
    beforeRetirement,
    afterRetirement,
    enabledCount: enabled.length,
  }
}
