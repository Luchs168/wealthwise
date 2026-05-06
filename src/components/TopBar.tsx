import { Link } from 'react-router-dom'

interface Props {
  screenLabel?: string
}

export default function TopBar({ screenLabel }: Props) {
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
        <Link to="/">Startseite</Link>
      </div>
    </header>
  )
}
