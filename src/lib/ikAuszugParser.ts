/**
 * IK-Auszug (AHV Individueller Kontoauszug) Parser
 *
 * Supports two SVA formats:
 * - Format A: Übersicht page — columns: Jahr | Bruchteil | Einkommen | Bemerkungen
 * - Format B: Detailed employer list — employer blocks with year + income per entry
 *
 * Key calculations:
 * - MDJ (massgebendes Durchschnittseinkommen) using AHV_AUFWERTUNGSFAKTOREN_2025
 * - Gap detection between first and last contribution year
 * - Projection to retirement: count of contribution years vs needed 44
 */

import { AHV_AUFWERTUNGSFAKTOREN_2025 } from '../constants/swissVorsorge2025'
import { extractDocumentText, parseSwissNumRobust } from './documentProcessor'

export interface IKEntry {
  year: number
  income: number
  remark?: string
}

export interface IKAuszugResult {
  entries: IKEntry[]          // all parsed year/income rows
  numYears: number            // count of years with income > 0
  gapYears: number[]          // years missing between first and last entry
  mdj: number                 // massgebendes Durchschnittseinkommen (revalued, capped)
  totalRevaluedIncome: number // sum after Aufwertungsfaktoren applied
  lastYearIncome: number      // most recent year's income (for ongoing income estimate)
  firstYear: number
  lastYear: number
  warnings: string[]
  extractedFields: string[]
}

/** Alias to unified robust parser (handles OCR apostrophe variants) */
const parseSwissNum = parseSwissNumRobust

/**
 * Normalize OCR text: unify all apostrophe/quote variants used as Swiss thousands separators
 * so regex patterns can use a single apostrophe character class.
 */
