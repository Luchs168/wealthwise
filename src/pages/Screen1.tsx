import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import TopBar from '../components/TopBar'
import ProgressBar from '../components/ProgressBar'
import LocationField from '../components/LocationField'
import ChatPanel from '../components/ChatPanel'
import { useStore, CivilStatus } from '../store'
import { fmtCHF } from '../lib/calc'

function OnboardingOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(17,31,58,.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '44px 40px',
        maxWidth: 520, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,.25)',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, background: 'var(--navy-800)',
          display: 'grid', placeItems: 'center', marginBottom: 22,
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: '#fff',
        }}>W</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 26, color: 'var(--navy-900)', margin: '0 0 10px', lineHeight: 1.2 }}>
          Willkommen bei Ihrer Vorsorgeanalyse
        </h2>
        <p style={{ fontSize: 15, color: 'var(--ink-600)', margin: '0 0 24px', lineHeight: 1.7 }}>
          In den nächsten Minuten ermitteln wir gemeinsam, ob Ihr Einkommen und Vermögen für Ihren gewünschten Lebensstandard nach der Pensionierung ausreicht.
        </p>
        <div style={{ marginBottom: 28 }}>
          {[
            'Eine klare Übersicht Ihrer Einnahmen und Ausgaben nach der Pensionierung',
            'Verschiedene Szenarien (optimistisch, realistisch, pessimistisch)',
            'Konkrete Handlungsempfehlungen mit Franken-Beträgen',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#dcfce7',
                color: '#16a34a', fontSize: 11, fontWeight: 700,
                display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 2,
              }}>✓</div>
              <span style={{ fontSize: 14, color: 'var(--ink-700)', lineHeight: 1.55 }}>
                Sie erhalten: <b>{item}</b>
              </span>
            </div>
          ))}
        </div>
        <div style={{
          padding: '12px 14px', background: 'var(--navy-50)',
          border: '1px solid var(--navy-200)', borderRadius: 10,
          fontSize: 13, color: 'var(--navy-700)', marginBottom: 24, lineHeight: 1.5,
        }}>
          🔒 Ihre Angaben werden nicht gespeichert und nicht weitergegeben.
        </div>
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '14px 24px' }}
          onClick={onClose}
        >
          Los geht's →
        </button>
      </div>
    </div>
  )
}

function TransitionOverlay1({
  onContinue,
  name,
  age,
  civil,
  retireAge,
}: {
  onContinue: () => void
  name: string
  age: number | null
  civil: string
  retireAge: number
}) {
  const civilLabels: Record<string, string> = {
    ledig: 'Ledig', verheiratet: 'Verheiratet',
    partnerschaft: 'Eingetragene Partnerschaft',
    geschieden: 'Geschieden', verwitwet: 'Verwitwet',
  }
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
          Persönliche Angaben erfasst
        </h2>
        <p style={{ fontSize: 15, color: 'var(--ink-500)', margin: '0 0 28px' }}>
          Ihre persönliche Ausgangslage ist gespeichert.
        </p>
        <div style={{
          background: 'var(--navy-50)', border: '1px solid var(--navy-200)',
          borderRadius: 14, padding: '20px 24px', marginBottom: 28, textAlign: 'left',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px',
        }}>
          {[
            { label: 'Name', value: name || '–' },
            { label: 'Alter', value: age !== null ? `${age} Jahre` : '–' },
            { label: 'Zivilstand', value: civilLabels[civil] || civil },
            { label: 'Pensionierung', value: `mit ${retireAge} Jahren` },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--navy-800)' }}>{value}</div>
            </div>
          ))}
        </div>
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '14px 24px' }}
          onClick={onContinue}
        >
          Weiter zur finanziellen Bestandesaufnahme →
        </button>
        <p style={{ fontSize: 13, color: 'var(--ink-400)', marginTop: 14 }}>
          ⏱ Noch ca. 8 Minuten
        </p>
      </div>
    </div>
  )
}

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

function WhyBox({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 6 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--navy-600)',
          fontSize: 12, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 5,
        }}
      >
        <span style={{
          width: 15, height: 15, borderRadius: '50%', background: 'var(--navy-100)',
          color: 'var(--navy-700)', fontSize: 9, fontWeight: 700, display: 'inline-grid',
          placeItems: 'center', fontFamily: 'var(--font-mono)', flexShrink: 0,
        }}>?</span>
        Warum fragen wir das?
      </button>
      {open && (
        <div style={{
          marginTop: 6, padding: '10px 12px', background: 'var(--navy-50)',
          border: '1px solid var(--navy-100)', borderRadius: 8,
          fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.6,
        }}>
          {text}
        </div>
      )}
    </div>
  )
}

