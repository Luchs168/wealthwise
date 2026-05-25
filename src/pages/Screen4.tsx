import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Area, AreaChart, BarChart, Bar, ComposedChart,
} from 'recharts'
import TopBar from '../components/TopBar'
import ProgressBar from '../components/ProgressBar'
import ChatPanel from '../components/ChatPanel'
import { useStore, getPersonsForCalc } from '../store'
import { fmtCHF, calculateAge, CONSTANTS } from '../lib/calc'
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
  const { expenses, person1, person2, hasPartner, location, freeAssets, sparkonto, wertschriften, property, kirchensteuer, lifeEvents, riskProfile, wealthInvestmentProfile, savingsStrategy,
    ahvChoice, pkChoice, pkMixPercent: _pkMixPercent, withdrawalStrategy,
    setAhvChoice, setPkChoice, setWithdrawalStrategy, addLifeEvent, removeLifeEvent } = state
  const [activeTab, setActiveTab] = useState<'ubersicht'|'szenarien'|'ahv'|'pk'|'steuern'|'entscheidungen'>('ubersicht')
  const [showCashflowTable, setShowCashflowTable] = useState(false)
  const [expandedRecs, setExpandedRecs] = useState<Set<number>>(new Set())
  const [careStartAge, setCareStartAge] = useState(82)
  const [careType, setCareType] = useState<'spitex_leicht' | 'spitex_mittel' | 'heim_standard' | 'heim_gehoben'>('heim_standard')

  const { p1, p2, civilStatus } = useMemo(() => getPersonsForCalc(state), [state])

  const monthlyBudget = useMemo(() => {
    if (expenses.simpleTotal > 0) return expenses.simpleTotal
    if (expenses.mode === 'detailed') {
      const CATS = ['wohnen', 'gesundheit', 'nahrung', 'mobilitaet', 'freizeit', 'bekleidung', 'kommunikation', 'uebrige']
      // gesundheit default includes KK premium + franchise/Selbstbehalt (national avg CHF 698)
      const DEFAULTS: Record<string, number> = { wohnen: 1476, gesundheit: 698, nahrung: 1080, mobilitaet: 650, freizeit: 580, bekleidung: 180, kommunikation: 200, uebrige: 600 }
      return CATS.reduce((s, id) => s + (expenses.detailed[id] ?? DEFAULTS[id]), 0)
    }
    return 4000
  }, [expenses])

  // canton declared early — used in both inputData and tax section
  const canton = location?.kanton ?? 'ZH'

  const inputData = useMemo(() => {
    // Monthly mortgage cost = annual interest + 1% maintenance, divided by 12
    const mortgageMonthly = property.has && property.mortgage > 0
      ? Math.round((property.mortgage * ((property.hypothekZinssatz ?? 1.5) / 100) + (property.value || 0) * 0.01) / 12)
      : 0
    return {
      person1: p1,
      person2: p2,
      civilStatus,
      canton: canton || 'ZH',
      kirchensteuer,
      freeAssets: freeAssets || 0,
      sparkonto: sparkonto || 0,
      wertschriften: wertschriften || 0,
      monthlyExpenses: monthlyBudget,
      hasProperty: property.has,
      monthlyMortgageCost: mortgageMonthly,
      propertyValue: property.has ? property.value : undefined,
      mortgage: property.has ? property.mortgage : undefined,
      hypothekZinssatz: property.hypothekZinssatz,
      amortisationYearly: property.amortisationYearly,
      amortisationYears: property.amortisationYears,
      riskProfile,
      wealthInvestmentProfile,
      savingsStrategy,
    }
  }, [p1, p2, civilStatus, canton, kirchensteuer, freeAssets, sparkonto, wertschriften, monthlyBudget, property, riskProfile, wealthInvestmentProfile, savingsStrategy])

  const analysis = useMemo(() => calculateProAnalysis(inputData), [inputData])
  const scenarios = useMemo(() => calculateScenarios(inputData), [inputData])

  const ra1 = p1.retireAge || p1.retirementAge || 65
  const currentAge1 = p1.dob ? calculateAge(p1.dob) : (p1.birthDate ? calculateAge(p1.birthDate) : 55)

  // Debug-Log: alle Schlüsselwerte auf einen Blick
  useMemo(() => {
    if (typeof window === 'undefined') return
    console.log('[S4 Debug] Datenfluss Schritt 4:', {
      ahvRente: `CHF ${analysis.ahv.person1?.monthlyRente ?? 0}/Mt.`,
      pkRente: `CHF ${analysis.pk.person1?.monthlyRente ?? 0}/Mt.`,
      pkGuthaben: `CHF ${p1.pkCapital ?? 0}`,
      pkBezugsart: p1.pkBezugsart,
      dreiaSaldo: `CHF ${p1.balance3a ?? 0}`,
      freiesVermoegen: `CHF ${freeAssets ?? 0}`,
      ausgaben: `CHF ${inputData.monthlyExpenses}/Mt.`,
      pensionierungsalter: ra1,
      currentAge: currentAge1,
      monatlicheEinnahmen: `CHF ${analysis.monthlyIncome.total}/Mt.`,
      neutralAgeWhenBroke: scenarios.neutral.ageWhenBroke,
      neutralScore: scenarios.neutral.sustainabilityScore,
      neutralVerdict: scenarios.neutral.verdict,
    })
  }, [analysis, scenarios, p1, freeAssets, inputData.monthlyExpenses, ra1, currentAge1])

  // Was wäre wenn slider
  const [altRetireAge, setAltRetireAge] = useState(ra1 + 1)
  const altInputData = useMemo(() => ({
    ...inputData,
    person1: { ...p1, retireAge: altRetireAge, retirementAge: altRetireAge },
  }), [inputData, p1, altRetireAge])
  const altAnalysis = useMemo(() => calculateProAnalysis(altInputData), [altInputData])

  // Projected FZ balance at retirement — same formula as cashflow.ts projectedFz1
  const projectedFzAtRetirement = useMemo(() => {
    if (!p1.hasFZ || !(p1.fzBalance || 0)) return 0
    const yearsToRet = Math.max(0, ra1 - currentAge1)
    const fzInvType = (p1 as Record<string, unknown>).fzInvestmentType as string | undefined
    const fzRate = CONSTANTS.RETURNS_FZ[fzInvType || 'sparkonto'] ?? 0.0075
    return Math.round((p1.fzBalance || 0) * Math.pow(1 + fzRate, yearsToRet))
  }, [p1.hasFZ, p1.fzBalance, p1.fzInvestmentType, ra1, currentAge1])

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
    if (!adjustedCashflow) return scenarios.neutral.ageWhenBroke
    const broke = adjustedCashflow.find(r => r.wealthEndOfYear <= 0)
    return broke ? broke.age : null
  }, [adjustedCashflow, scenarios])
  const hasEnabledEvents = lifeEvents.filter(e => e.enabled && e.amount > 0).length > 0

  const [showAddGrossausgabe, setShowAddGrossausgabe] = useState(false)
  const [newEvtLabel, setNewEvtLabel] = useState('')
  const [newEvtAmount, setNewEvtAmount] = useState(0)
  const [newEvtYear, setNewEvtYear] = useState(retirementYear + 2)

  // Use the neutral scenario (2.5% return) as the reference — it's what the chart shows.
  // The main analysis uses the user's investment profile which can diverge significantly.
  const neutralAgeWhenBroke = scenarios.neutral.ageWhenBroke
  const displayAgeWhenBroke = hasEnabledEvents
    ? (ageWhenBrokeWithEvents ?? neutralAgeWhenBroke)
    : neutralAgeWhenBroke

  // Tax section
  const taxStatus: TaxCivilStatus = (civilStatus === 'verheiratet' || civilStatus === 'partnerschaft') ? 'verheiratet' : 'ledig'
  const ahvMonthly1 = analysis.ahv.person1?.monthlyRente ?? 0
  const impliedPkMonthly1 = p1.hasPK ? Math.round(p1.pkCapital * (p1.pkRate / 100) / 12) : 0
  const pkMonthlyForRente = p1.hasPK && p1.pkBezugsart !== 'kapital'
    ? (p1.pkBezugsart === 'mix' ? Math.round(impliedPkMonthly1 / 2) : impliedPkMonthly1) : 0

  // PK display monthly adjusted for Kapitalbezug (so AHV+PK cards sum to Total)
  const displayPkMonthly = Math.max(0, analysis.monthlyIncome.total - Math.round(analysis.ahv.combinedYearlyInkl13 / 12))

  const incomeTax1 = useMemo(() => {
    const isCouple = taxStatus === 'verheiratet'
    // For married couples: joint taxation on combined income (Zusammenveranlagung)
    const grossIncome = isCouple && p2
      ? (p1.income || 0) + (p2.income || 0)
      : (p1.income || 0)
    if (!grossIncome) return null
    const yearly3aCombined = isCouple ? (p1.yearly3a ?? 0) + (p2?.yearly3a ?? 0) : (p1.yearly3a ?? 0)
    const has3aCombined = isCouple ? (p1.has3a || !!(p2?.has3a)) : p1.has3a
    const hasPKCombined = isCouple ? (p1.hasPK || !!(p2?.hasPK)) : p1.hasPK
    return calculateIncomeTax(grossIncome, canton, taxStatus, hasPKCombined, yearly3aCombined, has3aCombined, kirchensteuer)
  }, [p1.income, p1.yearly3a, p1.has3a, p1.hasPK, p2, canton, taxStatus, kirchensteuer])

  // Household retirement tax: uses combined AHV (post-plafonierung) + combined PK
  const retirementTax1 = useMemo(() =>
    calculateRetirementTax(analysis.ahv.combinedMonthly, displayPkMonthly, canton, taxStatus, kirchensteuer)
  , [analysis.ahv.combinedMonthly, displayPkMonthly, canton, taxStatus, kirchensteuer])

  const capitalTaxResult = useMemo(() => {
    if (!p1.hasPK || pkChoice === 'rente' || !p1.pkCapital) return null
    const amount = pkChoice === 'mix' ? Math.round(p1.pkCapital / 2) : p1.pkCapital
    return { amount, result: calculateCapitalWithdrawalTax(amount, canton, taxStatus) }
  }, [p1.hasPK, pkChoice, p1.pkCapital, canton, taxStatus])

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

  // PK-Bezugsvarianten: steuerlicher Vergleich der 3 Optionen
  const pkVariantTax = useMemo(() => {
    if (!p1.hasPK || !p1.pkCapital) return null
    const ahvMonthly = analysis.ahv.combinedMonthly
    const pkMonthly = impliedPkMonthly1
    const renteOngoing = calculateRetirementTax(ahvMonthly, pkMonthly, canton, taxStatus, kirchensteuer)
    const kapitalTax = calculateCapitalWithdrawalTax(p1.pkCapital, canton, taxStatus)
    const kapitalOngoing = calculateRetirementTax(ahvMonthly, 0, canton, taxStatus, kirchensteuer)
    const mixCapitalTax = calculateCapitalWithdrawalTax(Math.round(p1.pkCapital / 2), canton, taxStatus)
    const mixOngoing = calculateRetirementTax(ahvMonthly, Math.round(pkMonthly / 2), canton, taxStatus, kirchensteuer)
    return {
      rente: { annual: renteOngoing.totalTax },
      kapital: { oneTime: kapitalTax.totalTax, annual: kapitalOngoing.totalTax },
      mix: { oneTime: mixCapitalTax.totalTax, annual: mixOngoing.totalTax },
    }
  }, [p1.hasPK, p1.pkCapital, impliedPkMonthly1, analysis.ahv.combinedMonthly, canton, taxStatus, kirchensteuer])

  const pkCumulativeTaxData = useMemo(() => {
    if (!pkVariantTax) return []
    return Array.from({ length: 21 }, (_, i) => ({
      year: i,
      rente: Math.round(i * pkVariantTax.rente.annual),
      kapital: Math.round(pkVariantTax.kapital.oneTime + i * pkVariantTax.kapital.annual),
      mix: Math.round(pkVariantTax.mix.oneTime + i * pkVariantTax.mix.annual),
    }))
  }, [pkVariantTax])

  // Kapital vs Rente state (must be before derived useMemo blocks)
  const [rvkTab, setRvkTab] = useState<'rente' | 'kapital' | 'mix'>('rente')
  const [rvkKapitalPct, setRvkKapitalPct] = useState(50)
  const [rvkReturnRate, setRvkReturnRate] = useState(0.02)
  const [ahvSliderAge, setAhvSliderAge] = useState<number>(p1.ahvBezugAge || 65)

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

  // Wealth at retirement: free assets + 3a (both persons) + PK capital (if Kapitalbezug) + FZ - taxes
  const wdInitialWealth = useMemo(() => {
    // Use cashflow's projected retirement-year wealth — correctly includes growth,
    // 3a/FZ projections, PK capital net of tax, and employment-phase savings.
    const retRow = analysis.yearlyCashflow.find(r => r.age === ra1)
    if (retRow && retRow.wealthEndOfYear > 0) return retRow.wealthEndOfYear
    // Fallback (e.g. person already retired): raw current values
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
    if (p2) {
      if (p2.has3a && p2.balance3a > 0) w += p2.balance3a
      if (p2.hasPK && p2.pkBezugsart !== 'rente' && p2.pkCapital > 0) {
        const capAmount2 = p2.pkBezugsart === 'mix' ? Math.round(p2.pkCapital / 2) : p2.pkCapital
        const tax2 = calculateCapitalWithdrawalTax(capAmount2, canton, taxStatus)
        w += tax2.netAmount
      }
      if (p2.hasFZ && p2.fzBalance > 0) {
        const tax2 = calculateCapitalWithdrawalTax(p2.fzBalance, canton, taxStatus)
        w += tax2.netAmount
      }
    }
    return w
  }, [analysis.yearlyCashflow, ra1, freeAssets, p1, p2, canton, taxStatus])

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
      analysis.ahv.combinedMonthly * 12,  // household AHV (post-plafonierung)
      displayPkMonthly * 12,              // household PK
      freeAssets || 0,
      civilStatus === 'verheiratet' || civilStatus === 'partnerschaft',
      canton,
    )
  , [analysis.ahv.combinedMonthly, displayPkMonthly, freeAssets, civilStatus, canton])

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

  // Projected 3a balance at retirement — derived from cashflow retirement year row
  const projected3aAtRetirement = useMemo(() => {
    const retRow = analysis.yearlyCashflow.find(r => r.age === ra1)
    if (retRow) return retRow.pillar3aWithdrawal
    return p1.has3a ? (p1.balance3a || 0) : 0
  }, [analysis.yearlyCashflow, ra1, p1.has3a, p1.balance3a])

  const withdrawalPlan = useMemo(() => {
    const p1stored = state.persons.find(p => p.id === 1)
    const pkCap = p1.hasPK && p1.pkBezugsart !== 'rente' && p1.pkCapital > 0
      ? (p1.pkBezugsart === 'mix' ? Math.round(p1.pkCapital / 2) : p1.pkCapital)
      : 0
    const pillar3aTotal = p1.has3a ? projected3aAtRetirement : 0
    const num3aAccounts = p1stored?.num3aAccounts || 1
    const fzBal = p1.hasFZ ? projectedFzAtRetirement : 0
    const retirementCalendarYear = new Date().getFullYear() + Math.max(1, ra1 - currentAge1)
    return calculateOptimalWithdrawal(pkCap, pillar3aTotal, num3aAccounts, fzBal, canton, taxStatus, retirementCalendarYear)
  }, [state.persons, p1, projected3aAtRetirement, projectedFzAtRetirement, ra1, currentAge1, canton, taxStatus])

  // Hoisted variants1 (needed for AHV tab and fixed header)
  const variants1 = useMemo(() => {
    const p1stored = state.persons.find(p => p.id === 1)!
    const baseYears1 = Math.min(44, Math.max(0, ra1 - 21))
    const effectiveYears1 = Math.max(0, baseYears1 - (p1stored.ahvContributionGaps || 0))
    return calculateAllVariants(p1.grossIncome || p1.income || 0, effectiveYears1, p1stored.ahvContributionGaps || 0)
  }, [state.persons, p1, ra1])

  const top3recs = useMemo(() => {
    const isSE = p1.employmentStatus === 'selfEmployed'
    const noPK = !p1.hasPK
    const pkKeywords = ['PK-Einkauf', 'Pensionskasse', 'Einkäufe in die Pensionskasse']
    const isLowIncome = (p1.income || 0) < 60000 && (freeAssets || 0) < 50000 && !p1.has3a
    let recs = (RECS[analysis.verdict] ?? []).filter(r =>
      !(isSE && noPK && pkKeywords.some(k => r.text.includes(k))) &&
      !(isLowIncome && (r.text.includes('PK-Einkauf') || r.text.includes('Säule-3a') || r.text.includes('3a-Gelder') || r.text.includes('Kapitalbezug')))
    )
    if (isLowIncome) {
      recs = [
        { text: 'Prüfen Sie Ihren EL-Anspruch nach der Pensionierung – das ist Ihr gesetzliches Recht (ELG).', priority: 'hoch' as const, detail: '' },
        { text: 'Bestellen Sie Ihren IK-Auszug und prüfen Sie ob alle Beitragsjahre korrekt verbucht sind.', priority: 'hoch' as const, detail: '' },
        { text: 'Bis 65 arbeiten statt Vorbezug: Vermeidet lebenslange AHV-Kürzung von 6.8% pro Jahr.', priority: 'mittel' as const, detail: '' },
        ...recs
      ].slice(0, 3)
    }
    if (isSE && noPK) {
      recs = [
        ...(currentAge1 < 58 ? [{ text: 'Prüfen Sie den freiwilligen Beitritt zur BVG-Auffangeinrichtung (sinnvoll bis ca. Alter 58).', priority: 'hoch' as const, detail: '' }] : []),
        { text: 'Planen Sie die Nachfolge / den Verkauf Ihres Betriebs als Alterskapital.', priority: 'hoch' as const, detail: '' },
        ...recs
      ].slice(0, 3)
    }
    // WEF-Vorbezug: always show if present
    const p1stored = state.persons.find(p => p.id === 1)
    if (p1stored?.pkVorbezugGrund === 'wef' && (p1stored.pkVorbezugAmount ?? 0) > 0) {
      const renteMinus = Math.round((p1stored.pkVorbezugAmount ?? 0) * ((p1stored.pkRate || 5.4) / 100) / 12)
      const currentYear = new Date().getFullYear()
      const retireAge = person1.retireAge || 65
      const currentAge1Calc = person1.dob ? (currentYear - (parseInt(person1.dob.split('.').pop() || '0') || parseInt(person1.dob.split('-')[0]) || 0)) : 55
      const rueckzahlBisJahr = currentYear + Math.max(0, (retireAge - 3) - currentAge1Calc)
      recs.unshift({
        text: `WEF-Rückzahlung prüfen: CHF ${fmtCHF(p1stored.pkVorbezugAmount ?? 0)} vorbezogen – Rückzahlung spart CHF ${fmtCHF(renteMinus)}/Mt. Rente.`,
        priority: 'hoch' as const,
        detail: `Sie haben CHF ${fmtCHF(p1stored.pkVorbezugAmount ?? 0)} für Wohneigentum vorbezogen. Eine Rückzahlung erhöht Ihre PK-Rente um ca. CHF ${fmtCHF(renteMinus)}/Monat und ist steuerlich abzugsfähig (wie ein PK-Einkauf). Frist: Bis ${rueckzahlBisJahr} (3 Jahre vor Pensionierung).`,
      })
    }
    return recs.slice(0, 3)
  }, [analysis.verdict, p1, freeAssets, currentAge1, state.persons, person1])

  const eigenmietwertResult = useMemo(() => {
    if (!property.has || !property.value) return null
    const steuerwert = property.steuerwert > 0 ? property.steuerwert : Math.round(property.value * 0.7)
    // Use household retirement income (AHV combinedYearlyInkl13 + combined PK yearly)
    const annualRetirementIncome = analysis.ahv.combinedYearlyInkl13 + displayPkMonthly * 12
    return calculateEigenmietwert(steuerwert, property.mortgage, property.hypothekZinssatz ?? 1.5, canton, taxStatus, annualRetirementIncome, kirchensteuer)
  }, [property, analysis.ahv.combinedYearlyInkl13, displayPkMonthly, canton, taxStatus, kirchensteuer])

  const CARE_COSTS: Record<string, { label: string; monthlyCost: number }> = {
    spitex_leicht: { label: 'Spitex (leicht)', monthlyCost: 1500 },
    spitex_mittel: { label: 'Spitex (mittel)', monthlyCost: 3000 },
    heim_standard: { label: 'Pflegeheim (Standard)', monthlyCost: 8000 },
    heim_gehoben: { label: 'Pflegeheim (gehoben)', monthlyCost: 12000 },
  }

  const careScenario = useMemo(() => {
    const careInfo = CARE_COSTS[careType]
    const monthlyCost = careInfo.monthlyCost
    const wealthAtCareStart = wdInitialWealth * Math.pow(1 + wdReturnRate, Math.max(0, careStartAge - ra1))
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
  }, [careStartAge, careType, wdInitialWealth, ra1, wdMonthlyIncome, monthlyBudget, civilStatus, wdReturnRate])

  const [taxExpanded, setTaxExpanded] = useState(false)
  const [taxSubA, setTaxSubA] = useState(false)
  const [taxSubB, setTaxSubB] = useState(false)
  const [taxSubC, setTaxSubC] = useState(false)
  const [taxSubD, setTaxSubD] = useState(false)
  const [taxSubE, setTaxSubE] = useState(false)
  const [taxSubF, setTaxSubF] = useState(false)
  const [taxSubG, setTaxSubG] = useState(false)
  const [taxSubH, setTaxSubH] = useState(false)

  // After-tax monthly surplus: pension income minus budget minus estimated monthly retirement tax
  const surplusAfterTax = analysis.surplus - retirementTax1.monthlyTax

  // Alt analysis after-tax surplus (different retirement age → different AHV/PK amounts → different tax)
  const altDisplayPkMonthly = Math.max(0, altAnalysis.monthlyIncome.total - Math.round(altAnalysis.ahv.combinedYearlyInkl13 / 12))
  const altRetirementTax = calculateRetirementTax(altAnalysis.ahv.combinedMonthly, altDisplayPkMonthly, canton, taxStatus, kirchensteuer)
  const altSurplusAfterTax = altAnalysis.surplus - altRetirementTax.monthlyTax

  // Display verdict/score driven by neutral scenario so chart, score, and statement all agree.
  const displayVerdict = scenarios.neutral.verdict
  const displayScore = scenarios.neutral.sustainabilityScore
  const verdictLabel = displayVerdict === 'green' ? 'Gut aufgestellt' : displayVerdict === 'yellow' ? 'Optimierungspotenzial' : 'Handlungsbedarf'
  const verdictColor = displayVerdict === 'green' ? 'var(--green-500)' : displayVerdict === 'yellow' ? 'var(--amber-500)' : 'var(--red-500)'
  const verdictBg = displayVerdict === 'green' ? 'var(--green-50)' : displayVerdict === 'yellow' ? '#fffbeb' : '#fef2f2'
  const verdictBorder = displayVerdict === 'green' ? 'var(--green-200)' : displayVerdict === 'yellow' ? '#fde68a' : '#fecaca'

  const coveragePct = monthlyBudget > 0 ? Math.round((analysis.monthlyIncome.total / monthlyBudget) * 100) : 0

  const chartData = useMemo(() => {
    const base = scenarios.neutral.yearlyCashflow.filter(r => r.age >= ra1)
    const adj = adjustedCashflow ? adjustedCashflow.filter(r => r.age >= ra1) : null
    return base.map((r, i) => ({
      age: r.age,
      vermoegen: Math.max(0, adj ? (adj[i]?.wealthEndOfYear ?? r.wealthEndOfYear) : r.wealthEndOfYear),
      vermoegenBase: adjustedCashflow ? Math.max(0, r.wealthEndOfYear) : undefined,
      eventAmount: adj ? (adj[i]?.eventAmount ?? 0) : 0,
      einnahmen: Math.round((r.ahvIncome + r.pkRenteIncome) / 12),
      ausgaben: Math.round(r.livingExpenses / 12),
    }))
  }, [scenarios, adjustedCashflow, ra1])

  const scenarioChartData = useMemo(() => {
    const ages = scenarios.neutral.yearlyCashflow.filter(r => r.age >= ra1).map(r => r.age)
    return ages.map(age => ({
      age,
      optimistisch: Math.max(0, scenarios.optimistic.yearlyCashflow.find(r => r.age === age)?.wealthEndOfYear || 0),
      neutral: Math.max(0, scenarios.neutral.yearlyCashflow.find(r => r.age === age)?.wealthEndOfYear || 0),
      pessimistisch: Math.max(0, scenarios.pessimistic.yearlyCashflow.find(r => r.age === age)?.wealthEndOfYear || 0),
      shade: Math.max(0, (scenarios.optimistic.yearlyCashflow.find(r => r.age === age)?.wealthEndOfYear || 0) - Math.max(0, scenarios.pessimistic.yearlyCashflow.find(r => r.age === age)?.wealthEndOfYear || 0)),
    }))
  }, [scenarios, ra1])

  const wealthBreakdown = useMemo(() => {
    const yearsToRet = Math.max(0, ra1 - currentAge1)
    const sparkontoProj = Math.round((sparkonto || 0) * Math.pow(1.0075, yearsToRet))
    const wertRate = CONSTANTS.RETURNS_WEALTH[wealthInvestmentProfile] ?? 0.035
    const wertProj = Math.round((wertschriften || 0) * Math.pow(1 + wertRate, yearsToRet))
    const p3a = projected3aAtRetirement
    const pkCap = p1.hasPK && p1.pkBezugsart !== 'rente' && (p1.pkCapital || 0) > 0
      ? (p1.pkBezugsart === 'mix' ? Math.round((p1.pkCapital || 0) / 2) : (p1.pkCapital || 0))
      : 0
    const fzCap = projectedFzAtRetirement
    const propEquity = property.has ? Math.max(0, (property.value || 0) - (property.mortgage || 0)) : 0
    const grossMonthly = ((p1.income || 0) + ((p2 as any)?.income || 0)) / 12
    const netMonthly = Math.round(grossMonthly * 0.72)
    const monthlySurplus = Math.max(0, netMonthly - monthlyBudget)
    const sRates: Record<string, number> = { sparkonto: 0.0075, konservativ: 0.025, ausgewogen: 0.035, aggressiv: 0.05 }
    const sRate = sRates[savingsStrategy] ?? 0.035
    const accSavings = monthlySurplus > 0 && yearsToRet > 0
      ? Math.round(monthlySurplus * 12 * ((Math.pow(1 + sRate, yearsToRet) - 1) / sRate))
      : 0
    return { sparkontoProj, wertProj, p3a, pkCap, fzCap, propEquity, accSavings, total: wdInitialWealth }
  }, [ra1, currentAge1, sparkonto, wertschriften, wealthInvestmentProfile, projected3aAtRetirement,
      projectedFzAtRetirement, p1, p2, property, monthlyBudget, savingsStrategy, wdInitialWealth])

  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const riskProfileForPdf = (): 'conservative' | 'balanced' | 'growth' => {
    if (riskProfile === 'conservative') return 'conservative'
    if (riskProfile === 'growth') return 'growth'
    return 'balanced'
  }

  const handlePDF = async () => {
    setPdfLoading(true)
    setPdfError(null)
    try {
      const { exportPDF } = await import('../lib/pdf')
      await exportPDF({
        person1Name: person1.name || 'Person 1',
        person2Name: hasPartner ? (person2.name || 'Person 2') : undefined,
        location: location || undefined,
        retirementAge1: ra1,
        analysis,
        monthlyBudget,
        surplusAfterTax,
        displayPkMonthly,
        retirementTaxMonthly: retirementTax1.monthlyTax,
        freeAssets: freeAssets || 0,
        riskProfile: riskProfileForPdf(),
        canton,
        kirchensteuer,
        wealthAtRetirement: wdInitialWealth,
        depletionAge: wdRealistDepletionAge ?? undefined,
        pkCapital1: p1.hasPK && p1.pkBezugsart !== 'rente' ? p1.pkCapital : undefined,
        pkRate1: p1.pkRate,
        balance3a1: p1.has3a ? projected3aAtRetirement : undefined,
        fzBalance1: projectedFzAtRetirement > 0 ? projectedFzAtRetirement : undefined,
        hasProperty: property.has,
        propertyValue: property.has ? property.value : undefined,
        scenarios,
      })
    } catch (err) {
      console.error('PDF generation failed:', err)
      setPdfError('PDF konnte nicht erstellt werden. Bitte versuchen Sie es erneut.')
    } finally {
      setPdfLoading(false)
    }
  }

  const toggleRec = (i: number) => {
    setExpandedRecs(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function addQuickEvent(label: string, amount: number) {
    addLifeEvent({
      id: Math.random().toString(36).slice(2, 10),
      category: 'sonstiges',
      year: retirementYear + 2,
      amount,
      art: 'ausgabe',
      duration: 1,
      enabled: true,
      details: { customLabel: label },
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

        {/* Haupt-Disclaimer */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-600)', lineHeight: 1.6 }}>
            Die folgenden Analysen basieren auf Ihren Angaben und den offiziellen AHV/BVG-Kennzahlen 2026. <strong>WealthWise ist ein Informationstool und keine Finanz-, Steuer- oder Rechtsberatung.</strong> Alle Berechnungen sind Schätzungen. Bitte konsultieren Sie eine Fachperson für verbindliche Entscheidungen.
          </p>
        </div>

        {/* ── Fixed Summary Header ── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: verdictBg, border: `1px solid ${verdictBorder}`, borderRadius: 12, padding: '10px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>{displayVerdict === 'green' ? '✅' : displayVerdict === 'yellow' ? '⚠️' : '🔴'}</span>
            <span style={{ fontWeight: 700, color: verdictColor, fontSize: 14 }}>{verdictLabel}</span>
            <span style={{ fontSize: 13, color: 'var(--ink-500)' }}>Score: {displayScore}/100</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, padding: '2px 10px', background: 'rgba(255,255,255,0.6)', borderRadius: 20, border: `1px solid ${verdictBorder}` }}>
              {surplusAfterTax >= 0 ? '+' : ''}CHF {fmtCHF(surplusAfterTax)}/Mt.
            </span>
            <span style={{ fontSize: 12, padding: '2px 10px', background: 'rgba(255,255,255,0.6)', borderRadius: 20, border: `1px solid ${verdictBorder}` }}>
              Reicht bis {(displayAgeWhenBroke ?? 99) >= 99 ? 'Alter 95+' : `Alter ${displayAgeWhenBroke ?? 99}`}
            </span>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div style={{ display: 'flex', gap: 2, overflowX: 'auto', borderBottom: '2px solid var(--ink-100)', marginBottom: 0 }}>
          {([
            { id: 'ubersicht', label: 'Übersicht' },
            { id: 'szenarien', label: 'Szenarien' },
            { id: 'ahv', label: 'AHV' },
            { id: 'pk', label: 'PK & Kapital' },
            { id: 'steuern', label: 'Steuern' },
            { id: 'entscheidungen', label: 'Meine Entscheidungen' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 14px', fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 400,
                border: 'none', borderBottom: `3px solid ${activeTab === tab.id ? 'var(--navy-600)' : 'transparent'}`,
                background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                color: activeTab === tab.id ? 'var(--navy-700)' : 'var(--ink-500)',
              }}
            >
              {tab.label}
              {tab.id === 'entscheidungen' && (ahvChoice && pkChoice) && <span style={{ marginLeft: 4, color: '#22c55e' }}>✓</span>}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div style={{ paddingTop: 8 }}>

        {/* ── Tab: Übersicht ── */}
        {activeTab === 'ubersicht' && (
<div style={{ padding: '8px 0' }}>

  {/* Central statement */}
  <div style={{ textAlign: 'center', padding: '28px 16px 24px' }}>
    <div style={{ fontSize: 12, color: 'var(--ink-400)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
      Ihre Vorsorgeanalyse
    </div>
    <div style={{
      fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, lineHeight: 1.15, marginBottom: 12,
      color: (displayAgeWhenBroke ?? 99) >= 87 ? 'var(--navy-800)' : (displayAgeWhenBroke ?? 99) >= 82 ? '#d97706' : '#dc2626',
    }}>
      {(displayAgeWhenBroke ?? 99) >= 99
        ? 'Ihr Vermögen reicht bis Alter 95+'
        : `Ihr Vermögen reicht voraussichtlich bis Alter ${displayAgeWhenBroke}`
      }
    </div>
    <div style={{ fontSize: 14, color: 'var(--ink-500)', lineHeight: 1.6 }}>
      Bei einem monatlichen Bedarf von{' '}
      <strong style={{ color: 'var(--ink-700)' }}>CHF {fmtCHF(monthlyBudget)}</strong>{' '}
      und Renten von{' '}
      <strong style={{ color: 'var(--ink-700)' }}>CHF {fmtCHF(analysis.monthlyIncome.total)}/Mt.</strong>
    </div>
  </div>

  {/* Wealth trajectory chart with scenario band */}
  <div style={{ marginBottom: 24 }}>
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={scenarioChartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-100)" />
        <XAxis dataKey="age" tick={{ fontSize: 11, fill: 'var(--ink-400)' }} />
        <YAxis tickFormatter={v => fmtK(v)} tick={{ fontSize: 11, fill: 'var(--ink-400)' }} />
        <Tooltip
          formatter={(v: number) => [`CHF ${fmtCHF(v)}`, '']}
          labelFormatter={l => `Alter ${l}`}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--ink-200)' }}
        />
        {/* Band: stacked area = pessimistic base (transparent) + shade on top */}
        <Area type="monotone" dataKey="pessimistisch" stackId="band" fill="transparent" stroke="none" legendType="none" />
        <Area type="monotone" dataKey="shade" stackId="band" fill="#dbeafe" stroke="none" fillOpacity={0.5} legendType="none" />
        {/* Main neutral line */}
        <Line type="monotone" dataKey="neutral" stroke="var(--navy-700)" strokeWidth={2.5} dot={false} name="Neutral (2.5%)" />
        {/* Zero reference line */}
        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" />
        {/* Depletion age */}
        {(displayAgeWhenBroke ?? 99) < 99 && (
          <ReferenceLine x={displayAgeWhenBroke ?? undefined} stroke="#ef4444" strokeDasharray="4 4"
            label={{ value: `Alter ${displayAgeWhenBroke}`, fill: '#ef4444', fontSize: 10, position: 'top' }} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
    <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-500)' }}>
        <div style={{ width: 24, height: 3, background: 'var(--navy-700)', borderRadius: 2 }} />
        <span>Neutrales Szenario (2.5%)</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-500)' }}>
        <div style={{ width: 20, height: 12, background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 2 }} />
        <span>Szenarien-Bandbreite</span>
      </div>
    </div>
  </div>

  {/* 3 KPI cards */}
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
    <div style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 6, fontWeight: 500 }}>Monatliche Einnahmen</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#15803d' }}>
        CHF {fmtCHF(analysis.monthlyIncome.total)}
      </div>
      <div style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 4 }}>AHV + PK-Renten</div>
    </div>
    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 6, fontWeight: 500 }}>Monatlicher Bedarf</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#dc2626' }}>
        CHF {fmtCHF(monthlyBudget)}
      </div>
      <div style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 4 }}>Lebenshaltungskosten</div>
    </div>
    <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '16px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 6, fontWeight: 500 }}>Startvermögen</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--navy-700)' }}>
        CHF {fmtK(wdInitialWealth)}
      </div>
      <div style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 4 }}>bei Pensionierung Alter {ra1}</div>
    </div>
  </div>

  {/* Gap / surplus note */}
  {surplusAfterTax < 0 ? (
    <div style={{ padding: '14px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, marginBottom: 16, fontSize: 14, color: '#92400e', lineHeight: 1.65 }}>
      Es besteht eine monatliche Lücke von <strong>CHF {fmtCHF(Math.abs(surplusAfterTax))}</strong>.{' '}
      {retirementTax1.monthlyTax > 0 && (
        <span style={{ fontSize: 12, opacity: 0.85 }}>
          (Lebenshaltung CHF {fmtCHF(monthlyBudget)} + Steuern CHF {fmtCHF(retirementTax1.monthlyTax)} − Einnahmen CHF {fmtCHF(analysis.monthlyIncome.total)})
        </span>
      )}
      {' '}Diese wird aus Ihrem Vermögen von CHF {fmtK(wdInitialWealth)} finanziert.
    </div>
  ) : (
    <div style={{ padding: '14px 18px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 16, fontSize: 14, color: '#166534', lineHeight: 1.65 }}>
      Ihre Renten übersteigen Ihren Bedarf — monatlicher Überschuss: <strong>CHF {fmtCHF(Math.abs(surplusAfterTax))}</strong>{retirementTax1.monthlyTax > 0 ? ` (nach Steuern CHF ${fmtCHF(retirementTax1.monthlyTax)}/Mt.)` : ''}.
    </div>
  )}

  {/* Einnahmen vs. Bedarf breakdown */}
  <div style={{ marginBottom: 24 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div style={{ padding: '14px 16px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#15803d', marginBottom: 10 }}>Monatliche Einnahmen</div>
        {[
          { label: hasPartner ? 'AHV-Renten (Haushalt)' : 'AHV-Rente', value: Math.round(analysis.ahv.combinedYearlyInkl13 / 12) },
          { label: hasPartner ? 'PK-Renten (Haushalt)' : 'PK-Rente', value: displayPkMonthly },
          { label: 'Total', value: wdMonthlyIncome, bold: true },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4, fontWeight: row.bold ? 700 : 400 }}>
            <span style={{ color: '#166534' }}>{row.label}</span>
            <span>CHF {fmtCHF(row.value)}</span>
          </div>
        ))}
        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6 }}>inkl. 13. AHV-Monatsbeitrag (auf 12 Mt. verteilt)</div>
      </div>
      <div style={{ padding: '14px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 10 }}>Monatlicher Bedarf</div>
        {[
          { label: 'Lebenshaltung', value: monthlyBudget },
          { label: 'Steuern (geschätzt)', value: retirementTax1?.monthlyTax ?? 0 },
          { label: 'Total', value: monthlyBudget + (retirementTax1?.monthlyTax ?? 0), bold: true },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4, fontWeight: row.bold ? 700 : 400 }}>
            <span style={{ color: '#7f1d1d' }}>{row.label}</span>
            <span>CHF {fmtCHF(row.value)}</span>
          </div>
        ))}
      </div>
    </div>
  </div>

  {/* CTA */}
  <div style={{ textAlign: 'center', paddingBottom: 24 }}>
    <button
      onClick={() => setActiveTab('szenarien')}
      style={{
        padding: '12px 32px', background: 'var(--navy-700)', color: 'white',
        border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600,
        cursor: 'pointer', letterSpacing: '0.01em',
      }}
    >
      Details erkunden →
    </button>
  </div>

