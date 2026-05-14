/**
 * Unified document text extraction pipeline.
 *
 * Supports: PDF (pdfjs-dist), Images (Tesseract OCR), HEIC (heic2any → OCR)
 * All processing runs entirely in the browser — nothing is sent to any server.
 */

import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

export type FileKind = 'pdf' | 'image' | 'heic' | 'unsupported'

export interface ExtractionResult {
  text: string
  kind: FileKind
  /** OCR-sourced text is noisier — parsers should apply fuzzy matching */
  isOcr: boolean
  warnings: string[]
}

export function detectFileKind(file: File): FileKind {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (name.endsWith('.heic') || name.endsWith('.heif') || type === 'image/heic' || type === 'image/heif') return 'heic'
  if (type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|tiff?)$/i.test(name)) return 'image'
  return 'unsupported'
}

// ── PDF ──────────────────────────────────────────────────────────────────────

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pages.push(pageText)
  }
  return pages.join('\n')
}

// ── Image preprocessing (Canvas → greyscale + contrast boost) ────────────────

async function preprocessImageForOcr(file: File | Blob): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)

      // Scale down very large images (>4 MP) to speed up OCR without losing detail
      const MAX_PX = 2400
      const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)

      // Greyscale + contrast boost via ImageData
      const imageData = ctx.getImageData(0, 0, w, h)
      const d = imageData.data
      for (let i = 0; i < d.length; i += 4) {
        // Luminance-weighted greyscale
        const grey = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        // Contrast stretch: push towards black/white
        const contrast = 1.6
        const boosted = Math.min(255, Math.max(0, Math.round((grey - 128) * contrast + 128)))
        d[i] = d[i + 1] = d[i + 2] = boosted
      }
      ctx.putImageData(imageData, 0, 0)
      resolve(canvas)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht geladen werden')) }
    img.src = url
  })
}

// ── OCR via Tesseract.js (lazy dynamic import) ────────────────────────────────

async function runOcr(canvas: HTMLCanvasElement, onProgress?: (pct: number) => void): Promise<string> {
  // Dynamic import keeps Tesseract out of the main bundle
  const { createWorker } = await import('tesseract.js')

  const worker = await createWorker('deu', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100))
      }
    },
  })

  try {
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÄÖÜäöüß\'’.,/-: \n',
    })
    const { data } = await worker.recognize(canvas)
    return data.text
  } finally {
    await worker.terminate()
  }
}

// ── HEIC → JPEG conversion ────────────────────────────────────────────────────

async function convertHeicToJpeg(file: File): Promise<Blob> {
  const { default: heic2any } = await import('heic2any')
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
  return Array.isArray(result) ? result[0] : result
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function extractDocumentText(
  file: File,
  onProgress?: (message: string, pct?: number) => void,
): Promise<ExtractionResult> {
  const warnings: string[] = []
  const kind = detectFileKind(file)
  const progress = (msg: string, pct?: number) => onProgress?.(msg, pct)

  // ── PDF ──
  if (kind === 'pdf') {
    progress('PDF wird gelesen…')
    try {
      const text = await extractPdfText(file)
      if (text.trim().length < 30) {
        warnings.push('PDF enthält kaum lesbaren Text (möglicherweise ein gescanntes/bild-basiertes PDF). Für bessere Ergebnisse bitte als Foto hochladen.')
      }
      return { text, kind: 'pdf', isOcr: false, warnings }
    } catch {
      warnings.push('PDF konnte nicht gelesen werden (passwortgeschützt oder beschädigt).')
      return { text: '', kind: 'pdf', isOcr: false, warnings }
    }
  }

  // ── HEIC → convert then OCR ──
  if (kind === 'heic') {
    progress('HEIC-Foto wird konvertiert…')
    let blob: Blob
    try {
      blob = await convertHeicToJpeg(file)
    } catch {
      warnings.push('iPhone-Foto (HEIC) konnte nicht konvertiert werden. Bitte zuerst in JPEG umwandeln.')
      return { text: '', kind: 'heic', isOcr: true, warnings }
    }
    progress('Texterkennung läuft… (10–30 Sekunden)')
    const canvas = await preprocessImageForOcr(blob)
    const text = await runOcr(canvas, (pct) => progress(`Texterkennung: ${pct}%`, pct))
    if (text.trim().length < 20) warnings.push('Wenig Text erkannt – bitte bei besserer Beleuchtung und ohne Schatten fotografieren.')
    return { text, kind: 'heic', isOcr: true, warnings }
  }

  // ── Image (JPG/PNG/WEBP/…) ──
  if (kind === 'image') {
    progress('Bild wird vorbereitet…')
    let canvas: HTMLCanvasElement
    try {
      canvas = await preprocessImageForOcr(file)
    } catch {
      warnings.push('Bild konnte nicht geladen werden.')
      return { text: '', kind: 'image', isOcr: true, warnings }
    }
    progress('Texterkennung läuft… (10–30 Sekunden)')
    const text = await runOcr(canvas, (pct) => progress(`Texterkennung: ${pct}%`, pct))
    if (text.trim().length < 20) warnings.push('Wenig Text erkannt – bitte bei guter Beleuchtung, gerade und ohne Schatten fotografieren.')
    return { text, kind: 'image', isOcr: true, warnings }
  }

  // ── Unsupported ──
  warnings.push(`Dateiformat nicht unterstützt. Bitte als PDF, Foto (JPG/PNG) oder HEIC hochladen.`)
  return { text: '', kind: 'unsupported', isOcr: false, warnings }
}

/** Normalise Swiss number strings from OCR: removes apostrophes, curly quotes, spaces */
export function parseSwissNumRobust(s: string): number {
  if (!s) return 0
  // Remove all possible thousand separators (apostrophe variants + space + period-as-thousand)
  const cleaned = s
    .replace(/[’‘ʼ'`\s]/g, '') // apostrophe variants + whitespace
    .replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2')   // period used as thousand separator
    .replace(',', '.')                           // comma decimal → dot
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}
