export const LIFE_EXPECTANCY_MALE_65 = 85
export const LIFE_EXPECTANCY_FEMALE_65 = 87
export const SURVIVOR_PENSION_RATE = 0.60

export interface RvKChartPoint {
  age: number
  kapital: number
  kumuliertRente: number
}

export interface MixedVariantResult {
  kapitalPortion: number
  kapitalAfterTax: number
  rentePortion: number
  annualRente: number
  monthlyRente: number
}

export interface SurvivorBenefits {
  survivorPensionMonthly: number
  survivorPensionYearly: number
  inheritableCapital: number
}

export interface ScenarioResult {
  label: string
  returnRate: number
  breakEvenAge: number | null
  capitalAt80: number
  capitalAt85: number
  capitalAt90: number
}

export function calculateBreakEvenAge(
  capitalAfterTax: number,
  annualPension: number,
  returnRate: number,
  retirementAge: number,
): number | null {
  let capital = capitalAfterTax
  for (let year = 0; year < 50; year++) {
    capital = capital * (1 + returnRate) - annualPension
    if (capital <= 0) return retirementAge + year + 1
  }
  return null
}

export function calculateInheritableAmount(
  capitalAfterTax: number,
  annualWithdrawal: number,
  returnRate: number,
  years: number,
): number {
  let capital = capitalAfterTax
  for (let y = 0; y < years; y++) {
    capital = capital * (1 + returnRate) - annualWithdrawal
    if (capital <= 0) return 0
  }
  return Math.max(0, Math.round(capital))
}

export function calculateMixedVariant(
  totalCapital: number,
  percentKapital: number,
  conversionRate: number,
  totalCapitalTaxRate: number,
  returnRate: number,
  retirementAge: number,
): MixedVariantResult {
  const kapitalPortion = Math.round(totalCapital * (percentKapital / 100))
  const rentePortion = totalCapital - kapitalPortion
  const kapitalAfterTax = Math.round(kapitalPortion * (1 - totalCapitalTaxRate))
  const annualRente = Math.round(rentePortion * conversionRate)

  return {
    kapitalPortion,
    kapitalAfterTax,
    rentePortion,
    annualRente,
    monthlyRente: Math.round(annualRente / 12),
  }
}

export function buildRvKChartData(
  capitalAfterTax: number,
  annualPension: number,
  returnRate: number,
  retirementAge: number,
): RvKChartPoint[] {
  const data: RvKChartPoint[] = []
  let capital = capitalAfterTax
  let kumuliert = 0

  for (let year = 0; year <= 40; year++) {
    const age = retirementAge + year
    data.push({
      age,
      kapital: Math.max(0, Math.round(capital)),
      kumuliertRente: Math.round(kumuliert),
    })
    if (capital > 0) {
      capital = capital * (1 + returnRate) - annualPension
      kumuliert += annualPension
    } else {
      kumuliert += annualPension
    }
  }
  return data
}

export function calculateSurvivorBenefits(
  annualPension: number,
  capitalAfterTax: number,
  annualWithdrawal: number,
  returnRate: number,
  yearsToLifeExpectancy: number,
): SurvivorBenefits {
  const survivorPensionYearly = Math.round(annualPension * SURVIVOR_PENSION_RATE)
  const inheritableCapital = calculateInheritableAmount(
    capitalAfterTax,
    annualWithdrawal,
    returnRate,
    Math.round(yearsToLifeExpectancy / 2),
  )

  return {
    survivorPensionMonthly: Math.round(survivorPensionYearly / 12),
    survivorPensionYearly,
    inheritableCapital,
  }
}

export function buildScenarios(
  capitalAfterTax: number,
  annualPension: number,
  retirementAge: number,
): ScenarioResult[] {
  const scenarios = [
    { label: 'Pessimistisch', returnRate: 0.0 },
    { label: 'Realistisch', returnRate: 0.02 },
    { label: 'Optimistisch', returnRate: 0.04 },
  ]

  return scenarios.map(({ label, returnRate }) => {
    const breakEvenAge = calculateBreakEvenAge(capitalAfterTax, annualPension, returnRate, retirementAge)

    const calcCapitalAt = (targetAge: number) => {
      let cap = capitalAfterTax
      const years = targetAge - retirementAge
      for (let y = 0; y < years; y++) {
        cap = cap * (1 + returnRate) - annualPension
        if (cap <= 0) return 0
      }
      return Math.max(0, Math.round(cap))
    }

    return {
      label,
      returnRate,
      breakEvenAge,
      capitalAt80: calcCapitalAt(80),
      capitalAt85: calcCapitalAt(85),
      capitalAt90: calcCapitalAt(90),
    }
  })
}
