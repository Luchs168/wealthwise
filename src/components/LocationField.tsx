import { useState, useEffect, useRef } from 'react'
import { LocationData } from '../store'

const KANTONE: [string, string][] = [
  ['AG', 'Aargau'], ['AI', 'Appenzell I.'], ['AR', 'Appenzell A.'], ['BE', 'Bern'], ['BL', 'Basel-Land'],
  ['BS', 'Basel-Stadt'], ['FR', 'Freiburg'], ['GE', 'Genf'], ['GL', 'Glarus'], ['GR', 'Graubünden'],
  ['JU', 'Jura'], ['LU', 'Luzern'], ['NE', 'Neuenburg'], ['NW', 'Nidwalden'], ['OW', 'Obwalden'],
  ['SG', 'St. Gallen'], ['SH', 'Schaffhausen'], ['SO', 'Solothurn'], ['SZ', 'Schwyz'], ['TG', 'Thurgau'],
  ['TI', 'Tessin'], ['UR', 'Uri'], ['VD', 'Waadt'], ['VS', 'Wallis'], ['ZG', 'Zug'], ['ZH', 'Zürich'],
]

interface Result {
  postalCode: string
  name: string
  commune: string
  cantonShort: string
}

interface Props {
  value: LocationData | null
  onChange: (l: LocationData | null) => void
  label?: string
}

