// WealthWise Calculation Engine – ported from wealthwise-calc.js

export const CONSTANTS = {
  AHV_REFERENCE_AGE: 65,
  AHV_FULL_CONTRIBUTION_YEARS: 44,
  AHV_EARLY_REDUCTION_PER_YEAR: 6.8,
  AHV_DELAY_INCREASE_PER_YEAR: 5.2,
  AHV_MAX_DELAY_YEARS: 5,
  AHV_MIN_MONTHLY: 1260,
  AHV_MAX_MONTHLY: 2520,
  AHV_PLAFOND_FACTOR: 1.5,
  AHV_PLAFOND_MONTHLY: 3780,
  AHV_CHILD_CREDIT_YEARLY: 44100,
  BVG_MIN_CONVERSION_RATE: 6.8,
  BVG_TYPICAL_CONVERSION_RATE: 5.4,
  PK_3A_MAX_WITH_PK: 7258,
  PK_3A_MAX_WITHOUT_PK: 36288,
  DEFAULT_INFLATION_RATE: 0.015,
  RETURNS: {
    conservative: 0.01,
    balanced: 0.025,
    growth: 0.045,
  },
  LIFE_EXPECTANCY: {
    male: { 50: 33.2, 55: 28.6, 60: 24.1, 65: 19.8, 70: 15.7, 75: 11.9 },
    female: { 50: 36.5, 55: 31.8, 60: 27.1, 65: 22.5, 70: 18.0, 75: 13.7 },
  },
  CAPITAL_TAX_BRACKETS: [
    { upTo: 50000, rate: 0.02 },
    { upTo: 100000, rate: 0.03 },
    { upTo: 200000, rate: 0.045 },
    { upTo: 500000, rate: 0.06 },
    { upTo: 1000000, rate: 0.08 },
    { upTo: Infinity, rate: 0.095 },
  ],
  AHV_SCALE_44: [
    { avgIncome: 0, monthlyRent: 1260 },
    { avgIncome: 15120, monthlyRent: 1260 },
    { avgIncome: 21600, monthlyRent: 1313 },
    { avgIncome: 28800, monthlyRent: 1400 },
    { avgIncome: 36000, monthlyRent: 1505 },
    { avgIncome: 43200, monthlyRent: 1627 },
    { avgIncome: 50400, monthlyRent: 1764 },
    { avgIncome: 57600, monthlyRent: 1890 },
    { avgIncome: 64800, monthlyRent: 2013 },
    { avgIncome: 72000, monthlyRent: 2138 },
    { avgIncome: 79200, monthlyRent: 2261 },
    { avgIncome: 86400, monthlyRent: 2385 },
    { avgIncome: 90720, monthlyRent: 2520 },
  ],
}

export function fmtCHF(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '0'
  return new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 }).format(Math.round(n))
}

export function fmtSign(n: number): string {
  return (n >= 0 ? '+ CHF ' : '− CHF ') + fmtCHF(Math.abs(n))
}

export function calculateAge(birthDate: string, atDate?: Date): number {
  if (!birthDate) return 0
  const ref = atDate || new Date()
  const dob = new Date(birthDate)
  if (isNaN(dob.getTime())) return 0
  let age = ref.getFullYear() - dob.getFullYear()
  const m = ref.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--
  return age
}

export function getLifeExpectancy(gender: string, currentAge: number): number {
  const table = CONSTANTS.LIFE_EXPECTANCY[gender === 'm' ? 'male' : 'female'] as Record<number, number>
  const ages = Object.keys(table).map(Number).sort((a, b) => a - b)
  let pick = ages[0]
  for (const a of ages) if (a <= currentAge) pick = a
  return currentAge + table[pick]
}

export function calculatePMT(monthlyRate: number, totalMonths: number, presentValue: number): number {
  if (monthlyRate === 0) return presentValue / totalMonths
  const f = Math.pow(1 + monthlyRate, totalMonths)
  return (presentValue * monthlyRate * f) / (f - 1)
}

export function calculateCapitalWithdrawalTax(capital: number): number {
  if (!capital || capital <= 0) return 0
  let tax = 0
  let remaining = capital
  let prev = 0
  for (const b of CONSTANTS.CAPITAL_TAX_BRACKETS) {
    const slice = Math.min(remaining, b.upTo - prev)
    if (slice <= 0) break
    tax += slice * b.rate
    remaining -= slice
    prev = b.upTo
    if (remaining <= 0) break
  }
  return Math.round(tax)
}

export interface AhvPersonInput {
  grossIncome?: number
  hasChildCredits?: boolean
  numberOfChildren?: number
  ahvContributionYears?: number
  ahvContributionGaps?: number
  retirementAge?: number
  civilStatus?: string
}

export interface AhvPersonResult {
  monthlyRente: number
  yearlyRente: number
  yearlyInkl13: number
  avgIncomeUsed: number
  reductionForGaps: number
  reductionForEarlyRetirement: number
  increaseForDelay: number
}

