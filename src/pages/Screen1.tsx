import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import ProgressBar from '../components/ProgressBar'
import LocationField from '../components/LocationField'
import ChatPanel from '../components/ChatPanel'
import { useStore, CivilStatus } from '../store'

/* ---- Icons ---- */
const Icons = {
  Check: () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 12 10 17 19 7"/></svg>,
  Arrow: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>,
  Lock: () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>,
  Plus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Target: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>,
  Receipt: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/></svg>,
  Gap: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 18h6"/><path d="M15 18h6"/><path d="M9 12h6"/><path d="M12 18V6"/></svg>,
  Early: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="13" r="7"/><path d="M12 9v4l2.5 2"/><path d="M9 3h6"/></svg>,
  Scale: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16"/><path d="M5 8h14"/><path d="M7 8l-3 6a3 3 0 0 0 6 0z"/><path d="M17 8l-3 6a3 3 0 0 0 6 0z"/></svg>,
  Three: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M9 10h6"/><path d="M9 14h6"/></svg>,
  Family: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M3 20c0-3 2.5-5 5-5s5 2 5 5"/><path d="M11 20c0-3 2.5-5 5-5s5 2 5 5"/></svg>,
  PK: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10l8-5 8 5"/><path d="M5 10v9h14v-9"/><path d="M10 19v-5h4v5"/></svg>,
}

const GOALS = [
  { id: 'rente', label: 'Reicht meine Rente?', Icon: Icons.Target, active: true },
  { id: 'steuern', label: 'Steuern sparen', Icon: Icons.Receipt, disabled: true },
  { id: 'luecke', label: 'Vorsorgelücke schliessen', Icon: Icons.Gap, disabled: true },
  { id: 'fruehpens', label: 'Frühpensionierung prüfen', Icon: Icons.Early, disabled: true },
  { id: 'rentevskap', label: 'Rente vs. Kapital', Icon: Icons.Scale, disabled: true },
  { id: 'drei_a', label: '3a optimieren', Icon: Icons.Three, disabled: true },
  { id: 'familie', label: 'Familie absichern', Icon: Icons.Family, disabled: true },
  { id: 'pk_einkauf', label: 'PK-Einkauf prüfen', Icon: Icons.PK, disabled: true },
]

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

