import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Area, AreaChart, BarChart, Bar,
} from 'recharts'
import TopBar from '../components/TopBar'
import ProgressBar from '../components/ProgressBar'
import ChatPanel from '../components/ChatPanel'
import { useStore, getPersonsForCalc } from '../store'
import { fmtCHF, calculateAge } from '../lib/calc'
import {
  calculateIncomeTax, calculateRetirementTax, calculateCapitalWithdrawalTax,
  calculateThirdPillarSavings, calculatePkPurchaseSavings, calculateRenteVsKapital,
  calculateEigenmietwert,
  CANTONAL_TAX_URLS, CANTON_NAMES,
} from '../lib/tax'
import type { TaxCivilStatus } from '../lib/tax'
import { applyEventsToProjection, getEventImpactSummary } from '../utils/lifeEventCalculation'
import { calculateAllVariants, calculateBreakEven, buildBreakEvenChartData, AHV_2026 } from '../utils/ahvCalculation'
import { AHV_BEZUG_FAKTOREN_2025 } from '../constants/swissVorsorge2025'
import {
  projectPKCapital, calculatePKPension, estimateContribution,
  calculateEarlyRetirementImpact, calculateBuyInImpact, buildPKProjectionChartData,
} from '../utils/pkCalculation'
import { PK_CONSTANTS } from '../constants/pkConstants'
import {
  calculateBreakEvenAge, buildRvKChartData, calculateSurvivorBenefits, buildScenarios,
  calculateMixedVariant, LIFE_EXPECTANCY_MALE_65, LIFE_EXPECTANCY_FEMALE_65,
} from '../utils/capitalVsRentCalculation'
import {
  calculateBridgingGap, calculateAHVContributionNonEmployed, calculateAHVEarlyWithdrawalImpact,
  calculateBridgingFromCapital, calculatePartTimeImpact, calculateOptimalBridgingStrategy,
  buildBridgingChartData,
} from '../utils/bridgingCalculation'
import {
  calculateWealthDepletion, calculateDepletionAge, buildDepletionScenarios, calculateWithdrawalStrategies,
  calculateSensitivity, calculateELEligibility, buildScenarioChartData,
} from '../utils/wealthDepletionCalculation'
import { generateYearlyProjection, exportProjectionToCSV, downloadCSV } from '../utils/projectionTable'
import { WEALTH_CONSTANTS } from '../constants/wealthConstants'
import { CATEGORY_CONFIG } from '../types/lifeEvents'
import { calculateProAnalysis, calculateScenarios } from '../lib/cashflow'
import { calculateOptimalWithdrawal } from '../utils/withdrawalPlanCalculation'
import { InfoTooltip } from '../components/Tooltip'

function ScoreRing({ score, verdict }: { score: number; verdict: string }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ
  const color = verdict === 'green' ? '#22c55e' : verdict === 'yellow' ? '#f59e0b' : '#ef4444'
  return (
    <svg width={130} height={130} viewBox="0 0 130 130">
      <circle cx={65} cy={65} r={r} fill="none" stroke="var(--ink-100)" strokeWidth={10} />
      <circle
        cx={65} cy={65} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        transform="rotate(-90 65 65)"
      />
      <text x={65} y={60} textAnchor="middle" fontSize={28} fontWeight={700} fill={color}
        fontFamily="var(--font-display)">{score}</text>
      <text x={65} y={78} textAnchor="middle" fontSize={11} fill="var(--ink-500)">/100</text>
    </svg>
  )
}

