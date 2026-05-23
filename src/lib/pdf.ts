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
  surplusAfterTax?: number     // after-tax surplus (used throughout instead of analysis.surplus)
  displayPkMonthly?: number    // actual PK monthly adjusted for Bezugsart (kapital/rente/mix)
  // Extended fields for professional report
  riskProfile?: 'conservative' | 'balanced' | 'growth'
  canton?: string
  kirchensteuer?: boolean
  wealthAtRetirement?: number
  depletionAge?: number | null
  pkCapital1?: number
  pkRate1?: number
  balance3a1?: number          // projected 3a balance at retirement
  fzBalance1?: number          // projected FZ balance at retirement
  hasProperty?: boolean
  propertyValue?: number
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
const ML = 18  // margin left
const MR = 18  // margin right
const CW = W - ML - MR

export async function exportPDF(data: PdfData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const { analysis } = data
  const verdictColor = analysis.verdict === 'green' ? GREEN : analysis.verdict === 'yellow' ? AMBER : RED
  const verdictLabel = analysis.verdict === 'green' ? 'Gut aufgestellt' : analysis.verdict === 'yellow' ? 'Anpassungen empfohlen' : 'Handlungsbedarf'
  // Use after-tax surplus everywhere — falls back to pre-tax if not provided
  const surplus = data.surplusAfterTax ?? analysis.surplus
  // Actual PK monthly (adjusted for Bezugsart) — falls back to calculated value
  const pkMonthlyDisplay = data.displayPkMonthly ?? analysis.pk.combinedMonthly
  const names = data.person2Name ? `${data.person1Name} & ${data.person2Name}` : data.person1Name
  const dateStr = new Date().toLocaleDateString('de-CH')
  const riskLabel = data.riskProfile === 'conservative' ? 'Konservativ' : data.riskProfile === 'growth' ? 'Wachstum' : 'Ausgewogen'

  let y = 0

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function pageHeader(pageNum: number) {
    // Explicitly fill entire page with white — prevents any dark fill-color state
    // from a previous page leaking into this page's background.
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
    doc.setFillColor(...NAVY)
    doc.rect(ML, y, CW, 1, 'F')
    y += 4
    doc.setTextColor(...NAVY)
    doc.setFontSize(15)
    doc.setFont('helvetica', 'bold')
    doc.text(title, ML, y)
    y += 7
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
    // Explicit background: light blue-gray for totals/bold rows, white for normal rows
    const rowBg: [number, number, number] = bold ? [235, 241, 252] : [255, 255, 255]
    doc.setFillColor(...rowBg)
    doc.rect(ML, y - 5, CW, 8, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(...(highlight ?? INK))
    doc.text(label, ML + 2, y)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.text(value, W - MR, y, { align: 'right' })
    y += 6
    doc.setDrawColor(...BORDER)
    doc.line(ML, y - 1, W - MR, y - 1)
  }

  function kpiBox(x: number, yy: number, w: number, h: number, label: string, value: string, sub: string, color: [number, number, number]) {
    // White background
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(x, yy, w, h, 3, 3, 'F')
    // Light gray border
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.4)
    doc.roundedRect(x, yy, w, h, 3, 3, 'S')
    doc.setLineWidth(0.2)
    // Thin colored top accent bar
    doc.setFillColor(...color)
    doc.rect(x + 8, yy, w - 16, 1.5, 'F')
    // Label (small, gray)
    doc.setTextColor(...INK5)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x + w / 2, yy + 10, { align: 'center' })
    // Value (big, signal color)
    doc.setTextColor(...color)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(value, x + w / 2, yy + 20, { align: 'center' })
    // Sub context (small, gray)
    doc.setTextColor(...INK5)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    const subLines = doc.splitTextToSize(sub, w - 6)
    doc.text(subLines, x + w / 2, yy + 27, { align: 'center' })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEITE 1: DECKBLATT (weisser Hintergrund, druckfreundlich)
  // ═══════════════════════════════════════════════════════════════════════════

  // White background — never dark-mode
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, W, PAGE_H, 'F')

  // Navy header bar
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('WealthWise', ML, 11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 200, 240)
  doc.text('Digitale Vorsorgeplanung Schweiz', ML + 24, 11)
  doc.setTextColor(160, 200, 240)
  doc.text(dateStr, W - MR, 11, { align: 'right' })

  // Thin accent band
  doc.setFillColor(...NAVY2)
  doc.rect(0, 18, W, 2, 'F')

  // Title block — dark text on white
  doc.setTextColor(...NAVY)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text('Persönliche', ML, 55)
  doc.text('Vorsorgeanalyse', ML, 70)

  // Name & location
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK)
  doc.text(names, ML, 86)
  if (data.location) {
    doc.setFontSize(11)
    doc.setTextColor(...INK5)
    doc.text(`${data.location.ort}, Kanton ${data.location.kanton}`, ML, 94)
  }

  // Horizontal rule
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.8)
  doc.line(ML, 100, W - MR, 100)
  doc.setLineWidth(0.2)

  // Verdict box (colored, white text)
  doc.setFillColor(...verdictColor)
  doc.roundedRect(ML, 108, CW, 32, 6, 6, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(verdictLabel, ML + 10, 121)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Score ${analysis.sustainabilityScore}/100`, ML + 10, 131)
  doc.text(`Renten: CHF ${fmtCHF(analysis.monthlyIncome.total)}/Mt.`, ML + 60, 121)
  doc.text(`Budget: CHF ${fmtCHF(data.monthlyBudget)}/Mt.`, ML + 60, 131)

  // Key info grid on white
  const coverItems: [string, string][] = [
    ['Pensionierungsalter', `${data.retirementAge1} Jahre`],
    ['Risikoprofil', riskLabel],
    ['Steuerkanton', data.location?.kanton ?? '–'],
    ['Analyse erstellt', dateStr],
  ]
  doc.setFontSize(9)
  const ciW = (CW - 6) / 2
  coverItems.forEach(([label, value], i) => {
    const cx = ML + (i % 2) * (ciW + 6)
    const cy = 152 + Math.floor(i / 2) * 18
    doc.setFillColor(...INK1)
    doc.roundedRect(cx, cy, ciW, 14, 2, 2, 'F')
    doc.setTextColor(...INK5)
    doc.setFont('helvetica', 'normal')
    doc.text(label, cx + 6, cy + 6)
    doc.setTextColor(...NAVY)
    doc.setFont('helvetica', 'bold')
    doc.text(value, cx + 6, cy + 11.5)
  })

  // Footer disclaimer — dark on white
  doc.setTextColor(...INK5)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Erstellt am ${dateStr} auf Basis Ihrer Angaben.`, ML, PAGE_H - 22)
  doc.text('Diese Analyse ersetzt keine professionelle Finanz- oder Vorsorgeberatung.', ML, PAGE_H - 15)

  // ═══════════════════════════════════════════════════════════════════════════
  // SEITE 2: ZUSAMMENFASSUNG
  // ═══════════════════════════════════════════════════════════════════════════
  addPage(2)

  section('Zusammenfassung', 'Ihre Vorsorgesituation auf einen Blick')

  // 3 KPI boxes
  const kpiW = (CW - 8) / 3
  const kpiH = 32

  const surplusColor = surplus >= 0 ? GREEN : Math.abs(surplus) <= 500 ? AMBER : RED
  const surplusVal = `${surplus >= 0 ? '+' : ''}CHF ${fmtCHF(surplus)}/Mt.`
  kpiBox(ML, y, kpiW, kpiH, 'Monatliche Situation', surplusVal, surplus >= 0 ? 'Überschuss nach Pensionierung' : 'Lücke pro Monat', surplusColor)

  const depAge = data.depletionAge ?? (analysis.ageWhenBroke ?? 99)
  const depColor = depAge >= 90 ? GREEN : depAge >= 85 ? AMBER : RED
  kpiBox(ML + kpiW + 4, y, kpiW, kpiH, 'Vermögen reicht bis', depAge >= 99 ? 'Alter 95+' : `Alter ${depAge}`, 'Stat. Lebenserwartung ~85–87 J.', depColor)

  const urgency = analysis.verdict === 'green' ? 'Tief' : analysis.verdict === 'yellow' ? 'Mittel' : 'Hoch'
  kpiBox(ML + (kpiW + 4) * 2, y, kpiW, kpiH, 'Handlungsbedarf', urgency, analysis.verdict === 'green' ? 'Vorsorge solide aufgestellt' : 'Massnahmen empfohlen', verdictColor)

  y += kpiH + 10

  // Income vs budget table
  section('Einnahmen & Ausgaben im Ruhestand')

  // Row 1: AHV – 2-line row (sub-note below, no same-line overlap)
  checkBreak(16, 2)
  doc.setFillColor(...INK1)
  doc.rect(ML, y - 4, CW, 16, 'F')
  doc.setTextColor(...INK)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('AHV (1. Säule)', ML + 3, y)
  doc.text(`CHF ${fmtCHF(analysis.ahv.combinedMonthly)}/Mt.`, W - MR - 3, y, { align: 'right' })
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK5)
  doc.text(`inkl. 13. AHV-Rente: CHF ${fmtCHF(Math.round(analysis.ahv.combinedMonthly * 13 / 12))}/Mt.`, ML + 3, y + 6)
  y += 16

  // Row 2: PK – standard single-line row
  checkBreak(10, 2)
  doc.setFillColor(255, 255, 255)
  doc.rect(ML, y - 4, CW, 10, 'F')
  doc.setTextColor(...INK)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Pensionskasse (2. Säule)', ML + 3, y)
  doc.text(`CHF ${fmtCHF(pkMonthlyDisplay)}/Mt.`, W - MR - 3, y, { align: 'right' })
  y += 10

  // Row 3: Total – 2-line dark row (no same-line overlap for % text)
  checkBreak(16, 2)
  const pct = data.monthlyBudget > 0 ? Math.round(analysis.monthlyIncome.total / data.monthlyBudget * 100) : 0
  doc.setFillColor(...NAVY)
  doc.rect(ML, y - 4, CW, 16, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Total Renteneinnahmen', ML + 3, y)
  doc.text(`CHF ${fmtCHF(analysis.monthlyIncome.total)}/Mt.`, W - MR - 3, y, { align: 'right' })
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 210, 255)
  doc.text(`${pct}% des monatlichen Bedarfs`, ML + 3, y + 6)
  y += 16

  // Row 4: Budget – standard row
  checkBreak(10, 2)
  doc.setFillColor(...INK1)
  doc.rect(ML, y - 4, CW, 10, 'F')
  doc.setTextColor(...INK)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Monatliches Budget', ML + 3, y)
  doc.text(`CHF ${fmtCHF(data.monthlyBudget)}/Mt.`, W - MR - 3, y, { align: 'right' })
  y += 10

  // Surplus/Gap row
  checkBreak(14, 2)
  y += 2
  doc.setFillColor(...(surplus >= 0 ? ([236, 253, 245] as [number, number, number]) : ([254, 242, 242] as [number, number, number])))
  doc.roundedRect(ML, y, CW, 12, 3, 3, 'F')
  doc.setTextColor(...(surplus >= 0 ? GREEN : RED))
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(surplus >= 0 ? 'Monatlicher Überschuss' : 'Monatliche Vorsorgelücke', ML + 4, y + 8)
  doc.text(`${surplus >= 0 ? '+' : ''}CHF ${fmtCHF(surplus)}/Mt.`, W - MR - 4, y + 8, { align: 'right' })
  y += 18

  // ═══════════════════════════════════════════════════════════════════════════
  // SEITE 3: VERMÖGENSVERLAUF
  // ═══════════════════════════════════════════════════════════════════════════
  addPage(3)
  section('Vermögensverlauf', `Entwicklung bis Alter 95 · Risikoprofil: ${riskLabel}`)

  // Scenario table
  const scenarioRates = data.riskProfile === 'conservative'
    ? { opt: 1.5, base: 0.8, pess: 0 }
    : data.riskProfile === 'growth'
    ? { opt: 5.0, base: 2.5, pess: 0 }
    : { opt: 3.5, base: 2.0, pess: 0 }

  const scenariosDisplay = [
    {
      label: 'Optimistisch', color: GREEN,
      income: data.scenarios?.optimistic.monthlyIncome.total ?? Math.round(analysis.monthlyIncome.total * 1.05),
      ageWhenBroke: data.scenarios?.optimistic.ageWhenBroke ?? null,
      rate: scenarioRates.opt, inflation: 1.0,
    },
    {
      label: 'Neutral', color: NAVY,
      income: data.scenarios?.neutral.monthlyIncome.total ?? analysis.monthlyIncome.total,
      ageWhenBroke: data.scenarios?.neutral.ageWhenBroke ?? analysis.ageWhenBroke,
      rate: scenarioRates.base, inflation: 1.5,
    },
    {
      label: 'Pessimistisch', color: RED,
      income: data.scenarios?.pessimistic.monthlyIncome.total ?? Math.round(analysis.monthlyIncome.total * 0.95),
      ageWhenBroke: data.scenarios?.pessimistic.ageWhenBroke ?? null,
      rate: scenarioRates.pess, inflation: 2.5,
    },
  ]

  // Header
  doc.setFillColor(...NAVY)
  doc.rect(ML, y, CW, 9, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  const cols = [ML + 3, ML + 38, ML + 85, ML + 120, W - MR - 3]
  const hdrs = ['Szenario', 'Rendite p.a.', 'Renten/Mt.', 'Differenz', 'Vermögen reicht bis']
  hdrs.forEach((h, i) => doc.text(h, i === 4 ? cols[i] : cols[i], y + 6, { align: i === 4 ? 'right' : 'left' }))
  y += 9

  scenariosDisplay.forEach((sc, idx) => {
    checkBreak(12, 3)
    doc.setFillColor(idx % 2 === 0 ? INK1[0] : 255, idx % 2 === 0 ? INK1[1] : 255, idx % 2 === 0 ? INK1[2] : 255)
    doc.rect(ML, y, CW, 11, 'F')
    doc.setFillColor(...sc.color)
    doc.rect(ML, y, 3, 11, 'F')
    doc.setTextColor(...INK)
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'bold')
    doc.text(sc.label, cols[0] + 5, y + 7)
    doc.setFont('helvetica', 'normal')
    doc.text(`${sc.rate}% / ${sc.inflation}% Infl.`, cols[1], y + 7)
    doc.text(`CHF ${fmtCHF(sc.income)}`, cols[2], y + 7)
    const diff = sc.income - data.monthlyBudget
    doc.setTextColor(...(diff >= 0 ? GREEN : RED))
    doc.text(`${diff >= 0 ? '+' : ''}CHF ${fmtCHF(diff)}`, cols[3], y + 7)
    doc.setTextColor(...INK)
    const depLabel = sc.ageWhenBroke ? `Bis Alter ${sc.ageWhenBroke}` : 'Bis Alter 95+'
    doc.text(depLabel, cols[4], y + 7, { align: 'right' })
    y += 11
  })

  y += 8

  // Wealth composition (if available)
  if (data.wealthAtRetirement && data.wealthAtRetirement > 0) {
    checkBreak(30, 3)
    section('Vermögen bei Pensionierung')

    const wealthRows = [
      data.balance3a1 && data.balance3a1 > 0 ? ['Säule 3a (bei Pensionierung)', `CHF ${fmtCHF(data.balance3a1)}`] : null,
      data.fzBalance1 && data.fzBalance1 > 0 ? ['Freizügigkeitsguthaben (bei Pensionierung)', `CHF ${fmtCHF(data.fzBalance1)}`] : null,
      data.pkCapital1 && data.pkCapital1 > 0 ? ['PK-Kapitalbezug (brutto)', `CHF ${fmtCHF(data.pkCapital1)}`] : null,
      ['Total Vermögen (inkl. Wachstum, n. Steuern)', `CHF ${fmtCHF(data.wealthAtRetirement)}`],
    ].filter(Boolean) as [string, string][]

    wealthRows.forEach((r, i) => {
      const isTotal = i === wealthRows.length - 1
      if (isTotal) {
        doc.setFillColor(...NAVY)
        doc.rect(ML, y - 4, CW, 10, 'F')
        doc.setTextColor(...WHITE)
      } else {
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
  // SEITE 4: VORSORGEÜBERSICHT
  // ═══════════════════════════════════════════════════════════════════════════
  addPage(4)
  section('Vorsorgeübersicht', 'Ihre drei Vorsorgesäulen im Detail')

  // AHV
  y += 2
  doc.setFillColor(...NAVY2)
  doc.roundedRect(ML, y, CW, 8, 2, 2, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('1. Säule – AHV', ML + 4, y + 5.5)
  y += 12

  const isCouple = !!(analysis.ahv.person2 && data.person2Name)
  // Reset text color to dark ink after the white-text section header
  doc.setTextColor(...INK)
  const ahvRows = [
    [isCouple ? 'AHV-Rente Person 1' : 'AHV-Rente', `CHF ${fmtCHF(analysis.ahv.person1?.monthlyRente ?? 0)}/Mt.`],
    ...(isCouple ? [['AHV-Rente Person 2', `CHF ${fmtCHF(analysis.ahv.person2?.monthlyRente ?? 0)}/Mt.`]] : []),
    ...(analysis.ahv.plafonReduction > 0 ? [['Plafonierung (Ehepaar)', `−CHF ${fmtCHF(analysis.ahv.plafonReduction)}/Mt.`]] : []),
    ['13. AHV-Rente (inkl.)', `+CHF ${fmtCHF(Math.round(analysis.ahv.combinedMonthly / 12))}/Mt.`],
    ['Gesamt AHV inkl. 13.', `CHF ${fmtCHF(Math.round(analysis.ahv.combinedMonthly * 13 / 12))}/Mt.`],
  ]
  ahvRows.forEach(r => { checkBreak(8, 4); row2col(r[0], r[1], r[0].startsWith('Gesamt')) })
  y += 6

  // PK
  checkBreak(40, 4)
  doc.setFillColor(...NAVY2)
  doc.roundedRect(ML, y, CW, 8, 2, 2, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('2. Säule – Pensionskasse', ML + 4, y + 5.5)
  y += 12

  doc.setTextColor(...INK)
  const pkRows = [
    ...(data.pkCapital1 && data.pkCapital1 > 0 ? [[isCouple ? 'PK-Kapitalbezug Person 1 (brutto)' : 'PK-Kapitalbezug (brutto)', `CHF ${fmtCHF(data.pkCapital1)}`]] : []),
    ...(pkMonthlyDisplay > 0 ? [[isCouple ? 'PK-Rente Person 1' : 'PK-Rente', `CHF ${fmtCHF(pkMonthlyDisplay)}/Mt.`]] : []),
    ...(data.pkRate1 ? [['Umwandlungssatz', `${data.pkRate1}%`]] : []),
    ['Gesamt PK-Renten', `CHF ${fmtCHF(pkMonthlyDisplay)}/Mt.`],
  ]
  pkRows.forEach(r => { checkBreak(8, 4); row2col(r[0], r[1], r[0].startsWith('Gesamt')) })
  y += 6

  // 3a/FZ/Property
  checkBreak(40, 4)
  doc.setFillColor(...NAVY2)
  doc.roundedRect(ML, y, CW, 8, 2, 2, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('3. Säule – Privates Vermögen', ML + 4, y + 5.5)
  y += 12

  doc.setTextColor(...INK)
  const p3Rows = [
    data.balance3a1 && data.balance3a1 > 0 ? ['Säule 3a (bei Pensionierung)', `CHF ${fmtCHF(data.balance3a1)}`] : null,
    data.fzBalance1 && data.fzBalance1 > 0 ? ['Freizügigkeitsguthaben (bei Pensionierung)', `CHF ${fmtCHF(data.fzBalance1)}`] : null,
    data.hasProperty ? ['Wohneigentum', `CHF ${fmtCHF(data.propertyValue ?? 0)} (Marktwert)`] : null,
  ].filter(Boolean) as [string, string][]

  if (p3Rows.length === 0) {
    doc.setTextColor(...INK5)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text('Keine privaten Vorsorgewerte erfasst.', ML + 3, y)
    y += 8
  } else {
    p3Rows.forEach(r => { checkBreak(8, 4); row2col(r[0], r[1]) })
  }

  y += 4
  // Summary total – same-width table row, no floating box
  checkBreak(16, 4)
  doc.setFillColor(...NAVY)
  doc.rect(ML, y - 4, CW, 16, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Total monatliches Einkommen', ML + 3, y)
  doc.text(`CHF ${fmtCHF(analysis.monthlyIncome.total)}/Mt.`, W - MR - 3, y, { align: 'right' })
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(210, 225, 255)
  doc.text(`Pensionierungsalter: ${data.retirementAge1} Jahre`, ML + 3, y + 6)
  y += 16

  // ═══════════════════════════════════════════════════════════════════════════
  // SEITE 5: HANDLUNGSEMPFEHLUNGEN
  // ═══════════════════════════════════════════════════════════════════════════
  addPage(5)
  section('Handlungsempfehlungen', `Priorisierte Massnahmen · Bewertung: ${verdictLabel}`)

  const allRecs: Array<{ text: string; priority: 'hoch' | 'mittel' | 'niedrig'; detail: string }> = (
    analysis.verdict === 'green' ? [
      { text: 'Beziehen Sie Säule-3a-Gelder gestaffelt über mehrere Jahre.', priority: 'mittel', detail: `Bei gestaffeltem Bezug über ${data.balance3a1 ? 3 : 2} Jahre sparen Sie durch den Progressionsvorteil Steuern. Planen Sie die Bezüge 3–5 Jahre vor Pensionierung.` },
      { text: 'Überprüfen Sie Ihre Anlagestrategie auf das Pensionierungsrisiko.', priority: 'mittel', detail: 'Reduktion der Aktienquote 5–10 Jahre vor Pensionierung auf max. 40–50% reduziert das Sequence-of-Returns-Risiko.' },
      { text: 'Prüfen Sie einen PK-Einkauf zur steuerlichen Optimierung.', priority: 'niedrig', detail: 'PK-Einkäufe sind steuerlich abzugsfähig. Bei Grenzsteuersatz 25–30% spart ein Einkauf von CHF 50\'000 ca. CHF 12\'500–15\'000 Steuern.' },
      { text: 'Überprüfen Sie Ihre Nachlassplanung.', priority: 'niedrig', detail: 'Testamentarische Verfügung, Begünstigungsklauseln in der PK und Lebensversicherung prüfen.' },
    ] : analysis.verdict === 'yellow' ? [
      { text: 'Schliessen Sie allfällige AHV-Beitragslücken.', priority: 'hoch', detail: 'Jede fehlende Beitragsjahr kürzt die AHV-Rente um ca. 2.3% – lebenslang. Kontaktieren Sie die SVA für eine Nachzahlung.' },
      { text: 'Prüfen Sie Einkäufe in die Pensionskasse.', priority: 'hoch', detail: `Bei einem Grenzsteuersatz von ~25% spart ein PK-Einkauf von CHF 50\'000 ca. CHF 12\'500 Steuern und erhöht Ihre PK-Rente um ca. CHF ${fmtCHF(Math.round(50000 * 0.054 / 12))}/Mt.` },
      { text: 'Maximieren Sie die 3a-Einzahlungen.', priority: 'mittel', detail: 'Maximum 2026: CHF 7\'258/Jahr (mit PK). Jeder Franken reduziert das steuerbare Einkommen direkt.' },
      { text: 'Prüfen Sie eine schrittweise Pensionierung (Teilpensionierung).', priority: 'mittel', detail: 'Pensionierung in zwei Schritten (z.B. 80% ab 63, 100% ab 65) reduziert den Einkommensverlust und die Steuerbelastung.' },
      { text: 'Analysieren Sie Ihre Ausgaben auf Sparpotenzial.', priority: 'niedrig', detail: 'Berufsbedingte Kosten entfallen nach Pensionierung. Ihr effektiver Bedarf könnte tiefer liegen als geplant.' },
    ] : [
      { text: 'Dringend: PK-Einkauf prüfen', priority: 'hoch', detail: 'Der PK-Einkauf ist die wirksamste Massnahme. Kontaktieren Sie Ihre Pensionskasse für einen individuellen Einkaufsplan. Auch kurzfristige Einkäufe bis 3 Jahre vor Pensionierung sind möglich.' },
      { text: 'AHV-Aufschub prüfen', priority: 'hoch', detail: 'Aufschub um 1 Jahr erhöht die AHV-Rente um 5.2% – lebenslang. Bis 70 möglich (max. +31.3%). Bei gutem Gesundheitszustand sehr attraktiv.' },
      { text: 'Ausgaben reduzieren oder Rentenbeginn verschieben', priority: 'hoch', detail: `Jedes zusätzliche Erwerbsjahr erhöht AHV, PK und reduziert den Vermögensverzehr. Eine Pensionierung mit ${data.retirementAge1 + 2} statt ${data.retirementAge1} Jahren verbessert die Situation erheblich.` },
      { text: 'Professionelle Vorsorgeberatung', priority: 'hoch', detail: 'Bei einer kritischen Vorsorgelücke ist eine individuelle CFP-Beratung (Certified Financial Planner) dringend empfohlen. fpvs.ch vermittelt zertifizierte Berater.' },
      { text: 'Partielle Kapitalauszahlung aus PK prüfen', priority: 'mittel', detail: 'Falls PK-Kapital vorhanden: Eine Kombination aus Rente + Kapital kann die Flexibilität erhöhen und die Lücke überbrücken.' },
    ]
  )

  allRecs.slice(0, 5).forEach((rec, i) => {
    const pColor = rec.priority === 'hoch' ? RED : rec.priority === 'mittel' ? AMBER : GREEN
    const pLabel = rec.priority === 'hoch' ? 'Dringend' : rec.priority === 'mittel' ? 'Empfohlen' : 'Optional'

    doc.setFontSize(10)
    const titleLines: string[] = doc.splitTextToSize(`${i + 1}. ${rec.text}`, CW - 14)
    doc.setFontSize(8.5)
    const detailLines: string[] = doc.splitTextToSize(rec.detail, CW - 14)
    const shownDetail = detailLines.slice(0, 2)

    const boxH = 13 + titleLines.length * 5.5 + shownDetail.length * 5
    checkBreak(boxH + 4, 5)

    doc.setFillColor(250, 250, 252)
    doc.roundedRect(ML, y, CW, boxH, 3, 3, 'F')
    doc.setFillColor(...pColor)
    doc.roundedRect(ML, y, 3, boxH, 1, 1, 'F')

    // Priority badge
    doc.setFillColor(...pColor)
    doc.setTextColor(...WHITE)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    const pBadgeW = pLabel.length * 1.8 + 6
    doc.roundedRect(ML + 6, y + 3, pBadgeW, 6, 2, 2, 'F')
    doc.text(pLabel, ML + 6 + pBadgeW / 2, y + 7.5, { align: 'center' })

    doc.setTextColor(...INK)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(titleLines, ML + 6, y + 13)

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK5)
    doc.text(shownDetail, ML + 6, y + 13 + titleLines.length * 5.5)

    y += boxH + 4
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // SEITE 6: ANNAHMEN & DISCLAIMER
  // ═══════════════════════════════════════════════════════════════════════════
  addPage(6)
  section('Annahmen & Grundlagen', 'Verwendete Parameter für diese Analyse')

  const assumptions: [string, string][] = [
    ['AHV-Daten', 'AHV-Rentenskala 44, Stand 2026 (BSV)'],
    ['Umwandlungssatz', `${data.pkRate1 ?? 5.4}%, BVG-Kennzahlen 2026`],
    ['Risikoprofil', riskLabel],
    ['Inflation (Neutral)', '1.5% p.a.'],
    ['Anlagerendite (Neutral)', data.riskProfile === 'conservative' ? '0.8% p.a.' : data.riskProfile === 'growth' ? '2.5% p.a.' : '2.0% p.a.'],
    ['Planungshorizont', 'Bis Alter 95'],
    ['Steuerkanton', data.location?.kanton ?? '–'],
    ['Kirchensteuer', data.kirchensteuer ? 'Ja' : 'Nein'],
    ['Steuergrundlagen', 'DBG 2026, kantonale Richtwerte (ESTV)'],
    ['Lebenserwartung', 'Mann: 85 Jahre, Frau: 87 Jahre (BFS)'],
    ['Kapitalbezug PK', 'Sätzchen-Methode (Steuerverwaltung)'],
    ['3a-Maximum 2026', "CHF 7'258 (mit PK) / CHF 36'288 (ohne PK)"],
  ]

  // Single-column layout: label (54mm) | value (rest) – no overflow risk
  const aLabelW = 54
  const aValueW = CW - aLabelW - 3

  assumptions.forEach((a, i) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const valueLines: string[] = doc.splitTextToSize(a[1], aValueW)
    const rowH = Math.max(9, valueLines.length * 5 + 4)

    checkBreak(rowH + 1, 6)

    if (i % 2 === 0) {
      doc.setFillColor(...INK1)
      doc.rect(ML, y - 5, CW, rowH, 'F')
    }

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    doc.text(a[0], ML + 2, y)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK)
    doc.text(valueLines, ML + aLabelW, y)

    y += rowH
  })
  y += 6

  // Important notice
  checkBreak(50, 6)
  doc.setFillColor(248, 248, 252)
  doc.roundedRect(ML, y, CW, 48, 4, 4, 'F')
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.8)
  doc.roundedRect(ML, y, CW, 48, 4, 4, 'S')
  doc.setLineWidth(0.2)

  doc.setTextColor(...NAVY)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Wichtiger Hinweis', ML + 6, y + 9)

  doc.setTextColor(...INK)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  const disclaimer = 'Diese Analyse wurde von WealthWise auf Basis Ihrer persönlichen Angaben erstellt und dient ausschliesslich der Orientierung. Sie ersetzt keine professionelle Finanz- oder Vorsorgeberatung durch eine qualifizierte Fachperson (CFP, Vorsorgeberater).\n\nAlle Berechnungen sind Richtwerte, die auf vereinfachten Annahmen basieren. Änderungen der gesetzlichen Grundlagen, Ihrer persönlichen Situation oder der Kapitalmarktentwicklung können die Ergebnisse wesentlich beeinflussen.\n\nFür verbindliche Auskünfte wenden Sie sich an Ihre Pensionskasse, die zuständige Ausgleichskasse oder einen zertifizierten Finanzplaner.'
  const dLines = doc.splitTextToSize(disclaimer, CW - 12)
  doc.text(dLines, ML + 6, y + 17)

  y += 56

  // Footer with branding
  doc.setFillColor(...NAVY)
  doc.rect(ML, y, CW, 14, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('WealthWise', ML + 4, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.text('Digitale Vorsorgeplanung Schweiz · wealthwise.ch', ML + 4, y + 11)
  doc.setTextColor(160, 190, 220)
  doc.text(dateStr, W - MR - 4, y + 6, { align: 'right' })
  doc.text(`Analyse für: ${names}`, W - MR - 4, y + 11, { align: 'right' })

  // Save
  doc.save(`WealthWise-Analyse-${(data.person1Name || 'Analyse').replace(/\s+/g, '-')}.pdf`)
}
