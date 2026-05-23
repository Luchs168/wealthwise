import { useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import TopBar from '../components/TopBar'
import ProgressBar from '../components/ProgressBar'
import ChatPanel from '../components/ChatPanel'
import { useStore } from '../store'
import { fmtCHF, calculatePkRente, project3a, CONSTANTS } from '../lib/calc'
import { calculateAHVPension, applyPlafonierung, AHV_2026 } from '../utils/ahvCalculation'
import { projectPKCapital, calculatePKPension, estimateContribution } from '../utils/pkCalculation'
import { PK_CONSTANTS } from '../constants/pkConstants'
import { parsePKPdf } from '../lib/pkPdfParser'
import type { PKExtractResult } from '../lib/pkPdfParser'
import { parseIKAuszug } from '../lib/ikAuszugParser'
import type { IKAuszugResult } from '../lib/ikAuszugParser'

interface IKEditState {
  firstYear: string
  lastYear: string
  totalIncome: string
  lastIncome: string
  gaps: string
}
const IK_EDIT_EMPTY: IKEditState = { firstYear: '', lastYear: '', totalIncome: '', lastIncome: '', gaps: '0' }
function parseIKNum(s: string): number {
  return parseFloat(s.replace(/['’ʼ\s]/g, '').replace(',', '.')) || 0
}

interface MdjInputProps {
  income: number
  ahvAvgIncome: number | undefined
  retireAge: number
  autoY: number
  gaps: number
  onUpdate: (v: number | undefined) => void
  onTouched: () => void
}

function MdjInput({ income, ahvAvgIncome, retireAge, autoY, gaps, onUpdate, onTouched }: MdjInputProps) {
  const effectiveMdj = ahvAvgIncome ?? income
  const [raw, setRaw] = useState('')
  const [focused, setFocused] = useState(false)

  const renteMdj = calculateAHVPension({
    avgIncome: effectiveMdj,
    bezugAge: retireAge || 65,
    effectiveContributionYears: Math.max(0, autoY - gaps),
  })
  const renteAtIncome = calculateAHVPension({
    avgIncome: income,
    bezugAge: retireAge || 65,
    effectiveContributionYears: Math.max(0, autoY - gaps),
  })
  const isFromIk = ahvAvgIncome !== undefined && ahvAvgIncome !== income
  const mdjDiffers = ahvAvgIncome !== undefined && ahvAvgIncome !== income

  return (
    <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 10 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 4 }}>
        Ø-Lebenseinkommen (MDJ)
        {isFromIk && (
          <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 400, color: '#166534', background: '#dcfce7', padding: '1px 7px', borderRadius: 10 }}>aus IK-Auszug</span>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginBottom: 8, lineHeight: 1.5 }}>
        Die AHV-Rente basiert auf Ihrem durchschnittlichen Einkommen über alle Beitragsjahre – nicht auf dem heutigen Lohn. Falls Sie früher weniger verdient haben, passen Sie diesen Wert an.
      </div>
      <div className="amount-wrap" style={{ maxWidth: 220 }}>
        <span className="prefix">CHF</span>
        <input
          type="text"
          inputMode="numeric"
          className="input"
          style={{ paddingLeft: 48 }}
          value={focused ? raw : (effectiveMdj > 0 ? fmtCHF(effectiveMdj) : '')}
          placeholder={income > 0 ? fmtCHF(income) : "z. B. 80'000"}
          onFocus={() => {
            setRaw(String(effectiveMdj || ''))
            setFocused(true)
          }}
          onBlur={() => {
            setFocused(false)
            const v = parseInt(raw.replace(/[^0-9]/g, '')) || 0
            onTouched()
            onUpdate(v > 0 ? v : undefined)
          }}
          onChange={(e) => setRaw(e.target.value.replace(/[^0-9']/g, ''))}
        />
      </div>
      {effectiveMdj >= 90720 ? (
        <div style={{ marginTop: 6, fontSize: 11.5, color: '#15803d' }}>
          ✓ Über dem AHV-Maximum (CHF 90'720) → Maximale Rente CHF 2'520/Mt.
        </div>
      ) : effectiveMdj > 0 ? (
        <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--ink-500)' }}>
          → Geschätzte AHV-Rente: <strong>CHF {fmtCHF(renteMdj.monthlyRente)}/Mt.</strong>
        </div>
      ) : null}
      {mdjDiffers && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.6 }}>
          <span style={{ color: 'var(--ink-400)' }}>Rente bei Ø CHF {fmtCHF(income)}: </span>
          <strong>CHF {fmtCHF(renteAtIncome.monthlyRente)}/Mt.</strong>
          <span style={{ margin: '0 6px', color: 'var(--ink-300)' }}>→</span>
          <span style={{ color: 'var(--ink-400)' }}>Rente bei Ø CHF {fmtCHF(Math.min(ahvAvgIncome!, 90720))}: </span>
          <strong style={{ color: renteMdj.monthlyRente < renteAtIncome.monthlyRente ? '#dc2626' : '#16a34a' }}>CHF {fmtCHF(renteMdj.monthlyRente)}/Mt.</strong>
        </div>
      )}
      <details style={{ marginTop: 8 }}>
        <summary style={{ fontSize: 11.5, color: 'var(--navy-600)', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 4 3-4"/></svg>
          Typische Richtwerte
        </summary>
        <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--ink-600)', lineHeight: 1.7, paddingLeft: 4 }}>
          <div>· Karriere mit stetigem Anstieg: ca. 60–75% des heutigen Einkommens</div>
          <div>· Lange Teilzeit-Phasen: ca. 40–60% des heutigen Einkommens</div>
          <div>· Immer ähnlich verdient: ca. 90–100% des heutigen Einkommens</div>
          <div style={{ marginTop: 4, color: 'var(--ink-400)' }}>Den genauen Wert finden Sie auf Ihrem IK-Auszug – kostenlos bestellbar unter{' '}
            <a href="https://www.ahv-iv.ch" target="_blank" rel="noreferrer" style={{ color: 'var(--navy-600)' }}>www.ahv-iv.ch</a>
          </div>
        </div>
      </details>
    </div>
  )
}

function TransitionOverlay2({
  onContinue,
  totalMonthly,
  ahvMonthly,
  pkMonthly,
}: {
  onContinue: () => void
  totalMonthly: number
  ahvMonthly: number
  pkMonthly: number
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#fff', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', background: '#dcfce7',
          color: '#16a34a', fontSize: 26, display: 'grid',
          placeItems: 'center', margin: '0 auto 24px',
        }}>✓</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 26, color: 'var(--navy-900)', margin: '0 0 8px' }}>
          Vorsorge und Vermögen erfasst
        </h2>
        <p style={{ fontSize: 15, color: 'var(--ink-500)', margin: '0 0 28px' }}>
          Hier ist Ihre erste Einschätzung:
        </p>

        {/* Wow moment */}
        <div style={{
          background: 'var(--navy-900)', borderRadius: 16,
          padding: '28px 28px', marginBottom: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', marginBottom: 6, fontFamily: 'var(--font-mono)', letterSpacing: '.04em' }}>
            VORAUSSICHTLICHES EINKOMMEN NACH PENSIONIERUNG
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 40, color: '#fff', letterSpacing: '-.02em' }}>
            CHF {fmtCHF(totalMonthly)}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', marginTop: 4 }}>pro Monat (AHV + PK-Rente)</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.12)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginBottom: 3 }}>AHV</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'rgba(255,255,255,.85)' }}>
                CHF {fmtCHF(ahvMonthly)}/Mt.
              </div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,.15)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginBottom: 3 }}>PK-Rente</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'rgba(255,255,255,.85)' }}>
                CHF {fmtCHF(pkMonthly)}/Mt.
              </div>
            </div>
          </div>
        </div>

        <p style={{ fontSize: 14, color: 'var(--ink-500)', margin: '0 0 24px', lineHeight: 1.6 }}>
          Im nächsten Schritt ermitteln wir Ihren Bedarf – wie viel Sie nach der Pensionierung tatsächlich ausgeben möchten.
        </p>
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '14px 24px' }}
          onClick={onContinue}
        >
          Weiter zur Ausgabenerfassung →
        </button>
        <p style={{ fontSize: 13, color: 'var(--ink-400)', marginTop: 14 }}>
          ⏱ Noch ca. 3 Minuten
        </p>
      </div>
    </div>
  )
}

function parseNum(s: string | number): number {
  if (typeof s === 'number') return s
  return parseInt(String(s).replace(/[^0-9]/g, '')) || 0
}

function CHFField({ label, value, onChange, hint, max }: {
  label: string; value: number; onChange: (v: number) => void; hint?: string; max?: number
}) {
  const [raw, setRaw] = useState('')
  const [focused, setFocused] = useState(false)
  const display = focused ? raw : (value > 0 ? fmtCHF(value) : '')

  return (
    <div className="field">
      <label>{label}</label>
      <div className="amount-wrap">
        <span className="prefix">CHF</span>
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onFocus={() => { setFocused(true); setRaw(value ? String(value) : '') }}
          onBlur={() => { setFocused(false); onChange(parseNum(raw)) }}
          onChange={(e) => setRaw(e.target.value.replace(/[^0-9]/g, ''))}
          style={{ paddingLeft: 48 }}
        />
        {max && <span className="suffix" style={{ fontSize: 11, right: 10 }}>max {fmtCHF(max)}</span>}
      </div>
      {hint && <span style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 2 }}>{hint}</span>}
    </div>
  )
}

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className="switch-wrap"
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left' }}
    >
      <div className={`switch ${on ? 'on' : ''}`} aria-hidden="true" />
      <span style={{ fontSize: 14, color: 'var(--ink-700)' }}>{label}</span>
    </button>
  )
}

type PkExtractedFields = {
  pkCurrentCapital: number
  pkRate: number
  pkAnnualContribution: number
  pkMaxGuthaben: number
  pkObligatorisch: number
  retirementTable: PKExtractResult['retirementTable']
}

const ACCEPT_ALL = '.pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.bmp,image/*'
const isMobile = () => /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)

