import { useState, useMemo } from 'react'
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

// BFS HABE 2022 reference data for retired households
const CATEGORIES = [
  { id: 'wohnen', label: 'Wohnen & Energie', icon: '🏠', bfsMonthly: 1476, factor: 0.18 },
  { id: 'gesundheit', label: 'Gesundheit', icon: '🏥', bfsMonthly: 615, factor: 0.08 },
  { id: 'nahrung', label: 'Nahrung & Restaurants', icon: '🍽️', bfsMonthly: 1080, factor: 0.13 },
  { id: 'mobilitaet', label: 'Mobilität', icon: '🚗', bfsMonthly: 650, factor: 0.08 },
  { id: 'freizeit', label: 'Freizeit & Ferien', icon: '✈️', bfsMonthly: 580, factor: 0.07 },
  { id: 'bekleidung', label: 'Bekleidung', icon: '👔', bfsMonthly: 180, factor: 0.02 },
  { id: 'kommunikation', label: 'Kommunikation', icon: '📱', bfsMonthly: 200, factor: 0.02 },
  { id: 'uebrige', label: 'Übriges', icon: '📦', bfsMonthly: 600, factor: 0.07 },
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

function EventTimeline({ events, currentYear, maxYear }: {
  events: LifeEvent[]
  currentYear: number
  maxYear: number
}) {
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
          {/* Axis */}
          <line x1={PAD} y1={LINE_Y} x2={VW - PAD} y2={LINE_Y} stroke="#94a3b8" strokeWidth={2} />

          {/* Tick years */}
          {tickYears.map(y => (
            <g key={y}>
              <line x1={getX(y)} y1={LINE_Y - 3} x2={getX(y)} y2={LINE_Y + 3} stroke="#94a3b8" strokeWidth={1} />
              <text x={getX(y)} y={LINE_Y + 14} textAnchor="middle" fontSize={8} fill="#94a3b8" fontFamily="monospace">{y}</text>
            </g>
          ))}

          {/* Events */}
          {enabled.map((evt, i) => {
            const cfg = CATEGORY_CONFIG[evt.category]
            const x = getX(evt.year)
            const isIncome = evt.art === 'einnahme'
            const color = isIncome ? '#16a34a' : '#ef4444'
            const above = i % 2 === 0

            return (
              <g key={evt.id}>
                <line
                  x1={x} y1={above ? LINE_Y - 6 : LINE_Y + 6}
                  x2={x} y2={above ? LINE_Y - 24 : LINE_Y + 24}
                  stroke={color} strokeWidth={1} strokeDasharray="2 2"
                />
                <circle cx={x} cy={LINE_Y} r={5} fill={color} />
                <text
                  x={x}
                  y={above ? LINE_Y - 30 : LINE_Y + 36}
                  textAnchor="middle"
                  fontSize={13}
                >
                  {cfg.icon}
                </text>
                <text
                  x={x}
                  y={above ? LINE_Y - 18 : LINE_Y + 46}
                  textAnchor="middle"
                  fontSize={7}
                  fill={color}
                  fontFamily="monospace"
                >
                  {evt.year}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function LifeEventCard({
  event,
  onUpdate,
  onDelete,
  currentYear,
  retirementYear,
  p1Income,
  p1PkRate,
}: {
  event: LifeEvent
  onUpdate: (patch: Partial<LifeEvent>) => void
  onDelete: () => void
  currentYear: number
  retirementYear: number
  p1Income: number
  p1PkRate: number
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
    ? calculatePKReductionFromWithdrawal(
        event.details.pkVorbezug,
        Math.max(1, retirementYear - event.year),
        p1PkRate,
      )
    : 0

  const mortgageInfo = isImmobilie && event.details.hypothek && event.details.zinssatz
    ? calculateMortgageAffordability(p1Income, event.details.hypothek, event.details.zinssatz)
    : null

  const teilzeitReduction = isTeilzeit && event.details.neuerGrad !== undefined
    ? Math.round(p1Income * (1 - event.details.neuerGrad / 100))
    : 0

  const yearOptions: number[] = []
  for (let y = currentYear; y <= retirementYear + 15; y++) yearOptions.push(y)

  return (
    <div style={{
      border: `1px solid ${event.enabled ? 'var(--ink-200)' : 'var(--ink-100)'}`,
      borderRadius: 10,
      overflow: 'hidden',
      opacity: event.enabled ? 1 : 0.6,
      marginBottom: 8,
    }}>
      {/* Card header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
          background: event.enabled ? 'white' : 'var(--ink-50)', cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ fontSize: 20, flexShrink: 0 }}>{cfg.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--navy-800)', lineHeight: 1.2 }}>
            {event.details.customLabel || cfg.label}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 1 }}>
            {event.year}
            {event.art === 'laufend' && event.duration > 0 ? ` – ${event.year + event.duration - 1} (${event.duration} J.)` : ''}
            {' · '}
            <span style={{ color: artColor }}>{artLabel}</span>
            {event.amount > 0 && (
              <>
                {' · '}
                <span style={{ color: artColor, fontWeight: 600 }}>
                  {event.art === 'einnahme' ? '+' : '−'}CHF {fmtCHF(totalAmount)}
                  {event.art === 'laufend' ? '/total' : ''}
                </span>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Enable toggle */}
          <div
            onClick={(e) => { e.stopPropagation(); onUpdate({ enabled: !event.enabled }) }}
            style={{
              width: 34, height: 18, borderRadius: 9,
              background: event.enabled ? 'var(--navy-700)' : 'var(--ink-200)',
              position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background .15s',
            }}
          >
            <div style={{
              position: 'absolute', top: 3, width: 12, height: 12, borderRadius: '50%',
              background: 'white', transition: 'left .15s',
              left: event.enabled ? 19 : 3,
            }} />
          </div>
          {/* Delete */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-400)', fontSize: 16, lineHeight: 1, padding: '2px 4px' }}
          >
            ×
          </button>
          {/* Chevron */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s', color: 'var(--ink-400)' }}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      </div>

      {/* Expanded form */}
      {expanded && (
        <div style={{ padding: '14px 16px', background: '#fafafa', borderTop: '1px solid var(--ink-100)' }}>
          <div className="form-grid">
            {/* Category */}
            <div className="field">
              <label>Kategorie</label>
              <select
                className="input"
                value={event.category}
                onChange={(e) => {
                  const cat = e.target.value as LifeEventCategory
                  const cfgNew = CATEGORY_CONFIG[cat]
                  onUpdate({
                    category: cat,
                    amount: cfgNew.defaultAmount,
                    art: cfgNew.defaultArt,
                    duration: cfgNew.defaultDuration,
                    details: {},
                  })
                }}
                style={{ appearance: 'auto' }}
              >
                {CATEGORIES_ORDERED.map(cat => (
                  <option key={cat} value={cat}>
                    {CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}
                  </option>
                ))}
              </select>
              {cfg.hint && <span style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 3 }}>{cfg.hint}</span>}
            </div>

            {/* Year */}
            <div className="field">
              <label>Wann (Jahr)</label>
              <select
                className="input"
                value={event.year}
                onChange={(e) => onUpdate({ year: parseInt(e.target.value) })}
                style={{ appearance: 'auto' }}
              >
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Amount (hidden for teilzeit since it's computed) */}
            {!isTeilzeit && (
              <div className="field">
                <label>
                  Betrag {event.art === 'laufend' ? '(jährlich)' : '(einmalig)'}
                </label>
                <CHFAmountInput value={event.amount} onChange={(v) => onUpdate({ amount: v })} />
              </div>
            )}

            {/* Art */}
            <div className="field">
              <label>Art</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['ausgabe', 'laufend', 'einnahme'] as LifeEventArt[]).map(art => (
                  <button
                    key={art}
                    onClick={() => onUpdate({ art })}
                    style={{
                      flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                      cursor: 'pointer', transition: 'all .15s',
                      border: `1.5px solid ${event.art === art ? (art === 'einnahme' ? '#16a34a' : art === 'ausgabe' ? '#dc2626' : '#d97706') : 'var(--ink-200)'}`,
                      background: event.art === art ? (art === 'einnahme' ? '#ecfdf5' : art === 'ausgabe' ? '#fef2f2' : '#fffbeb') : 'white',
                      color: event.art === art ? (art === 'einnahme' ? '#16a34a' : art === 'ausgabe' ? '#dc2626' : '#d97706') : 'var(--ink-600)',
                    }}
                  >
                    {art === 'ausgabe' ? 'Einmalig' : art === 'laufend' ? 'Laufend' : 'Einnahme'}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration (for laufend) */}
            {event.art === 'laufend' && (
              <div className="field">
                <label>Dauer (Jahre)</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={20}
                  value={event.duration}
                  onChange={(e) => onUpdate({ duration: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </div>
            )}

            {/* Custom label for Sonstiges */}
            {isSonstiges && (
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Bezeichnung</label>
                <input
                  className="input"
                  type="text"
                  placeholder="z.B. Bootskauf, Kunststudium…"
                  value={event.details.customLabel || ''}
                  onChange={(e) => onUpdate({ details: { ...event.details, customLabel: e.target.value } })}
                />
              </div>
            )}
          </div>

          {/* === Immobilie special fields === */}
          {isImmobilie && (
            <div style={{ marginTop: 14, padding: '12px 14px', background: 'white', border: '1px solid var(--navy-100)', borderRadius: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 10 }}>🏠 Immobilien-Details</div>
              <div className="form-grid">
                <div className="field">
                  <label>Kaufpreis</label>
                  <CHFAmountInput
                    value={event.details.kaufpreis || 0}
                    onChange={(v) => onUpdate({
                      details: {
                        ...event.details, kaufpreis: v,
                        hypothek: Math.max(0, v - (event.details.eigenkapital || 0)),
                      }
                    })}
                  />
                </div>
                <div className="field">
                  <label>Eigenkapital (Anzahlung)</label>
                  <CHFAmountInput
                    value={event.amount}
                    onChange={(v) => onUpdate({
                      amount: v,
                      details: {
                        ...event.details, eigenkapital: v,
                        hypothek: Math.max(0, (event.details.kaufpreis || 0) - v),
                      }
                    })}
                  />
                </div>
                <div className="field">
                  <label>davon PK-Vorbezug</label>
                  <CHFAmountInput
                    value={event.details.pkVorbezug || 0}
                    onChange={(v) => onUpdate({ details: { ...event.details, pkVorbezug: v } })}
                  />
                </div>
                <div className="field">
                  <label>Hypothek</label>
                  <CHFAmountInput
                    value={event.details.hypothek || Math.max(0, (event.details.kaufpreis || 0) - event.amount)}
                    onChange={(v) => onUpdate({ details: { ...event.details, hypothek: v } })}
                  />
                </div>
                <div className="field">
                  <label>Hypothekarzins (%)</label>
                  <input
                    className="input"
                    type="number"
                    min={0.5}
                    max={6}
                    step={0.1}
                    value={event.details.zinssatz || 2.0}
                    onChange={(e) => onUpdate({ details: { ...event.details, zinssatz: parseFloat(e.target.value) || 2.0 } })}
                  />
                </div>
              </div>

              {/* PK Vorbezug warning */}
              {pkReductionMonthly > 0 && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, fontSize: 12.5, color: '#92400e' }}>
                  ⚠ PK-Vorbezug CHF {fmtCHF(event.details.pkVorbezug!)} reduziert Ihre PK-Rente um ca.{' '}
                  <strong>CHF {fmtCHF(pkReductionMonthly)}/Monat</strong> (dauerhaft, nach {retirementYear - event.year} Jahren Wachstum bis Pensionierung).
                </div>
              )}

              {/* Mortgage affordability */}
              {mortgageInfo && event.details.hypothek && (
                <div style={{
                  marginTop: 8, padding: '8px 12px',
                  background: mortgageInfo.affordable ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${mortgageInfo.affordable ? '#bbf7d0' : '#fecaca'}`,
                  borderRadius: 7, fontSize: 12.5,
                  color: mortgageInfo.affordable ? '#166534' : '#dc2626',
                }}>
                  {mortgageInfo.affordable ? '✓' : '⚠'} Tragbarkeit: Hypothekarkosten CHF {fmtCHF(mortgageInfo.monthlyCost)}/Mt.
                  ({(mortgageInfo.incomeRatio * 100).toFixed(0)}% des Einkommens).
                  {' '}{mortgageInfo.affordable ? 'Tragbar (≤ 33%).' : 'Über der Tragbarkeitsgrenze von 33%!'}
                </div>
              )}

              <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--ink-500)' }}>
                Nebenkosten (Unterhalt, Verwaltung): ca. 1% des Kaufpreises/Jahr werden automatisch berücksichtigt.
                Amortisationspflicht: Hypothek muss bis Alter 65 auf 2/3 des Verkehrswerts reduziert sein.
              </div>
            </div>
          )}

          {/* === Teilzeit special fields === */}
          {isTeilzeit && (
            <div style={{ marginTop: 14, padding: '12px 14px', background: 'white', border: '1px solid var(--navy-100)', borderRadius: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 10 }}>⏰ Teilzeit-Details</div>
              <div className="form-grid">
                <div className="field">
                  <label>Neuer Beschäftigungsgrad (%)</label>
                  <input
                    className="input"
                    type="number"
                    min={10}
                    max={99}
                    value={event.details.neuerGrad ?? 80}
                    onChange={(e) => {
                      const grad = Math.min(99, Math.max(10, parseInt(e.target.value) || 80))
                      const reduction = p1Income > 0 ? Math.round(p1Income * (1 - grad / 100)) : 0
                      onUpdate({
                        details: { ...event.details, neuerGrad: grad },
                        amount: reduction,
                      })
                    }}
                  />
                </div>
              </div>
              {teilzeitReduction > 0 && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, fontSize: 12.5, color: '#92400e' }}>
                  ⚠ Einkommensreduktion: ca. <strong>CHF {fmtCHF(teilzeitReduction)}/Jahr</strong> weniger
                  ({event.duration} J. = CHF {fmtCHF(teilzeitReduction * event.duration)} total).
                  Tieferes PK-Kapital und tiefere AHV-Rente möglich.
                </div>
              )}
            </div>
          )}

          {/* === Erbschaft special fields === */}
          {isErbschaft && (
            <div style={{ marginTop: 14, padding: '12px 14px', background: 'white', border: '1px solid var(--green-200)', borderRadius: 8 }}>
              <div style={{ padding: '8px 12px', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 7, fontSize: 12.5, color: '#166534' }}>
                ℹ Erbschaften sind unsicher und sollten nicht als fixe Planungsgrösse behandelt werden.
                Sie werden nur im <strong>optimistischen Szenario</strong> berücksichtigt.
              </div>
            </div>
          )}

          {/* Scheidung disclaimer */}
          {event.category === 'scheidung' && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, fontSize: 12.5, color: '#991b1b' }}>
              ⚖ Scheidungen sind komplex. Mögliche Auswirkungen: PK-Splitting, Vermögensteilung, Alimentenpflicht.
              Wir empfehlen eine Fachberatung durch einen Familienrechts-Anwalt.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Screen3() {
  const navigate = useNavigate()
  const { expenses, setExpenses, persons, person1, hasPartner, lifeEvents, addLifeEvent, updateLifeEvent, removeLifeEvent } = useStore()
  const isPaar = hasPartner

  const [mode, setMode] = useState<'simple' | 'detailed'>(expenses.mode)
  const [retirementAdjust, setRetirementAdjust] = useState<number>(1.0)

  const currentYear = new Date().getFullYear()
  const p1Age = person1.dob
    ? Math.max(0, new Date().getFullYear() - new Date(person1.dob).getFullYear())
    : 50
  const retirementYear = currentYear + Math.max(1, (person1.retireAge || 65) - p1Age)

  function handleAddLifeEvent() {
    const cfg = CATEGORY_CONFIG['sonstiges']
    const newEvent: LifeEvent = {
      id: uid(),
      category: 'sonstiges',
      year: currentYear + 2,
      amount: cfg.defaultAmount,
      art: cfg.defaultArt,
      duration: cfg.defaultDuration,
      enabled: true,
      details: {},
    }
    addLifeEvent(newEvent)
  }

  const impactSummary = useMemo(
    () => getEventImpactSummary(lifeEvents, retirementYear),
    [lifeEvents, retirementYear],
  )

  const p1 = persons.find(p => p.id === 1)!
  const income1 = p1.income
  const income2 = hasPartner ? (persons.find(p => p.id === 2)?.income || 0) : 0
  const totalIncome = income1 + income2

  // Simple mode calculation
  const simpleGoalCHF = expenses.goal === 'custom'
    ? expenses.customAmount
    : Math.round((totalIncome * 0.85 * parseInt(expenses.goal || '80')) / 100 / 12)

  // Detailed total
  const detailedTotal = useMemo(() => {
    return CATEGORIES.reduce((sum, cat) => sum + (expenses.detailed[cat.id] || cat.bfsMonthly), 0)
  }, [expenses.detailed])

  const baseTotal = mode === 'simple'
    ? (expenses.goal === 'custom' ? expenses.customAmount : simpleGoalCHF)
    : detailedTotal

  const retirementTotal = Math.round(baseTotal * retirementAdjust)

  const bfsRef = isPaar ? BFS_RENTNER_PAAR : BFS_RENTNER_EINZEL

  const budgetStatus = retirementTotal < bfsRef * 0.8 ? 'good'
    : retirementTotal < bfsRef * 1.1 ? 'warn' : 'bad'

  // Pie chart data (detailed mode)
  const pieData = CATEGORIES.map((cat) => ({
    name: cat.label,
    value: expenses.detailed[cat.id] !== undefined ? expenses.detailed[cat.id] : cat.bfsMonthly,
  }))

  return (
    <div className="app">
      <TopBar screenLabel="Vorsorgeplanung" />
      <ProgressBar current={3} />

      <main>
        <div className="page-head">
          <div className="eyebrow">Schritt 3 · Ausgaben</div>
          <h1 className="title">Ihr Finanzbedarf im Alter</h1>
          <p className="subtitle">
            Definieren Sie Ihr gewünschtes Lebensstandard-Budget nach der Pensionierung.
            Grundlage sind die BFS-Haushaltserhebungen 2022.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="variant-toggle">
          <button
            className={`variant-btn ${mode === 'simple' ? 'active' : ''}`}
            onClick={() => { setMode('simple'); setExpenses({ mode: 'simple' }) }}
          >
            Einfach
          </button>
          <button
            className={`variant-btn ${mode === 'detailed' ? 'active' : ''}`}
            onClick={() => { setMode('detailed'); setExpenses({ mode: 'detailed' }) }}
          >
            Detailliert
          </button>
        </div>

        {/* Simple mode */}
        {mode === 'simple' && (
          <section className="block">
            <div className="block-head">
              <h2 className="block-title"><span className="block-num">A</span>Budget-Ziel</h2>
            </div>

            <div className="info-callout" style={{ marginBottom: 20 }}>
              <span className="info-callout-icon">i</span>
              <span>
                Gemäss BFS (HABE 2022) gibt ein {isPaar ? 'Rentnerpaar-Haushalt im Schnitt CHF 10\'300/Mt.' : 'Rentner-Haushalt im Schnitt CHF 3\'381/Mt.'} aus.
                Als Faustregel gelten 80% des letzten Nettoeinkommens.
              </span>
            </div>

            <div className="pct-radio-group">
              {['70', '80', '90'].map((p) => {
                const chf = Math.round((totalIncome * 0.85 * parseInt(p)) / 100 / 12)
                return (
                  <div
                    key={p}
                    className={`pct-radio ${expenses.goal === p ? 'active' : ''}`}
                    onClick={() => setExpenses({ goal: p as '70' | '80' | '90' })}
                  >
                    <div className="pct-dot" />
                    <div className="pct-pct">{p}%</div>
                    <div className="pct-label">{p === '80' ? '⭐ Empfohlen' : p === '70' ? 'Minimal' : 'Komfortabel'}</div>
                    {totalIncome > 0 && <div className="pct-chf">≈ CHF {fmtCHF(chf)}/Mt.</div>}
                  </div>
                )
              })}
            </div>

            <div
              className={`pct-radio ${expenses.goal === 'custom' ? 'active' : ''}`}
              style={{ marginBottom: 0 }}
              onClick={() => setExpenses({ goal: 'custom' })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="pct-dot" />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Eigener Betrag</span>
              </div>
              {expenses.goal === 'custom' && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, color: 'var(--ink-500)' }}>CHF</span>
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    placeholder="z.B. 5'000"
                    value={expenses.customAmount ? fmtCHF(expenses.customAmount) : ''}
                    onChange={(e) => setExpenses({ customAmount: parseNum(e.target.value) })}
                    style={{ maxWidth: 160 }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span style={{ fontSize: 14, color: 'var(--ink-500)' }}>pro Monat</span>
                </div>
              )}
            </div>

            <div style={{ marginTop: 16, padding: '14px 18px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>Monatliches Zielbudget</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--navy-800)' }}>
                CHF {fmtCHF(baseTotal)}/Mt.
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 2 }}>
                CHF {fmtCHF(baseTotal * 12)}/Jahr
              </div>
            </div>
          </section>
        )}

        {/* Detailed mode */}
        {mode === 'detailed' && (
          <section className="block">
            <div className="block-head">
              <h2 className="block-title"><span className="block-num">A</span>Ausgaben nach Kategorien</h2>
              <span className="block-hint">Monatliche Beträge in CHF</span>
            </div>

            <div className="info-callout" style={{ marginBottom: 16 }}>
              <span className="info-callout-icon">i</span>
              <span>
                Vorausgefüllt mit BFS-Durchschnittswerten für Rentner-Haushalte.
                Passen Sie die Werte auf Ihren Lebensstil an.
                {isPaar && ' Referenz Ehepaare: CHF 10\'300/Monat (BFS 2022).'}
              </span>
            </div>

            <div className="cat-list">
              {CATEGORIES.map((cat) => {
                const val = expenses.detailed[cat.id] !== undefined ? expenses.detailed[cat.id] : cat.bfsMonthly
                const pctFill = Math.min(100, (val / (cat.bfsMonthly * 2)) * 100)
                const avgPct = 50
                return (
                  <div key={cat.id} className="cat-card">
                    <div className="cat-icon">{cat.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="cat-label">{cat.label}</div>
                      <div className="cat-avg">⌀ CHF {fmtCHF(cat.bfsMonthly)}/Mt. (BFS 2022)</div>
                      <div className="compare-bar">
                        <div className="compare-bar-fill" style={{ width: `${pctFill}%` }} />
                        <div className="compare-bar-avg" style={{ left: `${avgPct}%` }} />
                      </div>
                    </div>
                    <div className="cat-input">
                      <span style={{ fontSize: 13, color: 'var(--ink-400)' }}>CHF</span>
                      <AmountInput
                        value={val}
                        onChange={(v) => setExpenses({ detailed: { ...expenses.detailed, [cat.id]: v } })}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: 16, padding: '14px 18px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>Total pro Monat</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--navy-800)' }}>
                  CHF {fmtCHF(detailedTotal)}/Mt.
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>BFS {isPaar ? 'Paar-' : 'Rentner-'}⌀</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--ink-500)' }}>
                  CHF {fmtCHF(bfsRef)}/Mt.
                </div>
              </div>
            </div>

            {/* Pie chart */}
            {detailedTotal > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-700)', marginBottom: 8 }}>
                  Ausgabenverteilung
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) => percent > 0.06 ? `${Math.round(percent * 100)}%` : ''}
                      labelLine={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [`CHF ${fmtCHF(v)}/Mt.`, '']}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--ink-200)' }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ fontSize: 11, color: 'var(--ink-600)' }}>{value}</span>}
                      wrapperStyle={{ fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        )}

        {/* Retirement adjustment slider */}
        {baseTotal > 0 && (
          <section className="block">
            <div className="block-head">
              <h2 className="block-title">
                <span className="block-num">B</span>Anpassung im Ruhestand
              </h2>
              <span className="block-hint">Wie ändert sich Ihr Bedarf nach der Pensionierung?</span>
            </div>

            <p style={{ fontSize: 13.5, color: 'var(--ink-600)', margin: '0 0 16px', lineHeight: 1.6 }}>
              Viele Ausgaben verändern sich nach der Pensionierung: Berufskosten fallen weg,
              dafür steigen oft Freizeit- und Gesundheitsausgaben.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
              {ADJUST_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setRetirementAdjust(opt.id)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 10,
                    border: `2px solid ${retirementAdjust === opt.id ? opt.color : 'var(--ink-200)'}`,
                    background: retirementAdjust === opt.id ? opt.color : 'var(--surface)',
                    color: retirementAdjust === opt.id ? 'white' : 'var(--ink-700)',
                    cursor: 'pointer',
                    transition: 'all .15s',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>{opt.label}</div>
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{opt.hint}</div>
                </button>
              ))}
            </div>

            <div style={{
              marginTop: 18,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}>
              <div style={{ padding: '14px 16px', background: 'var(--ink-50)', border: '1px solid var(--ink-100)', borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Monatlicher Bedarf heute</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--ink-700)' }}>
                  CHF {fmtCHF(baseTotal)}/Mt.
                </div>
              </div>
              <div style={{
                padding: '14px 16px',
                background: retirementAdjust < 1 ? 'var(--green-50)' : retirementAdjust > 1 ? '#fef2f2' : 'var(--navy-50)',
                border: `1px solid ${retirementAdjust < 1 ? 'var(--green-200)' : retirementAdjust > 1 ? '#fecaca' : 'var(--navy-100)'}`,
                borderRadius: 12,
              }}>
                <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>Nach Pensionierung (Schätzung)</div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20,
                  color: retirementAdjust < 1 ? 'var(--green-700)' : retirementAdjust > 1 ? 'var(--red-600)' : 'var(--navy-800)',
                }}>
                  CHF {fmtCHF(retirementTotal)}/Mt.
                </div>
                {retirementAdjust !== 1 && (
                  <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>
                    {retirementAdjust < 1 ? '−' : '+'} CHF {fmtCHF(Math.abs(retirementTotal - baseTotal))}/Mt.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Block C: Geplante Lebensereignisse */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">C</span>Geplante Lebensereignisse
            </h2>
            <span className="block-hint">
              {lifeEvents.filter(e => e.enabled && e.amount > 0).length > 0
                ? `${lifeEvents.filter(e => e.enabled && e.amount > 0).length} Ereignis(se) erfasst`
                : 'Optional'}
            </span>
          </div>

          <div className="info-callout" style={{ marginBottom: 16 }}>
            <span className="info-callout-icon">i</span>
            <span>
              Grössere Ausgaben oder Veränderungen in den nächsten Jahren beeinflussen Ihren Vermögensverlauf erheblich.
              Erfassen Sie hier geplante Ereignisse – sie werden direkt in Ihre Analyse übernommen.
            </span>
          </div>

          {/* Event list */}
          {lifeEvents.map((evt) => (
            <LifeEventCard
              key={evt.id}
              event={evt}
              onUpdate={(patch) => updateLifeEvent(evt.id, patch)}
              onDelete={() => removeLifeEvent(evt.id)}
              currentYear={currentYear}
              retirementYear={retirementYear}
              p1Income={p1.income || 0}
              p1PkRate={p1.pkRate || 5.4}
            />
          ))}

          {/* Add button */}
          <button
            onClick={handleAddLifeEvent}
            style={{
              width: '100%', padding: '11px 16px', borderRadius: 10,
              border: '2px dashed var(--navy-200)', background: 'var(--navy-50)',
              color: 'var(--navy-700)', fontSize: 13.5, fontWeight: 600,
              cursor: 'pointer', transition: 'all .15s', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 300 }}>+</span>
            Ereignis hinzufügen
          </button>

          {/* Timeline */}
          {lifeEvents.filter(e => e.enabled && e.amount > 0).length > 0 && (
            <EventTimeline
              events={lifeEvents}
              currentYear={currentYear}
              maxYear={retirementYear + 10}
            />
          )}

          {/* Impact summary */}
          {impactSummary.enabledCount > 0 && (
            <div className="ahv-card" style={{ marginTop: 16 }}>
              <div className="ahv-row">
                <div>
                  <div className="ahv-row-label">Geplante Sonderausgaben total</div>
                  <div className="ahv-row-sub">
                    Vor Pensionierung: CHF {fmtCHF(impactSummary.beforeRetirement)}
                    {impactSummary.afterRetirement > 0 && ` · Nach Pensionierung: CHF ${fmtCHF(impactSummary.afterRetirement)}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="ahv-row-val" style={{ color: '#ef4444' }}>
                    − CHF {fmtCHF(impactSummary.totalOutflow)}
                  </div>
                </div>
              </div>
              {impactSummary.totalInflow > 0 && (
                <div className="ahv-row">
                  <div>
                    <div className="ahv-row-label">Erwartete Zuflüsse</div>
                    <div className="ahv-row-sub">Erbschaften und sonstige Einnahmen</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="ahv-row-val" style={{ color: '#22c55e' }}>
                      + CHF {fmtCHF(impactSummary.totalInflow)}
                    </div>
                  </div>
                </div>
              )}
              <div className="ahv-row ahv-total">
                <div>
                  <div className="ahv-row-label">Nettoauswirkung auf Vermögen</div>
                  <div className="ahv-row-sub">Kumulierter Effekt aller Ereignisse</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="ahv-row-val" style={{ color: impactSummary.netImpact >= 0 ? '#22c55e' : '#ef4444' }}>
                    {impactSummary.netImpact >= 0 ? '+' : '−'}CHF {fmtCHF(Math.abs(impactSummary.netImpact))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <p style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 14, marginBottom: 0, lineHeight: 1.55 }}>
            Lebensereignisse sind Annahmen. Die tatsächlichen Kosten können abweichen.
            Passen Sie die Beträge Ihrer Situation an. Bei komplexen Themen (Immobilie, Scheidung)
            empfehlen wir zusätzlich eine Fachberatung.
          </p>
        </section>

        {/* Summary sticky */}
        {baseTotal > 0 && (
          <div className="summary-sticky">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div className="summary-sticky-label">Ihr monatliches Budget</div>
              <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>
                {Math.round((retirementTotal / bfsRef) * 100)}% des BFS-⌀
              </div>
            </div>
            <div className="summary-sticky-val">CHF {fmtCHF(retirementTotal)}/Mt.</div>
            <div className="summary-pct-bar">
              <div
                className={`summary-pct-fill ${budgetStatus}`}
                style={{ width: `${Math.min(100, (retirementTotal / (bfsRef * 1.5)) * 100)}%` }}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 6 }}>
              {budgetStatus === 'good' && '✓ Unter dem Rentner-Haushalt-Durchschnitt'}
              {budgetStatus === 'warn' && '≈ Im Bereich des Rentner-Haushalts-Durchschnitts'}
              {budgetStatus === 'bad' && '⚡ Deutlich über dem Rentner-Haushalt-Durchschnitt'}
            </div>
          </div>
        )}

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-400)', textAlign: 'center', paddingTop: 24, paddingBottom: 4 }}>
          <Link to="/impressum" style={{ color: 'var(--ink-400)' }}>Impressum</Link>
          {' · '}
          <Link to="/datenschutz" style={{ color: 'var(--ink-400)' }}>Datenschutz</Link>
          {' · '}© 2026 WealthWise
        </div>
      </main>

      <div className="footer">
        <div className="footer-meta">Schritt 3 von 4 · Ausgaben</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/schritt/2')}>← Zurück</button>
          <button
            className="btn btn-primary"
            onClick={() => {
              const total = retirementTotal > 0 ? retirementTotal : baseTotal
              setExpenses({ mode, simpleTotal: total })
              navigate('/schritt/4')
            }}
          >
            Weiter →
          </button>
        </div>
      </div>

      <ChatPanel currentStep="ausgaben" />
    </div>
  )
}