</div>
)}

        {/* ── Tab: Szenarien ── */}
        {activeTab === 'szenarien' && (<>

{/* Central statement */}
{(() => {
  const optAge = scenarios.optimistic.ageWhenBroke ?? 99
  const pesAge = scenarios.pessimistic.ageWhenBroke ?? 99
  const minAge = Math.min(optAge, pesAge)
  const maxAge = Math.max(optAge, pesAge)
  return (
    <div style={{ textAlign: 'center', padding: '24px 16px 20px' }}>
      <div style={{ fontSize: 12, color: 'var(--ink-400)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Szenarien-Vergleich</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--navy-800)', lineHeight: 1.2, marginBottom: 8 }}>
        Ihr Vermögen reicht je nach Szenario bis Alter {minAge >= 99 ? '95+' : minAge}–{maxAge >= 99 ? '95+' : maxAge}
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>
        Optimistisch (4% Rendite) bis Neutral (2.5%) bis Pessimistisch (1%)
      </div>
    </div>
  )
})()}

{/* Scenario chart – 3 lines */}
<section className="block">
  <div className="block-head">
    <h2 className="block-title"><span className="block-num">S</span>Vermögensverlauf – 3 Szenarien</h2>
    <span className="block-hint">Neutrale Hauptlinie · Bandbreite optimistisch/pessimistisch</span>
  </div>
  {scenarioChartData.length > 0 ? (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={scenarioChartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-100)" />
        <XAxis dataKey="age" tick={{ fontSize: 11, fill: 'var(--ink-400)' }} />
        <YAxis tickFormatter={v => fmtK(v)} tick={{ fontSize: 11, fill: 'var(--ink-400)' }} />
        <Tooltip formatter={(v: number) => [`CHF ${fmtCHF(v)}`, '']} labelFormatter={l => `Alter ${l}`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Line type="monotone" dataKey="optimistisch" stroke="#16a34a" strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="Optimistisch (4%)" />
        <Line type="monotone" dataKey="neutral" stroke="var(--navy-700)" strokeWidth={2.5} dot={false} name="Neutral (2.5%)" />
        <Line type="monotone" dataKey="pessimistisch" stroke="#d97706" strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="Pessimistisch (1%)" />
        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" />
        {/* Life event markers */}
        {lifeEvents.filter(e => e.enabled && e.amount > 0).map(evt => {
          const birthYear = new Date().getFullYear() - currentAge1
          const evtAge = evt.year - birthYear
          if (evtAge > 95 || evtAge < ra1) return null
          const cfg = CATEGORY_CONFIG[evt.category]
          return (
            <ReferenceLine key={evt.id} x={evtAge} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1.5}
              label={{ value: `${cfg.icon} ${fmtK(evt.amount)}`, fill: '#d97706', fontSize: 10, position: 'insideTopRight' }} />
          )
        })}
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </LineChart>
    </ResponsiveContainer>
  ) : (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-400)', fontSize: 14 }}>
      Bitte geben Sie Geburtsdatum und Pensionierungsalter in Schritt 1 ein.
    </div>
  )}

  {/* 3 KPI cards */}
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 20 }}>
    {[
      { label: 'Optimistisch', age: scenarios.optimistic.ageWhenBroke, bg: '#ecfdf5', border: '#bbf7d0', color: '#15803d', hint: '4% Rendite, 1% Inflation' },
      { label: 'Neutral', age: scenarios.neutral.ageWhenBroke, bg: '#f0f9ff', border: '#bae6fd', color: 'var(--navy-700)', hint: '2.5% Rendite, 1.5% Inflation' },
      { label: 'Pessimistisch', age: scenarios.pessimistic.ageWhenBroke, bg: '#fffbeb', border: '#fde68a', color: '#d97706', hint: '1% Rendite, 2% Inflation' },
    ].map((s, i) => (
      <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 4 }}>{s.label}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: s.color }}>
          {s.age == null || s.age >= 99 ? 'Alter 95+' : `Alter ${s.age}`}
        </div>
        <div style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 4 }}>{s.hint}</div>
      </div>
    ))}
  </div>
