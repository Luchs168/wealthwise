/**
 * WealthWise – Swiss Income Tax Estimation Engine
 * All amounts in CHF. Results are approximations for financial planning purposes.
 * Sources: DBG (Bundesgesetz über die direkte Bundessteuer) 2026 tariffs;
 * cantonal rates approximated from ESTV Steuerbelastungsstatistik.
 */

export type TaxCivilStatus = 'ledig' | 'verheiratet' | 'partnerschaft' | 'geschieden' | 'verwitwet'

function isMarried(status: TaxCivilStatus): boolean {
  return status === 'verheiratet' || status === 'partnerschaft'
}

// ─── Federal Tax (Direkte Bundessteuer / DBG 2026) ─────────────────────────

type Bracket = readonly [number, number, number] // [from, to, marginalRate]

// Tarif A: ledig, geschieden, verwitwet
const DBG_A: readonly Bracket[] = [
  [0, 17800, 0],
  [17800, 31600, 0.0077],
  [31600, 41400, 0.0088],
  [41400, 55200, 0.0264],
  [55200, 72500, 0.0297],
  [72500, 78100, 0.0594],
  [78100, 103600, 0.0660],
  [103600, 134600, 0.0880],
  [134600, 176000, 0.1100],
  [176000, Infinity, 0.1150],
]

// Tarif B: verheiratet, eingetragene Partnerschaft
const DBG_B: readonly Bracket[] = [
  [0, 28300, 0],
  [28300, 50900, 0.0100],
  [50900, 58400, 0.0200],
  [58400, 75300, 0.0300],
  [75300, 90300, 0.0400],
  [90300, 103400, 0.0500],
  [103400, 114700, 0.0600],
  [114700, 124200, 0.0700],
  [124200, 131700, 0.0800],
  [131700, 141200, 0.0900],
  [141200, 159400, 0.1000],
  [159400, 176200, 0.1100],
  [176200, 194200, 0.1200],
  [194200, 216800, 0.1300],
  [216800, Infinity, 0.1150],
]

function bracketTax(income: number, brackets: readonly Bracket[]): number {
  if (income <= 0) return 0
  let tax = 0
  for (const [from, to, rate] of brackets) {
    if (income <= from) break
    tax += (Math.min(income, to) - from) * rate
  }
  return Math.max(0, tax)
}

export function calculateFederalTax(taxableIncome: number, status: TaxCivilStatus): number {
  return Math.round(bracketTax(taxableIncome, isMarried(status) ? DBG_B : DBG_A))
}

// ─── Cantonal + Municipal Income Tax ──────────────────────────────────────────
// Effective combined rates (Kanton + representative Hauptort Gemeinde, excl. federal)
// Approximated from ESTV Steuerbelastungsstatistik; for planning purposes only.
// Points: [taxable income, effective cantonal+municipal rate for single person]

type TaxPoints = ReadonlyArray<readonly [number, number]>

