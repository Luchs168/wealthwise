import jsPDF from 'jspdf'
import type { ProAnalysisResult } from './cashflow'

export interface PdfData {
  person1Name: string
  person2Name?: string
  location?: { plz: string; ort: string; kanton: string }
  retirementAge1: number
  retirementAge2?: number
  analysis: ProAnalysisResult
  monthlyBudget: number
  surplusAfterTax?: number
  displayPkMonthly?: number
  retirementTaxMonthly?: number
  freeAssets?: number
  riskProfile?: 'conservative' | 'balanced' | 'growth'
  canton?: string
  kirchensteuer?: boolean
  wealthAtRetirement?: number
  depletionAge?: number | null
  pkCapital1?: number
  pkRate1?: number
  balance3a1?: number
  fzBalance1?: number
  hasProperty?: boolean
  propertyValue?: number
  hasPK?: boolean
  scenarios?: {
    optimistic: ProAnalysisResult
    neutral: ProAnalysisResult
    pessimistic: ProAnalysisResult
  }
  wealthBreakdown?: {
    sparkontoProj: number
    wertProj: number
    p3a: number
    pkCap: number
    fzCap: number
    propEquity: number
    accSavings: number
    total: number
  }
  ahvChoiceLabel?: string
  pkChoiceLabel?: string
  withdrawalStrategyLabel?: string
  taxData?: {
    annualRetirementTax: number
    marginalRate: number
    pkVariant?: {
      rente: { annual: number }
      kapital: { oneTime: number; annual: number }
      mix: { oneTime: number; annual: number }
    }
    thirdPillarSavings?: number
    thirdPillarWorstTax?: number
    thirdPillarOptimalTax?: number
  }
  pkEinkaufData?: {
    proJahr: number
    effJahre: number
    total: number
    taxSaving: number
    marginalRate: number
    renteMonatBefore: number
    renteMonatAfter: number
  }
}

// ─── Colour palette ────────────────────────────────────────────────────────
const NAVY   = [26, 43, 74]    as [number, number, number]
const NAVY2  = [46, 72, 120]   as [number, number, number]
const GREEN  = [21, 128, 61]   as [number, number, number]
const RED    = [185, 28, 28]   as [number, number, number]
const AMBER  = [146, 64, 14]   as [number, number, number]
const WHITE  = [255, 255, 255] as [number, number, number]
const INK    = [15, 23, 42]    as [number, number, number]
const INK5   = [100, 116, 139] as [number, number, number]
const INK1   = [248, 250, 252] as [number, number, number]
const BORDER = [226, 232, 240] as [number, number, number]

const W = 210
const PAGE_H = 297
const ML = 18
const MR = 18
const CW = W - ML - MR

// ─── PDF-safe number formatter (ASCII apostrophe, no Unicode) ─────────────
function fmt(n: number): string {
  const abs = Math.abs(Math.round(n))
  const s = String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, "'")
  return s
}

function fmtCHF(n: number): string {
  return fmt(n)
}

