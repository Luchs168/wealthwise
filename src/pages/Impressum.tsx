import { Link } from 'react-router-dom'

export default function Impressum() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <Link to="/" className="brand" style={{ textDecoration: 'none' }}>
            <div className="brand-mark">W</div>
            <span>WealthWise</span>
          </Link>
          <Link to="/" style={{ color: 'var(--ink-700)', textDecoration: 'none', fontSize: 14 }}>
            ← Zurück zur Startseite
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '64px 40px 96px' }}>
        <div className="eyebrow" style={{ color: 'var(--navy-700)', marginBottom: 14 }}>Rechtliches</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 44, lineHeight: 1.1, letterSpacing: '-.02em', margin: '0 0 12px', color: 'var(--navy-900)' }}>
          Impressum
        </h1>
        <p style={{ fontSize: 18, color: 'var(--ink-500)', margin: '0 0 40px' }}>
          Angaben gemäss DSG und den anwendbaren Informationspflichten.
        </p>

        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-.01em', color: 'var(--navy-900)', margin: '40px 0 12px' }}>
          Betreiber
        </h2>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--ink-200)', borderRadius: 14, padding: '22px 24px', margin: '20px 0' }}>
          <dl style={{ margin: 0 }}>
            <dt style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 4 }}>Firma</dt>
            <dd style={{ margin: '0 0 16px', color: 'var(--ink-900)', fontSize: 16 }}>WealthWise</dd>
            <dt style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 4 }}>Adresse</dt>
            <dd style={{ margin: '0 0 16px', color: 'var(--ink-900)', fontSize: 16 }}>8808 Pfäffikon SZ · Schweiz</dd>
            <dt style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 4 }}>Kontakt</dt>
            <dd style={{ margin: 0, color: 'var(--ink-900)', fontSize: 16 }}>
              <a href="mailto:info@wealthwise.ch" style={{ color: 'var(--navy-700)' }}>info@wealthwise.ch</a>
            </dd>
          </dl>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-.01em', color: 'var(--navy-900)', margin: '40px 0 12px' }}>
          Haftungsausschluss
        </h2>
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '18px 22px', margin: '18px 0', color: '#78350f', fontSize: 15 }}>
          <b style={{ color: '#92400e' }}>Kein Finanzdienstleistungsangebot:</b> WealthWise ist ausdrücklich <strong>keine Finanzdienstleistung</strong> im Sinne des FIDLEG, keine persönliche Anlageempfehlung und keine Rechts- oder Steuerberatung. WealthWise ist ein Informations- und Berechnungswerkzeug zu Orientierungszwecken.
        </div>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px' }}>
          Die dargestellten Berechnungen sind Schätzungen auf Basis vereinfachter Modelle. Tatsächliche Beträge (AHV-Renten, PK-Leistungen, Steuern) können erheblich abweichen. WealthWise übernimmt keine Haftung für Entscheidungen, die auf Basis dieser Berechnungen getroffen werden. Ausgenommen bleibt die Haftung für Vorsatz und grobe Fahrlässigkeit (OR 100 Abs. 1).
        </p>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px' }}>
          Für verbindliche Aussagen zu Ihrer Vorsorge, Ihren Steuern oder Ihrer finanziellen Situation konsultieren Sie bitte eine qualifizierte Fachperson (zugelassene/r Finanzberater/in, Steuerexpert/in oder Rechtsanwalt/Rechtsanwältin).
        </p>

        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-.01em', color: 'var(--navy-900)', margin: '40px 0 12px' }}>
          Urheberrecht
        </h2>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px' }}>
          Die Urheber- und alle anderen Rechte an Inhalten, Bildern, Fotos oder anderen Dateien auf dieser Website gehören ausschliesslich WealthWise oder den speziell genannten Rechteinhabern.
        </p>

        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-.01em', color: 'var(--navy-900)', margin: '40px 0 12px' }}>
          Datenquellen
        </h2>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px' }}>
          Die Berechnungen basieren auf den offiziellen Schweizer Vorsorgedaten 2026:
        </p>
        <ul style={{ paddingLeft: 22, color: 'var(--ink-700)', margin: '0 0 14px' }}>
          <li style={{ marginBottom: 6 }}>Bundesamt für Sozialversicherungen (BSV) – AHV-Rentenskala</li>
          <li style={{ marginBottom: 6 }}>Bundesamt für Statistik (BFS) – Sterbetafeln, Haushaltsbudgeterhebung</li>
          <li style={{ marginBottom: 6 }}>BVG-Kennzahlen gemäss Eidg. Finanzdepartement</li>
          <li style={{ marginBottom: 6 }}>Steuerverwaltungen der Kantone</li>
        </ul>

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-500)', marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--ink-200)' }}>
          Stand: 2026 · Version 1.0
        </p>
      </main>

      {/* Footer */}
      <footer style={{ background: 'var(--navy-900)', color: 'rgba(255,255,255,.7)', padding: 0 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,.12)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-display)' }}>W</div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: '#fff' }}>WealthWise</span>
          </div>
          <div style={{ display: 'flex', gap: 22 }}>
            <Link to="/impressum" style={{ color: 'rgba(255,255,255,.65)', textDecoration: 'none', fontSize: 14 }}>Impressum</Link>
            <Link to="/datenschutz" style={{ color: 'rgba(255,255,255,.65)', textDecoration: 'none', fontSize: 14 }}>Datenschutz</Link>
            <a href="mailto:info@wealthwise.ch" style={{ color: 'rgba(255,255,255,.65)', textDecoration: 'none', fontSize: 14 }}>Kontakt</a>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.04em', color: 'rgba(255,255,255,.5)' }}>
            © 2026 WealthWise · Made in Switzerland 🇨🇭
          </span>
        </div>
      </footer>
    </div>
  )
}