const CANTONAL: Record<string, TaxPoints> = {
  AG: [[0,0],[10000,0.018],[25000,0.050],[50000,0.090],[75000,0.115],[100000,0.130],[150000,0.155],[200000,0.168],[300000,0.180],[500000,0.190]],
  AI: [[0,0],[10000,0.012],[25000,0.033],[50000,0.060],[75000,0.078],[100000,0.089],[150000,0.105],[200000,0.115],[300000,0.125],[500000,0.132]],
  AR: [[0,0],[10000,0.018],[25000,0.050],[50000,0.083],[75000,0.105],[100000,0.118],[150000,0.140],[200000,0.152],[300000,0.164],[500000,0.172]],
  BE: [[0,0],[10000,0.025],[25000,0.070],[50000,0.113],[75000,0.143],[100000,0.163],[150000,0.189],[200000,0.205],[300000,0.218],[500000,0.226]],
  BL: [[0,0],[10000,0.022],[25000,0.060],[50000,0.098],[75000,0.126],[100000,0.143],[150000,0.168],[200000,0.183],[300000,0.196],[500000,0.205]],
  BS: [[0,0],[10000,0.025],[25000,0.070],[50000,0.112],[75000,0.142],[100000,0.162],[150000,0.188],[200000,0.204],[300000,0.218],[500000,0.226]],
  FR: [[0,0],[10000,0.023],[25000,0.065],[50000,0.106],[75000,0.135],[100000,0.154],[150000,0.179],[200000,0.194],[300000,0.207],[500000,0.216]],
  GE: [[0,0],[10000,0.028],[25000,0.077],[50000,0.126],[75000,0.160],[100000,0.185],[150000,0.213],[200000,0.229],[300000,0.246],[500000,0.256]],
  GL: [[0,0],[10000,0.020],[25000,0.056],[50000,0.091],[75000,0.116],[100000,0.132],[150000,0.157],[200000,0.170],[300000,0.183],[500000,0.191]],
  GR: [[0,0],[10000,0.018],[25000,0.050],[50000,0.083],[75000,0.106],[100000,0.120],[150000,0.142],[200000,0.154],[300000,0.166],[500000,0.174]],
  JU: [[0,0],[10000,0.024],[25000,0.067],[50000,0.110],[75000,0.140],[100000,0.159],[150000,0.185],[200000,0.200],[300000,0.213],[500000,0.222]],
  LU: [[0,0],[10000,0.020],[25000,0.055],[50000,0.090],[75000,0.116],[100000,0.131],[150000,0.155],[200000,0.169],[300000,0.181],[500000,0.189]],
  NE: [[0,0],[10000,0.025],[25000,0.071],[50000,0.116],[75000,0.147],[100000,0.167],[150000,0.194],[200000,0.209],[300000,0.223],[500000,0.232]],
  NW: [[0,0],[10000,0.015],[25000,0.042],[50000,0.070],[75000,0.090],[100000,0.103],[150000,0.121],[200000,0.132],[300000,0.143],[500000,0.150]],
  OW: [[0,0],[10000,0.014],[25000,0.038],[50000,0.064],[75000,0.083],[100000,0.095],[150000,0.112],[200000,0.122],[300000,0.132],[500000,0.138]],
  SG: [[0,0],[10000,0.021],[25000,0.059],[50000,0.096],[75000,0.122],[100000,0.139],[150000,0.163],[200000,0.177],[300000,0.190],[500000,0.199]],
  SH: [[0,0],[10000,0.020],[25000,0.055],[50000,0.091],[75000,0.116],[100000,0.132],[150000,0.155],[200000,0.169],[300000,0.181],[500000,0.190]],
  SO: [[0,0],[10000,0.022],[25000,0.062],[50000,0.102],[75000,0.130],[100000,0.148],[150000,0.173],[200000,0.188],[300000,0.200],[500000,0.209]],
  SZ: [[0,0],[10000,0.011],[25000,0.030],[50000,0.050],[75000,0.065],[100000,0.074],[150000,0.087],[200000,0.096],[300000,0.104],[500000,0.110]],
  TG: [[0,0],[10000,0.020],[25000,0.055],[50000,0.090],[75000,0.115],[100000,0.131],[150000,0.154],[200000,0.168],[300000,0.180],[500000,0.188]],
  TI: [[0,0],[10000,0.023],[25000,0.064],[50000,0.104],[75000,0.133],[100000,0.151],[150000,0.177],[200000,0.191],[300000,0.204],[500000,0.213]],
  UR: [[0,0],[10000,0.017],[25000,0.046],[50000,0.077],[75000,0.099],[100000,0.113],[150000,0.132],[200000,0.145],[300000,0.155],[500000,0.162]],
  VD: [[0,0],[10000,0.026],[25000,0.073],[50000,0.120],[75000,0.153],[100000,0.175],[150000,0.204],[200000,0.219],[300000,0.236],[500000,0.246]],
  VS: [[0,0],[10000,0.022],[25000,0.062],[50000,0.102],[75000,0.130],[100000,0.148],[150000,0.174],[200000,0.188],[300000,0.202],[500000,0.211]],
  ZG: [[0,0],[10000,0.011],[25000,0.029],[50000,0.049],[75000,0.064],[100000,0.073],[150000,0.087],[200000,0.095],[300000,0.103],[500000,0.109]],
  ZH: [[0,0],[10000,0.018],[25000,0.050],[50000,0.083],[75000,0.107],[100000,0.122],[150000,0.144],[200000,0.157],[300000,0.169],[500000,0.178]],
}

