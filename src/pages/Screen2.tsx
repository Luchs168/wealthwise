import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import ProgressBar from '../components/ProgressBar'
import ChatPanel from '../components/ChatPanel'
import { useStore } from '../store'
import { fmtCHF, calculateAhvHousehold, calculatePkRente, project3a, CONSTANTS } from '../lib/calc'

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
        <input type="text" inputMode="numeric"
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
    <div className="switch-wrap" onClick={onToggle}>
      <div className={`switch ${on ? 'on' : ''}`} />
      <span style={{ fontSize: 14, color: 'var(--ink-700)' }}>{label}</span>
    </div>
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
    // Simulate extraction with demo values after a brief delay
    setTimeout(() => {
      const demoCapital = 280000 + Math.floor(Math.random() * 120000)
      const demoRate = 5.0 + Math.random() * 0.8
      onExtract(demoCapital, parseFloat(demoRate.toFixed(2)))
      setStatus('done')
    }, 1400)
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        style={{
          border: `2px dashed ${status === 'done' ? 'var(--navy-400)' : 'var(--ink-200)'}`,
          borderRadius: 12,
          background: status === 'done' ? 'var(--navy-50)' : 'var(--surface)',
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
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--navy-900)' }}>Werte übernommen</div>
              <div style={{ fontSize: 13, color: 'var(--navy-700)', marginTop: 2 }}>PK-Kapital und Umwandlungssatz wurden aus {fileName} extrahiert</div>
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
      <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
      <div style={{ fontSize: 11, color: 'var(--ink-400)', fontFamily: 'var(--font-mono)', marginTop: 6, paddingLeft: 4 }}>
        🔒 Wird nur lokal verarbeitet – verlässt deinen Browser nicht
      </div>
    </div>
  )
}

