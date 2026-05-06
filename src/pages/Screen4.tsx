import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Area, AreaChart, BarChart, Bar
} from 'recharts'
import TopBar from '../components/TopBar'
import ProgressBar from '../components/ProgressBar'
import ChatPanel from '../components/ChatPanel'
import { useStore, getPersonsForCalc } from '../store'
import { fmtCHF, calculateAge } from '../lib/calc'
import { calculateProAnalysis, calculateScenarios } from '../lib/cashflow'
import { exportPDF } from '../lib/pdf'

function ScoreRing({ score, verdict }: { score: number; verdict: string }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ
  const color = verdict === 'green' ? '#22c55e' : verdict === 'yellow' ? '#f59e0b' : '#ef4444'
  return (
    <svg width={130} height={130} viewBox="0 0 130 130">
      <circle cx={65} cy={65} r={r} fill="none" stroke="var(--ink-100)" strokeWidth={10} />
      <circle cx={65} cy={65} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        transform="rotate(-90 65 65)" />
      <text x={65} y={60} textAnchor="middle" fontSize={28} fontWeight={700} fill={color}
        fontFamily="var(--font-display)">{score}</text>
      <text x={65} y={78} textAnchor="middle" fontSize={11} fill="var(--ink-500)">/100</text>
    </svg>
  )
}