function interpolateRate(income: number, points: TaxPoints): number {
  if (income <= 0) return 0
  const last = points[points.length - 1]
  if (income >= last[0]) {
    const prev = points[points.length - 2]
    const slope = (last[1] - prev[1]) / (last[0] - prev[0])
    return Math.min(0.38, last[1] + slope * (income - last[0]) * 0.25)
  }
  for (let i = 1; i < points.length; i++) {
    if (income <= points[i][0]) {
      const [x0, r0] = points[i - 1]
      const [x1, r1] = points[i]
      return r0 + ((income - x0) / (x1 - x0)) * (r1 - r0)
    }
  }
  return 0
}

export function calculateCantonalTax(taxableIncome: number, canton: string, status: TaxCivilStatus): number {
  const points = CANTONAL[canton] ?? CANTONAL['AG']
  let rate = interpolateRate(taxableIncome, points)
  if (isMarried(status)) rate *= 0.82 // married tariff advantage
  return Math.round(Math.max(0, taxableIncome * rate))
}

// ─── Church Tax (Kirchensteuer) ───────────────────────────────────────────────
// Applied as a share of the cantonal tax (varies by canton and denomination)
const CHURCH_TAX_SHARE = 0.10

export function calculateChurchTax(cantonalTax: number): number {
  return Math.round(cantonalTax * CHURCH_TAX_SHARE)
}

// ─── Deductions (Abzüge) ──────────────────────────────────────────────────────

export interface Deductions {
  ahvALV: number
  pkContribution: number
  contribution3a: number
  berufsauslagen: number
  versicherungsabzug: number
  total: number
}

export function calculateDeductions(
  grossIncome: number,
  hasPK: boolean,
  yearly3a: number,
  has3a: boolean,
  status: TaxCivilStatus,
): Deductions {
  const ahvALV = Math.round(grossIncome * 0.064)       // AHV 5.3% + ALV 1.1%
  const coordinated = Math.max(0, grossIncome - 26460) // BVG Koordinationsabzug 2026
  const pkContribution = hasPK ? Math.round(coordinated * 0.085) : 0
  const contribution3a = has3a ? Math.min(yearly3a, 7258) : 0
  const berufsauslagen = Math.min(4000, Math.max(2000, Math.round(grossIncome * 0.03)))
  const versicherungsabzug = isMarried(status) ? 5600 : 2800

  const raw = ahvALV + pkContribution + contribution3a + berufsauslagen + versicherungsabzug
  const total = Math.min(raw, Math.round(grossIncome * 0.50))

  return { ahvALV, pkContribution, contribution3a, berufsauslagen, versicherungsabzug, total }
}

// ─── Main Income Tax Result ────────────────────────────────────────────────────

export interface IncomeTaxResult {
  grossIncome: number
  deductions: Deductions
  taxableIncome: number
  federalTax: number
  cantonalTax: number
  churchTax: number
  totalTax: number
  effectiveRate: number
  effectiveRateOnTaxable: number
  marginalRate: number
  netIncome: number
}

