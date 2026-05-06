import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const FEATURES = [
  { icon: '🏦', title: 'AHV korrekt berechnet', text: 'Skala 44 mit Beitragslücken, Erziehungsgutschriften, Vor- und Aufschub – so wie es die AHV selbst rechnet.' },
  { icon: '🏛️', title: 'Pensionskasse analysiert', text: 'Vergleich Rente vs. Kapital, Umwandlungssatz, Kapitalbezugssteuer und Break-Even-Analyse.' },
  { icon: '💰', title: 'Säule 3a optimiert', text: 'Projektion bis zur Pensionierung, gestaffelter Bezug und Vergleich Sparkonto vs. Wertschriften.' },
  { icon: '📊', title: 'Cashflow bis Alter 95', text: 'Jahr für Jahr: Was kommt rein, was geht raus, wie lange reicht das Vermögen?' },
  { icon: '🎯', title: '3 Szenarien', text: 'Optimistisch, neutral und pessimistisch – mit Inflation, Rendite und Steuern.' },
  { icon: '📄', title: 'PDF-Export', text: 'Deine komplette Analyse als druckfertiges Dokument für das Beratungsgespräch.' },
]

const STEPS = [
  { n: '01', title: 'Situation erfassen', text: 'Namen, Geburtsdaten, Zivilstand, Wohnort und Pensionierungsziel eingeben. Dauert 3 Minuten.' },
  { n: '02', title: 'Vorsorge eingeben', text: 'Einkommen, PK-Kapital, Umwandlungssatz und 3a-Guthaben – so präzise wie du möchtest.' },
  { n: '03', title: 'Budget festlegen', text: 'Wie viel braucht ihr im Alter? Einfach als Prozentsatz oder detailliert nach Kategorien.' },
  { n: '04', title: 'Analyse lesen', text: 'Sofortiges Ergebnis mit Ampel, Vermögensverlauf, Szenarien und konkreten Handlungsempfehlungen.' },
]

