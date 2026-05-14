/**
 * PK-Ausweis PDF Parser
 *
 * Validated against: comPlan (Swisscom) Vorsorgeausweis per 01.01.2026
 *
 * comPlan field locations:
 *   Section 1  – Jahreslohn, Versicherter Lohn (vL)
 *   Section 2a – Retirement table: Alter | AGH | UWS | AR/Jahr | AR/Monat | ÜR/Monat | AKiR/Jahr
 *   Section 3  – Beiträge: Sparbeitrag Mitglied + Arbeitgeber
 *   Section 5  – Kontoauszug: "AGH am DD.MM.YYYY" (most recent = current balance)
 *   Section 6  – reglementarisches Altersguthaben, BVG-Altersguthaben, maximale Einkaufssumme
 *
 * Key design:
 *   - Strips ARC1/ARC2 machine-readable header lines before parsing
 *   - All Swiss number parsing via parseSwissNumRobust (handles ' and ' and , variants)
 *   - Multiple fallback patterns per field for robustness
 */

import { extractDocumentText, parseSwissNumRobust } from './documentProcessor'

export interface PKExtractResult {
  pkCurrentCapital: number        // AGH am [latest date] — current actual balance
  pkRate: number                  // UWS at age 65 (or target age if known)
  pkAnnualContribution: number    // AN + AG Sparbeitrag combined
  pkMaxGuthaben: number           // maximale Einkaufssumme
  pkObligatorisch: number         // BVG-Altersguthaben (mandatory portion)
  projectedCapital65: number      // AGH at age 65 from table 2a (informational)
  insuredSalary: number           // versicherter Lohn

  // Bridging pension table (age -> CHF/month)
  bridgingByAge: Record<number, number>

  // Retirement table (age -> { agh, uws, renteJahr, renteMonat, ueberbrueckung })
  retirementTable: Record<number, {
    agh: number
    uws: number
    renteJahr: number
    renteMonat: number
    ueberbrueckung: number
  }>

  extractedFields: string[]
  warnings: string[]
  pensionFundName: string
}

const parseSwissNum = parseSwissNumRobust

/** Normalize all apostrophe-like chars to standard ASCII apostrophe.
 * pdfjs may return U+2019, U+02BC, etc. — normalize before any pattern matching. */