export async function exportPDF(data: PdfData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { analysis } = data

  const verdictColor = analysis.verdict === 'green' ? GREEN : analysis.verdict === 'yellow' ? AMBER : RED
  const verdictLabel = analysis.verdict === 'green' ? 'Gut aufgestellt' : analysis.verdict === 'yellow' ? 'Anpassungen empfohlen' : 'Handlungsbedarf'

  const ahvMonthlyInkl13 = Math.round(analysis.ahv.combinedYearlyInkl13 / 12)
  const pkMonthlyDisplay = data.displayPkMonthly ?? analysis.pk.combinedMonthly
  const effectiveTotalMonthly = ahvMonthlyInkl13 + pkMonthlyDisplay

  const surplus = data.surplusAfterTax ?? analysis.surplus
  const names = data.person2Name ? `${data.person1Name} & ${data.person2Name}` : data.person1Name
  const dateStr = new Date().toLocaleDateString('de-CH')
  const riskLabel = data.riskProfile === 'conservative' ? 'Konservativ' : data.riskProfile === 'growth' ? 'Wachstum' : 'Ausgewogen'

  let y = 0
  let currentPage = 1

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function pageHeader(pageNum: number) {
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, W, PAGE_H, 'F')
    doc.setFillColor(...NAVY)
    doc.rect(0, 0, W, 12, 'F')
    doc.setFillColor(...NAVY2)
    doc.rect(0, 12, W, 2, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('WealthWise', ML, 8)
    doc.setFont('helvetica', 'normal')
    doc.text('Personliche Vorsorgeanalyse', ML + 22, 8)
    doc.setTextColor(160, 190, 220)
    doc.text(names, W / 2, 8, { align: 'center' })
    doc.text(`${dateStr} - Seite ${pageNum}`, W - MR, 8, { align: 'right' })
    y = 22
  }

  function addPage() {
    doc.addPage()
    currentPage++
    pageHeader(currentPage)
  }

  function checkBreak(needed: number) {
    if (y + needed > PAGE_H - 18) addPage()
  }

  function section(title: string, subtitle?: string) {
    const barH = 11
    doc.setFillColor(...NAVY)
    doc.rect(ML, y, CW, barH, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(title, ML + 4, y + 7.5)
    y += barH + 5
    if (subtitle) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...INK5)
      doc.text(subtitle, ML, y)
      y += 6
    }
  }

  function subsection(title: string) {
    doc.setFillColor(...NAVY2)
    doc.roundedRect(ML, y, CW, 8, 2, 2, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(title, ML + 4, y + 5.5)
    y += 12
  }

  function row2col(label: string, value: string, bold = false, highlight?: [number, number, number]) {
    const rowBg: [number, number, number] = bold ? [235, 241, 252] : [255, 255, 255]
    doc.setFillColor(...rowBg)
    doc.rect(ML, y - 5, CW, 8, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(...(highlight ?? INK))
    doc.text(label, ML + 2, y)
    doc.text(value, W - MR, y, { align: 'right' })
    y += 6
    doc.setDrawColor(...BORDER)
    doc.line(ML, y - 1, W - MR, y - 1)
  }

  function kpiBox(x: number, yy: number, w: number, h: number, label: string, value: string, sub: string, color: [number, number, number]) {
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(x, yy, w, h, 3, 3, 'F')
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.4)
    doc.roundedRect(x, yy, w, h, 3, 3, 'S')
    doc.setLineWidth(0.2)
    doc.setFillColor(...color)
    doc.rect(x + 8, yy, w - 16, 1.5, 'F')
    doc.setTextColor(...INK5)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x + w / 2, yy + 10, { align: 'center' })
    doc.setTextColor(...color)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(value, x + w / 2, yy + 20, { align: 'center' })
    doc.setTextColor(...INK5)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    const subLines = doc.splitTextToSize(sub, w - 6)
    doc.text(subLines, x + w / 2, yy + 27, { align: 'center' })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEITE 1: DECKBLATT + ZUSAMMENFASSUNG + EINNAHMEN/AUSGABEN
  // ═══════════════════════════════════════════════════════════════════════════

  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, W, PAGE_H, 'F')
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 14, 'F')
  doc.setFillColor(...NAVY2)
  doc.rect(0, 14, W, 2, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('WealthWise', ML, 9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 200, 240)
  doc.text('Digitale Vorsorgeplanung Schweiz', ML + 26, 9)
  doc.text(dateStr, W - MR, 9, { align: 'right' })
  y = 24

  // Title
  doc.setTextColor(...NAVY)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Personliche Vorsorgeanalyse', ML, y)
  y += 10

  // Name
  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK)
  doc.text(names, ML, y)
  y += 7

  // Location
  if (data.location) {
    doc.setFontSize(10)
    doc.setTextColor(...INK5)
    doc.text(`${data.location.ort}, Kanton ${data.location.kanton}`, ML, y)
    y += 6
  } else {
    y += 2
  }

  // Horizontal rule
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.5)
  doc.line(ML, y, W - MR, y)
  doc.setLineWidth(0.2)
  y += 5

  // Verdict box
  doc.setFillColor(...verdictColor)
  doc.roundedRect(ML, y, CW, 14, 4, 4, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(verdictLabel, ML + 6, y + 9)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Score ${analysis.sustainabilityScore}/100`, W - MR - 6, y + 5, { align: 'right' })
  const surplusSign = surplus >= 0 ? '+' : ''
  doc.text(`Monatlich: ${surplusSign}CHF ${fmtCHF(surplus)}/Mt.`, W - MR - 6, y + 11, { align: 'right' })
  y += 20

  // Key info chips
  const chips: [string, string][] = [
    ['Pensionierung', `${data.retirementAge1} Jahre`],
    ['Risikoprofil', riskLabel],
    ['Kanton', data.location?.kanton ?? (data.canton ?? '-')],
    ['Datum', dateStr],
  ]
  const chipW = (CW - 6) / 4
  chips.forEach(([label, value], i) => {
    const cx = ML + i * (chipW + 2)
    doc.setFillColor(...INK1)
    doc.roundedRect(cx, y, chipW, 13, 2, 2, 'F')
    doc.setTextColor(...INK5)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(label, cx + chipW / 2, y + 5, { align: 'center' })
    doc.setTextColor(...NAVY)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.text(value, cx + chipW / 2, y + 10.5, { align: 'center' })
  })
  y += 18

  // ─── Zusammenfassung / KPI boxes ──────────────────────────────────────────

  section('Zusammenfassung', 'Deine Vorsorgesituation auf einen Blick')

  const kpiW = (CW - 8) / 3
  const kpiH = 32

  const surplusKpiColor = surplus >= 0 ? GREEN : Math.abs(surplus) <= 500 ? AMBER : RED
  kpiBox(ML, y, kpiW, kpiH, 'Monatliche Situation',
    `${surplus >= 0 ? '+' : ''}CHF ${fmtCHF(surplus)}/Mt.`,
    surplus >= 0 ? 'Uberschuss nach Pensionierung' : 'Lucke pro Monat',
    surplusKpiColor)

  const depAge = data.depletionAge ?? (analysis.ageWhenBroke ?? 99)
  const depColor = depAge >= 90 ? GREEN : depAge >= 85 ? AMBER : RED
  kpiBox(ML + kpiW + 4, y, kpiW, kpiH, 'Vermogen reicht bis',
    depAge >= 99 ? 'Alter 95+' : `Alter ${depAge}`,
    'Stat. Lebenserwartung ~85-87 J.',
    depColor)

  const coveragePct = data.monthlyBudget > 0 ? Math.round((effectiveTotalMonthly / data.monthlyBudget) * 100) : 0
  const covColor = coveragePct >= 100 ? GREEN : coveragePct >= 70 ? AMBER : RED
  kpiBox(ML + (kpiW + 4) * 2, y, kpiW, kpiH, 'Deckungsgrad Renten',
    `${coveragePct}%`,
    `CHF ${fmtCHF(effectiveTotalMonthly)} / CHF ${fmtCHF(data.monthlyBudget)}/Mt.`,
    covColor)

  y += kpiH + 8

  // ─── Einnahmen & Ausgaben ─────────────────────────────────────────────────

  section('Einnahmen & Ausgaben im Ruhestand')

  // AHV row
  doc.setFillColor(...INK1)
  doc.rect(ML, y - 4, CW, 16, 'F')
  doc.setTextColor(...INK)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('AHV (1. Saule, inkl. 13. Monatsrente)', ML + 3, y)
  doc.text(`CHF ${fmtCHF(ahvMonthlyInkl13)}/Mt.`, W - MR - 3, y, { align: 'right' })
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK5)
  doc.text(
    `Basisrente: CHF ${fmtCHF(analysis.ahv.combinedMonthly)}/Mt. + 13. Rente: CHF ${fmtCHF(Math.round(analysis.ahv.combinedMonthly / 12))}/Mt.`,
    ML + 3, y + 6,
  )
  y += 16

  // PK row
  doc.setFillColor(255, 255, 255)
  doc.rect(ML, y - 4, CW, 10, 'F')
  doc.setTextColor(...INK)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Pensionskasse (2. Saule)', ML + 3, y)
  doc.text(`CHF ${fmtCHF(pkMonthlyDisplay)}/Mt.`, W - MR - 3, y, { align: 'right' })
  y += 10

  // Total row
  const pct = data.monthlyBudget > 0 ? Math.round(effectiveTotalMonthly / data.monthlyBudget * 100) : 0
  doc.setFillColor(...NAVY)
  doc.rect(ML, y - 4, CW, 16, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Total Renteneinnahmen', ML + 3, y)
  doc.text(`CHF ${fmtCHF(effectiveTotalMonthly)}/Mt.`, W - MR - 3, y, { align: 'right' })
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 210, 255)
  doc.text(`${pct}% des monatlichen Bedarfs`, ML + 3, y + 6)
  y += 16

  // Budget row
  doc.setFillColor(...INK1)
  doc.rect(ML, y - 4, CW, 10, 'F')
  doc.setTextColor(...INK)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Monatliches Budget', ML + 3, y)
  doc.text(`-CHF ${fmtCHF(data.monthlyBudget)}/Mt.`, W - MR - 3, y, { align: 'right' })
  y += 10

  // Tax row
  if (data.retirementTaxMonthly && data.retirementTaxMonthly > 0) {
    doc.setFillColor(255, 255, 255)
    doc.rect(ML, y - 4, CW, 10, 'F')
    doc.setTextColor(...INK)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Einkommenssteuer (geschatzt)', ML + 3, y)
    doc.setTextColor(...RED)
    doc.text(`-CHF ${fmtCHF(data.retirementTaxMonthly)}/Mt.`, W - MR - 3, y, { align: 'right' })
    doc.setTextColor(...INK)
    y += 10
  }

  // Surplus / Gap row
  y += 2
  const surplusRowColor: [number, number, number] = surplus >= 0 ? [236, 253, 245] : [254, 242, 242]
  doc.setFillColor(...surplusRowColor)
  doc.roundedRect(ML, y, CW, 12, 3, 3, 'F')
  doc.setTextColor(...(surplus >= 0 ? GREEN : RED))
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(surplus >= 0 ? 'Monatlicher Uberschuss (n. St.)' : 'Monatliche Vorsorgelucke (n. St.)', ML + 4, y + 8)
  doc.text(`${surplus >= 0 ? '+' : ''}CHF ${fmtCHF(surplus)}/Mt.`, W - MR - 4, y + 8, { align: 'right' })
  y += 16

  // ═══════════════════════════════════════════════════════════════════════════
  // SEITE 2: VERMÖGENSVERLAUF + SZENARIEN TABELLE
  // ═══════════════════════════════════════════════════════════════════════════
  addPage()
  section('Vermogensverlauf', `Vermogensentwicklung bis Alter 95 - Risikoprofil: ${riskLabel}`)

  // ─── Combined 3-scenario line chart ────────────────────────────────────────
  if (data.scenarios) {
    const ra = data.retirementAge1
    const LINE_GREEN  = [21,  128,  61] as [number, number, number]
    const LINE_NAVY   = [30,   58, 138] as [number, number, number]
    const LINE_ORANGE = [194,  65,  12] as [number, number, number]

    const scenLines = [
      { rows: data.scenarios.optimistic.yearlyCashflow,  color: LINE_GREEN,  label: 'Optimistisch (5% / 1%)',  broke: data.scenarios.optimistic.ageWhenBroke },
      { rows: data.scenarios.neutral.yearlyCashflow,     color: LINE_NAVY,   label: 'Neutral (3.5% / 1.5%)',   broke: data.scenarios.neutral.ageWhenBroke },
      { rows: data.scenarios.pessimistic.yearlyCashflow, color: LINE_ORANGE, label: 'Pessimistisch (1% / 2.5%)', broke: data.scenarios.pessimistic.ageWhenBroke },
    ]

    // Y-max across all 3 scenarios
    const allWealth = scenLines.flatMap(s =>
      s.rows.filter(r => r.age >= ra && r.age <= 95).map(r => Math.max(0, r.wealthEndOfYear) + r.wealthImmobilien))
    const maxWealth = Math.max(...allWealth, 1)
    const tickSz = maxWealth > 5_000_000 ? 2_000_000 : maxWealth > 2_000_000 ? 1_000_000 : maxWealth > 1_000_000 ? 500_000 : maxWealth > 500_000 ? 250_000 : 100_000
    const yMax = Math.max(tickSz, Math.ceil(maxWealth / tickSz) * tickSz)

    const leftPad = 24
    const bottomPad = 14
    const chartH = 72
    const plotH = chartH - bottomPad
    const plotX = ML + leftPad
    const plotY = y + 6
    const plotW = CW - leftPad

    // Title
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    doc.text('Vermogensverlauf: 3 Szenarien im Vergleich', plotX, plotY - 2)

    // Background
    doc.setFillColor(250, 251, 253)
    doc.rect(plotX, plotY, plotW, plotH, 'F')
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.25)
    doc.rect(plotX, plotY, plotW, plotH, 'S')

    // Y-axis grid lines + labels
    const numTicks = 5
    for (let i = 0; i <= numTicks; i++) {
      const val = (yMax / numTicks) * i
      const gy = plotY + plotH - (val / yMax) * plotH
      if (i > 0) {
        doc.setDrawColor(215, 222, 232)
        doc.setLineWidth(0.15)
        doc.line(plotX, gy, plotX + plotW, gy)
      }
      const lv = val >= 1_000_000 ? `${Math.round(val / 100_000) / 10}M` : val >= 1_000 ? `${Math.round(val / 1_000)}k` : `${val}`
      doc.setTextColor(...INK5)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      doc.text(lv, plotX - 1, gy + 2, { align: 'right' })
    }

    // X-axis age labels + vertical tick at each 5-year mark
    const agePoints = []
    for (let a = ra; a <= 95; a++) agePoints.push(a)
    const ageRange = 95 - ra
    const xForAge = (age: number) => plotX + ((age - ra) / ageRange) * plotW

    for (let a = ra; a <= 95; a += 5) {
      const ax = xForAge(a)
      doc.setDrawColor(215, 222, 232)
      doc.setLineWidth(0.15)
      doc.line(ax, plotY, ax, plotY + plotH)
      doc.setTextColor(...INK5)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      doc.text(`${a}`, ax, plotY + plotH + 5, { align: 'center' })
    }

    // Draw lines for each scenario
    scenLines.forEach(sc => {
      const pts = sc.rows.filter(r => r.age >= ra && r.age <= 95)
      if (pts.length < 2) return
      doc.setDrawColor(...sc.color)
      doc.setLineWidth(0.7)
      for (let i = 1; i < pts.length; i++) {
        const r0 = pts[i - 1], r1 = pts[i]
        const w0 = Math.max(0, r0.wealthEndOfYear) + r0.wealthImmobilien
        const w1 = Math.max(0, r1.wealthEndOfYear) + r1.wealthImmobilien
        const x0 = xForAge(r0.age), y0 = plotY + plotH - (w0 / yMax) * plotH
        const x1 = xForAge(r1.age), y1 = plotY + plotH - (w1 / yMax) * plotH
        doc.line(x0, y0, x1, y1)
      }
      // Depletion marker
      if (sc.broke && sc.broke < 99) {
        const bx = xForAge(Math.min(sc.broke, 95))
        doc.setDrawColor(...sc.color)
        doc.setLineWidth(0.4)
        doc.line(bx, plotY, bx, plotY + plotH)
      }
    })

    // Restores line width after drawing
    doc.setLineWidth(0.2)

    // Legend
    y = plotY + plotH + bottomPad - 2
    const legY = y
    let legX = ML + leftPad
    scenLines.forEach(sc => {
      doc.setFillColor(...sc.color)
      doc.rect(legX, legY - 3, 12, 2.5, 'F')
      doc.setTextColor(...INK)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text(sc.label, legX + 14, legY - 0.5)
      // Show verdict
      const broke = sc.broke
      const verdict = broke == null || broke >= 99 ? 'Reicht bis 95+' : `Aufgebraucht Alter ${broke}`
      const vColor: [number, number, number] = broke == null || broke >= 99 ? LINE_GREEN : LINE_ORANGE
      doc.setTextColor(...vColor)
      doc.setFontSize(6.5)
      doc.text(verdict, legX + 14, legY + 4.5)
      legX += 58
    })
    y = legY + 9
  } else {
    doc.setTextColor(...INK5)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text('Szenarien-Daten nicht verfugbar.', ML, y + 10)
    y += 20
  }

  // ─── Scenario comparison table ─────────────────────────────────────────────

  checkBreak(60)
  section('Szenarien im Vergleich')

  const scenariosDisplay = [
    {
      label: 'Optimistisch', color: GREEN, rate: 5.0, inflation: 1.0,
      ageWhenBroke: data.scenarios?.optimistic.ageWhenBroke ?? null,
      cashflow: data.scenarios?.optimistic.yearlyCashflow ?? [],
    },
    {
      label: 'Neutral', color: NAVY, rate: 3.5, inflation: 1.5,
      ageWhenBroke: data.scenarios?.neutral.ageWhenBroke ?? analysis.ageWhenBroke,
      cashflow: data.scenarios?.neutral.yearlyCashflow ?? [],
    },
    {
      label: 'Pessimistisch', color: RED, rate: 1.0, inflation: 2.5,
      ageWhenBroke: data.scenarios?.pessimistic.ageWhenBroke ?? null,
      cashflow: data.scenarios?.pessimistic.yearlyCashflow ?? [],
    },
  ]

  // Table header
  doc.setFillColor(...NAVY)
  doc.rect(ML, y, CW, 9, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  const scCols = [ML + 3, ML + 42, ML + 88, ML + 120, ML + 145, W - MR - 3]
  doc.text('Szenario', scCols[0], y + 6)
  doc.text('Rendite/Infl.', scCols[1], y + 6)
  doc.text('Vermogen 80', scCols[2], y + 6)
  doc.text('Vermogen 90', scCols[3], y + 6)
  doc.text('Reicht bis', scCols[4], y + 6)
  y += 9

  scenariosDisplay.forEach((sc, idx) => {
    checkBreak(12)
    const rowBg = idx % 2 === 0 ? INK1 : ([255, 255, 255] as [number, number, number])
    doc.setFillColor(...rowBg)
    doc.rect(ML, y, CW, 11, 'F')
    doc.setFillColor(...sc.color)
    doc.rect(ML, y, 3, 11, 'F')
    doc.setTextColor(...INK)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(sc.label, scCols[0] + 5, y + 7)
    doc.setFont('helvetica', 'normal')
    doc.text(`${sc.rate}% / ${sc.inflation}%`, scCols[1], y + 7)

    // Scenario-specific wealth at age 80 and 90
    const wealthAt80 = sc.cashflow.find((r: { age: number; wealthEndOfYear: number }) => r.age === 80)?.wealthEndOfYear ?? 0
    const wealthAt90 = sc.cashflow.find((r: { age: number; wealthEndOfYear: number }) => r.age === 90)?.wealthEndOfYear ?? 0

    const w80Color: [number, number, number] = wealthAt80 > 0 ? GREEN : RED
    const w90Color: [number, number, number] = wealthAt90 > 0 ? GREEN : RED
    doc.setTextColor(...w80Color)
    doc.text(wealthAt80 > 0 ? `CHF ${fmt(wealthAt80)}` : 'Aufgezehrt', scCols[2], y + 7)
    doc.setTextColor(...w90Color)
    doc.text(wealthAt90 > 0 ? `CHF ${fmt(wealthAt90)}` : 'Aufgezehrt', scCols[3], y + 7)

    doc.setTextColor(...INK)
    const brokeLabel = (sc.ageWhenBroke == null || sc.ageWhenBroke >= 99) ? 'Bis 95+' : `Bis Alter ${sc.ageWhenBroke}`
    doc.text(brokeLabel, scCols[4], y + 7)
    y += 11
  })

  y += 8

  // ═══════════════════════════════════════════════════════════════════════════
  // SEITE 3: VERMÖGENSAUFSCHLÜSSELUNG + FRÜHPENSIONIERUNG
  // ═══════════════════════════════════════════════════════════════════════════
  addPage()

  // ─── Wealth Breakdown ─────────────────────────────────────────────────────

  section('Vermogen bei Pensionierung', 'Aufschlusselung der Vermogenskomponenten')

  if (data.wealthBreakdown) {
    const wb = data.wealthBreakdown
    const breakdownRows: Array<[string, number, boolean]> = [
      ['Sparkonto / Bankguthaben (proj.)', wb.sparkontoProj, false],
      ['Wertschriften (proj.)', wb.wertProj, false],
      ['Saule 3a (proj. bei Pensionierung)', wb.p3a, false],
      ['PK-Kapitalbezug (brutto)', wb.pkCap, false],
      ['Freizugigkeitsguthaben (proj.)', wb.fzCap, false],
      ['Wohneigentum (Nettowert)', wb.propEquity, false],
      ['Angesparte Ersparnisse (proj.)', wb.accSavings, false],
    ].filter(r => (r[1] as number) > 0) as Array<[string, number, boolean]>

    breakdownRows.forEach(([label, val], i) => {
      checkBreak(10)
      const bg = i % 2 === 0 ? INK1 : ([255, 255, 255] as [number, number, number])
      doc.setFillColor(...bg)
      doc.rect(ML, y - 5, CW, 8, 'F')
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...INK)
      doc.text(label, ML + 3, y)
      doc.text(`CHF ${fmt(val)}`, W - MR - 3, y, { align: 'right' })
      y += 8
      doc.setDrawColor(...BORDER)
      doc.line(ML, y - 1, W - MR, y - 1)
    })

    // Note about projection
    if (breakdownRows.length > 0) {
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(...INK5)
      doc.text('(inkl. Projektion bis Pensionierungsalter)', ML + 3, y + 3)
      y += 8
    }

    // Total row (navy)
    checkBreak(12)
    doc.setFillColor(...NAVY)
    doc.rect(ML, y - 4, CW, 12, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Total Vermogen bei Pensionierung', ML + 3, y + 2)
    doc.text(`CHF ${fmt(wb.total)}`, W - MR - 3, y + 2, { align: 'right' })
    y += 16
  } else if (data.wealthAtRetirement && data.wealthAtRetirement > 0) {
    // Fallback: simple rows
    const wealthRows: Array<[string, string]> = [
      data.freeAssets && data.freeAssets > 0 ? ['Bankguthaben / Sparkonten', `CHF ${fmtCHF(data.freeAssets)}`] : null,
      data.balance3a1 && data.balance3a1 > 0 ? ['Saule 3a (proj. bei Pensionierung)', `CHF ${fmtCHF(data.balance3a1)}`] : null,
      data.fzBalance1 && data.fzBalance1 > 0 ? ['Freizugigkeitsguthaben (proj.)', `CHF ${fmtCHF(data.fzBalance1)}`] : null,
      data.pkCapital1 && data.pkCapital1 > 0 ? ['PK-Kapitalbezug (brutto)', `CHF ${fmtCHF(data.pkCapital1)}`] : null,
      ['Total Vermogen bei Pensionierung', `CHF ${fmtCHF(data.wealthAtRetirement)}`],
    ].filter(Boolean) as [string, string][]

    wealthRows.forEach((r, i) => {
      const isTotal = i === wealthRows.length - 1
      checkBreak(10)
      if (isTotal) {
        doc.setFillColor(...NAVY)
        doc.rect(ML, y - 4, CW, 10, 'F')
        doc.setTextColor(...WHITE)
      } else {
        const bg = i % 2 === 0 ? INK1 : ([255, 255, 255] as [number, number, number])
        doc.setFillColor(...bg)
        doc.rect(ML, y - 4, CW, 10, 'F')
        doc.setTextColor(...INK)
      }
      doc.setFontSize(10)
      doc.setFont('helvetica', isTotal ? 'bold' : 'normal')
      doc.text(r[0], ML + 3, y)
      doc.text(r[1], W - MR - 3, y, { align: 'right' })
      y += 10
    })
  }

  y += 4

  // ─── Frühpensionierung (only if retirementAge < 65) ──────────────────────

  if (data.retirementAge1 < 65) {
    const bridgeYears = 65 - data.retirementAge1
    const bridgeCost = bridgeYears * data.monthlyBudget * 12

    checkBreak(55)
    section('Fruhpensionierung', `${bridgeYears} Jahr(e) vor Altersrente 65`)

    const fpRows: Array<[string, string]> = [
      ['Uberbruckungsjahre (bis AHV-Alter 65)', `${bridgeYears} Jahr(e)`],
      ['Geschatzte Uberbruckungskosten', `CHF ${fmt(bridgeCost)}`],
      ['AHV-Vorbezug ab 63 moglich', 'Kurzung: 6.8% pro Jahr (lebenslang)'],
      ['AHV-Nichterwerbstatige Beitrag (ca.)', `CHF ${fmt(Math.round(data.monthlyBudget * 0.12 * 12))}/Jahr`],
    ]
    fpRows.forEach((r, i) => {
      checkBreak(10)
      const bg = i % 2 === 0 ? INK1 : ([255, 255, 255] as [number, number, number])
      doc.setFillColor(...bg)
      doc.rect(ML, y - 4, CW, 10, 'F')
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...INK)
      doc.text(r[0], ML + 3, y)
      doc.text(r[1], W - MR - 3, y, { align: 'right' })
      y += 10
    })

    // Info box
    checkBreak(18)
    y += 2
    doc.setFillColor(255, 249, 230)
    doc.roundedRect(ML, y, CW, 14, 3, 3, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 60, 0)
    const fpNote = `Hinweis: Fruhpensionierung erfordert genugendes Privatvermogen zur Uberbruckung. PK-Rente wird fruher ausgezahlt (ggf. mit Kurzung). AHV-Beitrage als Nichterwerbstatige weiter entrichten.`
    const fpLines = doc.splitTextToSize(fpNote, CW - 8)
    doc.text(fpLines, ML + 4, y + 5)
    y += 18
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEITE 4: VORSORGEÜBERSICHT + STEUERANALYSE
  // ═══════════════════════════════════════════════════════════════════════════
  addPage()
  section('Vorsorgeubersicht', 'Deine drei Vorsorgesaulen im Detail')

  const isCouple = !!(analysis.ahv.person2 && data.person2Name)

  // 1. Säule – AHV
  y += 2
  subsection('1. Saule - AHV / IV')

  doc.setTextColor(...INK)
  const ahvRows: [string, string][] = [
    [isCouple ? 'AHV-Rente Person 1' : 'AHV-Rente', `CHF ${fmtCHF(analysis.ahv.person1?.monthlyRente ?? 0)}/Mt.`],
    ...(isCouple ? [['AHV-Rente Person 2', `CHF ${fmtCHF(analysis.ahv.person2?.monthlyRente ?? 0)}/Mt.`] as [string, string]] : []),
    ...(analysis.ahv.plafonReduction > 0 ? [['Plafonierung (Ehepaar)', `-CHF ${fmtCHF(analysis.ahv.plafonReduction)}/Mt.`] as [string, string]] : []),
    ['13. AHV-Rente (auf 12 Mt. verteilt)', `+CHF ${fmtCHF(Math.round(analysis.ahv.combinedMonthly / 12))}/Mt.`],
    ['Total AHV inkl. 13. Rente', `CHF ${fmtCHF(ahvMonthlyInkl13)}/Mt.`],
  ]
  ahvRows.forEach(r => { checkBreak(8); row2col(r[0], r[1], r[0].startsWith('Total')) })
  y += 6

  // 2. Säule – PK
  checkBreak(40)
  subsection('2. Saule - Pensionskasse')

  doc.setTextColor(...INK)
  const pkRows: [string, string][] = [
    ...(data.pkCapital1 && data.pkCapital1 > 0
      ? [[isCouple ? 'PK-Kapitalbezug P1 (brutto)' : 'PK-Kapitalbezug (brutto)', `CHF ${fmtCHF(data.pkCapital1)}`] as [string, string]]
      : []),
    ...(pkMonthlyDisplay > 0
      ? [[isCouple ? 'PK-Rente Person 1' : 'PK-Rente', `CHF ${fmtCHF(pkMonthlyDisplay)}/Mt.`] as [string, string]]
      : []),
    ...(data.pkRate1 ? [['Umwandlungssatz', `${data.pkRate1}%`] as [string, string]] : []),
    ['Total PK-Rente', `CHF ${fmtCHF(pkMonthlyDisplay)}/Mt.`],
  ]
  pkRows.forEach(r => { checkBreak(8); row2col(r[0], r[1], r[0].startsWith('Total')) })
  y += 6

  // 3. Säule – Private Vorsorge
  checkBreak(40)
  subsection('3. Saule - Privates Vorsorgevermogen')

  doc.setTextColor(...INK)
  const p3Rows: [string, string][] = [
    ...(data.balance3a1 && data.balance3a1 > 0 ? [['Saule 3a (bei Pensionierung)', `CHF ${fmtCHF(data.balance3a1)}`] as [string, string]] : []),
    ...(data.fzBalance1 && data.fzBalance1 > 0 ? [['Freizugigkeitsguthaben (bei Pensionierung)', `CHF ${fmtCHF(data.fzBalance1)}`] as [string, string]] : []),
    ...(data.hasProperty ? [['Wohneigentum (Marktwert)', `CHF ${fmtCHF(data.propertyValue ?? 0)}`] as [string, string]] : []),
  ]

  if (p3Rows.length === 0) {
    doc.setTextColor(...INK5)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text('Keine privaten Vorsorgewerte erfasst.', ML + 3, y)
    y += 8
  } else {
    p3Rows.forEach(r => { checkBreak(8); row2col(r[0], r[1]) })
  }

  y += 4

  // Total income row
  checkBreak(16)
  doc.setFillColor(...NAVY)
  doc.rect(ML, y - 4, CW, 16, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Total monatliches Renteneinkommen', ML + 3, y)
  doc.text(`CHF ${fmtCHF(effectiveTotalMonthly)}/Mt.`, W - MR - 3, y, { align: 'right' })
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(210, 225, 255)
  doc.text(`Pensionierungsalter ${data.retirementAge1} Jahre - AHV inkl. 13. Rente + PK`, ML + 3, y + 6)
  y += 20

  // ─── Tax Analysis ──────────────────────────────────────────────────────────

  if (data.taxData) {
    const td = data.taxData
    checkBreak(30)
    section('Steueranalyse', 'Steuerliche Auswirkungen im Ruhestand')

    // Annual retirement tax
    checkBreak(10)
    const bg0 = INK1
    doc.setFillColor(...bg0)
    doc.rect(ML, y - 4, CW, 10, 'F')
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK)
    doc.text('Einkommenssteuer im Ruhestand (geschatzt)', ML + 3, y)
    doc.setTextColor(...RED)
    doc.text(`CHF ${fmt(td.annualRetirementTax)}/Jahr`, W - MR - 3, y, { align: 'right' })
    doc.setTextColor(...INK)
    y += 10

    // Marginal rate
    checkBreak(10)
    doc.setFillColor(255, 255, 255)
    doc.rect(ML, y - 4, CW, 10, 'F')
    doc.text('Grenzsteuersatz', ML + 3, y)
    doc.text(`${Math.round(td.marginalRate * 100)}%`, W - MR - 3, y, { align: 'right' })
    y += 10

    // PK variant comparison table
    if (td.pkVariant) {
      checkBreak(50)
      y += 4

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...NAVY)
      doc.text('PK-Bezugsvarianten: Steuervergleich', ML + 2, y)
      y += 6

      // Header
      doc.setFillColor(...NAVY2)
      doc.rect(ML, y, CW, 8, 'F')
      doc.setTextColor(...WHITE)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      const pkVCols = [ML + 3, ML + 55, ML + 105, W - MR - 3]
      doc.text('Variante', pkVCols[0], y + 5.5)
      doc.text('Einmalige Steuer', pkVCols[1], y + 5.5)
      doc.text('Laufend/Jahr', pkVCols[2], y + 5.5)
      doc.text('Total 20 J.', pkVCols[3], y + 5.5, { align: 'right' })
      y += 8

      const pkVRows = [
        { label: 'Vollrente', oneTime: 0, annual: td.pkVariant.rente.annual },
        { label: 'Vollkapital', oneTime: td.pkVariant.kapital.oneTime, annual: td.pkVariant.kapital.annual },
        { label: 'Mix 50/50', oneTime: td.pkVariant.mix.oneTime, annual: td.pkVariant.mix.annual },
      ]
      pkVRows.forEach((r, i) => {
        checkBreak(10)
        const rowBg = i % 2 === 0 ? INK1 : ([255, 255, 255] as [number, number, number])
        doc.setFillColor(...rowBg)
        doc.rect(ML, y, CW, 9, 'F')
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...INK)
        doc.text(r.label, pkVCols[0], y + 6)
        doc.text(r.oneTime > 0 ? `CHF ${fmt(r.oneTime)}` : '-', pkVCols[1], y + 6)
        doc.text(`CHF ${fmt(r.annual)}`, pkVCols[2], y + 6)
        const total20 = r.oneTime + r.annual * 20
        doc.text(`CHF ${fmt(total20)}`, pkVCols[3], y + 6, { align: 'right' })
        y += 9
      })
      y += 4
    }

    // 3a staffled withdrawal savings
    if (td.thirdPillarSavings != null && td.thirdPillarWorstTax != null && td.thirdPillarOptimalTax != null) {
      checkBreak(30)
      y += 2
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...NAVY)
      doc.text('Saule 3a: Staffelbezug Steueroptimierung', ML + 2, y)
      y += 6

      const s3aRows: [string, string][] = [
        ['Schlechtester Fall (alle auf einmal)', `CHF ${fmt(td.thirdPillarWorstTax)}`],
        ['Optimaler Staffelbezug', `CHF ${fmt(td.thirdPillarOptimalTax)}`],
        ['Steuerersparnis durch Staffelung', `CHF ${fmt(td.thirdPillarSavings)}`],
      ]
      s3aRows.forEach((r, i) => {
        checkBreak(9)
        const rowBg = i % 2 === 0 ? INK1 : ([255, 255, 255] as [number, number, number])
        doc.setFillColor(...rowBg)
        doc.rect(ML, y - 4, CW, 9, 'F')
        doc.setFontSize(9)
        doc.setFont('helvetica', i === 2 ? 'bold' : 'normal')
        doc.setTextColor(i === 2 ? GREEN[0] : INK[0], i === 2 ? GREEN[1] : INK[1], i === 2 ? GREEN[2] : INK[2])
        doc.text(r[0], ML + 3, y)
        doc.text(r[1], W - MR - 3, y, { align: 'right' })
        y += 9
      })
      y += 4
    }

    // PK-Einkauf tax savings
    if (data.pkEinkaufData && data.pkEinkaufData.proJahr > 0) {
      const pk = data.pkEinkaufData
      checkBreak(40)
      y += 2
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...NAVY)
      doc.text('PK-Einkauf: Steuerersparnis', ML + 2, y)
      y += 6

      const pkERows: [string, string][] = [
        ['Einkauf pro Jahr', `CHF ${fmt(pk.proJahr)}`],
        ['Effektive Jahre', `${pk.effJahre} Jahre`],
        ['Total Einkauf', `CHF ${fmt(pk.total)}`],
        ['Steuerersparnis gesamt', `CHF ${fmt(pk.taxSaving)}`],
        ['PK-Rente vorher', `CHF ${fmt(pk.renteMonatBefore)}/Mt.`],
        ['PK-Rente nachher', `CHF ${fmt(pk.renteMonatAfter)}/Mt.`],
      ]
      pkERows.forEach((r, i) => {
        checkBreak(9)
        const rowBg = i % 2 === 0 ? INK1 : ([255, 255, 255] as [number, number, number])
        doc.setFillColor(...rowBg)
        doc.rect(ML, y - 4, CW, 9, 'F')
        doc.setFontSize(9)
        doc.setFont('helvetica', i === 3 ? 'bold' : 'normal')
        doc.setTextColor(i === 3 ? GREEN[0] : INK[0], i === 3 ? GREEN[1] : INK[1], i === 3 ? GREEN[2] : INK[2])
        doc.text(r[0], ML + 3, y)
        doc.text(r[1], W - MR - 3, y, { align: 'right' })
        y += 9
      })
      y += 4
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEITE 5: MEINE ENTSCHEIDUNGEN + EMPFEHLUNGEN
  // ═══════════════════════════════════════════════════════════════════════════
  addPage()
  section('Meine Entscheidungen', 'Deine getroffenen Vorsorgeentscheide')

  // Decision rows
  const decisionRows: Array<[string, string, string]> = [
    [
      'AHV-Bezug',
      data.ahvChoiceLabel ?? 'Noch nicht gewahlt',
      data.ahvChoiceLabel?.includes('Vorbezug')
        ? 'Kurzung wirkt lebenslang. Gut abwagen!'
        : data.ahvChoiceLabel?.includes('Aufschub')
        ? 'Erhoht Rente lebenslang. Kapital erforderlich.'
        : 'Ordentlicher Bezug mit 65.'
    ],
    [
      'PK-Bezug',
      data.pkChoiceLabel ?? 'Noch nicht gewahlt',
      data.pkChoiceLabel === 'Vollrente'
        ? 'Lebenslange Rente, kein Kapitalrisiko.'
        : data.pkChoiceLabel === 'Vollkapitalbezug'
        ? 'Einmaliger Kapitalzufluss, selbst anlegen/verwalten.'
        : data.pkChoiceLabel === 'Mix 50/50'
        ? 'Kombination: Teils Rente, teils Kapital.'
        : 'Noch kein Entscheid getroffen.'
    ],
    [
      'Vermogensstrategie',
      data.withdrawalStrategyLabel ?? 'Noch nicht gewahlt',
      data.withdrawalStrategyLabel?.includes('Vermogensverzehr')
        ? 'Kapital wird bis Zielalter aufgebraucht.'
        : data.withdrawalStrategyLabel?.includes('Kapitalerhalt')
        ? 'Nur Rendite wird konsumiert, Kapital bleibt erhalten.'
        : 'Noch kein Entscheid getroffen.'
    ],
  ]

  decisionRows.forEach(([topic, choice, impact], i) => {
    checkBreak(24)
    const bg = i % 2 === 0 ? [245, 247, 252] as [number, number, number] : [255, 255, 255] as [number, number, number]
    doc.setFillColor(...bg)
    doc.roundedRect(ML, y, CW, 20, 2, 2, 'F')
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.3)
    doc.roundedRect(ML, y, CW, 20, 2, 2, 'S')
    doc.setLineWidth(0.2)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY2)
    doc.text(topic, ML + 4, y + 7)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    doc.text(choice, ML + 4, y + 14)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK5)
    const impactLines: string[] = doc.splitTextToSize(impact, CW - 80)
    doc.text(impactLines, W - MR - 4, y + 10, { align: 'right' })

    y += 24
  })

  y += 6

  // ─── Handlungsempfehlungen ──────────────────────────────────────────────────

  checkBreak(30)
  section('Handlungsempfehlungen', `Priorisierte Massnahmen - Bewertung: ${verdictLabel}`)

  const allRecs: Array<{ text: string; priority: 'hoch' | 'mittel' | 'niedrig'; detail: string }> =
    analysis.verdict === 'green' ? [
      { text: 'Saule-3a-Gelder gestaffelt beziehen.', priority: 'mittel', detail: 'Bezug uber 3-5 Jahre nutzt den Progressionsvorteil und spart erheblich Steuern.' },
      { text: 'Anlagestrategie auf Pensionierungsrisiko prufen.', priority: 'mittel', detail: 'Aktienquote 5-10 Jahre vor Pensionierung auf 40-50% reduzieren.' },
      { text: 'PK-Einkauf zur steuerlichen Optimierung prufen.', priority: 'niedrig', detail: 'Steuerlich voll abzugsfahig; bei Grenzsteuersatz 25% spart CHF 50\'000 Einkauf ca. CHF 12\'500 Steuern.' },
      { text: 'Nachlassplanung aktualisieren.', priority: 'niedrig', detail: 'Testament, PK-Begunstigungsklauseln und Lebensversicherungen regelmasig pruefen.' },
    ] : analysis.verdict === 'yellow' ? [
      { text: 'AHV-Beitragslucken schliessen.', priority: 'hoch', detail: 'Jedes fehlende Beitragsjahr kurzt die AHV-Rente lebenslang um ~2.3%.' },
      { text: 'PK-Einkauf prufen.', priority: 'hoch', detail: `CHF 50'000 Einkauf spart ~CHF 12'500 Steuern und steigert die PK-Rente nachhaltig.` },
      { text: '3a-Einzahlungen maximieren.', priority: 'mittel', detail: 'CHF 7\'258/Jahr (mit PK). Senkt das steuerbare Einkommen direkt.' },
      { text: 'Teilpensionierung prufen.', priority: 'mittel', detail: 'Stufenpensionierung optimiert die Steuerbelastung und reduziert Einkommensverlust.' },
    ] : [
      { text: 'PK-Einkauf dringend prufen.', priority: 'hoch', detail: 'Wirksamste Massnahme - steuerlich optimal und erhoht die lebenslange Rente.' },
      { text: 'AHV-Aufschub evaluieren.', priority: 'hoch', detail: 'Aufschub um 1 Jahr erhoht die AHV-Rente lebenslang um 5.2%.' },
      { text: 'Rentenbeginn verschieben oder Budget anpassen.', priority: 'hoch', detail: `Jedes zusatzliche Erwerbsjahr verbessert AHV, PK und reduziert Vermogensverzehr.` },
      { text: 'Professionelle Vorsorgeberatung in Anspruch nehmen.', priority: 'hoch', detail: 'Bei kritischer Vorsorgelucke ist CFP-Beratung dringend empfohlen.' },
    ]

  allRecs.slice(0, 4).forEach((rec, i) => {
    const pColor = rec.priority === 'hoch' ? RED : rec.priority === 'mittel' ? AMBER : GREEN
    const pLabel = rec.priority === 'hoch' ? 'Dringend' : rec.priority === 'mittel' ? 'Empfohlen' : 'Optional'

    doc.setFontSize(9.5)
    const titleLines: string[] = doc.splitTextToSize(`${i + 1}. ${rec.text}`, CW - 14)
    doc.setFontSize(8)
    const detailLines: string[] = doc.splitTextToSize(rec.detail, CW - 14)
    const shownDetail = detailLines.slice(0, 2)

    const boxH = 10 + titleLines.length * 5 + shownDetail.length * 4.5
    checkBreak(boxH + 4)

    doc.setFillColor(250, 250, 252)
    doc.roundedRect(ML, y, CW, boxH, 3, 3, 'F')
    doc.setFillColor(...pColor)
    doc.roundedRect(ML, y, 3, boxH, 1, 1, 'F')

    const pBadgeW = pLabel.length * 1.8 + 6
    doc.setFillColor(...pColor)
    doc.setTextColor(...WHITE)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.roundedRect(ML + 6, y + 3, pBadgeW, 5.5, 1.5, 1.5, 'F')
    doc.text(pLabel, ML + 6 + pBadgeW / 2, y + 7.2, { align: 'center' })

    doc.setTextColor(...INK)
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'bold')
    doc.text(titleLines, ML + 6, y + 12)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK5)
    doc.text(shownDetail, ML + 6, y + 12 + titleLines.length * 5)

    y += boxH + 4
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // SEITE 6: ANNAHMEN & DISCLAIMER
  // ═══════════════════════════════════════════════════════════════════════════
  addPage()
  section('Annahmen & Grundlagen', 'Verwendete Parameter fur diese Analyse')

  const max3aStr = data.hasPK === false
    ? "CHF 36'288 p.a. (ohne PK / Selbstandigerwerbende)"
    : data.hasPK === true
    ? "CHF 7'258 p.a. (mit Pensionskasse)"
    : "CHF 7'258 (mit PK) / CHF 36'288 (ohne PK)"

  const assumptions: [string, string][] = [
    ['AHV-Daten', "Rentenskala 44, BSV 2026 - Min. CHF 14'700 / Max. CHF 29'400 - Einkommensgrenze CHF 88'200"],
    ['Umwandlungssatz PK', `${data.pkRate1 ?? 5.4}% (BVG-Kennzahlen 2026)`],
    ['Risikoprofil', riskLabel],
    ['Rendite Neutral', '3.5% p.a. Anlagerendite, 1.5% p.a. Inflation'],
    ['Rendite Optimistisch', '5.0% p.a. Anlagerendite, 1.0% p.a. Inflation'],
    ['Rendite Pessimistisch', '1.0% p.a. Anlagerendite, 2.5% p.a. Inflation'],
    ['Planungshorizont', 'Bis Alter 95 Jahre'],
    ['Steuerkanton', data.location?.kanton ?? (data.canton ?? '-')],
    ['Kirchensteuer', data.kirchensteuer ? 'Ja' : 'Nein'],
    ['Steuergrundlagen', 'DBG 2026, kantonale Tarife (ESTV)'],
    ['3a-Maximum 2026', max3aStr],
    ['Lebenserwartung', 'Mann: 85 Jahre, Frau: 87 Jahre (BFS 2024)'],
    ['Kapitalbezug PK', 'Besteuerung nach Satzchen-Methode der Steuerverwaltung'],
  ]

  const aLabelW = 56
  const aValueW = CW - aLabelW - 3

  assumptions.forEach((a, i) => {
    checkBreak(10)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const valueLines: string[] = doc.splitTextToSize(a[1], aValueW)
    const rowH = Math.max(9, valueLines.length * 5 + 4)

    doc.setFillColor(...(i % 2 === 0 ? INK1 : ([255, 255, 255] as [number, number, number])))
    doc.rect(ML, y - 5, CW, rowH, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    doc.text(a[0], ML + 2, y)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK)
    doc.text(valueLines, ML + aLabelW, y)

    y += rowH
  })
  y += 6

  // Disclaimer
  checkBreak(50)
  doc.setFillColor(248, 248, 252)
  doc.roundedRect(ML, y, CW, 46, 4, 4, 'F')
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.8)
  doc.roundedRect(ML, y, CW, 46, 4, 4, 'S')
  doc.setLineWidth(0.2)

  doc.setTextColor(...NAVY)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Wichtiger Hinweis', ML + 6, y + 9)

  doc.setTextColor(...INK)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  const disclaimer =
    'Diese Analyse wurde von WealthWise auf Basis deiner personlichen Angaben erstellt und dient ausschliesslich der Orientierung. Sie ersetzt keine professionelle Finanz- oder Vorsorgeberatung durch eine qualifizierte Fachperson (CFP, Vorsorgeberater).\n\n' +
    'Alle Berechnungen sind Richtwerte auf Basis vereinfachter Annahmen. Anderungen der gesetzlichen Grundlagen, deiner personlichen Situation oder der Kapitalmarktentwicklung konnen die Ergebnisse wesentlich beeinflussen.\n\n' +
    'Fur verbindliche Auskunfte wende dich an deine Pensionskasse, die zustandige Ausgleichskasse (SVA) oder einen zertifizierten Finanzplaner (fpvs.ch).\n\n' +
    'Dieser Prototyp wurde im Rahmen einer Masterarbeit an der Fachhochschule Nordwestschweiz (FHNW), MAS Information Systems Management 2026, entwickelt und dient ausschliesslich zu Demonstrations- und Forschungszwecken.'
  const dLines = doc.splitTextToSize(disclaimer, CW - 12)
  doc.text(dLines, ML + 6, y + 17)
  y += 66

  // Footer branding bar
  if (y + 16 < PAGE_H - 4) {
    doc.setFillColor(...NAVY)
    doc.rect(ML, y, CW, 14, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('WealthWise', ML + 4, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.text('Digitale Vorsorgeplanung Schweiz', ML + 4, y + 11)
    doc.setTextColor(160, 190, 220)
    doc.text(dateStr, W - MR - 4, y + 6, { align: 'right' })
    doc.text(`Analyse fur: ${names}`, W - MR - 4, y + 11, { align: 'right' })
  }

  doc.save(`WealthWise-Analyse-${(data.person1Name || 'Analyse').replace(/\s+/g, '-')}.pdf`)
}
