import { BRIDGING_CONSTANTS } from '../constants/bridgingConstants'

export interface BridgingGap {
  gapYears: number
  gapMonths: number
  monthlyIncomeLoss: number
  monthlyPKPension: number
  monthlyNetGap: number
  totalIncomeGap: number
}

export interface AHVNonEmployedContribution {
  assessmentBase: number
  annualContribution: number
  totalForGapYears: number
}

export interface AHVEarlyWithdrawalImpact {
  baseMonthlyPension: number
  reducedMonthlyPension: number
  monthlyReduction: number
  yearlyReduction: number
  yearsEarly: number
  reductionRate: number
  breakEvenAge: number | null
  totalLifetimeLoss: number
}

export interface BridgingFromCapitalResult {
  monthlyGap: number
  totalMonthsTobridge: number
  capitalNeeded: number
  capitalAvailable: number
  isCovered: boolean
  shortfall: number
}

export interface PartTimeImpact {
  partTimePercent: number
  monthlyPartTimeIncome: number
  reducedMonthlyGap: number
  capitalNeededPartTime: number
  capitalSaved: number
}

export interface OptimalBridgingStrategy {
  pillar3aUsed: number
  pillar3aTax: number
  freeCapitalUsed: number
  pkBridgingUsed: number
  totalCovered: number
  remainingGap: number
  avoidAHVEarlyWithdrawal: boolean
  steps: Array<{ source: string; amount: number; note: string }>
}

export interface BridgingChartPoint {
  age: number
  erwerbseinkommen: number
  pkRente: number
  ahvRente: number
  ueberbrueckung: number
  bedarf: number
}

export function calculateBridgingGap(
  retirementAge: number,
  currentIncome: number,
  pkMonthlyPension: number,
  monthlyExpenses: number,
): BridgingGap {
  const { AHV_REGULAR_AGE } = BRIDGING_CONSTANTS
  const gapYears = Math.max(0, AHV_REGULAR_AGE - retirementAge)
  const gapMonths = gapYears * 12
  const monthlyIncomeLoss = Math.round(currentIncome / 12)
  const monthlyNetGap = Math.max(0, monthlyExpenses - pkMonthlyPension)
  const totalIncomeGap = monthlyIncomeLoss * gapMonths

  return {
    gapYears,
    gapMonths,
    monthlyIncomeLoss,
    monthlyPKPension: pkMonthlyPension,
    monthlyNetGap,
    totalIncomeGap,
  }
}

export function calculateAHVContributionNonEmployed(
  wealth: number,
  annualPensionIncome: number,
): AHVNonEmployedContribution {
  const { AHV_NON_EMPLOYED_MIN, AHV_NON_EMPLOYED_MAX, AHV_NON_EMPLOYED_DIVISOR } = BRIDGING_CONSTANTS
  const assessmentBase = wealth + annualPensionIncome * 20
  const rawContribution = Math.round(assessmentBase / AHV_NON_EMPLOYED_DIVISOR)
  const annualContribution = Math.min(AHV_NON_EMPLOYED_MAX, Math.max(AHV_NON_EMPLOYED_MIN, rawContribution))

  return {
    assessmentBase,
    annualContribution,
    totalForGapYears: 0, // set by caller
  }
}

export function calculateAHVEarlyWithdrawalImpact(
  baseMonthlyPension: number,
  yearsEarly: number,
  lifeExpectancy: number,
  regularRetirementAge: number,
): AHVEarlyWithdrawalImpact {
  const { AHV_EARLY_WITHDRAWAL_REDUCTION_PER_YEAR } = BRIDGING_CONSTANTS
  const reductionRate = yearsEarly * AHV_EARLY_WITHDRAWAL_REDUCTION_PER_YEAR
  const reducedMonthlyPension = Math.round(baseMonthlyPension * (1 - reductionRate))
  const monthlyReduction = baseMonthlyPension - reducedMonthlyPension
  const yearlyReduction = monthlyReduction * 12

  // Break-even: extra payments received during early years vs lifetime reduction
  const earlyMonthsExtra = yearsEarly * 12
  const extraReceived = reducedMonthlyPension * earlyMonthsExtra
  const yearsAfterRegular = lifeExpectancy - regularRetirementAge
  const lifetimeLossFromRegularAge = yearlyReduction * yearsAfterRegular
  const breakEvenYearsFromEarlyRetirement = yearsEarly + (lifetimeLossFromRegularAge > 0 ? extraReceived / yearlyReduction : 999)
  const breakEvenAge = breakEvenYearsFromEarlyRetirement < 999
    ? Math.round(regularRetirementAge - yearsEarly + breakEvenYearsFromEarlyRetirement)
    : null

  const totalLifetimeLoss = Math.round(yearlyReduction * yearsAfterRegular)

  return {
    baseMonthlyPension,
    reducedMonthlyPension,
    monthlyReduction,
    yearlyReduction,
    yearsEarly,
    reductionRate,
    breakEvenAge,
    totalLifetimeLoss,
  }
}

