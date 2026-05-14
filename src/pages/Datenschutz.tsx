import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Datenschutz() {
  const navigate = useNavigate()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function handleDeleteAll() {
    localStorage.clear()
    navigate('/')
  }

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
          Angaben gemäss nDSG (Schweizer Datenschutzgesetz) und DSGVO-Richtlinien.
        </p>

        {/* Prominenter Lösch-Button */}
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '20px 24px', margin: '0 0 32px', display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: '#991b1b', marginBottom: 4 }}>Alle Ihre Daten löschen</div>
            <div style={{ fontSize: 14, color: '#7f1d1d', lineHeight: 1.5 }}>Entfernt alle gespeicherten Eingaben aus Ihrem Browser-Speicher (localStorage).</div>
          </div>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{ padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              🗑 Alle Daten löschen
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#7f1d1d', fontWeight: 600 }}>Wirklich löschen?</span>
              <button
                onClick={handleDeleteAll}
                style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Ja, löschen
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ padding: '8px 16px', background: 'transparent', color: '#7f1d1d', border: '1px solid #fca5a5', borderRadius: 6, fontWeight: 500, fontSize: 13, cursor: 'pointer' }}
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>

        {/* Lokale Speicherung Callout */}
        <div style={{ background: 'var(--navy-50)', border: '1px solid var(--navy-200)', borderRadius: 14, padding: '20px 24px', margin: '0 0 32px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--navy-800)', display: 'grid', placeItems: 'center', color: 'white', fontSize: 18, flexShrink: 0 }}>🔒</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--navy-900)', marginBottom: 6 }}>Keine Daten auf Servern – Verarbeitung nur in Ihrem Browser</div>
            <div style={{ fontSize: 15, color: 'var(--navy-800)', lineHeight: 1.6 }}>
              WealthWise überträgt <strong>keine</strong> persönlichen Daten an Server. Alle Berechnungen erfolgen lokal in Ihrem Browser. Ihre Eingaben werden im lokalen Browserspeicher (localStorage) Ihres Geräts gespeichert, damit Sie die Analyse unterbrechen und später fortsetzen können. Diese Daten bleiben auf Ihrem Gerät und verlassen es nicht.
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
          WealthWise verarbeitet ausschliesslich Daten, die Sie aktiv eingeben. Diese Daten verlassen Ihren Browser zu keinem Zeitpunkt und werden nicht an Server übertragen.
        </p>
        <ul style={{ paddingLeft: 22, color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.8 }}>
          <li style={{ marginBottom: 6 }}>Persönliche Angaben (Alter, Wohnort, Zivilstand) – nur im Browser</li>
          <li style={{ marginBottom: 6 }}>Einkommens- und Vermögensdaten – nur im Browser</li>
          <li style={{ marginBottom: 6 }}>Vorsorgedaten (AHV, PK, 3a) – nur im Browser</li>
          <li style={{ marginBottom: 6 }}>Ausgabenbudget – nur im Browser</li>
        </ul>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.7 }}>
          Ihre Eingaben werden im lokalen Browserspeicher (localStorage) Ihres Geräts gespeichert, damit Sie den Fragebogen unterbrechen und später fortsetzen können. <strong>Diese Daten bleiben auf Ihrem Gerät gespeichert, bis Sie sie aktiv löschen.</strong> Sie verlassen Ihr Gerät nicht.
        </p>
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', margin: '0 0 14px', fontSize: 13.5, color: '#78350f' }}>
          <strong>Auf gemeinsam genutzten Geräten</strong> empfehlen wir, die Daten nach der Nutzung aktiv zu löschen: Nutzen Sie den Lösch-Button oben oder leeren Sie den Browser-Cache.
        </div>

        {/* PK Upload */}
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, color: 'var(--navy-900)', margin: '28px 0 10px' }}>
          Dokument-Upload (PK-Ausweis / IK-Auszug)
        </h3>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.7 }}>
          Falls Sie einen PDF-Ausweis oder ein Foto hochladen, wird dieses <strong>ausschliesslich lokal in Ihrem Browser</strong> verarbeitet. Das Dokument wird nicht an Server übertragen, nicht gespeichert und nach der Extraktion der Zahlenwerte sofort verworfen. Ihre AHV-Nummer und Arbeitgeber-Angaben werden nicht gespeichert.
        </p>

        {/* Chatbot */}
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, color: 'var(--navy-900)', margin: '28px 0 10px' }}>
          Hilfe-Assistent (Chatbot)
        </h3>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', margin: '0 0 14px', color: '#14532d', fontSize: 15 }}>
          <b style={{ color: '#15803d' }}>Keine externe Übertragung:</b> Der integrierte Hilfe-Assistent verwendet ausschliesslich vorprogrammierte Antworten. Es werden <strong>keine</strong> Daten an externe KI-Dienste (wie Anthropic, OpenAI oder andere) übermittelt. Die Antworten werden vollständig lokal in Ihrem Browser generiert.
        </div>

        {/* Section 3 */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-.01em', color: 'var(--navy-900)', margin: '40px 0 12px' }}>
          3. Drittanbieter
        </h2>

        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, color: 'var(--navy-900)', margin: '20px 0 10px' }}>
          Postleitzahlen-Verzeichnis (openplzapi.org)
        </h3>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.7 }}>
          Bei der Eingabe Ihrer Postleitzahl wird diese an den Dienst <strong>openplzapi.org</strong> übermittelt, um den Ortsnamen automatisch zu ergänzen. Dabei wird Ihre IP-Adresse an diesen Dienst übertragen. Es werden keine weiteren persönlichen Daten gesendet. Die Nutzung erfolgt ausschliesslich zur Verbesserung der Benutzerfreundlichkeit.
        </p>

        {/* Section 4 */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-.01em', color: 'var(--navy-900)', margin: '40px 0 12px' }}>
          4. Cookies und Tracking
        </h2>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.7 }}>
          WealthWise verwendet <strong>keine Tracking-Cookies und kein Analytics</strong>. Es werden ausschliesslich technisch notwendige Browser-APIs (localStorage) verwendet, die für die Funktionalität der Anwendung erforderlich sind.
        </p>

        {/* Section 5 */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-.01em', color: 'var(--navy-900)', margin: '40px 0 12px' }}>
          5. Hosting
        </h2>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.7 }}>
          WealthWise wird über <strong>Netlify</strong> gehostet (Netlify Inc., San Francisco, USA). Der Hosting-Server befindet sich in den USA, nicht in der Schweiz. Netlify verarbeitet Standard-Server-Logs (IP-Adressen, Zeitstempel) zum Betrieb der Infrastruktur. Diese werden nicht mit Nutzerprofilen verknüpft. Datenübertragungen in die USA erfolgen auf Basis der Standardvertragsklauseln (SCCs) gemäss Art. 46 DSGVO.
        </p>

        {/* Section 6 */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-.01em', color: 'var(--navy-900)', margin: '40px 0 12px' }}>
          6. Ihre Rechte
        </h2>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.7 }}>
          Da WealthWise keine personenbezogenen Daten auf Servern speichert, gibt es keine Server-Daten, die gelöscht, auskunftspflichtig oder übertragbar wären. Sie haben die vollständige Kontrolle über Ihre Daten im Browser – nutzen Sie den Lösch-Button oben.
        </p>
        <p style={{ color: 'var(--ink-700)', margin: '0 0 14px', lineHeight: 1.7 }}>
          Bei Fragen zum Datenschutz erreichen Sie uns unter:{' '}
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
          Stand: 2026 · Version 1.1
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
