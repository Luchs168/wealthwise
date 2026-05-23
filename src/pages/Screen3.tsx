import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import TopBar from '../components/TopBar'
import ProgressBar from '../components/ProgressBar'
import ChatPanel from '../components/ChatPanel'
import { useStore } from '../store'
import { fmtCHF } from '../lib/calc'
import { CATEGORY_CONFIG, CATEGORIES_ORDERED } from '../types/lifeEvents'
import type { LifeEvent, LifeEventCategory, LifeEventArt } from '../types/lifeEvents'
import { calculatePKReductionFromWithdrawal, calculateMortgageAffordability, getEventImpactSummary } from '../utils/lifeEventCalculation'

const LOADING_STEPS = [
  'Vorsorgesituation wird analysiert...',
  'Szenarien werden berechnet...',
  'Handlungsempfehlungen werden ermittelt...',
  'Analyse abgeschlossen ✓',
]

function LoadingTransition({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (step < LOADING_STEPS.length - 1) {
      const t = setTimeout(() => setStep(s => s + 1), 700)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(onDone, 600)
      return () => clearTimeout(t)
    }
  }, [step])

  const pct = Math.round(((step + 1) / LOADING_STEPS.length) * 100)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#fff', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18, background: 'var(--navy-800)',
          display: 'grid', placeItems: 'center', margin: '0 auto 28px',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: '#fff',
        }}>W</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, color: 'var(--navy-900)', margin: '0 0 6px' }}>
          Finanzbedarf ermittelt
        </h2>
        <p style={{ fontSize: 14, color: 'var(--ink-500)', margin: '0 0 32px' }}>
          Ihre persönliche Analyse wird berechnet...
        </p>
        <div style={{ height: 6, background: 'var(--ink-100)', borderRadius: 6, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 6, background: 'var(--navy-700)', width: `${pct}%`, transition: 'width .6s ease' }} />
        </div>
        <div style={{ textAlign: 'left' }}>
          {LOADING_STEPS.map((msg, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', opacity: i <= step ? 1 : 0.3, transition: 'opacity .3s' }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: i < step ? '#dcfce7' : i === step ? 'var(--navy-100)' : 'var(--ink-100)',
                color: i < step ? '#16a34a' : i === step ? 'var(--navy-700)' : 'var(--ink-400)',
                fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center',
              }}>
                {i < step ? '✓' : i === step ? '…' : ''}
              </div>
              <span style={{ fontSize: 14, color: i <= step ? 'var(--ink-800)' : 'var(--ink-400)', fontWeight: i === step ? 500 : 400 }}>{msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const CATEGORIES = [
  { id: 'wohnen', label: 'Wohnen & Energie', icon: '🏠', bfsMonthly: 1476 },
  { id: 'gesundheit', label: 'Gesundheit & Krankenkasse', icon: '🏥', bfsMonthly: 698 },
  { id: 'nahrung', label: 'Nahrung & Restaurants', icon: '🍽️', bfsMonthly: 1080 },
  { id: 'mobilitaet', label: 'Mobilität', icon: '🚗', bfsMonthly: 650 },
  { id: 'freizeit', label: 'Freizeit & Ferien', icon: '✈️', bfsMonthly: 580 },
  { id: 'bekleidung', label: 'Bekleidung', icon: '👔', bfsMonthly: 180 },
  { id: 'kommunikation', label: 'Kommunikation', icon: '📱', bfsMonthly: 200 },
  { id: 'uebrige', label: 'Übriges', icon: '📦', bfsMonthly: 600 },
]

const PIE_COLORS = ['#1a2b4a', '#3b82f6', '#0ea5e9', '#7c3aed', '#059669', '#d97706', '#dc2626', '#64748b']

const BFS_RENTNER_EINZEL = 3381
const BFS_RENTNER_PAAR = 10300

const ADJUST_OPTIONS = [
  { id: 0.75, label: 'Deutlich weniger', hint: '−25%', color: '#16a34a' },
  { id: 0.9, label: 'Etwas weniger', hint: '−10%', color: '#0ea5e9' },
  { id: 1.0, label: 'Gleichbleibend', hint: 'Wie heute', color: 'var(--navy-800)' },
  { id: 1.1, label: 'Etwas mehr', hint: '+10%', color: '#d97706' },
  { id: 1.25, label: 'Mehr Komfort', hint: '+25%', color: '#dc2626' },
]

const KK_CANTON_DEFAULTS: Record<string, number> = {
  ZH: 650, BE: 580, LU: 520, BS: 620, GE: 780,
  AG: 560, SG: 540, VD: 700, BL: 600, SH: 560,
  TG: 550, SZ: 540, ZG: 560, NW: 530, OW: 530,
  GR: 560, TI: 640, VS: 580, FR: 600, SO: 570,
  NE: 630, JU: 590, UR: 530, GL: 560, AI: 530, AR: 570,
}

const RISK_PROFILES = [
  { id: 'conservative' as const, icon: '🛡️', title: 'Sicherheitsorientiert', sub: 'Sparkonto, Obligationen', return: '0.5–1.5%', color: '#16a34a', bg: '#f0fdf4' },
  { id: 'balanced' as const, icon: '⚖️', title: 'Ausgewogen', sub: 'Mix aus Aktien und Obligationen', return: '2–3.5%', color: 'var(--navy-700)', bg: 'var(--navy-50)' },
  { id: 'growth' as const, icon: '📈', title: 'Wachstumsorientiert', sub: 'Überwiegend Aktien', return: '3.5–5%', color: '#d97706', bg: '#fffbeb' },
]

const SUB_STEP_LABELS = ['Budget', 'Ruhestand', 'Ereignisse']

function parseNum(s: string | number): number {
  if (typeof s === 'number') return s
  return parseInt(String(s).replace(/[^0-9]/g, '')) || 0
}

function AmountInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [raw, setRaw] = useState('')
  const [focused, setFocused] = useState(false)
  return (
    <input
      className="cat-amount"
      type="text"
      inputMode="numeric"
      value={focused ? raw : fmtCHF(value)}
      onFocus={() => { setFocused(true); setRaw(value ? String(value) : '') }}
      onBlur={() => { setFocused(false); onChange(parseNum(raw)) }}
      onChange={(e) => setRaw(e.target.value.replace(/[^0-9]/g, ''))}
    />
  )
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function CHFAmountInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [raw, setRaw] = useState('')
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 13, color: 'var(--ink-500)', flexShrink: 0 }}>CHF</span>
      <input
        className="input"
        type="text"
        inputMode="numeric"
        value={focused ? raw : fmtCHF(value)}
        onFocus={() => { setFocused(true); setRaw(value ? String(value) : '') }}
        onBlur={() => { setFocused(false); onChange(parseInt(raw.replace(/[^0-9]/g, '')) || 0) }}
        onChange={(e) => setRaw(e.target.value.replace(/[^0-9]/g, ''))}
        style={{ flex: 1 }}
      />
    </div>
  )
}

