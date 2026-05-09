import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import TopBar from '../components/TopBar'
import ProgressBar from '../components/ProgressBar'
import ChatPanel from '../components/ChatPanel'
import { useStore } from '../store'
import { fmtCHF } from '../lib/calc'

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

export default function Screen3() {
  const navigate = useNavigate()
  const { expenses, setExpenses, persons, person1, hasPartner } = useStore()
  const isPaar = hasPartner

  const [mode, setMode] = useState<'simple' | 'detailed'>(expenses.mode)
  const [retirementAdjust, setRetirementAdjust] = useState<number>(1.0)

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
