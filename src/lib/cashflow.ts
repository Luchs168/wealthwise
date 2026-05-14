import {
  CONSTANTS,
  calculateAge,
  calculatePkHousehold,
} from './calc'
import type { AhvPersonResult } from './calc'
import {
  calculateAHVPension,
  applyPlafonierung,
  computeKZGAdjustedIncome,
} from '../utils/ahvCalculation'
import {
  calculateRetirementTax,
  calculateIncomeTax,
  calculateCapitalWithdrawalTax as calculateCapitalTax,
} from './tax'
import type { TaxCivilStatus } from './tax'

export interface CashflowInput {
  person1: {
    birthDate?: string
    retirementAge?: number
    retireAge?: number
    grossIncome?: number
    income?: number
    pkCapitalAt65?: number
    pkCapital?: number
    pkConversionRate?: number
    pkRate?: number
    pkBezugsart?: string
    pkKapitalanteil?: number
    has3a?: boolean
    pillar3aBalance?: number
    balance3a?: number
    ahvContributionYears?: number
    ahvContributionGaps?: number
    ahvBezugAge?: number
    gender?: string
    sex?: string
    dob?: string
    hasFZ?: boolean
    fzBalance?: number
    hasKZG?: boolean
    kzgChildren?: number
    kzgYears?: number
    employmentStatus?: string
    businessValue?: number
    businessSaleYear?: number
    foreignPensionMonthly?: number
    [key: string]: unknown
  }
  person2?: {
    birthDate?: string
    retirementAge?: number
    retireAge?: number
    grossIncome?: number
    income?: number
    pkCapitalAt65?: number
    pkCapital?: number
    pkConversionRate?: number
    pkRate?: number
    pkBezugsart?: string
    pkKapitalanteil?: number
    has3a?: boolean
    pillar3aBalance?: number
    balance3a?: number
    ahvContributionYears?: number
    ahvContributionGaps?: number
    ahvBezugAge?: number
    gender?: string
    sex?: string
    dob?: string
    hasFZ?: boolean
    fzBalance?: number
    hasKZG?: boolean
    kzgChildren?: number
    kzgYears?: number
    [key: string]: unknown
  } | null
  civilStatus?: string
  canton?: string
  kirchensteuer?: boolean
  inflationRate?: number
  investmentReturn?: number
  riskProfile?: 'conservative' | 'balanced' | 'growth'
  endAge?: number
  freeAssets?: number
  sparkonto?: number
  wertschriften?: number
  monthlyExpenses?: number
  hasProperty?: boolean
  monthlyMortgageCost?: number
  propertyValue?: number
  hypothekZinssatz?: number
}

function normalizeP(p: CashflowInput['person1']) {
  return {
    ...p,
    retirementAge: p.retirementAge || p.retireAge || 65,
    grossIncome: p.grossIncome || p.income || 0,
    pkCapitalAt65: p.pkCapitalAt65 || p.pkCapital || 0,
    pkConversionRate: p.pkConversionRate || (p.pkRate ? Number(p.pkRate) : 5.4),
    pillar3aBalance: p.pillar3aBalance || p.balance3a || 0,
    birthDate: p.birthDate || p.dob || '',
    gender: p.gender || p.sex || 'm',
    ahvBezugAge: p.ahvBezugAge || p.retirementAge || p.retireAge || 65,
    hasFZ: p.hasFZ ?? false,
    fzBalance: p.fzBalance ?? 0,
    hasKZG: p.hasKZG ?? false,
    kzgChildren: p.kzgChildren ?? 0,
    kzgYears: p.kzgYears ?? 0,
  }
}

// ─── AHV household calculation using correct 2026 values ─────────────────────

export interface AhvHouseholdCalc {
  person1: { monthlyRente: number; yearlyRente: number; yearlyInkl13: number; avgIncomeUsed: number }
  person2: { monthlyRente: number; yearlyRente: number; yearlyInkl13: number; avgIncomeUsed: number } | null
  combinedMonthly: number
  combinedYearly: number
  combinedYearlyInkl13: number
  plafonReduction: number
}