export default function Screen1() {
  const navigate = useNavigate()
  const store = useStore()
  const { person1, person2, hasPartner, location, hasChildren, children,
    setHasPartner, setPerson1, setPerson2, setLocation, setHasChildren, setChildren,
    selectedGoal, setGoal } = store

  const [activeTab, setActiveTab] = useState<1 | 2>(1)
  const isCouple = person1.civil === 'verheiratet' || person1.civil === 'partnerschaft'

  useEffect(() => {
    if (!isCouple && hasPartner) setHasPartner(false)
    if (isCouple && !hasPartner) setHasPartner(true)
  }, [isCouple])

  useEffect(() => {
    if (!hasPartner && activeTab === 2) setActiveTab(1)
  }, [hasPartner])

  const isPaar = hasPartner && isCouple
  const t = (s: string, p: string) => isPaar ? p : s
  const age1 = calcAge(person1.dob)
  const age2 = calcAge(person2.dob)

  const handleAddPartner = () => {
    setPerson1({ civil: 'verheiratet' })
    setHasPartner(true)
    setActiveTab(2)
  }

  return (
    <div className="app">
      <TopBar screenLabel="Vorsorgeplanung" />
      <ProgressBar current={1} />

      <main>
        <div className="page-head">
          <div className="eyebrow">Schritt 1 · Situation</div>
          <h1 className="title">{t('Was möchtest du erreichen?', 'Was möchtet ihr erreichen?')}</h1>
          <p className="subtitle">{t('Wir passen die Analyse auf deine Ziele an.', 'Wir passen die Analyse auf eure Ziele an.')}</p>
        </div>

        {/* Block A – Goals */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">A</span>
              {t('Was möchtest du erreichen?', 'Was möchtet ihr erreichen?')}
            </h2>
            <span className="block-hint">Weitere Ziele folgen demnächst</span>
          </div>
          <div className="goal-grid">
            {GOALS.map((g) => (
              <button
                key={g.id}
                className={`goal ${selectedGoal === g.id ? 'active' : ''} ${g.disabled ? 'disabled' : ''}`}
                onClick={g.disabled ? undefined : () => setGoal(g.id)}
                disabled={g.disabled}
                aria-pressed={selectedGoal === g.id}
              >
                <div className="goal-top">
                  <div className="goal-icon"><g.Icon /></div>
                  <div className="goal-check"><Icons.Check /></div>
                </div>
                <div>
                  <div className="goal-label">{g.label}</div>
                  {g.disabled && (
                    <div className="goal-pill"><Icons.Lock /> Bald verfügbar</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Block B – Persons */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">B</span>Zu wem gehören diese Angaben?
            </h2>
            <span className="block-hint">{t('Du kannst die Planung auch als Paar machen.', 'Ihr könnt die Planung als Paar machen.')}</span>
          </div>

          <div className="tabs" role="tablist">
            <button className={`tab ${activeTab === 1 ? 'active' : ''}`}
              onClick={() => setActiveTab(1)} role="tab">
              <span className="tab-dot">1</span>
              <span>{person1.name || 'Person 1'}</span>
            </button>
            {hasPartner && (
              <button className={`tab ${activeTab === 2 ? 'active' : ''}`}
                onClick={() => setActiveTab(2)} role="tab">
                <span className="tab-dot">2</span>
                <span>{person2.name || 'Person 2'}</span>
              </button>
            )}
          </div>

          {/* Person 1 */}
          {activeTab === 1 && (
            <div className="person-card">
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="name1">Name</label>
                  <input id="name1" className="input" placeholder="z. B. Andrea"
                    value={person1.name}
                    onChange={(e) => setPerson1({ name: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="dob1">Geburtsdatum</label>
                  <input id="dob1" type="date" className="date-input"
                    value={person1.dob}
                    onChange={(e) => setPerson1({ dob: e.target.value })} />
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: 14 }}>
                <div className="field">
                  <label>Geschlecht</label>
                  <div className="segmented">
                    <button className={person1.sex === 'm' ? 'active' : ''}
                      onClick={() => setPerson1({ sex: 'm' })}>Männlich</button>
                    <button className={person1.sex === 'f' ? 'active' : ''}
                      onClick={() => setPerson1({ sex: 'f' })}>Weiblich</button>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="civil1">Zivilstand</label>
                  <select id="civil1" className="select" value={person1.civil}
                    onChange={(e) => setPerson1({ civil: e.target.value as CivilStatus })}>
                    <option value="ledig">Ledig</option>
                    <option value="verheiratet">Verheiratet</option>
                    <option value="partnerschaft">Eingetragene Partnerschaft</option>
                    <option value="geschieden">Geschieden</option>
                    <option value="verwitwet">Verwitwet</option>
                  </select>
                  {isCouple && !hasPartner && (
                    <div className="partner-hint">
                      <div className="ph-ico">💡</div>
                      <div className="ph-body">
                        <div className="ph-text">{t('Möchtest du die Planung als Paar machen? So können wir die AHV-Plafonierung korrekt berücksichtigen.', 'Möchtet ihr die Planung als Paar machen?')}</div>
                        <button type="button" className="ph-btn" onClick={handleAddPartner}>+ Partner:in hinzufügen</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="age-readout" style={{ marginTop: 18 }}>
                {age1 !== null
                  ? <>Alter: <b>{age1} Jahre</b></>
                  : <>Alter: <span style={{ color: 'var(--ink-400)' }}>–</span></>}
              </div>

              {/* Location inline */}
              <div style={{ marginTop: 22 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 18, color: 'var(--ink-900)', margin: '0 0 12px' }}>
                  Wo wohn{isPaar ? 't ihr' : 'st du'}?
                </h3>
                <LocationField value={location} onChange={setLocation} />
              </div>
            </div>
          )}

          {/* Person 2 */}
          {activeTab === 2 && hasPartner && (
            <div className="person-card">
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="name2">Name</label>
                  <input id="name2" className="input" placeholder="z. B. Thomas"
                    value={person2.name}
                    onChange={(e) => setPerson2({ name: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="dob2">Geburtsdatum</label>
                  <input id="dob2" type="date" className="date-input"
                    value={person2.dob}
                    onChange={(e) => setPerson2({ dob: e.target.value })} />
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: 14 }}>
                <div className="field">
                  <label>Geschlecht</label>
                  <div className="segmented">
                    <button className={person2.sex === 'm' ? 'active' : ''}
                      onClick={() => setPerson2({ sex: 'm' })}>Männlich</button>
                    <button className={person2.sex === 'f' ? 'active' : ''}
                      onClick={() => setPerson2({ sex: 'f' })}>Weiblich</button>
                  </div>
                </div>
                <div className="field">
                  <label>Zivilstand</label>
                  <select className="select" value={person2.civil}
                    onChange={(e) => setPerson2({ civil: e.target.value as CivilStatus })}>
                    <option value="ledig">Ledig</option>
                    <option value="verheiratet">Verheiratet</option>
                    <option value="partnerschaft">Eingetragene Partnerschaft</option>
                    <option value="geschieden">Geschieden</option>
                    <option value="verwitwet">Verwitwet</option>
                  </select>
                </div>
              </div>
              <div className="age-readout" style={{ marginTop: 18 }}>
                {age2 !== null
                  ? <>Alter: <b>{age2} Jahre</b></>
                  : <>Alter: <span style={{ color: 'var(--ink-400)' }}>–</span></>}
              </div>
            </div>
          )}
        </section>

        {/* Block C – Children */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">C</span>
              {t('Hast du Kinder?', 'Habt ihr Kinder?')}
            </h2>
          </div>

          <div className="info-callout" style={{ marginBottom: 16 }}>
            <span className="info-callout-icon">i</span>
            <span>Erziehungsgutschriften erhöhen das massgebende Durchschnittseinkommen und damit die AHV-Rente.</span>
          </div>

          <div className="child-radio-row">
            <button className={`child-radio ${!hasChildren ? 'active' : ''}`}
              onClick={() => { setHasChildren(false); setChildren([]) }}>
              <span className="child-radio-dot" /> Nein
            </button>
            <button className={`child-radio ${hasChildren ? 'active' : ''}`}
              onClick={() => { if (!hasChildren) { setHasChildren(true); if (!children.length) setChildren([{ year: '' }]) } }}>
              <span className="child-radio-dot" /> Ja
            </button>
          </div>

          {hasChildren && (
            <>
              <div className="child-list">
                {children.map((c, i) => (
                  <div className="child-row" key={i}>
                    <label htmlFor={`child-${i}`}>Kind {i + 1} · Geburtsjahr</label>
                    <input id={`child-${i}`} className="child-year" type="text" inputMode="numeric"
                      placeholder="z.B. 2005" value={c.year}
                      onChange={(e) => {
                        const next = [...children]
                        next[i] = { year: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) }
                        setChildren(next)
                      }} />
                    <button type="button" className="child-remove"
                      onClick={() => { const next = children.filter((_, j) => j !== i); setChildren(next); if (!next.length) setHasChildren(false) }}>
                      entfernen
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="child-add"
                onClick={() => setChildren([...children, { year: '' }])}>
                <Icons.Plus /> Kind hinzufügen
              </button>
            </>
          )}
        </section>

        {/* Block D – Retire slider */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">D</span>Wann soll es soweit sein?
            </h2>
            <span className="block-hint">AHV-Referenzalter liegt bei 65 Jahren.</span>
          </div>

          <div className="slider-grid" style={!hasPartner ? { gridTemplateColumns: '1fr' } : undefined}>
            <RetireSlider
              name={person1.name || 'Person 1'}
              dob={person1.dob}
              value={person1.retireAge}
              onChange={(v) => setPerson1({ retireAge: v })}
            />
            {hasPartner && (
              <RetireSlider
                name={person2.name || 'Person 2'}
                dob={person2.dob}
                value={person2.retireAge}
                onChange={(v) => setPerson2({ retireAge: v })}
              />
            )}
          </div>
        </section>
      </main>

      {/* Footer nav */}
      <div className="footer">
        <div className="footer-meta">Schritt 1 von 4 · Situation</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" disabled>← Zurück</button>
          <button className="btn btn-primary" onClick={() => navigate('/schritt/2')}>
            Weiter <Icons.Arrow />
          </button>
        </div>
      </div>

      <ChatPanel currentStep="situation" />
    </div>
  )
}

/* ---- Retire Slider component ---- */
interface SliderProps {
  name: string
  dob: string
  value: number
  onChange: (v: number) => void
}

function RetireSlider({ name, dob, value, onChange }: SliderProps) {
  const min = 58, max = 70
  const pct = ((value - min) / (max - min)) * 100
  const age = calcAge(dob)
  const remain = age !== null ? Math.max(0, value - age) : null

  return (
    <div className="slider-card">
      <div className="who">{name}</div>
      <h4>Wann möchtest du in Pension gehen?</h4>
      <div className="retire-value">
        <div className="num">{value}</div>
        <div className="unit">Jahre</div>
      </div>
      <div className="retire-remain">
        {remain !== null
          ? remain === 0
            ? <><b>Jetzt</b> in Pension gehen</>
            : <>Noch <b>{remain} {remain === 1 ? 'Jahr' : 'Jahre'}</b> · Pensionierung im Jahr {new Date().getFullYear() + remain}</>
          : <>Geburtsdatum eingeben, um verbleibende Jahre zu sehen.</>}
      </div>
      <div className="range-wrap">
        <input type="range" className="range" min={min} max={max} step={1} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ '--val': `${pct}%` } as React.CSSProperties} />
        <div className="range-marks">
          {[58, 62, 65, 68, 70].map((m) => (
            <span key={m} className={m === value ? 'mark-hit' : ''}
              style={{ left: `${((m - min) / (max - min)) * 100}%` }}>
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