export default function Screen1() {
  const navigate = useNavigate()
  const store = useStore()
  const {
    person1, person2, hasPartner, location, hasChildren, children,
    setHasPartner, setPerson1, setPerson2, setLocation, setHasChildren, setChildren,
    selectedGoal, setGoal, persons, updatePerson,
  } = store

  const [activeTab, setActiveTab] = useState<1 | 2>(1)
  const [showOnboarding, setShowOnboarding] = useState(() => !sessionStorage.getItem('ww_onboarded'))
  const [showTransition, setShowTransition] = useState(false)
  const isCouple = person1.civil === 'verheiratet' || person1.civil === 'partnerschaft'

  useEffect(() => {
    if (!isCouple && hasPartner) setHasPartner(false)
    if (isCouple && !hasPartner) setHasPartner(true)
  }, [isCouple])

  useEffect(() => {
    if (!hasPartner && activeTab === 2) setActiveTab(1)
  }, [hasPartner])

  const isPaar = hasPartner && isCouple
  const age1 = calcAge(person1.dob)
  const age2 = calcAge(person2.dob)
  const p1 = persons.find(p => p.id === 1)!
  const p2 = persons.find(p => p.id === 2)!
  const curP = activeTab === 1 ? p1 : p2

  const handleAddPartner = () => {
    setPerson1({ civil: 'verheiratet' })
    setHasPartner(true)
    setActiveTab(2)
  }

  return (
    <div className="app">
      {showOnboarding && (
        <OnboardingOverlay onClose={() => {
          sessionStorage.setItem('ww_onboarded', '1')
          setShowOnboarding(false)
        }} />
      )}
      {showTransition && (
        <TransitionOverlay1
          onContinue={() => navigate('/schritt/2')}
          name={person1.name}
          age={age1}
          civil={person1.civil}
          retireAge={person1.retireAge}
        />
      )}
      <TopBar screenLabel="Vorsorgeplanung" />
      <ProgressBar current={1} />

      <main>
        <div className="page-head">
          <div className="eyebrow">Schritt 1 · Situation</div>
          <h1 className="title">Persönliche Ausgangslage</h1>
          <p className="subtitle">
            Für eine fundierte Vorsorgeanalyse benötigen wir zunächst einige Angaben zu Ihrer Lebenssituation.
          </p>
        </div>

        {/* Block A – Analyseziel */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">A</span>Ihr Analyseziel
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

        {/* Block B – Persönliche Angaben */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">B</span>Persönliche Angaben
            </h2>
            <span className="block-hint">Sie können die Planung auch als Paar durchführen.</span>
          </div>

          <div className="tabs" role="tablist">
            <button
              className={`tab ${activeTab === 1 ? 'active' : ''}`}
              onClick={() => setActiveTab(1)}
              role="tab"
            >
              <span className="tab-dot">1</span>
              <span>{person1.name || 'Person 1'}</span>
            </button>
            {hasPartner && (
              <button
                className={`tab ${activeTab === 2 ? 'active' : ''}`}
                onClick={() => setActiveTab(2)}
                role="tab"
              >
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
                  <label htmlFor="name1">
                    Vorname <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    id="name1"
                    className="input"
                    placeholder="z. B. Andrea"
                    value={person1.name}
                    onChange={(e) => setPerson1({ name: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="dob1">
                    Geburtsdatum <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    id="dob1"
                    type="date"
                    className="date-input"
                    autoComplete="bday"
                    value={person1.dob}
                    onChange={(e) => setPerson1({ dob: e.target.value })}
                  />
                  <WhyBox text="Ihr Geburtsdatum bestimmt Ihr aktuelles Alter und die verbleibenden Beitragsjahre bis zur Pensionierung – beides massgebend für die Höhe Ihrer AHV-Rente." />
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: 14 }}>
                <div className="field">
                  <label>Geschlecht</label>
                  <div className="segmented">
                    <button
                      className={person1.sex === 'm' ? 'active' : ''}
                      onClick={() => setPerson1({ sex: 'm' })}
                    >Männlich</button>
                    <button
                      className={person1.sex === 'f' ? 'active' : ''}
                      onClick={() => setPerson1({ sex: 'f' })}
                    >Weiblich</button>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="civil1">Zivilstand</label>
                  <select
                    id="civil1"
                    className="select"
                    value={person1.civil}
                    onChange={(e) => setPerson1({ civil: e.target.value as CivilStatus })}
                  >
                    <option value="ledig">Ledig</option>
                    <option value="verheiratet">Verheiratet</option>
                    <option value="partnerschaft">Eingetragene Partnerschaft</option>
                    <option value="geschieden">Geschieden</option>
                    <option value="verwitwet">Verwitwet</option>
                  </select>
                  <WhyBox text="Der Zivilstand ist relevant für die AHV-Plafonierung (Ehepaare: max. 150% der Maximalrente) sowie allfällige Hinterlassenenrenten." />
                  {person1.civil === 'geschieden' && (
                    <div style={{ marginTop: 14, padding: '16px', background: '#f8fafc', border: '1px solid var(--ink-200)', borderRadius: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 12 }}>
                        Auswirkungen Ihrer Scheidung auf die Vorsorge
                      </div>
                      {/* PK-Splitting */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-700)', marginBottom: 6 }}>Wurde bei Ihrer Scheidung ein PK-Splitting durchgeführt?</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {(['ja', 'nein', 'weiss_nicht'] as const).map(v => (
                            <button key={v} type="button"
                              style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid var(--ink-200)', fontSize: 12, cursor: 'pointer', background: p1.divorcePkSplitting === v ? 'var(--navy-800)' : '#fff', color: p1.divorcePkSplitting === v ? '#fff' : 'var(--ink-700)' }}
                              onClick={() => updatePerson(1, { divorcePkSplitting: v })}>
                              {v === 'ja' ? 'Ja' : v === 'nein' ? 'Nein' : 'Weiss nicht'}
                            </button>
                          ))}
                        </div>
                        {p1.divorcePkSplitting === 'ja' && (
                          <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--green-700)' }}>✓ Das aktuelle PK-Guthaben berücksichtigt das Splitting bereits.</div>
                        )}
                        {(p1.divorcePkSplitting === 'nein' || p1.divorcePkSplitting === 'weiss_nicht') && (
                          <div style={{ marginTop: 6, fontSize: 11.5, color: '#92400e' }}>⚠ Prüfen Sie dies mit Ihrer Pensionskasse. Bei einer Scheidung wird das während der Ehe angesparte PK-Guthaben hälftig aufgeteilt.</div>
                        )}
                      </div>
                      {/* AHV-Splitting */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-700)', marginBottom: 6 }}>Wurde ein AHV-Einkommenssplitting durchgeführt?</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {(['ja', 'nein', 'weiss_nicht'] as const).map(v => (
                            <button key={v} type="button"
                              style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid var(--ink-200)', fontSize: 12, cursor: 'pointer', background: p1.divorceAhvSplitting === v ? 'var(--navy-800)' : '#fff', color: p1.divorceAhvSplitting === v ? '#fff' : 'var(--ink-700)' }}
                              onClick={() => updatePerson(1, { divorceAhvSplitting: v })}>
                              {v === 'ja' ? 'Ja' : v === 'nein' ? 'Nein' : 'Weiss nicht'}
                            </button>
                          ))}
                        </div>
                        {(p1.divorceAhvSplitting === 'nein' || p1.divorceAhvSplitting === 'weiss_nicht') && (
                          <div style={{ marginTop: 6, fontSize: 11.5, color: '#92400e', lineHeight: 1.5 }}>
                            ℹ Das AHV-Splitting teilt die Einkommen aus den Ehejahren auf beide Partner auf – es kann Ihre AHV-Rente erhöhen. Bestellen Sie Ihren IK-Auszug und prüfen Sie, ob die Einkommensteilung korrekt verbucht ist.{' '}
                            <a href="https://www.ahv-iv.ch" target="_blank" rel="noreferrer" style={{ color: 'var(--navy-600)' }}>IK-Auszug bestellen: www.ahv-iv.ch</a>
                          </div>
                        )}
                      </div>
                      {/* Alimente */}
                      <div>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-700)', marginBottom: 6 }}>Erhalten Sie nachehelichen Unterhalt (Alimente)?</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          {([true, false] as const).map(v => (
                            <button key={String(v)} type="button"
                              style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid var(--ink-200)', fontSize: 12, cursor: 'pointer', background: (p1.alimenteMonthly !== undefined && p1.alimenteMonthly > 0) === v ? 'var(--navy-800)' : '#fff', color: (p1.alimenteMonthly !== undefined && p1.alimenteMonthly > 0) === v ? '#fff' : 'var(--ink-700)' }}
                              onClick={() => updatePerson(1, v ? { alimenteMonthly: p1.alimenteMonthly || 500 } : { alimenteMonthly: 0 })}>
                              {v ? 'Ja' : 'Nein'}
                            </button>
                          ))}
                        </div>
                        {(p1.alimenteMonthly ?? 0) > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <label style={{ fontSize: 12, color: 'var(--ink-600)', flexShrink: 0 }}>CHF/Monat:</label>
                              <input type="number" className="input" style={{ maxWidth: 120 }} min={0} step={100}
                                value={p1.alimenteMonthly ?? 0}
                                onChange={e => updatePerson(1, { alimenteMonthly: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <label style={{ fontSize: 12, color: 'var(--ink-600)', flexShrink: 0 }}>Laufzeit:</label>
                              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <input type="checkbox" checked={p1.alimenteUnbefristet ?? false}
                                  onChange={e => updatePerson(1, { alimenteUnbefristet: e.target.checked })} />
                                Unbefristet
                              </label>
                              {!p1.alimenteUnbefristet && (
                                <span style={{ fontSize: 12, color: 'var(--ink-600)' }}>bis Alter:
                                  <input type="number" className="input" style={{ width: 70, marginLeft: 6 }} min={55} max={90}
                                    value={p1.alimenteUntilAge ?? 65}
                                    onChange={e => updatePerson(1, { alimenteUntilAge: parseInt(e.target.value) || 65 })} />
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11.5, color: '#92400e' }}>
                              ⚠ Alimente enden häufig bei der Pensionierung des Zahlungspflichtigen. Planen Sie diesen Wegfall ein.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {isCouple && !hasPartner && (
                    <div className="partner-hint">
                      <div className="ph-ico">💡</div>
                      <div className="ph-body">
                        <div className="ph-text">Möchten Sie die Planung als Paar durchführen? So können wir die AHV-Plafonierung korrekt berücksichtigen.</div>
                        <button type="button" className="ph-btn" onClick={handleAddPartner}>
                          + Partner:in hinzufügen
                        </button>
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

              <div style={{ marginTop: 22 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 16, color: 'var(--ink-700)', margin: '0 0 10px' }}>
                  Wohnort
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
                  <label htmlFor="name2">Vorname</label>
                  <input
                    id="name2"
                    className="input"
                    placeholder="z. B. Thomas"
                    value={person2.name}
                    onChange={(e) => setPerson2({ name: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="dob2">Geburtsdatum</label>
                  <input
                    id="dob2"
                    type="date"
                    className="date-input"
                    autoComplete="bday"
                    value={person2.dob}
                    onChange={(e) => setPerson2({ dob: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: 14 }}>
                <div className="field">
                  <label>Geschlecht</label>
                  <div className="segmented">
                    <button
                      className={person2.sex === 'm' ? 'active' : ''}
                      onClick={() => setPerson2({ sex: 'm' })}
                    >Männlich</button>
                    <button
                      className={person2.sex === 'f' ? 'active' : ''}
                      onClick={() => setPerson2({ sex: 'f' })}
                    >Weiblich</button>
                  </div>
                </div>
                <div className="field">
                  <label>Zivilstand</label>
                  <select
                    className="select"
                    value={person2.civil}
                    onChange={(e) => setPerson2({ civil: e.target.value as CivilStatus })}
                  >
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

        {/* Block C – Erwerbssituation */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">C</span>Erwerbssituation
            </h2>
            <span className="block-hint">Basis für AHV- und BVG-Berechnung</span>
          </div>

          {isPaar && (
            <div className="tabs" style={{ marginBottom: 16 }}>
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

          {/* Erwerbsstatus */}
          <div className="field" style={{ marginBottom: 16 }}>
            <label>Erwerbsstatus</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {(['employed', 'selfEmployed'] as const).map(v => (
                <button key={v} type="button"
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--ink-200)', fontSize: 13, cursor: 'pointer', fontWeight: curP.employmentStatus === v || (!curP.employmentStatus && v === 'employed') ? 600 : 400, background: curP.employmentStatus === v || (!curP.employmentStatus && v === 'employed') ? 'var(--navy-800)' : '#fff', color: curP.employmentStatus === v || (!curP.employmentStatus && v === 'employed') ? '#fff' : 'var(--ink-700)' }}
                  onClick={() => updatePerson(activeTab, { employmentStatus: v })}>
                  {v === 'employed' ? 'Angestellt' : 'Selbständig'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor={`income-p${activeTab}`}>
                {curP.employmentStatus === 'selfEmployed'
                  ? <>Ø Nettoeinkommen letzte 3 Jahre <span style={{ color: '#dc2626' }}>*</span></>
                  : <>Brutto-Jahreseinkommen <span style={{ color: '#dc2626' }}>*</span></>}
              </label>
              <div className="amount-wrap">
                <span className="prefix">CHF</span>
                <IncomeInput
                  id={`income-p${activeTab}`}
                  value={curP.income}
                  onChange={(v) => updatePerson(activeTab, { income: v })}
                />
              </div>
              {curP.employmentStatus === 'selfEmployed'
                ? <WhyBox text="Als Selbständige/r schwankt Ihr Einkommen. Geben Sie den Durchschnitt der letzten 3 Jahre ein. Das Nettoeinkommen (nach AHV/IV/EO-Abzügen) bestimmt Ihr 3a-Maximum (20%) und die AHV-Rente." />
                : <WhyBox text="Das Brutto-Jahreseinkommen bestimmt die Höhe Ihrer AHV-Rente (massgebendes Einkommen) und des BVG-koordinierten Lohns für die Pensionskasse." />}
            </div>
            <div className="field">
              <label htmlFor={`employment-grade-p${activeTab}`}>Beschäftigungsgrad</label>
              <div className="amount-wrap">
                <input
                  id={`employment-grade-p${activeTab}`}
                  type="text"
                  inputMode="numeric"
                  value={curP.employmentGrade}
                  onChange={(e) => updatePerson(activeTab, {
                    employmentGrade: Math.min(100, parseInt(e.target.value.replace(/\D/g, '')) || 0),
                  })}
                  style={{ textAlign: 'right', paddingRight: 32 }}
                />
                <span className="suffix">%</span>
              </div>
            </div>
          </div>

          {curP.income > 0 && (
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-500)' }}>
              = CHF {fmtCHF(Math.round(curP.income / 12))}/Monat
              {isPaar && ` · Haushalt gesamt: CHF ${fmtCHF(Math.round((p1.income + p2.income) / 12))}/Monat`}
            </div>
          )}
          {curP.income > 0 && curP.income < 22_000 && (
            <div style={{ marginTop: 8, padding: '8px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
              ℹ Einkommen unter CHF 22'050 liegt unter dem AHV-Mindestbeitrag für Vollzeitbeschäftigte. Bitte prüfen Sie die Eingabe – ist dies ein Teilzeiteinkommen?
            </div>
          )}
        </section>

        {/* Block D – Familiäre Situation */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">D</span>Familiäre Situation
            </h2>
          </div>

          <div className="info-callout" style={{ marginBottom: 16 }}>
            <span className="info-callout-icon">i</span>
            <span>Erziehungsgutschriften erhöhen das massgebende Durchschnittseinkommen und damit die AHV-Rente.</span>
          </div>

          <div style={{ marginBottom: 14, fontSize: 14, color: 'var(--ink-700)', fontWeight: 500 }}>
            Haben Sie Kinder?
          </div>

          <div className="child-radio-row">
            <button
              className={`child-radio ${!hasChildren ? 'active' : ''}`}
              onClick={() => { setHasChildren(false); setChildren([]) }}
            >
              <span className="child-radio-dot" /> Nein
            </button>
            <button
              className={`child-radio ${hasChildren ? 'active' : ''}`}
              onClick={() => {
                if (!hasChildren) { setHasChildren(true); if (!children.length) setChildren([{ year: '' }]) }
              }}
            >
              <span className="child-radio-dot" /> Ja
            </button>
          </div>

          {hasChildren && (
            <>
              <div className="child-list">
                {children.map((c, i) => (
                  <div className="child-row" key={i}>
                    <label htmlFor={`child-${i}`}>Kind {i + 1} · Geburtsjahr</label>
                    <input
                      id={`child-${i}`}
                      className="child-year"
                      type="text"
                      inputMode="numeric"
                      placeholder="z.B. 2005"
                      value={c.year}
                      onChange={(e) => {
                        const next = [...children]
                        next[i] = { year: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) }
                        setChildren(next)
                      }}
                    />
                    <button
                      type="button"
                      className="child-remove"
                      onClick={() => {
                        const next = children.filter((_, j) => j !== i)
                        setChildren(next)
                        if (!next.length) setHasChildren(false)
                      }}
                    >
                      entfernen
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="child-add"
                onClick={() => setChildren([...children, { year: '' }])}
              >
                <Icons.Plus /> Kind hinzufügen
              </button>
            </>
          )}
        </section>

        {/* Block E – Pensionierungswunsch */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">E</span>Pensionierungswunsch
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

        {/* Summary card */}
        {(person1.name || age1 !== null || p1.income > 0) && (
          <section className="block" style={{ background: 'var(--navy-50)', border: '1px solid var(--navy-100)' }}>
            <div className="block-head">
              <h2 className="block-title" style={{ color: 'var(--navy-800)' }}>
                <span className="block-num" style={{ background: 'var(--navy-700)', color: 'white' }}>✓</span>
                Zusammenfassung – Schritt 1
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
              {[
                { label: 'Name', value: person1.name || '—' },
                { label: 'Alter', value: age1 !== null ? `${age1} Jahre` : '—' },
                { label: 'Bruttoeinkommen', value: p1.income > 0 ? `CHF ${fmtCHF(p1.income)}/Jahr` : '—' },
                { label: 'Pensionierungsalter', value: `mit ${person1.retireAge} Jahren` },
                ...(isPaar ? [
                  { label: person2.name || 'Partner:in', value: age2 !== null ? `${age2} Jahre` : '—' },
                  { label: 'Pensionierungsalter P2', value: `mit ${person2.retireAge} Jahren` },
                ] : []),
              ].map((item) => (
                <div key={item.label}>
                  <div style={{
                    fontSize: 10.5, color: 'var(--ink-400)', textTransform: 'uppercase',
                    letterSpacing: '.06em', marginBottom: 2, fontFamily: 'var(--font-mono)',
                  }}>{item.label}</div>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--navy-800)',
                  }}>{item.value}</div>
                </div>
              ))}
            </div>
          </section>
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
          <div className="footer-meta">Schritt 1 von 4 · Situation</div>
          <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>Ihre Eingaben bleiben gespeichert</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" disabled>← Zurück</button>
          <button className="btn btn-primary" onClick={() => setShowTransition(true)}>
            Weiter <Icons.Arrow />
          </button>
        </div>
      </div>

      <ChatPanel currentStep="situation" />
    </div>
  )
}

/* ---- Income input with CHF formatting ---- */
function IncomeInput({ value, onChange, id }: { value: number; onChange: (v: number) => void; id?: string }) {
  const [raw, setRaw] = useState('')
  const [focused, setFocused] = useState(false)

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={focused ? raw : (value > 0 ? fmtCHF(value) : '')}
      onFocus={() => { setFocused(true); setRaw(value > 0 ? String(value) : '') }}
      onBlur={() => { setFocused(false); onChange(parseInt(raw.replace(/[^0-9]/g, '')) || 0) }}
      onChange={(e) => setRaw(e.target.value.replace(/[^0-9]/g, ''))}
      placeholder="z. B. 100'000"
      style={{ paddingLeft: 48 }}
    />
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
      <h4 style={{ fontSize: 14, color: 'var(--ink-700)', margin: '4px 0 10px', fontWeight: 500 }}>
        Gewünschtes Pensionierungsalter
      </h4>
      <div className="retire-value">
        <div className="num">{value}</div>
        <div className="unit">Jahre</div>
      </div>
      <div className="retire-remain">
        {remain !== null
          ? remain === 0
            ? <><b>Jetzt</b> pensionieren</>
            : <>Noch <b>{remain} {remain === 1 ? 'Jahr' : 'Jahre'}</b> · Pensionierung {new Date().getFullYear() + remain}</>
          : <>Bitte Geburtsdatum eingeben, um verbleibende Jahre zu sehen.</>}
      </div>
      <div className="range-wrap">
        <input
          type="range"
          className="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ '--val': `${pct}%` } as React.CSSProperties}
        />
        <div className="range-marks">
          {[58, 62, 65, 68, 70].map((m) => (
            <span
              key={m}
              className={m === value ? 'mark-hit' : ''}
              style={{ left: `${((m - min) / (max - min)) * 100}%` }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
      {value < 62 && (
        <div style={{ marginTop: 8, padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#991b1b' }}>
          ⚠ Frühpensionierung vor 62: Erhebliche AHV-Kürzung (max. 13.6%) und Lücke bis AHV-Alter. Brückenrente notwendig.
        </div>
      )}
      {value >= 62 && value < 65 && (
        <div style={{ marginTop: 8, padding: '8px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
          ℹ Frühpensionierung vor 65: PK-Leistungen werden gekürzt und die AHV muss überbrückt werden. Details in der Analyse.
        </div>
      )}
    </div>
  )
}
