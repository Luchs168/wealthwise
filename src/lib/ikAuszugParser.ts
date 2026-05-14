/**
 * IK-Auszug (AHV Individueller Kontoauszug) Parser
 *
 * Supports two SVA formats:
 * - Format A: Übersicht page — columns: Jahr | Bruchteil | Einkommen | Bemerkungen
 * - Format B: Detailed employer list — employer blocks with year + income per entry
 *
 * Primary strategy: parseRobust() — line-by-line, handles OCR space-separated numbers
 * Fallback: parseFormatA / parseFormatB regex strategies
 */

import { AHV_AUFWERTUNGSFAKTOREN_2025 } from '../constants/swissVorsorge2025'
import { extractDocumentText, parseSwissNumRobust } from './documentProcessor'

export interface IKEntry {
  year: number
  income: number
  remark?: string
}

export interface IKAuszugResult {
  entries: IKEntry[]
  numYears: number
  gapYears: number[]
  mdj: number
  totalRevaluedIncome: number
  lastYearIncome: number
  firstYear: number
  lastYear: number
  warnings: string[]
  extractedFields: string[]
}

const parseSwissNum = parseSwissNumRobust

function normalizeOcrText(text: string): string {
  return text.replace(/[''ʼʹ`´＇′]/g, "'")
}

// ── Amount extractor ──────────────────────────────────────────────────────────

/**
 * Given the substring AFTER the year on a line, extract the first plausible income.
 * Handles all OCR variants:
 *   13'514  → apostrophe separator  → 13514
 *   13 514  → space separator       → 13514
 *   116'845 → 6-digit apostrophe    → 116845
 *   116 845 → 6-digit space         → 116845
 *   13514   → no separator          → 13514
 *   6'341   → 4-digit apostrophe    → 6341
 */
function extractAmount(afterYear: string): number {
  const s = afterYear.replace(/\s+/g, ' ').trim()

  // 1. Swiss apostrophe format: 13'514 or 116'845 (most reliable — apostrophe survives OCR)
  const apo = s.match(/\b(\d{1,3})'(\d{3})\b/)
  if (apo) return parseInt(apo[1]) * 1000 + parseInt(apo[2])

  // 2. 5–6 consecutive digits (no separator): 13514, 116845
  const long = s.match(/\b(\d{5,6})\b/)
  if (long) return parseInt(long[1])

  // 3. OCR space-separated: "13 514", "116 845" — 1–3 digits + space + exactly 3 digits
  //    Guard: candidate must be ≥ 1000 to avoid matching random digit pairs
  const sp = s.match(/\b(\d{1,3}) (\d{3})\b/)
  if (sp) {
    const candidate = parseInt(sp[1]) * 1000 + parseInt(sp[2])
    if (candidate >= 1000 && candidate < 1500000) return candidate
  }

  // 4. Exactly 4 consecutive digits (e.g. 6341, year-range incomes)
  const short = s.match(/\b(\d{4})\b/)
  if (short) {
    const v = parseInt(short[1])
    // Exclude year-like numbers (2000–2099) that crept into afterYear
    if (v < 2000 || v > 2099) return v
  }

  return 0
}

// ── Primary parser: line-by-line robust strategy ──────────────────────────────

/**
 * Scans each line for a year (2000–2029), then extracts the first plausible
 * income amount from the rest of the line. Handles all OCR apostrophe/space
 * variants. This is the preferred strategy for photo-based IK-Auszug uploads.
 */
function parseRobust(rawText: string): IKEntry[] {
  const text = normalizeOcrText(rawText)
  const lines = text.split('\n')
  const byYear = new Map<number, number>()

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // Find 4-digit year 2000–2029
    const yearMatch = line.match(/\b(20[0-2]\d)\b/)
    if (!yearMatch) continue
    const year = parseInt(yearMatch[1])

    // Substring after the year
    const idx = line.indexOf(yearMatch[0])
    const afterYear = line.slice(idx + yearMatch[0].length)

    const income = extractAmount(afterYear)

    if (income >= 100 && income < 1500000) {
      const existing = byYear.get(year)
      // De-duplicate: keep highest value (most likely the correct reading)
      if (!existing || income > existing) {
        byYear.set(year, income)
        console.log('[IK-robust] ✓', year, income, '| line:', line.slice(0, 70))
      }
    } else {
      if (income > 0) {
        console.log('[IK-robust] ✗ out of range:', year, income, '| afterYear:', afterYear.slice(0, 40))
      } else {
        console.log('[IK-robust] ✗ no amount for year', year, '| afterYear:', afterYear.slice(0, 40))
      }
    }
  }

  return Array.from(byYear.entries())
    .map(([year, income]) => ({ year, income }))
    .sort((a, b) => a.year - b.year)
}

// ── Fallback parsers ──────────────────────────────────────────────────────────

const NUM_PATTERN = "[\\d']{4,}"

function parseFormatA(rawText: string): IKEntry[] {
  const text = normalizeOcrText(rawText)
  const entries: IKEntry[] = []
  const pattern = new RegExp(`\\b((?:19|20)\\d{2})\\s+(?:\\d+/\\d+\\s+)?(${NUM_PATTERN})\\b`, 'g')
  let m: RegExpExecArray | null
  while ((m = pattern.exec(text)) !== null) {
    const year = parseInt(m[1])
    const income = parseSwissNum(m[2])
    if (year >= 1948 && year <= new Date().getFullYear() && income > 0) {
      const existing = entries.find(e => e.year === year)
      if (existing) { if (income > existing.income) existing.income = income }
      else entries.push({ year, income })
    }
  }
  return entries.sort((a, b) => a.year - b.year)
}

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

// ── Strategy selection ────────────────────────────────────────────────────────

function selectBest(...candidates: IKEntry[][]): IKEntry[] {
  const valid = (arr: IKEntry[]) => arr.filter(e => e.income >= 100 && e.income < 1500000)
  const scored = candidates
    .map(c => valid(c))
    .sort((a, b) => b.length - a.length)  // prefer most entries
  return scored[0] ?? []
}

// ── Revaluation & MDJ ─────────────────────────────────────────────────────────

function applyRevaluation(entries: IKEntry[]): number[] {
  return entries.map(({ year, income }) => {
    const factor = AHV_AUFWERTUNGSFAKTOREN_2025[year] ?? 1.0
    return income * factor
  })
}

const MDJ_MIN = 15120
const MDJ_MAX = 90720

// ── Public API ─────────────────────────────────────────────────────────────────

export async function parseIKAuszug(
  file: File,
  onProgress?: (msg: string, pct?: number) => void,
): Promise<IKAuszugResult> {
  const warnings: string[] = []
  const extractedFields: string[] = []

  const extraction = await extractDocumentText(file, onProgress)
  warnings.push(...extraction.warnings)

  if (extraction.text.trim().length === 0) {
    return { entries: [], numYears: 0, gapYears: [], mdj: 0, totalRevaluedIncome: 0, lastYearIncome: 0, firstYear: 0, lastYear: 0, warnings, extractedFields }
  }

  if (extraction.isOcr) {
    warnings.push('Texterkennung (OCR) verwendet – Werte bitte sorgfältig prüfen.')
    extractedFields.push('Quelle: OCR (Foto/Scan)')
  }

  const text = extraction.text
  console.log('[IK] Text length:', text.length, 'isOCR:', extraction.isOcr)

  // Try all strategies, pick the one that finds the most valid years
  const robust  = parseRobust(text)
  const formatA = parseFormatA(text)
  const formatB = parseFormatB(text)
  console.log('[IK] Robust:', robust.length, 'FormatA:', formatA.length, 'FormatB:', formatB.length)
  console.log('[IK] Robust entries:', robust.map(e => `${e.year}:${e.income}`).join(', '))

  const entries = selectBest(robust, formatA, formatB)

  if (entries.length === 0) {
    console.warn('[IK] No entries found. Full text:', text)
    warnings.push('Keine Einkommensjahre erkannt. Bitte prüfen Sie, ob die korrekte Datei hochgeladen wurde.')
    return { entries: [], numYears: 0, gapYears: [], mdj: 0, totalRevaluedIncome: 0, lastYearIncome: 0, firstYear: 0, lastYear: 0, warnings, extractedFields }
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
  if (gapYears.length > 0) extractedFields.push(`${gapYears.length} Lückenjahr${gapYears.length === 1 ? '' : 'e'}`)

  // MDJ: revalued total / 44 (official AHV divisor for full pension)
  const revalued = applyRevaluation(entries)
  const totalRevaluedIncome = revalued.reduce((s, v) => s + v, 0)
  const numYears = entries.filter(e => e.income > 0).length
  const rawMdj = numYears > 0 ? totalRevaluedIncome / 44 : 0
  const mdj = Math.min(MDJ_MAX, Math.max(MDJ_MIN, Math.round(rawMdj)))
  extractedFields.push(`MDJ CHF ${mdj.toLocaleString('de-CH')}`)

  const lastYearIncome = entries[entries.length - 1].income

  // Validation warnings
  if (numYears < 5) warnings.push('Weniger als 5 Beitragsjahre gefunden – bitte Ergebnis prüfen.')
  if (lastYearIncome > 500000) warnings.push(`Ungewöhnlich hohes Einkommen im letzten Jahr (CHF ${lastYearIncome.toLocaleString('de-CH')}) – bitte prüfen.`)
  if (rawMdj > MDJ_MAX) warnings.push(`MDJ wurde auf Maximum CHF ${MDJ_MAX.toLocaleString('de-CH')} gekappt.`)

  console.log('[IK] Result:', numYears, 'years, MDJ', mdj, 'gaps:', gapYears, 'lastIncome:', lastYearIncome)

  return { entries, numYears, gapYears, mdj, totalRevaluedIncome: Math.round(totalRevaluedIncome), lastYearIncome, firstYear, lastYear, warnings, extractedFields }
}
