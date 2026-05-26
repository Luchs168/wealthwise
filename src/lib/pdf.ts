import jsPDF from 'jspdf'
import { fmtCHF } from './calc'
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

export async function exportPDF(data: PdfData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { analysis } = data

  const verdictColor = analysis.verdict === 'green' ? GREEN : analysis.verdict === 'yellow' ? AMBER : RED
  const verdictLabel = analysis.verdict === 'green' ? 'Gut aufgestellt' : analysis.verdict === 'yellow' ? 'Anpassungen empfohlen' : 'Handlungsbedarf'

  // Defensive income: use AHV+PK components — analysis.monthlyIncome.total can be 0 on stale state
  const ahvMonthlyInkl13 = Math.round(analysis.ahv.combinedYearlyInkl13 / 12)
  const pkMonthlyDisplay = data.displayPkMonthly ?? analysis.pk.combinedMonthly
  const effectiveTotalMonthly = ahvMonthlyInkl13 + pkMonthlyDisplay

  const surplus = data.surplusAfterTax ?? analysis.surplus
  const names = data.person2Name ? `${data.person1Name} & ${data.person2Name}` : data.person1Name
  const dateStr = new Date().toLocaleDateString('de-CH')
  const riskLabel = data.riskProfile === 'conservative' ? 'Konservativ' : data.riskProfile === 'growth' ? 'Wachstum' : 'Ausgewogen'

  let y = 0

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
    doc.text('Persönliche Vorsorgeanalyse', ML + 22, 8)
    doc.setTextColor(160, 190, 220)
    doc.text(names, W / 2, 8, { align: 'center' })
    doc.text(`${dateStr} · Seite ${pageNum}`, W - MR, 8, { align: 'right' })
    y = 22
  }

  function addPage(pageNum: number) {
    doc.addPage()
    pageHeader(pageNum)
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

  function checkBreak(needed: number, pageNum: number) {
    if (y + needed > PAGE_H - 18) addPage(pageNum)
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

  // Page 1: white background with wider navy header (not the standard pageHeader)
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
  doc.text('Persönliche Vorsorgeanalyse', ML, y)
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

  // Verdict box (compact)
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

  // Key info chips (4 in one row)
  const chips: [string, string][] = [
    ['Pensionierung', `${data.retirementAge1} Jahre`],
    ['Risikoprofil', riskLabel],
    ['Kanton', data.location?.kanton ?? (data.canton ?? '–')],
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

  section('Zusammenfassung', 'Ihre Vorsorgesituation auf einen Blick')

  const kpiW = (CW - 8) / 3
  const kpiH = 32

  const surplusKpiColor = surplus >= 0 ? GREEN : Math.abs(surplus) <= 500 ? AMBER : RED
  kpiBox(ML, y, kpiW, kpiH, 'Monatliche Situation',
    `${surplus >= 0 ? '+' : ''}CHF ${fmtCHF(surplus)}/Mt.`,
    surplus >= 0 ? 'Überschuss nach Pensionierung' : 'Lücke pro Monat',
    surplusKpiColor)

  const depAge = data.depletionAge ?? (analysis.ageWhenBroke ?? 99)
  const depColor = depAge >= 90 ? GREEN : depAge >= 85 ? AMBER : RED
  kpiBox(ML + kpiW + 4, y, kpiW, kpiH, 'Vermögen reicht bis',
    depAge >= 99 ? 'Alter 95+' : `Alter ${depAge}`,
    'Stat. Lebenserwartung ~85–87 J.',
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

  // AHV (2-line row)
  doc.setFillColor(...INK1)
  doc.rect(ML, y - 4, CW, 16, 'F')
  doc.setTextColor(...INK)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('AHV (1. Säule, inkl. 13. Monatsrente)', ML + 3, y)
  doc.text(`CHF ${fmtCHF(ahvMonthlyInkl13)}/Mt.`, W - MR - 3, y, { align: 'right' })
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK5)
  doc.text(
    `Basisrente: CHF ${fmtCHF(analysis.ahv.combinedMonthly)}/Mt. · 13. Rente: +CHF ${fmtCHF(Math.round(analysis.ahv.combinedMonthly / 12))}/Mt.`,
    ML + 3, y + 6,
  )
  y += 16

  // PK row
  doc.setFillColor(255, 255, 255)
  doc.rect(ML, y - 4, CW, 10, 'F')
  doc.setTextColor(...INK)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Pensionskasse (2. Säule)', ML + 3, y)
  doc.text(`CHF ${fmtCHF(pkMonthlyDisplay)}/Mt.`, W - MR - 3, y, { align: 'right' })
  y += 10

  // Total row (2-line, navy background)
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
  doc.text(`−CHF ${fmtCHF(data.monthlyBudget)}/Mt.`, W - MR - 3, y, { align: 'right' })
  y += 10

  // Tax row
  if (data.retirementTaxMonthly && data.retirementTaxMonthly > 0) {
    doc.setFillColor(255, 255, 255)
    doc.rect(ML, y - 4, CW, 10, 'F')
    doc.setTextColor(...INK)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Einkommenssteuer (geschätzt)', ML + 3, y)
    doc.setTextColor(...RED)
    doc.text(`−CHF ${fmtCHF(data.retirementTaxMonthly)}/Mt.`, W - MR - 3, y, { align: 'right' })
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
  doc.text(surplus >= 0 ? 'Monatlicher Überschuss (n. St.)' : 'Monatliche Vorsorgelücke (n. St.)', ML + 4, y + 8)
  doc.text(`${surplus >= 0 ? '+' : ''}CHF ${fmtCHF(surplus)}/Mt.`, W - MR - 4, y + 8, { align: 'right' })
  y += 16

  // ═══════════════════════════════════════════════════════════════════════════
  // SEITE 2: VERMÖGENSVERLAUF + SZENARIEN + VERMÖGEN BEI PENSIONIERUNG
  // ═══════════════════════════════════════════════════════════════════════════
  addPage(2)
  section('Vermögensverlauf', `Vermögensentwicklung bis Alter 95 · Risikoprofil: ${riskLabel}`)

  // ─── Stacked bar chart helper ────────────────────────────────────────────────

  const VIOLET     = [124, 58, 237]  as [number, number, number]
  const DKBLUE     = [30,  58, 138]  as [number, number, number]
  const LTBLUE     = [147, 197, 253] as [number, number, number]
  const MDBLUE     = [37,  99,  235] as [number, number, number]

  function drawStackedBarChart(
    rows: Array<{ age: number; wealthLiquid: number; wealthWertschriften: number; wealthGebunden: number; wealthImmobilien: number; wealthEndOfYear: number }>,
    chartLabel: string,
    verdictText: string,
    verdictIsGood: boolean,
    chartTopY: number,
  ): number {
    // Filter to 5-year intervals
    const ra = data.retirementAge1
    const pts = rows.filter(r => r.age >= ra && r.age <= 95 && (r.age - ra) % 5 === 0)
    if (pts.length === 0) return chartTopY

    // Compute per-point totals (wealthEndOfYear + gebunden + immobilien)
    const totals = pts.map(r =>
      Math.max(0, r.wealthEndOfYear) + r.wealthGebunden + r.wealthImmobilien)
    const maxTotal = Math.max(...totals, 1)
    const tickSz = maxTotal > 2_000_000 ? 500_000 : maxTotal > 1_000_000 ? 250_000 : maxTotal > 500_000 ? 100_000 : 50_000
    const yMax = Math.max(tickSz, Math.ceil(maxTotal / tickSz) * tickSz)

    const leftPad = 20
    const bottomPad = 12
    const chartH = 50  // mm total (visual area + x labels)
    const plotH = chartH - bottomPad
    const plotX = ML + leftPad
    const plotY = chartTopY
    const plotW = CW - leftPad
    const numBars = pts.length
    const slotW = plotW / numBars
    const barW = Math.min(slotW * 0.65, 14)

    // Chart label + verdict
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    doc.text(chartLabel, plotX, plotY - 1)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...(verdictIsGood ? GREEN : RED))
    doc.text(verdictText, W - MR, plotY - 1, { align: 'right' })

    // Plot background
    doc.setFillColor(250, 251, 253)
    doc.rect(plotX, plotY, plotW, plotH, 'F')
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.25)
    doc.rect(plotX, plotY, plotW, plotH, 'S')

    // Y axis grid + labels
    const numTicks = 4
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

    // Draw bars
    pts.forEach((r, i) => {
      const barX = plotX + i * slotW + (slotW - barW) / 2
      const wFree = Math.max(0, r.wealthEndOfYear)
      const sfRaw = r.wealthLiquid + r.wealthWertschriften
      const sf = sfRaw > 0 ? r.wealthLiquid / sfRaw : 0.3
      const liq  = Math.round(wFree * sf)
      const wert = wFree - liq
      const geb  = r.wealthGebunden
      const immob = r.wealthImmobilien
      const total = liq + wert + geb + immob

      if (total === 0) return

      // Stack from bottom: liquid → wertschriften → gebunden → immobilien
      let stackY = plotY + plotH
      const segments = [
        { val: liq,   color: LTBLUE },
        { val: wert,  color: DKBLUE },
        { val: geb,   color: VIOLET },
        { val: immob, color: MDBLUE },
      ]
      for (const seg of segments) {
        if (seg.val <= 0) continue
        const h = (seg.val / yMax) * plotH
        stackY -= h
        doc.setFillColor(...seg.color)
        doc.rect(barX, stackY, barW, h, 'F')
      }

      // X axis label: age (+ year below)
      const barCenterX = barX + barW / 2
      doc.setTextColor(...INK5)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      doc.text(`${r.age}`, barCenterX, plotY + plotH + 5, { align: 'center' })
    })

    doc.setLineWidth(0.2)
    return chartTopY + chartH + 6
  }

  // ─── Stacked bar charts (Neutral + Pessimistic) ───────────────────────────────

  if (data.scenarios) {
    const neutralBreak = data.scenarios.neutral.ageWhenBroke
    const pessBreak    = data.scenarios.pessimistic.ageWhenBroke

    const neutLabel    = 'Neutrales Szenario (3.5% Rendite · 1.5% Inflation)'
    const neutVerdict  = neutralBreak == null || neutralBreak >= 99 ? 'Vermögen reicht.' : `Reicht bis Alter ${neutralBreak}`
    const pessLabel    = 'Pessimistisches Szenario (1% Rendite · 2.5% Inflation)'
    const pessVerdict  = pessBreak == null || pessBreak >= 99 ? 'Vermögen reicht.' : `Reicht nicht! (bis ${pessBreak})`

    y += 4
    y = drawStackedBarChart(data.scenarios.neutral.yearlyCashflow,    neutLabel, neutVerdict, neutralBreak == null || neutralBreak >= 99, y)
    y = drawStackedBarChart(data.scenarios.pessimistic.yearlyCashflow, pessLabel, pessVerdict, pessBreak == null || pessBreak >= 99, y)

    // Legend
    const legendItems = [
      { color: VIOLET,  label: 'Geb. Vorsorge (3a)' },
      { color: DKBLUE,  label: 'Wertschriften' },
      { color: LTBLUE,  label: 'Liquidität' },
      { color: MDBLUE,  label: 'Immobilien' },
    ]
    let legX = ML + 20
    legendItems.forEach(({ color, label }) => {
      doc.setFillColor(...color)
      doc.rect(legX, y, 5, 4, 'F')
      doc.setTextColor(...INK)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text(label, legX + 7, y + 3.5)
      legX += 42
    })
    y += 10
  } else {
    doc.setTextColor(...INK5)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text('Szenarien-Daten nicht verfügbar.', ML, y + 10)
    y += 20
  }

  // ─── Scenario comparison table ─────────────────────────────────────────────

  section('Szenarien im Vergleich')

  const scenariosDisplay = [
    { label: 'Optimistisch', color: GREEN, rate: 5.0, inflation: 1.0, ageWhenBroke: data.scenarios?.optimistic.ageWhenBroke ?? null },
    { label: 'Neutral',      color: NAVY,  rate: 3.5, inflation: 1.5, ageWhenBroke: data.scenarios?.neutral.ageWhenBroke ?? analysis.ageWhenBroke },
    { label: 'Pessimistisch',color: RED,   rate: 1.0, inflation: 2.5, ageWhenBroke: data.scenarios?.pessimistic.ageWhenBroke ?? null },
  ]

  doc.setFillColor(...NAVY)
  doc.rect(ML, y, CW, 9, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  const cols = [ML + 3, ML + 40, ML + 88, ML + 123, W - MR - 3]
  const hdrs = ['Szenario', 'Rendite / Inflation', 'Renten/Mt.', 'Differenz n. St.', 'Vermögen reicht bis']
  hdrs.forEach((h, i) => doc.text(h, i === 4 ? cols[i] : cols[i], y + 6, { align: i === 4 ? 'right' : 'left' }))
  y += 9

  scenariosDisplay.forEach((sc, idx) => {
    checkBreak(12, 2)
    const rowBg = idx % 2 === 0 ? INK1 : ([255, 255, 255] as [number, number, number])
    doc.setFillColor(...rowBg)
    doc.rect(ML, y, CW, 11, 'F')
    doc.setFillColor(...sc.color)
    doc.rect(ML, y, 3, 11, 'F')
    doc.setTextColor(...INK)
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'bold')
    doc.text(sc.label, cols[0] + 5, y + 7)
    doc.setFont('helvetica', 'normal')
    doc.text(`${sc.rate}% / ${sc.inflation}%`, cols[1], y + 7)
    doc.text(`CHF ${fmtCHF(effectiveTotalMonthly)}`, cols[2], y + 7)
    const diff = effectiveTotalMonthly - data.monthlyBudget - (data.retirementTaxMonthly ?? 0)
    doc.setTextColor(...(diff >= 0 ? GREEN : RED))
    doc.text(`${diff >= 0 ? '+' : ''}CHF ${fmtCHF(diff)}`, cols[3], y + 7)
    doc.setTextColor(...INK)
    doc.text(sc.ageWhenBroke ? `Bis Alter ${sc.ageWhenBroke}` : 'Bis Alter 95+', cols[4], y + 7, { align: 'right' })
    y += 11
  })

  y += 8

  // ─── Vermögen bei Pensionierung ────────────────────────────────────────────

  if (data.wealthAtRetirement && data.wealthAtRetirement > 0) {
    checkBreak(50, 2)
    section('Vermögen bei Pensionierung')

    const wealthRows = [
      data.freeAssets && data.freeAssets > 0 ? ['Bankguthaben / Sparkonten', `CHF ${fmtCHF(data.freeAssets)}`] : null,
      data.balance3a1 && data.balance3a1 > 0 ? ['Säule 3a (bei Pensionierung, inkl. Wachstum)', `CHF ${fmtCHF(data.balance3a1)}`] : null,
      data.fzBalance1 && data.fzBalance1 > 0 ? ['Freizügigkeitsguthaben (bei Pensionierung)', `CHF ${fmtCHF(data.fzBalance1)}`] : null,
      data.pkCapital1 && data.pkCapital1 > 0 ? ['PK-Kapitalbezug (brutto)', `CHF ${fmtCHF(data.pkCapital1)}`] : null,
      ['Total Vermögen bei Pensionierung', `CHF ${fmtCHF(data.wealthAtRetirement)}`],
    ].filter(Boolean) as [string, string][]

    wealthRows.forEach((r, i) => {
      const isTotal = i === wealthRows.length - 1
      checkBreak(10, 2)
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

  // ═══════════════════════════════════════════════════════════════════════════
  // SEITE 3: VORSORGEÜBERSICHT + HANDLUNGSEMPFEHLUNGEN
  // ═══════════════════════════════════════════════════════════════════════════
  addPage(3)
  section('Vorsorgeübersicht', 'Ihre drei Vorsorgesäulen im Detail')

  const isCouple = !!(analysis.ahv.person2 && data.person2Name)

  // 1. Säule – AHV
  y += 2
  doc.setFillColor(...NAVY2)
  doc.roundedRect(ML, y, CW, 8, 2, 2, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('1. Säule – AHV / IV', ML + 4, y + 5.5)
  y += 12

  doc.setTextColor(...INK)
  const ahvRows: [string, string][] = [
    [isCouple ? 'AHV-Rente Person 1' : 'AHV-Rente', `CHF ${fmtCHF(analysis.ahv.person1?.monthlyRente ?? 0)}/Mt.`],
    ...(isCouple ? [['AHV-Rente Person 2', `CHF ${fmtCHF(analysis.ahv.person2?.monthlyRente ?? 0)}/Mt.`] as [string, string]] : []),
    ...(analysis.ahv.plafonReduction > 0 ? [['Plafonierung (Ehepaar)', `−CHF ${fmtCHF(analysis.ahv.plafonReduction)}/Mt.`] as [string, string]] : []),
    ['13. AHV-Rente (auf 12 Mt. verteilt)', `+CHF ${fmtCHF(Math.round(analysis.ahv.combinedMonthly / 12))}/Mt.`],
    ['Total AHV inkl. 13. Rente', `CHF ${fmtCHF(ahvMonthlyInkl13)}/Mt.`],
  ]
  ahvRows.forEach(r => { checkBreak(8, 3); row2col(r[0], r[1], r[0].startsWith('Total')) })
  y += 6

  // 2. Säule – PK
  checkBreak(40, 3)
  doc.setFillColor(...NAVY2)
  doc.roundedRect(ML, y, CW, 8, 2, 2, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('2. Säule – Pensionskasse', ML + 4, y + 5.5)
  y += 12

  doc.setTextColor(...INK)
  const pkRows: [string, string][] = [
    ...(data.pkCapital1 && data.pkCapital1 > 0
      ? [[isCouple ? 'PK-Kapitalbezug Person 1 (brutto)' : 'PK-Kapitalbezug (brutto)', `CHF ${fmtCHF(data.pkCapital1)}`] as [string, string]]
      : []),
    ...(pkMonthlyDisplay > 0
      ? [[isCouple ? 'PK-Rente Person 1' : 'PK-Rente', `CHF ${fmtCHF(pkMonthlyDisplay)}/Mt.`] as [string, string]]
      : []),
    ...(data.pkRate1 ? [['Umwandlungssatz', `${data.pkRate1}%`] as [string, string]] : []),
    ['Total PK-Rente', `CHF ${fmtCHF(pkMonthlyDisplay)}/Mt.`],
  ]
  pkRows.forEach(r => { checkBreak(8, 3); row2col(r[0], r[1], r[0].startsWith('Total')) })
  y += 6

  // 3. Säule – Private Vorsorge
  checkBreak(40, 3)
  doc.setFillColor(...NAVY2)
  doc.roundedRect(ML, y, CW, 8, 2, 2, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('3. Säule – Privates Vorsorgevermögen', ML + 4, y + 5.5)
  y += 12

  doc.setTextColor(...INK)
  const p3Rows: [string, string][] = [
    ...(data.balance3a1 && data.balance3a1 > 0 ? [['Säule 3a (bei Pensionierung)', `CHF ${fmtCHF(data.balance3a1)}`] as [string, string]] : []),
    ...(data.fzBalance1 && data.fzBalance1 > 0 ? [['Freizügigkeitsguthaben (bei Pensionierung)', `CHF ${fmtCHF(data.fzBalance1)}`] as [string, string]] : []),
    ...(data.hasProperty ? [['Wohneigentum (Marktwert)', `CHF ${fmtCHF(data.propertyValue ?? 0)}`] as [string, string]] : []),
  ]

  if (p3Rows.length === 0) {
    doc.setTextColor(...INK5)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text('Keine privaten Vorsorgewerte erfasst.', ML + 3, y)
    y += 8
  } else {
    p3Rows.forEach(r => { checkBreak(8, 3); row2col(r[0], r[1]) })
  }

  y += 4

  // Total income row
  checkBreak(16, 3)
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
  doc.text(`Pensionierungsalter ${data.retirementAge1} Jahre · AHV inkl. 13. Rente + PK`, ML + 3, y + 6)
  y += 20

  // ─── Handlungsempfehlungen (compact) ──────────────────────────────────────

  checkBreak(30, 3)
  section('Handlungsempfehlungen', `Priorisierte Massnahmen · Bewertung: ${verdictLabel}`)

  const allRecs: Array<{ text: string; priority: 'hoch' | 'mittel' | 'niedrig'; detail: string }> =
    analysis.verdict === 'green' ? [
      { text: 'Säule-3a-Gelder gestaffelt beziehen.', priority: 'mittel', detail: 'Bezug über 3–5 Jahre nutzt den Progressionsvorteil und spart erheblich Steuern.' },
      { text: 'Anlagestrategie auf Pensionierungsrisiko prüfen.', priority: 'mittel', detail: 'Aktienquote 5–10 Jahre vor Pensionierung auf 40–50% reduzieren, um das Sequence-of-Returns-Risiko zu mindern.' },
      { text: 'PK-Einkauf zur steuerlichen Optimierung prüfen.', priority: 'niedrig', detail: 'Steuerlich voll abzugsfähig; bei Grenzsteuersatz 25% spart CHF 50\'000 Einkauf ca. CHF 12\'500 Steuern.' },
      { text: 'Nachlassplanung aktualisieren.', priority: 'niedrig', detail: 'Testament, PK-Begünstigungsklauseln und Lebensversicherungen regelmässig auf den neuesten Stand bringen.' },
    ] : analysis.verdict === 'yellow' ? [
      { text: 'AHV-Beitragslücken schliessen.', priority: 'hoch', detail: 'Jedes fehlende Beitragsjahr kürzt die AHV-Rente lebenslang um ~2.3%. Nachzahlung über die kantonale SVA möglich.' },
      { text: 'PK-Einkauf prüfen.', priority: 'hoch', detail: `CHF 50'000 Einkauf spart ~CHF 12'500 Steuern und steigert die PK-Rente um ca. CHF ${fmtCHF(Math.round(50000 * 0.054 / 12))}/Mt.` },
      { text: '3a-Einzahlungen maximieren.', priority: 'mittel', detail: 'CHF 7\'258/Jahr (mit PK) resp. CHF 36\'288/Jahr (ohne PK). Jeder Franken senkt das steuerbare Einkommen direkt.' },
      { text: 'Teilpensionierung prüfen.', priority: 'mittel', detail: 'Stufenpensionierung (z.B. 80% ab 63, 100% ab 65) reduziert den Einkommensverlust und optimiert die Steuerbelastung.' },
    ] : [
      { text: 'PK-Einkauf dringend prüfen.', priority: 'hoch', detail: 'Die wirksamste Massnahme – steuerlich optimal und erhöht die lebenslange Rente. Kontakt zur Pensionskasse aufnehmen.' },
      { text: 'AHV-Aufschub evaluieren.', priority: 'hoch', detail: 'Aufschub um 1 Jahr erhöht die AHV-Rente lebenslang um 5.2% (max. +31.3% bei Aufschub bis 70). Sehr attraktiv bei guter Gesundheit.' },
      { text: 'Rentenbeginn verschieben oder Budget anpassen.', priority: 'hoch', detail: `Jedes zusätzliche Erwerbsjahr verbessert AHV, PK und reduziert den Vermögensverzehr erheblich.` },
      { text: 'Professionelle Vorsorgeberatung in Anspruch nehmen.', priority: 'hoch', detail: 'Bei kritischer Vorsorgelücke ist eine CFP-Beratung dringend empfohlen – fpvs.ch vermittelt zertifizierte Berater.' },
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
    checkBreak(boxH + 4, 3)

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
  // SEITE 4: ANNAHMEN & DISCLAIMER
  // ═══════════════════════════════════════════════════════════════════════════
  addPage(4)
  section('Annahmen & Grundlagen', 'Verwendete Parameter für diese Analyse')

  const max3aStr = data.hasPK === false
    ? "CHF 36'288 p.a. (ohne PK / Selbständigerwerbende)"
    : data.hasPK === true
    ? "CHF 7'258 p.a. (mit Pensionskasse)"
    : "CHF 7'258 (mit PK) / CHF 36'288 (ohne PK)"

  const assumptions: [string, string][] = [
    ['AHV-Daten', "Rentenskala 44, BSV 2026 · Min. CHF 14'700 / Max. CHF 29'400 · Einkommensgrenze CHF 88'200"],
    ['Umwandlungssatz PK', `${data.pkRate1 ?? 5.4}% (BVG-Kennzahlen 2026)`],
    ['Risikoprofil', riskLabel],
    ['Rendite Neutral', '3.5% p.a. Anlagerendite, 1.5% p.a. Inflation'],
    ['Rendite Optimistisch', '5.0% p.a. Anlagerendite, 1.0% p.a. Inflation'],
    ['Rendite Pessimistisch', '1.0% p.a. Anlagerendite, 2.5% p.a. Inflation'],
    ['Planungshorizont', 'Bis Alter 95 Jahre'],
    ['Steuerkanton', data.location?.kanton ?? (data.canton ?? '–')],
    ['Kirchensteuer', data.kirchensteuer ? 'Ja' : 'Nein'],
    ['Steuergrundlagen', 'DBG 2026, kantonale Tarife (ESTV)'],
    ['3a-Maximum 2026', max3aStr],
    ['Lebenserwartung', 'Mann: 85 Jahre, Frau: 87 Jahre (BFS 2024)'],
    ['Kapitalbezug PK', 'Besteuerung nach Sätzchen-Methode der Steuerverwaltung'],
  ]

  const aLabelW = 56
  const aValueW = CW - aLabelW - 3

  assumptions.forEach((a, i) => {
    checkBreak(10, 4)
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
  checkBreak(50, 4)
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
    'Diese Analyse wurde von WealthWise auf Basis Ihrer persönlichen Angaben erstellt und dient ausschliesslich der Orientierung. Sie ersetzt keine professionelle Finanz- oder Vorsorgeberatung durch eine qualifizierte Fachperson (CFP, Vorsorgeberater).\n\n' +
    'Alle Berechnungen sind Richtwerte auf Basis vereinfachter Annahmen. Änderungen der gesetzlichen Grundlagen, Ihrer persönlichen Situation oder der Kapitalmarktentwicklung können die Ergebnisse wesentlich beeinflussen.\n\n' +
    'Für verbindliche Auskünfte wenden Sie sich an Ihre Pensionskasse, die zuständige Ausgleichskasse (SVA) oder einen zertifizierten Finanzplaner (fpvs.ch).'
  const dLines = doc.splitTextToSize(disclaimer, CW - 12)
  doc.text(dLines, ML + 6, y + 17)
  y += 54

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
    doc.text(`Analyse für: ${names}`, W - MR - 4, y + 11, { align: 'right' })
  }

  doc.save(`WealthWise-Analyse-${(data.person1Name || 'Analyse').replace(/\s+/g, '-')}.pdf`)
}
