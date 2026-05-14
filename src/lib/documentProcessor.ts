/**
 * Unified document text extraction pipeline.
 *
 * Supports: PDF (pdfjs-dist), Images (Tesseract OCR), HEIC (heic2any → OCR)
 * All processing runs entirely in the browser — nothing is sent to any server.
 *
 * PDF fallback chain:
 *   1. pdfjs text extraction (fast, works for native text PDFs)
 *   2. If text < 100 chars → render each page to canvas → Tesseract OCR
 *      (handles scanned / image-based PDFs)
 */

import * as pdfjsLib from 'pdfjs-dist'

// Worker served from public/ — avoids CDN dependency and version mismatches
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

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

// ── PDF native text extraction ────────────────────────────────────────────────

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    // Join items with space; each item is a text run
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pages.push(pageText)
    console.debug(`[PDF] page ${i}/${pdf.numPages}: ${pageText.length} chars | preview: ${pageText.slice(0, 120)}`)
  }
  const full = pages.join('\n')
  console.debug('[PDF] total chars extracted:', full.length)
  return full
}

// ── PDF → canvas → OCR fallback ──────────────────────────────────────────────

async function renderPdfPageToCanvas(page: pdfjsLib.PDFPageProxy, scale = 2.5): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  // pdfjs v5 API: pass canvas directly (canvasContext deprecated)
  await page.render({ canvas, viewport }).promise
  return canvas
}

async function extractPdfViaOcr(
  file: File,
  onProgress?: (msg: string, pct?: number) => void,
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(`Seite ${i}/${pdf.numPages} wird per OCR gelesen…`)
    const page = await pdf.getPage(i)
    const canvas = await renderPdfPageToCanvas(page)
    const text = await runOcr(canvas, (pct) =>
      onProgress?.(`OCR Seite ${i}/${pdf.numPages}: ${pct}%`, pct)
    )
    console.debug(`[PDF-OCR] page ${i}: ${text.length} chars | preview: ${text.slice(0, 120)}`)
    pages.push(text)
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
      tessedit_char_whitelist: `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÄÖÜäöüß''´.,/-: \n`,
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

      // If pdfjs got real text content, use it
      if (text.trim().length >= 100) {
        return { text, kind: 'pdf', isOcr: false, warnings }
      }

      // Short text → PDF is likely image-based (scanned); fall through to OCR
      console.debug('[PDF] text too short, switching to OCR fallback')
      progress('PDF enthält wenig Text – Texterkennung wird gestartet…')
      warnings.push('PDF wurde per Texterkennung (OCR) gelesen – Werte bitte sorgfältig prüfen.')

    } catch (err) {
      console.error('[PDF] extraction failed:', err)
      // Might be a scanned/image-only PDF that pdfjs can still render
      progress('PDF-Textextraktion fehlgeschlagen – Texterkennung wird gestartet…')
      warnings.push('PDF-Text konnte nicht direkt gelesen werden – OCR-Fallback wird verwendet.')
    }

    // OCR fallback: render each page to canvas, then Tesseract
    try {
      const ocrText = await extractPdfViaOcr(file, progress)
      if (ocrText.trim().length < 20) {
        warnings.push('Wenig Text erkannt. Bitte PDF-Qualität prüfen oder Werte manuell eingeben.')
      }
      return { text: ocrText, kind: 'pdf', isOcr: true, warnings }
    } catch (err2) {
      console.error('[PDF-OCR] fallback failed:', err2)
      warnings.push('PDF konnte weder gelesen noch per Texterkennung verarbeitet werden. Bitte Werte manuell eingeben.')
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
    .replace(/[''ʼ'`\s]/g, '') // apostrophe variants + whitespace
    .replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2')   // period used as thousand separator
    .replace(',', '.')                           // comma decimal → dot
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}
