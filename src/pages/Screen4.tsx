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
  CANTONAL_TAX_URLS, CANTON_NAMES,
} from '../lib/tax'
import type { TaxCivilStatus } from '../lib/tax'
import { applyEventsToProjection, getEventImpactSummary } from '../utils/lifeEventCalculation'
import { CATEGORY_CONFIG } from '../types/lifeEvents'
import { calculateProAnalysis, calculateScenarios } from '../lib/cashflow'
import { exportPDF } from '../lib/pdf'

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
  const { expenses, person1, person2, hasPartner, location, freeAssets, property, kirchensteuer, lifeEvents } = state
  const [showCashflowTable, setShowCashflowTable] = useState(false)
  const [expandedRecs, setExpandedRecs] = useState<Set<number>>(new Set())

  const { p1, p2, civilStatus } = useMemo(() => getPersonsForCalc(state), [state])

  const monthlyBudget = useMemo(() => {
    if (expenses.simpleTotal > 0) return expenses.simpleTotal
    if (expenses.mode === 'detailed') {
      const CATS = ['wohnen', 'gesundheit', 'nahrung', 'mobilitaet', 'freizeit', 'bekleidung', 'kommunikation', 'uebrige']
      const DEFAULTS: Record<string, number> = { wohnen: 1476, gesundheit: 615, nahrung: 1080, mobilitaet: 650, freizeit: 580, bekleidung: 180, kommunikation: 200, uebrige: 600 }
      return CATS.reduce((s, id) => s + (expenses.detailed[id] ?? DEFAULTS[id]), 0)
    }
    return 4000
  }, [expenses])

  const inputData = useMemo(() => ({
    person1: p1,
    person2: p2,
    civilStatus,
    freeAssets: freeAssets || 0,
    monthlyExpenses: monthlyBudget,
    hasProperty: property.has,
    monthlyMortgageCost: property.has ? property.mortgage : 0,
  }), [p1, p2, civilStatus, freeAssets, monthlyBudget, property])

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
  const canton = location?.kanton ?? 'ZH'
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

  const [taxExpanded, setTaxExpanded] = useState(false)
  const [taxSubA, setTaxSubA] = useState(false)
  const [taxSubB, setTaxSubB] = useState(false)
  const [taxSubC, setTaxSubC] = useState(false)
  const [taxSubD, setTaxSubD] = useState(false)
  const [taxSubE, setTaxSubE] = useState(false)
  const [taxSubF, setTaxSubF] = useState(false)

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
    await exportPDF({
      person1Name: person1.name || 'Person 1',
      person2Name: hasPartner ? (person2.name || 'Person 2') : undefined,
      location: location || undefined,
      retirementAge1: ra1,
      analysis,
      monthlyBudget,
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

        {/* Verdict Hero */}
        <section className="block" style={{ background: verdictBg, border: `1px solid ${verdictBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <ScoreRing score={analysis.sustainabilityScore} verdict={analysis.verdict} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 4 }}>Nachhaltigkeits-Score</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: verdictColor, marginBottom: 6 }}>
                {verdictLabel}
              </div>
              <div style={{ fontSize: 14, color: 'var(--ink-600)', marginBottom: 8 }}>
                Monatliche Renten: <strong>CHF {fmtCHF(analysis.monthlyIncome.total)}</strong>
                {' · '}Budget: <strong>CHF {fmtCHF(monthlyBudget)}</strong>
              </div>
              {/* Coverage percentage */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', borderRadius: 20,
                background: coveragePct >= 100 ? 'var(--green-100)' : '#fef2f2',
                border: `1px solid ${coveragePct >= 100 ? 'var(--green-300)' : '#fecaca'}`,
              }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18,
                  color: coveragePct >= 100 ? 'var(--green-700)' : '#dc2626',
                }}>{coveragePct}%</span>
                <span style={{ fontSize: 12.5, color: 'var(--ink-600)' }}>
                  Ihres Bedarfs durch Renten gedeckt
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                <span style={{ fontSize: 14, color: analysis.surplus >= 0 ? 'var(--green-600)' : 'var(--red-500)', fontWeight: 600 }}>
                  {analysis.surplus >= 0 ? 'Vorsorgeüberschuss' : 'Vorsorgelücke'}:
                  {' '}{analysis.surplus >= 0 ? '+' : ''}CHF {fmtCHF(analysis.surplus)}/Mt.
                </span>
              </div>
              {analysis.ageWhenBroke && !hasEnabledEvents && (
                <div style={{ marginTop: 6, fontSize: 13, color: 'var(--red-500)' }}>
                  ⚠ Vermögen reicht bis ca. Alter {analysis.ageWhenBroke}
                </div>
              )}
              {!analysis.ageWhenBroke && !hasEnabledEvents && (
                <div style={{ marginTop: 6, fontSize: 13, color: 'var(--green-600)' }}>
                  ✓ Vermögen reicht bis Alter 95+
                </div>
              )}
              {hasEnabledEvents && (
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ fontSize: 13, color: analysis.ageWhenBroke ? 'var(--red-500)' : 'var(--green-600)' }}>
                    {analysis.ageWhenBroke
                      ? `Ohne Ereignisse: bis Alter ${analysis.ageWhenBroke}`
                      : 'Ohne Ereignisse: bis Alter 95+'}
                  </div>
                  <div style={{ fontSize: 13, color: ageWhenBrokeWithEvents ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>
                    {ageWhenBrokeWithEvents
                      ? `Mit Ereignissen: bis Alter ${ageWhenBrokeWithEvents} ⚠`
                      : 'Mit Ereignissen: bis Alter 95+ ✓'}
                  </div>
                  {ageWhenBrokeWithEvents && !analysis.ageWhenBroke && (
                    <div style={{ fontSize: 12, color: '#dc2626' }}>
                      Geplante Ausgaben CHF {fmtCHF(eventsImpact.totalOutflow)} verkürzen die Reichweite.
                    </div>
                  )}
                </div>
              )}
            </div>
            <button className="btn btn-primary" onClick={handlePDF} style={{ alignSelf: 'flex-start', whiteSpace: 'nowrap' }}>
              ↓ Analyse als PDF
            </button>
          </div>
        </section>

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
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-400)', fontSize: 14 }}>
              Bitte geben Sie Geburtsdatum und Pensionierungsalter in Schritt 1 ein.
            </div>
          )}
        </section>

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
          )}
        </section>

        {/* AHV Detail */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">E</span>AHV-Details</h2>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              { name: person1.name || 'Person 1', data: analysis.ahv.person1 },
              ...(hasPartner && analysis.ahv.person2 ? [{ name: person2.name || 'Person 2', data: analysis.ahv.person2 }] : []),
            ].map((item) => (
              <div key={item.name} style={{
                padding: '14px 16px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)',
                borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy-800)' }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>
                    Ø-Einkommen: CHF {fmtCHF(item.data.avgIncomeUsed || 0)} · 44 Beitragsjahre
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--navy-800)' }}>
                    CHF {fmtCHF(item.data.monthlyRente)}/Mt.
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                    CHF {fmtCHF(item.data.yearlyInkl13)}/Jahr (inkl. 13.)
                  </div>
                </div>
              </div>
            ))}
            {analysis.ahv.plafonReduction > 0 && (
              <div style={{ padding: '10px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 13, color: 'var(--ink-600)' }}>
                Ehepaar-Plafonierung: −CHF {fmtCHF(analysis.ahv.plafonReduction)}/Mt. (max. 150% der Maximalrente)
              </div>
            )}
          </div>
        </section>

        {/* Recommendations */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">F</span>Handlungsempfehlungen</h2>
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
