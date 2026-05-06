import jsPDF from 'jspdf'
import { fmtCHF } from './calc'
import { ProAnalysisResult } from './cashflow'

interface PdfData {
  person1Name: string
  person2Name?: string
  location?: { plz: string; ort: string; kanton: string }
  retirementAge1: number
  retirementAge2?: number
  analysis: ProAnalysisResult
  monthlyBudget: number
}

export async function exportPDF(data: PdfData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, pageH = 297
  const margin = 20
  const contentW = W - 2 * margin

  const navy = [26, 43, 74] as [number, number, number]
  const green = [34, 197, 94] as [number, number, number]
  const red = [239, 68, 68] as [number, number, number]
  const amber = [245, 158, 11] as [number, number, number]
  const ink = [15, 23, 42] as [number, number, number]
  const inkLight = [100, 116, 139] as [number, number, number]

  const { analysis } = data
  const verdictColor = analysis.verdict === 'green' ? green : analysis.verdict === 'yellow' ? amber : red

  let y = 0

  function addPage() {
    doc.addPage()
    y = margin
    // Header on every page
    doc.setFillColor(...navy)
    doc.rect(0, 0, W, 14, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('WealthWise · Vorsorgeanalyse', margin, 9)
    doc.setFont('helvetica', 'normal')
    doc.text(new Date().toLocaleDateString('de-CH'), W - margin, 9, { align: 'right' })
    y = 24
  }

  function checkPageBreak(needed: number) {
    if (y + needed > pageH - margin) addPage()
  }

  // ---- Cover ----
  doc.setFillColor(...navy)
  doc.rect(0, 0, W, pageH, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text('Vorsorgeanalyse', margin, 70)

  doc.setFontSize(16)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 210, 230)
  const names = data.person2Name ? `${data.person1Name} & ${data.person2Name}` : data.person1Name
  doc.text(names, margin, 85)
  if (data.location) {
    doc.text(`${data.location.plz} ${data.location.ort}, Kanton ${data.location.kanton}`, margin, 95)
  }

  // Verdict box
  doc.setFillColor(...verdictColor)
  doc.roundedRect(margin, 115, contentW, 40, 6, 6, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  const verdictLabel = analysis.verdict === 'green' ? 'Gut aufgestellt' : analysis.verdict === 'yellow' ? 'Anpassungen empfohlen' : 'Handlungsbedarf'
  doc.text(verdictLabel, margin + 10, 133)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Score: ${analysis.sustainabilityScore}/100`, margin + 10, 143)
  doc.text(`Monatliche Renten: CHF ${fmtCHF(analysis.monthlyIncome.total)}`, margin + 80, 133)
  doc.text(`Monatliches Budget: CHF ${fmtCHF(data.monthlyBudget)}`, margin + 80, 143)

  doc.setTextColor(150, 170, 200)
  doc.setFontSize(9)
  doc.text('Erstellt mit WealthWise · wealthwise.ch', margin, pageH - 20)
  doc.text(new Date().toLocaleDateString('de-CH'), W - margin, pageH - 20, { align: 'right' })
  doc.setFontSize(8)
  doc.text('Diese Analyse ersetzt keine professionelle Finanzberatung.', margin, pageH - 14)

  // ---- Page 2: Income Overview ----
  addPage()

  doc.setTextColor(...navy)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Einnahmen im Alter', margin, y)
  y += 12

  const rows = [
    ['AHV – 1. Säule', `CHF ${fmtCHF(analysis.ahv.combinedMonthly)}/Mt.`, `CHF ${fmtCHF(analysis.ahv.combinedYearlyInkl13)}/Jahr (inkl. 13.)`],
    ['Pensionskasse – 2. Säule', `CHF ${fmtCHF(analysis.pk.combinedMonthly)}/Mt.`, `CHF ${fmtCHF(analysis.pk.combinedYearly)}/Jahr`],
    ['Total Renten', `CHF ${fmtCHF(analysis.monthlyIncome.total)}/Mt.`, `CHF ${fmtCHF(analysis.monthlyIncome.total * 12)}/Jahr`],
    ['Monatliches Budget', `CHF ${fmtCHF(data.monthlyBudget)}/Mt.`, ''],
    ['Monatliche Differenz', `CHF ${fmtCHF(analysis.surplus)}/Mt.`, analysis.surplus >= 0 ? 'Überschuss' : 'Lücke'],
  ]

  rows.forEach((row, i) => {
    checkPageBreak(14)
    const isTotal = i === 2
    const isBudget = i === 3
    const isGap = i === 4
    if (isTotal || isBudget) {
      doc.setFillColor(...(isTotal ? navy : [241, 245, 249] as [number, number, number]))
      doc.rect(margin, y, contentW, 12, 'F')
    }
    doc.setTextColor(...(isTotal ? ([255, 255, 255] as [number, number, number]) : isGap && analysis.surplus < 0 ? red : ink))
    doc.setFontSize(11)
    doc.setFont('helvetica', isTotal ? 'bold' : 'normal')
    doc.text(row[0], margin + 4, y + 8)
    doc.text(row[1], W - margin - 60, y + 8)
    doc.setFontSize(9)
    doc.setTextColor(...inkLight)
    if (row[2]) doc.text(row[2], W - margin - 4, y + 8, { align: 'right' })
    y += 13
  })

  y += 10

  // AHV detail
  doc.setTextColor(...navy)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('AHV-Details', margin, y)
  y += 8

  const ahvDetails = [
    [data.person1Name || 'Person 1', `CHF ${fmtCHF(analysis.ahv.person1.monthlyRente)}/Mt.`,
     `Durchschn.-Einkommen: CHF ${fmtCHF(analysis.ahv.person1.avgIncomeUsed)}`],
    ...(analysis.ahv.person2 && data.person2Name ? [
      [data.person2Name, `CHF ${fmtCHF(analysis.ahv.person2.monthlyRente)}/Mt.`, '']
    ] : []),
    ...(analysis.ahv.plafonReduction > 0 ? [
      ['Ehepaar-Plafonierung', `− CHF ${fmtCHF(analysis.ahv.plafonReduction)}/Mt.`, 'Max. 150% der Maximalrente']
    ] : []),
  ]

  ahvDetails.forEach((row) => {
    checkPageBreak(10)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...ink)
    doc.text(row[0], margin + 4, y + 6)
    doc.text(row[1], W - margin - 60, y + 6)
    doc.setFontSize(8)
    doc.setTextColor(...inkLight)
    if (row[2]) doc.text(row[2], W - margin - 4, y + 6, { align: 'right' })
    doc.setDrawColor(220, 230, 240)
    doc.line(margin, y + 10, W - margin, y + 10)
    y += 11
  })

  // ---- Page 3: Scenarios ----
  addPage()
  doc.setTextColor(...navy)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Szenarien', margin, y)
  y += 12

  const scenarios = [
    { label: 'Optimistisch', color: green, income: Math.round(analysis.monthlyIncome.total * 1.08) },
    { label: 'Neutral', color: navy, income: analysis.monthlyIncome.total },
    { label: 'Pessimistisch', color: red, income: Math.round(analysis.monthlyIncome.total * 0.9) },
  ]

  scenarios.forEach((sc) => {
    checkPageBreak(28)
    doc.setFillColor(...sc.color)
    doc.roundedRect(margin, y, contentW, 22, 4, 4, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(sc.label, margin + 8, y + 10)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Monatliche Renten: CHF ${fmtCHF(sc.income)}/Mt.`, margin + 8, y + 18)
    const diff = sc.income - data.monthlyBudget
    doc.text(`Differenz: ${diff >= 0 ? '+' : ''}CHF ${fmtCHF(diff)}/Mt.`, W - margin - 8, y + 18, { align: 'right' })
    y += 26
  })

  y += 8
  doc.setTextColor(...ink)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Annahmen Neutral-Szenario: Inflation 1.5% p.a., Anlagerendite 2.5% p.a.', margin, y)
  y += 6
  doc.text('Optimistisch: Inflation 1.0%, Rendite 4.5% · Pessimistisch: Inflation 2.5%, Rendite 1.0%', margin, y)

  // ---- Disclaimer ----
  y = pageH - 60
  doc.setFillColor(241, 245, 249)
  doc.rect(margin, y, contentW, 40, 'F')
  doc.setTextColor(...inkLight)
  doc.setFontSize(8)
  doc.text('WICHTIGER HINWEIS', margin + 4, y + 8)
  doc.setFont('helvetica', 'normal')
  const disclaimer = 'Diese Analyse wurde von WealthWise auf Basis Ihrer Angaben erstellt und dient ausschliesslich der Orientierung. Sie ersetzt keine professionelle Finanz- oder Vorsorgeberatung. Die Berechnungen basieren auf den gesetzlichen Grundlagen 2026 und können sich durch Gesetzesänderungen verändern. Für verbindliche Auskünfte wenden Sie sich bitte an eine anerkannte Vorsorge- oder Steuerberatung.'
  const lines = doc.splitTextToSize(disclaimer, contentW - 8)
  doc.text(lines, margin + 4, y + 16)

  doc.save(`WealthWise-Analyse-${(data.person1Name || 'Analyse').replace(/\s/g, '-')}.pdf`)
}