function buildAhvHousehold(
  p1: ReturnType<typeof normalizeP>,
  p2: ReturnType<typeof normalizeP> | null,
  civilStatus: string,
): AhvHouseholdCalc {
  const FULL_YEARS = 44
  const retire1 = p1.retirementAge || p1.retireAge || 65
  const baseYears1 = Math.min(FULL_YEARS, Math.max(0, retire1 - 21))
  const years1 = Math.max(0, baseYears1 - (p1.ahvContributionGaps || 0))
  const bezug1 = Math.min(70, Math.max(63, p1.ahvBezugAge || retire1))
  const avgIncome1 = computeKZGAdjustedIncome(p1.grossIncome || 0, years1, p1.hasKZG, p1.kzgChildren, p1.kzgYears, civilStatus)

  const r1 = calculateAHVPension({ avgIncome: avgIncome1, bezugAge: bezug1, effectiveContributionYears: years1 })

  let r2Monthly = 0
  let r2Income = 0
  let r2Result: AhvHouseholdCalc['person2'] = null

  if (p2) {
    const retire2 = p2.retirementAge || p2.retireAge || 65
    const baseYears2 = Math.min(FULL_YEARS, Math.max(0, retire2 - 21))
    const years2 = Math.max(0, baseYears2 - (p2.ahvContributionGaps || 0))
    const bezug2 = Math.min(70, Math.max(63, p2.ahvBezugAge || retire2))
    const avgIncome2 = computeKZGAdjustedIncome(p2.grossIncome || 0, years2, p2.hasKZG, p2.kzgChildren, p2.kzgYears, civilStatus)
    const r2raw = calculateAHVPension({ avgIncome: avgIncome2, bezugAge: bezug2, effectiveContributionYears: years2 })
    r2Monthly = r2raw.monthlyRente
    r2Income = p2.grossIncome || 0
    r2Result = { monthlyRente: r2raw.monthlyRente, yearlyRente: r2raw.yearlyRente, yearlyInkl13: r2raw.yearlyInkl13, avgIncomeUsed: r2Income }
  }

  const plafon = applyPlafonierung(r1.monthlyRente, r2Monthly, civilStatus)

  const m1 = plafon.monthly1
  const m2 = plafon.monthly2

  if (r2Result) r2Result = { monthlyRente: m2, yearlyRente: m2 * 12, yearlyInkl13: m2 * 13, avgIncomeUsed: r2Income }

  const combinedMonthly = m1 + m2
  return {
    person1: { monthlyRente: m1, yearlyRente: m1 * 12, yearlyInkl13: m1 * 13, avgIncomeUsed: p1.grossIncome || 0 },
    person2: r2Result,
    combinedMonthly,
    combinedYearly: combinedMonthly * 12,
    combinedYearlyInkl13: combinedMonthly * 13,
    plafonReduction: plafon.plafonReduction,
  }
}

export interface CashflowRow {
  year: number
  age: number
  employmentIncome: number
  ahvIncome: number
  pkRenteIncome: number
  pkKapitalWithdrawal: number
  pillar3aWithdrawal: number
  assetIncome: number
  assetConsumption: number
  businessProceeds: number
  totalIncome: number
  livingExpenses: number
  mortgageCosts: number
  taxes: number
  totalExpenses: number
  wealthEndOfYear: number
  isRetirementYear: boolean
  isCapitalWithdrawalYear: boolean
}

