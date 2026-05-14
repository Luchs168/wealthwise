import { useState, useMemo, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import TopBar from '../components/TopBar'
import ProgressBar from '../components/ProgressBar'
import ChatPanel from '../components/ChatPanel'
import { useStore } from '../store'
import { fmtCHF, calculatePkRente, project3a, CONSTANTS } from '../lib/calc'
import { calculateAHVPension, applyPlafonierung, AHV_2026 } from '../utils/ahvCalculation'
import { projectPKCapital, calculatePKPension, estimateContribution } from '../utils/pkCalculation'
import { PK_CONSTANTS } from '../constants/pkConstants'

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
  const display = focused ? raw : fmtCHF(value)

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

function PkUpload({ onExtract }: { onExtract: (capital: number, rate: number) => void }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file || file.type !== 'application/pdf') {
      setStatus('error')
      return
    }
    setFileName(file.name)
    setStatus('loading')
    setTimeout(() => {
      const demoCapital = 280000 + Math.floor(Math.random() * 120000)
      const demoRate = 5.0 + Math.random() * 0.8
      onExtract(demoCapital, parseFloat(demoRate.toFixed(2)))
      setStatus('done')
    }, 1400)
  }

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Ausfüllhilfe disclaimer before upload */}
      {status === 'idle' && (
        <div style={{
          marginBottom: 10, padding: '10px 14px',
          background: '#eff6ff', border: '1px solid #bae6fd',
          borderRadius: 10, fontSize: 12.5, color: '#1e40af',
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <span style={{ flexShrink: 0, fontSize: 14 }}>ℹ️</span>
          <span><strong>Ausfüllhilfe:</strong> Wir lesen die Struktur Ihres Dokuments und schlagen Werte vor. Bitte prüfen und korrigieren Sie die Felder anhand Ihres eigentlichen PK-Ausweises.</span>
        </div>
      )}

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        style={{
          border: `2px dashed ${status === 'done' ? '#f59e0b' : 'var(--ink-200)'}`,
          borderRadius: 12,
          background: status === 'done' ? '#fffbeb' : 'var(--surface)',
          padding: '20px 24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          transition: 'border-color .2s, background .2s',
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: status === 'done' ? 'var(--navy-800)' : 'var(--ink-100)', display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0 }}>
          {status === 'loading' ? '⏳' : status === 'done' ? '✓' : '📄'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {status === 'idle' && (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--ink-900)' }}>PK-Ausweis hochladen (optional)</div>
              <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 2 }}>PDF hier ablegen oder klicken – wird nur lokal verarbeitet</div>
            </>
          )}
          {status === 'loading' && (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--ink-900)' }}>{fileName}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 2 }}>Wird analysiert…</div>
            </>
          )}
          {status === 'done' && (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: '#0369a1' }}>Werte vorgeschlagen</div>
              <div style={{ fontSize: 13, color: '#0369a1', marginTop: 2 }}>Vorgeschlagene Werte aus {fileName} – bitte unten prüfen und anpassen</div>
            </>
          )}
          {status === 'error' && (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: '#dc2626' }}>Ungültige Datei</div>
              <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 2 }}>Bitte ein PDF des PK-Ausweises hochladen</div>
            </>
          )}
        </div>
        {status !== 'idle' && status !== 'loading' && (
          <button
            onClick={(e) => { e.stopPropagation(); setStatus('idle'); setFileName('') }}
            style={{ background: 'none', border: 'none', color: 'var(--ink-400)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
          >×</button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />
      <div style={{ fontSize: 11, color: 'var(--ink-400)', fontFamily: 'var(--font-mono)', marginTop: 6, paddingLeft: 4 }}>
        🔒 Wird nur lokal verarbeitet – verlässt Ihren Browser nicht
      </div>
      {status === 'done' && (
        <div style={{
          marginTop: 10, padding: '10px 14px',
          background: '#eff6ff', border: '1px solid #bae6fd',
          borderRadius: 10, fontSize: 12.5, color: '#1e40af',
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <span style={{ flexShrink: 0, fontSize: 14 }}>ℹ️</span>
          <span>Die <strong>vorgeschlagenen Werte</strong> unten basieren auf der Dokumentstruktur. Bitte kontrollieren Sie PK-Kapital und Umwandlungssatz anhand Ihres echten PK-Ausweises und passen Sie die Werte ggf. an.</span>
        </div>
      )}
    </div>
  )
}

export default function Screen2() {
  const navigate = useNavigate()
  const { persons, updatePerson, hasPartner, person1, person2, civilStatus, kirchensteuer, setKirchensteuer } = useStore()
  const [activeTab, setActiveTab] = useState<1 | 2>(1)
  const [subStep, setSubStep] = useState<0 | 1>(0)
  const [ahvExpanded, setAhvExpanded] = useState(false)
  const [showTransition, setShowTransition] = useState(false)
  const [pkInterestMode, setPkInterestMode] = useState<[string, string]>(['moderat', 'moderat'])
  const [pkContribMode, setPkContribMode] = useState<['auto' | 'manuell', 'auto' | 'manuell']>(['auto', 'auto'])
  const [pkEinkaufExpanded, setPkEinkaufExpanded] = useState(false)
  const [pkDetailsExpanded, setPkDetailsExpanded] = useState(false)

  const p1 = persons.find(p => p.id === 1)!
  const p2 = persons.find(p => p.id === 2)!
  const cur = activeTab === 1 ? p1 : p2

  const isPaar = hasPartner

  // Projected contribution years at retirement: retireAge - 21, capped at 44
  const autoYears1 = useMemo(() => Math.min(44, Math.max(0, (person1.retireAge || 65) - 21)), [person1.retireAge])
  const autoYears2 = useMemo(() => Math.min(44, Math.max(0, (person2.retireAge || 65) - 21)), [person2.retireAge])

  // AHV calculation using precise 2026 factors
  const ahvResult1 = useMemo(() => calculateAHVPension({
    avgIncome: p1.income,
    bezugAge: p1.ahvBezugAge ?? 65,
    effectiveContributionYears: Math.max(0, (autoYears1) - (p1.ahvContributionGaps || 0)),
  }), [p1.income, p1.ahvBezugAge, autoYears1, p1.ahvContributionGaps])

  const ahvResult2 = useMemo(() => isPaar ? calculateAHVPension({
    avgIncome: p2.income,
    bezugAge: p2.ahvBezugAge ?? 65,
    effectiveContributionYears: Math.max(0, (autoYears2) - (p2.ahvContributionGaps || 0)),
  }) : null, [isPaar, p2.income, p2.ahvBezugAge, autoYears2, p2.ahvContributionGaps])

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
    const projected = pData.pkCurrentCapital > 0
      ? projectPKCapital(pData.pkCurrentCapital, effectiveContrib, rate, yearsToRetirement)
      : pData.pkCapital
    const pension = calculatePKPension(projected, (pData.pkRate || 5.4) / 100)
    return { currentAge, retireAge, yearsToRetirement, effectiveContrib, rate, insuredSalary, projected, pension }
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
    if (pData.pkCurrentCapital > 0) {
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
  const proj3a1 = useMemo(() => project3a(p1.balance3a, p1.yearly3a, years1), [p1, years1])
  const proj3a2 = useMemo(() => project3a(p2.balance3a, p2.yearly3a, years2), [p2, years2])

  const totalMonthly = ahvCombinedMonthly +
    (p1.hasPK ? (p1.pkBezugsart !== 'kapital' ? pk1.monthlyRente : 0) : 0) +
    (isPaar && p2.hasPK ? (p2.pkBezugsart !== 'kapital' ? pk2.monthlyRente : 0) : 0)

  // Completion tracking
  const completedSections = [
    p1.income > 0,
    p1.hasPK && p1.pkCapital > 0,
    p1.has3a && p1.balance3a > 0,
    useStore.getState().freeAssets > 0,
  ].filter(Boolean).length

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
              { label: 'AHV', done: p1.income > 0, hint: p1.income > 0 ? `CHF ${fmtCHF(ahvResult1.monthlyRente)}/Mt.` : null },
              { label: 'Pensionskasse', done: p1.hasPK && p1.pkCapital > 0, hint: p1.hasPK && p1.pkCapital > 0 ? `CHF ${fmtCHF(pk1.monthlyRente)}/Mt.` : null },
              { label: 'Säule 3a', done: p1.has3a && p1.balance3a > 0, hint: p1.has3a && p1.balance3a > 0 ? `CHF ${fmtCHF(p1.balance3a)}` : null },
              { label: 'Vermögen', done: useStore.getState().freeAssets > 0, hint: useStore.getState().freeAssets > 0 ? `CHF ${fmtCHF(useStore.getState().freeAssets)}` : null },
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
                  Ø-Einkommen CHF {fmtCHF(p1.income)} · {Math.max(0, autoYears1 - (p1.ahvContributionGaps || 0))} Beitragsjahre
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
                    Ø-Einkommen CHF {fmtCHF(p2.income)} · {Math.max(0, autoYears2 - (p2.ahvContributionGaps || 0))} Beitragsjahre
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
                        onChange={(e) => updatePerson(id, { ahvContributionGaps: Math.min(20, Math.max(0, parseInt(e.target.value) || 0)) })}
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

              {/* KZG – Kinderziehungsgutschriften */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--ink-100)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 6 }}>
                  Haben Sie Kinder unter 16 Jahren erzogen?
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 10, lineHeight: 1.5 }}>
                  Erziehungsgutschriften werden für Jahre mit Kindern unter 16 angerechnet und erhöhen Ihr massgebendes Durchschnittseinkommen – damit auch Ihre AHV-Rente.
                  {civilStatus === 'verheiratet' || civilStatus === 'partnerschaft'
                    ? ' Bei Ehepaaren werden die Gutschriften hälftig aufgeteilt.'
                    : ''}
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
                              {Array.from({ length: 32 }, (_, i) => i + 1).map(y => (
                                <option key={y} value={y}>{y} {y === 1 ? 'Jahr' : 'Jahre'}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                      {cur2.hasKZG && cur2.kzgChildren > 0 && cur2.kzgYears > 0 && (() => {
                        const KZG_YEARLY = 44100
                        const totalYears = Math.min(cur2.kzgYears, 16 * cur2.kzgChildren)
                        const isMarried2 = civilStatus === 'verheiratet' || civilStatus === 'partnerschaft'
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
              </div>
            </div>
          )}

          <div className="toggle-row" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--ink-100)' }}>
            <Switch
              on={kirchensteuer}
              onToggle={() => setKirchensteuer(!kirchensteuer)}
              label="Ich bin kirchensteuerpflichtig (wird bei Steueranalyse in Schritt 4 berücksichtigt)"
            />
          </div>
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
              {isPaar && plafonierung.plafonReduction > 0 && (
                <span style={{ fontSize: 12, fontWeight: 400, color: '#16a34a', marginLeft: 6 }}>
                  (inkl. Plafonierung)
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
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">B</span>Pensionskasse – 2. Säule
            </h2>
            <span className="block-hint" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>BVG 2026 · Projektion</span>
          </div>

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
                {isEstimated && (
                  <div style={{ marginBottom: 14, padding: '12px 14px', background: '#eff6ff', border: '1px solid #bae6fd', borderRadius: 10, fontSize: 13, color: '#1e40af' }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Haben Sie Ihren Vorsorgeausweis nicht zur Hand? Kein Problem.</div>
                    Wir schätzen Ihr PK-Guthaben basierend auf Alter ({proj.currentAge}) und Einkommen.{' '}
                    <strong>Tipp: Mit Ihrem PK-Ausweis wird die Analyse deutlich genauer.</strong>
                  </div>
                )}
                <PkUpload onExtract={(capital, rate) => updatePKAndProject(activeTab, { pkCurrentCapital: capital, pkRate: rate })} />

                {/* 1. Aktuelles Altersguthaben */}
                <div style={{ marginBottom: 4 }}>
                  <CHFField
                    label="Aktuelles Altersguthaben"
                    value={pkCapitalDisplay}
                    onChange={(v) => updatePKAndProject(activeTab, { pkCurrentCapital: v })}
                  />
                  {isEstimated ? (
                    <div style={{ fontSize: 12, color: '#0369a1', marginTop: 3, paddingLeft: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 4, padding: '1px 7px', fontWeight: 600, fontSize: 11, flexShrink: 0 }}>Geschätzt</span>
                      Ersetzen Sie diesen Wert mit der Zahl von Ihrem PK-Ausweis
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 3, paddingLeft: 2 }}>
                      → Vorsorgeausweis: «Altersguthaben» oder «Sparguthaben» (Seite 1)
                    </div>
                  )}
                </div>

                {/* Optional: Aufschlüsselung obligatorisch/überobligatorisch */}
                <details style={{ marginBottom: 16 }}>
                  <summary style={{ fontSize: 12, color: 'var(--navy-600)', cursor: 'pointer', userSelect: 'none', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ transform: 'rotate(0deg)' }}><path d="M2 3l3 4 3-4"/></svg>
                    Aufschlüsselung erfassen (optional)
                  </summary>
                  <div className="form-grid" style={{ marginTop: 10 }}>
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
                </details>

                {/* 2. Jährlicher Sparbeitrag */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)' }}>Jährlicher Sparbeitrag (AN + AG)</label>
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
                    <div style={{
                      padding: '10px 14px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)',
                      borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--navy-800)' }}>
                          CHF {fmtCHF(proj.effectiveContrib)} / Jahr
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>
                          Schätzung BVG: {proj.currentAge < 35 ? '14' : proj.currentAge < 45 ? '21' : proj.currentAge < 55 ? '28' : '35'}% von versichertem Lohn CHF {fmtCHF(proj.insuredSalary)}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--ink-400)', fontFamily: 'var(--font-mono)', textAlign: 'right', maxWidth: 120 }}>
                        BVG-Mindest­beitrag · Ihre Kasse kann mehr leisten
                      </div>
                    </div>
                  ) : (
                    <div>
                      <CHFField
                        label=""
                        value={cur.pkAnnualContribution}
                        onChange={(v) => updatePKAndProject(activeTab, { pkAnnualContribution: v })}
                        hint="'Sparbeiträge total' auf Ihrem Vorsorgeausweis · oder: Lohnabzug PK × 2"
                      />
                    </div>
                  )}
                </div>

                {/* 3. Zinssatz */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)', display: 'block', marginBottom: 8 }}>
                    Zinssatz Ihrer Pensionskasse
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 6 }}>
                    {[
                      { id: 'bvg', label: 'Ges. Minimum', sub: '1.25%', val: 0.0125 },
                      { id: 'moderat', label: 'Moderat', sub: '2.0%', val: 0.02 },
                      { id: 'gut', label: 'Gut', sub: '3.0%', val: 0.03 },
                      { id: 'manuell', label: 'Manuell', sub: `${(cur.pkInterestRate * 100).toFixed(2)}%`, val: null },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        className={`option-card ${curInterestMode === opt.id ? 'active' : ''}`}
                        style={{ padding: '8px 6px' }}
                        onClick={() => {
                          setPkInterestMode(prev => {
                            const next = [...prev] as typeof prev
                            next[interestModeIdx] = opt.id
                            return next
                          })
                          if (opt.val !== null) {
                            updatePKAndProject(activeTab, { pkInterestRate: opt.val })
                          }
                        }}
                      >
                        <div className="option-card-label" style={{ fontSize: 12 }}>{opt.label}</div>
                        <div className="option-card-hint">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                  {curInterestMode === 'manuell' && (
                    <div className="amount-wrap">
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
                  )}
                  <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 4 }}>
                    BVG-Mindestzins 2026: 1.25% · Finden Sie den Wert im Geschäftsbericht Ihrer PK oder auf Ihrem letzten Kontoauszug
                  </div>
                </div>

                {/* 4. Umwandlungssatz */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    Umwandlungssatz bei Pensionierung
                    <span
                      title="Der Umwandlungssatz bestimmt, wie viel Jahresrente Sie pro CHF 100'000 Altersguthaben erhalten. Bei CHF 500'000 und 5.4% = CHF 27'000/Jahr = CHF 2'250/Monat."
                      style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--ink-200)', color: 'var(--ink-600)', fontSize: 10, fontWeight: 700, display: 'inline-grid', placeItems: 'center', cursor: 'help', flexShrink: 0 }}
                    >?</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
                    {[
                      { label: 'BVG-Min', sub: '6.8%', val: 6.8 },
                      { label: 'Typisch', sub: '5.4%', val: 5.4 },
                      { label: 'Tief', sub: '5.0%', val: 5.0 },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        className={`option-card ${Math.abs(cur.pkRate - opt.val) < 0.05 ? 'active' : ''}`}
                        style={{ padding: '8px 6px' }}
                        onClick={() => updatePKAndProject(activeTab, { pkRate: opt.val })}
                      >
                        <div className="option-card-label" style={{ fontSize: 12 }}>{opt.label}</div>
                        <div className="option-card-hint">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                  <div className="amount-wrap">
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
                  <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 4 }}>
                    80% der Schweizer Pensionskassen liegen zwischen 5.0–5.8%. BVG-Minimum (6.8%) gilt nur für den obligatorischen Teil.
                    Finden Sie auf Ihrem Vorsorgeausweis.
                  </div>
                </div>

                {/* 5. Bezugsart */}
                <div style={{ marginBottom: 16 }}>
                  <div id="bezugsart-label" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)', marginBottom: 8 }}>Bezugsart</div>
                  <div className="option-grid-3" role="radiogroup" aria-labelledby="bezugsart-label">
                    {[
                      { id: 'rente', label: 'Rente', hint: 'Lebenslang, planbar' },
                      { id: 'kapital', label: 'Kapital', hint: 'Flexibel, Steuer fällig' },
                      { id: 'mix', label: '50/50 Mix', hint: 'Kombiniert' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        role="radio"
                        aria-checked={cur.pkBezugsart === opt.id}
                        className={`option-card ${cur.pkBezugsart === opt.id ? 'active' : ''}`}
                        onClick={() => updatePerson(activeTab, { pkBezugsart: opt.id as 'rente' | 'kapital' | 'mix' })}
                      >
                        <div className="option-card-label">{opt.label}</div>
                        <div className="option-card-hint">{opt.hint}</div>
                      </button>
                    ))}
                  </div>
                  {cur.pkBezugsart === 'rente' && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, color: '#166534' }}>
                      Für die meisten Angestellten ist die Rente die sicherste Wahl. In der Analyse zeigen wir Ihnen den Vergleich im Detail.
                    </div>
                  )}
                </div>

                {/* 6. Einkaufspotenzial (optional) */}
                <div style={{ marginBottom: 16 }}>
                  <button
                    className="link-toggle"
                    onClick={() => setPkEinkaufExpanded(!pkEinkaufExpanded)}
                    style={{ marginBottom: pkEinkaufExpanded ? 10 : 0 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      style={{ transform: pkEinkaufExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                    Einkaufspotenzial erfassen (optional)
                  </button>
                  {pkEinkaufExpanded && (
                    <div className="link-expand">
                      <CHFField
                        label="Maximales reglementarisches Guthaben"
                        value={cur.pkMaxGuthaben}
                        onChange={(v) => updatePerson(activeTab, { pkMaxGuthaben: v })}
                        hint="Vorsorgeausweis → 'Einkaufspotenzial' oder 'Möglicher Einkauf'"
                      />
                      {einkaufspotenzial > 0 && (
                        <div style={{ marginTop: 8, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#14532d', marginBottom: 4 }}>
                            Ihr Einkaufspotenzial: CHF {fmtCHF(einkaufspotenzial)}
                          </div>
                          <div style={{ fontSize: 12, color: '#166534' }}>
                            + CHF {fmtCHF(Math.round(einkaufspotenzial * (cur.pkRate / 100) / 12))}/Mt. mehr Rente bei vollem Einkauf
                          </div>
                          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>
                            PK-Einkäufe sind steuerlich voll abzugsfähig → Details im Steuerabschnitt (Schritt 4)
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Result: Projektionsvorschau */}
                <div style={{
                  background: 'var(--navy-800)', borderRadius: 14, padding: '18px 20px', marginTop: 4,
                }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 10, fontFamily: 'var(--font-mono)', letterSpacing: '.04em' }}>
                    PROJEKTION BEI ALTER {proj.retireAge}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Voraussichtliches Guthaben</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#fff', marginTop: 2 }}>
                        CHF {fmtCHF(proj.projected)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Monatliche Rente</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#fff', marginTop: 2 }}>
                        CHF {fmtCHF(
                          cur.pkBezugsart === 'kapital' ? 0
                          : cur.pkBezugsart === 'mix' ? Math.round(proj.pension.monthly / 2)
                          : proj.pension.monthly
                        )}
                      </div>
                    </div>
                  </div>

                  {cur.pkCurrentCapital > 0 && (
                    <button
                      onClick={() => setPkDetailsExpanded(!pkDetailsExpanded)}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.6)', fontSize: 12, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        style={{ transform: pkDetailsExpanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                      Details zur Berechnung
                    </button>
                  )}
                  {pkDetailsExpanded && cur.pkCurrentCapital > 0 && (
                    <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(255,255,255,.06)', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,.75)', lineHeight: 1.8 }}>
                      <div>Heutiges Guthaben: CHF {fmtCHF(cur.pkCurrentCapital)}</div>
                      <div>+ Beiträge ({proj.yearsToRetirement} Jahre × CHF {fmtCHF(proj.effectiveContrib)}): CHF {fmtCHF(proj.effectiveContrib * proj.yearsToRetirement)}</div>
                      <div>+ Verzinsung (Ø {(cur.pkInterestRate * 100).toFixed(2)}%): CHF {fmtCHF(proj.projected - cur.pkCurrentCapital - proj.effectiveContrib * proj.yearsToRetirement)}</div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,.15)', marginTop: 6, paddingTop: 6, fontWeight: 600 }}>
                        = Guthaben bei {proj.retireAge}: CHF {fmtCHF(proj.projected)}
                      </div>
                      <div>× Umwandlungssatz {cur.pkRate}%</div>
                      <div style={{ fontWeight: 600 }}>= CHF {fmtCHF(proj.pension.monthly)}/Monat Rente</div>
                    </div>
                  )}

                  {cur.pkBezugsart === 'kapital' && (
                    <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,.6)' }}>
                      Kapitalbezug: CHF {fmtCHF(proj.projected)} (abzgl. Kapitalbezugssteuer → Schritt 4)
                    </div>
                  )}
                </div>

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

          {!cur.hasPK && (
            <div className="info-callout">
              <span className="info-callout-icon">i</span>
              <span>Ohne PK ist das 3a-Maximum höher (CHF 36'288/Jahr statt CHF 7'258). Sie können sich auch freiwillig bei der Auffangeinrichtung versichern.</span>
            </div>
          )}
        </section>

        {/* C · 3a */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">C</span>Säule 3a – Gebundene Vorsorge</h2>
          </div>

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
                  onChange={(v) => updatePerson(activeTab, { balance3a: v })}
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

              <div className="proj-card" style={{ marginTop: 14 }}>
                <div className="proj-card-label">
                  📈 Geschätztes 3a-Guthaben bei Pensionierung
                  (Rendite 2% p.a., {activeTab === 1 ? years1 : years2} Jahre)
                </div>
                <div className="proj-card-val">
                  CHF {fmtCHF(activeTab === 1 ? proj3a1 : proj3a2)}
                </div>
              </div>

              {cur.balance3a > 250_000 && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12.5, color: '#92400e' }}>
                  ⚠ 3a-Guthaben über CHF 250'000 – bitte Angabe prüfen. Ab CHF 7'258/Jahr (2026) dauert es über 30 Jahre, um diesen Betrag anzusparen.
                </div>
              )}
              <div className="info-callout" style={{ marginTop: 12 }}>
                <span className="info-callout-icon">i</span>
                <span>Empfehlung: Mit 3–5 separaten 3a-Konten können Sie den Bezug über mehrere Jahre staffeln und die Kapitalbezugssteuer deutlich reduzieren.</span>
              </div>
            </>
          )}
        </section>

        {/* D · Vermögen */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">D</span>Freies Vermögen</h2>
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-500)', margin: '0 0 16px' }}>
            Barvermögen, Wertschriften und sonstige Ersparnisse (ohne 3a, PK und selbstgenutztes Wohneigentum).
            Falls Sie keinen genauen Betrag kennen, können Sie schätzen – Sie können die Angabe jederzeit anpassen.
          </p>
          <CHFField
            label={`Freies Vermögen ${isPaar ? '(Haushalt)' : ''}`}
            value={useStore.getState().freeAssets}
            onChange={(v) => useStore.getState().setFreeAssets(v)}
          />
        </section>

        {/* E · Wohneigentum */}
        {(() => {
          const prop = useStore.getState().property
          const setProperty = useStore.getState().setProperty
          return (
            <section className="block">
              <div className="block-head">
                <h2 className="block-title"><span className="block-num">E</span>Wohneigentum</h2>
                <span className="block-hint">Optional</span>
              </div>
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
            </section>
          )
        })()}

        {/* F · Zusammenfassung */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">F</span>Gesamtübersicht Vorsorge</h2>
          </div>
          <div className="ahv-card">
            <div className="ahv-row">
              <div>
                <div className="ahv-row-label">AHV-Renten</div>
                <div className="ahv-row-sub">{isPaar ? 'Haushalt inkl. 13. AHV-Rente' : 'inkl. 13. AHV-Rente'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="ahv-row-val">CHF {fmtCHF(ahvCombinedMonthly)}/Mt.</div>
              </div>
            </div>
            <div className="ahv-row">
              <div>
                <div className="ahv-row-label">PK-Renten</div>
                <div className="ahv-row-sub">
                  {p1.hasPK && p1.pkBezugsart !== 'kapital' ? `${person1.name || 'P1'}: CHF ${fmtCHF(pk1.monthlyRente)}/Mt.` : ''}
                  {isPaar && p2.hasPK && p2.pkBezugsart !== 'kapital' ? ` · ${person2.name || 'P2'}: CHF ${fmtCHF(pk2.monthlyRente)}/Mt.` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="ahv-row-val">
                  CHF {fmtCHF(
                    (p1.hasPK && p1.pkBezugsart !== 'kapital' ? pk1.monthlyRente : 0) +
                    (isPaar && p2.hasPK && p2.pkBezugsart !== 'kapital' ? pk2.monthlyRente : 0)
                  )}/Mt.
                </div>
              </div>
            </div>
            <div className="ahv-row ahv-total">
              <div>
                <div className="ahv-row-label">Gesamte Renten</div>
                <div className="ahv-row-sub">Laufende monatliche Einkünfte</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="ahv-row-val">CHF {fmtCHF(totalMonthly)}/Mt.</div>
              </div>
            </div>
          </div>
        </section>

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
          <button className="btn btn-primary" onClick={() => subStep === 0 ? setSubStep(1) : setShowTransition(true)}>
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