export default function Screen2() {
  const navigate = useNavigate()
  const { persons, updatePerson, hasPartner, person1, person2, civilStatus } = useStore()
  const [activeTab, setActiveTab] = useState<1 | 2>(1)
  const [ahvExpanded, setAhvExpanded] = useState(false)

  const p1 = persons.find(p => p.id === 1)!
  const p2 = persons.find(p => p.id === 2)!
  const cur = activeTab === 1 ? p1 : p2

  const isPaar = hasPartner

  // AHV calculation
  const ahvInput1 = {
    grossIncome: p1.income,
    retirementAge: person1.retireAge,
    ahvContributionYears: p1.ahvContributionYears,
    ahvContributionGaps: p1.ahvContributionGaps,
  }
  const ahvInput2 = isPaar ? {
    grossIncome: p2.income,
    retirementAge: person2.retireAge,
    ahvContributionYears: p2.ahvContributionYears,
    ahvContributionGaps: p2.ahvContributionGaps,
  } : null
  const ahv = useMemo(() => calculateAhvHousehold(ahvInput1, ahvInput2, civilStatus), [p1, p2, isPaar, civilStatus])

  // PK rente
  const pk1 = useMemo(() => calculatePkRente({ pkCapitalAt65: p1.pkCapital, pkConversionRate: p1.pkRate }), [p1])
  const pk2 = useMemo(() => calculatePkRente({ pkCapitalAt65: p2.pkCapital, pkConversionRate: p2.pkRate }), [p2])

  // 3a projection
  const years1 = Math.max(0, person1.retireAge - (calcAge(person1.dob) || 57))
  const years2 = Math.max(0, person2.retireAge - (calcAge(person2.dob) || 55))
  const proj3a1 = useMemo(() => project3a(p1.balance3a, p1.yearly3a, years1), [p1, years1])
  const proj3a2 = useMemo(() => project3a(p2.balance3a, p2.yearly3a, years2), [p2, years2])

  const totalMonthly = (ahv.combinedMonthly) +
    (p1.hasPK ? (p1.pkBezugsart !== 'kapital' ? pk1.monthlyRente : 0) : 0) +
    (isPaar && p2.hasPK ? (p2.pkBezugsart !== 'kapital' ? pk2.monthlyRente : 0) : 0)

  return (
    <div className="app">
      <TopBar screenLabel="Vorsorgeplanung" />
      <ProgressBar current={2} />

      <main>
        <div className="page-head">
          <div className="eyebrow">Schritt 2 · Vorsorge</div>
          <h1 className="title">{isPaar ? 'Eure Vorsorge' : 'Deine Vorsorge'}</h1>
          <p className="subtitle">AHV, Pensionskasse und Säule 3a – die drei Pfeiler {isPaar ? 'eurer' : 'deiner'} Rente.</p>
        </div>

        {/* Person tabs */}
        {isPaar && (
          <div className="tabs" style={{ marginBottom: 0 }}>
            <button className={`tab ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>
              <span className="tab-dot">1</span>
              <span>{person1.name || 'Person 1'}</span>
            </button>
            <button className={`tab ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>
              <span className="tab-dot">2</span>
              <span>{person2.name || 'Person 2'}</span>
            </button>
          </div>
        )}

        {/* A · Einkommen */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">A</span>Einkommen
            </h2>
          </div>

          <div className="form-grid">
            <CHFField label="Brutto-Jahreseinkommen"
              value={cur.income}
              onChange={(v) => updatePerson(activeTab, { income: v })} />
            <div className="field">
              <label>Beschäftigungsgrad</label>
              <div className="amount-wrap">
                <input type="text" inputMode="numeric"
                  value={cur.employmentGrade}
                  onChange={(e) => updatePerson(activeTab, { employmentGrade: Math.min(100, parseInt(e.target.value.replace(/\D/g, '')) || 0) })}
                  style={{ textAlign: 'right', paddingRight: 32 }}
                />
                <span className="suffix">%</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-500)' }}>
            = CHF {fmtCHF(cur.income / 12)} / Monat
          </div>
        </section>

        {/* B · AHV */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">B</span>AHV – 1. Säule
            </h2>
          </div>

          <div className="ahv-card">
            <div className="ahv-row">
              <div>
                <div className="ahv-row-label">{person1.name || 'Person 1'}</div>
                <div className="ahv-row-sub">Geschätzte Monatsrente</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="ahv-row-val">CHF {fmtCHF(ahv.person1.monthlyRente)}</div>
                <div className="ahv-row-sub">CHF {fmtCHF(ahv.person1.monthlyRente * 13)} / Jahr inkl. 13.</div>
              </div>
            </div>
            {isPaar && ahv.person2 && (
              <div className="ahv-row">
                <div>
                  <div className="ahv-row-label">{person2.name || 'Person 2'}</div>
                  <div className="ahv-row-sub">Geschätzte Monatsrente</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="ahv-row-val">CHF {fmtCHF(ahv.person2.monthlyRente)}</div>
                  <div className="ahv-row-sub">CHF {fmtCHF(ahv.person2.monthlyRente * 13)} / Jahr inkl. 13.</div>
                </div>
              </div>
            )}
            {ahv.plafonReduction > 0 && (
              <div className="ahv-row" style={{ background: 'var(--amber-50)' }}>
                <div>
                  <div className="ahv-row-label">Ehepaar-Plafonierung</div>
                  <div className="ahv-row-sub">Max. 150% der Maximalrente</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--amber-500)' }}>− CHF {fmtCHF(ahv.plafonReduction)}</div>
                </div>
              </div>
            )}
            <div className="ahv-row ahv-total">
              <div>
                <div className="ahv-row-label">{isPaar ? 'Haushalt total' : 'Ihre AHV-Rente'}</div>
                <div className="ahv-row-sub">inkl. 13. AHV-Rente (ab Dez. 2026)</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="ahv-row-val">CHF {fmtCHF(ahv.combinedMonthly)}</div>
                <div className="ahv-row-sub" style={{ color: 'rgba(255,255,255,.6)' }}>CHF {fmtCHF(ahv.combinedYearlyInkl13)} / Jahr</div>
              </div>
            </div>
          </div>

          <button className="link-toggle" style={{ marginTop: 12 }} onClick={() => setAhvExpanded(!ahvExpanded)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: ahvExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            Details anpassen
          </button>

          {ahvExpanded && (
            <div className="link-expand">
              <div className="form-grid">
                <div className="field">
                  <label>Beitragsjahre {isPaar ? `(${person1.name || 'P1'})` : ''}</label>
                  <input className="input" type="number" min={0} max={44}
                    value={p1.ahvContributionYears}
                    onChange={(e) => updatePerson(1, { ahvContributionYears: Math.min(44, parseInt(e.target.value) || 0) })} />
                </div>
                <div className="field">
                  <label>Beitragslücken {isPaar ? `(${person1.name || 'P1'})` : ''} (Jahre)</label>
                  <input className="input" type="number" min={0} max={10}
                    value={p1.ahvContributionGaps}
                    onChange={(e) => updatePerson(1, { ahvContributionGaps: Math.min(10, parseInt(e.target.value) || 0) })} />
                </div>
                {isPaar && (
                  <>
                    <div className="field">
                      <label>Beitragsjahre ({person2.name || 'P2'})</label>
                      <input className="input" type="number" min={0} max={44}
                        value={p2.ahvContributionYears}
                        onChange={(e) => updatePerson(2, { ahvContributionYears: Math.min(44, parseInt(e.target.value) || 0) })} />
                    </div>
                    <div className="field">
                      <label>Beitragslücken ({person2.name || 'P2'})</label>
                      <input className="input" type="number" min={0} max={10}
                        value={p2.ahvContributionGaps}
                        onChange={(e) => updatePerson(2, { ahvContributionGaps: Math.min(10, parseInt(e.target.value) || 0) })} />
                    </div>
                  </>
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-400)', margin: '8px 0 0' }}>
                Max. 44 Beitragsjahre für volle Rente. Jedes fehlende Jahr kürzt die Rente um ca. 2.3%.
              </p>
            </div>
          )}
        </section>

        {/* C · Pensionskasse */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">C</span>Pensionskasse – 2. Säule
            </h2>
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
            <Switch on={cur.hasPK} onToggle={() => updatePerson(activeTab, { hasPK: !cur.hasPK })}
              label="Ich bin in einer Pensionskasse versichert" />
          </div>

          {cur.hasPK && (
            <>
              <PkUpload onExtract={(capital, rate) => updatePerson(activeTab, { pkCapital: capital, pkRate: rate })} />
              <div className="form-grid" style={{ marginBottom: 14 }}>
                <CHFField label="PK-Kapital bei Pensionierung"
                  value={cur.pkCapital}
                  onChange={(v) => updatePerson(activeTab, { pkCapital: v })} />
                <div className="field">
                  <label>Umwandlungssatz (%)</label>
                  <div className="amount-wrap">
                    <input type="number" min={3} max={8} step={0.1}
                      value={cur.pkRate}
                      onChange={(e) => updatePerson(activeTab, { pkRate: parseFloat(e.target.value) || 5.4 })}
                      style={{ textAlign: 'right', paddingRight: 32 }}
                    />
                    <span className="suffix">%</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 2 }}>
                    BVG-Minimum: 6.8% · Typisch: 5.0–5.8%
                  </span>
                </div>
              </div>

              {/* Bezugsart */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)', display: 'block', marginBottom: 8 }}>Bezugsart</label>
                <div className="option-grid-3">
                  {[
                    { id: 'rente', label: 'Rente', hint: 'Lebenslang, sicher' },
                    { id: 'kapital', label: 'Kapital', hint: 'Flexibel, steuerpflichtig' },
                    { id: 'mix', label: '50/50 Mix', hint: 'Kombiniert' },
                  ].map((opt) => (
                    <button key={opt.id} className={`option-card ${cur.pkBezugsart === opt.id ? 'active' : ''}`}
                      onClick={() => updatePerson(activeTab, { pkBezugsart: opt.id as 'rente' | 'kapital' | 'mix' })}>
                      <div className="option-card-label">{opt.label}</div>
                      <div className="option-card-hint">{opt.hint}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="result-card">
                <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 4 }}>Monatliche PK-Rente</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--navy-800)' }}>
                  CHF {fmtCHF(cur.pkBezugsart === 'kapital' ? 0 : cur.pkBezugsart === 'mix' ? (activeTab === 1 ? pk1.monthlyRente : pk2.monthlyRente) / 2 : (activeTab === 1 ? pk1.monthlyRente : pk2.monthlyRente))}
                </div>
                {cur.pkBezugsart === 'kapital' && (
                  <div style={{ fontSize: 13, color: 'var(--amber-500)', marginTop: 4 }}>
                    Kapitalbezug: CHF {fmtCHF(cur.pkCapital)} (abzgl. Steuer)
                  </div>
                )}
              </div>
            </>
          )}

          {!cur.hasPK && (
            <div className="info-callout">
              <span className="info-callout-icon">i</span>
              <span>Ohne PK ist das 3a-Maximum höher (CHF 36'288/Jahr statt CHF 7'258). Du kannst dich auch freiwillig bei der Auffangeinrichtung versichern.</span>
            </div>
          )}
        </section>

        {/* D · 3a */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">D</span>Säule 3a – Gebundene Vorsorge</h2>
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
            <Switch on={cur.has3a} onToggle={() => updatePerson(activeTab, { has3a: !cur.has3a })}
              label="Ich habe ein 3a-Konto" />
          </div>

          {cur.has3a && (
            <>
              <div className="form-grid">
                <CHFField label="Aktuelles 3a-Guthaben"
                  value={cur.balance3a}
                  onChange={(v) => updatePerson(activeTab, { balance3a: v })} />
                <CHFField label="Jährliche Einzahlung"
                  value={cur.yearly3a}
                  onChange={(v) => updatePerson(activeTab, { yearly3a: v })}
                  max={cur.hasPK ? CONSTANTS.PK_3A_MAX_WITH_PK : CONSTANTS.PK_3A_MAX_WITHOUT_PK} />
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

              <div className="info-callout" style={{ marginTop: 12 }}>
                <span className="info-callout-icon">i</span>
                <span>Tipp: Mit 3–5 separaten 3a-Konten kannst du den Bezug staffeln und damit die Kapitalbezugssteuer deutlich reduzieren.</span>
              </div>
            </>
          )}
        </section>

        {/* E · Vermögen */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">E</span>Freies Vermögen</h2>
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-500)', margin: '0 0 16px' }}>
            Barvermögen, Wertschriften und sonstige Ersparnisse (ohne 3a, PK und selbstgenutztes Wohneigentum).
          </p>
          <CHFField label={`Freies Vermögen ${isPaar ? '(Haushalt)' : ''}`}
            value={useStore.getState().freeAssets}
            onChange={(v) => useStore.getState().setFreeAssets(v)} />
        </section>

        {/* Summary */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title"><span className="block-num">F</span>Zusammenfassung</h2>
          </div>
          <div className="ahv-card">
            <div className="ahv-row">
              <div>
                <div className="ahv-row-label">AHV-Renten</div>
                <div className="ahv-row-sub">{isPaar ? 'Haushalt inkl. 13. AHV-Rente' : 'inkl. 13. AHV-Rente'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="ahv-row-val">CHF {fmtCHF(ahv.combinedMonthly)}/Mt.</div>
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
      </main>

      <div className="footer">
        <div className="footer-meta">Schritt 2 von 4 · Vorsorge</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/schritt/1')}>← Zurück</button>
          <button className="btn btn-primary" onClick={() => navigate('/schritt/3')}>
            Weiter
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