function EventTimeline({ events, currentYear, maxYear }: { events: LifeEvent[]; currentYear: number; maxYear: number }) {
  const enabled = events.filter(e => e.enabled && e.amount > 0)
  if (enabled.length === 0) return null
  const VW = 400, VH = 100, PAD = 20, LINE_Y = 55, usableW = VW - 2 * PAD
  const range = Math.max(1, maxYear - currentYear)
  const getX = (year: number) => PAD + Math.max(0, Math.min(1, (year - currentYear) / range)) * usableW
  const tickYears = [currentYear, Math.round(currentYear + range / 2), maxYear]
  return (
    <div style={{ marginTop: 18, marginBottom: 4 }}>
      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-600)', marginBottom: 6 }}>Zeitlicher Überblick</div>
      <div style={{ background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 10, padding: '4px 0 0' }}>
        <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ display: 'block' }}>
          <line x1={PAD} y1={LINE_Y} x2={VW - PAD} y2={LINE_Y} stroke="#94a3b8" strokeWidth={2} />
          {tickYears.map(y => (
            <g key={y}>
              <line x1={getX(y)} y1={LINE_Y - 3} x2={getX(y)} y2={LINE_Y + 3} stroke="#94a3b8" strokeWidth={1} />
              <text x={getX(y)} y={LINE_Y + 14} textAnchor="middle" fontSize={8} fill="#94a3b8" fontFamily="monospace">{y}</text>
            </g>
          ))}
          {enabled.map((evt, i) => {
            const cfg = CATEGORY_CONFIG[evt.category]
            const x = getX(evt.year)
            const isIncome = evt.art === 'einnahme'
            const color = isIncome ? '#16a34a' : '#ef4444'
            const above = i % 2 === 0
            return (
              <g key={evt.id}>
                <line x1={x} y1={above ? LINE_Y - 6 : LINE_Y + 6} x2={x} y2={above ? LINE_Y - 24 : LINE_Y + 24} stroke={color} strokeWidth={1} strokeDasharray="2 2" />
                <circle cx={x} cy={LINE_Y} r={5} fill={color} />
                <text x={x} y={above ? LINE_Y - 30 : LINE_Y + 36} textAnchor="middle" fontSize={13}>{cfg.icon}</text>
                <text x={x} y={above ? LINE_Y - 18 : LINE_Y + 46} textAnchor="middle" fontSize={7} fill={color} fontFamily="monospace">{evt.year}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function LifeEventCard({ event, onUpdate, onDelete, currentYear, retirementYear, p1Income, p1PkRate }: {
  event: LifeEvent; onUpdate: (patch: Partial<LifeEvent>) => void; onDelete: () => void
  currentYear: number; retirementYear: number; p1Income: number; p1PkRate: number
}) {
  const [expanded, setExpanded] = useState(!event.amount)
  const cfg = CATEGORY_CONFIG[event.category]
  const isImmobilie = event.category === 'immobilie'
  const isTeilzeit = event.category === 'teilzeit'
  const isErbschaft = event.category === 'erbschaft'
  const isSonstiges = event.category === 'sonstiges'
  const artColor = event.art === 'einnahme' ? '#16a34a' : event.art === 'ausgabe' ? '#dc2626' : '#d97706'
  const artLabel = event.art === 'einnahme' ? 'Einnahme' : event.art === 'laufend' ? 'Laufend' : 'Einmalig'
  const totalAmount = event.art === 'laufend' ? event.amount * Math.max(1, event.duration) : event.amount
  const pkReductionMonthly = isImmobilie && event.details.pkVorbezug && event.details.pkVorbezug > 0
    ? calculatePKReductionFromWithdrawal(event.details.pkVorbezug, Math.max(1, retirementYear - event.year), p1PkRate) : 0
  const mortgageInfo = isImmobilie && event.details.hypothek && event.details.zinssatz
    ? calculateMortgageAffordability(p1Income, event.details.hypothek, event.details.zinssatz) : null
  const teilzeitReduction = isTeilzeit && event.details.neuerGrad !== undefined
    ? Math.round(p1Income * (1 - event.details.neuerGrad / 100)) : 0
  const yearOptions: number[] = []
  for (let y = currentYear; y <= retirementYear + 15; y++) yearOptions.push(y)

  return (
    <div style={{ border: `1px solid ${event.enabled ? 'var(--ink-200)' : 'var(--ink-100)'}`, borderRadius: 10, overflow: 'hidden', opacity: event.enabled ? 1 : 0.6, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: event.enabled ? 'white' : 'var(--ink-50)', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{cfg.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--navy-800)', lineHeight: 1.2 }}>{event.details.customLabel || cfg.label}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 1 }}>
            {event.year}{event.art === 'laufend' && event.duration > 0 ? ` – ${event.year + event.duration - 1} (${event.duration} J.)` : ''}{' · '}
            <span style={{ color: artColor }}>{artLabel}</span>
            {event.amount > 0 && <>{' · '}<span style={{ color: artColor, fontWeight: 600 }}>{event.art === 'einnahme' ? '+' : '−'}CHF {fmtCHF(totalAmount)}{event.art === 'laufend' ? '/total' : ''}</span></>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div onClick={(e) => { e.stopPropagation(); onUpdate({ enabled: !event.enabled }) }}
            style={{ width: 34, height: 18, borderRadius: 9, background: event.enabled ? 'var(--navy-700)' : 'var(--ink-200)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background .15s' }}>
            <div style={{ position: 'absolute', top: 3, width: 12, height: 12, borderRadius: '50%', background: 'white', transition: 'left .15s', left: event.enabled ? 19 : 3 }} />
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDelete() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-400)', fontSize: 16, lineHeight: 1, padding: '2px 4px' }}>×</button>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s', color: 'var(--ink-400)' }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '14px 16px', background: '#fafafa', borderTop: '1px solid var(--ink-100)' }}>
          <div className="form-grid">
            <div className="field">
              <label>Kategorie</label>
              <select className="input" value={event.category} style={{ appearance: 'auto' }}
                onChange={(e) => {
                  const cat = e.target.value as LifeEventCategory
                  const cfgNew = CATEGORY_CONFIG[cat]
                  onUpdate({ category: cat, amount: cfgNew.defaultAmount, art: cfgNew.defaultArt, duration: cfgNew.defaultDuration, details: {} })
                }}>
                {CATEGORIES_ORDERED.map(cat => <option key={cat} value={cat}>{CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}</option>)}
              </select>
              {cfg.hint && <span style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 3 }}>{cfg.hint}</span>}
            </div>
            <div className="field">
              <label>Wann (Jahr)</label>
              <select className="input" value={event.year} style={{ appearance: 'auto' }} onChange={(e) => onUpdate({ year: parseInt(e.target.value) })}>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {!isTeilzeit && (
              <div className="field">
                <label>Betrag {event.art === 'laufend' ? '(jährlich)' : '(einmalig)'}</label>
                <CHFAmountInput value={event.amount} onChange={(v) => onUpdate({ amount: v })} />
              </div>
            )}
            <div className="field">
              <label>Art</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['ausgabe', 'laufend', 'einnahme'] as LifeEventArt[]).map(art => (
                  <button key={art} onClick={() => onUpdate({ art })} style={{
                    flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all .15s',
                    border: `1.5px solid ${event.art === art ? (art === 'einnahme' ? '#16a34a' : art === 'ausgabe' ? '#dc2626' : '#d97706') : 'var(--ink-200)'}`,
                    background: event.art === art ? (art === 'einnahme' ? '#ecfdf5' : art === 'ausgabe' ? '#fef2f2' : '#fffbeb') : 'white',
                    color: event.art === art ? (art === 'einnahme' ? '#16a34a' : art === 'ausgabe' ? '#dc2626' : '#d97706') : 'var(--ink-600)',
                  }}>
                    {art === 'ausgabe' ? 'Einmalig' : art === 'laufend' ? 'Laufend' : 'Einnahme'}
                  </button>
                ))}
              </div>
            </div>
            {event.art === 'laufend' && (
              <div className="field">
                <label>Dauer (Jahre)</label>
                <input className="input" type="number" min={1} max={20} value={event.duration}
                  onChange={(e) => onUpdate({ duration: Math.max(1, parseInt(e.target.value) || 1) })} />
              </div>
            )}
            {isSonstiges && (
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Bezeichnung</label>
                <input className="input" type="text" placeholder="z.B. Bootskauf, Kunststudium…"
                  value={event.details.customLabel || ''}
                  onChange={(e) => onUpdate({ details: { ...event.details, customLabel: e.target.value } })} />
              </div>
            )}
          </div>

          {isImmobilie && (
            <div style={{ marginTop: 14, padding: '12px 14px', background: 'white', border: '1px solid var(--navy-100)', borderRadius: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 10 }}>🏠 Immobilien-Details</div>
              <div className="form-grid">
                <div className="field">
                  <label>Kaufpreis</label>
                  <CHFAmountInput value={event.details.kaufpreis || 0}
                    onChange={(v) => onUpdate({ details: { ...event.details, kaufpreis: v, hypothek: Math.max(0, v - (event.details.eigenkapital || 0)) } })} />
                </div>
                <div className="field">
                  <label>Eigenkapital (Anzahlung)</label>
                  <CHFAmountInput value={event.amount}
                    onChange={(v) => onUpdate({ amount: v, details: { ...event.details, eigenkapital: v, hypothek: Math.max(0, (event.details.kaufpreis || 0) - v) } })} />
                </div>
                <div className="field">
                  <label>davon PK-Vorbezug</label>
                  <CHFAmountInput value={event.details.pkVorbezug || 0}
                    onChange={(v) => onUpdate({ details: { ...event.details, pkVorbezug: v } })} />
                </div>
                <div className="field">
                  <label>Hypothek</label>
                  <CHFAmountInput value={event.details.hypothek || Math.max(0, (event.details.kaufpreis || 0) - event.amount)}
                    onChange={(v) => onUpdate({ details: { ...event.details, hypothek: v } })} />
                </div>
                <div className="field">
                  <label>Hypothekarzins (%)</label>
                  <input className="input" type="number" min={0.5} max={6} step={0.1}
                    value={event.details.zinssatz || 2.0}
                    onChange={(e) => onUpdate({ details: { ...event.details, zinssatz: parseFloat(e.target.value) || 2.0 } })} />
                </div>
              </div>
              {pkReductionMonthly > 0 && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, fontSize: 12.5, color: '#92400e' }}>
                  ⚠ PK-Vorbezug CHF {fmtCHF(event.details.pkVorbezug!)} reduziert Ihre PK-Rente um ca. <strong>CHF {fmtCHF(pkReductionMonthly)}/Monat</strong> (dauerhaft).
                </div>
              )}
              {mortgageInfo && event.details.hypothek && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: mortgageInfo.affordable ? '#ecfdf5' : '#fef2f2', border: `1px solid ${mortgageInfo.affordable ? '#bbf7d0' : '#fecaca'}`, borderRadius: 7, fontSize: 12.5, color: mortgageInfo.affordable ? '#166534' : '#dc2626' }}>
                  {mortgageInfo.affordable ? '✓' : '⚠'} Tragbarkeit: CHF {fmtCHF(mortgageInfo.monthlyCost)}/Mt. ({(mortgageInfo.incomeRatio * 100).toFixed(0)}% des Einkommens).{' '}{mortgageInfo.affordable ? 'Tragbar (≤ 33%).' : 'Über der Tragbarkeitsgrenze!'}
                </div>
              )}
            </div>
          )}

          {isTeilzeit && (
            <div style={{ marginTop: 14, padding: '12px 14px', background: 'white', border: '1px solid var(--navy-100)', borderRadius: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 10 }}>⏰ Teilzeit-Details</div>
              <div className="form-grid">
                <div className="field">
                  <label>Neuer Beschäftigungsgrad (%)</label>
                  <input className="input" type="number" min={10} max={99} value={event.details.neuerGrad ?? 80}
                    onChange={(e) => {
                      const grad = Math.min(99, Math.max(10, parseInt(e.target.value) || 80))
                      onUpdate({ details: { ...event.details, neuerGrad: grad }, amount: p1Income > 0 ? Math.round(p1Income * (1 - grad / 100)) : 0 })
                    }} />
                </div>
              </div>
              {teilzeitReduction > 0 && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, fontSize: 12.5, color: '#92400e' }}>
                  ⚠ Einkommensreduktion: ca. <strong>CHF {fmtCHF(teilzeitReduction)}/Jahr</strong> weniger ({event.duration} J. = CHF {fmtCHF(teilzeitReduction * event.duration)} total).
                </div>
              )}
            </div>
          )}

          {isErbschaft && (
            <div style={{ marginTop: 14, padding: '12px 14px', background: 'white', border: '1px solid var(--green-200)', borderRadius: 8 }}>
              <div style={{ padding: '8px 12px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 7, fontSize: 12.5, color: '#166534' }}>
                ℹ Erbschaften sind unsicher und werden nur im <strong>optimistischen Szenario</strong> berücksichtigt.
              </div>
            </div>
          )}

          {event.category === 'scheidung' && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, fontSize: 12.5, color: '#991b1b' }}>
              ⚖ Scheidungen sind komplex. Mögliche Auswirkungen: PK-Splitting, Vermögensteilung, Alimentenpflicht.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Screen3() {
  const navigate = useNavigate()
  const { expenses, setExpenses, persons, person1, hasPartner, location, lifeEvents, addLifeEvent, updateLifeEvent, removeLifeEvent, riskProfile, setRiskProfile, wertschriften, savingsStrategy, setSavingsStrategy } = useStore()
  const isPaar = hasPartner

  const [subStep, setSubStep] = useState(0)
  const [budgetTab, setBudgetTab] = useState<'schnell' | 'detailliert' | 'import'>('schnell')
  const [importText, setImportText] = useState('')
  const [importMonths, setImportMonths] = useState(3)
  const [importResult, setImportResult] = useState<{ total: number; monthly: number; transactions: number; fileName?: string } | null>(null)
  const [importFileName, setImportFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [retirementAdjust, setRetirementAdjust] = useState(1.0)
  const [showLoading, setShowLoading] = useState(false)
  const [lifeEventsOpen, setLifeEventsOpen] = useState(lifeEvents.length > 0)

  const currentYear = new Date().getFullYear()
  const p1Age = person1.dob ? Math.max(0, currentYear - new Date(person1.dob).getFullYear()) : 50
  const retirementYear = currentYear + Math.max(1, (person1.retireAge || 65) - p1Age)
  const p1 = persons.find(p => p.id === 1)!
  const p2stored = hasPartner ? persons.find(p => p.id === 2) : null
  const p1Income = p1?.income || 0
  const p2Income = p2stored?.income || 0
  const nettoMonatlich = Math.round((p1Income + p2Income) * 0.88 / 12)
  const STRATEGY_RATES: Record<string, number> = { sparkonto: 0.0075, konservativ: 0.025, ausgewogen: 0.035, aggressiv: 0.05 }

  const detailedTotal = useMemo(
    () => CATEGORIES.reduce((sum, cat) => sum + (expenses.detailed[cat.id] ?? cat.bfsMonthly), 0),
    [expenses.detailed],
  )

  const baseTotal = budgetTab === 'detailliert' ? detailedTotal : (expenses.customAmount || 0)
  const retirementTotal = Math.round(baseTotal * retirementAdjust)
  const bfsRef = isPaar ? BFS_RENTNER_PAAR : BFS_RENTNER_EINZEL
  const yearsToRetirement = Math.max(1, retirementYear - currentYear)
  const surplus = nettoMonatlich - baseTotal
  const monthlyToInvest = Math.max(0, surplus)
  const effectiveRate = STRATEGY_RATES[savingsStrategy] ?? 0.035
  const projectedExtra = monthlyToInvest > 0 && yearsToRetirement > 0
    ? Math.round(monthlyToInvest * 12 * ((Math.pow(1 + effectiveRate, yearsToRetirement) - 1) / effectiveRate))
    : 0

  const impactSummary = useMemo(
    () => getEventImpactSummary(lifeEvents, retirementYear),
    [lifeEvents, retirementYear],
  )

  const pieData = CATEGORIES.map(cat => ({
    name: cat.label,
    value: expenses.detailed[cat.id] ?? cat.bfsMonthly,
  }))

  function handleAddLifeEvent() {
    const cfg = CATEGORY_CONFIG['sonstiges']
    addLifeEvent({ id: uid(), category: 'sonstiges', year: currentYear + 2, amount: cfg.defaultAmount, art: cfg.defaultArt, duration: cfg.defaultDuration, enabled: true, details: {} })
    setLifeEventsOpen(true)
  }

  function parseAndSetResult(text: string, months: number) {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    let totalExpenses = 0
    let transactions = 0
    for (const line of lines) {
      const cells = line.split(/[,;|\t]/)
      for (const cell of cells) {
        const s = cell.trim().replace(/[^0-9.,'\-]/g, '').replace(/'/g, '')
        if (!s || s === '-') continue
        const cleaned = s.replace(/,(\d{2})$/, '.$1')
        const n = parseFloat(cleaned)
        if (!isNaN(n) && Math.abs(n) > 0.5 && n < 0) {
          totalExpenses += Math.abs(n)
          transactions++
        }
      }
    }
    if (totalExpenses === 0) {
      for (const line of lines) {
        const nums = line.match(/\d[\d']*[.,]\d{2}/g) || []
        for (const n of nums) {
          const v = parseFloat(n.replace(/'/g, '').replace(',', '.'))
          if (!isNaN(v) && v > 1 && v < 50000) { totalExpenses += v; transactions++ }
        }
      }
    }
    const monthly = months > 0 ? Math.round(totalExpenses / months) : totalExpenses
    setImportResult({ total: Math.round(totalExpenses), monthly, transactions })
  }

  function handleFileUpload(file: File) {
    setImportFileName(file.name)
    setImportResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setImportText(text)
      parseAndSetResult(text, importMonths)
    }
    reader.readAsText(file, 'utf-8')
  }

  function runImportParse() {
    parseAndSetResult(importText, importMonths)
  }

  function handleFinish() {
    const total = retirementTotal > 0 ? retirementTotal : baseTotal
    setExpenses({ mode: budgetTab === 'detailliert' ? 'detailed' : 'simple', simpleTotal: total })
    setShowLoading(true)
  }

  return (
    <div className="app">
      {showLoading && <LoadingTransition onDone={() => navigate('/schritt/4')} />}
      <TopBar screenLabel="Vorsorgeplanung" />
      <ProgressBar current={3} />

      {/* Sub-step progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 0, borderBottom: '1px solid var(--ink-100)', background: '#fafafa' }}>
        {SUB_STEP_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => setSubStep(i)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px 8px', flex: 1 }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center',
              fontSize: 10, fontWeight: 700,
              background: i < subStep ? 'var(--navy-700)' : i === subStep ? 'var(--navy-700)' : 'var(--ink-200)',
              color: i <= subStep ? 'white' : 'var(--ink-500)',
              transition: 'all .2s',
            }}>
              {i < subStep ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 10, color: i === subStep ? 'var(--navy-700)' : 'var(--ink-400)', fontWeight: i === subStep ? 600 : 400, whiteSpace: 'nowrap' }}>
              {label}
            </span>
          </button>
        ))}
      </div>

      <main>
        {/* === 3A: Budget === */}
        {subStep === 0 && (
          <>
            <div className="page-head">
              <div className="eyebrow">3A · Budget</div>
              <h1 className="title">Was geben Sie heute aus?</h1>
            </div>

            <div className="variant-toggle">
              {(['schnell', 'detailliert', 'import'] as const).map(tab => (
                <button key={tab} className={`variant-btn ${budgetTab === tab ? 'active' : ''}`} onClick={() => setBudgetTab(tab)}>
                  {tab === 'schnell' ? 'Schnell' : tab === 'detailliert' ? 'Detailliert' : 'Import'}
                </button>
              ))}
            </div>

            {/* Schnell tab */}
            {budgetTab === 'schnell' && (
              <section className="block">
                <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 8, fontSize: 12.5, color: 'var(--ink-600)' }}>
                  Referenz BFS 2022: {isPaar ? 'Rentnerpaare CHF 10\'300/Mt.' : 'Einzelhaushalte CHF 3\'381/Mt.'}
                </div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--ink-700)', marginBottom: 10 }}>
                  Monatliche Ausgaben heute
                </label>
                <CHFAmountInput
                  value={expenses.customAmount || 0}
                  onChange={v => setExpenses({ customAmount: v, simpleTotal: v })}
                />
                {(expenses.customAmount || 0) > 0 && (
                  <div style={{ marginTop: 18, padding: '16px 18px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 12 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>Ihr Monatsbudget</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--navy-800)', margin: '4px 0 2px' }}>
                      CHF {fmtCHF(expenses.customAmount || 0)}/Mt.
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>CHF {fmtCHF((expenses.customAmount || 0) * 12)}/Jahr</div>
                  </div>
                )}
              </section>
            )}

            {/* Detailliert tab */}
            {budgetTab === 'detailliert' && (
              <section className="block">
                <div className="info-callout" style={{ marginBottom: 16 }}>
                  <span className="info-callout-icon">i</span>
                  <span>Vorausgefüllt mit BFS-Durchschnittswerten. Passen Sie auf Ihren Lebensstil an.</span>
                </div>
                <div className="cat-list">
                  {CATEGORIES.map(cat => {
                    const canton = location?.kanton ?? 'ZH'
                    const gesundheitDefault = (KK_CANTON_DEFAULTS[canton] ?? 600) + 83
                    const catDefault = cat.id === 'gesundheit' ? gesundheitDefault : cat.bfsMonthly
                    const val = expenses.detailed[cat.id] ?? catDefault
                    const pctFill = Math.min(100, (val / (catDefault * 2)) * 100)
                    return (
                      <div key={cat.id} className="cat-card">
                        <div className="cat-icon">{cat.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="cat-label">{cat.label}</div>
                          <div className="cat-avg">
                            {cat.id === 'gesundheit'
                              ? `⌀ ${canton}: CHF ${fmtCHF(gesundheitDefault)}/Mt. (Prämie + Franchise)`
                              : `⌀ CHF ${fmtCHF(cat.bfsMonthly)}/Mt. (BFS 2022)`}
                          </div>
                          <div className="compare-bar">
                            <div className="compare-bar-fill" style={{ width: `${pctFill}%` }} />
                            <div className="compare-bar-avg" style={{ left: '50%' }} />
                          </div>
                          {cat.id === 'gesundheit' && (
                            <div style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 2 }}>
                              Inkl. Grundversicherung, Franchise und Selbstbehalt. BFS-Ø: CHF 615/Mt.
                            </div>
                          )}
                        </div>
                        <div className="cat-input">
                          <span style={{ fontSize: 13, color: 'var(--ink-400)' }}>CHF</span>
                          <AmountInput value={val} onChange={v => setExpenses({ detailed: { ...expenses.detailed, [cat.id]: v } })} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: 16, padding: '14px 18px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>Total pro Monat</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--navy-800)' }}>CHF {fmtCHF(detailedTotal)}/Mt.</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>BFS {isPaar ? 'Paar' : 'Rentner'}-⌀</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--ink-500)' }}>CHF {fmtCHF(bfsRef)}/Mt.</div>
                  </div>
                </div>
                {detailedTotal > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)', marginBottom: 8 }}>Ausgabenverteilung</div>
                    <ResponsiveContainer width="100%" height={230}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                          label={({ percent }) => percent > 0.06 ? `${Math.round(percent * 100)}%` : ''} labelLine={false}>
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => [`CHF ${fmtCHF(v)}/Mt.`, '']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--ink-200)' }} />
                        <Legend formatter={v => <span style={{ fontSize: 11, color: 'var(--ink-600)' }}>{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>
            )}

            {/* Import tab */}
            {budgetTab === 'import' && (
              <section className="block">
                <p style={{ fontSize: 13, color: 'var(--ink-500)', margin: '0 0 16px', lineHeight: 1.5 }}>
                  Exportieren Sie Ihre Kontobewegungen aus dem E-Banking als CSV oder Textdatei und laden Sie die Datei hoch. Negative Beträge werden als Ausgaben erkannt.
                </p>

                {/* File upload zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                  onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleFileUpload(file) }}
                  style={{
                    border: `2px dashed ${importFileName ? 'var(--navy-400)' : 'var(--ink-200)'}`,
                    borderRadius: 10, padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
                    background: importFileName ? 'var(--navy-50)' : 'var(--surface)',
                    marginBottom: 14, transition: 'border-color 0.15s',
                  }}
                >
                  {importFileName ? (
                    <>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>✓</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy-800)' }}>{importFileName}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>Klicken zum Ersetzen</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-700)', marginBottom: 2 }}>Datei hochladen</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>Ziehen Sie die Datei hierher oder klicken Sie</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>.csv, .txt akzeptiert</div>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  style={{ display: 'none' }}
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); e.target.value = '' }}
                />

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0', color: 'var(--ink-300)', fontSize: 12 }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--ink-100)' }} />
                  oder manuell einfügen
                  <div style={{ flex: 1, height: 1, background: 'var(--ink-100)' }} />
                </div>

                {/* Manual textarea */}
                <div style={{ marginBottom: 14 }}>
                  <textarea
                    value={importText}
                    onChange={e => { setImportText(e.target.value); setImportFileName(''); setImportResult(null) }}
                    placeholder={'Datum;Beschreibung;Betrag\n01.01.2025;Migros;-145.50\n02.01.2025;Miete;-2100.00\n...'}
                    style={{ width: '100%', minHeight: 110, padding: '10px 12px', border: '1.5px solid var(--ink-200)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', color: 'var(--ink-700)' }}
                  />
                </div>

                {/* Time range */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink-700)', marginBottom: 6 }}>Zeitraum der Daten</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1, 3, 6, 12].map(m => (
                      <button key={m} onClick={() => { setImportMonths(m); setImportResult(null) }} style={{
                        flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                        border: `1.5px solid ${importMonths === m ? 'var(--navy-700)' : 'var(--ink-200)'}`,
                        background: importMonths === m ? 'var(--navy-700)' : 'white',
                        color: importMonths === m ? 'white' : 'var(--ink-600)',
                        fontWeight: importMonths === m ? 600 : 400,
                      }}>
                        {m === 1 ? '1 Mt.' : m === 3 ? '3 Mt.' : m === 6 ? '6 Mt.' : '1 Jahr'}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={runImportParse}
                  disabled={!importText.trim()}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none',
                    cursor: importText.trim() ? 'pointer' : 'not-allowed',
                    background: importText.trim() ? 'var(--navy-700)' : 'var(--ink-200)',
                    color: importText.trim() ? 'white' : 'var(--ink-500)',
                    marginBottom: 14,
                  }}
                >
                  Ausgaben analysieren
                </button>

                {importResult && (
                  <div style={{ padding: '14px 16px', background: 'var(--navy-50)', border: '1px solid var(--navy-200)', borderRadius: 10 }}>
                    {importFileName && (
                      <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 6 }}>✓ {importFileName} geladen</div>
                    )}
                    <div style={{ fontSize: 12.5, color: 'var(--ink-600)', marginBottom: 8 }}>
                      {importResult.transactions} Ausgaben erkannt · {importMonths} {importMonths === 1 ? 'Monat' : 'Monate'} · Total CHF {fmtCHF(importResult.total)}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--navy-800)', marginBottom: 14 }}>
                      ⌀ CHF {fmtCHF(importResult.monthly)}/Mt.
                    </div>
                    <button
                      onClick={() => { setExpenses({ customAmount: importResult.monthly, simpleTotal: importResult.monthly }); setBudgetTab('schnell') }}
                      style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'var(--navy-700)', color: 'white' }}
                    >
                      CHF {fmtCHF(importResult.monthly)}/Mt. übernehmen
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Sparrate block – shown for all budget tabs when baseTotal > 0 */}
            {baseTotal > 0 && nettoMonatlich > 0 && (
              <section className="block">
                <div className="block-head">
                  <h2 className="block-title">Ihr monatlicher Überschuss</h2>
                </div>
                <div style={{ display: 'grid', gap: 10, marginBottom: 14, padding: '12px 14px', background: 'var(--ink-50)', border: '1px solid var(--ink-100)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: 'var(--ink-600)' }}>
                    <span>Netto-Einkommen</span>
                    <span style={{ fontWeight: 500 }}>CHF {fmtCHF(nettoMonatlich)}/Mt.</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: 'var(--ink-600)' }}>
                    <span>Ausgaben</span>
                    <span style={{ fontWeight: 500 }}>− CHF {fmtCHF(baseTotal)}/Mt.</span>
                  </div>
                  <div style={{ height: 1, background: 'var(--ink-200)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}>
                    <span style={{ color: 'var(--navy-800)' }}>Sparrate</span>
                    <span style={{ color: surplus > 0 ? '#16a34a' : '#dc2626' }}>
                      {surplus > 0 ? '+' : ''}CHF {fmtCHF(surplus)}/Mt.
                    </span>
                  </div>
                </div>

                {surplus > 0 ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)', marginBottom: 10 }}>
                      Was passiert mit diesem Geld?
                    </div>
                    <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
                      {([
                        { id: 'sparkonto' as const,  label: 'Bleibt auf dem Sparkonto',    hint: '0.75% p.a.' },
                        { id: 'konservativ' as const, label: 'Konservativ investiert',       hint: '25% Aktien · 2.5% p.a.' },
                        { id: 'ausgewogen' as const,  label: 'Ausgewogen investiert',        hint: '50% Aktien · 3.5% p.a.' },
                        { id: 'aggressiv' as const,   label: 'Aggressiv investiert',         hint: '80%+ Aktien · 5.0% p.a.' },
                      ]).map(opt => (
                        <button key={opt.id} onClick={() => setSavingsStrategy(opt.id)} style={{
                          textAlign: 'left', padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
                          border: `2px solid ${savingsStrategy === opt.id ? 'var(--navy-700)' : 'var(--ink-200)'}`,
                          background: savingsStrategy === opt.id ? 'var(--navy-50)' : 'white',
                          display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                          <div style={{
                            width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                            border: `2px solid ${savingsStrategy === opt.id ? 'var(--navy-700)' : 'var(--ink-300)'}`,
                            display: 'grid', placeItems: 'center',
                          }}>
                            {savingsStrategy === opt.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--navy-700)' }} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--navy-800)' }}>{opt.label}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--ink-400)' }}>{opt.hint}</div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {projectedExtra > 0 && (
                      <div style={{ padding: '14px 16px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 12 }}>
                        <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Zusätzliches Vermögen bis Pension</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--navy-800)' }}>
                          + CHF {fmtCHF(projectedExtra)}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 2 }}>
                          CHF {fmtCHF(monthlyToInvest)}/Mt. · {yearsToRetirement} Jahre · {(effectiveRate * 100).toFixed(1)}% p.a.
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12.5, color: '#991b1b' }}>
                    ⚠ Ausgaben übersteigen das geschätzte Netto-Einkommen. Bitte prüfen Sie Ihre Angaben.
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* === 3B: Retirement adjustment === */}
        {subStep === 1 && (
          <>
            <div className="page-head">
              <div className="eyebrow">3B · Ruhestand</div>
              <h1 className="title">Wie ändert sich Ihr Bedarf?</h1>
              <p className="subtitle">Berufskosten fallen weg — dafür steigen oft Freizeit und Gesundheit.</p>
            </div>
            <section className="block">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 20 }}>
                {ADJUST_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => setRetirementAdjust(opt.id)} style={{
                    padding: '14px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                    border: `2px solid ${retirementAdjust === opt.id ? opt.color : 'var(--ink-200)'}`,
                    background: retirementAdjust === opt.id ? opt.color : 'white',
                    color: retirementAdjust === opt.id ? 'white' : 'var(--ink-700)',
                    transition: 'all .15s',
                  }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{opt.label}</div>
                    <div style={{ fontSize: 12, opacity: 0.85, marginTop: 3 }}>{opt.hint}</div>
                  </button>
                ))}
              </div>
              {baseTotal > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: '14px 16px', background: 'var(--ink-50)', border: '1px solid var(--ink-100)', borderRadius: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Heute</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--ink-700)' }}>CHF {fmtCHF(baseTotal)}/Mt.</div>
                  </div>
                  <div style={{
                    padding: '14px 16px', borderRadius: 12,
                    background: retirementAdjust < 1 ? '#f0fdf4' : retirementAdjust > 1 ? '#fef2f2' : 'var(--navy-50)',
                    border: `1px solid ${retirementAdjust < 1 ? '#bbf7d0' : retirementAdjust > 1 ? '#fecaca' : 'var(--navy-100)'}`,
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Im Ruhestand</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: retirementAdjust < 1 ? '#16a34a' : retirementAdjust > 1 ? '#dc2626' : 'var(--navy-800)' }}>
                      CHF {fmtCHF(retirementTotal)}/Mt.
                    </div>
                    {retirementAdjust !== 1 && (
                      <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>
                        {retirementAdjust < 1 ? '−' : '+'} CHF {fmtCHF(Math.abs(retirementTotal - baseTotal))}/Mt.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
                  ℹ Bitte erfassen Sie zuerst Ihr Budget in Schritt 3A.
                </div>
              )}
            </section>
          </>
        )}

        {/* === 3C: Life events === */}
        {subStep === 2 && (
          <>
            <div className="page-head">
              <div className="eyebrow">3C · Lebensereignisse</div>
              <h1 className="title">Geplante Ereignisse</h1>
              <p className="subtitle">Optional: Grössere Ausgaben oder Veränderungen beeinflussen Ihren Vermögensverlauf.</p>
            </div>

            <section className="block">
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: lifeEventsOpen ? 16 : 0 }}
                onClick={() => setLifeEventsOpen(!lifeEventsOpen)}
              >
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--navy-800)' }}>
                  Lebensereignisse
                  {lifeEvents.length > 0 && (
                    <span style={{ marginLeft: 8, fontSize: 12, background: 'var(--navy-100)', color: 'var(--navy-700)', padding: '2px 8px', borderRadius: 10, fontWeight: 500 }}>
                      {lifeEvents.length}
                    </span>
                  )}
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ transform: lifeEventsOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s', color: 'var(--ink-400)' }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>

              {lifeEventsOpen && (
                <>
                  {lifeEvents.length === 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 10 }}>Was planen Sie?</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                        {[
                          { label: '🔨 Renovation', category: 'renovation' as LifeEventCategory },
                          { label: '⏰ Teilzeit', category: 'teilzeit' as LifeEventCategory },
                          { label: '🛒 Anschaffung', category: 'sonstiges' as LifeEventCategory },
                          { label: '✓ Nichts davon', category: null },
                        ].map(btn => (
                          <button key={btn.label} onClick={() => {
                            if (btn.category) {
                              const cfg = CATEGORY_CONFIG[btn.category]
                              addLifeEvent({ id: uid(), category: btn.category, year: currentYear + 2, amount: cfg.defaultAmount, art: cfg.defaultArt, duration: cfg.defaultDuration, enabled: true, details: {} })
                            }
                          }} style={{
                            padding: '10px 8px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                            border: '1.5px solid var(--ink-200)', background: '#fff',
                            color: 'var(--ink-700)', cursor: 'pointer', textAlign: 'left',
                          }}>
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {lifeEvents.map(evt => (
                    <LifeEventCard key={evt.id} event={evt} onUpdate={patch => updateLifeEvent(evt.id, patch)} onDelete={() => removeLifeEvent(evt.id)}
                      currentYear={currentYear} retirementYear={retirementYear} p1Income={p1.income || 0} p1PkRate={p1.pkRate || 5.4} />
                  ))}

                  <button onClick={handleAddLifeEvent} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--navy-600)', fontSize: 13, fontWeight: 500, padding: '8px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 300 }}>+</span>Ereignis hinzufügen
                  </button>

                  {lifeEvents.filter(e => e.enabled && e.amount > 0).length > 0 && (
                    <EventTimeline events={lifeEvents} currentYear={currentYear} maxYear={retirementYear + 10} />
                  )}

                  {impactSummary.enabledCount > 0 && (
                    <div className="ahv-card" style={{ marginTop: 14 }}>
                      <div className="ahv-row">
                        <div>
                          <div className="ahv-row-label">Sonderausgaben total</div>
                          <div className="ahv-row-sub">Vor Pension: CHF {fmtCHF(impactSummary.beforeRetirement)}{impactSummary.afterRetirement > 0 && ` · Danach: CHF ${fmtCHF(impactSummary.afterRetirement)}`}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="ahv-row-val" style={{ color: '#ef4444' }}>− CHF {fmtCHF(impactSummary.totalOutflow)}</div>
                        </div>
                      </div>
                      {impactSummary.totalInflow > 0 && (
                        <div className="ahv-row">
                          <div><div className="ahv-row-label">Erwartete Zuflüsse</div></div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="ahv-row-val" style={{ color: '#22c55e' }}>+ CHF {fmtCHF(impactSummary.totalInflow)}</div>
                          </div>
                        </div>
                      )}
                      <div className="ahv-row ahv-total">
                        <div><div className="ahv-row-label">Nettoauswirkung</div></div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="ahv-row-val" style={{ color: impactSummary.netImpact >= 0 ? '#22c55e' : '#ef4444' }}>
                            {impactSummary.netImpact >= 0 ? '+' : '−'}CHF {fmtCHF(Math.abs(impactSummary.netImpact))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Risk profile: only shown if user has Wertschriften */}
            {wertschriften > 0 && (
              <section className="block">
                <div className="block-head">
                  <h2 className="block-title">Anlagestrategie</h2>
                  <span className="block-hint">Für Ihre Wertschriften</span>
                </div>
                <div role="radiogroup" style={{ display: 'grid', gap: 8 }}>
                  {RISK_PROFILES.map(profile => (
                    <button key={profile.id} role="radio" aria-checked={riskProfile === profile.id} onClick={() => setRiskProfile(profile.id)} style={{
                      textAlign: 'left', padding: '12px 14px', borderRadius: 10,
                      border: `2px solid ${riskProfile === profile.id ? profile.color : 'var(--ink-200)'}`,
                      background: riskProfile === profile.id ? profile.bg : 'white',
                      cursor: 'pointer', transition: 'all .15s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{profile.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: riskProfile === profile.id ? profile.color : 'var(--navy-800)' }}>
                            {profile.title}{riskProfile === profile.id && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, opacity: 0.8 }}>✓</span>}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>{profile.sub}</div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: profile.color }}>{profile.return} p.a.</div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-400)', textAlign: 'center', paddingTop: 24, paddingBottom: 4 }}>
          <Link to="/impressum" style={{ color: 'var(--ink-400)' }}>Impressum</Link>
          {' · '}
          <Link to="/datenschutz" style={{ color: 'var(--ink-400)' }}>Datenschutz</Link>
          {' · '}© 2026 WealthWise
        </div>
      </main>

      <div className="footer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div className="footer-meta">Schritt 3 · {SUB_STEP_LABELS[subStep]}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>Ihre Eingaben bleiben gespeichert</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => { if (subStep === 0) navigate('/schritt/2'); else setSubStep(subStep - 1) }}>
            ← Zurück
          </button>
          {subStep < 2 ? (
            <button className="btn btn-primary" onClick={() => setSubStep(subStep + 1)}>Weiter →</button>
          ) : (
            <button className="btn btn-primary" onClick={handleFinish}>Zur Analyse →</button>
          )}
        </div>
      </div>

      <ChatPanel currentStep="ausgaben" />
    </div>
  )
}