function PkUpload({ onExtract }: { onExtract: (fields: PkExtractedFields) => void }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [progressMsg, setProgressMsg] = useState('')
  const [fileName, setFileName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState<PKExtractResult | null>(null)
  const [showExtractedDetails, setShowExtractedDetails] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name || 'Dokument')
    setStatus('loading')
    setProgressMsg('Dokument wird vorbereitet…')
    try {
      const extracted = await parsePKPdf(file, (msg) => setProgressMsg(msg))
      setResult(extracted)
      onExtract({
        pkCurrentCapital: extracted.pkCurrentCapital,
        pkRate: extracted.pkRate,
        pkAnnualContribution: extracted.pkAnnualContribution,
        pkMaxGuthaben: extracted.pkMaxGuthaben,
        pkObligatorisch: extracted.pkObligatorisch,
        retirementTable: extracted.retirementTable,
      })
      setStatus('done')
    } catch (err) {
      console.error('PK parsing failed:', err)
      setErrorMsg('Das Dokument konnte nicht automatisch gelesen werden. Mögliche Gründe: Schlechte Bildqualität, unbekanntes Format oder passwortgeschütztes PDF.')
      setStatus('error')
    }
  }, [onExtract])

  const reset = (e: React.MouseEvent) => {
    e.stopPropagation()
    setStatus('idle')
    setFileName('')
    setResult(null)
    setErrorMsg('')
    setProgressMsg('')
  }

  const mobile = isMobile()

  return (
    <div style={{ marginBottom: 8 }}>
      {status === 'idle' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={{
              fontSize: 12.5, padding: '6px 14px', borderRadius: 8,
              border: '1px solid var(--ink-200)', background: 'var(--surface)',
              cursor: 'pointer', color: 'var(--ink-700)', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            PK-Ausweis hochladen (PDF/Foto)
          </button>
          {mobile && (
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              style={{
                fontSize: 12.5, padding: '6px 14px', borderRadius: 8,
                border: '1px solid var(--ink-200)', background: 'var(--surface)',
                cursor: 'pointer', color: 'var(--ink-700)', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              Foto
            </button>
          )}
          <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>🔒 Nur lokal verarbeitet</span>
        </div>
      )}

      {status === 'loading' && (
        <div style={{ padding: '20px 24px', border: '2px dashed var(--ink-200)', borderRadius: 12, background: 'var(--surface)', textAlign: 'center' }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>⏳</div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-800)', marginBottom: 4 }}>{fileName}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>{progressMsg || 'Wird analysiert…'}</div>
        </div>
      )}

      {status === 'done' && result && (() => {
        const realFields = result.extractedFields.filter(f => !f.includes('Standardwert'))
        const realValues = [result.pkCurrentCapital, result.pkAnnualContribution, result.pkMaxGuthaben,
          result.insuredSalary, result.projectedCapital65, result.pkObligatorisch].filter(v => v > 0)
        const isSuccess = realFields.length >= 3 || realValues.length >= 3
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
            <span style={{ color: isSuccess ? '#16a34a' : '#f59e0b', fontWeight: 600 }}>
              {isSuccess ? '✓' : '⚠'} PK-Ausweis erkannt
            </span>
            <span style={{ color: 'var(--ink-400)', fontSize: 11 }}>{fileName}{result.pensionFundName ? ` · ${result.pensionFundName}` : ''}</span>
            <button onClick={reset} style={{ fontSize: 11, color: 'var(--navy-600)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
              Erneut hochladen
            </button>
          </div>
        )
      })()}

      {status === 'error' && (
        <div style={{ padding: '16px 18px', border: '2px solid #fca5a5', borderRadius: 12, background: '#fef2f2' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#991b1b', marginBottom: 6 }}>Konnte nicht gelesen werden</div>
          <div style={{ fontSize: 12.5, color: '#7f1d1d', marginBottom: 10, lineHeight: 1.6 }}>{errorMsg}</div>
          <div style={{ fontSize: 12, color: '#991b1b', marginBottom: 10 }}>Tipp: Foto bei guter Beleuchtung, gerade halten, ohne Schatten</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={reset} style={{ padding: '6px 14px', background: '#fff', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#991b1b' }}>Nochmals versuchen</button>
          </div>
        </div>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
      <input ref={fileRef} type="file" accept={ACCEPT_ALL} style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />

      {/* Extracted values summary – compact */}
      {status === 'done' && result && (() => {
        const hasAny = result.pkCurrentCapital > 0 || result.pkAnnualContribution > 0 || result.pkMaxGuthaben > 0 || result.insuredSalary > 0
        const realWarnings = result.warnings.filter(w => !w.includes('Standardwert') && !w.includes('konnte nicht extrahiert'))
        if (!hasAny) return null
        return (
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setShowExtractedDetails(!showExtractedDetails)}
              style={{ fontSize: 12, color: 'var(--navy-600)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ transform: showExtractedDetails ? 'rotate(180deg)' : 'none' }}><path d="M2 3l3 4 3-4"/></svg>
              Details aus Ausweis anzeigen
            </button>
            {showExtractedDetails && (
              <div style={{ marginTop: 6, padding: '10px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12, color: '#1e293b' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px' }}>
                  {result.pkCurrentCapital > 0 && <div>Guthaben: <strong>CHF {result.pkCurrentCapital.toLocaleString('de-CH', { maximumFractionDigits: 0 })}</strong></div>}
                  {result.pkRate > 0 && result.extractedFields.some(f => f.includes('UWS') && !f.includes('Standardwert')) && <div>UWS: <strong>{(result.retirementTable[65]?.uws ?? result.pkRate).toFixed(2)}%</strong></div>}
                  {result.pkAnnualContribution > 0 && <div>Sparbeitrag/Jahr: <strong>CHF {result.pkAnnualContribution.toLocaleString('de-CH', { maximumFractionDigits: 0 })}</strong></div>}
                  {result.pkMaxGuthaben > 0 && <div>Einkaufspotenzial: <strong>CHF {result.pkMaxGuthaben.toLocaleString('de-CH', { maximumFractionDigits: 0 })}</strong></div>}
                  {result.projectedCapital65 > 0 && <div>Projektion@65: <strong>CHF {result.projectedCapital65.toLocaleString('de-CH', { maximumFractionDigits: 0 })}</strong></div>}
                  {Object.keys(result.retirementTable).length > 0 && <div>Leistungstabelle: <strong>Alter {Object.keys(result.retirementTable).join(', ')}</strong></div>}
                </div>
                {realWarnings.length > 0 && (
                  <div style={{ marginTop: 6, padding: '4px 8px', background: '#fef9c3', borderRadius: 5, fontSize: 11 }}>
                    {realWarnings.map((w, i) => <div key={i} style={{ color: '#713f12' }}>⚠ {w}</div>)}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

export default function Screen2() {
  const navigate = useNavigate()
  const { persons, updatePerson, hasPartner, person1, person2, civilStatus,
    ahvTouched, pkTouched, pillar3aTouched, wealthTouched,
    setAhvTouched, setPkTouched, setPillar3aTouched, setWealthTouched,
    sparkonto, wertschriften, children, wealthInvestmentProfile, setWealthInvestmentProfile } = useStore()
  const [activeTab, setActiveTab] = useState<1 | 2>(1)
  const [subStep, setSubStep] = useState<0 | 1>(0)
  const [kzgOverride, setKzgOverride] = useState(false) // user chose to edit KZG manually
  const [ahvExpanded, setAhvExpanded] = useState(false)
  const [showTransition, setShowTransition] = useState(false)
  const [pkInterestMode, setPkInterestMode] = useState<[string, string]>(['moderat', 'moderat'])
  const [pkContribMode, setPkContribMode] = useState<['auto' | 'manuell', 'auto' | 'manuell']>(['auto', 'auto'])
  const [pkEinkaufExpanded, setPkEinkaufExpanded] = useState(false)
  const [pkDetailsExpanded, setPkDetailsExpanded] = useState(false)
  const [activeAccordion, setActiveAccordion] = useState<string>('pk')
  const [ikResult, setIkResult] = useState<IKAuszugResult | null>(null)
  const [ikResult2, setIkResult2] = useState<IKAuszugResult | null>(null)
  const [ikLoading, setIkLoading] = useState(false)
  const [ikLoading2, setIkLoading2] = useState(false)
  const [ikApplied, setIkApplied] = useState(false)
  const [ikApplied2, setIkApplied2] = useState(false)
  const [ikProgressMsg1, setIkProgressMsg1] = useState('')
  const [ikProgressMsg2, setIkProgressMsg2] = useState('')
  const [ikError1, setIkError1] = useState('')
  const [ikError2, setIkError2] = useState('')
  const [ikEditState1, setIkEditState1] = useState<IKEditState>(IK_EDIT_EMPTY)
  const [ikEditState2, setIkEditState2] = useState<IKEditState>(IK_EDIT_EMPTY)

  const p1 = persons.find(p => p.id === 1)!
  const p2 = persons.find(p => p.id === 2)!
  const cur = activeTab === 1 ? p1 : p2

  const isPaar = hasPartner

  // Projected contribution years at retirement
  // For immigrants: retireAge - immigrationAge (capped at 44); otherwise retireAge - 21
  function calcAutoYears(retireAge: number, immigrationYear?: number, dob?: string): number {
    if (immigrationYear && immigrationYear > 1900) {
      const birthYear = dob ? parseInt(dob.split('.').pop() || '0') || parseInt(dob.split('-')[0]) : 0
      const immigrationAge = birthYear > 0 ? Math.max(0, immigrationYear - birthYear) : 25
      return Math.min(44, Math.max(0, retireAge - immigrationAge))
    }
    return Math.min(44, Math.max(0, retireAge - 21))
  }
  const autoYears1 = useMemo(() => calcAutoYears(person1.retireAge || 65, p1.immigrationYear, person1.dob), [person1.retireAge, p1.immigrationYear, person1.dob])
  const autoYears2 = useMemo(() => calcAutoYears(person2.retireAge || 65, p2.immigrationYear, person2.dob), [person2.retireAge, p2.immigrationYear, person2.dob])

  // Effective MDJ: user override takes priority, else current income (capped at AHV max inside calcBaseRente)
  const effectiveMdj1 = p1.ahvAvgIncome ?? p1.income
  const effectiveMdj2 = p2.ahvAvgIncome ?? p2.income

  // AHV calculation using precise 2026 factors
  const ahvResult1 = useMemo(() => calculateAHVPension({
    avgIncome: effectiveMdj1,
    bezugAge: p1.ahvBezugAge ?? 65,
    effectiveContributionYears: Math.max(0, (autoYears1) - (p1.ahvContributionGaps || 0)),
  }), [effectiveMdj1, p1.ahvBezugAge, autoYears1, p1.ahvContributionGaps])

  const ahvResult2 = useMemo(() => isPaar ? calculateAHVPension({
    avgIncome: effectiveMdj2,
    bezugAge: p2.ahvBezugAge ?? 65,
    effectiveContributionYears: Math.max(0, (autoYears2) - (p2.ahvContributionGaps || 0)),
  }) : null, [isPaar, effectiveMdj2, p2.ahvBezugAge, autoYears2, p2.ahvContributionGaps])

  const plafonierung = useMemo(() => {
    if (!ahvResult2) return { monthly1: ahvResult1.monthlyRente, monthly2: 0, plafonReduction: 0 }
    return applyPlafonierung(ahvResult1.monthlyRente, ahvResult2.monthlyRente, civilStatus)
  }, [ahvResult1, ahvResult2, civilStatus])

  const ahvCombinedMonthly = plafonierung.monthly1 + plafonierung.monthly2

  // PK projection helper
  const getPKProjection = (id: 1 | 2) => {
    const pData = id === 1 ? p1 : p2
    const personBase = id === 1 ? person1 : person2
    const currentAge = calcAge(personBase.dob) || 45
    const retireAge = personBase.retireAge
    const yearsToRetirement = Math.max(0, retireAge - currentAge)
    const contribModeIdx = id === 1 ? 0 : 1
    const effectiveContrib = pkContribMode[contribModeIdx] === 'auto'
      ? estimateContribution(pData.income, currentAge)
      : (pData.pkAnnualContribution || estimateContribution(pData.income, currentAge))
    const rate = pData.pkInterestRate || PK_CONSTANTS.BVG_MIN_INTEREST_RATE
    const insuredSalary = Math.max(0, pData.income - PK_CONSTANTS.COORDINATION_DEDUCTION_2026)

    // If the PK document provided a retirement table, use its projected capital for the
    // chosen retirement age directly — the PK knows age-specific Altersgutschriften better
    // than our flat BVG formula.
    const tableEntry = pData.pkRetirementTable?.[retireAge]
    const fromTable = !!tableEntry
    const uwsForAge = tableEntry ? tableEntry.uws : (pData.pkRate || 5.4)

    const projected = fromTable
      ? tableEntry!.agh
      : (pData.pkCurrentCapital > 0
          ? projectPKCapital(pData.pkCurrentCapital, effectiveContrib, rate, yearsToRetirement)
          : pData.pkCapital)
    const pension = calculatePKPension(projected, uwsForAge / 100)
    return { currentAge, retireAge, yearsToRetirement, effectiveContrib, rate, insuredSalary, projected, pension, fromTable, uwsForAge }
  }

  const updatePKAndProject = (id: 1 | 2, patch: Partial<typeof p1>) => {
    const pData = { ...(id === 1 ? p1 : p2), ...patch }
    const personBase = id === 1 ? person1 : person2
    const currentAge = calcAge(personBase.dob) || 45
    const retireAge = personBase.retireAge
    const yearsToRetirement = Math.max(0, retireAge - currentAge)
    const contribModeIdx = id === 1 ? 0 : 1
    const effectiveContrib = pkContribMode[contribModeIdx] === 'auto'
      ? estimateContribution(pData.income, currentAge)
      : (pData.pkAnnualContribution || estimateContribution(pData.income, currentAge))
    const rate = pData.pkInterestRate || PK_CONSTANTS.BVG_MIN_INTEREST_RATE

    // Prefer authoritative projected capital from PK retirement table if available
    const tableEntry = pData.pkRetirementTable?.[retireAge]
    if (tableEntry) {
      updatePerson(id, { ...patch, pkCapital: tableEntry.agh, pkRate: tableEntry.uws })
    } else if (pData.pkCurrentCapital > 0) {
      const projected = projectPKCapital(pData.pkCurrentCapital, effectiveContrib, rate, yearsToRetirement)
      updatePerson(id, { ...patch, pkCapital: projected })
    } else {
      updatePerson(id, patch)
    }
  }

  const pkProj1 = useMemo(() => getPKProjection(1), [p1, person1, pkContribMode])
  const pkProj2 = useMemo(() => getPKProjection(2), [p2, person2, pkContribMode])

  // PK rente
  const pk1 = useMemo(() => calculatePkRente({ pkCapitalAt65: p1.pkCapital, pkConversionRate: p1.pkRate }), [p1])
  const pk2 = useMemo(() => calculatePkRente({ pkCapitalAt65: p2.pkCapital, pkConversionRate: p2.pkRate }), [p2])

  // 3a projection
  const years1 = Math.max(0, person1.retireAge - (calcAge(person1.dob) || 57))
  const years2 = Math.max(0, person2.retireAge - (calcAge(person2.dob) || 55))
  const get3aRate = (form: string | undefined) => CONSTANTS.RETURNS_3A[form || 'sparkonto'] ?? CONSTANTS.RETURNS_3A.sparkonto
  const proj3a1 = useMemo(() => project3a(p1.balance3a, p1.yearly3a, years1, get3aRate(p1.form3a)), [p1, years1])
  const proj3a2 = useMemo(() => project3a(p2.balance3a, p2.yearly3a, years2, get3aRate(p2.form3a)), [p2, years2])

  const totalMonthly = ahvCombinedMonthly +
    (p1.hasPK ? (p1.pkBezugsart !== 'kapital' ? pk1.monthlyRente : 0) : 0) +
    (isPaar && p2.hasPK ? (p2.pkBezugsart !== 'kapital' ? pk2.monthlyRente : 0) : 0)

  // Completion tracking — only count sections the user has actively filled in
  const completedSections = [ahvTouched, pkTouched, pillar3aTouched, wealthTouched].filter(Boolean).length

  const AHV_BEZUG_LABELS: Record<number, string> = {
    63: 'Vorbezug 2 Jahre · Faktor 0.864 (−13.6%)',
    64: 'Vorbezug 1 Jahr · Faktor 0.932 (−6.8%)',
    65: 'Ordentlich (Referenzalter)',
    66: 'Aufschub 1 Jahr · Faktor 1.052 (+5.2%)',
    67: 'Aufschub 2 Jahre · Faktor 1.106 (+10.6%)',
    68: 'Aufschub 3 Jahre · Faktor 1.163 (+16.3%)',
    69: 'Aufschub 4 Jahre · Faktor 1.224 (+22.4%)',
    70: 'Aufschub 5 Jahre · Faktor 1.313 (+31.3%)',
  }

  const pkMonthly1 = p1.hasPK && p1.pkBezugsart !== 'kapital' ? pk1.monthlyRente : 0
  const pkMonthly2 = isPaar && p2.hasPK && p2.pkBezugsart !== 'kapital' ? pk2.monthlyRente : 0

  return (
    <div className="app">
      {showTransition && (
        <TransitionOverlay2
          onContinue={() => navigate('/schritt/3')}
          totalMonthly={totalMonthly}
          ahvMonthly={ahvCombinedMonthly}
          pkMonthly={pkMonthly1 + pkMonthly2}
        />
      )}
      <TopBar screenLabel="Vorsorgeplanung" />
      <ProgressBar current={2} />

      <main>
        <div className="page-head">
          <div className="eyebrow">{subStep === 0 ? 'Schritt 2a · AHV / 1. Säule' : 'Schritt 2b · Pensionskasse & Vermögen'}</div>
          <h1 className="title">{subStep === 0 ? 'AHV – Ihre 1. Säule' : 'Pensionskasse, 3a & Vermögen'}</h1>
          <p className="subtitle">
            {subStep === 0 ? 'Berechnen Sie Ihre voraussichtliche AHV-Rente basierend auf Ihren Beitragsjahren und Ihrem Einkommen.' : 'Erfassen Sie Ihre 2. und 3. Säule sowie Ihr weiteres Vermögen.'}
          </p>
        </div>

        {/* Sub-step 0: AHV */}
        {subStep === 0 && <>

        {/* Completion indicator with section labels */}
        <div style={{
          padding: '14px 16px',
          background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 12,
          marginBottom: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-600)', fontWeight: 500 }}>
                {completedSections} von 4 Bereichen ausgefüllt
                {completedSections < 4 && <span style={{ color: 'var(--ink-400)', fontWeight: 400 }}> – je mehr Angaben, desto präziser Ihre Analyse</span>}
                {completedSections === 4 && <span style={{ color: 'var(--green-600)', fontWeight: 600 }}> – alle Bereiche vollständig!</span>}
              </div>
              <div style={{ height: 4, background: 'var(--ink-100)', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  background: completedSections === 4 ? 'var(--green-500)' : 'var(--navy-600)',
                  width: `${(completedSections / 4) * 100}%`,
                  transition: 'width .4s',
                }} />
              </div>
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18,
              color: completedSections === 4 ? 'var(--green-600)' : 'var(--navy-700)',
            }}>
              {Math.round((completedSections / 4) * 100)}%
            </div>
          </div>
          {/* Section status pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'AHV', done: ahvTouched, hint: ahvTouched ? `CHF ${fmtCHF(ahvResult1.monthlyRente)}/Mt.` : null },
              { label: 'Pensionskasse', done: pkTouched, hint: pkTouched && p1.hasPK ? `CHF ${fmtCHF(pk1.monthlyRente)}/Mt.` : null },
              { label: 'Säule 3a', done: pillar3aTouched, hint: pillar3aTouched && p1.has3a && p1.balance3a > 0 ? `CHF ${fmtCHF(p1.balance3a)}` : null },
              { label: 'Vermögen', done: wealthTouched, hint: wealthTouched ? `CHF ${fmtCHF(useStore.getState().freeAssets)}` : null },
            ].map(({ label, done, hint }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 20,
                background: done ? '#dcfce7' : 'var(--ink-100)',
                color: done ? '#15803d' : 'var(--ink-500)',
                fontSize: 12, fontWeight: 500,
              }}>
                <span>{done ? '✓' : '○'}</span>
                <span>{label}</span>
                {hint && <span style={{ color: '#16a34a', fontWeight: 600 }}>· {hint}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Person tabs */}
        {isPaar && (
          <div className="tabs" style={{ marginBottom: 0 }}>
            <button
              className={`tab ${activeTab === 1 ? 'active' : ''}`}
              onClick={() => setActiveTab(1)}
            >
              <span className="tab-dot">1</span>
              <span>{person1.name || 'Person 1'}</span>
            </button>
            <button
              className={`tab ${activeTab === 2 ? 'active' : ''}`}
              onClick={() => setActiveTab(2)}
            >
              <span className="tab-dot">2</span>
              <span>{person2.name || 'Person 2'}</span>
            </button>
          </div>
        )}

        {/* A · AHV */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">A</span>AHV – 1. Säule
            </h2>
            <span className="block-hint" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>Rentenskala 44 · BSV 2026</span>
          </div>

          {/* AHV Bezugszeitpunkt – Slider */}
          {isPaar && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[1, 2].map((n) => (
                <button
                  key={n}
                  className={`tab ${activeTab === n ? 'active' : ''}`}
                  onClick={() => setActiveTab(n as 1 | 2)}
                  style={{ flex: 1 }}
                >
                  <span className="tab-dot">{n}</span>
                  <span>{n === 1 ? person1.name || 'Person 1' : person2.name || 'Person 2'}</span>
                </button>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)' }}>
                AHV-Bezugsbeginn
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--navy-800)' }}>
                Alter {activeTab === 1 ? (p1.ahvBezugAge ?? 65) : (p2.ahvBezugAge ?? 65)}
              </div>
            </div>
            <input
              type="range"
              min={63}
              max={70}
              step={1}
              value={activeTab === 1 ? (p1.ahvBezugAge ?? 65) : (p2.ahvBezugAge ?? 65)}
              onChange={(e) => updatePerson(activeTab, { ahvBezugAge: parseInt(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--navy-700)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-400)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {[63,64,65,66,67,68,69,70].map(a => <span key={a}>{a}</span>)}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)', padding: '6px 10px', background: 'var(--navy-50)', borderRadius: 6 }}>
              {AHV_BEZUG_LABELS[activeTab === 1 ? (p1.ahvBezugAge ?? 65) : (p2.ahvBezugAge ?? 65)]}
            </div>
            {(() => {
              const age = activeTab === 1 ? (p1.ahvBezugAge ?? 65) : (p2.ahvBezugAge ?? 65)
              if (age < 65) return (
                <div style={{ marginTop: 8, fontSize: 12.5, color: '#92400e', padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
                  ⚠ Der Vorbezug reduziert Ihre AHV-Rente dauerhaft und lebenslang. Alle 5 Varianten finden Sie in der Analyse (Schritt 4).
                </div>
              )
              if (age > 65) return (
                <div style={{ marginTop: 8, fontSize: 12.5, color: '#14532d', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                  ✓ Der Aufschub erhöht Ihre AHV-Rente dauerhaft. Je länger die Lebenserwartung, desto vorteilhafter.
                </div>
              )
              return null
            })()}
          </div>

          <div className="ahv-card">
            <div className="ahv-row">
              <div>
                <div className="ahv-row-label">{person1.name || 'Person 1'}</div>
                <div className="ahv-row-sub">
                  Ø-Einkommen CHF {fmtCHF(Math.min(effectiveMdj1, 90720))} · {Math.max(0, autoYears1 - (p1.ahvContributionGaps || 0))} Beitragsjahre
                  {p1.ahvAvgIncome && p1.ahvAvgIncome !== p1.income && (
                    <span style={{ marginLeft: 6, color: 'rgba(255,255,255,.55)', fontSize: 10 }}>(angepasst)</span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="ahv-row-val">CHF {fmtCHF(plafonierung.monthly1 > 0 && isPaar ? plafonierung.monthly1 : ahvResult1.monthlyRente)}</div>
                <div className="ahv-row-sub">CHF {fmtCHF(ahvResult1.monthlyRente * 13)} / Jahr inkl. 13.</div>
              </div>
            </div>
            {isPaar && ahvResult2 && (
              <div className="ahv-row">
                <div>
                  <div className="ahv-row-label">{person2.name || 'Person 2'}</div>
                  <div className="ahv-row-sub">
                    Ø-Einkommen CHF {fmtCHF(Math.min(effectiveMdj2, 90720))} · {Math.max(0, autoYears2 - (p2.ahvContributionGaps || 0))} Beitragsjahre
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="ahv-row-val">CHF {fmtCHF(plafonierung.monthly2)}</div>
                  <div className="ahv-row-sub">CHF {fmtCHF(ahvResult2.monthlyRente * 13)} / Jahr inkl. 13.</div>
                </div>
              </div>
            )}
            {plafonierung.plafonReduction > 0 && (
              <div className="ahv-row" style={{ background: 'var(--amber-50)' }}>
                <div>
                  <div className="ahv-row-label">Ehepaar-Plafonierung</div>
                  <div className="ahv-row-sub">Max. CHF {fmtCHF(AHV_2026.PLAFOND_MONTHLY)}/Mt. (150% der Maximalrente)</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--amber-500)' }}>
                    − CHF {fmtCHF(plafonierung.plafonReduction)}
                  </div>
                </div>
              </div>
            )}
            <div className="ahv-row ahv-total">
              <div>
                <div className="ahv-row-label">{isPaar ? 'Haushalt total' : 'Ihre AHV-Rente'}</div>
                <div className="ahv-row-sub">inkl. 13. AHV-Rente (ab Dez. 2026)</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="ahv-row-val">CHF {fmtCHF(ahvCombinedMonthly)}</div>
                <div className="ahv-row-sub" style={{ color: 'rgba(255,255,255,.6)' }}>
                  CHF {fmtCHF(ahvCombinedMonthly * 13)} / Jahr
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--ink-500)', padding: '6px 10px', background: 'var(--navy-50)', borderRadius: 6 }}>
            ⌀ CH-Vergleich (BSV 2024): Männer CHF 1'900/Mt. · Frauen CHF 1'750/Mt. · Ehepaar max. CHF 3'555/Mt. (inkl. 13.)
          </div>

          <button
            className="link-toggle"
            style={{ marginTop: 12 }}
            onClick={() => setAhvExpanded(!ahvExpanded)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ transform: ahvExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            Details anpassen
          </button>

          {ahvExpanded && (
            <div className="link-expand">
              {[
                { id: 1 as const, name: person1.name || 'Person 1', autoY: autoYears1, gaps: p1.ahvContributionGaps },
                ...(isPaar ? [{ id: 2 as const, name: person2.name || 'Person 2', autoY: autoYears2, gaps: p2.ahvContributionGaps }] : []),
              ].map(({ id, name, autoY, gaps }) => (
                <div key={id} style={{ marginBottom: 16 }}>
                  {isPaar && <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy-700)', marginBottom: 8 }}>{name}</div>}
                  <div className="form-grid">
                    <div className="field">
                      <label>Beitragsjahre bei Pensionierung</label>
                      <div style={{
                        padding: '10px 14px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)',
                        borderRadius: 8, fontFamily: 'var(--font-display)', fontWeight: 600,
                        fontSize: 15, color: 'var(--navy-800)',
                      }}>
                        {autoY} Jahre
                        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-500)', marginLeft: 8, fontFamily: 'inherit' }}>
                          {autoY < 44 ? `${autoY} von 44 Beitragsjahren (${Math.round(autoY / 44 * 100)}% der vollen Rente)` : 'Volle AHV-Rente (44 Beitragsjahre)'}
                        </span>
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor={`ahv-gaps-p${id}`}>Beitragslücken (Anzahl Jahre)</label>
                      <input
                        type="number"
                        id={`ahv-gaps-p${id}`}
                        className="input"
                        min={0}
                        max={20}
                        step={1}
                        value={gaps}
                        onChange={(e) => { setAhvTouched(true); updatePerson(id, { ahvContributionGaps: Math.min(20, Math.max(0, parseInt(e.target.value) || 0)) }) }}
                      />
                      <div style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 4 }}>
                        Lücken entstehen z. B. durch Auslandaufenthalt ohne AHV-Beitrag oder durch Einkommen unter CHF 5'000/Jahr.
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}>
                    Effektive Beitragsjahre: <strong>{Math.max(0, autoY - gaps)}</strong> von 44
                    {gaps > 0 && ` · Lücken-Kürzung: −${(gaps / 44 * 100).toFixed(1)}%`}
                    {autoY < 44 && ` · Frühpension-Kürzung: −${((44 - autoY) / 44 * 100).toFixed(1)}%`}
                  </div>
                  {autoY < 44 && (
                    <div style={{ marginTop: 6, padding: '6px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, fontSize: 11.5, color: '#92400e' }}>
                      ⚠ Bei Pension mit {id === 1 ? person1.retireAge : person2.retireAge} erhalten Sie {Math.round(autoY / 44 * 100)}% der vollen AHV-Rente ({44 - autoY} Beitragsjahr{44 - autoY === 1 ? ' fehlt' : 'e fehlen'}). Das sind ca. CHF {fmtCHF(Math.round((44 - autoY) / 44 * 2520))} weniger pro Monat – zusätzlich zur Vorbezugskürzung.
                    </div>
                  )}

                  {/* MDJ – Massgebendes Durchschnittseinkommen */}
                  <MdjInput
                    income={persons.find(p => p.id === id)!.income}
                    ahvAvgIncome={persons.find(p => p.id === id)!.ahvAvgIncome}
                    retireAge={(id === 1 ? person1 : person2).retireAge || 65}
                    autoY={autoY}
                    gaps={gaps}
                    onUpdate={(v) => updatePerson(id, { ahvAvgIncome: v })}
                    onTouched={() => setAhvTouched(true)}
                  />

                  {gaps > 0 && persons.find(p => p.id === id)?.hasKZG && (
                    <div style={{ marginTop: 6, padding: '8px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, fontSize: 11.5, color: '#166534' }}>
                      ℹ Gut zu wissen: Ihre Erziehungsgutschriften können Beitragslücken teilweise kompensieren. Die AHV rechnet Ihnen für jedes Jahr mit Kindern unter 16 eine Gutschrift von CHF 45'360 an (hälftig bei Ehepaaren). Diese sind in Ihrer Rentenberechnung bereits berücksichtigt.
                    </div>
                  )}
                </div>
              ))}
              <p style={{ fontSize: 12, color: 'var(--ink-400)', margin: '8px 0 0' }}>
                Max. 44 Beitragsjahre für die volle Rente. Jedes fehlende Jahr kürzt die Rente um ca. 2.3% (lebenslang).
                {' '}→ Bestellen Sie Ihren IK-Auszug kostenlos unter{' '}
                <a href="https://www.ahv-iv.ch" target="_blank" rel="noreferrer" style={{ color: 'var(--navy-600)' }}>www.ahv-iv.ch</a>
              </p>

              {/* Fix 1+2: Einwanderungsjahr + SVA-Abkommen */}
              {[
                { id: 1 as const, name: person1.name || 'Person 1' },
                ...(isPaar ? [{ id: 2 as const, name: person2.name || 'Person 2' }] : []),
              ].map(({ id, name }) => {
                const curP = persons.find(p => p.id === id)!
                const pBase = id === 1 ? person1 : person2
                const autoY = id === 1 ? autoYears1 : autoYears2
                const isImmigrant = !!(curP.immigrationYear && curP.immigrationYear > 1900)
                const birthYear = pBase.dob ? (parseInt(pBase.dob.split('.').pop() || '0') || parseInt(pBase.dob.split('-')[0])) : 0
                const immigrationAge = isImmigrant && birthYear > 0 ? Math.max(0, curP.immigrationYear! - birthYear) : null
                return (
                  <div key={`imm-${id}`} style={{ marginTop: 12 }}>
                    {isPaar && <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-600)', marginBottom: 6 }}>{name}</div>}
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-700)', marginBottom: 6 }}>In der Schweiz AHV-pflichtig seit</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      {(['Seit Geburt / vor dem 21. Lebensjahr', 'Als Erwachsener eingewandert'] as const).map((label, idx) => (
                        <button key={label} type="button"
                          onClick={() => updatePerson(id, { immigrationYear: idx === 0 ? undefined : (curP.immigrationYear || new Date().getFullYear() - 20) })}
                          style={{
                            padding: '6px 14px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer',
                            border: '1px solid var(--navy-200)',
                            background: (idx === 0 ? !isImmigrant : isImmigrant) ? 'var(--navy-800)' : '#fff',
                            color: (idx === 0 ? !isImmigrant : isImmigrant) ? '#fff' : 'var(--ink-700)',
                          }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    {isImmigrant && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <label style={{ fontSize: 12.5, color: 'var(--ink-600)', whiteSpace: 'nowrap' }}>Einzug in die Schweiz (Jahr):</label>
                        <input
                          type="number"
                          className="input"
                          min={1950} max={new Date().getFullYear()}
                          value={curP.immigrationYear || ''}
                          onChange={e => updatePerson(id, { immigrationYear: parseInt(e.target.value) || undefined })}
                          style={{ width: 90 }}
                        />
                        {immigrationAge !== null && (
                          <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>
                            (mit {immigrationAge} Jahren eingewandert · max. {autoY} CH-Beitragsjahre)
                          </span>
                        )}
                      </div>
                    )}
                    {isImmigrant && autoY < 44 && (
                      <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1px solid #bae6fd', borderRadius: 8, fontSize: 12, color: '#1e40af', lineHeight: 1.6, marginBottom: 6 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Sozialversicherungsabkommen</div>
                        Die Schweiz hat Abkommen mit über 40 Ländern (u.a. Türkei, Deutschland, Italien, Portugal, Spanien, Kosovo, Serbien). Beitragsjahre aus Ihrem Herkunftsland können für die <strong>Anspruchsberechtigung</strong> auf Schweizer AHV angerechnet werden. Die Rentenhöhe berechnet sich aber nur auf den Schweizer Jahren.
                        {' '}Sie könnten zudem Anspruch auf eine Rente aus Ihrem Herkunftsland haben.{' '}
                        <a href="https://www.ahv-iv.ch" target="_blank" rel="noreferrer" style={{ color: '#1d4ed8' }}>Mehr Infos: ahv-iv.ch</a>
                      </div>
                    )}
                    {/* Fix 3: Beitragsbefreiung nichterwerbstätige Ehefrau */}
                    {(civilStatus === 'verheiratet' || civilStatus === 'partnerschaft') && isPaar && (curP.ahvContributionGaps || 0) > 0 && (() => {
                      const partnerId = id === 1 ? 2 : 1
                      const partnerIncome = persons.find(p => p.id === partnerId)?.income || 0
                      if (partnerIncome <= 0) return null
                      return (
                        <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '2px solid #16a34a', borderRadius: 8, fontSize: 12, color: '#14532d', lineHeight: 1.6, marginBottom: 6 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: '#15803d' }}>Wichtig: Möglicherweise KEINE Beitragslücken!</div>
                          Als verheiratete Person sind Sie von der AHV-Beitragspflicht befreit, wenn Ihr Ehepartner erwerbstätig ist und mindestens den doppelten Mindestbeitrag entrichtet. Da Ihr Partner ein Einkommen von CHF {(partnerIncome).toLocaleString('de-CH')} hat, war dies sehr wahrscheinlich der Fall.
                          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600 }}>Hat Ihr Partner in den Lückenjahren gearbeitet?</span>
                            {(['Ja', 'Nein'] as const).map(v => (
                              <button key={v} type="button"
                                onClick={() => {
                                  const covered = v === 'Ja'
                                  updatePerson(id, {
                                    partnerCoveredGaps: covered,
                                    ahvContributionGaps: covered ? 0 : curP.ahvContributionGaps,
                                  })
                                }}
                                style={{
                                  padding: '4px 14px', borderRadius: 16, fontSize: 12, cursor: 'pointer',
                                  border: '1px solid #16a34a',
                                  background: (v === 'Ja' && curP.partnerCoveredGaps) || (v === 'Nein' && curP.partnerCoveredGaps === false) ? '#16a34a' : '#fff',
                                  color: (v === 'Ja' && curP.partnerCoveredGaps) || (v === 'Nein' && curP.partnerCoveredGaps === false) ? '#fff' : '#15803d',
                                }}>
                                {v}
                              </button>
                            ))}
                          </div>
                          {curP.partnerCoveredGaps && (
                            <div style={{ marginTop: 6, fontWeight: 600, color: '#15803d' }}>
                              Lücken auf 0 gesetzt – Ihre AHV-Rente wurde entsprechend erhöht.
                            </div>
                          )}
                          <div style={{ marginTop: 6, fontSize: 11.5, color: '#166534' }}>
                            Bestellen Sie Ihren IK-Auszug (kostenlos) zur Prüfung:{' '}
                            <a href="https://www.ahv-iv.ch/de/Merkblaetter-Formulare/Formulare/Anmeldung-IK-Auszug" target="_blank" rel="noreferrer" style={{ color: '#15803d' }}>IK-Auszug bestellen</a>
                          </div>
                        </div>
                      )
                    })()}
                    {/* Fix 4: Ausländische Rentenansprüche */}
                    {isImmigrant && (
                      <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--ink-50)', border: '1px solid var(--ink-200)', borderRadius: 8, fontSize: 12, color: 'var(--ink-700)' }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>Ausländische Rentenansprüche (optional)</div>
                        <div style={{ marginBottom: 8, color: 'var(--ink-500)', lineHeight: 1.5 }}>
                          Haben Sie vor der Einwanderung im Ausland gearbeitet? Viele Herkunftsländer zahlen Renten an Personen die dort Beiträge geleistet haben.
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <label style={{ fontSize: 12, color: 'var(--ink-600)', whiteSpace: 'nowrap' }}>Geschätzte Auslandsrente (CHF/Monat):</label>
                          <input
                            type="number"
                            className="input"
                            min={0} max={5000} step={50}
                            placeholder="0"
                            value={curP.foreignPensionMonthly || ''}
                            onChange={e => updatePerson(id, { foreignPensionMonthly: parseFloat(e.target.value) || undefined })}
                            style={{ width: 90 }}
                          />
                        </div>
                        {(curP.foreignPensionMonthly || 0) > 0 && (
                          <div style={{ marginTop: 6, fontSize: 11.5, color: '#15803d' }}>
                            +CHF {(curP.foreignPensionMonthly!).toLocaleString('de-CH')}/Monat wird in der Cashflow-Berechnung berücksichtigt.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* KZG – Kinderziehungsgutschriften */}
              {(() => {
                const currentYear = new Date().getFullYear()
                const validChildren = children.filter(c => c.year && c.year.length === 4)
                const hasScreen1Children = validChildren.length > 0

                // Compute KZG years: span from first child born to last child turning 16,
                // capped at current year (only past years count)
                let autoKzgYears = 0
                let autoKzgCount = 0
                if (hasScreen1Children) {
                  const birthYears = validChildren.map(c => parseInt(c.year))
                  autoKzgCount = birthYears.length
                  const firstBirth = Math.min(...birthYears)
                  const lastTurns16 = Math.max(...birthYears) + 16
                  autoKzgYears = Math.max(0, Math.min(lastTurns16, currentYear) - firstBirth)
                }

                const isMarried2 = civilStatus === 'verheiratet' || civilStatus === 'partnerschaft'

                return (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--ink-100)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 6 }}>
                      Erziehungsgutschriften (AHV)
                    </div>

                    {hasScreen1Children && !kzgOverride ? (
                      // Auto-filled from Screen 1
                      <div style={{ padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, fontSize: 13 }}>
                        <div style={{ color: '#166534', marginBottom: 6, lineHeight: 1.5 }}>
                          Basierend auf Ihren Angaben ({autoKzgCount} {autoKzgCount === 1 ? 'Kind' : 'Kinder'}) werden{' '}
                          <strong>ca. {autoKzgYears} Jahre</strong> Erziehungsgutschriften berücksichtigt.
                          {isMarried2 && ' (bei Ehepaaren hälftig aufgeteilt)'}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => {
                              [1, 2].forEach(id => {
                                updatePerson(id as 1 | 2, {
                                  hasKZG: true,
                                  kzgChildren: autoKzgCount,
                                  kzgYears: autoKzgYears,
                                })
                              })
                            }}
                            style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #16a34a', background: '#16a34a', color: 'white', cursor: 'pointer' }}
                          >
                            ✓ Ja, übernehmen
                          </button>
                          <button
                            onClick={() => setKzgOverride(true)}
                            style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid var(--ink-300)', background: 'white', color: 'var(--ink-600)', cursor: 'pointer' }}
                          >
                            Nein, anpassen
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Manual entry (either no Screen 1 children, or user chose to override)
                      <>
                        <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 10, lineHeight: 1.5 }}>
                          {hasScreen1Children
                            ? 'Passen Sie die Werte manuell an (z.B. bei Pflegekindern oder geteilter Betreuung).'
                            : 'Falls Sie Kinder unter 16 erzogen haben (auch Pflegekinder), erhöhen Erziehungsgutschriften Ihre AHV-Rente.'}
                          {isMarried2 && ' Bei Ehepaaren werden die Gutschriften hälftig aufgeteilt.'}
                        </div>
                        {[
                          { id: 1 as const, name: person1.name || 'Person 1' },
                          ...(isPaar ? [{ id: 2 as const, name: person2.name || 'Person 2' }] : []),
                        ].map(({ id, name }) => {
                          const cur2 = persons.find(p => p.id === id)!
                          return (
                            <div key={id} style={{ marginBottom: 12 }}>
                              {isPaar && <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-600)', marginBottom: 6 }}>{name}</div>}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={cur2.hasKZG ?? false}
                                  onChange={e => updatePerson(id, { hasKZG: e.target.checked })}
                                  style={{ width: 16, height: 16, accentColor: 'var(--navy-700)', flexShrink: 0 }}
                                />
                                <span style={{ fontSize: 13, color: 'var(--ink-700)' }}>Ich habe Kinder erzogen (unter 16 Jahren)</span>
                              </div>
                              {cur2.hasKZG && (
                                <div className="form-grid" style={{ marginLeft: 26 }}>
                                  <div className="field">
                                    <label>Anzahl Kinder</label>
                                    <select
                                      className="input"
                                      value={cur2.kzgChildren ?? 0}
                                      onChange={e => updatePerson(id, { kzgChildren: parseInt(e.target.value) })}
                                      style={{ appearance: 'auto' }}
                                    >
                                      {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Kind' : 'Kinder'}</option>)}
                                    </select>
                                  </div>
                                  <div className="field">
                                    <label>Jahre mit Kindern unter 16</label>
                                    <select
                                      className="input"
                                      value={cur2.kzgYears ?? 0}
                                      onChange={e => updatePerson(id, { kzgYears: parseInt(e.target.value) })}
                                      style={{ appearance: 'auto' }}
                                    >
                                      {Array.from({ length: 33 }, (_, i) => i).map(y => (
                                        <option key={y} value={y}>{y} {y === 1 ? 'Jahr' : 'Jahre'}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}
                              {cur2.hasKZG && cur2.kzgChildren > 0 && cur2.kzgYears > 0 && (() => {
                                const KZG_YEARLY = 44100
                                const totalYears = Math.min(cur2.kzgYears, 16 * cur2.kzgChildren)
                                const kzgPerPerson = KZG_YEARLY * totalYears * (isMarried2 ? 0.5 : 1)
                                const baseYears = Math.min(44, Math.max(0, ((id === 1 ? person1.retireAge : person2.retireAge) || 65) - 21))
                                const effectiveYears = Math.max(1, baseYears - (cur2.ahvContributionGaps || 0))
                                const boost = Math.round(kzgPerPerson / effectiveYears)
                                return (
                                  <div style={{ marginLeft: 26, marginTop: 6, fontSize: 12, color: '#166534', padding: '6px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7 }}>
                                    KZG-Einkommenserhöhung: +CHF {boost.toLocaleString('de-CH')}/Jahr (Ø-Einkommen für AHV-Berechnung)
                                  </div>
                                )
                              })()}
                            </div>
                          )
                        })}
                        {hasScreen1Children && (
                          <button
                            onClick={() => setKzgOverride(false)}
                            style={{ fontSize: 12, color: 'var(--navy-600)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
                          >
                            ← Automatische Berechnung wiederherstellen
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )
              })()}

              {/* IK-Auszug Upload */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--ink-100)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 4 }}>
                  IK-Auszug (AHV-Kontoauszug) hochladen
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 12, lineHeight: 1.5 }}>
                  Mit Ihrem individuellen Kontoauszug (IK-Auszug) der SVA können wir Ihr massgebendes Durchschnittseinkommen (MDJ) und Ihre Beitragslücken exakt berechnen.
                  {' '}<a href="https://www.ahv-iv.ch/de/Merkblaetter-Formulare/Formulare/Anmeldung-IK-Auszug" target="_blank" rel="noreferrer" style={{ color: 'var(--navy-600)' }}>IK-Auszug bestellen (kostenlos)</a>
                </div>

                {[
                  { id: 1 as const, name: person1.name || 'Person 1', result: ikResult, loading: ikLoading, applied: ikApplied },
                  ...(isPaar ? [{ id: 2 as const, name: person2.name || 'Person 2', result: ikResult2, loading: ikLoading2, applied: ikApplied2 }] : []),
                ].map(({ id, name, result, loading, applied }) => {
                  const setResult = id === 1 ? setIkResult : setIkResult2
                  const setLoading = id === 1 ? setIkLoading : setIkLoading2
                  const setApplied = id === 1 ? setIkApplied : setIkApplied2
                  const [ikProgressMsg, setIkProgressMsg] = [
                    id === 1 ? ikProgressMsg1 : ikProgressMsg2,
                    id === 1 ? setIkProgressMsg1 : setIkProgressMsg2,
                  ]
                  const [ikError, setIkError] = [
                    id === 1 ? ikError1 : ikError2,
                    id === 1 ? setIkError1 : setIkError2,
                  ]
                  const editState = id === 1 ? ikEditState1 : ikEditState2
                  const setEditState = id === 1 ? setIkEditState1 : setIkEditState2

                  const handleFile = async (file: File) => {
                    setLoading(true)
                    setResult(null)
                    setApplied(false)
                    setIkError('')
                    setEditState(IK_EDIT_EMPTY)
                    try {
                      const r = await parseIKAuszug(file, (msg) => setIkProgressMsg(msg))
                      setResult(r)
                      // Populate editable fields; leave blank if OCR quality is poor
                      const rawTotal = r.entries.reduce((s, e) => s + e.income, 0)
                      const poorOcr = r.numYears < 5 || r.lastYearIncome < 1000 || r.gapYears.length > r.numYears
                      setEditState(poorOcr ? IK_EDIT_EMPTY : {
                        firstYear: r.firstYear > 0 ? String(r.firstYear) : '',
                        lastYear: r.lastYear > 0 ? String(r.lastYear) : '',
                        totalIncome: rawTotal > 0 ? String(rawTotal) : '',
                        lastIncome: r.lastYearIncome > 0 ? String(r.lastYearIncome) : '',
                        gaps: String(r.gapYears.length),
                      })
                    } catch (err) {
                      console.error('[IK] Upload failed:', err)
                      setIkError('Fehler beim Lesen der Datei. Bitte als PDF hochladen oder Werte manuell eingeben.')
                    } finally {
                      setLoading(false)
                      setIkProgressMsg('')
                    }
                  }

                  const handleApply = () => {
                    const gapsNum = Math.max(0, parseInt(editState.gaps) || 0)
                    const fYear = parseInt(editState.firstYear) || 0
                    const lYear = parseInt(editState.lastYear) || 0
                    const totalInc = parseIKNum(editState.totalIncome)
                    const lastInc = parseIKNum(editState.lastIncome)
                    if (lastInc < 100) return
                    const contribYears = fYear && lYear ? Math.max(1, lYear - fYear + 1 - gapsNum) : 0
                    const previewMdj = contribYears > 0 && totalInc > 0 ? Math.round(totalInc / contribYears) : 0
                    updatePerson(id, {
                      ahvContributionGaps: gapsNum,
                      // Store the computed average (MDJ) for AHV calc; keep income as current gross for PK
                      ...(previewMdj > 0 ? { ahvAvgIncome: previewMdj } : {}),
                    })
                    setAhvTouched(true)
                    setApplied(true)
                  }

                  const mobile = isMobile()

                  return (
                    <div key={`ik-${id}`} style={{ marginBottom: isPaar ? 16 : 0 }}>
                      {isPaar && <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-600)', marginBottom: 8 }}>{name}</div>}

                      {/* Upload zone */}
                      {!result && !loading && (
                        <>
                          <div style={{ marginBottom: 8, padding: '7px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, fontSize: 11.5, color: '#14532d', display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                            <span>🔒</span>
                            <span>Dokument wird nur lokal in Ihrem Browser verarbeitet – kein Server-Upload, sofort verworfen nach Extraktion.</span>
                          </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {mobile && (
                            <label style={{
                              flex: 1, minWidth: 130, padding: '10px 14px',
                              background: 'var(--navy-800)', color: '#fff', borderRadius: 10,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              gap: 6, fontSize: 13.5, fontWeight: 600,
                            }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                              Fotografieren
                              <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                            </label>
                          )}
                          <label
                            style={{
                              flex: 1, minWidth: 130,
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                              gap: 6, padding: '14px 12px', border: '2px dashed var(--navy-200)',
                              borderRadius: 10, cursor: 'pointer', background: 'var(--navy-50)',
                            }}
                            onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--navy-500)' }}
                            onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--navy-200)' }}
                            onDrop={e => {
                              e.preventDefault()
                              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--navy-200)'
                              const file = e.dataTransfer.files[0]
                              if (file) handleFile(file)
                            }}
                          >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--navy-400)" strokeWidth="1.5">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                              <polyline points="17 8 12 3 7 8"/>
                              <line x1="12" y1="3" x2="12" y2="15"/>
                            </svg>
                            <span style={{ fontSize: 12.5, color: 'var(--navy-600)', fontWeight: 500 }}>
                              {mobile ? 'Datei auswählen' : 'PDF / Foto hochladen'}
                            </span>
                            <input type="file" accept={ACCEPT_ALL} style={{ display: 'none' }}
                              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                          </label>
                        </div>
                        </>
                      )}

                      {loading && (
                        <div style={{ padding: '16px', background: 'var(--navy-50)', borderRadius: 10, textAlign: 'center', fontSize: 13, color: 'var(--navy-600)' }}>
                          <div style={{ marginBottom: 4 }}>⏳</div>
                          {ikProgressMsg || 'IK-Auszug wird analysiert…'}
                        </div>
                      )}

                      {ikError && !loading && !result && (
                        <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, fontSize: 13, color: '#991b1b' }}>
                          {ikError}
                          <button
                            style={{ marginLeft: 12, fontSize: 12, color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => setIkError('')}
                          >Nochmals versuchen</button>
                        </div>
                      )}

                      {result && !applied && (() => {
                        const fYear = parseInt(editState.firstYear) || 0
                        const lYear = parseInt(editState.lastYear) || 0
                        const gapsNum = Math.max(0, parseInt(editState.gaps) || 0)
                        const totalInc = parseIKNum(editState.totalIncome)
                        const lastInc = parseIKNum(editState.lastIncome)
                        const contribYears = fYear && lYear ? Math.max(1, lYear - fYear + 1 - gapsNum) : 0
                        const previewMdj = contribYears > 0 && totalInc > 0 ? Math.round(totalInc / contribYears) : 0
                        const ikValid = fYear >= 1960 && lYear <= 2026 && lYear > fYear && lastInc > 1000 && totalInc > 10000 && gapsNum >= 0 && gapsNum < (lYear - fYear + 1)
                        const poorOcr = result.numYears < 5 || result.lastYearIncome < 1000 || result.gapYears.length > result.numYears
                        const inputStyle = { width: '100%', padding: '5px 8px', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' as const, fontFamily: 'inherit' }
                        return (
                        <div style={{ padding: '14px 16px', background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: 10 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--navy-800)', marginBottom: 8 }}>
                            IK-Auszug gelesen – Werte prüfen und korrigieren
                          </div>

                          {poorOcr && (
                            <div style={{ marginBottom: 10, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, fontSize: 12, color: '#92400e' }}>
                              ⚠ Die automatische Erkennung war ungenau. Bitte tragen Sie die Werte von Ihrem IK-Auszug ein.
                            </div>
                          )}

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px', fontSize: 12.5, marginBottom: 10 }}>
                            <div>
                              <div style={{ color: 'var(--ink-600)', marginBottom: 3 }}>Erstes Beitragsjahr</div>
                              <input type="number" value={editState.firstYear}
                                onChange={e => setEditState({ ...editState, firstYear: e.target.value })}
                                placeholder="z.B. 2010" min="1960" max="2026" style={inputStyle} />
                            </div>
                            <div>
                              <div style={{ color: 'var(--ink-600)', marginBottom: 3 }}>Letztes Beitragsjahr</div>
                              <input type="number" value={editState.lastYear}
                                onChange={e => setEditState({ ...editState, lastYear: e.target.value })}
                                placeholder="z.B. 2024" min="1960" max="2026" style={inputStyle} />
                            </div>
                            <div>
                              <div style={{ color: 'var(--ink-600)', marginBottom: 3 }}>Total Einkommen (CHF)</div>
                              <input type="text" value={editState.totalIncome}
                                onChange={e => setEditState({ ...editState, totalIncome: e.target.value })}
                                placeholder="z.B. 944010" style={inputStyle} />
                              <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>«Total» am Ende Ihres Auszugs</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--ink-600)', marginBottom: 3 }}>Letztes Jahreseinkommen (CHF)</div>
                              <input type="text" value={editState.lastIncome}
                                onChange={e => setEditState({ ...editState, lastIncome: e.target.value })}
                                placeholder="z.B. 116845" style={inputStyle} />
                              <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>Letzte Zeile Ihres Auszugs</div>
                            </div>
                            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ color: 'var(--ink-600)', flexShrink: 0 }}>Jahre ohne Eintrag (Lücken):</div>
                              <input type="number" value={editState.gaps}
                                onChange={e => setEditState({ ...editState, gaps: e.target.value })}
                                placeholder="0" min="0"
                                style={{ width: 70, padding: '5px 8px', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
                              <div style={{ fontSize: 11.5, color: 'var(--ink-400)' }}>Fehlende Zeilen zählen</div>
                            </div>
                          </div>

                          {ikValid && (
                            <div style={{ marginBottom: 10, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, fontSize: 12.5 }}>
                              <span style={{ color: 'var(--ink-600)' }}>Beitragsjahre: </span>
                              <strong style={{ color: '#166534' }}>{contribYears}</strong>
                              <span style={{ marginLeft: 16, color: 'var(--ink-600)' }}>MDJ (Ø-Einkommen): </span>
                              <strong style={{ color: '#166534' }}>CHF {previewMdj.toLocaleString('de-CH')}</strong>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button type="button" onClick={handleApply} disabled={!ikValid}
                              style={{ padding: '8px 16px', background: ikValid ? '#15803d' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: ikValid ? 'pointer' : 'not-allowed' }}>
                              Werte übernehmen
                            </button>
                            <button type="button" onClick={() => { setResult(null); setApplied(false); setEditState(IK_EDIT_EMPTY) }}
                              style={{ padding: '8px 14px', background: 'transparent', color: 'var(--ink-500)', border: '1px solid var(--ink-200)', borderRadius: 8, fontSize: 12.5, cursor: 'pointer' }}>
                              Verwerfen
                            </button>
                          </div>
                        </div>
                        )
                      })()}

                      {applied && (
                        <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12.5, color: '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>✓ IK-Auszug übernommen · {Math.max(0, (parseInt(editState.lastYear) || 0) - (parseInt(editState.firstYear) || 0) + 1 - (parseInt(editState.gaps) || 0))} Beitragsjahre · MDJ CHF {(() => { const fy = parseInt(editState.firstYear)||0; const ly = parseInt(editState.lastYear)||0; const g = parseInt(editState.gaps)||0; const cy = fy && ly ? Math.max(1, ly - fy + 1 - g) : 0; const tot = parseIKNum(editState.totalIncome); return cy > 0 && tot > 0 ? Math.round(tot/cy).toLocaleString('de-CH') : '—' })()}</span>
                          <button
                            type="button"
                            onClick={() => { setResult(null); setApplied(false); setEditState(IK_EDIT_EMPTY) }}
                            style={{ fontSize: 11.5, color: 'var(--ink-400)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            Zurücksetzen
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

            </div>
          )}

        </section>

        </>}

        {/* Sub-step 1: PK / 3a / Vermögen */}
        {subStep === 1 && <>

        {/* AHV summary bridge */}
        <div style={{
          padding: '14px 18px',
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 12, marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 10,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#15803d', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
              ✓ AHV abgeschlossen
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#166534', fontFamily: 'var(--font-display)' }}>
              AHV-Rente: CHF {fmtCHF(ahvCombinedMonthly)}/Mt.
              {totalMonthly > ahvCombinedMonthly && (
                <span style={{ fontSize: 13, fontWeight: 500, color: '#16a34a', marginLeft: 10 }}>
                  + PK = CHF {fmtCHF(totalMonthly)}/Mt. gesamt
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setSubStep(0)}
            style={{ fontSize: 12, color: '#16a34a', background: 'none', border: '1px solid #bbf7d0', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}
          >
            AHV bearbeiten ↑
          </button>
        </div>

        {/* B · Pensionskasse */}
        <section className="block" style={{ overflow: 'hidden' }}>
          <div
            className="block-head"
            onClick={() => setActiveAccordion(prev => prev === 'pk' ? '' : 'pk')}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <h2 className="block-title">
              <span className="block-num">B</span>Pensionskasse – 2. Säule
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {activeAccordion !== 'pk' && (
                <span style={{ fontSize: 12, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
                  {cur.hasPK && cur.pkCurrentCapital > 0
                    ? `✓ CHF ${fmtCHF(cur.pkCurrentCapital)} · UWS ${cur.pkRate.toFixed(2)}%`
                    : cur.hasPK ? '✓ Versichert · Guthaben nicht erfasst' : '— Keine PK'}
                </span>
              )}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: activeAccordion === 'pk' ? 'rotate(90deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>

          {activeAccordion === 'pk' && (
          <div style={{ paddingBottom: 4 }}>

          {isPaar && (
            <div className="tabs" style={{ marginBottom: 20 }}>
              <button className={`tab ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>
                <span className="tab-dot">1</span><span>{person1.name || 'P1'}</span>
              </button>
              <button className={`tab ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>
                <span className="tab-dot">2</span><span>{person2.name || 'P2'}</span>
              </button>
            </div>
          )}

          <div className="toggle-row">
            <Switch
              on={cur.hasPK}
              onToggle={() => updatePerson(activeTab, { hasPK: !cur.hasPK })}
              label="Ich bin in einer Pensionskasse versichert"
            />
          </div>

          {cur.hasPK && (() => {
            const proj = activeTab === 1 ? pkProj1 : pkProj2
            const interestModeIdx = activeTab === 1 ? 0 : 1
            const contribModeIdx = activeTab === 1 ? 0 : 1
            const curInterestMode = pkInterestMode[interestModeIdx]
            const curContribMode = pkContribMode[contribModeIdx]
            const einkaufspotenzial = cur.pkMaxGuthaben > cur.pkCurrentCapital
              ? cur.pkMaxGuthaben - cur.pkCurrentCapital : 0

            const estimatedCapital = (() => {
              const income = cur.income || 0
              const age = proj.currentAge
              if (income <= 0) return 0
              const multiplier = age >= 60 ? 3.0 : age >= 55 ? 2.5 : age >= 50 ? 2.0 : 1.5
              return Math.round(income * multiplier / 10000) * 10000
            })()
            const isEstimated = cur.pkCurrentCapital === 0 && estimatedCapital > 0
            const pkCapitalDisplay = isEstimated ? estimatedCapital : cur.pkCurrentCapital

            return (
              <>
                {/* 1. Aktuelles Altersguthaben – mandatory */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    Aktuelles Altersguthaben
                    <span title="Steht auf Ihrem PK-Ausweis unter «Altersguthaben» oder «Sparguthaben» (Seite 1)." style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--ink-200)', color: 'var(--ink-600)', fontSize: 10, fontWeight: 700, display: 'inline-grid', placeItems: 'center', cursor: 'help', flexShrink: 0 }}>?</span>
                  </label>
                  <CHFField
                    label=""
                    value={pkCapitalDisplay}
                    onChange={(v) => { if (v > 0) setPkTouched(true); updatePKAndProject(activeTab, { pkCurrentCapital: v }) }}
                  />
                  {isEstimated && (
                    <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 4, paddingLeft: 2 }}>
                      Schätzung – ersetzen Sie diesen Wert mit der Zahl Ihres PK-Ausweises
                    </div>
                  )}
                </div>

                {/* 2. Umwandlungssatz – mandatory */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    Umwandlungssatz (UWS)
                    <span title="Der UWS bestimmt, wie viel Jahresrente Sie pro CHF 100'000 erhalten. Beispiel: CHF 500'000 × 5.4% = CHF 27'000/Jahr. Steht auf Ihrem PK-Ausweis. Schweizer Durchschnitt: 5.0–5.8%." style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--ink-200)', color: 'var(--ink-600)', fontSize: 10, fontWeight: 700, display: 'inline-grid', placeItems: 'center', cursor: 'help', flexShrink: 0 }}>?</span>
                  </label>
                  <div className="amount-wrap" style={{ maxWidth: 160 }}>
                    <input
                      type="number"
                      min={3}
                      max={8}
                      step={0.1}
                      value={cur.pkRate}
                      onChange={(e) => updatePKAndProject(activeTab, { pkRate: parseFloat(e.target.value) || 5.4 })}
                      style={{ textAlign: 'right', paddingRight: 32 }}
                    />
                    <span className="suffix">%</span>
                  </div>
                </div>

                {/* 3. Weitere Angaben (optional) – collapsed */}
                <details style={{ marginBottom: 16 }}>
                  <summary style={{ fontSize: 13, color: 'var(--navy-600)', cursor: 'pointer', userSelect: 'none', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 4 3-4"/></svg>
                    Weitere Angaben (optional)
                  </summary>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Sparbeitrag */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)' }}>
                          Jährlicher Sparbeitrag (AN + AG)
                          {curContribMode === 'manuell' && cur.pkAnnualContribution > 0 && cur.pkRetirementTable && (
                            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: '#059669', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 4, padding: '1px 6px' }}>aus Vorsorgeausweis</span>
                          )}
                        </label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {(['auto', 'manuell'] as const).map((m) => (
                            <button
                              key={m}
                              onClick={() => setPkContribMode(prev => {
                                const next = [...prev] as typeof prev
                                next[contribModeIdx] = m
                                return next
                              })}
                              style={{
                                fontSize: 11, padding: '3px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                background: curContribMode === m ? 'var(--navy-700)' : 'var(--ink-100)',
                                color: curContribMode === m ? '#fff' : 'var(--ink-600)',
                              }}
                            >
                              {m === 'auto' ? 'Automatisch' : 'Manuell'}
                            </button>
                          ))}
                        </div>
                      </div>
                      {curContribMode === 'auto' ? (
                        <div style={{ padding: '10px 14px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 8 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--navy-800)' }}>
                            CHF {fmtCHF(proj.effectiveContrib)} / Jahr
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>
                            Schätzung BVG: {proj.currentAge < 35 ? '14' : proj.currentAge < 45 ? '21' : proj.currentAge < 55 ? '28' : '35'}% von versichertem Lohn CHF {fmtCHF(proj.insuredSalary)}
                          </div>
                        </div>
                      ) : (
                        <CHFField
                          label=""
                          value={cur.pkAnnualContribution}
                          onChange={(v) => updatePKAndProject(activeTab, { pkAnnualContribution: v })}
                          hint="«Sparbeiträge total» auf Ihrem Vorsorgeausweis"
                        />
                      )}
                    </div>

                    {/* Zinssatz */}
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        Zinssatz Ihrer Pensionskasse
                        <span title="BVG-Mindestzins 2026: 1.25%. Den genauen Wert finden Sie im Geschäftsbericht Ihrer PK." style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--ink-200)', color: 'var(--ink-600)', fontSize: 10, fontWeight: 700, display: 'inline-grid', placeItems: 'center', cursor: 'help', flexShrink: 0 }}>?</span>
                      </label>
                      <div className="amount-wrap" style={{ maxWidth: 160 }}>
                        <input
                          type="number"
                          min={0}
                          max={6}
                          step={0.05}
                          value={(cur.pkInterestRate * 100).toFixed(2)}
                          onChange={(e) => updatePKAndProject(activeTab, { pkInterestRate: (parseFloat(e.target.value) || 0) / 100 })}
                          style={{ textAlign: 'right', paddingRight: 32 }}
                        />
                        <span className="suffix">%</span>
                      </div>
                    </div>

                    {/* Aufschlüsselung obligatorisch/überobligatorisch */}
                    <div className="form-grid">
                      <CHFField
                        label="Davon obligatorisch"
                        value={cur.pkObligatorisch}
                        onChange={(v) => updatePerson(activeTab, { pkObligatorisch: v })}
                        hint="BVG-Minimum (gesetzlich garantiert)"
                      />
                      <CHFField
                        label="Davon überobligatorisch"
                        value={cur.pkCurrentCapital > 0 && cur.pkObligatorisch > 0 ? cur.pkCurrentCapital - cur.pkObligatorisch : 0}
                        onChange={() => {}}
                        hint="Automatisch berechnet"
                      />
                    </div>

                    {/* Einkaufspotenzial */}
                    <div>
                      <CHFField
                        label="Maximales reglementarisches Guthaben"
                        value={cur.pkMaxGuthaben}
                        onChange={(v) => updatePerson(activeTab, { pkMaxGuthaben: v })}
                        hint="Vorsorgeausweis → «Einkaufspotenzial» oder «Möglicher Einkauf»"
                      />
                      {(() => {
                        const currentYear = new Date().getFullYear()
                        const pBase = activeTab === 1 ? person1 : person2
                        const yearsUntilPension = Math.max(0, (pBase.retireAge || 65) - (pBase.dob ? (currentYear - (parseInt(pBase.dob.split('.').pop() || '0') || parseInt(pBase.dob.split('-')[0]))) : 40))
                        const sperrfristAktiv = !!(cur.pkLastPurchaseYear && (cur.pkLastPurchaseYear + 3 > currentYear))
                        const einkaufSinnvoll = yearsUntilPension >= 4 && !sperrfristAktiv
                        if (einkaufspotenzial <= 0) return null
                        return (
                          <div style={{ marginTop: 8, padding: '10px 14px', background: einkaufSinnvoll ? '#f0fdf4' : '#f1f5f9', border: `1px solid ${einkaufSinnvoll ? '#bbf7d0' : '#cbd5e1'}`, borderRadius: 8 }}>
                            {einkaufSinnvoll ? (
                              <>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#14532d', marginBottom: 2 }}>
                                  Einkaufspotenzial: CHF {fmtCHF(einkaufspotenzial)}
                                </div>
                                <div style={{ fontSize: 11, color: '#166534' }}>
                                  + CHF {fmtCHF(Math.round(einkaufspotenzial * (cur.pkRate / 100) / 12))}/Mt. mehr Rente bei vollem Einkauf · steuerlich abzugsfähig
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize: 12, color: 'var(--ink-600)' }}>
                                {sperrfristAktiv
                                  ? `PK-Einkauf derzeit nicht empfohlen: Sperrfrist bis ${(cur.pkLastPurchaseYear || 0) + 3} aktiv.`
                                  : `Einkauf lohnt sich zeitlich nicht mehr (Pensionierung in ${yearsUntilPension} ${yearsUntilPension === 1 ? 'Jahr' : 'Jahren'}).`}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>

                    {/* PK-Einkauf in letzten 3 Jahren */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)', marginBottom: 8 }}>
                        PK-Einkauf in den letzten 3 Jahren getätigt?
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        {(['Nein', 'Ja'] as const).map(opt => (
                          <button key={opt} type="button"
                            onClick={() => updatePerson(activeTab, {
                              pkLastPurchaseYear: opt === 'Nein' ? undefined : (cur.pkLastPurchaseYear || new Date().getFullYear() - 1),
                              pkLastPurchaseAmount: opt === 'Nein' ? undefined : cur.pkLastPurchaseAmount,
                            })}
                            style={{
                              padding: '6px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                              border: '1px solid var(--navy-200)',
                              background: (opt === 'Nein' ? !cur.pkLastPurchaseYear : !!cur.pkLastPurchaseYear) ? 'var(--navy-800)' : '#fff',
                              color: (opt === 'Nein' ? !cur.pkLastPurchaseYear : !!cur.pkLastPurchaseYear) ? '#fff' : 'var(--ink-700)',
                            }}>
                            {opt}
                          </button>
                        ))}
                      </div>
                      {cur.pkLastPurchaseYear && (
                        <div className="form-grid" style={{ marginBottom: 8 }}>
                          <div className="field">
                            <label htmlFor={`pk-purchase-year-p${activeTab}`}>Jahr des Einkaufs</label>
                            <select
                              id={`pk-purchase-year-p${activeTab}`}
                              className="input"
                              value={cur.pkLastPurchaseYear}
                              onChange={e => updatePerson(activeTab, { pkLastPurchaseYear: parseInt(e.target.value) })}
                            >
                              {[2023, 2024, 2025, 2026].map(y => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <CHFField
                              label="Betrag (CHF)"
                              value={cur.pkLastPurchaseAmount ?? 0}
                              onChange={v => updatePerson(activeTab, { pkLastPurchaseAmount: v })}
                            />
                          </div>
                        </div>
                      )}
                      {cur.pkLastPurchaseYear && (() => {
                        const sperrfristBis = cur.pkLastPurchaseYear + 3
                        const currentYear = new Date().getFullYear()
                        const sperrfristAktiv = sperrfristBis > currentYear
                        const pBase = activeTab === 1 ? person1 : person2
                        const yearsUntilPension = Math.max(0, (pBase.retireAge || 65) - (pBase.dob ? (currentYear - (parseInt(pBase.dob.split('.').pop() || '0') || parseInt(pBase.dob.split('-')[0]))) : 40))
                        const pensionYear = currentYear + yearsUntilPension
                        const pensionBeforeSperrfrist = pensionYear < sperrfristBis
                        if (!sperrfristAktiv && !pensionBeforeSperrfrist) return null
                        return (
                          <div style={{ padding: '10px 14px', background: pensionBeforeSperrfrist ? '#fef2f2' : '#fffbeb', border: `2px solid ${pensionBeforeSperrfrist ? '#fca5a5' : '#fde68a'}`, borderRadius: 8, fontSize: 12.5, color: pensionBeforeSperrfrist ? '#7f1d1d' : '#78350f', lineHeight: 1.65 }}>
                            {pensionBeforeSperrfrist ? (
                              <><strong>Achtung:</strong> Pensionierung {pensionYear}, Sperrfrist bis {sperrfristBis} – kein Kapitalbezug möglich (Art. 79b BVG).</>
                            ) : (
                              <><strong>Sperrfrist aktiv:</strong> Kapitalbezug frühestens <strong>{sperrfristBis}</strong> möglich (Art. 79b BVG).</>
                            )}
                          </div>
                        )
                      })()}
                    </div>

                    {/* PK-Vorbezug */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)', marginBottom: 8 }}>
                        Vorbezug aus der Pensionskasse getätigt?
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        {(['Nein', 'Ja'] as const).map(opt => (
                          <button key={opt} type="button"
                            onClick={() => updatePerson(activeTab, {
                              pkVorbezugAmount: opt === 'Nein' ? undefined : (cur.pkVorbezugAmount || 0),
                              pkVorbezugYear: opt === 'Nein' ? undefined : (cur.pkVorbezugYear || new Date().getFullYear() - 2),
                              pkVorbezugGrund: opt === 'Nein' ? undefined : (cur.pkVorbezugGrund || 'wef'),
                            })}
                            style={{
                              padding: '6px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                              border: '1px solid var(--navy-200)',
                              background: (opt === 'Nein' ? !cur.pkVorbezugAmount : !!cur.pkVorbezugAmount || cur.pkVorbezugGrund !== undefined) ? 'var(--navy-800)' : '#fff',
                              color: (opt === 'Nein' ? !cur.pkVorbezugAmount : !!cur.pkVorbezugAmount || cur.pkVorbezugGrund !== undefined) ? '#fff' : 'var(--ink-700)',
                            }}>
                            {opt}
                          </button>
                        ))}
                      </div>
                      {(cur.pkVorbezugGrund !== undefined) && (
                        <>
                          <div className="form-grid" style={{ marginBottom: 8 }}>
                            <div className="field">
                              <label>Grund des Vorbezugs</label>
                              <select
                                className="input"
                                value={cur.pkVorbezugGrund || 'wef'}
                                onChange={e => updatePerson(activeTab, { pkVorbezugGrund: e.target.value as 'wef' | 'scheidung' })}
                              >
                                <option value="wef">Wohneigentumsförderung (WEF)</option>
                                <option value="scheidung">Scheidung</option>
                              </select>
                            </div>
                            <div className="field">
                              <label>Jahr des Vorbezugs</label>
                              <select
                                className="input"
                                value={cur.pkVorbezugYear || new Date().getFullYear() - 2}
                                onChange={e => updatePerson(activeTab, { pkVorbezugYear: parseInt(e.target.value) })}
                              >
                                {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                  <option key={y} value={y}>{y}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <CHFField
                            label="Bezogener Betrag (CHF)"
                            value={cur.pkVorbezugAmount ?? 0}
                            onChange={v => updatePerson(activeTab, { pkVorbezugAmount: v })}
                          />
                          {cur.pkVorbezugGrund === 'wef' && (() => {
                            const pBase = activeTab === 1 ? person1 : person2
                            const currentYear = new Date().getFullYear()
                            const retireAge = pBase.retireAge || 65
                            const rueckzahlFrist = retireAge - 3
                            const currentAge = pBase.dob
                              ? currentYear - (parseInt(pBase.dob.split('.').pop() || '0') || parseInt(pBase.dob.split('-')[0]) || 0)
                              : 45
                            const rueckzahlBisJahr = currentYear + Math.max(0, rueckzahlFrist - currentAge)
                            const renteMinus = cur.pkVorbezugAmount && cur.pkVorbezugAmount > 0
                              ? Math.round(cur.pkVorbezugAmount * (cur.pkRate / 100) / 12)
                              : 0
                            return (
                              <div style={{ marginTop: 8, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12.5, color: '#78350f', lineHeight: 1.6 }}>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>WEF-Rückzahlung</div>
                                <div>Rückzahlung möglich bis: <strong>{rueckzahlBisJahr}</strong> (3 Jahre vor Pension)</div>
                                {renteMinus > 0 && (
                                  <div>Auswirkung ohne Rückzahlung: ca. <strong>CHF {fmtCHF(renteMinus)}/Mt. weniger Rente</strong></div>
                                )}
                                <div style={{ fontSize: 11, color: '#92400e', marginTop: 4 }}>
                                  Rückzahlungen erhöhen Ihr Altersguthaben und sind steuerlich abzugsfähig (wie ein PK-Einkauf).
                                </div>
                              </div>
                            )
                          })()}
                          {cur.pkVorbezugGrund === 'scheidung' && (
                            <div style={{ marginTop: 8, padding: '10px 14px', background: '#eff6ff', border: '1px solid #bae6fd', borderRadius: 8, fontSize: 12.5, color: '#1e40af', lineHeight: 1.6 }}>
                              Der bei der Scheidung übertragene Betrag kann durch freiwillige PK-Einkäufe wieder aufgebaut werden. Diese sind steuerlich voll abzugsfähig.
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </details>

                {/* Upload – compact, at bottom */}
                <PkUpload onExtract={(fields) => {
                  setPkTouched(true)
                  const personBase = activeTab === 1 ? person1 : person2
                  const retireAge = personBase.retireAge || 65
                  const tableEntry = fields.retirementTable?.[retireAge]
                  const uwsForAge = tableEntry?.uws || fields.pkRate
                  if (fields.pkAnnualContribution > 0) {
                    setPkContribMode(prev => {
                      const next = [...prev] as typeof prev
                      next[activeTab === 1 ? 0 : 1] = 'manuell'
                      return next
                    })
                  }
                  const compactTable: Record<number, { agh: number; uws: number; renteMonat: number }> = {}
                  for (const [ageStr, entry] of Object.entries(fields.retirementTable)) {
                    compactTable[Number(ageStr)] = { agh: entry.agh, uws: entry.uws, renteMonat: entry.renteMonat }
                  }
                  updatePKAndProject(activeTab, {
                    pkCurrentCapital: fields.pkCurrentCapital,
                    pkRate: uwsForAge,
                    pkAnnualContribution: fields.pkAnnualContribution || undefined,
                    pkMaxGuthaben: fields.pkMaxGuthaben || undefined,
                    pkObligatorisch: fields.pkObligatorisch || undefined,
                    pkRetirementTable: Object.keys(compactTable).length > 0 ? compactTable : undefined,
                  })
                }} />

                {/* Compact Projektion */}
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink-600)' }}>
                    Projektion bei Alter {proj.retireAge}:{' '}
                    <strong style={{ color: 'var(--navy-800)', fontFamily: 'var(--font-display)' }}>CHF {fmtCHF(proj.projected)}</strong>
                    {' · Rente '}
                    <strong style={{ color: 'var(--navy-800)' }}>CHF {fmtCHF(proj.pension.monthly)}/Mt.</strong>
                    {proj.fromTable && <span style={{ marginLeft: 6, fontSize: 11, color: '#059669', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 4, padding: '1px 6px' }}>Aus Leistungstabelle</span>}
                  </div>
                  {cur.pkCurrentCapital > 0 && (
                    <button
                      onClick={() => setPkDetailsExpanded(!pkDetailsExpanded)}
                      style={{ fontSize: 12, color: 'var(--navy-600)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ transform: pkDetailsExpanded ? 'rotate(180deg)' : 'none' }}><path d="M2 3l3 4 3-4"/></svg>
                      Details
                    </button>
                  )}
                </div>
                {pkDetailsExpanded && cur.pkCurrentCapital > 0 && (
                  <div style={{ marginTop: 6, padding: '10px 14px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 8, fontSize: 12, color: 'var(--ink-700)', lineHeight: 1.8 }}>
                    {proj.fromTable ? (
                      <>
                        <div style={{ color: 'var(--ink-500)', marginBottom: 4 }}>Gemäss Leistungstabelle (Alter {proj.retireAge})</div>
                        <div>Heutiges Guthaben: CHF {fmtCHF(cur.pkCurrentCapital)}</div>
                        <div style={{ borderTop: '1px solid var(--navy-200)', marginTop: 6, paddingTop: 6, fontWeight: 600 }}>
                          = Guthaben bei {proj.retireAge}: CHF {fmtCHF(proj.projected)}
                        </div>
                        <div>× Umwandlungssatz {proj.uwsForAge.toFixed(2)}%</div>
                        <div style={{ fontWeight: 600 }}>= CHF {fmtCHF(proj.pension.monthly)}/Monat Rente</div>
                      </>
                    ) : (
                      <>
                        <div>Heutiges Guthaben: CHF {fmtCHF(cur.pkCurrentCapital)}</div>
                        <div>+ Beiträge ({proj.yearsToRetirement} Jahre × CHF {fmtCHF(proj.effectiveContrib)}): CHF {fmtCHF(proj.effectiveContrib * proj.yearsToRetirement)}</div>
                        <div>+ Verzinsung (Ø {(cur.pkInterestRate * 100).toFixed(2)}%): CHF {fmtCHF(proj.projected - cur.pkCurrentCapital - proj.effectiveContrib * proj.yearsToRetirement)}</div>
                        <div style={{ borderTop: '1px solid var(--navy-200)', marginTop: 6, paddingTop: 6, fontWeight: 600 }}>
                          = Guthaben bei {proj.retireAge}: CHF {fmtCHF(proj.projected)}
                        </div>
                        <div>× Umwandlungssatz {cur.pkRate}%</div>
                        <div style={{ fontWeight: 600 }}>= CHF {fmtCHF(proj.pension.monthly)}/Monat Rente</div>
                      </>
                    )}
                  </div>
                )}

                {/* Validierungshinweise */}
                {cur.pkCurrentCapital > 0 && cur.pkCurrentCapital < 50000 && proj.currentAge > 50 && (
                  <div style={{ marginTop: 10, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12.5, color: '#92400e' }}>
                    ⚠ Das Guthaben liegt unter CHF 50'000 für Alter {proj.currentAge}. Bitte überprüfen Sie Ihre Eingabe – typisch für Ihr Alter: CHF 200'000–450'000.
                  </div>
                )}
                {cur.pkCurrentCapital > 0 && cur.pkCurrentCapital >= 50000 && cur.pkCurrentCapital < 100000 && proj.currentAge > 50 && (
                  <div style={{ marginTop: 10, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12.5, color: '#92400e' }}>
                    ℹ Das Guthaben liegt unter CHF 100'000 für Alter {proj.currentAge}. Mögliche Gründe: Teilzeitarbeit, späte Einwanderung, Scheidung oder ein früherer Kapitalbezug.
                  </div>
                )}
                {cur.pkCurrentCapital > 2_000_000 && (
                  <div style={{ marginTop: 10, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12.5, color: '#92400e' }}>
                    ⚠ PK-Guthaben über CHF 2 Mio. – bitte Eingabe prüfen. Ab CHF 1.08 Mio. (2026) kann eine überobligatorische Lösung mit tieferem UWS gelten.
                  </div>
                )}
                {cur.pkRate < 4 && cur.pkRate > 0 && (
                  <div style={{ marginTop: 10, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12.5, color: '#991b1b' }}>
                    ⚠ Ein Umwandlungssatz unter 4.0% ist sehr ungewöhnlich. Schweizer Durchschnitt: ca. 5.0–5.8%. Bitte prüfen Sie Ihre Angabe.
                  </div>
                )}
                {cur.pkRate > 6.8 && (
                  <div style={{ marginTop: 10, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12.5, color: '#991b1b' }}>
                    ⚠ Ein Umwandlungssatz über 6.8% liegt über dem BVG-Minimum. Bitte prüfen Sie Ihre Angabe.
                  </div>
                )}
                {cur.hasPK && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 8, fontSize: 11.5, color: 'var(--ink-500)' }}>
                    {(() => {
                      const age = (activeTab === 1 ? pkProj1 : pkProj2)?.currentAge ?? 55
                      const isFemale = (activeTab === 1 ? p1 : p2).sex === 'f'
                      const employGrade = (activeTab === 1 ? p1 : p2).employmentGrade ?? 100
                      const medianFull = isFemale
                        ? (age < 55 ? 260000 : age < 60 ? 320000 : 370000)
                        : (age < 55 ? 380000 : age < 60 ? 460000 : 520000)
                      const medianAdjusted = Math.round(medianFull * (employGrade / 100))
                      return `⌀ CH-Vergleich (BFS 2022): ${isFemale ? 'Frauen' : 'Männer'}, Alter ${age}, ${employGrade}% Pensum – Median ca. CHF ${fmtCHF(medianAdjusted)}`
                    })()}
                  </div>
                )}
              </>
            )
          })()}

          {!cur.hasPK && cur.employmentStatus !== 'selfEmployed' && (
            <div className="info-callout">
              <span className="info-callout-icon">i</span>
              <span>Ohne PK ist das 3a-Maximum höher (CHF 36'288/Jahr statt CHF 7'258). Sie können sich auch freiwillig bei der Auffangeinrichtung versichern.</span>
            </div>
          )}
          {!cur.hasPK && cur.employmentStatus === 'selfEmployed' && (() => {
            const age = (activeTab === 1 ? pkProj1 : pkProj2)?.currentAge ?? 50
            return (
              <div style={{ marginTop: 12, padding: '16px', background: '#f8fafc', border: '1px solid var(--ink-200)', borderRadius: 12 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 8 }}>Vorsorge ohne Pensionskasse</div>
                <p style={{ fontSize: 13, color: 'var(--ink-600)', margin: '0 0 12px', lineHeight: 1.6 }}>
                  Als Selbständige/r ohne PK fehlt Ihnen die 2. Säule. Das ist bei vielen Selbständigen der Fall. Ihre Altersvorsorge stützt sich auf AHV, Säule 3a und Ihr Vermögen.
                </p>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--navy-700)', marginBottom: 8 }}>Was können Sie tun?</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ padding: '10px 12px', background: '#eff6ff', border: '1px solid #bae6fd', borderRadius: 8, fontSize: 12.5, color: '#1e3a5f', lineHeight: 1.55 }}>
                    <strong>Freiwilliger Beitritt zur BVG-Auffangeinrichtung:</strong> Auch mit {age} Jahren noch möglich.{age >= 58 ? ' Hinweis: Ab ca. Alter 58–60 lohnt sich der Beitritt kaum noch.' : ' Vorteil: Steuern sparen + Rente aufbauen. Sinnvoll bis ca. Alter 58.'}
                  </div>
                  <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12.5, color: '#14532d', lineHeight: 1.55 }}>
                    <strong>Säule 3a maximieren:</strong> Ohne PK gilt das höhere Maximum (CHF 36'288/Jahr bzw. 20% des Nettoeinkommens). Prüfen Sie: Ist Ihr Nettoeinkommen hoch genug für den Maximalbetrag?
                  </div>
                  <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12.5, color: '#78350f', lineHeight: 1.55 }}>
                    <strong>Firmenwert als Alterskapital:</strong> Der Verkauf oder die Übergabe Ihres Betriebs kann einen wesentlichen Teil Ihrer Altersvorsorge bilden. Erfassen Sie den geschätzten Wert unten.
                  </div>
                </div>
              </div>
            )
          })()}
          </div>
          )}
        </section>

        {/* C · 3a */}
        <section className="block" style={{ overflow: 'hidden' }}>
          <div
            className="block-head"
            onClick={() => setActiveAccordion(prev => prev === '3a' ? '' : '3a')}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <h2 className="block-title"><span className="block-num">C</span>Säule 3a – Gebundene Vorsorge</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {activeAccordion !== '3a' && (
                <span style={{ fontSize: 12, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
                  {cur.has3a && cur.balance3a > 0
                    ? `✓ ${cur.num3aAccounts || 1} Konto · CHF ${fmtCHF(cur.balance3a)}`
                    : cur.has3a ? '✓ 3a aktiv · Guthaben nicht erfasst' : '— Kein 3a-Konto'}
                </span>
              )}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: activeAccordion === '3a' ? 'rotate(90deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>

          {activeAccordion === '3a' && (
          <div style={{ paddingBottom: 4 }}>

          {isPaar && (
            <div className="tabs" style={{ marginBottom: 20 }}>
              <button
                className={`tab ${activeTab === 1 ? 'active' : ''}`}
                onClick={() => setActiveTab(1)}
              >
                <span className="tab-dot">1</span><span>{person1.name || 'P1'}</span>
              </button>
              <button
                className={`tab ${activeTab === 2 ? 'active' : ''}`}
                onClick={() => setActiveTab(2)}
              >
                <span className="tab-dot">2</span><span>{person2.name || 'P2'}</span>
              </button>
            </div>
          )}

          <div className="toggle-row">
            <Switch
              on={cur.has3a}
              onToggle={() => updatePerson(activeTab, { has3a: !cur.has3a })}
              label="Ich habe ein 3a-Konto"
            />
          </div>

          {cur.has3a && (
            <>
              <div className="form-grid">
                <CHFField
                  label="Aktuelles 3a-Guthaben (Total)"
                  value={cur.balance3a}
                  onChange={(v) => { if (v > 0) setPillar3aTouched(true); updatePerson(activeTab, { balance3a: v }) }}
                />
                <CHFField
                  label="Jährliche Einzahlung"
                  value={cur.yearly3a}
                  onChange={(v) => updatePerson(activeTab, { yearly3a: v })}
                  max={cur.hasPK ? CONSTANTS.PK_3A_MAX_WITH_PK : CONSTANTS.PK_3A_MAX_WITHOUT_PK}
                />
              </div>

              <div className="form-grid" style={{ marginTop: 10 }}>
                <div className="field-wrap">
                  <label className="field-label">Anzahl 3a-Konten</label>
                  <select
                    className="select-field"
                    value={cur.num3aAccounts || 1}
                    onChange={(e) => updatePerson(activeTab, { num3aAccounts: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'Konto' : 'Konten'}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(cur.num3aAccounts || 1) > 1 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-700)', marginBottom: 8 }}>
                    Einzelne Kontostände (optional, für optimale Bezugsplanung)
                  </div>
                  {Array.from({ length: cur.num3aAccounts || 1 }, (_, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-600)', minWidth: 60 }}>Konto {i + 1}</span>
                      <input
                        type="number"
                        className="input"
                        style={{ flex: 1 }}
                        min={0}
                        step={1000}
                        placeholder={`CHF ${fmtCHF(Math.round((cur.balance3a || 0) / (cur.num3aAccounts || 1)))}`}
                        value={(cur.accounts3a?.[i] || 0) > 0 ? cur.accounts3a![i] : ''}
                        onChange={e => {
                          const newAccounts = Array.from({ length: cur.num3aAccounts || 1 }, (_, j) =>
                            j === i ? (parseInt(e.target.value) || 0) : (cur.accounts3a?.[j] || 0)
                          )
                          updatePerson(activeTab, { accounts3a: newAccounts })
                        }}
                      />
                    </div>
                  ))}
                  {(cur.accounts3a?.reduce((s, v) => s + v, 0) || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--navy-50)', borderRadius: 6, fontSize: 12.5, fontWeight: 600, marginTop: 4 }}>
                      <span>Total:</span>
                      <span>CHF {fmtCHF(cur.accounts3a?.reduce((s, v) => s + v, 0) || 0)}</span>
                    </div>
                  )}
                  <div style={{ marginTop: 8, padding: '8px 12px', background: '#eff6ff', border: '1px solid #bae6fd', borderRadius: 8, fontSize: 12, color: '#1e3a5f' }}>
                    Für optimale Staffelung: Grössere Konten sollten in einem Jahr ohne anderen Kapitalbezug (PK) bezogen werden. Jeder Bezug wird separat besteuert.
                  </div>
                </div>
              )}

              <div className="form-grid" style={{ marginTop: 10 }}>
                <div className="field-wrap">
                  <label className="field-label">Kontotyp / Anlageform</label>
                  <select
                    className="select-field"
                    value={cur.form3a || 'sparkonto'}
                    onChange={(e) => updatePerson(activeTab, { form3a: e.target.value as import('../store').Form3a })}
                  >
                    <option value="sparkonto">Sparkonto (ca. 0.75% p.a.)</option>
                    <option value="wertschriften_konservativ">Wertschriften konservativ (ca. 2.5% p.a.)</option>
                    <option value="wertschriften_ausgewogen">Wertschriften ausgewogen (ca. 4.0% p.a.)</option>
                    <option value="wertschriften_aggressiv">Wertschriften aggressiv (ca. 5.0% p.a.)</option>
                  </select>
                </div>
              </div>

              {(cur.balance3a > 0 || cur.yearly3a > 0) && (
                <div className="proj-card" style={{ marginTop: 14 }}>
                  <div className="proj-card-label">
                    📈 Geschätztes 3a-Guthaben bei Pensionierung
                    ({activeTab === 1 ? years1 : years2} Jahre,{' '}
                    {cur.form3a === 'wertschriften_konservativ' ? '2.5' : cur.form3a === 'wertschriften_ausgewogen' ? '4.0' : cur.form3a === 'wertschriften_aggressiv' ? '5.0' : '0.75'}% p.a.)
                  </div>
                  <div className="proj-card-val">
                    CHF {fmtCHF(activeTab === 1 ? proj3a1 : proj3a2)}
                  </div>
                </div>
              )}

              {cur.balance3a > 250_000 && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12.5, color: '#92400e' }}>
                  ⚠ 3a-Guthaben über CHF 250'000 – bitte Angabe prüfen. Ab CHF 7'258/Jahr (2026) dauert es über 30 Jahre, um diesen Betrag anzusparen.
                </div>
              )}
              {cur.employmentStatus === 'selfEmployed' && !cur.hasPK && cur.yearly3a > 0 && (() => {
                const maxAllowed = Math.min(Math.round(cur.income * 0.20), 36288)
                if (cur.yearly3a <= maxAllowed) return null
                return (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12.5, color: '#991b1b' }}>
                    ⚠ <strong>Achtung 20%-Regel:</strong> Bei Ihrem Nettoeinkommen von ca. CHF {fmtCHF(cur.income)} beträgt Ihr 3a-Maximum CHF {fmtCHF(maxAllowed)}/Jahr (20% des Nettoeinkommens). Sie zahlen möglicherweise mehr ein als steuerlich erlaubt. Klären Sie dies mit Ihrer Steuerbehörde.
                  </div>
                )
              })()}
              <div className="info-callout" style={{ marginTop: 12 }}>
                <span className="info-callout-icon">i</span>
                <span>Empfehlung: Mit 3–5 separaten 3a-Konten können Sie den Bezug über mehrere Jahre staffeln und die Kapitalbezugssteuer deutlich reduzieren.</span>
              </div>
            </>
          )}
          </div>
          )}
        </section>

        {/* FZ · Freizügigkeitsguthaben */}
        <section className="block" style={{ overflow: 'hidden' }}>
          <div
            className="block-head"
            onClick={() => setActiveAccordion(prev => prev === 'fz' ? '' : 'fz')}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <h2 className="block-title"><span className="block-num">FZ</span>Freizügigkeitsguthaben</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {activeAccordion !== 'fz' && (
                <span style={{ fontSize: 12, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
                  {cur.hasFZ && cur.fzBalance > 0
                    ? `✓ CHF ${fmtCHF(cur.fzBalance)}`
                    : '— Kein Freizügigkeitsguthaben'}
                </span>
              )}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: activeAccordion === 'fz' ? 'rotate(90deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>

          {activeAccordion === 'fz' && (
          <div style={{ paddingBottom: 4 }}>

          {isPaar && (
            <div className="tabs" style={{ marginBottom: 20 }}>
              <button
                className={`tab ${activeTab === 1 ? 'active' : ''}`}
                onClick={() => setActiveTab(1)}
              >
                <span className="tab-dot">1</span><span>{person1.name || 'P1'}</span>
              </button>
              <button
                className={`tab ${activeTab === 2 ? 'active' : ''}`}
                onClick={() => setActiveTab(2)}
              >
                <span className="tab-dot">2</span><span>{person2.name || 'P2'}</span>
              </button>
            </div>
          )}

          <div className="toggle-row">
            <Switch on={cur.hasFZ} onToggle={() => updatePerson(activeTab, { hasFZ: !cur.hasFZ })} label="Ich habe ein Freizügigkeitskonto" />
          </div>

          {cur.hasFZ && (() => {
            const pBase = activeTab === 1 ? person1 : person2
            const currentYear = new Date().getFullYear()
            const currentAge = pBase.dob
              ? currentYear - (parseInt(pBase.dob.split('.').pop() || '0') || parseInt(pBase.dob.split('-')[0]) || 0)
              : 45
            const yearsToRet = Math.max(0, (pBase.retireAge || 65) - currentAge)
            const fzRates: Record<string, number> = { sparkonto: 0.0075, wertschriften_konservativ: 0.025, wertschriften_ausgewogen: 0.035, wertschriften_aggressiv: 0.05 }
            const fzType = cur.fzInvestmentType || 'sparkonto'
            const fzRate = fzRates[fzType]
            const projectedFz = cur.fzBalance > 0 && yearsToRet > 0
              ? Math.round(cur.fzBalance * Math.pow(1 + fzRate, yearsToRet))
              : cur.fzBalance
            return (
              <>
                <CHFField label="Freizügigkeitsguthaben" value={cur.fzBalance} onChange={v => updatePerson(activeTab, { fzBalance: v })} />
                <div style={{ marginBottom: 16, marginTop: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)', display: 'block', marginBottom: 6 }}>
                    Anlageform
                  </label>
                  <select
                    className="input"
                    value={fzType}
                    onChange={e => updatePerson(activeTab, { fzInvestmentType: e.target.value as typeof cur.fzInvestmentType })}
                    style={{ fontSize: 13 }}
                  >
                    <option value="sparkonto">Freizügigkeitskonto (ca. 0.75% p.a.)</option>
                    <option value="wertschriften_konservativ">Wertschriften konservativ, 25% Aktien (ca. 2.5% p.a.)</option>
                    <option value="wertschriften_ausgewogen">Wertschriften ausgewogen, 50% Aktien (ca. 3.5% p.a.)</option>
                    <option value="wertschriften_aggressiv">Wertschriften aggressiv, 80%+ Aktien (ca. 5.0% p.a.)</option>
                  </select>
                  {cur.fzBalance > 0 && yearsToRet > 0 && (
                    <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 4 }}>
                      Bei Pension in {yearsToRet} {yearsToRet === 1 ? 'Jahr' : 'Jahren'} ({(fzRate * 100).toFixed(2)}% p.a.): ca. <strong>CHF {fmtCHF(projectedFz)}</strong>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
          </div>
          )}
        </section>

        {/* D · Vermögen */}
        <section className="block" style={{ overflow: 'hidden' }}>
          <div
            className="block-head"
            onClick={() => setActiveAccordion(prev => prev === 'vermoegen' ? '' : 'vermoegen')}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <h2 className="block-title"><span className="block-num">D</span>Freies Vermögen</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {activeAccordion !== 'vermoegen' && (
                <span style={{ fontSize: 12, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
                  {(useStore.getState().sparkonto + useStore.getState().wertschriften) > 0
                    ? `CHF ${fmtCHF(useStore.getState().sparkonto + useStore.getState().wertschriften)} total`
                    : '— CHF 0'}
                </span>
              )}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: activeAccordion === 'vermoegen' ? 'rotate(90deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>

          {activeAccordion === 'vermoegen' && (
          <div style={{ paddingBottom: 4 }}>
          <CHFField
            label="Sparkonto / Bargeld"
            value={useStore.getState().sparkonto}
            onChange={(v) => { if (v > 0) setWealthTouched(true); useStore.getState().setSparkonto(v) }}
          />
          <CHFField
            label="Wertschriften / Anlagen"
            value={useStore.getState().wertschriften}
            onChange={(v) => { if (v > 0) setWealthTouched(true); useStore.getState().setWertschriften(v) }}
          />
          {useStore.getState().wertschriften > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)', display: 'block', marginBottom: 6 }}>
                Anlagestrategie Wertschriften
              </label>
              <select
                className="input"
                value={wealthInvestmentProfile}
                onChange={e => setWealthInvestmentProfile(e.target.value as typeof wealthInvestmentProfile)}
                style={{ fontSize: 13 }}
              >
                <option value="conservative">Konservativ, 30% Aktien (ca. 2.5% p.a.)</option>
                <option value="balanced">Ausgewogen, 50% Aktien (ca. 3.5% p.a.)</option>
                <option value="growth">Wachstum, 75% Aktien (ca. 5.0% p.a.)</option>
                <option value="aggressive">Aggressiv, 90%+ Aktien (ca. 6.0% p.a.)</option>
              </select>
            </div>
          )}
          {(useStore.getState().sparkonto + useStore.getState().wertschriften) > 0 && (
            <div style={{ marginTop: 4, padding: '10px 14px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 8, fontSize: 12.5, color: 'var(--ink-600)' }}>
              Freies Vermögen total: <strong>CHF {fmtCHF(useStore.getState().sparkonto + useStore.getState().wertschriften)}</strong>
            </div>
          )}

          {/* Krypto optional */}
          <details style={{ marginTop: 10 }}>
            <summary style={{ fontSize: 12, color: 'var(--navy-600)', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 4 3-4"/></svg>
              Kryptowährungen separat erfassen (optional)
            </summary>
            <div style={{ marginTop: 8 }}>
              <CHFField
                label="Kryptowährungen (Marktwert in CHF)"
                value={useStore.getState().cryptoAssets ?? 0}
                onChange={v => useStore.getState().setCryptoAssets(v)}
              />
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-500)', lineHeight: 1.5 }}>
                Kryptowährungen unterliegen in der Schweiz der Vermögenssteuer. Kursgewinne im Privatvermögen sind steuerfrei (sofern kein gewerbsmässiger Handel). Im pessimistischen Szenario wird eine höhere Volatilität berücksichtigt.
              </div>
            </div>
          </details>
          </div>
          )}
        </section>

        {/* E1 · Firmenwert (nur für Selbständige) */}
        {(() => {
          const curSE = persons.find(p => p.id === activeTab)
          if (curSE?.employmentStatus !== 'selfEmployed') return null
          return (
            <section className="block">
              <div className="block-head">
                <h2 className="block-title"><span className="block-num" style={{ background: 'var(--ink-600)' }}>SE</span>Unternehmenswert</h2>
                <span className="block-hint">Optional</span>
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--ink-600)', margin: '0 0 16px', lineHeight: 1.6 }}>
                Der Verkauf Ihres Unternehmens kann Ihr wichtigstes Alterskapital sein. Geben Sie den geschätzten Nettoerlös nach Steuern an.
              </p>
              <div className="form-grid">
                <CHFField
                  label="Geschätzter Nettoerlös (nach Steuern)"
                  value={curSE.businessValue ?? 0}
                  onChange={(v) => updatePerson(activeTab, { businessValue: v })}
                />
                <div className="field-wrap">
                  <label className="field-label">Geplantes Verkaufsjahr</label>
                  <input
                    type="number"
                    className="input"
                    min={new Date().getFullYear()}
                    max={new Date().getFullYear() + 30}
                    value={curSE.businessSaleYear ?? (new Date().getFullYear() + 8)}
                    onChange={e => updatePerson(activeTab, { businessSaleYear: parseInt(e.target.value) || (new Date().getFullYear() + 8) })}
                  />
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#78350f' }}>
                  Der Nettoerlös nach Steuern ist entscheidend (Liquidationsgewinnsteuer beachten). Lassen Sie den Wert durch einen Treuhänder oder KMU-Berater schätzen.
                </div>
                {(curSE.businessValue ?? 0) === 0 && (
                  <div style={{ fontSize: 11.5, color: 'var(--ink-400)' }}>Falls Sie keinen Verkauf planen, lassen Sie das Feld leer.</div>
                )}
              </div>
            </section>
          )
        })()}

        {/* E · Wohneigentum */}
        {(() => {
          const prop = useStore.getState().property
          const setProperty = useStore.getState().setProperty
          return (
            <section className="block" style={{ overflow: 'hidden' }}>
              <div
                className="block-head"
                onClick={() => setActiveAccordion(prev => prev === 'wohneigentum' ? '' : 'wohneigentum')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <h2 className="block-title"><span className="block-num">E</span>Wohneigentum</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {activeAccordion !== 'wohneigentum' && (
                    <span style={{ fontSize: 12, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>
                      {prop.has ? `✓ Eigentümer · CHF ${fmtCHF(prop.value)}` : '— Miete'}
                    </span>
                  )}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ transform: activeAccordion === 'wohneigentum' ? 'rotate(90deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </div>

              {activeAccordion === 'wohneigentum' && (
              <div style={{ paddingBottom: 4 }}>
              <p style={{ fontSize: 13.5, color: 'var(--ink-600)', margin: '0 0 16px', lineHeight: 1.6 }}>
                Falls Sie selbst genutztes Wohneigentum besitzen, erfassen Sie es hier. Dies beeinflusst den Eigenmietwert (fiktives steuerbares Einkommen) und die Schuldzinsabzüge.
              </p>

              <div className="toggle-row">
                <Switch
                  on={prop.has}
                  onToggle={() => setProperty({ has: !prop.has })}
                  label="Ich besitze selbst genutztes Wohneigentum"
                />
              </div>

              {!prop.has && (
                <div style={{ marginTop: 14 }}>
                  <CHFField
                    label="Monatliche Miete (optional)"
                    value={prop.rentMonthly ?? 0}
                    onChange={(v) => setProperty({ rentMonthly: v })}
                  />
                  <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 8, fontSize: 12, color: 'var(--ink-500)', lineHeight: 1.5 }}>
                    Als Mieterin / Mieter entfällt der Eigenmietwert. Sie haben keine Hypothekarschulden und volle Flexibilität beim Wohnort im Alter.
                  </div>
                </div>
              )}

              {prop.has && (
                <>
                  <div className="form-grid" style={{ marginTop: 14 }}>
                    <CHFField
                      label="Marktwert der Liegenschaft"
                      value={prop.value}
                      onChange={(v) => setProperty({ value: v, steuerwert: prop.steuerwert || Math.round(v * 0.7) })}
                    />
                    <CHFField
                      label="Ausstehende Hypothek"
                      value={prop.mortgage}
                      onChange={(v) => setProperty({ mortgage: v })}
                    />
                  </div>
                  <div className="form-grid" style={{ marginTop: 10 }}>
                    <CHFField
                      label="Steuerwert der Liegenschaft"
                      value={prop.steuerwert || Math.round(prop.value * 0.7)}
                      onChange={(v) => setProperty({ steuerwert: v })}
                    />
                    <div className="field-wrap">
                      <label className="field-label">Hypothekarzinssatz (%)</label>
                      <input
                        className="input"
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={prop.hypothekZinssatz ?? 1.5}
                        onChange={e => setProperty({ hypothekZinssatz: parseFloat(e.target.value) || 1.5 })}
                        style={{ maxWidth: 120 }}
                      />
                    </div>
                  </div>
                  <div className="info-callout" style={{ marginTop: 12 }}>
                    <span className="info-callout-icon">i</span>
                    <span>Steuerwert: Finden Sie auf Ihrer letzten Steuererklärung. Ist meist ca. 70% des Marktwerts. Lassen Sie das Feld leer für automatische Schätzung.</span>
                  </div>
                </>
              )}
              </div>
              )}
            </section>
          )
        })()}

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-400)', textAlign: 'center', paddingTop: 24, paddingBottom: 4 }}>
          <Link to="/impressum" style={{ color: 'var(--ink-400)' }}>Impressum</Link>
          {' · '}
          <Link to="/datenschutz" style={{ color: 'var(--ink-400)' }}>Datenschutz</Link>
          {' · '}© 2026 WealthWise
        </div>

        </>}
      </main>

      <div className="footer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div className="footer-meta">{subStep === 0 ? 'Schritt 2a von 4 · AHV' : 'Schritt 2b von 4 · Pensionskasse & Vermögen'}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>Ihre Eingaben bleiben gespeichert</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => subStep === 0 ? navigate('/schritt/1') : setSubStep(0)}>← Zurück</button>
          <button className="btn btn-primary" onClick={() => {
            if (subStep === 0) { setAhvTouched(true); setSubStep(1) }
            else setShowTransition(true)
          }}>
            {subStep === 0 ? 'Weiter zu PK & Vermögen' : 'Weiter'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/>
            </svg>
          </button>
        </div>
      </div>

      <ChatPanel currentStep="vorsorge" />
    </div>
  )
}

function calcAge(dob: string): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (isNaN(d.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
  return age < 0 ? null : age
}