</section>

{/* Life events quick-select */}
<section className="block">
  <div className="block-head">
    <h2 className="block-title"><span className="block-num">G</span>Geplante Grossausgaben</h2>
    <span className="block-hint">Einmalausgaben im Ruhestand planen</span>
  </div>
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
    {[
      { label: '🚗 Auto', amount: 40000 },
      { label: '✈️ Weltreise', amount: 30000 },
      { label: '🏠 Renovation', amount: 50000 },
      { label: '🎓 Ausbildung', amount: 20000 },
      { label: '🎁 Schenkung', amount: 50000 },
    ].map(q => (
      <button
        key={q.label}
        onClick={() => addQuickEvent(q.label, q.amount)}
        style={{
          padding: '8px 14px', fontSize: 13, background: 'var(--ink-50)',
          border: '1px solid var(--ink-200)', borderRadius: 20, cursor: 'pointer',
          color: 'var(--ink-700)', whiteSpace: 'nowrap',
        }}
      >
        {q.label} <span style={{ color: 'var(--ink-400)', fontSize: 11 }}>CHF {fmtK(q.amount)}</span>
      </button>
    ))}
  </div>
  {lifeEvents.filter(e => e.enabled && e.amount > 0).length === 0 ? (
    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--ink-400)', fontSize: 13 }}>
      Keine Grossausgaben geplant. Wählen Sie oben eine Schnelloption.
    </div>
  ) : (
    <div style={{ display: 'grid', gap: 8 }}>
      {lifeEvents.filter(e => e.enabled && e.amount > 0).map(evt => {
        const cfg = CATEGORY_CONFIG[evt.category]
        const birthYear = new Date().getFullYear() - currentAge1
        const evtAge = evt.year - birthYear
        return (
          <div key={evt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--ink-50)', borderRadius: 10, fontSize: 13 }}>
            <span>{cfg.icon} {evt.details?.customLabel || cfg.label} · Alter {evtAge}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 600, color: 'var(--navy-800)' }}>CHF {fmtCHF(evt.amount)}</span>
              <button onClick={() => removeLifeEvent(evt.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-400)', fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          </div>
        )
      })}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--navy-800)', borderRadius: 10, fontSize: 13 }}>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>Total Sonderausgaben</span>
        <span style={{ fontWeight: 700, color: 'white' }}>CHF {fmtCHF(lifeEvents.filter(e => e.enabled && e.amount > 0).reduce((s, e) => s + e.amount, 0))}</span>
      </div>
      {hasEnabledEvents && (
        <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 13, color: '#92400e' }}>
          Mit diesen Ausgaben reicht Ihr Vermögen bis <strong>Alter {(displayAgeWhenBroke ?? 99) >= 99 ? '95+' : displayAgeWhenBroke}</strong>
          {ageWhenBrokeWithEvents && analysis.ageWhenBroke && ageWhenBrokeWithEvents !== analysis.ageWhenBroke
            ? ` (ohne Ausgaben: Alter ${analysis.ageWhenBroke >= 99 ? '95+' : analysis.ageWhenBroke})`
            : ''}
          .
        </div>
      )}
    </div>
  )}
