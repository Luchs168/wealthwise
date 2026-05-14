/**
 * AHV-Rentenberechnungen
 * Alle Kennzahlen aus zentralem swissVorsorge2025.ts
 * Quelle: ZHAW Vorsorgesystem Schweiz Update 2025
 */
import { AHV_AKTUELL, AHV_BEZUG_FAKTOREN_2025 } from '../constants/swissVorsorge2025'

// Re-export unter dem bisherigen Namen (rückwärtskompatibel)
export const AHV_2026 = AHV_AKTUELL

export function calcBaseRente(avgIncome: number): number {
  const { MIN_MONTHLY, MAX_MONTHLY, MIN_AVG_INCOME, MAX_AVG_INCOME } = AHV_AKTUELL
  if (avgIncome <= MIN_AVG_INCOME) return MIN_MONTHLY
  if (avgIncome >= MAX_AVG_INCOME) return MAX_MONTHLY
  const t = (avgIncome - MIN_AVG_INCOME) / (MAX_AVG_INCOME - MIN_AVG_INCOME)
  return Math.round(MIN_MONTHLY + t * (MAX_MONTHLY - MIN_MONTHLY))
}

export const KZG_YEARLY_2026 = AHV_AKTUELL.CHILD_CREDIT_YEARLY

export function computeKZGAdjustedIncome(
  grossIncome: number,
  effectiveYears: number,
  hasKZG: boolean,
  kzgChildren: number,
  kzgYears: number,
  civilStatus: string,
): number {
  if (!hasKZG || kzgChildren <= 0 || kzgYears <= 0 || effectiveYears <= 0) return grossIncome
  const totalYears = Math.min(kzgYears, 16 * kzgChildren)
  const isMarried = civilStatus === 'verheiratet' || civilStatus === 'partnerschaft'
  const kzgTotal = AHV_AKTUELL.CHILD_CREDIT_YEARLY * totalYears * (isMarried ? 0.5 : 1)
  const adjusted = grossIncome + kzgTotal / effectiveYears
  return Math.min(AHV_AKTUELL.MAX_AVG_INCOME, adjusted)
}

export interface AHVInput {
  avgIncome: number
  bezugAge: number
  effectiveContributionYears: number
}

export interface AHVResult {
  baseMonthly: number
  gapFactor: number
  bezugFactor: number
  monthlyRente: number
  yearlyRente: number
  yearlyInkl13: number
}

export function calculateAHVPension(input: AHVInput): AHVResult {
  const { avgIncome, bezugAge, effectiveContributionYears } = input
  const { FULL_CONTRIBUTION_YEARS, MIN_MONTHLY, MAX_MONTHLY } = AHV_AKTUELL

  const baseMonthly = calcBaseRente(avgIncome)

  const clampedYears = Math.min(Math.max(effectiveContributionYears, 0), FULL_CONTRIBUTION_YEARS)
  const gapFactor = clampedYears / FULL_CONTRIBUTION_YEARS
  const afterGap = baseMonthly * gapFactor

  const clampedAge = Math.min(Math.max(bezugAge, 63), 70)
  const bezugFactor = AHV_BEZUG_FAKTOREN_2025[clampedAge] ?? 1.0
  const monthly = Math.round(Math.max(MIN_MONTHLY, Math.min(MAX_MONTHLY, afterGap * bezugFactor)))

  return {
    baseMonthly,
    gapFactor,
    bezugFactor,
    monthlyRente: monthly,
    yearlyRente: monthly * 12,
    yearlyInkl13: monthly * 13,
  }
}

export function applyPlafonierung(
  monthly1: number,
  monthly2: number,
  civilStatus: string,
): { monthly1: number; monthly2: number; plafonReduction: number } {
  const isMarried = civilStatus === 'verheiratet' || civilStatus === 'partnerschaft'
  const combined = monthly1 + monthly2
  const cap = AHV_AKTUELL.PLAFOND_MONTHLY

  if (!isMarried || combined <= cap) {
    return { monthly1, monthly2, plafonReduction: 0 }
  }

  const ratio = cap / combined
  return {
    monthly1: Math.round(monthly1 * ratio),
    monthly2: Math.round(monthly2 * ratio),
    plafonReduction: Math.round(combined - cap),
  }
}

export interface AHVVariant {
  bezugAge: number
  label: string
  shortLabel: string
  bezugFactor: number
  monthlyRente: number
  yearlyRente: number
  yearlyInkl13: number
  cumulative10y: number
  cumulative20y: number
}

export function calculateAllVariants(
  avgIncome: number,
  _effectiveContributionYears: number,
  gaps: number = 0,
): AHVVariant[] {
  const VARIANTS = [
    { bezugAge: 63, label: 'Vorbezug 2 Jahre (ab 63)', shortLabel: 'Vorbezug 2J' },
    { bezugAge: 64, label: 'Vorbezug 1 Jahr (ab 64)', shortLabel: 'Vorbezug 1J' },
    { bezugAge: 65, label: 'Ordentlich (ab 65)', shortLabel: 'Ordentlich' },
    { bezugAge: 66, label: 'Aufschub 1 Jahr (ab 66)', shortLabel: 'Aufschub 1J' },
    { bezugAge: 67, label: 'Aufschub 2 Jahre (ab 67)', shortLabel: 'Aufschub 2J' },
  ]

  return VARIANTS.map((v) => {
    const variantBaseYears = Math.min(AHV_AKTUELL.FULL_CONTRIBUTION_YEARS, Math.max(0, v.bezugAge - 21))
    const variantYears = Math.max(0, variantBaseYears - gaps)
    const result = calculateAHVPension({
      avgIncome,
      bezugAge: v.bezugAge,
      effectiveContributionYears: variantYears,
    })
    const cum10 = result.monthlyRente * 12 * Math.max(0, 10 - (v.bezugAge - 63))
    const cum20 = result.monthlyRente * 12 * Math.max(0, 20 - (v.bezugAge - 63))
    return {
      bezugAge: v.bezugAge,
      label: v.label,
      shortLabel: v.shortLabel,
      bezugFactor: result.bezugFactor,
      monthlyRente: result.monthlyRente,
      yearlyRente: result.yearlyRente,
      yearlyInkl13: result.yearlyInkl13,
      cumulative10y: cum10,
      cumulative20y: cum20,
    }
  })
}

export function calculateBreakEven(
  earlyMonthly: number,
  earlyStartAge: number,
  lateMonthly: number,
  lateStartAge: number,
): number | null {
  if (earlyMonthly >= lateMonthly) return null
  const t =
    (earlyMonthly * earlyStartAge - lateMonthly * lateStartAge) /
    (earlyMonthly - lateMonthly)
  return Math.round(t * 10) / 10
}

export type BreakEvenPoint = {
  age: number
  v63: number
  v64: number
  v65: number
  v66: number
  v67: number
  [key: string]: number
}

export function buildBreakEvenChartData(variants: AHVVariant[]): BreakEvenPoint[] {
  const data: BreakEvenPoint[] = []
  for (let age = 63; age <= 93; age++) {
    const point: BreakEvenPoint = { age, v63: 0, v64: 0, v65: 0, v66: 0, v67: 0 }
    for (const v of variants) {
      const years = Math.max(0, age - v.bezugAge)
      const key = `v${v.bezugAge}` as keyof BreakEvenPoint
      ;(point as Record<string, number>)[key] = v.monthlyRente * 12 * years
    }
    data.push(point)
  }
  return data
}