const fmtK = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)}k`
  return String(v)
}

const RECS: Record<string, Array<{ text: string; priority: 'hoch' | 'mittel' | 'niedrig'; detail: string }>> = {
  green: [
    {
      text: 'Ihre Vorsorge ist solide aufgestellt – der Grundstein ist gelegt.',
      priority: 'niedrig',
      detail: 'Ihre Renten übersteigen Ihren geplanten Bedarf. Fokussieren Sie sich auf Steueroptimierung und Nachlassplanung. Überprüfen Sie Ihr Testament und allfällige Begünstigungsklauseln in der Lebensversicherung.',
    },
    {
      text: 'Prüfen Sie eine schrittweise Pensionierung zur steuerlichen Optimierung.',
      priority: 'mittel',
      detail: 'Eine Teilpensionierung (z.B. 80% ab 63, vollständig mit 65) ermöglicht einen sanften Übergang und optimiert den Steuerprogressor – das Einkommen wird über mehr Jahre verteilt.',
    },
    {
      text: 'Beziehen Sie Säule-3a-Gelder gestaffelt über mehrere Jahre (Progressionsvorteil).',
      priority: 'mittel',
      detail: 'Mit 3–5 separaten 3a-Konten lässt sich der Bezug über mehrere Steuerjahre staffeln. Jeder Bezug wird separat besteuert – der Progressionsvorteil spart je nach Kanton mehrere Tausend Franken.',
    },
    {
      text: 'Überprüfen Sie Ihre Nachlassplanung und gegenseitige Begünstigung.',
      priority: 'niedrig',
      detail: 'Das neue Erbrecht (seit 2023) bietet mehr Flexibilität. Lassen Sie Ihren Ehevertrag und das Testament durch eine Notarin oder einen Notar prüfen, um Ihre gegenseitige Begünstigung optimal zu gestalten.',
    },
  ],
  yellow: [
    {
      text: 'Schliessen Sie allfällige AHV-Beitragslücken durch freiwillige Einzahlungen.',
      priority: 'hoch',
      detail: 'AHV-Beitragslücken entstehen durch Auslandaufenthalte, Studium oder Selbständigkeit ohne Beiträge. Jedes fehlende Beitragsjahr kürzt die AHV-Rente um ca. 2.3% – lebenslang. Die SVA berät Sie über Nachzahlungsmöglichkeiten.',
    },
    {
      text: 'Prüfen Sie Einkäufe in die Pensionskasse für steuerliche Einsparungen.',
      priority: 'hoch',
      detail: 'PK-Einkäufe sind steuerlich vollständig vom steuerbaren Einkommen abzugsfähig. Bei einem Grenzsteuersatz von 30% bedeutet ein Einkauf von CHF 50\'000 eine Steuerersparnis von ca. CHF 15\'000. Zudem verbessert sich Ihre Rente direkt.',
    },
    {
      text: 'Maximieren Sie die Säule-3a-Einzahlungen bis zur Pensionierung.',
      priority: 'mittel',
      detail: 'Das 3a-Maximum 2026 beträgt CHF 7\'258 pro Person und Jahr (Erwerbstätige mit PK). Jeder einbezahlte Franken reduziert das steuerbare Einkommen direkt und wächst steuerfrei an.',
    },
    {
      text: 'Prüfen Sie, ob eine Weiterarbeit bis 66/67 Ihre Renten signifikant verbessert.',
      priority: 'mittel',
      detail: 'Jedes zusätzliche Beitragsjahr erhöht sowohl die AHV-Rente als auch das PK-Kapital. Der AHV-Aufschub von einem Jahr erhöht die Rente um 5.2%. Dies kann eine klaffende Vorsorgelücke deutlich reduzieren.',
    },
  ],
  red: [
    {
      text: 'Dringend: Klären Sie mögliche PK-Einkäufe zur Verbesserung der Rente.',
      priority: 'hoch',
      detail: 'PK-Einkäufe sind die wirksamste Massnahme gegen eine drohende Vorsorgelücke. Sie füllen Rentenlücken und sind steuerlich voll abzugsfähig. Kontaktieren Sie Ihre Pensionskasse umgehend für einen individuellen Einkaufsplan.',
    },
    {
      text: 'Prüfen Sie, ob ein späterer Rentenbezug (Aufschub) finanziell sinnvoll ist.',
      priority: 'hoch',
      detail: 'AHV-Aufschub von einem Jahr erhöht die AHV-Rente um 5.2% – lebenslang. Ein Aufschub bis 67 ergibt 10.4% mehr monatliche Rente. Je gesünder Sie sind und je länger Ihre Lebenserwartung, desto attraktiver ist der Aufschub.',
    },
    {
      text: 'Überprüfen Sie Ihre geplanten Ausgaben und mögliche Sparpotenziale.',
      priority: 'mittel',
      detail: 'Analysieren Sie Ihr geplantes Budget kritisch. Berufsbedingte Kosten (Fahrkosten, Verpflegung, Berufskleidung) entfallen nach der Pensionierung. Möglicherweise liegt Ihr tatsächlicher Bedarf tiefer als berechnet.',
    },
    {
      text: 'Nehmen Sie eine professionelle Vorsorgeberatung in Anspruch.',
      priority: 'hoch',
      detail: 'Eine qualifizierte Finanzberatung durch einen eidgenössisch anerkannten Finanzplaner (CFP) oder eine Pensionskassenberatung kann verbindliche, auf Ihre Situation zugeschnittene Massnahmen aufzeigen. Viele Kantone bieten zudem kostenlose Beratungsstellen an.',
    },
  ],
}

export default function Screen4() {
  const navigate = useNavigate()
  const state = useStore()
  const { expenses, person1, person2, hasPartner, location, freeAssets, property, kirchensteuer, lifeEvents, riskProfile } = state
  const [showCashflowTable, setShowCashflowTable] = useState(false)
  const [expandedRecs, setExpandedRecs] = useState<Set<number>>(new Set())
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false)
  const [careStartAge, setCareStartAge] = useState(82)
  const [careType, setCareType] = useState<'spitex_leicht' | 'spitex_mittel' | 'heim_standard' | 'heim_gehoben'>('heim_standard')

  const { p1, p2, civilStatus } = useMemo(() => getPersonsForCalc(state), [state])

  const monthlyBudget = useMemo(() => {
    const kkTotal = (expenses.kkPremium1 || 0) + (hasPartner ? (expenses.kkPremium2 || 0) : 0)
    if (expenses.simpleTotal > 0) return expenses.simpleTotal + kkTotal
    if (expenses.mode === 'detailed') {
      const CATS = ['wohnen', 'gesundheit', 'nahrung', 'mobilitaet', 'freizeit', 'bekleidung', 'kommunikation', 'uebrige']
      const DEFAULTS: Record<string, number> = { wohnen: 1476, gesundheit: 615, nahrung: 1080, mobilitaet: 650, freizeit: 580, bekleidung: 180, kommunikation: 200, uebrige: 600 }
      return CATS.reduce((s, id) => s + (expenses.detailed[id] ?? DEFAULTS[id]), 0) + kkTotal
    }
    return 4000 + kkTotal
  }, [expenses, hasPartner])

  // canton declared early — used in both inputData and tax section
  const canton = location?.kanton ?? 'ZH'

  const inputData = useMemo(() => ({
    person1: p1,
    person2: p2,
    civilStatus,
    canton: canton || 'ZH',
    kirchensteuer,
    freeAssets: freeAssets || 0,
    monthlyExpenses: monthlyBudget,
    hasProperty: property.has,
    monthlyMortgageCost: property.has ? property.mortgage : 0,
    riskProfile,
  }), [p1, p2, civilStatus, canton, kirchensteuer, freeAssets, monthlyBudget, property, riskProfile])

  const analysis = useMemo(() => calculateProAnalysis(inputData), [inputData])
  const scenarios = useMemo(() => calculateScenarios(inputData), [inputData])

  const ra1 = p1.retireAge || p1.retirementAge || 65
  const currentAge1 = p1.dob ? calculateAge(p1.dob) : (p1.birthDate ? calculateAge(p1.birthDate) : 55)

  // Was wäre wenn slider
  const [altRetireAge, setAltRetireAge] = useState(ra1)
  const altInputData = useMemo(() => ({
    ...inputData,
    person1: { ...p1, retireAge: altRetireAge, retirementAge: altRetireAge },
  }), [inputData, p1, altRetireAge])
  const altAnalysis = useMemo(() => calculateProAnalysis(altInputData), [altInputData])

  // Life events integration
  const retirementYear = new Date().getFullYear() + Math.max(1, ra1 - currentAge1)
  const eventsImpact = useMemo(
    () => getEventImpactSummary(lifeEvents, retirementYear),
    [lifeEvents, retirementYear],
  )
  const adjustedCashflow = useMemo(
    () => lifeEvents.filter(e => e.enabled && e.amount > 0).length > 0
      ? applyEventsToProjection(analysis.yearlyCashflow, lifeEvents)
      : null,
    [analysis.yearlyCashflow, lifeEvents],
  )
  const ageWhenBrokeWithEvents = useMemo(() => {
    if (!adjustedCashflow) return analysis.ageWhenBroke
    const broke = adjustedCashflow.find(r => r.wealthEndOfYear <= 0)
    return broke ? broke.age : null
  }, [adjustedCashflow, analysis.ageWhenBroke])
  const hasEnabledEvents = lifeEvents.filter(e => e.enabled && e.amount > 0).length > 0

  // Tax section
  const taxStatus: TaxCivilStatus = (civilStatus === 'verheiratet' || civilStatus === 'partnerschaft') ? 'verheiratet' : 'ledig'
  const ahvMonthly1 = analysis.ahv.person1?.monthlyRente ?? 0
  const impliedPkMonthly1 = p1.hasPK ? Math.round(p1.pkCapital * (p1.pkRate / 100) / 12) : 0
  const pkMonthlyForRente = p1.hasPK && p1.pkBezugsart !== 'kapital'
    ? (p1.pkBezugsart === 'mix' ? Math.round(impliedPkMonthly1 / 2) : impliedPkMonthly1) : 0

  const incomeTax1 = useMemo(() => {
    if (!p1.income) return null
    return calculateIncomeTax(p1.income, canton, taxStatus, p1.hasPK, p1.yearly3a ?? 0, p1.has3a, kirchensteuer)
  }, [p1.income, canton, taxStatus, p1.hasPK, p1.yearly3a, p1.has3a, kirchensteuer])

  const retirementTax1 = useMemo(() =>
    calculateRetirementTax(ahvMonthly1, pkMonthlyForRente, canton, taxStatus, kirchensteuer)
  , [ahvMonthly1, pkMonthlyForRente, canton, taxStatus, kirchensteuer])

  const capitalTaxResult = useMemo(() => {
    if (!p1.hasPK || p1.pkBezugsart === 'rente' || !p1.pkCapital) return null
    const amount = p1.pkBezugsart === 'mix' ? Math.round(p1.pkCapital / 2) : p1.pkCapital
    return { amount, result: calculateCapitalWithdrawalTax(amount, canton, taxStatus) }
  }, [p1.hasPK, p1.pkBezugsart, p1.pkCapital, canton, taxStatus])

  const thirdPillar1 = useMemo(() => {
    if (!p1.has3a) return null
    return calculateThirdPillarSavings(p1.yearly3a ?? 0, incomeTax1?.marginalRate ?? 0.25, p1.hasPK)
  }, [p1.has3a, p1.yearly3a, p1.hasPK, incomeTax1?.marginalRate])

  const pkSavingsData = useMemo(() =>
    calculatePkPurchaseSavings([10000, 25000, 50000, 100000], incomeTax1?.marginalRate ?? 0.25)
  , [incomeTax1?.marginalRate])

  const rvkResult = useMemo(() => {
    if (!p1.hasPK || p1.pkBezugsart === 'rente' || !p1.pkCapital) return null
    const capital = p1.pkBezugsart === 'mix' ? Math.round(p1.pkCapital / 2) : p1.pkCapital
    const rente = p1.pkBezugsart === 'mix' ? Math.round(impliedPkMonthly1 / 2) : impliedPkMonthly1
    if (rente <= 0) return null
    return calculateRenteVsKapital(capital, rente, canton, taxStatus, ra1, kirchensteuer, ahvMonthly1 * 13)
  }, [p1.hasPK, p1.pkBezugsart, p1.pkCapital, impliedPkMonthly1, ahvMonthly1, canton, taxStatus, ra1, kirchensteuer])

  const taxOptimization = (thirdPillar1?.unusedPotentialSaving ?? 0) + (pkSavingsData[pkSavingsData.length - 1]?.saving ?? 0)

  // Kapital vs Rente state (must be before derived useMemo blocks)
  const [rvkTab, setRvkTab] = useState<'rente' | 'kapital' | 'mix'>('rente')
  const [rvkKapitalPct, setRvkKapitalPct] = useState(50)
  const [rvkReturnRate, setRvkReturnRate] = useState(0.02)

  // Wealth depletion state
  const [wdReturnRate, setWdReturnRate] = useState(0.02)
  const [wdInflation, setWdInflation] = useState(0.015)
  const [wdAdjustInflation, setWdAdjustInflation] = useState(false)
  const [wdShowTable, setWdShowTable] = useState(false)
  const [wdGoalMode, setWdGoalMode] = useState<'deplete90' | 'deplete95' | 'preserve'>('deplete95')
  const [wdCustomWithdrawal, setWdCustomWithdrawal] = useState<number | null>(null)

  // Bridging state
  const [bridgingRetireAge, setBridgingRetireAge] = useState(ra1)
  const [useAHVVorbezug, setUseAHVVorbezug] = useState(false)
  const [usePKBridging, setUsePKBridging] = useState(false)
  const [pkBridgingMonthly, setPkBridgingMonthly] = useState(0)
  const [partTimePct, setPartTimePct] = useState(0)
  const [bridgingCompareMode, setBridgingCompareMode] = useState(false)

  // Kapital vs Rente computed values
  const rvkCapitalRaw = p1.hasPK && p1.pkCapital ? p1.pkCapital : 0
  const rvkConversionRate = (p1.pkRate || 5.4) / 100
  const rvkCapitalTaxRate = capitalTaxResult
    ? capitalTaxResult.result.totalTax / capitalTaxResult.result.grossAmount
    : 0.05
  const rvkAnnualPension = Math.round(rvkCapitalRaw * rvkConversionRate)
  const rvkCapitalAfterTax = Math.round(rvkCapitalRaw * (1 - rvkCapitalTaxRate))

  const rvkMixVariant = useMemo(() =>
    calculateMixedVariant(rvkCapitalRaw, rvkKapitalPct, rvkConversionRate, rvkCapitalTaxRate, rvkReturnRate, ra1)
  , [rvkCapitalRaw, rvkKapitalPct, rvkConversionRate, rvkCapitalTaxRate, rvkReturnRate, ra1])

  const rvkBreakEven = useMemo(() =>
    calculateBreakEvenAge(rvkCapitalAfterTax, rvkAnnualPension, rvkReturnRate, ra1)
  , [rvkCapitalAfterTax, rvkAnnualPension, rvkReturnRate, ra1])

  const rvkChartData = useMemo(() =>
    buildRvKChartData(rvkCapitalAfterTax, rvkAnnualPension, rvkReturnRate, ra1)
  , [rvkCapitalAfterTax, rvkAnnualPension, rvkReturnRate, ra1])

  const rvkScenarios = useMemo(() =>
    buildScenarios(rvkCapitalAfterTax, rvkAnnualPension, ra1)
  , [rvkCapitalAfterTax, rvkAnnualPension, ra1])

  const rvkSurvivor = useMemo(() => {
    const lifeExp = (p1.sex === 'm' ? LIFE_EXPECTANCY_MALE_65 : LIFE_EXPECTANCY_FEMALE_65)
    const yearsToExpectancy = lifeExp - ra1
    return calculateSurvivorBenefits(
      rvkAnnualPension, rvkCapitalAfterTax, rvkAnnualPension, rvkReturnRate, yearsToExpectancy,
    )
  }, [rvkAnnualPension, rvkCapitalAfterTax, rvkReturnRate, ra1, p1.sex])

  // Bridging computed values
  const isEarlyRetirement = bridgingRetireAge < 65
  const pkMonthlyAtEarlyRetirement = useMemo(() => {
    if (!p1.hasPK || !p1.pkCapital) return 0
    return Math.round(p1.pkCapital * ((p1.pkRate || 5.4) / 100) / 12)
  }, [p1.hasPK, p1.pkCapital, p1.pkRate])

  const bridgingGap = useMemo(() =>
    calculateBridgingGap(bridgingRetireAge, p1.income || 0, pkMonthlyAtEarlyRetirement, monthlyBudget)
  , [bridgingRetireAge, p1.income, pkMonthlyAtEarlyRetirement, monthlyBudget])

  const ahvNonEmployed = useMemo(() => {
    const annual = pkMonthlyAtEarlyRetirement * 12
    const result = calculateAHVContributionNonEmployed(freeAssets || 0, annual)
    return { ...result, totalForGapYears: result.annualContribution * bridgingGap.gapYears }
  }, [freeAssets, pkMonthlyAtEarlyRetirement, bridgingGap.gapYears])

  const ahvEarlyImpact = useMemo(() => {
    if (!useAHVVorbezug) return null
    const base = ahvMonthly1
    const yearsEarly = Math.max(0, 65 - bridgingRetireAge)
    const lifeExp = p1.sex === 'm' ? LIFE_EXPECTANCY_MALE_65 : LIFE_EXPECTANCY_FEMALE_65
    return calculateAHVEarlyWithdrawalImpact(base, yearsEarly, lifeExp, 65)
  }, [useAHVVorbezug, ahvMonthly1, bridgingRetireAge, p1.sex])

  const bridgingCapitalNeeds = useMemo(() => {
    const pkBridgingDeduction = usePKBridging ? pkBridgingMonthly * bridgingGap.gapMonths : 0
    const ahvVorbezugHelp = useAHVVorbezug && ahvEarlyImpact
      ? ahvEarlyImpact.reducedMonthlyPension * bridgingGap.gapMonths
      : 0
    const adjustedGap = Math.max(0, bridgingGap.monthlyNetGap
      - (usePKBridging ? pkBridgingMonthly : 0)
      - (useAHVVorbezug && ahvEarlyImpact ? ahvEarlyImpact.reducedMonthlyPension : 0))
    return calculateBridgingFromCapital(
      adjustedGap, bridgingGap.gapMonths, ahvNonEmployed.annualContribution, freeAssets || 0
    )
  }, [bridgingGap, usePKBridging, pkBridgingMonthly, useAHVVorbezug, ahvEarlyImpact, ahvNonEmployed, freeAssets])

  const partTimeImpact = useMemo(() => {
    if (partTimePct === 0) return null
    return calculatePartTimeImpact(
      p1.income || 0, partTimePct, bridgingGap.gapMonths,
      monthlyBudget, pkMonthlyAtEarlyRetirement, ahvNonEmployed.annualContribution,
    )
  }, [partTimePct, p1.income, bridgingGap.gapMonths, monthlyBudget, pkMonthlyAtEarlyRetirement, ahvNonEmployed])

  const optimalStrategy = useMemo(() =>
    calculateOptimalBridgingStrategy(
      freeAssets || 0, p1.balance3a || 0, usePKBridging ? pkBridgingMonthly : 0,
      bridgingGap.monthlyNetGap, bridgingGap.gapMonths,
      ahvNonEmployed.annualContribution, incomeTax1?.marginalRate ?? 0.25,
    )
  , [freeAssets, p1.balance3a, usePKBridging, pkBridgingMonthly, bridgingGap, ahvNonEmployed, incomeTax1?.marginalRate])

  const bridgingChartData = useMemo(() =>
    buildBridgingChartData(
      currentAge1, bridgingRetireAge, 65, p1.income || 0,
      pkMonthlyAtEarlyRetirement, ahvMonthly1, bridgingGap.monthlyNetGap, monthlyBudget,
    )
  , [currentAge1, bridgingRetireAge, p1.income, pkMonthlyAtEarlyRetirement, ahvMonthly1, bridgingGap.monthlyNetGap, monthlyBudget])

  // Wealth depletion computed values
  const wdMonthlyIncome = analysis.monthlyIncome.total
  const wdMonthlyGap = Math.max(0, monthlyBudget - wdMonthlyIncome)
  const wdEffectiveWithdrawal = wdCustomWithdrawal ?? wdMonthlyGap

  // Wealth at retirement: free assets + 3a (if any) + PK capital (if Kapitalbezug) + FZ - taxes
  const wdInitialWealth = useMemo(() => {
    let w = freeAssets || 0
    if (p1.has3a && p1.balance3a > 0) w += p1.balance3a
    if (p1.hasPK && p1.pkBezugsart !== 'rente' && p1.pkCapital > 0) {
      const capAmount = p1.pkBezugsart === 'mix' ? Math.round(p1.pkCapital / 2) : p1.pkCapital
      const tax = calculateCapitalWithdrawalTax(capAmount, canton, taxStatus)
      w += tax.netAmount
    }
    if (p1.hasFZ && p1.fzBalance > 0) {
      const tax = calculateCapitalWithdrawalTax(p1.fzBalance, canton, taxStatus)
      w += tax.netAmount
    }
    return w
  }, [freeAssets, p1.has3a, p1.balance3a, p1.hasPK, p1.pkBezugsart, p1.pkCapital, p1.hasFZ, p1.fzBalance, canton, taxStatus])

  const wdScenarios = useMemo(() =>
    buildDepletionScenarios(wdInitialWealth, wdEffectiveWithdrawal, ra1)
  , [wdInitialWealth, wdEffectiveWithdrawal, ra1])

  const wdStrategies = useMemo(() =>
    calculateWithdrawalStrategies(wdInitialWealth, wdEffectiveWithdrawal, wdReturnRate, ra1)
  , [wdInitialWealth, wdEffectiveWithdrawal, wdReturnRate, ra1])

  const wdChartData = useMemo(() =>
    buildScenarioChartData(wdScenarios, ra1)
  , [wdScenarios, ra1])

  const wdCustomProjection = useMemo(() =>
    calculateWealthDepletion(wdInitialWealth, wdEffectiveWithdrawal, wdReturnRate, wdInflation, ra1, wdAdjustInflation, 40)
  , [wdInitialWealth, wdEffectiveWithdrawal, wdReturnRate, wdInflation, ra1, wdAdjustInflation])

  const wdSensitivity = useMemo(() =>
    calculateSensitivity(wdInitialWealth, wdEffectiveWithdrawal, wdReturnRate, ra1)
  , [wdInitialWealth, wdEffectiveWithdrawal, wdReturnRate, ra1])

  const wdELCheck = useMemo(() =>
    calculateELEligibility(
      ahvMonthly1 * 12,
      pkMonthlyForRente * 12,
      freeAssets || 0,
      civilStatus === 'verheiratet' || civilStatus === 'partnerschaft',
      canton,
    )
  , [ahvMonthly1, pkMonthlyForRente, freeAssets, civilStatus, canton])

  const wdLifeExp = p1.sex === 'm' ? WEALTH_CONSTANTS.LIFE_EXPECTANCY_MALE_65 : WEALTH_CONSTANTS.LIFE_EXPECTANCY_FEMALE_65
  const wdRealistDepletionAge = wdScenarios.find(s => s.label === 'Realistisch')?.depletionAge ?? null
  const wdStatus = wdRealistDepletionAge === null
    ? 'green'
    : wdRealistDepletionAge >= wdLifeExp + 3 ? 'green'
    : wdRealistDepletionAge >= wdLifeExp - 3 ? 'yellow'
    : 'red'

  const wdYearlyTable = useMemo(() =>
    generateYearlyProjection(
      ra1, wdMonthlyIncome * 12, monthlyBudget * 12,
      wdInitialWealth, wdReturnRate, wdInflation, wdAdjustInflation, 95,
    )
  , [ra1, wdMonthlyIncome, monthlyBudget, wdInitialWealth, wdReturnRate, wdInflation, wdAdjustInflation])

  const withdrawalPlan = useMemo(() => {
    const p1stored = state.persons.find(p => p.id === 1)
    const pkCap = p1.hasPK && p1.pkBezugsart !== 'rente' && p1.pkCapital > 0
      ? (p1.pkBezugsart === 'mix' ? Math.round(p1.pkCapital / 2) : p1.pkCapital)
      : 0
    const pillar3aTotal = p1.has3a ? (p1.balance3a || 0) : 0
    const num3aAccounts = p1stored?.num3aAccounts || 1
    const fzBal = p1.hasFZ ? (p1.fzBalance || 0) : 0
    const retirementCalendarYear = new Date().getFullYear() + Math.max(1, ra1 - currentAge1)
    return calculateOptimalWithdrawal(pkCap, pillar3aTotal, num3aAccounts, fzBal, canton, taxStatus, retirementCalendarYear)
  }, [state.persons, p1, ra1, currentAge1, canton, taxStatus])

  const eigenmietwertResult = useMemo(() => {
    if (!property.has || !property.value) return null
    const steuerwert = property.steuerwert > 0 ? property.steuerwert : Math.round(property.value * 0.7)
    const annualRetirementIncome = (analysis.ahv.person1?.yearlyRente ?? 0) + (pkMonthlyForRente * 12)
    return calculateEigenmietwert(steuerwert, property.mortgage, property.hypothekZinssatz ?? 1.5, canton, taxStatus, annualRetirementIncome, kirchensteuer)
  }, [property, analysis.ahv.person1, pkMonthlyForRente, canton, taxStatus, kirchensteuer])

  const CARE_COSTS: Record<string, { label: string; monthlyCost: number }> = {
    spitex_leicht: { label: 'Spitex (leicht)', monthlyCost: 1500 },
    spitex_mittel: { label: 'Spitex (mittel)', monthlyCost: 3000 },
    heim_standard: { label: 'Pflegeheim (Standard)', monthlyCost: 8000 },
    heim_gehoben: { label: 'Pflegeheim (gehoben)', monthlyCost: 12000 },
  }

  const careScenario = useMemo(() => {
    const careInfo = CARE_COSTS[careType]
    const monthlyCost = careInfo.monthlyCost
    const wealthAtCareStart = wdInitialWealth * Math.pow(1 + 0.02, Math.max(0, careStartAge - ra1))
    const monthlyIncome = wdMonthlyIncome
    // EL at home: approx CHF 1000-2000/month for Spitex, more for Heim
    const elEstimate = monthlyCost > 5000 ? 2000 : monthlyCost > 2000 ? 1000 : 0
    const monthlyGap = Math.max(0, monthlyCost + monthlyBudget * 0.5 - monthlyIncome - elEstimate)
    const elFreeWealth = (civilStatus === 'verheiratet' || civilStatus === 'partnerschaft') ? 50000 : 30000
    const yearsWealthCovers = monthlyGap > 0
      ? Math.max(0, (wealthAtCareStart - elFreeWealth) / (monthlyGap * 12))
      : 99
    const elEligibilityAge = yearsWealthCovers < 99
      ? Math.round(careStartAge + yearsWealthCovers)
      : null
    return {
      monthlyCost, elEstimate, monthlyGap, wealthAtCareStart,
      yearsWealthCovers: Math.min(yearsWealthCovers, 99),
      elEligibilityAge, elFreeWealth,
    }
  }, [careStartAge, careType, wdInitialWealth, ra1, wdMonthlyIncome, monthlyBudget, civilStatus])

  const [taxExpanded, setTaxExpanded] = useState(false)
  const [taxSubA, setTaxSubA] = useState(false)
  const [taxSubB, setTaxSubB] = useState(false)
  const [taxSubC, setTaxSubC] = useState(false)
  const [taxSubD, setTaxSubD] = useState(false)
  const [taxSubE, setTaxSubE] = useState(false)
  const [taxSubF, setTaxSubF] = useState(false)
  const [taxSubG, setTaxSubG] = useState(false)
  const [taxSubH, setTaxSubH] = useState(false)

  const verdictLabel = analysis.verdict === 'green' ? 'Gut aufgestellt' : analysis.verdict === 'yellow' ? 'Anpassungen empfohlen' : 'Handlungsbedarf'
  const verdictColor = analysis.verdict === 'green' ? 'var(--green-500)' : analysis.verdict === 'yellow' ? 'var(--amber-500)' : 'var(--red-500)'
  const verdictBg = analysis.verdict === 'green' ? 'var(--green-50)' : analysis.verdict === 'yellow' ? '#fffbeb' : '#fef2f2'
  const verdictBorder = analysis.verdict === 'green' ? 'var(--green-200)' : analysis.verdict === 'yellow' ? '#fde68a' : '#fecaca'

  const coveragePct = monthlyBudget > 0 ? Math.round((analysis.monthlyIncome.total / monthlyBudget) * 100) : 0

  const chartData = useMemo(() => {
    const base = analysis.yearlyCashflow.filter(r => r.age >= ra1)
    const adj = adjustedCashflow ? adjustedCashflow.filter(r => r.age >= ra1) : null
    return base.map((r, i) => ({
      age: r.age,
      vermoegen: Math.max(0, adj ? (adj[i]?.wealthEndOfYear ?? r.wealthEndOfYear) : r.wealthEndOfYear),
      vermoegenBase: adjustedCashflow ? Math.max(0, r.wealthEndOfYear) : undefined,
      eventAmount: adj ? (adj[i]?.eventAmount ?? 0) : 0,
      einnahmen: Math.round((r.ahvIncome + r.pkRenteIncome) / 12),
      ausgaben: Math.round(r.livingExpenses / 12),
    }))
  }, [analysis, adjustedCashflow, ra1])

  const scenarioChartData = useMemo(() => {
    const ages = scenarios.neutral.yearlyCashflow.filter(r => r.age >= ra1).map(r => r.age)
    return ages.map(age => ({
      age,
      optimistisch: Math.max(0, scenarios.optimistic.yearlyCashflow.find(r => r.age === age)?.wealthEndOfYear || 0),
      neutral: Math.max(0, scenarios.neutral.yearlyCashflow.find(r => r.age === age)?.wealthEndOfYear || 0),
      pessimistisch: Math.max(0, scenarios.pessimistic.yearlyCashflow.find(r => r.age === age)?.wealthEndOfYear || 0),
    }))
  }, [scenarios, ra1])

  const handlePDF = async () => {
    const { exportPDF } = await import('../lib/pdf')
    await exportPDF({
      person1Name: person1.name || 'Person 1',
      person2Name: hasPartner ? (person2.name || 'Person 2') : undefined,
      location: location || undefined,
      retirementAge1: ra1,
      analysis,
      monthlyBudget,
      riskProfile: riskProfile || 'ausgewogen',
      canton,
      kirchensteuer,
      wealthAtRetirement: wdInitialWealth,
      depletionAge: wdRealistDepletionAge ?? undefined,
      pkCapital1: p1.hasPK && p1.pkBezugsart !== 'rente' ? p1.pkCapital : undefined,
      pkRate1: p1.pkRate,
      balance3a1: p1.has3a ? p1.balance3a : undefined,
      fzBalance1: p1.fzBalance,
      hasProperty: property.has,
      propertyValue: property.has ? property.value : undefined,
      scenarios,
    })
  }

  const toggleRec = (i: number) => {
    setExpandedRecs(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="app">
      <TopBar screenLabel="Vorsorgeplanung" />
      <ProgressBar current={4} />

      <main>
        <div className="page-head">
          <div className="eyebrow">Schritt 4 · Analyse</div>
          <h1 className="title">Ihre persönliche Vorsorgeanalyse</h1>
          <p className="subtitle">
            Berechnet per {new Date().toLocaleDateString('de-CH')} · Basierend auf AHV-Rentenskala 44 und BVG-Kennzahlen 2026
          </p>
        </div>

        {/* ── Summary: Vorsorgeanalyse auf einen Blick ── */}
        <section className="block" style={{ background: verdictBg, border: `1px solid ${verdictBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <ScoreRing score={analysis.sustainabilityScore} verdict={analysis.verdict} />
            <div>
              <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>
                Nachhaltigkeits-Score
                <InfoTooltip text="Score 0–100: unter 50 = kritisch, 50–70 = Handlungsbedarf, 70–85 = solide, über 85 = sehr gut" />
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: verdictColor }}>{verdictLabel}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 2 }}>
                Renten: CHF {fmtCHF(analysis.monthlyIncome.total)}/Mt. · Budget: CHF {fmtCHF(monthlyBudget)}/Mt.
              </div>
            </div>
          </div>

          {/* 3 KPI cards */}
          <div aria-live="polite" aria-atomic="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {/* Card 1: Monthly situation */}
            {(() => {
              const surplus = analysis.surplus
              const cardColor = surplus >= 0 ? 'var(--green-600)' : Math.abs(surplus) <= 500 ? '#d97706' : '#dc2626'
              const cardBg = surplus >= 0 ? '#ecfdf5' : Math.abs(surplus) <= 500 ? '#fffbeb' : '#fef2f2'
              const cardBorder = surplus >= 0 ? '#bbf7d0' : Math.abs(surplus) <= 500 ? '#fde68a' : '#fecaca'
              return (
                <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 4 }}>Monatliche Situation</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: cardColor }}>
                    {surplus >= 0 ? '+' : ''}CHF {fmtCHF(surplus)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 3 }}>
                    {surplus >= 0 ? 'Überschuss/Monat' : 'Lücke/Monat'}
                  </div>
                </div>
              )
            })()}
            {/* Card 2: Wealth longevity */}
            {(() => {
              const age = hasEnabledEvents ? (ageWhenBrokeWithEvents ?? 99) : (analysis.ageWhenBroke ?? 99)
              const cardColor = age >= 90 ? 'var(--green-600)' : age >= 85 ? '#d97706' : '#dc2626'
              const cardBg = age >= 90 ? '#ecfdf5' : age >= 85 ? '#fffbeb' : '#fef2f2'
              const cardBorder = age >= 90 ? '#bbf7d0' : age >= 85 ? '#fde68a' : '#fecaca'
              const lifeExp = p1.sex === 'm' ? 85 : 87
              return (
                <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 4 }}>Vermögen reicht bis</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: cardColor }}>
                    {age >= 99 ? 'Alter 95+' : `Alter ${age}`}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 3 }}>
                    Lebenserwartung: ~{lifeExp} Jahre
                  </div>
                </div>
              )
            })()}
            {/* Card 3: Action level */}
            {(() => {
              const recs = RECS[analysis.verdict] ?? []
              const highCount = recs.filter(r => r.priority === 'hoch').length
              const label = analysis.verdict === 'green' ? 'Tief' : analysis.verdict === 'yellow' ? 'Mittel' : 'Hoch'
              const cardColor = analysis.verdict === 'green' ? 'var(--green-600)' : analysis.verdict === 'yellow' ? '#d97706' : '#dc2626'
              const cardBg = analysis.verdict === 'green' ? '#ecfdf5' : analysis.verdict === 'yellow' ? '#fffbeb' : '#fef2f2'
              const cardBorder = analysis.verdict === 'green' ? '#bbf7d0' : analysis.verdict === 'yellow' ? '#fde68a' : '#fecaca'
              return (
                <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 4 }}>Handlungsbedarf</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: cardColor }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 3 }}>
                    {highCount > 0 ? `${highCount} dringende Massnahme${highCount > 1 ? 'n' : ''}` : `${recs.length} Empfehlungen`}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Fix 8: Empathetic text when score < 50 */}
          {analysis.sustainabilityScore < 50 && (
            <div style={{ marginBottom: 16, padding: '14px 16px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, fontSize: 13.5, color: '#92400e', lineHeight: 1.7 }}>
              <strong>Was ein tiefer Score bedeutet:</strong> Ihre Rente allein reicht nicht für Ihre Ausgaben. Das ist bei vielen Menschen so – besonders bei Teilzeitarbeit, tiefem Einkommen oder Einwanderung. <strong>Es bedeutet NICHT, dass Sie etwas falsch gemacht haben.</strong> Es gibt Möglichkeiten – zum Beispiel Ergänzungsleistungen (EL) als gesetzlicher Anspruch. Die konkreten Massnahmen finden Sie unten.
            </div>
          )}

          {/* Was bedeutet das? */}
          {(() => {
            const surplus = analysis.surplus
            const ageOk = hasEnabledEvents ? (ageWhenBrokeWithEvents ?? 99) : (analysis.ageWhenBroke ?? 99)
            const lifeExp = p1.sex === 'm' ? 85 : 87
            let summaryText = ''
            if (analysis.verdict === 'green') {
              summaryText = `Ihre Vorsorgesituation ist solide: Mit CHF ${fmtCHF(analysis.monthlyIncome.total)}/Mt. Rente decken Sie ${coveragePct}% Ihres geplanten Budgets. Ihr Vermögen reicht voraussichtlich bis Alter ${ageOk >= 99 ? '95+' : ageOk} – ${ageOk >= lifeExp ? 'deutlich über' : 'bis'} Ihre statistische Lebenserwartung (ca. ${lifeExp} Jahre). Sie haben einen monatlichen Überschuss von CHF ${fmtCHF(Math.abs(surplus))}.`
            } else if (analysis.verdict === 'yellow') {
              summaryText = `Ihre Vorsorge ist grundsolide, aber es gibt Optimierungspotenzial. Mit CHF ${fmtCHF(analysis.monthlyIncome.total)}/Mt. Rente decken Sie ${coveragePct}% Ihres Budgets – ${surplus < 0 ? `es entsteht eine Lücke von CHF ${fmtCHF(Math.abs(surplus))}/Mt.` : `Sie haben einen knappen Überschuss von CHF ${fmtCHF(Math.abs(surplus))}/Mt.`} Ihr Vermögen reicht bis Alter ${ageOk >= 99 ? '95+' : ageOk}. Mit den unten empfohlenen Massnahmen können Sie Ihre Situation deutlich verbessern.`
            } else {
              summaryText = `Ihre Vorsorge weist eine bedeutende Lücke auf: Ihren Renten von CHF ${fmtCHF(analysis.monthlyIncome.total)}/Mt. stehen Ausgaben von CHF ${fmtCHF(monthlyBudget)}/Mt. gegenüber – das ergibt eine monatliche Unterdeckung von CHF ${fmtCHF(Math.abs(surplus))}. Ihr Vermögen wird voraussichtlich bis Alter ${ageOk >= 99 ? '95+' : ageOk} reichen. Handeln Sie jetzt: Die unten aufgeführten Massnahmen können Ihre Situation wesentlich verbessern.`
            }
            return (
              <div style={{
                margin: '0 0 16px',
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.6)',
                border: `1px solid ${verdictBorder}`,
                borderRadius: 10,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  Was bedeutet das?
                </div>
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-700)', lineHeight: 1.6 }}>{summaryText}</p>
              </div>
            )
          })()}

          {/* Fix 5: EL-Frühwarnung – als Rechtsanspruch framen, nicht als Almosen */}
          {wdELCheck.eligible && (
            <div style={{ marginBottom: 16, padding: '14px 16px', background: '#eff6ff', border: '2px solid #3b82f6', borderRadius: 12 }}>
              <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 6, fontSize: 14 }}>
                Ihr gesetzlicher Anspruch: Ergänzungsleistungen (EL)
              </div>
              <div style={{ fontSize: 13, color: '#1e3a5f', lineHeight: 1.7 }}>
                <strong>Wussten Sie?</strong> In der Schweiz bezieht jede 5. Rentnerin Ergänzungsleistungen. EL sind <strong>kein Almosen und keine Sozialhilfe</strong>. Sie sind ein gesetzlicher Anspruch (ELG) – wie die AHV selbst. Auch eingewanderte Personen haben diesen Anspruch wenn sie die Mindestbeitragszeit erfüllen.
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 15 }}>
                  Geschätzte EL: CHF {fmtCHF(wdELCheck.estimatedMonthlyEL)}/Monat
                </div>
                <div style={{ fontSize: 12, color: '#1e40af' }}>
                  (Das entspricht mehr als einem 13. AHV-Monat pro Jahr)
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#1e40af' }}>
                EL sind dafür da, dass Ihre Rente zusammen mit den EL Ihre Lebenskosten deckt. Der Kanton berechnet Ihren individuellen Bedarf.{' '}
                <a href="https://www.ahv-iv.ch/de/Sozialversicherungen/Ergaenzungsleistungen-EL" target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontWeight: 600 }}>Mehr erfahren →</a>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-500)' }}>
                Details unter «Entnahmeplanung». Tatsächliche Berechnung durch Ihre AHV-Zweigstelle.
              </div>
            </div>
          )}

          {/* Fix 7: AHV-Kinderrente für Kind in Ausbildung */}
          {p1.hasChildInTraining && ahvMonthly1 > 0 && (() => {
            const kinderrente = Math.min(Math.round(ahvMonthly1 * 0.4), 1008)
            return (
              <div style={{ marginBottom: 16, padding: '14px 16px', background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: 12 }}>
                <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 6, fontSize: 14 }}>
                  AHV-Kinderrente für Kind in Ausbildung
                </div>
                <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.7 }}>
                  Da Sie ein Kind zwischen 18 und 25 in Ausbildung haben, haben Sie Anspruch auf eine <strong>AHV-Kinderrente</strong>. Diese beträgt 40% Ihrer AHV-Rente und wird zusätzlich ausbezahlt – solange das Kind in Ausbildung ist.
                </div>
                <div style={{ marginTop: 8, fontWeight: 700, color: '#15803d', fontSize: 15 }}>
                  AHV-Kinderrente für Kind in Ausbildung: ca. CHF {fmtCHF(kinderrente)}/Monat
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: '#166534' }}>
                  Diese Zahlung ist zeitlich begrenzt (bis Kind 25 oder Ende der Ausbildung). Beantragen Sie sie bei Ihrer AHV-Zweigstelle nach der Pensionierung.
                </div>
              </div>
            )
          })()}

          {/* Vorbezug-Warnung für vulnerable Personen */}
          {(() => {
            const isVulnerable = !property.has && (freeAssets || 0) < 100000
            const hasVorbezug = p1.ahvBezugAge < 65
            if (!isVulnerable || !hasVorbezug) return null
            const bezugFactor = AHV_BEZUG_FAKTOREN_2025[p1.ahvBezugAge as keyof typeof AHV_BEZUG_FAKTOREN_2025] ?? 1.0
            const standardMonthly = bezugFactor > 0 ? Math.round(ahvMonthly1 / bezugFactor) : ahvMonthly1
            const monthlyLoss = standardMonthly - ahvMonthly1
            const totalLoss20y = monthlyLoss * 12 * 20
            const vorbezugYears = 65 - p1.ahvBezugAge
            return (
              <div style={{ marginBottom: 16, padding: '14px 16px', background: '#fef2f2', border: '2px solid #fecaca', borderRadius: 12 }}>
                <div style={{ fontWeight: 600, color: '#991b1b', marginBottom: 6, fontSize: 13 }}>
                  ⚠ Achtung: Vorbezug bei knappem Vermögen
                </div>
                <div style={{ fontSize: 12.5, color: '#7f1d1d', lineHeight: 1.65 }}>
                  Bei Ihrer Vermögenssituation (kein Wohneigentum, Vermögen unter CHF 100'000) bedeutet der AHV-Vorbezug um {vorbezugYears} {vorbezugYears === 1 ? 'Jahr' : 'Jahre'} eine lebenslange Kürzung von CHF {fmtCHF(monthlyLoss)}/Monat ohne finanzielles Polster. Bei einer Lebenserwartung von 87 Jahren verlieren Sie insgesamt ca. CHF {fmtCHF(totalLoss20y)}. Erwägen Sie, ob {vorbezugYears === 1 ? 'ein weiteres Jahr' : `${vorbezugYears} weitere Jahre`} Erwerbstätigkeit diese Lücke nicht deutlich reduzieren könnte.
                </div>
              </div>
            )
          })()}

          {/* Fix 8: Rechte-basierte Empfehlungen für vulnerable Personen */}
          {(() => {
            const isVulnerable = Math.abs(Math.min(0, analysis.surplus)) > 1000 && (freeAssets || 0) < 100000
            if (!isVulnerable) return null
            const isGeschieden = civilStatus === 'geschieden'
            return (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-500)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Zuerst: Ihre Rechte prüfen
                </div>
                {[
                  { text: 'Prüfen Sie Ihren Anspruch auf Ergänzungsleistungen (EL) – Details weiter unten.', border: '#bae6fd', bg: '#eff6ff' },
                  ...(isGeschieden ? [{ text: 'Prüfen Sie, ob AHV-Einkommenssplitting und Erziehungsgutschriften korrekt im IK-Auszug verbucht sind.', border: '#bae6fd', bg: '#eff6ff' }] : []),
                  { text: 'Erwägen Sie eine Weiterarbeit bis 65 statt Vorbezug – vermeidet 13.6% lebenslange AHV-Kürzung.', border: '#fde68a', bg: '#fffbeb' },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', marginBottom: 6, background: r.bg, borderRadius: 10, border: `1px solid ${r.border}` }}>
                    <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink-800)', lineHeight: 1.5 }}>{r.text}</span>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Top-3 recommendations – prominent */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-500)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {(() => {
                const isVulnerable = Math.abs(Math.min(0, analysis.surplus)) > 1000 && (freeAssets || 0) < 100000
                return isVulnerable ? 'Weitere Massnahmen' : 'Ihre Top-3 Massnahmen'
              })()}
            </div>
            {(() => {
              const isSE = p1.employmentStatus === 'selfEmployed'
              const noPK = !p1.hasPK
              const pkKeywords = ['PK-Einkauf', 'Pensionskasse', 'Einkäufe in die Pensionskasse']
              const isLowIncome = (p1.income || 0) < 60000 && (freeAssets || 0) < 50000 && !p1.has3a
              let recs = (RECS[analysis.verdict] ?? []).filter(r =>
                !(isSE && noPK && pkKeywords.some(k => r.text.includes(k))) &&
                !(isLowIncome && (r.text.includes('PK-Einkauf') || r.text.includes('Säule-3a') || r.text.includes('3a-Gelder') || r.text.includes('Kapitalbezug')))
              )
              // Fix 6: Tiefes Einkommen / wenig Vermögen → realistische Empfehlungen
              if (isLowIncome) {
                const lowIncomeRecs: typeof recs = [
                  { text: 'Prüfen Sie Ihren EL-Anspruch nach der Pensionierung – das ist Ihr gesetzliches Recht (ELG).', priority: 'hoch' as const, detail: 'Ergänzungsleistungen sind kein Almosen. Jede 5. Rentnerin in der Schweiz bezieht EL. Kontaktieren Sie Ihre Gemeinde oder die kantonale AHV-Zweigstelle.' },
                  { text: 'Bestellen Sie Ihren IK-Auszug und prüfen Sie ob alle Beitragsjahre korrekt verbucht sind.', priority: 'hoch' as const, detail: 'Fehlende oder falsch verbuchte Beitragsjahre können lebenslang Rente kosten. Der IK-Auszug ist kostenlos unter www.ahv-iv.ch.' },
                  { text: 'Prüfen Sie ob Erziehungsgutschriften für Ihre Kinder korrekt angerechnet sind.', priority: 'mittel' as const, detail: 'Für jedes Jahr mit Kindern unter 16 werden CHF 44\'100 zum Durchschnittseinkommen addiert – das erhöht Ihre AHV-Rente.' },
                  { text: 'Bis 65 arbeiten statt Vorbezug: Vermeidet lebenslange AHV-Kürzung von 6.8% pro Jahr.', priority: 'mittel' as const, detail: 'Bei tiefem Einkommen ist die AHV-Rente besonders wichtig. Jeder Vorbezugsjahr kostet 6.8% lebenslang.' },
                  { text: 'Informieren Sie sich über die Prämienverbilligung nach der Pensionierung (oft höher als heute).', priority: 'mittel' as const, detail: 'Bei tiefem Renteneinkommen steigt der Anspruch auf kantonale Prämienverbilligung (IPV). Erkundigen Sie sich bei Ihrer Wohngemeinde.' },
                ]
                recs = [...lowIncomeRecs, ...recs].slice(0, 3)
              }
              // Selbständige ohne PK bekommen spezifische Empfehlungen
              if (isSE && noPK) {
                const age1val = currentAge1
                const hasProperty1 = property.has
                const seRecs: typeof recs = [
                  ...(age1val < 58 ? [{ text: 'Prüfen Sie den freiwilligen Beitritt zur BVG-Auffangeinrichtung (sinnvoll bis ca. Alter 58).', priority: 'hoch' as const, detail: '' }] : []),
                  { text: 'Planen Sie die Nachfolge / den Verkauf Ihres Betriebs als Alterskapital.', priority: 'hoch' as const, detail: '' },
                  { text: 'Erwägen Sie eine Reduktion der Arbeitszeit statt vollständiger Aufgabe (Teilpensionierung).', priority: 'mittel' as const, detail: '' },
                  ...(hasProperty1 ? [{ text: 'Prüfen Sie die Umkehrhypothek als Liquiditätsquelle im Alter.', priority: 'mittel' as const, detail: '' }] : []),
                  { text: 'AHV-Aufschub prüfen: 1 Jahr länger arbeiten = 5.2% höhere Rente lebenslang.', priority: 'mittel' as const, detail: '' },
                ]
                recs = [...seRecs, ...recs].slice(0, 3)
              }
              return recs.slice(0, 3).map((rec, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px', marginBottom: 8,
                  background: 'rgba(255,255,255,0.7)', borderRadius: 10,
                  border: `1px solid ${rec.priority === 'hoch' ? '#fecaca' : rec.priority === 'mittel' ? '#fde68a' : '#bbf7d0'}`,
                }}>
                  <span style={{
                    flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
                    background: rec.priority === 'hoch' ? '#dc2626' : rec.priority === 'mittel' ? '#d97706' : 'var(--green-600)',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 14, color: 'var(--ink-800)', lineHeight: 1.5, fontWeight: i === 0 ? 500 : 400 }}>{rec.text}</span>
                </div>
              ))
            })()}
          </div>

          {/* Fix 10: IPV hint for low retirement income */}
          {(() => {
            const isPaar = hasPartner
            const annualIncome = analysis.monthlyIncome.total * 12
            const threshold = isPaar ? 80000 : 50000
            if (annualIncome >= threshold) return null
            return (
              <div style={{ marginBottom: 16, padding: '14px 16px', background: '#f0f9ff', border: '1px solid #7dd3fc', borderRadius: 12 }}>
                <div style={{ fontWeight: 700, color: '#0369a1', marginBottom: 6, fontSize: 14 }}>
                  Prämienverbilligung (IPV) nach der Pensionierung
                </div>
                <div style={{ fontSize: 13, color: '#075985', lineHeight: 1.7 }}>
                  Bei einem Renteneinkommen unter {isPaar ? 'CHF 80\'000' : 'CHF 50\'000'}/Jahr (Ihr geschätztes Einkommen: CHF {fmtCHF(annualIncome)}/Jahr) haben Sie nach der Pensionierung in den meisten Kantonen <strong>Anspruch auf deutlich höhere Prämienverbilligung</strong> als heute. In vielen Fällen übernimmt der Kanton 50–100% der Krankenkassenprämie.
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#0369a1' }}>
                  Beantragen Sie die IPV bei Ihrer Wohngemeinde nach der Pensionierung – sie wird nicht automatisch ausbezahlt.
                </div>
              </div>
            )
          })()}

          {/* PDF CTA */}
          <div style={{ marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={handlePDF} style={{ width: '100%' }}>
              Analyse als PDF herunterladen
            </button>
          </div>

          {/* Phasenplan gestaffelte Pensionierung */}
          {hasPartner && p2 && (() => {
            const ra2 = p2.retireAge || p2.retirementAge || 65
            const name1 = person1.name || 'Person 1'
            const name2 = person2.name || 'Person 2'
            const ahvMonthly2 = analysis.ahv.person2?.monthlyRente ?? 0
            const pkMonthly1 = p1.hasPK ? Math.round((p1.pkCapital || 0) * ((p1.pkRate || 5.4) / 100) / 12) : 0
            const pkMonthly2 = p2.hasPK ? Math.round((p2.pkCapital || 0) * ((p2.pkRate || 5.4) / 100) / 12) : 0

            if (ra1 === ra2) {
              // Same retire age — show simple joint phase
              return (
                <section className="block" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 0 }}>
                  <div className="block-head">
                    <h2 className="block-title" style={{ color: '#15803d' }}>
                      <span className="block-num" style={{ background: '#16a34a', color: '#fff' }}>P</span>
                      Phasenplan Ihres Haushalts
                    </h2>
                  </div>
                  <div style={{ padding: '12px 14px', background: 'white', borderRadius: 10, fontSize: 13 }}>
                    <div style={{ fontWeight: 600, color: '#15803d', marginBottom: 6 }}>Beide pensioniert gleichzeitig (Alter {ra1})</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4, fontSize: 12.5, color: 'var(--ink-600)' }}>
                      <div>AHV (plafoniert): <strong>CHF {fmtCHF(ahvMonthly1 + ahvMonthly2 - analysis.ahv.plafonReduction)}/Mt.</strong></div>
                      <div>PK-Renten: <strong>CHF {fmtCHF(pkMonthly1 + pkMonthly2)}/Mt.</strong></div>
                      <div>Haushaltseinkommen: <strong>CHF {fmtCHF(analysis.monthlyIncome.total)}/Mt.</strong></div>
                      <div>Haushaltsausgaben: <strong>CHF {fmtCHF(monthlyBudget)}/Mt.</strong></div>
                      <div style={{ color: analysis.surplus >= 0 ? '#15803d' : '#dc2626', fontWeight: 600 }}>
                        Differenz: {analysis.surplus >= 0 ? '+' : ''}CHF {fmtCHF(analysis.surplus)}/Mt.
                      </div>
                    </div>
                  </div>
                </section>
              )
            }

            // Staggered retirement
            const firstRetires = ra1 < ra2 ? { name: name1, ra: ra1, pkMonthly: pkMonthly1, ahvMonthly: ahvMonthly1, income: 0 } : { name: name2, ra: ra2, pkMonthly: pkMonthly2, ahvMonthly: ahvMonthly2, income: 0 }
            const stillWorking = ra1 < ra2 ? { name: name2, ra: ra2, income: p2.income || 0 } : { name: name1, ra: ra1, income: p1.income || 0 }
            const gapYears = Math.abs(ra1 - ra2)
            const currentYear = new Date().getFullYear()
            const birthYear1 = person1.dob ? (parseInt(person1.dob.split('.').pop() || '0') || parseInt(person1.dob.split('-')[0])) : 0
            const retireYear1 = birthYear1 > 0 ? birthYear1 + ra1 : currentYear + (ra1 - currentAge1)
            const retireYear2Start = retireYear1 + gapYears

            // AHV in Phase 1: only first person draws (if bezugAge <= ra1), otherwise no AHV yet
            const phase1Ahv = ra1 <= ((p1 as any).ahvBezugAge ?? 65) && ra1 < ra2 ? ahvMonthly1 : (ra2 <= ((p2 as any)?.ahvBezugAge ?? 65) && ra2 < ra1 ? ahvMonthly2 : 0)
            const phase1Income = firstRetires.pkMonthly + phase1Ahv + stillWorking.income
            const phase1Surplus = phase1Income - monthlyBudget

            // AHV Phase 2 befreiung: if stillWorking has income * 0.053 >= 1060
            const stilWorkingAhvBeitrag = stillWorking.income * 0.053
            const ahvBefreit = stilWorkingAhvBeitrag >= 1060

            // Phase 2: both retired
            const plafoniert = ahvMonthly1 + ahvMonthly2 - analysis.ahv.plafonReduction
            const phase2Income = plafoniert + pkMonthly1 + pkMonthly2
            const phase2Surplus = phase2Income - monthlyBudget

            return (
              <section className="block" style={{ border: '2px solid #bae6fd', background: '#f0f9ff', marginBottom: 0 }}>
                <div className="block-head">
                  <h2 className="block-title" style={{ color: '#0369a1' }}>
                    <span className="block-num" style={{ background: '#0ea5e9', color: '#fff' }}>P</span>
                    Phasenplan Ihres Haushalts
                  </h2>
                  <span className="block-hint">Gestaffelte Pensionierung</span>
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                  {/* Phase 1 */}
                  <div style={{ padding: '14px 16px', background: 'white', border: '1px solid #bae6fd', borderRadius: 10 }}>
                    <div style={{ fontWeight: 700, color: '#0369a1', fontSize: 13.5, marginBottom: 10 }}>
                      Phase 1: {firstRetires.name} pensioniert · {stillWorking.name} arbeitet noch ({gapYears} {gapYears === 1 ? 'Jahr' : 'Jahre'})
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 8 }}>
                      Ca. {retireYear1}–{retireYear2Start}
                    </div>
                    <div style={{ display: 'grid', gap: 4, fontSize: 12.5, color: 'var(--ink-600)' }}>
                      <div>PK-Rente {firstRetires.name}: <strong>CHF {fmtCHF(firstRetires.pkMonthly)}/Mt.</strong></div>
                      <div>Lohn {stillWorking.name}: <strong>CHF {fmtCHF(stillWorking.income)}/Mt.</strong></div>
                      <div>AHV {firstRetires.name}: <strong>{phase1Ahv > 0 ? `CHF ${fmtCHF(phase1Ahv)}/Mt.` : 'noch kein Bezug'}</strong></div>
                      <div style={{ fontWeight: 600, borderTop: '1px solid var(--ink-100)', paddingTop: 4, marginTop: 4 }}>
                        Haushaltseinkommen: CHF {fmtCHF(phase1Income)}/Mt.
                      </div>
                      <div>Haushaltsausgaben: CHF {fmtCHF(monthlyBudget)}/Mt.</div>
                      <div style={{ color: phase1Surplus >= 0 ? '#15803d' : '#dc2626', fontWeight: 600 }}>
                        Differenz: {phase1Surplus >= 0 ? '+' : ''}CHF {fmtCHF(phase1Surplus)}/Mt.
                      </div>
                    </div>
                    <div style={{ marginTop: 8, padding: '6px 10px', background: '#f0f9ff', borderRadius: 7, fontSize: 11.5, color: '#0369a1' }}>
                      AHV-Plafonierung: <strong>noch nicht aktiv</strong> – erst wenn beide AHV beziehen
                    </div>
                    {ahvBefreit && (
                      <div style={{ marginTop: 6, padding: '8px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, fontSize: 11.5, color: '#166534', lineHeight: 1.55 }}>
                        <strong>Gute Nachricht:</strong> Da {stillWorking.name} erwerbstätig ist und AHV-Beiträge von ca. CHF {fmtCHF(Math.round(stilWorkingAhvBeitrag))} zahlt (über dem Minimum CHF 1'060), ist {firstRetires.name} als nichterwerbstätige/r Ehepartner/in von den AHV-Nichterwerbstätigen-Beiträgen befreit.
                      </div>
                    )}
                    {!ahvBefreit && stillWorking.income > 0 && (
                      <div style={{ marginTop: 6, padding: '8px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, fontSize: 11.5, color: '#92400e' }}>
                        AHV-Nichterwerbstätigen-Beiträge für {firstRetires.name}: ca. CHF {fmtCHF(Math.round(((firstRetires.pkMonthly * 12 + (firstRetires.ahvMonthly * 12)) / 2) * 0.05))}/Jahr (Mindestbeitrag CHF 530/Jahr)
                      </div>
                    )}
                  </div>

                  {/* Phase 2 */}
                  <div style={{ padding: '14px 16px', background: 'white', border: '1px solid #bbf7d0', borderRadius: 10 }}>
                    <div style={{ fontWeight: 700, color: '#15803d', fontSize: 13.5, marginBottom: 10 }}>
                      Phase 2: Beide pensioniert (ab {retireYear2Start})
                    </div>
                    <div style={{ display: 'grid', gap: 4, fontSize: 12.5, color: 'var(--ink-600)' }}>
                      <div>AHV {name1}: <strong>CHF {fmtCHF(ahvMonthly1)}/Mt.</strong></div>
                      <div>AHV {name2}: <strong>CHF {fmtCHF(ahvMonthly2)}/Mt.</strong></div>
                      {analysis.ahv.plafonReduction > 0 && (
                        <div style={{ color: '#d97706' }}>Plafonierung aktiv: −CHF {fmtCHF(analysis.ahv.plafonReduction)}/Mt. (max. CHF {fmtCHF(AHV_2026.PLAFOND_MONTHLY)})</div>
                      )}
                      <div>PK-Renten: <strong>CHF {fmtCHF(pkMonthly1 + pkMonthly2)}/Mt.</strong></div>
                      <div style={{ fontWeight: 600, borderTop: '1px solid var(--ink-100)', paddingTop: 4, marginTop: 4 }}>
                        Haushaltseinkommen: CHF {fmtCHF(phase2Income)}/Mt.
                      </div>
                      <div>Haushaltsausgaben: CHF {fmtCHF(monthlyBudget)}/Mt.</div>
                      <div style={{ color: phase2Surplus >= 0 ? '#15803d' : '#dc2626', fontWeight: 600 }}>
                        Differenz: {phase2Surplus >= 0 ? '+' : ''}CHF {fmtCHF(phase2Surplus)}/Mt.
                      </div>
                    </div>
                    <div style={{ marginTop: 8, padding: '6px 10px', background: '#f0fdf4', borderRadius: 7, fontSize: 11.5, color: '#166534' }}>
                      AHV-Plafonierung: <strong>aktiv</strong> – max. CHF {fmtCHF(AHV_2026.PLAFOND_MONTHLY)}/Mt. für beide zusammen
                    </div>
                  </div>
                </div>
              </section>
            )
          })()}

          {/* Separator + Detailanalyse toggle */}
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: 12, textAlign: 'center' }}>
            <button
              className="btn btn-ghost"
              onClick={() => setShowDetailedAnalysis(v => !v)}
              style={{ fontSize: 13 }}
            >
              {showDetailedAnalysis ? '▲ Detailanalyse ausblenden' : '▼ Detailanalyse anzeigen'}
            </button>
          </div>
        </section>

        {/* ── Detailed Analysis (collapsible) ── */}
        {showDetailedAnalysis && (<>

        {/* Frühpensionierungs-Überbrückungsanalyse */}
        {ra1 < 65 && (() => {
          const compareAges = [ra1, Math.min(ra1 + 1, 64), Math.min(ra1 + 2, 64)].filter((a, i, arr) => a < 65 && arr.indexOf(a) === i)
          return (
            <section className="block" style={{ border: '2px solid #fde68a', background: '#fffbeb' }}>
              <div className="block-head">
                <h2 className="block-title" style={{ color: '#92400e' }}>
                  <span className="block-num" style={{ background: '#f59e0b', color: 'white' }}>!</span>
                  Frühpensionierung – Überbrückungsanalyse
                </h2>
                <span className="block-hint">Nur sichtbar wenn Pensionierungsalter unter 65</span>
              </div>

              {/* Intro text */}
              <div style={{ padding: '14px 16px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, marginBottom: 20, fontSize: 14, color: '#7c2d12', lineHeight: 1.7 }}>
                Sie möchten mit <strong>{ra1} Jahren</strong> in Pension gehen. Das bedeutet: Zwischen Ihrem gewünschten Pensionierungsalter und dem ordentlichen AHV-Alter (65) entsteht eine <strong>Einkommenslücke von {65 - ra1} {65 - ra1 === 1 ? 'Jahr' : 'Jahren'}</strong>, die Sie selbst finanzieren müssen.
              </div>

              {/* Timeline visual */}
              <div style={{ marginBottom: 20, padding: '16px', background: 'white', borderRadius: 10, border: '1px solid #fde68a' }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#92400e', marginBottom: 12 }}>Einkommens-Zeitstrahl</div>
                <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, borderRadius: 8, overflow: 'hidden', fontSize: 11.5, fontWeight: 600 }}>
                  <div style={{ flex: 1, background: '#ecfdf5', padding: '10px 8px', textAlign: 'center', color: '#15803d' }}>
                    Heute<br /><span style={{ fontSize: 10, fontWeight: 400 }}>Erwerbseinkommen</span>
                  </div>
                  <div style={{ width: 2, background: '#d1d5db' }} />
                  <div style={{ flex: 1, background: '#fef2f2', padding: '10px 8px', textAlign: 'center', color: '#dc2626' }}>
                    Frühp. Alter {ra1}<br /><span style={{ fontSize: 10, fontWeight: 400 }}>Lücke beginnt</span>
                  </div>
                  <div style={{ width: 2, background: '#d1d5db' }} />
                  <div style={{ flex: 0.7, background: '#fef2f2', padding: '10px 4px', textAlign: 'center', color: '#dc2626', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#dc2626' }}>
                      ← LÜCKE {65 - ra1}J →
                    </div>
                  </div>
                  <div style={{ width: 2, background: '#d1d5db' }} />
                  <div style={{ flex: 1, background: '#eff6ff', padding: '10px 8px', textAlign: 'center', color: '#1d4ed8' }}>
                    AHV ab 65<br /><span style={{ fontSize: 10, fontWeight: 400 }}>Rente + PK</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 10, fontSize: 11 }}>
                  <div style={{ color: '#dc2626', textAlign: 'center' }}>✗ Kein Erwerbseinkommen</div>
                  <div style={{ color: '#dc2626', textAlign: 'center' }}>✗ Keine AHV (bis 65)</div>
                  <div style={{ color: '#d97706', textAlign: 'center' }}>⚠ PK evtl. gekürzt</div>
                </div>
              </div>

              {/* Slider for retirement age */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: '#92400e', fontWeight: 600 }}>Gewünschtes Pensionierungsalter</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#dc2626' }}>Alter {bridgingRetireAge}</span>
                </div>
                <input
                  type="range" min={58} max={65} step={1}
                  value={bridgingRetireAge}
                  onChange={e => setBridgingRetireAge(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#f59e0b' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-400)' }}>
                  <span>Alter 58</span><span>Alter 65 (ordentlich)</span>
                </div>
              </div>

              {/* Hero cost box */}
              {bridgingGap.gapYears > 0 && (
                <div style={{ background: '#dc2626', color: 'white', borderRadius: 14, padding: '18px 22px', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Geschätzte Gesamtkosten der Frühpensionierung mit {bridgingRetireAge}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
                    CHF {fmtCHF(bridgingGap.monthlyNetGap * bridgingGap.gapMonths + ahvNonEmployed.totalForGapYears)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12.5 }}>
                    <div>Einkommenslücke total: <strong>CHF {fmtCHF(bridgingGap.monthlyNetGap * bridgingGap.gapMonths)}</strong></div>
                    <div>AHV-Beiträge Nichterwerbst.: <strong>CHF {fmtCHF(ahvNonEmployed.totalForGapYears)}</strong></div>
                    <div>Monatliche Lücke: <strong>CHF {fmtCHF(bridgingGap.monthlyNetGap)}/Mt.</strong></div>
                    <div>Dauer: <strong>{bridgingGap.gapYears} {bridgingGap.gapYears === 1 ? 'Jahr' : 'Jahre'} ({bridgingGap.gapMonths} Monate)</strong></div>
                  </div>
                </div>
              )}

              {/* Fix 3+4: Phasenbasierter Cashflow + AHV-Beiträge explizit */}
              {bridgingRetireAge < 65 && (() => {
                const phase1End = Math.min(60, bridgingRetireAge + 3)
                const phase2End = Math.min(63, Math.max(phase1End, bridgingRetireAge))
                const phase3End = 65
                const ahvMonthlyEstimate = ahvMonthly1
                const pkMonthly = pkMonthlyAtEarlyRetirement

                // Phase definitions
                const phases = [
                  {
                    label: `Phase 1: Alter ${bridgingRetireAge}–${bridgingRetireAge < 60 ? 60 : bridgingRetireAge < 63 ? 63 : 65}`,
                    items: [
                      `Einkommen: Vermögensentnahme CHF ${fmtCHF(bridgingGap.monthlyNetGap)}/Mt.`,
                      `AHV-Beiträge Nichterwerbstätige: CHF ${fmtCHF(Math.round(ahvNonEmployed.annualContribution / 12))}/Mt. (Jahrestotal CHF ${fmtCHF(ahvNonEmployed.annualContribution)})`,
                      `Kapitalverzehr: ca. CHF ${fmtCHF(bridgingGap.monthlyNetGap * 12 + ahvNonEmployed.annualContribution)}/Jahr`,
                    ],
                    color: '#dc2626', bg: '#fef2f2', border: '#fecaca',
                  },
                  ...(bridgingRetireAge < 60 ? [{
                    label: `Phase 2: Alter 60–63 (3a-Bezüge möglich)`,
                    items: [
                      `Einkommen: Vermögensentnahme + gestaffelte 3a-Bezüge`,
                      `AHV-Beiträge: weiterhin CHF ${fmtCHF(Math.round(ahvNonEmployed.annualContribution / 12))}/Mt.`,
                      `3a-Bezugsplan: je 1 Konto pro Jahr ab 60 (Progressionsvorteil)`,
                    ],
                    color: '#d97706', bg: '#fffbeb', border: '#fde68a',
                  }] : []),
                  ...(bridgingRetireAge < 63 ? [{
                    label: `Phase ${bridgingRetireAge < 60 ? 3 : 2}: Alter 63–65 (AHV-Vorbezug möglich)`,
                    items: [
                      `Einkommen: AHV-Vorbezug CHF ${fmtCHF(Math.round(ahvMonthlyEstimate * (1 - 2 * 0.068)))}–${fmtCHF(Math.round(ahvMonthlyEstimate * (1 - 0.068)))}/Mt. (je nach Bezugszeitpunkt)`,
                      `AHV-Beiträge: entfallen nach AHV-Vorbezug`,
                      `Vermögensentnahme: deutlich reduziert`,
                    ],
                    color: '#2563eb', bg: '#eff6ff', border: '#bae6fd',
                  }] : []),
                  {
                    label: `Phase ${bridgingRetireAge < 60 ? 4 : bridgingRetireAge < 63 ? 3 : 2}: Ab Alter 65 (volle Rente)`,
                    items: [
                      `AHV-Rente: CHF ${fmtCHF(ahvMonthlyEstimate)}/Mt. (ordentlich, ohne Vorbezugskürzung)`,
                      pkMonthly > 0 ? `PK-Rente: CHF ${fmtCHF(pkMonthly)}/Mt.` : `Kein PK`,
                      `Vermögensentnahme: CHF ${fmtCHF(Math.max(0, monthlyBudget - ahvMonthlyEstimate - pkMonthly))}/Mt.`,
                    ],
                    color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0',
                  },
                ]

                return (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#92400e', marginBottom: 10 }}>Ihr Phasenplan bis zur vollen Rente</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {phases.map((phase, i) => (
                        <div key={i} style={{ padding: '12px 14px', background: phase.bg, border: `1px solid ${phase.border}`, borderRadius: 10 }}>
                          <div style={{ fontWeight: 700, color: phase.color, fontSize: 13, marginBottom: 6 }}>{phase.label}</div>
                          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: phase.color, lineHeight: 1.75 }}>
                            {phase.items.map((item, j) => <li key={j}>{item}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, padding: '10px 14px', background: 'white', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12 }}>
                      <strong>AHV-Beiträge Nichterwerbstätige (Alter {bridgingRetireAge}–65):</strong>
                      {' '}Basis: Vermögen CHF {fmtCHF(freeAssets || 0)} + Renteneinnahmen × 20.
                      Jährlicher Beitrag: <strong>CHF {fmtCHF(ahvNonEmployed.annualContribution)}</strong> (Max CHF 26'460).
                      Dauer: <strong>{bridgingGap.gapYears} Jahre</strong>.
                      Total: <strong>CHF {fmtCHF(ahvNonEmployed.totalForGapYears)}</strong>.
                    </div>
                  </div>
                )
              })()}

              {/* Income loss breakdown */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#92400e', marginBottom: 10 }}>Was fällt weg?</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: '#fef3c7' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, border: '1px solid #fde68a' }}>Position</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, border: '1px solid #fde68a' }}>Betrag/Jahr</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, border: '1px solid #fde68a' }}>Erklärung</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ background: 'white' }}>
                        <td style={{ padding: '8px 10px', border: '1px solid #fde68a' }}>Erwerbseinkommen</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid #fde68a', color: '#dc2626', fontWeight: 600 }}>–CHF {fmtCHF(p1.income || 0)}</td>
                        <td style={{ padding: '8px 10px', border: '1px solid #fde68a', color: 'var(--ink-500)', fontSize: 11.5 }}>Fällt komplett weg</td>
                      </tr>
                      <tr style={{ background: '#fafafa' }}>
                        <td style={{ padding: '8px 10px', border: '1px solid #fde68a' }}>AHV-Rente</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid #fde68a', color: '#dc2626', fontWeight: 600 }}>CHF 0</td>
                        <td style={{ padding: '8px 10px', border: '1px solid #fde68a', color: 'var(--ink-500)', fontSize: 11.5 }}>Noch kein Anspruch bis 65</td>
                      </tr>
                      <tr style={{ background: 'white' }}>
                        <td style={{ padding: '8px 10px', border: '1px solid #fde68a' }}>PK-Rente (ab Frühp.)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid #fde68a', color: '#16a34a', fontWeight: 600 }}>+CHF {fmtCHF(pkMonthlyAtEarlyRetirement * 12)}</td>
                        <td style={{ padding: '8px 10px', border: '1px solid #fde68a', color: 'var(--ink-500)', fontSize: 11.5 }}>Kompensiert teilweise</td>
                      </tr>
                      <tr style={{ background: '#fef3c7', fontWeight: 600 }}>
                        <td style={{ padding: '8px 10px', border: '1px solid #fde68a' }}>Netto-Lücke/Jahr</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid #fde68a', color: '#dc2626' }}>CHF {fmtCHF(bridgingGap.monthlyNetGap * 12)}</td>
                        <td style={{ padding: '8px 10px', border: '1px solid #fde68a' }}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* AHV non-employed warning */}
                <div style={{ marginTop: 12, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12.5 }}>
                  <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>WICHTIG: AHV-Beiträge als Nichterwerbstätige</div>
                  <div style={{ color: '#7f1d1d', lineHeight: 1.65 }}>
                    Als frühpensionierte Person MÜSSEN Sie weiterhin AHV-Beiträge bezahlen bis Alter 65.
                    Basierend auf Ihrem Vermögen (CHF {fmtCHF(freeAssets || 0)}) + PK-Rente × 20:
                    Berechnungsbasis CHF {fmtCHF(ahvNonEmployed.assessmentBase)} → ca.{' '}
                    <strong>CHF {fmtCHF(ahvNonEmployed.annualContribution)}/Jahr ({bridgingGap.gapYears} Jahre = CHF {fmtCHF(ahvNonEmployed.totalForGapYears)} total)</strong>
                  </div>
                </div>

                {/* Überbrückung ohne PK – für Selbständige */}
                {!p1.hasPK && bridgingRetireAge < 63 && (
                  <div style={{ marginTop: 12, padding: '14px 16px', background: '#f8fafc', border: '1px solid var(--ink-200)', borderRadius: 10, fontSize: 12.5 }}>
                    <div style={{ fontWeight: 600, color: 'var(--navy-800)', marginBottom: 8 }}>Überbrückung ohne Pensionskasse</div>
                    <p style={{ margin: '0 0 10px', color: 'var(--ink-600)', lineHeight: 1.6 }}>
                      Ohne Pensionskasse gibt es keine Überbrückungsrente. Sie müssen die Zeit bis zur AHV aus eigenen Mitteln finanzieren.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                      <div style={{ padding: '8px 10px', background: '#fef2f2', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 2 }}>Monate ohne AHV</div>
                        <div style={{ fontWeight: 700, color: '#dc2626' }}>{bridgingGap.gapMonths} Monate</div>
                      </div>
                      <div style={{ padding: '8px 10px', background: '#fef2f2', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 2 }}>Benötigtes Kapital</div>
                        <div style={{ fontWeight: 700, color: '#dc2626' }}>CHF {fmtCHF(bridgingGap.monthlyNetGap * bridgingGap.gapMonths)}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-600)' }}>
                      <strong>Mögliche Quellen:</strong> Gestaffelter 3a-Bezug (CHF {fmtCHF(p1.balance3a ?? 0)}), freies Vermögen (CHF {fmtCHF(freeAssets || 0)}){(p1.businessValue ?? 0) > 0 ? `, Firmenverkauf (CHF ${fmtCHF(p1.businessValue!)})` : ''}
                    </div>
                  </div>
                )}
              </div>

              {/* Comparison table across ages */}
              {compareAges.length > 1 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#92400e', marginBottom: 10 }}>Vergleich – verschiedene Pensionierungszeitpunkte</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#fef3c7' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid #fde68a', fontWeight: 600 }}>Position</th>
                          {compareAges.map(age => (
                            <th key={age} style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid #fde68a', fontWeight: 600 }}>
                              Alter {age} {age === 65 ? '(ordentl.)' : `(${65 - age}J früher)`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {
                            label: 'Lücken-Dauer',
                            values: compareAges.map(age => `${65 - age} Jahre`),
                          },
                          {
                            label: 'Monatliche Lücke',
                            values: compareAges.map(age => {
                              const gap = calculateBridgingGap(age, p1.income || 0, pkMonthlyAtEarlyRetirement, monthlyBudget)
                              return `CHF ${fmtCHF(gap.monthlyNetGap)}`
                            }),
                          },
                          {
                            label: 'Überbrückungskapital nötig',
                            values: compareAges.map(age => {
                              const gap = calculateBridgingGap(age, p1.income || 0, pkMonthlyAtEarlyRetirement, monthlyBudget)
                              const ahv = calculateAHVContributionNonEmployed(freeAssets || 0, pkMonthlyAtEarlyRetirement * 12)
                              const totalAHV = ahv.annualContribution * (65 - age)
                              return `CHF ${fmtCHF(gap.monthlyNetGap * gap.gapMonths + totalAHV)}`
                            }),
                          },
                        ].map((row, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                            <td style={{ padding: '8px 10px', border: '1px solid #fde68a', fontWeight: 500 }}>{row.label}</td>
                            {row.values.map((v, j) => (
                              <td key={j} style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid #fde68a', fontWeight: j === 0 ? 700 : 400, color: j === 0 ? '#dc2626' : 'inherit' }}>{v}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Financing options */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#92400e', marginBottom: 12 }}>Wie finanzieren Sie die Überbrückung?</div>

                {/* Option 1: AHV Vorbezug */}
                <div style={{ marginBottom: 10, padding: '14px 16px', background: 'white', border: '1px solid #fde68a', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: '#92400e' }}>Option 1: AHV-Vorbezug</div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox" checked={useAHVVorbezug} onChange={e => setUseAHVVorbezug(e.target.checked)} />
                      Verwenden
                    </label>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.65 }}>
                    Möglich ab 63 (ab 2027: schrittweise auch früher). Kürzung: <strong>6.8% pro Vorbezugsjahr – lebenslang.</strong>
                    {ahvMonthly1 > 0 && (
                      <div style={{ marginTop: 6 }}>
                        Ordentliche AHV: <strong>CHF {fmtCHF(ahvMonthly1)}/Mt.</strong> →{' '}
                        Bei {65 - bridgingRetireAge}J Vorbezug: <strong style={{ color: '#dc2626' }}>CHF {fmtCHF(Math.round(ahvMonthly1 * (1 - (65 - bridgingRetireAge) * 0.068)))}/Mt.</strong>{' '}
                        (Verlust: CHF {fmtCHF(Math.round(ahvMonthly1 * (65 - bridgingRetireAge) * 0.068))}/Mt. lebenslang)
                      </div>
                    )}
                    {ahvEarlyImpact && (
                      <div style={{ marginTop: 6, padding: '8px 10px', background: '#fef2f2', borderRadius: 6, fontSize: 11.5, color: '#dc2626' }}>
                        Break-even: {ahvEarlyImpact.breakEvenAge ? `Alter ${ahvEarlyImpact.breakEvenAge}` : 'Nie'} ·
                        Lebenszeit-Verlust: CHF {fmtCHF(ahvEarlyImpact.totalLifetimeLoss)}
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 8, padding: '8px 10px', background: '#fef2f2', borderRadius: 6, fontSize: 12, color: '#7f1d1d' }}>
                    Empfehlung: AHV-Vorbezug lohnt sich meist NICHT, ausser bei tiefer Lebenserwartung.
                  </div>
                </div>

                {/* Option 2: PK Überbrückungsrente */}
                <div style={{ marginBottom: 10, padding: '14px 16px', background: 'white', border: '1px solid #fde68a', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: '#92400e' }}>Option 2: PK-Überbrückungsrente</div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox" checked={usePKBridging} onChange={e => setUsePKBridging(e.target.checked)} />
                      Verfügbar
                    </label>
                  </div>
                  {usePKBridging && (
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 12.5, color: 'var(--ink-600)' }}>Überbrückungsrente der PK (CHF/Monat):</label>
                      <input
                        type="number" min={0} step={100}
                        value={pkBridgingMonthly || ''}
                        onChange={e => setPkBridgingMonthly(Number(e.target.value))}
                        style={{ width: '100%', marginTop: 4, padding: '8px 10px', border: '1px solid #fde68a', borderRadius: 6, fontSize: 13 }}
                        placeholder="z.B. 2000"
                      />
                    </div>
                  )}
                  <div style={{ fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.65 }}>
                    {usePKBridging
                      ? `Kompensiert CHF ${fmtCHF(pkBridgingMonthly)}/Mt. bis 65 · Reduziert Altersguthaben um ca. CHF ${fmtCHF(pkBridgingMonthly * bridgingGap.gapMonths)}`
                      : 'Eine PK-Überbrückungsrente kompensiert die fehlende AHV bis 65. Fragen Sie Ihre Pensionskasse – viele Kassen bieten diese Möglichkeit an.'}
                  </div>
                </div>

                {/* Option 3: Vermögensverzehr */}
                <div style={{ marginBottom: 10, padding: '14px 16px', background: 'white', border: '1px solid #fde68a', borderRadius: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: '#92400e', marginBottom: 8 }}>Option 3: Vermögensverzehr</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.75 }}>
                    <div>Monatlicher Bedarf: CHF {fmtCHF(monthlyBudget)}</div>
                    <div>Minus PK-Rente: –CHF {fmtCHF(pkMonthlyAtEarlyRetirement)}</div>
                    {usePKBridging && pkBridgingMonthly > 0 && <div>Minus PK-Überbrückung: –CHF {fmtCHF(pkBridgingMonthly)}</div>}
                    {useAHVVorbezug && ahvEarlyImpact && <div>Minus AHV-Vorbezug: –CHF {fmtCHF(ahvEarlyImpact.reducedMonthlyPension)}</div>}
                    <div style={{ marginTop: 4, fontWeight: 700, color: '#dc2626' }}>
                      = Monatliche Lücke: CHF {fmtCHF(bridgingCapitalNeeds.monthlyGap)} ×{' '}
                      {bridgingGap.gapMonths} Monate + AHV CHF {fmtCHF(ahvNonEmployed.totalForGapYears)}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700, padding: '8px 10px', background: bridgingCapitalNeeds.isCovered ? '#ecfdf5' : '#fef2f2', borderRadius: 6, color: bridgingCapitalNeeds.isCovered ? '#15803d' : '#dc2626' }}>
                      Benötigtes Kapital: CHF {fmtCHF(bridgingCapitalNeeds.capitalNeeded)} ·
                      Verfügbar: CHF {fmtCHF(freeAssets || 0)} ·{' '}
                      {bridgingCapitalNeeds.isCovered ? '✓ Gedeckt' : `✗ Fehlend: CHF ${fmtCHF(bridgingCapitalNeeds.shortfall)}`}
                    </div>
                    {!bridgingCapitalNeeds.isCovered && (
                      <div style={{ marginTop: 6, fontSize: 12, color: '#dc2626' }}>
                        Ihr Vermögen reicht nicht für die Überbrückung. Erwägen Sie eine Teilpensionierung oder einen späteren Zeitpunkt.
                      </div>
                    )}
                  </div>
                </div>

                {/* Option 4: 3a Staffelung */}
                {p1.balance3a > 0 && (
                  <div style={{ marginBottom: 10, padding: '14px 16px', background: 'white', border: '1px solid #fde68a', borderRadius: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: '#92400e', marginBottom: 8 }}>Option 4: Gestaffelter 3a-Bezug</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.65 }}>
                      3a-Konten in den Überbrückungsjahren gestaffelt beziehen – Progressionsvorteil nutzen.
                      <div style={{ marginTop: 4 }}>
                        Ihr 3a-Guthaben: <strong>CHF {fmtCHF(p1.balance3a)}</strong>{' '}
                        kann CHF {fmtCHF(Math.min(p1.balance3a, bridgingCapitalNeeds.capitalNeeded))} der Überbrückung finanzieren.
                      </div>
                      <div style={{ marginTop: 4, padding: '6px 8px', background: '#eff6ff', borderRadius: 6, fontSize: 11.5 }}>
                        Tipp: Verteilen Sie den 3a-Bezug auf {bridgingGap.gapYears} separate Steuerjahre. Jeder Bezug wird separat besteuert.
                      </div>
                    </div>
                  </div>
                )}

                {/* Option 5: Teilzeit */}
                <div style={{ marginBottom: 10, padding: '14px 16px', background: 'white', border: '1px solid #fde68a', borderRadius: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: '#92400e', marginBottom: 8 }}>Option 5: Teilpensionierung / Teilzeitarbeit</div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: 'var(--ink-600)' }}>Weiterarbeiten mit</span>
                      <span style={{ fontWeight: 700, color: '#92400e' }}>{partTimePct}%</span>
                    </div>
                    <input
                      type="range" min={0} max={80} step={20}
                      value={partTimePct}
                      onChange={e => setPartTimePct(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#f59e0b' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-400)' }}>
                      <span>0% (voll pensioniert)</span><span>80% Teilzeit</span>
                    </div>
                  </div>
                  {partTimePct > 0 && partTimeImpact && (
                    <div style={{ fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.65 }}>
                      <div>Resteinkommen ({partTimePct}%): <strong style={{ color: '#15803d' }}>+CHF {fmtCHF(partTimeImpact.monthlyPartTimeIncome)}/Mt.</strong></div>
                      <div>Verbleibende Lücke: <strong>CHF {fmtCHF(partTimeImpact.reducedMonthlyGap)}/Mt.</strong></div>
                      <div style={{ marginTop: 4, fontWeight: 600, color: '#15803d' }}>
                        Benötigtes Kapital: CHF {fmtCHF(partTimeImpact.capitalNeededPartTime)}{' '}
                        (spart CHF {fmtCHF(partTimeImpact.capitalSaved)} gegenüber voller Frühpensionierung)
                      </div>
                    </div>
                  )}
                  {partTimePct === 0 && (
                    <div style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>
                      Bei 40% Pensum bis 65 reduzieren Sie den Kapitalbedarf erheblich. Bewegen Sie den Slider.
                    </div>
                  )}
                </div>
              </div>

              {/* Options comparison table */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#92400e', marginBottom: 10 }}>Optionen-Vergleich</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                    <thead>
                      <tr style={{ background: '#fef3c7' }}>
                        <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #fde68a', fontWeight: 600 }}></th>
                        <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #fde68a', fontWeight: 600 }}>AHV-Vorbezug</th>
                        <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #fde68a', fontWeight: 600 }}>PK-Überbrückung</th>
                        <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #fde68a', fontWeight: 600 }}>Vermögen</th>
                        <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #fde68a', fontWeight: 600 }}>3a-Bezug</th>
                        <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #fde68a', fontWeight: 600 }}>Teilzeit 40%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          label: 'Überbrückt/Mt.',
                          values: [
                            ahvMonthly1 > 0 ? `CHF ${fmtCHF(Math.round(ahvMonthly1 * (1 - (65 - bridgingRetireAge) * 0.068)))}` : '–',
                            usePKBridging && pkBridgingMonthly > 0 ? `CHF ${fmtCHF(pkBridgingMonthly)}` : 'Je nach PK',
                            `CHF ${fmtCHF(Math.min(freeAssets || 0, bridgingCapitalNeeds.capitalNeeded) / bridgingGap.gapMonths || 0)}`,
                            p1.balance3a > 0 ? `CHF ${fmtCHF(Math.round(p1.balance3a / bridgingGap.gapMonths))}` : '–',
                            `CHF ${fmtCHF(Math.round((p1.income || 0) / 12 * 0.4))}`,
                          ],
                        },
                        {
                          label: 'Folgen',
                          values: [
                            `–${((65 - bridgingRetireAge) * 6.8).toFixed(1)}% Rente lebenslang`,
                            'Tiefere PK-Rente ab 65',
                            `Vermögen –CHF ${fmtCHF(bridgingCapitalNeeds.capitalNeeded)}`,
                            `Kapital –CHF ${fmtCHF(Math.min(p1.balance3a || 0, bridgingCapitalNeeds.capitalNeeded))}`,
                            'Weniger Freizeit',
                          ],
                        },
                        {
                          label: 'Steuer',
                          values: ['Rente besteuert', 'Neutral', 'Steuerfrei', 'Kapitalbezugssteuer', 'Einkommen besteuert'],
                        },
                        {
                          label: 'Empfehlung',
                          values: ['⚠️ Meist ungünstig', '✓ Prüfen', '✓ Falls vorhanden', '✓ Optimal staffeln', '✓ Guter Kompromiss'],
                        },
                      ].map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ padding: '8px', border: '1px solid #fde68a', fontWeight: 500 }}>{row.label}</td>
                          {row.values.map((v, j) => (
                            <td key={j} style={{ padding: '8px', textAlign: 'center', border: '1px solid #fde68a', fontSize: 11 }}>{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Optimal strategy */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#92400e', marginBottom: 10 }}>Empfohlene Überbrückungsstrategie</div>
                <div style={{ padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
                  {optimalStrategy.steps.length === 0 ? (
                    <div style={{ fontSize: 12.5, color: '#15803d' }}>Keine Überbrückung notwendig (ordentliches Pensionierungsalter).</div>
                  ) : (
                    <>
                      {optimalStrategy.steps.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 12.5, alignItems: 'flex-start' }}>
                          <div style={{ background: '#15803d', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                          <div style={{ color: '#15803d' }}>
                            <strong>{step.source}:</strong> CHF {fmtCHF(step.amount)} · <span style={{ fontSize: 11.5, opacity: 0.85 }}>{step.note}</span>
                          </div>
                        </div>
                      ))}
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #bbf7d0', fontSize: 12.5 }}>
                        <div style={{ color: optimalStrategy.remainingGap > 0 ? '#dc2626' : '#15803d', fontWeight: 600 }}>
                          {optimalStrategy.remainingGap > 0
                            ? `Verbleibende Lücke: CHF ${fmtCHF(optimalStrategy.remainingGap)} – weitere Massnahmen nötig`
                            : `Überbrückung vollständig gedeckt · Kein AHV-Vorbezug nötig`}
                        </div>
                        {optimalStrategy.pillar3aTax > 0 && (
                          <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 4 }}>
                            Geschätzte Bezugssteuer 3a: CHF {fmtCHF(optimalStrategy.pillar3aTax)} (gestaffelt reduziert)
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Bridging income chart */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#92400e', marginBottom: 10 }}>Einkommensverlauf (monatlich)</div>
                <div role="img" aria-label="Balkendiagramm: Monatlicher Einkommensverlauf von Frühpensionierung bis Alter 70. Zeigt Erwerbseinkommen, PK-Rente, AHV-Rente und Überbrückungsrente im Vergleich zum Monatsbedarf.">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={bridgingChartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-100)" />
                    <XAxis dataKey="age" tick={{ fontSize: 11 }} label={{ value: 'Alter', position: 'insideBottomRight', offset: -4, fontSize: 11 }} />
                    <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={46} />
                    <Tooltip formatter={(v: number) => `CHF ${fmtCHF(v)}`} labelFormatter={l => `Alter ${l}`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="erwerbseinkommen" name="Erwerbseinkommen" stackId="a" fill="#22c55e" />
                    <Bar dataKey="pkRente" name="PK-Rente" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="ahvRente" name="AHV-Rente" stackId="a" fill="#6366f1" />
                    <Bar dataKey="ueberbrueckung" name="Überbrückung" stackId="a" fill="#94a3b8" />
                    <Line type="monotone" dataKey="bedarf" name="Monatsbedarf" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>

              {/* Fix 5: Hypothek-Tragbarkeits-Warnung */}
              {property.has && property.mortgage > 0 && (() => {
                const ltv = property.value > 0 ? Math.round((property.mortgage / property.value) * 100) : 0
                const annualRetirementIncome = analysis.monthlyIncome.total * 12
                const calcHypoCost = property.mortgage * 0.05 + property.value * 0.01
                const affordabilityPct = annualRetirementIncome > 0 ? Math.round((calcHypoCost / annualRetirementIncome) * 100) : 999
                return (
                  <div style={{ marginBottom: 16, padding: '14px 16px', background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: 12 }}>
                    <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 6, fontSize: 13.5 }}>
                      Hypothek-Tragbarkeit bei Frühpensionierung prüfen
                    </div>
                    <div style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.7, marginBottom: 8 }}>
                      Bei Pensionierung vor 65 wird Ihre Bank die Tragbarkeit Ihrer Hypothek neu beurteilen.
                      Ohne Erwerbseinkommen gelten strengere Kriterien – oft 1/3 des Renteneinkommens als Maximallimite.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12.5, marginBottom: 8 }}>
                      <div style={{ padding: '8px 10px', background: '#fff', borderRadius: 6, border: '1px solid #fca5a5' }}>
                        <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 2 }}>Hypothek</div>
                        <div style={{ fontWeight: 600 }}>CHF {fmtCHF(property.mortgage)}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>Belehnung: {ltv}%</div>
                      </div>
                      <div style={{ padding: '8px 10px', background: affordabilityPct > 33 ? '#fef2f2' : '#f0fdf4', borderRadius: 6, border: `1px solid ${affordabilityPct > 33 ? '#fca5a5' : '#bbf7d0'}` }}>
                        <div style={{ fontSize: 11, color: affordabilityPct > 33 ? '#ef4444' : '#16a34a', marginBottom: 2 }}>Kalk. Tragbarkeit</div>
                        <div style={{ fontWeight: 600, color: affordabilityPct > 33 ? '#dc2626' : '#15803d' }}>{affordabilityPct}% des Renteneinkommens</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>Limit: max. 33%</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#7f1d1d' }}>
                      <strong>Faustregel:</strong> Kalk. Kosten (5% Zins + 1% Unterhalt auf CHF {fmtCHF(property.value)}) = CHF {fmtCHF(Math.round(calcHypoCost))}/Jahr.
                      {affordabilityPct > 33 && <span style={{ color: '#dc2626', fontWeight: 600 }}> Warnung: Überschreitet 33%-Grenze. Sprechen Sie rechtzeitig mit Ihrer Bank.</span>}
                      {affordabilityPct <= 33 && <span style={{ color: '#15803d' }}> Liegt im tragbaren Bereich – trotzdem mit der Bank besprechen.</span>}
                    </div>
                  </div>
                )
              })()}

              {/* Disclaimer */}
              <div style={{ padding: '10px 14px', background: 'var(--ink-50)', borderRadius: 8, fontSize: 11.5, color: 'var(--ink-500)', lineHeight: 1.6 }}>
                <strong>Hinweis:</strong> Die Frühpensionierung ist eine komplexe Entscheidung mit langfristigen Folgen. Diese Analyse zeigt die finanziellen Auswirkungen auf. AHV-Beiträge für Nichterwerbstätige werden individuell durch die Ausgleichskasse berechnet – die Werte sind Schätzungen. Für eine verbindliche Planung empfehlen wir ein Gespräch mit Ihrer Pensionskasse und einem Finanzplaner.
              </div>
            </section>
          )
        })()}

        {/* Koordinierter Bezugskalender */}
        {(hasPartner || (p1.has3a && ((p1.num3aAccounts || 1) > 1))) && (() => {
          const name1 = person1.name || 'Person 1'
          const name2 = hasPartner ? (person2.name || 'Person 2') : null
          const retireYear1 = new Date().getFullYear() + Math.max(1, ra1 - currentAge1)
          const ra2 = p2 ? (p2.retireAge || p2.retirementAge || 65) : ra1
          const birthYear2 = person2.dob ? (parseInt(person2.dob.split('.').pop() || '0') || parseInt(person2.dob.split('-')[0])) : 0
          const age2 = birthYear2 > 0 ? new Date().getFullYear() - birthYear2 : 50
          const retireYear2 = new Date().getFullYear() + Math.max(1, ra2 - age2)

          // Build withdrawal schedule
          type WithdrawalItem = { year: number; label: string; amount: number; taxHint: string; note?: string }
          const schedule: WithdrawalItem[] = []

          // 3a P1 accounts (stagger before retirement)
          const accounts1 = p1.has3a ? (p1.num3aAccounts || 1) : 0
          const bal3a1 = p1.has3a ? (p1.balance3a || 0) : 0
          for (let i = 0; i < Math.min(accounts1, 3); i++) {
            const amt = accounts1 > 0 ? Math.round(bal3a1 / accounts1) : 0
            if (amt > 0) {
              schedule.push({
                year: retireYear1 - (accounts1 - 1 - i),
                label: `${name1} – 3a-Konto ${i + 1}`,
                amount: amt,
                taxHint: `ca. CHF ${fmtCHF(Math.round(amt * 0.08))}`,
                note: i === 0 ? 'Separate Jahresbezüge reduzieren Steuerprogression' : undefined,
              })
            }
          }

          // 3a P2 accounts (stagger after P2 retires, interleave with P1 if possible)
          if (hasPartner && p2?.has3a && name2) {
            const accounts2 = p2.num3aAccounts || 1
            const bal3a2 = p2.balance3a || 0
            for (let i = 0; i < Math.min(accounts2, 3); i++) {
              const amt = accounts2 > 0 ? Math.round(bal3a2 / accounts2) : 0
              if (amt > 0) {
                // Interleave: offset by 1 year vs P1 accounts to avoid same-year withdrawals
                schedule.push({
                  year: retireYear2 - (accounts2 - 1 - i) + 1,
                  label: `${name2} – 3a-Konto ${i + 1}`,
                  amount: amt,
                  taxHint: `ca. CHF ${fmtCHF(Math.round(amt * 0.08))}`,
                })
              }
            }
          }

          // PK capital (if Kapitalbezug)
          const sperrfristAktiv1 = !!((p1 as any).pkLastPurchaseYear && ((p1 as any).pkLastPurchaseYear + 3 > retireYear1))
          if (p1.hasPK && p1.pkBezugsart !== 'rente' && p1.pkCapital) {
            const pkAmt = p1.pkBezugsart === 'mix' ? Math.round(p1.pkCapital / 2) : p1.pkCapital
            schedule.push({
              year: retireYear1,
              label: `${name1} – PK-Kapital`,
              amount: pkAmt,
              taxHint: `ca. CHF ${fmtCHF(Math.round(pkAmt * 0.06))}`,
              note: sperrfristAktiv1 ? `⚠ Sperrfrist bis ${((p1 as any).pkLastPurchaseYear || 0) + 3}!` : 'Getrennt von 3a-Bezügen planen',
            })
          }

          if (schedule.length === 0) return null

          schedule.sort((a, b) => a.year - b.year)

          // Compute savings estimate (rough: 15-20% tax savings vs all at once)
          const totalCapital = schedule.reduce((s, i) => s + i.amount, 0)
          const staggedTax = schedule.reduce((s, i) => s + Math.round(i.amount * 0.08), 0)
          const allAtOnceTax = Math.round(totalCapital * 0.12)
          const saving = Math.max(0, allAtOnceTax - staggedTax)

          return (
            <section className="block">
              <div className="block-head">
                <h2 className="block-title"><span className="block-num">BZ</span>Optimaler Bezugsplan</h2>
                <span className="block-hint">Steueroptimierte Reihenfolge</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 14, lineHeight: 1.6 }}>
                Durch gestaffelte Bezüge in verschiedenen Jahren vermeiden Ehepaare höhere Steuerprogression.
                {saving > 0 && <span style={{ fontWeight: 600, color: '#15803d' }}> Geschätzte Steuerersparnis durch Staffelung: ca. CHF {fmtCHF(saving)}.</span>}
              </div>
              <div style={{ fontSize: 12, color: '#92400e', padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 14 }}>
                <strong>Grundregel:</strong> Ehepaare zahlen bei Kapitalbezug zusammengezählte Steuern. Nicht beide Partner im gleichen Jahr Kapital beziehen. Nie 3a + PK-Kapital im gleichen Jahr, wenn vermeidbar.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: 'var(--navy-800)', color: '#fff' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Jahr</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Bezug</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Betrag</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Steuer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((item, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--navy-800)' }}>{item.year}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--ink-600)' }}>
                          {item.label}
                          {item.note && <div style={{ fontSize: 11, color: item.note.startsWith('⚠') ? '#dc2626' : '#6b7280', marginTop: 2 }}>{item.note}</div>}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--navy-800)' }}>CHF {fmtCHF(item.amount)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#dc2626' }}>{item.taxHint}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--ink-400)', lineHeight: 1.5 }}>
                Steuerangaben sind Richtwerte (ca. 6–10% auf Kapitalbezüge, kantonabhängig). Konsultieren Sie Ihre Gemeinde-Steuerverwaltung für genaue Zahlen.
              </div>
            </section>
          )
        })()}

        {/* Hypothek-Tragbarkeit nach Pensionierung */}
        {property.has && property.mortgage > 0 && (() => {
          const name1 = person1.name || 'Person 1'
          const totalPension = analysis.monthlyIncome.total
          const tragbarkeitsKosten = property.mortgage * 0.05 + (property.value || 0) * 0.01
          const maxTragbar = totalPension * 12 * 0.33
          const tragbar = maxTragbar >= tragbarkeitsKosten
          const affordPct = totalPension > 0 ? Math.round((tragbarkeitsKosten / (totalPension * 12)) * 100) : 999
          const ltv = property.value > 0 ? Math.round((property.mortgage / property.value) * 100) : 0

          return (
            <section className="block" style={{ border: `2px solid ${tragbar ? '#bbf7d0' : '#fca5a5'}`, background: tragbar ? '#f0fdf4' : '#fef2f2' }}>
              <div className="block-head">
                <h2 className="block-title" style={{ color: tragbar ? '#15803d' : '#991b1b' }}>
                  <span className="block-num" style={{ background: tragbar ? '#16a34a' : '#dc2626', color: '#fff' }}>H</span>
                  Hypothek & Pensionierung
                </h2>
              </div>
              <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ padding: '10px 12px', background: 'white', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>Hypothek</div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>CHF {fmtCHF(property.mortgage)}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>Belehnung {ltv}%</div>
                  </div>
                  <div style={{ padding: '10px 12px', background: 'white', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>Kalkulat. Kosten/Jahr</div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>CHF {fmtCHF(Math.round(tragbarkeitsKosten))}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>5% + 1% Unterhalt</div>
                  </div>
                </div>
                <div style={{ padding: '12px 14px', background: 'white', borderRadius: 8, fontSize: 12.5 }}>
                  <div style={{ marginBottom: 6 }}>Nach der Pensionierung von {name1} prüft Ihre Bank die Tragbarkeit neu:</div>
                  <div style={{ display: 'grid', gap: 3 }}>
                    <div>Max. 33% Renteneinkommen: <strong>CHF {fmtCHF(Math.round(maxTragbar))}/Jahr</strong></div>
                    <div>Kalkulat. Kosten: <strong>CHF {fmtCHF(Math.round(tragbarkeitsKosten))}/Jahr</strong></div>
                    <div style={{ fontWeight: 700, color: tragbar ? '#15803d' : '#dc2626', marginTop: 4 }}>
                      Tragbarkeit: {tragbar ? `✓ erfüllt (${affordPct}% Belastung)` : `⚠ nicht erfüllt (${affordPct}% > 33%)`}
                    </div>
                  </div>
                </div>
                {!tragbar && (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 12, color: '#7f1d1d', lineHeight: 1.6 }}>
                    <strong>Empfehlung:</strong> Sprechen Sie <em>vor</em> der Pensionierung mit Ihrer Bank über die Hypothek. Mögliche Massnahmen: Amortisation, günstigere Zinsbindung oder Anpassung der Hypothekstranche.
                  </div>
                )}
                {tragbar && (
                  <div style={{ fontSize: 12, color: '#166534' }}>
                    ✓ Sprechen Sie dennoch vor der Pensionierung mit Ihrer Bank – eine proaktive Kommunikation ist empfehlenswert.
                  </div>
                )}
              </div>
            </section>
          )
        })()}

        {/* Income pillars */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">A</span>Renteneinnahmen im Überblick</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              {
                label: 'AHV (1. Säule)', icon: '🏛️',
                monthly: Math.round(analysis.ahv.combinedYearlyInkl13 / 12),
                sub: `inkl. 13. AHV-Rente · CHF ${fmtCHF(analysis.ahv.combinedYearlyInkl13)}/Jahr`,
              },
              {
                label: 'Pensionskasse (2. Säule)', icon: '🏦',
                monthly: Math.round(analysis.pk.combinedYearly / 12),
                sub: `CHF ${fmtCHF(analysis.pk.combinedYearly)}/Jahr`,
              },
              {
                label: 'Total Renten', icon: '💰',
                monthly: analysis.monthlyIncome.total,
                sub: `CHF ${fmtCHF(analysis.monthlyIncome.total * 12)}/Jahr`,
                highlight: true,
              },
            ].map((card) => (
              <div key={card.label} style={{
                padding: '16px 18px',
                background: card.highlight ? 'var(--navy-800)' : 'var(--navy-50)',
                border: `1px solid ${card.highlight ? 'var(--navy-700)' : 'var(--navy-100)'}`,
                borderRadius: 12,
              }}>
                <div style={{ fontSize: 13, color: card.highlight ? 'rgba(255,255,255,.6)' : 'var(--ink-500)', marginBottom: 2 }}>
                  {card.icon} {card.label}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: card.highlight ? 'white' : 'var(--navy-800)' }}>
                  CHF {fmtCHF(card.monthly)}/Mt.
                </div>
                <div style={{ fontSize: 11, color: card.highlight ? 'rgba(255,255,255,.5)' : 'var(--ink-400)', marginTop: 2 }}>
                  {card.sub}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px',
            background: analysis.surplus >= 0 ? 'var(--green-50)' : '#fef2f2',
            border: `1px solid ${analysis.surplus >= 0 ? 'var(--green-200)' : '#fecaca'}`,
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 22 }}>{analysis.surplus >= 0 ? '✓' : '⚠'}</div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
                color: analysis.surplus >= 0 ? 'var(--green-600)' : 'var(--red-500)', marginBottom: 2,
              }}>
                {analysis.surplus >= 0 ? 'Vorsorgeüberschuss' : 'Vorsorgelücke'}: {analysis.surplus >= 0 ? '+' : ''}CHF {fmtCHF(Math.abs(analysis.surplus))}/Monat
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>
                Renten CHF {fmtCHF(analysis.monthlyIncome.total)}/Mt. − Budget CHF {fmtCHF(monthlyBudget)}/Mt.
                {' = '}{analysis.surplus >= 0 ? 'Überschuss' : 'Lücke'} CHF {fmtCHF(Math.abs(analysis.surplus))}/Mt.
              </div>
            </div>
          </div>
        </section>

        {/* Wealth chart */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">B</span>Vermögensverlauf bis Alter 95</h2>
            <span className="block-hint">
              {hasEnabledEvents
                ? `1.5% Inflation · 2.5% Rendite · ${lifeEvents.filter(e => e.enabled && e.amount > 0).length} Lebensereignis(se) eingerechnet`
                : 'Neutrale Annahmen: 1.5% Inflation, 2.5% Rendite'}
            </span>
          </div>

          {hasEnabledEvents && (
            <div style={{
              display: 'flex', gap: 12, marginBottom: 14, padding: '10px 14px',
              background: eventsImpact.netImpact < 0 ? '#fffbeb' : '#ecfdf5',
              border: `1px solid ${eventsImpact.netImpact < 0 ? '#fde68a' : '#bbf7d0'}`,
              borderRadius: 8, flexWrap: 'wrap',
            }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-700)', flex: 1, minWidth: 200 }}>
                <strong>Lebensereignisse eingerechnet:</strong>{' '}
                CHF {fmtCHF(eventsImpact.totalOutflow)} Sonderausgaben
                {eventsImpact.totalInflow > 0 && ` · CHF ${fmtCHF(eventsImpact.totalInflow)} Zuflüsse`}
                {eventsImpact.beforeRetirement > 0 && ` · CHF ${fmtCHF(eventsImpact.beforeRetirement)} vor Pensionierung`}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="20" height="3"><line x1={0} y1={1.5} x2={20} y2={1.5} stroke="#1a2b4a" strokeWidth={2.5}/></svg>
                  Mit Ereignissen
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="20" height="3"><line x1={0} y1={1.5} x2={20} y2={1.5} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3"/></svg>
                  Ohne Ereignisse
                </span>
              </div>
            </div>
          )}

          {chartData.length > 0 ? (
            <div role="img" aria-label="Flächendiagramm: Vermögensentwicklung im Ruhestand. Zeigt das Gesamtvermögen von der Pensionierung bis zum prognostizierten Aufbrauch-Alter, inklusive monatlicher Renteneinnahmen und Ausgaben.">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a2b4a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1a2b4a" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-100)" />
                <XAxis dataKey="age" tick={{ fontSize: 11, fill: 'var(--ink-400)' }} label={{ value: 'Alter', position: 'insideBottomRight', offset: -4, fontSize: 11 }} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: 'var(--ink-400)' }} width={60} />
                <Tooltip
                  formatter={(v: number, name: string) => [`CHF ${fmtCHF(v)}`, name === 'vermoegen' ? 'Vermögen' : name === 'einnahmen' ? 'Renteneinnahmen/Mt.' : 'Ausgaben/Mt.']}
                  labelFormatter={(l) => `Alter ${l}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--ink-200)' }}
                />
                {!hasEnabledEvents && analysis.ageWhenBroke && (
                  <ReferenceLine x={analysis.ageWhenBroke} stroke="#ef4444" strokeDasharray="4 4"
                    label={{ value: 'Vermögen aufgebraucht', fill: '#ef4444', fontSize: 10, position: 'top' }} />
                )}
                {hasEnabledEvents && ageWhenBrokeWithEvents && (
                  <ReferenceLine x={ageWhenBrokeWithEvents} stroke="#ef4444" strokeDasharray="4 4"
                    label={{ value: 'Mit Ereignissen', fill: '#ef4444', fontSize: 9, position: 'top' }} />
                )}
                {/* Life event markers */}
                {lifeEvents.filter(e => e.enabled && e.amount > 0).map(evt => {
                  const birthYear = p1.dob ? new Date(p1.dob).getFullYear() : new Date().getFullYear() - currentAge1
                  const evtAge = evt.year - birthYear
                  if (evtAge < ra1 || evtAge > 95) return null
                  const cfg = CATEGORY_CONFIG[evt.category]
                  const color = evt.art === 'einnahme' ? '#16a34a' : '#f59e0b'
                  return (
                    <ReferenceLine key={evt.id} x={evtAge} stroke={color} strokeDasharray="3 3" strokeWidth={1.5}
                      label={{ value: cfg.icon, fill: color, fontSize: 13, position: 'insideTopRight' }} />
                  )
                })}
                <Area type="monotone" dataKey="vermoegen" stroke="#1a2b4a" strokeWidth={2.5}
                  fill="url(#wealthGrad)" name={hasEnabledEvents ? 'Mit Ereignissen' : 'vermoegen'} />
                {hasEnabledEvents && (
                  <Line type="monotone" dataKey="vermoegenBase" stroke="#94a3b8" strokeWidth={1.5}
                    strokeDasharray="5 5" dot={false} name="Ohne Ereignisse" />
                )}
              </AreaChart>
            </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-400)', fontSize: 14 }}>
              Bitte geben Sie Geburtsdatum und Pensionierungsalter in Schritt 1 ein.
            </div>
          )}
        </section>

        {/* Vermögensentwicklung & Entnahmeplan */}
        {wdInitialWealth > 0 && (
          <section className="block">
            <div className="block-head">
              <h2 className="block-title"><span className="block-num">B2</span>Vermögensentwicklung &amp; Entnahmeplan</h2>
              <span className="block-hint">Wie lange reicht Ihr Vermögen?</span>
            </div>

            <div style={{ fontSize: 13.5, color: 'var(--ink-600)', lineHeight: 1.7, marginBottom: 18, padding: '12px 14px', background: 'var(--ink-50)', borderRadius: 8 }}>
              Nach der Pensionierung decken AHV und PK-Rente oft nicht den gesamten Finanzbedarf. Die Differenz muss aus Ihrem Vermögen finanziert werden. Die entscheidende Frage: <strong>Wie lange reicht Ihr Vermögen?</strong>
            </div>

            {/* Income vs expenses overview */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ padding: '14px 16px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#15803d', marginBottom: 10 }}>Monatliche Einnahmen</div>
                {[
                  { label: 'AHV-Rente', value: ahvMonthly1 },
                  { label: 'PK-Rente', value: pkMonthlyForRente },
                  { label: 'Total Einnahmen', value: wdMonthlyIncome, bold: true },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4, fontWeight: row.bold ? 700 : 400 }}>
                    <span style={{ color: '#166534' }}>{row.label}</span>
                    <span>CHF {fmtCHF(row.value)}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '14px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 10 }}>Monatlicher Bedarf</div>
                {[
                  { label: 'Lebenshaltung', value: monthlyBudget },
                  { label: 'Steuern (geschätzt)', value: retirementTax1?.monthlyTax ?? 0 },
                  { label: 'Total Bedarf', value: monthlyBudget + (retirementTax1?.monthlyTax ?? 0), bold: true },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4, fontWeight: row.bold ? 700 : 400 }}>
                    <span style={{ color: '#7f1d1d' }}>{row.label}</span>
                    <span>CHF {fmtCHF(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly gap hero */}
            <div style={{
              padding: '16px 20px', borderRadius: 12, marginBottom: 20,
              background: wdStatus === 'green' ? 'var(--navy-600)' : wdStatus === 'yellow' ? '#d97706' : '#dc2626',
              color: 'white',
            }}>
              <div style={{ fontSize: 11.5, opacity: 0.8, marginBottom: 4 }}>Benötigte Entnahme aus Vermögen</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, marginBottom: 6 }}>
                CHF {fmtCHF(wdEffectiveWithdrawal)}/Monat
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: 12.5, flexWrap: 'wrap' }}>
                <div>Vermögen bei Pensionierung: <strong>CHF {fmtCHF(wdInitialWealth)}</strong></div>
                <div>= {wdInitialWealth > 0 ? ((wdEffectiveWithdrawal * 12 / wdInitialWealth) * 100).toFixed(1) : '0'}% des Vermögens/Jahr</div>
                <div>Nachh. Rate (3.5%): <strong>CHF {fmtCHF(wdStrategies.percentRule35.monthlyAmount)}/Mt.</strong></div>
                {wdMonthlyGap > wdStrategies.percentRule35.monthlyAmount && (
                  <div style={{ color: '#fde68a' }}>⚠ Entnahme übersteigt nachhaltige 3.5%-Rate</div>
                )}
              </div>
            </div>

            {/* Wealth composition */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 8 }}>Vermögen bei Pensionierung (Zusammenstellung)</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <tbody>
                    {[
                      { label: 'Bankguthaben / Sparkonten', value: freeAssets || 0, positive: true },
                      ...(p1.has3a && p1.balance3a > 0 ? [{ label: 'Säule 3a (Kapitalbezug)', value: p1.balance3a, positive: true }] : []),
                      ...(p1.hasPK && p1.pkBezugsart !== 'rente' && p1.pkCapital > 0 ? (() => {
                        const cap = p1.pkBezugsart === 'mix' ? Math.round(p1.pkCapital / 2) : p1.pkCapital
                        const tax = calculateCapitalWithdrawalTax(cap, canton, taxStatus)
                        return [
                          { label: `PK-Kapital (${p1.pkBezugsart === 'mix' ? '50%' : '100%'} Kapitalbezug)`, value: cap, positive: true },
                          { label: '– Kapitalbezugssteuer PK', value: tax.totalTax, positive: false },
                        ]
                      })() : []),
                      ...(p1.hasFZ && p1.fzBalance > 0 ? (() => {
                        const tax = calculateCapitalWithdrawalTax(p1.fzBalance, canton, taxStatus)
                        return [
                          { label: 'Freizügigkeitsguthaben (FZ)', value: p1.fzBalance, positive: true },
                          { label: '– Kapitalbezugssteuer FZ', value: tax.totalTax, positive: false },
                        ]
                      })() : []),
                    ].map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'white' : 'var(--ink-50)' }}>
                        <td style={{ padding: '8px 10px', border: '1px solid var(--ink-100)' }}>{row.label}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid var(--ink-100)', color: row.positive ? '#15803d' : '#dc2626', fontWeight: 600 }}>
                          {row.positive ? '' : '–'}CHF {fmtCHF(row.value)}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--navy-50)', fontWeight: 700 }}>
                      <td style={{ padding: '8px 10px', border: '1px solid var(--ink-200)' }}>Verfügbares Vermögen bei Pensionierung</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid var(--ink-200)', color: 'var(--navy-700)' }}>CHF {fmtCHF(wdInitialWealth)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {property.has && property.value > 0 && (
                <div style={{ marginTop: 8, padding: '12px 14px', background: '#eff6ff', border: '1px solid #bae6fd', borderRadius: 8, fontSize: 12, color: '#0c4a6e', lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Ihre Immobilie (CHF {fmtCHF(property.value)}) ist ein wichtiger Vermögenswert, zählt aber nicht als liquides Kapital.</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div>• <strong>Verkauf und Mietwohnung:</strong> Setzt ca. CHF {fmtCHF(Math.max(0, property.value - property.mortgage))} frei (Marktwert minus Hypothek)</div>
                    <div>• <strong>Umkehrhypothek:</strong> Monatliche Auszahlung ca. CHF {fmtCHF(Math.round(Math.max(0, property.value - property.mortgage) * 0.03 / 12))} ohne Verkauf (Schätzung ~3% p.a.)</div>
                    <div>• <strong>Beibehalten:</strong> Kein zusätzliches Einkommen, aber keine Mietkosten</div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11.5, color: '#1e3a5f' }}>Klären Sie Ihre bevorzugte Option mit Ihrer Bank oder einem unabhängigen Berater.</div>
                </div>
              )}
              {!property.has && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 6, fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.5 }}>
                  Tipp: Als Mieterin / Mieter haben Sie keine Hypothekarschulden. Prüfen Sie nach der Pensionierung Ihren Anspruch auf kantonale Mietzinsbeiträge – viele Kantone bieten einkommensabhängige Mietzinsverbilligungen für Rentnerinnen und Rentner an.
                </div>
              )}
            </div>

            {/* Main depletion chart */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 6 }}>Vermögensverlauf – Drei Szenarien</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10, fontSize: 12 }}>
                {wdScenarios.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 24, height: 3, background: i === 0 ? '#22c55e' : i === 1 ? '#3b82f6' : '#ef4444', borderRadius: 2 }} />
                    <span style={{ color: 'var(--ink-600)' }}>{s.label}: {s.depletionAge ? `bis Alter ${s.depletionAge}` : '> 100'} (Entnahme CHF {fmtCHF(s.monthlyWithdrawal)}/Mt.)</span>
                  </div>
                ))}
              </div>
            </div>
            <div role="img" aria-label="Liniendiagramm: Vermögensentwicklung nach Entnahmestrategie in drei Szenarien (Optimistisch, Realistisch, Pessimistisch). Zeigt wie lange das Kapital reicht bis es auf null sinkt.">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={wdChartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-100)" />
                <XAxis dataKey="age" tick={{ fontSize: 11 }} label={{ value: 'Alter', position: 'insideBottomRight', offset: -4, fontSize: 11 }} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={56} />
                <Tooltip formatter={(v: number) => `CHF ${fmtCHF(v)}`} labelFormatter={l => `Alter ${l}`} />
                <ReferenceLine y={0} stroke="#dc2626" strokeWidth={1.5} label={{ value: 'Vermögen 0', fill: '#dc2626', fontSize: 10, position: 'insideRight' }} />
                <ReferenceLine x={wdLifeExp} stroke="#6b7280" strokeDasharray="5 5" label={{ value: `Ø LE ${wdLifeExp}`, fill: '#6b7280', fontSize: 10, position: 'insideTopRight' }} />
                <Line type="monotone" dataKey="Optimistisch" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Realistisch" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Pessimistisch" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            </div>

            {/* Scenario summary table */}
            <div style={{ overflowX: 'auto', marginBottom: 20, marginTop: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--navy-50)' }}>
                    {['Szenario', 'Rendite', 'Entnahme', 'Reicht bis Alter', 'Bewertung'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid var(--ink-100)', fontWeight: 600, color: 'var(--navy-700)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {wdScenarios.map((s, i) => {
                    const ok = s.depletionAge === null || s.depletionAge > wdLifeExp + 3
                    const warn = s.depletionAge !== null && s.depletionAge >= wdLifeExp - 3 && s.depletionAge <= wdLifeExp + 3
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'white' : 'var(--ink-50)' }}>
                        <td style={{ padding: '8px 10px', border: '1px solid var(--ink-100)', fontWeight: 600 }}>{s.label}</td>
                        <td style={{ padding: '8px 10px', border: '1px solid var(--ink-100)' }}>{(s.returnRate * 100).toFixed(0)}%</td>
                        <td style={{ padding: '8px 10px', border: '1px solid var(--ink-100)' }}>CHF {fmtCHF(s.monthlyWithdrawal)}/Mt.</td>
                        <td style={{ padding: '8px 10px', border: '1px solid var(--ink-100)', fontWeight: 700, color: ok ? '#15803d' : warn ? '#d97706' : '#dc2626' }}>
                          {s.depletionAge ? `Alter ${s.depletionAge}` : '> Alter 100'}
                        </td>
                        <td style={{ padding: '8px 10px', border: '1px solid var(--ink-100)' }}>
                          {ok ? '✅ Ausreichend' : warn ? '⚠️ Knapp' : '❌ Unterdeckung'}
                        </td>
                      </tr>
                    )
                  })}
                  <tr style={{ background: '#f0f9ff', fontStyle: 'italic' }}>
                    <td style={{ padding: '8px 10px', border: '1px solid var(--ink-100)' }} colSpan={3}>Statist. Lebenserwartung ({p1.sex === 'm' ? 'Mann' : 'Frau'})</td>
                    <td style={{ padding: '8px 10px', border: '1px solid var(--ink-100)', fontWeight: 700 }}>Alter {wdLifeExp}</td>
                    <td style={{ padding: '8px 10px', border: '1px solid var(--ink-100)', fontSize: 11 }}>BFS Daten 2026</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Withdrawal strategies */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 10 }}>Entnahme-Strategien im Vergleich</div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['deplete90', 'deplete95', 'preserve'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setWdGoalMode(mode)}
                      style={{
                        flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 12.5,
                        border: `2px solid ${wdGoalMode === mode ? 'var(--navy-600)' : 'var(--ink-200)'}`,
                        background: wdGoalMode === mode ? 'var(--navy-600)' : 'white',
                        color: wdGoalMode === mode ? 'white' : 'var(--ink-700)',
                        fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {mode === 'deplete90' ? 'Verzehr bis 90' : mode === 'deplete95' ? 'Verzehr bis 95' : 'Kapitalerhalt'}
                    </button>
                  ))}
                </div>
                <div style={{ padding: '14px 16px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 10, fontSize: 12.5 }}>
                  {wdGoalMode === 'deplete90' && (
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--navy-800)', marginBottom: 4 }}>Kapitalverzehr bis Alter 90</div>
                      <div style={{ color: 'var(--ink-600)' }}>
                        Sie können <strong>CHF {fmtCHF(wdStrategies.toAge90.monthlyAmount)}/Monat</strong> entnehmen und das Vermögen bis 90 aufbrauchen.
                        {wdStrategies.toAge90.monthlyAmount < wdEffectiveWithdrawal && (
                          <span style={{ color: '#dc2626' }}> Zu wenig – Lücke CHF {fmtCHF(wdEffectiveWithdrawal - wdStrategies.toAge90.monthlyAmount)}/Mt.</span>
                        )}
                      </div>
                    </div>
                  )}
                  {wdGoalMode === 'deplete95' && (
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--navy-800)', marginBottom: 4 }}>Kapitalverzehr bis Alter 95 (empfohlen)</div>
                      <div style={{ color: 'var(--ink-600)' }}>
                        Sie können <strong>CHF {fmtCHF(wdStrategies.toAge95.monthlyAmount)}/Monat</strong> entnehmen und das Vermögen bis 95 aufbrauchen.
                        {wdStrategies.toAge95.monthlyAmount >= wdEffectiveWithdrawal
                          ? <span style={{ color: '#15803d' }}> Ihr Bedarf ist gedeckt.</span>
                          : <span style={{ color: '#dc2626' }}> Lücke: CHF {fmtCHF(wdEffectiveWithdrawal - wdStrategies.toAge95.monthlyAmount)}/Mt.</span>}
                      </div>
                    </div>
                  )}
                  {wdGoalMode === 'preserve' && (
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--navy-800)', marginBottom: 4 }}>Kapitalerhalt – nur Rendite entnehmen</div>
                      <div style={{ color: 'var(--ink-600)' }}>
                        Bei {(wdReturnRate * 100).toFixed(1)}% Rendite: <strong>CHF {fmtCHF(wdStrategies.sustainableForever.monthlyAmount)}/Monat</strong> (nur Rendite, Kapital bleibt).
                        {wdStrategies.sustainableForever.monthlyAmount < wdEffectiveWithdrawal && (
                          <span style={{ color: '#dc2626' }}> Ihr Bedarf CHF {fmtCHF(wdEffectiveWithdrawal)}/Mt. übersteigt das nachhaltig Mögliche.</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12 }}>
                  <strong>4%-Regel (Bengen 1994):</strong> CHF {fmtCHF(wdStrategies.percentRule4.firstYearMonthly)}/Mt. · Reicht bis {wdStrategies.percentRule4.depletionAge ? `Alter ${wdStrategies.percentRule4.depletionAge}` : '> 100'}. Schweizer Empfehlung: konservativere 3–3.5% (tiefere erwartete Renditen).
                </div>
              </div>
            </div>

            {/* Interactive sensitivity sliders */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 12 }}>Interaktive Sensitivität</div>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  { label: 'Monatliche Entnahme', value: wdCustomWithdrawal ?? wdMonthlyGap, min: Math.max(0, (wdCustomWithdrawal ?? wdMonthlyGap) - 2000), max: (wdCustomWithdrawal ?? wdMonthlyGap) + 2000, step: 100, unit: 'CHF/Mt.', setter: (v: number) => setWdCustomWithdrawal(v) },
                  { label: 'Rendite', value: Math.round(wdReturnRate * 100), min: 0, max: 6, step: 0.5, unit: '%', setter: (v: number) => setWdReturnRate(v / 100) },
                  { label: 'Inflation', value: Math.round(wdInflation * 100 * 10) / 10, min: 0, max: 3, step: 0.5, unit: '%', setter: (v: number) => setWdInflation(v / 100) },
                ].map(sl => (
                  <div key={sl.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: 'var(--ink-600)' }}>{sl.label}</span>
                      <span style={{ fontWeight: 700, color: 'var(--navy-700)' }}>{sl.label === 'Monatliche Entnahme' ? `CHF ${fmtCHF(Math.round(sl.value))}` : `${sl.value}${sl.unit}`}</span>
                    </div>
                    <input
                      type="range" min={sl.min} max={sl.max} step={sl.step}
                      value={sl.value}
                      onChange={e => sl.setter(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--navy-600)' }}
                    />
                  </div>
                ))}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={wdAdjustInflation} onChange={e => setWdAdjustInflation(e.target.checked)} />
                  Entnahme jährlich an Inflation anpassen (Kaufkraft erhalten)
                </label>
              </div>
              {/* Live result */}
              <div style={{ marginTop: 10, padding: '10px 14px', background: wdCustomProjection.find(p => p.depleted) ? '#fef2f2' : '#ecfdf5', border: `1px solid ${wdCustomProjection.find(p => p.depleted) ? '#fecaca' : '#bbf7d0'}`, borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                {(() => {
                  const dep = wdCustomProjection.find(p => p.depleted)
                  return dep
                    ? <span style={{ color: '#dc2626' }}>Mit diesen Einstellungen: Vermögen aufgebraucht bei Alter {dep.age}</span>
                    : <span style={{ color: '#15803d' }}>Mit diesen Einstellungen: Vermögen reicht bis Alter 100+</span>
                })()}
              </div>
            </div>

            {/* Sensitivity tornado */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 10 }}>Sensitivitäts-Analyse – Was beeinflusst Ihr Ergebnis?</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {wdSensitivity.map((s, i) => {
                  const maxDelta = Math.max(...wdSensitivity.map(x => Math.max(Math.abs(x.lowDelta), Math.abs(x.highDelta))), 1)
                  const barLow = Math.min(100, (Math.abs(s.lowDelta) / maxDelta) * 100)
                  const barHigh = Math.min(100, (Math.abs(s.highDelta) / maxDelta) * 100)
                  return (
                    <div key={i} style={{ fontSize: 12.5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontWeight: 600, color: 'var(--ink-700)' }}>{s.factor}</span>
                        <span style={{ color: 'var(--ink-500)', fontSize: 11 }}>
                          {s.lowLabel}: {s.lowDelta > 0 ? '+' : ''}{s.lowDelta}J · {s.highLabel}: {s.highDelta > 0 ? '+' : ''}{s.highDelta}J
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 14 }}>
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                          <div style={{ width: `${barLow}%`, height: 10, background: s.lowDelta > 0 ? '#22c55e' : '#ef4444', borderRadius: '4px 0 0 4px' }} />
                        </div>
                        <div style={{ width: 2, height: 14, background: 'var(--ink-300)' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ width: `${barHigh}%`, height: 10, background: s.highDelta > 0 ? '#22c55e' : '#ef4444', borderRadius: '0 4px 4px 0' }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* What-if scenarios */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 10 }}>«Was wäre wenn…»</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  { label: 'CHF 500 weniger/Monat ausgeben', deltaM: -500, deltaW: 0, deltaR: 0 },
                  { label: 'Börsencrash –30%', deltaM: 0, deltaW: -0.3, deltaR: 0 },
                  { label: 'Pflegeheim ab 80 (+CHF 5\'000/Mt.)', deltaM: 5000, deltaW: 0, deltaR: 0 },
                  { label: 'Erbschaft +CHF 200\'000', deltaM: 0, deltaW: 0.2, deltaR: 0 },
                ].map((sc, i) => {
                  const altWithdrawal = wdEffectiveWithdrawal + sc.deltaM
                  const altWealth = wdInitialWealth + sc.deltaW * wdInitialWealth + sc.deltaR * 1000000
                  const baseAge = wdScenarios.find(s => s.label === 'Realistisch')?.depletionAge ?? null
                  const altAge = (() => {
                    const proj = calculateWealthDepletion(Math.max(0, altWealth), Math.max(0, altWithdrawal), wdReturnRate, wdInflation, ra1, false, 40)
                    const dep = proj.find(p => p.depleted)
                    return dep ? dep.age : null
                  })()
                  const diff = altAge !== null && baseAge !== null ? altAge - baseAge : altAge === null && baseAge !== null ? 99 - baseAge : null
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--ink-50)', border: '1px solid var(--ink-100)', borderRadius: 8, fontSize: 12.5 }}>
                      <span style={{ color: 'var(--ink-700)' }}>{sc.label}</span>
                      <span style={{ fontWeight: 700, color: diff !== null && diff > 0 ? '#15803d' : '#dc2626', whiteSpace: 'nowrap' }}>
                        {diff !== null ? `${diff > 0 ? '+' : ''}${diff === 99 - (baseAge ?? 0) ? '>+' + (99 - (baseAge ?? 0)) : diff} Jahre` : '–'}
                        {altAge && ` (bis ${altAge})`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Longevity risk */}
            <div style={{ marginBottom: 20, padding: '14px 16px', background: '#eff6ff', border: '1px solid #bae6fd', borderRadius: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0c4a6e', marginBottom: 8 }}>Langlebigkeitsrisiko</div>
              <div style={{ fontSize: 12.5, color: '#1e3a5f', lineHeight: 1.7 }}>
                <div>Statistische Lebenserwartung mit 65: <strong>{wdLifeExp} Jahre</strong></div>
                <div>25% der {p1.sex === 'm' ? 'Männer' : 'Frauen'} werden älter als {wdLifeExp + 5} · 10% älter als {wdLifeExp + 8}</div>
                <div style={{ marginTop: 6, fontWeight: 600 }}>Wir empfehlen: Planen Sie bis mindestens 95 Jahre.</div>
                <div style={{ marginTop: 6, padding: '8px 10px', background: wdStatus === 'green' ? '#ecfdf5' : wdStatus === 'yellow' ? '#fffbeb' : '#fef2f2', borderRadius: 6, fontSize: 12.5 }}>
                  {wdStatus === 'green' && `✅ Ihr Vermögen reicht voraussichtlich über Ihre statistische Lebenserwartung (${wdLifeExp}) hinaus.`}
                  {wdStatus === 'yellow' && `⚠️ Ihr Vermögen reicht knapp. Ein Puffer wäre empfehlenswert.`}
                  {wdStatus === 'red' && (() => {
                    const targetAge = 95
                    const shortfall = wdEffectiveWithdrawal - wdStrategies.toAge95.monthlyAmount
                    return `❌ Achtung: Ihr Vermögen könnte vor dem Lebensende aufgebraucht sein. ${shortfall > 0 ? `Für Reichweite bis 95: CHF ${fmtCHF(shortfall)}/Mt. weniger entnehmen` : ''}`
                  })()}
                </div>
              </div>
            </div>

            {/* EL check */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 8 }}>Ergänzungsleistungen (EL) – Sicherheitsnetz</div>
              <div style={{ padding: '14px 16px', background: wdELCheck.eligible ? '#eff6ff' : 'var(--ink-50)', border: `1px solid ${wdELCheck.eligible ? '#bae6fd' : 'var(--ink-200)'}`, borderRadius: 10, fontSize: 12.5 }}>
                {wdELCheck.eligible ? (
                  <>
                    <div style={{ fontWeight: 600, color: '#0c4a6e', marginBottom: 6 }}>Basierend auf Ihren Angaben könnten Sie EL beanspruchen</div>
                    <div style={{ color: '#1e3a5f', lineHeight: 1.65 }}>
                      <div>Anerkannte Ausgaben: CHF {fmtCHF(wdELCheck.annualNeeds)}/Jahr</div>
                      <div>Anrechenbare Einnahmen: CHF {fmtCHF(Math.round(wdELCheck.annualIncome))}/Jahr</div>
                      <div style={{ marginTop: 4, fontWeight: 700 }}>Geschätzte EL: CHF {fmtCHF(wdELCheck.estimatedMonthlyEL)}/Monat</div>
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--ink-600)' }}>
                    Basierend auf Ihren Angaben besteht kein EL-Anspruch (Einkommen und Vermögen übersteigen die Grenzwerte).
                  </div>
                )}
                <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--ink-500)' }}>
                  EL sind kein Almosen – sie sind ein Rechtsanspruch. Die tatsächliche Berechnung erfolgt durch die zuständige AHV-Zweigstelle.
                </div>
              </div>
            </div>

            {/* Year-by-year table */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-800)' }}>Cashflow-Übersicht Jahr für Jahr</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => downloadCSV(exportProjectionToCSV(wdYearlyTable), `entnahmeplan_alter${ra1}.csv`)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--ink-200)', background: 'white', fontSize: 12, cursor: 'pointer', color: 'var(--ink-600)' }}
                  >
                    ↓ CSV Export
                  </button>
                  <button
                    onClick={() => setWdShowTable(v => !v)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--navy-200)', background: wdShowTable ? 'var(--navy-600)' : 'white', fontSize: 12, cursor: 'pointer', color: wdShowTable ? 'white' : 'var(--navy-600)' }}
                  >
                    {wdShowTable ? 'Tabelle schliessen' : 'Tabelle öffnen'}
                  </button>
                </div>
              </div>
              {wdShowTable && (
                <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto', border: '1px solid var(--ink-100)', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--navy-50)', zIndex: 1 }}>
                      <tr>
                        {['Alter', 'Einnahmen/J', 'Ausgaben/J', 'Entnahme/J', 'Rendite', 'Vermögen Ende'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid var(--ink-100)', fontWeight: 600, color: 'var(--navy-700)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {wdYearlyTable.map((row, i) => (
                        <tr key={i} style={{ background: row.depleted ? '#fef2f2' : row.wealthEnd < wdEffectiveWithdrawal * 12 ? '#fffbeb' : i % 2 === 0 ? 'white' : 'var(--ink-50)' }}>
                          <td style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid var(--ink-100)', fontWeight: 700, color: row.depleted ? '#dc2626' : 'inherit' }}>{row.age}{row.depleted ? ' 🔴' : ''}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid var(--ink-100)' }}>CHF {fmtCHF(row.annualIncome)}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid var(--ink-100)' }}>CHF {fmtCHF(row.annualExpenses)}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid var(--ink-100)', color: row.withdrawal > 0 ? '#dc2626' : '#15803d' }}>CHF {fmtCHF(row.withdrawal)}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid var(--ink-100)', color: '#15803d' }}>CHF {fmtCHF(row.returns)}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid var(--ink-100)', fontWeight: 600, color: row.wealthEnd > 0 ? 'var(--navy-700)' : '#dc2626' }}>CHF {fmtCHF(row.wealthEnd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Action levers if wealth is insufficient */}
            {wdStatus !== 'green' && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 10 }}>Hebel zur Verlängerung der Vermögensreichweite</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: 'var(--navy-50)' }}>
                        {['Massnahme', 'Effekt (Jahre)', 'Aufwand'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid var(--ink-100)', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const base = wdScenarios.find(s => s.label === 'Realistisch')?.depletionAge ?? 90
                        const levers = [
                          { label: 'Ausgaben –CHF 500/Mt.', altM: wdEffectiveWithdrawal - 500, altW: wdInitialWealth, altR: wdReturnRate, effort: 'Lebensstil' },
                          { label: 'Pensionierung 1 Jahr später', altM: wdEffectiveWithdrawal, altW: wdInitialWealth + (p1.income || 0), altR: wdReturnRate, effort: 'Länger arbeiten' },
                          { label: 'Rendite +1% (Anlageoptimierung)', altM: wdEffectiveWithdrawal, altW: wdInitialWealth, altR: wdReturnRate + 0.01, effort: 'Mehr Risiko' },
                          { label: 'PK-Einkauf CHF 50k → mehr Rente', altM: wdEffectiveWithdrawal - Math.round(50000 * rvkConversionRate / 12), altW: wdInitialWealth, altR: wdReturnRate, effort: 'Einmalzahlung' },
                        ]
                        return levers.map((lv, i) => {
                          const proj = calculateWealthDepletion(Math.max(0, lv.altW), Math.max(0, lv.altM), lv.altR, wdInflation, ra1, false, 40)
                          const dep = proj.find(p => p.depleted)
                          const newAge = dep ? dep.age : null
                          const diff = newAge !== null ? newAge - base : 99 - base
                          return (
                            <tr key={i} style={{ background: i % 2 === 0 ? 'white' : 'var(--ink-50)' }}>
                              <td style={{ padding: '8px 10px', border: '1px solid var(--ink-100)' }}>{lv.label}</td>
                              <td style={{ padding: '8px 10px', border: '1px solid var(--ink-100)', fontWeight: 700, color: diff > 0 ? '#15803d' : '#dc2626' }}>
                                {diff > 0 ? '+' : ''}{diff >= 99 - base ? `>+${99 - base}` : diff} Jahre
                              </td>
                              <td style={{ padding: '8px 10px', border: '1px solid var(--ink-100)', color: 'var(--ink-500)' }}>{lv.effort}</td>
                            </tr>
                          )
                        })
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div style={{ padding: '10px 14px', background: 'var(--ink-50)', borderRadius: 8, fontSize: 11.5, color: 'var(--ink-500)', lineHeight: 1.6 }}>
              <strong>Hinweis:</strong> Die Vermögensprojektion basiert auf vereinfachten Annahmen. Tatsächliche Renditen schwanken und können negativ sein. Vergangene Renditen sind kein Indikator für zukünftige Ergebnisse. EL-Berechnungen sind Schätzungen – die tatsächliche Berechnung erfolgt durch die zuständige AHV-Zweigstelle.
            </div>
          </section>
        )}

        {/* Was wäre wenn */}
        <section className="block" style={{ background: 'var(--navy-50)', border: '1px solid var(--navy-100)' }}>
          <div className="block-head">
            <h2 className="block-title" style={{ color: 'var(--navy-800)' }}>
              <span className="block-num" style={{ background: 'var(--navy-700)', color: 'white' }}>C</span>
              Was wäre wenn?
            </h2>
            <span className="block-hint">Szenarien interaktiv erkunden</span>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--ink-600)', margin: '0 0 16px', lineHeight: 1.6 }}>
            Wie verändert sich Ihre Vorsorgesituation bei einem anderen Pensionierungsalter?
            Verschieben Sie den Slider und sehen Sie die Auswirkungen sofort.
          </p>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)' }}>
                Alternatives Pensionierungsalter: <strong>{altRetireAge} Jahre</strong>
              </label>
              {altRetireAge !== ra1 && (
                <button
                  onClick={() => setAltRetireAge(ra1)}
                  style={{ fontSize: 11, color: 'var(--navy-600)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Zurücksetzen
                </button>
              )}
            </div>
            <input
              type="range"
              min={58}
              max={70}
              step={1}
              value={altRetireAge}
              onChange={(e) => setAltRetireAge(Number(e.target.value))}
              className="range"
              style={{ '--val': `${((altRetireAge - 58) / 12) * 100}%` } as React.CSSProperties}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-400)', marginTop: 4 }}>
              {[58, 60, 62, 65, 68, 70].map(a => <span key={a}>{a}</span>)}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: '14px 16px', background: 'white', border: '1px solid var(--ink-200)', borderRadius: 12 }}>
              <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginBottom: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Aktuelle Planung · {ra1} Jahre
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: analysis.surplus >= 0 ? 'var(--green-600)' : '#dc2626' }}>
                {analysis.surplus >= 0 ? '+' : ''}CHF {fmtCHF(analysis.surplus)}/Mt.
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 2 }}>
                Score: {analysis.sustainabilityScore}/100
              </div>
            </div>
            <div style={{
              padding: '14px 16px', borderRadius: 12,
              background: altAnalysis.surplus >= 0 ? 'var(--green-50)' : '#fef2f2',
              border: `1px solid ${altAnalysis.surplus >= 0 ? 'var(--green-200)' : '#fecaca'}`,
            }}>
              <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginBottom: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Alternative · {altRetireAge} Jahre
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: altAnalysis.surplus >= 0 ? 'var(--green-600)' : '#dc2626' }}>
                {altAnalysis.surplus >= 0 ? '+' : ''}CHF {fmtCHF(altAnalysis.surplus)}/Mt.
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 2 }}>
                Score: {altAnalysis.sustainabilityScore}/100
                {altRetireAge !== ra1 && (
                  <span style={{ marginLeft: 6, color: altAnalysis.surplus > analysis.surplus ? 'var(--green-600)' : '#dc2626', fontWeight: 600 }}>
                    {altAnalysis.surplus > analysis.surplus ? '▲' : '▼'}
                    {' '}CHF {fmtCHF(Math.abs(altAnalysis.surplus - analysis.surplus))}/Mt.
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Scenarios */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">D</span>Szenarien – Sensitivitätsanalyse</h2>
            <span className="block-hint">Transparente Annahmen</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-500)', marginBottom: 14, padding: '10px 14px', background: 'var(--navy-50)', borderRadius: 8, border: '1px solid var(--navy-100)' }}>
            <strong>Berechnungsannahmen:</strong> Alle drei Szenarien gehen von einer Lebenserwartung bis Alter 95 aus. Anlagerendite und Inflation variieren je nach Szenario. AHV-Renten sind indexiert; PK-Renten ohne Teuerungsanpassung.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { key: 'optimistic', label: 'Optimistisch', color: '#22c55e', bg: 'var(--green-50)', border: 'var(--green-200)', data: scenarios.optimistic, sub: 'Inflation 1.0% · Rendite 4.5%' },
              { key: 'neutral', label: 'Neutral', color: '#1a2b4a', bg: 'var(--navy-50)', border: 'var(--navy-100)', data: scenarios.neutral, sub: 'Inflation 1.5% · Rendite 2.5%' },
              { key: 'pessimistic', label: 'Pessimistisch', color: '#ef4444', bg: '#fef2f2', border: '#fecaca', data: scenarios.pessimistic, sub: 'Inflation 2.5% · Rendite 1.0%' },
            ].map((sc) => (
              <div key={sc.key} style={{ padding: '16px 18px', background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>{sc.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: sc.color }}>
                  CHF {fmtCHF(sc.data.monthlyIncome.total)}/Mt.
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>{sc.sub}</div>
                <div style={{ fontSize: 12, marginTop: 6, color: sc.data.surplus >= 0 ? 'var(--green-600)' : 'var(--red-500)' }}>
                  {sc.data.surplus >= 0 ? '+' : ''}CHF {fmtCHF(sc.data.surplus)}/Mt.
                </div>
                {sc.data.ageWhenBroke ? (
                  <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>Reicht bis Alter {sc.data.ageWhenBroke}</div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--green-600)', marginTop: 2 }}>Reicht bis 95+</div>
                )}
              </div>
            ))}
          </div>

          {scenarioChartData.length > 0 && (
            <div role="img" aria-label="Liniendiagramm: Szenarien-Vergleich der Vermögensentwicklung. Drei Kurven (Optimistisch, Neutral, Pessimistisch) zeigen wie lange das Vermögen unter verschiedenen Rendite-Annahmen reicht.">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={scenarioChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-100)" />
                <XAxis dataKey="age" tick={{ fontSize: 11, fill: 'var(--ink-400)' }} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: 'var(--ink-400)' }} width={60} />
                <Tooltip
                  formatter={(v: number, name: string) => [`CHF ${fmtCHF(v)}`, name === 'optimistisch' ? 'Optimistisch' : name === 'neutral' ? 'Neutral' : 'Pessimistisch']}
                  labelFormatter={(l) => `Alter ${l}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="optimistisch" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="neutral" stroke="#1a2b4a" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pessimistisch" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Fix 7: Sequence-of-Returns-Risk (FIRE / Frühpensionierung) */}
        {ra1 < 63 && (freeAssets || 0) > 100000 && (
          <section className="block" style={{ border: '2px solid #fde68a', background: '#fffbeb' }}>
            <div className="block-head">
              <h2 className="block-title" style={{ color: '#92400e' }}>
                <span className="block-num" style={{ background: '#f59e0b', color: 'white' }}>!</span>
                Sequence-of-Returns-Risk (SoRR)
              </h2>
              <span className="block-hint">Kritisch für Frühpensionierung</span>
            </div>
            <div style={{ padding: '12px 16px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, marginBottom: 16, fontSize: 13.5, color: '#7c2d12', lineHeight: 1.7 }}>
              <strong>Das grösste Risiko bei langer Entnahmephase:</strong> Wenn Ihr Portfolio in den ersten 3–5 Jahren nach der Pensionierung stark fällt, während Sie gleichzeitig Kapital entnehmen, erholt sich das Vermögen möglicherweise nie mehr vollständig – selbst wenn die langfristige Rendite identisch wäre.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Schlechter Start', desc: 'Portfolio −30% im Jahr 1 + Entnahme = dauerhafter Schaden', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                { label: 'Guter Start', desc: 'Portfolio +10% im Jahr 1 + Entnahme = Puffer für spätere Verluste', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
                { label: 'Identische Rendite', desc: 'Gleiche Ø-Rendite über 20 Jahre – aber Reihenfolge entscheidet über Outcome', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
              ].map(s => (
                <div key={s.label} style={{ padding: '10px 12px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, color: s.color, fontSize: 12.5, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: s.color, lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 8 }}>Mögliche Absicherungen:</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#7c2d12', lineHeight: 1.85 }}>
                <li><strong>Liquiditätspuffer:</strong> 2–3 Jahresausgaben in Cash/kurzlaufenden Anleihen halten – wird bei Einbruch nicht verkauft</li>
                <li><strong>Flexible Entnahme:</strong> Bei Markteinbruch Entnahme temporär reduzieren (Guardrails-Strategie)</li>
                <li><strong>Gestaffelte 3a-Bezüge:</strong> Stabile Einnahmen ohne Marktabhängigkeit in den ersten Jahren</li>
                <li><strong>Bucket-Strategie:</strong> Kurzfrist (0–3J Cash), Mittelfrist (3–10J Anleihen), Langfrist (10J+ Aktien)</li>
              </ul>
            </div>
            {(freeAssets || 0) > 0 && (() => {
              const cashMonths = Math.round((freeAssets || 0) / monthlyBudget)
              return (
                <div style={{ padding: '10px 14px', background: cashMonths >= 24 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${cashMonths >= 24 ? '#bbf7d0' : '#fca5a5'}`, borderRadius: 8, fontSize: 12.5 }}>
                  <strong>Ihr Liquiditätspuffer (freies Vermögen):</strong> CHF {fmtCHF(freeAssets || 0)} = ca. {cashMonths} Monate Ausgaben{' '}
                  {cashMonths >= 24
                    ? <span style={{ color: '#15803d', fontWeight: 600 }}>✓ Ausreichend für 2-3 Jahres-Puffer</span>
                    : <span style={{ color: '#dc2626', fontWeight: 600 }}>⚠ Unter 24 Monaten – Puffer aufstocken empfohlen</span>
                  }
                </div>
              )
            })()}
          </section>
        )}

        {/* AHV Detail */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">E</span>AHV-Detailanalyse</h2>
            <span className="block-hint" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>Skala 44 · BSV 2026</span>
          </div>

          {(() => {
            const p1stored = state.persons.find(p => p.id === 1)!
            const p2stored = state.persons.find(p => p.id === 2)!
            const baseYears1 = Math.min(44, Math.max(0, ra1 - 21))
            const effectiveYears1 = Math.max(0, baseYears1 - (p1stored.ahvContributionGaps || 0))
            const variants1 = calculateAllVariants(p1.grossIncome || p1.income || 0, effectiveYears1, p1stored.ahvContributionGaps || 0)
            const breakEvenData = buildBreakEvenChartData(variants1)

            // Break-even between ordentlich and vorbezug 2J
            const v63 = variants1.find(v => v.bezugAge === 63)!
            const v65 = variants1.find(v => v.bezugAge === 65)!
            const v67 = variants1.find(v => v.bezugAge === 67)!
            const be63vs65 = calculateBreakEven(v63.monthlyRente, 63, v65.monthlyRente, 65)
            const be65vs67 = calculateBreakEven(v65.monthlyRente, 65, v67.monthlyRente, 67)

            return (
              <>
                {/* Person cards */}
                <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
                  {[
                    { name: person1.name || 'Person 1', result: analysis.ahv.person1, effectiveYears: effectiveYears1, income: p1.grossIncome || p1.income || 0 },
                    ...(hasPartner && analysis.ahv.person2 ? [{
                      name: person2.name || 'Person 2',
                      result: analysis.ahv.person2,
                      effectiveYears: Math.max(0,
                        Math.min(44, Math.max(0, (p2stored.retireAge || 65) - 21)) -
                        (p2stored.ahvContributionGaps || 0)
                      ),
                      income: p2?.grossIncome || p2?.income || 0,
                    }] : []),
                  ].map((item) => (
                    <div key={item.name} style={{
                      padding: '14px 16px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)',
                      borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy-800)' }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>
                          Ø-Einkommen: CHF {fmtCHF(item.income)} · {item.effectiveYears} effektive Beitragsjahre
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--navy-800)' }}>
                          CHF {fmtCHF(item.result.monthlyRente)}/Mt.
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                          CHF {fmtCHF(item.result.yearlyInkl13)}/Jahr (inkl. 13.)
                        </div>
                      </div>
                    </div>
                  ))}
                  {analysis.ahv.plafonReduction > 0 && (
                    <div style={{ padding: '10px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 13, color: 'var(--ink-600)' }}>
                      Ehepaar-Plafonierung<InfoTooltip text={`Für Ehepaare gilt: Die Summe beider AHV-Renten darf maximal 150% einer Einzelrente betragen (max. CHF ${fmtCHF(AHV_2026.PLAFOND_MONTHLY)}/Monat für beide zusammen). Kürzung: −CHF ${fmtCHF(analysis.ahv.plafonReduction)}/Mt.`} />: −CHF {fmtCHF(analysis.ahv.plafonReduction)}/Mt. (max. CHF {fmtCHF(AHV_2026.PLAFOND_MONTHLY)}/Mt.)
                    </div>
                  )}
                  {hasPartner && (() => {
                    const ra2 = p2 ? (p2.retireAge || p2.retirementAge || 65) : ra1
                    const name1 = person1.name || 'Person 1'
                    const name2 = person2.name || 'Person 2'
                    const ahvMonthly2 = analysis.ahv.person2?.monthlyRente ?? 0
                    const currentYear = new Date().getFullYear()
                    const birthYear2 = person2.dob ? (parseInt(person2.dob.split('.').pop() || '0') || parseInt(person2.dob.split('-')[0])) : 0
                    const age2 = birthYear2 > 0 ? currentYear - birthYear2 : 50
                    const retireYear2 = currentYear + Math.max(1, ra2 - age2)

                    const plafoniert = ahvMonthly1 + ahvMonthly2 - analysis.ahv.plafonReduction
                    return (
                      <div style={{ padding: '12px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, fontSize: 12.5, color: '#1e40af', lineHeight: 1.6 }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>AHV-Plafonierung für Ehepaare – Zeitlicher Ablauf:</div>
                        {ra1 !== ra2 ? (
                          <div style={{ display: 'grid', gap: 6 }}>
                            <div>
                              <strong>Bis {retireYear2}:</strong> Nur {ra1 < ra2 ? name1 : name2} bezieht AHV → volle Einzelrente CHF {fmtCHF(ra1 < ra2 ? ahvMonthly1 : ahvMonthly2)}/Mt. <em>(keine Plafonierung)</em>
                            </div>
                            <div>
                              <strong>Ab {retireYear2}:</strong> Beide beziehen AHV → Plafonierung aktiv, max. CHF {fmtCHF(AHV_2026.PLAFOND_MONTHLY)}/Mt. zusammen
                            </div>
                            <div>
                              Ihre plafonierte Rente: {name1} CHF {fmtCHF(ahvMonthly1 - Math.round(analysis.ahv.plafonReduction / 2))}/Mt. + {name2} CHF {fmtCHF(ahvMonthly2 - Math.round(analysis.ahv.plafonReduction / 2))}/Mt. = CHF {fmtCHF(plafoniert)}/Mt.
                            </div>
                          </div>
                        ) : (
                          <div>
                            Ab Pensionierung (beide gleichzeitig): Plafonierung aktiv, max. CHF {fmtCHF(AHV_2026.PLAFOND_MONTHLY)}/Mt. zusammen. Ihre plafonierte Rente: CHF {fmtCHF(plafoniert)}/Mt.
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>

                {/* Comparison table – Person 1 */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)', marginBottom: 10 }}>
                    Bezugsvarianten {hasPartner ? `(${person1.name || 'Person 1'})` : ''} – alle 5 Möglichkeiten
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ background: 'var(--navy-800)', color: '#fff' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, borderRadius: '8px 0 0 0' }}>Variante</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Rente/Mt.</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Rente/Jahr</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Kumuliert 10J</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, borderRadius: '0 8px 0 0' }}>Kumuliert 20J</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants1.map((v, i) => {
                          const isSelected = (p1stored.ahvBezugAge ?? 65) === v.bezugAge
                          const isOrdentlich = v.bezugAge === 65
                          return (
                            <tr key={v.bezugAge} style={{
                              background: isSelected ? 'var(--navy-50)' : i % 2 === 0 ? 'var(--surface)' : '#fafafa',
                              borderBottom: '1px solid var(--ink-100)',
                            }}>
                              <td style={{ padding: '9px 12px', fontWeight: isSelected || isOrdentlich ? 600 : 400, color: 'var(--ink-800)' }}>
                                {v.shortLabel}
                                {isSelected && <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', background: 'var(--navy-800)', color: '#fff', borderRadius: 10 }}>Ihre Wahl</span>}
                                {!isSelected && isOrdentlich && <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', background: 'var(--ink-100)', color: 'var(--ink-600)', borderRadius: 10 }}>Standard</span>}
                              </td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: isSelected ? 700 : 400, color: isSelected ? 'var(--navy-800)' : 'var(--ink-700)' }}>
                                {fmtCHF(v.monthlyRente)}
                              </td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--ink-600)' }}>
                                {fmtCHF(v.yearlyInkl13)}
                              </td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--ink-600)' }}>
                                {fmtCHF(v.cumulative10y)}
                              </td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--ink-600)' }}>
                                {fmtCHF(v.cumulative20y)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                    Kumuliert ab jeweiligem Bezugsbeginn · inkl. 13. AHV-Rente
                  </div>
                </div>

                {/* Break-even chart */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)', marginBottom: 6 }}>
                    Kumulierte AHV-Rente nach Alter
                  </div>
                  {(be63vs65 || be65vs67) && (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                      {be63vs65 && (
                        <div style={{ fontSize: 12, padding: '6px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, color: '#92400e' }}>
                          ⚖ Break-even Vorbezug 2J vs. Ordentlich: <strong>Alter {be63vs65.toFixed(1)}</strong>
                        </div>
                      )}
                      {be65vs67 && (
                        <div style={{ fontSize: 12, padding: '6px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#14532d' }}>
                          ⚖ Break-even Ordentlich vs. Aufschub 2J: <strong>Alter {be65vs67.toFixed(1)}</strong>
                        </div>
                      )}
                    </div>
                  )}
                  <div role="img" aria-label="Liniendiagramm: AHV-Kumulativvergleich für verschiedene Bezugszeitpunkte (Vorbezug 63/64, Ordentlich 65, Aufschub 66/67). Zeigt welche Variante unter welchem Alter mehr ausbezahlt.">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={breakEvenData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-100)" />
                      <XAxis dataKey="age" tick={{ fontSize: 11 }} label={{ value: 'Alter', position: 'insideBottomRight', offset: -4, fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v: number, name: string) => {
                          const labels: Record<string, string> = { v63: 'Vorbezug 2J', v64: 'Vorbezug 1J', v65: 'Ordentlich', v66: 'Aufschub 1J', v67: 'Aufschub 2J' }
                          return [`CHF ${fmtCHF(v)}`, labels[name] || name]
                        }}
                        labelFormatter={(l) => `Alter ${l}`}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => {
                        const labels: Record<string, string> = { v63: 'Vorbezug 2J', v64: 'Vorbezug 1J', v65: 'Ordentlich', v66: 'Aufschub 1J', v67: 'Aufschub 2J' }
                        return labels[v] || v
                      }} />
                      <Line type="monotone" dataKey="v63" stroke="#dc2626" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="v64" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="v65" stroke="#1a2b4a" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="v66" stroke="#0ea5e9" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="v67" stroke="#16a34a" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  </div>
                </div>

                {/* Notes */}
                <div style={{ padding: '12px 14px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 10, fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.65 }}>
                  <div style={{ fontWeight: 600, color: 'var(--navy-800)', marginBottom: 6 }}>Wichtige Hinweise zur AHV-Berechnung</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li>Berechnungsbasis: Rentenskala 44 (BSV 2026), lineare Interpolation zwischen CHF {fmtCHF(AHV_2026.MIN_AVG_INCOME)} und CHF {fmtCHF(AHV_2026.MAX_AVG_INCOME)} Ø-Einkommen</li>
                    <li>Faktoren gemäss BSV: Vorbezug 2J = 0.864, 1J = 0.932 · Aufschub 1J = 1.052, 2J = 1.106</li>
                    <li>Ehepaar-Plafonierung: Summe beider Renten max. CHF {fmtCHF(AHV_2026.PLAFOND_MONTHLY)}/Mt. (150% der Maximalrente)</li>
                    <li>13. AHV-Rente gilt ab Dezember 2026 (Volksinitiative angenommen)</li>
                    <li>Der Break-even-Alter gibt an, ab wann der spätere Bezug mehr Gesamtrente ergibt</li>
                  </ul>
                </div>
              </>
            )
          })()}
        </section>

        {/* PK Projektion */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">F</span>Pensionskassen-Projektion</h2>
            <span className="block-hint" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>BVG 2026 · Kapitalprojektion</span>
          </div>
          {(() => {
            const p1stored = state.persons.find(p => p.id === 1)!
            const p2stored = state.persons.find(p => p.id === 2)!
            const yearsToRetirement1 = Math.max(0, ra1 - currentAge1)
            const effectiveContrib1 = p1stored.pkAnnualContribution || estimateContribution(p1stored.income, currentAge1)
            const interestRate1 = p1stored.pkInterestRate || PK_CONSTANTS.BVG_MIN_INTEREST_RATE
            const convRate1 = (p1stored.pkRate || 5.4) / 100
            const einkaufspotenzial1 = p1stored.pkMaxGuthaben > p1stored.pkCurrentCapital
              ? p1stored.pkMaxGuthaben - p1stored.pkCurrentCapital : 0

            // If no current capital entered, show simplified view
            const hasProjectionData = p1stored.pkCurrentCapital > 0

            const projectedCapital1 = hasProjectionData
              ? projectPKCapital(p1stored.pkCurrentCapital, effectiveContrib1, interestRate1, yearsToRetirement1)
              : p1stored.pkCapital

            const pension1 = calculatePKPension(projectedCapital1, convRate1)
            const chartData = hasProjectionData
              ? buildPKProjectionChartData(p1stored.pkCurrentCapital, effectiveContrib1, interestRate1, currentAge1, ra1)
              : []

            // Retirement timing variants (ra1-2 to ra1+2)
            const retirementVariants = hasProjectionData ? [-2, -1, 0, 1, 2].map(delta => {
              const age = ra1 + delta
              if (age < 58 || age > 70) return null
              const years = Math.max(0, age - currentAge1)
              const capital = projectPKCapital(p1stored.pkCurrentCapital, effectiveContrib1, interestRate1, years)
              const reducedConvRate = delta < 0
                ? Math.max(0, convRate1 + delta * PK_CONSTANTS.EARLY_RETIREMENT_CONVERSION_REDUCTION_PER_YEAR)
                : convRate1
              const pension = calculatePKPension(capital, reducedConvRate)
              return { age, capital, convRate: reducedConvRate, pension }
            }).filter(Boolean) : []

            // Early retirement impact (vs 2 years earlier)
            const earlyImpact = hasProjectionData && ra1 > 60
              ? calculateEarlyRetirementImpact(p1stored.pkCurrentCapital, effectiveContrib1, interestRate1, ra1, ra1 - 2, currentAge1, convRate1)
              : null

            // Buy-in analysis
            const buyIn = einkaufspotenzial1 > 0 && incomeTax1
              ? calculateBuyInImpact(einkaufspotenzial1, convRate1, incomeTax1.marginalRate)
              : null

            if (!hasProjectionData) {
              return (
                <div style={{ padding: '20px', textAlign: 'center', background: 'var(--navy-50)', borderRadius: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 8 }}>
                    CHF {fmtCHF(pension1.monthly)}/Mt. PK-Rente
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 16 }}>
                    Basierend auf CHF {fmtCHF(p1stored.pkCapital)} Kapital bei Pensionierung
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-400)' }}>
                    💡 Geben Sie in Schritt 2 Ihr <strong>aktuelles Altersguthaben</strong> ein, um eine präzise Projektion mit Beiträgen und Zinsen zu erhalten.
                  </div>
                </div>
              )
            }

            return (
              <>
                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Heutiges Guthaben', val: p1stored.pkCurrentCapital, sub: `Alter ${currentAge1}` },
                    { label: `Guthaben bei ${ra1}`, val: projectedCapital1, sub: `${yearsToRetirement1}J Projektion` },
                    { label: 'Monatliche Rente', val: pension1.monthly, sub: `UWS ${(convRate1 * 100).toFixed(1)}%` },
                  ].map(card => (
                    <div key={card.label} style={{
                      padding: '14px 16px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 12,
                    }}>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginBottom: 4 }}>{card.label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--navy-800)' }}>
                        CHF {fmtCHF(card.val)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>{card.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Projection chart */}
                {chartData.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)', marginBottom: 8 }}>
                      Altersguthaben-Entwicklung
                    </div>
                    <div role="img" aria-label="Flächendiagramm: PK-Altersguthabenentwicklung bis zur Pensionierung. Zeigt das Wachstum des Pensionskassen-Guthabens durch Beiträge und Verzinsung.">
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                        <defs>
                          <linearGradient id="pkGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1a2b4a" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#1a2b4a" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-100)" />
                        <XAxis dataKey="age" tick={{ fontSize: 11 }} label={{ value: 'Alter', position: 'insideBottomRight', offset: -4, fontSize: 11 }} />
                        <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={60} />
                        <Tooltip
                          formatter={(v: number, name: string) => {
                            const labels: Record<string, string> = { kapital: 'Guthaben total', beitraege: 'Kumulierte Beiträge', verzinsung: 'Kumulierte Zinsen' }
                            return [`CHF ${fmtCHF(v)}`, labels[name] || name]
                          }}
                          labelFormatter={(l) => `Alter ${l}`}
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        />
                        <Area type="monotone" dataKey="kapital" stroke="#1a2b4a" strokeWidth={2.5} fill="url(#pkGrad)" name="kapital" />
                      </AreaChart>
                    </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Retirement timing comparison table */}
                {retirementVariants.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)', marginBottom: 8 }}>
                      Vergleich: Pensionierungsalter
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                        <thead>
                          <tr style={{ background: 'var(--navy-800)', color: '#fff' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', borderRadius: '8px 0 0 0' }}>Alter</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Guthaben</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right' }}>UWS</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', borderRadius: '0 8px 0 0' }}>Rente/Mt.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {retirementVariants.map((v, i) => {
                            if (!v) return null
                            const isSelected = v.age === ra1
                            return (
                              <tr key={v.age} style={{
                                background: isSelected ? 'var(--navy-50)' : i % 2 === 0 ? 'var(--surface)' : '#fafafa',
                                borderBottom: '1px solid var(--ink-100)',
                              }}>
                                <td style={{ padding: '9px 12px', fontWeight: isSelected ? 700 : 400, color: 'var(--ink-800)' }}>
                                  {v.age}
                                  {isSelected && <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', background: 'var(--navy-800)', color: '#fff', borderRadius: 10 }}>Ihre Planung</span>}
                                </td>
                                <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--ink-700)' }}>
                                  {fmtCHF(v.capital)}
                                </td>
                                <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--ink-600)' }}>
                                  {(v.convRate * 100).toFixed(2)}%
                                </td>
                                <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: isSelected ? 700 : 400, color: isSelected ? 'var(--navy-800)' : 'var(--ink-700)' }}>
                                  {fmtCHF(v.pension.monthly)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {earlyImpact && (
                      <div style={{ marginTop: 10, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12.5, color: '#92400e' }}>
                        ⚠ <strong>2 Jahre früher:</strong> CHF {fmtCHF(earlyImpact.capitalDifference)} weniger Guthaben +
                        tieferer Umwandlungssatz ({(earlyImpact.earlyConversionRate * 100).toFixed(2)}% statt {(earlyImpact.normalConversionRate * 100).toFixed(2)}%)
                        → <strong>CHF {fmtCHF(earlyImpact.monthlyPensionLoss)}/Monat weniger Rente – lebenslang</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Calculation breakdown */}
                <details style={{ marginBottom: 16 }}>
                  <summary style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy-600)', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                    Details zur Berechnung anzeigen
                  </summary>
                  <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 8, fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.8 }}>
                    <div>Heutiges Guthaben: <strong>CHF {fmtCHF(p1stored.pkCurrentCapital)}</strong> (Alter {currentAge1})</div>
                    <div>Jährlicher Beitrag (AN+AG): <strong>CHF {fmtCHF(effectiveContrib1)}</strong>{!p1stored.pkAnnualContribution ? ' (BVG-Schätzung)' : ''}</div>
                    <div>Verzinsung: <strong>{(interestRate1 * 100).toFixed(2)}%</strong> p.a. über {yearsToRetirement1} Jahre</div>
                    <div>Beiträge total: <strong>CHF {fmtCHF(effectiveContrib1 * yearsToRetirement1)}</strong></div>
                    <div>Verzinsung total: <strong>CHF {fmtCHF(projectedCapital1 - p1stored.pkCurrentCapital - effectiveContrib1 * yearsToRetirement1)}</strong></div>
                    <div style={{ borderTop: '1px solid var(--navy-100)', marginTop: 6, paddingTop: 6, fontWeight: 600 }}>
                      Guthaben bei {ra1}: CHF {fmtCHF(projectedCapital1)}
                    </div>
                    <div>Umwandlungssatz: {(convRate1 * 100).toFixed(1)}%<InfoTooltip text={`Bestimmt, wie viel Rente Sie pro CHF 100'000 Guthaben erhalten. Beispiel: ${(convRate1*100).toFixed(1)}% von CHF 400'000 = CHF ${fmtCHF(Math.round(400000*convRate1/12))}/Monat. Viele Kassen senken den Umwandlungssatz laufend.`} /></div>
                    <div style={{ fontWeight: 600 }}>Jahresrente: CHF {fmtCHF(pension1.yearly)} → CHF {fmtCHF(pension1.monthly)}/Monat</div>
                  </div>
                </details>

                {/* Buy-in analysis */}
                {buyIn && (
                  <div style={{ marginBottom: 16, padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: '#14532d', marginBottom: 8 }}>
                      Einkaufspotenzial: CHF {fmtCHF(einkaufspotenzial1)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#16a34a', marginBottom: 2 }}>+Rente/Mt.</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#14532d' }}>+CHF {fmtCHF(buyIn.additionalMonthlyPension)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#16a34a', marginBottom: 2 }}>Steuerersparnis</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#14532d' }}>CHF {fmtCHF(buyIn.taxSaving)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#16a34a', marginBottom: 2 }}>Nettokosten</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#14532d' }}>CHF {fmtCHF(buyIn.netCost)}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#166534', marginTop: 10 }}>
                      Bei Grenzsteuersatz {((incomeTax1?.marginalRate ?? 0) * 100).toFixed(0)}% · PK-Einkäufe sind steuerlich vollständig abzugsfähig
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div style={{ padding: '12px 14px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 10, fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.65 }}>
                  <div style={{ fontWeight: 600, color: 'var(--navy-800)', marginBottom: 6 }}>Wichtige Hinweise zur PK-Projektion</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li>Projektion basiert auf konstanten Beiträgen und gleichbleibendem Zinssatz. Lohnerhöhungen sind nicht berücksichtigt.</li>
                    <li>Der Umwandlungssatz kann sich bis zur Pensionierung ändern. Viele Kassen haben Senkungen angekündigt.</li>
                    <li>Überobligatorisches Guthaben: Kasse kann den Umwandlungssatz jederzeit für diesen Teil anpassen.</li>
                    <li>Koordinationsabzug<InfoTooltip text={`Der Teil Ihres Lohns, der bereits durch die AHV versichert ist (CHF ${fmtCHF(PK_CONSTANTS.COORDINATION_DEDUCTION_2026)}). Nur der Lohn darüber wird in der PK versichert.`} /> 2026: CHF {fmtCHF(PK_CONSTANTS.COORDINATION_DEDUCTION_2026)} · Eintrittsschwelle: CHF {fmtCHF(PK_CONSTANTS.ENTRY_THRESHOLD_2026)}</li>
                    <li>Tipp: Lassen Sie sich von Ihrer PK eine verbindliche Projektion erstellen.</li>
                  </ul>
                </div>
              </>
            )
          })()}
        </section>

        {/* Kapital oder Rente? */}
        {rvkCapitalRaw > 0 && (
          <section className="block">
            <div className="block-head">
              <h2 className="block-title"><span className="block-num">G</span>Kapital oder Rente?</h2>
              <span className="block-hint">Entscheidungshilfe für Ihre PK-Bezugsstrategie</span>
            </div>

            {/* Three variant tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {(['rente', 'kapital', 'mix'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setRvkTab(tab)}
                  style={{
                    flex: 1, minWidth: 90, padding: '10px 14px', borderRadius: 10,
                    border: `2px solid ${rvkTab === tab ? 'var(--navy-600)' : 'var(--ink-200)'}`,
                    background: rvkTab === tab ? 'var(--navy-600)' : 'white',
                    color: rvkTab === tab ? 'white' : 'var(--ink-700)',
                    fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
                  }}
                >
                  {tab === 'rente' ? '100% Rente' : tab === 'kapital' ? '100% Kapital' : 'Mix'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {rvkTab === 'rente' && (
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{
                  background: 'var(--navy-600)', color: 'white', borderRadius: 14,
                  padding: '20px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
                }}>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>PK-Rente monatlich</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>
                      CHF {fmtCHF(Math.round(rvkAnnualPension / 12))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>PK-Rente jährlich</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
                      CHF {fmtCHF(rvkAnnualPension)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Umwandlungssatz</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{(rvkConversionRate * 100).toFixed(2)}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Kapitalsteuer</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>CHF 0</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ padding: '12px 14px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 10 }}>
                    <div style={{ fontWeight: 600, color: '#15803d', marginBottom: 4, fontSize: 13 }}>Vorteile</div>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: '#166534', lineHeight: 1.6 }}>
                      <li>Lebenslange Sicherheit</li>
                      <li>Witwen-/Witwerrente 60%</li>
                      <li>Kein Anlagerisiko</li>
                      <li>Planbare Einnahmen</li>
                    </ul>
                  </div>
                  <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 }}>
                    <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 4, fontSize: 13 }}>Nachteile</div>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: '#7f1d1d', lineHeight: 1.6 }}>
                      <li>Kein Erbe möglich</li>
                      <li>Inflationsrisiko</li>
                      <li>Verlust bei frühem Tod</li>
                      <li>Keine Flexibilität</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {rvkTab === 'kapital' && (
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{
                  background: 'var(--navy-600)', color: 'white', borderRadius: 14,
                  padding: '20px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
                }}>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Kapital nach Steuern</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>
                      CHF {fmtCHF(rvkCapitalAfterTax)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Kapitalsteuer</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
                      CHF {fmtCHF(rvkCapitalRaw - rvkCapitalAfterTax)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Jährl. Entnahme (äquiv.)</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>CHF {fmtCHF(rvkAnnualPension)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Break-even Alter</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>
                      {rvkBreakEven ? `Alter ${rvkBreakEven}` : 'Nie'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ padding: '12px 14px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 10 }}>
                    <div style={{ fontWeight: 600, color: '#15803d', marginBottom: 4, fontSize: 13 }}>Vorteile</div>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: '#166534', lineHeight: 1.6 }}>
                      <li>Vererbbares Vermögen</li>
                      <li>Maximale Flexibilität</li>
                      <li>Anlagerendite möglich</li>
                      <li>Einmalige Kapitalbest.</li>
                    </ul>
                  </div>
                  <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 }}>
                    <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 4, fontSize: 13 }}>Nachteile</div>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: '#7f1d1d', lineHeight: 1.6 }}>
                      <li>Langlebigkeitsrisiko</li>
                      <li>Anlagerisiko</li>
                      <li>Hohe Kapitalsteuer</li>
                      <li>Disziplin erforderlich</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {rvkTab === 'mix' && (
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--ink-600)' }}>Kapitalanteil</span>
                    <span style={{ fontWeight: 700, color: 'var(--navy-700)' }}>{rvkKapitalPct}%</span>
                  </div>
                  <input
                    type="range" min={10} max={90} step={5}
                    value={rvkKapitalPct}
                    onChange={e => setRvkKapitalPct(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--navy-600)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-400)' }}>
                    <span>10% Kapital</span>
                    <span>90% Kapital</span>
                  </div>
                </div>
                <div style={{
                  background: 'var(--navy-600)', color: 'white', borderRadius: 14,
                  padding: '20px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
                }}>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Kapital nach Steuern</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 }}>
                      CHF {fmtCHF(rvkMixVariant.kapitalAfterTax)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Monatsrente</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 }}>
                      CHF {fmtCHF(rvkMixVariant.monthlyRente)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Kapital-Anteil</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>CHF {fmtCHF(rvkMixVariant.kapitalPortion)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Renten-Anteil</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>CHF {fmtCHF(rvkMixVariant.rentePortion)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Break-even chart (for Kapital and Mix tabs) */}
            {(rvkTab === 'kapital' || rvkTab === 'mix') && (
              <div style={{ marginTop: 8 }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 6 }}>
                    Rückfluss-Chart: Kapital vs. Kumulierte Rente
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    {[
                      { label: '0% p.a.', rate: 0 },
                      { label: '2% p.a.', rate: 0.02 },
                      { label: '4% p.a.', rate: 0.04 },
                    ].map(s => (
                      <button
                        key={s.rate}
                        onClick={() => setRvkReturnRate(s.rate)}
                        style={{
                          padding: '5px 12px', borderRadius: 8, fontSize: 12,
                          border: `1.5px solid ${rvkReturnRate === s.rate ? 'var(--navy-600)' : 'var(--ink-200)'}`,
                          background: rvkReturnRate === s.rate ? 'var(--navy-50)' : 'white',
                          color: rvkReturnRate === s.rate ? 'var(--navy-700)' : 'var(--ink-500)',
                          fontWeight: rvkReturnRate === s.rate ? 700 : 400, cursor: 'pointer',
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div role="img" aria-label="Liniendiagramm: PK-Rentabilität – Vergleich von Kapital-Restbetrag und kumulierter Rentenauszahlung. Zeigt ab welchem Alter (Break-even) die Rente gegenüber dem Kapitalbezug vorteilhafter ist.">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={rvkChartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-100)" />
                    <XAxis dataKey="age" tick={{ fontSize: 11 }} label={{ value: 'Alter', position: 'insideBottomRight', offset: -4, fontSize: 11 }} />
                    <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={52} />
                    <Tooltip formatter={(v: number) => `CHF ${fmtCHF(v)}`} labelFormatter={l => `Alter ${l}`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {rvkBreakEven && (
                      <ReferenceLine x={rvkBreakEven} stroke="#ef4444" strokeDasharray="4 4"
                        label={{ value: `Break-even Alter ${rvkBreakEven}`, fontSize: 11, fill: '#ef4444', position: 'insideTopRight' }} />
                    )}
                    <Line type="monotone" dataKey="kapital" name="Kapital verbleibend" stroke="var(--navy-600)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="kumuliertRente" name="Kumulierte Rente" stroke="#22c55e" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                  </LineChart>
                </ResponsiveContainer>
                </div>
                {rvkBreakEven && (
                  <div style={{ marginTop: 8, padding: '10px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, fontSize: 12.5 }}>
                    <strong>Break-even Alter {rvkBreakEven}:</strong> Ab diesem Alter hat die Rente mehr ausgezahlt als das Kapital noch wert wäre ({rvkReturnRate * 100}% Rendite angenommen).
                    {' '}Statistische Lebenserwartung: ca. {p1.sex === 'm' ? 85 : 87} Jahre.
                    {rvkBreakEven <= (p1.sex === 'm' ? 85 : 87)
                      ? ' → Da Sie voraussichtlich älter werden als das Break-even-Alter: Rente ist wahrscheinlich vorteilhafter.'
                      : ' → Das Break-even-Alter liegt über der statistischen Lebenserwartung: Kapital könnte vorteilhafter sein.'}
                  </div>
                )}
                {!rvkBreakEven && (
                  <div style={{ marginTop: 8, padding: '10px 14px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12.5 }}>
                    <strong>Kein Break-even bis Alter {ra1 + 40}:</strong> Das Kapital reicht bei {rvkReturnRate * 100}% Rendite auch bei hohem Alter. Kapital ist in diesem Szenario attraktiver.
                  </div>
                )}
              </div>
            )}

            {/* Scenario comparison table */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 10 }}>
                Szenarien-Vergleich (100% Kapital-Bezug)
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: 'var(--navy-50)' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--navy-700)', fontWeight: 600, border: '1px solid var(--ink-100)' }}>Szenario</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--navy-700)', fontWeight: 600, border: '1px solid var(--ink-100)' }}>Rendite</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--navy-700)', fontWeight: 600, border: '1px solid var(--ink-100)' }}>Break-even</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--navy-700)', fontWeight: 600, border: '1px solid var(--ink-100)' }}>Kapital Ø80</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--navy-700)', fontWeight: 600, border: '1px solid var(--ink-100)' }}>Kapital Ø85</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--navy-700)', fontWeight: 600, border: '1px solid var(--ink-100)' }}>Kapital Ø90</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rvkScenarios.map((s, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'white' : 'var(--ink-50)' }}>
                        <td style={{ padding: '8px 10px', border: '1px solid var(--ink-100)', fontWeight: 600 }}>{s.label}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid var(--ink-100)' }}>{(s.returnRate * 100).toFixed(0)}%</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid var(--ink-100)', color: s.breakEvenAge ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                          {s.breakEvenAge ? `Alter ${s.breakEvenAge}` : '> 110'}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid var(--ink-100)', color: s.capitalAt80 > 0 ? 'var(--ink-700)' : '#dc2626' }}>
                          {s.capitalAt80 > 0 ? `CHF ${fmtK(s.capitalAt80)}` : '–'}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid var(--ink-100)', color: s.capitalAt85 > 0 ? 'var(--ink-700)' : '#dc2626' }}>
                          {s.capitalAt85 > 0 ? `CHF ${fmtK(s.capitalAt85)}` : '–'}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid var(--ink-100)', color: s.capitalAt90 > 0 ? 'var(--ink-700)' : '#dc2626' }}>
                          {s.capitalAt90 > 0 ? `CHF ${fmtK(s.capitalAt90)}` : '–'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Survivor benefits */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 10 }}>
                Hinterbliebenenleistungen
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '14px 16px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 4 }}>Bei Rente: Witwenrente (60%)</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--navy-700)' }}>
                    CHF {fmtCHF(rvkSurvivor.survivorPensionMonthly)}/Mt.
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}>CHF {fmtCHF(rvkSurvivor.survivorPensionYearly)}/Jahr · Lebenslang</div>
                </div>
                <div style={{ padding: '14px 16px', background: 'var(--ink-50)', border: '1px solid var(--ink-200)', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 4 }}>Bei Kapital: Erbe ca. mit Ø{(p1.sex === 'm' ? LIFE_EXPECTANCY_MALE_65 : LIFE_EXPECTANCY_FEMALE_65) - Math.round(((p1.sex === 'm' ? LIFE_EXPECTANCY_MALE_65 : LIFE_EXPECTANCY_FEMALE_65) - ra1) / 2)}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink-700)' }}>
                    CHF {fmtCHF(rvkSurvivor.inheritableCapital)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}>Verbleibend bei {rvkReturnRate * 100}% Rendite</div>
                </div>
              </div>
            </div>

            {/* Tax comparison */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 10 }}>
                Steuerlicher Vergleich
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '14px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 8 }}>Rente: Laufende Einkommenssteuer</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.65 }}>
                    <div>Jährl. PK-Rente: <strong>CHF {fmtCHF(rvkAnnualPension)}</strong></div>
                    <div>Grenzsteuersatz: <strong>{Math.round((incomeTax1?.marginalRate ?? 0.25) * 100)}%</strong></div>
                    <div style={{ marginTop: 4, fontWeight: 600, color: '#92400e' }}>
                      Steuer/Jahr: ~CHF {fmtCHF(Math.round(rvkAnnualPension * (incomeTax1?.marginalRate ?? 0.25)))}
                    </div>
                  </div>
                </div>
                <div style={{ padding: '14px 16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0c4a6e', marginBottom: 8 }}>Kapital: Einmalige Kapitalsteuer</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.65 }}>
                    <div>PK-Kapital: <strong>CHF {fmtCHF(rvkCapitalRaw)}</strong></div>
                    <div>Kapitalsteuer: <strong>CHF {fmtCHF(Math.round(rvkCapitalRaw * rvkCapitalTaxRate))}</strong></div>
                    <div style={{ marginTop: 4, fontWeight: 600, color: '#0c4a6e' }}>
                      Effektivsatz: {(rvkCapitalTaxRate * 100).toFixed(1)}% (einmalig)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decision guidance */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 10 }}>
                Entscheidungshilfe
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ padding: '12px 14px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 10, fontSize: 12.5 }}>
                  <div style={{ fontWeight: 600, color: '#15803d', marginBottom: 4 }}>Rente bevorzugen, wenn…</div>
                  <ul style={{ margin: 0, paddingLeft: 18, color: '#166534', lineHeight: 1.6 }}>
                    <li>Sie eine hohe Lebenserwartung haben (Familie, Gesundheit)</li>
                    <li>Ihr Partner/Ihre Partnerin eine eigene AHV/PK hat</li>
                    <li>Sie kein Erbe planen oder kein Vermögen selbst managen wollen</li>
                    <li>Sie ein tiefes Einkommen haben (niedrigere Grenzbesteuerung der Rente)</li>
                  </ul>
                </div>
                <div style={{ padding: '12px 14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, fontSize: 12.5 }}>
                  <div style={{ fontWeight: 600, color: '#0c4a6e', marginBottom: 4 }}>Kapital bevorzugen, wenn…</div>
                  <ul style={{ margin: 0, paddingLeft: 18, color: '#0c4a6e', lineHeight: 1.6 }}>
                    <li>Sie Erben begünstigen möchten</li>
                    <li>Sie bereits hohe laufende Einnahmen haben (Grenzsteuersatz hoch)</li>
                    <li>Sie eine kurze Lebenserwartung befürchten</li>
                    <li>Sie Wohneigentum amortisieren oder eine Hypothek abbauen möchten</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--ink-50)', borderRadius: 8, fontSize: 11.5, color: 'var(--ink-500)', lineHeight: 1.6 }}>
              <strong>Hinweis:</strong> Diese Berechnung ist eine Entscheidungshilfe und ersetzt keine individuelle Beratung. Break-even-Alter und Kapitalentwicklung sind Szenarien – tatsächliche Renditen und persönliche Umstände können abweichen. Besprechen Sie Ihre Bezugsstrategie mit Ihrer Pensionskasse und einem Vorsorgeberater.
            </div>
          </section>
        )}

        {/* Recommendations */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">H</span>Handlungsempfehlungen</h2>
            <span className="block-hint">Nach Priorität geordnet</span>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {RECS[analysis.verdict].map((rec, i) => {
              const priorityColor = rec.priority === 'hoch' ? '#dc2626' : rec.priority === 'mittel' ? '#d97706' : '#16a34a'
              const priorityBg = rec.priority === 'hoch' ? '#fef2f2' : rec.priority === 'mittel' ? '#fffbeb' : '#ecfdf5'
              const priorityBorder = rec.priority === 'hoch' ? '#fecaca' : rec.priority === 'mittel' ? '#fde68a' : '#bbf7d0'
              const isExpanded = expandedRecs.has(i)
              return (
                <div key={i} style={{
                  padding: '14px 16px', background: 'var(--surface)',
                  border: '1px solid var(--ink-200)', borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                      background: 'var(--navy-800)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13.5, color: 'var(--ink-700)', lineHeight: 1.55 }}>{rec.text}</span>
                    </div>
                    <span style={{
                      flexShrink: 0, fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
                      padding: '3px 8px', borderRadius: 20,
                      background: priorityBg, border: `1px solid ${priorityBorder}`, color: priorityColor,
                      textTransform: 'uppercase', letterSpacing: '.04em',
                    }}>
                      {rec.priority}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleRec(i)}
                    style={{
                      marginTop: 8, marginLeft: 34, background: 'none', border: 'none',
                      cursor: 'pointer', fontSize: 12, color: 'var(--navy-600)',
                      padding: 0, display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <svg
                      width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2"
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}
                    >
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                    {isExpanded ? 'Weniger anzeigen' : 'Mehr erfahren'}
                  </button>
                  {isExpanded && (
                    <div style={{
                      marginTop: 10, marginLeft: 34, padding: '12px 14px',
                      background: 'var(--navy-50)', border: '1px solid var(--navy-100)',
                      borderRadius: 8, fontSize: 13, color: 'var(--ink-600)', lineHeight: 1.65,
                    }}>
                      {rec.detail}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-400)', fontStyle: 'italic' }}>
            Diese Empfehlungen basieren auf Ihren Angaben und den AHV/BVG-Kennzahlen 2026. Individuelle steuerliche und rechtliche Aspekte erfordern eine persönliche Fachberatung.
          </div>
        </section>

        {/* Steuern & Optimierung */}
        <section className="block" style={{ background: '#fafafa', border: '1px solid var(--ink-200)' }}>
          <div
            className="block-head"
            style={{ cursor: 'pointer' }}
            onClick={() => setTaxExpanded(!taxExpanded)}
          >
            <h2 className="block-title">
              <span className="block-num">G</span>Steuern &amp; Optimierung
            </h2>
            <span className="block-hint">{taxExpanded ? '▲ Einklappen' : '▼ Ausklappen · Steueranalyse öffnen'}</span>
          </div>

          {taxExpanded && (
            <>
              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                <div style={{ padding: '16px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Steuerbelastung heute</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#dc2626' }}>
                    {incomeTax1 ? `${(incomeTax1.effectiveRate * 100).toFixed(1)}%` : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>
                    {incomeTax1 ? `CHF ${fmtCHF(incomeTax1.totalTax)}/Jahr` : 'Einkommen nicht erfasst'}
                  </div>
                </div>
                <div style={{ padding: '16px 18px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Steuerbelastung im Alter</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--green-600)' }}>
                    {(retirementTax1.effectiveRate * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>
                    {incomeTax1
                      ? `CHF ${fmtCHF(Math.max(0, incomeTax1.totalTax - retirementTax1.totalTax))}/Jahr weniger`
                      : `CHF ${fmtCHF(retirementTax1.totalTax)}/Jahr`}
                  </div>
                </div>
                <div style={{ padding: '16px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Optimierungspotenzial</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#d97706' }}>
                    CHF {fmtCHF(taxOptimization)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>
                    3a + PK-Einkauf (geschätzt, p.a.)
                  </div>
                </div>
              </div>

              {/* Sub A: Einkommenssteuer heute */}
              {incomeTax1 && (
                <div style={{ marginBottom: 10 }}>
                  <button
                    style={{ width: '100%', background: 'none', border: '1px solid var(--ink-200)', borderRadius: taxSubA ? '10px 10px 0 0' : 10, padding: '12px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => setTaxSubA(!taxSubA)}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy-800)' }}>A · Einkommenssteuer heute</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      CHF {fmtCHF(incomeTax1.totalTax)}/Jahr · {(incomeTax1.effectiveRate * 100).toFixed(1)}% effektiv
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: taxSubA ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><polyline points="9 18 15 12 9 6"/></svg>
                    </span>
                  </button>
                  {taxSubA && (
                    <div style={{ padding: '16px', background: 'white', border: '1px solid var(--ink-200)', borderTop: 'none', borderRadius: '0 0 10px 10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '5px 16px', fontSize: 13, marginBottom: 14 }}>
                        <span style={{ color: 'var(--ink-700)', fontWeight: 500 }}>Bruttoeinkommen</span>
                        <span style={{ fontWeight: 600, textAlign: 'right' }}>CHF {fmtCHF(incomeTax1.grossIncome)}</span>
                        <span style={{ color: 'var(--ink-500)', paddingLeft: 12 }}>− AHV/ALV-Beiträge</span>
                        <span style={{ textAlign: 'right', color: 'var(--ink-600)' }}>− CHF {fmtCHF(incomeTax1.deductions.ahvALV)}</span>
                        <span style={{ color: 'var(--ink-500)', paddingLeft: 12 }}>− PK-Beiträge</span>
                        <span style={{ textAlign: 'right', color: 'var(--ink-600)' }}>− CHF {fmtCHF(incomeTax1.deductions.pkContribution)}</span>
                        <span style={{ color: 'var(--ink-500)', paddingLeft: 12 }}>− Säule 3a</span>
                        <span style={{ textAlign: 'right', color: 'var(--ink-600)' }}>− CHF {fmtCHF(incomeTax1.deductions.contribution3a)}</span>
                        <span style={{ color: 'var(--ink-500)', paddingLeft: 12 }}>− Berufsauslagen</span>
                        <span style={{ textAlign: 'right', color: 'var(--ink-600)' }}>− CHF {fmtCHF(incomeTax1.deductions.berufsauslagen)}</span>
                        <span style={{ color: 'var(--ink-500)', paddingLeft: 12 }}>− Versicherungsabzug</span>
                        <span style={{ textAlign: 'right', color: 'var(--ink-600)' }}>− CHF {fmtCHF(incomeTax1.deductions.versicherungsabzug)}</span>
                        <span style={{ color: 'var(--navy-800)', fontWeight: 600, borderTop: '1px solid var(--ink-100)', paddingTop: 6 }}>Steuerbares Einkommen</span>
                        <span style={{ fontWeight: 700, textAlign: 'right', borderTop: '1px solid var(--ink-100)', paddingTop: 6 }}>CHF {fmtCHF(incomeTax1.taxableIncome)}</span>
                        <span style={{ color: 'var(--ink-500)', paddingLeft: 12 }}>Direkte Bundessteuer</span>
                        <span style={{ textAlign: 'right', color: 'var(--ink-600)' }}>CHF {fmtCHF(incomeTax1.federalTax)}</span>
                        <span style={{ color: 'var(--ink-500)', paddingLeft: 12 }}>Kantons- &amp; Gemeindesteuer ({CANTON_NAMES[canton] || canton})</span>
                        <span style={{ textAlign: 'right', color: 'var(--ink-600)' }}>CHF {fmtCHF(incomeTax1.cantonalTax)}</span>
                        {incomeTax1.churchTax > 0 && (
                          <>
                            <span style={{ color: 'var(--ink-500)', paddingLeft: 12 }}>Kirchensteuer</span>
                            <span style={{ textAlign: 'right', color: 'var(--ink-600)' }}>CHF {fmtCHF(incomeTax1.churchTax)}</span>
                          </>
                        )}
                        <span style={{ color: 'var(--navy-800)', fontWeight: 700, borderTop: '1px solid var(--ink-100)', paddingTop: 6 }}>Total Steuern</span>
                        <span style={{ fontWeight: 700, textAlign: 'right', color: '#dc2626', borderTop: '1px solid var(--ink-100)', paddingTop: 6 }}>CHF {fmtCHF(incomeTax1.totalTax)}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: 'var(--ink-500)' }}>
                        <span>Effektivsteuerquote: <strong>{(incomeTax1.effectiveRate * 100).toFixed(1)}%</strong></span>
                        <span>Grenzsteuersatz: <strong>{(incomeTax1.marginalRate * 100).toFixed(1)}%</strong></span>
                        <span>Nettoeinkommen: <strong>CHF {fmtCHF(incomeTax1.netIncome)}/Jahr</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub B: Steuern nach Pensionierung */}
              <div style={{ marginBottom: 10 }}>
                <button
                  style={{ width: '100%', background: 'none', border: '1px solid var(--ink-200)', borderRadius: taxSubB ? '10px 10px 0 0' : 10, padding: '12px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => setTaxSubB(!taxSubB)}
                >
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy-800)' }}>B · Steuern nach Pensionierung</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    CHF {fmtCHF(retirementTax1.totalTax)}/Jahr
                    {incomeTax1 && incomeTax1.totalTax > retirementTax1.totalTax && (
                      <span style={{ color: 'var(--green-600)' }}>↓ CHF {fmtCHF(incomeTax1.totalTax - retirementTax1.totalTax)} weniger</span>
                    )}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: taxSubB ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><polyline points="9 18 15 12 9 6"/></svg>
                  </span>
                </button>
                {taxSubB && (
                  <div style={{ padding: '16px', background: 'white', border: '1px solid var(--ink-200)', borderTop: 'none', borderRadius: '0 0 10px 10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '5px 16px', fontSize: 13, marginBottom: 14 }}>
                      <span style={{ color: 'var(--ink-700)', fontWeight: 500 }}>AHV-Rente (inkl. 13.)</span>
                      <span style={{ textAlign: 'right' }}>CHF {fmtCHF(ahvMonthly1 * 13)}/Jahr</span>
                      <span style={{ color: 'var(--ink-700)', fontWeight: 500 }}>PK-Rente</span>
                      <span style={{ textAlign: 'right' }}>CHF {fmtCHF(pkMonthlyForRente * 12)}/Jahr</span>
                      <span style={{ color: 'var(--ink-500)', paddingLeft: 12 }}>− Versicherungsabzug</span>
                      <span style={{ textAlign: 'right', color: 'var(--ink-600)' }}>− CHF {fmtCHF(Math.max(0, retirementTax1.grossAnnualIncome - retirementTax1.taxableIncome))}</span>
                      <span style={{ color: 'var(--navy-800)', fontWeight: 600, borderTop: '1px solid var(--ink-100)', paddingTop: 6 }}>Steuerbares Einkommen</span>
                      <span style={{ fontWeight: 700, textAlign: 'right', borderTop: '1px solid var(--ink-100)', paddingTop: 6 }}>CHF {fmtCHF(retirementTax1.taxableIncome)}</span>
                      <span style={{ color: 'var(--ink-500)', paddingLeft: 12 }}>Direkte Bundessteuer</span>
                      <span style={{ textAlign: 'right', color: 'var(--ink-600)' }}>CHF {fmtCHF(retirementTax1.federalTax)}</span>
                      <span style={{ color: 'var(--ink-500)', paddingLeft: 12 }}>Kantons- &amp; Gemeindesteuer</span>
                      <span style={{ textAlign: 'right', color: 'var(--ink-600)' }}>CHF {fmtCHF(retirementTax1.cantonalTax)}</span>
                      {retirementTax1.churchTax > 0 && (
                        <>
                          <span style={{ color: 'var(--ink-500)', paddingLeft: 12 }}>Kirchensteuer</span>
                          <span style={{ textAlign: 'right', color: 'var(--ink-600)' }}>CHF {fmtCHF(retirementTax1.churchTax)}</span>
                        </>
                      )}
                      <span style={{ color: 'var(--navy-800)', fontWeight: 700, borderTop: '1px solid var(--ink-100)', paddingTop: 6 }}>Total Steuern im Alter</span>
                      <span style={{ fontWeight: 700, textAlign: 'right', color: 'var(--green-600)', borderTop: '1px solid var(--ink-100)', paddingTop: 6 }}>CHF {fmtCHF(retirementTax1.totalTax)}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: 'var(--ink-500)', marginBottom: incomeTax1 ? 12 : 0 }}>
                      <span>Effektivsteuerquote: <strong>{(retirementTax1.effectiveRate * 100).toFixed(1)}%</strong></span>
                      <span>Monatlich: <strong>CHF {fmtCHF(retirementTax1.monthlyTax)}</strong></span>
                    </div>
                    {incomeTax1 && (
                      <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#166534' }}>
                        ✓ Im Ruhestand sinken Ihre Steuern um <strong>CHF {fmtCHF(Math.max(0, incomeTax1.totalTax - retirementTax1.totalTax))}/Jahr</strong>
                        {' '}(Effektivrate {(incomeTax1.effectiveRate * 100).toFixed(1)}% → {(retirementTax1.effectiveRate * 100).toFixed(1)}%)
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sub C: Kapitalbezugssteuer */}
              {capitalTaxResult && (
                <div style={{ marginBottom: 10 }}>
                  <button
                    style={{ width: '100%', background: 'none', border: '1px solid var(--ink-200)', borderRadius: taxSubC ? '10px 10px 0 0' : 10, padding: '12px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => setTaxSubC(!taxSubC)}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy-800)' }}>C · Kapitalbezugssteuer PK</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      CHF {fmtCHF(capitalTaxResult.result.totalTax)} auf CHF {fmtCHF(capitalTaxResult.amount)} · {(capitalTaxResult.result.effectiveRate * 100).toFixed(1)}%
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: taxSubC ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><polyline points="9 18 15 12 9 6"/></svg>
                    </span>
                  </button>
                  {taxSubC && (
                    <div style={{ padding: '16px', background: 'white', border: '1px solid var(--ink-200)', borderTop: 'none', borderRadius: '0 0 10px 10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '5px 16px', fontSize: 13, marginBottom: 14 }}>
                        <span style={{ color: 'var(--ink-700)', fontWeight: 500 }}>Kapitalbezug ({p1.pkBezugsart === 'mix' ? '50%' : '100%'})</span>
                        <span style={{ textAlign: 'right' }}>CHF {fmtCHF(capitalTaxResult.amount)}</span>
                        <span style={{ color: 'var(--ink-500)', paddingLeft: 12 }}>Direkte Bundessteuer (Sätzchen-Methode)</span>
                        <span style={{ textAlign: 'right', color: 'var(--ink-600)' }}>CHF {fmtCHF(capitalTaxResult.result.federalTax)}</span>
                        <span style={{ color: 'var(--ink-500)', paddingLeft: 12 }}>Kantonale Sondersteuer ({CANTON_NAMES[canton] || canton})</span>
                        <span style={{ textAlign: 'right', color: 'var(--ink-600)' }}>CHF {fmtCHF(capitalTaxResult.result.cantonalTax)}</span>
                        <span style={{ color: 'var(--navy-800)', fontWeight: 700, borderTop: '1px solid var(--ink-100)', paddingTop: 6 }}>Total Kapitalbezugssteuer</span>
                        <span style={{ fontWeight: 700, textAlign: 'right', color: '#dc2626', borderTop: '1px solid var(--ink-100)', paddingTop: 6 }}>CHF {fmtCHF(capitalTaxResult.result.totalTax)}</span>
                        <span style={{ color: 'var(--navy-800)', fontWeight: 600 }}>Netto nach Steuer</span>
                        <span style={{ fontWeight: 700, textAlign: 'right', color: 'var(--green-600)' }}>CHF {fmtCHF(capitalTaxResult.result.netAmount)}</span>
                      </div>
                      <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12.5, color: '#92400e' }}>
                        <strong>Tipp:</strong> Staffelung des 3a-Bezugs auf mehrere Steuerjahre vor dem PK-Bezug senkt die Steuerprogression deutlich. Je nach Kanton variiert die Kapitalbezugssteuer erheblich.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub D: PK-Einkauf */}
              <div style={{ marginBottom: 10 }}>
                <button
                  style={{ width: '100%', background: 'none', border: '1px solid var(--ink-200)', borderRadius: taxSubD ? '10px 10px 0 0' : 10, padding: '12px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => setTaxSubD(!taxSubD)}
                >
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy-800)' }}>D · PK-Einkauf Steuerersparnis</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    bis CHF {fmtCHF(pkSavingsData[pkSavingsData.length - 1]?.saving ?? 0)} bei CHF 100'000 Einkauf
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: taxSubD ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><polyline points="9 18 15 12 9 6"/></svg>
                  </span>
                </button>
                {taxSubD && (
                  <div style={{ padding: '16px', background: 'white', border: '1px solid var(--ink-200)', borderTop: 'none', borderRadius: '0 0 10px 10px' }}>
                    <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 14 }}>
                      Bei Grenzsteuersatz <strong>{((incomeTax1?.marginalRate ?? 0.25) * 100).toFixed(0)}%</strong> ergeben PK-Einkäufe folgende Steuerersparnis:
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={pkSavingsData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-100)" />
                        <XAxis dataKey="amount" tickFormatter={(v) => `${v / 1000}k`} tick={{ fontSize: 11, fill: 'var(--ink-400)' }} label={{ value: 'Einkauf (CHF)', position: 'insideBottomRight', offset: -4, fontSize: 11 }} />
                        <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: 'var(--ink-400)' }} width={56} />
                        <Tooltip
                          formatter={(v: number) => [`CHF ${fmtCHF(v)}`, 'Steuerersparnis']}
                          labelFormatter={(l: number) => `Einkauf CHF ${fmtCHF(l)}`}
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        />
                        <Bar dataKey="saving" name="Steuerersparnis" fill="#1a2b4a" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div style={{ marginTop: 12, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12.5, color: '#92400e' }}>
                      ⚠ <strong>3-Jahres-Sperrfrist (Art. 79b BVG):</strong> Nach einem PK-Einkauf können die eingekauften Leistungen während 3 Jahren nicht als Kapital bezogen werden. Einkäufe rechtzeitig planen.
                    </div>
                  </div>
                )}
              </div>

              {/* Sub E: Säule 3a */}
              {p1.has3a && thirdPillar1 && (
                <div style={{ marginBottom: 10 }}>
                  <button
                    style={{ width: '100%', background: 'none', border: '1px solid var(--ink-200)', borderRadius: taxSubE ? '10px 10px 0 0' : 10, padding: '12px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => setTaxSubE(!taxSubE)}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy-800)' }}>E · Säule 3a Steueroptimierung</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      CHF {fmtCHF(thirdPillar1.annualSaving)}/Jahr Ersparnis
                      {thirdPillar1.unusedPotential > 0 && <span style={{ color: '#d97706' }}>· CHF {fmtCHF(thirdPillar1.unusedPotentialSaving)} Potenzial ungenutzt</span>}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: taxSubE ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><polyline points="9 18 15 12 9 6"/></svg>
                    </span>
                  </button>
                  {taxSubE && (
                    <div style={{ padding: '16px', background: 'white', border: '1px solid var(--ink-200)', borderTop: 'none', borderRadius: '0 0 10px 10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '5px 16px', fontSize: 13, marginBottom: 14 }}>
                        <span style={{ color: 'var(--ink-700)', fontWeight: 500 }}>Ihre jährliche 3a-Einzahlung</span>
                        <span style={{ textAlign: 'right' }}>CHF {fmtCHF(thirdPillar1.annualContribution)}</span>
                        <span style={{ color: 'var(--ink-600)' }}>Maximum {new Date().getFullYear()} {p1.hasPK ? '(mit PK)' : '(ohne PK)'}</span>
                        <span style={{ textAlign: 'right' }}>CHF {fmtCHF(thirdPillar1.maxContribution)}</span>
                        <span style={{ color: 'var(--navy-800)', fontWeight: 600, borderTop: '1px solid var(--ink-100)', paddingTop: 6 }}>Jährliche Steuerersparnis</span>
                        <span style={{ fontWeight: 700, textAlign: 'right', color: 'var(--green-600)', borderTop: '1px solid var(--ink-100)', paddingTop: 6 }}>CHF {fmtCHF(thirdPillar1.annualSaving)}</span>
                        {thirdPillar1.unusedPotential > 0 && (
                          <>
                            <span style={{ color: 'var(--ink-500)' }}>Ungenutztes Potenzial/Jahr</span>
                            <span style={{ textAlign: 'right', color: '#d97706', fontWeight: 600 }}>CHF {fmtCHF(thirdPillar1.unusedPotential)}</span>
                            <span style={{ color: 'var(--ink-500)' }}>Entgangene Steuerersparnis/Jahr</span>
                            <span style={{ textAlign: 'right', color: '#d97706', fontWeight: 600 }}>CHF {fmtCHF(thirdPillar1.unusedPotentialSaving)}</span>
                          </>
                        )}
                      </div>
                      {thirdPillar1.unusedPotential > 0 && (
                        <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12.5, color: '#92400e' }}>
                          Mit dem vollen Maximum von CHF {fmtCHF(thirdPillar1.maxContribution)}/Jahr sparen Sie zusätzlich CHF {fmtCHF(thirdPillar1.unusedPotentialSaving)} Steuern pro Jahr.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Sub F: Rente vs. Kapital */}
              {rvkResult && (
                <div style={{ marginBottom: 10 }}>
                  <button
                    style={{ width: '100%', background: 'none', border: '1px solid var(--ink-200)', borderRadius: taxSubF ? '10px 10px 0 0' : 10, padding: '12px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => setTaxSubF(!taxSubF)}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy-800)' }}>F · Rente vs. Kapital – Steuerlicher Break-even</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {rvkResult.breakEvenAge ? `Break-even Alter ${rvkResult.breakEvenAge}` : 'Kein Break-even bis Alter 95'}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: taxSubF ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><polyline points="9 18 15 12 9 6"/></svg>
                    </span>
                  </button>
                  {taxSubF && (
                    <div style={{ padding: '16px', background: 'white', border: '1px solid var(--ink-200)', borderTop: 'none', borderRadius: '0 0 10px 10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                        <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
                          <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Kapitalbezug einmalig</div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#dc2626' }}>CHF {fmtCHF(rvkResult.capitalTax)}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>Einmalige Kapitalbezugssteuer</div>
                        </div>
                        <div style={{ padding: '12px 14px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 8 }}>
                          <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Rente – Mehrsteuer/Jahr</div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--navy-800)' }}>CHF {fmtCHF(rvkResult.annualMarginalRenteTax)}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>Marginalsteuer auf PK-Rente</div>
                        </div>
                      </div>
                      {rvkResult.breakEvenAge && (
                        <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#166534', marginBottom: 14 }}>
                          Break-even bei Alter <strong>{rvkResult.breakEvenAge}</strong>: Ab dann übersteigen die kumulierten Rentensteuern die einmalige Kapitalbezugssteuer.
                          {rvkResult.breakEvenAge <= 82
                            ? ' Bei durchschnittlicher Lebenserwartung (ca. 84 J.) ist der Kapitalbezug steuerlich attraktiv.'
                            : ' Der Kapitalbezug ist steuerlich attraktiv, solange Sie vor dem Break-even versterben.'}
                        </div>
                      )}
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: 'var(--navy-800)', color: 'white' }}>
                              {['Alter', 'Kum. Rentensteuern', 'Kapitalbezugssteuer', 'Differenz'].map(h => (
                                <th key={h} style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rvkResult.years.filter((_, i) => i % 3 === 0 || rvkResult.years[i]?.crossover).map((row, i) => (
                              <tr key={row.age} style={{ background: row.crossover ? '#ecfdf5' : i % 2 === 0 ? 'white' : 'var(--navy-50)', borderBottom: '1px solid var(--ink-100)' }}>
                                <td style={{ padding: '5px 10px', fontWeight: row.crossover ? 700 : 400, color: 'var(--navy-800)' }}>
                                  {row.age}{row.crossover ? ' ✓' : ''}
                                </td>
                                <td style={{ padding: '5px 10px', textAlign: 'right' }}>CHF {fmtCHF(row.cumulativeRenteTax)}</td>
                                <td style={{ padding: '5px 10px', textAlign: 'right' }}>CHF {fmtCHF(row.cumulativeKapitalTax)}</td>
                                <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 600, color: row.cumulativeRenteTax > row.cumulativeKapitalTax ? '#dc2626' : 'var(--green-600)' }}>
                                  {row.cumulativeRenteTax > row.cumulativeKapitalTax ? '−' : '+'}CHF {fmtCHF(Math.abs(row.cumulativeKapitalTax - row.cumulativeRenteTax))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub G: Optimaler Bezugsplan */}
              {withdrawalPlan.hasAnything && (
                <div style={{ marginBottom: 10 }}>
                  <button
                    style={{ width: '100%', background: 'none', border: '1px solid var(--ink-200)', borderRadius: taxSubG ? '10px 10px 0 0' : 10, padding: '12px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => setTaxSubG(!taxSubG)}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy-800)' }}>G · Optimaler Bezugsplan – Gestaffelt statt auf einmal</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {withdrawalPlan.savings > 0 && <span style={{ color: 'var(--green-600)', fontWeight: 600 }}>CHF {fmtCHF(withdrawalPlan.savings)} Steuerersparnis</span>}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: taxSubG ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><polyline points="9 18 15 12 9 6"/></svg>
                    </span>
                  </button>
                  {taxSubG && (
                    <div style={{ padding: '16px', background: 'white', border: '1px solid var(--ink-200)', borderTop: 'none', borderRadius: '0 0 10px 10px' }}>
                      {/* Summary cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                        <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 3 }}>Alle im gleichen Jahr (Worst case)</div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: '#dc2626' }}>CHF {fmtCHF(withdrawalPlan.worst.totalTax)}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>Steuer auf CHF {fmtCHF(withdrawalPlan.worst.totalGross)}</div>
                        </div>
                        <div style={{ padding: '12px 14px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 3 }}>Optimal gestaffelt</div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: '#16a34a' }}>CHF {fmtCHF(withdrawalPlan.optimal.totalTax)}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>Netto: CHF {fmtCHF(withdrawalPlan.optimal.totalNet)}</div>
                        </div>
                      </div>
                      {withdrawalPlan.savings > 0 && (
                        <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#166534', marginBottom: 14, fontWeight: 600 }}>
                          Steuerersparnis durch Staffelung: CHF {fmtCHF(withdrawalPlan.savings)}
                        </div>
                      )}
                      {/* Timeline table */}
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: 'var(--navy-800)', color: 'white' }}>
                              {['Jahr', 'Bezug', 'Brutto', 'Steuer', 'Netto'].map(h => (
                                <th key={h} style={{ padding: '7px 10px', textAlign: h === 'Jahr' || h === 'Bezug' ? 'left' : 'right', fontWeight: 600 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {withdrawalPlan.optimal.entries.map((entry, i) => (
                              <tr key={i} style={{ background: i % 2 === 0 ? 'white' : 'var(--navy-50)', borderBottom: '1px solid var(--ink-100)' }}>
                                <td style={{ padding: '5px 10px', color: 'var(--navy-800)', fontWeight: 600 }}>{entry.calendarYear}</td>
                                <td style={{ padding: '5px 10px', color: 'var(--ink-700)' }}>{entry.label}</td>
                                <td style={{ padding: '5px 10px', textAlign: 'right' }}>CHF {fmtCHF(entry.amount)}</td>
                                <td style={{ padding: '5px 10px', textAlign: 'right', color: '#dc2626' }}>CHF {fmtCHF(entry.tax)}</td>
                                <td style={{ padding: '5px 10px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>CHF {fmtCHF(entry.netAmount)}</td>
                              </tr>
                            ))}
                            <tr style={{ background: 'var(--navy-800)', color: 'white' }}>
                              <td colSpan={2} style={{ padding: '6px 10px', fontWeight: 700 }}>Total</td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>CHF {fmtCHF(withdrawalPlan.optimal.totalGross)}</td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>CHF {fmtCHF(withdrawalPlan.optimal.totalTax)}</td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>CHF {fmtCHF(withdrawalPlan.optimal.totalNet)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div style={{ marginTop: 10, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
                        <strong>Hinweis:</strong> Frühzeitige Bezüge (3a, FZ<InfoTooltip text="Freizügigkeitsguthaben: PK-Guthaben aus früheren Arbeitsverhältnissen auf einem separaten Freizügigkeitskonto (z.B. nach Jobwechsel). Kann frühestens 5 Jahre vor Pensionierung bezogen werden." />) ab {new Date().getFullYear() + Math.max(1, ra1 - currentAge1) - (withdrawalPlan.optimal.entries.length - (withdrawalPlan.optimal.entries.some(e => e.label.includes('PK')) ? 1 : 0))} möglich. PK-Kapital wird im Pensionierungsjahr bezogen. Steuern basieren auf Sätzchen-Methode und ESTV-Richtwerten für Kanton {CANTON_NAMES[canton] || canton}.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub H: Eigenmietwert */}
              {eigenmietwertResult && (
                <div style={{ marginBottom: 10 }}>
                  <button
                    style={{ width: '100%', background: 'none', border: '1px solid var(--ink-200)', borderRadius: taxSubH ? '10px 10px 0 0' : 10, padding: '12px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => setTaxSubH(!taxSubH)}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy-800)' }}>H · Eigenmietwert – Steuereffekt Wohneigentum</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {eigenmietwertResult.additionalTax > 0
                        ? <span style={{ color: '#dc2626' }}>+CHF {fmtCHF(eigenmietwertResult.additionalTax)}/Jahr Mehrsteuer</span>
                        : <span style={{ color: 'var(--green-600)' }}>Abzüge übersteigen Eigenmietwert</span>}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: taxSubH ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><polyline points="9 18 15 12 9 6"/></svg>
                    </span>
                  </button>
                  {taxSubH && (
                    <div style={{ padding: '16px', background: 'white', border: '1px solid var(--ink-200)', borderTop: 'none', borderRadius: '0 0 10px 10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '5px 16px', fontSize: 13, marginBottom: 14 }}>
                        <span style={{ color: 'var(--ink-700)', fontWeight: 500 }}>Eigenmietwert (fiktiver Mietertrag)</span>
                        <span style={{ textAlign: 'right', color: '#dc2626' }}>+CHF {fmtCHF(eigenmietwertResult.eigenmietwert)}/Jahr</span>
                        <span style={{ color: 'var(--ink-600)' }}>− Schuldzinsabzug (Hypothekarzinsen)</span>
                        <span style={{ textAlign: 'right', color: 'var(--green-600)' }}>−CHF {fmtCHF(eigenmietwertResult.schuldzinsen)}/Jahr</span>
                        <span style={{ color: 'var(--ink-600)' }}>− Unterhaltskosten (Pauschale 20%)</span>
                        <span style={{ textAlign: 'right', color: 'var(--green-600)' }}>−CHF {fmtCHF(eigenmietwertResult.unterhaltskosten)}/Jahr</span>
                        <span style={{ color: 'var(--navy-800)', fontWeight: 600, borderTop: '1px solid var(--ink-100)', paddingTop: 6 }}>Netto-Mehreinkommen (steuerpflichtig)</span>
                        <span style={{ textAlign: 'right', fontWeight: 700, borderTop: '1px solid var(--ink-100)', paddingTop: 6, color: eigenmietwertResult.netAdditionalIncome > 0 ? '#dc2626' : 'var(--green-600)' }}>
                          CHF {fmtCHF(eigenmietwertResult.netAdditionalIncome)}/Jahr
                        </span>
                        <span style={{ color: 'var(--navy-800)', fontWeight: 600 }}>Geschätzte Mehrsteuer/Jahr</span>
                        <span style={{ textAlign: 'right', fontWeight: 700, color: eigenmietwertResult.additionalTax > 0 ? '#dc2626' : 'var(--green-600)' }}>
                          CHF {fmtCHF(eigenmietwertResult.additionalTax)}/Jahr
                        </span>
                      </div>
                      <div style={{ padding: '10px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, fontSize: 12.5, color: '#7c2d12' }}>
                        <strong>Was ist der Eigenmietwert?</strong> Als Wohneigentümer versteuern Sie einen fiktiven Mietertrag (ca. 3–4.5% des Steuerwerts je nach Kanton), erhalten aber kein Geld. Im Gegenzug können Sie Hypothekarzinsen und Unterhaltskosten abziehen.
                        {eigenmietwertResult.schuldzinsen === 0 && eigenmietwertResult.eigenmietwert > 0 && (
                          <span> Bei schuldenfreiem Eigentum entfällt der Schuldzinsabzug – die steuerliche Belastung ist entsprechend höher. Eine vollständige Amortisation der Hypothek kann deshalb steuerlich nachteilig sein.</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Disclaimer + cantonal link */}
              <div style={{ marginTop: 12, padding: '12px 16px', background: '#f8fafc', border: '1px solid var(--ink-200)', borderRadius: 8, fontSize: 12, color: 'var(--ink-500)' }}>
                <strong>Steuerhinweis:</strong> Alle Berechnungen basieren auf DBG 2026-Tarifen und ESTV-Richtwerten. Sie dienen der Orientierung und ersetzen keine individuelle Steuerberatung.
                {location?.kanton && CANTONAL_TAX_URLS[location.kanton] && (
                  <>
                    {' '}
                    <a href={CANTONAL_TAX_URLS[location.kanton]} target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--navy-600)', textDecoration: 'underline' }}>
                      Steuerrechner Kanton {CANTON_NAMES[location.kanton] || location.kanton} →
                    </a>
                  </>
                )}
              </div>
            </>
          )}
        </section>

        {/* Income vs Expenses chart */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">H</span>Einnahmen vs. Ausgaben im Alter</h2>
            <span className="block-hint">Monatliche Werte · Nominale CHF</span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData.filter((_, i) => i % 2 === 0)} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-100)" />
                <XAxis dataKey="age" tick={{ fontSize: 11, fill: 'var(--ink-400)' }} label={{ value: 'Alter', position: 'insideBottomRight', offset: -4, fontSize: 11 }} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: 'var(--ink-400)' }} width={56} />
                <Tooltip
                  formatter={(v: number, name: string) => [`CHF ${fmtCHF(v)}`, name === 'einnahmen' ? 'Renteneinnahmen/Mt.' : 'Ausgaben/Mt.']}
                  labelFormatter={(l) => `Alter ${l}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--ink-200)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="einnahmen" name="Renteneinnahmen" fill="#1a2b4a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="ausgaben" name="Ausgaben (inflationsbereinigt)" fill="#94a3b8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-400)', fontSize: 14 }}>
              Bitte geben Sie Geburtsdatum und Pensionierungsalter in Schritt 1 ein.
            </div>
          )}
          <div style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 10, fontStyle: 'italic' }}>
            Annahmen: Inflation 1.5%/Jahr · Anlagerendite 2.5%/Jahr · Lebenserwartung bis Alter 95
          </div>
        </section>

        {/* Cashflow table (collapsible) */}
        <section className="block">
          <div
            className="block-head"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowCashflowTable(!showCashflowTable)}
          >
            <h2 className="block-title"><span className="block-num">I</span>Jahres-Cashflow (Tabelle)</h2>
            <span className="block-hint">{showCashflowTable ? '▲ Einklappen' : '▼ Ausklappen'}</span>
          </div>
          {showCashflowTable && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--navy-800)', color: 'white' }}>
                    {['Alter', 'AHV/Jahr', 'PK/Jahr', 'Ausgaben/Jahr', hasEnabledEvents ? 'Ereignisse' : null, 'Vermögen'].filter(Boolean).map((h) => (
                      <th key={h!} style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, i) => {
                    const baseRow = analysis.yearlyCashflow.find(r => r.age === row.age)!
                    return (
                      <tr key={row.age} style={{
                        background: row.eventAmount !== 0 ? '#fffbeb' : i % 2 === 0 ? 'white' : 'var(--navy-50)',
                        borderBottom: '1px solid var(--ink-100)',
                      }}>
                        <td style={{ padding: '6px 12px', fontWeight: baseRow?.isRetirementYear ? 700 : 400, color: 'var(--navy-800)' }}>
                          {row.age}{baseRow?.isRetirementYear ? ' ★' : ''}
                        </td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--ink-700)' }}>
                          {baseRow?.ahvIncome > 0 ? `CHF ${fmtCHF(baseRow.ahvIncome)}` : '—'}
                        </td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--ink-700)' }}>
                          {baseRow?.pkRenteIncome > 0 ? `CHF ${fmtCHF(baseRow.pkRenteIncome)}` : '—'}
                        </td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--ink-700)' }}>
                          CHF {fmtCHF(baseRow?.livingExpenses || 0)}
                        </td>
                        {hasEnabledEvents && (
                          <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: row.eventAmount !== 0 ? 700 : 400, color: row.eventAmount > 0 ? '#16a34a' : row.eventAmount < 0 ? '#dc2626' : 'var(--ink-400)' }}>
                            {row.eventAmount !== 0
                              ? `${row.eventAmount > 0 ? '+' : ''}CHF ${fmtCHF(row.eventAmount)}`
                              : '—'}
                          </td>
                        )}
                        <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600, color: row.vermoegen <= 0 ? '#ef4444' : 'var(--navy-800)' }}>
                          CHF {fmtCHF(row.vermoegen)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* H5: Pflegekostenrisiko */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">P</span>Langzeitpflege-Szenario
            </h2>
            <span className="block-hint">40% ab Alter 80 brauchen Pflege</span>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--ink-600)', margin: '0 0 16px', lineHeight: 1.6 }}>
            Rund 40% der Personen über 80 Jahren benötigen Pflegeleistungen. Die Kosten können das Vermögen schnell aufzehren.
            Sehen Sie hier, wie sich ein Pflegebedarf auf Ihre finanzielle Situation auswirken würde.
          </p>

          {/* Interactive inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink-700)', marginBottom: 6 }}>
                Pflegebedarf ab Alter: <strong>{careStartAge}</strong>
              </label>
              <input
                type="range" min={75} max={90} step={1}
                value={careStartAge}
                onChange={e => setCareStartAge(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--navy-700)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>
                <span>75</span><span>82</span><span>90</span>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink-700)', marginBottom: 6 }}>
                Art der Pflege
              </label>
              <select
                className="select-field"
                value={careType}
                onChange={e => setCareType(e.target.value as typeof careType)}
              >
                {Object.entries(CARE_COSTS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label} – CHF {fmtCHF(v.monthlyCost)}/Mt.</option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 4 }}>
                Kosten minus KK-Beiträge und ggf. EL/Hilflosenentschädigung
              </div>
            </div>
          </div>

          {/* Results */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 3 }}>Pflegekosten/Monat</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#dc2626' }}>CHF {fmtCHF(careScenario.monthlyCost)}</div>
            </div>
            <div style={{ padding: '12px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 3 }}>EL/Hilflosenentschädigung</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#16a34a' }}>≈ CHF {fmtCHF(careScenario.elEstimate)}/Mt.</div>
            </div>
            <div style={{ padding: '12px', background: careScenario.monthlyGap > 3000 ? '#fef2f2' : '#fffbeb', border: `1px solid ${careScenario.monthlyGap > 3000 ? '#fecaca' : '#fde68a'}`, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 3 }}>Monatliche Lücke aus Vermögen</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: careScenario.monthlyGap > 3000 ? '#dc2626' : '#d97706' }}>CHF {fmtCHF(careScenario.monthlyGap)}</div>
            </div>
          </div>

          <div style={{ padding: '14px 16px', background: careScenario.yearsWealthCovers >= 5 ? '#ecfdf5' : '#fef2f2', border: `1px solid ${careScenario.yearsWealthCovers >= 5 ? '#bbf7d0' : '#fecaca'}`, borderRadius: 10, marginBottom: 14, fontSize: 13.5, lineHeight: 1.6 }}>
            {careScenario.monthlyGap > 0 ? (
              <>
                Bei einem Pflegebedarf ab Alter <strong>{careStartAge}</strong> ({CARE_COSTS[careType].label}) beträgt Ihre monatliche Lücke ca.{' '}
                <strong>CHF {fmtCHF(careScenario.monthlyGap)}</strong>. Mit einem geschätzten Vermögen von CHF {fmtCHF(Math.round(careScenario.wealthAtCareStart))} zu diesem Zeitpunkt{' '}
                {careScenario.yearsWealthCovers >= 99
                  ? 'können Sie diese Kosten voraussichtlich dauerhaft tragen.'
                  : <>deckt Ihr Vermögen die Pflege für ca. <strong>{careScenario.yearsWealthCovers.toFixed(1)} Jahre</strong>
                    {careScenario.elEligibilityAge && <> (bis ca. Alter <strong>{careScenario.elEligibilityAge}</strong>)</>}.
                    {careScenario.elEligibilityAge && ` Ab Alter ${careScenario.elEligibilityAge} haben Sie voraussichtlich Anspruch auf Ergänzungsleistungen.`}
                  </>
                }
              </>
            ) : (
              <>Ihre Renten decken die Pflegekosten vollständig – bei dieser Pflegeoption besteht kein Vermögensverzehr.</>
            )}
          </div>

          {/* EL explanation */}
          <div style={{ padding: '12px 14px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 8, fontSize: 12.5, color: 'var(--ink-700)', marginBottom: 12 }}>
            <strong>Ergänzungsleistungen (EL) bei Heimaufenthalt:</strong> Bei einem Heimaufenthalt haben Sie voraussichtlich Anspruch auf EL,
            sobald Ihr Vermögen unter CHF {fmtCHF(careScenario.elFreeWealth)} ({civilStatus === 'verheiratet' || civilStatus === 'partnerschaft' ? 'Ehepaar' : 'Alleinstehend'}) fällt.
            Die EL decken die anerkannten Heimkosten abzüglich Ihrer Rente und eines Vermögensverzehrs (1/10 des Vermögens über Freibetrag/Jahr).
            <span style={{ color: '#dc2626' }}> ⚠ Achtung: Vermögen, das in den letzten 10 Jahren verschenkt wurde, wird weiterhin angerechnet.</span>
          </div>

          {/* Risk mitigation */}
          <div style={{ padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12.5, color: '#92400e' }}>
            <strong>Möglichkeiten zur Absicherung:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
              <li>Pflegezusatzversicherung (Abschluss idealerweise vor Alter 60)</li>
              <li>Ausreichend liquides Vermögen behalten (nicht alles in Immobilie binden)</li>
              <li>Patientenverfügung und Vorsorgeauftrag erstellen</li>
              <li>Frühzeitig mit der Familie besprechen und planen</li>
            </ul>
          </div>
        </section>

        {/* Fix 10: Pro-Hinweis für Fortgeschrittene */}
        <section className="block" style={{ background: '#f0f9ff', border: '1px solid #7dd3fc' }}>
          <div className="block-head">
            <h2 className="block-title" style={{ color: '#0369a1' }}>
              <span className="block-num" style={{ background: '#0284c7', color: 'white' }}>+</span>
              Für fortgeschrittene Finanzplanung
            </h2>
          </div>
          <p style={{ fontSize: 13.5, color: '#075985', margin: '0 0 14px', lineHeight: 1.65 }}>
            WealthWise bietet eine fundierte erste Orientierung. Für tiefere Analysen empfehlen wir folgende Ressourcen:
          </p>
          <ul style={{ margin: '0 0 16px', paddingLeft: 18, fontSize: 13.5, color: '#075985', lineHeight: 1.8 }}>
            <li><strong>Monte-Carlo-Simulationen:</strong> <a href="https://www.portfoliovisualizer.com" target="_blank" rel="noreferrer" style={{ color: '#0284c7' }}>portfoliovisualizer.com</a> – testen Sie verschiedene Marktszenarien</li>
            <li><strong>Entnahmestrategien:</strong> 4%-Regel, Guardrails-Methode, Bucket-Strategie – Abwägung je nach Risikotoleranz und Planungshorizont</li>
            <li><strong>Detaillierte AHV-Berechnung:</strong> IK-Auszug bestellen auf <a href="https://www.ahv-iv.ch" target="_blank" rel="noreferrer" style={{ color: '#0284c7' }}>ahv-iv.ch</a> und bei SVA-Zweigstelle beraten lassen</li>
            <li><strong>Steueroptimierung:</strong> Phasenbasierter Kapitalbezug, Wohnsitzplanung, Steuerberater oder CFP (Certified Financial Planner) beiziehen</li>
          </ul>
          <div style={{ padding: '10px 14px', background: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: 8, fontSize: 12.5, color: '#0369a1' }}>
            Ihr WealthWise-PDF eignet sich als Gesprächsgrundlage für ein professionelles Vorsorgeberatungsgespräch.
          </div>
        </section>

        {/* Nächste Schritte */}
        <section className="block" style={{ background: 'var(--navy-50)', border: '1px solid var(--navy-100)' }}>
          <div className="block-head">
            <h2 className="block-title" style={{ color: 'var(--navy-800)' }}>
              <span className="block-num" style={{ background: 'var(--navy-700)', color: 'white' }}>✓</span>
              Nächste Schritte
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '📞', text: 'IK-Auszug bestellen (AHV-Kontoauszug)', link: 'https://www.ahv-iv.ch', linkText: 'ahv-iv.ch' },
              { icon: '📄', text: 'PK-Projektion bei Ihrer Pensionskasse anfordern (Ausweis anfordern)', link: null, linkText: null },
              { icon: '🏦', text: 'PK-Einkaufspotenzial mit Ihrer Pensionskasse besprechen', link: null, linkText: null },
              { icon: '📊', text: 'Diese Analyse mit einem Finanzplaner (CFP) besprechen', link: null, linkText: null },
              { icon: '📥', text: 'Analyse als PDF herunterladen und ablegen', link: null, linkText: null, action: handlePDF },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'white', borderRadius: 8, border: '1px solid var(--navy-100)' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1, fontSize: 13, color: 'var(--ink-700)' }}>
                  {item.text}
                  {item.link && <> · <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--navy-600)', textDecoration: 'underline' }}>{item.linkText}</a></>}
                </div>
                {item.action && (
                  <button className="btn btn-primary" onClick={item.action} style={{ fontSize: 12, padding: '4px 10px', flexShrink: 0 }}>PDF</button>
                )}
              </div>
            ))}
          </div>
        </section>

        </>)} {/* end showDetailedAnalysis */}

        {/* Actions */}
        <section className="block" style={{ background: 'var(--navy-50)', border: '1px solid var(--navy-100)' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handlePDF}>
              ↓ Analyse als PDF herunterladen
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/schritt/1')}>
              ← Angaben anpassen
            </button>
          </div>
        </section>

        {/* Disclaimer */}
        <div style={{ background: '#f8fafc', border: '1px solid var(--ink-200)', borderRadius: 12, padding: '18px 22px', margin: '8px 0' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--ink-700)', marginBottom: 6 }}>Haftungsausschluss</div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-500)', lineHeight: 1.65, margin: 0 }}>
            Diese Analyse dient der Orientierung und stellt keine Anlageberatung oder Finanzplanung dar. Die Berechnungen basieren auf vereinfachten Annahmen und den offiziellen Schweizer Vorsorgedaten 2026 (AHV-Rentenskala 44, BVG-Kennzahlen, BFS-Sterbetafeln). Individuelle steuerliche, rechtliche und persönliche Faktoren werden nicht vollständig berücksichtigt. Für verbindliche Entscheidungen konsultieren Sie bitte eine qualifizierte Finanzfachperson.
          </p>
          <div style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-400)' }}>
            WealthWise – Digitale Vorsorgeplanung Schweiz · Datenquellen: BSV, BFS, Eidg. Finanzdepartement
          </div>
        </div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-400)', textAlign: 'center', paddingTop: 24, paddingBottom: 4 }}>
          <Link to="/impressum" style={{ color: 'var(--ink-400)' }}>Impressum</Link>
          {' · '}
          <Link to="/datenschutz" style={{ color: 'var(--ink-400)' }}>Datenschutz</Link>
          {' · '}© 2026 WealthWise
        </div>
      </main>

      <div className="footer">
        <div className="footer-meta">Schritt 4 von 4 · Analyse</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/schritt/3')}>← Zurück</button>
          <button className="btn btn-primary" onClick={handlePDF}>PDF exportieren</button>
        </div>
      </div>

      <ChatPanel currentStep="analyse" />
    </div>
  )
}
