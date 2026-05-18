import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.706 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

export default function UserMenu() {
  const { user, loading, syncing, signInWithGoogle, signOutUser, firebaseEnabled } = useAuth()
  const [open, setOpen] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!firebaseEnabled) return null
  if (loading) return <div style={{ width: 32, height: 32 }} />

  if (!user) {
    return (
      <button
        onClick={async () => {
          setSigningIn(true)
          try { await signInWithGoogle() } catch { /* popup closed */ }
          finally { setSigningIn(false) }
        }}
        disabled={signingIn}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: '1px solid var(--ink-200)', borderRadius: 7,
          padding: '5px 11px', fontSize: 13, color: 'var(--ink-600)',
          cursor: signingIn ? 'wait' : 'pointer', fontFamily: 'var(--font-body)',
          opacity: signingIn ? 0.6 : 1,
        }}
      >
        {signingIn ? '…' : <><GoogleIcon /> Anmelden</>}
      </button>
    )
  }

  const initials = (user.displayName || user.email || '?')[0].toUpperCase()

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        title={user.displayName || user.email || ''}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5, padding: '3px 5px', borderRadius: 8,
        }}
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" width={28} height={28}
            style={{ borderRadius: '50%', border: '1.5px solid var(--ink-200)', display: 'block' }} />
        ) : (
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: 'var(--navy-700)',
            color: 'white', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>
        )}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ color: 'var(--ink-400)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)',
          background: 'white', border: '1px solid var(--ink-200)', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 210, zIndex: 500, overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--ink-100)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-800)', marginBottom: 1 }}>
              {user.displayName || 'Angemeldeter Nutzer'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>{user.email}</div>
          </div>

          <div style={{ padding: '8px 10px 6px' }}>
            <div style={{
              fontSize: 12, color: syncing ? 'var(--navy-600)' : '#16a34a',
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px',
            }}>
              <span>{syncing ? '⟳' : '☁'}</span>
              {syncing ? 'Wird synchronisiert…' : 'Cloud-Sync aktiv'}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--ink-100)', padding: '6px 8px 6px' }}>
            <button
              onClick={() => { setOpen(false); signOutUser() }}
              style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none',
                padding: '8px 8px', borderRadius: 7, fontSize: 13, color: '#dc2626',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              Abmelden
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