</section>

        </>)} {/* end Szenarien tab */}

        {/* ── Tab: AHV ── */}
        {activeTab === 'ahv' && (<>

{/* Central statement */}
<div style={{ textAlign: 'center', padding: '24px 16px 20px' }}>
  <div style={{ fontSize: 12, color: 'var(--ink-400)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
    AHV – 1. Säule
  </div>
  <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--navy-800)', lineHeight: 1.2, marginBottom: 8 }}>
    {hasPartner
      ? `Ihre AHV-Renten: CHF ${fmtCHF(analysis.ahv.combinedMonthly)}/Mt. (Haushalt)`
      : `Ihre AHV-Rente: CHF ${fmtCHF(ahvMonthly1)}/Mt.`
    }
  </div>
  <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>
    Berechnet auf Basis {(() => {
      const p1stored = state.persons.find(p => p.id === 1)!
      const baseYears1 = Math.min(44, Math.max(0, ra1 - 21))
      const effectiveYears1 = Math.max(0, baseYears1 - (p1stored.ahvContributionGaps || 0))
      return effectiveYears1
    })()} Beitragsjahre · AHV-Rentenskala 44 · BSV 2026
  </div>
</div>

{/* AHV Bezugszeitpunkt slider */}
<section className="block">
  <div className="block-head">
    <h2 className="block-title"><span className="block-num">Z</span>AHV-Bezugszeitpunkt</h2>
    <span className="block-hint">Auswirkung auf monatliche Rente</span>
  </div>
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: 'var(--ink-600)', fontWeight: 500 }}>Bezug ab Alter</span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--navy-800)' }}>{ahvSliderAge}</span>
    </div>
    <input
      type="range" min={63} max={70} step={1}
      value={ahvSliderAge}
      onChange={e => setAhvSliderAge(Number(e.target.value))}
      style={{ width: '100%', accentColor: 'var(--navy-700)' }}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>
      <span>63 (Vorbezug)</span><span>65 (ordentlich)</span><span>70 (Aufschub)</span>
    </div>
  </div>
  {(() => {
    const v = variants1.find(v => v.bezugAge === ahvSliderAge) || variants1.find(v => v.bezugAge === 65)!
    const v65 = variants1.find(v => v.bezugAge === 65)!
    const diff = v65 ? v.monthlyRente - v65.monthlyRente : 0
    const isVorbezug = ahvSliderAge < 65
    const isAufschub = ahvSliderAge > 65
    return (
      <div style={{ padding: '16px 20px', background: isVorbezug ? '#fef2f2' : isAufschub ? '#ecfdf5' : '#f0f9ff', border: `1px solid ${isVorbezug ? '#fecaca' : isAufschub ? '#bbf7d0' : '#bae6fd'}`, borderRadius: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: isVorbezug ? '#dc2626' : isAufschub ? '#15803d' : 'var(--navy-700)', marginBottom: 6 }}>
          CHF {fmtCHF(v.monthlyRente)}/Mt.
        </div>
        {diff !== 0 && (
          <div style={{ fontSize: 13, color: isVorbezug ? '#dc2626' : '#15803d' }}>
            {diff > 0 ? '+' : ''}{fmtCHF(diff)}/Mt. gegenüber Bezug mit 65
            {isVorbezug && <span style={{ color: 'var(--ink-500)', marginLeft: 8 }}>· Kürzung {((65 - ahvSliderAge) * 6.8).toFixed(1)}% lebenslang</span>}
            {isAufschub && <span style={{ color: 'var(--ink-500)', marginLeft: 8 }}>· Zuschlag {((ahvSliderAge - 65) * 5.2).toFixed(1)}% lebenslang</span>}
          </div>
        )}
        {isVorbezug && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626' }}>
            ⚠ Diese Kürzung gilt lebenslang – auch nach dem 65. Geburtstag.
          </div>
        )}
      </div>
    )
  })()}
