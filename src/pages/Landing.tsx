import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const FAQS = [
  {
    q: 'Werden meine Daten gespeichert?',
    a: 'Nein. WealthWise arbeitet nach dem Zero-Storage-Prinzip: Deine Eingaben werden ausschliesslich in deinem Browser verarbeitet und nach Schliessen der Seite vollständig verworfen. Wir sehen und speichern keine deiner persönlichen Daten.',
  },
  {
    q: 'Warum ist WealthWise kostenlos?',
    a: 'WealthWise ist ein unabhängiges Projekt mit dem Ziel, digitale Finanzplanung für alle zugänglich zu machen. Es gibt keine versteckten Kosten, keine Registrierung, keine Produktverkäufe und keine Werbung.',
  },
  {
    q: 'Wie genau ist die Berechnung?',
    a: 'Die Berechnung basiert auf den offiziellen Schweizer Vorsorgedaten 2026 – AHV-Rentenskala, BVG-Kennzahlen, BFS-Sterbetafeln und Haushaltsbudgeterhebung. Es handelt sich um eine fundierte Schätzung mit vereinfachten Annahmen. Alle Annahmen werden transparent dargestellt.',
  },
  {
    q: 'Ersetzt das einen Finanzplaner?',
    a: 'Für eine erste Einschätzung deiner Vorsorgesituation: ja. Du siehst sofort, ob deine Rente reicht, wo deine Lücken sind und welche Hebel du hast. Bei komplexen Situationen empfehlen wir zusätzlich ein Gespräch mit einer unabhängigen Fachperson.',
  },
  {
    q: 'Für wen ist WealthWise gedacht?',
    a: 'WealthWise richtet sich an Personen in der Schweiz, die sich mit ihrer Pensionierung und Vorsorge auseinandersetzen möchten – insbesondere ab 50 Jahren.',
  },
  {
    q: 'Wer steckt hinter WealthWise?',
    a: 'WealthWise wurde in der Schweiz entwickelt und verfolgt das Ziel, ganzheitliche Finanzplanung zugänglicher und verständlicher zu machen – unabhängig von Banken, Versicherungen oder Vermögensverwaltern.',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner">
          <a className="brand" href="#">
            <div className="brand-mark">W</div>
            <span>WealthWise</span>
          </a>
          <div className="nav-links">
            <a href="#so-gehts">So gehts</a>
            <a href="#features">Was du erfährst</a>
            <a href="#vergleich">Vergleich</a>
            <a href="#faq">FAQ</a>
            <button className="nav-cta" onClick={() => navigate('/schritt/1')}>Analyse starten</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--ink-200)' }}>
        <div className="hero">
          <div>
            <div className="hero-eyebrow">Für Personen von 50–65 Jahren · Kostenlos · In 10 Minuten</div>
            <h1>Reicht Ihre Rente? <em>Finden Sie es heraus.</em></h1>
            <p className="lead">
              Ihre digitale Vorsorgeplanung – unabhängig, transparent, verständlich.
              Basierend auf offiziellen AHV/BVG-Kennzahlen 2026.
            </p>
            <div className="hero-ctas">
              <button className="btn-primary" onClick={() => navigate('/schritt/1')}>
                Jetzt Analyse starten
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
              </button>
              <a className="btn-link" href="#so-gehts">So funktioniert's</a>
            </div>
            <div className="hero-meta">
              <span>Keine Registrierung</span>
              <i className="hero-meta-dot" />
              <span>Keine Daten gespeichert</span>
              <i className="hero-meta-dot" />
              <span>Schweizer Server</span>
            </div>
          </div>

          <div className="hero-art">
            <svg viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxHeight: 520 }}>
              <defs>
                <linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f1f4fa"/>
                  <stop offset="100%" stopColor="#e4e9f2"/>
                </linearGradient>
                <pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.2" fill="#cbd5e1" opacity=".5"/>
                </pattern>
              </defs>
              <circle cx="240" cy="240" r="220" fill="url(#bg-grad)"/>
              <circle cx="240" cy="240" r="220" fill="url(#dots)"/>
              <ellipse cx="240" cy="400" rx="150" ry="12" fill="#111f3a" opacity=".08"/>
              {/* Person A */}
              <g transform="translate(160 180)">
                <path d="M -48 180 L -48 70 Q -48 35 -18 30 L 18 30 Q 48 35 48 70 L 48 180 Z" fill="#2a3e63"/>
                <path d="M -14 30 L 0 85 L 14 30 Z" fill="#f1f5f9"/>
                <rect x="-10" y="14" width="20" height="18" fill="#d4a88a"/>
                <circle cx="0" cy="-8" r="32" fill="#e8c4a2"/>
                <path d="M -30 -14 Q -32 -40 0 -42 Q 32 -40 30 -14 Q 22 -28 0 -28 Q -22 -28 -30 -14 Z" fill="#4c628a"/>
                <circle cx="-11" cy="-8" r="5" fill="none" stroke="#2a3e63" strokeWidth="1.5"/>
                <circle cx="11" cy="-8" r="5" fill="none" stroke="#2a3e63" strokeWidth="1.5"/>
                <line x1="-6" y1="-8" x2="6" y2="-8" stroke="#2a3e63" strokeWidth="1.5"/>
                <path d="M -6 3 Q 0 8 6 3" fill="none" stroke="#2a3e63" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M 30 50 Q 80 60 110 100" stroke="#2a3e63" strokeWidth="28" strokeLinecap="round" fill="none"/>
                <circle cx="115" cy="102" r="14" fill="#e8c4a2"/>
              </g>
              {/* Person B */}
              <g transform="translate(300 190)">
                <path d="M -44 170 L -44 62 Q -44 32 -16 28 L 16 28 Q 44 32 44 62 L 44 170 Z" fill="#e8c4a2"/>
                <path d="M -44 62 Q -44 32 -16 28 L -16 170 L -44 170 Z" fill="#d97757"/>
                <path d="M -12 28 L 0 72 L 12 28 Z" fill="#f1f5f9"/>
                <rect x="-9" y="14" width="18" height="16" fill="#e8c4a2"/>
                <circle cx="0" cy="-6" r="30" fill="#e8c4a2"/>
                <path d="M -30 -10 Q -34 -38 0 -40 Q 34 -38 30 -10 L 30 6 Q 22 -4 16 -4 Q 20 -30 0 -30 Q -20 -30 -16 -4 Q -22 -4 -30 6 Z" fill="#7c6f8a"/>
                <path d="M -5 2 Q 0 7 5 2" fill="none" stroke="#2a3e63" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="-9" cy="-6" r="1.6" fill="#2a3e63"/>
                <circle cx="9" cy="-6" r="1.6" fill="#2a3e63"/>
              </g>
              {/* Floating chart */}
              <g transform="translate(70 100)">
                <rect x="0" y="0" width="110" height="70" rx="10" fill="#fff" stroke="#e2e8f0"/>
                <rect x="12" y="12" width="40" height="6" rx="3" fill="#e2e8f0"/>
                <rect x="12" y="24" width="24" height="4" rx="2" fill="#cbd5e1"/>
                <polyline points="12,56 30,44 46,50 64,36 82,40 98,26" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="98" cy="26" r="3" fill="#22c55e"/>
              </g>
              {/* Badge */}
              <g transform="translate(340 320)">
                <rect x="0" y="0" width="90" height="36" rx="18" fill="#ecfdf5" stroke="#a7f3d0"/>
                <circle cx="18" cy="18" r="8" fill="#22c55e"/>
                <path d="M 14 18 L 17 21 L 22 15" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <text x="32" y="23" fontFamily="Inter Tight" fontSize="12" fontWeight="600" fill="#15803d">Gedeckt</text>
              </g>
            </svg>

            <div className="hero-badge tr">
              <b>CHF 7'850</b>
              <span>Monatliche Rente</span>
            </div>
            <div className="hero-badge bl">
              <b>97%</b>
              <span>Deckungsgrad</span>
            </div>
          </div>
        </div>
      </div>

      {/* TRUST */}
      <div className="trust">
        <div className="trust-inner">
          {[
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>, text: 'Keine Datenspeicherung' },
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="3" y1="12" x2="21" y2="12"/></svg>, text: 'AHV/BVG-Kennzahlen 2026' },
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>, text: 'Unabhängig & neutral' },
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>, text: 'In 10 Minuten fertig' },
          ].map((item) => (
            <div key={item.text} className="trust-item">
              <div className="trust-ico">{item.icon}</div>
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* VORTEILE */}
      <div style={{ background: 'var(--navy-900)', borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,.45)', marginBottom: 12 }}>Warum WealthWise?</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 34, color: '#fff', margin: '0 0 12px', letterSpacing: '-.02em' }}>
              Entwickelt für Ihre Pensionierungsplanung
            </h2>
            <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 16, maxWidth: 520, margin: '0 auto' }}>
              Für Personen von 50–65 Jahren, die ihre Pensionierung fundiert planen möchten.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {[
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
                title: 'Ganzheitliche Analyse aller 3 Säulen',
                text: 'AHV, Pensionskasse und Säule 3a werden in einer vollständigen, koordinierten Berechnung erfasst.',
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
                title: 'Unabhängig – keine Produktempfehlungen',
                text: 'WealthWise ist keiner Bank, Versicherung oder Pensionskasse verpflichtet. Rein informativ.',
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>,
                title: 'Ihre Daten bleiben bei Ihnen',
                text: 'Zero-Storage-Prinzip: Alle Berechnungen erfolgen lokal in Ihrem Browser. Keine Serverspeicherung.',
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="3" y1="12" x2="21" y2="12"/></svg>,
                title: 'Basierend auf AHV/BVG-Kennzahlen 2026',
                text: 'Offizielle Daten: BSV, BFS-Sterbetafeln, AHV-Rentenskala 44 und Eidg. BVG-Kennzahlen.',
              },
            ].map((item) => (
              <div key={item.title} style={{ background: 'rgba(255,255,255,.06)', borderRadius: 14, padding: '24px 22px', border: '1px solid rgba(255,255,255,.09)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,.1)', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.8)', marginBottom: 14 }}>
                  {item.icon}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>{item.title}</div>
                <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,.55)', lineHeight: 1.6 }}>{item.text}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 36, fontSize: 12.5, color: 'rgba(255,255,255,.35)', fontStyle: 'italic', letterSpacing: '.01em' }}>
            Entwickelt auf Basis wissenschaftlicher Grundlagen der Finanzplanung · Prototyp FHNW Masterarbeit
          </div>
        </div>
      </div>

      {/* 3 STEPS */}
      <div id="so-gehts" className="section-wrap">
        <div className="section-head">
          <div className="eyebrow">So funktionierts</div>
          <h2 className="sec-title">In drei Schritten zum Vorsorge-Check</h2>
          <p className="sec-sub">Keine lange Einarbeitung, kein Papierkram – beantworte ein paar Fragen und erhalte eine fundierte Analyse deiner Altersvorsorge.</p>
        </div>
        <div className="steps-grid">
          {[
            {
              n: '1',
              ico: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/></svg>,
              title: 'Daten eingeben',
              text: 'Beantworte einige Fragen zu deiner aktuellen Vorsorgesituation – AHV, Pensionskasse, 3. Säule und Ausgaben.',
            },
            {
              n: '2',
              ico: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.4.6 1 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>,
              title: 'System berechnet',
              text: 'Unsere Engine berechnet AHV, Pensionskasse, Kapitalverzehr und Steuern – basierend auf offiziellen Schweizer Vorsorgedaten 2026.',
            },
            {
              n: '3',
              ico: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20h18"/><rect x="5" y="12" width="3" height="8"/><rect x="10.5" y="8" width="3" height="12"/><rect x="16" y="4" width="3" height="16"/></svg>,
              title: 'Ergebnis erhalten',
              text: 'Du erfährst auf einen Blick, ob deine Rente reicht, wo deine Lücken sind und welche Hebel du noch hast.',
            },
          ].map((s) => (
            <div key={s.n} className="step-card">
              <div className="step-card-num">{s.n}</div>
              <div className="step-card-ico">{s.ico}</div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div className="features-bg" id="features" style={{ borderTop: '1px solid var(--ink-200)', borderBottom: '1px solid var(--ink-200)' }}>
        <div className="section-wrap">
          <div className="section-head">
            <div className="eyebrow">Was du erfährst</div>
            <h2 className="sec-title">Antworten auf die Fragen, die zählen</h2>
            <p className="sec-sub">WealthWise ist mehr als ein Rentenrechner. Du bekommst konkrete Analysen zu allen wichtigen Vorsorgeentscheidungen.</p>
          </div>
          <div className="feat-grid">
            {[
              { text: 'Reicht meine Rente?', soon: false },
              { text: 'Rente oder Kapital – was ist besser?', soon: false },
              { text: 'Detaillierter Finanzplan bis 95', soon: false },
              { text: 'Lohnt sich ein PK-Einkauf?', soon: true },
              { text: 'Wie wirkt sich Frühpensionierung aus?', soon: true },
              { text: 'Ist meine Hypothek im Alter tragbar?', soon: true },
            ].map((f) => (
              <div key={f.text} className={`feat${f.soon ? ' soon' : ''}`}>
                <div className="feat-check">
                  {f.soon
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 12 10 17 19 7"/></svg>
                  }
                </div>
                <div className="feat-text">
                  {f.text}
                  {f.soon && <span className="feat-soon-tag">Bald</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* VERGLEICH */}
      <div id="vergleich" className="section-wrap">
        <div className="section-head">
          <div className="eyebrow">Vergleich</div>
          <h2 className="sec-title">Was kostet ein Finanzplaner?</h2>
          <p className="sec-sub">Eine professionelle Vorsorgeplanung kostet normalerweise mehrere tausend Franken. Mit WealthWise bekommst du eine fundierte Basis – sofort und kostenlos.</p>
        </div>
        <div className="compare">
          <div className="compare-col">
            <div className="compare-head">Finanzplaner</div>
            <div className="compare-sub">Klassische Beratung</div>
            {[
              ['Kosten', "CHF 2'000–5'000"],
              ['Dauer', '2–4 Termine über Wochen'],
              ['Unabhängigkeit', 'Oft produktgebunden'],
              ['Verfügbarkeit', 'Nach Terminvereinbarung'],
              ['Datenschutz', 'Daten beim Berater'],
            ].map(([k, v]) => (
              <div key={k} className="compare-row"><span>{k}</span><span>{v}</span></div>
            ))}
          </div>
          <div className="compare-col highlight">
            <div className="compare-head">WealthWise</div>
            <div className="compare-sub">Digitale Analyse</div>
            {[
              ['Kosten', 'Kostenlos'],
              ['Dauer', '10 Minuten'],
              ['Unabhängigkeit', '100 % unabhängig'],
              ['Verfügbarkeit', 'Jederzeit · 24/7'],
              ['Datenschutz', 'Zero-Storage-Prinzip'],
            ].map(([k, v]) => (
              <div key={k} className="compare-row"><span>{k}</span><span>{v}</span></div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div id="faq" style={{ background: 'var(--surface)', borderTop: '1px solid var(--ink-200)' }}>
        <div className="section-wrap">
          <div className="section-head">
            <div className="eyebrow">FAQ</div>
            <h2 className="sec-title">Häufige Fragen</h2>
          </div>
          <div className="faq-grid">
            {FAQS.map((f, i) => (
              <div key={i} className={`faq-item${openFaq === i ? ' open' : ''}`}>
                <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {f.q}
                  <span className="faq-toggle">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && <div className="faq-answer">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div className="final-cta">
        <div className="fc-inner">
          <h2>Bereit für Klarheit über deine Rente?</h2>
          <p>Starte jetzt die kostenlose Analyse. Keine Registrierung. Keine Daten gespeichert. In 10 Minuten weisst du mehr.</p>
          <div className="final-cta-row">
            <button className="btn-primary" style={{ background: '#fff', color: 'var(--navy-900)' }} onClick={() => navigate('/schritt/1')}>
              Jetzt Analyse starten
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
            </button>
          </div>
          <div className="final-cta-meta">Kostenlos · Keine Registrierung · 10 Minuten</div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-left">
            <div className="brand-mark footer-brand-mark">W</div>
            <div className="footer-brand-txt">WealthWise</div>
          </div>
          <div className="footer-links">
            <Link to="/impressum">Impressum</Link>
            <Link to="/datenschutz">Datenschutz</Link>
            <a href="mailto:info@wealthwise.ch">Kontakt</a>
          </div>
          <div className="footer-meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
              <rect width="20" height="20" rx="3" fill="#FF0000"/>
              <rect x="7.5" y="3" width="5" height="14" fill="white"/>
              <rect x="3" y="7.5" width="14" height="5" fill="white"/>
            </svg>
            © 2026 WealthWise – Prototyp FHNW Masterarbeit
          </div>
        </div>
        <div className="footer-disclaimer">
          Basierend auf öffentlich zugänglichen Daten der AHV, BFS und BVG-Kennzahlen 2026.
          WealthWise bietet keine Finanzberatung und stellt keine Anlageberatung dar. Die Berechnungen basieren auf vereinfachten Annahmen. Für verbindliche Entscheidungen konsultieren Sie bitte eine qualifizierte Fachperson.
        </div>
      </footer>
    </div>
  )
}