function normalizeText(text: string): string {
  return text.replace(/[''ʼʹ`´＇′‘’ʼ´]/g, "'")
}

/** Strip ARC1/ARC2 machine-readable tokens from anywhere in the text.
 * pdfjs joins all items on a page with spaces (no newlines), so ARC1/ARC2
 * tokens are embedded mid-string — a line-filter approach would delete the
 * entire page. Use regex removal instead. */
function stripArcHeaders(text: string): string {
  return text.replace(/ARC[12]\|[^\n\r]*/g, '')
}

// Swiss number: 1'234'567.89 or 1'234'567 (with apostrophe variants from OCR)
const SN = "[\\d][\\d''ʼ'`\\s]*(?:[.,]\\d{1,2})?"

/** Find a number after any of the given label patterns */
function findAfterLabel(text: string, patterns: RegExp[], fallback = 0): number {
  for (const pattern of patterns) {
    const m = text.match(pattern)
    if (m?.[1]) {
      const n = parseSwissNum(m[1])
      if (n > 0) return n
    }
  }
  return fallback
}

/**
 * Parse the retirement table (section 2a).
 * comPlan format per row: Alter  AGH  UWS%  AR/Jahr  AR/Monat  ÜR/Monat  AKiR/Jahr
 * Example: "65 1'145'963.95 5.00% 57'298.20 4'774.85 0.00 4'884.60"
 *
 * pdfjs may extract the row as a continuous space-separated string, or with
 * slightly different whitespace. We try three strategies:
 *   A) Full line regex (works when all columns are on one line)
 *   B) Pair-wise: look for "age bigNumber percent" near each other
 *   C) Token scan: walk token array looking for age-followed-by-numbers
 */
function parseRetirementTable(text: string): PKExtractResult['retirementTable'] {
  const table: PKExtractResult['retirementTable'] = {}

  // Strategy A: match structured rows like "65 1'145'963.95 5.00% 57'298.20 4'774.85 0.00 4'884.60"
  // Age range 58-65; UWS typically 3.5–7.0%
  const swissNum = "[\\d][\\d''ʼ'`]*(?:\\.\\d{1,2})?"
  const pct = '\\d+(?:\\.\\d{1,2})?%'
  const linePattern = new RegExp(
    `\\b(5[89]|6[0-5])\\s+(${swissNum})\\s+(${pct})\\s+(${swissNum})\\s+(${swissNum})\\s+(${swissNum})`,
    'g'
  )

  let m: RegExpExecArray | null
  while ((m = linePattern.exec(text)) !== null) {
    const age = parseInt(m[1])
    const agh = parseSwissNum(m[2])
    const uws = parseFloat(m[3])
    const renteJahr = parseSwissNum(m[4])
    const renteMonat = parseSwissNum(m[5])
    const ueber = parseSwissNum(m[6])
    if (agh > 10000 && uws > 2 && uws < 10) {
      table[age] = { agh, uws, renteJahr, renteMonat, ueberbrueckung: ueber }
    }
  }

  if (Object.keys(table).length > 0) return table

  // Strategy B: looser pattern — age then a big number then a percent nearby
  // Handles PDFs where table cells are joined without proper spacing
  const loosePattern = new RegExp(
    `\\b(5[89]|6[0-5])\\D{0,6}(${swissNum})\\D{0,6}(${pct})\\D{0,6}(${swissNum})\\D{0,6}(${swissNum})`,
    'g'
  )
  while ((m = loosePattern.exec(text)) !== null) {
    const age = parseInt(m[1])
    const agh = parseSwissNum(m[2])
    const uws = parseFloat(m[3])
    const renteJahr = parseSwissNum(m[4])
    const renteMonat = parseSwissNum(m[5])
    if (agh > 10000 && uws > 2 && uws < 10) {
      table[age] = { agh, uws, renteJahr, renteMonat, ueberbrueckung: 0 }
    }
  }

  if (Object.keys(table).length > 0) return table

  // Strategy C: token scan — find age then walk forward collecting numbers
  const tokens = text.split(/\s+/)
  for (let i = 0; i < tokens.length - 5; i++) {
    const age = parseInt(tokens[i])
    if (age >= 58 && age <= 65 && tokens[i].length <= 2) {
      const agh = parseSwissNum(tokens[i + 1])
      const uwsRaw = tokens[i + 2]
      const uws = parseFloat(uwsRaw)
      const renteJahr = parseSwissNum(tokens[i + 3])
      const renteMonat = parseSwissNum(tokens[i + 4])
      const ueber = parseSwissNum(tokens[i + 5])
      if (agh > 10000 && uws > 2 && uws < 10) {
        table[age] = { agh, uws, renteJahr, renteMonat, ueberbrueckung: ueber }
      }
    }
  }

  return table
}

/**
 * Parse the current AGH balance.
 * Primary:  "AGH am DD.MM.YYYY  [Standard-col]  [Zusatz]  [VP]  [Total]"
 *           → take the last column (Total) OR the Standard column
 * Fallback: "reglementarisches Altersguthaben  NNN"
 *
 * pdfjs flattens multi-column tables — for comPlan section 5 the row looks like:
 *   "AGH am 01.01.2026 64'083.90 0.00 0.00 64'083.90"
 * We take the first number after the date (= Standard column = Total when no extras).
 */
function parseCurrentBalance(text: string): { balance: number; date: string } {
  // Primary: "AGH am DD.MM.YYYY NN..."
  const aghPattern = /AGH\s+am\s+(\d{2}\.\d{2}\.\d{4})\s+([\d''ʼ'`]+(?:[.,]\d{1,2})?)/g
  let last: { balance: number; date: string } | null = null
  let m: RegExpExecArray | null
  while ((m = aghPattern.exec(text)) !== null) {
    const balance = parseSwissNum(m[2])
    if (balance > 0) last = { balance, date: m[1] }
  }
  if (last) return last

  // Fallback A: "reglementarisches Altersguthaben NNN"
  const regl = text.match(/reglementarisches\s+Altersguthaben\s+([\d''ʼ'`]+(?:[.,]\d{1,2})?)/i)
  if (regl?.[1]) {
    const balance = parseSwissNum(regl[1])
    if (balance > 0) return { balance, date: '' }
  }

  // Fallback B: "Altersguthaben ... NNN" (generic)
  const generic = text.match(/Altersguthaben[^\d]{1,40}([\d''ʼ'`]{4,}(?:[.,]\d{1,2})?)/i)
  if (generic?.[1]) {
    const balance = parseSwissNum(generic[1])
    if (balance > 1000) return { balance, date: '' }
  }

  return { balance: 0, date: '' }
}

/**
 * Parse contributions (section 3).
 * comPlan: "Sparbeitrag Standard 7.100% vL 9'712.80 809.40 7.100% vL 9'712.80 809.40"
 *          → AN Sparbeitrag = first annual, AG Sparbeitrag = second annual (same in this case)
 *          → Total = AN + AG = 9'712.80 + 9'712.80 = 19'425.60
 *
 * "Total Beitrag 9'712.80 809.40 13'748.40 1'145.70"
 *          → AN total = 9'712.80, AG total = 13'748.40, but only Sparbeitrag matters here.
 */
function parseContributions(text: string): number {
  // Try "Total Beitrag [AN annual] [AN monthly] [AG annual] [AG monthly]"
  // We want AN Sparbeitrag + AG Sparbeitrag specifically (not risk/other contributions)
  const sbStdPattern = /Sparbeitrag\s+\w+\s+[\d.,]+%\s+vL\s+([\d''ʼ'`]+(?:[.,]\d{1,2})?)\s+([\d''ʼ'`]+(?:[.,]\d{1,2})?)\s+[\d.,]+%\s+vL\s+([\d''ʼ'`]+(?:[.,]\d{1,2})?)/i
  const sbStdMatch = text.match(sbStdPattern)
  if (sbStdMatch) {
    const anAnnual = parseSwissNum(sbStdMatch[1])
    const agAnnual = parseSwissNum(sbStdMatch[3])
    if (anAnnual > 0 && agAnnual > 0) {
      console.log(`[PK] Sparbeitrag AN=${anAnnual} AG=${agAnnual} total=${anAnnual + agAnnual}`)
      return anAnnual + agAnnual
    }
  }

  // Fallback: "Total Beitrag [AN annual] [AN monthly] [AG annual]"
  const totalPattern = /Total\s+Beitrag\s+([\d''ʼ'`]+(?:[.,]\d{1,2})?)\s+([\d''ʼ'`]+(?:[.,]\d{1,2})?)\s+([\d''ʼ'`]+(?:[.,]\d{1,2})?)/i
  const totalMatch = text.match(totalPattern)
  if (totalMatch) {
    const anTotal = parseSwissNum(totalMatch[1])
    const agTotal = parseSwissNum(totalMatch[3])
    // This includes risk/other — use it as upper bound estimate
    if (anTotal > 0 && agTotal > 0) {
      console.log(`[PK] Total Beitrag AN=${anTotal} AG=${agTotal}`)
      return anTotal + agTotal
    }
  }

  // Fallback: look for two Sparbeitrag amounts (Mitglied + Arbeitgeber)
  const allSb = [...text.matchAll(/Sparbeitrag[^\d\n]{0,60}([\d''ʼ'`]+(?:[.,]\d{1,2})?)/g)]
  if (allSb.length >= 2) {
    const an = parseSwissNum(allSb[0][1])
    const ag = parseSwissNum(allSb[1][1])
    if (an > 0 && ag > 0) return an + ag
  }

  return 0
}

export async function parsePKPdf(
  file: File,
  onProgress?: (msg: string, pct?: number) => void,
): Promise<PKExtractResult> {
  const warnings: string[] = []
  const extractedFields: string[] = []

  const extraction = await extractDocumentText(file, onProgress)
  warnings.push(...extraction.warnings)

  if (extraction.text.trim().length === 0) {
    warnings.push('Aktuelles Guthaben konnte nicht extrahiert werden — bitte manuell eingeben.')
    warnings.push('Umwandlungssatz konnte nicht extrahiert werden — Standardwert 5.40% verwendet.')
    return {
      pkCurrentCapital: 0, pkRate: 5.4, pkAnnualContribution: 0,
      pkMaxGuthaben: 0, pkObligatorisch: 0, projectedCapital65: 0,
      insuredSalary: 0, bridgingByAge: {}, retirementTable: {},
      extractedFields, warnings, pensionFundName: 'Unbekannte Pensionskasse',
    }
  }

  if (extraction.isOcr) {
    extractedFields.push('Quelle: OCR (Foto/Scan)')
  }

  const rawText = extraction.text
  console.log('[PK] raw text length:', rawText.length)
  console.log('[PK] === RAW TEXT START ===\n' + rawText.slice(0, 1000) + '\n[PK] === RAW TEXT END ===')

  const text = normalizeText(stripArcHeaders(rawText))
  console.log('[PK] normalized text length:', text.length)

  // ── Pension fund name ──────────────────────────────────────────────────────
  let pensionFundName = 'Unbekannte Pensionskasse'
  if (/comPlan/i.test(text)) {
    pensionFundName = 'comPlan (Swisscom)'
    extractedFields.push('Pensionskasse: comPlan')
  } else {
    const namePatterns = [
      /Pensionskasse\s+([\w\s]+?)(?:\s+Vorsorgeausweis|\s*\n)/i,
      /^([A-Z][A-Za-z\s-]+(?:PK|Pensionskasse|Vorsorgekasse|Sammelstiftung))/m,
    ]
    for (const p of namePatterns) {
      const mm = text.match(p)
      if (mm?.[1]) { pensionFundName = mm[1].trim(); extractedFields.push('Pensionskasse'); break }
    }
  }

  // ── Retirement table (section 2a) ──────────────────────────────────────────
  const retirementTable = parseRetirementTable(text)
  const hasTable = Object.keys(retirementTable).length > 0
  if (hasTable) {
    extractedFields.push(`Leistungstabelle (${Object.keys(retirementTable).join(', ')} Jahre)`)
    console.log('[PK] retirementTable:', JSON.stringify(retirementTable))
  }

  // ── UWS at age 65 ──────────────────────────────────────────────────────────
  const uws65 = retirementTable[65]?.uws ?? 0
  let pkRate = uws65
  if (pkRate === 0) {
    pkRate = findAfterLabel(text, [
      /Umwandlungssatz(?:\s+bei\s+65)?[:\s]+([\d.]+)%/i,
      /UWS[:\s]+([\d.]+)%/i,
    ])
  }
  if (pkRate > 0) extractedFields.push(`UWS: ${pkRate.toFixed(2)}%`)

  // ── Projected capital at 65 ────────────────────────────────────────────────
  const projectedCapital65 = retirementTable[65]?.agh ?? 0
  if (projectedCapital65 > 0) extractedFields.push(`AGH@65: CHF ${Math.round(projectedCapital65).toLocaleString('de-CH')}`)

  // ── Current balance (section 5 Kontoauszug) ───────────────────────────────
  const { balance: pkCurrentCapital, date: balanceDate } = parseCurrentBalance(text)
  if (pkCurrentCapital > 0) {
    extractedFields.push(`Aktuelles Guthaben: CHF ${Math.round(pkCurrentCapital).toLocaleString('de-CH')} (per ${balanceDate || 'aktuell'})`)
    console.log('[PK] pkCurrentCapital:', pkCurrentCapital, 'date:', balanceDate)
  }

  // ── Annual contribution (AN + AG Sparbeitrag) ──────────────────────────────
  const pkAnnualContribution = parseContributions(text)
  if (pkAnnualContribution > 0) {
    extractedFields.push(`Sparbeitrag AN+AG: CHF ${Math.round(pkAnnualContribution).toLocaleString('de-CH')}/Jahr`)
  }

  // ── BVG mandatory portion (section 6) ─────────────────────────────────────
  const pkObligatorisch = findAfterLabel(text, [
    /BVG-Altersguthaben[:\s]+([\d''ʼ'`]+(?:[.,]\d{1,2})?)/i,
    /obligatorisches?\s+(?:Guthaben|Altersguthaben)[:\s]+([\d''ʼ'`]+(?:[.,]\d{1,2})?)/i,
  ])
  if (pkObligatorisch > 0) extractedFields.push(`BVG-Altersguthaben: CHF ${Math.round(pkObligatorisch).toLocaleString('de-CH')}`)

  // ── Max purchase potential (section 6) ────────────────────────────────────
  const pkMaxGuthaben = findAfterLabel(text, [
    /maximale\s+Einkaufssumme[^0-9\n]{0,80}([\d''ʼ'`]+(?:[.,]\d{1,2})?)/i,
    /Einkaufspotenzial[^0-9\n]{0,40}([\d''ʼ'`]+(?:[.,]\d{1,2})?)/i,
    /m[öo]glicher?\s+Einkauf[^0-9\n]{0,40}([\d''ʼ'`]+(?:[.,]\d{1,2})?)/i,
    /maximaler?\s+(?:Einkauf|Nachkauf)[^0-9\n]{0,40}([\d''ʼ'`]+(?:[.,]\d{1,2})?)/i,
  ])
  if (pkMaxGuthaben > 0) extractedFields.push(`Einkaufspotenzial: CHF ${Math.round(pkMaxGuthaben).toLocaleString('de-CH')}`)

  // ── Insured salary (section 1) ─────────────────────────────────────────────
  const insuredSalary = findAfterLabel(text, [
    /Versicherter\s+Lohn\s*(?:\(vL\))?[:\s]+([\d''ʼ'`]+(?:[.,]\d{1,2})?)/i,
    /versicherter\s+Jahreslohn[:\s]+([\d''ʼ'`]+(?:[.,]\d{1,2})?)/i,
    /\bvL\b[:\s]+([\d''ʼ'`]+(?:[.,]\d{1,2})?)/,
    /Jahreslohn[:\s]+([\d''ʼ'`]+(?:[.,]\d{1,2})?)/i,
  ])
  if (insuredSalary > 0) extractedFields.push(`Versicherter Lohn: CHF ${Math.round(insuredSalary).toLocaleString('de-CH')}`)

  // ── Bridging pension by age ────────────────────────────────────────────────
  const bridgingByAge: Record<number, number> = {}
  for (const [ageStr, row] of Object.entries(retirementTable)) {
    if (row.ueberbrueckung > 0) bridgingByAge[parseInt(ageStr)] = row.ueberbrueckung
  }

  // ── Validation warnings ────────────────────────────────────────────────────
  if (pkCurrentCapital > 0 && projectedCapital65 > 0 && pkCurrentCapital >= projectedCapital65) {
    warnings.push('Aktuelles Guthaben erscheint grösser als Projektion bei 65 — bitte manuell prüfen.')
  }
  if (pkRate > 0 && (pkRate < 3 || pkRate > 8)) {
    warnings.push(`Umwandlungssatz ${pkRate}% ausserhalb des erwarteten Bereichs (3–8%) — bitte prüfen.`)
  }
  if (pkCurrentCapital === 0) {
    warnings.push('Aktuelles Guthaben konnte nicht extrahiert werden — bitte manuell eingeben.')
  }
  if (pkRate === 0) {
    warnings.push('Umwandlungssatz konnte nicht extrahiert werden — Standardwert 5.40% verwendet.')
    extractedFields.push('UWS: Standardwert 5.40%')
  }

  console.log('[PK] extractedFields:', extractedFields)
  console.log('[PK] warnings:', warnings)

  return {
    pkCurrentCapital,
    pkRate: pkRate || 5.4,
    pkAnnualContribution,
    pkMaxGuthaben,
    pkObligatorisch,
    projectedCapital65,
    insuredSalary,
    bridgingByAge,
    retirementTable,
    extractedFields,
    warnings,
    pensionFundName,
  }
}
