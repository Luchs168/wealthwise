import { Link } from 'react-router-dom'

const STEPS = [
  { n: 1, label: 'Situation', path: '/schritt/1' },
  { n: 2, label: 'Vorsorge', path: '/schritt/2' },
  { n: 3, label: 'Ausgaben', path: '/schritt/3' },
  { n: 4, label: 'Analyse', path: '/schritt/4' },
]

interface Props {
  current: 1 | 2 | 3 | 4
}

export default function ProgressBar({ current }: Props) {
  return (
    <div className="progress-wrap">
      <div className="steps">
        {STEPS.map((s) => {
          const state = s.n < current ? 'done' : s.n === current ? 'active' : ''
          const clickable = s.n < current
          const inner = (
            <div key={s.n} className={`step ${state}`}>
              <div className="step-bar">
                <i />
              </div>
              <div className="step-meta">
                <span>{String(s.n).padStart(2, '0')}</span>
                <b>{s.label}</b>
              </div>
            </div>
          )
          return clickable ? (
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
    </div>
  )
}