const fmtK = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)}k`
  return String(v)
}

const RECS: Record<string, string[]> = {
  green: [
    'Eure Vorsorge ist solide aufgestellt.',
    'Prüft eine schrittweise Pensionierung für steuerliche Optimierung.',
    'Erwägt, Säule-3a-Gelder gestaffelt über mehrere Jahre zu beziehen.',
    'Überprüft eure Nachlassplanung und gegenseitige Begünstigung.',
  ],
  yellow: [
    'Schliesst allfällige AHV-Beitragslücken durch freiwillige Einzahlungen.',
    'Prüft Einkäufe in die Pensionskasse für Steuereinsparungen.',
    'Maximiert die Säule-3a-Einzahlungen bis zur Pensionierung.',
    'Überprüft, ob eine Weiterarbeit bis 66/67 eure Renten signifikant verbessert.',
  ],
  red: [
    'Dringend: Klärt mögliche PK-Einkäufe zur Verbesserung der Rente.',
    'Prüft, ob ein späterer Rentenbezug (Aufschub) finanziell sinnvoll ist.',
    'Überprüft eure Ausgabensituation und mögliche Sparpotenziale.',
    'Nehmt eine professionelle Vorsorgeberatung in Anspruch.',
  ],
}

export default function Screen4() {
  const navigate = useNavigate()
  const state = useStore()
  const { expenses, person1, person2, hasPartner, location, freeAssets, property } = state
  const [showCashflowTable, setShowCashflowTable] = useState(false)

  const { p1, p2, civilStatus } = useMemo(() => getPersonsForCalc(state), [state])

  const monthlyBudget = useMemo(() => {
    if (expenses.simpleTotal > 0) return expenses.simpleTotal
    if (expenses.mode === 'detailed') {
      const CATS = ['wohnen','gesundheit','nahrung','mobilitaet','freizeit','bekleidung','kommunikation','uebrige']
      const DEFAULTS: Record<string,number> = {wohnen:1476,gesundheit:615,nahrung:1080,mobilitaet:650,freizeit:580,bekleidung:180,kommunikation:200,uebrige:600}
      return CATS.reduce((s, id) => s + (expenses.detailed[id] ?? DEFAULTS[id]), 0)
    }
    return 4000
  }, [expenses])

  const inputData = useMemo(() => ({
    person1: p1,
    person2: p2,
    civilStatus,
    freeAssets: freeAssets || 0,
    monthlyExpenses: monthlyBudget,
    hasProperty: property.has,
    monthlyMortgageCost: property.has ? property.mortgage : 0,
  }), [p1, p2, civilStatus, freeAssets, monthlyBudget, property])

  const analysis = useMemo(() => calculateProAnalysis(inputData), [inputData])
  const scenarios = useMemo(() => calculateScenarios(inputData), [inputData])

  const verdictLabel = analysis.verdict === 'green' ? 'Gut aufgestellt' : analysis.verdict === 'yellow' ? 'Anpassungen empfohlen' : 'Handlungsbedarf'
  const verdictColor = analysis.verdict === 'green' ? 'var(--green-500)' : analysis.verdict === 'yellow' ? 'var(--amber-500)' : 'var(--red-500)'
  const verdictBg = analysis.verdict === 'green' ? 'var(--green-50)' : analysis.verdict === 'yellow' ? '#fffbeb' : '#fef2f2'
  const verdictBorder = analysis.verdict === 'green' ? 'var(--green-200)' : analysis.verdict === 'yellow' ? '#fde68a' : '#fecaca'

  const ra1 = p1.retireAge || p1.retirementAge || 65
  const currentAge1 = p1.dob ? calculateAge(p1.dob) : (p1.birthDate ? calculateAge(p1.birthDate) : 55)

  const chartData = useMemo(() => {
    return analysis.yearlyCashflow
      .filter(r => r.age >= ra1)
      .map(r => ({
        age: r.age,
        vermoegen: Math.max(0, r.wealthEndOfYear),
        einnahmen: Math.round((r.ahvIncome + r.pkRenteIncome) / 12),
        ausgaben: Math.round(r.livingExpenses / 12),
      }))
  }, [analysis, ra1])

  const scenarioChartData = useMemo(() => {
    const ages = scenarios.neutral.yearlyCashflow.filter(r => r.age >= ra1).map(r => r.age)
    return ages.map(age => ({
      age,
      optimistisch: Math.max(0, scenarios.optimistic.yearlyCashflow.find(r => r.age === age)?.wealthEndOfYear || 0),
      neutral: Math.max(0, scenarios.neutral.yearlyCashflow.find(r => r.age === age)?.wealthEndOfYear || 0),
      pessimistisch: Math.max(0, scenarios.pessimistic.yearlyCashflow.find(r => r.age === age)?.wealthEndOfYear || 0),
    }))
  }, [scenarios, ra1])

  const incomeBreakdown = [
    { name: 'AHV', monthly: Math.round(analysis.ahv.combinedYearlyInkl13 / 12), color: '#1a2b4a' },
    { name: 'PK', monthly: Math.round(analysis.pk.combinedYearly / 12), color: '#3b82f6' },
  ]

  const handlePDF = async () => {
    await exportPDF({
      person1Name: person1.name || 'Person 1',
      person2Name: hasPartner ? (person2.name || 'Person 2') : undefined,
      location: location || undefined,
      retirementAge1: ra1,
      analysis,
      monthlyBudget,
    })
  }

  return (
    <div className="app">
      <TopBar screenLabel="Vorsorgeplanung" />
      <ProgressBar current={4} />

      <main>
        <div className="page-head">
          <div className="eyebrow">Schritt 4 · Analyse</div>
          <h1 className="title">{hasPartner ? 'Eure Vorsorgeanalyse' : 'Deine Vorsorgeanalyse'}</h1>
          <p className="subtitle">Basierend auf {hasPartner ? 'euren' : 'deinen'} Angaben berechnet per {new Date().toLocaleDateString('de-CH')}</p>
        </div>

        {/* Verdict Hero */}
        <section className="block" style={{ background: verdictBg, border: `1px solid ${verdictBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <ScoreRing score={analysis.sustainabilityScore} verdict={analysis.verdict} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 4 }}>Nachhaltigkeits-Score</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: verdictColor, marginBottom: 4 }}>
                {verdictLabel}
              </div>
              <div style={{ fontSize: 14, color: 'var(--ink-600)' }}>
                Monatliche Renten: <strong>CHF {fmtCHF(analysis.monthlyIncome.total)}</strong>
                {' · '}Budget: <strong>CHF {fmtCHF(monthlyBudget)}</strong>
                {' · '}
                <span style={{ color: analysis.surplus >= 0 ? 'var(--green-600)' : 'var(--red-500)', fontWeight: 600 }}>
                  {analysis.surplus >= 0 ? '+' : ''}CHF {fmtCHF(analysis.surplus)}/Mt.
                </span>
              </div>
              {analysis.ageWhenBroke && (
                <div style={{ marginTop: 6, fontSize: 13, color: 'var(--red-500)' }}>
                  ⚠ Vermögen reicht bis ca. Alter {analysis.ageWhenBroke}
                </div>
              )}
              {!analysis.ageWhenBroke && (
                <div style={{ marginTop: 6, fontSize: 13, color: 'var(--green-600)' }}>
                  ✓ Vermögen reicht bis Alter 95+
                </div>
              )}
            </div>
            <button className="btn btn-ghost" onClick={handlePDF} style={{ alignSelf: 'flex-start' }}>
              ↓ PDF
            </button>
          </div>
        </section>

        {/* Income pillars */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">A</span>Renteneinnahmen im Überblick</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              {
                label: 'AHV (1. Säule)', icon: '🏛️',
                monthly: Math.round(analysis.ahv.combinedYearlyInkl13 / 12),
                sub: `inkl. 13. AHV-Rente · CHF ${fmtCHF(analysis.ahv.combinedYearlyInkl13)}/Jahr`,
              },
              {
                label: 'Pensionskasse (2. Säule)', icon: '🏦',
                monthly: Math.round(analysis.pk.combinedYearly / 12),
                sub: `CHF ${fmtCHF(analysis.pk.combinedYearly)}/Jahr`,
              },
              {
                label: 'Total Renten', icon: '💰',
                monthly: analysis.monthlyIncome.total,
                sub: `CHF ${fmtCHF(analysis.monthlyIncome.total * 12)}/Jahr`,
                highlight: true,
              },
            ].map((card) => (
              <div key={card.label} style={{
                padding: '16px 18px',
                background: card.highlight ? 'var(--navy-800)' : 'var(--navy-50)',
                border: `1px solid ${card.highlight ? 'var(--navy-700)' : 'var(--navy-100)'}`,
                borderRadius: 12,
              }}>
                <div style={{ fontSize: 13, color: card.highlight ? 'rgba(255,255,255,.6)' : 'var(--ink-500)', marginBottom: 2 }}>
                  {card.icon} {card.label}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: card.highlight ? 'white' : 'var(--navy-800)' }}>
                  CHF {fmtCHF(card.monthly)}/Mt.
                </div>
                <div style={{ fontSize: 11, color: card.highlight ? 'rgba(255,255,255,.5)' : 'var(--ink-400)', marginTop: 2 }}>
                  {card.sub}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: analysis.surplus >= 0 ? 'var(--green-50)' : '#fef2f2', border: `1px solid ${analysis.surplus >= 0 ? 'var(--green-200)' : '#fecaca'}`, borderRadius: 12 }}>
            <div style={{ fontSize: 20 }}>{analysis.surplus >= 0 ? '✓' : '⚠'}</div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>Monatliche Differenz (Renten − Budget)</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: analysis.surplus >= 0 ? 'var(--green-600)' : 'var(--red-500)' }}>
                {analysis.surplus >= 0 ? '+' : ''}CHF {fmtCHF(analysis.surplus)}/Mt. · {analysis.surplus >= 0 ? 'Überschuss' : 'Lücke'}
              </div>
            </div>
          </div>
        </section>

        {/* Wealth chart */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">B</span>Vermögensverlauf bis Alter 95</h2>
            <span className="block-hint">Neutrale Annahmen: 1.5% Inflation, 2.5% Rendite</span>
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a2b4a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1a2b4a" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-100)" />
                <XAxis dataKey="age" tick={{ fontSize: 11, fill: 'var(--ink-400)' }} label={{ value: 'Alter', position: 'insideBottomRight', offset: -4, fontSize: 11 }} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: 'var(--ink-400)' }} width={60} />
                <Tooltip
                  formatter={(v: number, name: string) => [`CHF ${fmtCHF(v)}`, name === 'vermoegen' ? 'Vermögen' : name === 'einnahmen' ? 'Renteneinnahmen/Mt.' : 'Ausgaben/Mt.']}
                  labelFormatter={(l) => `Alter ${l}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--ink-200)' }}
                />
                {analysis.ageWhenBroke && (
                  <ReferenceLine x={analysis.ageWhenBroke} stroke="#ef4444" strokeDasharray="4 4"
                    label={{ value: `Vermögen aufgebraucht`, fill: '#ef4444', fontSize: 10, position: 'top' }} />
                )}
                <Area type="monotone" dataKey="vermoegen" stroke="#1a2b4a" strokeWidth={2.5}
                  fill="url(#wealthGrad)" name="vermoegen" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-400)', fontSize: 14 }}>
              Gib Geburtsdatum und Pensionierungsalter in Schritt 1 ein.
            </div>
          )}
        </section>

        {/* Scenarios */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">C</span>Szenarien</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { key: 'optimistic', label: 'Optimistisch', color: '#22c55e', bg: 'var(--green-50)', border: 'var(--green-200)', data: scenarios.optimistic, sub: 'Inflation 1.0% · Rendite 4.5%' },
              { key: 'neutral', label: 'Neutral', color: '#1a2b4a', bg: 'var(--navy-50)', border: 'var(--navy-100)', data: scenarios.neutral, sub: 'Inflation 1.5% · Rendite 2.5%' },
              { key: 'pessimistic', label: 'Pessimistisch', color: '#ef4444', bg: '#fef2f2', border: '#fecaca', data: scenarios.pessimistic, sub: 'Inflation 2.5% · Rendite 1.0%' },
            ].map((sc) => (
              <div key={sc.key} style={{ padding: '16px 18px', background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>{sc.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: sc.color }}>
                  CHF {fmtCHF(sc.data.monthlyIncome.total)}/Mt.
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>{sc.sub}</div>
                <div style={{ fontSize: 12, marginTop: 6, color: sc.data.surplus >= 0 ? 'var(--green-600)' : 'var(--red-500)' }}>
                  {sc.data.surplus >= 0 ? '+' : ''}CHF {fmtCHF(sc.data.surplus)}/Mt.
                </div>
                {sc.data.ageWhenBroke ? (
                  <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>Reicht bis Alter {sc.data.ageWhenBroke}</div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--green-600)', marginTop: 2 }}>Reicht bis 95+</div>
                )}
              </div>
            ))}
          </div>

          {scenarioChartData.length > 0 && (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={scenarioChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-100)" />
                <XAxis dataKey="age" tick={{ fontSize: 11, fill: 'var(--ink-400)' }} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: 'var(--ink-400)' }} width={60} />
                <Tooltip
                  formatter={(v: number, name: string) => [`CHF ${fmtCHF(v)}`, name === 'optimistisch' ? 'Optimistisch' : name === 'neutral' ? 'Neutral' : 'Pessimistisch']}
                  labelFormatter={(l) => `Alter ${l}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="optimistisch" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="neutral" stroke="#1a2b4a" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pessimistisch" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* AHV Detail */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">D</span>AHV-Details</h2>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              { name: person1.name || 'Person 1', data: analysis.ahv.person1 },
              ...(hasPartner && analysis.ahv.person2 ? [{ name: person2.name || 'Person 2', data: analysis.ahv.person2 }] : []),
            ].map((item) => (
              <div key={item.name} style={{ padding: '14px 16px', background: 'var(--navy-50)', border: '1px solid var(--navy-100)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy-800)' }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>
                    Ø-Einkommen: CHF {fmtCHF(item.data.avgIncomeUsed || 0)} · 44 Beitragsjahre
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--navy-800)' }}>
                    CHF {fmtCHF(item.data.monthlyRente)}/Mt.
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                    CHF {fmtCHF(item.data.yearlyInkl13)}/Jahr (inkl. 13.)
                  </div>
                </div>
              </div>
            ))}
            {analysis.ahv.plafonReduction > 0 && (
              <div style={{ padding: '10px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 13, color: 'var(--ink-600)' }}>
                Ehepaar-Plafonierung: −CHF {fmtCHF(analysis.ahv.plafonReduction)}/Mt. (max. 150% der Maximalrente)
              </div>
            )}
          </div>
        </section>

        {/* Recommendations */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">E</span>Handlungsempfehlungen</h2>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {RECS[analysis.verdict].map((rec, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', background: verdictBg, border: `1px solid ${verdictBorder}`, borderRadius: 10 }}>
                <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: verdictColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.5 }}>{rec}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Cashflow table (collapsible) */}
        <section className="block">
          <div className="block-head" style={{ cursor: 'pointer' }} onClick={() => setShowCashflowTable(!showCashflowTable)}>
            <h2 className="block-title"><span className="block-num">F</span>Jahres-Cashflow (Tabelle)</h2>
            <span className="block-hint">{showCashflowTable ? '▲ Einklappen' : '▼ Ausklappen'}</span>
          </div>
          {showCashflowTable && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--navy-800)', color: 'white' }}>
                    {['Alter', 'AHV/Jahr', 'PK/Jahr', 'Ausgaben/Jahr', 'Vermögen'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysis.yearlyCashflow.filter(r => r.age >= ra1).map((row, i) => (
                    <tr key={row.age} style={{ background: i % 2 === 0 ? 'white' : 'var(--navy-50)', borderBottom: '1px solid var(--ink-100)' }}>
                      <td style={{ padding: '6px 12px', fontWeight: row.isRetirementYear ? 700 : 400, color: 'var(--navy-800)' }}>
                        {row.age}{row.isRetirementYear ? ' ★' : ''}
                      </td>
                      <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--ink-700)' }}>
                        {row.ahvIncome > 0 ? `CHF ${fmtCHF(row.ahvIncome)}` : '—'}
                      </td>
                      <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--ink-700)' }}>
                        {row.pkRenteIncome > 0 ? `CHF ${fmtCHF(row.pkRenteIncome)}` : '—'}
                      </td>
                      <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--ink-700)' }}>
                        CHF {fmtCHF(row.livingExpenses)}
                      </td>
                      <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600, color: row.wealthEndOfYear <= 0 ? '#ef4444' : 'var(--navy-800)' }}>
                        CHF {fmtCHF(Math.max(0, row.wealthEndOfYear))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Actions */}
        <section className="block" style={{ background: 'var(--navy-50)', border: '1px solid var(--navy-100)' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handlePDF}>
              ↓ PDF-Analyse herunterladen
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/schritt/1')}>
              ← Analyse anpassen
            </button>
            <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-400)' }}>
              Diese Analyse ersetzt keine professionelle Beratung.
            </div>
          </div>
        </section>
      </main>

      <div className="footer">
        <div className="footer-meta">Schritt 4 von 4 · Analyse</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/schritt/3')}>← Zurück</button>
          <button className="btn btn-primary" onClick={handlePDF}>PDF exportieren</button>
        </div>
      </div>

      <ChatPanel currentStep="analyse" />
    </div>
  )
}
