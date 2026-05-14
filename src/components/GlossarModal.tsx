import { useState } from 'react'

const TERMS = [
  {
    term: 'AHV',
    def: 'Alters- und Hinterlassenenversicherung – die staatliche Grundrente. Finanziert durch Lohnbeiträge von Arbeitgebern und Arbeitnehmern. Bei vollständiger Beitragszeit (44 Jahre) erhalten Sie die volle Rente (max. CHF 2\'520/Monat in 2026).',
  },
  {
    term: 'Beitragsjahre / Beitragslücken',
    def: 'Für jedes fehlende AHV-Beitragsjahr wird die Rente um ca. 2.3% gekürzt – lebenslang. Lücken entstehen durch Auslandaufenthalte, Studium ohne AHV-Beiträge oder Zeiten ohne Erwerbstätigkeit.',
  },
  {
    term: 'Ergänzungsleistungen (EL)',
    def: 'Gesetzlicher Anspruch (kein Almosen!), wenn AHV + PK-Rente nicht für den Lebensunterhalt reichen. Jede 5. Rentnerin in der Schweiz bezieht EL. Wird vom Kanton berechnet und ausbezahlt.',
  },
  {
    term: 'Freizügigkeitsguthaben (FZ)',
    def: 'Wenn Sie Ihren Arbeitgeber wechseln oder arbeitslos werden, wird Ihr PK-Guthaben auf ein Freizügigkeitskonto übertragen. Es wächst weiter und wird bei der nächsten Stelle oder bei der Pensionierung ausbezahlt.',
  },
  {
    term: 'Kapitalbezug',
    def: 'Sie beziehen Ihr PK-Guthaben als Einmalbetrag (statt als monatliche Rente). Vorteil: Flexibilität und mögliche Steuerersparnis. Risiko: Das Kapital kann aufgebraucht werden; Rente ist sicherer im hohen Alter.',
  },
  {
    term: 'Koordinationsabzug',
    def: 'Beim BVG-Obligatorium wird ein Fixbetrag (CHF 26\'460 in 2026) vom AHV-Lohn abgezogen, bevor die PK-Beiträge berechnet werden. Das benachteiligt Teilzeitarbeitende, da der Abzug nicht proportional ist.',
  },
  {
    term: 'PK-Einkauf',
    def: 'Freiwillige Einzahlung in die Pensionskasse, um Beitragslücken zu füllen und die Rente zu erhöhen. Steuerlich vollständig abzugsfähig. Achtung: 3-jährige Sperrfrist für Kapitalbezug nach dem Einkauf.',
  },
  {
    term: 'Plafonierung (AHV)',
    def: 'Bei Ehepaaren: Die Summe beider AHV-Renten darf maximal 150% einer Einzelrente betragen (ca. CHF 3\'780/Mt. in 2026). Wenn beide Partner hohe Renten haben, wird die Summe auf dieses Maximum begrenzt.',
  },
  {
    term: 'Prämienverbilligung (IPV)',
    def: 'Staatliche Unterstützung für die Krankenkassenprämien. Bei tiefem Einkommen nach der Pensionierung kann der Anspruch deutlich höher sein als während der Erwerbstätigkeit. Bei der Wohngemeinde beantragen.',
  },
  {
    term: 'Säule 3a',
    def: 'Gebundene private Altersvorsorge. Einzahlungen bis CHF 7\'258/Jahr (mit PK) sind vom steuerbaren Einkommen abzugsfähig. Das Geld ist gesperrt bis 5 Jahre vor Pensionierung und kann gestaffelt bezogen werden.',
  },
  {
    term: 'Umwandlungssatz (UWS)',
    def: 'Der Prozentsatz, mit dem Ihr PK-Kapital in eine jährliche Rente umgewandelt wird. Beispiel: UWS 5.4% und CHF 400\'000 Kapital → CHF 21\'600/Jahr = CHF 1\'800/Monat. Je tiefer der UWS, desto weniger Rente.',
  },
  {
    term: 'Vorbezug (AHV)',
    def: 'Früherer Bezug der AHV-Rente (bis 2 Jahre vor Pensionierungsalter möglich). Kostet 6.8% Kürzung pro Vorbezugsjahr – lebenslang. Aufschub um 1 Jahr bringt 5.2% Erhöhung. Bei tiefem Einkommen gut überlegen.',
  },
]

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function GlossarModal({ isOpen, onClose }: Props) {
  const [search, setSearch] = useState('')
  if (!isOpen) return null

  const filtered = TERMS.filter(
    t => t.term.toLowerCase().includes(search.toLowerCase()) ||
         t.def.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Glossar Vorsorgebegriffe"
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '16px 12px',
        overflowY: 'auto',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 600,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        marginTop: 20,
      }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--ink-100)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--navy-900)' }}>
              Glossar Vorsorgebegriffe
            </h2>
            <button
              onClick={onClose}
              aria-label="Schliessen"
              style={{
                background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
                color: 'var(--ink-400)', lineHeight: 1, padding: '0 4px',
              }}
            >
              ×
            </button>
          </div>
          <input
            type="search"
            placeholder="Begriff suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '9px 13px', borderRadius: 8,
              border: '1px solid var(--ink-200)', fontSize: 14,
              fontFamily: 'var(--font-body)', color: 'var(--ink-900)',
              background: 'var(--surface)',
            }}
          />
        </div>

        <div style={{ padding: '8px 0', maxHeight: '70vh', overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '20px 20px', color: 'var(--ink-400)', fontSize: 14, textAlign: 'center' }}>
              Kein Begriff gefunden.
            </div>
          )}
          {filtered.map((item, i) => (
            <div
              key={item.term}
              style={{
                padding: '14px 20px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--ink-100)' : 'none',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--navy-800)', fontSize: 14, marginBottom: 4 }}>
                {item.term}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-700)', lineHeight: 1.65 }}>
                {item.def}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--ink-100)', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              background: 'var(--navy-600)', border: 'none', borderRadius: 8,
              padding: '9px 22px', fontSize: 14, color: 'white', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            Schliessen
          </button>
        </div>
      </div>
    </div>
  )
}
