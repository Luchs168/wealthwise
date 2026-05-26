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
    fzInvestmentType?: string
    hasKZG?: boolean
    kzgChildren?: number
    kzgYears?: number
    hasPK?: boolean
    ahvAvgIncome?: number
    yearly3a?: number
    form3a?: string
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
    hasPK?: boolean
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
    fzInvestmentType?: string
    ahvAvgIncome?: number
    yearly3a?: number
    form3a?: string
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
  wealthInvestmentProfile?: string
  savingsStrategy?: string
  endAge?: number
  freeAssets?: number
  sparkonto?: number
  wertschriften?: number
  monthlyExpenses?: number
  hasProperty?: boolean
  monthlyMortgageCost?: number
  propertyValue?: number
  mortgage?: number
  hypothekZinssatz?: number
  amortisationYearly?: number
  amortisationYears?: number
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
    fzInvestmentType: p.fzInvestmentType ?? 'sparkonto',
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
  const avgIncome1 = computeKZGAdjustedIncome(p1.ahvAvgIncome || p1.grossIncome || 0, years1, p1.hasKZG, p1.kzgChildren, p1.kzgYears, civilStatus)

  const r1 = calculateAHVPension({ avgIncome: avgIncome1, bezugAge: bezug1, effectiveContributionYears: years1 })

  let r2Monthly = 0
  let r2Income = 0
  let r2Result: AhvHouseholdCalc['person2'] = null

  if (p2) {
    const retire2 = p2.retirementAge || p2.retireAge || 65
    const baseYears2 = Math.min(FULL_YEARS, Math.max(0, retire2 - 21))
    const years2 = Math.max(0, baseYears2 - (p2.ahvContributionGaps || 0))
    const bezug2 = Math.min(70, Math.max(63, p2.ahvBezugAge || retire2))
    const avgIncome2 = computeKZGAdjustedIncome(p2.ahvAvgIncome || p2.grossIncome || 0, years2, p2.hasKZG, p2.kzgChildren, p2.kzgYears, civilStatus)
    const r2raw = calculateAHVPension({ avgIncome: avgIncome2, bezugAge: bezug2, effectiveContributionYears: years2 })
    r2Monthly = r2raw.monthlyRente
    r2Income = avgIncome2
    r2Result = { monthlyRente: r2raw.monthlyRente, yearlyRente: r2raw.yearlyRente, yearlyInkl13: r2raw.yearlyInkl13, avgIncomeUsed: avgIncome2 }
  }

  const plafon = applyPlafonierung(r1.monthlyRente, r2Monthly, civilStatus)

  const m1 = plafon.monthly1
  const m2 = plafon.monthly2

  if (r2Result) r2Result = { monthlyRente: m2, yearlyRente: m2 * 12, yearlyInkl13: m2 * 13, avgIncomeUsed: r2Income }

  const combinedMonthly = m1 + m2
  return {
    person1: { monthlyRente: m1, yearlyRente: m1 * 12, yearlyInkl13: m1 * 13, avgIncomeUsed: avgIncome1 },
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
  const wealthReturn = data.wealthInvestmentProfile
    ? (CONSTANTS.RETURNS_WEALTH[data.wealthInvestmentProfile] ?? investmentReturn)
    : investmentReturn

  const currentAge = p1raw.birthDate ? calculateAge(p1raw.birthDate) : 55
  const ra1 = p1raw.retirementAge || 65
  const ra2 = p2raw ? p2raw.retirementAge || 65 : null
  const endAge = data.endAge || 95

  // K1: correct AHV using ahvCalculation.ts (MIN 14'700, MAX 88'200, BSV factors)
  const ahv = buildAhvHousehold(p1raw, p2raw, civilStatus)
  const pk = calculatePkHousehold(p1raw, p2raw)

  // Blended return (retirement phase): sparkonto earns 0.75%, wertschriften earn wealthReturn
  const totalFreeAssets = (data.freeAssets || 0)
  const sparkontoAmt = data.sparkonto ?? 0
  const sparkontoFraction = totalFreeAssets > 0
    ? Math.min(1, sparkontoAmt / totalFreeAssets)
    : (sparkontoAmt > 0 ? 1 : 0)
  const blendedReturn = sparkontoFraction * CONSTANTS.SPARKONTO_RENDITE + (1 - sparkontoFraction) * wealthReturn

  // Employment-phase return: follows the savings strategy chosen in Screen3
  const savingsStrategyRates: Record<string, number> = {
    sparkonto: 0.0075, konservativ: 0.025, ausgewogen: 0.035, aggressiv: 0.05,
  }
  const savingsReturn = data.savingsStrategy
    ? (savingsStrategyRates[data.savingsStrategy] ?? blendedReturn)
    : blendedReturn

  // Employment-phase net income: actual income tax + AHV+IV+EO (5.3%) + ALV (1.1%)
  // Pre-computed once per income phase (both work / only P1 / only P2) for efficiency
  const AHV_EMPLOYEE_RATE = 0.053   // AHV+IV+EO employee share 2026
  const ALV_RATE = 0.011            // ALV employee rate 2026
  const ALV_CEILING = 148_200       // ALV wage ceiling 2026

  function computeEmploymentNetFactor(
    income: number, hasPK: boolean, yearly3a: number, has3a: boolean,
  ): { netFactor: number; taxAmount: number } {
    if (income <= 0) return { netFactor: 0.72, taxAmount: 0 }
    const taxResult = calculateIncomeTax(income, canton, taxStatus, hasPK, yearly3a, has3a, kirchensteuer)
    const ahvAmt = Math.round(income * AHV_EMPLOYEE_RATE)
    const alvAmt = Math.round(Math.min(income, ALV_CEILING) * ALV_RATE)
    const netFactor = Math.max(0.50, Math.min(0.95, (income - taxResult.totalTax - ahvAmt - alvAmt) / income))
    return { netFactor, taxAmount: taxResult.totalTax }
  }

  const inc1 = p1raw.grossIncome || 0
  const inc2 = p2raw?.grossIncome || 0
  const hasPK1 = Boolean(p1raw.hasPK)
  const hasPK2 = Boolean(p2raw?.hasPK)
  const has3a1 = p1raw.has3a !== false
  const has3a2 = p2raw ? p2raw.has3a !== false : false
  const y3a1 = p1raw.yearly3a || 0
  const y3a2 = p2raw?.yearly3a || 0

  const empPhase_both = computeEmploymentNetFactor(inc1 + inc2, hasPK1 || hasPK2, y3a1 + y3a2, has3a1 || has3a2)
  const empPhase_p1   = computeEmploymentNetFactor(inc1, hasPK1, y3a1, has3a1)
  const empPhase_p2   = p2raw ? computeEmploymentNetFactor(inc2, hasPK2, y3a2, has3a2) : { netFactor: 0.72, taxAmount: 0 }

  // Pre-project FZ balances to retirement using chosen investment type
  const yearsUntilRet1 = Math.max(0, ra1 - currentAge)
  const fzRate1 = CONSTANTS.RETURNS_FZ[p1raw.fzInvestmentType || 'sparkonto']
  const projectedFz1 = p1raw.hasFZ && p1raw.fzBalance > 0
    ? Math.round(p1raw.fzBalance * Math.pow(1 + fzRate1, yearsUntilRet1))
    : 0
  const currentAgeP2 = p2raw?.birthDate ? calculateAge(p2raw.birthDate) : currentAge
  const yearsUntilRet2 = p2raw ? Math.max(0, (p2raw.retirementAge || 65) - currentAgeP2) : 0
  const fzRate2 = p2raw ? (CONSTANTS.RETURNS_FZ[p2raw.fzInvestmentType || 'sparkonto']) : 0
  const projectedFz2 = p2raw && p2raw.hasFZ && p2raw.fzBalance > 0
    ? Math.round(p2raw.fzBalance * Math.pow(1 + fzRate2, yearsUntilRet2))
    : 0

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

  // Project 3a balances to retirement using yearly contributions + type-specific rates
  const yearly3a1 = p1raw.yearly3a || 0
  const form3a1 = p1raw.form3a || 'sparkonto'
  const rate3a1 = CONSTANTS.RETURNS_3A[form3a1] ?? 0.0075
  const projected3a1 = p1raw.has3a !== false
    ? Math.round(
        (p1raw.pillar3aBalance || 0) * Math.pow(1 + rate3a1, yearsUntilRet1) +
        (rate3a1 > 0
          ? yearly3a1 * (Math.pow(1 + rate3a1, yearsUntilRet1) - 1) / rate3a1
          : yearly3a1 * yearsUntilRet1)
      )
    : 0

  const yearly3a2 = p2raw?.yearly3a || 0
  const form3a2 = p2raw?.form3a || 'sparkonto'
  const rate3a2 = p2raw ? (CONSTANTS.RETURNS_3A[form3a2] ?? 0.0075) : 0
  const projected3a2 = p2raw && p2raw.has3a !== false
    ? Math.round(
        (p2raw.pillar3aBalance || 0) * Math.pow(1 + rate3a2, yearsUntilRet2) +
        (rate3a2 > 0
          ? yearly3a2 * (Math.pow(1 + rate3a2, yearsUntilRet2) - 1) / rate3a2
          : yearly3a2 * yearsUntilRet2)
      )
    : 0

  if (typeof window !== 'undefined') {
    console.log('[WealthWise S4] Cashflow projections:', {
      currentAge, ra1, yearsUntilRet1, ahv: { combinedMonthly: ahv.combinedMonthly, p1monthly: ahv.person1.monthlyRente, avgIncomeUsed: ahv.person1.avgIncomeUsed }, pk: { combinedMonthly: pk.combinedMonthly }, freeAssets: data.freeAssets, projected3a1, projected3a2, projectedFz1, projectedFz2, initialWealth: data.freeAssets || 0, blendedReturn,
    })
  }

  // 3a tracked separately and added at retirement as lump sum; initial wealth = free assets only
  let wealth = (data.freeAssets || 0)
  const baseExpensesYear = (data.monthlyExpenses || 0) * 12
  const cashflow: CashflowRow[] = []
  const currentYear = new Date().getFullYear()

  // Property cost helpers — computed dynamically per year when amortisation data is present
  const propMortgage = data.mortgage ?? 0
  const propHypRate = (data.hypothekZinssatz ?? 1.5) / 100
  const propMaintenanceYearly = data.hasProperty ? (data.propertyValue || 0) * 0.01 : 0
  const propAmortYearly = data.amortisationYearly ?? 0
  const propAmortYears = data.amortisationYears ?? 0
  const useDynamicMortgage = !!(data.hasProperty && propMortgage > 0 && propAmortYearly > 0)

  const ra2InP1Years = p2raw ? (ra2 || 65) + (currentAge - (p2raw.birthDate ? calculateAge(p2raw.birthDate) : currentAge)) : null

  // AHV bezug ages — separate from retirementAge so deferred/early AHV is timed correctly
  const ahvBezugAge1 = Math.min(70, Math.max(63, p1raw.ahvBezugAge || ra1))
  const ahvBezugRaw2 = p2raw ? Math.min(70, Math.max(63, p2raw.ahvBezugAge || (ra2 || 65))) : null
  const ahvBezug2InP1Years = p2raw && ahvBezugRaw2 !== null
    ? ahvBezugRaw2 + (currentAge - (p2raw.birthDate ? calculateAge(p2raw.birthDate) : currentAge))
    : null

  for (let age = currentAge; age <= endAge; age++) {
    // Prevent negative compounding: once broke, next year starts from 0 not further negative
    wealth = Math.max(0, wealth)

    const year = currentYear + (age - currentAge)
    const yearsFromNow = age - currentAge
    const expFactor = Math.pow(1 + inflationRate, yearsFromNow)
    const inflatedExpenses = Math.round(baseExpensesYear * expFactor)

    const p1Retired = age >= ra1
    const p2RetiredSimple = p2raw ? age >= (ra2InP1Years || ra2 || 65) : false

    // Whether AHV income is actually flowing (respects ahvBezugAge, not just retirementAge)
    const p1DrawingAHV = age >= ahvBezugAge1
    const p2DrawingAHV = p2raw ? age >= (ahvBezug2InP1Years ?? (ra2 || 65)) : false

    const isRetirementYearP1 = age === ra1
    const isRetirementYearP2 = p2raw ? age === (ra2InP1Years || ra2 || 65) : false

    // Year-specific property cost: interest declines as mortgage is paid down
    let mortgageCostsThisYear = 0
    if (data.hasProperty) {
      if (useDynamicMortgage) {
        const remainingMortgage = Math.max(0, propMortgage - yearsFromNow * propAmortYearly)
        const yearlyInterest = Math.round(remainingMortgage * propHypRate)
        const yearlyAmort = yearsFromNow < propAmortYears ? propAmortYearly : 0
        mortgageCostsThisYear = yearlyInterest + Math.round(propMaintenanceYearly) + yearlyAmort
      } else {
        mortgageCostsThisYear = (data.monthlyMortgageCost || 0) * 12
      }
    }

    let employmentIncome = 0
    let ahvIncome = 0, pkRenteIncome = 0
    let pkKapitalWithdrawal = 0, pillar3aWithdrawal = 0
    let assetReturn = 0, assetConsumption = 0
    let businessProceeds = 0
    let estimatedTax = 0

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
      assetReturn = Math.round(Math.max(0, wealth) * savingsReturn)
      wealth += assetReturn
      const p1Working = !p1Retired && inc1 > 0
      const p2Working = p2raw != null && !p2RetiredSimple && inc2 > 0
      const phase = (p1Working && p2Working) ? empPhase_both : p1Working ? empPhase_p1 : empPhase_p2
      const netIncome = Math.round(employmentIncome * phase.netFactor)
      const saving = Math.max(0, netIncome - inflatedExpenses - mortgageCostsThisYear)
      wealth += saving
      estimatedTax = phase.taxAmount
    }

    // AHV Mischindex: grows from when AHV drawing starts (ahvBezugAge), not from retirementAge
    const yearsP1DrawingAHV = p1DrawingAHV ? Math.max(0, age - ahvBezugAge1) : 0
    const yearsP2DrawingAHV = p2DrawingAHV ? Math.max(0, age - (ahvBezug2InP1Years ?? (ra2 || 65))) : 0
    const ahvGrowth1 = Math.pow(1 + CONSTANTS.AHV_MISCHINDEX, yearsP1DrawingAHV)
    const ahvGrowth2 = p2raw ? Math.pow(1 + CONSTANTS.AHV_MISCHINDEX, yearsP2DrawingAHV) : 1

    if (p1DrawingAHV && (!p2raw || p2DrawingAHV)) {
      ahvIncome = ahv.person1.yearlyInkl13 * ahvGrowth1 + (ahv.person2 ? ahv.person2.yearlyInkl13 * ahvGrowth2 : 0)
    } else if (p1DrawingAHV) {
      ahvIncome = ahv.person1.yearlyInkl13 * ahvGrowth1
    } else if (p2DrawingAHV) {
      ahvIncome = ahv.person2 ? ahv.person2.yearlyInkl13 * ahvGrowth2 : 0
    }

    // Foreign pension income (from Herkunftsland) — added once both/either retired
    const foreignPension = (p1raw.foreignPensionMonthly || 0) * 12
    if (p1Retired && foreignPension > 0) ahvIncome += foreignPension

    if (p1Retired) pkRenteIncome += pk1Monthly * 12
    if (p2raw && p2RetiredSimple) pkRenteIncome += pk2Monthly * 12

    // K3+K4: Kapitalbezüge zusammenfassen um Steuerprogression zu minimieren
    // Verheiratete mit gleichem Pensionierungsjahr: alle Kapitalien gemeinsam besteuern (Zusammenveranlagung)
    const isJointRetirement = isRetirementYearP1 && isRetirementYearP2 &&
      (taxStatus === 'verheiratet' || taxStatus === 'partnerschaft')

    if (isJointRetirement) {
      const totalAllCapital = cap1 + projected3a1 + projectedFz1 + cap2 + projected3a2 + projectedFz2
      if (totalAllCapital > 0) {
        const combinedTax = calculateCapitalTax(totalAllCapital, canton, taxStatus).totalTax
        if (cap1 > 0) { pkKapitalWithdrawal += cap1; wealth += cap1 }
        if (projected3a1 > 0) { pillar3aWithdrawal += projected3a1; wealth += projected3a1 }
        if (projectedFz1 > 0) wealth += projectedFz1
        if (cap2 > 0) { pkKapitalWithdrawal += cap2; wealth += cap2 }
        if (projected3a2 > 0) { pillar3aWithdrawal += projected3a2; wealth += projected3a2 }
        if (projectedFz2 > 0) wealth += projectedFz2
        wealth -= combinedTax
      }
    } else {
      // Separate taxation: different retirement years, or not married
      if (isRetirementYearP1) {
        const totalP1Capital = cap1 + projected3a1 + projectedFz1
        if (totalP1Capital > 0) {
          const combinedTax = calculateCapitalTax(totalP1Capital, canton, taxStatus).totalTax
          if (cap1 > 0) { pkKapitalWithdrawal += cap1; wealth += cap1 }
          if (projected3a1 > 0) { pillar3aWithdrawal += projected3a1; wealth += projected3a1 }
          if (projectedFz1 > 0) wealth += projectedFz1
          wealth -= combinedTax
        }
      }
      if (isRetirementYearP2) {
        const totalP2Capital = cap2 + projected3a2 + projectedFz2
        if (totalP2Capital > 0) {
          const combinedTax = calculateCapitalTax(totalP2Capital, canton, taxStatus).totalTax
          if (cap2 > 0) { pkKapitalWithdrawal += cap2; wealth += cap2 }
          if (projected3a2 > 0) { pillar3aWithdrawal += projected3a2; wealth += projected3a2 }
          if (projectedFz2 > 0) wealth += projectedFz2
          wealth -= combinedTax
        }
      }
    }

    if (p1Retired || p2RetiredSimple) {
      if (employmentIncome === 0) {
        assetReturn = Math.round(Math.max(0, wealth) * blendedReturn)
        wealth += assetReturn
      }
      // Vermögenssteuer: annual wealth tax as ongoing cost in retirement
      const vermSt = Math.round(Math.max(0, wealth) * vermStSatz)
      wealth -= vermSt
    }

    // Age-based KK surcharge in retirement: KK costs rise with age class
    // Modelled on ~CHF 700/Mt. per person baseline (premium + franchise/Selbstbehalt)
    const kkBasePP = 700 * 12
    const kkPersons = p2raw ? 2 : 1
    const kkSurchargeFactor = (p1Retired || p2RetiredSimple)
      ? (age >= 76 ? 0.30 : age >= 66 ? 0.20 : age >= 56 ? 0.10 : 0)
      : 0
    const kkAnnualSurcharge = Math.round(kkBasePP * kkPersons * kkSurchargeFactor)

    const totalRenten = ahvIncome + pkRenteIncome
    const totalExpThisYear = inflatedExpenses + kkAnnualSurcharge + mortgageCostsThisYear

    if (p1Retired || p2RetiredSimple) {
      const gap = totalExpThisYear - totalRenten
      if (gap > 0) {
        assetConsumption = gap
        wealth -= gap
      }
    }

    // K2: correct retirement tax via calculateRetirementTax (canton + Kirchensteuer)
    if (p1Retired || p2RetiredSimple) {
      const ahvMonthly = ahvIncome / 13     // ahvIncome already includes 13th (×13)
      const pkMonthly = pkRenteIncome / 12
      const retTax = calculateRetirementTax(ahvMonthly, pkMonthly, canton, taxStatus, kirchensteuer)
      estimatedTax = retTax.totalTax
      wealth -= estimatedTax
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
      mortgageCosts: mortgageCostsThisYear,
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

  if (typeof window !== 'undefined') {
    console.log('[WealthWise S4] calculateProAnalysis input:', {
      p1: { retirementAge: p1.retirementAge, ahvBezugAge: p1.ahvBezugAge, grossIncome: p1.grossIncome, ahvAvgIncome: p1.ahvAvgIncome, pkCapitalAt65: p1.pkCapitalAt65, pillar3aBalance: p1.pillar3aBalance, yearly3a: p1.yearly3a, form3a: p1.form3a, hasFZ: p1.hasFZ, fzBalance: p1.fzBalance, fzInvestmentType: p1.fzInvestmentType },
      p2: p2 ? { retirementAge: p2.retirementAge, grossIncome: p2.grossIncome, ahvAvgIncome: p2.ahvAvgIncome, pkCapitalAt65: p2.pkCapitalAt65 } : null,
      civilStatus: data.civilStatus, canton: data.canton, freeAssets: data.freeAssets, monthlyExpenses: data.monthlyExpenses, wealthInvestmentProfile: data.wealthInvestmentProfile,
    })
  }

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

  // Steady-state pension income: AHV (inkl 13th ÷ 12) + PK Rente (adjusted for bezugsart).
  // Using the first-retirement-year cashflow row gave 0 when AHV bezug age > retirement age
  // or when the person retires before AHV eligibility (e.g. age 60 but AHV at 65).
  function pkKapShare(bez: string | undefined, kap: number | undefined): number {
    if (bez === 'kapital') return 1
    if (bez === 'mix') return (Number(kap) || 50) / 100
    return 0
  }
  const share1 = pkKapShare(p1.pkBezugsart as string, p1.pkKapitalanteil as number)
  const share2 = p2 ? pkKapShare(p2.pkBezugsart as string, p2.pkKapitalanteil as number) : 1
  const pk1Rente = (pk.person1.monthlyRente || 0) * (1 - share1)
  const pk2Rente = p2 ? (pk.person2?.monthlyRente || 0) * (1 - share2) : 0
  const monthlyIncomeTotal = Math.round(ahv.combinedYearlyInkl13 / 12 + pk1Rente + pk2Rente)

  const monthlyExpenses = data.monthlyExpenses || 0
  const surplus = monthlyIncomeTotal - monthlyExpenses

  // Score based on wealth longevity (primary) + income coverage (secondary).
  // Thresholds per design spec:
  //   wealth never depletes or > 90 → 80-100 green  "Gut aufgestellt"
  //   wealth depletes 80-90         → 50-70  yellow "Optimierungspotenzial"
  //   wealth depletes < 80          → 20-40  red    "Handlungsbedarf"
  const cov = monthlyExpenses > 0 ? monthlyIncomeTotal / monthlyExpenses : 1
  const covBonus = cov >= 1.2 ? 5 : cov >= 1.0 ? 0 : cov >= 0.8 ? -5 : -10
  let score: number
  if (!ageWhenBroke) {
    score = 90 + covBonus            // 80-95
  } else if (ageWhenBroke > 90) {
    score = 82 + covBonus            // 72-87
  } else if (ageWhenBroke >= 80) {
    const t = (ageWhenBroke - 80) / 10
    score = Math.round(50 + t * 30 + covBonus)  // 40-80
  } else {
    const t = Math.max(0, (ageWhenBroke - 65) / 15)
    score = Math.round(20 + t * 20 + covBonus)  // 10-40
  }
  const sustainabilityScore = Math.max(0, Math.min(100, score))
  const verdict: 'green' | 'yellow' | 'red' =
    sustainabilityScore >= 75 ? 'green' : sustainabilityScore >= 45 ? 'yellow' : 'red'

  return {
    ahv, pk, yearlyCashflow: cashflow, ageWhenBroke,
    monthlyIncome: { total: monthlyIncomeTotal },
    monthlyExpenses, surplus, sustainabilityScore, verdict,
  }
}

export function calculateScenarios(data: CashflowInput) {
  // Strip wealthInvestmentProfile so fixed investmentReturn values take effect
  const base = { ...data, wealthInvestmentProfile: undefined }
  return {
    optimistic:  calculateProAnalysis({ ...base, inflationRate: 0.01,  investmentReturn: 0.05  }),
    neutral:     calculateProAnalysis({ ...base, inflationRate: 0.015, investmentReturn: 0.035 }),
    pessimistic: calculateProAnalysis({ ...base, inflationRate: 0.025, investmentReturn: 0.01  }),
  }
}

// Re-export AhvPersonResult for downstream consumers that typed against the old shape
export type { AhvPersonResult }
