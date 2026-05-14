/**
 * PK-Ausweis PDF Parser
 *
 * Supports:
 * - comPlan (Swisscom) with ARC1/ARC2 header
 * - Generic Swiss PK statements
 *
 * Key design:
 * - Uses pdfjs-dist to extract raw text
 * - Strips ARC1/ARC2 machine-readable lines before parsing
 * - Parses Swiss number format: 1'234'567.89 -> 1234567.89
 * - Distinguishes current balance (Kontoauszug) from projected balance at 65
 * - Extracts per-age UWS table to match user's chosen retirement age
 */

import { extractDocumentText, parseSwissNumRobust } from './documentProcessor'

export interface PKExtractResult {
  // Core fields mapped to store
  pkCurrentCapital: number        // AGH am [latest date] — current actual balance
  pkRate: number                  // UWS at age 65 (or target age if known)
  pkAnnualContribution: number    // AN + AG Sparbeitrag combined
  pkMaxGuthaben: number           // maximale Einkaufssumme
  pkObligatorisch: number         // BVG-Altersguthaben (mandatory portion)
  projectedCapital65: number      // AGH at age 65 from table 2a (informational)
  insuredSalary: number           // versicherter Lohn

  // Bridging pension table (age -> CHF/month)
  bridgingByAge: Record<number, number>

  // Retirement table (age -> { agh, uws, renteJahr, renteMonat })
  retirementTable: Record<number, {
    agh: number
    uws: number
    renteJahr: number
    renteMonat: number
    ueberbrueckung: number
  }>

  // Meta
  extractedFields: string[]       // which fields were found
  warnings: string[]              // validation warnings
  pensionFundName: string
}

/** Alias to unified robust parser (handles apostrophe variants from OCR) */
const parseSwissNum = parseSwissNumRobust

/** Strip ARC1/ARC2 machine-readable header lines */
function stripArcHeaders(text: string): string {
  return text
    .split('\n')
    .filter(line => !line.trim().startsWith('ARC1|') && !line.trim().startsWith('ARC2|'))
    .join('\n')
}

/** Find a number after a label pattern in text */
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
 * Parse the retirement table (table 2a).
 * Expected columns: Alter AGH UWS AR/Jahr AR/Monat ÜR/Monat AKiR/Jahr
 *
 * The text extraction from PDFs flattens table cells — we look for lines
 * starting with a 2-digit age (58-70) followed by numbers.
 */
function parseRetirementTable(text: string): PKExtractResult['retirementTable'] {
  const table: PKExtractResult['retirementTable'] = {}

  // Match lines like: "65 1'145'963.95 5.00% 57'298.20 4'774.85 0.00 4'884.60"
  // or tokenized: age then numbers scattered nearby
  const swissNum = "[\\d']+(?:\\.\\d{1,2})?"
  const pct = '\\d+(?:\\.\\d{1,2})?%'

  // Try structured line pattern first (comPlan format)
  const linePattern = new RegExp(
    `\\b(5[89]|6[0-5])\\s+(${swissNum})\\s+(${pct})\\s+(${swissNum})\\s+(${swissNum})\\s+(${swissNum})`,
    'g'
  )

  let m: RegExpExecArray | null
  while ((m = linePattern.exec(text)) !== null) {
    const age = parseInt(m[1])
    table[age] = {
      agh: parseSwissNum(m[2]),
      uws: parseFloat(m[3]),
      renteJahr: parseSwissNum(m[4]),
      renteMonat: parseSwissNum(m[5]),
      ueberbrueckung: parseSwissNum(m[6]),
    }
  }

  // Fallback: try space-separated tokens around ages 58-65
  if (Object.keys(table).length === 0) {
    // Tokenize and look for age followed by large numbers
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
        if (agh > 100000 && uws > 3 && uws < 10) {
          table[age] = { agh, uws, renteJahr, renteMonat, ueberbrueckung: ueber }
        }
      }
    }
  }

  return table
}

/**
 * Parse the Kontoauszug section to find the most recent AGH balance.
 * Looks for "AGH am DD.MM.YYYY" followed by a number.
 */