export function calculateBridgingFromCapital(
  monthlyGap: number,
  gapMonths: number,
  ahvContributionAnnual: number,
  freeAssets: number,
): BridgingFromCapitalResult {
  const totalAHVContrib = ahvContributionAnnual * (gapMonths / 12)
  const capitalNeeded = Math.round(monthlyGap * gapMonths + totalAHVContrib)

  return {
    monthlyGap,
    totalMonthsTobridge: gapMonths,
    capitalNeeded,
    capitalAvailable: freeAssets,
    isCovered: freeAssets >= capitalNeeded,
    shortfall: Math.max(0, capitalNeeded - freeAssets),
  }
}

export function calculatePartTimeImpact(
  currentIncome: number,
  partTimePercent: number,
  gapMonths: number,
  monthlyExpenses: number,
  pkMonthlyPension: number,
  ahvContributionAnnual: number,
): PartTimeImpact {
  const monthlyPartTimeIncome = Math.round((currentIncome / 12) * (partTimePercent / 100))
  const reducedMonthlyGap = Math.max(0, monthlyExpenses - pkMonthlyPension - monthlyPartTimeIncome)
  const totalAHVContrib = ahvContributionAnnual * (gapMonths / 12)
  const capitalNeededPartTime = Math.round(reducedMonthlyGap * gapMonths + totalAHVContrib)
  const capitalNeededFull = Math.round((monthlyExpenses - pkMonthlyPension) * gapMonths + totalAHVContrib)

  return {
    partTimePercent,
    monthlyPartTimeIncome,
    reducedMonthlyGap,
    capitalNeededPartTime,
    capitalSaved: Math.max(0, capitalNeededFull - capitalNeededPartTime),
  }
}

export function calculateOptimalBridgingStrategy(
  freeAssets: number,
  pillar3aBalance: number,
  pkBridgingMonthly: number,
  monthlyGap: number,
  gapMonths: number,
  ahvContributionAnnual: number,
  marginalTaxRate: number,
): OptimalBridgingStrategy {
  const steps: OptimalBridgingStrategy['steps'] = []
  let remainingGap = Math.round(monthlyGap * gapMonths + ahvContributionAnnual * (gapMonths / 12))

  // Step 1: PK bridging pension if available
  let pkBridgingUsed = 0
  if (pkBridgingMonthly > 0) {
    pkBridgingUsed = pkBridgingMonthly * gapMonths
    remainingGap = Math.max(0, remainingGap - pkBridgingUsed)
    steps.push({ source: 'PK-Überbrückungsrente', amount: pkBridgingUsed, note: 'Reduziert spätere PK-Rente' })
  }

  // Step 2: Pillar 3a (optimal: split across years)
  let pillar3aUsed = 0
  let pillar3aTax = 0
  if (pillar3aBalance > 0 && remainingGap > 0) {
    pillar3aUsed = Math.min(pillar3aBalance, remainingGap)
    pillar3aTax = Math.round(pillar3aUsed * 0.08) // approximate 8% capital withdrawal tax
    remainingGap = Math.max(0, remainingGap - pillar3aUsed)
    steps.push({
      source: 'Säule 3a (gestaffelt)',
      amount: pillar3aUsed,
      note: `Kapitalsteuer ca. CHF ${Math.round(pillar3aTax / 1000)}k · gestaffelt über ${Math.ceil(gapMonths / 12)} Jahre`,
    })
  }

  // Step 3: Free assets
  let freeCapitalUsed = 0
  if (freeAssets > 0 && remainingGap > 0) {
    freeCapitalUsed = Math.min(freeAssets, remainingGap)
    remainingGap = Math.max(0, remainingGap - freeCapitalUsed)
    steps.push({ source: 'Freies Vermögen (Sparkonto)', amount: freeCapitalUsed, note: 'Steuerfrei' })
  }

  const totalCovered = pkBridgingUsed + pillar3aUsed + freeCapitalUsed

  return {
    pillar3aUsed,
    pillar3aTax,
    freeCapitalUsed,
    pkBridgingUsed,
    totalCovered,
    remainingGap,
    avoidAHVEarlyWithdrawal: true,
    steps,
  }
}

export function buildBridgingChartData(
  currentAge: number,
  retirementAge: number,
  ahvStartAge: number,
  currentIncome: number,
  pkMonthlyPension: number,
  ahvMonthlyPension: number,
  monthlyBridging: number,
  monthlyExpenses: number,
): BridgingChartPoint[] {
  const data: BridgingChartPoint[] = []
  const startAge = Math.max(currentAge, retirementAge - 3)
  const endAge = ahvStartAge + 5

  for (let age = startAge; age <= endAge; age++) {
    const isWorking = age < retirementAge
    const hasPK = age >= retirementAge
    const hasAHV = age >= ahvStartAge
    const isBridging = age >= retirementAge && age < ahvStartAge

    data.push({
      age,
      erwerbseinkommen: isWorking ? Math.round(currentIncome / 12) : 0,
      pkRente: hasPK ? pkMonthlyPension : 0,
      ahvRente: hasAHV ? ahvMonthlyPension : 0,
      ueberbrueckung: isBridging ? monthlyBridging : 0,
      bedarf: monthlyExpenses,
    })
  }
  return data
}