</section>

{/* 3 comparison cards */}
<section className="block">
  <div className="block-head">
    <h2 className="block-title"><span className="block-num">V</span>Vergleich Bezugsvarianten</h2>
    <span className="block-hint">Monatliche Rente je nach Zeitpunkt</span>
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
    {[
      { age: 63, label: 'Vorbezug (63)', bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
      { age: 65, label: 'Ordentlich (65)', bg: '#f0f9ff', border: '#bae6fd', color: 'var(--navy-700)' },
      { age: 67, label: 'Aufschub (67)', bg: '#ecfdf5', border: '#bbf7d0', color: '#15803d' },
    ].map(({ age, label, bg, border, color }) => {
      const v = variants1.find(vv => vv.bezugAge === age)
      if (!v) return null
      const v65 = variants1.find(vv => vv.bezugAge === 65)!
      const diff = v65 ? v.monthlyRente - v65.monthlyRente : 0
      return (
        <div key={age} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 4 }}>{label}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color }}>
            CHF {fmtCHF(v.monthlyRente)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>
            {diff !== 0 ? `${diff > 0 ? '+' : ''}${fmtCHF(diff)}/Mt.` : 'Referenz'}
          </div>
        </div>
      )
    })}
  </div>
  {(() => {
    const v63 = variants1.find(v => v.bezugAge === 63)
    const v65 = variants1.find(v => v.bezugAge === 65)
    const v67 = variants1.find(v => v.bezugAge === 67)
    if (!v63 || !v65 || !v67) return null
    const be63vs65 = calculateBreakEven(v63.monthlyRente, 63, v65.monthlyRente, 65)
    const be65vs67 = calculateBreakEven(v65.monthlyRente, 65, v67.monthlyRente, 67)
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        {be63vs65 && <div style={{ padding: '10px 14px', background: 'var(--ink-50)', borderRadius: 8, fontSize: 12.5, color: 'var(--ink-600)' }}>
          Break-even Vorbezug 63 vs. ordentlich 65: <strong>Alter {be63vs65}</strong> — Wer dieses Alter überschreitet, verliert durch den Vorbezug.
        </div>}
        {be65vs67 && <div style={{ padding: '10px 14px', background: 'var(--ink-50)', borderRadius: 8, fontSize: 12.5, color: 'var(--ink-600)' }}>
          Break-even ordentlich 65 vs. Aufschub 67: <strong>Alter {be65vs67}</strong> — Ab diesem Alter hat sich der Aufschub ausgezahlt.
        </div>}
      </div>
    )
  })()}