export function calculateYearlyCashflow(data: CashflowInput): CashflowRow[] {
  const p1raw = normalizeP(data.person1)
  const p2raw = data.person2 ? normalizeP(data.person2) : null
  const civilStatus = data.civilStatus || 'ledig'
  const canton = data.canton || 'ZH'
  const kirchensteuer = data.kirchensteuer ?? false
  const taxStatus = (civilStatus === 'verheiratet' || civilStatus === 'partnerschaft' ? civilStatus : 'ledig') as TaxCivilStatus
  const inflationRate = data.inflationRate ?? CONSTANTS.DEFAULT_INFLATION_RATE
  const investmentReturn = data.investmentReturn ?? CONSTANTS.RETURNS[data.riskProfile || 'balanced']

  const currentAge = p1raw.birthDate ? calculateAge(p1raw.birthDate) : 55
  const ra1 = p1raw.retirementAge || 65
  const ra2 = p2raw ? p2raw.retirementAge || 65 : null
  const endAge = data.endAge || 95

  // K1: correct AHV using ahvCalculation.ts (MIN 14'700, MAX 88'200, BSV factors)
  const ahv = buildAhvHousehold(p1raw, p2raw, civilStatus)
  const pk = calculatePkHousehold(p1raw, p2raw)

  // Blended return: sparkonto earns 0.75%, wertschriften earn investmentReturn
  const totalFreeAssets = (data.freeAssets || 0)
  const sparkontoAmt = data.sparkonto ?? 0
  const wertschriftenAmt = data.wertschriften ?? 0
  const sparkontoFraction = totalFreeAssets > 0
    ? Math.min(1, sparkontoAmt / totalFreeAssets)
    : (sparkontoAmt > 0 ? 1 : 0)
  const blendedReturn = sparkontoFraction * CONSTANTS.SPARKONTO_RENDITE + (1 - sparkontoFraction) * investmentReturn

  // Vermögenssteuer rate for canton
  const vermStSatz = CONSTANTS.VERMÖGENSSTEUER_SATZ[canton] ?? CONSTANTS.VERMÖGENSSTEUER_SATZ['ZH'] ?? 0.002

  function pkKapitalShare(p: ReturnType<typeof normalizeP> | null) {
    if (!p) return 0
    if (p.pkBezugsart === 'kapital') return 1
    if (p.pkBezugsart === 'mix') return (Number(p.pkKapitalanteil) || 50) / 100
    return 0
  }

  const cap1 = (p1raw.pkCapitalAt65 || 0) * pkKapitalShare(p1raw)
  const cap2 = p2raw ? (p2raw.pkCapitalAt65 || 0) * pkKapitalShare(p2raw) : 0
  const pk1Monthly = (pk.person1?.monthlyRente || 0) * (1 - pkKapitalShare(p1raw))
  const pk2Monthly = pk.person2 ? (pk.person2.monthlyRente || 0) * (1 - pkKapitalShare(p2raw)) : 0

  const start3a =
    (p1raw.has3a !== false ? p1raw.pillar3aBalance || 0 : 0) +
    (p2raw && p2raw.has3a !== false ? p2raw.pillar3aBalance || 0 : 0)

  let wealth = (data.freeAssets || 0) + start3a
  const baseExpensesYear = (data.monthlyExpenses || 0) * 12
  const cashflow: CashflowRow[] = []
  const currentYear = new Date().getFullYear()

  const ra2InP1Years = p2raw ? (ra2 || 65) + (currentAge - (p2raw.birthDate ? calculateAge(p2raw.birthDate) : currentAge)) : null

  for (let age = currentAge; age <= endAge; age++) {
    const year = currentYear + (age - currentAge)
    const yearsFromNow = age - currentAge
    const expFactor = Math.pow(1 + inflationRate, yearsFromNow)
    const inflatedExpenses = Math.round(baseExpensesYear * expFactor)

    const p1Retired = age >= ra1
    const p2RetiredSimple = p2raw ? age >= (ra2InP1Years || ra2 || 65) : false

    const isRetirementYearP1 = age === ra1
    const isRetirementYearP2 = p2raw ? age === (ra2InP1Years || ra2 || 65) : false

    let employmentIncome = 0
    let ahvIncome = 0, pkRenteIncome = 0
    let pkKapitalWithdrawal = 0, pillar3aWithdrawal = 0
    let assetReturn = 0, assetConsumption = 0
    let businessProceeds = 0

    // Firmenwert: one-time net proceeds in sale year (approx. 20% Liquidationsgewinnsteuer)
    if (
      p1raw.businessValue && p1raw.businessValue > 0 &&
      p1raw.businessSaleYear && p1raw.businessSaleYear === year
    ) {
      businessProceeds = Math.round(p1raw.businessValue * 0.80)
      wealth += businessProceeds
    }

    if (!p1Retired) employmentIncome += p1raw.grossIncome || 0
    if (p2raw && !p2RetiredSimple) employmentIncome += p2raw.grossIncome || 0

    if (employmentIncome > 0) {
      const netIncome = employmentIncome * 0.72
      const saving = Math.max(0, netIncome - inflatedExpenses - (data.hasProperty ? (data.monthlyMortgageCost || 0) * 12 : 0))
      wealth += saving
    }

    // AHV Mischindex: each year after retirement, AHV grows ~1.25%/year
    const yearsP1Retired = p1Retired ? Math.max(0, age - ra1) : 0
    const yearsP2Retired = p2RetiredSimple ? Math.max(0, age - (ra2InP1Years || ra2 || 65)) : 0
    const ahvGrowth1 = Math.pow(1 + CONSTANTS.AHV_MISCHINDEX, yearsP1Retired)
    const ahvGrowth2 = p2raw ? Math.pow(1 + CONSTANTS.AHV_MISCHINDEX, yearsP2Retired) : 1

    if (p1Retired && (!p2raw || p2RetiredSimple)) {
      ahvIncome = ahv.person1.yearlyInkl13 * ahvGrowth1 + (ahv.person2 ? ahv.person2.yearlyInkl13 * ahvGrowth2 : 0)
    } else if (p1Retired) {
      ahvIncome = ahv.person1.yearlyInkl13 * ahvGrowth1
    } else if (p2RetiredSimple) {
      ahvIncome = ahv.person2 ? ahv.person2.yearlyInkl13 * ahvGrowth2 : 0
    }

    // Foreign pension income (from Herkunftsland) — added once both/either retired
    const foreignPension = (p1raw.foreignPensionMonthly || 0) * 12
    if (p1Retired && foreignPension > 0) ahvIncome += foreignPension

    if (p1Retired) pkRenteIncome += pk1Monthly * 12
    if (p2raw && p2RetiredSimple) pkRenteIncome += pk2Monthly * 12

    // K3+K4: Kapitalbezüge im gleichen Pensionierungsjahr zusammenfassen (höhere Progression vermeiden)
    // P1-Pensionierungsjahr: PK-Kapital + Säule-3a + FZ werden kombiniert besteuert
    if (isRetirementYearP1) {
      const fz1 = p1raw.hasFZ && p1raw.fzBalance > 0 ? p1raw.fzBalance : 0
      const the3a = start3a > 0 && yearsFromNow === ra1 - currentAge ? start3a : 0
      const totalP1Capital = cap1 + the3a + fz1
      if (totalP1Capital > 0) {
        const combinedTax = calculateCapitalTax(totalP1Capital, canton, taxStatus).totalTax
        if (cap1 > 0) { pkKapitalWithdrawal += cap1; wealth += cap1 }
        if (the3a > 0) pillar3aWithdrawal = the3a   // principal already in wealth from start3a
        if (fz1 > 0) wealth += fz1
        wealth -= combinedTax
      }
    }
    // P2-Pensionierungsjahr: PK-Kapital + FZ kombiniert (3a bereits im P1-Jahr besteuert)
    if (isRetirementYearP2) {
      const fz2 = p2raw && p2raw.hasFZ && p2raw.fzBalance > 0 ? p2raw.fzBalance : 0
      const totalP2Capital = cap2 + fz2
      if (totalP2Capital > 0) {
        const combinedTax = calculateCapitalTax(totalP2Capital, canton, taxStatus).totalTax
        if (cap2 > 0) { pkKapitalWithdrawal += cap2; wealth += cap2 }
        if (fz2 > 0) wealth += fz2
        wealth -= combinedTax
      }
    }

    if (p1Retired || p2RetiredSimple) {
      assetReturn = Math.round(Math.max(0, wealth) * blendedReturn)
      wealth += assetReturn
      // Vermögenssteuer: annual wealth tax as ongoing cost in retirement
      const vermSt = Math.round(Math.max(0, wealth) * vermStSatz)
      wealth -= vermSt
    }

    const totalRenten = ahvIncome + pkRenteIncome
    const totalExpThisYear = inflatedExpenses + (data.hasProperty ? (data.monthlyMortgageCost || 0) * 12 : 0)

    if (p1Retired || p2RetiredSimple) {
      const gap = totalExpThisYear - totalRenten
      if (gap > 0) {
        assetConsumption = gap
        wealth -= gap
      }
    }

    // K2: correct retirement tax via calculateRetirementTax (canton + Kirchensteuer)
    let estimatedTax = 0
    if (p1Retired || p2RetiredSimple) {
      const ahvMonthly = ahvIncome / 13     // ahvIncome already includes 13th (×13)
      const pkMonthly = pkRenteIncome / 12
      const retTax = calculateRetirementTax(ahvMonthly, pkMonthly, canton, taxStatus, kirchensteuer)
      estimatedTax = retTax.totalTax
      wealth -= estimatedTax
    } else if (employmentIncome > 0) {
      // Display only — wealth already reduced via 0.72 factor above
      const empTax = calculateIncomeTax(employmentIncome, canton, taxStatus, true, 0, false, kirchensteuer)
      estimatedTax = empTax.totalTax
    }

    cashflow.push({
      year, age,
      employmentIncome: Math.round(employmentIncome),
      ahvIncome: Math.round(ahvIncome),
      pkRenteIncome: Math.round(pkRenteIncome),
      pkKapitalWithdrawal: Math.round(pkKapitalWithdrawal),
      pillar3aWithdrawal: Math.round(pillar3aWithdrawal),
      assetIncome: Math.round(assetReturn),
      assetConsumption: Math.round(assetConsumption),
      businessProceeds: Math.round(businessProceeds),
      totalIncome: Math.round(employmentIncome + ahvIncome + pkRenteIncome + assetReturn + businessProceeds),
      livingExpenses: inflatedExpenses,
      mortgageCosts: data.hasProperty ? (data.monthlyMortgageCost || 0) * 12 : 0,
      taxes: estimatedTax,
      totalExpenses: Math.round(totalExpThisYear + estimatedTax),
      wealthEndOfYear: Math.round(wealth),
      isRetirementYear: isRetirementYearP1 || isRetirementYearP2,
      isCapitalWithdrawalYear: pkKapitalWithdrawal > 0 || businessProceeds > 0,
    })
  }

  return cashflow
}

