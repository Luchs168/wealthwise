export interface YearlyProjection {
  year: number
  age: number
  wealthStart: number
  returns: number
  withdrawal: number
  wealthEnd: number
  depleted: boolean
}

export interface DepletionScenario {
  label: string
  returnRate: number
  inflationRate: number
  monthlyWithdrawal: number
  depletionAge: number | null
  projections: YearlyProjection[]
}

export interface WithdrawalStrategies {
  constantNominal: { monthlyAmount: number; depletionAge: number | null }
  inflationAdjusted: { monthlyAmount: number; depletionAge: number | null }
  percentRule4: { firstYearMonthly: number; depletionAge: number | null }
  percentRule35: { monthlyAmount: number; depletionAge: number | null }
  sustainableForever: { monthlyAmount: number }
  toAge90: { monthlyAmount: number }
  toAge95: { monthlyAmount: number }
}

export interface SensitivityResult {
  factor: string
  baseAge: number | null
  lowAge: number | null
  highAge: number | null
  lowDelta: number
  highDelta: number
  lowLabel: string
  highLabel: string
}

export interface ELEligibility {
  eligible: boolean
  estimatedMonthlyEL: number
  annualNeeds: number
  annualIncome: number
  eligibleFromAge: number | null
}

export function calculateWealthDepletion(
  initialWealth: number,
  monthlyWithdrawal: number,
  returnRate: number,
  inflationRate: number,
  retirementAge: number,
  adjustForInflation: boolean,
  maxYears = 35,
): YearlyProjection[] {
  let wealth = initialWealth
  let annualWithdrawal = monthlyWithdrawal * 12
  const projections: YearlyProjection[] = []

  for (let year = 0; year <= maxYears; year++) {
    const wealthStart = wealth
    const returns = Math.max(0, wealth * returnRate)
    const currentWithdrawal = Math.min(annualWithdrawal, wealth + returns)

    wealth = wealth + returns - currentWithdrawal

    projections.push({
      year,
      age: retirementAge + year,
      wealthStart: Math.max(0, wealthStart),
      returns: Math.round(returns),
      withdrawal: Math.round(currentWithdrawal),
      wealthEnd: Math.max(0, Math.round(wealth)),
      depleted: wealth <= 0,
    })

    if (wealth <= 0) break

    if (adjustForInflation) {
      annualWithdrawal = annualWithdrawal * (1 + inflationRate)
    }
  }

  return projections
}

export function calculateDepletionAge(
  initialWealth: number,
  monthlyWithdrawal: number,
  returnRate: number,
  inflationRate: number,
  retirementAge: number,
  adjustForInflation = false,
): number | null {
  const projections = calculateWealthDepletion(
    initialWealth, monthlyWithdrawal, returnRate, inflationRate, retirementAge, adjustForInflation, 40,
  )
  const depleted = projections.find(p => p.depleted)
  return depleted ? depleted.age : null
}

export function calculateSustainableWithdrawal(
  wealth: number,
  targetAge: number,
  retirementAge: number,
  returnRate: number,
  inflationRate: number,
): number {
  if (wealth <= 0) return 0
  const years = targetAge - retirementAge
  if (years <= 0) return 0

  // Binary search for monthly withdrawal that depletes at exactly targetAge
  let low = 0
  let high = wealth / 12

  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2
    const age = calculateDepletionAge(wealth, mid, returnRate, inflationRate, retirementAge, true)
    if (age === null) {
      low = mid
    } else if (age < targetAge) {
      high = mid
    } else {
      low = mid
    }
    if (high - low < 1) break
  }

  return Math.round(low)
}