</section>

{/* Frühpensionierung hinweisbox */}
{ra1 < 65 && (
  <section className="block" style={{ border: '2px solid #fde68a', background: '#fffbeb' }}>
    <div className="block-head">
      <h2 className="block-title" style={{ color: '#92400e' }}><span className="block-num" style={{ background: '#f59e0b', color: 'white' }}>!</span>Frühpensionierung – Einkommenslücke</h2>
    </div>
    <div style={{ fontSize: 13.5, color: '#7c2d12', lineHeight: 1.7, marginBottom: 14 }}>
      Zwischen Ihrer Pensionierung (Alter {ra1}) und dem AHV-Bezug (Alter {p1.ahvBezugAge || 65}) besteht eine Einkommenslücke von <strong>{(p1.ahvBezugAge || 65) - ra1} {(p1.ahvBezugAge || 65) - ra1 === 1 ? 'Jahr' : 'Jahren'}</strong>, in der weder Erwerbseinkommen noch AHV-Rente fliessen.
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <div style={{ padding: '12px 14px', background: 'white', borderRadius: 10, border: '1px solid #fde68a' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 6 }}>AHV-Nichterwerbstätigenbeiträge</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#d97706' }}>
          ca. CHF {fmtCHF(ahvNonEmployed.annualContribution)}/Jahr
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>Pflichtbeiträge während Nichterwerbstätigkeit</div>
      </div>
      <div style={{ padding: '12px 14px', background: 'white', borderRadius: 10, border: '1px solid #fde68a' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 6 }}>Überbrückungskapital benötigt</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#d97706' }}>
          ca. CHF {fmtCHF(bridgingCapitalNeeds.capitalNeeded)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>Aus Vermögen für {bridgingGap.gapYears} Jahre Überbrückung</div>
      </div>
    </div>
    <div style={{ marginTop: 10, fontSize: 12, color: '#92400e', padding: '10px', background: 'rgba(255,255,255,0.5)', borderRadius: 8 }}>
      💡 Möglichkeiten: AHV-Vorbezug (Kürzung beachten) · PK-Überbrückungsrente anfragen · Vermögensverzehr · Teilzeitarbeit
    </div>
  </section>
)}

        </>)} {/* end AHV tab */}

        {/* ── Tab: PK & Kapital ── */}
        {activeTab === 'pk' && (<>

{/* Central statement */}
<div style={{ textAlign: 'center', padding: '24px 16px 20px' }}>
  <div style={{ fontSize: 12, color: 'var(--ink-400)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
    Pensionskasse – 2. Säule
  </div>
  <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--navy-800)', lineHeight: 1.2, marginBottom: 8 }}>
    {p1.hasPK ? `PK-Guthaben: CHF ${fmtCHF(p1.pkCapital ?? 0)}` : 'Keine Pensionskasse erfasst'}
  </div>
  {p1.hasPK && (
    <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>
      Umwandlungssatz {p1.pkRate ?? 5.4}% · Monatsrente: CHF {fmtCHF(Math.round((p1.pkCapital ?? 0) * ((p1.pkRate ?? 5.4) / 100) / 12))}
    </div>
  )}
</div>

{/* 3 Bezugsform cards */}
{p1.hasPK && (
<section className="block">
  <div className="block-head">
    <h2 className="block-title"><span className="block-num">B</span>Bezugsform wählen</h2>
    <span className="block-hint">Klicken Sie, um Ihre Wahl zu treffen</span>
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
    {([
      {
        id: 'rente' as const,
        label: 'Rente',
        icon: '🏛️',
        amount: `CHF ${fmtCHF(Math.round((p1.pkCapital ?? 0) * ((p1.pkRate ?? 5.4) / 100) / 12))}/Mt.`,
        desc: 'Lebenslange Rente',
        pros: ['Sicherheit & Planbarkeit', 'Lebenslang garantiert'],
        cons: ['Kein Restkapital für Erben', 'Besteuert als Einkommen'],
      },
      {
        id: 'kapital' as const,
        label: 'Kapital',
        icon: '💼',
        amount: `CHF ${fmtCHF(p1.pkCapital ?? 0)}`,
        desc: 'Einmalige Auszahlung',
        pros: ['Flexibilität', 'Vererbbar'],
        cons: ['Anlagerisiko trägt man selbst', 'Einmalige Kapitalsteuer'],
      },
      {
        id: 'mix' as const,
        label: 'Mischform',
        icon: '⚖️',
        amount: `CHF ${fmtCHF(Math.round((p1.pkCapital ?? 0) / 2 * ((p1.pkRate ?? 5.4) / 100) / 12))}/Mt. + CHF ${fmtK(Math.round((p1.pkCapital ?? 0) / 2))} Kapital`,
        desc: '50% Rente / 50% Kapital',
        pros: ['Ausgewogene Lösung', 'Teilsicherheit + Flexibilität'],
        cons: ['Kleinere Rente', 'Kleineres Kapital'],
      },
    ] as const).map(opt => {
      const isSelected = pkChoice === opt.id
      return (
        <div
          key={opt.id}
          onClick={() => setPkChoice(opt.id)}
          style={{
            background: isSelected ? 'var(--navy-50)' : 'var(--surface)',
            border: `2px solid ${isSelected ? 'var(--navy-600)' : 'var(--ink-200)'}`,
            borderRadius: 12, padding: '16px 14px', cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
        >
          <div style={{ fontSize: 20, marginBottom: 6 }}>{opt.icon}</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy-800)', marginBottom: 4 }}>{opt.label}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: isSelected ? 'var(--navy-700)' : 'var(--ink-600)', marginBottom: 6 }}>{opt.amount}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 8 }}>{opt.desc}</div>
          {opt.pros.map((p, i) => <div key={i} style={{ fontSize: 11, color: '#15803d', marginBottom: 1 }}>✓ {p}</div>)}
          {opt.cons.map((c, i) => <div key={i} style={{ fontSize: 11, color: '#dc2626', marginBottom: 1 }}>✗ {c}</div>)}
          {isSelected && (
            <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: 'var(--navy-700)', background: 'var(--navy-100)', borderRadius: 6, padding: '3px 8px', display: 'inline-block' }}>✓ Gewählt</div>
          )}
        </div>
      )
    })}
  </div>

  {/* Capital withdrawal tax info */}
  {pkChoice !== 'rente' && capitalTaxResult && (
    <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, marginBottom: 16, fontSize: 13, color: '#92400e' }}>
      <strong>Kapitalauszahlungssteuer:</strong> CHF {fmtCHF(capitalTaxResult.result.totalTax)} auf CHF {fmtCHF(capitalTaxResult.amount)}
      → Netto: <strong>CHF {fmtCHF(capitalTaxResult.result.netAmount)}</strong>
    </div>
  )}

  {/* Break-even chart */}
  {rvkResult && rvkChartData.length > 0 && (
    <>
      <div style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 8 }}>
        <strong>Break-even:</strong> Ab Alter {rvkBreakEven ?? '?'} hat die Rente mehr ausbezahlt als das Kapital (bei {(rvkReturnRate * 100).toFixed(1)}% Rendite auf Kapital).
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={rvkChartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-100)" />
          <XAxis dataKey="age" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={v => fmtK(v)} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => [`CHF ${fmtCHF(v)}`, '']} labelFormatter={l => `Alter ${l}`} contentStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="rente" stroke="#15803d" strokeWidth={2} dot={false} name="Kum. Rente" />
          <Line type="monotone" dataKey="kapital" stroke="var(--navy-700)" strokeWidth={2} dot={false} name="Kapital-Restbetrag" />
          {rvkBreakEven && <ReferenceLine x={rvkBreakEven} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: `Alter ${rvkBreakEven}`, fill: '#d97706', fontSize: 10 }} />}
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </LineChart>
      </ResponsiveContainer>
    </>
  )}

  {/* Early retirement PK bridging hint */}
  {ra1 < 65 && (
    <div style={{ marginTop: 12, padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 13, color: '#92400e' }}>
      <strong>Frühpensionierung:</strong> Viele Pensionskassen bieten eine <strong>Überbrückungsrente</strong> bis AHV-Bezug (65). Erkundigen Sie sich bei Ihrer PK, ob und in welcher Höhe diese verfügbar ist.
    </div>
  )}
