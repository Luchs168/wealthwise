import { PK_CONSTANTS } from '../constants/pkConstants'

export function projectPKCapital(
  currentCapital: number,
  annualContribution: number,
  interestRate: number,
  yearsToRetirement: number,
): number {
  let capital = currentCapital
  for (let year = 0; year < yearsToRetirement; year++) {
    capital = capital * (1 + interestRate) + annualContribution
  }
  return Math.round(capital)
}

export function calculatePKPension(
  projectedCapital: number,
  conversionRate: number,
): { yearly: number; monthly: number } {
  const yearly = Math.round(projectedCapital * conversionRate)
  return { yearly, monthly: Math.round(yearly / 12) }
}

export interface EarlyRetirementImpact {
  normalCapital: number
  earlyCapital: number
  capitalDifference: number
  normalConversionRate: number
  earlyConversionRate: number
  normalMonthlyPension: number
  earlyMonthlyPension: number
  monthlyPensionLoss: number
  yearsLess: number
}

export function calculateEarlyRetirementImpact(
  currentCapital: number,
  annualContribution: number,
  interestRate: number,
  normalRetireAge: number,
  earlyRetireAge: number,
  currentAge: number,
  baseConversionRate: number,
  reductionPerYear = PK_CONSTANTS.EARLY_RETIREMENT_CONVERSION_REDUCTION_PER_YEAR,
): EarlyRetirementImpact {
  const yearsNormal = Math.max(0, normalRetireAge - currentAge)
  const yearsEarly = Math.max(0, earlyRetireAge - currentAge)
  const yearsLess = yearsNormal - yearsEarly

  const normalCapital = projectPKCapital(currentCapital, annualContribution, interestRate, yearsNormal)
  const earlyCapital = projectPKCapital(currentCapital, annualContribution, interestRate, yearsEarly)

  const earlyConversionRate = Math.max(0, baseConversionRate - yearsLess * reductionPerYear)

  const normalPension = calculatePKPension(normalCapital, baseConversionRate)
  const earlyPension = calculatePKPension(earlyCapital, earlyConversionRate)

  return {
    normalCapital,
    earlyCapital,
    capitalDifference: normalCapital - earlyCapital,
    normalConversionRate: baseConversionRate,
    earlyConversionRate,
    normalMonthlyPension: normalPension.monthly,
    earlyMonthlyPension: earlyPension.monthly,
    monthlyPensionLoss: normalPension.monthly - earlyPension.monthly,
    yearsLess,
  }
}

export function calculateBuyInImpact(
  buyInAmount: number,
  conversionRate: number,
  marginalTaxRate: number,
): {
  additionalYearlyPension: number
  additionalMonthlyPension: number
  taxSaving: number
  netCost: number
} {
  const additionalYearly = Math.round(buyInAmount * conversionRate)
  const taxSaving = Math.round(buyInAmount * marginalTaxRate)
  return {
    additionalYearlyPension: additionalYearly,
    additionalMonthlyPension: Math.round(additionalYearly / 12),
    taxSaving,
    netCost: buyInAmount - taxSaving,
  }
}

export function estimateContribution(salary: number, age: number): number {
  const { COORDINATION_DEDUCTION_2026, BVG_MAX_INSURED_SALARY, BVG_CONTRIBUTION_RATES, ENTRY_THRESHOLD_2026 } =
    PK_CONSTANTS

  if (salary < ENTRY_THRESHOLD_2026) return 0

  const insuredSalary = Math.min(
    Math.max(0, salary - COORDINATION_DEDUCTION_2026),
    BVG_MAX_INSURED_SALARY - COORDINATION_DEDUCTION_2026,
  )

  const bracket = BVG_CONTRIBUTION_RATES.find((b) => age >= b.ageFrom && age <= b.ageTo)
  const rate = bracket ? bracket.rate : 0.21

  return Math.round(insuredSalary * rate)
}

export interface PKProjectionPoint {
  age: number
  kapital: number
  beitraege: number
  verzinsung: number
}

export function buildPKProjectionChartData(
  currentCapital: number,
  annualContribution: number,
  interestRate: number,
  currentAge: number,
  retireAge: number,
): PKProjectionPoint[] {
  const data: PKProjectionPoint[] = []
  let capital = currentCapital
  let totalContributions = 0
  let totalInterest = 0

  for (let age = currentAge; age <= retireAge; age++) {
    data.push({
      age,
      kapital: Math.round(capital),
      beitraege: Math.round(totalContributions),
      verzinsung: Math.round(totalInterest),
    })
    if (age < retireAge) {
      const interest = capital * interestRate
      totalInterest += interest
      capital = capital + interest + annualContribution
      totalContributions += annualContribution
    }
  }
  return data
}