function parseCurrentBalance(text: string): { balance: number; date: string } {
  // Find all "AGH am DD.MM.YYYY NNNN.NN" occurrences, take the last one
  const pattern = /AGH\s+am\s+(\d{2}\.\d{2}\.\d{4})\s+([\d']+(?:\.\d{1,2})?)/g
  let last: { balance: number; date: string } | null = null
  let m: RegExpExecArray | null
  while ((m = pattern.exec(text)) !== null) {
    const balance = parseSwissNum(m[2])
    if (balance > 0) {
      last = { balance, date: m[1] }
    }
  }

  // Also check "reglementarisches Altersguthaben" as cross-reference
  if (!last) {
    const regl = text.match(/reglementarisches\s+Altersguthaben\s+([\d']+(?:\.\d{1,2})?)/i)
    if (regl?.[1]) {
      return { balance: parseSwissNum(regl[1]), date: '' }
    }
  }

  return last ?? { balance: 0, date: '' }
}

/** Parse contribution section to get AN+AG Sparbeitrag */
function parseContributions(text: string): number {
  // Look for "Sparbeitrag ... N'NNN.NN" for both Mitglied and Arbeitgeber
  // Then sum them, or find a "Total Sparbeitrag AN+AG" line
  const totalPattern = /Total\s+(?:Sparbeitrag|Beitrag)\s+(?:AN\+AG|Mitglied\s+\+?\s*Arbeitgeber)?[^\d]*([\d']+(?:\.\d{1,2})?)/i
  const totalMatch = text.match(totalPattern)
  if (totalMatch?.[1]) {
    const t = parseSwissNum(totalMatch[1])
    if (t > 0) return t
  }

  // Sum Mitglied + Arbeitgeber Sparbeitrag lines
  // "Sparbeitrag Standard ... 9'712.80 ... 9'712.80"
  const sparbeitragPattern = /Sparbeitrag\s+\w+\s+[\d.]+%\s+vL\s+([\d']+(?:\.\d{1,2})?)\s+[\d']+(?:\.\d{1,2})?\s+[\d.]+%\s+vL\s+([\d']+(?:\.\d{1,2})?)/i
  const sbMatch = text.match(sparbeitragPattern)
  if (sbMatch?.[1] && sbMatch?.[2]) {
    const an = parseSwissNum(sbMatch[1])
    const ag = parseSwissNum(sbMatch[2])
    if (an > 0 && ag > 0) return an + ag
  }

  // Try to find "Sparbeitrag ... jährlich" blocks and sum two occurrences
  const sbAll = [...text.matchAll(/Sparbeitrag[^\d]*([\d']+(?:\.\d{1,2})?)\s+[\d']+(?:\.\d{1,2})?/g)]
  if (sbAll.length >= 2) {
    const an = parseSwissNum(sbAll[0][1])
    const ag = parseSwissNum(sbAll[1][1])
    if (an > 0 && ag > 0 && Math.abs(an - ag) / Math.max(an, ag) < 0.5) return an + ag
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
    return {
      pkCurrentCapital: 0, pkRate: 5.4, pkAnnualContribution: 0,
      pkMaxGuthaben: 0, pkObligatorisch: 0, projectedCapital65: 0,
      insuredSalary: 0, bridgingByAge: {}, retirementTable: {},
      extractedFields, warnings, pensionFundName: 'Unbekannte Pensionskasse',
    }
  }

  if (extraction.isOcr) {
    warnings.push('Texterkennung (OCR) verwendet – Werte bitte prüfen.')
    extractedFields.push('Quelle: OCR (Foto/Scan)')
  }

  const rawText = extraction.text
  const text = stripArcHeaders(rawText)

  // --- Pension fund name ---
  let pensionFundName = 'Unbekannte Pensionskasse'
  const namePatterns = [
    /comPlan/i,
    /Pensionskasse\s+([\w\s]+?)(?:\s+Vorsorgeausweis|\s*\n)/i,
    /^([A-Z][A-Za-z\s-]+(?:PK|Pensionskasse|Vorsorgekasse|Sammelstiftung))/m,
  ]
  if (/comPlan/i.test(text)) {
    pensionFundName = 'comPlan (Swisscom)'
    extractedFields.push('pensionFundName')
  } else {
    for (const p of namePatterns.slice(1)) {
      const m = text.match(p)
      if (m?.[1]) { pensionFundName = m[1].trim(); extractedFields.push('pensionFundName'); break }
    }
  }

  // --- Current balance (Kontoauszug, Abschnitt 5) ---
  const { balance: pkCurrentCapital, date: balanceDate } = parseCurrentBalance(text)
  if (pkCurrentCapital > 0) extractedFields.push(`pkCurrentCapital (per ${balanceDate || 'aktuell'})`)

  // --- Retirement table ---
  const retirementTable = parseRetirementTable(text)
  const hasTable = Object.keys(retirementTable).length > 0
  if (hasTable) extractedFields.push('retirementTable')

  // --- UWS at 65 ---
  const uws65 = retirementTable[65]?.uws ?? 0
  let pkRate = uws65
  if (pkRate === 0) {
    // Fallback: look for standalone UWS pattern
    pkRate = findAfterLabel(text, [
      /Umwandlungssatz(?:\s+bei\s+65)?[:\s]+([\d.]+)%/i,
      /UWS[:\s]+([\d.]+)%/i,
    ], 5.4)
  }
  if (pkRate > 0) extractedFields.push('pkRate (UWS@65)')

  // --- Projected capital at 65 ---
  const projectedCapital65 = retirementTable[65]?.agh ?? 0
  if (projectedCapital65 > 0) extractedFields.push('projectedCapital65')

  // --- Annual contribution (AN + AG) ---
  const pkAnnualContribution = parseContributions(text)
  if (pkAnnualContribution > 0) extractedFields.push('pkAnnualContribution (AN+AG)')

  // --- BVG mandatory portion ---
  const pkObligatorisch = findAfterLabel(text, [
    /BVG-Altersguthaben[:\s]+([\d']+(?:\.\d{1,2})?)/i,
    /obligatorisches?\s+(?:Guthaben|Altersguthaben)[:\s]+([\d']+(?:\.\d{1,2})?)/i,
  ])
  if (pkObligatorisch > 0) extractedFields.push('pkObligatorisch (BVG)')

  // --- Max purchase potential ---
  const pkMaxGuthaben = findAfterLabel(text, [
    /maximale\s+Einkaufssumme[^0-9]*([\d']+(?:\.\d{1,2})?)/i,
    /Einkaufspotenzial[^0-9]*([\d']+(?:\.\d{1,2})?)/i,
    /m[öo]glicher?\s+Einkauf[^0-9]*([\d']+(?:\.\d{1,2})?)/i,
    /maximaler?\s+(?:Einkauf|Nachkauf)[^0-9]*([\d']+(?:\.\d{1,2})?)/i,
  ])
  if (pkMaxGuthaben > 0) extractedFields.push('pkMaxGuthaben (Einkaufspotenzial)')

  // --- Insured salary ---
  const insuredSalary = findAfterLabel(text, [
    /Versicherter\s+Lohn\s*(?:\(vL\))?[:\s]+([\d']+(?:\.\d{1,2})?)/i,
    /versicherter\s+Jahreslohn[:\s]+([\d']+(?:\.\d{1,2})?)/i,
    /vL[:\s]+([\d']+(?:\.\d{1,2})?)/,
    /Jahreslohn[:\s]+([\d']+(?:\.\d{1,2})?)/i,
  ])
  if (insuredSalary > 0) extractedFields.push('insuredSalary')

  // --- Bridging pension by age ---
  const bridgingByAge: Record<number, number> = {}
  for (const [ageStr, row] of Object.entries(retirementTable)) {
    if (row.ueberbrueckung > 0) bridgingByAge[parseInt(ageStr)] = row.ueberbrueckung
  }

  // --- Validation ---
  if (pkCurrentCapital > 0 && projectedCapital65 > 0 && pkCurrentCapital >= projectedCapital65) {
    warnings.push('Aktuelles Guthaben erscheint grösser als Projektion bei 65 — bitte manuell prüfen.')
  }
  if (pkRate > 0 && (pkRate < 3 || pkRate > 8)) {
    warnings.push(`Umwandlungssatz ${pkRate}% ausserhalb des erwarteten Bereichs (3–8%) — bitte prüfen.`)
  }
  if (pkAnnualContribution > 0 && pkCurrentCapital > 0 && pkAnnualContribution > pkCurrentCapital) {
    warnings.push('Jährlicher Beitrag erscheint höher als aktuelles Guthaben — möglicherweise nur AN-Anteil extrahiert.')
  }
  if (pkCurrentCapital === 0) {
    warnings.push('Aktuelles Guthaben konnte nicht extrahiert werden — bitte manuell eingeben.')
  }
  if (pkRate === 0) {
    warnings.push('Umwandlungssatz konnte nicht extrahiert werden — Standardwert 5.40% verwendet.')
    extractedFields.push('pkRate (Standardwert 5.40%)')
  }

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
