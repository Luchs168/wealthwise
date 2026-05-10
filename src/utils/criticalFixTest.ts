/**
 * Plausibility test: Mann, 60, ledig, Zürich
 * Lohn CHF 100'000 · PK CHF 400'000 (UWS 5.4%) · 3a CHF 80'000
 * FZ CHF 50'000 · Freies Vermögen CHF 150'000
 *
 * Run: npx tsx src/utils/criticalFixTest.ts
 */

import { calculateAHVPension } from './ahvCalculation'
import { calculateRetirementTax, calculateCapitalWithdrawalTax } from '../lib/tax'
import { calculateProAnalysis } from '../lib/cashflow'

const CANTON = 'ZH'
const GROSS_INCOME = 100_000
const PK_CAPITAL = 400_000
const PK_RATE = 5.4
const BALANCE_3A = 80_000
const FZ_BALANCE = 50_000
const FREE_ASSETS = 150_000
const MONTHLY_EXPENSES = 5_000

// ── K1: AHV ──────────────────────────────────────────────────────────────────
const ahv = calculateAHVPension({
  avgIncome: GROSS_INCOME,
  bezugAge: 65,
  effectiveContributionYears: 44,
})
console.log('── K1 AHV (korrekte Werte 14\'700/88\'200) ──────────')
console.log(`  Base-Rente:      CHF ${ahv.baseMonthly}/Mt.`)
console.log(`  Monatliche AHV:  CHF ${ahv.monthlyRente}/Mt.`)
console.log(`  Jährlich ×13:    CHF ${ahv.yearlyInkl13}`)
const ok_ahv = ahv.monthlyRente >= 1260 && ahv.monthlyRente <= 2520
console.log(`  Plausibel: ${ok_ahv ? '✓' : '✗'} (Bereich CHF 1\'260–2\'520)`)

// ── K2: Retirement Tax ────────────────────────────────────────────────────────
const pkMonthly = (PK_CAPITAL * PK_RATE / 100) / 12
const retTax = calculateRetirementTax(ahv.monthlyRente, pkMonthly, CANTON, 'ledig', false)
console.log('\n── K2 Retirement Tax (statt 8% pauschal) ───────────')
console.log(`  PK-Rente:        CHF ${Math.round(pkMonthly)}/Mt.`)
console.log(`  AHV-Rente:       CHF ${ahv.monthlyRente}/Mt.`)
console.log(`  Steuerbares Ek:  CHF ${retTax.taxableIncome}`)
console.log(`  Bundessteuer:    CHF ${retTax.federalTax}`)
console.log(`  Kantonssteuer:   CHF ${retTax.cantonalTax}`)
console.log(`  Total Steuern:   CHF ${retTax.totalTax}`)
console.log(`  Eff. Steuersatz: ${(retTax.effectiveRate * 100).toFixed(1)}%`)
const flat8 = Math.round((ahv.monthlyRente * 13 + pkMonthly * 12) * 0.08)
console.log(`  Pauschal 8%:     CHF ${flat8} → Differenz: CHF ${flat8 - retTax.totalTax}`)
const ok_tax = retTax.effectiveRate > 0.05 && retTax.effectiveRate < 0.25
console.log(`  Plausibel: ${ok_tax ? '✓' : '✗'} (Eff. Rate 5–25%)`)

// ── K3: Capital Withdrawal Tax ────────────────────────────────────────────────
const capTax = calculateCapitalWithdrawalTax(PK_CAPITAL, CANTON, 'ledig')
console.log('\n── K3 Kapitalbezugssteuer Zürich (Sätzchen) ────────')
console.log(`  Kapital:         CHF ${PK_CAPITAL}`)
console.log(`  Bundessteuer:    CHF ${capTax.federalTax}`)
console.log(`  Kantonssteuer:   CHF ${capTax.cantonalTax}`)
console.log(`  Total Steuer:    CHF ${capTax.totalTax}`)
console.log(`  Eff. Rate:       ${(capTax.effectiveRate * 100).toFixed(2)}%`)
console.log(`  Netto:           CHF ${capTax.netAmount}`)
const ok_cap = capTax.effectiveRate > 0.04 && capTax.effectiveRate < 0.12
console.log(`  Plausibel: ${ok_cap ? '✓' : '✗'} (Rate 4–12% bei CHF 400k)`)

// ── K4 + Full ProAnalysis ─────────────────────────────────────────────────────
const analysis = calculateProAnalysis({
  person1: {
    dob: `${new Date().getFullYear() - 60}-06-15`,
    retireAge: 65,
    grossIncome: GROSS_INCOME,
    income: GROSS_INCOME,
    pkCapital: PK_CAPITAL,
    pkCapitalAt65: PK_CAPITAL,
    pkRate: PK_RATE,
    pkBezugsart: 'rente',
    has3a: true,
    pillar3aBalance: BALANCE_3A,
    balance3a: BALANCE_3A,
    ahvContributionYears: 44,
    ahvContributionGaps: 0,
    ahvBezugAge: 65,
    hasFZ: true,
    fzBalance: FZ_BALANCE,
  },
  person2: null,
  civilStatus: 'ledig',
  canton: CANTON,
  kirchensteuer: false,
  freeAssets: FREE_ASSETS,
  monthlyExpenses: MONTHLY_EXPENSES,
})

console.log('\n── K4 + Full ProAnalysis ────────────────────────────')
console.log(`  AHV monatlich:   CHF ${analysis.ahv.person1.monthlyRente}/Mt.`)
console.log(`  AHV ×13:         CHF ${analysis.ahv.person1.yearlyInkl13}/Jahr`)
console.log(`  PK-Rente:        CHF ${analysis.pk.person1.monthlyRente}/Mt.`)
console.log(`  Score:           ${analysis.sustainabilityScore}/100 (${analysis.verdict})`)
console.log(`  Monatliches Ek:  CHF ${analysis.monthlyIncome.total}`)
console.log(`  Überschuss:      CHF ${analysis.surplus}/Mt.`)
console.log(`  Broke at age:    ${analysis.ageWhenBroke ?? 'never (>95)'}`)

const y65 = analysis.yearlyCashflow.find(r => r.isRetirementYear)
if (y65) {
  console.log(`\n  Rentenjahr Alter ${y65.age}:`)
  console.log(`    AHV-Ek:        CHF ${y65.ahvIncome}`)
  console.log(`    PK-Rente:      CHF ${y65.pkRenteIncome}`)
  console.log(`    Steuern:       CHF ${y65.taxes}`)
  console.log(`    Vermögen Ende: CHF ${y65.wealthEndOfYear}`)
}

// K4 verification: initial wealth should include FZ net
const firstYear = analysis.yearlyCashflow[0]
console.log(`\n  Vermögen Start:  CHF ${firstYear.wealthEndOfYear} (inkl. FZ-Netto)`)
const fzNet = FZ_BALANCE - calculateCapitalWithdrawalTax(FZ_BALANCE, CANTON, 'ledig').totalTax
console.log(`  FZ netto:        CHF ${fzNet}`)

const ok_analysis = analysis.sustainabilityScore > 0 && analysis.sustainabilityScore <= 100
console.log(`\n  Plausibel: ${ok_analysis ? '✓' : '✗'}`)
console.log('\n✓ Alle Prüfungen abgeschlossen')
