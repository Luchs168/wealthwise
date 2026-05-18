import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import GlossarModal from './GlossarModal'
import UserMenu from './UserMenu'

interface Props {
  screenLabel?: string
}

export default function TopBar({ screenLabel }: Props) {
  const navigate = useNavigate()
  const resetStore = useStore((s) => s.resetStore)
  const [showModal, setShowModal] = useState(false)
  const [showGlossar, setShowGlossar] = useState(false)

  function confirmReset() {
    setShowModal(false)
    resetStore()
    navigate('/schritt/1')
  }

  return (
    <>
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
            onClick={() => setShowGlossar(true)}
            style={{
              background: 'none', border: '1px solid var(--ink-200)', borderRadius: 7,
              padding: '5px 11px', fontSize: 13, color: 'var(--ink-500)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            Glossar
          </button>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: 'none', border: '1px solid var(--ink-200)', borderRadius: 7,
              padding: '5px 11px', fontSize: 13, color: 'var(--ink-500)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            Neustart
          </button>
          <Link to="/">Startseite</Link>
          <UserMenu />
        </div>
      </header>

      <GlossarModal isOpen={showGlossar} onClose={() => setShowGlossar(false)} />

      {/* Reset confirmation modal */}
      {showModal && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
          aria-describedby="reset-modal-desc"
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div style={{
            background: 'var(--surface)', borderRadius: 16,
            padding: '28px 28px 24px', maxWidth: 420, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: '#fef2f2', display: 'grid', placeItems: 'center',
              fontSize: 20, margin: '0 0 16px',
            }}>⚠️</div>
            <h2
              id="reset-modal-title"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20, color: 'var(--navy-900)', margin: '0 0 8px' }}
            >
              Analyse zurücksetzen?
            </h2>
            <p
              id="reset-modal-desc"
              style={{ fontSize: 15, color: 'var(--ink-600)', margin: '0 0 24px', lineHeight: 1.6 }}
            >
              Alle Ihre Eingaben werden gelöscht. Dies kann nicht rückgängig gemacht werden.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                autoFocus
                style={{
                  background: 'none', border: '1px solid var(--ink-200)', borderRadius: 8,
                  padding: '10px 20px', fontSize: 15, color: 'var(--ink-700)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={confirmReset}
                style={{
                  background: '#dc2626', border: 'none', borderRadius: 8,
                  padding: '10px 20px', fontSize: 15, color: 'white', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}
              >
                Ja, zurücksetzen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