export function calculateWithdrawalStrategies(
  initialWealth: number,
  monthlyGap: number,
  returnRate: number,
  retirementAge: number,
): WithdrawalStrategies {
  const inflationRate = 0.015

  const depletionConstant = calculateDepletionAge(initialWealth, monthlyGap, returnRate, 0, retirementAge, false)
  const depletionInflation = calculateDepletionAge(initialWealth, monthlyGap, inflationRate, inflationRate, retirementAge, true)
  const percent4monthly = Math.round((initialWealth * 0.04) / 12)
  const depletion4 = calculateDepletionAge(initialWealth, percent4monthly, returnRate, 0, retirementAge, false)
  const percent35monthly = Math.round((initialWealth * 0.035) / 12)
  const sustainableForever = Math.round((initialWealth * returnRate) / 12)

  const toAge90 = calculateSustainableWithdrawal(initialWealth, 90, retirementAge, returnRate, inflationRate)
  const toAge95 = calculateSustainableWithdrawal(initialWealth, 95, retirementAge, returnRate, inflationRate)

  return {
    constantNominal: { monthlyAmount: monthlyGap, depletionAge: depletionConstant },
    inflationAdjusted: { monthlyAmount: monthlyGap, depletionAge: depletionInflation },
    percentRule4: { firstYearMonthly: percent4monthly, depletionAge: depletion4 },
    percentRule35: { monthlyAmount: percent35monthly, depletionAge: calculateDepletionAge(initialWealth, percent35monthly, returnRate, 0, retirementAge, false) },
    sustainableForever: { monthlyAmount: sustainableForever },
    toAge90: { monthlyAmount: toAge90 },
    toAge95: { monthlyAmount: toAge95 },
  }
}

export function buildDepletionScenarios(
  initialWealth: number,
  monthlyWithdrawal: number,
  retirementAge: number,
): DepletionScenario[] {
  const scenarios = [
    { label: 'Optimistisch', returnRate: 0.04, inflationRate: 0.01, withdrawalFactor: 0.9 },
    { label: 'Realistisch', returnRate: 0.035, inflationRate: 0.015, withdrawalFactor: 1.0 },
    { label: 'Pessimistisch', returnRate: 0.0, inflationRate: 0.02, withdrawalFactor: 1.1 },
  ]

  return scenarios.map(s => {
    const adj = Math.round(monthlyWithdrawal * s.withdrawalFactor)
    const projections = calculateWealthDepletion(
      initialWealth, adj, s.returnRate, s.inflationRate, retirementAge,
      s.label === 'Pessimistisch', 40,
    )
    const depleted = projections.find(p => p.depleted)
    return {
      label: s.label,
      returnRate: s.returnRate,
      inflationRate: s.inflationRate,
      monthlyWithdrawal: adj,
      depletionAge: depleted ? depleted.age : null,
      projections,
    }
  })
}

export function calculateSensitivity(
  initialWealth: number,
  monthlyWithdrawal: number,
  returnRate: number,
  retirementAge: number,
): SensitivityResult[] {
  const base = calculateDepletionAge(initialWealth, monthlyWithdrawal, returnRate, 0.015, retirementAge, false)

  const calc = (w: number, m: number, r: number, inf: number, infl: boolean) =>
    calculateDepletionAge(w, m, r, inf, retirementAge, infl)

  const delta = (alt: number | null) => {
    if (base === null && alt === null) return 0
    if (base === null) return -(alt ?? 0)
    if (alt === null) return 99 - base
    return alt - base
  }

  return [
    {
      factor: 'Monatliche Entnahme',
      baseAge: base,
      lowAge: calc(initialWealth, monthlyWithdrawal - 500, returnRate, 0.015, false),
      highAge: calc(initialWealth, monthlyWithdrawal + 500, returnRate, 0.015, false),
      lowDelta: delta(calc(initialWealth, monthlyWithdrawal - 500, returnRate, 0.015, false)),
      highDelta: delta(calc(initialWealth, monthlyWithdrawal + 500, returnRate, 0.015, false)),
      lowLabel: '–CHF 500/Mt.',
      highLabel: '+CHF 500/Mt.',
    },
    {
      factor: 'Rendite',
      baseAge: base,
      lowAge: calc(initialWealth, monthlyWithdrawal, Math.max(0, returnRate - 0.02), 0.015, false),
      highAge: calc(initialWealth, monthlyWithdrawal, returnRate + 0.02, 0.015, false),
      lowDelta: delta(calc(initialWealth, monthlyWithdrawal, Math.max(0, returnRate - 0.02), 0.015, false)),
      highDelta: delta(calc(initialWealth, monthlyWithdrawal, returnRate + 0.02, 0.015, false)),
      lowLabel: `–2% (${((returnRate - 0.02) * 100).toFixed(1)}%)`,
      highLabel: `+2% (${((returnRate + 0.02) * 100).toFixed(1)}%)`,
    },
    {
      factor: 'Inflation',
      baseAge: base,
      lowAge: calc(initialWealth, monthlyWithdrawal, returnRate, 0.005, false),
      highAge: calc(initialWealth, monthlyWithdrawal, returnRate, 0.025, false),
      lowDelta: delta(calc(initialWealth, monthlyWithdrawal, returnRate, 0.005, false)),
      highDelta: delta(calc(initialWealth, monthlyWithdrawal, returnRate, 0.025, false)),
      lowLabel: '0.5% Inflation',
      highLabel: '2.5% Inflation',
    },
    {
      factor: 'Startkapital',
      baseAge: base,
      lowAge: calc(Math.round(initialWealth * 0.7), monthlyWithdrawal, returnRate, 0.015, false),
      highAge: calc(Math.round(initialWealth * 1.3), monthlyWithdrawal, returnRate, 0.015, false),
      lowDelta: delta(calc(Math.round(initialWealth * 0.7), monthlyWithdrawal, returnRate, 0.015, false)),
      highDelta: delta(calc(Math.round(initialWealth * 1.3), monthlyWithdrawal, returnRate, 0.015, false)),
      lowLabel: '–30% Schock',
      highLabel: '+30% Erbschaft',
    },
  ]
}