</section>
)}
{!p1.hasPK && (
  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-400)' }}>
    <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
    <p style={{ fontSize: 14 }}>Keine Pensionskasse erfasst. Geben Sie Ihre PK-Daten in Schritt 1 ein.</p>
  </div>
)}

        </>)} {/* end PK & Kapital tab */}

        {/* ── Tab: Steuern ── */}
        {activeTab === 'steuern' && (<>

{/* Central statement */}
<div style={{ textAlign: 'center', padding: '24px 16px 20px' }}>
  <div style={{ fontSize: 12, color: 'var(--ink-400)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
    Steueranalyse
  </div>
  <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--navy-800)', lineHeight: 1.2, marginBottom: 8 }}>
    Geschätzte Steuerbelastung im Ruhestand: CHF {fmtCHF((retirementTax1?.monthlyTax ?? 0) * 12)}/Jahr
  </div>
  <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>
    Kanton {canton} · {kirchensteuer ? 'mit' : 'ohne'} Kirchensteuer · {taxStatus === 'verheiratet' ? 'Verheiratet' : 'Ledig'}
  </div>
</div>

{/* KPI Cards */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 12px', textAlign: 'center' }}>
    <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 6, fontWeight: 500 }}>Steuerbelastung heute</div>
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#dc2626' }}>
      {incomeTax1 ? `${(incomeTax1.effectiveRate * 100).toFixed(1)}%` : '—'}
    </div>
    <div style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 4 }}>
      {incomeTax1 ? `CHF ${fmtCHF(incomeTax1.totalTax)}/Jahr` : 'Einkommen nicht erfasst'}
    </div>
  </div>
  <div style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 12px', textAlign: 'center' }}>
    <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 6, fontWeight: 500 }}>Steuerbelastung im Alter</div>
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#16a34a' }}>
      {(retirementTax1.effectiveRate * 100).toFixed(1)}%
    </div>
    <div style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 4 }}>CHF {fmtCHF(retirementTax1.totalTax)}/Jahr</div>
  </div>
  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '16px 12px', textAlign: 'center' }}>
    <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 6, fontWeight: 500 }}>3a Steuerersparnis/Jahr</div>
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--navy-700)' }}>
      {thirdPillar1 ? `CHF ${fmtCHF(thirdPillar1.annualSaving)}` : '—'}
    </div>
    <div style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 4 }}>
      {thirdPillar1 ? 'bei jährlicher Einzahlung' : 'Keine Säule 3a erfasst'}
    </div>
  </div>
</div>

{/* A: PK-Bezugsvarianten */}
{p1.hasPK && p1.pkCapital > 0 && pkVariantTax && (
<section className="block">
  <div className="block-head">
    <h2 className="block-title"><span className="block-num">A</span>PK-Bezug: Steuerlicher Variantenvergleich</h2>
    <span className="block-hint">100% Rente / 100% Kapital / 50/50 Mix</span>
  </div>

  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
    {/* 100% Rente */}
    <div style={{ padding: '14px', background: '#f0f9ff', border: `2px solid ${pkChoice === 'rente' ? 'var(--navy-600)' : '#bae6fd'}`, borderRadius: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy-700)', marginBottom: 8 }}>100% Rente</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-800)', marginBottom: 2 }}>
        CHF {fmtCHF(pkVariantTax.rente.annual)}<span style={{ fontSize: 10, fontWeight: 400 }}>/Jahr</span>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-500)', lineHeight: 1.4 }}>Laufende Steuer<br/>(AHV + PK als Einkommen)</div>
      {pkChoice === 'rente' && <div style={{ fontSize: 10, color: 'var(--navy-600)', marginTop: 6, fontWeight: 600 }}>✓ Ihre Wahl</div>}
    </div>
    {/* 100% Kapital */}
    <div style={{ padding: '14px', background: '#fef2f2', border: `2px solid ${pkChoice === 'kapital' ? '#dc2626' : '#fecaca'}`, borderRadius: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>100% Kapital</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy-800)', marginBottom: 1 }}>
        CHF {fmtCHF(pkVariantTax.kapital.oneTime)}<span style={{ fontSize: 10, fontWeight: 400 }}> einmalig</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 4 }}>
        + CHF {fmtCHF(pkVariantTax.kapital.annual)}<span style={{ fontSize: 10 }}>/Jahr laufend</span>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-500)', lineHeight: 1.4 }}>Kapitalbezugssteuer<br/>+ nur AHV-Steuer</div>
      {pkChoice === 'kapital' && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 6, fontWeight: 600 }}>✓ Ihre Wahl</div>}
    </div>
    {/* 50/50 Mix */}
    <div style={{ padding: '14px', background: '#fffbeb', border: `2px solid ${pkChoice === 'mix' ? '#d97706' : '#fde68a'}`, borderRadius: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#d97706', marginBottom: 8 }}>50/50 Mix</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy-800)', marginBottom: 1 }}>
        CHF {fmtCHF(pkVariantTax.mix.oneTime)}<span style={{ fontSize: 10, fontWeight: 400 }}> einmalig</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 4 }}>
        + CHF {fmtCHF(pkVariantTax.mix.annual)}<span style={{ fontSize: 10 }}>/Jahr laufend</span>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-500)', lineHeight: 1.4 }}>50% Kapital, 50% Rente</div>
      {pkChoice === 'mix' && <div style={{ fontSize: 10, color: '#d97706', marginTop: 6, fontWeight: 600 }}>✓ Ihre Wahl</div>}
    </div>
  </div>

  {/* 20-year cumulative chart */}
  {pkCumulativeTaxData.length > 0 && (
    <>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 8 }}>
        Kumulierte Steuerbelastung über 20 Jahre
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={pkCumulativeTaxData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-100)" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--ink-400)' }} label={{ value: 'Jahre ab Pensionierung', position: 'insideBottomRight', offset: -4, fontSize: 10 }} />
          <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: 'var(--ink-400)' }} width={52} />
          <Tooltip
            formatter={(v: number, name: string) => [`CHF ${fmtCHF(v)}`, name === 'rente' ? '100% Rente' : name === 'kapital' ? '100% Kapital' : '50/50 Mix']}
            labelFormatter={(l: number) => `Jahr ${l}`}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Line type="monotone" dataKey="rente" stroke="#1a2b4a" strokeWidth={2} dot={false} name="rente" />
          <Line type="monotone" dataKey="kapital" stroke="#dc2626" strokeWidth={2} dot={false} name="kapital" />
          <Line type="monotone" dataKey="mix" stroke="#d97706" strokeWidth={2} dot={false} name="mix" />
          <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => v === 'rente' ? '100% Rente' : v === 'kapital' ? '100% Kapital' : '50/50 Mix'} />
        </LineChart>
      </ResponsiveContainer>
      {(() => {
        const crossover = pkCumulativeTaxData.find((d, i) => i > 0 && d.kapital > d.rente)
        return crossover ? (
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, fontSize: 12, color: 'var(--navy-700)' }}>
            Break-even bei Jahr {crossover.year} (Alter {ra1 + crossover.year}): Ab dann übersteigen die kumulierten Rentensteuern die einmalige Kapitalbezugssteuer. Kapitalbezug ist steuerlich vorteilhaft bei kürzerer Lebenserwartung.
          </div>
        ) : (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-500)', fontStyle: 'italic' }}>
            Kein Crossover innerhalb 20 Jahre — laufende Rentensteuer bleibt dauerhaft tiefer als Kapitalbezugssteuer.
          </div>
        )
      })()}
    </>
  )}
</section>
)}

{/* B: Gestaffelter Bezug */}
{withdrawalPlan.hasAnything && (
<section className="block">
  <div className="block-head">
    <h2 className="block-title"><span className="block-num">B</span>Gestaffelter Bezug – Steueroptimierung</h2>
    {withdrawalPlan.savings > 0 && (
      <span className="block-hint" style={{ color: 'var(--green-600)', fontWeight: 600 }}>CHF {fmtCHF(withdrawalPlan.savings)} Ersparnis</span>
    )}
  </div>

  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
    <div style={{ padding: '14px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 4 }}>Alles im gleichen Jahr</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#dc2626' }}>CHF {fmtCHF(withdrawalPlan.worst.totalTax)}</div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-400)', marginTop: 2 }}>Steuer auf CHF {fmtCHF(withdrawalPlan.worst.totalGross)}</div>
    </div>
    <div style={{ padding: '14px 16px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 4 }}>Optimal gestaffelt</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#16a34a' }}>CHF {fmtCHF(withdrawalPlan.optimal.totalTax)}</div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-400)', marginTop: 2 }}>Netto: CHF {fmtCHF(withdrawalPlan.optimal.totalNet)}</div>
    </div>
  </div>

  {withdrawalPlan.savings > 0 && (
    <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#166534', marginBottom: 14, fontWeight: 600 }}>
      Durch Staffelung sparen Sie ca. CHF {fmtCHF(withdrawalPlan.savings)} Steuern
    </div>
  )}

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
    <strong>Hinweis:</strong> Steuern basieren auf der Sätzchen-Methode und ESTV-Richtwerten für Kanton {CANTON_NAMES[canton] || canton}. PK-Kapital wird im Pensionierungsjahr bezogen, 3a und FZ möglichst gestaffelt in Vorjahren.
  </div>
