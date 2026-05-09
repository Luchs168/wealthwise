import { Link } from 'react-router-dom'

const STEPS = [
  { n: 1, label: 'Situation', path: '/schritt/1', time: 'ca. 2 Min.' },
  { n: 2, label: 'Vorsorge', path: '/schritt/2', time: 'ca. 5 Min.' },
  { n: 3, label: 'Ausgaben', path: '/schritt/3', time: 'ca. 3 Min.' },
  { n: 4, label: 'Analyse', path: '/schritt/4', time: 'Ihre Ergebnisse' },
]

const REMAINING: Record<number, string> = {
  1: 'Noch ca. 10 Minuten',
  2: 'Noch ca. 8 Minuten',
  3: 'Noch ca. 3 Minuten',
  4: 'Ihre persönliche Analyse',
}

interface Props {
  current: 1 | 2 | 3 | 4
}

export default function ProgressBar({ current }: Props) {
  return (
    <div className="progress-wrap">
      <div className="steps">
        {STEPS.map((s) => {
          const done = s.n < current
          const active = s.n === current
          const state = done ? 'done' : active ? 'active' : ''
          const inner = (
            <div key={s.n} className={`step ${state}`}>
              <div className="step-bar"><i /></div>
              <div className="step-meta">
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  background: done ? 'var(--navy-700)' : active ? 'var(--navy-800)' : 'var(--ink-200)',
                  color: done || active ? '#fff' : 'var(--ink-400)',
                  fontSize: 10, fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                }}>
                  {done ? '✓' : s.n}
                </span>
                <b>{s.label}</b>
                {active && (
                  <span style={{
                    fontSize: 11, color: 'var(--ink-400)', fontFamily: 'var(--font-mono)',
                    marginLeft: 2,
                  }}>
                    · {s.time}
                  </span>
                )}
              </div>
            </div>
          )
          return done ? (
            <Link key={s.n} to={s.path} style={{ flex: 1, textDecoration: 'none' }}>
              {inner}
            </Link>
          ) : (
            <div key={s.n} style={{ flex: 1 }}>
              {inner}
            </div>
          )
        })}
      </div>
      <div style={{
        textAlign: 'right', fontSize: 11, color: 'var(--ink-400)',
        fontFamily: 'var(--font-mono)', marginTop: 5, paddingRight: 2,
      }}>
        {REMAINING[current]}
      </div>
    </div>
  )
}
