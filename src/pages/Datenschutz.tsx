import { Link } from 'react-router-dom'

export default function Datenschutz() {
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
          Datenschutzerklärung
        </h1>
        <p style={{ fontSize: 18, color: 'var(--ink-500)', margin: '0 0 40px' }}>
          Angaben gemäss DSG (Schweizer Datenschutzgesetz) und DSGVO-Richtlinien.
        </p>

        {/* Zero-Storage Callout */}
        <div style={{ background: 'var(--navy-50)', border: '1px solid var(--navy-200)', borderRadius: 14, padding: '20px 24px', margin: '0 0 32px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--navy-800)', display: 'grid', placeItems: 'center', color: 'white', fontSize: 18, flexShrink: 0 }}>🔒</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--navy-900)', marginBottom: 6 }}>Zero-Storage-Prinzip</div>
            <div style={{ fontSize: 15, color: 'var(--navy-800)', lineHeight: 1.6 }}>
              WealthWise speichert <strong>keine</strong> deiner persönlichen Daten auf einem Server. Alle Eingaben werden ausschliesslich in deinem Browser (localStorage) verarbeitet und nach dem Schliessen der Seite vollständig verworfen. Wir sehen und speichern nie, was du eingibst.
            </div>
          </div>
        </div>

        {/* Section 1 */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-.01em', color: 'var(--navy-900)', margin: '40px 0 12px' }}>
          1. Verantwortliche Stelle
        </h2>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--ink-200)', borderRadius: 14, padding: '22px 24px', margin: '0 0 20px' }}>
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

        {/* Section 2 */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-.01em', color: 'var(--navy-900)', margin: '40px 0 12px' }}>
          2. Welche Daten werden verarbeitet
        </h2>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.7 }}>
          WealthWise verarbeitet ausschliesslich Daten, die du aktiv eingibst. Diese Daten verlassen deinen Browser zu keinem Zeitpunkt und werden nicht an Server übertragen.
        </p>
        <ul style={{ paddingLeft: 22, color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.8 }}>
          <li style={{ marginBottom: 6 }}>Persönliche Angaben (Alter, Wohnort, Zivilstand) – nur im Browser</li>
          <li style={{ marginBottom: 6 }}>Einkommens- und Vermögensdaten – nur im Browser</li>
          <li style={{ marginBottom: 6 }}>Vorsorgedaten (AHV, PK, 3a) – nur im Browser</li>
          <li style={{ marginBottom: 6 }}>Ausgabenbudget – nur im Browser</li>
        </ul>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.7 }}>
          Die Daten werden im localStorage deines Browsers gespeichert, damit du den Fragebogen unterbrechen und später fortsetzen kannst. Du kannst diese Daten jederzeit löschen, indem du den Browser-Cache leerst.
        </p>

        {/* PK Upload */}
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, color: 'var(--navy-900)', margin: '28px 0 10px' }}>
          PK-Ausweis Upload (optional)
        </h3>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.7 }}>
          Falls du einen PDF-Ausweis deiner Pensionskasse hochlädst, wird dieser <strong>ausschliesslich lokal in deinem Browser</strong> verarbeitet. Das Dokument wird nicht an Server übertragen, nicht gespeichert und nach dem Auslesen der Zahlen sofort verworfen. Die extrahierten Werte (Sparkapital, Umwandlungssatz) werden wie manuell eingegebene Werte behandelt.
        </p>

        {/* Chatbot */}
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, color: 'var(--navy-900)', margin: '28px 0 10px' }}>
          KI-Assistent (Chatbot)
        </h3>
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '16px 20px', margin: '0 0 14px', color: '#78350f', fontSize: 15 }}>
          <b style={{ color: '#92400e' }}>Hinweis:</b> Wenn du den KI-Assistenten verwendest, werden deine Fragen an die Anthropic API übermittelt. Teile dabei keine sensiblen persönlichen Daten wie Namen, AHV-Nummern oder genaue Vermögenswerte mit dem Chatbot.
        </div>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.7 }}>
          Die Chatbot-Anfragen werden nicht mit deinen Vorsorgedaten verknüpft. Anthropic verarbeitet die Nachrichten gemäss ihrer eigenen Datenschutzrichtlinie (privacy.anthropic.com).
        </p>

        {/* Section 3 */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-.01em', color: 'var(--navy-900)', margin: '40px 0 12px' }}>
          3. Cookies
        </h2>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.7 }}>
          WealthWise verwendet <strong>keine Tracking-Cookies</strong>. Es werden ausschliesslich technisch notwendige Browser-APIs (localStorage) verwendet, die für die Funktionalität der Anwendung erforderlich sind.
        </p>

        {/* Section 4 */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-.01em', color: 'var(--navy-900)', margin: '40px 0 12px' }}>
          4. Analytics
        </h2>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.7 }}>
          WealthWise setzt <strong>Plausible Analytics</strong> ein – eine datenschutzfreundliche Alternative zu Google Analytics. Plausible:
        </p>
        <ul style={{ paddingLeft: 22, color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.8 }}>
          <li style={{ marginBottom: 6 }}>Erhebt keine personenbezogenen Daten</li>
          <li style={{ marginBottom: 6 }}>Setzt keine Cookies</li>
          <li style={{ marginBottom: 6 }}>Ist DSGVO-konform ohne Cookie-Banner</li>
          <li style={{ marginBottom: 6 }}>Misst nur anonymisierte Seitenaufrufe und Herkunft</li>
        </ul>

        {/* Section 5 */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-.01em', color: 'var(--navy-900)', margin: '40px 0 12px' }}>
          5. Hosting
        </h2>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.7 }}>
          WealthWise wird über <strong>Netlify</strong> gehostet (Netlify Inc., San Francisco, USA). Netlify verarbeitet Standard-Server-Logs (IP-Adressen, Zeitstempel) zum Betrieb der Infrastruktur. Diese werden nicht mit Nutzerprofilen verknüpft. Datenübertragungen in die USA erfolgen auf Basis der Standardvertragsklauseln (SCCs) gemäss Art. 46 DSGVO.
        </p>

        {/* Section 6 */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-.01em', color: 'var(--navy-900)', margin: '40px 0 12px' }}>
          6. Deine Rechte
        </h2>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.7 }}>
          Da WealthWise keine personenbezogenen Daten auf Servern speichert, gibt es keine Daten, die gelöscht, auskunftspflichtig oder übertragbar wären. Du hast die vollständige Kontrolle über deine Daten im Browser.
        </p>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.7 }}>
          Bei Fragen zum Datenschutz erreichst du uns unter:{' '}
          <a href="mailto:info@wealthwise.ch" style={{ color: 'var(--navy-700)' }}>info@wealthwise.ch</a>
        </p>

        {/* Section 7 */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-.01em', color: 'var(--navy-900)', margin: '40px 0 12px' }}>
          7. Änderungen dieser Erklärung
        </h2>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.7 }}>
          Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen. Die aktuelle Version ist stets auf dieser Seite verfügbar.
        </p>

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
