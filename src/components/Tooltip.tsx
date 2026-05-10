import { useState, useRef } from 'react'

export function InfoTooltip({ text, children }: { text: string; children?: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onClick={() => setVisible(v => !v)}
    >
      {children ?? (
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, borderRadius: '50%',
          background: 'var(--navy-100)', color: 'var(--navy-700)',
          fontSize: 10, fontWeight: 700, cursor: 'help', flexShrink: 0,
          border: '1px solid var(--navy-200)', marginLeft: 4,
        }}>i</span>
      )}
      {visible && (
        <span style={{
          position: 'absolute', bottom: '100%', left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 6, zIndex: 1000,
          background: 'var(--navy-900)', color: 'white',
          padding: '8px 12px', borderRadius: 8,
          fontSize: 12, lineHeight: 1.5,
          width: 260, textAlign: 'left',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
          whiteSpace: 'normal',
        }}>
          {text}
          <span style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            border: '5px solid transparent',
            borderTopColor: 'var(--navy-900)',
          }} />
        </span>
      )}
    </span>
  )
}