const FAQS = [
  {
    q: 'Sind meine Daten sicher?',
    a: 'Alle Daten werden ausschliesslich in deinem Browser gespeichert. Nichts wird an Server übertragen oder gespeichert. WealthWise verarbeitet keine persönlichen Finanzdaten.',
  },
  {
    q: 'Wie genau sind die Berechnungen?',
    a: 'Die Berechnungen basieren auf offiziellen AHV-Skalen 2026, BVG-Umwandlungssätzen und BFS-Sterbetafeln. Sie sind als fundierte Orientierung gedacht – für verbindliche Zahlen brauchst du deine persönlichen Dokumente (AHV-Ausweis, Vorsorgeausweis).',
  },
  {
    q: 'Für wen ist WealthWise geeignet?',
    a: 'WealthWise richtet sich an Personen zwischen 50 und 65, die sich einen Überblick über ihre Pensionierungssituation verschaffen möchten. Auch für Paare, die gemeinsam planen.',
  },
  {
    q: 'Ersetzt WealthWise einen Finanzberater?',
    a: 'Nein. WealthWise gibt eine fundierte Orientierung und hilft, die richtigen Fragen zu stellen. Für die definitive Umsetzung empfehlen wir ein Gespräch mit einer unabhängigen Fachperson.',
  },
  {
    q: 'Kann ich die Analyse speichern?',
    a: 'Deine Eingaben werden automatisch im Browser gespeichert (LocalStorage). Du kannst auch einen Link erstellen, um die Analyse später fortzusetzen oder zu teilen.',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="landing-nav">
        <div className="brand">
          <div className="brand-mark">W</div>
          <span>WealthWise</span>
        </div>
        <div className="nav-links">
          <a href="#wie-es-funktioniert">Wie es funktioniert</a>
          <a href="#features">Features</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="nav-cta">
          <button className="btn btn-primary" onClick={() => navigate('/schritt/1')}>
            Jetzt starten →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: 'white', borderBottom: '1px solid var(--ink-200)' }}>
        <div className="hero-wrap">
          <div>
            <div className="hero-eyebrow">
              <span>🇨🇭</span> Schweizer Vorsorgeplanung 2026
            </div>
            <h1 className="hero-h1">
              Reicht deine Rente<br />
              im Alter?
            </h1>
            <p className="hero-lead">
              WealthWise analysiert deine AHV, Pensionskasse und Säule 3a –
              kostenlos, sicher und in wenigen Minuten.
            </p>
            <div className="hero-ctas">
              <button className="btn btn-primary" style={{ fontSize: 16, padding: '14px 28px' }}
                onClick={() => navigate('/schritt/1')}>
                Analyse starten →
              </button>
              <span style={{ fontSize: 13, color: 'var(--ink-400)' }}>Kostenlos · Keine Registrierung</span>
            </div>
          </div>

          {/* Hero illustration */}
          <div style={{ position: 'relative' }}>
            <div style={{
              background: 'var(--navy-50)',
              border: '1px solid var(--navy-100)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
            }}>
              {/* Mock analysis card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div className="brand-mark" style={{ width: 28, height: 28, fontSize: 14 }}>W</div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--navy-800)' }}>Analyse fertig</span>
                <span className="badge badge-green" style={{ marginLeft: 'auto' }}>Gut aufgestellt</span>
              </div>

              <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-500)', borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--green-600)', fontWeight: 600, marginBottom: 4 }}>Monatlich verfügbar</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--green-600)' }}>CHF 5'340</div>
                <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>bei Bedarf CHF 4'800</div>
              </div>

              {[
                { label: 'AHV (inkl. 13. Rente)', val: "CHF 3'780", icon: '🏛️' },
                { label: 'Pensionskasse', val: "CHF 2'240", icon: '🏦' },
                { label: 'Säule 3a + Vermögen', val: "CHF +1'560", icon: '💰' },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--ink-100)' }}>
                  <span style={{ fontSize: 16 }}>{row.icon}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-700)', flex: 1 }}>{row.label}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--navy-800)' }}>{row.val}</span>
                </div>
              ))}

              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, background: 'white', border: '1px solid var(--ink-200)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>Score</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--green-600)' }}>82</div>
                </div>
                <div style={{ flex: 1, background: 'white', border: '1px solid var(--ink-200)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>Reichweite</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--navy-800)' }}>95+</div>
                </div>
                <div style={{ flex: 1, background: 'white', border: '1px solid var(--ink-200)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>Deckung</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--navy-800)' }}>111%</div>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <div style={{
              position: 'absolute', top: -12, right: -12,
              background: 'white', border: '1px solid var(--ink-200)', borderRadius: 10,
              padding: '8px 14px', fontSize: 12, fontWeight: 600, color: 'var(--ink-700)',
              boxShadow: '0 4px 12px rgba(17,31,58,.1)',
            }}>
              🔒 Daten bleiben im Browser
            </div>
            <div style={{
              position: 'absolute', bottom: -12, left: -12,
              background: 'white', border: '1px solid var(--ink-200)', borderRadius: 10,
              padding: '8px 14px', fontSize: 12, fontWeight: 600, color: 'var(--ink-700)',
              boxShadow: '0 4px 12px rgba(17,31,58,.1)',
            }}>
              ⏱ 5 Minuten bis zum Ergebnis
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="trust-strip">
        <div className="trust-inner">
          {[
            { icon: '🔒', text: 'Keine Datenweitergabe – alles im Browser' },
            { icon: '🇨🇭', text: 'AHV-Daten 2026 aktuell' },
            { icon: '📊', text: 'BFS-Sterbetafeln und HABE-Daten' },
            { icon: '🆓', text: 'Kostenlos – keine Registrierung' },
          ].map((item) => (
            <div key={item.text} className="trust-item">
              <div className="trust-icon"><span style={{ fontSize: 16 }}>{item.icon}</span></div>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="section-wrap" id="wie-es-funktioniert">
        <p className="eyebrow" style={{ marginBottom: 6 }}>So funktioniert's</p>
        <h2 className="section-title">In 4 Schritten zur Analyse</h2>
        <p className="section-sub">Kein langes Ausfüllen – nur die wichtigsten Angaben.</p>

        <div className="steps-grid">
          {STEPS.map((s) => (
            <div key={s.n} className="step-card">
              <div className="step-card-num">{s.n}</div>
              <div className="step-card-title">{s.title}</div>
              <p className="step-card-text">{s.text}</p>
            </div>
          ))}
          {/* CTA as 4th card */}
          <div style={{
            background: 'var(--navy-800)',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 160,
          }}>
            <p style={{ color: 'rgba(255,255,255,.8)', fontSize: 15, margin: 0, lineHeight: 1.5 }}>
              Bereit für deine persönliche Vorsorgeanalyse?
            </p>
            <button className="btn" style={{ background: 'white', color: 'var(--navy-800)', alignSelf: 'flex-start', marginTop: 16 }}
              onClick={() => navigate('/schritt/1')}>
              Jetzt starten →
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ background: 'white', borderTop: '1px solid var(--ink-200)', borderBottom: '1px solid var(--ink-200)' }}>
        <div className="section-wrap" id="features">
          <p className="eyebrow" style={{ marginBottom: 6 }}>Was WealthWise berechnet</p>
          <h2 className="section-title">Schweizer Vorsorge – vollständig</h2>
          <p className="section-sub">Keine vereinfachten Faustregeln – echte Berechnungen nach gesetzlichen Grundlagen.</p>

          <div className="features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="feature-item">
                <div className="feature-icon">{f.icon}</div>
                <div>
                  <div className="feature-title">{f.title}</div>
                  <p className="feature-text">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-wrap" id="faq">
        <p className="eyebrow" style={{ marginBottom: 6 }}>Fragen & Antworten</p>
        <h2 className="section-title">Häufige Fragen</h2>
        <p className="section-sub" style={{ marginBottom: 32 }}>Alles was du wissen musst, bevor du anfängst.</p>

        <div className="faq-list">
          {FAQS.map((f, i) => (
            <div key={i} className="faq-item">
              <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                {f.q}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {openFaq === i && <div className="faq-answer">{f.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2>Starte deine Vorsorgeanalyse jetzt</h2>
        <p>Kostenlos · Keine Registrierung · Daten bleiben bei dir</p>
        <button className="btn" style={{ background: 'white', color: 'var(--navy-800)', fontSize: 16, padding: '14px 32px' }}
          onClick={() => navigate('/schritt/1')}>
          Jetzt analysieren →
        </button>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="brand-mark" style={{ width: 24, height: 24, fontSize: 12 }}>W</div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'rgba(255,255,255,.7)' }}>WealthWise</span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <a href="#">Impressum</a>
          <a href="#">Datenschutz</a>
          <a href="#">AGB</a>
        </div>
        <div style={{ fontSize: 12 }}>
          © 2026 WealthWise · Keine Finanzberatung
        </div>
      </footer>
    </div>
  )
}