export interface ProAnalysisResult {
  ahv: AhvHouseholdCalc
  pk: ReturnType<typeof calculatePkHousehold>
  yearlyCashflow: CashflowRow[]
  ageWhenBroke: number | null
  monthlyIncome: { total: number }
  monthlyExpenses: number
  surplus: number
  sustainabilityScore: number
  verdict: 'green' | 'yellow' | 'red'
}

export function calculateProAnalysis(data: CashflowInput): ProAnalysisResult {
  const p1 = normalizeP(data.person1)
  const p2 = data.person2 ? normalizeP(data.person2) : null
  const civilStatus = data.civilStatus || 'ledig'

  const ahv = buildAhvHousehold(p1, p2, civilStatus)
  const pk = calculatePkHousehold(p1, p2)
  const cashflow = calculateYearlyCashflow(data)

  let ageWhenBroke: number | null = null
  for (const c of cashflow) {
    if (c.age >= (p1.retirementAge || 65) && c.wealthEndOfYear <= 0) {
      ageWhenBroke = c.age
      break
    }
  }

  const firstRetiredYear = cashflow.find((c) => c.isRetirementYear) || cashflow.find((c) => c.ahvIncome > 0)
  const monthlyIncomeTotal = firstRetiredYear
    ? Math.round((firstRetiredYear.ahvIncome + firstRetiredYear.pkRenteIncome) / 12)
    : Math.round((ahv.combinedYearlyInkl13 + pk.combinedYearly) / 12)

  const monthlyExpenses = data.monthlyExpenses || 0
  const surplus = monthlyIncomeTotal - monthlyExpenses

  let score = 50
  const cov = monthlyExpenses > 0 ? monthlyIncomeTotal / monthlyExpenses : 1
  if (cov >= 1.2) score += 30
  else if (cov >= 1.0) score += 20
  else if (cov >= 0.9) score += 5
  else if (cov >= 0.8) score -= 10
  else score -= 30

  if (!ageWhenBroke) score += 20
  else if (ageWhenBroke > 90) score += 10
  else if (ageWhenBroke > 85) score += 0
  else if (ageWhenBroke > 80) score -= 10
  else score -= 20

  const sustainabilityScore = Math.max(0, Math.min(100, score))
  const verdict: 'green' | 'yellow' | 'red' =
    sustainabilityScore >= 70 ? 'green' : sustainabilityScore >= 45 ? 'yellow' : 'red'

  return {
    ahv, pk, yearlyCashflow: cashflow, ageWhenBroke,
    monthlyIncome: { total: monthlyIncomeTotal },
    monthlyExpenses, surplus, sustainabilityScore, verdict,
  }
}

const SCENARIO_RETURNS: Record<string, { optimistic: number; pessimistic: number }> = {
  conservative: { optimistic: 0.035, pessimistic: 0 },
  balanced:     { optimistic: 0.05,  pessimistic: 0 },
  growth:       { optimistic: 0.065, pessimistic: -0.01 },
}

export function calculateScenarios(data: CashflowInput) {
  const profile = data.riskProfile || 'balanced'
  const rates = SCENARIO_RETURNS[profile]
  return {
    optimistic: calculateProAnalysis({ ...data, inflationRate: 0.01, investmentReturn: rates.optimistic }),
    neutral: calculateProAnalysis({ ...data }),
    pessimistic: calculateProAnalysis({ ...data, inflationRate: 0.025, investmentReturn: rates.pessimistic }),
  }
}

// Re-export AhvPersonResult for downstream consumers that typed against the old shape
export type { AhvPersonResult }