export function calculateELEligibility(
  annualAHV: number,
  annualPK: number,
  freeWealth: number,
  isCouple: boolean,
  canton: string,
): ELEligibility {
  const { WEALTH_CONSTANTS } = { WEALTH_CONSTANTS: {
    EL_LIVING_EXPENSES_SINGLE: 20100,
    EL_LIVING_EXPENSES_COUPLE: 30150,
    EL_RENT_SINGLE: 17580,
    EL_RENT_COUPLE: 26400,
    EL_HEALTH_INSURANCE_DEDUCTION: 6700,
    EL_WEALTH_EXEMPTION_SINGLE: 37500,
    EL_WEALTH_EXEMPTION_COUPLE: 60000,
    EL_WEALTH_CONSUMPTION_RATE: 0.10,
  }}

  const livingExp = isCouple ? WEALTH_CONSTANTS.EL_LIVING_EXPENSES_COUPLE : WEALTH_CONSTANTS.EL_LIVING_EXPENSES_SINGLE
  const rentAllowance = isCouple ? WEALTH_CONSTANTS.EL_RENT_COUPLE : WEALTH_CONSTANTS.EL_RENT_SINGLE
  const wealthExemption = isCouple ? WEALTH_CONSTANTS.EL_WEALTH_EXEMPTION_COUPLE : WEALTH_CONSTANTS.EL_WEALTH_EXEMPTION_SINGLE

  const annualNeeds = livingExp + rentAllowance + WEALTH_CONSTANTS.EL_HEALTH_INSURANCE_DEDUCTION

  const countableWealth = Math.max(0, freeWealth - wealthExemption)
  const wealthIncome = countableWealth * WEALTH_CONSTANTS.EL_WEALTH_CONSUMPTION_RATE
  const annualIncome = annualAHV + annualPK + wealthIncome

  const annualDeficit = annualNeeds - annualIncome
  const eligible = annualDeficit > 0

  return {
    eligible,
    estimatedMonthlyEL: eligible ? Math.round(annualDeficit / 12) : 0,
    annualNeeds,
    annualIncome,
    eligibleFromAge: null,
  }
}

export function buildScenarioChartData(
  scenarios: DepletionScenario[],
  retirementAge: number,
): Array<Record<string, number>> {
  const maxAge = 100
  const result: Array<Record<string, number>> = []

  for (let age = retirementAge; age <= maxAge; age++) {
    const row: Record<string, number> = { age }
    for (const s of scenarios) {
      const point = s.projections.find(p => p.age === age)
      row[s.label] = point ? point.wealthEnd : 0
    }
    result.push(row)
  }

  return result
}
