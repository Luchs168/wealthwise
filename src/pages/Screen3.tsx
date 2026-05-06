import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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

const BFS_RENTNER_TOTAL = 3381

function parseNum(s: string | number): number {
  if (typeof s === 'number') return s
  return parseInt(String(s).replace(/[^0-9]/g, '')) || 0
}

function AmountInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [raw, setRaw] = useState('')
  const [focused, setFocused] = useState(false)
  return (
    <input className="cat-amount" type="text" inputMode="numeric"
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

  const p1 = persons.find(p => p.id === 1)!
  const income1 = p1.income
  const income2 = hasPartner ? (persons.find(p => p.id === 2)?.income || 0) : 0
  const totalIncome = income1 + income2

  // Simple mode calculation
  const pct = expenses.goal === 'custom'
    ? 100
    : parseInt(expenses.goal || '80')
  const simpleGoalCHF = expenses.goal === 'custom'
    ? expenses.customAmount
    : Math.round((totalIncome * 0.85 * pct) / 100 / 12)

  // Detailed total
  const detailedTotal = useMemo(() => {
    return CATEGORIES.reduce((sum, cat) => sum + (expenses.detailed[cat.id] || cat.bfsMonthly), 0)
  }, [expenses.detailed])

  const currentTotal = mode === 'simple' ? expenses.simpleTotal : detailedTotal
  const pctOfBFS = currentTotal > 0 ? Math.round((currentTotal / BFS_RENTNER_TOTAL) * 100) : 0

  const budgetStatus = currentTotal < BFS_RENTNER_TOTAL * 0.8
    ? 'good'
    : currentTotal < BFS_RENTNER_TOTAL * 1.1
    ? 'warn'
    : 'bad'

  const syncToStore = () => {
    setExpenses({
      mode,
      simpleTotal: mode === 'simple' ? (expenses.simpleTotal || simpleGoalCHF) : detailedTotal,
    })
  }

  return (
    <div className="app">
      <TopBar screenLabel="Vorsorgeplanung" />
      <ProgressBar current={3} />

      <main>
        <div className="page-head">
          <div className="eyebrow">Schritt 3 · Ausgaben</div>
          <h1 className="title">{isPaar ? 'Euer Budget im Alter' : 'Dein Budget im Alter'}</h1>
          <p className="subtitle">Wie viel {isPaar ? 'braucht ihr' : 'brauchst du'} monatlich nach der Pensionierung?</p>
        </div>

        {/* Variant toggle */}
        <div className="variant-toggle">
          <button className={`variant-btn ${mode === 'simple' ? 'active' : ''}`}
            onClick={() => { setMode('simple'); setExpenses({ mode: 'simple' }) }}>
            Einfach
          </button>
          <button className={`variant-btn ${mode === 'detailed' ? 'active' : ''}`}
            onClick={() => { setMode('detailed'); setExpenses({ mode: 'detailed' }) }}>
            Detailliert
          </button>
        </div>

        {/* Simple mode */}
        {mode === 'simple' && (
          <>
            <section className="block">
              <div className="block-head">
                <h2 className="block-title"><span className="block-num">A</span>Budget-Ziel</h2>
              </div>

              <div className="info-callout" style={{ marginBottom: 20 }}>
                <span className="info-callout-icon">i</span>
                <span>
                  Gemäss BFS (HABE 2022) gibt ein Rentner-Haushalt im Schnitt CHF {fmtCHF(BFS_RENTNER_TOTAL)}/Mt. aus.
                  Als Faustregel gelten 80% des letzten Nettoeinkommens.
                </span>
              </div>

              <div className="pct-radio-group">
                {['70', '80', '90'].map((p) => {
                  const chf = Math.round((totalIncome * 0.85 * parseInt(p)) / 100 / 12)
                  return (
                    <div key={p} className={`pct-radio ${expenses.goal === p ? 'active' : ''}`}
                      onClick={() => setExpenses({ goal: p as '70' | '80' | '90' })}>
                      <div className="pct-dot" />
                      <div className="pct-pct">{p}%</div>
                      <div className="pct-label">{p === '80' ? '⭐ Empfohlen' : p === '70' ? 'Minimal' : 'Komfortabel'}</div>
                      {totalIncome > 0 && <div className="pct-chf">≈ CHF {fmtCHF(chf)}/Mt.</div>}
                    </div>
                  )
                })}
              </div>

              <div className={`pct-radio ${expenses.goal === 'custom' ? 'active' : ''}`} style={{ marginBottom: 0 }}
                onClick={() => setExpenses({ goal: 'custom' })}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="pct-dot" />
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Eigener Betrag</span>
                </div>
                {expenses.goal === 'custom' && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, color: 'var(--ink-500)' }}>CHF</span>
                    <input className="input" type="text" inputMode="numeric"
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

              {/* Set simpleTotal from goal */}
              <div style={{ marginTop: 16, padding: '14px 18px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>Monatliches Zielbudget</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--navy-800)' }}>
                  CHF {fmtCHF(expenses.goal === 'custom' ? expenses.customAmount : simpleGoalCHF)}/Mt.
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 2 }}>
                  CHF {fmtCHF((expenses.goal === 'custom' ? expenses.customAmount : simpleGoalCHF) * 12)}/Jahr
                </div>
              </div>
            </section>
          </>
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
              <span>Vorausgefüllt mit BFS-Durchschnittswerten für Rentner-Haushalte. Passe die Werte auf {isPaar ? 'euren' : 'deinen'} Lebensstil an.</span>
            </div>

            <div className="cat-list">
              {CATEGORIES.map((cat) => {
                const val = expenses.detailed[cat.id] !== undefined ? expenses.detailed[cat.id] : cat.bfsMonthly
                const maxCat = cat.bfsMonthly * 3
                const pctFill = Math.min(100, (val / (cat.bfsMonthly * 2)) * 100)
                const avgPct = 50 // avg marker is at 50% (which is cat.bfsMonthly / (cat.bfsMonthly * 2))
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
                      <AmountInput value={val}
                        onChange={(v) => setExpenses({ detailed: { ...expenses.detailed, [cat.id]: v } })} />
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
                <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>BFS Rentner-⌀</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--ink-500)' }}>CHF {fmtCHF(BFS_RENTNER_TOTAL)}/Mt.</div>
              </div>
            </div>
          </section>
        )}

        {/* Summary sticky */}
        {currentTotal > 0 && (
          <div className="summary-sticky">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div className="summary-sticky-label">{isPaar ? 'Euer' : 'Dein'} monatliches Budget</div>
              <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>{pctOfBFS}% des Rentner-⌀</div>
            </div>
            <div className="summary-sticky-val">CHF {fmtCHF(currentTotal)}/Mt.</div>
            <div className="summary-pct-bar">
              <div className={`summary-pct-fill ${budgetStatus}`}
                style={{ width: `${Math.min(100, (currentTotal / (BFS_RENTNER_TOTAL * 1.5)) * 100)}%` }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 6 }}>
              {budgetStatus === 'good' && '✓ Unter dem Rentner-Haushalt-Durchschnitt'}
              {budgetStatus === 'warn' && '≈ Im Bereich des Rentner-Haushalts-Durchschnitts'}
              {budgetStatus === 'bad' && '⚡ Deutlich über dem Rentner-Haushalt-Durchschnitt'}
            </div>
          </div>
        )}
      </main>

      <div className="footer">
        <div className="footer-meta">Schritt 3 von 4 · Ausgaben</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/schritt/2')}>← Zurück</button>
          <button className="btn btn-primary" onClick={() => {
            // Persist correct total before navigating
            const total = mode === 'simple'
              ? (expenses.goal === 'custom' ? expenses.customAmount : simpleGoalCHF)
              : detailedTotal
            setExpenses({ mode, simpleTotal: total })
            navigate('/schritt/4')
          }}>
            Weiter →
          </button>
        </div>
      </div>

      <ChatPanel currentStep="ausgaben" />
    </div>
  )
}
