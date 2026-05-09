import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'

interface Props {
  screenLabel?: string
}

export default function TopBar({ screenLabel }: Props) {
  const navigate = useNavigate()
  const resetStore = useStore((s) => s.resetStore)

  function handleReset() {
    if (window.confirm('Neue Analyse starten? Alle eingegebenen Daten werden gelöscht.')) {
      resetStore()
      navigate('/schritt/1')
    }
  }

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">W</div>
        <span>WealthWise</span>
        {screenLabel && (
          <>
            <span style={{ color: 'var(--ink-300)', margin: '0 4px' }}>/</span>
            <span style={{ color: 'var(--ink-500)', fontWeight: 500, fontSize: 14 }}>{screenLabel}</span>
          </>
        )}
      </div>
      <div className="top-actions">
        <span className="top-save">Automatisch gespeichert</span>
        <button
          onClick={handleReset}
          style={{
            background: 'none', border: '1px solid var(--ink-200)', borderRadius: 7,
            padding: '5px 11px', fontSize: 13, color: 'var(--ink-500)',
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          Neustart
        </button>
        <Link to="/">Startseite</Link>
      </div>
    </header>
  )
}