</section>
)}

{/* C: Frühpensionierung (nur wenn relevant) */}
{ra1 < 65 && (
<section className="block">
  <div className="block-head">
    <h2 className="block-title"><span className="block-num">C</span>Frühpensionierung: Steuerliche Auswirkungen</h2>
    <span className="block-hint">Nur relevant bei Pensionierung vor Alter 65</span>
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
    <div style={{ padding: '14px 16px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 4 }}>Tiefere Einkommenssteuer</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#16a34a' }}>
        {incomeTax1 ? `CHF ${fmtCHF(incomeTax1.totalTax - retirementTax1.totalTax)}` : '—'}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-400)', marginTop: 2 }}>Ersparnis gegenüber Erwerbstätigkeit</div>
    </div>
    <div style={{ padding: '14px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 4 }}>Lücke bis AHV-Bezug</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#d97706' }}>
        {65 - ra1} Jahr{65 - ra1 !== 1 ? 'e' : ''}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-400)', marginTop: 2 }}>ohne AHV-Einnahmen (bis Alter 65)</div>
    </div>
  </div>
  <div style={{ padding: '12px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, fontSize: 13, color: '#7c2d12' }}>
    <strong>AHV-Beiträge als Nichterwerbstätige/r:</strong> Ab Pensionierung bis AHV-Bezug (Alter 65) sind AHV-Beiträge als Nichterwerbstätige/r geschuldet. Diese richten sich nach Vermögen und Rente und betragen mindestens CHF 530/Jahr (2026). Je nach Vermögen kann dies mehrere Tausend Franken ausmachen. Zudem sollten Sie die PK-Rente auf die Vorpensionierungszeit abstimmen.
  </div>
  <div style={{ marginTop: 10, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#7f1d1d' }}>
    <strong>Vermögenssteuer:</strong> Auf Ihrem Kapitalvermögen fallen im Kanton {CANTON_NAMES[canton] || canton} Vermögenssteuern an (ca. {((CONSTANTS.VERMÖGENSSTEUER_SATZ[canton] ?? 0.002) * 1000).toFixed(1)}‰). Bei CHF {fmtCHF(wdInitialWealth)} Vermögen wären das ca. CHF {fmtCHF(Math.round(wdInitialWealth * (CONSTANTS.VERMÖGENSSTEUER_SATZ[canton] ?? 0.002)))}/Jahr.
  </div>
</section>
)}

{/* D: Steuerdetails (collapsible) */}
        <section className="block" style={{ background: '#fafafa', border: '1px solid var(--ink-200)' }}>
  <div className="block-head" style={{ cursor: 'pointer' }} onClick={() => setTaxExpanded(!taxExpanded)}>
    <h2 className="block-title"><span className="block-num">D</span>Steuerdetails &amp; Optimierung</h2>
    <span className="block-hint">{taxExpanded ? '▲ Einklappen' : '▼ Ausklappen · Alle Steuerberechnungen'}</span>
  </div>

  {taxExpanded && (
    <>
      {/* Sub A: Einkommenssteuer heute */}
              {incomeTax1 && (
                <div style={{ marginBottom: 10 }}>
                  <button
                    style={{ width: '100%', background: 'none', border: '1px solid var(--ink-200)', borderRadius: taxSubA ? '10px 10px 0 0' : 10, padding: '12px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => setTaxSubA(!taxSubA)}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy-800)' }}>A · Einkommenssteuer heute{hasPartner ? ' (Haushalt)' : ''}</span>
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

        </>)} {/* end Steuern & 3a tab */}

        {/* ── Tab: Entscheidungen ── */}
        {activeTab === 'entscheidungen' && (<>

{/* Central statement */}
<div style={{ textAlign: 'center', padding: '24px 16px 16px' }}>
  <div style={{ fontSize: 12, color: 'var(--ink-400)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
    Meine Entscheidungen
  </div>
  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--navy-800)', lineHeight: 1.2, marginBottom: 8 }}>
    Ihre gewählte Vorsorgestrategie im Überblick
  </div>
</div>

{/* Decision summary cards */}
<section className="block">
  <div className="block-head">
    <h2 className="block-title"><span className="block-num">E</span>Gewählte Strategie</h2>
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
    {[
      { label: 'Pensionierungsalter', value: `Alter ${ra1}`, icon: '🎯' },
      { label: 'AHV-Bezug', value: p1.ahvBezugAge < 65 ? `Vorbezug Alter ${p1.ahvBezugAge}` : p1.ahvBezugAge > 65 ? `Aufschub Alter ${p1.ahvBezugAge}` : 'Ordentlich Alter 65', icon: '🏛️' },
      { label: 'PK-Bezugsform', value: pkChoice === 'rente' ? 'Vollrente' : pkChoice === 'kapital' ? 'Kapitalbezug' : pkChoice === 'mix' ? 'Mischform 50/50' : 'Noch nicht gewählt', icon: '🏢' },
      { label: 'Vermögensstrategie', value: wealthInvestmentProfile === 'konto' ? 'Sparkonto (0.75%)' : wealthInvestmentProfile === 'conservative' ? 'Konservativ (2.5%)' : wealthInvestmentProfile === 'balanced' ? 'Ausgewogen (3.5%)' : 'Wachstum (5%)', icon: '📈' },
    ].map((item, i) => (
      <div key={i} style={{ padding: '14px 16px', background: 'var(--ink-50)', border: '1px solid var(--ink-200)', borderRadius: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 4 }}>{item.icon} {item.label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy-800)' }}>{item.value}</div>
      </div>
    ))}
  </div>

  {/* Result summary */}
  <div style={{ padding: '16px 20px', background: verdictBg, border: `1px solid ${verdictBorder}`, borderRadius: 12, marginBottom: 16 }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-500)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ergebnis Ihrer Strategie</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 4 }}>Monatl. Einnahmen</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#15803d' }}>CHF {fmtCHF(analysis.monthlyIncome.total)}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 4 }}>Startvermögen</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--navy-700)' }}>CHF {fmtK(wdInitialWealth)}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 4 }}>Vermögen reicht bis</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: verdictColor }}>
          {(displayAgeWhenBroke ?? 99) >= 99 ? 'Alter 95+' : `Alter ${displayAgeWhenBroke}`}
        </div>
      </div>
    </div>
  </div>
</section>

{/* Top-3 recommendations */}
{top3recs.length > 0 && (
<section className="block">
  <div className="block-head">
    <h2 className="block-title"><span className="block-num">M</span>Top-3 Massnahmen</h2>
    <span className="block-hint">Orientierungshilfe – keine persönliche Empfehlung</span>
  </div>
  <div style={{ display: 'grid', gap: 10 }}>
    {top3recs.map((rec, i) => {
      const isExpanded = expandedRecs.has(i)
      const priorityColor = rec.priority === 'hoch' ? '#dc2626' : rec.priority === 'mittel' ? '#d97706' : '#16a34a'
      const priorityBg = rec.priority === 'hoch' ? '#fef2f2' : rec.priority === 'mittel' ? '#fffbeb' : '#ecfdf5'
      const priorityBorder = rec.priority === 'hoch' ? '#fecaca' : rec.priority === 'mittel' ? '#fde68a' : '#bbf7d0'
      return (
        <div key={i} style={{ padding: '14px 16px', background: priorityBg, border: `1px solid ${priorityBorder}`, borderRadius: 10 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: priorityColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, color: 'var(--ink-800)', lineHeight: 1.5, fontWeight: 600 }}>{rec.text}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 4, fontStyle: 'italic' }}>Orientierungshilfe – keine persönliche Empfehlung.</div>
              {rec.detail && (
                <button onClick={() => toggleRec(i)} style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-400)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
                  {isExpanded ? '▲ Weniger' : '▼ Details'}
                </button>
              )}
              {isExpanded && rec.detail && (
                <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(255,255,255,0.8)', borderRadius: 8, fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.6 }}>
                  {rec.detail}
                </div>
              )}
            </div>
          </div>
        </div>
      )
    })}
  </div>
</section>
)}

{/* Action buttons */}
<section className="block">
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
    <button
      onClick={handlePDF}
      disabled={pdfLoading}
      style={{
        flex: 1, minWidth: 200, padding: '14px 24px', background: 'var(--navy-700)', color: 'white',
        border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: pdfLoading ? 'wait' : 'pointer',
        opacity: pdfLoading ? 0.7 : 1,
      }}
    >
      {pdfLoading ? 'PDF wird erstellt...' : '📄 Analyse als PDF herunterladen'}
    </button>
    <button
      onClick={() => setActiveTab('szenarien')}
      style={{
        flex: 1, minWidth: 180, padding: '14px 24px', background: 'var(--surface)',
        color: 'var(--navy-700)', border: '2px solid var(--navy-200)', borderRadius: 10,
        fontSize: 14, fontWeight: 600, cursor: 'pointer',
      }}
    >
      ↩ Szenario anpassen
    </button>
  </div>
  {pdfError && <div style={{ marginTop: 8, fontSize: 13, color: '#dc2626' }}>{pdfError}</div>}
  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-400)', lineHeight: 1.6 }}>
    ℹ️ WealthWise ist ein Informationstool und keine Finanz-, Steuer- oder Rechtsberatung. Alle Berechnungen sind Schätzungen basierend auf Ihren Angaben. Bitte konsultieren Sie eine Fachperson für verbindliche Entscheidungen.
  </div>
</section>

        </>)} {/* end Entscheidungen tab */}

        </div> {/* end tab content */}

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
        </div>
      </div>

      <ChatPanel currentStep="analyse" />
    </div>
  )
}