export function calculateIncomeTax(
  grossIncome: number,
  canton: string,
  status: TaxCivilStatus,
  hasPK: boolean,
  yearly3a: number,
  has3a: boolean,
  kirchensteuer: boolean,
): IncomeTaxResult {
  const deductions = calculateDeductions(grossIncome, hasPK, yearly3a, has3a, status)
  const taxableIncome = Math.max(0, grossIncome - deductions.total)

  const federalTax = calculateFederalTax(taxableIncome, status)
  const cantonalTax = calculateCantonalTax(taxableIncome, canton, status)
  const churchTax = kirchensteuer ? calculateChurchTax(cantonalTax) : 0
  const totalTax = federalTax + cantonalTax + churchTax

  // Marginal rate: numerical derivative on total cantonal+federal
  const delta = 2000
  const low = Math.max(0, taxableIncome - delta)
  const high = taxableIncome + delta
  const taxLow = calculateFederalTax(low, status) + calculateCantonalTax(low, canton, status)
  const taxHigh = calculateFederalTax(high, status) + calculateCantonalTax(high, canton, status)
  const marginalRate = Math.min(0.45, (taxHigh - taxLow) / (2 * delta))

  return {
    grossIncome,
    deductions,
    taxableIncome,
    federalTax,
    cantonalTax,
    churchTax,
    totalTax,
    effectiveRate: grossIncome > 0 ? totalTax / grossIncome : 0,
    effectiveRateOnTaxable: taxableIncome > 0 ? totalTax / taxableIncome : 0,
    marginalRate,
    netIncome: Math.max(0, grossIncome - totalTax - deductions.ahvALV - deductions.pkContribution),
  }
}

// ─── Retirement Income Tax ────────────────────────────────────────────────────
// AHV + PK rente are fully taxable; no employment deductions apply

export interface RetirementTaxResult {
  grossAnnualIncome: number
  taxableIncome: number
  federalTax: number
  cantonalTax: number
  churchTax: number
  totalTax: number
  monthlyTax: number
  effectiveRate: number
  marginalRate: number
}

export function calculateRetirementTax(
  ahvMonthly: number,
  pkMonthly: number,
  canton: string,
  status: TaxCivilStatus,
  kirchensteuer: boolean,
): RetirementTaxResult {
  const ahvYearly = ahvMonthly * 13  // incl. 13th AHV pension
  const pkYearly = pkMonthly * 12
  const gross = ahvYearly + pkYearly

  const versicherungsabzug = isMarried(status) ? 5600 : 2800
  const taxableIncome = Math.max(0, gross - versicherungsabzug)

  const federalTax = calculateFederalTax(taxableIncome, status)
  const cantonalTax = calculateCantonalTax(taxableIncome, canton, status)
  const churchTax = kirchensteuer ? calculateChurchTax(cantonalTax) : 0
  const totalTax = federalTax + cantonalTax + churchTax

  const delta = 1000
  const taxLow = calculateFederalTax(Math.max(0, taxableIncome - delta), status) + calculateCantonalTax(Math.max(0, taxableIncome - delta), canton, status)
  const taxHigh = calculateFederalTax(taxableIncome + delta, status) + calculateCantonalTax(taxableIncome + delta, canton, status)
  const marginalRate = Math.min(0.40, (taxHigh - taxLow) / (2 * delta))

  return {
    grossAnnualIncome: gross,
    taxableIncome,
    federalTax,
    cantonalTax,
    churchTax,
    totalTax,
    monthlyTax: Math.round(totalTax / 12),
    effectiveRate: gross > 0 ? totalTax / gross : 0,
    marginalRate,
  }
}

// ─── Capital Withdrawal Tax (Kapitalbezugssteuer) ─────────────────────────────
// Federal: 5 × tax_on(amount/5) — the Swiss "Sätzchen" method
// Cantonal: Separate Sondertarif, varies significantly by canton

type CapPoint = readonly [number, number]