export function calculateAhvPro(person: AhvPersonInput, civilStatus?: string): AhvPersonResult {
  const cs = civilStatus || person.civilStatus || 'ledig'

  let avgIncome = person.grossIncome || 0
  if (person.hasChildCredits && (person.numberOfChildren || 0) > 0) {
    const split = cs === 'verheiratet' || cs === 'married' ? 0.5 : 1
    avgIncome += CONSTANTS.AHV_CHILD_CREDIT_YEARLY * split
  }

  const scale = CONSTANTS.AHV_SCALE_44
  let monthly = scale[scale.length - 1].monthlyRent
  for (let i = 0; i < scale.length - 1; i++) {
    const a = scale[i], b = scale[i + 1]
    if (avgIncome >= a.avgIncome && avgIncome < b.avgIncome) {
      const t = (avgIncome - a.avgIncome) / (b.avgIncome - a.avgIncome)
      monthly = a.monthlyRent + t * (b.monthlyRent - a.monthlyRent)
      break
    }
  }
  monthly = Math.round(monthly)

  const fullYears = CONSTANTS.AHV_FULL_CONTRIBUTION_YEARS
  const years = (person.ahvContributionYears || fullYears) - (person.ahvContributionGaps || 0)
  let gapReduction = 0
  if (years < fullYears) {
    const missing = Math.max(0, fullYears - years)
    gapReduction = missing / fullYears
    monthly = Math.round(monthly * (1 - gapReduction))
  }

  let earlyReduction = 0
  let delayIncrease = 0
  const ra = person.retirementAge || CONSTANTS.AHV_REFERENCE_AGE
  if (ra < CONSTANTS.AHV_REFERENCE_AGE) {
    const earlyYears = CONSTANTS.AHV_REFERENCE_AGE - ra
    earlyReduction = (earlyYears * CONSTANTS.AHV_EARLY_REDUCTION_PER_YEAR) / 100
    monthly = Math.round(monthly * (1 - earlyReduction))
  } else if (ra > CONSTANTS.AHV_REFERENCE_AGE) {
    const delay = Math.min(ra - CONSTANTS.AHV_REFERENCE_AGE, CONSTANTS.AHV_MAX_DELAY_YEARS)
    delayIncrease = (delay * CONSTANTS.AHV_DELAY_INCREASE_PER_YEAR) / 100
    monthly = Math.round(monthly * (1 + delayIncrease))
  }

  monthly = Math.max(CONSTANTS.AHV_MIN_MONTHLY, Math.min(CONSTANTS.AHV_MAX_MONTHLY, monthly))

  return {
    monthlyRente: monthly,
    yearlyRente: monthly * 12,
    yearlyInkl13: monthly * 13,
    avgIncomeUsed: Math.round(avgIncome),
    reductionForGaps: gapReduction,
    reductionForEarlyRetirement: earlyReduction,
    increaseForDelay: delayIncrease,
  }
}

export interface AhvHouseholdResult {
  person1: AhvPersonResult
  person2: AhvPersonResult | null
  combinedMonthly: number
  combinedYearly: number
  combinedYearlyInkl13: number
  plafonReduction: number
}

export function calculateAhvHousehold(
  p1: AhvPersonInput,
  p2: AhvPersonInput | null,
  civilStatus: string
): AhvHouseholdResult {
  const r1 = calculateAhvPro(p1, civilStatus)
  const r2 = p2 ? calculateAhvPro(p2, civilStatus) : null
  const cs = civilStatus || 'ledig'
  let combinedMonthly = r1.monthlyRente + (r2 ? r2.monthlyRente : 0)
  let plafonReduction = 0
  if (r2 && (cs === 'verheiratet' || cs === 'married' || cs === 'partnerschaft')) {
    const cap = CONSTANTS.AHV_PLAFOND_MONTHLY
    if (combinedMonthly > cap) {
      plafonReduction = combinedMonthly - cap
      combinedMonthly = cap
    }
  }
  return {
    person1: r1,
    person2: r2,
    combinedMonthly,
    combinedYearly: combinedMonthly * 12,
    combinedYearlyInkl13: combinedMonthly * 13,
    plafonReduction,
  }
}

export interface PkPersonInput {
  pkCapitalAt65?: number
  pkConversionRate?: number
}

export interface PkRenteResult {
  yearlyRente: number
  monthlyRente: number
  capital: number
  conversionRate: number
}

export function calculatePkRente(person: PkPersonInput): PkRenteResult {
  const cap = person.pkCapitalAt65 || 0
  const rate = (person.pkConversionRate || CONSTANTS.BVG_TYPICAL_CONVERSION_RATE) / 100
  const yearly = cap * rate
  return {
    yearlyRente: Math.round(yearly),
    monthlyRente: Math.round(yearly / 12),
    capital: cap,
    conversionRate: rate * 100,
  }
}

export interface PkHouseholdResult {
  person1: PkRenteResult
  person2: PkRenteResult | null
  combinedMonthly: number
  combinedYearly: number
}

export function calculatePkHousehold(p1: PkPersonInput, p2: PkPersonInput | null): PkHouseholdResult {
  const r1 = calculatePkRente(p1)
  const r2 = p2 && p2.pkCapitalAt65 ? calculatePkRente(p2) : null
  return {
    person1: r1,
    person2: r2,
    combinedMonthly: r1.monthlyRente + (r2 ? r2.monthlyRente : 0),
    combinedYearly: r1.yearlyRente + (r2 ? r2.yearlyRente : 0),
  }
}

// 3a projection
export function project3a(balance: number, yearly: number, years: number, rendite = 0.02): number {
  let total = balance
  for (let i = 0; i < years; i++) {
    total = total * (1 + rendite) + yearly
  }
  return Math.round(total)
}
