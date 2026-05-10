interface Props {
  message?: string
}

export default function AnalysisLoading({ message = 'Wird geladen…' }: Props) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', gap: 24,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        border: '3px solid var(--navy-100)',
        borderTopColor: 'var(--navy-800)',
        animation: 'ww-spin 0.8s linear infinite',
      }} />
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 600,
        fontSize: 17, color: 'var(--navy-900)',
      }}>
        {message}
      </div>
      <style>{`@keyframes ww-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