const CANTONAL_CAPITAL: Record<string, ReadonlyArray<CapPoint>> = {
  AG: [[0,0],[50000,0.02],[100000,0.04],[200000,0.06],[400000,0.08],[600000,0.090],[1000000,0.110]],
  AI: [[0,0],[50000,0.01],[100000,0.02],[200000,0.03],[400000,0.04],[600000,0.050],[1000000,0.060]],
  AR: [[0,0],[50000,0.02],[100000,0.04],[200000,0.05],[400000,0.07],[600000,0.082],[1000000,0.098]],
  BE: [[0,0],[50000,0.015],[100000,0.035],[200000,0.055],[400000,0.070],[600000,0.083],[1000000,0.097]],
  BL: [[0,0],[50000,0.020],[100000,0.040],[200000,0.060],[400000,0.075],[600000,0.088],[1000000,0.102]],
  BS: [[0,0],[50000,0.025],[100000,0.052],[200000,0.077],[400000,0.092],[600000,0.107],[1000000,0.125]],
  FR: [[0,0],[50000,0.018],[100000,0.038],[200000,0.058],[400000,0.073],[600000,0.086],[1000000,0.100]],
  GE: [[0,0],[50000,0.027],[100000,0.055],[200000,0.080],[400000,0.097],[600000,0.113],[1000000,0.133]],
  GL: [[0,0],[50000,0.020],[100000,0.040],[200000,0.060],[400000,0.077],[600000,0.090],[1000000,0.105]],
  GR: [[0,0],[50000,0.016],[100000,0.033],[200000,0.051],[400000,0.065],[600000,0.076],[1000000,0.089]],
  JU: [[0,0],[50000,0.022],[100000,0.046],[200000,0.070],[400000,0.087],[600000,0.100],[1000000,0.116]],
  LU: [[0,0],[50000,0.015],[100000,0.030],[200000,0.048],[400000,0.062],[600000,0.072],[1000000,0.085]],
  NE: [[0,0],[50000,0.022],[100000,0.046],[200000,0.070],[400000,0.088],[600000,0.102],[1000000,0.119]],
  NW: [[0,0],[50000,0.012],[100000,0.024],[200000,0.038],[400000,0.050],[600000,0.058],[1000000,0.068]],
  OW: [[0,0],[50000,0.011],[100000,0.022],[200000,0.034],[400000,0.046],[600000,0.054],[1000000,0.063]],
  SG: [[0,0],[50000,0.020],[100000,0.040],[200000,0.062],[400000,0.077],[600000,0.090],[1000000,0.104]],
  SH: [[0,0],[50000,0.020],[100000,0.040],[200000,0.060],[400000,0.077],[600000,0.090],[1000000,0.103]],
  SO: [[0,0],[50000,0.018],[100000,0.038],[200000,0.058],[400000,0.073],[600000,0.086],[1000000,0.100]],
  SZ: [[0,0],[50000,0.010],[100000,0.020],[200000,0.032],[400000,0.042],[600000,0.049],[1000000,0.057]],
  TG: [[0,0],[50000,0.020],[100000,0.040],[200000,0.060],[400000,0.076],[600000,0.088],[1000000,0.102]],
  TI: [[0,0],[50000,0.018],[100000,0.038],[200000,0.058],[400000,0.073],[600000,0.086],[1000000,0.100]],
  UR: [[0,0],[50000,0.014],[100000,0.028],[200000,0.044],[400000,0.057],[600000,0.066],[1000000,0.078]],
  VD: [[0,0],[50000,0.023],[100000,0.047],[200000,0.072],[400000,0.090],[600000,0.105],[1000000,0.122]],
  VS: [[0,0],[50000,0.018],[100000,0.037],[200000,0.057],[400000,0.072],[600000,0.084],[1000000,0.098]],
  ZG: [[0,0],[50000,0.010],[100000,0.020],[200000,0.032],[400000,0.042],[600000,0.049],[1000000,0.057]],
  ZH: [[0,0],[50000,0.016],[100000,0.032],[200000,0.052],[400000,0.067],[600000,0.079],[1000000,0.093]],
}