function normalizeOcrText(text: string): string {
  // Replace all apostrophe-like chars with standard apostrophe '
  return text.replace(/[‘’ʼʹ`´＇′]/g, "'")
}

/** Apostrophe-safe character class for numbers like 13'514 */
const NUM_PATTERN = "[\\d']{4,}"

/**
 * Format A: Übersicht-Seite
 * Pattern per row:  YYYY   [fraction]   income   [remarks]
 * Example:          2010   1/1          13'514   Jahreseinkommen
 */
function parseFormatA(rawText: string): IKEntry[] {
  const text = normalizeOcrText(rawText)
  const entries: IKEntry[] = []

  // Match: year, optional fraction (e.g. "1/1"), income with apostrophes
  const pattern = new RegExp(`\\b((?:19|20)\\d{2})\\s+(?:\\d+/\\d+\\s+)?(${NUM_PATTERN})\\b`, 'g')
  let m: RegExpExecArray | null
  while ((m = pattern.exec(text)) !== null) {
    const year = parseInt(m[1])
    const income = parseSwissNum(m[2])
    if (year >= 1948 && year <= new Date().getFullYear() && income > 0) {
      const existing = entries.find(e => e.year === year)
      if (existing) {
        if (income > existing.income) existing.income = income
      } else {
        entries.push({ year, income })
      }
    }
  }

  return entries.sort((a, b) => a.year - b.year)
}

/**
 * Format B: Detailed employer list
 * Each employer block has lines like:
 *   2015   Muster AG   47'940
 * We aggregate income by year across all employers.
 */
function parseFormatB(rawText: string): IKEntry[] {
  const text = normalizeOcrText(rawText)
  const byYear: Record<number, number> = {}

  const pattern = new RegExp(`\\b((?:19|20)\\d{2})\\b[^\\d\\n]{1,80}?\\b(${NUM_PATTERN})\\b`, 'g')
  let m: RegExpExecArray | null
  while ((m = pattern.exec(text)) !== null) {
    const year = parseInt(m[1])
    const income = parseSwissNum(m[2])
    if (year >= 1948 && year <= new Date().getFullYear() && income > 0 && income < 2000000) {
      byYear[year] = (byYear[year] || 0) + income
    }
  }

  return Object.entries(byYear)
    .map(([y, inc]) => ({ year: parseInt(y), income: inc }))
    .sort((a, b) => a.year - b.year)
}

/**
 * Choose the better parse result.
 * Format A typically has 1 row per year, Format B can have multiple rows per year.
 * We pick the one with more distinct years and reasonable income values.
 */
function selectBestParse(a: IKEntry[], b: IKEntry[]): IKEntry[] {
  if (a.length === 0) return b
  if (b.length === 0) return a

  // Prefer the parse with more entries and reasonable max income
  const maxA = Math.max(...a.map(e => e.income))
  const maxB = Math.max(...b.map(e => e.income))

  // Sanity: incomes should be < 1M CHF and > 1000 CHF
  const validA = a.filter(e => e.income > 1000 && e.income < 1000000)
  const validB = b.filter(e => e.income > 1000 && e.income < 1000000)

  if (validA.length >= validB.length && maxA < 1000000) return validA
  return validB
}

/** Apply Aufwertungsfaktoren to each entry's income */
function applyRevaluation(entries: IKEntry[]): number[] {
  return entries.map(({ year, income }) => {
    const factor = AHV_AUFWERTUNGSFAKTOREN_2025[year] ?? 1.0
    return income * factor
  })
}

/** MDJ constants (same as AHV_RENTEN_2025) */
const MDJ_MIN = 15120
const MDJ_MAX = 90720

export async function parseIKAuszug(
  file: File,
  onProgress?: (msg: string, pct?: number) => void,
): Promise<IKAuszugResult> {
  const warnings: string[] = []
  const extractedFields: string[] = []

  const extraction = await extractDocumentText(file, onProgress)
  warnings.push(...extraction.warnings)

  if (extraction.text.trim().length === 0) {
    return {
      entries: [], numYears: 0, gapYears: [], mdj: 0,
      totalRevaluedIncome: 0, lastYearIncome: 0,
      firstYear: 0, lastYear: 0, warnings, extractedFields,
    }
  }

  if (extraction.isOcr) {
    warnings.push('Texterkennung (OCR) verwendet – Werte bitte sorgfältig prüfen.')
    extractedFields.push('Quelle: OCR (Foto/Scan)')
  }

  const text = extraction.text
  console.log('[IK] Text extracted, length:', text.length, 'isOCR:', extraction.isOcr)
  console.log('[IK] Text preview:', text.slice(0, 400))

  // Try both formats, pick best
  const entriesA = parseFormatA(text)
  const entriesB = parseFormatB(text)
  console.log('[IK] Format A entries:', entriesA.length, 'Format B entries:', entriesB.length)
  const entries = selectBestParse(entriesA, entriesB)

  if (entries.length === 0) {
    console.warn('[IK] No entries found. Full text:', text)
    warnings.push('Keine Einkommensjahre erkannt. Bitte prüfen Sie, ob die korrekte Datei hochgeladen wurde.')
    return {
      entries: [], numYears: 0, gapYears: [], mdj: 0,
      totalRevaluedIncome: 0, lastYearIncome: 0,
      firstYear: 0, lastYear: 0, warnings, extractedFields,
    }
  }

  extractedFields.push(`${entries.length} Einkommensjahre`)

  // Gap detection
  const firstYear = entries[0].year
  const lastYear = entries[entries.length - 1].year
  const entryYearsSet = new Set(entries.map(e => e.year))
  const gapYears: number[] = []
  for (let y = firstYear; y <= lastYear; y++) {
    if (!entryYearsSet.has(y)) gapYears.push(y)
  }
  if (gapYears.length > 0) {
    extractedFields.push(`${gapYears.length} Lückenjahr${gapYears.length === 1 ? '' : 'e'}`)
  }

  // MDJ calculation
  const revalued = applyRevaluation(entries)
  const totalRevaluedIncome = revalued.reduce((s, v) => s + v, 0)
  const numYears = entries.filter(e => e.income > 0).length

  // MDJ = total revalued income / 44 (standard divisor for full pension)
  // Capped between MDJ_MIN and MDJ_MAX
  const rawMdj = numYears > 0 ? totalRevaluedIncome / 44 : 0
  const mdj = Math.min(MDJ_MAX, Math.max(MDJ_MIN, Math.round(rawMdj)))
  extractedFields.push(`MDJ CHF ${mdj.toLocaleString('de-CH')}`)

  const lastYearIncome = entries[entries.length - 1].income

  // Validation
  if (numYears < 5) {
    warnings.push('Weniger als 5 Beitragsjahre gefunden – bitte Ergebnis prüfen.')
  }
  if (lastYearIncome > 500000) {
    warnings.push(`Ungewöhnlich hohes Einkommen im letzten Jahr (CHF ${lastYearIncome.toLocaleString('de-CH')}) – bitte prüfen.`)
  }
  if (rawMdj > MDJ_MAX) {
    warnings.push(`MDJ wurde auf Maximum CHF ${MDJ_MAX.toLocaleString('de-CH')} gekappt (entspricht der maximalen AHV-Rente).`)
  }

  return {
    entries,
    numYears,
    gapYears,
    mdj,
    totalRevaluedIncome: Math.round(totalRevaluedIncome),
    lastYearIncome,
    firstYear,
    lastYear,
    warnings,
    extractedFields,
  }
}