export default function LocationField({ value, onChange, label }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reqIdRef = useRef(0)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 2) { setResults([]); setLoading(false); return }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      const myReq = ++reqIdRef.current
      const isNum = /^\d+$/.test(q)
      const url = isNum
        ? `https://openplzapi.org/ch/Localities?postalCode=${encodeURIComponent(q)}&page=1&pageSize=5`
        : `https://openplzapi.org/ch/FullTextSearch?searchTerm=${encodeURIComponent(q)}&page=1&pageSize=5`
      try {
        const res = await fetch(url, { headers: { Accept: 'application/json' } })
        if (!res.ok) throw new Error('HTTP ' + res.status)
        const json = await res.json()
        if (myReq !== reqIdRef.current) return
        const list = Array.isArray(json) ? json : (json.value || [])
        const norm: Result[] = list
          .filter((r: Record<string, unknown>) => r && r.postalCode && r.name)
          .slice(0, 5)
          .map((r: Record<string, unknown>) => ({
            postalCode: r.postalCode as string,
            name: r.name as string,
            commune: ((r.commune as Record<string, string>)?.name || r.name) as string,
            cantonShort: ((r.canton as Record<string, string>)?.shortName || (r.canton as Record<string, string>)?.key || '') as string,
          }))
        setResults(norm)
        setApiError(false)
        setLoading(false)
      } catch {
        if (myReq !== reqIdRef.current) return
        setResults([])
        setApiError(true)
        setLoading(false)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const select = (r: Result) => {
    onChange({ plz: r.postalCode, ort: r.name, gemeinde: r.commune, kanton: r.cantonShort })
    setQuery('')
    setResults([])
    setOpen(false)
  }

  if (value?.plz) {
    return (
      <div>
        {label && <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)', display: 'block', marginBottom: 6 }}>{label}</label>}
        <div className="loc-tags">
          <span className="loc-tag"><span className="loc-tag-key">PLZ</span> {value.plz} {value.ort}</span>
          <span className="loc-tag"><span className="loc-tag-key">Gemeinde</span> {value.gemeinde}</span>
          <span className="loc-tag"><span className="loc-tag-key">Kanton</span> {value.kanton}</span>
          <button type="button" className="loc-tag-clear" onClick={() => onChange(null)}>ändern</button>
        </div>
        <div className="info-callout" style={{ marginTop: 10 }}>
          <span className="info-callout-icon">i</span>
          <span>Wohnort bestimmt die Steuerberechnung. Steuersätze unterscheiden sich je nach Kanton und Gemeinde erheblich.</span>
        </div>
      </div>
    )
  }

  if (manualMode) {
    const v = value || { plz: '', ort: '', gemeinde: '', kanton: '' }
    const handle = (k: keyof LocationData, val: string) => onChange({ ...v, [k]: val })
    const allFilled = (v.plz || '').length >= 4 && (v.ort || '').trim() && (v.kanton || '').trim()
    return (
      <div>
        {label && <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)', display: 'block', marginBottom: 6 }}>{label}</label>}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 180px', gap: 10 }}>
          <input className="loc-input" type="text" inputMode="numeric" maxLength={4}
            placeholder="PLZ" value={v.plz}
            onChange={(e) => handle('plz', e.target.value.replace(/\D/g, '').slice(0, 4))} />
          <input className="loc-input" type="text" placeholder="Ort"
            value={v.ort} onChange={(e) => handle('ort', e.target.value)} />
          <select className="loc-input" value={v.kanton} onChange={(e) => handle('kanton', e.target.value)}
            style={{ fontSize: 14 }}>
            <option value="">Kanton …</option>
            {KANTONE.map(([k, n]) => <option key={k} value={k}>{k} – {n}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
          <button type="button" className="loc-tag-clear" onClick={() => { setManualMode(false); setApiError(false) }}>
            Suche erneut versuchen
          </button>
          {allFilled && (
            <button type="button" className="loc-tag-clear"
              onClick={() => onChange({ plz: v.plz, ort: v.ort, gemeinde: v.ort, kanton: v.kanton })}>
              Übernehmen
            </button>
          )}
        </div>
      </div>
    )
  }

  const showDropdown = open && query.trim().length >= 2

  return (
    <div className="loc-wrap" ref={wrapRef}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)', display: 'block', marginBottom: 6 }}>{label}</label>}
      <input className="loc-input" type="text"
        placeholder="PLZ oder Ort eingeben"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIdx(0) }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!results.length) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)) }
          else if (e.key === 'Enter') { e.preventDefault(); select(results[activeIdx]) }
          else if (e.key === 'Escape') setOpen(false)
        }}
        autoComplete="off"
      />
      {showDropdown && (
        <div className="loc-suggest" role="listbox">
          {loading && (
            <div className="loc-suggest-item" style={{ color: 'var(--ink-500)', cursor: 'default' }}>
              <span className="loc-suggest-ort">Suche …</span>
            </div>
          )}
          {!loading && apiError && (
            <div className="loc-suggest-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6, cursor: 'default' }}>
              <span style={{ color: 'var(--red-500)', fontSize: 14 }}>PLZ-Suche momentan nicht verfügbar.</span>
              <button type="button" className="loc-tag-clear"
                onMouseDown={(e) => { e.preventDefault(); setManualMode(true); setOpen(false) }}>
                Manuell eingeben
              </button>
            </div>
          )}
          {!loading && !apiError && results.length === 0 && (
            <div className="loc-suggest-item" style={{ color: 'var(--ink-500)', cursor: 'default' }}>
              <span className="loc-suggest-ort">Keine Ergebnisse gefunden</span>
            </div>
          )}
          {!loading && !apiError && results.map((r, i) => (
            <div key={r.postalCode + '-' + r.name + '-' + i}
              className={`loc-suggest-item ${i === activeIdx ? 'active' : ''}`}
              role="option" aria-selected={i === activeIdx}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => { e.preventDefault(); select(r) }}>
              <span className="loc-suggest-plz">{r.postalCode}</span>
              <span className="loc-suggest-ort">{r.name}</span>
              <span className="loc-suggest-meta">{r.cantonShort}</span>
            </div>
          ))}
        </div>
      )}
      <div className="info-callout" style={{ marginTop: 14 }}>
        <span className="info-callout-icon">i</span>
        <span>Wohnort bestimmt die Steuerberechnung. Steuersätze unterscheiden sich je nach Kanton und Gemeinde erheblich.</span>
      </div>
    </div>
  )
}