function interpolateCapital(amount: number, points: ReadonlyArray<CapPoint>): number {
  if (amount <= 0) return 0
  const last = points[points.length - 1]
  if (amount >= last[0]) return last[1]
  for (let i = 1; i < points.length; i++) {
    if (amount <= points[i][0]) {
      const [x0, r0] = points[i - 1]
      const [x1, r1] = points[i]
      return r0 + ((amount - x0) / (x1 - x0)) * (r1 - r0)
    }
  }
  return 0
}

export interface CapitalTaxResult {
  grossAmount: number
  federalTax: number
  cantonalTax: number
  totalTax: number
  netAmount: number
  effectiveRate: number
}

export function calculateCapitalWithdrawalTax(
  amount: number,
  canton: string,
  status: TaxCivilStatus,
): CapitalTaxResult {
  // Federal: 5 × bracketTax(amount/5, Tarif A) — always Tarif A for capital
  const federalTax = Math.round(5 * bracketTax(amount / 5, DBG_A))

  const points = CANTONAL_CAPITAL[canton] ?? CANTONAL_CAPITAL['AG']
  let rate = interpolateCapital(amount, points)
  if (isMarried(status)) rate *= 0.88
  const cantonalTax = Math.round(amount * rate)

  const totalTax = federalTax + cantonalTax
  return {
    grossAmount: amount,
    federalTax,
    cantonalTax,
    totalTax,
    netAmount: amount - totalTax,
    effectiveRate: amount > 0 ? totalTax / amount : 0,
  }
}

// ─── PK Einkauf Steuerersparnis ───────────────────────────────────────────────

export function calculatePkPurchaseSavings(amounts: number[], marginalRate: number) {
  return amounts.map(amount => ({
    amount,
    saving: Math.round(amount * marginalRate),
    rate: marginalRate,
  }))
}

// ─── 3a Steuerersparnis ───────────────────────────────────────────────────────

export interface ThirdPillarSavings {
  maxContribution: number
  annualContribution: number
  annualSaving: number
  unusedPotential: number
  unusedPotentialSaving: number
  marginalRate: number
}

export function calculateThirdPillarSavings(
  annualContribution: number,
  marginalRate: number,
  hasPK: boolean,
): ThirdPillarSavings {
  const maxContribution = hasPK ? 7258 : 36288
  const capped = Math.min(annualContribution, maxContribution)
  return {
    maxContribution,
    annualContribution: capped,
    annualSaving: Math.round(capped * marginalRate),
    unusedPotential: Math.max(0, maxContribution - capped),
    unusedPotentialSaving: Math.round(Math.max(0, maxContribution - capped) * marginalRate),
    marginalRate,
  }
}

// ─── Rente vs. Kapital Steuervergleich ───────────────────────────────────────

export interface RvKYear {
  year: number
  age: number
  cumulativeRenteTax: number
  cumulativeKapitalTax: number
  crossover: boolean
}

export interface RenteVsKapitalResult {
  capitalTax: number
  annualMarginalRenteTax: number
  breakEvenAge: number | null
  years: RvKYear[]
}

export function calculateRenteVsKapital(
  pkCapital: number,
  pkMonthlyRente: number,
  canton: string,
  status: TaxCivilStatus,
  retirementAge: number,
  kirchensteuer: boolean,
  otherAnnualIncome: number,
): RenteVsKapitalResult {
  const capitalTaxResult = calculateCapitalWithdrawalTax(pkCapital, canton, status)
  const capitalTax = capitalTaxResult.totalTax

  // Annual marginal tax from receiving PK as rente (vs. not receiving it)
  const pkYearly = pkMonthlyRente * 12
  const versicherungsabzug = isMarried(status) ? 5600 : 2800
  const baseIncome = Math.max(0, otherAnnualIncome - versicherungsabzug)
  const withIncome = baseIncome + pkYearly

  const taxBase = calculateFederalTax(baseIncome, status) + calculateCantonalTax(baseIncome, canton, status)
  const taxWith = calculateFederalTax(withIncome, status) + calculateCantonalTax(withIncome, canton, status)
  let annualRenteTax = Math.max(0, taxWith - taxBase)
  if (kirchensteuer) annualRenteTax *= 1.10

  const years: RvKYear[] = []
  let breakEvenAge: number | null = null

  for (let i = 1; i <= 30; i++) {
    const age = retirementAge + i
    const cumRente = annualRenteTax * i
    if (!breakEvenAge && cumRente >= capitalTax && capitalTax > 0) breakEvenAge = age
    years.push({
      year: i,
      age,
      cumulativeRenteTax: cumRente,
      cumulativeKapitalTax: capitalTax,
      crossover: cumRente >= capitalTax,
    })
  }

  return { capitalTax, annualMarginalRenteTax: annualRenteTax, breakEvenAge, years }
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export const CANTON_NAMES: Record<string, string> = {
  AG: 'Aargau', AI: 'Appenzell I.Rh.', AR: 'Appenzell A.Rh.', BE: 'Bern',
  BL: 'Basel-Landschaft', BS: 'Basel-Stadt', FR: 'Freiburg', GE: 'Genf',
  GL: 'Glarus', GR: 'Graubünden', JU: 'Jura', LU: 'Luzern',
  NE: 'Neuenburg', NW: 'Nidwalden', OW: 'Obwalden', SG: 'St. Gallen',
  SH: 'Schaffhausen', SO: 'Solothurn', SZ: 'Schwyz', TG: 'Thurgau',
  TI: 'Tessin', UR: 'Uri', VD: 'Waadt', VS: 'Wallis', ZG: 'Zug', ZH: 'Zürich',
}

export const CANTONAL_TAX_URLS: Record<string, string> = {
  AG: 'https://www.ag.ch/de/verwaltung/dfr/steuern',
  AI: 'https://www.ai.ch/themen/finanzen-und-steuern/steuern',
  AR: 'https://www.ar.ch/verwaltung/finanzdepartement/steuerrechner/',
  BE: 'https://www.taxfile.be.ch',
  BL: 'https://www.baselland.ch/steuern',
  BS: 'https://www.steuern.bs.ch',
  FR: 'https://www.fr.ch/fr/finances-et-fiscalite/impots',
  GE: 'https://www.ge.ch/calculer-impots',
  GL: 'https://www.gl.ch/verwaltung/departemente/finanzdepartement/steuern.html',
  GR: 'https://www.gr.ch/DE/institutionen/verwaltung/ekud/stvwa/steuerrechner',
  JU: 'https://www.jura.ch/DFI/SAF',
  LU: 'https://www.steuern.lu.ch',
  NE: 'https://www.ne.ch/autorites/DFF/SFI',
  NW: 'https://www.nw.ch/steueramt',
  OW: 'https://www.ow.ch/themen/steuern',
  SG: 'https://www.sg.ch/steuern-finanzen/steuern/steuerrechner.html',
  SH: 'https://www.sh.ch/steuern',
  SO: 'https://www.so.ch/departemente/finanzen/steueramt',
  SZ: 'https://www.sz.ch/steuern',
  TG: 'https://www.tg.ch/steuern',
  TI: 'https://www4.ti.ch/dt/dc/sez',
  UR: 'https://www.ur.ch/steuern',
  VD: 'https://prestations.vd.ch/pub/vd-iccdex/',
  VS: 'https://www.vs.ch/web/scc/impots',
  ZG: 'https://www.zg.ch/behoerden/direktion-fur-inneres-und-justiz/steueramt',
  ZH: 'https://www.zh.ch/de/steuern-finanzen/steuern/steuerrechner.html',
}
